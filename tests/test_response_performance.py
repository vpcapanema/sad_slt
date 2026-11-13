import asyncio
import json
from threading import Event

import httpx
from fastapi import FastAPI
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from starlette.requests import Request

from api.deps import auth
from api.responses import model_json_response
from api.schemas.painel import PainelDemandaSchema
from api.services.session_service import SessionUser


def test_json_direto_preserva_contrato_e_coordenadas():
    item = PainelDemandaSchema(
        id="P-1", tipo="projeto", status="analise_aprovada", criadoEm="2026-11-13", nome="São Paulo",
        dados_origem={"campos": {"Código": "001"}},
        geometria={"tipo": "LineString", "coordinates": [[-46.123456789, -23.123456789], [-45, -22]]},
    )
    response = model_json_response([item], list[PainelDemandaSchema])
    assert response.media_type == "application/json"
    assert json.loads(response.body) == jsonable_encoder([item], by_alias=True)
    # A resposta direta continua removendo campos fora do contrato.
    raw = {**item.model_dump(), "campo_interno": "nao publicar"}
    assert "campo_interno" not in json.loads(model_json_response([raw], list[PainelDemandaSchema]).body)[0]


def test_sessao_reutilizada_so_na_mesma_requisicao(monkeypatch):
    calls = []
    user = SessionUser("id", "", "teste_admin", "Teste", "ADMIN")
    def parse(token):
        calls.append(token)
        return user if len(calls) == 1 else None
    monkeypatch.setattr(auth, "parse_token", parse)
    request = Request({"type": "http", "headers": []})
    assert auth.get_optional_session(request, "token") is user
    assert auth.get_optional_session(request, "token") is user
    # Uma nova requisicao reconsulta revogacao/bloqueio; nenhum cache temporal.
    another = Request({"type": "http", "headers": []})
    assert auth.get_optional_session(another, "token") is None
    assert calls == ["token", "token"]


def test_guarda_de_pagina_nao_bloqueia_outras_rotas(monkeypatch):
    from api import server
    entered, release = Event(), Event()
    def session(*args):
        entered.set()
        release.wait(timeout=3)
        return None
    monkeypatch.setattr(server, "get_optional_session", session)
    app = FastAPI()
    app.middleware("http")(server.protect_restricted_pages)
    @app.get("/probe")
    async def probe():
        return JSONResponse({"waiting": not release.is_set()})

    async def check():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
            waiting = asyncio.create_task(client.get("/restrict/test/"))
            try:
                assert await asyncio.to_thread(entered.wait, 1)
                response = await asyncio.wait_for(client.get("/probe"), timeout=1)
                assert response.json() == {"waiting": True}
            finally:
                release.set()
                assert (await waiting).status_code == 303
    asyncio.run(check())
