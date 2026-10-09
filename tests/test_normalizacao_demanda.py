import pytest
from pyproj import Geod, Transformer
from shapely.geometry import shape, Point
from fastapi import HTTPException
from api.services.normalizacao_demanda import normalizar


def test_ponto_raio_50_metros_em_epsg5880():
    geometry = shape(normalizar({'type': 'Point', 'coordinates': [-46.6, -23.5]}))
    converter = Transformer.from_crs(4674, 5880, always_xy=True)
    cx, cy = converter.transform(-46.6, -23.5)
    distances = [((px-cx)**2+(py-cy)**2)**0.5 for px, py in (converter.transform(x,y) for x,y in geometry.exterior.coords)]
    assert geometry.geom_type == 'Polygon' and geometry.is_valid
    assert min(distances) == pytest.approx(50, abs=0.01)
    assert max(distances) == pytest.approx(50, abs=0.01)


def test_linha_buffer_25_metros_de_cada_lado():
    geo = {'type': 'LineString', 'coordinates': [[-46.6, -23.5], [-46.59, -23.5]]}
    polygon = shape(normalizar(geo))
    geod = Geod(ellps='GRS80')
    for bearing, inside, outside in ((0, 24, 26), (180, 24, 26)):
        x, y, _ = geod.fwd(-46.595, -23.5, bearing, inside)
        assert polygon.contains(Point(x, y))
        x, y, _ = geod.fwd(-46.595, -23.5, bearing, outside)
        assert not polygon.contains(Point(x, y))


def test_reprojecao_e_idempotencia_nao_aplica_buffer_a_poligono():
    x, y = Transformer.from_crs(4674, 31983, always_xy=True).transform(-46.6, -23.5)
    polygon = normalizar({'type': 'Point', 'coordinates': [x, y]}, crs_origem=31983)
    assert shape(polygon).contains(Point(-46.6, -23.5))
    assert shape(normalizar(polygon, crs_origem=4674)).equals_exact(shape(polygon), 1e-10)


def test_coordenadas_projetadas_sem_crs_sao_recusadas():
    with pytest.raises(HTTPException):
        normalizar({'type': 'Point', 'coordinates': [300000, 7400000]})
