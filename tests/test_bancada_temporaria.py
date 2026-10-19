from types import SimpleNamespace
import os
import time

import geopandas as gpd
import pytest
from shapely.geometry import Point
from fastapi import FastAPI
from fastapi.testclient import TestClient

from api.deps.auth import require_geospatial_access
from api.routers.bancada_arquivos import router
from api.services import extracao_preparacao, bancada_temporaria


@pytest.fixture
def local(tmp_path, monkeypatch):
    def pasta(dono):
        path = tmp_path / dono
        path.mkdir(exist_ok=True)
        return path
    monkeypatch.setattr(extracao_preparacao, '_pasta', pasta)
    monkeypatch.setattr(extracao_preparacao, 'sem_montagem', lambda: False)
    monkeypatch.setattr(bancada_temporaria, '_pasta', pasta)
    frame = gpd.GeoDataFrame({'nome': ['Árvore', 'Sem geometria', 'Terceira'], 'valor': [7, None, 9]}, geometry=[Point(1, 2), None, Point(3, 4)], crs=4326)
    frame['fid'] = ['original-a', 'original-b', 'original-c']
    frame['geom'] = ['atributo', 'preservado', 'texto']
    meta = {'limites_wgs84': [1, 2, 3, 4], 'tipos_geometria': ['Point'], 'campos': [{'nome': 'nome', 'tipo': 'String'}, {'nome': 'valor', 'tipo': 'Real'}]}
    descriptor = extracao_preparacao.representar(frame, meta, 'dono', atributos=True)
    payload = {'id': 'local:' + 'a' * 32, 'tiles_token': descriptor['tiles_token'], 'revisao': descriptor['revisao']}
    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[require_geospatial_access] = lambda: SimpleNamespace(id='dono')
    with TestClient(app) as client:
        yield client, payload, descriptor, pasta


def test_atributos_fid_paginacao_e_geometria(local):
    client, payload, descriptor, _ = local
    assert descriptor['editavel'] is False
    assert descriptor['campo_fid_tile']
    response = client.post('/bancada-arquivos/local/tabela', json={**payload, 'offset': 1, 'limite': 1})
    assert response.status_code == 200, response.text
    data = response.json()
    assert data['total'] == 3
    assert data['linhas'][0]['atributos'] == {'nome': 'Sem geometria', 'valor': None, 'fid': 'original-b', 'geom': 'preservado'}
    fid = data['linhas'][0]['id']
    geometry = client.post('/bancada-arquivos/local/geometrias', json={**payload, 'ids': [fid]})
    assert geometry.status_code == 200, geometry.text
    assert geometry.json()['features'][0]['id'] == fid
    assert geometry.json()['features'][0]['geometry'] is None
    query = client.post('/bancada-arquivos/local/consulta', json={**payload, 'expressao': 'valor >= 7'})
    assert query.status_code == 200, query.text
    assert query.json()['total'] == 2


def test_isolamento_expiracao_e_revisao(local):
    client, payload, _, pasta = local
    assert client.post('/bancada-arquivos/local/tabela', json={**payload, 'revisao': 'outra'}).status_code == 422
    client.app.dependency_overrides[require_geospatial_access] = lambda: SimpleNamespace(id='outro')
    assert client.post('/bancada-arquivos/local/tabela', json=payload).status_code == 404
    client.app.dependency_overrides[require_geospatial_access] = lambda: SimpleNamespace(id='dono')
    path = pasta('dono') / (payload['tiles_token'] + '.gpkg')
    old = time.time() - extracao_preparacao.TTL - 5
    os.utime(path, (old, old))
    assert client.post('/bancada-arquivos/local/tabela', json=payload).status_code == 404
    assert client.post('/bancada-arquivos/local/tabela', json={**payload, 'tiles_token': '../arquivo'}).status_code == 422


def test_tile_utiliza_mesmos_fids_da_tabela(local):
    from osgeo import gdal
    client, payload, descriptor, _ = local
    content = extracao_preparacao.tile(payload['tiles_token'], 'dono', 0, 0, 0)
    path = '/vsimem/test_bancada_temporaria_tile.pbf'
    gdal.FileFromMemBuffer(path, content)
    dataset = None
    try:
        dataset = gdal.OpenEx(path, gdal.OF_VECTOR, open_options=['X=0', 'Y=0', 'Z=0'])
        layer = dataset.GetLayer(0)
        ids = {str(f.GetField(descriptor['campo_fid_tile'])) for f in layer}
        rows = client.post('/bancada-arquivos/local/tabela', json=payload).json()['linhas']
        assert ids == {rows[0]['id'], rows[2]['id']}
    finally:
        dataset = None
        gdal.Unlink(path)


def test_localizar_fid_da_selecao_sem_carregar_tabela_inteira(local):
    client, payload, _, _ = local
    rows = client.post('/bancada-arquivos/local/tabela', json=payload).json()['linhas']
    fid = rows[-1]['id']
    response = client.post('/bancada-arquivos/local/tabela',
                          json={**payload, 'limite': 1, 'localizar_fid': fid})
    assert response.status_code == 200, response.text
    assert response.json()['offset'] == 2
    assert response.json()['linhas'] == [rows[-1]]
    response = client.post('/bancada-arquivos/local/tabela',
                          json={**payload, 'localizar_fid': 'invalido'})
    assert response.status_code == 422
