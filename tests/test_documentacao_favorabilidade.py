"""Biblioteca da favorabilidade: a página acompanha o dado, não uma transcrição.

Tudo vem dos artefatos que o próprio processamento gerou — matriz de critérios,
registro de normalização e manifestos de exportação. Se o processo mudar e a
página não acompanhar, é porque alguém transcreveu à mão em vez de ler a fonte.
"""
from __future__ import annotations

import re
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from api.server import app
from api.services.documentacao_favorabilidade import montar_contexto
from api.services.session_service import SessionUser, cookie_name, create_token

ROTA = "/restrict/geoespacial/documentacao-favorabilidade/"


@pytest.fixture()
def cliente():
    cliente = TestClient(app)
    cliente.cookies.set(cookie_name(), create_token(SessionUser(
        id="00000000-0000-0000-0000-000000000010", email="gestor@example.org",
        username="teste_gestor", nome="Gestor de teste", tipo_usuario="GESTOR",
    )))
    return cliente


def test_pagina_responde(cliente):
    resposta = cliente.get(ROTA)
    assert resposta.status_code == 200, resposta.text


def test_cobre_a_cadeia_inteira(cliente):
    """Da premissa ao índice: nenhuma etapa pode faltar."""
    html = cliente.get(ROTA).text
    # O número saiu do texto e virou medalhão: o título é o segundo <span>.
    secoes = re.findall(
        r'<div class="ahp-section-label"><span class="ahp-section-index-icon"[^>]*>\d+</span>'
        r'<span[^>]*>([^<]+)</span></div>',
        html,
    )
    for esperado in ("premissa", "critério", "dados", "Espacialização",
                     "variável", "Normalização", "índices"):
        assert any(esperado.lower() in s.lower() for s in secoes), (esperado, secoes)


def test_contexto_vem_dos_artefatos_do_processo():
    contexto = montar_contexto()
    assert contexto["criterios_grade"], "critérios da grade não foram lidos"
    assert contexto["criterios_rede"], "critérios da rede não foram lidos"
    assert contexto["variaveis_brutas"], "variáveis espacializadas não foram lidas"
    assert contexto["superficies"], "as superfícies finais não foram lidas"


def test_criterio_traz_premissa_e_mapa():
    """Critério sem premissa é medida sem argumento; sem mapa, é alegação."""
    contexto = montar_contexto()
    criterios = contexto["criterios_grade"] + contexto["criterios_rede"]
    com_premissa = [c for c in criterios if c.get("premissa")]
    com_mapa = [c for c in criterios if c.get("mapa")]
    assert len(com_premissa) >= 16, f"só {len(com_premissa)} critérios com premissa"
    assert len(com_mapa) >= 16, f"só {len(com_mapa)} critérios com mapa"


def test_mapas_apontam_para_arquivo_que_existe(cliente):
    """Imagem quebrada é pior que imagem ausente: promete e não entrega."""
    html = cliente.get(ROTA).text
    fontes = re.findall(r'<img src="(/data/[^"]+)"', html)
    assert len(fontes) >= 40, f"esperado o conjunto completo de mapas, veio {len(fontes)}"
    ausentes = [src for src in fontes if not Path(src.lstrip("/")).is_file()]
    assert not ausentes, f"mapas referenciados que não existem: {ausentes[:5]}"


def test_declara_o_metodo_de_normalizacao_e_agregacao(cliente):
    html = cliente.get(ROTA).text
    assert "minmax" in html
    assert "(x-min)/(max-min)" in html
    assert "média simples" in html.lower()


def test_pagina_segue_o_padrao_visual_da_fase(cliente):
    """Mesma família visual de fase-1/fase-2, e não mais o esquema próprio
    (ahp-module/ahp-card) que a primeira versão desta página inventou."""
    html = cliente.get(ROTA).text
    assert "app-main ahp-main fase-execucao-page" in html
    assert "standard-page-hero" in html
    assert "ahp-section-index-icon" in html
    assert '"ahp-card"' not in html
    assert 'class="ahp-module doc-favorabilidade"' not in html
    assert 'class="ahp-module-header"' not in html
    assert "hier-phase-navigation" in html


def test_texto_do_cabecalho_e_curto():
    html = Path("templates/paginas/geoespacial/documentacao-favorabilidade.html").read_text(encoding="utf-8")
    bloco = re.search(r'<p class="standard-page-hero__description">(.*?)</p>', html, re.S)
    assert bloco, "cabeçalho sem parágrafo curto de descrição"
    texto = re.sub(r"<[^>]+>", "", bloco.group(1)).strip()
    assert len(texto.split()) <= 40


def test_criterio_nao_supera_o_rotulo():
    """O h4 do critério (nome) não pode ficar menor que o código/tag que o acompanha."""
    css = Path("assets/css/documentacao-favorabilidade.css").read_text(encoding="utf-8")
    h4 = float(re.search(r"\.doc-criterio h4 \{[^}]*font-size:\s*([\d.]+)rem", css).group(1))
    ficha_dd = float(re.search(r"\.doc-ficha dd \{[^}]*font-size:\s*([\d.]+)rem", css).group(1))
    assert ficha_dd <= h4, f"valor da ficha a {ficha_dd}rem, nome do critério a {h4}rem"
