"""Matriz efetiva: autorizações no servidor, revogação, escopo e feedback HTTP."""
from dataclasses import replace
from uuid import uuid4

import pytest
from fastapi import HTTPException
from fastapi.routing import APIRoute
from fastapi.testclient import TestClient
from starlette.requests import Request

from api.server import app
from api.services.session_service import SessionUser, cookie_name, create_token
from api.services import autorizacao as authz
from api.deps.access_policy import authorize_request, consultation, write_permissions, _public
from api.repositories import usuario_politica_repository


def usuario(perfil, **kw):
    return SessionUser(str(uuid4()), '', 'teste_'+perfil.lower(), 'Teste', perfil, **kw)


def client(perfil):
    c = TestClient(app)
    c.cookies.set(cookie_name(), create_token(usuario(perfil)))
    return c


@pytest.mark.parametrize('perfil,permitido', [('ADMIN',False),('GESTOR',True),('ANALISTA',False),('OPERADOR',False),('VISUALIZADOR',False)])
def test_apenas_concessao_mad_autoriza_operacao(perfil, permitido):
    r = client(perfil).post('/api/agrupamentos-demandas',json={})
    assert r.status_code == (422 if permitido else 403)
    if not permitido:
        assert 'não autorizada' in r.json()['detail']
        assert r.headers['x-sicard-permission-denied'] == 'true'


@pytest.mark.parametrize('perfil', ['ADMIN','GESTOR','OPERADOR','VISUALIZADOR'])
@pytest.mark.parametrize('path', ['/api/analise/D/decidir','/api/analise/D/situacao','/api/sei/documentos'])
def test_negativa_de_mocad_e_explicita_antes_de_validar_corpo(perfil,path):
    r=client(perfil).post(path,json={})
    assert r.status_code==403
    assert 'não possui a permissão' in r.json()['detail']


def test_revogacao_vale_na_proxima_requisicao_da_mesma_sessao(politicas_sinteticas, monkeypatch):
    from api.services import analise_demanda_service
    def autorizado(*args, **kwargs):
        raise HTTPException(409, 'Serviço alcançado com permissão válida')
    monkeypatch.setattr(analise_demanda_service, 'salvar_criterios', autorizado)
    c=client('ANALISTA')
    assert c.put('/api/analise/D/criterios',json={}).status_code==409
    del politicas_sinteticas['ANALISTA']['mocad.analisar']
    assert c.put('/api/analise/D/criterios',json={}).status_code==403
    assert 'mocad.analisar' not in c.get('/api/auth/me').json()['permissoes']


def test_vinculo_local_inativo_impede_reuso_da_sessao(monkeypatch):
    c=client('ADMIN')
    monkeypatch.setattr(usuario_politica_repository,'carregar',lambda user:None)
    assert c.get('/api/auth/me').status_code==401
    assert c.post('/api/agrupamentos-demandas',json={}).status_code==401


@pytest.mark.parametrize('perfil', ['ADMIN','ANALISTA','OPERADOR','VISUALIZADOR'])
def test_status_inline_nao_pode_ser_escondido_em_patch_generico(perfil):
    r=client(perfil).patch('/api/demandas/D',json={'status':'analise_em_avaliacao','justificativa_status':'Teste de controle'})
    assert r.status_code==403


def test_gestor_nao_mistura_reversao_de_status_com_outras_edicoes():
    r=client('GESTOR').patch('/api/demandas/D',json={'status':'analise_em_avaliacao','nome':'Alterado','justificativa_status':'Teste de controle'})
    assert r.status_code==403
    assert 'somente o novo status' in r.json()['detail']


def test_reversao_requer_justificativa_antes_de_consultar_registro():
    r=client('GESTOR').patch('/api/demandas/D',json={'status':'analise_em_avaliacao'})
    assert r.status_code==422
    assert 'justificativa' in r.json()['detail']


@pytest.mark.parametrize('path', ['/api/admin/tabelas/demandas/projeto','/api/admin/tabelas/ahp/comparacao_colaborativa_resposta','/api/admin/tabelas/hierarquizacao_demandas/hierarquizacao_portfolio','/api/admin/tabelas/auditoria/log_sistema'])
def test_crud_tecnico_nao_contorna_as_decisoes_de_negocio(path):
    r=client('ADMIN').patch(path,json={'chave':{'id':str(uuid4())},'valores':{'status':'aprovada'}})
    assert r.status_code==403
    assert 'fluxo MOCAD ou MAD' in r.json()['detail']


def test_escopo_proprio_nao_inclui_outro_cadastro():
    u=usuario('OPERADOR')
    registros=[{'criado_por':u.id,'codigo':'PROPRIO'}, {'criado_por':'outro','codigo':'OUTRO'}]
    assert authz.filtrar_cadastros(u,registros)==registros[:1]
    with pytest.raises(HTTPException) as erro:
        authz.exigir_cadastro(u,registros[1])
    assert erro.value.status_code==403


@pytest.mark.parametrize('pessoa,instituicao,permitido', [('propria',None,True),('outra',None,False),(None,'instituicao',False),(None,None,False)])
def test_cadastro_proprio_confere_representante_da_conta(pessoa,instituicao,permitido):
    from types import SimpleNamespace
    u=usuario('OPERADOR',pessoa_id='propria')
    body=SimpleNamespace(pessoa_id=pessoa,representante=SimpleNamespace(pessoa_id=pessoa,instituicao_id=instituicao))
    if permitido:
        authz.exigir_criacao(u,body)
    else:
        with pytest.raises(HTTPException) as exc:
            authz.exigir_criacao(u,body)
        assert exc.value.status_code==403
        assert 'próprio' in exc.value.detail


@pytest.mark.parametrize('perfil', ['OPERADOR','ANALISTA'])
def test_cadastro_nao_pode_embutir_decisao_de_status(perfil):
    from types import SimpleNamespace
    with pytest.raises(HTTPException) as exc:
        authz.exigir_criacao(usuario(perfil),SimpleNamespace(status='analise_aprovada'))
    assert exc.value.status_code==403
    assert 'iniciam em análise' in exc.value.detail


@pytest.mark.parametrize('path', ['/restrict/demandas/','/restrict/admin/','/restrict/operador/','/restrict/hierarquizacao/','/restrict/central-pendencias/','/public/cadastro/nova-demanda/'])
def test_visualizador_pode_abrir_paginas_sem_gravacao(path):
    r=client('VISUALIZADOR').get(path)
    assert r.status_code==200
    assert 'sicard-access-policy' in r.text


def test_pagina_negada_tem_mensagem_e_feedback_padrao():
    r=client('OPERADOR').get('/restrict/admin/')
    assert r.status_code==403
    assert 'role="alert"' in r.text and 'acesso-negado.js' in r.text


def test_toda_mutacao_registrada_tem_politica_explicita():
    ausentes=[]
    for route in app.routes:
        if not isinstance(route,APIRoute) or not route.path.startswith('/api/'):
            continue
        for method in route.methods - {'GET','HEAD','OPTIONS'}:
            if not _public(route.path,method) and not consultation(route.path,method) and not write_permissions(route.path,method):
                ausentes.append((method,route.path))
    assert not ausentes


def test_auditoria_respeita_a_transacao_atomica_da_operacao():
    from unittest.mock import Mock
    from api.db import connection as db
    from api.repositories import auditoria_repository
    conn=Mock()
    conn.closed=False
    with db.atomic_connection(conn):
        auditoria_repository.registrar(nivel='AUDIT',categoria='permissao',operacao='REVERTER_STATUS_INLINE',
            mensagem='Teste',dados_anteriores={'status':'anterior'},dados_novos={'status':'novo'})
        conn.commit.assert_not_called()
    conn.commit.assert_called_once()


def test_reversao_registra_justificativa_e_estados_na_mesma_operacao(monkeypatch):
    from contextlib import contextmanager
    from unittest.mock import create_autospec, Mock
    from api.services import cadastro_autorizado as service, demanda_service
    from api.schemas.demanda import DemandaUpdateSchema
    eventos=[]
    @contextmanager
    def atomica():
        eventos.append('inicio')
        yield object()
        eventos.append('fim')
    monkeypatch.setattr(service,'atomic_connection',atomica)
    monkeypatch.setattr(service,'bloquear',lambda *args:{'status':'anterior'})
    salvar=Mock(return_value={'status':'novo'})
    monkeypatch.setattr(demanda_service,'atualizar_demanda',salvar)
    auditoria=create_autospec(service.auditoria_repository.registrar)
    monkeypatch.setattr(service.auditoria_repository,'registrar',auditoria)
    user=usuario('GESTOR',permissoes={'mocad.reverter_status_inline':'todos'})
    result=service.atualizar('projeto','D',DemandaUpdateSchema(status='novo',justificativa_status='Correção solicitada'),user)
    assert result=={'status':'novo'} and eventos==['inicio','fim']
    assert salvar.call_args.kwargs['status_livre_gestor'] is True
    assert salvar.call_args.args[1].model_dump(exclude_unset=True)=={'status':'novo'}
    dados=auditoria.call_args.kwargs
    assert dados['dados_anteriores']=={'status':'anterior'} and dados['dados_novos']=={'status':'novo'}
    assert dados['contexto']['justificativa']=='Correção solicitada' and dados['contexto']['via_aprovar'] is False
