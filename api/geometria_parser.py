"""Lê arquivos vetoriais de cadastro e normaliza a geometria para GeoJSON."""
from __future__ import annotations

import io
from contextvars import ContextVar
import json
import shutil
import tempfile
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path, PurePosixPath
from typing import Any, Sequence

from fastapi import HTTPException
from osgeo import ogr, gdal
from api.services.normalizacao_demanda import reprojetar

MAX_GEOMETRIA_UPLOAD_BYTES = 50 * 1024 * 1024
_SOURCE_CRS = ContextVar('demanda_source_crs', default=None)


def _geojson_from_geometries(
    geoms: Sequence[Any],
    properties: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """Consolida geometrias suportadas em uma única feature GeoJSON."""
    shapes = []
    for geom in geoms:
        if isinstance(geom, ogr.Geometry):
            parsed_geom = geom
        else:
            parsed_geom = ogr.CreateGeometryFromJson(json.dumps(geom))
        if parsed_geom is None or parsed_geom.IsEmpty():
            continue

        pending = [parsed_geom]
        while pending:
            current = pending.pop()
            kind = ogr.GT_Flatten(current.GetGeometryType())
            if kind in (ogr.wkbGeometryCollection, ogr.wkbMultiPoint, ogr.wkbMultiLineString, ogr.wkbMultiPolygon):
                pending.extend(current.GetGeometryRef(i).Clone() for i in range(current.GetGeometryCount()))
            elif kind in (ogr.wkbPoint, ogr.wkbLineString, ogr.wkbPolygon):
                shapes.append(current)
    if not shapes:
        raise HTTPException(400, "O arquivo não contém pontos, linhas ou polígonos válidos.")

    dimensions = {s.GetDimension() for s in shapes}
    if len(dimensions) != 1:
        raise HTTPException(400, "O arquivo deve conter apenas pontos, linhas ou polígonos, não uma mistura.")

    if len(shapes) == 1:
        merged = shapes[0]
    else:
        merged = ogr.Geometry({0:ogr.wkbMultiPoint,1:ogr.wkbMultiLineString,2:ogr.wkbMultiPolygon}[next(iter(dimensions))])
        for geom in shapes:
            merged.AddGeometry(geom)
    return {
        "type": "Feature",
        "properties": properties[0] if properties else {},
        "geometry": json.loads(merged.ExportToJson()),
    }


def parse_shapefile_zip(content: bytes) -> dict[str, Any]:
    """Lê todas as feições de shapefile e converte seu CRS para WGS84."""
    try:
        archive = zipfile.ZipFile(io.BytesIO(content))
    except zipfile.BadZipFile as exc:
        raise HTTPException(400, "Arquivo ZIP inválido.") from exc

    with archive, tempfile.TemporaryDirectory() as extract_dir:
        shp_names = [name for name in archive.namelist() if name.lower().endswith(".shp")]
        if not shp_names:
            raise HTTPException(400, "ZIP não contém arquivo .shp.")
        members = [
            name for name in archive.namelist()
            if Path(name).suffix.lower() in (".shp", ".shx", ".dbf", ".prj", ".cpg")
        ]
        for member in members:
            relative = PurePosixPath(member.replace("\\", "/"))
            if relative.is_absolute() or ".." in relative.parts or (relative.parts and ":" in relative.parts[0]):
                raise HTTPException(400, "ZIP contém um caminho de arquivo inválido.")
            destination = Path(extract_dir).joinpath(*relative.parts)
            destination.parent.mkdir(parents=True, exist_ok=True)
            with archive.open(member) as source, destination.open("wb") as target:
                shutil.copyfileobj(source, target)

        geometries = []
        for shp_name in shp_names:
            relative = PurePosixPath(shp_name.replace("\\", "/"))
            source_path = Path(extract_dir).joinpath(*relative.parts)
            geometries.extend(_read_ogr(source_path))
        return _geojson_from_geometries(geometries)


def _read_ogr(path):
    dataset = gdal.OpenEx(str(path), gdal.OF_VECTOR)
    if dataset is None:
        raise HTTPException(400, 'GDAL não conseguiu abrir o arquivo vetorial.')
    layer = dataset.GetLayer(0)
    reference = layer.GetSpatialRef()
    if reference is None:
        raise HTTPException(400, 'O arquivo vetorial precisa informar seu sistema de coordenadas (CRS).')
    sources = _SOURCE_CRS.get()
    if sources is not None:
        sources.append(reference.ExportToWkt())
    geometries = []
    for feature in layer:
        geom = feature.GetGeometryRef()
        if geom is not None and not geom.IsEmpty():
            geometries.append(reprojetar(geom, reference.ExportToWkt(), 4326))
    return geometries


def parse_geopackage(content: bytes) -> dict[str, Any]:
    """Lê todas as feições de GeoPackage e converte seu CRS para WGS84."""
    with tempfile.TemporaryDirectory() as tmp_dir:
        path = Path(tmp_dir) / "upload.gpkg"
        path.write_bytes(content)
        geometries = _read_ogr(path)
        if not geometries:
            raise HTTPException(400, "GeoPackage vazio.")
        return _geojson_from_geometries(geometries)


def _local_name(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def _kml_coordinates(element: ET.Element) -> list[tuple[float, float]]:
    points = []
    for item in (element.text or "").split():
        values = item.split(",")
        if len(values) >= 2:
            points.append((float(values[0]), float(values[1])))
    return points


def _kml_geometries(element: ET.Element) -> list[Any]:
    kind = _local_name(element.tag)
    if kind == "Point":
        coordinates = next((node for node in element.iter() if _local_name(node.tag) == "coordinates"), None)
        points = _kml_coordinates(coordinates) if coordinates is not None else []
        return [{'type':'Point','coordinates':points[0]}] if points else []
    if kind == "LineString":
        coordinates = next((node for node in element.iter() if _local_name(node.tag) == "coordinates"), None)
        points = _kml_coordinates(coordinates) if coordinates is not None else []
        return [{'type':'LineString','coordinates':points}] if len(points) >= 2 else []
    if kind == "Polygon":
        boundaries = [node for node in element.iter() if _local_name(node.tag) in ("outerBoundaryIs", "innerBoundaryIs")]
        rings = []
        for boundary in boundaries:
            coordinates = next((node for node in boundary.iter() if _local_name(node.tag) == "coordinates"), None)
            points = _kml_coordinates(coordinates) if coordinates is not None else []
            if len(points) >= 4:
                rings.append(points)
        return [{'type':'Polygon','coordinates':rings}] if rings else []
    geometries = []
    for child in element:
        geometries.extend(_kml_geometries(child))
    return geometries


def parse_kml(content: bytes) -> dict[str, Any]:
    try:
        root = ET.fromstring(content)
    except ET.ParseError as exc:
        raise HTTPException(400, "Arquivo KML inválido.") from exc
    geometries = _kml_geometries(root)
    if not geometries:
        raise HTTPException(400, "KML não contém pontos, linhas ou polígonos válidos.")
    return _geojson_from_geometries(geometries)


def parse_kmz(content: bytes) -> dict[str, Any]:
    try:
        with zipfile.ZipFile(io.BytesIO(content)) as archive:
            kml_names = [name for name in archive.namelist() if name.lower().endswith(".kml")]
            if not kml_names:
                raise HTTPException(400, "KMZ não contém arquivo KML.")
            geometries = []
            for name in kml_names:
                geometries.extend(_kml_geometries(ET.fromstring(archive.read(name))))
    except zipfile.BadZipFile as exc:
        raise HTTPException(400, "Arquivo KMZ inválido.") from exc
    except ET.ParseError as exc:
        raise HTTPException(400, "O KMZ contém um arquivo KML inválido.") from exc
    return _geojson_from_geometries(geometries)


def parse_geojson(content: bytes) -> dict[str, Any]:
    try:
        data = json.loads(content)
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise HTTPException(400, "Arquivo GeoJSON inválido.") from exc

    kind = data.get("type")
    if kind == "FeatureCollection":
        geometries = [feature.get("geometry") for feature in data.get("features", []) if feature.get("geometry")]
    elif kind == "Feature":
        geometries = [data.get("geometry")] if data.get("geometry") else []
    else:
        geometries = [data]
    feature = _geojson_from_geometries(geometries)
    declared = (data.get('crs') or {}).get('properties', {}).get('name')
    if declared:
        try:
            geom = ogr.CreateGeometryFromJson(json.dumps(feature['geometry']))
            feature['geometry'] = json.loads(reprojetar(geom, declared, 4326).ExportToJson())
        except Exception as exc:
            raise HTTPException(400, 'CRS declarado no GeoJSON inválido.') from exc
    sources = _SOURCE_CRS.get()
    if sources is not None:
        sources.append(declared or 'EPSG:4326')
    return feature


def _parse_upload(filename: str, content: bytes) -> dict[str, Any]:
    """Despacha o parser adequado conforme a extensão do arquivo enviado."""
    name = (filename or "").lower()
    if name.endswith(".zip"):
        feature = parse_shapefile_zip(content)
    elif name.endswith(".gpkg"):
        feature = parse_geopackage(content)
    elif name.endswith(".geojson"):
        feature = parse_geojson(content)
    elif name.endswith(".kml"):
        feature = parse_kml(content)
    elif name.endswith(".kmz"):
        feature = parse_kmz(content)
    else:
        raise HTTPException(400, "Envie KMZ, KML, GeoPackage, ZIP com shapefile ou GeoJSON.")
    geom = feature["geometry"]
    return {
        "tipo": geom["type"],
        "geojson": feature,
        "coordinates": geom["coordinates"],
    }


def parse_upload(filename: str, content: bytes) -> dict[str, Any]:
    token = _SOURCE_CRS.set([])
    try:
        result = _parse_upload(filename, content)
        result['crs_origem'] = sorted(set(_SOURCE_CRS.get())) or ['EPSG:4326']
        return result
    finally:
        _SOURCE_CRS.reset(token)
