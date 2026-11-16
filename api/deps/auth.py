"""Dependências FastAPI — autenticação."""
from __future__ import annotations
from ipaddress import ip_address

from fastapi import Cookie, Depends, HTTPException, Request

from api.services.session_service import SessionUser, cookie_name, is_gestor, parse_token
from api.exceptions import DatabaseUnavailableError

from api.services import autorizacao as authz


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
    cached = getattr(request.state, "validated_session", None)
    if cached is not None and cached[0] == token:
        return cached[1]
    try:
        user = parse_token(token or None)
        request.state.validated_session = (token, user)
        return user
    except DatabaseUnavailableError as exc:
        raise HTTPException(503, "Serviço de sessão temporariamente indisponível.") from exc


def require_gestor(
    request: Request,
    slt_session: str | None = Cookie(default=None, alias=cookie_name()),
) -> SessionUser:
    user = get_optional_session(request, slt_session)
    if not user:
        raise HTTPException(status_code=401, detail="Sessão inválida ou expirada. Faça login.")
    from api.deps.access_policy import authorize_request
    return authorize_request(request, user)


def require_authenticated(
    request: Request,
    slt_session: str | None = Cookie(default=None, alias=cookie_name()),
) -> SessionUser:
    user = get_optional_session(request, slt_session)
    if not user:
        raise HTTPException(status_code=401, detail="Sessão inválida ou expirada. Faça login.")
    return user


def _route_or_permission(user, request, *codes):
    if request is not None:
        from api.deps.access_policy import authorize_request
        return authorize_request(request, user)
    return authz.exigir(user, *codes)


def require_operator(
    user: SessionUser = Depends(require_authenticated),
    request: Request = None,
) -> SessionUser:
    return _route_or_permission(user, request, 'mocad.cadastrar_demanda', 'mad.operar', 'operador.executar_acoes')


def require_analyst(
    user: SessionUser = Depends(require_authenticated),
    request: Request = None,
) -> SessionUser:
    return _route_or_permission(user, request, 'mocad.analisar', 'mad.operar', 'ferramentas.operar')


def require_demand_analyst(
    user: SessionUser = Depends(require_authenticated),
) -> SessionUser:
    """Análise de demandas é exclusiva do perfil Analista, sem herança."""
    return authz.exigir(user, 'mocad.analisar', acao='analisar ou alterar demandas cadastradas')


def require_admin(
    user: SessionUser = Depends(require_authenticated),
    request: Request = None,
) -> SessionUser:
    if request is not None and request.url.path.startswith(('/api/admin/', '/api/email/')):
        return _route_or_permission(user, request, 'administracao.configurar', 'administracao.manter')
    return authz.exigir(user, 'administracao.configurar', 'administracao.manter', acao='administrar o sistema')


def require_geospatial_access(
    request: Request,
    user: SessionUser = Depends(require_authenticated),
) -> SessionUser:
    from api.deps.access_policy import authorize_request, consultation
    if not request.url.path.startswith('/api/'):
        codes = ('area_restrita.visualizar', 'ferramentas.visualizar') if consultation(request.url.path, request.method) else ('ferramentas.operar',)
        return authz.exigir(user, *codes, acao='acessar as ferramentas geoespaciais')
    return authorize_request(request, user)


def get_request_meta(request: Request) -> dict[str, str | None]:
    return {
        "ip_address": _client_ip(request),
        "user_agent": request.headers.get("user-agent"),
    }
