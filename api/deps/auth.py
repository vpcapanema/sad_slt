"""Dependências FastAPI — autenticação."""
from __future__ import annotations
from ipaddress import ip_address

from fastapi import Cookie, Depends, HTTPException, Request

from api.services.session_service import SessionUser, cookie_name, is_gestor, parse_token

_OPERATE_PROFILES = frozenset({"OPERADOR", "ANALISTA", "GESTOR", "ADMIN"})
# ADMIN é perfil elevado: herda as capacidades de análise.
_ANALYZE_PROFILES = frozenset({"ANALISTA", "GESTOR", "ADMIN"})


def _client_ip(request: Request) -> str | None:
    forwarded = request.headers.get("x-forwarded-for")
    candidates = [forwarded.split(",")[0].strip()] if forwarded else []
    if request.client:
        candidates.append(request.client.host)
    for candidate in candidates:
        try:
            return str(ip_address(candidate))
        except ValueError:
            continue
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
    return _require_profiles(user, frozenset({"ADMIN"}), "acessar a área do administrador")


def require_geospatial_access(
    request: Request,
    user: SessionUser = Depends(require_authenticated),
) -> SessionUser:
    if "/extracao-atributos/storage-upload/" in request.url.path:
        if user.tipo_usuario.strip().upper() not in _ANALYZE_PROFILES:
            raise HTTPException(403, detail="Seu perfil SICARD não tem permissão para enviar camadas de base. O envio exige perfil Analista, Gestor ou Admin.")
        return user
    if request.method == "GET":
        return user
    if "/homologar" in request.url.path:
        return _require_profiles(user, frozenset({"ANALISTA", "GESTOR", "ADMIN"}), "homologar produtos geoespaciais")
    return _require_profiles(user, _OPERATE_PROFILES, "executar operações geoespaciais")


def get_request_meta(request: Request) -> dict[str, str | None]:
    return {
        "ip_address": _client_ip(request),
        "user_agent": request.headers.get("user-agent"),
    }
