from fastapi import FastAPI
from fastapi.testclient import TestClient
from api.routers.municipal_layer import router
from api.deps.auth import require_geospatial_access
from api.services import municipal_layer as service


def test_catalogo_comum_independe_de_categoria(monkeypatch):
    monkeypatch.setattr(service, 'categoria', lambda *_: (_ for _ in ()).throw(AssertionError('Consulta de categoria indevida')))
    monkeypatch.setattr(service.dados, 'catalog', lambda: [{'id': 'indicador'}])
    app = FastAPI()
    app.include_router(router)
    with TestClient(app) as client:
        assert client.get('/municipal/catalog').status_code == 401
        assert client.post('/municipal/preview', json={}).status_code == 401
        app.dependency_overrides[require_geospatial_access] = lambda: object()
        response = client.get('/municipal/catalog')
        assert response.status_code == 200
        assert response.json()['attributes'] == [{'id': 'indicador'}]
        assert response.json()['categoria'] is None


def test_previa_comum_sem_categoria(monkeypatch):
    import pandas as pd
    monkeypatch.setattr(service, 'categoria', lambda *_: (_ for _ in ()).throw(AssertionError('Consulta de categoria indevida')))
    monkeypatch.setattr(service.dados, 'selection', lambda ids: [{'field': 'valor'}])
    monkeypatch.setattr(service.dados, 'layer', lambda items: pd.DataFrame([{'CD_MUN':'3550308','valor':0,'geometry':None}]))
    monkeypatch.setattr(service.dados, 'dicionario', lambda *args: [])
    result = service.previa(None, {'attributes':['indicador'], 'format':'fgb'})
    assert result['rows'][0]['valor'] == 0
    assert result['fields'] == ['valor']
