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
    monkeypatch.setattr(service.dados, 'dicionario', lambda *args: [
        {'campo_bruto': 'valor', 'campo_exportado': 'pop_valor_2022', 'alias': 'População · Valor (2022)'}])
    result = service.previa(None, {'attributes':['indicador'], 'format':'fgb'})
    assert result['rows'][0]['pop_valor_2022'] == 0
    assert result['fields'] == ['pop_valor_2022']
    assert result['aliases']['pop_valor_2022'] == 'População · Valor (2022)'
    assert result['fixedFields'] == ['CD_MUN', 'NM_MUN', 'SIGLA_UF', 'AREA_KM2']
    assert result['aliases']['AREA_KM2'] == service.dados.CAMPOS_FIXOS['AREA_KM2'][0]


def test_combinados_preservam_fontes_dos_insumos(monkeypatch):
    from contextlib import contextmanager
    from api.services import base_municipal
    rows = [
        {'id': 'ibge', 'source': 'IBGE', 'year': 2022, 'theme': 'renda', 'field': 'pop',
         'label': 'População', 'unit': 'Pessoas', 'detail': {}},
        {'id': 'infosiga', 'source': 'InfoSiga SP', 'year': 2022, 'theme': 'seguranca_viaria',
         'field': 'obitos', 'label': 'Óbitos', 'unit': 'Pessoas', 'detail': {}},
        {'id': 'combinada', 'source': 'SICARD / Variaveis combinadas', 'year': 2022,
         'theme': 'seguranca_viaria', 'field': 'taxa', 'label': 'Taxa', 'unit': '%',
         'detail': {'origem_valor': 'combinados', 'atributos_origem': ['infosiga', 'ibge']}},
    ]
    class Connection:
        def execute(self, *_):
            return self

        def fetchall(self):
            return rows

    @contextmanager
    def connection():
        yield Connection()

    monkeypatch.setattr(base_municipal, 'get_connection', connection)
    result = base_municipal.catalog()
    assert result[-1]['source'] == 'IBGE + InfoSiga SP'
    assert result[-1]['producer'] == 'SICARD / Variaveis combinadas'
    assert result[-1]['origin'] == 'combinados'
    assert result[-1]['year'] == 2022
    assert result[-1]['theme'] == 'seguranca_viaria'
