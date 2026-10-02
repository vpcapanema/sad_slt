"""Páginas de cadastro e upload de camada homologada.

Uma página parametrizada serve elegibilidade e favorabilidade: o que muda é o
vocabulário e o tipo de camada, não o fluxo. Duplicar o template faria as duas
divergirem com o tempo.
"""
from __future__ import annotations

from pathlib import Path
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from api.server import app, templates
from api.services.session_service import SessionUser, cookie_name, create_token

PAGINAS = {
    "/restrict/hierarquizacao/cadastro-upload-favorabilidade/": (
        "Favorabilidade Territorial", "Tipo de camada de favorabilidade",
    ),
    "/restrict/hierarquizacao/cadastro-upload-elegibilidade/": (
        "Elegibilidade territorial", "Tipo de camada de elegibilidade",
    ),
}


@pytest.fixture()
def cliente():
    cliente = TestClient(app)
    cliente.cookies.set(cookie_name(), create_token(SessionUser(
        id="00000000-0000-0000-0000-000000000010", email="gestor@example.org",
        username="teste_gestor", nome="Gestor de teste", tipo_usuario="GESTOR",
    )))
    return cliente


def _legacy_html(rota):
    phase = 1 if "elegibilidade" in rota else 2
    title, label = PAGINAS[rota]
    source = Path("legado/templates/paginas/hierarquizacao/cadastro-upload-camada.html").read_text(encoding="utf-8")
    return templates.env.from_string(source).render(
        request=SimpleNamespace(url=SimpleNamespace(path=rota)),
        titulo_modulo=title, rotulo_tipo=label, modulo=f"fase{phase}",
        fase_ativa=phase, tipos_camada=[], descricao_modulo="",
        voltar_href=f"/restrict/hierarquizacao/fase-{phase}/", voltar_rotulo=title,
    )


@pytest.mark.parametrize("rota,esperado", PAGINAS.items())
def test_pagina_responde_com_titulo_proprio(cliente, rota, esperado):
    titulo, rotulo_tipo = esperado
    resposta = cliente.get(rota)
    assert resposta.status_code == 410, resposta.text
    html = _legacy_html(rota)
    assert f"Cadastro e upload — {titulo}" in html
    assert rotulo_tipo in html


@pytest.mark.parametrize("rota", PAGINAS)
def test_secao_1_traz_os_campos_que_o_sistema_nao_preenche(cliente, rota):
    """CRS, geometria, formato e hash saem do arquivo — não se pede ao usuário."""
    html = _legacy_html(rota)
    for campo in ("nome_publicacao", "versao", "modulo_consumidor",
                  "finalidade", "produto_id"):
        assert f'name="{campo}"' in html, f"falta o campo {campo}"
    for automatico in ('name="crs"', 'name="hash_conteudo"', 'name="envelope"',
                       'name="geometria_tipo"',
                       # Quem homologou é a sessão autenticada, não um nome digitado.
                       'name="homologado_por"'):
        assert automatico not in html, f"{automatico} é preenchido pelo sistema"


@pytest.mark.parametrize("rota", PAGINAS)
def test_tipo_de_camada_e_o_primeiro_campo(cliente, rota):
    html = _legacy_html(rota)
    posicao_tipo = html.index('id="campo-tipo"')
    posicao_nome = html.index('id="campo-nome-publicacao"')
    assert posicao_tipo < posicao_nome


@pytest.mark.parametrize("rota", PAGINAS)
def test_secao_2_tem_previa_metadados_e_as_duas_acoes(cliente, rota):
    html = _legacy_html(rota)
    assert 'id="campo-arquivo"' in html
    # A ordem importa: mapa, depois metadados, depois os botões.
    assert html.index('id="mapa-previa"') < html.index('id="card-metadados"')
    assert html.index('id="card-metadados"') < html.index('id="btn-enviar"')
    assert 'id="btn-cancelar"' in html
    assert "leaflet.js" in html


def test_componente_nao_aponta_para_paginas_desativadas():
    script = Path("assets/js/componentes/geoprocessamento-slt.js").read_text(encoding="utf-8")
    assert "cadastro-upload-elegibilidade" not in script
    assert "cadastro-upload-favorabilidade" not in script


def test_previa_nao_consome_a_inspecao():
    """O envio ainda depende do mesmo token; espiar não pode gastá-lo."""
    import inspect

    from api.services import importar_camadas_service as servico

    fonte = inspect.getsource(servico.previa_da_inspecao)
    assert "_inspection_tickets.get(token)" in fonte
    assert "_consume_inspection_ticket" not in fonte


def test_previa_limita_e_simplifica():
    import inspect

    from api.services import importar_camadas_service as servico

    fonte = inspect.getsource(servico.previa_da_inspecao)
    assert "PREVIA_MAX_FEICOES" in fonte
    assert "simplify" in fonte
    assert 'to_crs("EPSG:4326")' in fonte, "Leaflet espera graus"


@pytest.mark.parametrize("rota", PAGINAS)
def test_pagina_segue_o_padrao_visual_da_fase(cliente, rota):
    """Mesma família visual de fase-1/fase-2: largura, centralização e tipografia.

    Duas versões anteriores inventaram classes próprias (ahp-module-header/
    ahp-card na primeira, gerador-page/gerador-section na segunda) que não
    correspondem à página de referência do usuário — fase-2 usa
    app-main.ahp-main.fase-execucao-page com card.fase-titulo-card e
    card.ahp-step-section, e é isso que esta página precisa reproduzir.
    """
    html = _legacy_html(rota)
    assert 'ahp-module-page' in html.split("<body", 1)[1][:80]
    assert "app-main ahp-main fase-execucao-page" in html
    assert "standard-page-hero" in html
    assert "standard-page-hero__title" in html
    assert "ahp-step-section" in html
    assert "ahp-section-index-icon" in html
    assert "btn btn-primary" in html
    assert "btn btn-secondary" in html
    assert "btn--primary" not in html
    assert "btn--secondary" not in html
    assert "ahp-module-header" not in html
    assert "gerador-page" not in html
    assert "gerador-section__header" not in html


@pytest.mark.parametrize("rota,fase", [
    ("/restrict/hierarquizacao/cadastro-upload-elegibilidade/", 1),
    ("/restrict/hierarquizacao/cadastro-upload-favorabilidade/", 2),
])
def test_pagina_inclui_a_navegacao_de_fases_com_a_fase_certa_ativa(cliente, rota, fase):
    """A página pertence ao fluxo de fases — precisa se orientar nele."""
    html = _legacy_html(rota)
    assert "hier-phase-navigation" in html
    outra_fase = 2 if fase == 1 else 1
    href_ativa = f'/restrict/hierarquizacao/fase-{fase}/"'
    href_outra = f'/restrict/hierarquizacao/fase-{outra_fase}/"'
    trecho_ativo = html[html.index(href_ativa):html.index(href_ativa) + 120]
    trecho_outra = html[html.index(href_outra):html.index(href_outra) + 120]
    assert 'class="active"' in trecho_ativo
    assert 'class="active"' not in trecho_outra
