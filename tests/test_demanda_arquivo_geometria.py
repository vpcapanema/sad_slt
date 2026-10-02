import hashlib
import json
from contextlib import contextmanager
from pathlib import Path
from uuid import UUID

from fastapi.testclient import TestClient

from api.deps.auth import require_admin
from api.repositories import demanda_repository
from api.routers import admin_tabelas, demandas as demandas_router
from api.schemas.demanda import DemandaResponseSchema, RepresentanteSchema
from api.server import app
from api.services.session_service import SessionUser


KML_POINT = b"""<kml xmlns=\"http://www.opengis.net/kml/2.2\"><Placemark><Point>
<coordinates>-46.6,-23.5,0</coordinates></Point></Placemark></kml>"""


def _payload(coordinates=(-46.6, -23.5)):
    return {
        "instituicao_id": "00000000-0000-0000-0000-000000000001",
        "lat": coordinates[1],
        "lng": coordinates[0],
        "representante": {"nome": "Representante de teste"},
        "diretoria_id": "DIR-PLAN",
        "plano_id": "PLANO-OUTROS",
        "nome": "Projeto de teste de upload",
        "geometria": {"tipo": "Point", "coordinates": list(coordinates)},
    }


def _response():
    return DemandaResponseSchema(
        id="I-PRJ-TESTE",
        status="analise_em_avaliacao",
        criadoEm="2026-10-02T00:00:00+00:00",
        instituicao_id="00000000-0000-0000-0000-000000000001",
        lat=-23.5,
        lng=-46.6,
        representante=RepresentanteSchema(nome="Representante de teste"),
        diretoria_id="DIR-PLAN",
        plano_id="PLANO-OUTROS",
        nome="Projeto de teste de upload",
    )


def test_upload_endpoint_passes_original_bytes_and_metadata(monkeypatch):
    captured = {}

    def create(payload, *, arquivo_geometria=None):
        captured["payload"] = payload
        captured["arquivo"] = arquivo_geometria
        return _response()

    monkeypatch.setattr(demandas_router.demanda_service, "criar_demanda", create)
    response = TestClient(app).post(
        "/api/demandas/com-arquivo-geometria",
        data={"payload": json.dumps(_payload())},
        files={"arquivo_geometria": ("pasta\\ponto.kml", KML_POINT, "application/vnd.google-earth.kml+xml")},
    )

    assert response.status_code == 201, response.text
    assert captured["payload"].geometria.tipo == "Point"
    assert captured["arquivo"] == {
        "nome_arquivo": "ponto.kml",
        "extensao": "kml",
        "tipo_mime": "application/vnd.google-earth.kml+xml",
        "geometria_tipo": "Point",
        "tamanho_bytes": len(KML_POINT),
        "sha256": hashlib.sha256(KML_POINT).hexdigest(),
        "conteudo_binario": KML_POINT,
    }


def test_upload_endpoint_rejects_file_that_does_not_match_payload(monkeypatch):
    called = False

    def create(*_args, **_kwargs):
        nonlocal called
        called = True
        return _response()

    monkeypatch.setattr(demandas_router.demanda_service, "criar_demanda", create)
    response = TestClient(app).post(
        "/api/demandas/com-arquivo-geometria",
        data={"payload": json.dumps(_payload((-46.7, -23.5)))},
        files={"arquivo_geometria": ("ponto.kml", KML_POINT, "application/vnd.google-earth.kml+xml")},
    )

    assert response.status_code == 422
    assert "não corresponde" in response.json()["detail"]
    assert not called


def test_project_and_original_file_are_inserted_before_same_commit(monkeypatch):
    projeto_id = "00000000-0000-0000-0000-000000000099"
    events = []

    class Cursor:
        def __init__(self, row=None):
            self.row = row

        def fetchone(self):
            return self.row

    class Connection:
        def execute(self, query, params=None):
            if query == demanda_repository._INSERT_SQL:
                events.append(("projeto", params))
                return Cursor({"id": projeto_id})
            if query == demanda_repository._INSERT_ARQUIVO_GEOMETRIA_UPLOAD_SQL:
                events.append(("arquivo", params))
                return Cursor()
            raise AssertionError("SQL inesperado")

        def commit(self):
            events.append(("commit", None))

        def rollback(self):
            events.append(("rollback", None))

    @contextmanager
    def connection():
        yield Connection()

    monkeypatch.setattr(demanda_repository, "get_connection", connection)
    monkeypatch.setattr(demanda_repository, "get_by_uuid", lambda _id: {"id": projeto_id})
    archive = {"nome_arquivo": "ponto.kml", "conteudo_binario": KML_POINT}

    result = demanda_repository.insert({"codigo": "I-PRJ-TESTE"}, arquivo_geometria=archive)

    assert result["id"] == projeto_id
    assert [event[0] for event in events] == ["projeto", "arquivo", "commit"]
    assert events[1][1]["projeto_id"] == projeto_id
    assert events[1][1]["conteudo_binario"] == KML_POINT


def test_admin_can_download_original_with_original_name_and_bytes(monkeypatch):
    arquivo_id = "00000000-0000-0000-0000-000000000123"

    class Cursor:
        def fetchone(self):
            return {
                "nome_arquivo": "linha original.kml",
                "tipo_mime": "application/vnd.google-earth.kml+xml",
                "conteudo_binario": KML_POINT,
            }

    class Connection:
        def execute(self, query, params):
            assert "demanda_arquivo_geometria_upload" in query
            assert params == (UUID(arquivo_id),)
            return Cursor()

    @contextmanager
    def connection():
        yield Connection()

    monkeypatch.setattr(admin_tabelas, "get_connection", connection)
    previous = app.dependency_overrides.get(require_admin)
    app.dependency_overrides[require_admin] = lambda: SessionUser(
        id="00000000-0000-0000-0000-000000000010",
        email="admin@example.org",
        username="teste_admin",
        nome="Admin de teste",
        tipo_usuario="ADMIN",
    )
    try:
        response = TestClient(app).get(
            f"/api/admin/tabelas/demandas/demanda_arquivo_geometria_upload/{arquivo_id}/download"
        )
    finally:
        if previous is None:
            app.dependency_overrides.pop(require_admin, None)
        else:
            app.dependency_overrides[require_admin] = previous

    assert response.status_code == 200
    assert response.content == KML_POINT
    assert "filename*=UTF-8''linha%20original.kml" in response.headers["content-disposition"]
    assert response.headers["x-content-type-options"] == "nosniff"


def test_admin_table_names_original_archive_and_renders_download_action():
    script = Path("assets/js/area-administrador.js").read_text(encoding="utf-8")

    assert 'demanda_arquivo_geometria_upload: "Arquivos originais das geometrias das demandas"' in script
    assert 'nome_arquivo: "Nome do arquivo"' in script
    assert 'conteudo_binario: "Arquivo original"' in script
    assert 'class: "admin-download-file"' in script
    assert "/download" in script
