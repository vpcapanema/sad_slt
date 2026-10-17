import json

import pytest

from api.services import configuracao_bancada as configuracao
from api.services import extracao_atributos


@pytest.fixture
def sem_arquivos(tmp_path, monkeypatch, storage_sintetico):
    monkeypatch.setattr(configuracao, 'raiz', lambda: tmp_path)
    monkeypatch.setattr(extracao_atributos, 'catalogo', lambda: {
        'categorias': [{'id': 'categoria-teste', 'nome': 'Categoria de teste'}],
        'camadas': [
            {'id': 'camada-1', 'nome': 'Camada 1', 'arquivo': 'camada-1.gpkg'},
            {'id': 'camada-2', 'nome': 'Camada 2', 'arquivo': 'camada-2.gpkg'},
        ],
    })
    return tmp_path


class Usuario:
    id = 'teste'


def duas_camadas():
    return 'categoria-teste', ['camada-1', 'camada-2']


def test_salvar_listar_e_carregar(sem_arquivos):
    categoria, camadas = duas_camadas()
    salvo = configuracao.salvar('Minha bancada', [{'id': categoria, 'camadas': camadas}], Usuario())
    assert salvo['chave'] == 'minha-bancada' and salvo['camadas'] == 2
    assert (sem_arquivos / 'config-analise' / 'minha-bancada.json').is_file()

    listagem = configuracao.listar()
    assert [item['chave'] for item in listagem] == ['minha-bancada']

    carregado = configuracao.carregar('minha-bancada')
    assert carregado['nome'] == 'Minha bancada' and carregado['ausentes'] == []
    assert [item['id'] for item in carregado['categorias'][0]['camadas']] == camadas


def test_camada_repetida_e_categoria_invalida(sem_arquivos):
    categoria, camadas = duas_camadas()
    with pytest.raises(ValueError):
        configuracao.salvar('X', [{'id': categoria, 'camadas': [camadas[0], camadas[0]]},
                                  {'id': categoria, 'camadas': []}], Usuario())
    with pytest.raises(ValueError):
        configuracao.salvar('X', [{'id': 'nao_existe', 'camadas': camadas}], Usuario())


def test_referencia_perdida_vira_ausente(sem_arquivos):
    categoria, camadas = duas_camadas()
    configuracao.salvar('Bancada', [{'id': categoria, 'camadas': camadas}], Usuario())
    caminho = sem_arquivos / 'config-analise' / 'bancada.json'
    dados = json.loads(caminho.read_text(encoding='utf-8'))
    dados['categorias'][0]['camadas'].append({'id': 'camada_inexistente', 'nome': 'Sumida'})
    caminho.write_text(json.dumps(dados, ensure_ascii=False), encoding='utf-8')
    carregado = configuracao.carregar('bancada')
    assert carregado['ausentes'] == ['Sumida']
    assert len(carregado['categorias'][0]['camadas']) == 2


def test_chave_invalida_nao_escapa_da_pasta(sem_arquivos):
    for chave in ['../fora', 'com/barra', '', 'MAIUSCULA']:
        with pytest.raises(ValueError):
            configuracao.arquivo(chave)


@pytest.mark.parametrize('papel', ['restricao', 'risco'])
def test_lista_elegibilidade_persiste_em_escopo_proprio(sem_arquivos, papel):
    escopo = f'elegibilidade-{papel}'
    salvo = configuracao.salvar('Referências territoriais',
                               [{'id': papel, 'camadas': ['camada-1', 'camada-2']}],
                               Usuario(), escopo=escopo)
    assert (sem_arquivos / escopo / f"{salvo['chave']}.json").is_file()
    assert configuracao.listar('bases') == []
    assert configuracao.listar('analise') == []
    assert configuracao.listar(escopo)[0]['chave'] == salvo['chave']
    leitura = configuracao.carregar(salvo['chave'], referencias=True, escopo=escopo)
    assert leitura['escopo'] == escopo
    assert leitura['categorias'][0]['id'] == papel
    assert [c['id'] for c in leitura['categorias'][0]['camadas']] == ['camada-1', 'camada-2']
    assert configuracao.carregar(salvo['chave'], escopo=escopo)['ausentes'] == []


def test_elegibilidade_nao_aceita_outro_papel_ou_lista_vazia(sem_arquivos):
    for grupos in [[], [{'id': 'risco', 'camadas': ['camada-1']}],
                   [{'id': 'restricao', 'camadas': ['camada-1', 'camada-1']}]]:
        with pytest.raises(ValueError):
            configuracao.salvar('Inválida', grupos, Usuario(), escopo='elegibilidade-restricao')


def test_listas_de_mesmo_nome_nao_misturam_papeis(sem_arquivos):
    for papel, camada in [('restricao', 'camada-1'), ('risco', 'camada-2')]:
        configuracao.salvar('Território', [{'id': papel, 'camadas': [camada]}],
                           Usuario(), escopo=f'elegibilidade-{papel}')
    for papel, camada in [('restricao', 'camada-1'), ('risco', 'camada-2')]:
        dados = configuracao.carregar('territorio', referencias=True, escopo=f'elegibilidade-{papel}')
        assert dados['categorias'][0]['camadas'][0]['id'] == camada
