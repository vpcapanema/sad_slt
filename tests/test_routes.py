from __future__ import annotations

from fastapi.testclient import TestClient

from api.exceptions import DatabaseUnavailableError
from api.server import app
from api.services import demanda_service
from api.services.session_service import SessionUser, cookie_name, create_token


def test_all_router_modules_are_exposed_by_openapi() -> None:
    paths = TestClient(app).get("/openapi.json").json()["paths"]

    expected_prefixes = {
        "/api/auth/",
        "/api/demandas",
        "/api/dominios/",
        "/api/geo/",
        "/api/geoespacial/",
        "/api/ahp/configuracoes",
        "/api/ahp/comparacao-colaborativa/",
        "/api/ahp/hierarquizacoes",
        "/api/ahp/objetos",
        "/api/ahp/universo/",
        "/api/painel/",
        "/api/planos",
        "/api/programas",
    }

    for prefix in expected_prefixes:
        assert any(path.startswith(prefix) for path in paths), prefix


def test_canonical_pages_are_available() -> None:
    client = TestClient(app)
    canonical_pages = (
        "/public/",
        "/public/cadastro/",
        "/public/ahp/colaborativa/",
        "/restrict/ahp/nomes/",
        "/restrict/hierarquizacao/processos/nova/",
        "/restrict/geoespacial/",
        "/restrict/geoespacial/bancada/",
    )

    for path in canonical_pages:
        assert client.get(path).status_code == 200, path


def test_legacy_page_redirect_preserves_query_string() -> None:
    response = TestClient(app).get(
        "/geoespacial/bancada?modulo=fase1&embutido=1",
        follow_redirects=False,
    )

    assert response.status_code == 308
    assert response.headers["location"] == (
        "/restrict/geoespacial/bancada/?modulo=fase1&embutido=1"
    )


def test_unhandled_database_error_is_returned_as_service_unavailable(monkeypatch) -> None:
    def unavailable():
        raise DatabaseUnavailableError("Banco temporariamente indisponível.")

    monkeypatch.setattr(demanda_service, "listar_demandas", unavailable)
    client = TestClient(app)
    user = SessionUser(
        id="11111111-1111-1111-1111-111111111111",
        email="auditoria@local",
        username="auditoria_GESTOR",
        nome="Auditoria",
        tipo_usuario="GESTOR",
    )
    client.cookies.set(cookie_name(), create_token(user))

    response = client.get("/api/demandas/internas")

    assert response.status_code == 503
    assert response.json() == {"detail": "Banco temporariamente indisponível."}
