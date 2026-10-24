from contextlib import contextmanager

from fastapi import FastAPI
from fastapi.testclient import TestClient

from api.exceptions import DatabaseUnavailableError
from api.routers import dominios
from api.repositories import dominio_repository


def test_endpoint_lista_familias_com_tipos_sem_tratamento_configuravel(monkeypatch):
    monkeypatch.setattr(dominio_repository, "list_adversidades", lambda: [{
        "codigo": "perigo_fisico_geotecnico",
        "nome": "Perigos físicos e geotécnicos",
        "conceito": "Condições físicas.",
        "ordem": 10,
        "tipos": [{
            "codigo": "inundacao",
            "nome": "Inundação",
            "conceito": "Área suscetível a inundação.",
            "ordem": 10,
        }],
    }])
    app = FastAPI()
    app.include_router(dominios.router, prefix="/api")

    with TestClient(app) as client:
        response = client.get("/api/dominios/adversidades")

    assert response.status_code == 200
    assert response.json() == [{
        "codigo": "perigo_fisico_geotecnico",
        "nome": "Perigos físicos e geotécnicos",
        "conceito": "Condições físicas.",
        "ordem": 10,
        "tipos": [{
            "codigo": "inundacao",
            "nome": "Inundação",
            "conceito": "Área suscetível a inundação.",
            "ordem": 10,
        }],
    }]


def test_endpoint_expõe_indisponibilidade_do_banco(monkeypatch):
    def falha():
        raise DatabaseUnavailableError("Banco indisponível.")

    monkeypatch.setattr(dominio_repository, "list_adversidades", falha)
    app = FastAPI()
    app.include_router(dominios.router, prefix="/api")

    with TestClient(app) as client:
        response = client.get("/api/dominios/adversidades")

    assert response.status_code == 503
    assert response.json()["detail"] == "Banco indisponível."


def test_repository_monta_hierarquia_e_filtra_registros_inativos(monkeypatch):
    consulta = []

    class Conexao:
        def execute(self, query):
            consulta.append(query)
            return self

        def fetchall(self):
            return [
                {
                    "familia_codigo": "perigo_fisico_geotecnico",
                    "familia_nome": "Perigos físicos e geotécnicos",
                    "familia_conceito": "Condições físicas.",
                    "familia_ordem": 10,
                    "tipo_codigo": "inundacao",
                    "tipo_nome": "Inundação",
                    "tipo_conceito": "Área suscetível a inundação.",
                    "tipo_ordem": 10,
                },
                {
                    "familia_codigo": "perigo_fisico_geotecnico",
                    "familia_nome": "Perigos físicos e geotécnicos",
                    "familia_conceito": "Condições físicas.",
                    "familia_ordem": 10,
                    "tipo_codigo": None,
                    "tipo_nome": None,
                    "tipo_conceito": None,
                    "tipo_ordem": None,
                },
            ]

    @contextmanager
    def conectar():
        yield Conexao()

    monkeypatch.setattr(dominio_repository, "get_connection", conectar)

    resultado = dominio_repository.list_adversidades()

    assert len(resultado) == 1
    assert resultado[0]["codigo"] == "perigo_fisico_geotecnico"
    assert resultado[0]["tipos"] == [{
        "codigo": "inundacao",
        "nome": "Inundação",
        "conceito": "Área suscetível a inundação.",
        "ordem": 10,
    }]
    assert "f.ativo = TRUE" in consulta[0]
    assert "t.ativo = TRUE" in consulta[0]
    assert "risco" not in consulta[0].lower()
    assert "restricao" not in consulta[0].lower()
