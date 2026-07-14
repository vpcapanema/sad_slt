"""
Servidor SLT — estáticos + API local.

SIGMA: somente LEITURA. Demandas: banco PostgreSQL SLT (demandas.projeto).
"""
from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from api.path_policy import PROJECT_ROOT, project_path
from api.routers import api_router

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


@app.get("/geoespacial/gerador-risco-restricao", include_in_schema=False)
async def pagina_gerador_risco_restricao() -> FileResponse:
    """Página canônica do módulo gerador de risco e restrição."""
    return FileResponse(project_path("geoespacial/gerador-risco-restricao.html"))


@app.get("/geoespacial/gerador-favorabilidade", include_in_schema=False)
async def pagina_gerador_favorabilidade() -> FileResponse:
    """Página canônica do módulo gerador da superfície de favorabilidade."""
    return FileResponse(project_path("geoespacial/gerador-favorabilidade.html"))


app.mount("/", StaticFiles(directory=str(PROJECT_ROOT), html=True), name="static")


if __name__ == "__main__":
    import os
    import uvicorn

    from api.config import get_settings

    port = get_settings().port
    uvicorn.run("api.server:app", host="127.0.0.1", port=port, reload=False)
