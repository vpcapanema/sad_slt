"""Gera exemplos sinteticos de upload e valida suas geometrias no parser."""

import json
import sys
import tempfile
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path

import geopandas as gpd
from shapely import normalize
from shapely.geometry import LineString, Point, Polygon, mapping, shape

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from api.geometria_parser import parse_upload

OUTPUT = Path(__file__).resolve().parent
GEOMETRIES = {
    "ponto": Point(-46.6333, -23.5505),
    "linha": LineString([
        (-46.6500, -23.5600),
        (-46.6400, -23.5500),
        (-46.6250, -23.5450),
    ]),
    "poligono": Polygon([
        (-46.6400, -23.5550),
        (-46.6300, -23.5550),
        (-46.6300, -23.5450),
        (-46.6400, -23.5450),
        (-46.6400, -23.5550),
    ]),
}
EXTENSIONS = ("kml", "kmz", "gpkg", "zip", "geojson")
KML_NAMESPACE = "http://www.opengis.net/kml/2.2"


def kml_bytes(name, geometry):
    ET.register_namespace("", KML_NAMESPACE)

    def element(parent, tag, text=None):
        child = ET.SubElement(parent, f"{{{KML_NAMESPACE}}}{tag}")
        child.text = text
        return child

    root = ET.Element(f"{{{KML_NAMESPACE}}}kml")
    document = element(root, "Document")
    placemark = element(document, "Placemark")
    element(placemark, "name", f"Teste sintetico - {name}")
    vector = element(placemark, geometry.geom_type)
    if geometry.geom_type == "Polygon":
        boundary = element(vector, "outerBoundaryIs")
        vector = element(boundary, "LinearRing")
        coordinates = geometry.exterior.coords
    else:
        coordinates = geometry.coords
    element(vector, "coordinates", " ".join(
        f"{longitude:.8f},{latitude:.8f},0"
        for longitude, latitude in coordinates
    ))
    return ET.tostring(root, encoding="utf-8", xml_declaration=True)


def generate():
    paths = [OUTPUT / f"{name}.{extension}" for name in GEOMETRIES for extension in EXTENSIONS]
    existing = [path.name for path in paths if path.exists()]
    if existing:
        raise FileExistsError(f"Arquivos ja existentes; nenhum sera sobrescrito: {existing}")

    for name, geometry in GEOMETRIES.items():
        content = kml_bytes(name, geometry)
        (OUTPUT / f"{name}.kml").write_bytes(content)
        with zipfile.ZipFile(OUTPUT / f"{name}.kmz", "w", compression=zipfile.ZIP_DEFLATED) as archive:
            archive.writestr("doc.kml", content)

        feature = {
            "type": "FeatureCollection",
            "features": [{
                "type": "Feature",
                "properties": {"nome": f"Teste sintetico - {name}", "sintetico": True},
                "geometry": mapping(geometry),
            }],
        }
        (OUTPUT / f"{name}.geojson").write_text(
            json.dumps(feature, indent=2) + "\n", encoding="utf-8"
        )
        frame = gpd.GeoDataFrame(
            {"nome": [f"Teste sintetico - {name}"]},
            geometry=[geometry], crs="EPSG:4326",
        )
        frame.to_file(OUTPUT / f"{name}.gpkg", layer=name, driver="GPKG", index=False)
        with tempfile.TemporaryDirectory() as temporary:
            folder = Path(temporary)
            frame.to_file(folder / f"{name}.shp", driver="ESRI Shapefile", encoding="UTF-8", index=False)
            with zipfile.ZipFile(OUTPUT / f"{name}.zip", "w", compression=zipfile.ZIP_DEFLATED) as archive:
                for component in sorted(folder.iterdir()):
                    archive.write(component, arcname=component.name)

    validate()


def validate():
    paths = [OUTPUT / f"{name}.{extension}" for name in GEOMETRIES for extension in EXTENSIONS]
    for path in paths:
        parsed = parse_upload(path.name, path.read_bytes())
        actual = shape(parsed["geojson"]["geometry"])
        expected = GEOMETRIES[path.stem]
        if parsed["tipo"] != expected.geom_type or not normalize(actual).equals_exact(normalize(expected), tolerance=1e-8):
            raise ValueError(f"Geometria diferente da esperada: {path.name}")
        print(f"OK {path.name}: {parsed['tipo']} ({path.stat().st_size} bytes)")
    print(f"{len(paths)} arquivos gerados e validados em data_tests.")


if __name__ == "__main__":
    if sys.argv[1:] == ["--validar"]:
        validate()
    else:
        generate()
