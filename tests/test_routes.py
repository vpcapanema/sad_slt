from __future__ import annotations

from fastapi.testclient import TestClient

from api.server import app


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
