"""Sessão pessoal no portal SEI-SP, com navegação apenas por links recebidos.

Login interno (SIP) e externo mantêm cookies e formulário do CAPTCHA juntos.
O portal não é uma API: estruturas desconhecidas são erros explícitos, nunca
uma confirmação de login ou lista vazia. Não executa JavaScript do SEI.
"""
from __future__ import annotations

import asyncio
import base64
import hashlib
import io
import os
import re
import time
from dataclasses import dataclass, field
from typing import Any, Literal
from urllib.parse import urljoin, urlsplit, parse_qs

import httpx
from bs4 import BeautifulSoup
from cryptography.fernet import Fernet, InvalidToken

from api.exceptions import AuthError, DatabaseUnavailableError, DemandaValidationError
from api.repositories import sei_credencial_repository

TipoLoginSei = Literal['interno', 'externo']
SEI_BASE_URL = 'https://sei.sp.gov.br/sei/'
SEI_LOGIN_INTERNO_URL = SEI_BASE_URL + 'controlador.php?acao=login'
SEI_LOGIN_EXTERNO_URL = SEI_BASE_URL + 'controlador_externo.php?acao=usuario_externo_logar&id_orgao_acesso_externo=0'
_HTTP_TIMEOUT = 20.0
_TTL = 1800
_MAX_BYTES = 12 * 1024 * 1024
_NUMERO = re.compile(r'\b(?:\d{3}\.\d{8}/\d{4}-\d{2}|\d{5}\.\d{6}/\d{4}-\d{2})\b')
_READ_ACTION = re.compile(r'^(?:procedimento|processo|documento|usuario_externo|acesso_externo|protocolo)_[a-z_]*(?:listar|consultar|visualizar|trabalhar|controlar|arvore|acessar|download)$')


@dataclass
class SeiSessionState:
    usuario_sicard_id: str
    tipo_login: TipoLoginSei
    identificacao: str = ''
    orgao_selecionado: str | None = None
    cookies: httpx.Cookies = field(default_factory=httpx.Cookies)
    criado_em: float = field(default_factory=time.monotonic)
    conectado: bool = False
    captcha_pendente: bool = False
    captcha_imagem_base64: str | None = None
    captcha_mime: str = 'image/png'
    erro: str | None = None
    aviso: str | None = None
    formulario: tuple | None = None
    pagina_url: str = ''
    pagina_html: str = ''
    processos: dict[str, dict] = field(default_factory=dict)
    criados: dict[str, Any] = field(default_factory=dict)
    lock: asyncio.Lock = field(default_factory=asyncio.Lock)


class SeiPortalError(DatabaseUnavailableError):
    """Mensagem do adaptador que pode ser exibida sem dados de conexão."""


_SEI_SESSIONS: dict[str, SeiSessionState] = {}


def session_key(usuario_id: str, token: str) -> str:
    return usuario_id + ':' + hashlib.sha256(token.encode()).hexdigest()


def _get_session(key: str) -> SeiSessionState | None:
    now = time.monotonic()
    for old, state in list(_SEI_SESSIONS.items()):
        if now - state.criado_em > _TTL:
            _SEI_SESSIONS.pop(old, None)
    return _SEI_SESSIONS.get(key)


def _active(key: str) -> SeiSessionState:
    state = _get_session(key)
    if not state or not state.conectado:
        raise AuthError('A sessão do SEI está desconectada ou expirou. Conecte novamente.')
    return state


def get_settings_sei_key() -> str:
    return (os.getenv('SEI_CREDENTIALS_SECRET_KEY') or '').strip()


def _fernet():
    try:
        return Fernet(get_settings_sei_key().encode())
    except (ValueError, TypeError) as exc:
        raise SeiPortalError('A opção de lembrar credencial não está configurada.') from exc


def _encrypt_senha(senha: str) -> str:
    return _fernet().encrypt(senha.encode()).decode()


def _decrypt_senha(token: str) -> str:
    try:
        return _fernet().decrypt(token.encode()).decode()
    except InvalidToken as exc:
        raise AuthError('A credencial salva não pôde ser lida. Informe sua senha novamente.') from exc


def _safe_url(base: str, value: str) -> str:
    url = urljoin(base, value)
    parsed = urlsplit(url)
    if parsed.scheme != 'https' or parsed.hostname != 'sei.sp.gov.br' or parsed.port not in (None, 443) or parsed.username or parsed.password:
        raise SeiPortalError('O SEI redirecionou para um endereço não suportado.')
    return url


async def _request(client, method: str, url: str, **kwargs) -> httpx.Response:
    # Valida cada redirecionamento antes de transmitir cookies/credenciais.
    for _ in range(8):
        url = _safe_url(SEI_BASE_URL, url)
        try:
            async with client.stream(method, url, follow_redirects=False, **kwargs) as response:
                chunks = bytearray()
                async for chunk in response.aiter_bytes():
                    chunks.extend(chunk)
                    if len(chunks) > _MAX_BYTES:
                        raise SeiPortalError('O documento SEI excede o limite de leitura de 12 MB.')
                headers = {k: v for k, v in response.headers.items() if k not in ('content-encoding', 'content-length')}
                result = httpx.Response(response.status_code, headers=headers, content=bytes(chunks), request=response.request)
        except httpx.HTTPError as exc:
            raise SeiPortalError('Não foi possível acessar o SEI-SP. Tente novamente.') from exc
        if result.is_redirect:
            url = _safe_url(url, result.headers.get('location', ''))
            if result.status_code in (301, 302, 303):
                method, kwargs = 'GET', {}
            continue
        if result.status_code >= 400:
            raise SeiPortalError('O SEI-SP recusou a consulta. Tente novamente mais tarde.')
        return result
    raise SeiPortalError('O SEI-SP excedeu o limite de redirecionamentos.')


def _soup(resp):
    # O portal publica também páginas ISO-8859-1; BeautifulSoup lê o meta charset.
    return BeautifulSoup(resp.content, 'html.parser')


def _visible(el) -> bool:
    return not any(x.has_attr('hidden') or 'display:none' in (x.get('style') or '').replace(' ', '').lower() for x in [el, *el.parents] if hasattr(x, 'has_attr'))


async def _formulario(client, resp, tipo):
    soup = _soup(resp)
    form = soup.find('form', id='frmLogin')
    if not form:
        raise SeiPortalError('O formulário de acesso do SEI não foi reconhecido.')
    hidden = {x['name']: x.get('value', '') for x in form.select('input[type=hidden][name]')}
    select = form.select_one('select[name=selOrgao]')
    orgaos = [{'value': x.get('value', ''), 'label': x.get_text(' ', strip=True)} for x in select.find_all('option')] if select and tipo == 'interno' else []
    captcha = form.find(id='imgCaptcha')
    pendente = bool(captcha and _visible(captcha))
    b64 = None
    if pendente and captcha.get('src'):
        src = captcha['src']
        if src.startswith('data:image/'):
            b64 = src.partition(',')[2]
        else:
            image = await _request(client, 'GET', _safe_url(str(resp.url), src))
            b64 = base64.b64encode(image.content).decode()
    return soup, hidden, orgaos, pendente, b64, str(resp.url)


async def _buscar_pagina_login(client, tipo_login):
    resp = await _request(client, 'GET', SEI_LOGIN_INTERNO_URL if tipo_login == 'interno' else SEI_LOGIN_EXTERNO_URL)
    return await _formulario(client, resp, tipo_login)


def _metadata(state):
    return {'tipo_login': state.tipo_login, 'orgaos': state.formulario[2], 'captcha_pendente': state.captcha_pendente, 'captcha_imagem_base64': state.captcha_imagem_base64}


async def obter_formulario_login(tipo_login: TipoLoginSei, key: str = '') -> dict:
    state = SeiSessionState(key, tipo_login)
    async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT) as client:
        state.formulario = await _buscar_pagina_login(client, tipo_login)
        state.cookies = client.cookies
    state.captcha_pendente, state.captcha_imagem_base64 = state.formulario[3:5]
    if key:
        _SEI_SESSIONS[key] = state
    return _metadata(state)


async def _submeter_login(client, *, tipo_login, identificacao, senha, orgao, captcha, formulario=None):
    soup, hidden, orgaos, pendente, _, pagina_url = formulario or await _buscar_pagina_login(client, tipo_login)
    form = soup.find('form', id='frmLogin')
    post_url = _safe_url(pagina_url, form.get('action') or '')
    payload = dict(hidden)
    payload['txtUsuario' if tipo_login == 'interno' else 'txtEmail'] = identificacao
    payload['pwdSenha'] = senha
    if tipo_login == 'interno':
        if orgaos and orgao not in {x['value'] for x in orgaos if x['value']}:
            raise AuthError('Selecione um órgão válido para o acesso interno.')
        if orgao:
            payload['selOrgao'] = orgao
    if pendente:
        if not captcha:
            raise AuthError('Informe o código da imagem para conectar ao SEI.')
        campo = next((x.get('name') for x in form.select('input[name]') if 'captcha' in x.get('name', '').lower() and x.get('type') != 'hidden'), None)
        if not campo:
            raise AuthError('O desafio de acesso do SEI não é suportado nesta tela. Acesse o portal para verificá-lo.')
        payload[campo] = captcha
    return await _request(client, 'POST', post_url, data=payload)


def _links(soup, base):
    for el in soup.select('a[href], iframe[src], frame[src]'):
        value = el.get('href') or el.get('src')
        try:
            url = _safe_url(base, value)
        except DatabaseUnavailableError:
            continue
        action = parse_qs(urlsplit(url).query).get('acao', [''])[0]
        if _READ_ACTION.fullmatch(action):
            yield el, url


def _login_aparenta_sucesso(resp):
    soup = _soup(resp)
    if soup.find('form', id='frmLogin') or soup.select_one('input[type=password]'):
        return False
    # Exige navegação autenticada, não apenas um cookie emitido pela página.
    has_exit = any(re.search(r'(?:logout|sair)', a.get('href', ''), re.I) for a in soup.select('a[href]'))
    return has_exit and bool(list(_links(soup, str(resp.url))))


async def conectar(*, usuario_sicard_id, tipo_login, usuario, orgao, email, senha, captcha, lembrar_credencial, key=None):
    key = key or usuario_sicard_id
    state = _get_session(key)
    if not state or state.tipo_login != tipo_login or not state.formulario:
        await obter_formulario_login(tipo_login, key)
        state = _get_session(key)
    async with state.lock:
        if not senha:
            saved = sei_credencial_repository.get_by_usuario_id(usuario_sicard_id)
            if not saved or saved['tipo_login'] != tipo_login:
                raise AuthError('Informe sua senha para este tipo de acesso.')
            senha = _decrypt_senha(saved['senha_criptografada'])
            usuario = email = saved['identificador']
            orgao = saved['orgao_selecionado']
        identificacao = (usuario if tipo_login == 'interno' else email) or ''
        if not identificacao.strip():
            raise AuthError('Informe o usuário ou e-mail do SEI.')
        state.conectado = False
        state.identificacao, state.orgao_selecionado = identificacao.strip(), orgao
        state.erro = state.aviso = None
        async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT, cookies=state.cookies) as client:
            resp = await _submeter_login(client, tipo_login=tipo_login, identificacao=state.identificacao, senha=senha, orgao=orgao, captcha=captcha, formulario=state.formulario)
            state.cookies = client.cookies
            if not _login_aparenta_sucesso(resp):
                if _soup(resp).find('form', id='frmLogin'):
                    state.formulario = await _formulario(client, resp, tipo_login)
                    state.cookies = client.cookies
                    state.captcha_pendente, state.captcha_imagem_base64 = state.formulario[3:5]
                state.erro = 'Acesso não confirmado pelo SEI. Confira seus dados e eventual CAPTCHA ou verificação adicional no portal.'
                return state
        state.conectado = True
        state.criado_em = time.monotonic()
        state.formulario = None
        state.captcha_pendente = False
        state.captcha_imagem_base64 = None
        state.pagina_url, state.pagina_html = str(resp.url), str(_soup(resp))
        if lembrar_credencial:
            try:
                sei_credencial_repository.upsert(usuario_id=usuario_sicard_id, tipo_login=tipo_login, identificador=state.identificacao, orgao_selecionado=orgao, senha_criptografada=_encrypt_senha(senha))
            except DatabaseUnavailableError:
                state.aviso = 'Conectado, mas não foi possível salvar sua credencial.'
        return state


def status(usuario_sicard_id, key=None):
    state = _get_session(key or usuario_sicard_id)
    saved = None
    aviso = state.aviso if state else None
    try:
        saved = sei_credencial_repository.get_by_usuario_id(usuario_sicard_id)
    except DatabaseUnavailableError:
        aviso = 'O armazenamento de credenciais está indisponível. Você pode conectar informando sua senha.'
    return dict(conectado=bool(state and state.conectado), tipo_login=state.tipo_login if state else (saved or {}).get('tipo_login'), identificacao=state.identificacao if state else (saved or {}).get('identificador'), orgao_selecionado=state.orgao_selecionado if state else (saved or {}).get('orgao_selecionado'), lembrada=bool(saved), erro=state.erro if state else None, aviso=aviso, captcha_pendente=bool(state and state.captcha_pendente), captcha_imagem_base64=state.captcha_imagem_base64 if state else None)


def desconectar(usuario_sicard_id, *, esquecer_credencial=False, key=None):
    _SEI_SESSIONS.pop(key or usuario_sicard_id, None)
    if esquecer_credencial:
        sei_credencial_repository.delete_by_usuario_id(usuario_sicard_id)


def estimar_tipo_demanda(processo):
    return 'projeto'


def _parse_tabela_processos(html, base=SEI_BASE_URL):
    soup = BeautifulSoup(html, 'html.parser')
    processos = {}
    for el, url in _links(soup, base):
        number = _NUMERO.search(el.get_text(' ', strip=True))
        if not number:
            continue
        row = el.find_parent('tr')
        texts = [c.get_text(' ', strip=True) for c in row.find_all('td', recursive=False)] if row else []
        tipo = interessado = data = None
        table = el.find_parent('table')
        headers = [c.get_text(' ', strip=True).lower() for c in table.select('tr th')] if table else []
        for header, value in zip(headers, texts):
            if 'interessad' in header: interessado = value
            elif 'tipo' in header or 'assunto' in header: tipo = value
            elif 'data' in header: data = value
        numero = number.group()
        processos[numero] = dict(numero=numero, tipo=tipo, interessado=interessado, data=data, tipo_demanda_estimado='projeto', _url=url)
    return list(processos.values())


async def listar_processos_sei(key):
    state = _active(key)
    async with state.lock:
        queue, seen, found = [state.pagina_url], set(), {}
        recognized = False
        async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT, cookies=state.cookies) as client:
            while queue and len(seen) < 20:
                url = queue.pop(0)
                if url in seen: continue
                seen.add(url)
                resp = await _request(client, 'GET', url)
                soup = _soup(resp)
                if soup.find('form', id='frmLogin') or soup.select_one('input[type=password]'):
                    state.conectado = False
                    raise AuthError('Sua sessão no SEI expirou. Conecte novamente.')
                for p in _parse_tabela_processos(str(soup), str(resp.url)):
                    found[p['numero']] = p
                page_text = soup.get_text(' ', strip=True).lower()
                recognized |= bool(re.search(r'nenhum (?:registro|processo)|n[aã]o (?:existem|h[aá]) (?:registros|processos)', page_text))
                for el, target in _links(soup, str(resp.url)):
                    action = parse_qs(urlsplit(target).query).get('acao', [''])[0]
                    if ('listar' in action or el.name in ('iframe', 'frame')) and target not in seen:
                        queue.append(target)
            state.cookies = client.cookies
        if not found and not recognized:
            raise SeiPortalError('A tela de processos do SEI não foi reconhecida. A listagem precisa ser validada para este acesso.')
        state.processos = found
        aviso = 'A consulta atingiu o limite de 20 páginas. A lista pode estar incompleta.' if queue else None
        return dict(processos=list(found.values()), aviso=aviso)


async def obter_processo(key, numero):
    state = _active(key)
    candidate = state.processos.get(numero)
    if not candidate:
        raise DemandaValidationError('Atualize a lista e selecione um processo acessível à sua conta.')
    textos, docs, avisos = [], [], []
    async with state.lock:
        queue, seen = [(candidate['_url'], 'Processo')], set()
        async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT, cookies=state.cookies) as client:
            while queue and len(seen) < 20:
                url, titulo = queue.pop(0)
                if url in seen: continue
                seen.add(url)
                resp = await _request(client, 'GET', url)
                if resp.content.startswith(b'%PDF-'):
                    try:
                        from pypdf import PdfReader
                        reader = PdfReader(io.BytesIO(resp.content))
                        content = '\n'.join(page.extract_text() or '' for page in reader.pages[:100])
                        if len(reader.pages) > 100: avisos.append('PDF com mais de 100 páginas: leitura parcial.')
                    except Exception:
                        content = ''
                    if not content.strip(): avisos.append('Um PDF não possui texto extraível; revise-o no portal.')
                else:
                    if 'html' not in resp.headers.get('content-type', '') and not resp.content.lstrip().startswith(b'<'):
                        avisos.append('Um anexo não é HTML ou PDF com texto; revise-o no portal.')
                        continue
                    soup = _soup(resp)
                    if soup.find('form', id='frmLogin') or soup.select_one('input[type=password]'):
                        state.conectado = False
                        raise AuthError('Sua sessão no SEI expirou. Conecte novamente.')
                    for el, target in _links(soup, str(resp.url)):
                        action = parse_qs(urlsplit(target).query).get('acao', [''])[0]
                        if el.name in ('iframe', 'frame') or action.startswith('documento_'):
                            queue.append((target, el.get_text(' ', strip=True) or 'Documento'))
                    for el in soup.select('script,style,nav,header,footer'): el.decompose()
                    content = (soup.body or soup).get_text('\n', strip=True)
                if content:
                    textos.append(content[:30000])
                    docs.append({'titulo': titulo, 'texto': content[:30000]})
            state.cookies = client.cookies
        if queue: avisos.append('A leitura atingiu 20 páginas/documentos; confira o conteúdo restante no portal.')
    texto = '\n\n'.join(textos)[:60000]
    return dict(numero=numero, tipo_demanda_estimado='projeto', nome=(candidate.get('tipo') or f'Processo SEI {numero}')[:200], descricao=texto, documentos=docs, aviso=' '.join(avisos) or None)
