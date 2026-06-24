"""Autenticação de gestores via banco SIGMA + auditoria SLT."""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from api.exceptions import AuthError, DatabaseUnavailableError
from api.repositories import auditoria_repository, sigma_usuario_repository
from api.services.session_service import SessionUser, create_token
from api.sigma_password import verify_password

logger = logging.getLogger(__name__)


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
