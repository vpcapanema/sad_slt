"""Rotas HTTP — integração com o portal web do SEI-SP (sem API oficial)."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from api.deps.auth import require_authenticated
from api.exceptions import AuthError, DatabaseUnavailableError, DemandaValidationError
from api.schemas.demanda import DemandaCreateSchema, DemandaResponseSchema
from api.schemas.plano import PlanoCreateSchema, PlanoResponseSchema
from api.schemas.programa import ProgramaCreateSchema, ProgramaResponseSchema
from api.schemas.sei_integracao import (
    SeiConectarSchema,
    SeiCriarDemandaSchema,
    SeiListarProcessosResponseSchema,
    SeiLoginFormSchema,
    SeiStatusSchema,
)
from api.services import demanda_service, plano_service, programa_service, sei_integracao_service
from api.services.session_service import SessionUser

router = APIRouter(prefix="/sei", tags=["sei-integracao"])

_ORIGEM_SEI = "SEI"


@router.get("/login-form", response_model=SeiLoginFormSchema)
async def obter_formulario_login(
    tipo_login: str,
    _user: SessionUser = Depends(require_authenticated),
) -> SeiLoginFormSchema:
    """Lê a página de login do SEI-SP ao vivo para popular o select de órgãos
    (login interno) e detectar captcha ANTES de o usuário submeter a conexão."""
    if tipo_login not in ("interno", "externo"):
        raise HTTPException(status_code=422, detail="tipo_login deve ser 'interno' ou 'externo'.")
    try:
        dados = await sei_integracao_service.obter_formulario_login(tipo_login)
    except DatabaseUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return SeiLoginFormSchema(**dados)


@router.post("/conectar", response_model=SeiStatusSchema)
async def conectar(
    body: SeiConectarSchema,
    user: SessionUser = Depends(require_authenticated),
) -> SeiStatusSchema:
    try:
        await sei_integracao_service.conectar(
            usuario_sicard_id=user.id,
            tipo_login=body.tipo_login,
            usuario=body.usuario,
            orgao=body.orgao,
            email=body.email,
            senha=body.senha,
            captcha=body.captcha,
            lembrar_credencial=body.lembrar_credencial,
        )
    except AuthError as exc:
        if str(exc) == "__CAPTCHA_REQUERIDO__":
            # Sessão marcada como "pendente de captcha" pelo service — devolvemos
            # o status atual (com a imagem) em vez de um erro genérico 401/422.
            return SeiStatusSchema(**sei_integracao_service.status(user.id))
        raise HTTPException(status_code=401, detail=str(exc)) from exc
    except DatabaseUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return SeiStatusSchema(**sei_integracao_service.status(user.id))


@router.get("/status", response_model=SeiStatusSchema)
async def status(user: SessionUser = Depends(require_authenticated)) -> SeiStatusSchema:
    return SeiStatusSchema(**sei_integracao_service.status(user.id))


@router.post("/desconectar")
async def desconectar(
    esquecer_credencial: bool = False,
    user: SessionUser = Depends(require_authenticated),
) -> dict[str, bool]:
    sei_integracao_service.desconectar(user.id, esquecer_credencial=esquecer_credencial)
    return {"ok": True}


@router.get("/processos", response_model=SeiListarProcessosResponseSchema)
async def listar_processos(
    user: SessionUser = Depends(require_authenticated),
) -> SeiListarProcessosResponseSchema:
    try:
        resultado = await sei_integracao_service.listar_processos_sei(user.id)
    except AuthError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc
    except DatabaseUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return SeiListarProcessosResponseSchema(**resultado)


@router.post("/processos/{numero}/criar-demanda")
async def criar_demanda_de_processo(
    numero: str,
    body: SeiCriarDemandaSchema,
    _user: SessionUser = Depends(require_authenticated),
) -> DemandaResponseSchema | PlanoResponseSchema | ProgramaResponseSchema:
    """Cria a demanda revisada pelo usuário a partir de um processo SEI.

    O `numero` do processo SEI é usado apenas para contexto/log nesta etapa —
    os campos efetivamente persistidos são os revisados/editados pelo usuário
    em `body.campos`, validados pelo schema do tipo escolhido. O código gerado
    carrega o marcador de origem SEI (ex.: ``I-PRJ-SEI-XXXXXXXX``).
    """
    try:
        if body.tipo_demanda == "plano":
            payload = PlanoCreateSchema.model_validate(body.campos)
            return plano_service.criar_plano(payload, origem=_ORIGEM_SEI)
        if body.tipo_demanda == "programa":
            payload_prog = ProgramaCreateSchema.model_validate(body.campos)
            return programa_service.criar_programa(payload_prog, origem=_ORIGEM_SEI)
        payload_proj = DemandaCreateSchema.model_validate(body.campos)
        return demanda_service.criar_demanda(payload_proj, origem=_ORIGEM_SEI)
    except DemandaValidationError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except DatabaseUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
