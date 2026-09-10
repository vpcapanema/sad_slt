from copy import deepcopy
from types import SimpleNamespace

import pytest
from osgeo import ogr, osr

from api.services import bancada_arquivos as service
from api.services import visualizacao_arquivo as reader


@pytest.fixture
def source(tmp_path, monkeypatch):
    relative = 'data/geoespacial/outputs/origem.gpkg'
    path = tmp_path / relative
    path.parent.mkdir(parents=True)
    dataset = ogr.GetDriverByName('GPKG').CreateDataSource(str(path))
    crs = osr.SpatialReference()
    crs.ImportFromEPSG(3857)
    layer = dataset.CreateLayer('area', crs, ogr.wkbPolygon)
    layer.CreateField(ogr.FieldDefn('nome', ogr.OFTString))
    feature = ogr.Feature(layer.GetLayerDefn())
    feature.SetField('nome', 'Original')
    feature.SetGeometry(ogr.CreateGeometryFromWkt('POLYGON ((0 0,1000 0,1000 1000,0 1000,0 0))'))
    layer.CreateFeature(feature)
    dataset = None
    monkeypatch.setattr(reader, 'project_path', lambda value: tmp_path / value)
    monkeypatch.setattr(reader, 'camadas_dos_arquivos', lambda paths: [{'id': 'original', 'nome': 'Área'}])
    return reader.ler_arquivo(relative), path


def test_geometria_e_atributo_editados_preservam_crs(source):
    original, path = source
    before = path.read_bytes()
    edited = deepcopy(original['geojson'])
    edited['features'][0]['properties']['nome'] = 'Editada'
    edited['features'][0]['geometry']['coordinates'][0][1][0] *= 2
    frame = service.frame_editado(original, edited)
    assert frame.crs.to_epsg() == 3857
    assert frame.iloc[0]['nome'] == 'Editada'
    assert frame.geometry.iloc[0].area == pytest.approx(1500000)
    assert path.read_bytes() == before


def test_detecta_alteracao_concorrente(source):
    original, path = source
    ds = ogr.Open(str(path), 1)
    layer = ds.GetLayer(0)
    feature = layer.GetNextFeature()
    feature.SetField('nome', 'Outra edição')
    layer.SetFeature(feature)
    ds = None
    with pytest.raises(ValueError, match='mudou'):
        service.abrir(original['arquivo'], original['revisao'])


@pytest.mark.parametrize('case', ['duplicate', 'fields', 'invalid'])
def test_rejeita_edicao_invalida(source, case):
    original, _ = source
    edited = deepcopy(original['geojson'])
    if case == 'duplicate':
        edited['features'] *= 2
    elif case == 'fields':
        edited['features'][0]['properties']['novo'] = 'não previsto'
    else:
        edited['features'][0]['geometry']['coordinates'] = [[[0,0],[1,1],[1,0],[0,1],[0,0]]]
    with pytest.raises(ValueError):
        service.frame_editado(original, edited)


def test_algoritmo_reusa_motor_com_arquivo_e_limpa_cache_temporario(source, monkeypatch):
    original, _ = source
    frames = []
    monkeypatch.setattr(service.ciclo, 'iniciar', lambda *a: 'execucao-teste')
    monkeypatch.setattr(service.ciclo, 'finalizar', lambda *a, **k: None)
    monkeypatch.setattr(service.geo, '_camadas', {})
    monkeypatch.setattr(service.geo, '_metadados', {})
    def register(frame, *args, **kwargs):
        frames.append(frame.copy())
        return 'resultado'
    monkeypatch.setattr(service.geo, 'registrar_camada', register)
    result = service.executar('OP-28', {'camada_id': 'original'},
                             {'original': {'arquivo': original['arquivo'], 'revisao': original['revisao']}}, SimpleNamespace(id='teste'))
    assert result['resultado']['camada_id'] == 'resultado'
    assert frames[0].geometry.iloc[0].x == pytest.approx(500)
    assert frames[0].geometry.iloc[0].y == pytest.approx(500)
    assert service.geo._camadas == {}


def test_salva_nova_versao_e_rastreia_original(source, monkeypatch):
    original, path = source
    before = path.read_bytes()
    calls = []
    monkeypatch.setattr(service.ciclo, 'iniciar', lambda *args: calls.append(args) or 'execucao-teste')
    monkeypatch.setattr(service.ciclo, 'finalizar', lambda *a, **k: None)
    monkeypatch.setattr(service.geo, '_metadados', {})
    def register(frame, name, origin, **kwargs):
        assert origin == 'processamento'
        output = path.with_name('nova.gpkg')
        frame.to_file(output, driver='GPKG', engine='pyogrio')
        service.geo._metadados['nova'] = {'caminho_arquivo': 'data/geoespacial/outputs/nova.gpkg'}
        return 'nova'
    monkeypatch.setattr(service.geo, 'registrar_camada', register)
    result = service.salvar(original['arquivo'], original['revisao'], original['geojson'], 'Nova versão', SimpleNamespace(id='teste'))
    assert result['arquivo'].endswith('nova.gpkg')
    assert calls[0][1]['camada_id'] == 'original'
    assert path.read_bytes() == before


def test_endpoints_exigem_sessao():
    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from api.routers.bancada_arquivos import router
    app = FastAPI()
    app.include_router(router)
    with TestClient(app) as client:
        assert client.post('/bancada-arquivos/salvar', json={}).status_code == 401
        assert client.post('/bancada-arquivos/executar', json={}).status_code == 401
