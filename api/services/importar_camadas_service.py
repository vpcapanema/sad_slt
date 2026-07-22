"""Pipeline transacional do endpoint importar_camadas."""
from __future__ import annotations

import re
import secrets
import threading
import time
import unicodedata
from dataclasses import dataclass
from hashlib import sha256
from pathlib import Path
from typing import Any, Callable, cast

import fiona
import geopandas as gpd
import numpy as np
import rasterio
from pyproj import CRS
from rasterio.mask import mask as raster_mask
from rasterio.transform import array_bounds
from rasterio.warp import Resampling, calculate_default_transform, reproject
from shapely.validation import explain_validity
from shapely.geometry.base import BaseGeometry

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
MAX_GEOMETRY_EXAMPLES = 10
INSPECTION_TTL_SECONDS = 15 * 60


@dataclass(frozen=True)
class _InspectionTicket:
    filename: str
    prepared: PreparedUpload
    vector_results: tuple[tuple[str, gpd.GeoDataFrame, dict[str, Any]], ...]
    raster_result: tuple[np.ndarray, dict[str, Any], dict[str, Any]] | None
    expires_at: float


_inspection_tickets: dict[str, _InspectionTicket] = {}
_inspection_lock = threading.Lock()


def _friendly_layer_alias(value: str) -> str:
    """Converte nomes físicos/técnicos em aliases legíveis para catálogo e interface."""
    text = Path(str(value)).stem
    text = re.sub(r"(?<=[a-zà-öø-ÿ0-9])(?=[A-ZÀ-ÖØ-Þ])", " ", text)
    text = re.sub(r"(?<=[A-ZÀ-ÖØ-Þ])(?=[A-ZÀ-ÖØ-Þ][a-zà-öø-ÿ])", " ", text)
    text = re.sub(r"[_\-.]+", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text.title() or "Camada"


def _cleanup_inspection_tickets() -> None:
    now = time.monotonic()
    expired: list[_InspectionTicket] = []
    with _inspection_lock:
        for token, ticket in list(_inspection_tickets.items()):
            if ticket.expires_at <= now:
                expired.append(_inspection_tickets.pop(token))
    for ticket in expired:
        discard_prepared(ticket.prepared)


def _store_inspection_ticket(
    filename: str,
    prepared: PreparedUpload,
    vector_results: list[tuple[str, gpd.GeoDataFrame, dict[str, Any]]],
    raster_result: tuple[np.ndarray, dict[str, Any], dict[str, Any]] | None,
) -> str:
    _cleanup_inspection_tickets()
    token = secrets.token_urlsafe(32)
    with _inspection_lock:
        _inspection_tickets[token] = _InspectionTicket(
            filename=filename,
            prepared=prepared,
            vector_results=tuple(vector_results),
            raster_result=raster_result,
            expires_at=time.monotonic() + INSPECTION_TTL_SECONDS,
        )
    return token


def _consume_inspection_ticket(token: str) -> _InspectionTicket:
    _cleanup_inspection_tickets()
    with _inspection_lock:
        ticket = _inspection_tickets.pop(token, None)
    if ticket is None:
        raise ValueError("A inspeção expirou ou já foi utilizada. Selecione o arquivo novamente.")
    return ticket


def _feature_reference(frame: gpd.GeoDataFrame, position: int) -> str:
    """Identifica uma feição sem depender de um campo específico da fonte."""
    row = frame.iloc[position]
    for field in ("id", "fid", "objectid", "object_id", "gid", "codigo", "cod"):
        if field in frame.columns and row.get(field) is not None:
            return f"{field}={row.get(field)}"
    return f"índice={frame.index[position]}"


def _translate_validity_reason(reason: str) -> str:
    translations = {
        "Ring Self-intersection": "Auto-interseção em anel",
        "Self-intersection": "Auto-interseção",
        "Too few points": "Quantidade insuficiente de pontos",
        "Hole lies outside shell": "Buraco localizado fora do contorno externo",
        "Nested shells": "Contornos externos aninhados",
        "Nested holes": "Buracos aninhados",
        "Disconnected interior": "Interior desconectado",
        "Duplicate Rings": "Anéis duplicados",
    }
    for original, translated in translations.items():
        if reason.startswith(original):
            detail = reason[len(original):].strip()
            return f"{translated} {detail}".strip()
    return reason


def _geometry_diagnostic(frame: gpd.GeoDataFrame, *, context: str = "arquivo de entrada") -> dict[str, Any]:
    geometry = frame.geometry
    null_mask = geometry.isna().to_numpy()
    empty_mask = ((~geometry.isna()) & geometry.is_empty).to_numpy()
    invalid_mask = ((~geometry.isna()) & (~geometry.is_empty) & (~geometry.is_valid)).to_numpy()
    problems: dict[str, list[str]] = {}

    for position in np.flatnonzero(null_mask):
        problems.setdefault("Geometria nula", []).append(_feature_reference(frame, int(position)))
    for position in np.flatnonzero(empty_mask):
        problems.setdefault("Geometria vazia", []).append(_feature_reference(frame, int(position)))
    for position in np.flatnonzero(invalid_mask):
        invalid_geometry = cast(BaseGeometry, geometry.iloc[int(position)])
        reason = _translate_validity_reason(explain_validity(invalid_geometry))
        problems.setdefault(reason, []).append(_feature_reference(frame, int(position)))

    return {
        "contexto": context,
        "total_feicoes": int(len(frame)),
        "nulas": int(null_mask.sum()),
        "vazias": int(empty_mask.sum()),
        "invalidas": int(invalid_mask.sum()),
        "problemas": problems,
        "valida": not problems,
    }


def _raise_geometry_error(diagnostic: dict[str, Any]) -> None:
    if diagnostic["valida"]:
        return
    reasons = []
    for reason, references in diagnostic["problemas"].items():
        examples = ", ".join(references[:MAX_GEOMETRY_EXAMPLES])
        omitted = len(references) - MAX_GEOMETRY_EXAMPLES
        suffix = f"; mais {omitted}" if omitted > 0 else ""
        reasons.append(f"{reason}: {len(references)} feição(ões) [{examples}{suffix}]")
    raise ValueError(
        "Validação geométrica reprovada no {contexto}: total={total_feicoes}; "
        "nulas={nulas}; vazias={vazias}; inválidas={invalidas}. Motivos: {motivos}. "
        "O arquivo não foi importado e nenhuma alteração foi persistida.".format(
            **diagnostic, motivos=" | ".join(reasons)
        )
    )


def _annotate_geometry_validation(frame: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    """Preserva o diagnóstico por feição sem alterar ou reparar a geometria original."""
    result = frame.copy()
    valid: list[bool] = []
    reasons: list[str | None] = []
    for geometry in result.geometry:
        if geometry is None:
            valid.append(False)
            reasons.append("Geometria nula")
        elif geometry.is_empty:
            valid.append(False)
            reasons.append("Geometria vazia")
        elif not geometry.is_valid:
            valid.append(False)
            reasons.append(_translate_validity_reason(explain_validity(geometry)))
        else:
            valid.append(True)
            reasons.append(None)
    result["slt_geometria_valida"] = valid
    result["slt_diagnostico_geometria"] = reasons
    return result


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
    input_diagnostic = _geometry_diagnostic(frame)
    original_crs = str(frame.crs)
    family = _geometry_family(frame)
    result = _annotate_geometry_validation(_normalize_fields(frame.copy()))
    if target_crs:
        CRS.from_user_input(target_crs)
        result = result.to_crs(target_crs)
    if clip_frame is not None:
        result_crs = result.crs
        if result_crs is None:
            raise ValueError("Camada vetorial sem CRS após o processamento")
        mask_frame = clip_frame.to_crs(result_crs) if clip_frame.crs != result_crs else clip_frame
        result = gpd.clip(result, mask_frame)
        if result.empty:
            raise ValueError("O recorte não produziu nenhuma feição")
        result = _annotate_geometry_validation(result)

    if family == "ponto":
        points = result.geometry.map(
            lambda geometry: (
                geometry if geometry is None or geometry.is_empty or geometry.geom_type == "Point"
                else geometry.centroid
            )
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
        "geometrias_validas": input_diagnostic["valida"],
        "geometrias_invalidas": input_diagnostic["invalidas"],
        "diagnostico_geometrias": input_diagnostic,
        "recortada": clip_frame is not None,
        "reprojetada": bool(target_crs),
    }
    return result, metadata


def _vector_layers(
    path: Path,
    category: str,
    source_name: str | None = None,
) -> list[tuple[str, gpd.GeoDataFrame]]:
    if category == "geodatabase":
        layers = list(fiona.listlayers(path))
        if not layers:
            raise ValueError("Geodatabase sem camadas vetoriais legíveis")
        return [(layer, gpd.read_file(path, layer=layer)) for layer in layers]
    return [(source_name or path.stem, gpd.read_file(path))]


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
        if not isinstance(new_width, int) or not isinstance(new_height, int):
            raise ValueError("Não foi possível calcular as dimensões do raster reprojetado")
        if new_width <= 0 or new_height <= 0:
            raise ValueError("A reprojeção calculou dimensões inválidas para o raster")
        destination = np.full((new_height, new_width), np.nan, dtype="float32")
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
    filename: str | None,
    content: bytes | None,
    *,
    target_crs: str | None = None,
    clip_layer_id: str | None = None,
    inspection_token: str | None = None,
    progress: Callable[[str], None] | None = None,
) -> dict[str, Any]:
    prepared: PreparedUpload | None = None
    stored: StoredUpload | None = None
    created_ids: list[str] = []
    cached_vector_results: tuple[tuple[str, gpd.GeoDataFrame, dict[str, Any]], ...] = ()
    cached_raster_result: tuple[np.ndarray, dict[str, Any], dict[str, Any]] | None = None
    try:
        if inspection_token:
            ticket = _consume_inspection_ticket(inspection_token)
            filename, prepared = ticket.filename, ticket.prepared
            cached_vector_results = ticket.vector_results
            cached_raster_result = ticket.raster_result
            if progress: progress("Arquivo validado recuperado da inspeção prévia")
        else:
            if not filename or content is None:
                raise ValueError("Informe um arquivo ou um token de inspeção válido")
            prepared = prepare_upload(filename, content)
            if progress: progress("Pacote recebido, descompactado e classificado")
        clip_frame = (
            geoespacial_service.obter_camada_dados(clip_layer_id)
            if clip_layer_id else None
        )
        if progress: progress("Opções de reprojeção e recorte conferidas")
        vector_results: list[tuple[str, gpd.GeoDataFrame, dict[str, Any]]] = []
        raster_result = None
        if not target_crs and not clip_layer_id and cached_raster_result is not None:
            raster_result = cached_raster_result
            if progress: progress("Validação raster reutilizada da inspeção")
        elif not target_crs and not clip_layer_id and cached_vector_results:
            vector_results = list(cached_vector_results)
            if progress: progress("Geometrias e atributos reutilizados da inspeção")
        elif prepared.category == "raster":
            raster_result = validate_raster(
                prepared.import_path, target_crs=target_crs, clip_frame=clip_frame
            )
            if progress: progress("Raster lido, validado e metadados extraídos")
        else:
            source_name = None if prepared.archive else Path(filename).stem
            for layer_name, frame in _vector_layers(
                prepared.import_path, prepared.category, source_name
            ):
                layer_name = _friendly_layer_alias(layer_name)
                validated, metadata = validate_vector(
                    frame, target_crs=target_crs, clip_frame=clip_frame
                )
                vector_results.append((layer_name, validated, metadata))
                if progress: progress(f"Geometrias validadas e metadados extraídos: {layer_name}")

        layer_names = [_friendly_layer_alias(prepared.name)] if raster_result else [item[0] for item in vector_results]
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
        if progress: progress("Hashes comparados com o catálogo para evitar duplicação")
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
            if progress: progress("Camadas existentes recuperadas sem nova gravação")
            return response

        stored = commit_prepared(prepared)
        if progress: progress(f"Arquivo original preservado no datastorage/{stored.category}")
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
            raster_name = _friendly_layer_alias(stored.original_path.name)
            resource_id = geoespacial_service.registrar_raster(
                data, profile, raster_name, "arquivo",
                hash_arquivo=effective_hashes[0], validacao=metadata, **common,
            )
            created_ids.append(resource_id)
            resources.append({"id": resource_id, "tipo": "raster", "nome": raster_name, "metadados": metadata})
            if progress: progress(f"Raster e metadados persistidos no banco: {raster_name}")
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
                if progress: progress(f"Camada vetorial e metadados persistidos no banco: {layer_name}")
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
        if progress: progress("Catálogo geoespacial sincronizado com o datastorage")
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
        vector_results: list[tuple[str, gpd.GeoDataFrame, dict[str, Any]]] = []
        raster_result = None
        if prepared.category == "raster":
            raster_result = validate_raster(
                prepared.import_path, target_crs=None, clip_frame=None
            )
            metadata = raster_result[2]
            layers = [{"nome": _friendly_layer_alias(prepared.name), **metadata}]
        else:
            layers = []
            source_name = None if prepared.archive else Path(filename).stem
            for layer_name, frame in _vector_layers(
                prepared.import_path, prepared.category, source_name
            ):
                layer_name = _friendly_layer_alias(layer_name)
                validated, metadata = validate_vector(frame, target_crs=None, clip_frame=None)
                vector_results.append((layer_name, validated, metadata))
                layers.append({"nome": layer_name, **metadata})
        token = _store_inspection_ticket(filename, prepared, vector_results, raster_result)
        response = {
            "categoria": prepared.category,
            "arquivo_compactado": prepared.archive,
            "crs_atual": layers[0].get("crs_original") if layers else None,
            "crs_recomendado": SYSTEM_CRS,
            "camadas": layers,
            "token_importacao": token,
        }
        prepared = None
        return response
    finally:
        if prepared is not None:
            discard_prepared(prepared)
