"""Rotas HTTP — proxy SIGMA (somente leitura)."""
from __future__ import annotations

import httpx
from fastapi import APIRouter, HTTPException, Depends, Query
from api.deps.auth import require_authenticated
from api.services.session_service import SessionUser

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
async def api_pessoas(
    _user: SessionUser = Depends(require_authenticated),
    page: int = Query(1, ge=1),
    limit: int = Query(100, ge=1, le=200),
):
    try:
        data = await fetch_pessoas_sigma()
        inicio = (page - 1) * limit
        # A mesma projeção protege inclusive o fallback PostgreSQL.
        campos = ("id", "nome_completo", "email", "telefone")
        return {"source": "sigma", "data": [
            {key: item.get(key) for key in campos} for item in data[inicio:inicio + limit]
        ], "page": page, "pages": max(1, (len(data) + limit - 1) // limit)}
    except httpx.HTTPError as exc:
        raise HTTPException(502, f"SIGMA indisponível: {exc}") from exc
