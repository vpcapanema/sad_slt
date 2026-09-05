"""Integração com o portal web do SEI-SP (sei.sp.gov.br) — sem API oficial.

Não existe API de integração usável para este caso: o que este módulo faz é
simular uma sessão de navegador contra o PORTAL WEB do SEI — buscar a página de
login ao vivo (os campos ocultos podem carregar tokens dinâmicos, então nunca
hardcodamos nada além dos *nomes* dos campos), montar o POST de login como o
navegador faria, guardar os cookies de sessão resultantes e, a partir daí,
navegar/parsear páginas HTML do SEI para listar processos.

Duas variantes de login são suportadas, escolhidas pelo usuário na tela:
  - "interno"  — servidor público (``controlador.php?acao=login``)
  - "externo"  — usuário externo/cidadão-empresa (``controlador_externo.php``)

Estado de sessão por usuário do SICARD:
  - Se o usuário marcar "lembrar credencial": usuário/email + senha (cifrada
    com Fernet) + tipo de login + órgão selecionado vão para
    ``integracoes.sei_credencial`` (ver api/repositories/sei_credencial_repository.py).
  - Caso contrário, a senha NUNCA é persistida — fica somente em memória do
    processo backend, associada à sessão SICARD do usuário, em ``_SEI_SESSIONS``.
    Isso significa que a sessão SEI (e a credencial em memória) não sobrevive a
    um restart do processo/worker — comportamento esperado e aceito.

TODOs desta implementação (estrutura real do SEI confirmada apenas em teste
manual futuro, sem credenciais de teste disponíveis agora):
  - Endpoint exato de listagem de processos pós-login.
  - Estrutura exata da tabela de resultados (colunas/seletores).
  - Nome exato do campo de captcha (assumido ``txtInfraCaptcha``, padrão comum
    de sistemas Infraestrutura/SEI — CONFIRMAR contra o SEI real).
"""
from __future__ import annotations

import base64
import logging
import threading
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Literal
from urllib.parse import urljoin

import httpx
from bs4 import BeautifulSoup

from api.config import get_settings
from api.exceptions import AuthError, DatabaseUnavailableError
from api.repositories import sei_credencial_repository

logger = logging.getLogger(__name__)

SEI_BASE_URL = "https://sei.sp.gov.br/sei/"
SEI_LOGIN_INTERNO_URL = "https://sei.sp.gov.br/sei/controlador.php?acao=login"
SEI_LOGIN_EXTERNO_URL = (
    "https://sei.sp.gov.br/sei/controlador_externo.php"
    "?acao=usuario_externo_logar&id_orgao_acesso_externo=0"
)
# TODO: confirmar contra o SEI real — chute educado baseado em padrões comuns
# de instalações SEI/Infraestrutura para a tela pós-login de "Controle de
# Processos" / "Meus processos e documentos".
SEI_LISTAR_PROCESSOS_URL_CANDIDATOS = (
    "controlador.php?acao=procedimento_controlado_listar",
    "controlador.php?acao=procedimento_trabalhar_listar",
)

_HTTP_TIMEOUT = 20.0
_CAMPO_CAPTCHA = "txtInfraCaptcha"  # TODO: confirmar contra o SEI real


TipoLoginSei = Literal["interno", "externo"]


# --------------------------------------------------------------------------
# Estado de sessão em memória (usado quando o usuário NÃO marca "lembrar")
# --------------------------------------------------------------------------


@dataclass
class SeiSessionState:
    usuario_sicard_id: str
    tipo_login: TipoLoginSei
    identificacao: str  # usuario (interno) ou email (externo), só para exibição
    orgao_selecionado: str | None
    cookies: httpx.Cookies
    senha: str | None = None  # só em memória; nunca persistida se "lembrar" = False
    criado_em: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    captcha_pendente: bool = False
    captcha_imagem_base64: str | None = None
    erro: str | None = None


_SEI_SESSIONS: dict[str, SeiSessionState] = {}
_SESSIONS_LOCK = threading.Lock()


def _get_session(usuario_sicard_id: str) -> SeiSessionState | None:
    with _SESSIONS_LOCK:
        return _SEI_SESSIONS.get(usuario_sicard_id)


def _set_session(usuario_sicard_id: str, state: SeiSessionState) -> None:
    with _SESSIONS_LOCK:
        _SEI_SESSIONS[usuario_sicard_id] = state


def _drop_session(usuario_sicard_id: str) -> None:
    with _SESSIONS_LOCK:
        _SEI_SESSIONS.pop(usuario_sicard_id, None)


# --------------------------------------------------------------------------
# Criptografia da senha (guardada apenas quando "lembrar credencial" é marcado)
# --------------------------------------------------------------------------


def _fernet():
    from cryptography.fernet import Fernet, InvalidToken  # noqa: F401  (import local — dependência opcional)

    key = get_settings_sei_key()
    if not key:
        raise DatabaseUnavailableError(
            "SEI_CREDENTIALS_SECRET_KEY não configurada — não é possível "
            "salvar/ler a credencial SEI lembrada."
        )
    return Fernet(key.encode("utf-8") if isinstance(key, str) else key)


def get_settings_sei_key() -> str:
    import os

    return (os.getenv("SEI_CREDENTIALS_SECRET_KEY") or "").strip()


def _encrypt_senha(senha: str) -> str:
    return _fernet().encrypt(senha.encode("utf-8")).decode("ascii")


def _decrypt_senha(token: str) -> str:
    from cryptography.fernet import InvalidToken

    try:
        return _fernet().decrypt(token.encode("ascii")).decode("utf-8")
    except InvalidToken as exc:
        raise AuthError("Credencial SEI salva não pôde ser decifrada.") from exc


# --------------------------------------------------------------------------
# Página de login — leitura ao vivo (nunca hardcodamos valores de hidden além
# dos nomes de campo, pois podem carregar tokens dinâmicos anti-replay)
# --------------------------------------------------------------------------


def _login_url(tipo_login: TipoLoginSei) -> str:
    return SEI_LOGIN_INTERNO_URL if tipo_login == "interno" else SEI_LOGIN_EXTERNO_URL


def _captcha_visivel(soup: BeautifulSoup) -> bool:
    """Detecta se o SEI está exigindo captcha nesta carga da página de login.

    Considera captcha "visível" se existir um elemento com id ``imgCaptcha``
    ou ``divInfraCaptcha`` que não esteja explicitamente ``display:none``.
    TODO: confirmar contra o SEI real — o mecanismo exato (classe CSS,
    atributo, AJAX de geração) pode variar por versão/instalação.
    """
    for elemento_id in ("imgCaptcha", "divInfraCaptcha"):
        el = soup.find(id=elemento_id)
        if el is None:
            continue
        estilo = (el.get("style") or "").replace(" ", "").lower()
        if "display:none" not in estilo:
            return True
    return False


async def _baixar_captcha_base64(client: httpx.AsyncClient, soup: BeautifulSoup, base_url: str) -> str | None:
    img = soup.find(id="imgCaptcha")
    src = img.get("src") if img else None
    if not src:
        return None
    try:
        resp = await client.get(urljoin(base_url, src))
        resp.raise_for_status()
    except httpx.HTTPError as exc:
        logger.warning("Falha ao baixar imagem de captcha do SEI: %s", exc)
        return None
    return base64.b64encode(resp.content).decode("ascii")


def _extrair_form_hidden_fields(form) -> dict[str, str]:
    """Lê TODOS os campos ``<input type=hidden>`` do form ao vivo (não hardcoda)."""
    campos: dict[str, str] = {}
    for hidden in form.find_all("input", {"type": "hidden"}):
        nome = hidden.get("name")
        if nome:
            campos[nome] = hidden.get("value") or ""
    return campos


def _extrair_orgaos(soup: BeautifulSoup) -> list[dict[str, str]]:
    select = soup.find("select", {"id": "selOrgao"}) or soup.find("select", {"name": "selOrgao"})
    if not select:
        return []
    orgaos = []
    for option in select.find_all("option"):
        value = option.get("value")
        if value is None:
            continue
        orgaos.append({"value": value, "label": option.get_text(strip=True)})
    return orgaos


async def _buscar_pagina_login(
    client: httpx.AsyncClient, tipo_login: TipoLoginSei
) -> tuple[BeautifulSoup, dict[str, str], list[dict[str, str]], bool, str | None]:
    """GET na página de login ao vivo. Retorna (soup, hidden_fields, orgaos, captcha_pendente, captcha_b64)."""
    url = _login_url(tipo_login)
    try:
        resp = await client.get(url)
        resp.raise_for_status()
    except httpx.HTTPError as exc:
        raise DatabaseUnavailableError(f"Não foi possível acessar a página de login do SEI-SP: {exc}") from exc

    soup = BeautifulSoup(resp.text, "html.parser")
    form = soup.find("form", {"id": "frmLogin"})
    if not form:
        raise DatabaseUnavailableError(
            "A página de login do SEI-SP mudou de estrutura (formulário frmLogin não encontrado)."
        )
    hidden_fields = _extrair_form_hidden_fields(form)
    orgaos = _extrair_orgaos(soup) if tipo_login == "interno" else []
    captcha_pendente = _captcha_visivel(soup)
    captcha_b64 = None
    if captcha_pendente:
        captcha_b64 = await _baixar_captcha_base64(client, soup, str(resp.url))
    return soup, hidden_fields, orgaos, captcha_pendente, captcha_b64


async def obter_formulario_login(tipo_login: TipoLoginSei) -> dict[str, Any]:
    """Usado pelo frontend para popular o select de órgãos e detectar captcha
    ANTES de o usuário submeter a conexão (evita pedir órgão/captcha às cegas)."""
    async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT, follow_redirects=True) as client:
        _, _hidden, orgaos, captcha_pendente, captcha_b64 = await _buscar_pagina_login(client, tipo_login)
    return {
        "tipo_login": tipo_login,
        "orgaos": orgaos,
        "captcha_pendente": captcha_pendente,
        "captcha_imagem_base64": captcha_b64,
    }


# --------------------------------------------------------------------------
# Login efetivo
# --------------------------------------------------------------------------


async def _submeter_login(
    client: httpx.AsyncClient,
    *,
    tipo_login: TipoLoginSei,
    identificacao: str,
    senha: str,
    orgao: str | None,
    captcha: str | None,
) -> httpx.Response:
    soup, hidden_fields, orgaos, captcha_pendente, _ = await _buscar_pagina_login(client, tipo_login)
    form = soup.find("form", {"id": "frmLogin"})
    action = form.get("action") or ""
    post_url = urljoin(_login_url(tipo_login), action) if action else urljoin(SEI_BASE_URL, action)

    payload: dict[str, str] = dict(hidden_fields)  # nunca hardcoda — só o que veio ao vivo do HTML
    if tipo_login == "interno":
        payload["txtUsuario"] = identificacao
        payload["pwdSenha"] = senha
        if orgao:
            payload["selOrgao"] = orgao
        elif orgaos:
            raise AuthError("Selecione o órgão de acesso (selOrgao) para o login interno.")
    else:
        payload["txtEmail"] = identificacao
        payload["pwdSenha"] = senha

    if captcha_pendente:
        if not captcha:
            raise AuthError("__CAPTCHA_REQUERIDO__")
        payload[_CAMPO_CAPTCHA] = captcha

    try:
        resp = await client.post(post_url, data=payload)
        resp.raise_for_status()
    except httpx.HTTPError as exc:
        raise DatabaseUnavailableError(f"Falha de rede/timeout ao autenticar no SEI-SP: {exc}") from exc
    return resp


def _login_aparenta_sucesso(resp: httpx.Response) -> bool:
    """Heurística best-effort: sem a estrutura real da tela pós-login, usamos
    sinais fracos (ausência do form de login na resposta, presença de cookie
    de sessão). TODO: confirmar contra o SEI real e substituir por checagem
    de um elemento estável do painel autenticado."""
    if not resp.cookies:
        return False
    texto = resp.text.lower()
    if 'id="frmlogin"' in texto or "usuário ou senha inválidos" in texto or "senha incorreta" in texto:
        return False
    return True


async def conectar(
    *,
    usuario_sicard_id: str,
    tipo_login: TipoLoginSei,
    usuario: str | None,
    orgao: str | None,
    email: str | None,
    senha: str,
    captcha: str | None,
    lembrar_credencial: bool,
) -> SeiSessionState:
    identificacao = (usuario if tipo_login == "interno" else email) or ""
    if not identificacao:
        campo = "usuário" if tipo_login == "interno" else "email"
        raise AuthError(f"Informe o {campo} para conectar ao SEI-SP.")

    client = httpx.AsyncClient(timeout=_HTTP_TIMEOUT, follow_redirects=True)
    try:
        resp = await _submeter_login(
            client,
            tipo_login=tipo_login,
            identificacao=identificacao,
            senha=senha,
            orgao=orgao,
            captcha=captcha,
        )
    except AuthError as exc:
        await client.aclose()
        if str(exc) == "__CAPTCHA_REQUERIDO__":
            # Devolve estado "pendente de captcha" para o router expor a imagem.
            formulario = await obter_formulario_login(tipo_login)
            state = SeiSessionState(
                usuario_sicard_id=usuario_sicard_id,
                tipo_login=tipo_login,
                identificacao=identificacao,
                orgao_selecionado=orgao,
                cookies=httpx.Cookies(),
                captcha_pendente=True,
                captcha_imagem_base64=formulario.get("captcha_imagem_base64"),
            )
            _set_session(usuario_sicard_id, state)
            raise
        raise

    if not _login_aparenta_sucesso(resp):
        await client.aclose()
        erro = "Usuário/senha (ou captcha) inválidos, ou o SEI-SP recusou o login."
        state = SeiSessionState(
            usuario_sicard_id=usuario_sicard_id,
            tipo_login=tipo_login,
            identificacao=identificacao,
            orgao_selecionado=orgao,
            cookies=httpx.Cookies(),
            erro=erro,
        )
        _set_session(usuario_sicard_id, state)
        raise AuthError(erro)

    state = SeiSessionState(
        usuario_sicard_id=usuario_sicard_id,
        tipo_login=tipo_login,
        identificacao=identificacao,
        orgao_selecionado=orgao,
        cookies=client.cookies,
        senha=senha if not lembrar_credencial else None,
    )
    _set_session(usuario_sicard_id, state)
    await client.aclose()

    if lembrar_credencial:
        try:
            sei_credencial_repository.upsert(
                usuario_id=usuario_sicard_id,
                tipo_login=tipo_login,
                identificador=identificacao,
                orgao_selecionado=orgao,
                senha_criptografada=_encrypt_senha(senha),
            )
        except DatabaseUnavailableError as exc:
            # A conexão SEI já está de pé (sessão em memória funciona); só a
            # persistência da credencial falhou — não derruba a conexão.
            logger.warning("Não foi possível salvar a credencial SEI lembrada: %s", exc)

    return state


def status(usuario_sicard_id: str) -> dict[str, Any]:
    state = _get_session(usuario_sicard_id)
    lembrada = sei_credencial_repository.get_by_usuario_id(usuario_sicard_id) is not None
    if not state:
        return {
            "conectado": False,
            "tipo_login": None,
            "identificacao": None,
            "orgao_selecionado": None,
            "lembrada": lembrada,
            "erro": None,
            "captcha_pendente": False,
            "captcha_imagem_base64": None,
        }
    conectado = bool(state.cookies) and not state.erro and not state.captcha_pendente
    return {
        "conectado": conectado,
        "tipo_login": state.tipo_login,
        "identificacao": state.identificacao,
        "orgao_selecionado": state.orgao_selecionado,
        "lembrada": lembrada,
        "erro": state.erro,
        "captcha_pendente": state.captcha_pendente,
        "captcha_imagem_base64": state.captcha_imagem_base64,
    }


def desconectar(usuario_sicard_id: str, *, esquecer_credencial: bool = False) -> None:
    _drop_session(usuario_sicard_id)
    if esquecer_credencial:
        sei_credencial_repository.delete_by_usuario_id(usuario_sicard_id)


# --------------------------------------------------------------------------
# Listagem de processos (best-effort — estrutura real a confirmar)
# --------------------------------------------------------------------------


def estimar_tipo_demanda(processo: dict[str, Any]) -> str:
    """Heurística de classificação do processo SEI em plano/programa/projeto.

    Por ora, o default é sempre "projeto": é o tipo de demanda mais granular e
    o único cujo formulário de criação já reaproveita 1:1 os campos do
    cadastro público existente (nome/descrição/instituição/lat/lng/diretoria/
    plano), então é a aposta mais segura enquanto não há sinal textual
    confiável (assunto/tipo do processo SEI) para diferenciar plano/programa/
    projeto automaticamente. Mantido isolado para ajuste futuro sem tocar no
    restante do fluxo.
    """
    return "projeto"


def _parse_tabela_processos(html: str) -> list[dict[str, Any]]:
    """Parsing best-effort da listagem de processos do SEI.

    TODO: confirmar contra o SEI real — estrutura de colunas/seletores da
    tabela é assumida com base em padrões comuns de listagens SEI/Infra
    (uma <table> com linhas de processo, número em um <a>/<span> por linha).
    """
    soup = BeautifulSoup(html, "html.parser")
    tabela = soup.find("table")
    if not tabela:
        return []

    processos: list[dict[str, Any]] = []
    linhas = tabela.find_all("tr")
    for linha in linhas:
        celulas = linha.find_all(["td"])
        if not celulas:
            continue
        textos = [c.get_text(strip=True) for c in celulas]
        numero = next((t for t in textos if t and any(ch.isdigit() for ch in t)), None)
        if not numero:
            continue
        processo = {
            "numero": numero,
            "tipo": textos[1] if len(textos) > 1 else None,
            "interessado": textos[2] if len(textos) > 2 else None,
            "data": textos[-1] if textos else None,
        }
        processo["tipo_demanda_estimado"] = estimar_tipo_demanda(processo)
        processos.append(processo)
    return processos


async def listar_processos_sei(usuario_sicard_id: str) -> dict[str, Any]:
    """Lista processos candidatos usando a sessão SEI já autenticada do usuário.

    Best-effort: se o endpoint (chute educado, TODO confirmar) ou o parsing da
    tabela falhar, retorna lista vazia + um aviso amigável em vez de propagar erro.
    """
    state = _get_session(usuario_sicard_id)
    if not state or not state.cookies or state.erro or state.captcha_pendente:
        raise AuthError("Não há sessão SEI ativa. Conecte-se primeiro.")

    async with httpx.AsyncClient(
        timeout=_HTTP_TIMEOUT, follow_redirects=True, cookies=state.cookies
    ) as client:
        for endpoint in SEI_LISTAR_PROCESSOS_URL_CANDIDATOS:
            url = urljoin(SEI_BASE_URL, endpoint)
            try:
                resp = await client.get(url)
            except httpx.HTTPError as exc:
                logger.warning("Falha de rede ao listar processos SEI (%s): %s", endpoint, exc)
                continue
            if resp.status_code != 200:
                continue
            try:
                processos = _parse_tabela_processos(resp.text)
            except Exception as exc:  # parsing best-effort — nunca 500 por causa disso
                logger.warning("Falha ao interpretar listagem de processos SEI: %s", exc)
                continue
            if processos:
                return {"processos": processos, "aviso": None}

        return {
            "processos": [],
            "aviso": (
                "Não foi possível localizar/interpretar a listagem de processos do SEI-SP "
                "com os endpoints conhecidos. A estrutura exata da tela pós-login ainda "
                "precisa ser confirmada manualmente (ver TODO em "
                "api/services/sei_integracao_service.py)."
            ),
        }
