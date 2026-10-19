import json
import math
from pathlib import Path

import geopandas as gpd
import pytest
from shapely.geometry import Point
from osgeo import ogr

from api.services import extracao_preparacao as preparo, extracao_entrada_local as local


@pytest.fixture
def isolado(monkeypatch, tmp_path_factory):
    from api import path_policy
    tmp_path = tmp_path_factory.mktemp('prep')
    monkeypatch.setattr(path_policy, 'project_path', lambda caminho: tmp_path / caminho)
    monkeypatch.setattr(preparo, 'sem_montagem', lambda: False)
    monkeypatch.setattr(local, 'localizacao', lambda frame: {'status': 'consultado'})

    def negar(*args, **kwargs):
        pytest.fail('O fluxo original não deve converter geometrias para GeoJSON')

    monkeypatch.setattr(gpd.GeoDataFrame, 'to_json', negar)
    monkeypatch.setattr(local, '_representacao_mapa', negar)
    return tmp_path


def frame():
    return gpd.GeoDataFrame({'codigo': ['001'], 'valor': [7]}, geometry=[Point(-46.123456789123, -23.1)], crs=4674)


def test_catalogo_valida_sem_geojson_e_preserva_original(monkeypatch, isolado):
    from api.repositories import camada_geoespacial_repository as repo
    original = frame()
    geom = original.geometry.iloc[0]
    assert isinstance(geom, Point)
    antes = geom.wkb
    monkeypatch.setattr(repo, 'carregar_vetor_bruto', lambda ident: (original, {'nome': 'Original'}))
    result = preparo.preparar('base', 'autor')
    assert result['status_validacao'] == 'valida'
    assert result['representacao'] == 'tiles' and 'geojson' not in result
    geometria_depois = original.geometry.iloc[0]
    assert isinstance(geometria_depois, Point)
    assert geometria_depois.wkb == antes
    assert original.iloc[0]['codigo'] == '001'
    metadados_local = result.get('metadados_local')
    assert isinstance(metadados_local, dict)
    identificacao = metadados_local.get('identificacao')
    assert identificacao is not None
    assert identificacao.get('completa') is True
    assert metadados_local.get('feicoes') == 1
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
    content = json.dumps({'type': 'FeatureCollection', 'features': [{'type': 'Feature', 'properties': {'codigo': '001'}, 'geometry': {'type': 'Point', 'coordinates': [-46.1, -23.1]}}]}).encode()
    result = local.previa(content, 'original.geojson', dono_tiles='autor')
    assert result['resumo']['validas'] == 1
    assert 'geojson' not in result['entrada']
    layer = result['camadas'][0]
    assert layer['representacao'] == 'tiles' and 'geojson' not in layer
    assert layer['metadados_local']['identificacao']['completa']


def test_crs_ausente_impede_previa(monkeypatch, isolado):
    from api.repositories import camada_geoespacial_repository as repo
    invalid = frame()
    invalid.crs = None  # type: ignore[assignment]
    monkeypatch.setattr(repo, 'carregar_vetor_bruto', lambda ident: (invalid, {'nome': 'Inválida'}))
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


def test_preparacao_storage_preenche_tamanho_componente_e_formato(monkeypatch, isolado):
    from api.services import storage_geoespacial
    path = isolado / 'origem.gpkg'
    frame().to_file(path, layer='demandas_reais', driver='GPKG', engine='pyogrio')
    monkeypatch.setattr(storage_geoespacial, 'resolver', lambda _: path)
    result = preparo.preparar('storage:base-geoespacial/origem.gpkg::demandas_reais', 'autor')
    meta = result['metadados_local']
    assert meta['bytes'] == path.stat().st_size
    assert meta['bytes_descompactados'] == path.stat().st_size
    assert meta['componente'] == 'demandas_reais'
    assert meta['formato'] == 'GPKG'
    assert meta['vertices'] == 1


def test_pacote_preserva_bytes_reais_e_consulta_localizacao(monkeypatch, isolado):
    import zipfile
    from api.services import storage_geoespacial, storage_pacotes
    content = json.dumps({'type': 'FeatureCollection', 'features': [
        {'type': 'Feature', 'properties': {'codigo': '001'},
         'geometry': {'type': 'Point', 'coordinates': [-47, -23]}},
    ]}).encode()
    path = isolado / 'pacote.zip'
    with zipfile.ZipFile(path, 'w', compression=zipfile.ZIP_DEFLATED) as archive:
        archive.writestr('pontos.geojson', content)
    relative = 'base-geoespacial/pacote.zip'
    monkeypatch.setattr(storage_geoespacial, 'resolver', lambda _: path)
    ident = storage_pacotes.inventario(path, relative)[0]['id']
    meta = preparo.preparar(ident, 'autor')['metadados_local']
    assert meta['bytes'] == path.stat().st_size
    assert meta['bytes_descompactados'] == len(content)
    assert meta['formato'] == 'GeoJSON'
    assert meta['componente']
    assert meta['localizacao']['status'] == 'consultado'
