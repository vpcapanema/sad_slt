"""Rotas HTTP — autenticação da área restrita pelo SIGMA."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, Response

from api.deps.auth import get_optional_session, get_request_meta, require_authenticated
from api.exceptions import AuthError, DatabaseUnavailableError
from api.repositories import sigma_usuario_repository
from api.schemas.auth import LoginRequestSchema, LoginResponseSchema, SessionUserSchema
from api.services import auth_service
from api.services.session_service import SessionUser, cookie_name

router = APIRouter(prefix="/auth", tags=["auth"])

_COOKIE_MAX_AGE = 60 * 60 * 8


def _user_schema(user: SessionUser) -> SessionUserSchema:
    nome = user.nome
    try:
        usuario_sigma = sigma_usuario_repository.find_active_by_id(user.id)
        nome_associado = (usuario_sigma or {}).get("nome_pessoa")
        if nome_associado:
            nome = str(nome_associado).strip()
    except DatabaseUnavailableError:
        # A sessão continua utilizável durante uma indisponibilidade transitória
        # do SIGMA; o nome gravado no token funciona como contingência.
        pass
    return SessionUserSchema(
        id=user.id,
        email=user.email,
        username=user.username,
        nome=nome,
        tipo_usuario=user.tipo_usuario,
    )


def _set_session_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=cookie_name(),
        value=token,
        max_age=_COOKIE_MAX_AGE,
        httponly=True,
        samesite="lax",
        path="/",
    )


def _clear_session_cookie(response: Response) -> None:
    response.delete_cookie(key=cookie_name(), path="/")


@router.post("/login", response_model=LoginResponseSchema)
async def login(
    body: LoginRequestSchema,
    response: Response,
    request: Request,
):
    meta = get_request_meta(request)
    try:
        user, token = await auth_service.login_usuario(
            body.username,
            body.senha,
            ip_address=meta["ip_address"],
            user_agent=meta["user_agent"],
        )
    except AuthError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc
    except DatabaseUnavailableError as exc:
        raise HTTPException(
            status_code=503,
            detail=(
                "Serviço de autenticação temporariamente indisponível. "
                "Verifique a conexão com o SIGMA (API HTTP SIGMA_API_BASE "
                "ou banco SIGMA_POSTGRES_* no .env)."
            ),
        ) from exc

    _set_session_cookie(response, token)
    return LoginResponseSchema(user=_user_schema(user))


@router.get("/me", response_model=SessionUserSchema)
async def me(user: SessionUser = Depends(require_authenticated)):
    return _user_schema(user)


@router.get("/session")
async def session(user: SessionUser | None = Depends(get_optional_session)):
    """Consulta pública de sessão, sem transformar ausência de cookie em erro 401."""
    if not user:
        return {"authenticated": False, "user": None}
    return {"authenticated": True, "user": _user_schema(user)}


@router.post("/logout")
async def logout(
    response: Response,
    request: Request,
    user: SessionUser | None = Depends(get_optional_session),
):
    meta = get_request_meta(request)
    if user:
        auth_service.logout_usuario(
            user,
            ip_address=meta["ip_address"],
            user_agent=meta["user_agent"],
        )
    _clear_session_cookie(response)
    return {"ok": True}
