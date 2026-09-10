import json

import pytest

from api.services import configuracao_bancada as configuracao
from api.services.extracao_atributos import catalogo


@pytest.fixture
def sem_arquivos(tmp_path, monkeypatch):
    monkeypatch.setattr(configuracao, 'raiz', lambda: tmp_path)
    return tmp_path


class Usuario:
    id = 'teste'


def duas_camadas():
    dados = catalogo()
    categoria = dados['categorias'][0]['id']
    camadas = [item['id'] for item in dados['camadas'][:2]]
    assert len(camadas) == 2
    return categoria, camadas


def test_salvar_listar_e_carregar(sem_arquivos):
    categoria, camadas = duas_camadas()
    salvo = configuracao.salvar('Minha bancada', [{'id': categoria, 'camadas': camadas}], Usuario())
    assert salvo['chave'] == 'minha-bancada' and salvo['camadas'] == 2
    assert (sem_arquivos / 'minha-bancada.json').is_file()

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
    caminho = sem_arquivos / 'bancada.json'
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
