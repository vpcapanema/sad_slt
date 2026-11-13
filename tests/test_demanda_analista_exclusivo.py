"""Permissões reais das rotas; serviços substituídos, sem gravar dados."""
import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from api.server import app
from api.services.session_service import SessionUser, cookie_name, create_token
from api.services import analise_demanda_service as service


def client_for(profile):
    client = TestClient(app)
    if profile:
        user = SessionUser(profile, 'teste@example.org', 'teste_' + profile, 'Teste', profile)
        client.cookies.set(cookie_name(), create_token(user))
    return client


WRITES = [
    ('PUT', '/api/analise/TESTE/criterios', {}),
    ('PUT', '/api/analise/TESTE/geometria', {}),
    ('PUT', '/api/analise/TESTE/complemento', {}),
    ('POST', '/api/analise/TESTE/situacao', {'acao': 'suspender'}),
    ('POST', '/api/analise/TESTE/decidir', {'decisao': 'aprovada'}),
] + [(method, f'/api/{kind}/TESTE{suffix}', body)
     for kind in ('demandas', 'planos', 'programas')
     for method, suffix, body in [('PATCH', '', {'nome': 'Teste'}),
                                  ('POST', '/aprovar', {}),
                                  ('POST', '/reprovar', {'justificativa': 'Teste'})]]


@pytest.mark.parametrize('profile', [None, 'VISUALIZADOR', 'OPERADOR', 'GESTOR', 'ADMIN'])
@pytest.mark.parametrize('method,path,body', WRITES)
def test_outros_perfis_nao_gravam(profile, method, path, body):
    response = client_for(profile).request(method, path, json=body)
    assert response.status_code == (403 if profile else 401), response.text


@pytest.mark.parametrize('profile', [None, 'VISUALIZADOR', 'OPERADOR', 'GESTOR', 'ADMIN'])
@pytest.mark.parametrize('action', ['conferir', 'substituir'])
def test_outros_perfis_nao_substituem_geometria(profile, action):
    response = client_for(profile).post(f'/api/geometria/{action}/projeto/TESTE',
        files={'file': ('teste.geojson', b'{}')}, data={'confirmacao': 'teste'})
    assert response.status_code == (403 if profile else 401)


@pytest.mark.parametrize('method,path,body', WRITES[:5])
def test_analista_chega_ao_servico(monkeypatch, method, path, body):
    def reached(*args, **kwargs):
        raise HTTPException(418, 'Serviço sintético autorizado')
    for name in ('salvar_criterios', 'salvar_avaliacao_geometria', 'salvar_complemento', 'alterar_situacao', 'decidir'):
        monkeypatch.setattr(service, name, reached)
    response = client_for('ANALISTA').request(method, path, json=body)
    assert response.status_code == 418


@pytest.mark.parametrize('profile', ['VISUALIZADOR', 'OPERADOR', 'ANALISTA', 'GESTOR', 'ADMIN'])
def test_todos_autenticados_consultam(monkeypatch, profile):
    monkeypatch.setattr(service, 'obter_analise', lambda codigo: {'demanda_codigo': codigo, 'demanda_tipo': 'projeto'})
    response = client_for(profile).get('/api/analise/TESTE')
    assert response.status_code == 200
    assert response.json()['demanda_codigo'] == 'TESTE'


@pytest.mark.parametrize('profile', ['VISUALIZADOR', 'OPERADOR', 'ANALISTA', 'GESTOR', 'ADMIN'])
def test_pagina_acessivel_e_feedback_carregado(profile):
    response = client_for(profile).get('/restrict/demanda/')
    assert response.status_code == 200
    assert 'process_feedback_unified.js' in response.text
    assert 'process_feedback_system.css' in response.text


@pytest.mark.parametrize('kind', ['demandas', 'planos', 'programas'])
def test_operador_consulta_registro_interno(monkeypatch, kind):
    from api.services import demanda_service, plano_service, programa_service
    target, name = {'demandas': (demanda_service, 'obter_demanda'),
                    'planos': (plano_service, 'obter_plano'),
                    'programas': (programa_service, 'obter_programa')}[kind]
    def reached(*args, **kwargs):
        raise HTTPException(418, 'Consulta sintética autorizada')
    monkeypatch.setattr(target, name, reached)
    assert client_for('OPERADOR').get(f'/api/{kind}/internas/TESTE').status_code == 418


def test_cadastro_carrega_feedback_antes_do_formulario():
    html = client_for('OPERADOR').get('/public/cadastro/nova-demanda/').text
    assert 'process_feedback_system.css' in html
    assert html.index('process_feedback_unified.js') < html.index('/public/cadastro/cadastro.js')
