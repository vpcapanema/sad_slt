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


def test_mocad_oferece_central_e_copia_do_cadastro():
    origem = Path("templates/paginas/admin/index.html").read_text(encoding="utf-8")
    mocad = re.search(r'<section\b[^>]*aria-labelledby="group-mocad".*?</section>', origem, re.S)
    assert mocad is not None
    for rota, titulo in (
        ("/restrict/central-pendencias/", "Central de pendências"),
        ("/public/cadastro/", "Cadastro de demandas — acesso e orientações"),
    ):
        assert re.search(rf"link_card\('{re.escape(rota)}', '[^']+', '{re.escape(titulo)}', 'blue'\)", mocad.group())
    assert origem.count("link_card('/public/cadastro/',") == 2
    inventario = templates.env.get_template("componentes/mapa_site.html").module
    paginas_mocad = {rota for _, links in inventario.grupos[0][1] for _, rota in links}
    assert {"/restrict/central-pendencias/", "/public/cadastro/"} <= paginas_mocad


def test_mad_reorganiza_preparacao_fases_e_julgamentos():
    origem = Path("templates/paginas/admin/index.html").read_text(encoding="utf-8")
    hierarquizacao = re.search(
        r'<div class="platform-subgroup subgroup-ranqueamento">(.*?)</div>\s*</div>', origem, re.S)
    assert hierarquizacao is not None
    assert '<h3 class="platform-subgroup__title">Hierarquização de Demandas</h3>' in hierarquizacao.group()
    cards = re.findall(r"link_card\('([^']+)', '[^']+', '([^']+)', 'green', '([^']+)'\)",
                       hierarquizacao.group())
    assert cards == [
        ("/restrict/agrupamento-demandas/", "Agrupamento de demandas", "Preparação"),
        ("/restrict/hierarquizacao/processos/", "Cadastrar Hierarquização", "Preparação"),
        ("/restrict/hierarquizacao/fase-1/", "Elegibilidade Territorial", "Fase 1"),
        ("/restrict/hierarquizacao/fase-2/", "Favorabilidade territorial e de rede", "Fase 2"),
        ("/restrict/hierarquizacao/fase-3/", "Priorização por atributos", "Fase 3"),
    ]
    julgamentos = re.search(
        r'<div class="platform-subgroup subgroup-analise-multicriterio-ahp-e-obtencao-de-pesos">(.*?)</div>\s*</div>',
        origem, re.S)
    assert julgamentos is not None
    assert '<h3 class="platform-subgroup__title">Central de Julgamentos AHP</h3>' in julgamentos.group()
    assert re.findall(r"link_card\('([^']+)', '[^']+', '([^']+)'", julgamentos.group()) == [
        ("/restrict/analise-multicriterio/central-julgamentos", "Gestão de julgamentos AHP"),
        ("/restrict/analise-multicriterio/central-respostas", "Gestão de Respostas"),
    ]
    inventario = templates.env.get_template("componentes/mapa_site.html").module
    grupos_mad = dict(inventario.grupos[1][1])
    assert list(grupos_mad) == ["Central de Julgamentos AHP", "Hierarquização de Demandas"]
    assert grupos_mad["Hierarquização de Demandas"] == [(titulo, rota) for rota, titulo, _ in cards]


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
        "/restrict/hierarquizacao/processos/": "Cadastrar Hierarquização",
        "/restrict/analise-multicriterio/central-julgamentos": "Gestão de julgamentos AHP",
        "/restrict/analise-multicriterio/central-respostas": "Gestão de Respostas",
        "/public/analise-multicriterio/formulario-comparacao-pareada/": "Formulário público de comparação pareada",
        "/restrict/hierarquizacao/homologacao-ranking-publicacao/": "Homologação, Ranking e Publicação",
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


def test_formulario_publico_e_o_formulario_do_colaborador_em_modo_modelo():
    response = TestClient(app).get(
        "/public/analise-multicriterio/formulario-comparacao-pareada/"
    )
    assert response.status_code == 200
    for elemento in (
        'id="collab-context"', 'id="btn-liberar-form"', 'id="comparisonContent"',
        'id="btn-enviar-resposta"', "Passo a passo da sua participação",
        "colaborativa-api.js", "colaborativa-modelo.js",
    ):
        assert elemento in response.text
    assert 'id="colab-token"' not in response.text
    assert "colaborativa-simulacao.js" not in response.text


def test_modelo_pli_compara_sete_criterios_agrupados_em_tres_blocos():
    response = TestClient(app).get("/api/ahp/comparacao-colaborativa/modelo-pli")
    assert response.status_code == 200
    corpo = response.json()
    assert [d["nome"] for d in corpo["dimensoes"]] == [
        "Mérito e resultados", "Sustentabilidade e território", "Capacidade de entrega",
    ]
    assert corpo["criterios"] == [
        "D1 · Eficiência logística", "D2 · Econômica", "D3 · Social e territorial",
        "D4 · Segurança", "D5 · Ambiental e climática",
        "D6 · Viabilidade institucional e financeira", "D7 · Riscos",
    ]
    assert [d["criterios"] for d in corpo["dimensoes"]] == [
        corpo["criterios"][:2], corpo["criterios"][2:5], corpo["criterios"][5:],
    ]
    assert "Simular" in corpo["objetivo"]
    assert "sem gravação" in corpo["objetivo"]
    assert response.headers["cache-control"] == "no-store"


def test_dimensoes_pli_ficam_fora_das_categorias_de_extracao():
    from api.services import extracao_atributos, municipal_layer

    nomes_pli = {"Técnica e logística", "Econômica", "Social e territorial", "Riscos"}
    assert not nomes_pli & {c["nome"] for c in municipal_layer.categorias()}
    assert not nomes_pli & {c["nome"] for c in extracao_atributos.catalogo()["categorias"]}
