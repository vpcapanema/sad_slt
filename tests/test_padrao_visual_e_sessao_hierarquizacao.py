"""Padrão visual das páginas de hierarquização e a sessão por trás delas.

Duas coisas travadas aqui. A primeira é o padrão de cabeçalho e numeração
(hero centralizado, seções em medalhão, subseções 2.1) que a Central de
respostas já usava e que estas páginas passaram a seguir. A segunda é quem
homologa: era um campo de texto que o usuário digitava — o que não prova nada
e deixava o registro divergir de quem realmente executou a publicação.
"""
from __future__ import annotations

import inspect
import re
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from api.routers import geoespacial as router_geo
from api.server import app
from api.services.session_service import SessionUser, cookie_name, create_token

PAGINAS = [
    "/restrict/hierarquizacao/fase-1/",
    "/restrict/hierarquizacao/fase-2/",
    "/restrict/hierarquizacao/fase-3/",
    "/restrict/hierarquizacao/cadastro-upload-elegibilidade/",
    "/restrict/hierarquizacao/cadastro-upload-favorabilidade/",
    "/restrict/geoespacial/documentacao-favorabilidade/",
]


@pytest.fixture()
def cliente():
    cliente = TestClient(app)
    cliente.cookies.set(cookie_name(), create_token(SessionUser(
        id="00000000-0000-0000-0000-000000000010", email="gestor@example.org",
        username="teste_gestor", nome="Gestor de teste", tipo_usuario="GESTOR",
    )))
    return cliente


@pytest.mark.parametrize("rota", PAGINAS)
def test_cabecalho_segue_o_hero_padrao(cliente, rota):
    html = cliente.get(rota).text
    assert "standard-page-hero__title" in html, rota
    assert "standard-page-hero__eyebrow" in html, rota
    assert "page-title-standard.css" in html, rota
    assert "fase-titulo-card" not in html, rota


@pytest.mark.parametrize("rota", PAGINAS)
def test_secoes_numeradas_em_medalhao(cliente, rota):
    html = cliente.get(rota).text
    medalhoes = re.findall(
        r'<span class="ahp-section-index-icon"[^>]*>(\d+)</span>', html
    )
    assert medalhoes, f"{rota} sem seção numerada"
    # Numeração contínua a partir de 1 — buraco na sequência é erro de edição.
    assert medalhoes == [str(n) for n in range(1, len(medalhoes) + 1)], (rota, medalhoes)


@pytest.mark.parametrize("rota", PAGINAS)
def test_pagina_restrita_carrega_o_guarda_de_sessao(cliente, rota):
    """`template-base.js` chama `SLTAdminAuth.requireAuth()` com encadeamento
    opcional: sem `admin-auth.js` na página, a exigência vira silenciosamente
    um no-op e a tela restrita abre sem sessão."""
    html = cliente.get(rota).text
    assert 'data-requer-autenticacao="true"' in html, rota
    assert "/assets/js/admin-auth.js" in html, rota


@pytest.mark.parametrize("rota", PAGINAS[3:5])
def test_upload_numera_cada_campo_do_formulario(cliente, rota):
    """O índice é do campo, não do grupo: cada rótulo carrega o próprio número."""
    html = cliente.get(rota).text
    for numero, rotulo in (("1.2", "Nome de publicação"), ("1.3", "Versão"),
                           ("1.6", "Produto de origem"), ("2.1", "Arquivo da camada")):
        assert f'<span class="cadastro-subsec-num">{numero}</span>{rotulo}' in html, (rota, numero)
    # Os grupos que dividem o formulário não competem com a numeração dos campos.
    assert "<h3>Identificação</h3>" in html
    assert "<h3>Contexto e origem</h3>" in html


@pytest.mark.parametrize("rota", PAGINAS[3:5])
def test_cards_do_upload_nao_abrem_com_paragrafo_de_texto(cliente, rota):
    """O primeiro elemento de cada card é o conteúdo, não um texto explicativo."""
    html = cliente.get(rota).text
    for corpo in re.findall(r'<div class="ahp-section-body">\s*(<[a-z]+)', html):
        assert corpo != "<p", f"{rota} voltou a abrir card com parágrafo"


def test_quem_homologou_vem_da_sessao_e_nao_do_formulario():
    fonte = inspect.getsource(router_geo._responsavel_pela_homologacao)
    assert "user.nome" in fonte
    for rota in (router_geo.homologar_camada, router_geo.iniciar_homologacao_com_logs):
        assinatura = inspect.signature(rota)
        assert "user" in assinatura.parameters, rota.__name__
        assert "_responsavel_pela_homologacao" in inspect.getsource(rota), rota.__name__
    html = Path("templates/paginas/hierarquizacao/cadastro-upload-camada.html").read_text(encoding="utf-8")
    assert 'name="homologado_por"' not in html

SUBSECOES_ESPERADAS = {
    "/restrict/hierarquizacao/fase-1/": ["2.1", "2.2"],
    "/restrict/hierarquizacao/fase-2/": ["2.1", "2.2"],
    "/restrict/hierarquizacao/fase-3/": ["1.1", "1.2", "3.1", "3.2", "4.1", "4.2", "5.1", "5.2"],
    "/restrict/hierarquizacao/cadastro-upload-elegibilidade/": ["1.1", "1.2", "1.3", "1.4", "1.5", "1.6", "2.1", "2.2", "2.3"],
    "/restrict/hierarquizacao/cadastro-upload-favorabilidade/": ["1.1", "1.2", "1.3", "1.4", "1.5", "1.6", "2.1", "2.2", "2.3"],
    "/restrict/geoespacial/documentacao-favorabilidade/": ["1.1", "1.2", "2.1", "2.2"],
}


@pytest.mark.parametrize("rota,esperado", sorted(SUBSECOES_ESPERADAS.items()))
def test_subsecoes_numeradas_na_ordem_da_secao(cliente, rota, esperado):
    html = cliente.get(rota).text
    numeros = re.findall(r'class="cadastro-subsec-num">([\d.]+)<', html)
    assert numeros == esperado, (rota, numeros)
    # O número nunca fica solto no corpo do card: nas telas de execução ele
    # encabeça um subcard; nos formulários, o rótulo do próprio campo, agrupado
    # em form-subsection (mesmo bloco da tela de cadastro de projeto).
    assert "ahp-subcard" in html or "form-subsection" in html, rota


@pytest.mark.parametrize("rota", ["/restrict/hierarquizacao/fase-1/", "/restrict/hierarquizacao/fase-2/"])
def test_secao_1_das_fases_numera_os_quatro_blocos_do_componente(cliente, rota):
    """Os blocos da seção 1 são montados pelo componente no navegador, então a
    numeração vive no JS e não no HTML servido."""
    assert '<link rel="stylesheet"' in cliente.get(rota).text
    js = Path("assets/js/componentes/geoprocessamento-slt.js").read_text(encoding="utf-8")
    numeros = re.findall(r'class="cadastro-subsec-num">([\d.]+)<', js)
    assert numeros == ["1.1", "1.2", "1.3", "1.4"], numeros

def test_alternativa_some_quando_ha_selecao_no_card():
    """O "ou + botão" é a saída de quem ainda não tem o insumo: escolhido algo no
    card, ele dá lugar ao conteúdo da seleção."""
    js = Path("assets/js/componentes/geoprocessamento-slt.js").read_text(encoding="utf-8")
    assert js.count('class="fase1-op-alternativa"') == 2, "os dois cards precisam do bloco"
    corpo = js.split("function sincronizarAlternativas(raiz) {", 1)[1].split("\n  }", 1)[0]
    assert '.fase1-op-controls select' in corpo
    assert "some((select) => Boolean(select.value))" in corpo
    assert "alternativa.hidden = escolhido" in corpo
    # Os seletores entram no card depois da renderização: escuta delegada, não direta.
    assert 'this.addEventListener("change", () => sincronizarAlternativas(this))' in js
    css = Path("assets/css/fase1-execucao.css").read_text(encoding="utf-8")
    assert ".fase1-op-alternativa[hidden]{display:none}" in css


def test_selecao_feita_por_codigo_tambem_sincroniza():
    """`select.value = x` não dispara "change"; sem estas chamadas o botão
    continuaria visível sobre uma seleção já aplicada."""
    for caminho in ("hierarquizacao/js/fases.js", "hierarquizacao/js/fase2.js"):
        js = Path(caminho).read_text(encoding="utf-8")
        assert "SLTGeoprocessamento?.sincronizarAlternativas?.()" in js, caminho
