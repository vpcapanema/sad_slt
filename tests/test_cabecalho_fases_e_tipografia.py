"""Cabeçalho das fases: texto curto com o link de documentação embutido nele.

E a mesma regra tipográfica nas quatro páginas de fase/cadastro: o texto
digitado ou o placeholder de um campo nunca pode ser maior que o nome do
próprio campo — senão o rótulo, que é o que orienta o preenchimento, perde
para o conteúdo que ele rotula.
"""
from __future__ import annotations

import re
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from api.server import app
from api.services.session_service import SessionUser, cookie_name, create_token


@pytest.fixture()
def cliente():
    cliente = TestClient(app)
    cliente.cookies.set(cookie_name(), create_token(SessionUser(
        id="00000000-0000-0000-0000-000000000010", email="gestor@example.org",
        username="teste_gestor", nome="Gestor de teste", tipo_usuario="GESTOR",
    )))
    return cliente


@pytest.mark.parametrize("rota", [
    "/restrict/hierarquizacao/fase-1/",
    "/restrict/hierarquizacao/fase-2/",
])
def test_descricao_do_cabecalho_e_curta_e_traz_o_link_embutido(cliente, rota):
    html = cliente.get(rota).text
    bloco = re.search(r'<p class="fase-descricao">(.*?)</p>', html, re.S)
    assert bloco, "cabeçalho sem parágrafo de descrição curto"
    texto_visivel = re.sub(r"<[^>]+>", "", bloco.group(1)).strip()
    palavras = len(texto_visivel.split())
    assert palavras <= 40, f"descrição ainda longa: {palavras} palavras"
    assert 'class="fase-descricao-add"' in bloco.group(0), (
        "o link de documentação deve fazer parte do próprio parágrafo"
    )
    assert "fase-descricao-doc" not in html, "parágrafo extra de link não deve mais existir"
    assert "fase-descricao--longa" not in html


def test_fase1_titulo_e_texto_da_secao_de_saida():
    html = Path("templates/paginas/hierarquizacao/fase1-elegibilidade.html").read_text(encoding="utf-8")
    assert 'titulo-saida="Camadas de Elegibilidade Territorial"' in html
    assert (
        'texto-saida-vazia="Selecione par homologado ou faça o upload '
        'das camadas de Risco e Restrição;"'
    ) in html


def test_fase2_mantem_titulo_e_texto_proprios_de_favorabilidade():
    html = Path("templates/paginas/hierarquizacao/fase2-favorabilidade.html").read_text(encoding="utf-8")
    assert 'titulo-saida="Superfícies de favorabilidade territorial"' in html
    assert "índices de favorabilidade" in html


def test_componente_slt_usa_o_texto_parametrizado_e_o_botao_padrao():
    js = Path("assets/js/componentes/geoprocessamento-slt.js").read_text(encoding="utf-8")
    assert "texto-saida-vazia" in js
    assert "textoSaidaVazia" in js
    assert 'textoSaidaVazia.replace("upload"' in js, "o link de upload precisa vir do próprio texto"
    assert "btn btn-primary" in js
    assert "btn--primary" not in js


@pytest.mark.parametrize("regra,rotulo_regex", [
    (r'\.cadastro-campo input,\n\.cadastro-campo select,\n\.cadastro-campo textarea \{[^}]*font-size:\s*([\d.]+)rem',
     r'\.cadastro-campo \{[^}]*font-size:\s*([\d.]+)rem'),
])
def test_input_da_pagina_de_cadastro_nao_supera_o_rotulo(regra, rotulo_regex):
    css = Path("assets/css/cadastro-upload-camada.css").read_text(encoding="utf-8")
    campo = float(re.search(regra, css).group(1))
    rotulo = float(re.search(rotulo_regex, css).group(1))
    assert campo <= rotulo, f"input a {campo}rem, rótulo a {rotulo}rem"


def test_selects_operacionais_das_fases_nao_superam_o_rotulo():
    css = Path("assets/css/fase1-execucao.css").read_text(encoding="utf-8")

    rotulo_ctrl = float(re.search(r"\.fase1-ctrl\{[^}]*font-size:([\d.]+)rem", css).group(1))
    campo_ctrl = float(re.search(r"\.fase1-ctrl select\{[^}]*font-size:([\d.]+)rem", css).group(1))
    assert campo_ctrl <= rotulo_ctrl, f"select a {campo_ctrl}rem, rótulo a {rotulo_ctrl}rem"

    rotulo_exec = float(re.search(
        r"\.fase1-config-head label,\.fase1-execute label\{[^}]*font-size:([\d.]+)rem", css
    ).group(1))
    campo_exec = float(re.search(r"\.fase1-execute select\{[^}]*font-size:([\d.]+)rem", css).group(1))
    assert campo_exec <= rotulo_exec, f"select a {campo_exec}rem, rótulo a {rotulo_exec}rem"
