import pytest
import geopandas as gpd
from pyproj import Geod, Transformer
from shapely.geometry import shape, mapping, Point, LineString, Polygon, MultiPoint, MultiLineString, MultiPolygon, GeometryCollection
from shapely.ops import unary_union
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


@pytest.mark.parametrize('geometria', [
    Point(-46.6, -23.5),
    LineString([(-46.6, -23.5), (-46.59, -23.5)]),
    Polygon([(-46.6, -23.5), (-46.59, -23.5), (-46.59, -23.49), (-46.6, -23.5)]),
    MultiPoint([(-46.6, -23.5), (-46.59, -23.5)]),
    MultiLineString([[(-46.6, -23.5), (-46.59, -23.5)], [(-46.58, -23.5), (-46.57, -23.5)]]),
    MultiPolygon([Polygon([(-46.6, -23.5), (-46.59, -23.5), (-46.59, -23.49), (-46.6, -23.5)])]),
])
def test_colecao_aplica_a_mesma_regra_do_componente(geometria):
    resultado = shape(normalizar(mapping(GeometryCollection([geometria]))))
    esperado = shape(normalizar(mapping(geometria)))
    assert resultado.is_valid and resultado.geom_type in {'Polygon', 'MultiPolygon'}
    assert resultado.equals_exact(esperado, 1e-10)


def test_colecao_mista_aninhada_preserva_todas_as_partes():
    partes = [
        Point(-46.6, -23.5),
        LineString([(-46.59, -23.5), (-46.58, -23.5)]),
        Polygon([(-46.57, -23.5), (-46.56, -23.5), (-46.56, -23.49), (-46.57, -23.5)]),
    ]
    geometria = GeometryCollection([partes[0], GeometryCollection(partes[1:])])
    resultado = shape(normalizar(mapping(geometria)))
    esperado = unary_union(gpd.GeoSeries([shape(normalizar(mapping(parte))) for parte in partes], crs=4674).to_crs(5880))
    metrica = gpd.GeoSeries([resultado], crs=4674).to_crs(5880).iloc[0]
    assert resultado.geom_type == 'MultiPolygon' and resultado.is_valid
    assert metrica.symmetric_difference(esperado).area < .01
    for parte in partes:
        assert resultado.covers(parte.representative_point())


def test_colecao_com_componente_vazio_nao_descarta_parte():
    geometria = {'type': 'GeometryCollection', 'geometries': [
        {'type': 'Point', 'coordinates': [-46.6, -23.5]},
        {'type': 'Polygon', 'coordinates': []},
    ]}
    with pytest.raises(HTTPException, match='componente 2.*vazi'):
        normalizar(geometria)
