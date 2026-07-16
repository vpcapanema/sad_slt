"""Rotas HTTP — painéis de acompanhamento."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from api.deps.auth import require_authenticated
from api.exceptions import DatabaseUnavailableError
from api.schemas.painel import PainelDemandaSchema
from api.services import painel_service

router = APIRouter(prefix="/painel", tags=["painel"])


@router.get("/demandas", response_model=list[PainelDemandaSchema])
async def listar_demandas_painel() -> list[PainelDemandaSchema]:
    """Lista todas as demandas do painel, sem dados pessoais no detalhamento."""
    try:
        return painel_service.listar_demandas_painel(public_only=True)
    except DatabaseUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.get("/demandas/internas", response_model=list[PainelDemandaSchema])
async def listar_demandas_painel_interno(
    _user=Depends(require_authenticated),
) -> list[PainelDemandaSchema]:
    """Lista interna completa para os operadores autenticados."""
    try:
        return painel_service.listar_demandas_painel(public_only=False)
    except DatabaseUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
