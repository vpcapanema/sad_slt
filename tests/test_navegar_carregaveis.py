"""O botão "carregar do sistema" só enxerga as três raízes carregáveis.

Antes ele abria `data/geoespacial` inteiro: `local/` com 7,3 GB de fonte bruta
baixada, `arquivados/`, `relatorios/` e até `tests/`. Nada disso é camada apta a
entrar num geoprocesso, e a mistura tornava impossível saber, ao carregar, se o
dado era acervo, produto de trabalho ou rascunho.
"""
from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from api.routers.geoespacial import RAIZES_CARREGAVEIS
from api.server import app
from api.services.session_service import SessionUser, cookie_name, create_token

ROTA = "/api/geoespacial/camadas-arquivo/navegar"


@pytest.fixture()
def cliente():
    cliente = TestClient(app)
    cliente.cookies.set(cookie_name(), create_token(SessionUser(
        id="00000000-0000-0000-0000-000000000010", email="gestor@example.org",
        username="teste_gestor", nome="Gestor de teste", tipo_usuario="GESTOR",
    )))
    return cliente


def test_raizes_declaradas_sao_as_tres_combinadas():
    caminhos = {dados["caminho"] for dados in RAIZES_CARREGAVEIS.values()}
    assert caminhos == {"uploads/datastorage", "outputs", "biblioteca_canonica"}


def test_nivel_zero_lista_apenas_as_raizes(cliente):
    resposta = cliente.get(ROTA)
    assert resposta.status_code == 200, resposta.text
    corpo = resposta.json()
    assert corpo["arquivos"] == [], "a raiz não expõe arquivo solto"
    caminhos = {p["caminho"] for p in corpo["pastas"]}
    assert caminhos <= {d["caminho"] for d in RAIZES_CARREGAVEIS.values()}
    for pasta in corpo["pastas"]:
        assert pasta["descricao"], "cada raiz se explica na interface"


@pytest.mark.parametrize("proibido", ["local", "arquivados", "relatorios", "tests"])
def test_recusa_diretorio_fora_das_raizes(cliente, proibido):
    resposta = cliente.get(ROTA, params={"caminho": proibido})
    assert resposta.status_code == 403, f"{proibido} não deveria ser navegável"


def test_recusa_travessia(cliente):
    assert cliente.get(ROTA, params={"caminho": "../.."}).status_code == 403


def test_permite_descer_dentro_de_uma_raiz(cliente):
    resposta = cliente.get(ROTA, params={"caminho": "uploads/datastorage"})
    assert resposta.status_code == 200, resposta.text
    assert resposta.json()["pai"] == "", "subir de uma raiz volta ao nível zero"


ROTA_CARREGAR = "/api/geoespacial/camadas-arquivo/carregar"


@pytest.mark.parametrize("proibido", [
    "data/geoespacial/local/risco/vegetacao_nativa_sp.zip",
    "data/geoespacial/arquivados/qualquer.gpkg",
    "data/geoespacial/relatorios/algum.json",
])
def test_carregar_recusa_arquivo_fora_das_raizes(cliente, proibido):
    """A restrição vale para a ação, não só para a navegação."""
    resposta = cliente.post(ROTA_CARREGAR, data={"arquivo": proibido})
    assert resposta.status_code == 403, resposta.text


def test_carregar_recusa_travessia(cliente):
    resposta = cliente.post(
        ROTA_CARREGAR, data={"arquivo": "data/geoespacial/../../etc/passwd"}
    )
    assert resposta.status_code == 403


def test_carregar_orfao_exige_conciliacao(cliente, monkeypatch, tmp_path):
    from api.routers import geoespacial
    arquivo = tmp_path / "orfao.gpkg"
    arquivo.touch()
    monkeypatch.setattr(geoespacial, "project_path", lambda *a, **k: arquivo)
    monkeypatch.setattr(geoespacial, "_recurso_catalogado", lambda path: None)
    resposta = cliente.post(ROTA_CARREGAR, data={"arquivo": "data/geoespacial/outputs/orfao.gpkg"})
    assert resposta.status_code == 409


def test_navegar_e_carregar_compartilham_a_mesma_regra():
    """Uma lista só de raízes; duas listas divergiriam com o tempo."""
    import inspect

    from api.routers import geoespacial

    navegar = inspect.getsource(geoespacial.navegar_diretorio_geoespacial)
    carregar = inspect.getsource(geoespacial.carregar_arquivo_do_sistema)
    assert "_raiz_carregavel" in navegar
    assert "_raiz_carregavel" in carregar


def test_carregar_devolve_o_contrato_que_a_bancada_consome(cliente, monkeypatch, tmp_path):
    from api.routers import geoespacial
    arquivo = tmp_path / "registrado.gpkg"
    arquivo.touch()
    monkeypatch.setattr(geoespacial, "project_path", lambda *a, **k: arquivo)
    monkeypatch.setattr(geoespacial, "_recurso_catalogado", lambda path: {
        "recurso_sessao_id": "registro-teste", "nome": "Registrado", "tipo": "vetor"})
    async def carregar(recurso_id):
        assert recurso_id == "registro-teste"
    monkeypatch.setattr(geoespacial.geoespacial_service, "carregar_recurso", carregar)
    for _ in range(2):
        resposta = cliente.post(ROTA_CARREGAR, data={"arquivo": "data/geoespacial/outputs/registrado.gpkg"})
        assert resposta.status_code == 200
        assert resposta.json()["recursos"][0]["id"] == "registro-teste"
        assert resposta.json()["reutilizada"] is True
