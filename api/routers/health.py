"""Rotas HTTP — saúde da API."""
from __future__ import annotations

from fastapi import APIRouter

from api.health_checks import run_ready_checks
from api.sigma_proxy import SIGMA_BASE

router = APIRouter(tags=["health"])


@router.get("/health")
async def health():
    return {
        "status": "ok",
        "sigma_base": SIGMA_BASE,
        "sigma_mode": "read_only",
        "slt_db": "cadastro.cadastro_demanda",
    }


@router.get("/health/ready")
async def health_ready():
    return await run_ready_checks()
