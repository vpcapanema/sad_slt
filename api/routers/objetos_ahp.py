"""Rotas HTTP — objetos AHP (universo da hierarquização)."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query

from api.deps.auth import require_gestor
from api.exceptions import DatabaseUnavailableError, DemandaNotFoundError, DemandaValidationError
from api.schemas.objeto_ahp import ObjetoAhpResponseSchema, ObjetoAhpUpdateSchema
from api.services import objeto_ahp_service
from api.services.session_service import SessionUser

router = APIRouter(prefix="/ahp/objetos", tags=["ahp"])


@router.get("", response_model=list[ObjetoAhpResponseSchema])
async def listar_objetos(
    status: str | None = Query(None, description="Filtrar por status (ex.: elegivel_ahp)"),
    grupo: str | None = Query(None, description="Filtrar por grupo_comparacao"),
    _user: SessionUser = Depends(require_gestor),
) -> list[ObjetoAhpResponseSchema]:
    try:
        return objeto_ahp_service.listar_objetos(status=status, grupo=grupo)
    except DatabaseUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.get("/{codigo}", response_model=ObjetoAhpResponseSchema)
async def obter_objeto(
    codigo: str,
    _user: SessionUser = Depends(require_gestor),
) -> ObjetoAhpResponseSchema:
    try:
        return objeto_ahp_service.obter_objeto(codigo)
    except DemandaNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except DatabaseUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.patch("/{codigo}", response_model=ObjetoAhpResponseSchema)
async def atualizar_objeto(
    codigo: str,
    body: ObjetoAhpUpdateSchema,
    _user: SessionUser = Depends(require_gestor),
) -> ObjetoAhpResponseSchema:
    try:
        return objeto_ahp_service.atualizar_objeto(codigo, body)
    except DemandaNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except DemandaValidationError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except DatabaseUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
