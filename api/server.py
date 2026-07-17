"""
Servidor SLT — estáticos + API local.

SIGMA: somente LEITURA. Demandas: banco PostgreSQL SLT (demandas.projeto).
"""
from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse
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


@app.get("/favicon.ico", include_in_schema=False)
async def favicon() -> FileResponse:
    return FileResponse(
        project_path("assets/img/brand/sicard-simbolo.png"),
        media_type="image/png",
        headers={"Cache-Control": "public, max-age=86400"},
    )


@app.get("/assets/js/navbar.js", include_in_schema=False)
async def navbar_javascript() -> FileResponse:
    """Evita que uma versão obsoleta mantenha chamadas ao endpoint protegido."""
    return FileResponse(
        project_path("assets/js/navbar.js"),
        media_type="text/javascript",
        headers={"Cache-Control": "no-store"},
    )


@app.get("/assets/js/admin-api.js", include_in_schema=False)
async def admin_api_javascript() -> FileResponse:
    return FileResponse(
        project_path("assets/js/admin-api.js"),
        media_type="text/javascript",
        headers={"Cache-Control": "no-store"},
    )


@app.get("/restrict/login.js", include_in_schema=False)
async def admin_login_javascript() -> FileResponse:
    return FileResponse(
        project_path("admin/login.js"),
        media_type="text/javascript",
        headers={"Cache-Control": "no-store"},
    )


PUBLIC_CADASTRO_PAGES = {
    "nova-demanda": "nova-demanda.html",
    "catalogo-diretorias": "catalogo-diretorias.html",
    "catalogo-planos": "catalogo-planos.html",
    "catalogo-frentes-pli": "catalogo-frentes-pli.html",
    "catalogo-eixos-pef": "catalogo-eixos-pef.html",
}

RESTRICTED_PAGES = {
    "painel": "painel.html",
    "demandas": "demandas.html",
    "demanda": "demanda.html",
    "revisao-status": "revisao-status.html",
}


@app.get("/public/", include_in_schema=False)
async def pagina_inicial_publica() -> FileResponse:
    return FileResponse(project_path("index.html"))


@app.get("/public/cadastro/", include_in_schema=False)
async def pagina_indice_cadastro() -> FileResponse:
    return FileResponse(project_path("cadastro/index.html"))


@app.get("/public/cadastro/{pagina}/", include_in_schema=False)
async def pagina_publica_cadastro(pagina: str) -> FileResponse:
    arquivo = PUBLIC_CADASTRO_PAGES.get(pagina)
    if not arquivo:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Página pública não encontrada")
    return FileResponse(project_path(f"cadastro/{arquivo}"))


@app.get("/public/painel/", include_in_schema=False)
async def pagina_painel_publico() -> FileResponse:
    return FileResponse(project_path("painel/index.html"))


@app.get("/public/documentacao/", include_in_schema=False)
async def pagina_documentacao_publica() -> FileResponse:
    return FileResponse(project_path("documentacao/index.html"))


@app.get("/public/transparencia/", include_in_schema=False)
async def pagina_transparencia_publica() -> FileResponse:
    return FileResponse(project_path("transparencia/index.html"))


@app.get("/public/login/", include_in_schema=False)
async def pagina_login_publico() -> FileResponse:
    return FileResponse(project_path("admin/login.html"))


@app.get("/restrict/", include_in_schema=False)
async def pagina_inicial_restrita() -> FileResponse:
    return FileResponse(project_path("admin/index.html"))


@app.get("/restrict/hierarquizacao/", include_in_schema=False)
async def pagina_indice_hierarquizacao_restrita() -> FileResponse:
    return FileResponse(project_path("hierarquizacao/index.html"))


@app.get("/restrict/hierarquizacao/processos/", include_in_schema=False)
async def pagina_processos_hierarquizacao() -> FileResponse:
    return FileResponse(project_path("hierarquizacao/home.html"))


@app.get("/restrict/hierarquizacao/metodologia/", include_in_schema=False)
async def pagina_metodologia_hierarquizacao() -> FileResponse:
    return FileResponse(project_path("hierarquizacao/apresentacao-processo-hierarquizacao.html"))


@app.get("/restrict/hierarquizacao/fase-1/", include_in_schema=False)
async def pagina_fase_1_hierarquizacao() -> FileResponse:
    return FileResponse(project_path("hierarquizacao/fase1-elegibilidade.html"))


@app.get("/restrict/hierarquizacao/fase-2/", include_in_schema=False)
async def pagina_fase_2_hierarquizacao() -> FileResponse:
    return FileResponse(project_path("hierarquizacao/fase2-favorabilidade.html"))


@app.get("/restrict/hierarquizacao/fase-3/", include_in_schema=False)
async def pagina_fase_3_hierarquizacao() -> FileResponse:
    return FileResponse(project_path("hierarquizacao/fase3-ajuste-fino.html"))


@app.get("/restrict/ahp/", include_in_schema=False)
async def pagina_indice_ahp_restrita() -> FileResponse:
    return FileResponse(project_path("ahp/home.html"))


AHP_CLEAN_PAGES = {"configuracao": "step1-configuracao.html", "criterios": "step2-criterios.html", "metodo": "step4-metodo.html", "comparacao": "step5-comparacao.html", "resultados": "step6-resultados.html"}
AHP_CLEAN_PAGES.update(
    {
        "analise": "index.html",
        "nomes": "step3-nomes.html",
        "alternativas": "step7-alternativas.html",
    }
)


@app.get("/restrict/ahp/{pagina}/", include_in_schema=False)
async def pagina_ahp_limpa(pagina: str) -> FileResponse:
    arquivo = AHP_CLEAN_PAGES.get(pagina)
    if not arquivo:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Página AHP não encontrada")
    return FileResponse(project_path(f"ahp/{arquivo}"))


@app.get("/public/ahp/colaborativa/", include_in_schema=False)
async def pagina_ahp_colaborativa_publica() -> FileResponse:
    """Formulário público acessado pelo token de um convite AHP."""
    return FileResponse(project_path("ahp/colaborativa.html"))


HIERARQUIZACAO_PROCESS_PAGES = {
    "nova": "step1-config.html",
    "objetos": "step2-objetos.html",
    "avaliacao": "step3-avaliacao.html",
    "ranking": "step4-ranking.html",
    "homologacao": "step5-homologar.html",
}


@app.get("/restrict/hierarquizacao/processos/{pagina}/", include_in_schema=False)
async def pagina_processo_hierarquizacao(pagina: str) -> FileResponse:
    arquivo = HIERARQUIZACAO_PROCESS_PAGES.get(pagina)
    if not arquivo:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Etapa de hierarquização não encontrada")
    return FileResponse(project_path(f"hierarquizacao/{arquivo}"))


@app.get("/restrict/{pagina}/", include_in_schema=False)
async def pagina_restrita(pagina: str) -> FileResponse:
    # Esta rota genérica é declarada antes do catálogo geoespacial; trate o
    # índice explicitamente para preservar /restrict/geoespacial/ como canônica.
    if pagina == "geoespacial":
        return FileResponse(project_path("geoespacial/index.html"))
    arquivo = RESTRICTED_PAGES.get(pagina)
    if not arquivo:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Página restrita não encontrada")
    return FileResponse(project_path(f"admin/{arquivo}"))


LEGACY_PAGE_REDIRECTS = {
    "/": "/public/",
    "/index.html": "/public/",
    "/cadastro/": "/public/cadastro/",
    "/cadastro/nova-demanda.html": "/public/cadastro/nova-demanda/",
    "/cadastro/catalogo-diretorias.html": "/public/cadastro/catalogo-diretorias/",
    "/cadastro/catalogo-planos.html": "/public/cadastro/catalogo-planos/",
    "/cadastro/catalogo-frentes-pli.html": "/public/cadastro/catalogo-frentes-pli/",
    "/cadastro/catalogo-eixos-pef.html": "/public/cadastro/catalogo-eixos-pef/",
    "/painel/": "/public/painel/",
    "/documentacao/": "/public/documentacao/",
    "/admin/login.html": "/public/login/",
    "/admin/": "/restrict/",
    "/admin/index.html": "/restrict/",
    "/admin/painel.html": "/restrict/painel/",
    "/admin/demandas.html": "/restrict/demandas/",
    "/admin/demanda.html": "/restrict/demanda/",
    "/admin/revisao-status.html": "/restrict/revisao-status/",
    "/ahp/colaborativa.html": "/public/ahp/colaborativa/",
    "/restrict/ahp/index.html": "/restrict/ahp/analise/",
    "/restrict/ahp/step1-configuracao.html": "/restrict/ahp/configuracao/",
    "/restrict/ahp/step2-criterios.html": "/restrict/ahp/criterios/",
    "/restrict/ahp/step3-nomes.html": "/restrict/ahp/nomes/",
    "/restrict/ahp/step4-metodo.html": "/restrict/ahp/metodo/",
    "/restrict/ahp/step5-comparacao.html": "/restrict/ahp/comparacao/",
    "/restrict/ahp/step6-resultados.html": "/restrict/ahp/resultados/",
    "/restrict/ahp/step7-alternativas.html": "/restrict/ahp/alternativas/",
    "/restrict/hierarquizacao/step1-config.html": "/restrict/hierarquizacao/processos/nova/",
    "/restrict/hierarquizacao/step2-objetos.html": "/restrict/hierarquizacao/processos/objetos/",
    "/restrict/hierarquizacao/step3-avaliacao.html": "/restrict/hierarquizacao/processos/avaliacao/",
    "/restrict/hierarquizacao/step4-ranking.html": "/restrict/hierarquizacao/processos/ranking/",
    "/restrict/hierarquizacao/step5-homologar.html": "/restrict/hierarquizacao/processos/homologacao/",
    "/geoespacial": "/restrict/geoespacial/",
    "/geoespacial/": "/restrict/geoespacial/",
    "/geoespacial/index.html": "/restrict/geoespacial/",
    "/geoespacial/gerador-risco-restricao": "/restrict/geoespacial/gerador-risco-restricao/",
    "/geoespacial/gerador-risco-restricao.html": "/restrict/geoespacial/gerador-risco-restricao/",
    "/geoespacial/configuracao-risco-restricao": "/restrict/geoespacial/configuracao-risco-restricao/",
    "/geoespacial/configuracao-risco-restricao.html": "/restrict/geoespacial/configuracao-risco-restricao/",
    "/geoespacial/gerador-favorabilidade": "/restrict/geoespacial/gerador-favorabilidade/",
    "/geoespacial/gerador-favorabilidade.html": "/restrict/geoespacial/gerador-favorabilidade/",
    "/geoespacial/visualizador-inputs": "/restrict/geoespacial/visualizador-inputs/",
    "/geoespacial/visualizador-inputs.html": "/restrict/geoespacial/visualizador-inputs/",
    "/geoespacial/_geoprocessamento.html": "/restrict/geoespacial/bancada/",
    "/geoespacial/bancada": "/restrict/geoespacial/bancada/",
    "/geoespacial/produtos": "/restrict/geoespacial/produtos/",
    "/geoespacial/produtos.html": "/restrict/geoespacial/produtos/",
    "/geoespacial/configurador-ajuste": "/restrict/geoespacial/configurador-ajuste/",
    "/geoespacial/verificacao-fase3.html": "/restrict/geoespacial/configurador-ajuste/",
}


@app.middleware("http")
async def redirect_legacy_page_routes(request: Request, call_next):
    destination = LEGACY_PAGE_REDIRECTS.get(request.url.path)
    if destination:
        query = request.url.query
        url = f"{destination}?{query}" if query else destination
        return RedirectResponse(url=url, status_code=308)
    return await call_next(request)


GEOSPATIAL_PAGES = {
    "gerador-risco-restricao": "gerador-risco-restricao.html",
    "configuracao-risco-restricao": "configuracao-risco-restricao.html",
    "gerador-favorabilidade": "gerador-favorabilidade.html",
    "visualizador-inputs": "visualizador-inputs.html",
    "bancada": "_geoprocessamento.html",
    "produtos": "produtos.html",
    "configurador-ajuste": "verificacao-fase3.html",
}


@app.get("/restrict/geoespacial/", include_in_schema=False)
async def pagina_indice_geoespacial() -> FileResponse:
    return FileResponse(project_path("geoespacial/index.html"))


@app.get("/restrict/geoespacial/{pagina}/", include_in_schema=False)
async def pagina_geoespacial(pagina: str) -> FileResponse:
    arquivo = GEOSPATIAL_PAGES.get(pagina)
    if not arquivo:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Página geoespacial não encontrada")
    return FileResponse(project_path(f"geoespacial/{arquivo}"))


app.mount("/public/assets", StaticFiles(directory=str(project_path("assets"))), name="public-assets")
app.mount("/public/cadastro", StaticFiles(directory=str(project_path("cadastro")), html=True), name="public-cadastro-assets")
app.mount("/public/painel", StaticFiles(directory=str(project_path("painel")), html=True), name="public-painel-assets")
app.mount("/public/documentacao", StaticFiles(directory=str(project_path("documentacao")), html=True), name="public-documentacao-assets")
app.mount("/public/transparencia", StaticFiles(directory=str(project_path("transparencia")), html=True), name="public-transparencia-assets")
app.mount("/restrict/assets", StaticFiles(directory=str(project_path("assets"))), name="restricted-assets-shared")
app.mount("/restrict/hierarquizacao", StaticFiles(directory=str(project_path("hierarquizacao")), html=True), name="restricted-hierarquizacao-assets")
app.mount("/restrict/ahp", StaticFiles(directory=str(project_path("ahp")), html=True), name="restricted-ahp-assets")
app.mount("/restrict/geoespacial", StaticFiles(directory=str(project_path("geoespacial")), html=True), name="restricted-geospatial-assets")
app.mount("/restrict", StaticFiles(directory=str(project_path("admin")), html=True), name="restricted-assets")
app.mount("/", StaticFiles(directory=str(PROJECT_ROOT), html=True), name="static")


if __name__ == "__main__":
    import os
    import uvicorn

    from api.config import get_settings

    port = get_settings().port
    uvicorn.run("api.server:app", host="127.0.0.1", port=port, reload=False)
