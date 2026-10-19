from contextlib import contextmanager
from uuid import uuid4

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from psycopg.errors import ForeignKeyViolation

from api.routers import admin_tabelas as api


@pytest.fixture
def exclusao(monkeypatch):
    livre, vinculado = str(uuid4()), str(uuid4())

    class Conexao:
        def __init__(self):
            self.salvos = {livre, vinculado}
            self.pendentes = set(self.salvos)
            self.vinculos = [{
                "grupo_codigo": "AGR-2", "grupo_nome": "Grupo vinculado",
                "hierarquizacao_codigo": "HIER-1", "hierarquizacao_nome": "Rodovias Regionais",
            }]
            self.consultas = []
            self.commits = 0
            self.rollbacks = 0
            self.rowcount = 0
            self.corrida = False

        def execute(self, query, params):
            texto = query if isinstance(query, str) else query.as_string()
            self.consultas.append((texto, params))
            if "hierarquizacao_portfolio" in texto:
                return self
            assert texto == 'DELETE FROM "demandas"."grupos_demandas" WHERE "id" = %(id)s'
            if params["id"] == vinculado and (self.vinculos or self.corrida):
                raise ForeignKeyViolation('hierarquizacao_portfolio_grupo_demanda_id_fkey DETAIL')
            self.rowcount = int(params["id"] in self.pendentes)
            self.pendentes.discard(params["id"])
            return self

        def fetchall(self):
            return self.vinculos if vinculado in self.consultas[-1][1][0] else []

        def commit(self):
            self.commits += 1
            self.salvos = set(self.pendentes)

        def rollback(self):
            self.rollbacks += 1
            self.pendentes = set(self.salvos)

    conn = Conexao()

    @contextmanager
    def conectar():
        yield conn

    monkeypatch.setattr(api, "get_connection", conectar)
    monkeypatch.setattr(api, "_tabela_existe", lambda *_: True)
    monkeypatch.setattr(api, "_colunas", lambda *_: [
        {"column_name": "id", "data_type": "uuid", "udt_name": "uuid"},
    ])
    monkeypatch.setattr(api, "_chave_primaria", lambda *_: ["id"])
    monkeypatch.setattr(api, "_arquivos_da_linha", lambda *_: set())
    app = FastAPI()
    app.include_router(api.router)
    app.dependency_overrides[api.require_admin] = lambda: object()
    with TestClient(app) as client:
        yield client, conn, livre, vinculado


def excluir(client, ids):
    return client.request("DELETE", "/admin/tabelas/demandas/grupos_demandas",
                          json={"chaves": [{"id": str(value)} for value in ids]})


def test_vinculo_retorna_conflito_amigavel_sem_excluir_nenhum_grupo(exclusao):
    client, conn, livre, vinculado = exclusao
    response = excluir(client, [livre, vinculado])
    assert response.status_code == 409
    mensagem = response.json()["detail"]
    for nome in ("Grupo vinculado", "AGR-2", "Rodovias Regionais", "HIER-1"):
        assert nome in mensagem
    assert "Nenhum agrupamento foi excluído" in mensagem
    assert "foreign key" not in mensagem and "_fkey" not in mensagem
    assert conn.salvos == {livre, vinculado}
    assert conn.commits == 0
    assert not any(texto.startswith("DELETE") for texto, _ in conn.consultas)
    assert conn.consultas[0][1] == ([livre, vinculado],)


def test_grupo_livre_exclui_apenas_id_selecionado(exclusao):
    client, conn, livre, vinculado = exclusao
    response = excluir(client, [livre])
    assert response.status_code == 200
    assert response.json()["removidos"] == 1
    assert conn.salvos == {vinculado}
    assert conn.commits == 1


def test_vinculo_concorrente_desfaz_lote_e_nao_expoe_sql(exclusao):
    client, conn, livre, vinculado = exclusao
    conn.vinculos = []
    conn.corrida = True
    response = excluir(client, [livre, vinculado])
    assert response.status_code == 409
    assert "Nenhum agrupamento foi excluído" in response.json()["detail"]
    assert "_fkey" not in response.text and "DETAIL" not in response.text
    assert conn.salvos == conn.pendentes == {livre, vinculado}
    assert conn.commits == 0 and conn.rollbacks == 1


def test_chave_incompleta_nao_inicia_exclusao(exclusao):
    client, conn, livre, vinculado = exclusao
    response = client.request("DELETE", "/admin/tabelas/demandas/grupos_demandas",
                              json={"chaves": [{"id": str(livre)}, {"nome": "incorreto"}]})
    assert response.status_code == 422
    assert conn.salvos == {livre, vinculado}
    assert conn.commits == 0
    assert conn.consultas == []


def test_rota_continua_exigindo_administrador(exclusao):
    client, conn, livre, _ = exclusao
    client.app.dependency_overrides.clear()
    response = excluir(client, [livre])
    assert response.status_code in (401, 403)
    assert conn.consultas == []
