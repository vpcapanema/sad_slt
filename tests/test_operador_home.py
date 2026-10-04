from __future__ import annotations

from pathlib import Path
from urllib.parse import parse_qs, urlsplit
from contextlib import contextmanager

from fastapi.testclient import TestClient

from api.routers import painel as painel_router
from api.repositories import painel_repository
from api.server import app
from api.services.session_service import SessionUser, cookie_name, create_token


def _client(profile: str = "OPERADOR") -> TestClient:
    client = TestClient(app)
    client.cookies.set(
        cookie_name(),
        create_token(
            SessionUser(
                id="00000000-0000-0000-0000-000000000021",
                email="operador@example.org",
                username=f"teste_{profile.lower()}",
                nome="Pessoa Operadora",
                tipo_usuario=profile,
            )
        ),
    )
    return client


def test_operator_home_requires_login_and_preserves_destination() -> None:
    response = TestClient(app).get("/restrict/operador/", follow_redirects=False)

    assert response.status_code == 303
    location = urlsplit(response.headers["location"])
    assert location.path == "/public/login/"
    assert parse_qs(location.query)["next"] == ["/restrict/operador/"]


def test_operator_home_is_limited_to_operator_profile() -> None:
    response = _client("VISUALIZADOR").get("/restrict/operador/")

    assert response.status_code == 403


def test_operator_home_contains_only_requested_groups_in_order() -> None:
    response = _client().get("/restrict/operador/")
    content = response.text

    assert response.status_code == 200
    positions = [
        content.index('id="group-operador"'),
        content.index('id="group-publico"'),
        content.index('id="group-catalogos"'),
    ]
    assert positions == sorted(positions)
    assert 'id="group-mad"' not in content
    assert 'id="group-resultados"' not in content
    assert 'id="group-geoprocessamento"' not in content
    assert 'aria-label="Navegação do Operador"' in content
    assert "layout-sidebar" not in content
    assert 'href="/restrict/painel/"' not in content
    assert 'href="/restrict/demandas/"' not in content
    assert content.index("/restrict/hierarquizacao/platform-map.css") < content.index("/restrict/index.css")
    assert 'id="stat-aprovadas"' in content
    assert 'id="stat-complementacao"' in content
    assert 'id="stat-em-analise"' in content
    assert '<h1 id="operator-home-title">Bem-vindo</h1>' in content
    script = Path("assets/js/paginas/operador-index.js").read_text(encoding="utf-8")
    assert 'textContent = `Bem-vindo, ${user.nome || "Operador"}`' in script


def test_restricted_root_selects_operator_home_for_operator_session() -> None:
    response = _client().get("/restrict/")

    assert response.status_code == 200
    assert 'id="group-operador"' in response.text
    assert 'id="group-publico"' in response.text
    assert 'id="group-catalogos"' in response.text
    assert 'id="group-geoprocessamento"' not in response.text
    assert 'id="group-mad"' not in response.text
    assert 'href="/restrict/painel/"' not in response.text
    assert 'href="/restrict/demandas/"' not in response.text


def test_restricted_root_preserves_existing_home_for_other_profiles() -> None:
    response = _client("ANALISTA").get("/restrict/")

    assert response.status_code == 200
    assert 'id="group-mad"' in response.text
    assert 'id="group-geoprocessamento"' in response.text


def test_operator_stats_are_scoped_to_session_user(monkeypatch) -> None:
    captured = {}

    def stats(usuario_id: str) -> dict[str, int]:
        captured["usuario_id"] = usuario_id
        return {"aprovadas": 2, "protocoladas": 5, "em_analise": 1}

    monkeypatch.setattr(painel_router.painel_service, "estatisticas_operador", stats)
    response = _client().get("/api/painel/operador/estatisticas")

    assert response.status_code == 200
    assert response.json() == {"aprovadas": 2, "protocoladas": 5, "em_analise": 1}
    assert captured["usuario_id"] == "00000000-0000-0000-0000-000000000021"


def test_operator_stats_query_filters_each_demand_type_by_user(monkeypatch) -> None:
    class Cursor:
        def fetchone(self):
            return {"aprovadas": 2, "protocoladas": 5, "em_analise": 1}

    class Connection:
        def execute(self, query, params):
            assert query.count("WHERE criado_por = %(usuario_id)s") == 3
            assert params == {"usuario_id": "00000000-0000-0000-0000-000000000021"}
            return Cursor()

    @contextmanager
    def connection():
        yield Connection()

    monkeypatch.setattr(painel_repository, "get_connection", connection)

    result = painel_repository.estatisticas_operador("00000000-0000-0000-0000-000000000021")

    assert result == {"aprovadas": 2, "protocoladas": 5, "em_analise": 1}


def test_login_redirects_operator_only_when_next_is_implicit() -> None:
    script = Path("admin/login.js").read_text(encoding="utf-8")

    assert 'const hasExplicitNext = params.has("next")' in script
    assert 'profile === "OPERADOR" && (!hasExplicitNext || isRestrictedHome)' in script
    assert "location.replace(destination(session))" in script