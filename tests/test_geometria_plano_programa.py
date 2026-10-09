import json
"""Plano e programa materializam a própria geometria no cadastro.

A coluna copia fielmente a união das unidades espaciais selecionadas, ou
recebe a geometria desenhada em tela quando o payload a traz.
"""
from contextlib import contextmanager

import pytest

from api.repositories import geometria_historico_repository, plano_repository, programa_repository
from api.services.demanda_service import geometria_desenhada_geojson
from api.exceptions import DemandaValidationError
from api.schemas.demanda import GeometriaSchema


class _Cursor:
    def __init__(self, row=None):
        self.row = row

    def fetchone(self):
        return self.row


def _fake_connection(repo, events, new_id="00000000-0000-0000-0000-000000000077"):
    class Connection:
        def execute(self, query, params=None):
            if query == repo._INSERT_SQL:
                events.append(("insert", params))
                return _Cursor({"id": new_id})
            if query == repo._INSERT_UE_SQL:
                events.append(("unidade", params))
                return _Cursor()
            if query == repo._SET_GEOMETRIA_UNIDADES_SQL:
                events.append(("geometria_unidades", params))
                return _Cursor()
            if query == repo._SET_GEOMETRIA_DESENHO_SQL:
                events.append(("geometria_desenho", params))
                return _Cursor()
            if query == geometria_historico_repository._INSERT_UPLOAD_SQL:
                events.append(("historico", params))
                return _Cursor()
            raise AssertionError(f"SQL inesperado: {query[:60]}")

        def commit(self):
            events.append(("commit", None))

    @contextmanager
    def connection():
        yield Connection()

    return connection


@pytest.mark.parametrize("repo", [plano_repository, programa_repository])
def test_geometria_copiada_da_uniao_das_unidades(monkeypatch, repo):
    events = []
    monkeypatch.setattr(repo, "get_connection", _fake_connection(repo, events))
    monkeypatch.setattr(repo, "get_by_codigo", lambda codigo: {"codigo": codigo})

    repo.insert({"codigo": "X-1"}, ["ue-a", "ue-b"])

    assert [e[0] for e in events] == ["insert", "unidade", "unidade", "geometria_unidades", "commit"]
    assert events[3][1] == {"id": "00000000-0000-0000-0000-000000000077"}
    assert "ST_Multi(ST_Union(ue.geom))" in repo._SET_GEOMETRIA_UNIDADES_SQL
    assert "'unidades_espaciais'" in repo._SET_GEOMETRIA_UNIDADES_SQL


@pytest.mark.parametrize("repo", [plano_repository, programa_repository])
def test_geometria_desenhada_prevalece_sobre_unidades(monkeypatch, repo):
    events = []
    monkeypatch.setattr(repo, "get_connection", _fake_connection(repo, events))
    monkeypatch.setattr(repo, "get_by_codigo", lambda codigo: {"codigo": codigo})
    geojson = '{"type": "Polygon", "coordinates": [[[0, 0], [1, 0], [1, 1], [0, 0]]]}'

    repo.insert({"codigo": "X-2"}, ["ue-a"], geometria_geojson=geojson)

    assert [e[0] for e in events] == ["insert", "unidade", "geometria_desenho", "commit"]
    assert events[2][1]["geojson"] == geojson
    assert "'desenho'" in repo._SET_GEOMETRIA_DESENHO_SQL


@pytest.mark.parametrize("repo", [plano_repository, programa_repository])
def test_sem_unidades_nem_desenho_nao_grava_geometria(monkeypatch, repo):
    events = []
    monkeypatch.setattr(repo, "get_connection", _fake_connection(repo, events))
    monkeypatch.setattr(repo, "get_by_codigo", lambda codigo: {"codigo": codigo})

    repo.insert({"codigo": "X-3"}, [])

    assert [e[0] for e in events] == ["insert", "commit"]


@pytest.mark.parametrize("repo,alvo", [(plano_repository, "plano"), (programa_repository, "programa")])
def test_upload_grava_arquivo_e_versao_no_historico_na_mesma_transacao(monkeypatch, repo, alvo):
    events = []
    monkeypatch.setattr(repo, "get_connection", _fake_connection(repo, events))
    monkeypatch.setattr(repo, "get_by_codigo", lambda codigo: {"codigo": codigo})
    geojson = '{"type": "Point", "coordinates": [-46.6, -23.5]}'
    arquivo = {"nome_arquivo": "ponto.kml", "conteudo_binario": b"<kml/>"}

    repo.insert(
        {"codigo": "X-4", "criado_por": "u-1"}, [], geometria_geojson=geojson, arquivo_geometria=arquivo
    )

    assert [e[0] for e in events] == ["insert", "geometria_desenho", "historico", "commit"]
    historico = events[2][1]
    assert historico[f"{alvo}_id"] == "00000000-0000-0000-0000-000000000077"
    outros = {"projeto_id", "plano_id", "programa_id"} - {f"{alvo}_id"}
    assert all(historico[c] is None for c in outros)
    assert historico["geometria_geojson"] == geojson
    assert historico["criado_por"] == "u-1"
    assert historico["conteudo_binario"] is None
    assert historico["storage_caminho"].startswith(f"demandas/originais/{alvo}/")


def test_geometria_desenhada_geojson_valida_tipo():
    assert geometria_desenhada_geojson(None) is None
    assert json.loads(geometria_desenhada_geojson(GeometriaSchema(tipo="Point", coordinates=[-46.6, -23.5])))["type"] == "Polygon"
    with pytest.raises(DemandaValidationError):
        geometria_desenhada_geojson(GeometriaSchema(tipo="Circle", coordinates=[0, 0]))

import pytest
from api.services import storage_remoto

@pytest.fixture(autouse=True)
def storage_isolado(monkeypatch):
    files = {}
    monkeypatch.setattr(storage_remoto, 'enviar', lambda path, source: files.__setitem__(path, source.read_bytes()))
    monkeypatch.setattr(storage_remoto, 'baixar', lambda path: files[path])
    monkeypatch.setattr(storage_remoto, 'apagar_arquivo', lambda path: files.pop(path, None))
    return files
