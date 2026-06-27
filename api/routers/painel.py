"""Rotas HTTP — painéis de acompanhamento."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException

from api.exceptions import DatabaseUnavailableError
from api.schemas.painel import PainelDemandaSchema
from api.services import painel_service

router = APIRouter(prefix="/painel", tags=["painel"])


@router.get("/demandas", response_model=list[PainelDemandaSchema])
async def listar_demandas_painel() -> list[PainelDemandaSchema]:
    """Lista planos, programas e projetos com geometria para os painéis."""
    try:
        return painel_service.listar_demandas_painel()
    except DatabaseUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
