"""Dependências FastAPI — autenticação."""
from __future__ import annotations

from fastapi import Cookie, HTTPException, Request

from api.services.session_service import SessionUser, cookie_name, is_gestor, parse_token


def _client_ip(request: Request) -> str | None:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return None


def get_optional_session(
    request: Request,
    slt_session: str | None = Cookie(default=None, alias=cookie_name()),
) -> SessionUser | None:
    token = slt_session or request.headers.get("authorization", "").removeprefix("Bearer ").strip()
    return parse_token(token or None)


def require_gestor(
    request: Request,
    slt_session: str | None = Cookie(default=None, alias=cookie_name()),
) -> SessionUser:
    user = get_optional_session(request, slt_session)
    if not user or not is_gestor(user):
        raise HTTPException(status_code=401, detail="Sessão inválida ou expirada. Faça login como gestor.")
    return user


def get_request_meta(request: Request) -> dict[str, str | None]:
    return {
        "ip_address": _client_ip(request),
        "user_agent": request.headers.get("user-agent"),
    }
