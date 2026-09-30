import json
import math
from pathlib import Path

import geopandas as gpd
import pytest
from shapely.geometry import Point
from osgeo import ogr

from api.services import extracao_preparacao as preparo, extracao_entrada_local as local


@pytest.fixture
def isolado(monkeypatch, tmp_path):
    monkeypatch.setattr(preparo, 'gettempdir', lambda: str(tmp_path))
    monkeypatch.setattr(local, 'localizacao', lambda frame: {'status': 'consultado'})
    def negar(*args, **kwargs):
        pytest.fail('O fluxo original não deve converter geometrias para GeoJSON')
    monkeypatch.setattr(gpd.GeoDataFrame, 'to_json', negar)
    monkeypatch.setattr(local, '_representacao_mapa', negar)
    return tmp_path


def frame():
    return gpd.GeoDataFrame({'codigo':['001'], 'valor':[7]}, geometry=[Point(-46.123456789123, -23.1)], crs=4674)


def test_catalogo_valida_sem_geojson_e_preserva_original(monkeypatch, isolado):
    from api.repositories import camada_geoespacial_repository as repo
    original = frame()
    antes = original.geometry.iloc[0].wkb
    monkeypatch.setattr(repo, 'carregar_vetor_bruto', lambda ident: (original, {'nome': 'Original'}))
    result = preparo.preparar('base', 'autor')
    assert result['status_validacao'] == 'valida'
    assert result['representacao'] == 'tiles' and 'geojson' not in result
    assert original.geometry.iloc[0].wkb == antes
    assert original.iloc[0]['codigo'] == '001'
    assert result['metadados_local']['identificacao']['completa']
    assert result['metadados_local']['feicoes'] == 1
    path = next(isolado.rglob('*.gpkg'))
    ds = ogr.Open(str(path))
    assert bytes(ds.GetLayer(0).GetNextFeature().GetGeometryRef().ExportToWkb()) == antes
    z = 6
    x = int((-46.123456789123 + 180) / 360 * 2**z)
    y = int((1 - math.asinh(math.tan(math.radians(-23.1))) / math.pi) / 2 * 2**z)
    assert preparo.tile(result['tiles_token'], 'autor', z, x, y)
    with pytest.raises(FileNotFoundError):
        preparo.tile(result['tiles_token'], 'outro', z, x, y)


def test_local_usa_validacao_comum_sem_geojson(isolado):
    content = json.dumps({'type':'FeatureCollection','features':[{'type':'Feature','properties':{'codigo':'001'},'geometry':{'type':'Point','coordinates':[-46.1,-23.1]}}]}).encode()
    result = local.previa(content, 'original.geojson', dono_tiles='autor')
    assert result['resumo']['validas'] == 1
    assert 'geojson' not in result['entrada']
    layer = result['camadas'][0]
    assert layer['representacao'] == 'tiles' and 'geojson' not in layer
    assert layer['metadados_local']['identificacao']['completa']


def test_crs_ausente_impede_previa(monkeypatch, isolado):
    from api.repositories import camada_geoespacial_repository as repo
    invalid = frame().set_crs(None, allow_override=True)
    monkeypatch.setattr(repo, 'carregar_vetor_bruto', lambda ident: (invalid, {'nome':'Inválida'}))
    with pytest.raises(ValueError, match='coordenadas'):
        preparo.preparar('base', 'autor')
    assert not list(isolado.rglob('*.gpkg'))


def test_limite_de_upload_nao_restringe_base_cadastrada(monkeypatch, isolado):
    from api.repositories import camada_geoespacial_repository as repo
    original = frame()
    validar = local.validar
    monkeypatch.setattr(local, 'validar', lambda frame, max_feicoes=0: validar(frame, max_feicoes=max_feicoes))
    monkeypatch.setattr(repo, 'carregar_vetor_bruto', lambda ident: (original, {'nome': 'Base'}))
    assert preparo.preparar('base', 'autor')['feicoes'] == 1
    with pytest.raises(ValueError, match='entre 1'):
        validar(original, max_feicoes=0)
