import json
import zipfile
from io import BytesIO

import geopandas as gpd
import pytest
from fastapi import HTTPException
from shapely.geometry import Point, shape

from api.geometria_parser import parse_upload


def test_geojson_preserves_multiple_point_features():
    payload = {
        "type": "FeatureCollection",
        "features": [
            {"type": "Feature", "properties": {}, "geometry": {"type": "Point", "coordinates": [-46.6, -23.5]}},
            {"type": "Feature", "properties": {}, "geometry": {"type": "Point", "coordinates": [-46.7, -23.6]}},
        ],
    }

    result = parse_upload("projeto.geojson", json.dumps(payload).encode())
    geometry = shape(result["geojson"]["geometry"])

    assert result["tipo"] == "MultiPoint"
    assert len(geometry.geoms) == 2
    assert sorted(point.x for point in geometry.geoms) == [-46.7, -46.6]


def test_geojson_preserves_overlapping_polygon_features():
    payload = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "properties": {},
                "geometry": {"type": "Polygon", "coordinates": [[[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]]]},
            },
            {
                "type": "Feature",
                "properties": {},
                "geometry": {"type": "Polygon", "coordinates": [[[1, 1], [3, 1], [3, 3], [1, 3], [1, 1]]]},
            },
        ],
    }

    result = parse_upload("areas.geojson", json.dumps(payload).encode())
    geometry = shape(result["geojson"]["geometry"])

    assert result["tipo"] == "MultiPolygon"
    assert len(geometry.geoms) == 2
    assert all(len(polygon.exterior.coords) == 5 for polygon in geometry.geoms)


def test_kml_reads_line_geometry():
    content = b"""<kml xmlns=\"http://www.opengis.net/kml/2.2\"><Placemark><LineString>
      <coordinates>-46.7,-23.6 -46.6,-23.5</coordinates>
    </LineString></Placemark></kml>"""

    result = parse_upload("eixo.kml", content)

    assert result["tipo"] == "LineString"
    assert [list(point) for point in result["coordinates"]] == [[-46.7, -23.6], [-46.6, -23.5]]


def test_kmz_reads_polygon_geometry():
    kml = b"""<kml xmlns=\"http://www.opengis.net/kml/2.2\"><Placemark><Polygon>
      <outerBoundaryIs><LinearRing><coordinates>-47,-24 -46,-24 -46,-23 -47,-24</coordinates></LinearRing></outerBoundaryIs>
    </Polygon></Placemark></kml>"""
    archive = BytesIO()
    with zipfile.ZipFile(archive, "w") as kmz:
        kmz.writestr("doc.kml", kml)

    result = parse_upload("area.kmz", archive.getvalue())

    assert result["tipo"] == "Polygon"
    assert len(result["coordinates"][0]) == 4


def test_geopackage_reprojects_geometry_to_wgs84(tmp_path):
    path = tmp_path / "projeto.gpkg"
    frame = gpd.GeoDataFrame(geometry=[Point(111319.490793, -222684.208506)], crs="EPSG:3857")
    frame.to_file(path, driver="GPKG")

    result = parse_upload("projeto.gpkg", path.read_bytes())

    assert result["tipo"] == "Point"
    assert result["coordinates"][0] == pytest.approx(1, abs=1e-5)
    assert result["coordinates"][1] == pytest.approx(-2, abs=1e-5)


def test_shapefile_zip_reads_point_features(tmp_path):
    folder = tmp_path / "source"
    folder.mkdir()
    shp = folder / "points.shp"
    frame = gpd.GeoDataFrame(geometry=[Point(-46.6, -23.5)], crs="EPSG:4326")
    frame.to_file(shp, driver="ESRI Shapefile")
    archive = BytesIO()
    with zipfile.ZipFile(archive, "w") as zipped:
        for path in folder.iterdir():
            zipped.write(path, path.name)

    result = parse_upload("pontos.zip", archive.getvalue())

    assert result["tipo"] == "Point"
    assert list(result["coordinates"]) == [-46.6, -23.5]


def test_geojson_rejects_mixed_geometry_dimensions():
    payload = {
        "type": "FeatureCollection",
        "features": [
            {"type": "Feature", "properties": {}, "geometry": {"type": "Point", "coordinates": [-46.6, -23.5]}},
            {"type": "Feature", "properties": {}, "geometry": {"type": "LineString", "coordinates": [[-46.7, -23.6], [-46.6, -23.5]]}},
        ],
    }

    with pytest.raises(HTTPException, match="mistura"):
        parse_upload("misturado.geojson", json.dumps(payload).encode())
