from copy import deepcopy

import pytest

from scripts.fontes_setoriais_2022 import FONTES, url_fonte
from scripts.preparar_catalogo_territorial import validar_inventario


@pytest.fixture
def complete_catalog():
    attributes, sources = [], []
    for index, (name, file, _) in enumerate(FONTES):
        keys = [f'{name}_{number}' for number in range(3502 if index == 0 else 1)]
        source = {'conjunto': name, 'url': url_fonte(name, file), 'sha256': 'a' * 64,
                  'campos': len(keys), 'setores': 103319, 'sigilos_x': 0,
                  'coberturas': dict.fromkeys(keys, 103319)}
        sources.append(source)
        attributes.extend({
            'campo': key, 'chave': key, 'origem': 'originais', 'url': source['url'],
            'cobertura': 103319, 'detalhe': {
                'conjunto': name, 'sha256': source['sha256'],
                'registros_fonte_sp': 103319, 'sigilos_x_conjunto': 0,
            },
        } for key in keys)
    attributes.extend({'origem': 'combinados'} for _ in range(10))
    return attributes, {'referencia': 2022, 'campos_originais': 3519,
                        'malha_preservada': True, 'conjuntos': sources}


def test_certifica_somente_catalogo_completo_e_compativel(complete_catalog):
    attributes, inventory = complete_catalog
    assert validar_inventario(attributes, inventory) == {
        'completa': True, 'conjuntos': 18, 'originais': 3519, 'combinados': 10,
    }


def test_rejeita_catalogo_parcial(complete_catalog):
    attributes, inventory = complete_catalog
    with pytest.raises(ValueError, match='Catalogo setorial incompleto'):
        validar_inventario(attributes[1:], inventory)


def test_rejeita_mesma_contagem_com_campo_errado(complete_catalog):
    attributes, inventory = complete_catalog
    attributes[0]['chave'] = 'campo_nao_publicado'
    with pytest.raises(ValueError, match='Campos persistidos divergem'):
        validar_inventario(attributes, inventory)


@pytest.mark.parametrize('field,value', [
    ('sha256', 'b' * 64),
    ('registros_fonte_sp', 100000),
    ('sigilos_x_conjunto', None),
    ('conjunto', 'desconhecido'),
])
def test_rejeita_metadados_divergentes(complete_catalog, field, value):
    attributes, inventory = complete_catalog
    attributes[0]['detalhe'][field] = value
    with pytest.raises(ValueError):
        validar_inventario(attributes, inventory)


def test_rejeita_cobertura_divergente(complete_catalog):
    attributes, inventory = complete_catalog
    attributes[0]['cobertura'] -= 1
    with pytest.raises(ValueError, match='Atributo diverge'):
        validar_inventario(attributes, inventory)


@pytest.mark.parametrize('change', ['ausente', 'duplicado', 'url', 'sigilo', 'malha'])
def test_rejeita_inventario_incompleto_ou_invalido(complete_catalog, change):
    attributes, original = complete_catalog
    inventory = deepcopy(original)
    if change == 'ausente':
        inventory['conjuntos'].pop()
    elif change == 'duplicado':
        inventory['conjuntos'][-1] = deepcopy(inventory['conjuntos'][0])
    elif change == 'url':
        inventory['conjuntos'][0]['url'] = 'https://example.invalid/dados.zip'
    elif change == 'sigilo':
        inventory['conjuntos'][0]['sigilos_x'] = None
    else:
        inventory['malha_preservada'] = False
    with pytest.raises(ValueError):
        validar_inventario(attributes, inventory)
