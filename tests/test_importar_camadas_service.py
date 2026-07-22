from __future__ import annotations

import geopandas as gpd
import pytest
from shapely.geometry import LineString, MultiPolygon, Point, Polygon

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


def test_multipolygon_is_valid_complex_geometry() -> None:
    geometry = MultiPolygon([
        Polygon([(0, 0), (10, 0), (10, 10), (0, 10), (0, 0)]),
        Polygon([(20, 20), (30, 20), (30, 30), (20, 30), (20, 20)]),
    ])
    frame = gpd.GeoDataFrame({"geometry": [geometry]}, crs="EPSG:31983")

    result, metadata = validate_vector(frame, target_crs=None, clip_frame=None)

    assert result.iloc[0]["slt_geometria_valida"] == True
    assert result.iloc[0]["slt_diagnostico_geometria"] is None
    assert metadata["geometrias_invalidas"] == 0
    assert metadata["familia_geometrica"] == "poligono"


def test_polygon_with_hole_is_valid_complex_geometry() -> None:
    geometry = Polygon(
        [(0, 0), (20, 0), (20, 20), (0, 20), (0, 0)],
        holes=[[(5, 5), (5, 15), (15, 15), (15, 5), (5, 5)]],
    )
    frame = gpd.GeoDataFrame({"geometry": [geometry]}, crs="EPSG:31983")

    result, metadata = validate_vector(frame, target_crs=None, clip_frame=None)

    assert result.iloc[0]["slt_geometria_valida"] == True
    assert result.iloc[0]["slt_diagnostico_geometria"] is None
    assert metadata["geometrias_invalidas"] == 0
    assert result.iloc[0]["area_km2"] == pytest.approx(0.0003)


def test_invalid_geometry_is_importable_and_annotated() -> None:
    bowtie = Polygon([(0, 0), (1, 1), (1, 0), (0, 1), (0, 0)])
    frame = gpd.GeoDataFrame({"geometry": [bowtie]}, crs="EPSG:4326")
    result, metadata = validate_vector(frame, target_crs=None, clip_frame=None)
    assert result.iloc[0]["slt_geometria_valida"] == False
    assert "Auto-interseção" in result.iloc[0]["slt_diagnostico_geometria"]
    assert metadata["geometrias_validas"] is False
    assert metadata["geometrias_invalidas"] == 1


def test_invalid_geometry_reports_topological_reason_and_feature() -> None:
    bowtie = Polygon([(0, 0), (1, 1), (1, 0), (0, 1), (0, 0)])
    frame = gpd.GeoDataFrame({"id": ["area-7"], "geometry": [bowtie]}, crs="EPSG:4326")

    result, metadata = validate_vector(frame, target_crs=None, clip_frame=None)
    diagnostic = metadata["diagnostico_geometrias"]
    assert any("Auto-interseção" in reason for reason in diagnostic["problemas"])
    assert any("id=area-7" in refs for refs in diagnostic["problemas"].values())
    assert "Auto-interseção" in result.iloc[0]["slt_diagnostico_geometria"]
