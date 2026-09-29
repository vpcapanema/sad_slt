import asyncio
import base64
import json
from types import SimpleNamespace

from fastapi import FastAPI
from fastapi.testclient import TestClient
import pytest

from api.routers import auth
from api.services import auth_service, session_service


@pytest.fixture
def isolated(monkeypatch):
    user = session_service.SessionUser('id-teste', '', 'teste_analista', 'Teste', 'ANALISTA')
    monkeypatch.setattr(auth_service, '_audit_auth', lambda **kwargs: None)
    monkeypatch.setattr(auth_service, 'logout_usuario', lambda *a, **k: None)
    monkeypatch.setattr(auth.sigma_usuario_repository, 'find_active_by_id', lambda _id: None)
    monkeypatch.setattr(session_service, 'get_settings', lambda: SimpleNamespace(session_secret='isolated-test-secret'))
    async def authenticate(*args, **kwargs):
        return user, session_service.create_token(user, permanecer_conectado=kwargs.get('permanecer_conectado', False))
    monkeypatch.setattr(auth_service, 'login_usuario', authenticate)
    app = FastAPI()
    app.include_router(auth.router, prefix='/api')
    return app, user


@pytest.mark.parametrize('remember', [False, True])
def test_cookie_and_signed_expiry_agree_and_logout_clears(isolated, remember, monkeypatch):
    app, user = isolated
    monkeypatch.setattr(session_service.time, 'time', lambda: 1000)
    client = TestClient(app)
    response = client.post('/api/auth/login', json={'username': 'teste_analista', 'senha': 'test-only', 'permanecer_conectado': remember})
    assert response.status_code == 200
    cookie = response.headers['set-cookie']
    assert 'HttpOnly' in cookie and 'SameSite=lax' in cookie
    assert ('Max-Age=2592000' in cookie) is remember
    assert ('expires=' in cookie.lower()) is False
    token = client.cookies.get('slt_session')
    body = token.split('.')[0]
    data = json.loads(base64.urlsafe_b64decode(body + '=' * (-len(body) % 4)))
    assert data['exp'] == 1000 + (2592000 if remember else 28800)
    assert client.get('/api/auth/session').json()['authenticated']
    # Outra instancia do cliente com o cookie persistido confirma a mesma assinatura.
    another = TestClient(app)
    another.cookies.set('slt_session', token)
    assert another.get('/api/auth/session').json()['authenticated']
    assert client.post('/api/auth/logout').status_code == 200
    assert not client.get('/api/auth/session').json()['authenticated']
    monkeypatch.setattr(session_service.time, 'time', lambda: data['exp'] + 1)
    assert session_service.parse_token(token) is None


def test_https_secure_cookie_and_default_is_not_remembered(isolated):
    app, _ = isolated
    response = TestClient(app, base_url='https://testserver').post('/api/auth/login', json={'username': 'teste_analista', 'senha': 'test-only'})
    assert 'Secure' in response.headers['set-cookie']
    assert 'Max-Age' not in response.headers['set-cookie']
    assert response.headers['cache-control'] == 'no-store'


@pytest.mark.parametrize('api_available', [True, False])
def test_remember_reaches_token_in_api_and_database_flows(monkeypatch, api_available):
    user = session_service.SessionUser('id-teste', '', 'teste_analista', 'Teste', 'ANALISTA')
    monkeypatch.setattr(session_service, 'get_settings', lambda: SimpleNamespace(session_secret='test-key'))
    monkeypatch.setattr(auth_service, 'get_settings', lambda: SimpleNamespace(sigma_api_base='https://sigma.test' if api_available else ''))
    monkeypatch.setattr(auth_service, '_audit_auth', lambda **kwargs: None)
    async def remote(*args):
        return user
    monkeypatch.setattr(auth_service, '_authenticate_via_api', remote)
    monkeypatch.setattr(auth_service.sigma_usuario_repository, 'find_active_by_username', lambda _: {'id': 'id-teste', 'username': 'teste_analista', 'password_hash': 'fixture'})
    monkeypatch.setattr(auth_service, 'verify_password', lambda *a: True)
    monkeypatch.setattr(session_service.time, 'time', lambda: 1000)
    _, token = asyncio.run(auth_service.login_usuario('teste_analista', 'fixture', permanecer_conectado=True))
    monkeypatch.setattr(session_service.time, 'time', lambda: 1000 + 86400)
    assert session_service.parse_token(token) is not None
