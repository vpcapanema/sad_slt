import pytest
from api.services import bancadas_salvas as service

@pytest.fixture
def banco(tmp_path, monkeypatch):
    monkeypatch.setattr(service, 'project_path', lambda _: tmp_path)
    return service

def test_preserva_originais_e_isola_usuarios(banco):
    snapshot = {'versao':1,'bancadaEntradas':[{'id':'local:a','layer':{'arquivo_local':{'nome':'a.gpkg','conteudo_base64':'AAECAw=='}}}],
                'painel':[{'id':'a','visivel':False}], 'bancadaBases':[], 'bancadaResultados':[]}
    meta = banco.salvar('alice','Minha bancada',snapshot)
    assert banco.carregar('alice',meta['id'])['snapshot'] == snapshot
    assert banco.listar('alice') == [meta]
    assert banco.listar('bob') == []
    with pytest.raises(FileNotFoundError): banco.carregar('bob',meta['id'])
    with pytest.raises(ValueError): banco.carregar('alice','../arquivo')

def test_nao_sobrescreve_e_rejeita_salvamento_invalido(banco, monkeypatch):
    snapshot={'versao':1,'bancadaBases':[{'id':'base'}],'painel':[{'id':'base'}]}
    first=banco.salvar('alice','Bancada',snapshot)
    second=banco.salvar('alice','Bancada',snapshot)
    assert first['id'] != second['id']
    with pytest.raises(ValueError): banco.salvar('alice','',snapshot)
    with pytest.raises(ValueError): banco.salvar('alice','Vazia',{'versao':1})
    monkeypatch.setattr(banco,'MAX_BYTES',10)
    with pytest.raises(ValueError): banco.salvar('alice','Grande',snapshot)
    assert len(banco.listar('alice')) == 2
