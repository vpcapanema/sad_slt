import json

import pytest

from api.services import configuracao_bancada as configuracao
from api.services import extracao_atributos_regras as regras
from api.services.extracao_atributos import catalogo


def test_padrao_reproduz_atributos_por_localizacao():
    regra = regras.normalizar(None)
    assert regra['papel'] == 'atributos' and regra['ligacao'] == 'localizacao'
    assert regra['predicado'] == 'intersecta' and regra['multiplicidade'] == 'maior_sobreposicao'
    assert regra['campos'] is None and regra['prefixo'] is None and regra['apelidos'] == {}
    assert regra['preparacao'] == {'buffer_m': None, 'corrigir_geometrias': True, 'separar_por_tipo': True}


@pytest.mark.parametrize('regra, trecho', [
    ({'ligacao': 'atributo'}, 'chave da entrada'),
    ({'ligacao': 'localizacao', 'chave_base': 'CD_MUN'}, 'só se aplicam'),
    ({'papel': 'recorte', 'ligacao': 'atributo', 'chave_entrada': 'a', 'chave_base': 'b'}, 'ligação por localização'),
    ({'papel': 'recorte', 'preparacao': {'buffer_m': 50}}, 'não aceita buffer'),
    ({'prefixo': '1abc'}, 'Prefixo'),
    ({'campos': ['a', 'a']}, 'repetido'),
    ({'campos': ['a'], 'apelidos': {'b': 'Campo B'}}, 'não está na lista'),
    ({'preparacao': {'buffer_m': -5}}, 'greater than 0'),
    ({'multiplicidade': 'aleatoria'}, 'maior_sobreposicao'),
])
def test_regra_incoerente_e_recusada(regra, trecho):
    with pytest.raises(ValueError, match=trecho):
        regras.normalizar(regra)


def test_prefixo_normalizado_e_padrao():
    assert regras.normalizar({'prefixo': 'UCPI'})['prefixo'] == 'ucpi_'
    assert regras.prefixo_padrao('UCs — Proteção Integral') == 'ucs_protecao_integral_'
    assert regras.prefixo_padrao('2022 População') == 'b2022_populacao_'


def _categoria(*camadas):
    return [{'id': 'tema', 'camadas': [{'id': ident, 'nome': nome, 'regra': regra} for ident, nome, regra in camadas]}]


def test_conjunto_resolve_prefixos_e_limita_recorte():
    saida = regras.validar_conjunto(_categoria(('a', 'Inundação', None), ('b', 'Inundação', None),
                                               ('c', 'Municípios', {'papel': 'recorte'})))
    prefixos = [camada['regra']['prefixo'] for camada in saida[0]['camadas']]
    assert prefixos == ['inundacao_', 'inundacao2_', 'municipios_']
    with pytest.raises(ValueError, match='Só uma base pode ser a unidade de recorte'):
        regras.validar_conjunto(_categoria(('a', 'A', {'papel': 'recorte'}), ('b', 'B', {'papel': 'recorte'})))
    with pytest.raises(ValueError, match='está em mais de uma base'):
        regras.validar_conjunto(_categoria(('a', 'A', {'prefixo': 'x'}), ('b', 'B', {'prefixo': 'x'})))


class Usuario:
    id = 'teste'


@pytest.fixture
def pasta(tmp_path, monkeypatch):
    monkeypatch.setattr(configuracao, 'raiz', lambda: tmp_path)
    return tmp_path


def _duas_camadas():
    dados = catalogo()
    camadas = [item['id'] for item in dados['camadas'][:2]]
    assert len(camadas) == 2
    return dados['categorias'][0]['id'], camadas


def test_configuracao_v2_guarda_regra_e_le_v1(pasta):
    categoria, camadas = _duas_camadas()
    regra = {'multiplicidade': 'resumo', 'prefixo': 'uc', 'campos': ['nome'], 'apelidos': {'nome': 'Nome da UC'}}
    configuracao.salvar('Com regras', [{'id': categoria, 'camadas': camadas, 'regras': {camadas[0]: regra}}], Usuario())
    gravado = json.loads((pasta / 'com-regras.json').read_text(encoding='utf-8'))
    assert gravado['versao'] == configuracao.VERSAO
    carregado = configuracao.carregar('com-regras')
    primeira, segunda = carregado['categorias'][0]['camadas']
    assert primeira['regra']['multiplicidade'] == 'resumo' and primeira['regra']['prefixo'] == 'uc_'
    assert primeira['regra']['apelidos'] == {'nome': 'Nome da UC'}
    assert segunda['regra'] == regras.normalizar(None)

    # Arquivo da versão 1 (sem regra) continua abrindo, com a regra padrão.
    gravado['versao'] = 1
    for camada in gravado['categorias'][0]['camadas']:
        camada.pop('regra')
    (pasta / 'antiga.json').write_text(json.dumps(gravado, ensure_ascii=False), encoding='utf-8')
    antiga = configuracao.carregar('antiga')
    assert all(c['regra'] == regras.normalizar(None) for c in antiga['categorias'][0]['camadas'])


def test_configuracao_v3_guarda_entradas_e_finalidades(pasta):
    categoria, camadas = _duas_camadas()
    salvo = configuracao.salvar(
        'Analise completa', [{'id': categoria, 'camadas': [camadas[1]]}], Usuario(),
        entradas=[{'id': camadas[0], 'config': {'campo_id': 'proj_id',
                                                'filtro': {'campo': 'proj_id', 'operador': 'preenchido'}}}],
        finalidades=[{'nome': 'Indicadores', 'campos': ['id_registro', 'camada_origem']}])
    assert salvo['entradas'] == 1 and salvo['finalidades'] == 1
    gravado = json.loads((pasta / 'analise-completa.json').read_text(encoding='utf-8'))
    assert gravado['versao'] == configuracao.VERSAO
    carregado = configuracao.carregar('analise-completa')
    entrada = carregado['entradas'][0]
    assert entrada['id'] == camadas[0] and entrada['config']['campo_id'] == 'proj_id'
    assert entrada['config']['filtro']['operador'] == 'preenchido'
    assert carregado['finalidades'][0]['campos'] == ['id_registro', 'camada_origem']
    assert configuracao.listar()[0]['entradas'] == 1

    # Configuração sem entradas (versões 1 e 2) abre com as listas vazias.
    gravado['versao'] = 2
    for chave in ('entradas', 'finalidades'):
        gravado.pop(chave)
    (pasta / 'antiga-v2.json').write_text(json.dumps(gravado, ensure_ascii=False), encoding='utf-8')
    antiga = configuracao.carregar('antiga-v2')
    assert antiga['entradas'] == [] and antiga['finalidades'] == []


def test_configuracao_recusa_entrada_fora_do_catalogo(pasta):
    categoria, camadas = _duas_camadas()
    with pytest.raises(ValueError, match='Camada de entrada indispon'):
        configuracao.salvar('X', [{'id': categoria, 'camadas': [camadas[0]]}], Usuario(),
                            entradas=[{'id': 'camada_que_nao_existe'}])


def test_configuracao_recusa_duas_unidades_de_recorte(pasta):
    categoria, camadas = _duas_camadas()
    recorte = {'papel': 'recorte'}
    with pytest.raises(ValueError, match='unidade de recorte'):
        configuracao.salvar('X', [{'id': categoria, 'camadas': camadas,
                                   'regras': {camadas[0]: recorte, camadas[1]: recorte}}], Usuario())


def test_api_recusa_regra_de_camada_fora_da_categoria():
    from pydantic import ValidationError
    from api.routers.extracao_atributos import Categoria
    assert Categoria(id='t', camadas=['a'], regras={'a': {'multiplicidade': 'todas'}}).regras['a'].multiplicidade == 'todas'
    with pytest.raises(ValidationError, match='não está nesta categoria'):
        Categoria(id='t', camadas=['a'], regras={'b': {}})
