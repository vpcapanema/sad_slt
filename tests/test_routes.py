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
        "/api/complementacao/",
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
        "/public/analise-multicriterio/token-de-teste/",
        "/restrict/analise-multicriterio/",
        "/restrict/analise-multicriterio/julgamentos/22222222-2222-2222-2222-222222222222/",
        "/restrict/ahp/nomes/",
        "/restrict/hierarquizacao/processos/nova/",
        "/restrict/geoespacial/",
        "/restrict/geoespacial/bancada/",
        "/restrict/complementacao/",
    )

    for path in canonical_pages:
        assert client.get(path).status_code == 200, path


def test_indice_expoe_as_tres_entradas_da_analise_multicriterio() -> None:
    html = TestClient(app).get("/restrict/").text

    assert "/restrict/analise-multicriterio/?modo=julgamentos" in html
    assert "/restrict/analise-multicriterio/?modo=espaco" in html
    assert "/restrict/analise-multicriterio/?modo=formulario" in html
    trecho_ami = html.split('id="group-ami"', 1)[1].split('id="group-ahp-restrict"', 1)[0]
    trecho_mad = html.split('id="group-mad"', 1)[1].split('id="group-resultados"', 1)[0]
    assert "/restrict/hierarquizacao/processos/" in trecho_ami
    assert "/restrict/hierarquizacao/processos/" not in trecho_mad


def test_julgamentos_reusam_tabela_padrao_e_origem_das_hierarquizacoes() -> None:
    html = TestClient(app).get("/restrict/analise-multicriterio/").text
    julgamentos_js = (
        __import__("pathlib").Path("assets/js/paginas/analise-multicriterio-julgamentos.js")
        .read_text(encoding="utf-8")
    )

    assert 'class="admin-table hier-register-table ami-table--database"' in html
    assert 'class="col-select"' in html
    assert '"api/ahp/hierarquizacoes"' in julgamentos_js
    assert 'dataset.source = hierarquizacoesSourceUrl' in julgamentos_js
    assert "/restrict/hierarquizacao/processos/" in html


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
