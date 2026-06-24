"""Extrai polígono de shapefile (.zip) ou GeoPackage (.gpkg) → GeoJSON."""
from __future__ import annotations

import io
import tempfile
import zipfile
from pathlib import Path
from typing import Any

from fastapi import HTTPException


def _geojson_from_geometries(geoms: list, properties: list[dict] | None = None) -> dict[str, Any]:
    import shapely.geometry
    from shapely.geometry import mapping
    from shapely.ops import unary_union

    shapes = []
    for geom in geoms:
        if geom is None:
            continue
        if not hasattr(geom, "is_valid"):
            geom = shapely.geometry.shape(geom)
        if geom.geom_type == "GeometryCollection":
            for g in geom.geoms:
                if g.geom_type in ("Polygon", "MultiPolygon", "LineString", "MultiLineString"):
                    shapes.append(g)
        elif geom.geom_type in ("Polygon", "MultiPolygon", "LineString", "MultiLineString"):
            shapes.append(geom)
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
    import shapefile  # pyshp

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
        geoms = []
        for sr in reader.shapeRecords():
            geoms.append(sr.shape.__geo_interface__)
    from shapely.geometry import shape

    supported = ("Polygon", "MultiPolygon", "LineString", "MultiLineString")
    parsed = [shape(g) for g in geoms if g.get("type") in supported]
    if not parsed:
        raise HTTPException(400, "Shapefile não contém polígonos ou linhas.")
    return _geojson_from_geometries(parsed)


def parse_geopackage(content: bytes) -> dict[str, Any]:
    try:
        import geopandas as gpd
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
