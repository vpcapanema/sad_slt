"""Rotas HTTP — autenticação admin (SIGMA read + auditoria SLT)."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, Response

from api.deps.auth import get_optional_session, get_request_meta, require_gestor
from api.exceptions import AuthError, DatabaseUnavailableError
from api.schemas.auth import LoginRequestSchema, LoginResponseSchema, SessionUserSchema
from api.services import auth_service
from api.services.session_service import SessionUser, cookie_name

router = APIRouter(prefix="/auth", tags=["auth"])

_COOKIE_MAX_AGE = 60 * 60 * 8


def _user_schema(user: SessionUser) -> SessionUserSchema:
    return SessionUserSchema(
        id=user.id,
        email=user.email,
        username=user.username,
        nome=user.nome,
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
        user, token = auth_service.authenticate_gestor(
            body.login,
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
                "Verifique a conexão com o banco SIGMA (SIGMA_POSTGRES_* no .env)."
            ),
        ) from exc

    _set_session_cookie(response, token)
    return LoginResponseSchema(user=_user_schema(user))


@router.get("/me", response_model=SessionUserSchema)
async def me(user: SessionUser = Depends(require_gestor)):
    return _user_schema(user)


@router.post("/logout")
async def logout(
    response: Response,
    request: Request,
    user: SessionUser | None = Depends(get_optional_session),
):
    meta = get_request_meta(request)
    if user:
        auth_service.logout_gestor(
            user,
            ip_address=meta["ip_address"],
            user_agent=meta["user_agent"],
        )
    _clear_session_cookie(response)
    return {"ok": True}
