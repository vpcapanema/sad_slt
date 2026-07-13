"""
Servidor SLT — estáticos + API local.

SIGMA: somente LEITURA. Demandas: banco PostgreSQL SLT (demandas.projeto).
"""
from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from api.routers import api_router

ROOT = Path(__file__).resolve().parent.parent

app = FastAPI(title="SLT — Apoio à Tomada de Decisão", version="1.1.0")


@app.exception_handler(ValueError)
@app.exception_handler(RuntimeError)
@app.exception_handler(NotImplementedError)
async def handle_processing_error(_request: Request, exc: Exception) -> JSONResponse:
    """Converte erros de contrato/processamento em resposta legível para o componente."""
    return JSONResponse(status_code=422, content={"detail": str(exc)})

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)
app.mount("/", StaticFiles(directory=str(ROOT), html=True), name="static")


if __name__ == "__main__":
    import os
    import uvicorn

    from api.config import get_settings

    port = get_settings().port
    uvicorn.run("api.server:app", host="127.0.0.1", port=port, reload=False)
