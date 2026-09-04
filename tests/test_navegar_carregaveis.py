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


def test_carregar_nao_reimporta_o_que_ja_esta_catalogado():
    """Abrir um arquivo já catalogado não pode criar camada nova.

    Era assim que os produtos de `outputs/` viravam cópia no acervo com nome
    sufixado por hash — o botão jogava tudo no pipeline de importação.
    """
    import inspect

    from api.routers import geoespacial

    fonte = inspect.getsource(geoespacial.carregar_arquivo_do_sistema)
    assert "_recurso_catalogado" in fonte
    assert "reutilizada=True" in fonte
    # Só o que vem do acervo e está órfão passa pelo pipeline de importação.
    assert '_raiz_carregavel(normalized) != "acervo"' in fonte


def test_produto_carregado_referencia_o_arquivo_de_origem():
    """Produto de `outputs/` entra no catálogo sem cópia no acervo."""
    import inspect

    from api.routers import geoespacial

    fonte = inspect.getsource(geoespacial.carregar_arquivo_do_sistema)
    assert "caminho_arquivo=normalized" in fonte


def test_navegar_e_carregar_compartilham_a_mesma_regra():
    """Uma lista só de raízes; duas listas divergiriam com o tempo."""
    import inspect

    from api.routers import geoespacial

    navegar = inspect.getsource(geoespacial.navegar_diretorio_geoespacial)
    carregar = inspect.getsource(geoespacial.carregar_arquivo_do_sistema)
    assert "_raiz_carregavel" in navegar
    assert "_raiz_carregavel" in carregar


def test_carregar_devolve_o_contrato_que_a_bancada_consome(cliente):
    """geoprocessamento-ribbon.js só sabe ler result.recursos[0].id.

    As rotas de "já catalogado" e "produto/homologado referenciado" devolviam
    um envelope próprio (camada_id solto, sem `recursos`) — todo arquivo fora
    do acervo (outputs/, biblioteca_canonica/) "carregava" no backend e nunca
    aparecia na Bancada, porque o único consumidor deste endpoint não sabia
    ler a resposta.
    """
    produto = Path("data/geoespacial/outputs")
    if not produto.is_dir() or not any(produto.glob("*.gpkg")):
        pytest.skip("nenhum GeoPackage em outputs/ neste ambiente")
    arquivo = next(produto.glob("*.gpkg"))
    caminho = str(arquivo).replace("\\", "/")

    resposta = cliente.post(ROTA_CARREGAR, data={"arquivo": caminho})
    assert resposta.status_code == 200, resposta.text
    corpo = resposta.json()
    assert corpo.get("recursos"), "sem 'recursos': a Bancada não acha result.recursos[0].id"
    assert corpo["recursos"][0]["id"], "recursos[0] sem id"
    assert corpo["recursos"][0]["tipo"] in ("vetorial", "raster")

    # Recarregar o mesmo arquivo (agora já catalogado) tem de manter o contrato.
    resposta2 = cliente.post(ROTA_CARREGAR, data={"arquivo": caminho})
    corpo2 = resposta2.json()
    assert corpo2["recursos"][0]["id"] == corpo["recursos"][0]["id"]
    assert corpo2["reutilizada"] is True
