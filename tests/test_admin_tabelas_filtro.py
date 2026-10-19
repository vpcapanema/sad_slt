from contextlib import contextmanager

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from api.routers import admin_tabelas as api


@pytest.fixture
def filtro(monkeypatch):
    consultas = []

    class Conexao:
        def execute(self, query, params=None):
            consultas.append((query.as_string(), params))
            return self

        def fetchone(self):
            return {"total": 1}

        def fetchall(self):
            return [{"nome": "Projeto Municipal"}]

    @contextmanager
    def conectar():
        yield Conexao()

    monkeypatch.setattr(api, "get_connection", conectar)
    monkeypatch.setattr(api, "_tabela_existe", lambda *_: True)
    monkeypatch.setattr(api, "_colunas", lambda *_: [
        {"column_name": "nome", "data_type": "text", "udt_name": "text",
         "is_nullable": "YES", "column_default": None},
        {"column_name": "id", "data_type": "uuid", "udt_name": "uuid",
         "is_nullable": "NO", "column_default": None},
    ])
    monkeypatch.setattr(api, "_chave_primaria", lambda *_: ["id"])
    app = FastAPI()
    app.include_router(api.router)
    app.dependency_overrides[api.require_admin] = lambda: object()
    with TestClient(app) as client:
        yield client, consultas


@pytest.mark.parametrize("valor", ["municip", "MUNICIP", "%_", "a\\b", "' OR 1=1 --", "__vazias__"])
def test_contem_e_literal_parametrizado_e_usado_na_contagem_e_paginacao(filtro, valor):
    client, consultas = filtro
    response = client.get("/admin/tabelas/demandas/teste", params={
        "filtro_coluna": "nome", "filtro_tipo": "contem", "filtro_valor": valor,
        "pagina": 2, "por_pagina": 15,
    })
    assert response.status_code == 200
    condicao = ' WHERE (strpos(lower(CAST("nome" AS text)), lower(%s)) > 0)'
    assert consultas[0] == ('SELECT count(*) AS total FROM "demandas"."teste"' + condicao, [valor])
    assert condicao in consultas[2][0]
    assert consultas[2][1] == [valor, 15, 15]
    assert response.json()["filtro"]["valor"] == valor
    assert "LIKE" not in consultas[0][0]


def test_inversao_inclui_nulos_no_complemento_da_busca(filtro):
    client, consultas = filtro
    response = client.get("/admin/tabelas/demandas/teste", params={
        "filtro_coluna": "nome", "filtro_tipo": "contem", "filtro_valor": "municip",
        "filtro_inverter": True,
    })
    assert response.status_code == 200
    assert 'WHERE NOT COALESCE((strpos(lower(CAST("nome" AS text)), lower(%s)) > 0), FALSE)' in consultas[0][0]
    assert consultas[0][1] == ["municip"]


@pytest.mark.parametrize("inverter", [False, True])
def test_preserva_filtro_exato_para_outros_consumidores(filtro, inverter):
    client, consultas = filtro
    response = client.get("/admin/tabelas/demandas/teste", params={
        "filtro_coluna": "nome", "filtro_valor": "Projeto", "filtro_inverter": inverter,
    })
    assert response.status_code == 200
    operador = "IS DISTINCT FROM" if inverter else "="
    assert f'CAST("nome" AS text) {operador} %s' in consultas[0][0]
    assert consultas[0][1] == ["Projeto"]


@pytest.mark.parametrize("inverter", [False, True])
def test_preserva_filtro_de_vazias(filtro, inverter):
    client, consultas = filtro
    response = client.get("/admin/tabelas/demandas/teste", params={
        "filtro_coluna": "nome", "filtro_tipo": "vazias", "filtro_inverter": inverter,
    })
    assert response.status_code == 200
    prefixo = "NOT " if inverter else ""
    assert f"""WHERE {prefixo}("nome" IS NULL OR CAST("nome" AS text) = '')""" in consultas[0][0]
    assert consultas[0][1] == []


def test_busca_parcial_em_identificador_por_representacao_textual(filtro):
    client, consultas = filtro
    response = client.get("/admin/tabelas/demandas/teste", params={
        "filtro_coluna": "id", "filtro_tipo": "contem", "filtro_valor": "ab12",
    })
    assert response.status_code == 200
    assert 'strpos(lower(CAST("id" AS text)), lower(%s))' in consultas[0][0]


def test_operador_invalido_e_rejeitado_antes_de_consultar(filtro):
    client, consultas = filtro
    response = client.get("/admin/tabelas/demandas/teste", params={"filtro_tipo": "invalido"})
    assert response.status_code == 422
    assert consultas == []
