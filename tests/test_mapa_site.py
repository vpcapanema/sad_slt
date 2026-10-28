import re
from pathlib import Path

from fastapi.testclient import TestClient

from api.server import app, templates


def test_mapa_site_preserva_todos_os_cards_da_area_restrita():
    origem = Path("templates/paginas/admin/index.html").read_text(encoding="utf-8")
    inventario = templates.env.get_template("componentes/mapa_site.html").module
    paginas = {
        (nome, rota)
        for _, subgrupos in inventario.grupos
        for _, links in subgrupos
        for nome, rota in links
    }
    cards = re.findall(r"link_card\('([^']+)', '[^']+', '([^']+)'", origem)
    assert len(cards) >= 35
    for rota, nome in cards:
        assert (nome, rota) in paginas
    grupos = re.findall(r"group_heading\('[^']+', '([^']+)'", origem)
    assert [nome for nome, _ in inventario.grupos] == grupos


def test_menu_remove_acessos_retirados_e_usa_nomes_da_documentacao():
    inventario = templates.env.get_template("componentes/mapa_site.html").module
    paginas = {
        rota: nome
        for _, subgrupos in inventario.grupos
        for _, links in subgrupos
        for nome, rota in links
    }
    for rota in (
        "/restrict/revisao-status/",
        "/restrict/geoespacial/visualizador-bases-geoespaciais/",
        "/public/documentacao/favorabilidade/",
        "/public/documentacao/hierarquizacao/MODELO_HIERARQUIZACAO_ESPACIAL.md",
    ):
        assert rota not in paginas
    assert paginas["/restrict/"] == "Área restrita"
    assert paginas["/restrict/geoespacial/documentacao-camadas-territoriais/"] == (
        "Transparência, procedimentos e rastreabilidade das camadas territoriais"
    )
    documentacao = Path("templates/paginas/documentacao/index.html").read_text(encoding="utf-8")
    for rota in (
        "/public/documentacao/risco-restricao/",
        "/public/documentacao_favorabilidade_v2/",
        "/public/documentacao/limite-maritimo/",
        "/public/documentacao/hierarquizacao/MODULO_FASE3_ATRIBUTOS_PROJETO_AJUSTE.md",
    ):
        assert f'<span>{paginas[rota]}</span>' in documentacao
    for arquivo in ("index.html", "visao-geral.html"):
        conteudo = Path("templates/paginas/documentacao", arquivo).read_text(encoding="utf-8")
        assert 'href="/public/documentacao/risco-restricao/"' in conteudo
        assert "MODELO_HIERARQUIZACAO_ESPACIAL.md" not in conteudo


def test_fundamentos_de_risco_e_restricao_tem_titulo_coerente_com_menu():
    response = TestClient(app).get("/public/documentacao/risco-restricao/")
    assert response.status_code == 200
    assert "Fundamentos da elegibilidade territorial — restrições e riscos" in response.text
    assert "Arcabouço Teórico-Conceitual de Risco e Restrição" not in response.text


def test_nomes_aprovados_e_excecoes_preservadas():
    inventario = templates.env.get_template("componentes/mapa_site.html").module
    paginas = {
        rota: nome
        for _, subgrupos in inventario.grupos
        for _, links in subgrupos
        for nome, rota in links
    }
    esperados = {
        "/restrict/painel/": "Mapa de demandas",
        "/restrict/demandas/": "Demandas cadastradas — tabela",
        "/restrict/demanda/": "Análise de demanda",
        "/restrict/sei-documentos/": "Cadastro de demandas a partir de PDFs do SEI",
        "/restrict/hierarquizacao/processos/": "Gestão das hierarquizações",
        "/restrict/analise-multicriterio/central-julgamentos": "Gestão de julgamentos AHP",
        "/restrict/analise-multicriterio/central-respostas": "Respostas dos especialistas aos julgamentos AHP",
        "/public/analise-multicriterio/formulario-comparacao-pareada/": "Formulário público de comparação pareada",
        "/restrict/hierarquizacao/ranking/": "Resultados e ranking de demandas",
        "/public/cadastro/": "Cadastro de demandas — acesso e orientações",
        "/public/login/": "Entrar no SICARD",
        "/restrict/complementacao/": "Complementação de dados da demanda",
        "/restrict/geoespacial/": "Central de geoprocessamento",
        "/restrict/geoespacial/visualizador-camadas/": "Visualizador de camadas geoespaciais",
        "/restrict/geoespacial/extracoes-atributos/": "Extrações de atributos realizadas",
        "/restrict/geoespacial/extracao-atributos/": "Nova extração de atributos",
        "/restrict/geoespacial/gerador-camadas-territoriais/": "Gerador de camadas de indicadores territoriais",
        "/restrict/geoespacial/explorador-camadas/": "Explorador de camadas geoespaciais",
        "/sicard/storage/web/admin/login": "Acesso administrativo ao armazenamento",
        "/sicard/storage/web/client/login": "Acesso ao gerenciador de arquivos geoespaciais",
    }
    for rota, nome in esperados.items():
        assert paginas[rota] == nome
    operador = Path("templates/paginas/admin/operador.html").read_text(encoding="utf-8")
    for rota in ("/restrict/complementacao/", "/public/cadastro/"):
        assert paginas[rota] in operador


def test_menu_e_pagina_compartilham_links_e_exibem_rotas():
    client = TestClient(app)
    home = client.get("/public/")
    mapa = client.get("/public/mapa-do-site/")
    assert home.status_code == mapa.status_code == 200
    assert 'aria-controls="mapa-site-submenu"' in home.text
    assert 'href="/public/mapa-do-site/" target="_blank" rel="noopener noreferrer"' in home.text
    inventario = templates.env.get_template("componentes/mapa_site.html").module
    for _, subgrupos in inventario.grupos:
        for _, links in subgrupos:
            for nome, rota in links:
                link = f'href="{rota}" target="_blank" rel="noopener noreferrer"'
                assert link in home.text
                assert link in mapa.text
                assert f"<code>{rota}</code>" in mapa.text
                assert nome in mapa.text
    assert "{julgamento_id}" in mapa.text
    assert "{token}" in mapa.text


def test_mapa_site_respeita_prefixo_publicado():
    response = TestClient(app).get(
        "/public/mapa-do-site/", headers={"x-forwarded-prefix": "/sicard"}
    )
    assert response.status_code == 200
    assert 'href="/sicard/restrict/painel/"' in response.text
    assert 'href="/sicard/storage/web/admin/login"' in response.text
    assert "/sicard/sicard/" not in response.text


def test_formulario_publico_generico_e_demonstrativo():
    response = TestClient(app).get(
        "/public/analise-multicriterio/formulario-comparacao-pareada/"
    )
    assert response.status_code == 200
    assert "Demonstração interativa" in response.text
    assert response.text.count('class="demo-dimensao"') == 7
    assert "Saturação e alívio de gargalos" in response.text
    assert "Risco de demanda e benefício" in response.text
    assert "T1 ·" not in response.text
    assert "colaborativa-api.js" not in response.text
    assert 'id="btn-enviar-resposta"' not in response.text
