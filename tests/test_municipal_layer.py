import numpy as np
import pytest

from api.services import base_municipal as dados
from api.services import municipal_layer as service


def test_base_municipal_carregada():
    malha = dados.malha()
    assert len(malha) == dados.MUNICIPIOS
    assert malha.crs.to_epsg() == 4674
    assert (malha.geometry.geom_type == 'MultiPolygon').all()
    catalogo = dados.catalog()
    assert len(catalogo) > 6000
    assert all(isinstance(item['detail'], str) for item in catalogo)


@pytest.mark.parametrize('fmt', ['fgb', 'gpkg', 'shp'])
def test_materializa_atributos_reais(tmp_path, fmt):
    fields = {'seade_ipdm_2022', 'idh_idhm_2010'}
    items = [a for a in dados.catalog() if a['field'] in fields]
    assert len(items) == 2
    package, path, manifest, actual = service.materializar(
        {'attributes': [a['id'] for a in items], 'format': fmt}, tmp_path)
    assert package[:2] == b'PK' and path.exists()
    assert len(actual) == 645 and actual.crs.to_epsg() == 4674
    expected = dados.layer(items).set_index('CD_MUN').sort_index()
    actual = actual.set_index('CD_MUN').sort_index()
    for item in manifest['attributes']:
        np.testing.assert_allclose(actual[item['export_field']], expected[item['field']], equal_nan=True)
    assert (tmp_path/'dicionario.csv').exists()


def test_nome_padrao_usa_categoria_fonte_majoritaria_e_data():
    manifesto = {'attributes': [{'source': 'Seade · IPDM'}, {'source': 'IBGE · Censo 2022'},
                                {'source': 'IBGE · Censo 2022'}]}
    nome = service.nome_padrao({'nome': 'Econômico'}, manifesto)
    assert nome == f'Econômico — IBGE · Censo 2022 — {service.data_exportacao()}'
    assert len(nome) <= 200
    assert service.nome_padrao({'nome': 'Social'}, {'attributes': []}).startswith('Social — Sem fonte — ')


def test_api_municipal_exige_sessao():
    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from api.routers.municipal_layer import router
    app = FastAPI()
    app.include_router(router)
    with TestClient(app) as client:
        assert client.get('/municipal/social/catalog').status_code == 401
        assert client.post('/municipal/social/export', json={}).status_code == 401


def test_atributo_inexistente_nao_cria_arquivo(tmp_path):
    with pytest.raises(ValueError):
        service.materializar({'attributes': ['inexistente'], 'format': 'gpkg'}, tmp_path)
    assert list(tmp_path.iterdir()) == []
