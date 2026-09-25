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
    lista=config.carregar('lista-bases-teste', escopo='bases')
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
    assert resumo['lista_legada'] is False and resumo['escopo']=='analise'
    assert config.carregar('risco')['categorias'][0]['camadas'][0]['id']=='base'
    config.arquivo('corrompido').write_text('[]')
    assert len(config.listar())==1


def test_preparar_lista_preserva_referencias_sem_consultar_catalogo(catalogo, monkeypatch):
    import json
    (config.raiz() / 'antiga.json').write_text(json.dumps({'versao':1,'nome':'Antiga','categorias':[{'id':'removida','camadas':[{'id':'desconhecida','nome':'Camada antiga'}]}]}))
    monkeypatch.setattr(service,'catalogo',lambda:pytest.fail('Preparar lista não deve consultar banco ou geometrias'))
    result=config.carregar('antiga',referencias=True,escopo='bases')
    assert result['categorias'][0]['camadas'][0]['id']=='desconhecida'


def test_atualizar_lista_original_sem_criar_duplicata(catalogo):
    import json
    (config.raiz() / 'risco.json').write_text(json.dumps({'versao':1,'nome':'Risco','categorias':[{'id':'social','camadas':[{'id':'base'}]}]}))
    result=config.salvar('Risco',[{'id':'social','camadas':['base']}],catalogo,escopo='bases',chave_lista='risco')
    assert result['chave']=='risco'
    assert len(config.listar())==1 and config.carregar('risco',escopo='bases')['escopo']=='bases'
    config.salvar('Completa',[],catalogo,escopo='analise')
    with pytest.raises(ValueError,match='configuração completa'):
        config.salvar('Completa',[{'id':'social','camadas':['base']}],catalogo,escopo='bases',chave_lista='completa')


def test_diretorios_isolados_na_leitura_listagem_e_exclusao(catalogo):
    import json
    for escopo in ['bases', 'analise']:
        config.arquivo('mesmo-nome', escopo).write_text(json.dumps({
            'versao': 5, 'escopo': escopo, 'nome': escopo, 'categorias': []}))
    assert config.carregar('mesmo-nome', referencias=True, escopo='bases')['nome'] == 'bases'
    assert config.carregar('mesmo-nome', referencias=True)['nome'] == 'analise'
    assert [item['nome'] for item in config.listar('bases')] == ['bases']
    assert [item['nome'] for item in config.listar('analise')] == ['analise']
    config.excluir('mesmo-nome', escopo='bases')
    assert config.arquivo('mesmo-nome').is_file()
    with pytest.raises(FileNotFoundError):
        config.carregar('mesmo-nome', escopo='bases')
    with pytest.raises(ValueError):
        config.arquivo('valido', '../fora')


def test_migracao_preserva_bytes_e_nao_sobrescreve_colisoes(catalogo):
    import json
    raiz = config.raiz()
    lista = json.dumps({'versao': 1, 'nome': 'Risco', 'categorias': [{'id':'social','camadas':[]}]}).encode()
    analise = json.dumps({'versao': 3, 'nome': 'Completa', 'categorias': [], 'entradas': [{'id':'entrada'}]}).encode()
    (raiz / 'risco.json').write_bytes(lista)
    (raiz / 'completa.json').write_bytes(analise)
    destino = config.arquivo('risco', 'bases')
    destino.write_bytes(b'{"versao":5,"escopo":"bases","nome":"Outra lista"}')
    original = destino.read_bytes()
    movidos = config.migrar_legadas()
    assert len(movidos) == 2 and not list(raiz.glob('*.json'))
    assert destino.read_bytes() == original
    assert next(config.diretorio('bases').glob('risco-legado-*.json')).read_bytes() == lista
    assert config.arquivo('completa').read_bytes() == analise
    assert config.migrar_legadas() == []


def test_salvar_lista_e_analise_usa_subdiretorios(catalogo):
    grupos = [{'id':'social','camadas':['base']}]
    config.salvar('Minha lista', grupos, catalogo, escopo='bases')
    config.salvar('Minha análise', grupos, catalogo, escopo='analise')
    assert (config.raiz() / 'config-lista-camadas-base' / 'lista-bases-minha-lista.json').is_file()
    assert (config.raiz() / 'config-analise' / 'minha-analise.json').is_file()
    assert not list(config.raiz().glob('*.json'))


def test_migracao_com_falha_preserva_origem(catalogo, monkeypatch):
    import json
    origem = config.raiz() / 'risco.json'
    conteudo = json.dumps({'versao':1,'categorias':[{'id':'social','camadas':[]}]}).encode()
    origem.write_bytes(conteudo)
    def falhar(*args):
        raise OSError('disco indisponível')
    monkeypatch.setattr(config.os, 'fsync', falhar)
    with pytest.raises(OSError):
        config.migrar_legadas()
    assert origem.read_bytes() == conteudo
    assert not config.arquivo('risco', 'bases').exists()
