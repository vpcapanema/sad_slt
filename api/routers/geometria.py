"""Rotas HTTP — parse de geometria (upload)."""
from __future__ import annotations

from fastapi import APIRouter, File, HTTPException, UploadFile

from api.geometria_parser import parse_upload

router = APIRouter(tags=["geometria"])


@router.post("/geometria/parse")
async def api_geometria_parse(file: UploadFile = File(...)):
    content = await file.read()
    if len(content) > 50 * 1024 * 1024:
        raise HTTPException(413, "Arquivo maior que 50 MB.")
    try:
        return parse_upload(file.filename or "", content)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(400, f"Erro ao processar arquivo: {exc}") from exc
