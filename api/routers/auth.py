"""Rotas HTTP — autenticação da área restrita pelo SIGMA."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, Response

from api.deps.auth import get_optional_session, get_request_meta, require_authenticated, require_admin
from uuid import UUID
from api.exceptions import AuthError, DatabaseUnavailableError
from api.repositories import sigma_usuario_repository
from api.repositories import session_repository
from api.schemas.auth import LoginRequestSchema, LoginResponseSchema, SessionUserSchema
from api.services import auth_service
from api.services.session_service import SessionUser, cookie_name, REMEMBER_TTL_SECONDS

router = APIRouter(prefix="/auth", tags=["auth"])

def _user_schema(user: SessionUser) -> SessionUserSchema:
    nome = user.nome
    return SessionUserSchema(
        id=user.id,
        email=user.email,
        username=user.username,
        nome=nome,
        tipo_usuario=user.tipo_usuario,
    )


def _set_session_cookie(response: Response, token: str, *, permanecer_conectado: bool = False, secure: bool = False) -> None:
    response.set_cookie(
        key=cookie_name(),
        value=token,
        max_age=REMEMBER_TTL_SECONDS if permanecer_conectado else None,
        secure=secure,
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
            permanecer_conectado=body.permanecer_conectado,
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

    response.headers["Cache-Control"] = "no-store"
    _set_session_cookie(response, token, permanecer_conectado=body.permanecer_conectado,
                        secure=request.url.scheme == "https")
    return LoginResponseSchema(user=_user_schema(user))


@router.get("/me", response_model=SessionUserSchema)
def me(user: SessionUser = Depends(require_authenticated)):
    return _user_schema(user)


@router.get("/session")
def session(response: Response, user: SessionUser | None = Depends(get_optional_session)):
    """Consulta pública de sessão, sem transformar ausência de cookie em erro 401."""
    response.headers["Cache-Control"] = "no-store"
    if not user:
        return {"authenticated": False, "user": None}
    return {"authenticated": True, "user": _user_schema(user)}


@router.post("/logout")
def logout(
    response: Response,
    request: Request,
    user: SessionUser | None = Depends(get_optional_session),
):
    meta = get_request_meta(request)
    if user:
        try:
            session_repository.revoke(user.session_id)
        except DatabaseUnavailableError as exc:
            raise HTTPException(503, "Não foi possível revogar a sessão. Tente novamente.") from exc
        auth_service.logout_usuario(
            user,
            ip_address=meta["ip_address"],
            user_agent=meta["user_agent"],
        )
    _clear_session_cookie(response)
    return {"ok": True}


@router.delete("/sessoes/usuario/{usuario_id}", status_code=204)
def revogar_sessoes_usuario(usuario_id: UUID, _admin: SessionUser = Depends(require_admin)):
    """Revogação administrativa, inclusive no procedimento de desativação SIGMA."""
    try:
        session_repository.revoke_user(str(usuario_id))
    except DatabaseUnavailableError as exc:
        raise HTTPException(503, "Não foi possível revogar as sessões. Tente novamente.") from exc
