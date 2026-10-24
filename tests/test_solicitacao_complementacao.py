from contextlib import nullcontext
from types import SimpleNamespace
from uuid import uuid4
import pytest
from fastapi import HTTPException
from api.exceptions import DemandaValidationError
from api.services import solicitacao_complementacao_service as service
from api.services import analise_demanda_service as analise
from api.routers import complementacao as router

@pytest.fixture
def fluxo(monkeypatch):
    usuario = SimpleNamespace(id=str(uuid4()), nome='Analista', tipo_usuario='ANALISTA')
    demanda = {'codigo': 'D', 'status': 'analise_em_avaliacao'}
    pedidos, eventos = [], []
    monkeypatch.setattr(service, 'atomic_connection', lambda: nullcontext(None))
    monkeypatch.setattr(service, 'bloquear', lambda *args: demanda)
    monkeypatch.setattr(analise, '_localizar_demanda', lambda codigo: ('projeto', demanda))
    monkeypatch.setattr(service.repo, 'listar', lambda **kw: pedidos)
    def criar(tipo, codigo, categorias, descricao, user, hierarquizacao):
        p = dict(id=str(uuid4()), demanda_tipo=tipo, demanda_codigo=codigo, categorias=categorias,
                 descricao=descricao, hierarquizacao_codigo=hierarquizacao,
                 status='solicitada', categorias_salvas={})
        pedidos.append(p)
        eventos.append('pedido')
        return p
    monkeypatch.setattr(service.repo, 'criar', criar)
    monkeypatch.setattr(analise, '_aplicar_transicao', lambda **kw: eventos.append('status'))
    monkeypatch.setattr(service.hierarquizacao_repository, 'get_by_codigo', lambda codigo: {
        'dados_hierarquizacao': {'objetos': [{'cabecalho_objeto': {'codigo': 'D', 'tipo_demanda': 'projeto'}}]}})
    return SimpleNamespace(user=usuario, demanda=demanda, pedidos=pedidos, eventos=eventos)

@pytest.mark.parametrize('categorias', [['dados_cadastrais'], ['geometria'], ['dados_cadastrais','geometria']])
def test_pedido_registrado_antes_da_transicao(fluxo, categorias):
    p = service.solicitar('D', categorias=categorias, descricao='Corrigir dados', user=fluxo.user)
    assert p['categorias'] == categorias
    assert fluxo.eventos == ['pedido','status']
    with pytest.raises(DemandaValidationError):
        service.solicitar('D', categorias=categorias, descricao='Duplicado', user=fluxo.user)


def test_atributos_independentes_por_hierarquizacao(fluxo):
    fluxo.demanda['status'] = 'analise_aprovada'
    for h in ['H1','H2']:
        service.solicitar('D', categorias=['atributos_objeto'], descricao='Preencher custo',
                         user=fluxo.user, hierarquizacao_codigo=h)
    assert fluxo.eventos == ['pedido','pedido']
    assert {p['hierarquizacao_codigo'] for p in fluxo.pedidos} == {'H1','H2'}

@pytest.mark.parametrize('categorias,h,descricao', [([],None,'Motivo'), (['invalido'],None,'Motivo'),
    (['dados_cadastrais'],None,' '), (['atributos_objeto'],None,'Motivo'),
    (['geometria'],'H','Motivo'), (['atributos_objeto','geometria'],'H','Motivo')])
def test_rejeita_pedido_incompleto(fluxo,categorias,h,descricao):
    with pytest.raises(DemandaValidationError):
        service.solicitar('D', categorias=categorias,descricao=descricao,user=fluxo.user,hierarquizacao_codigo=h)
    assert not fluxo.eventos


def test_atributos_rejeitam_objeto_fora_da_hierarquizacao(fluxo,monkeypatch):
    monkeypatch.setattr(service.hierarquizacao_repository,'get_by_codigo',lambda codigo: None)
    with pytest.raises(DemandaValidationError):
        service.solicitar('D', categorias=['atributos_objeto'],descricao='Motivo',user=fluxo.user,hierarquizacao_codigo='H')
    assert not fluxo.eventos


def test_patch_nao_pode_criar_fila_por_status_nem_sair_com_pedido_aberto(fluxo):
    with pytest.raises(DemandaValidationError):
        service.validar_mudanca_status('projeto','D','analise_em_avaliacao','analise_aguardando_complementacao')
    service.solicitar('D', categorias=['geometria'],descricao='Motivo',user=fluxo.user)
    with pytest.raises(DemandaValidationError):
        service.validar_mudanca_status('projeto','D','analise_aguardando_complementacao','analise_em_avaliacao')


def test_conclusao_exige_todos_os_tipos_salvos_e_preserva_historico(fluxo,monkeypatch):
    p=service.solicitar('D', categorias=['dados_cadastrais','geometria'],descricao='Motivo',user=fluxo.user)
    monkeypatch.setattr(router,'atomic_connection',lambda: nullcontext(None))
    monkeypatch.setattr(router,'bloquear',lambda *args: fluxo.demanda)
    monkeypatch.setattr(router,'_pessoa_id',lambda user: None)
    monkeypatch.setattr(router.demanda_repository,'get_by_codigo',lambda codigo: fluxo.demanda)
    monkeypatch.setattr(service.repo,'obter',lambda *args,**kw: p)
    atendidos=[]
    monkeypatch.setattr(service.repo,'atender',lambda id,user: atendidos.append((id,user)) or p)
    p['categorias_salvas']['dados_cadastrais']={}
    with pytest.raises(HTTPException) as e:
        router.concluir_solicitacao(p['id'],fluxo.user)
    assert e.value.status_code == 422
    assert not atendidos
    p['categorias_salvas']['geometria']={}
    router.concluir_solicitacao(p['id'],fluxo.user)
    assert atendidos == [(p['id'],fluxo.user.id)]
    assert p in fluxo.pedidos


def test_conclusao_rejeita_operador_sem_vinculo(fluxo,monkeypatch):
    p=service.solicitar('D',categorias=['geometria'],descricao='Motivo',user=fluxo.user)
    monkeypatch.setattr(service.repo,'obter',lambda *args,**kw: p)
    monkeypatch.setattr(router.demanda_repository,'get_by_codigo',lambda codigo: fluxo.demanda)
    monkeypatch.setattr(router,'_pessoa_id',lambda user: None)
    fluxo.user.tipo_usuario='OPERADOR'
    with pytest.raises(HTTPException) as e:
        router.concluir_solicitacao(p['id'],fluxo.user)
    assert e.value.status_code==403


def test_conclusao_atributos_revalida_pendencias_e_aceita_zero(fluxo,monkeypatch):
    p=service.solicitar('D',categorias=['atributos_objeto'],descricao='Preencher custo',user=fluxo.user,hierarquizacao_codigo='H')
    p['categorias_salvas']={'atributos_objeto': {}}
    cab={'codigo':'D','atributos_fase3': {'custo': {'valor_bruto':None}}}
    h={'codigo':'H','dados_hierarquizacao': {'objetos': [{'cabecalho_objeto':cab}]}}
    monkeypatch.setattr(router,'atomic_connection',lambda: nullcontext(None))
    monkeypatch.setattr(router,'bloquear',lambda *args: fluxo.demanda)
    monkeypatch.setattr(router,'_pessoa_id',lambda user: None)
    monkeypatch.setattr(router.demanda_repository,'get_by_codigo',lambda codigo: fluxo.demanda)
    monkeypatch.setattr(service.repo,'obter',lambda *args,**kw: p)
    monkeypatch.setattr(router.hierarquizacao_repository,'get_by_codigo',lambda codigo: h)
    monkeypatch.setattr(router,'colunas_da_hierarquizacao',lambda *a,**kw: [{'id':'custo'}])
    atendidos=[]
    monkeypatch.setattr(service.repo,'atender',lambda *args: atendidos.append(args))
    with pytest.raises(HTTPException) as e:
        router.concluir_solicitacao(p['id'],fluxo.user)
    assert e.value.status_code==422
    cab['atributos_fase3']['custo']['valor_bruto']=0
    router.concluir_solicitacao(p['id'],fluxo.user)
    assert len(atendidos)==1
