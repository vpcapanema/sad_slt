"""Seleção sem gravar no banco: nulos tipados, complemento e contratos HTTP."""
import asyncio
import json
from types import SimpleNamespace

import geopandas as gpd
import pandas as pd
import pytest
from fastapi.testclient import TestClient
from shapely.geometry import Point

from api.services.expressoes_atributos import selecionar


@pytest.fixture
def frame():
    return gpd.GeoDataFrame({
        'numero': [None, 0.0, 2.0, float('nan')],
        'inteiro': pd.Series([pd.NA, 0, 2, pd.NA], dtype='Int64'),
        'texto': [None, '', 'null', None],
        'booleano': pd.Series([pd.NA, False, True, pd.NA], dtype='boolean'),
    }, geometry=[Point(-46, -23)] * 4, crs=4326)


@pytest.mark.parametrize('campo', ['numero', 'inteiro', 'texto', 'booleano'])
def test_nulos_e_nao_nulos_preservam_zero_vazio_e_false(frame, campo):
    assert selecionar(frame, f'{campo} is None').index.tolist() == [0, 3]
    assert selecionar(frame, f'{campo} is not None').index.tolist() == [1, 2]
    assert selecionar(frame, f'{campo} is None', True).index.tolist() == [1, 2]
    assert selecionar(frame, f'{campo} is not None', True).index.tolist() == [0, 3]


def test_complemento_inclui_nulos_de_comparacao_nullable(frame):
    assert selecionar(frame, 'inteiro > 0').index.tolist() == [2]
    assert selecionar(frame, 'inteiro > 0', True).index.tolist() == [0, 1, 3]
    assert selecionar(frame, 'True', True).empty
    assert len(selecionar(frame, 'False', True)) == 4
    assert selecionar(frame, 'numero is not None and numero > 0').index.tolist() == [2]
    assert selecionar(frame.iloc[:0], 'numero is None', True).empty


@pytest.mark.parametrize('expression', ['numero.isna()', '__import__("os")', 'numero is 0', 'ausente is None'])
def test_consulta_continua_rejeitando_expressoes_nao_permitidas(frame, expression):
    with pytest.raises(ValueError):
        selecionar(frame, expression)


def test_api_tabela_serializa_nulos_e_preserva_tipos(frame, monkeypatch):
    from api.services.geoespacial_service import geoespacial_service as geo
    from api.repositories import camada_geoespacial_repository as repo
    monkeypatch.setattr(geo, 'obter_camada_dados', lambda _: frame)
    monkeypatch.setattr(repo, 'esta_homologada', lambda _: False)
    result = asyncio.run(geo.atributos_camada('teste'))
    assert json.loads(json.dumps(result, allow_nan=False))['registros'][0]['numero'] is None
    assert result['registros'][0]['inteiro'] is None
    assert result['registros'][0]['booleano'] is None
    assert result['registros'][1]['numero'] == 0
    assert result['registros'][1]['booleano'] is False
    assert result['registros'][1]['texto'] == ''
    assert {c['nome']: c['tipo'] for c in result['colunas']}['numero'] == 'float64'


@pytest.fixture
def client(frame, monkeypatch):
    from api.server import app
    from api.deps.auth import require_geospatial_access
    from api.services.geoespacial_service import geoespacial_service as geo
    from api.services import bancada_arquivos
    monkeypatch.setattr(geo, 'obter_camada_dados', lambda _: frame)
    # IDs originais distintos das posições e snapshots somente em memória.
    snapshot = json.loads(frame.to_json())
    for i, feature in enumerate(snapshot['features']):
        feature['id'] = f'fid-{i}'
    monkeypatch.setattr(bancada_arquivos, 'abrir', lambda *args: {'geojson': snapshot})
    previous = app.dependency_overrides.copy()
    app.dependency_overrides[require_geospatial_access] = lambda: SimpleNamespace(id='teste')
    try:
        with TestClient(app) as connection:
            yield connection
    finally:
        app.dependency_overrides.clear()
        app.dependency_overrides.update(previous)


@pytest.mark.parametrize('invert,total', [(False, 2), (True, 2)])
def test_endpoint_camada_consulta_nulos(client, invert, total):
    response = client.post('/api/geoespacial/camadas/teste/consultar-atributos',
                           params={'expressao': 'numero is None', 'inverter_selecao': invert})
    assert response.status_code == 200, response.text
    body = response.json()
    assert body['total'] == total
    assert [f['properties']['numero'] for f in body['geojson']['features']] == ([0, 2] if invert else [None, None])


def test_endpoint_arquivo_consulta_nulos_e_inverte_preservando_ids(client):
    payload = {'arquivo': 'teste.gpkg', 'revisao': 'a' * 64, 'expressao': 'texto is None'}
    response = client.post('/api/geoespacial/bancada-arquivos/consultar', json=payload)
    assert response.status_code == 200, response.text
    assert [f['id'] for f in response.json()['geojson']['features']] == ['fid-0', 'fid-3']
    response = client.post('/api/geoespacial/bancada-arquivos/consultar', json={**payload, 'inverter_selecao': True})
    assert response.status_code == 200, response.text
    assert [f['id'] for f in response.json()['geojson']['features']] == ['fid-1', 'fid-2']


def test_endpoint_camada_rejeita_expressao_insegura(client):
    response = client.post('/api/geoespacial/camadas/teste/consultar-atributos', params={'expressao': 'numero.isna()'})
    assert response.status_code == 422
