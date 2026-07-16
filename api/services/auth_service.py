"""Autenticação de operadores SICARD via username do SIGMA."""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any
from urllib.parse import urljoin, urlparse

import httpx

from api.config import get_settings
from api.exceptions import AuthError, DatabaseUnavailableError
from api.repositories import auditoria_repository, sigma_usuario_repository
from api.services.session_service import SIGMA_PROFILES, SessionUser, create_token, profile_from_username
from api.sigma_password import verify_password

logger = logging.getLogger(__name__)

_REDIRECT_STATUSES = {301, 302, 307, 308}


def _safe_auth_redirect(current_url: str, location: str) -> str:
    """Resolve redirecionamento do SIGMA sem vazar credenciais a outro host."""
    target = urljoin(current_url, location)
    current = urlparse(current_url)
    redirected = urlparse(target)
    if (
        redirected.scheme not in {"http", "https"}
        or redirected.hostname != current.hostname
        or (current.scheme == "https" and redirected.scheme != "https")
    ):
        raise DatabaseUnavailableError(
            "SIGMA retornou um redirecionamento de autenticação inseguro."
        )
    return target


def _display_name(row: dict[str, Any]) -> str:
    nome = row.get("nome_pessoa") or row.get("nome_completo")
    if nome:
        return str(nome).strip()
    return ""


def _validated_username(username: str) -> tuple[str, str]:
    normalized = (username or "").strip()
    profile = profile_from_username(normalized)
    if not profile:
        allowed = ", ".join(f"_{item.lower()}" for item in sorted(SIGMA_PROFILES))
        raise AuthError(f"Informe um username SIGMA válido, terminado em: {allowed}.")
    return normalized, profile


def _mask_login(login: str) -> str:
    login = login.strip()
    if "@" not in login:
        return login[:2] + "***" if len(login) > 2 else "***"
    local, domain = login.split("@", 1)
    if len(local) <= 2:
        masked = local[0] + "***"
    else:
        masked = local[0] + "***" + local[-1]
    return f"{masked}@{domain}"


def _audit_auth(
    *,
    mensagem: str,
    sucesso: bool,
    login: str,
    usuario_id: str | None = None,
    usuario_nome: str | None = None,
    motivo: str | None = None,
    ip_address: str | None = None,
    user_agent: str | None = None,
    operacao: str = "LOGIN",
) -> None:
    try:
        auditoria_repository.registrar(
            nivel="AUDIT",
            categoria="auth",
            operacao=operacao,
            schema_nome="usuarios",
            tabela="usuario",
            registro_id=usuario_id,
            usuario_id=usuario_id,
            usuario_nome=usuario_nome,
            mensagem=mensagem,
            dados_novos={
                "sucesso": sucesso,
                "login": _mask_login(login),
                "motivo": motivo,
                "tipo_identificado": profile_from_username(login),
            },
            contexto={"modulo": "admin"},
            ip_address=ip_address,
            user_agent=user_agent,
            origem="web",
        )
    except DatabaseUnavailableError as exc:
        logger.warning("Auditoria SLT indisponível — login não bloqueado: %s", exc)


async def _authenticate_via_api(login: str, password: str) -> SessionUser | None:
    """Valida credenciais na API HTTP do SIGMA (porta 80).

    Retorna ``None`` para credencial inválida. Levanta
    ``DatabaseUnavailableError`` quando o SIGMA está inacessível (rede/5xx),
    permitindo o fallback para o banco direto.
    """
    base = get_settings().sigma_api_base
    if not base:
        raise DatabaseUnavailableError("SIGMA_API_BASE não configurado.")

    url = f"{base}/api/auth/login"
    username, profile = _validated_username(login)
    payload = {
        "identifier": username,
        "password": password,
        "tipo_usuario": profile,
    }

    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            for _ in range(3):
                res = await client.post(url, json=payload)
                if res.status_code not in _REDIRECT_STATUSES:
                    break
                location = res.headers.get("location")
                if not location:
                    raise DatabaseUnavailableError(
                        "SIGMA redirecionou o login sem informar o destino."
                    )
                url = _safe_auth_redirect(url, location)
            else:
                raise DatabaseUnavailableError(
                    "SIGMA excedeu o limite de redirecionamentos no login."
                )
    except httpx.HTTPError as exc:
        raise DatabaseUnavailableError(f"SIGMA API indisponível: {exc}") from exc

    # 401 = credencial inválida; 422 = payload rejeitado (ex.: senha curta);
    # 429 = rate limit. Em todos, tratamos como credencial inválida.
    if res.status_code in (401, 422, 429):
        return None
    if res.status_code >= 500:
        raise DatabaseUnavailableError(f"SIGMA API erro HTTP {res.status_code}.")
    if res.status_code != 200:
        logger.warning(
            "SIGMA login resposta inesperada (%s): %s",
            res.status_code,
            res.text[:300],
        )
        return None

    try:
        data = res.json()
    except ValueError as exc:
        raise DatabaseUnavailableError("Resposta inválida do SIGMA.") from exc

    user = data.get("user") if isinstance(data, dict) else None
    if not isinstance(user, dict):
        return None

    user_id = user.get("id")
    returned_username = str(user.get("username") or "").strip()
    returned_profile = profile_from_username(returned_username)
    if not user_id or not returned_username or returned_profile != profile:
        return None

    email = user.get("email_institucional") or user.get("email")
    nome = (
        user.get("nome_completo")
        or user.get("nome_pessoa")
        or user.get("nome")
        or ""
    )
    return SessionUser(
        id=str(user_id),
        email=str(email) if email else "",
        username=returned_username,
        nome=str(nome).strip(),
        tipo_usuario=profile,
    )


async def login_usuario(
    username: str,
    password: str,
    *,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> tuple[SessionUser, str]:
    """Autentica um operador pelo username SIGMA e deriva seu perfil do sufixo.

    Espelha a estratégia das aplicações PLI (HazardTrack/Reporta/SmartRouter):
    usa o endpoint HTTP ``/api/auth/login`` (porta 80, sempre acessível) e só
    recorre ao PostgreSQL direto (porta 5433) como fallback.
    """
    login = (username or "").strip()
    password = password or ""

    if not login or not password:
        _audit_auth(
            mensagem="Tentativa de login admin sem credenciais completas",
            sucesso=False,
            login=login or "?",
            motivo="credenciais_incompletas",
            ip_address=ip_address,
            user_agent=user_agent,
        )
        raise AuthError("Informe username e senha.")

    _validated_username(login)

    if get_settings().sigma_api_base:
        try:
            user = await _authenticate_via_api(login, password)
        except DatabaseUnavailableError as exc:
            logger.warning(
                "SIGMA API indisponível, tentando banco direto: %s", exc
            )
        else:
            if user is None:
                _audit_auth(
                    mensagem="Falha de login admin via API SIGMA",
                    sucesso=False,
                    login=login,
                    motivo="credenciais_invalidas",
                    ip_address=ip_address,
                    user_agent=user_agent,
                )
                raise AuthError("Credenciais inválidas.")
            token = create_token(user)
            _audit_auth(
                mensagem="Login admin realizado com sucesso (API SIGMA)",
                sucesso=True,
                login=login,
                usuario_id=user.id,
                usuario_nome=user.nome,
                ip_address=ip_address,
                user_agent=user_agent,
            )
            return user, token

    return authenticate_usuario(
        login,
        password,
        ip_address=ip_address,
        user_agent=user_agent,
    )


def authenticate_usuario(
    username: str,
    password: str,
    *,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> tuple[SessionUser, str]:
    login = (username or "").strip()
    password = password or ""

    if not login or not password:
        _audit_auth(
            mensagem="Tentativa de login admin sem credenciais completas",
            sucesso=False,
            login=login or "?",
            motivo="credenciais_incompletas",
            ip_address=ip_address,
            user_agent=user_agent,
        )
        raise AuthError("Informe username e senha.")

    login, profile = _validated_username(login)

    row = sigma_usuario_repository.find_active_by_username(login)
    if not row:
        _audit_auth(
            mensagem="Falha de login restrito — usuário não encontrado no SIGMA",
            sucesso=False,
            login=login,
            motivo="usuario_nao_encontrado",
            ip_address=ip_address,
            user_agent=user_agent,
        )
        raise AuthError("Credenciais inválidas.")

    bloqueado = row.get("bloqueado_ate")
    if bloqueado and isinstance(bloqueado, datetime):
        now = datetime.now(timezone.utc)
        bloqueado_utc = bloqueado if bloqueado.tzinfo else bloqueado.replace(tzinfo=timezone.utc)
        if bloqueado_utc > now:
            _audit_auth(
                mensagem="Falha de login admin — usuário bloqueado",
                sucesso=False,
                login=login,
                usuario_id=str(row["id"]),
                motivo="usuario_bloqueado",
                ip_address=ip_address,
                user_agent=user_agent,
            )
            raise AuthError("Usuário temporariamente bloqueado.")

    if not verify_password(password, row.get("password_hash")):
        _audit_auth(
            mensagem="Falha de login admin — senha incorreta",
            sucesso=False,
            login=login,
            usuario_id=str(row["id"]),
            motivo="senha_incorreta",
            ip_address=ip_address,
            user_agent=user_agent,
        )
        raise AuthError("Credenciais inválidas.")

    user = SessionUser(
        id=str(row["id"]),
        email=str(row.get("email_institucional") or ""),
        username=str(row.get("username") or login),
        nome=_display_name(row),
        tipo_usuario=profile,
    )

    token = create_token(user)
    _audit_auth(
        mensagem="Login admin realizado com sucesso",
        sucesso=True,
        login=login,
        usuario_id=user.id,
        usuario_nome=user.nome,
        ip_address=ip_address,
        user_agent=user_agent,
    )
    return user, token


def logout_usuario(
    user: SessionUser,
    *,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> None:
    try:
        auditoria_repository.registrar(
            nivel="AUDIT",
            categoria="auth",
            operacao="LOGIN",
            schema_nome="usuarios",
            tabela="usuario",
            registro_id=user.id,
            usuario_id=user.id,
            usuario_nome=user.nome,
            mensagem="Logout admin",
            dados_novos={"sucesso": True, "evento": "logout"},
            contexto={"modulo": "admin"},
            ip_address=ip_address,
            user_agent=user_agent,
            origem="web",
        )
    except DatabaseUnavailableError as exc:
        logger.warning("Auditoria SLT indisponível — logout não bloqueado: %s", exc)
