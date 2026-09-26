from copy import deepcopy
from pathlib import Path
from types import SimpleNamespace
import shutil

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from osgeo import ogr, osr

from api.services import bancada_arquivos as service, storage_geoespacial as storage, storage_remoto


@pytest.fixture
def original(tmp_path, monkeypatch):
    path = tmp_path / 'base-geoespacial' / 'original.gpkg'
    path.parent.mkdir()
    ds = ogr.GetDriverByName('GPKG').CreateDataSource(str(path))
    srs = osr.SpatialReference()
    srs.ImportFromEPSG(4326)
    for name in ['editar', 'preservar']:
        layer = ds.CreateLayer(name, srs, ogr.wkbPoint)
        layer.CreateField(ogr.FieldDefn('valor', ogr.OFTInteger))
        for fid in [3, 7, 12]:
            f = ogr.Feature(layer.GetLayerDefn())
            f.SetFID(fid)
            if fid != 7:
                f.SetField('valor', fid)
            f.SetGeometry(ogr.CreateGeometryFromWkt(f'POINT (-46 {-23 + fid / 100})'))
            layer.CreateFeature(f)
    ds = None
    monkeypatch.setattr(storage, 'diretorio_storage', lambda: tmp_path)
    from api.services import metadados_previa
    monkeypatch.setattr(metadados_previa, 'descrever_geojson', lambda *a, **k: {})
    writes = []
    def enviar(destino, arquivo):
        assert destino == 'base-geoespacial/original.gpkg', 'Nunca gerar um novo caminho no storage'
        writes.append(destino)
        shutil.copyfile(arquivo, path)
    monkeypatch.setattr(storage_remoto, 'enviar', enviar)
    monkeypatch.setattr(service.geo, 'registrar_camada', lambda *a, **k: pytest.fail('Não criar camada'))
    ident = 'storage:base-geoespacial/original.gpkg::editar'
    return storage.ler_para_mapa(ident), path, writes


def test_salvar_storage_revisao_curta_mesmo_arquivo_e_outras_camadas(original):
    source, path, writes = original
    edited = deepcopy(source['geojson'])
    edited['features'] = [f for f in edited['features'] if f['properties']['valor'] is not None]
    edited['features'][0]['properties']['valor'] = 99
    edited['features'][0]['geometry']['coordinates'] = [-47, -22]
    from api.routers.bancada_arquivos import router
    from api.deps.auth import require_geospatial_access
    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[require_geospatial_access] = lambda: SimpleNamespace(id='teste')
    with TestClient(app) as client:
        response = client.post('/bancada-arquivos/salvar', json={
            'arquivo': source['arquivo'], 'camada_id': source['id'], 'revisao': source['revisao'], 'geojson': edited})
    assert response.status_code == 200, response.text
    result = response.json()
    assert result['id'] == source['id'] and result['arquivo'] == source['arquivo']
    assert result['revisao'] != source['revisao']
    assert {f['id'] for f in result['geojson']['features']} == {'3', '12'}
    assert result['geojson']['features'][0]['properties']['valor'] == 99
    assert result['geojson']['features'][0]['geometry']['coordinates'] == [-47, -22]
    preserved = storage.ler_para_mapa('storage:base-geoespacial/original.gpkg::preservar')
    assert len(preserved['geojson']['features']) == 3
    assert preserved['geojson']['features'][0]['properties']['valor'] == 3
    assert len(writes) == 1
    assert list(path.parent.iterdir()) == [path]
    with pytest.raises(ValueError, match='mudou'):
        service.salvar(source['arquivo'], source['revisao'], edited, None, SimpleNamespace(id='teste'), source['id'])
    assert len(writes) == 1


@pytest.mark.parametrize('driver,extension', [('GeoJSON', '.geojson'), ('FlatGeobuf', '.fgb'), ('ESRI Shapefile', '.shp')])
def test_salvar_outros_formatos_no_mesmo_caminho(tmp_path, monkeypatch, driver, extension):
    import geopandas as gpd
    from shapely.geometry import Point
    root = tmp_path / 'base-geoespacial'
    root.mkdir()
    path = root / ('original' + extension)
    frame = gpd.GeoDataFrame({'valor': [1, 2]}, geometry=[Point(-46,-23), Point(-47,-22)], crs=4326)
    frame.to_file(path, driver=driver)
    monkeypatch.setattr(storage, 'diretorio_storage', lambda: tmp_path)
    from api.services import metadados_previa
    monkeypatch.setattr(metadados_previa, 'descrever_geojson', lambda *a, **k: {})
    sent = []
    def enviar(destino, staged):
        sent.append(destino)
        shutil.copyfile(staged, tmp_path / destino)
    monkeypatch.setattr(storage_remoto, 'enviar', enviar)
    source = storage.ler_para_mapa('storage:base-geoespacial/' + path.name)
    if extension == '.shp':
        # Simula um índice anterior; a leitura da sessão já terminou.
        path.with_suffix('.qix').write_bytes(b'indice-antigo')
    monkeypatch.setattr(storage_remoto, 'apagar_arquivo', lambda name: (tmp_path / name).unlink())
    edited = deepcopy(source['geojson'])
    edited['features'] = edited['features'][:1]
    edited['features'][0]['properties']['valor'] = 99
    result = service.salvar(source['arquivo'], source['revisao'], edited, None, SimpleNamespace(id='teste'), source['id'])
    assert result['id'] == source['id'] and result['arquivo'] == source['arquivo']
    assert len(result['geojson']['features']) == 1
    assert result['geojson']['features'][0]['properties']['valor'] == 99
    assert all(Path(name).stem == 'original' for name in sent)
    assert not path.with_suffix('.qix').exists()


def test_duas_gravacoes_seguidas_usam_revisao_retornada(original):
    source, path, writes = original
    for value in (90, 91):
        edited = deepcopy(source['geojson'])
        edited['features'][0]['properties']['valor'] = value
        source = service.salvar(source['arquivo'], source['revisao'], edited, None,
                                SimpleNamespace(id='teste'), source['id'])
        assert source['geojson']['features'][0]['properties']['valor'] == value
        assert source['revisao'] == storage.ler_para_mapa(source['id'])['revisao']
    assert len(writes) == 2


def test_releitura_nao_devolve_revisao_obsoleta(original, monkeypatch):
    source, path, writes = original
    original_reader = storage.ler_para_mapa
    reads = []
    def read(ident):
        result = original_reader(ident)
        if writes:
            reads.append(result['revisao'])
            if len(reads) == 1:
                result['revisao'] = source['revisao']
        return result
    monkeypatch.setattr(storage, 'ler_para_mapa', read)
    monkeypatch.setattr('api.services.edicao_storage.time.sleep', lambda _: None)
    result = service.salvar(source['arquivo'], source['revisao'], deepcopy(source['geojson']),
                            None, SimpleNamespace(id='teste'), source['id'])
    assert len(reads) == 2
    assert result['revisao'] == original_reader(source['id'])['revisao']


def test_calculo_campo_storage_respeita_escopo_e_atualiza_revisao(original):
    source, path, writes = original
    from api.routers.bancada_arquivos import router
    from api.deps.auth import require_geospatial_access
    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[require_geospatial_access] = lambda: SimpleNamespace(id='teste')
    with TestClient(app) as client:
        response = client.post('/bancada-arquivos/calcular-campo', json={
            'arquivo': source['arquivo'], 'camada_id': source['id'], 'revisao': source['revisao'],
            'campo': 'valor', 'expressao': '42', 'chaves_selecionadas': ['3', '12'], 'filtro': 'valor < 10'})
        assert response.status_code == 200, response.text
        result = response.json()
        assert result['revisao'] != source['revisao']
        assert result['feicoes_atualizadas'] == 1
        assert {f['id']: f['properties']['valor'] for f in result['geojson']['features']} == {'3': 42, '7': None, '12': 12}
        again = client.post('/bancada-arquivos/calcular-campo', json={
            'arquivo': result['arquivo'], 'camada_id': result['id'], 'revisao': result['revisao'],
            'campo': 'novo', 'expressao': '2', 'chaves_selecionadas': ['7']})
        assert again.status_code == 200, again.text
        values = {f['id']: f['properties']['novo'] for f in again.json()['geojson']['features']}
        assert values == {'3': None, '7': 2, '12': None}
    preserved = storage.ler_para_mapa('storage:base-geoespacial/original.gpkg::preservar')
    assert len(preserved['geojson']['features']) == 3
    assert 'novo' not in preserved['geojson']['features'][0]['properties']
    assert len(writes) == 2
    assert list(path.parent.iterdir()) == [path]
