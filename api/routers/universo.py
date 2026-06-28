"""Rotas HTTP — universo de demandas elegíveis ao AHP (por tipo).

Um endpoint por tipo de demanda (plano/programa/projeto), consumido pelo wizard
de Hierarquização de Demandas e pelo configurador AHP (universo amostral).
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query

from api.deps.auth import require_gestor
from api.exceptions import DatabaseUnavailableError, DemandaValidationError
from api.schemas.universo import CampoUniversoSchema, UniversoItemSchema
from api.services import universo_service
from api.services.session_service import SessionUser

router = APIRouter(prefix="/ahp/universo", tags=["ahp-universo"])


@router.get("/{tipo}/campos", response_model=list[CampoUniversoSchema])
async def listar_campos(
    tipo: str,
    _user: SessionUser = Depends(require_gestor),
) -> list[CampoUniversoSchema]:
    try:
        return universo_service.listar_campos(tipo)
    except DemandaValidationError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except DatabaseUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.get("/{tipo}", response_model=list[UniversoItemSchema])
async def listar_universo(
    tipo: str,
    status: str | None = Query(None),
    _user: SessionUser = Depends(require_gestor),
) -> list[UniversoItemSchema]:
    try:
        return universo_service.listar_universo(tipo, status=status)
    except DemandaValidationError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except DatabaseUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
