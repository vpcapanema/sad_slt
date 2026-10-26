import zipfile

import pytest

from api.services.variaveis_combinadas import calcular
from scripts.preparar_catalogo_territorial import ler_zip, numero, unidade_setorial


@pytest.mark.parametrize('formula,values,expected', [
    ('100 * (a + b + c) / total', {'a': 101, 'b': 203, 'c': 5, 'total': 1385}, 100 * 309 / 1385),
    ('100 * (final - inicial) / inicial', {'final': 5, 'inicial': 10}, -50),
    ('100 * a / b', {'a': 0, 'b': 10}, 0),
    ('100 * a / b', {'a': 10, 'b': 0}, None),
    ('100 * a / b', {'a': None, 'b': 10}, None),
    ('100 * a / b', {'a': 1, 'b': -2}, None),
])
def test_calculo_conservador(formula, values, expected):
    result = calcular(formula, values)
    assert result is None if expected is None else result == pytest.approx(expected)


@pytest.mark.parametrize('formula', ['__import__("os")', 'a.real', 'a ** 2', '[a]', 'a +'])
def test_rejeita_codigo_na_formula(formula):
    with pytest.raises(ValueError):
        calcular(formula, {'a': 1})


def test_rejeita_campo_ausente_e_nao_finito():
    with pytest.raises(ValueError, match='ausente'):
        calcular('a / b', {'a': 1})
    with pytest.raises(ValueError, match='finito'):
        calcular('a + 1', {'a': float('inf')})


def test_leitura_setorial_preserva_sigilo_zero_e_codigo(tmp_path):
    path = tmp_path / 'fonte.zip'
    with zipfile.ZipFile(path, 'w') as archive:
        archive.writestr('fonte.csv', '"CD_setor";"V01006";"V01007"\n"350010505000001";"0";"X"\n')
    values, signals = ler_zip(path, ['V01006', 'V01007'], {'350010505000001'})
    assert values == {'350010505000001': {'V01006': 0, 'V01007': None}}
    assert signals == {'350010505000001': {'V01007': 'X'}}
    with pytest.raises(ValueError, match='fora da malha'):
        ler_zip(path, ['V01006'], set())


def test_importador_rejeita_codigo_repetido(tmp_path):
    path = tmp_path / 'fonte.zip'
    with zipfile.ZipFile(path, 'w') as archive:
        archive.writestr('fonte.csv', 'setor;V01006\n350010505000001;1\n350010505000001;2\n')
    with pytest.raises(ValueError, match='repetido'):
        ler_zip(path, ['V01006'], {'350010505000001'})


def test_parser_numerico_nao_imputa():
    assert numero('1,5') == 1.5
    assert numero('X') is None
    assert numero('0') == 0
    with pytest.raises(ValueError):
        numero('NaN')


def test_unidade_domiciliar_nao_confunde_pessoas_com_domicilios():
    assert unidade_setorial('domicilio1', 'Domicílios, Quantidade de crianças de zero a nove anos') == 'Pessoas'
    assert unidade_setorial('domicilio1', 'Domicílios, Com 1 morador no domicílio') == 'Domicilios'
    assert unidade_setorial('domicilio1', 'Unidades de Habitação em Domicílios Coletivos') == 'Unidades de habitacao'


def test_api_catalogo_separa_escala_e_rejeita_escala_inexistente(monkeypatch):
    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from api.deps.auth import require_geospatial_access
    from api.routers.municipal_layer import router
    from api.services import base_setorial, municipal_layer
    monkeypatch.setattr(base_setorial, 'catalog', lambda: [{'id': 'setor', 'origin': 'originais'}])
    monkeypatch.setattr(municipal_layer.dados, 'catalog', lambda: [{'id': 'municipio', 'origin': 'combinados'}])
    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[require_geospatial_access] = lambda: object()
    with TestClient(app) as client:
        default = client.get('/municipal/catalog').json()
        sector = client.get('/municipal/catalog?territorialidade=setores_2022').json()
        assert default['attributes'][0]['id'] == 'municipio'
        assert sector['attributes'][0]['id'] == 'setor'
        assert sector['keyField'] == 'CD_SETOR'
        assert sector['featureCount'] == 103319
        assert sector['municipalities'] == 645
        assert client.get('/municipal/catalog?territorialidade=qualquer').status_code == 422
        assert client.post('/municipal/preview', json={'attributes': ['setor'], 'territorialidade': 'qualquer'}).status_code == 422


@pytest.mark.parametrize('fmt', ['fgb', 'gpkg', 'shp', 'geojson'])
def test_pacote_setorial_preserva_codigo_e_nulos(monkeypatch, tmp_path, fmt, storage_sintetico):
    import geopandas as gpd
    import pandas as pd
    from shapely.geometry import MultiPolygon, Polygon
    from api.services import base_municipal, base_setorial, municipal_layer
    items = [{'id': 'setor', 'field': 'setor_teste_2022', 'source': 'IBGE',
              'label': 'Teste', 'theme': '01_populacao', 'year': 2022, 'coverage': 1,
              'unit': 'Pessoas', 'url': 'https://ibge.gov.br', 'detail': '{}',
              'origin': 'originais', 'chave': 'V01006'}]
    frame = gpd.GeoDataFrame({
        'CD_SETOR': ['350010505000001', '350010505000002'],
        'CD_MUN': ['3500105', '3500105'], 'NM_MUN': ['Adamantina'] * 2,
        'SIGLA_UF': ['SP'] * 2, 'AREA_KM2': [1., 1.], 'PARTES': [1, 1],
    }, geometry=[MultiPolygon([Polygon([(0, 0), (0, 1), (1, 1), (0, 0)])]),
                 MultiPolygon([Polygon([(2, 0), (2, 1), (3, 1), (2, 0)])])],
        crs=4674).set_index('CD_SETOR')
    frame = base_municipal.export_support.join_attributes(
        frame, {'setor_teste_2022': pd.Series([0., None], index=frame.index)}, key='CD_SETOR')
    monkeypatch.setattr(base_setorial, 'MUNICIPIOS', 2)
    monkeypatch.setattr(base_setorial, 'selection', lambda ids: items)
    monkeypatch.setattr(base_setorial, 'layer', lambda *args: frame.copy())
    package, path, manifest, actual = municipal_layer.materializar(
        {'attributes': ['setor'], 'format': fmt, 'territorialidade': 'setores_2022'}, tmp_path)
    assert package.startswith(b'PK')
    assert path.exists()
    assert manifest['join']['chave'] == 'CD_SETOR'
    assert manifest['feature_count'] == 2
    assert manifest['territorialidade'] == 'setores_2022'
    assert actual.CD_SETOR.is_unique
    assert not actual.CD_MUN.is_unique
    field = manifest['attributes'][0]['export_field']
    assert field == 'pop_teste_2022' if fmt != 'shp' else field.startswith('POP')
    assert manifest['aliases_nas_tabelas'] is True
    import io
    import csv
    with zipfile.ZipFile(io.BytesIO(package)) as archive:
        headers = next(csv.reader(io.StringIO(
            archive.read('setores_sp_2022_atributos.csv').decode('utf-8-sig'))))
        assert manifest['attributes'][0]['alias'] in headers
        assert 'setor_teste_2022' not in headers
    values = actual.set_index('CD_SETOR')[field]
    assert values['350010505000001'] == 0
    assert pd.isna(values['350010505000002'])


def test_ids_de_outra_escala_nao_sao_aceitos(monkeypatch):
    from api.services import base_setorial
    monkeypatch.setattr(base_setorial, 'catalog', lambda: [{'id': 'setorial'}])
    with pytest.raises(ValueError, match='catalogo setorial'):
        base_setorial.selection(['municipal'])
