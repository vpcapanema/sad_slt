"""Extrai polígono de shapefile (.zip) ou GeoPackage (.gpkg) → GeoJSON."""
from __future__ import annotations

import io
import importlib
import tempfile
import zipfile
from pathlib import Path
from typing import Any, Sequence, cast

from fastapi import HTTPException
import shapefile  # pyshp
import shapely.geometry
from shapely.geometry import GeometryCollection, mapping, shape as to_shape
from shapely.geometry.base import BaseGeometry
from shapely.ops import unary_union


def _geojson_from_geometries(
    geoms: Sequence[BaseGeometry | dict[str, Any]],
    properties: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """Consolida geometrias suportadas em uma única feature GeoJSON."""
    shapes: list[BaseGeometry] = []
    for geom in geoms:
        parsed_geom: BaseGeometry
        if isinstance(geom, BaseGeometry):
            parsed_geom = geom
        else:
            parsed_geom = shapely.geometry.shape(geom)

        if isinstance(parsed_geom, GeometryCollection):
            for g in parsed_geom.geoms:
                if g.geom_type in ("Polygon", "MultiPolygon", "LineString", "MultiLineString"):
                    shapes.append(g)
        elif parsed_geom.geom_type in ("Polygon", "MultiPolygon", "LineString", "MultiLineString"):
            shapes.append(parsed_geom)
    if not shapes:
        raise HTTPException(400, "Nenhuma geometria de área ou linha encontrada no arquivo.")

    poly_shapes = [s for s in shapes if s.geom_type in ("Polygon", "MultiPolygon")]
    line_shapes = [s for s in shapes if s.geom_type in ("LineString", "MultiLineString")]

    if poly_shapes:
        merged = unary_union(poly_shapes)
    else:
        merged = unary_union(line_shapes)

    if merged.geom_type not in ("Polygon", "MultiPolygon", "LineString", "MultiLineString"):
        raise HTTPException(400, f"Geometria não suportada: {merged.geom_type}.")
    return {
        "type": "Feature",
        "properties": properties[0] if properties else {},
        "geometry": mapping(merged),
    }


def parse_shapefile_zip(content: bytes) -> dict[str, Any]:
    """Lê um ZIP com shapefile e retorna a geometria consolidada em GeoJSON."""
    with zipfile.ZipFile(io.BytesIO(content)) as zf:
        shp_names = [n for n in zf.namelist() if n.lower().endswith(".shp")]
        if not shp_names:
            raise HTTPException(400, "ZIP não contém arquivo .shp.")
        shp_name = shp_names[0]
        base = Path(shp_name).stem
        extract_dir = tempfile.mkdtemp()
        members = [
            n
            for n in zf.namelist()
            if Path(n).name.lower().startswith(base.lower())
            and Path(n).suffix.lower() in (".shp", ".shx", ".dbf", ".prj", ".cpg")
        ]
        for m in members:
            zf.extract(m, extract_dir)
        shp_path = str(Path(extract_dir) / Path(shp_name).name)
        reader = shapefile.Reader(shp_path)
        geoms: list[dict[str, Any]] = []
        for sr in reader.shapeRecords():
            shp_record = sr.shape
            if shp_record is None:
                continue
            geoms.append(cast(dict[str, Any], shp_record.__geo_interface__))
    supported = ("Polygon", "MultiPolygon", "LineString", "MultiLineString")
    parsed = [to_shape(g) for g in geoms if g.get("type") in supported]
    if not parsed:
        raise HTTPException(400, "Shapefile não contém polígonos ou linhas.")
    return _geojson_from_geometries(parsed)


def parse_geopackage(content: bytes) -> dict[str, Any]:
    """Lê um GeoPackage e retorna a geometria consolidada em GeoJSON."""
    try:
        gpd = importlib.import_module("geopandas")
    except ImportError as e:
        raise HTTPException(
            501,
            "GeoPackage requer geopandas no servidor. Instale: pip install geopandas",
        ) from e

    with tempfile.NamedTemporaryFile(suffix=".gpkg", delete=False) as tmp:
        tmp.write(content)
        path = tmp.name
    gdf = gpd.read_file(path)
    if gdf.empty:
        raise HTTPException(400, "GeoPackage vazio.")
    gdf = gdf[gdf.geometry.type.isin(["Polygon", "MultiPolygon", "LineString", "MultiLineString"])]
    if gdf.empty:
        raise HTTPException(400, "GeoPackage não contém polígonos ou linhas.")
    geoms = list(gdf.geometry)
    props = [dict(r) for _, r in gdf.drop(columns="geometry").iterrows()]
    return _geojson_from_geometries(geoms, props)


def parse_upload(filename: str, content: bytes) -> dict[str, Any]:
    """Despacha o parser adequado conforme a extensão do arquivo enviado."""
    name = (filename or "").lower()
    if name.endswith(".zip"):
        feature = parse_shapefile_zip(content)
    elif name.endswith(".gpkg"):
        feature = parse_geopackage(content)
    else:
        raise HTTPException(400, "Envie .zip (shapefile) ou .gpkg (GeoPackage).")
    geom = feature["geometry"]
    return {
        "tipo": geom["type"],
        "geojson": feature,
        "coordinates": geom["coordinates"],
    }
