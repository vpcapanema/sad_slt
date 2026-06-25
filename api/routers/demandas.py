"""Rotas HTTP — demandas."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from api.deps.auth import require_gestor
from api.exceptions import DatabaseUnavailableError, DemandaNotFoundError, DemandaValidationError
from api.schemas.demanda import DemandaCreateSchema, DemandaResponseSchema, DemandaUpdateSchema
from api.schemas.objeto_ahp import AprovarDemandaSchema, ObjetoAhpResponseSchema
from api.services import demanda_service, objeto_ahp_service
from api.services.session_service import SessionUser

router = APIRouter(prefix="/demandas", tags=["demandas"])


@router.post("", response_model=DemandaResponseSchema, status_code=201)
async def criar_demanda(body: DemandaCreateSchema) -> DemandaResponseSchema:
    """Cria uma nova demanda de projeto."""
    try:
        return demanda_service.criar_demanda(body)
    except DemandaValidationError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except DatabaseUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.get("", response_model=list[DemandaResponseSchema])
async def listar_demandas() -> list[DemandaResponseSchema]:
    """Lista as demandas cadastradas."""
    try:
        return demanda_service.listar_demandas()
    except DatabaseUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.get("/{codigo}", response_model=DemandaResponseSchema)
async def obter_demanda(codigo: str) -> DemandaResponseSchema:
    """Obtém os detalhes de uma demanda pelo código."""
    try:
        return demanda_service.obter_demanda(codigo)
    except DemandaNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except DatabaseUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.post("/{codigo}/aprovar", response_model=ObjetoAhpResponseSchema, status_code=201)
async def aprovar_demanda(
    codigo: str,
    body: AprovarDemandaSchema | None = None,
    user: SessionUser = Depends(require_gestor),
) -> ObjetoAhpResponseSchema:
    """Aprova demanda e insere objeto em ahp.objeto_ahp (única fonte do módulo AHP)."""
    motivo = body.motivo if body else None
    aprovado_por = (body.aprovado_por if body else None) or user.id
    try:
        return objeto_ahp_service.aprovar_demanda(
            codigo,
            motivo=motivo,
            aprovado_por=aprovado_por,
        )
    except DemandaNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except DemandaValidationError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except DatabaseUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.patch("/{codigo}", response_model=DemandaResponseSchema)
async def atualizar_demanda(
    codigo: str,
    body: DemandaUpdateSchema,
    _user: SessionUser = Depends(require_gestor),
) -> DemandaResponseSchema:
    """Atualiza uma demanda existente."""
    try:
        return demanda_service.atualizar_demanda(codigo, body)
    except DemandaNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except DemandaValidationError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except DatabaseUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
