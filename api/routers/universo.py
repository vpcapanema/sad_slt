"""Rotas HTTP — universo de demandas elegíveis ao AHP (por tipo).

Um endpoint por tipo de demanda (plano/programa/projeto), consumido pelo wizard
de Hierarquização de Demandas.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query

from api.deps.auth import require_gestor
from api.exceptions import DatabaseUnavailableError, DemandaValidationError
from api.schemas.universo import UniversoItemSchema
from api.services import universo_service
from api.services.session_service import SessionUser

router = APIRouter(prefix="/ahp/universo", tags=["ahp-universo"])


@router.get("/{tipo}", response_model=list[UniversoItemSchema])
async def listar_universo(
    tipo: str,
    status: str | None = Query(None),
    grupo: str | None = Query(None, description="Conjunto comparável (pai): diretoria/plano/programa"),
    _user: SessionUser = Depends(require_gestor),
) -> list[UniversoItemSchema]:
    try:
        return universo_service.listar_universo(tipo, status=status, grupo=grupo)
    except DemandaValidationError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except DatabaseUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
