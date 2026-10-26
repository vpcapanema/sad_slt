from api.services.base_municipal import nomes_exportados, alias_de


def test_nome_descritivo_do_exemplo_preserva_alias():
    item = {'field': 'populacao_V01000001_2022', 'theme': '01_populacao',
            'label': 'Taxa de crescimento geométrico', 'year': 2022}
    for fmt in ('fgb', 'gpkg', 'geojson'):
        assert nomes_exportados([item], fmt)[item['field']] == 'pop_taxa_crescimento_geometrico_2022'
    assert alias_de(item) == 'População · Taxa de crescimento geométrico (2022)'


def test_nomes_longos_e_duplicados_sao_unicos_e_independentes_da_ordem():
    items = [{'field': f'codigo_{i}', 'theme': '06_renda', 'year': 2022,
              'label': 'Rendimento ' + 'muito longo ' * 30} for i in range(3)]
    names = nomes_exportados(items, 'gpkg')
    assert names == nomes_exportados(items[::-1], 'gpkg')
    assert len(set(names.values())) == 3
    assert all(len(name) <= 63 and name.endswith('_2022') for name in names.values())


def test_rotulos_iguais_e_nomes_setoriais():
    items = [{'field': f'codigo_{i}', 'theme': '01_populacao', 'year': 2022,
              'label': 'População total'} for i in range(2)]
    assert len(set(nomes_exportados(items, 'fgb').values())) == 2
    assert nomes_exportados(items, 'fgb')['codigo_1'] == 'pop_populacao_total_variante_2_2022'
    item = {'field': 'setor_V01006_2022', 'theme': '01_populacao',
            'label': 'Total de pessoas', 'year': 2022}
    assert nomes_exportados([item], 'fgb') == {'setor_V01006_2022': 'pop_total_pessoas_2022'}
    assert alias_de(item) == 'População · Total de pessoas (2022)'
