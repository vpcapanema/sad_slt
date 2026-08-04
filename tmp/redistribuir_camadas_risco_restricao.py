from __future__ import annotations

import shutil
import unicodedata
from pathlib import Path

import fiona
import shapefile
from pyproj import Transformer
from shapely.geometry import mapping, shape
from shapely.ops import transform


ROOT = Path(__file__).resolve().parents[1]
LOCAL = ROOT / "data" / "geoespacial" / "local"
SP_BOUNDARY = LOCAL / "limites_administrativos" / "uf_sp" / "uf_sp.shp"
TARGET_CRS = "EPSG:4674"


def first_path(pattern: str) -> Path:
    paths = sorted(LOCAL.glob(pattern))
    if len(paths) != 1:
        raise RuntimeError(f"Esperava um arquivo para {pattern}, encontrei {len(paths)}")
    return paths[0]


def state_mask():
    with fiona.open(SP_BOUNDARY) as source:
        return shape(next(iter(source))["geometry"])


def overlaps_bounds(geometry, mask) -> bool:
    min_x, min_y, max_x, max_y = geometry.bounds
    mask_min_x, mask_min_y, mask_max_x, mask_max_y = mask.bounds
    return not (max_x < mask_min_x or max_y < mask_min_y or min_x > mask_max_x or min_y > mask_max_y)


def transformer_for(source_crs):
    if not source_crs:
        return None
    transformer = Transformer.from_crs(source_crs, TARGET_CRS, always_xy=True)
    return lambda geometry: transform(transformer.transform, geometry)


def clear_target(path: Path) -> None:
    if path.exists():
        shutil.rmtree(path)
    path.mkdir(parents=True)


def polygon_schema(source_geometry: str) -> str:
    if "Polygon" in source_geometry:
        return "Polygon"
    if "Point" in source_geometry:
        return "Point"
    if "LineString" in source_geometry:
        return "LineString"
    return source_geometry


def shapefile_fields(properties: dict) -> dict:
    field_map = {}
    used = set()
    for field_name in properties:
        normalized = unicodedata.normalize("NFKD", field_name).encode("ascii", "ignore").decode("ascii")
        normalized = "".join(character if character.isalnum() or character == "_" else "_" for character in normalized)
        normalized = (normalized or "campo")[:10]
        candidate = normalized
        suffix = 1
        while candidate.lower() in used:
            candidate = f"{normalized[:8]}_{suffix}"[:10]
            suffix += 1
        used.add(candidate.lower())
        field_map[field_name] = candidate
    return field_map


def shapefile_property_type(field_type: str) -> str:
    if field_type.startswith("int"):
        return "str:254"
    return field_type


def shapefile_property_value(value, field_type: str):
    if field_type.startswith("int"):
        return "" if value is None else str(value)
    return value


def export_fiona(
    source_path: Path,
    target_group: str,
    layer_name: str,
    predicate=None,
    clip_to_sp: bool = True,
) -> int:
    destination = LOCAL / target_group / layer_name
    clear_target(destination)
    output_path = destination / f"{layer_name}.shp"
    mask = state_mask()
    count = 0

    with fiona.open(source_path) as source:
        reproject = transformer_for(source.crs)
        schema = source.schema.copy()
        schema["geometry"] = polygon_schema(schema["geometry"])
        field_map = shapefile_fields(schema["properties"])
        source_fields = dict(schema["properties"])
        schema["properties"] = {
            field_map[name]: shapefile_property_type(field_type) for name, field_type in source_fields.items()
        }
        with fiona.open(
            output_path,
            "w",
            driver="ESRI Shapefile",
            schema=schema,
            crs=TARGET_CRS,
            encoding="UTF-8",
        ) as target:
            for feature in source:
                properties = dict(feature["properties"])
                if predicate and not predicate(properties):
                    continue
                if not feature["geometry"]:
                    continue
                geometry = shape(feature["geometry"])
                if reproject:
                    geometry = reproject(geometry)
                if clip_to_sp:
                    if not overlaps_bounds(geometry, mask):
                        continue
                    if not geometry.intersects(mask):
                        continue
                    if geometry.geom_type not in {"Point", "MultiPoint"}:
                        geometry = geometry.intersection(mask)
                if geometry.is_empty:
                    continue
                target.write(
                    {
                        "geometry": mapping(geometry),
                        "properties": {
                            field_map[name]: shapefile_property_value(value, source_fields[name])
                            for name, value in properties.items()
                        },
                    }
                )
                count += 1
    return count


def export_ibama_embargoes() -> int:
    source_path = first_path("embargos_ibama/**/adm_embargos_ibama_a.shp")
    destination = LOCAL / "restrição" / "embargos_ibama_ativos_sp"
    clear_target(destination)
    output_path = destination / "embargos_ibama_ativos_sp.shp"
    reader = shapefile.Reader(str(source_path), encoding="utf-8")
    fields = [field[0] for field in reader.fields[1:]]
    schema = {
        "geometry": "Polygon",
        "properties": {field[:10]: "str:254" for field in fields},
    }
    count = 0
    with fiona.open(
        output_path,
        "w",
        driver="ESRI Shapefile",
        schema=schema,
        crs=TARGET_CRS,
        encoding="UTF-8",
    ) as target:
        for index, record in enumerate(reader.iterRecords()):
            properties = dict(zip(fields, record))
            if properties.get("uf") != "SP":
                continue
            try:
                geometry = shape(reader.shape(index).__geo_interface__)
            except (shapefile.GeoJSON_Error, shapefile.ShapefileException):
                continue
            if geometry.is_empty:
                continue
            target.write(
                {
                    "geometry": mapping(geometry),
                    "properties": {field[:10]: str(properties.get(field, "") or "") for field in fields},
                }
            )
            count += 1
    return count


def main() -> None:
    exports = [
        ("risco", "cavidades_influencia", "cavidades/indicador_area_influencia_cavidades_cecav.geojson", None, False),
        ("risco", "inundacao", "inundacao/**/*.shp", None, False),
        ("risco", "movimento_massa", "movimento_massa/**/*.shp", None, False),
        ("restrição", "aprm_alto_juquery", "aprm_sp/APRMAJ*.zip.contents/*.shp", None, False),
        ("restrição", "aprm_alto_tiete_cabec", "aprm_sp/APRMATC*.zip.contents/*.shp", None, False),
        ("restrição", "aprm_billings", "aprm_sp/APRMB*.zip.contents/*.shp", None, False),
        ("restrição", "aprm_guarapiranga", "aprm_sp/APRMG*.zip.contents/*.shp", None, False),
        ("restrição", "assentamentos_sp", "assentamentos/**/*.shp", lambda row: row.get("uf") == "SP", True),
        ("restrição", "bens_tombados_condephaat", "bens_tombados/areas_envoltoria*.zip.contents/*Polygon.shp", None, False),
        ("restrição", "bens_tombados_iphan_sp", "bens_tombados/bens_tombados_iphan*.zip.contents/*.shp", None, True),
        ("restrição", "areas_contaminadas_cetesb", "contaminadas/**/*.shp", None, False),
        ("restrição", "manguezais_ibama_sp", "ecossistema_costeiro/ibama_mangues_sp.geojson", None, False),
        ("restrição", "embargos_estaduais_sigam", "embargos_estaduais/*.shp", None, False),
        ("restrição", "areas_restricao_cetesb", "interdicoes_cetesb/**/*.shp", None, False),
        ("restrição", "quilombos_sp", "quilombos/**/*.shp", lambda row: str(row.get("cd_uf")) == "35", True),
        ("restrição", "sitios_arqueologicos", "sitios_arqueologicos/**/*.shp", None, True),
        ("restrição", "terras_indigenas_sp", "terras_indigenas/**/*.shp", lambda row: row.get("uf_sigla") == "SP", True),
        ("restrição", "ucs_protecao_integral_sp", "ucs_mma/*.shp", lambda row: row.get("grupo") == "Proteção Integral", True),
        ("restrição", "ucs_uso_sustentavel_sp", "ucs_mma/*.shp", lambda row: row.get("grupo") == "Uso Sustentável", True),
        ("restrição", "vegetacao_nativa_sp", "vegetacao_sp/**/*.shp", None, False),
    ]

    for group, layer_name, pattern, predicate, clip_to_sp in exports:
        count = export_fiona(first_path(pattern), group, layer_name, predicate, clip_to_sp)
        print(f"{group}/{layer_name}: {count}")
    print(f"restrição/embargos_ibama_ativos_sp: {export_ibama_embargoes()}")


if __name__ == "__main__":
    main()
