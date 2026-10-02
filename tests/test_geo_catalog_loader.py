import geopandas as gpd
from shapely import wkb
from shapely.geometry import box

from scripts.load_geo_catalog import _repair_mojibake, _zee_rows_from_frame


def test_repairs_mojibake_in_territorial_names():
    assert _repair_mojibake("Alto TietÃª") == "Alto Tietê"
    assert _repair_mojibake("AguapeÃ­") == "Aguapeí"
    assert _repair_mojibake("Mantiqueira") == "Mantiqueira"


def test_builds_all_nine_zee_areas_from_administrative_regions():
    frame = gpd.GeoDataFrame(
        {
            "GID_RA": list(range(1, 17)),
            "RA": [f"Região {code}" for code in range(1, 17)],
        },
        geometry=[box(code, 0, code + 0.5, 0.5) for code in range(1, 17)],
        crs="EPSG:4326",
    )

    rows = _zee_rows_from_frame(frame)

    assert len(rows) == 9
    assert [row[1] for row in rows] == ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"]
    assert all(wkb.loads(row[5]).is_valid for row in rows)
