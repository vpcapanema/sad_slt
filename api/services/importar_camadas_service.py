"""Pipeline transacional do endpoint importar_camadas."""
from __future__ import annotations

import re
import unicodedata
from hashlib import sha256
from pathlib import Path
from typing import Any

import fiona
import geopandas as gpd
import numpy as np
import rasterio
from pyproj import CRS
from rasterio.mask import mask as raster_mask
from rasterio.transform import array_bounds
from rasterio.warp import Resampling, calculate_default_transform, reproject

from api.services.geoespacial_service import geoespacial_service
from api.repositories import camada_geoespacial_repository
from api.services.geospatial_upload_storage import (
    PreparedUpload,
    StoredUpload,
    commit_prepared,
    discard_prepared,
    prepare_upload,
    remove_stored,
)


SYSTEM_CRS = "EPSG:4674"


def _normalized_field_name(value: str) -> str:
    text = unicodedata.normalize("NFKD", str(value))
    text = "".join(char for char in text if not unicodedata.combining(char)).lower()
    text = re.sub(r"[^a-z0-9_]+", "_", text).strip("_") or "atributo"
    return text


def _normalize_fields(frame: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    geometry_name = frame.geometry.name
    used = {geometry_name}
    rename: dict[str, str] = {}
    for column in frame.columns:
        if column == geometry_name:
            continue
        base = _normalized_field_name(column)
        candidate = base
        index = 2
        while candidate in used:
            candidate = f"{base}_{index}"
            index += 1
        used.add(candidate)
        rename[column] = candidate
    return frame.rename(columns=rename)


def _geometry_family(frame: gpd.GeoDataFrame) -> str:
    types = set(frame.geometry.geom_type.dropna())
    if types and types <= {"Point", "MultiPoint"}:
        return "ponto"
    if types and types <= {"LineString", "MultiLineString"}:
        return "linha"
    if types and types <= {"Polygon", "MultiPolygon"}:
        return "poligono"
    raise ValueError(f"Tipos geométricos mistos ou não suportados: {', '.join(sorted(types)) or 'nenhum'}")


def _metric_frame(frame: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    crs = CRS.from_user_input(frame.crs)
    if crs.is_projected:
        factor = float(crs.axis_info[0].unit_conversion_factor or 1.0)
        if abs(factor - 1.0) < 1e-12:
            return frame
    metric_crs: CRS | None = frame.estimate_utm_crs()
    if metric_crs is None:
        raise ValueError("Não foi possível determinar um CRS métrico para os cálculos")
    return frame.to_crs(metric_crs)


def validate_vector(
    frame: gpd.GeoDataFrame,
    *,
    target_crs: str | None,
    clip_frame: gpd.GeoDataFrame | None,
) -> tuple[gpd.GeoDataFrame, dict[str, Any]]:
    if frame.empty:
        raise ValueError("Camada vetorial sem feições")
    if frame.crs is None:
        raise ValueError("Camada vetorial sem CRS definido")
    null_count = int(frame.geometry.isna().sum())
    empty_count = int(frame.geometry.is_empty.sum())
    invalid_count = int((~frame.geometry.is_valid).sum())
    if null_count or empty_count or invalid_count:
        raise ValueError(
            f"Geometrias inválidas: nulas={null_count}, vazias={empty_count}, inválidas={invalid_count}"
        )
    original_crs = str(frame.crs)
    family = _geometry_family(frame)
    result = _normalize_fields(frame.copy())
    if target_crs:
        CRS.from_user_input(target_crs)
        result = result.to_crs(target_crs)
    if clip_frame is not None:
        mask_frame = clip_frame.to_crs(result.crs) if clip_frame.crs != result.crs else clip_frame
        result = gpd.clip(result, mask_frame)
        if result.empty:
            raise ValueError("O recorte não produziu nenhuma feição")
        if (~result.geometry.is_valid).any():
            raise ValueError("O recorte produziu geometrias inválidas")

    if family == "ponto":
        points = result.geometry.map(
            lambda geometry: geometry if geometry.geom_type == "Point" else geometry.centroid
        )
        result["lat"] = points.y
        result["long"] = points.x
    else:
        metric = _metric_frame(result)
        if family == "linha":
            result["extensao_km"] = metric.length.to_numpy() / 1000.0
        else:
            result["area_km2"] = metric.area.to_numpy() / 1_000_000.0
            result["area_ha"] = metric.area.to_numpy() / 10_000.0
            result["perimetro_m"] = metric.length.to_numpy()

    bounds = [float(value) for value in result.total_bounds]
    metadata = {
        "categoria": "vetor",
        "familia_geometrica": family,
        "crs_original": original_crs,
        "crs_final": str(result.crs),
        "crs_recomendado": SYSTEM_CRS,
        "feicoes": int(len(result)),
        "atributos": [str(column) for column in result.columns if column != result.geometry.name],
        "envelope": bounds,
        "geometrias_validas": True,
        "recortada": clip_frame is not None,
        "reprojetada": bool(target_crs),
    }
    return result, metadata


def _vector_layers(path: Path, category: str) -> list[tuple[str, gpd.GeoDataFrame]]:
    if category == "geodatabase":
        layers = list(fiona.listlayers(path))
        if not layers:
            raise ValueError("Geodatabase sem camadas vetoriais legíveis")
        return [(layer, gpd.read_file(path, layer=layer)) for layer in layers]
    return [(path.stem, gpd.read_file(path))]


def validate_raster(
    path: Path,
    *,
    target_crs: str | None,
    clip_frame: gpd.GeoDataFrame | None,
) -> tuple[np.ndarray, dict[str, Any], dict[str, Any]]:
    with rasterio.open(path) as dataset:
        if dataset.crs is None:
            raise ValueError("Raster sem CRS definido")
        if dataset.width <= 0 or dataset.height <= 0 or dataset.count <= 0:
            raise ValueError("Raster sem dimensões ou bandas válidas")
        if dataset.count != 1:
            raise ValueError("O processamento analítico aceita raster de banda única")
        source_crs = dataset.crs
        source_transform = dataset.transform
        data = dataset.read(1, masked=True).filled(np.nan).astype("float32")
        transform = source_transform
        if clip_frame is not None:
            geometries = []
            mask_source = clip_frame.to_crs(source_crs)
            for geometry in mask_source.geometry:
                if geometry is not None and not geometry.is_empty:
                    geometries.append(geometry.__geo_interface__)
            if not geometries:
                raise ValueError("Camada de recorte não possui geometrias utilizáveis")
            clipped, transform = raster_mask(dataset, geometries, crop=True, filled=True, nodata=np.nan)
            data = clipped[0].astype("float32")

    final_crs = source_crs
    if target_crs:
        final_crs = CRS.from_user_input(target_crs)
        height, width = data.shape
        left, bottom, right, top = array_bounds(height, width, transform)
        new_transform, new_width, new_height = calculate_default_transform(
            source_crs, final_crs, width, height, left, bottom, right, top
        )
        destination = np.full((int(new_height), int(new_width)), np.nan, dtype="float32")
        reproject(
            source=data,
            destination=destination,
            src_transform=transform,
            src_crs=source_crs,
            dst_transform=new_transform,
            dst_crs=final_crs,
            src_nodata=np.nan,
            dst_nodata=np.nan,
            resampling=Resampling.nearest,
        )
        data, transform = destination, new_transform
    if data.size == 0 or not np.isfinite(data).any():
        raise ValueError("Raster não possui células válidas após validação/recorte")
    profile = {"crs": final_crs, "transform": transform, "nodata": np.nan}
    metadata = {
        "categoria": "raster",
        "crs_original": str(source_crs),
        "crs_final": str(final_crs),
        "crs_recomendado": SYSTEM_CRS,
        "largura": int(data.shape[1]),
        "altura": int(data.shape[0]),
        "bandas": 1,
        "dtype": str(data.dtype),
        "celulas_validas": int(np.isfinite(data).sum()),
        "minimo": float(np.nanmin(data)),
        "maximo": float(np.nanmax(data)),
        "raster_valido": True,
        "recortado": clip_frame is not None,
        "reprojetado": bool(target_crs),
    }
    return data, profile, metadata


async def importar_camadas(
    filename: str,
    content: bytes,
    *,
    target_crs: str | None = None,
    clip_layer_id: str | None = None,
) -> dict[str, Any]:
    prepared: PreparedUpload | None = None
    stored: StoredUpload | None = None
    created_ids: list[str] = []
    try:
        prepared = prepare_upload(filename, content)
        clip_frame = (
            geoespacial_service.obter_camada_dados(clip_layer_id)
            if clip_layer_id else None
        )
        vector_results: list[tuple[str, gpd.GeoDataFrame, dict[str, Any]]] = []
        raster_result = None
        if prepared.category == "raster":
            raster_result = validate_raster(
                prepared.import_path, target_crs=target_crs, clip_frame=clip_frame
            )
        else:
            for layer_name, frame in _vector_layers(prepared.import_path, prepared.category):
                validated, metadata = validate_vector(
                    frame, target_crs=target_crs, clip_frame=clip_frame
                )
                vector_results.append((layer_name, validated, metadata))

        layer_names = [Path(filename).stem] if raster_result else [item[0] for item in vector_results]
        effective_hashes = []
        for layer_name in layer_names:
            if len(layer_names) == 1 and not target_crs and not clip_layer_id:
                effective_hashes.append(prepared.sha256)
            else:
                signature = f"{prepared.sha256}|{target_crs or ''}|{clip_layer_id or ''}|{layer_name}"
                effective_hashes.append(sha256(signature.encode("utf-8")).hexdigest())
        existing = [
            camada_geoespacial_repository.obter_importada_por_hash(item_hash)
            for item_hash in effective_hashes
        ]
        if all(existing):
            discard_prepared(prepared)
            prepared = None
            resources = [
                {
                    "id": row["recurso_sessao_id"],
                    "tipo": "raster" if row["tipo"] == "raster" else "vetorial",
                    "nome": row["nome"],
                    "crs": row.get("crs"),
                    "reutilizada": True,
                }
                for row in existing if row
            ]
            response = {"status": "reutilizado", "categoria": "existente", "recursos": resources, "quantidade": len(resources), "reutilizada": True}
            if len(resources) == 1:
                response["raster_id" if resources[0]["tipo"] == "raster" else "camada_id"] = resources[0]["id"]
            return response

        stored = commit_prepared(prepared)
        prepared = None
        common = {
            "arquivo_original": stored.relative_original_path,
            "arquivo_compactado": stored.archive,
            "categoria_armazenamento": stored.category,
            "sha256_original": stored.sha256,
            "camada_recorte_id": clip_layer_id,
        }
        resources: list[dict[str, Any]] = []
        if raster_result:
            data, profile, metadata = raster_result
            resource_id = geoespacial_service.registrar_raster(
                data, profile, Path(filename).stem, "arquivo",
                hash_arquivo=effective_hashes[0], validacao=metadata, **common,
            )
            created_ids.append(resource_id)
            resources.append({"id": resource_id, "tipo": "raster", "nome": Path(filename).stem, "metadados": metadata})
        else:
            for index, (layer_name, frame, metadata) in enumerate(vector_results):
                if existing[index]:
                    row = existing[index]
                    if row is None:  # estreita o tipo para os verificadores estáticos
                        raise RuntimeError("A camada existente não pôde ser recuperada")
                    resources.append({"id": row["recurso_sessao_id"], "tipo": "vetorial", "nome": row["nome"], "reutilizada": True})
                    continue
                resource_id = geoespacial_service.registrar_camada(
                    frame, layer_name, "arquivo",
                    hash_arquivo=effective_hashes[index], validacao=metadata, **common,
                )
                created_ids.append(resource_id)
                resources.append({"id": resource_id, "tipo": "vetorial", "nome": layer_name, "metadados": metadata})
        response = {
            "status": "importado",
            "categoria": stored.category,
            "arquivo_original": stored.relative_original_path,
            "sha256": stored.sha256,
            "recursos": resources,
            "quantidade": len(resources),
        }
        if len(resources) == 1:
            response["raster_id" if resources[0]["tipo"] == "raster" else "camada_id"] = resources[0]["id"]
            response["reutilizada"] = bool(resources[0].get("reutilizada"))
        return response
    except Exception:
        for resource_id in reversed(created_ids):
            try:
                await geoespacial_service.excluir_recurso(resource_id)
            except Exception:
                pass
        if stored:
            remove_stored(stored)
        if prepared:
            discard_prepared(prepared)
        raise


def inspecionar_camadas(filename: str, content: bytes) -> dict[str, Any]:
    prepared = prepare_upload(filename, content)
    try:
        if prepared.category == "raster":
            _, _, metadata = validate_raster(
                prepared.import_path, target_crs=None, clip_frame=None
            )
            layers = [{"nome": Path(filename).stem, **metadata}]
        else:
            layers = []
            for layer_name, frame in _vector_layers(prepared.import_path, prepared.category):
                _, metadata = validate_vector(frame, target_crs=None, clip_frame=None)
                layers.append({"nome": layer_name, **metadata})
        return {
            "categoria": prepared.category,
            "arquivo_compactado": prepared.archive,
            "crs_atual": layers[0].get("crs_original") if layers else None,
            "crs_recomendado": SYSTEM_CRS,
            "camadas": layers,
        }
    finally:
        discard_prepared(prepared)
