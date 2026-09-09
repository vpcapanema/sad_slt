"""Contratos SEI com respostas simuladas; não substituem homologação real."""
import asyncio
import gzip
from types import SimpleNamespace
from urllib.parse import parse_qs

import httpx
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from api.codigos_demanda import codigo_demanda_valido, gerar_codigo_projeto
from api.exceptions import AuthError, DatabaseUnavailableError
from api.routers import sei_integracao as routes
from api.services import sei_integracao_service as sei

NUMBER = '123.12345678/2026-12'
LINK = f'controlador_externo.php?acao=usuario_externo_processo_consultar&id=1'
TABLE = f'<table><tr><th>Processo</th><th>Interessado</th></tr><tr><td><a href="{LINK}">{NUMBER}</a></td><td>Instituição simulada</td></tr></table>'


@pytest.fixture(autouse=True)
def sessions():
    sei._SEI_SESSIONS.clear()
    yield
    sei._SEI_SESSIONS.clear()


def install_transport(monkeypatch, handler):
    original = httpx.AsyncClient
    monkeypatch.setattr(sei.httpx, 'AsyncClient', lambda **kwargs: original(transport=httpx.MockTransport(handler), **kwargs))


def test_captcha_keeps_form_and_cookie_between_requests(monkeypatch):
    posts, gets = [], []
    def handler(request):
        if request.method == 'POST':
            posts.append(request)
            return httpx.Response(200, text='<form id="frmLogin"></form>')
        gets.append(request)
        if request.url.path.endswith('.png'):
            return httpx.Response(200, content=b'imagem-simulada')
        return httpx.Response(200, headers={'set-cookie': 'captcha=sessao-teste; Path=/'}, text='<form id="frmLogin" action="controlador_externo.php"><input type="hidden" name="token" value="original"><img id="imgCaptcha" src="/captcha.png"><input name="txtCodigoCaptcha"></form>')
    install_transport(monkeypatch, handler)
    async def run():
        await sei.obter_formulario_login('externo', 'sessao')
        await sei.conectar(usuario_sicard_id='u', key='sessao', tipo_login='externo', usuario=None, orgao=None, email='simulado@example.org', senha='simulada', captcha='teste', lembrar_credencial=False)
    asyncio.run(run())
    assert len(gets) == 2
    assert 'captcha=sessao-teste' in posts[0].headers['cookie']
    assert parse_qs(posts[0].content.decode())['txtCodigoCaptcha'] == ['teste']
    assert parse_qs(posts[0].content.decode())['token'] == ['original']


@pytest.mark.parametrize('target', ['https://example.org/collect', 'http://sei.sp.gov.br/login', 'https://sei.sp.gov.br:444/login'])
def test_redirect_never_transmits_credentials_to_other_origin(target):
    calls = []
    def handler(request):
        calls.append(request)
        return httpx.Response(307, headers={'location': target})
    async def run():
        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
            await sei._request(client, 'POST', sei.SEI_LOGIN_EXTERNO_URL, data={'pwdSenha': 'simulada'})
    with pytest.raises(DatabaseUnavailableError): asyncio.run(run())
    assert len(calls) == 1


def test_compressed_portal_response_is_decoded_once():
    async def run():
        async with httpx.AsyncClient(transport=httpx.MockTransport(lambda r: httpx.Response(200, content=gzip.compress(b'<p>ok</p>'), headers={'content-encoding': 'gzip'}))) as client:
            return await sei._request(client, 'GET', sei.SEI_BASE_URL)
    assert asyncio.run(run()).text == '<p>ok</p>'


@pytest.mark.parametrize('html', ['<p>Erro</p>', '<form id="frmLogin"></form>', '<input type="password">'])
def test_cookie_alone_is_not_login_success(html):
    response = httpx.Response(200, text=html, headers={'set-cookie': 'session=simulada'}, request=httpx.Request('GET', sei.SEI_BASE_URL))
    assert not sei._login_aparenta_sucesso(response)


def test_parsing_ignores_layout_table_and_preserves_signed_link():
    html = '<table><tr><td>2026</td></tr></table>' + TABLE.replace('id=1', 'id=1&infra_hash=assinatura-simulada')
    result = sei._parse_tabela_processos(html)
    assert len(result) == 1
    assert result[0]['numero'] == NUMBER
    assert result[0]['interessado'] == 'Instituição simulada'
    assert 'infra_hash=assinatura-simulada' in result[0]['_url']


def test_listing_expired_login_is_error_not_empty(monkeypatch):
    sei._SEI_SESSIONS['s'] = sei.SeiSessionState('u', 'externo', conectado=True, pagina_url=sei.SEI_BASE_URL)
    install_transport(monkeypatch, lambda r: httpx.Response(200, text='<form id="frmLogin"></form>'))
    with pytest.raises(AuthError): asyncio.run(sei.listar_processos_sei('s'))
    assert not sei._SEI_SESSIONS['s'].conectado


def test_unknown_listing_is_not_empty_success(monkeypatch):
    sei._SEI_SESSIONS['s'] = sei.SeiSessionState('u', 'interno', conectado=True, pagina_url=sei.SEI_BASE_URL)
    install_transport(monkeypatch, lambda r: httpx.Response(200, text='<p>Formato desconhecido</p>'))
    with pytest.raises(DatabaseUnavailableError): asyncio.run(sei.listar_processos_sei('s'))


def test_status_works_without_credential_table(monkeypatch):
    def unavailable(_): raise DatabaseUnavailableError('indisponível')
    monkeypatch.setattr(sei.sei_credencial_repository, 'get_by_usuario_id', unavailable)
    assert sei.status('u')['conectado'] is False
    assert sei.status('u')['aviso']


def test_session_isolation_and_expiration():
    assert sei.session_key('u', 'a') != sei.session_key('u', 'b')
    sei._SEI_SESSIONS['s'] = sei.SeiSessionState('u', 'externo', criado_em=0, conectado=True)
    assert sei._get_session('s') is None


def test_sei_generated_codes_are_valid():
    assert codigo_demanda_valido(gerar_codigo_projeto(origem='SEI'))


def test_slash_number_validation_and_duplicate_click(monkeypatch):
    app = FastAPI()
    app.include_router(routes.router)
    user = SimpleNamespace(id='u')
    app.dependency_overrides[routes.require_operator] = lambda: user
    state = sei.SeiSessionState('u', 'externo', conectado=True, processos={NUMBER: {}})
    sei._SEI_SESSIONS[sei.session_key('u', '')] = state
    calls = []
    def create(payload, **kwargs):
        calls.append(payload)
        return {'id': 'I-PRJ-SEI-12345678'}
    monkeypatch.setattr(routes.demanda_service, 'criar_demanda', create)
    client = TestClient(app)
    path = f'/sei/processos/{NUMBER}/criar-demanda'
    invalid = client.post(path, json={'campos': {}})
    assert invalid.status_code == 422
    assert not calls
    fields = dict(nome='Simulação', instituicao_id='teste', lat=-23, lng=-46, representante={'nome': 'Teste'}, diretoria_id='', plano_id='')
    for _ in range(2): assert client.post(path, json={'campos': fields}).status_code == 200
    assert len(calls) == 1
    assert f'Processo SEI: {NUMBER}' in calls[0].descricao


def test_creation_requires_operator():
    app = FastAPI()
    app.include_router(routes.router)
    assert TestClient(app).post(f'/sei/processos/{NUMBER}/criar-demanda', json={'campos': {}}).status_code == 401


def test_saved_credential_reconnect_uses_ciphertext(monkeypatch):
    from cryptography.fernet import Fernet
    monkeypatch.setenv('SEI_CREDENTIALS_SECRET_KEY', Fernet.generate_key().decode())
    saved = {'tipo_login': 'externo', 'identificador': 'teste@example.org', 'orgao_selecionado': None, 'senha_criptografada': sei._encrypt_senha('senha-simulada')}
    assert saved['senha_criptografada'] != 'senha-simulada'
    monkeypatch.setattr(sei.sei_credencial_repository, 'get_by_usuario_id', lambda _: saved)
    posts = []
    def handler(request):
        if request.method == 'POST':
            posts.append(request)
            return httpx.Response(200, text=f'<a href="/sip/logout.php">Sair</a>{TABLE}')
        return httpx.Response(200, text='<form id="frmLogin" action="controlador_externo.php"></form>')
    install_transport(monkeypatch, handler)
    state = asyncio.run(sei.conectar(usuario_sicard_id='u', tipo_login='externo', usuario=None, email=None, senha=None, orgao=None, captcha=None, lembrar_credencial=False))
    assert state.conectado
    assert parse_qs(posts[0].content.decode())['pwdSenha'] == ['senha-simulada']
    assert not hasattr(state, 'senha')


def test_document_review_reads_linked_html_and_rejects_other_process(monkeypatch):
    state = sei.SeiSessionState('u', 'externo', conectado=True, processos={NUMBER: {'_url': sei.SEI_BASE_URL + LINK}})
    sei._SEI_SESSIONS['s'] = state
    def handler(request):
        if 'documento_visualizar' in str(request.url):
            return httpx.Response(200, text='<html><body><p>Conteúdo simulado do ofício.</p></body></html>')
        return httpx.Response(200, text='<html><body><a href="controlador_externo.php?acao=documento_visualizar&id=2">Ofício</a></body></html>')
    install_transport(monkeypatch, handler)
    result = asyncio.run(sei.obter_processo('s', NUMBER))
    assert 'Conteúdo simulado do ofício.' in result['descricao']
    assert len(result['documentos']) == 2
    from api.exceptions import DemandaValidationError
    with pytest.raises(DemandaValidationError): asyncio.run(sei.obter_processo('s', 'outro'))
