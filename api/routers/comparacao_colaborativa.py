"""Rotas HTTP — preenchimento colaborativo da matriz pareada AHP."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, Request

from api.deps.auth import get_optional_session
from api.exceptions import DatabaseUnavailableError, DemandaValidationError
from api.schemas.comparacao_colaborativa import (
    AmbienteColaborativoCreateSchema,
    AmbienteColaborativoResponseSchema,
    AmbientePublicoSchema,
    RespostaColaborativaCreateSchema,
    RespostaColaborativaResponseSchema,
)
from api.services import comparacao_colaborativa_service as service
from api.services.session_service import SessionUser

router = APIRouter(prefix="/ahp/comparacao-colaborativa", tags=["ahp-comparacao-colaborativa"])


def _base_url(request: Request) -> str:
    return str(request.base_url).rstrip("/")


@router.post("/ambientes", response_model=AmbienteColaborativoResponseSchema, status_code=201)
async def criar_ambiente(
    body: AmbienteColaborativoCreateSchema,
    request: Request,
    _user: SessionUser | None = Depends(get_optional_session),
) -> AmbienteColaborativoResponseSchema:
    """Cria ambiente colaborativo com convites e prazo."""
    try:
        return service.criar_ambiente(body, base_url=_base_url(request))
    except DemandaValidationError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except DatabaseUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.get("/ambientes/{tipo}/{codigo}", response_model=AmbienteColaborativoResponseSchema)
async def obter_ambiente_config(
    tipo: str,
    codigo: str,
    request: Request,
    _user: SessionUser | None = Depends(get_optional_session),
) -> AmbienteColaborativoResponseSchema:
    """Obtém o ambiente colaborativo mais recente de uma configuração."""
    try:
        amb = service.obter_ambiente_config(tipo, codigo, base_url=_base_url(request))
        if not amb:
            raise HTTPException(status_code=404, detail="Ambiente colaborativo não encontrado.")
        return amb
    except DemandaValidationError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except DatabaseUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.get("/publico/{token}", response_model=AmbientePublicoSchema)
async def obter_ambiente_publico(
    token: str,
    email: str | None = Query(None),
) -> AmbientePublicoSchema:
    """Metadados públicos do ambiente (participante)."""
    try:
        return service.obter_ambiente_publico(token, email=email)
    except DemandaValidationError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except DatabaseUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.post("/publico/{token}/respostas", response_model=RespostaColaborativaResponseSchema, status_code=201)
async def enviar_resposta(
    token: str,
    body: RespostaColaborativaCreateSchema,
) -> RespostaColaborativaResponseSchema:
    """Envia resposta colaborativa (RC < 0,10 obrigatório)."""
    try:
        return service.registrar_resposta(token, body)
    except DemandaValidationError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except DatabaseUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.get("/ambientes/{ambiente_id}/respostas", response_model=list[RespostaColaborativaResponseSchema])
async def listar_respostas(
    ambiente_id: str,
    _user: SessionUser | None = Depends(get_optional_session),
) -> list[RespostaColaborativaResponseSchema]:
    """Lista respostas recebidas (gestor da análise)."""
    try:
        return service.listar_respostas(ambiente_id)
    except DemandaValidationError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except DatabaseUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
