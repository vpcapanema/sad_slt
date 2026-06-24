"""Rotas HTTP — proxy SIGMA (somente leitura)."""
from __future__ import annotations

import httpx
from fastapi import APIRouter, HTTPException

from api.sigma_proxy import fetch_instituicoes, fetch_pessoas_sigma

router = APIRouter(tags=["sigma"])


@router.get("/instituicoes")
async def api_instituicoes():
    try:
        data = await fetch_instituicoes()
        return {"source": "sigma", "data": data}
    except httpx.HTTPError as exc:
        raise HTTPException(502, f"SIGMA indisponível: {exc}") from exc


@router.get("/pessoas")
async def api_pessoas():
    try:
        data = await fetch_pessoas_sigma()
        return {"source": "sigma", "data": data}
    except httpx.HTTPError as exc:
        raise HTTPException(502, f"SIGMA indisponível: {exc}") from exc
