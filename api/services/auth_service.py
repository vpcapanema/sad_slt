"""Autenticação de gestores via banco SIGMA + auditoria SLT."""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

import httpx

from api.config import get_settings
from api.exceptions import AuthError, DatabaseUnavailableError
from api.repositories import auditoria_repository, sigma_usuario_repository
from api.services.session_service import SessionUser, create_token
from api.sigma_password import verify_password

logger = logging.getLogger(__name__)

GESTOR_PROFILE = "GESTOR"


def _display_name(row: dict[str, Any]) -> str:
    nome = row.get("nome_pessoa") or row.get("nome_completo")
    if nome:
        return str(nome).strip()
    return ""


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
                "tipo_esperado": "GESTOR",
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
    payload = {
        "identifier": login,
        "password": password,
        "tipo_usuario": GESTOR_PROFILE,
    }

    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            res = await client.post(url, json=payload)
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

    tipo = str(user.get("tipo_usuario", "")).strip().upper()
    if tipo != GESTOR_PROFILE:
        return None

    user_id = user.get("id")
    username = user.get("username")
    if not user_id or not username:
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
        email=str(email) if email else login,
        username=str(username),
        nome=str(nome).strip(),
        tipo_usuario=tipo,
    )


async def login_gestor(
    login: str,
    password: str,
    *,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> tuple[SessionUser, str]:
    """Autentica um gestor preferindo a API HTTP do SIGMA.

    Espelha a estratégia das aplicações PLI (HazardTrack/Reporta/SmartRouter):
    usa o endpoint HTTP ``/api/auth/login`` (porta 80, sempre acessível) e só
    recorre ao PostgreSQL direto (porta 5433) como fallback.
    """
    login = (login or "").strip()
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
        raise AuthError("Informe e-mail/usuário e senha.")

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

    return authenticate_gestor(
        login,
        password,
        ip_address=ip_address,
        user_agent=user_agent,
    )


def authenticate_gestor(
    login: str,
    password: str,
    *,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> tuple[SessionUser, str]:
    login = (login or "").strip()
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
        raise AuthError("Informe e-mail/usuário e senha.")

    row = sigma_usuario_repository.find_gestor_by_login(login)
    if not row:
        _audit_auth(
            mensagem="Falha de login admin — gestor não encontrado no SIGMA",
            sucesso=False,
            login=login,
            motivo="gestor_nao_encontrado",
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
        email=str(row.get("email_institucional") or login),
        username=str(row.get("username") or login),
        nome=_display_name(row),
        tipo_usuario=str(row.get("tipo_usuario") or "GESTOR").upper(),
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


def logout_gestor(
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
