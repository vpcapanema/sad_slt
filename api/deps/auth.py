"""Dependências FastAPI — autenticação."""
from __future__ import annotations

from fastapi import Cookie, Depends, HTTPException, Request

from api.services.session_service import SessionUser, cookie_name, is_gestor, parse_token

_OPERATE_PROFILES = frozenset({"OPERADOR", "ANALISTA", "GESTOR", "ADMIN"})
# ADMIN é perfil elevado: herda as capacidades de análise.
_ANALYZE_PROFILES = frozenset({"ANALISTA", "GESTOR", "ADMIN"})


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
    if not user:
        raise HTTPException(status_code=401, detail="Sessão inválida ou expirada. Faça login.")
    if not is_gestor(user):
        raise HTTPException(status_code=403, detail="Esta ação exige perfil Gestor.")
    return user


def require_authenticated(
    request: Request,
    slt_session: str | None = Cookie(default=None, alias=cookie_name()),
) -> SessionUser:
    user = get_optional_session(request, slt_session)
    if not user:
        raise HTTPException(status_code=401, detail="Sessão inválida ou expirada. Faça login.")
    return user


def _require_profiles(user: SessionUser, allowed: frozenset[str], action: str) -> SessionUser:
    if user.tipo_usuario.strip().upper() not in allowed:
        raise HTTPException(status_code=403, detail=f"Seu perfil não permite {action}.")
    return user


def require_operator(
    user: SessionUser = Depends(require_authenticated),
) -> SessionUser:
    return _require_profiles(user, _OPERATE_PROFILES, "executar esta operação")


def require_analyst(
    user: SessionUser = Depends(require_authenticated),
) -> SessionUser:
    return _require_profiles(user, _ANALYZE_PROFILES, "realizar análise ou aprovação")


def require_admin(
    user: SessionUser = Depends(require_authenticated),
) -> SessionUser:
    # Área do administrador: perfis elevados (ADMIN e GESTOR).
    return _require_profiles(user, frozenset({"ADMIN", "GESTOR"}), "acessar a área do administrador")


def require_geospatial_access(
    request: Request,
    user: SessionUser = Depends(require_authenticated),
) -> SessionUser:
    if request.method == "GET":
        return user
    if "/homologar" in request.url.path:
        return _require_profiles(user, frozenset({"GESTOR"}), "homologar produtos geoespaciais")
    return _require_profiles(user, _OPERATE_PROFILES, "executar operações geoespaciais")


def get_request_meta(request: Request) -> dict[str, str | None]:
    return {
        "ip_address": _client_ip(request),
        "user_agent": request.headers.get("user-agent"),
    }
