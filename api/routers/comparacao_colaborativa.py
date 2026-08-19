"""Rotas HTTP — preenchimento colaborativo da matriz pareada AHP."""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request

from api.deps.auth import require_analyst, require_authenticated
from api.exceptions import DatabaseUnavailableError, DemandaValidationError
from api.schemas.comparacao_colaborativa import (
    AmbienteColaborativoCreateSchema,
    AmbienteColaborativoResponseSchema,
    AmbienteColaborativoUpdateSchema,
    AmbientePublicoSchema,
    RespostaColaborativaCreateSchema,
    RespostaColaborativaResponseSchema,
)
from api.services import comparacao_colaborativa_service as service
from api.services.session_service import SessionUser

router = APIRouter(prefix="/ahp/comparacao-colaborativa", tags=["ahp-comparacao-colaborativa"])


def _base_url(request: Request) -> str:
    return str(request.base_url).rstrip("/")


@router.get("/ambientes", response_model=list[AmbienteColaborativoResponseSchema])
async def listar_ambientes(
    request: Request,
    _user: SessionUser = Depends(require_authenticated),
) -> list[AmbienteColaborativoResponseSchema]:
    try:
        return service.listar_ambientes(base_url=_base_url(request))
    except DatabaseUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.post("/ambientes", response_model=AmbienteColaborativoResponseSchema, status_code=201)
async def criar_ambiente(
    body: AmbienteColaborativoCreateSchema,
    request: Request,
    _user: SessionUser = Depends(require_analyst),
) -> AmbienteColaborativoResponseSchema:
    """Cria ambiente colaborativo com convites e prazo."""
    try:
        return service.criar_ambiente(body, base_url=_base_url(request))
    except DemandaValidationError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except DatabaseUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.patch("/ambientes/{ambiente_id}", response_model=AmbienteColaborativoResponseSchema)
async def atualizar_ambiente(
    ambiente_id: str,
    body: AmbienteColaborativoUpdateSchema,
    request: Request,
    _user: SessionUser = Depends(require_analyst),
) -> AmbienteColaborativoResponseSchema:
    try:
        return service.atualizar_ambiente(ambiente_id, body, base_url=_base_url(request))
    except DemandaValidationError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except DatabaseUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


# Rotas com sufixo fixo registradas antes de "/ambientes/{tipo}/{codigo}"
# para não serem capturadas pela rota genérica de dois segmentos.
@router.get(
    "/hierarquizacoes/{hierarquizacao_id}/ambientes",
    response_model=list[AmbienteColaborativoResponseSchema],
)
async def listar_ambientes_hierarquizacao(
    hierarquizacao_id: UUID,
    request: Request,
    _user: SessionUser = Depends(require_authenticated),
) -> list[AmbienteColaborativoResponseSchema]:
    """Lista todos os julgamentos colaborativos de uma hierarquização."""
    try:
        return service.listar_ambientes_hierarquizacao(hierarquizacao_id, base_url=_base_url(request))
    except DemandaValidationError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except DatabaseUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.get("/ambientes/{ambiente_id}/respostas", response_model=list[RespostaColaborativaResponseSchema])
async def listar_respostas(
    ambiente_id: str,
    _user: SessionUser = Depends(require_authenticated),
) -> list[RespostaColaborativaResponseSchema]:
    """Lista respostas recebidas (gestor da análise)."""
    try:
        return service.listar_respostas(ambiente_id)
    except DemandaValidationError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except DatabaseUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.get("/ambientes/{ambiente_id}", response_model=AmbienteColaborativoResponseSchema)
async def obter_ambiente_id(
    ambiente_id: str,
    request: Request,
    _user: SessionUser = Depends(require_authenticated),
) -> AmbienteColaborativoResponseSchema:
    """Obtém todas as informações persistidas do ambiente colaborativo."""
    try:
        return service.obter_ambiente_id(ambiente_id, base_url=_base_url(request))
    except DemandaValidationError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except DatabaseUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.post("/ambientes/{ambiente_id}/consolidar", response_model=AmbienteColaborativoResponseSchema)
async def consolidar_ambiente(
    ambiente_id: str,
    request: Request,
    _user: SessionUser = Depends(require_analyst),
) -> AmbienteColaborativoResponseSchema:
    """Consolida as respostas consistentes por média geométrica (AIJ)."""
    try:
        return service.consolidar_ambiente(ambiente_id, base_url=_base_url(request))
    except DemandaValidationError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except DatabaseUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.get("/hierarquizacoes/{hierarquizacao_id}/ambiente", response_model=AmbienteColaborativoResponseSchema)
async def obter_ambiente_hierarquizacao(
    hierarquizacao_id: UUID,
    request: Request,
    _user: SessionUser = Depends(require_authenticated),
) -> AmbienteColaborativoResponseSchema:
    """Obtém o ambiente colaborativo mais recente de uma configuração."""
    try:
        amb = service.obter_ambiente_hierarquizacao(hierarquizacao_id, base_url=_base_url(request))
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
