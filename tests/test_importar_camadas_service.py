from __future__ import annotations

import geopandas as gpd
import pytest
from shapely.geometry import LineString, Point, Polygon

from api.services.importar_camadas_service import validate_vector


def test_point_fields_are_normalized_and_coordinates_calculated() -> None:
    frame = gpd.GeoDataFrame(
        {"NOME DO PONTO": ["A"], "geometry": [Point(-46.6, -23.5)]},
        crs="EPSG:4326",
    )
    result, metadata = validate_vector(frame, target_crs="EPSG:4674", clip_frame=None)
    assert "nome_do_ponto" in result.columns
    assert result.iloc[0]["lat"] == pytest.approx(-23.5, abs=0.001)
    assert result.iloc[0]["long"] == pytest.approx(-46.6, abs=0.001)
    assert metadata["familia_geometrica"] == "ponto"


def test_line_length_is_calculated_in_kilometres() -> None:
    frame = gpd.GeoDataFrame(
        {"Trecho": [1], "geometry": [LineString([(-46.6, -23.5), (-46.59, -23.5)])]},
        crs="EPSG:4326",
    )
    result, _ = validate_vector(frame, target_crs=None, clip_frame=None)
    assert result.iloc[0]["extensao_km"] > 0.9
    assert result.iloc[0]["extensao_km"] < 1.2


def test_polygon_area_hectares_and_perimeter_are_calculated() -> None:
    frame = gpd.GeoDataFrame(
        {"Área Teste": [1], "geometry": [Polygon([(0, 0), (1000, 0), (1000, 1000), (0, 1000)])]},
        crs="EPSG:31983",
    )
    result, _ = validate_vector(frame, target_crs=None, clip_frame=None)
    assert result.iloc[0]["area_km2"] == pytest.approx(1.0)
    assert result.iloc[0]["area_ha"] == pytest.approx(100.0)
    assert result.iloc[0]["perimetro_m"] == pytest.approx(4000.0)


def test_invalid_geometry_aborts_validation() -> None:
    bowtie = Polygon([(0, 0), (1, 1), (1, 0), (0, 1), (0, 0)])
    frame = gpd.GeoDataFrame({"geometry": [bowtie]}, crs="EPSG:4326")
    with pytest.raises(ValueError, match="inválidas=1"):
        validate_vector(frame, target_crs=None, clip_frame=None)
