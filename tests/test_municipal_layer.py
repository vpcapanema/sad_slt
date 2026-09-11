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
    assert (tmp_path/f'{dados.PREFIXO}_dicionario.csv').exists()


def test_nome_padrao_usa_categoria_fonte_majoritaria_e_data():
    itens = [{'source': 'Seade · IPDM'}, {'source': 'IBGE · Censo 2022'},
             {'source': 'IBGE · Censo 2022'}]
    nome = service.nome_padrao({'nome': 'Econômico'}, itens)
    assert nome == f'Econômico — IBGE · Censo 2022 — {service.data_exportacao()}'
    assert len(nome) <= 200
    assert service.nome_padrao({'nome': 'Social'}, []).startswith('Social — Sem fonte — ')


def test_dicionario_traz_alias_e_significado():
    campos = {'seade_ipdm_2022', 'economia_pib_per_capita_reais_2023'}
    items = [a for a in dados.catalog() if a['field'] in campos]
    assert len(items) == 2
    linhas = {e['campo_bruto']: e for e in dados.dicionario(items, 'gpkg')}
    assert linhas['seade_ipdm_2022']['alias'] == 'Desenvolvimento municipal · IPDM (2022)'
    assert 'Unidade:' in linhas['seade_ipdm_2022']['significado']
    # Nenhum significado pode carregar o JSON cru que algumas fontes poem em "nota".
    assert not any('{"' in e['significado'] for e in linhas.values())


def test_shapefile_usa_sigla_do_tema_em_dez_caracteres():
    items = [a for a in dados.catalog() if a['theme'] == '01_populacao'][:3]
    nomes = dados.nomes_exportados(items, 'shp')
    assert all(len(nome) <= 10 and nome.startswith('POP') for nome in nomes.values())
    assert len(set(nomes.values())) == len(items)
    # Nos demais formatos o nome bruto ja comeca pelo identificador do tema.
    assert dados.nomes_exportados(items, 'gpkg') == {i['field']: i['field'] for i in items}


def test_pacote_leva_dicionario_e_alias(tmp_path):
    items = [a for a in dados.catalog() if a['field'] in {'seade_ipdm_2022', 'idh_idhm_2010'}]
    package, path, manifest, _ = service.materializar(
        {'attributes': [a['id'] for a in items], 'format': 'gpkg'}, tmp_path)
    assert manifest['alias_no_arquivo'] is True
    assert set(manifest['aliases']) == {i['field'] for i in items}
    assert (tmp_path/f'{dados.PREFIXO}.qml').exists()
    import csv
    linhas = list(csv.DictReader(
        (tmp_path/f'{dados.PREFIXO}_dicionario.csv').read_text(encoding='utf-8-sig').splitlines()))
    assert {'campo_exportado', 'alias', 'significado'} <= set(linhas[0])
    assert len(linhas) == len(items) + len(dados.CAMPOS_FIXOS)
    assert package[:2] == b'PK'


def test_base_dos_arquivos_usa_prefixo_id_curto_e_nome():
    base = service.base_arquivos('Risco hídrico 2026')
    prefixo, curto, resto = base.split('_', 2)
    assert prefixo == 'municipios'          # municipios_sp e o prefixo composto
    assert base.startswith('municipios_sp_')
    curto = base.removeprefix('municipios_sp_').split('_', 1)[0]
    assert len(curto) == 8 and curto.isalnum()
    assert base.endswith('_risco_hidrico_2026')
    # Nome vazio ainda produz uma base valida, so com o identificador curto.
    assert service.base_arquivos('   ').startswith('municipios_sp_')
    # Dois pedidos iguais nunca colidem.
    assert service.base_arquivos('igual') != service.base_arquivos('igual')


def test_pacote_nomeia_os_arquivos_pela_base(tmp_path):
    items = [a for a in dados.catalog() if a['field'] in {'seade_ipdm_2022', 'idh_idhm_2010'}]
    base = 'municipios_sp_abcd1234_teste'
    package, path, manifest, _ = service.materializar(
        {'attributes': [a['id'] for a in items], 'format': 'gpkg'}, tmp_path, base)
    assert path.name == f'{base}.gpkg'
    assert {f.name for f in tmp_path.iterdir()} == {
        f'{base}.gpkg', f'{base}.qml', f'{base}_dicionario.csv', f'{base}_metadados.json'}
    assert package[:2] == b'PK' and manifest['municipalities'] == 645


def test_alias_do_pacote_sao_unicos():
    # Rotulos longos de Renda ficavam iguais depois do corte e o GeoPackage,
    # que exige nome unico por tabela, descartava o alias em silencio.
    itens = [a for a in dados.catalog() if a['theme'] == '06_renda'][:400]
    aliases = [e['alias'] for e in dados.dicionario(itens, 'gpkg')]
    assert len(set(aliases)) == len(itens)
    assert all(len(a) <= 250 for a in aliases)


def test_capacidade_recusa_selecao_grande(monkeypatch):
    monkeypatch.setenv('SLT_MUNICIPAL_ORCAMENTO_MB', '300')
    assert dados.orcamento_mb() == 300
    dados.conferir_capacidade(1000)          # cabe
    with pytest.raises(ValueError) as erro:
        dados.conferir_capacidade(6347)
    assert 'MB' in str(erro.value) and 'por vez' in str(erro.value)
    monkeypatch.setenv('SLT_MUNICIPAL_ORCAMENTO_MB', '99999')
    dados.conferir_capacidade(6347)          # com folga, nao recusa


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
