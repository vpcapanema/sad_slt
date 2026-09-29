"""Metadados e leitura paginada de camadas originais da bancada."""
from __future__ import annotations

import base64
import json
import math
from dataclasses import dataclass
from datetime import date, datetime, time
from pathlib import Path
from typing import Any

from osgeo import gdal, ogr, osr

from api import path_policy
from api.services import storage_geoespacial, visualizacao_arquivo


_DRIVERS = ["GPKG", "ESRI Shapefile", "GeoJSON", "FlatGeobuf", "KML", "LIBKML", "GML"]
_FORMATOS_VETORIAIS = {".fgb", ".gml", ".gpkg", ".json", ".kml", ".shp", ".geojson"}
_COMPONENTES_SHP = {".shp", ".shx", ".dbf", ".prj", ".cpg", ".qpj"}
LIMITE_GEOMETRIAS = 100
LIMITE_CONSULTA = 1000
_LOTE_CONSULTA = 5000
_COLUNA_SEM_GEOMETRIA = "__sicard_sem_geometria__"


@dataclass(frozen=True)
class Fonte:
    ident: str
    caminho: Path | storage_geoespacial.ArquivoStorage
    arquivo: str
    camada: str | None
    nome: str
    origem: dict[str, Any]
    local: bool


def _fonte(ident: str, arquivo: str) -> Fonte:
    if ident.startswith(storage_geoespacial.PREFIXO_ID):
        caminho, camada = storage_geoespacial.separar_id(ident)
        canonical_id = f"{storage_geoespacial.PREFIXO_ID}{caminho}"
        if camada:
            canonical_id += f"::{camada}"
        if ident != canonical_id or arquivo != caminho:
            raise ValueError("O arquivo não corresponde à camada informada.")
        resolvido = storage_geoespacial.resolver(caminho)
        if Path(resolvido.name).suffix.lower() not in storage_geoespacial.EXTENSOES_VETOR:
            raise ValueError("A camada não é vetorial.")
        return Fonte(
            ident, resolvido, caminho, camada, Path(resolvido.name).stem,
            {"tipo": "storage", "camada": camada}, False,
        )

    relativo = path_policy.relative_path(arquivo, label="arquivo geoespacial").as_posix()
    from api.routers.geoespacial import RAIZES_CARREGAVEIS

    path = path_policy.project_path(relativo, label="arquivo geoespacial").resolve()
    root = next(
        (
            path_policy.project_path(f"data/geoespacial/{area['caminho']}").resolve()
            for area in RAIZES_CARREGAVEIS.values()
            if relativo.startswith(f"data/geoespacial/{area['caminho']}/")
        ),
        None,
    )
    if root is None or not path.is_relative_to(root):
        raise ValueError("Selecione um arquivo registrado nas áreas permitidas.")
    if not path.is_file():
        raise FileNotFoundError("Arquivo geoespacial não encontrado.")
    if path.suffix.lower() not in _FORMATOS_VETORIAIS:
        raise ValueError("A camada não é vetorial.")

    from api.services.catalogo_arquivos import camadas_dos_arquivos

    matches = camadas_dos_arquivos({relativo})
    registro = next(
        (
            row for row in matches
            if str(row.get("id")) == ident and row.get("arquivo") == relativo
        ),
        None,
    )
    if registro is None:
        raise ValueError("O identificador não está vinculado a este arquivo registrado.")
    return Fonte(
        ident, path, relativo, None, str(registro.get("nome") or path.stem),
        {"tipo": "arquivo_registrado", "categoria": registro.get("categoria_catalogo")},
        True,
    )


def _assinatura_local(path: Path) -> tuple[tuple[str, int, int], ...]:
    partes = [path]
    if path.suffix.lower() == ".shp":
        partes = sorted(
            (
                item for item in path.parent.iterdir()
                if item.stem.casefold() == path.stem.casefold()
                and item.suffix.lower() in _COMPONENTES_SHP
            ),
            key=lambda item: item.name.casefold(),
        )
    assinatura = []
    for item in partes:
        estado = item.stat()
        assinatura.append((item.name, estado.st_size, estado.st_mtime_ns))
    return tuple(assinatura)


def _revisao(fonte: Fonte) -> str:
    if fonte.local:
        return visualizacao_arquivo.revisao_arquivo(fonte.caminho)
    estado = fonte.caminho.stat()
    return f"{estado.st_mtime_ns}-{estado.st_size}"


def _abrir(fonte: Fonte) -> tuple[gdal.Dataset, ogr.Layer]:
    try:
        dataset = gdal.OpenEx(
            str(fonte.caminho),
            gdal.OF_VECTOR | gdal.OF_READONLY,
            allowed_drivers=_DRIVERS,
        )
    except RuntimeError as exc:
        raise ValueError("GDAL não conseguiu abrir o arquivo vetorial.") from exc
    if dataset is None:
        raise ValueError("GDAL não conseguiu abrir o arquivo vetorial.")
    if fonte.local and dataset.GetLayerCount() != 1:
        raise ValueError("O arquivo registrado deve conter uma única camada vetorial.")
    if fonte.camada:
        camada = dataset.GetLayerByName(fonte.camada)
    elif dataset.GetLayerCount() == 1 or fonte.local:
        camada = dataset.GetLayer(0)
    else:
        camada = None
    if camada is None:
        dataset = None
        if fonte.camada:
            raise FileNotFoundError("Camada não encontrada no arquivo.")
        raise ValueError("Informe uma camada para arquivos com múltiplas camadas.")
    return dataset, camada


def _campos(camada: ogr.Layer) -> list[dict[str, str]]:
    definition = camada.GetLayerDefn()
    return [
        {
            "nome": field.GetName(),
            "tipo": field.GetTypeName(),
            "subtipo": ogr.GetFieldSubTypeName(field.GetSubType()),
        }
        for field in (definition.GetFieldDefn(index) for index in range(definition.GetFieldCount()))
    ]


def _bounds(camada: ogr.Layer) -> list[float] | None:
    extent = camada.GetExtent(force=1)
    if extent is None:
        return None
    spatial_ref = camada.GetSpatialRef()
    if spatial_ref is None:
        raise ValueError("O arquivo não informa seu CRS.")
    source = spatial_ref.Clone()
    source.SetAxisMappingStrategy(osr.OAMS_TRADITIONAL_GIS_ORDER)
    target = osr.SpatialReference()
    target.ImportFromEPSG(4326)
    target.SetAxisMappingStrategy(osr.OAMS_TRADITIONAL_GIS_ORDER)
    min_x, max_x, min_y, max_y = extent
    try:
        bounds = osr.CoordinateTransformation(source, target).TransformBounds(
            min_x, min_y, max_x, max_y, 21
        )
    except RuntimeError as exc:
        raise ValueError("Não foi possível transformar a extensão para WGS84.") from exc
    return [float(value) for value in bounds]


def _metadata(fonte: Fonte, revisao: str) -> dict[str, Any]:
    signature = _assinatura_local(fonte.caminho) if fonte.local else None
    dataset, camada = _abrir(fonte)
    try:
        spatial_ref = camada.GetSpatialRef()
        if spatial_ref is None:
            raise ValueError("O arquivo não informa seu CRS.")
        count = camada.GetFeatureCount(0)
        result = {
            "id": fonte.ident,
            "nome": (
                camada.GetName()
                if fonte.origem["tipo"] == "storage" and dataset.GetLayerCount() > 1
                else fonte.nome
            ),
            "arquivo": fonte.arquivo,
            "revisao": revisao,
            "campos": _campos(camada),
            "crs_arquivo": spatial_ref.ExportToWkt(),
            "feicoes": count if count >= 0 else None,
            "geometria_tipo": ogr.GeometryTypeToName(camada.GetGeomType()),
            "geometria_tem_z": bool(ogr.GT_HasZ(camada.GetGeomType())),
            "geometria_tem_m": bool(ogr.GT_HasM(camada.GetGeomType())),
            "bounds": _bounds(camada),
            "crs_bounds": "EPSG:4326",
            "formato": dataset.GetDriver().ShortName,
            "origem_geometria": fonte.origem["tipo"],
            "origem": fonte.origem,
            "coluna_fid": camada.GetFIDColumn(),
            "campo_fid_tile": storage_geoespacial.campo_fid_tile(camada),
        }
        if fonte.local and signature != _assinatura_local(fonte.caminho):
            raise ValueError("O arquivo foi alterado durante a leitura. Abra novamente.")
        return result
    finally:
        dataset = None


def preparar(ident: str, arquivo: str) -> dict[str, Any]:
    fonte = _fonte(ident, arquivo)
    signature = _assinatura_local(fonte.caminho) if fonte.local else None
    result = _metadata(fonte, _revisao(fonte))
    if fonte.local and signature != _assinatura_local(fonte.caminho):
        raise ValueError("O arquivo foi alterado durante a leitura. Abra novamente.")
    if _revisao(fonte) != result["revisao"]:
        raise ValueError("O arquivo foi alterado durante a leitura. Abra novamente.")
    return result


def _json_value(value: Any) -> Any:
    if isinstance(value, (date, datetime, time)):
        return value.isoformat()
    if isinstance(value, bytes):
        return base64.b64encode(value).decode("ascii")
    if isinstance(value, float) and not math.isfinite(value):
        return None
    if isinstance(value, (list, tuple)):
        return [_json_value(item) for item in value]
    return value


def ler_tabela(
    ident: str,
    arquivo: str,
    revisao: str,
    offset: int,
    limite: int,
) -> dict[str, Any]:
    fonte = _fonte(ident, arquivo)
    atual = _revisao(fonte)
    if atual != revisao:
        raise ValueError("O arquivo mudou desde a abertura. Reabra antes de ler a tabela.")
    signature = _assinatura_local(fonte.caminho) if fonte.local else None
    dataset, camada = _abrir(fonte)
    try:
        count = camada.GetFeatureCount(0)
        total = count if count >= 0 else None
        camada.ResetReading()
        if offset:
            try:
                posicionado = camada.SetNextByIndex(offset) == ogr.OGRERR_NONE
            except RuntimeError:
                posicionado = False
            if not posicionado:
                camada.ResetReading()
                for _ in range(offset):
                    if camada.GetNextFeature() is None:
                        break
        definition = camada.GetLayerDefn()
        columns = [
            (definition.GetFieldDefn(index).GetName(), index)
            for index in range(definition.GetFieldCount())
        ]
        rows = []
        for _ in range(limite):
            feature = camada.GetNextFeature()
            if feature is None:
                break
            rows.append({
                "id": str(feature.GetFID()),
                "atributos": {
                    name: _json_value(feature.GetField(index))
                    for name, index in columns
                },
            })
        if fonte.local and signature != _assinatura_local(fonte.caminho):
            raise ValueError("O arquivo foi alterado durante a leitura. Reabra a tabela.")
        if _revisao(fonte) != revisao:
            raise ValueError("O arquivo mudou durante a leitura. Reabra a tabela.")
        return {
            "id": fonte.ident,
            "arquivo": fonte.arquivo,
            "revisao": revisao,
            "total": total,
            "offset": offset,
            "limite": limite,
            "linhas": rows,
            "has_more": offset + len(rows) < total if total is not None else len(rows) == limite,
        }
    finally:
        dataset = None



def _transformacao_wgs84(camada: ogr.Layer) -> osr.CoordinateTransformation:
    spatial_ref = camada.GetSpatialRef()
    if spatial_ref is None:
        raise ValueError("O arquivo não informa seu CRS.")
    source = spatial_ref.Clone()
    source.SetAxisMappingStrategy(osr.OAMS_TRADITIONAL_GIS_ORDER)
    target = osr.SpatialReference()
    target.ImportFromEPSG(4326)
    target.SetAxisMappingStrategy(osr.OAMS_TRADITIONAL_GIS_ORDER)
    return osr.CoordinateTransformation(source, target)


def _fids(ids: list[str]) -> list[int]:
    if not ids:
        raise ValueError("Informe ao menos um identificador de feição.")
    if len(ids) > LIMITE_GEOMETRIAS:
        raise ValueError(f"Solicite no máximo {LIMITE_GEOMETRIAS} feições por vez.")
    fids: list[int] = []
    for value in ids:
        text = str(value).strip()
        if not text.isascii() or not text.isdigit():
            raise ValueError(f"Identificador de feição inválido: {value!r}.")
        fid = int(text)
        if fid not in fids:
            fids.append(fid)
    return fids


def ler_geometrias(
    ident: str,
    arquivo: str,
    revisao: str,
    ids: list[str],
) -> dict[str, Any]:
    """Lê apenas as feições pedidas por FID, com geometria em EPSG:4326."""
    fids = _fids(ids)
    fonte = _fonte(ident, arquivo)
    if _revisao(fonte) != revisao:
        raise ValueError("O arquivo mudou desde a abertura. Reabra antes de editar.")
    signature = _assinatura_local(fonte.caminho) if fonte.local else None
    dataset, camada = _abrir(fonte)
    try:
        transformacao = _transformacao_wgs84(camada)
        definition = camada.GetLayerDefn()
        columns = [
            (definition.GetFieldDefn(index).GetName(), index)
            for index in range(definition.GetFieldCount())
        ]
        features = []
        ausentes = []
        for fid in fids:
            try:
                feature = camada.GetFeature(fid)
            except RuntimeError:
                feature = None
            if feature is None:
                ausentes.append(str(fid))
                continue
            geometry = feature.GetGeometryRef()
            geojson_geometry = None
            if geometry is not None:
                geometry = geometry.Clone()
                if geometry.Transform(transformacao) != ogr.OGRERR_NONE:
                    raise ValueError(f"Não foi possível transformar a feição {fid} para WGS84.")
                geojson_geometry = json.loads(geometry.ExportToJson())
            features.append({
                "type": "Feature",
                "id": str(fid),
                "properties": {
                    name: _json_value(feature.GetField(index))
                    for name, index in columns
                },
                "geometry": geojson_geometry,
            })
        if ausentes:
            raise ValueError(
                "Feições inexistentes nesta revisão do arquivo: " + ", ".join(ausentes) + "."
            )
        if fonte.local and signature != _assinatura_local(fonte.caminho):
            raise ValueError("O arquivo foi alterado durante a leitura. Reabra antes de editar.")
        if _revisao(fonte) != revisao:
            raise ValueError("O arquivo mudou durante a leitura. Reabra antes de editar.")
        return {
            "id": fonte.ident,
            "arquivo": fonte.arquivo,
            "revisao": revisao,
            "crs": "EPSG:4326",
            "coluna_fid": camada.GetFIDColumn(),
            "type": "FeatureCollection",
            "features": features,
        }
    finally:
        dataset = None


def _tipos_consulta(camada: ogr.Layer) -> list[tuple[str, int, str | None]]:
    definition = camada.GetLayerDefn()
    columns = []
    for index in range(definition.GetFieldCount()):
        field = definition.GetFieldDefn(index)
        if field.GetSubType() == ogr.OFSTBoolean:
            dtype = "boolean"
        elif field.GetType() in (ogr.OFTInteger, ogr.OFTInteger64):
            dtype = "Int64"
        elif field.GetType() == ogr.OFTReal:
            dtype = "float64"
        else:
            dtype = None
        columns.append((field.GetName(), index, dtype))
    return columns


def _lote_consulta(
    fids: list[str],
    rows: list[list[Any]],
    columns: list[tuple[str, int, str | None]],
):
    import geopandas as gpd
    import pandas as pd

    frame = pd.DataFrame(rows, index=fids, columns=[name for name, _, _ in columns], dtype=object)
    for name, _, dtype in columns:
        if dtype:
            frame[name] = frame[name].astype(dtype)
        else:
            frame[name] = frame[name].infer_objects()
    # O avaliador exige um GeoDataFrame, mas a consulta nunca lê geometrias.
    frame[_COLUNA_SEM_GEOMETRIA] = gpd.GeoSeries([None] * len(fids), index=frame.index)
    return gpd.GeoDataFrame(frame, geometry=_COLUNA_SEM_GEOMETRIA)


def consultar(
    ident: str,
    arquivo: str,
    revisao: str,
    expressao: str,
    inverter_selecao: bool,
    offset: int,
    limite: int,
) -> dict[str, Any]:
    """Filtra todos os registros e devolve uma página de FIDs, sem geometrias."""
    from api.services.expressoes_atributos import selecionar

    if not expressao.strip():
        raise ValueError("Informe uma expressão de consulta.")
    if not 1 <= limite <= LIMITE_CONSULTA:
        raise ValueError(f"O limite da página deve estar entre 1 e {LIMITE_CONSULTA}.")
    if offset < 0:
        raise ValueError("O deslocamento não pode ser negativo.")
    fonte = _fonte(ident, arquivo)
    if _revisao(fonte) != revisao:
        raise ValueError("O arquivo mudou desde a abertura. Reabra antes de consultar.")
    signature = _assinatura_local(fonte.caminho) if fonte.local else None
    dataset, camada = _abrir(fonte)
    try:
        columns = _tipos_consulta(camada)
        camada.SetIgnoredFields(["OGR_GEOMETRY", "OGR_STYLE"])
        camada.ResetReading()
        total = 0
        registros = 0
        ids: list[str] = []
        avaliado = False

        def filtrar(fids: list[str], rows: list[list[Any]]) -> None:
            nonlocal total, avaliado
            selected = selecionar(_lote_consulta(fids, rows, columns), expressao, inverter_selecao)
            avaliado = True
            for fid in selected.index:
                if offset <= total < offset + limite:
                    ids.append(str(fid))
                total += 1

        fids: list[str] = []
        rows: list[list[Any]] = []
        while True:
            feature = camada.GetNextFeature()
            if feature is None:
                break
            registros += 1
            fids.append(str(feature.GetFID()))
            rows.append([
                None if not feature.IsFieldSetAndNotNull(index)
                else _json_value(feature.GetField(index))
                for _, index, _ in columns
            ])
            if len(fids) >= _LOTE_CONSULTA:
                filtrar(fids, rows)
                fids, rows = [], []
        if fids or not avaliado:
            filtrar(fids, rows)
        if fonte.local and signature != _assinatura_local(fonte.caminho):
            raise ValueError("O arquivo foi alterado durante a consulta. Reabra a camada.")
        if _revisao(fonte) != revisao:
            raise ValueError("O arquivo mudou durante a consulta. Reabra a camada.")
        return {
            "id": fonte.ident,
            "arquivo": fonte.arquivo,
            "revisao": revisao,
            "expressao": expressao,
            "inverter_selecao": inverter_selecao,
            "total": total,
            "total_feicoes": registros,
            "offset": offset,
            "limite": limite,
            "ids": ids,
            "has_more": offset + len(ids) < total,
        }
    finally:
        dataset = None


def tile_local(ident: str, arquivo: str, revisao: str, z: int, x: int, y: int) -> bytes:
    """Tile MVT (source-layer "camada") gerado do arquivo local registrado original."""
    from api.services import storage_geoespacial

    if not 0 <= z <= 22 or not (0 <= x < 2**z and 0 <= y < 2**z):
        raise ValueError("Tile fora da grade.")
    fonte = _fonte(ident, arquivo)
    if not fonte.local:
        raise ValueError("Use o endpoint de tiles do storage para camadas do storage.")
    if _revisao(fonte) != revisao:
        raise ValueError("O arquivo mudou desde a abertura. Reabra a camada.")
    signature = _assinatura_local(fonte.caminho)
    dataset, camada = _abrir(fonte)
    try:
        if camada.GetSpatialRef() is None:
            raise ValueError("O arquivo não informa seu CRS.")
        nome_camada = camada.GetName()
    finally:
        dataset = None
    # A assinatura inclui os componentes do shapefile e invalida o cache do tile.
    conteudo = storage_geoespacial._tile(str(fonte.caminho), nome_camada, signature, z, x, y)
    if signature != _assinatura_local(fonte.caminho) or _revisao(fonte) != revisao:
        raise ValueError("O arquivo mudou durante a leitura. Reabra a camada.")
    return conteudo
