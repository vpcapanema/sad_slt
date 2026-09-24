from types import SimpleNamespace
import pytest
from api.services import configuracao_bancada as config, extracao_atributos as service

@pytest.fixture
def catalogo(tmp_path, monkeypatch):
    monkeypatch.setattr(config, 'raiz', lambda: tmp_path)
    monkeypatch.setattr(service, 'catalogo', lambda: {
        'categorias':[{'id':'social','nome':'Social'}],
        'camadas':[{'id':ident,'nome':ident} for ident in ['entrada','base']]})
    return SimpleNamespace(id='teste')

def test_lista_nao_salva_entradas_algoritmo_ou_saida(catalogo):
    grupos=[{'id':'social','camadas':['base']}]
    config.salvar('Teste',grupos,catalogo,entradas=[{'id':'entrada'}],operacao='estatisticas',nome_saida='Saída',escopo='analise')
    config.salvar('Teste',grupos,catalogo,entradas=[{'id':'entrada'}],operacao='estatisticas',nome_saida='Saída',escopo='bases',categoria_ativa='social')
    lista=config.carregar('lista-bases-teste')
    assert lista['entradas']==[] and lista['operacao']=='' and lista['nome_saida']==''
    assert lista['escopo']=='bases' and lista['categoria_ativa']=='social'
    completa=config.carregar('teste')
    assert completa['entradas'][0]['id']=='entrada' and completa['operacao']=='estatisticas'
    assert {c['escopo'] for c in config.listar()}=={'analise','bases'}

def test_rascunho_sem_bases_e_sem_algoritmo(catalogo):
    config.salvar('Rascunho',[],catalogo,entradas=[{'id':'entrada'}],operacao='',categoria_ativa='social')
    saved=config.carregar('rascunho')
    assert saved['operacao']=='' and saved['categorias']==[] and saved['entradas'][0]['id']=='entrada'
    with pytest.raises(ValueError,match='ao menos uma base'):
        config.salvar('Lista vazia',[],catalogo,escopo='bases')


def test_listas_antigas_disponiveis_sem_reclassificar_analise(catalogo):
    import json
    antigo={'versao':3,'nome':'Risco','categorias':[{'id':'social','camadas':[{'id':'base','nome':'Base'}]}],
            'entradas':[{'id':'entrada','config':{}}]}
    config.arquivo('risco').write_text(json.dumps(antigo))
    resumo=config.listar()[0]
    assert resumo['lista_legada'] is True and resumo['escopo']=='analise'
    assert config.carregar('risco')['categorias'][0]['camadas'][0]['id']=='base'
    config.arquivo('corrompido').write_text('[]')
    assert len(config.listar())==1


def test_preparar_lista_preserva_referencias_sem_consultar_catalogo(catalogo, monkeypatch):
    import json
    config.arquivo('antiga').write_text(json.dumps({'versao':1,'nome':'Antiga','categorias':[{'id':'removida','camadas':[{'id':'desconhecida','nome':'Camada antiga'}]}]}))
    monkeypatch.setattr(service,'catalogo',lambda:pytest.fail('Preparar lista não deve consultar banco ou geometrias'))
    result=config.carregar('antiga',referencias=True)
    assert result['categorias'][0]['camadas'][0]['id']=='desconhecida'


def test_atualizar_lista_original_sem_criar_duplicata(catalogo):
    import json
    config.arquivo('risco').write_text(json.dumps({'versao':1,'nome':'Risco','categorias':[{'id':'social','camadas':[{'id':'base'}]}]}))
    result=config.salvar('Risco',[{'id':'social','camadas':['base']}],catalogo,escopo='bases',chave_lista='risco')
    assert result['chave']=='risco'
    assert len(config.listar())==1 and config.carregar('risco')['escopo']=='bases'
    config.salvar('Completa',[],catalogo,escopo='analise')
    with pytest.raises(ValueError,match='configuração completa'):
        config.salvar('Completa',[{'id':'social','camadas':['base']}],catalogo,escopo='bases',chave_lista='completa')
