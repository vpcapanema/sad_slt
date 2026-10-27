"""Regressão do tratamento central de erros (422, HTTP genérico e 500)."""
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from pydantic import BaseModel, Field

from api.error_handlers import registrar_tratadores, sanitizar


class Corpo(BaseModel):
    nome: str = Field(min_length=3)
    idade: int


def _client() -> TestClient:
    app = FastAPI()
    registrar_tratadores(app)

    @app.post("/c")
    def criar(corpo: Corpo):
        return {"ok": True}

    @app.get("/q")
    def consultar(limite: int = 1):
        return {"limite": limite}

    @app.get("/nf")
    def nf():
        raise HTTPException(404)

    @app.get("/esp")
    def esp():
        raise HTTPException(409, "Camada já existe: abc.gpkg")

    @app.get("/boom")
    def boom():
        raise KeyError("postgresql://u:segredo123@host/db")

    @app.get("/dominio")
    def dominio():
        from api.exceptions import DemandaValidationError
        try:
            raise DemandaValidationError("O prazo deve ser futuro.", field="valido_ate", sugestao="Informe data futura.")
        except DemandaValidationError as exc:
            raise HTTPException(422, str(exc)) from exc

    return TestClient(app, raise_server_exceptions=False)


def test_422_corpo_traz_campo_valor_e_motivo():
    r = _client().post("/c", json={"nome": "ab", "idade": "x"})
    assert r.status_code == 422
    corpo = r.json()
    assert isinstance(corpo["detail"], list)
    por_campo = {i["campo"]: i for i in corpo["detail"]}
    assert por_campo["nome"]["valor_recebido"] == "ab"
    assert "texto curto demais" in por_campo["nome"]["mensagem"]
    assert por_campo["idade"]["loc"] == ["body", "idade"] and por_campo["idade"]["msg"]
    assert "POST /c" in corpo["message"] and "HTTP 422" in corpo["message"]


def test_422_campo_ausente_e_query():
    c = _client()
    assert "campo obrigatório ausente" in c.post("/c", json={}).json()["detail"][0]["mensagem"]
    item = c.get("/q?limite=abc").json()["detail"][0]
    assert item["campo"] == "limite" and item["valor_recebido"] == "abc"


def test_http_generico_vira_mensagem_especifica_e_detail_proprio_e_preservado():
    c = _client()
    nf = c.get("/nf").json()
    assert "GET /nf" in nf["detail"] and "HTTP 404" in nf["detail"]
    assert c.get("/esp").json()["detail"] == "Camada já existe: abc.gpkg"


def test_erro_de_dominio_repassa_campo_e_sugestao():
    corpo = _client().get("/dominio").json()
    assert corpo["message"] == "O prazo deve ser futuro."
    assert corpo["campo"] == "valido_ate" and corpo["sugestao"] == "Informe data futura."


def test_500_informa_causa_sem_segredo_nem_stack():
    r = _client().get("/boom")
    assert r.status_code == 500
    detalhe = r.json()["detail"]
    assert "KeyError" in detalhe and "GET /boom" in detalhe
    assert "segredo123" not in detalhe and "Traceback" not in detalhe


def test_sanitizar_mascara_credenciais():
    assert "abc123" not in sanitizar("password=abc123 falhou")
    assert "pw" not in sanitizar("postgresql://user:pw@host/db")
