from __future__ import annotations

import csv
import hashlib
import io
import json
import math
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from api.server import app, templates
from api.services.session_service import SessionUser, cookie_name, create_token


PAGE = "/restrict/geoespacial/documentacao-camadas-territoriais/"
ROOT = Path(__file__).resolve().parents[1]
CONFIG = ROOT / "config"
DATA = CONFIG / "documentacao-camadas-territoriais"


@pytest.fixture
def client():
    user = SessionUser(
        id="11111111-1111-1111-1111-111111111111",
        email="documentacao@local",
        username="documentacao_OPERADOR",
        nome="Documentação",
        tipo_usuario="OPERADOR",
    )
    with TestClient(app) as session:
        session.cookies.set(cookie_name(), create_token(user))
        yield session


def _matrix():
    return json.loads((CONFIG / "documentacao-camadas-territoriais.json").read_text(encoding="utf-8-sig"))


@pytest.mark.parametrize("suffix", ["", "baixa-renda-2022.csv"])
def test_documentation_and_download_require_session(suffix):
    with TestClient(app) as anonymous:
        assert anonymous.get(PAGE + suffix).status_code == 401
        assert anonymous.get(PAGE + suffix, headers={"authorization": "Bearer invalid"}).status_code == 401


def test_documentation_renders_every_indicator_and_qualifications(client):
    response = client.get(PAGE)
    assert response.status_code == 200
    assert response.headers["cache-control"] == "no-store"
    assert 'data-requer-autenticacao="true"' in response.text
    for item in _matrix()["indicadores"]:
        assert f'id="indicador-{item["codigo"]}"' in response.text
        assert str(item["calculaveis"]) in response.text
    for text in (
        "Calculável não significa homologado", "645 municípios", "103.319 códigos",
        "103.620 partes", "8 geometrias oficiais inválidas", "Nenhum dado municipal é replicado",
        "Rendimento nominal médio e mediano do responsável", "não implementada",
        "null", "menores ou iguais a zero", "99,84%", "não equivale a uma linha oficial",
        "Nenhuma nova combinação é homologada",
    ):
        assert text in response.text
    assert "session-state" not in response.text


def test_documentation_preserves_reverse_proxy_links(client):
    response = client.get(PAGE, headers={"x-forwarded-prefix": "/sicard"})
    assert response.status_code == 200
    assert f'href="/sicard{PAGE}baixa-renda-2022.csv"' in response.text
    assert 'href="/sicard/config/documentacao-camadas-territoriais.json"' in response.text
    assert 'href="/sicard/config/catalogo-territorial-incorporado.json"' in response.text


def test_download_is_exact_versioned_csv(client):
    response = client.get(PAGE + "baixa-renda-2022.csv")
    assert response.status_code == 200
    assert response.content == (DATA / "baixa-renda-2022-percentuais-calculados.csv").read_bytes()
    assert response.headers["content-type"].startswith("text/csv")
    assert "attachment;" in response.headers["content-disposition"]
    assert response.headers["cache-control"] == "no-store"


def test_low_income_calculations_use_disjoint_counts_and_same_denominator():
    rows = list(csv.DictReader(io.StringIO(
        (DATA / "baixa-renda-2022-percentuais-calculados.csv").read_text(encoding="utf-8-sig")
    ), delimiter=";"))
    assert len(rows) == len({row["cd_mun"] for row in rows}) == 645
    for row in rows:
        assert row["ano"] == "2022"
        assert row["fonte"] == "https://sidra.ibge.gov.br/tabela/10296"
        numerator = sum(float(row[field]) for field in (
            "moradores_ate_quarto_sm", "moradores_mais_quarto_ate_meio_sm", "moradores_sem_rendimento",
        ))
        denominator = float(row["moradores_total_universo"])
        assert denominator > 0
        assert numerator == float(row["moradores_ate_meio_sm_incluindo_sem_rendimento"])
        assert math.isclose(float(row["percentual"]), 100 * numerator / denominator, rel_tol=1e-12)
    indicator = next(item for item in _matrix()["indicadores"] if item["codigo"] == "baixa_renda_meio_sm")
    percentages = [float(row["percentual"]) for row in rows]
    assert math.isclose(min(percentages), indicator["minimo"])
    assert math.isclose(max(percentages), indicator["maximo"])


def test_matrix_csv_matches_json_and_coverage():
    matrix = _matrix()["indicadores"]
    with (DATA / "matriz-viabilidade-variaveis.csv").open(encoding="utf-8-sig", newline="") as source:
        rows = list(csv.DictReader(source, delimiter=";"))
    assert len(rows) == len(matrix) == 46
    for row, item in zip(rows, matrix):
        for field in ("codigo", "indicador", "grupo", "territorialidade", "periodo", "formula", "situacao"):
            assert row[field] == str(item[field])
        assert item["calculaveis"] + item["nao_calculaveis"] == item["unidades"]
        assert item["unidades"] == (645 if item["territorialidade"] == "municipio" else 103319)
        assert all(url.startswith(("https://", "ftp://")) for url in item["fontes"])


@pytest.mark.parametrize(("path", "expected"), [
    (CONFIG / "documentacao-camadas-territoriais.json", "fa96dfbf8ef933e0ffff03284606f9add845808189ff8fb0dfb29532c43a1bd1"),
    (DATA / "matriz-viabilidade-variaveis.csv", "aa117ffeaa28973df9ebc52a09b09ed140c2d7cf482cc725a63839b3ee11c7fa"),
    (DATA / "baixa-renda-2022-percentuais-calculados.csv", "6c460a6fb132e3919bfacd7671b2ba902f21cd7dd86bba7d37f2673ad4838755"),
])
def test_documentary_snapshot_preserves_source_bytes(path, expected):
    assert hashlib.sha256(path.read_bytes()).hexdigest() == expected


def test_template_escapes_data_and_has_no_inline_execution(client, monkeypatch):
    original = json.load
    payload = '<script>alert("unsafe")</script>'

    def altered(source, *args, **kwargs):
        matrix = original(source, *args, **kwargs)
        if "indicadores" in matrix:
            matrix["indicadores"][0]["indicador"] = payload
        if "atributos_setoriais" in matrix:
            matrix["atributos_setoriais"][0]["rotulo"] = payload
        return matrix

    monkeypatch.setattr("api.server.json.load", altered)
    response = client.get(PAGE)
    assert payload not in response.text
    assert "&lt;script&gt;" in response.text
    template = templates.env.loader.get_source(
        templates.env, "paginas/geoespacial/documentacao-camadas-territoriais.html",
    )[0]
    assert "|safe" not in template
    assert "<style" not in template
    assert "<script>" not in template


def test_incorporated_catalog_is_distinct_and_fully_rendered(client):
    catalog = json.loads((CONFIG / "catalogo-territorial-incorporado.json").read_text(encoding="utf-8"))
    response = client.get(PAGE)
    assert response.status_code == 200
    items = catalog["atributos_setoriais"]
    assert len(items) == 3529
    assert sum(item["origem"] == "originais" for item in items) == 3519
    assert sum(item["origem"] == "combinados" for item in items) == 10
    for item in items:
        assert f'id="atributo-{item["id"]}"' in response.text
        assert item["campo"] in response.text
        assert f'{item["cobertura"]} / 103319' in response.text
        assert item["detalhe"]["dicionario"] in response.text
        if item["origem"] == "combinados":
            assert item["detalhe"]["formula"] in response.text
            assert item["detalhe"]["homologado_hierarquizacao"] is False
    assert len(catalog["combinados_municipais"]) == 18
    for item in catalog["combinados_municipais"]:
        assert item["cobertura"] == item["conferida"] == 645
        assert item["campo"] in response.text
    for item in catalog["procedencia"]:
        assert item["sha256"] in response.text
    for text in (
        "prévia histórica", "3519 originais e 10 combinados", "6.393 atributos",
        "A cobertura varia conforme o conjunto", "células com sigilo X",
        "mesmos IDs, campos, universos ou períodos",
        "carga aditiva de agregados oficiais de universo do IBGE foi aplicada",
    ):
        assert text in response.text
    assert "Está em andamento" not in response.text
    assert "Importar agregados oficiais setoriais adicionais" not in response.text
    sources = catalog["conjuntos_setoriais"]
    assert len(sources) == 18
    assert sum(item["campos"] for item in sources) == 3519
    assert {item["conjunto"] for item in sources} >= {
        "renda", "registro_nascimento", "entorno_faces", "entorno_moradores", "entorno_domicilios",
        "domicilio3", "pessoas_indigenas", "pessoas_quilombolas",
    }
    assert all(item["sigilos_x"] >= 0 for item in sources)
