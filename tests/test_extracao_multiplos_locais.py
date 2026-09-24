from types import SimpleNamespace
from unittest.mock import Mock
import pytest
from api.services import extracao_atributos as servico, extracao_entrada_local as local


def preparar(monkeypatch):
    monkeypatch.setattr(servico,'catalogo',lambda:{'camadas':[{'id':'base','nome':'Base'}],'categorias':[{'id':'social','nome':'Social'}]})
    monkeypatch.setattr(local,'restaurar',lambda p:(p['nome'],{'nome_camada':p['nome']}))
    monkeypatch.setattr(servico.ciclo,'iniciar',Mock(return_value='teste-local'))
    submit=Mock();monkeypatch.setattr(servico._pool,'submit',submit)
    from api.services import extracao_atributos_regras as regras
    monkeypatch.setattr(regras,'normalizar_estatisticas',lambda c:c)
    return submit


def payload():
    return dict(input_id='local:1',arquivo_local={'nome':'um.gpkg','conteudo_base64':'AA=='},
                entradas_locais={'local:2':{'nome':'dois.gpkg','conteudo_base64':'AA=='},'local:3':{'nome':'tres.gpkg','conteudo_base64':'AA=='}},
                operacao='estatisticas',categorias=[{'id':'social','camadas':['base']}],
                entradas=[{'id':f'local:{i}'} for i in range(1,4)])


def test_tres_originais_chegam_ao_worker(monkeypatch):
    submit=preparar(monkeypatch)
    servico.iniciar(payload(),SimpleNamespace(id='autor'))
    args=submit.call_args.args
    assert args[-1]=={'local:1':'um.gpkg','local:2':'dois.gpkg','local:3':'tres.gpkg'}
    assert [e['id'] for e in args[2]['entradas']]==['local:1','local:2','local:3']
    assert 'conteudo_base64' not in str(args[2])


def test_rejeita_arquivo_fora_da_bancada(monkeypatch):
    submit=preparar(monkeypatch);p=payload();p['entradas']=p['entradas'][:2]
    with pytest.raises(ValueError,match='bancada'):servico.iniciar(p,SimpleNamespace(id='autor'))
    assert not submit.called and not servico.ciclo.iniciar.called


def test_limite_total_conferido_antes_de_ler(monkeypatch):
    submit=preparar(monkeypatch);p=payload()
    p['arquivo_local']['conteudo_base64']='A'*(31*1024*1024)
    with pytest.raises(ValueError,match='30 MB'):servico.iniciar(p,SimpleNamespace(id='autor'))
    assert not submit.called and not servico.ciclo.iniciar.called
