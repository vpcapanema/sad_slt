"""Rotas dos agrupamentos reutilizáveis de demandas."""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

from api.deps.auth import require_authenticated, require_operator
from api.exceptions import DatabaseUnavailableError, DemandaNotFoundError, DemandaValidationError
from api.schemas.agrupamento_demanda import (
    AgrupamentoDemandaCreateSchema,
    AgrupamentoDemandaSchema,
    AgrupamentoDemandaSummarySchema,
)
from api.services import agrupamento_demanda_service as service
from api.services.session_service import SessionUser

router = APIRouter(prefix="/agrupamentos-demandas", tags=["agrupamentos-demandas"])


@router.get("", response_model=list[AgrupamentoDemandaSummarySchema])
def listar_agrupamentos(
    _user: SessionUser = Depends(require_authenticated),
) -> list[AgrupamentoDemandaSummarySchema]:
    try:
        return service.listar()
    except DatabaseUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.get("/{agrupamento_id}", response_model=AgrupamentoDemandaSchema)
def obter_agrupamento(
    agrupamento_id: UUID,
    _user: SessionUser = Depends(require_authenticated),
) -> AgrupamentoDemandaSchema:
    try:
        return service.obter(agrupamento_id)
    except DemandaNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except DatabaseUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.post("", response_model=AgrupamentoDemandaSchema, status_code=201)
def criar_agrupamento(
    body: AgrupamentoDemandaCreateSchema,
    user: SessionUser = Depends(require_operator),
) -> AgrupamentoDemandaSchema:
    try:
        return service.criar(body, user=user)
    except DemandaValidationError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except DatabaseUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc