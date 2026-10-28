from __future__ import annotations

import re
from pathlib import Path
from types import SimpleNamespace
from urllib.parse import urljoin, urlparse

from fastapi.testclient import TestClient

from api.services.session_service import SessionUser, cookie_name, create_token
from api.server import (
    GEOSPATIAL_PAGES,
    PUBLIC_CADASTRO_PAGES,
    RESTRICTED_PAGES,
    app,
    templates,
)


TEMPLATES_ROOT = Path("templates")
PAGES_ROOT = TEMPLATES_ROOT / "paginas"


def _classes(opening_tag: str) -> list[str]:
    match = re.search(r'class=["\']([^"\']*)', opening_tag, re.I)
    return match.group(1).split() if match else []


def test_central_julgamentos_cabecalhos_e_indices_coerentes() -> None:
    request = SimpleNamespace(url=SimpleNamespace(path="/teste/"), query_params={})
    template = templates.env.get_template("paginas/analise_multicriterio/central-respostas.html")
    for mode in ("espaco", "julgamentos", "formulario"):
        html = template.render(request=request, modo_pagina=mode)
        assert "Dados do ambiente colaborativo" not in html
        assert ">Status do ambiente colaborativo</span>" not in html
        assert "2.1.1" not in html
        assert html.count("<span>Configuração do julgamento</span>") == 1
        assert "<span>Convites e acompanhamento</span>" in html
        assert "convidados para esta hierarquização" not in html
        ids = re.findall(r'\bid="([^"]+)"', html)
        assert len(ids) == len(set(ids))
        analysis = html.split('id="ami-analysis-workspace"', 1)[1].split('id="ami-create-section"', 1)[0]
        indices = re.findall(r'class="ahp-subsection-num">([^<]+)</span>', analysis)
        expected = [str(n) for n in range(1, 8)] if mode != "formulario" else [f"2.{n}" for n in range(1, 8)]
        assert indices == expected
        if mode != "formulario":
            simulation = html.split('id="ami-pairwise-panel"', 1)[1]
            assert re.findall(r'class="ahp-subsection-num">([^<]+)</span>', simulation) == ["2", "3", "3"]
        registration = html.split('class="ami-registration-grid"', 1)[1].split('id="ami-environment-actions"', 1)[0]
        assert re.findall(r'class="ahp-subsection-num">([^<]+)</span>', registration) == ["1", "2", "3", "3", "4", "5"]


def test_shared_template_contract_is_complete() -> None:
    expected = {
        TEMPLATES_ROOT / "bases/base_conteudo.html",
        TEMPLATES_ROOT / "bases/base_painel_mapa.html",
        TEMPLATES_ROOT / "componentes/navbar_publica.html",
        TEMPLATES_ROOT / "componentes/navbar_restrita.html",
        TEMPLATES_ROOT / "componentes/navbar_painel_publica.html",
        TEMPLATES_ROOT / "componentes/navbar_painel_restrita.html",
        TEMPLATES_ROOT / "componentes/footer.html",
        TEMPLATES_ROOT / "componentes/_geoprocessamento.html",
    }
    assert all(path.is_file() for path in expected)


def test_feedback_templates_load_fontawesome_icons() -> None:
    stylesheet_patterns = (
        r'(?:(?:/|\.{0,2}/)?assets/vendor/fontawesome/css/all\.min\.css(?:\?[^"\']*)?)',
        r'(?:(?:/|\.{0,2}/)?assets/vendor/fontawesome/css/fontawesome\.min\.css(?:\?[^"\']*)?)',
    )
    for template in (
        TEMPLATES_ROOT / "bases/base_conteudo.html",
        TEMPLATES_ROOT / "bases/base_painel_mapa.html",
    ):
        content = template.read_text(encoding="utf-8")
        assert any(re.search(pattern, content, re.I) for pattern in stylesheet_patterns), template


def test_no_legacy_html_remains_outside_template_directory() -> None:
    static_html_allowlist = {
        Path("assets/_preview_atributos.html"),
        Path("documentacao/apresentacao_hierarquizacao/index.html"),
        Path("documentacao/feedback-preview.html"),
        Path("preview/diagramas-hierarquizacao-opcoes.html"),
        Path("tests/browser/fixtures/elegibilidade-resultados-prototipo.html"),
    }
    legacy_html = [
        path
        for path in Path(".").rglob("*.html")
        if ".venv" not in path.parts
        and "node_modules" not in path.parts
        and "templates" not in path.parts
        # Artefatos de validação e rascunhos locais não são páginas servidas.
        and ".tmp" not in path.parts
        and "tmp" not in path.parts
        and "artifacts" not in path.parts
        and "auditoria" not in path.parts
        and Path("outputs/inventario-saidas-20261008") not in path.parents
        and Path("outputs/migracao-demandas") not in path.parents
        # plugins/ é sub-projeto de front-end próprio (build do vite) e captura
        # de páginas de fonte de dados; nada ali é página servida pela aplicação.
        and "plugins" not in path.parts
        and "legado" not in path.parts
        and "legados" not in path.parts
        # documentação e previews são materiais de apoio, não páginas runtime.
        and "documentacao" not in path.parts
        and "preview" not in path.parts
        and path not in static_html_allowlist
    ]
    assert legacy_html == []


def test_all_page_templates_compile_and_render() -> None:
    request = SimpleNamespace(url=SimpleNamespace(path="/teste/"), query_params={})
    page_templates = sorted(PAGES_ROOT.rglob("*.html"))
    # Guarda contra varredura vazia (que faria o teste passar sem renderizar
    # nada); o número exato mudava a cada página nova e só dava falso alarme.
    assert len(page_templates) >= 35

    for path in page_templates:
        name = path.relative_to(TEMPLATES_ROOT).as_posix()
        rendered = templates.env.get_template(name).render(request=request)
        assert "<!DOCTYPE html>" in rendered, name

def test_deprecated_ahp_templates_and_exclusive_scripts_are_archived() -> None:
    runtime_pages = Path("templates/paginas/ahp")
    archived_pages = Path("legado/templates/paginas/ahp")
    archived_scripts = Path("legado/assets/js/paginas")
    runtime_scripts = Path("assets/js/paginas")

    assert not runtime_pages.exists()
    assert len(list(archived_pages.glob("*.html"))) == 10
    assert len(list(archived_scripts.glob("ahp-*.js"))) == 12
    assert not list(runtime_scripts.glob("ahp-*.js"))


def test_templates_have_no_inline_css_or_javascript() -> None:
    for path in TEMPLATES_ROOT.rglob("*.html"):
        content = path.read_text(encoding="utf-8")
        assert "<style" not in content.lower(), path
        assert not re.search(r"<script(?![^>]*\bsrc=)", content, re.I), path
        assert not re.search(r"\sstyle=", content, re.I), path
        assert not re.search(r"\son[a-z]+=", content, re.I), path


def test_content_elements_have_semantic_canonical_classes() -> None:
    for path in PAGES_ROOT.rglob("*.html"):
        content = path.read_text(encoding="utf-8")
        for tag in re.findall(r"<main\b[^>]*>", content, re.I):
            assert "conteudo-principal" in _classes(tag), (path, tag)
        for tag in re.findall(r"<section\b[^>]*>", content, re.I):
            assert any(name.startswith("secao-") for name in _classes(tag)), (path, tag)
        for tag in re.findall(r"""<[a-z][^>]*class=["'][^"']*["'][^>]*>""", content, re.I):
            classes = _classes(tag)
            if "card" in classes or "module-card" in classes:
                assert any(name.startswith("card-") for name in classes), (path, tag)


def test_public_restricted_and_panel_navbars_are_server_rendered() -> None:
    client = TestClient(app)
    checks = {
        "/public/": "navbar-publica",
        "/restrict/": "navbar-restrita",
        "/public/painel/": "navbar-painel-publica",
        "/restrict/painel/": "navbar-painel-restrita",
        "/restrict/geoespacial/bancada/": "componente-geoprocessamento",
    }
    for route, marker in checks.items():
        response = client.get(route)
        assert response.status_code == 200, route
        assert marker in response.text, route


def test_demandante_classification_precedes_demand_category() -> None:
    template = (PAGES_ROOT / "cadastro/nova-demanda.html").read_text(encoding="utf-8")
    demandante = template.index('id="demandante-selector"')
    categoria = template.index('id="tipo-selector"')
    assert demandante < categoria
    assert 'data-demandante="institucional"' in template
    assert 'data-demandante="privada"' in template


def test_project_geometry_section_offers_upload_and_map_drawing() -> None:
    template = (PAGES_ROOT / "cadastro/nova-demanda.html").read_text(encoding="utf-8")
    assert template.index('class="geometry-source-selector"') < template.index('id="upload-geometria"')
    assert 'value="upload"' in template
    assert 'value="desenhar"' in template
    assert 'accept=".kmz,.kml,.gpkg,.zip,.geojson' in template
    for geometry_type in ("Point", "LineString", "Polygon"):
        assert f'data-geometria-tipo="{geometry_type}"' in template
    assert 'id="geometry-point-coordinates"' in template
    assert 'id="geometry-map-section"' in template
    assert 'id="btn-concluir-desenho"' in template
    assert 'id="btn-apontar-mapa"' not in template
    assert '>Desenhar no mapa</button>' in template
    assert template.index('id="btn-nova-geometria"') < template.index('id="btn-concluir-desenho"') < template.index('id="btn-limpar-mapa"')
    for command in ("Adicionar geometria", "Confirmar geometria", "Limpar geometria"):
        assert f'aria-label="{command}"' in template


def test_project_geometry_map_has_accessible_resize_handle() -> None:
    template = (PAGES_ROOT / "cadastro/nova-demanda.html").read_text(encoding="utf-8")
    handle = re.search(r'<div\b[^>]*id="geometry-map-resize"[^>]*>', template)
    assert handle is not None
    for attribute in ('role="separator"', 'aria-orientation="horizontal"', 'aria-controls="map"', 'tabindex="0"'):
        assert attribute in handle.group()
    assert template.index('id="map"') < template.index('id="geometry-map-resize"') < template.index('id="map-status"')


def test_project_geometry_loads_status_palette_before_drawing() -> None:
    template = (PAGES_ROOT / "cadastro/nova-demanda.html").read_text(encoding="utf-8")
    assert template.index('src="/assets/js/status-colors.js"') < template.index('src="/public/cadastro/geometria.js"')


def test_public_registration_guidance_requires_operator_and_links_sigma() -> None:
    client = TestClient(app)
    for route in ("/public/cadastro/", "/public/documentacao/", "/public/login/"):
        response = client.get(route)
        assert response.status_code == 200
        assert "Operador" in response.text
        assert "https://56.125.163.194/cadastro/sigma" in response.text
    for route in ("/public/cadastro/", "/public/documentacao/"):
        content = client.get(route).text
        assert "https://56.125.163.194/cadastro/instituicao" in content
        assert "/public/login/?next=/public/cadastro/nova-demanda/" in content


def test_restricted_home_groups_operator_and_territorial_actions() -> None:
    content = TestClient(app).get("/restrict/").text

    def group(identifier: str) -> str:
        match = re.search(r'<section\b[^>]*aria-labelledby="' + identifier + r'"[^>]*>.*?</section>', content, re.S)
        assert match is not None
        return match.group()

    operator = group("group-operador")
    mocad = group("group-mocad")
    public = group("group-publico")
    mad = group("group-mad")
    assert "Cadastrar nova demanda" in operator
    assert "Complementação de dados da demanda" in operator
    assert content.index('id="group-operador"') > content.index('id="group-publico"')
    assert content.index('id="group-operador"') > content.index('id="group-catalogos"')
    assert "Complementação de cadastro" not in mocad
    assert "Cadastro de demandas — acesso e orientações" in public
    assert "/public/cadastro/nova-demanda/" not in public
    assert "Formulário colaborativo AHP" not in public
    assert "/public/ahp/colaborativa/" not in mad
    ahp = mad.split("subgroup-analise-multicriterio-ahp-e-obtencao-de-pesos", 1)[1].split("subgroup-ranqueamento", 1)[0]
    assert re.findall(r'class="platform-tile__label">([^<]+)</span>', ahp) == [
        "Agrupamento de demandas",
        "Gestão das hierarquizações",
        "Gestão de julgamentos AHP",
        "Respostas dos especialistas aos julgamentos AHP",
    ]
    assert "?modo=formulario" not in mad
    assert mad.index("Organização das hierarquizações e julgamentos AHP") < mad.index("Avaliação territorial e priorização")
    assert 'class="platform-tile platform-tile--amber" href="/restrict/agrupamento-demandas/"' in ahp
    ranking = mad.split("subgroup-ranqueamento", 1)[1]
    assert set(re.findall(r'href="([^"]+)"', ranking)) == {
        "/restrict/hierarquizacao/fase-1/",
        "/restrict/hierarquizacao/fase-2/",
        "/restrict/hierarquizacao/fase-3/",
    }
    assert "Documentação metodológica" not in ranking
    assert "cadastro-upload-" not in content
    assert "Extração de atributos" not in mad
    assert "/restrict/geoespacial/extracoes-atributos/" not in mad
    assert "/restrict/geoespacial/gerador-camadas-territoriais/" not in mad
    assert "subgroup-agrupamento-demandas-extracao-atributos" not in content
    assert 'href="/restrict/agrupamento-demandas/"' in mad
    assert "Agrupamento de demandas" in mad


def test_restricted_home_public_catalogs_and_operator_form_second_row() -> None:
    content = TestClient(app).get("/restrict/").text
    assert re.findall(r'<section\b[^>]*aria-labelledby="group-([^"]+)"', content) == [
        "mocad",
        "mad",
        "resultados",
        "publico",
        "catalogos",
        "operador",
        "geoprocessamento",
        "administracao",
    ]


def test_restricted_demands_table_exposes_audit_names_and_timestamps() -> None:
    response = TestClient(app).get("/restrict/demandas/")
    assert response.status_code == 200
    for label in (
        "Criado por",
        "Cadastro",
        "Atualizado por",
        "Atualização",
        "Aprovado por",
        "Aprovação",
        "Reprovado por",
        "Reprovação",
    ):
        assert response.text.count(f'<th scope="col">{label}</th>') == 3

    script = Path("admin/demandas.js").read_text(encoding="utf-8")
    assert "d.criadoPorNome" in script
    assert "d.atualizadoPorNome" in script
    assert "d.aprovadoPorNome" in script
    assert "d.reprovadoPorNome" in script
    assert "d.criado_por" not in script


def test_restricted_demands_table_has_dependent_column_and_value_filters() -> None:
    response = TestClient(app).get("/restrict/demandas/")
    assert response.status_code == 200
    assert 'class="admin-filter-bar"' in response.text
    assert 'id="filtro-coluna" aria-label="Coluna do filtro"' in response.text
    assert 'id="filtro-valor" aria-label="Valor do filtro" disabled' in response.text
    assert 'id="filtro-inverter"' in response.text
    assert 'id="filtro-limpar"' in response.text
    assert 'id="filtro-busca"' not in response.text

    script = Path("admin/demandas.js").read_text(encoding="utf-8")
    assert "COLUMNS[tipo].forEach((column, index)" in script
    assert "updateColumnValueFilter" in script
    assert "columnDisplayValue(column, d)" in script


def test_restricted_home_geoprocessing_subgroups_and_independent_accesses() -> None:
    content = TestClient(app).get("/restrict/").text
    match = re.search(r'<section\b[^>]*aria-labelledby="group-geoprocessamento"[^>]*>.*?</section>', content, re.S)
    assert match is not None
    geo = match.group()
    label_pattern = r'class="platform-tile__label">([^<]+)</span>'
    accesses = geo.split('class="platform-subgroups"', 1)[0]
    assert re.findall(label_pattern, accesses) == [], "todos os acessos vivem nos subcards"
    groups = {
        name: re.findall(label_pattern, markup)
        for name, markup in re.findall(r'class="platform-subgroup subgroup-([\w-]+)">(.*?)</div>\s*</div>', geo, re.S)
    }
    assert groups == {
        "geoprocessamento": [
            "Central de geoprocessamento",
            "Visualizador de camadas geoespaciais",
            "Extrações de atributos realizadas",
            "Gerador de camadas de indicadores territoriais",
            "Gerador de superfícies de favorabilidade",
            "Bancada de geoprocessamento",
            "Explorador de camadas geoespaciais",
            "Nova extração de atributos",
            "Transparência, procedimentos e rastreabilidade das camadas territoriais",
        ],
        "documentacao-tecnica": [
            "Fundamentos da elegibilidade territorial — restrições e riscos",
            "Fundamentos da favorabilidade territorial e da rede rodoviária",
            "Fundamentos do limite marítimo de referência de São Paulo",
            "Glossário técnico-conceitual",
            "Especificação da priorização de demandas por atributos",
        ],
    }
    index_css = Path("admin/index.css").read_text(encoding="utf-8")
    assert ".secao-platform-geoprocessamento .platform-subgroup .platform-grid {" in index_css
    assert "grid-template-columns: repeat(2, minmax(0, 1fr));" in index_css
    assert "grid-template-columns: 1fr;" in index_css
    for href in (
        "/restrict/geoespacial/gerador-camadas-territoriais/",
        "/restrict/geoespacial/extracoes-atributos/",
    ):
        assert content.count(f'href="{href}"') == 1
        assert f'class="platform-tile platform-tile--green" href="{href}"' in geo
    assert content.count('href="/restrict/geoespacial/extracao-atributos/"') == 1
    assert 'aria-labelledby="group-documentacao-ranqueamento"' not in content
    assert "/restrict/hierarquizacao/" not in geo


def test_restricted_home_group_headers_have_complete_structure() -> None:
    content = TestClient(app).get("/restrict/").text
    headers = re.findall(r'<div class="platform-group__heading">\s*<div>(.*?)</div>\s*</div>', content, re.S)
    assert len(headers) == content.count('class="platform-group secao-platform-')
    assert headers
    for header in headers:
        assert re.search(r'<h2 id="group-[^"]+">[^<]+</h2>', header)
        assert re.search(r'<p class="platform-group__subtitle">[^<]+</p>', header)
        assert re.search(r'<p class="platform-group__description">[^<]+</p>', header)


def test_phase_navigation_excludes_operational_tools_bar() -> None:
    content = templates.env.get_template("componentes/navegacao_fases_hierarquizacao.html").render(fase_ativa=2)
    assert "hier-link-bar--tools" not in content
    assert content.count("<nav ") == 1
    assert 'aria-label="Fluxo canônico da hierarquização"' in content
    assert '/restrict/hierarquizacao/fase-2/" class="active" aria-current="page"' in content


def _canonical_pages() -> list[str]:
    pages = [
        "/public/",
        "/public/cadastro/",
        "/public/painel/",
        "/public/documentacao/",
        "/public/transparencia/",
        "/public/login/",
        "/public/analise-multicriterio/formulario-comparacao-pareada/token-de-teste/",
        "/restrict/",
        "/restrict/hierarquizacao/",
        "/restrict/hierarquizacao/processos/",
        "/restrict/agrupamento-demandas/",
        "/restrict/hierarquizacao/metodologia/",
        "/restrict/hierarquizacao/fase-1/",
        "/restrict/hierarquizacao/fase-2/",
        "/restrict/hierarquizacao/fase-3/",
        "/restrict/geoespacial/",
    ]
    pages.extend(f"/public/cadastro/{name}/" for name in PUBLIC_CADASTRO_PAGES)
    pages.extend(f"/restrict/{name}/" for name in RESTRICTED_PAGES)
    # AHP e as etapas avulsas foram descontinuados (410) e arquivados fora de templates/.
    pages.extend(f"/restrict/geoespacial/{name}/" for name in GEOSPATIAL_PAGES)
    return sorted(set(pages))


def test_all_page_runtime_assets_are_local_and_available() -> None:
    client = TestClient(app)
    client.cookies.set(cookie_name(), create_token(SessionUser(
        id="00000000-0000-0000-0000-000000000010",
        email="operador@example.org",
        username="teste_operador",
        nome="Operador de teste",
        tipo_usuario="OPERADOR",
    )))
    assets: set[str] = set()

    for page in _canonical_pages():
        response = client.get(page)
        assert response.status_code == 200, page
        for tag in re.findall(r"<(?:script|link|img)\b[^>]*>", response.text, re.I):
            match = re.search(r"(?:src|href)=[\"']([^\"']+)", tag, re.I)
            if not match:
                continue
            reference = match.group(1)
            if reference.startswith(("data:", "#")):
                continue
            assert urlparse(reference).scheme not in {"http", "https"}, (page, reference)
            assets.add(urljoin(page, reference))

    for asset in sorted(assets):
        assert client.get(asset).status_code == 200, asset


def test_stylesheet_resource_references_are_available() -> None:
    client = TestClient(app)
    references: set[str] = set()

    for path in Path("assets").rglob("*.css"):
        url = "/" + path.as_posix()
        response = client.get(url)
        assert response.status_code == 200, url
        for reference in re.findall(r"url\([\"']?([^\"')]+)", response.text, re.I):
            if reference.startswith(("data:", "#")) or urlparse(reference).scheme:
                continue
            references.add(urljoin(url, reference))

    for reference in sorted(references):
        assert client.get(reference).status_code == 200, reference


def test_all_internal_page_links_resolve() -> None:
    # Anônimo, toda página protegida responde 401 e o teste não distinguia isso
    # de rota inexistente. Autenticado, o rastreio cobre também os links que só
    # existem para quem tem acesso — que é onde um link morto passaria batido.
    client = TestClient(app)
    client.cookies.set(
        cookie_name(),
        create_token(
            SessionUser(
                id="00000000-0000-0000-0000-000000000010",
                email="admin@example.org",
                username="teste_admin",
                nome="Admin de teste",
                tipo_usuario="ADMIN",
            )
        ),
    )
    links: set[str] = set()

    for page in _canonical_pages():
        response = client.get(page)
        for reference in re.findall(r"<a\b[^>]*\bhref=[\"']([^\"']+)", response.text, re.I):
            if reference.startswith(("#", "mailto:", "tel:", "javascript:")):
                continue
            if urlparse(reference).scheme:
                continue
            # Storage (SFTPGo): publicado pelo Nginx da VM, fora desta aplicação.
            if reference.startswith("/sicard/storage/"):
                continue
            links.add(urljoin(page, reference))

    for link in sorted(links):
        response = client.get(link, follow_redirects=False)
        assert response.status_code < 400, (link, response.status_code)


def test_frontend_reference_data_is_explicitly_available() -> None:
    client = TestClient(app)
    references = (
        "/config/catalogo-slt.json",
        "/config/referencia-institucional.json",
        "/config/referencia-classificacao.json",
        "/config/matriz-criterios-premissas.json",
        "/config/geoespacial/biblioteca_criterios_risco_restricao.json",
        "/config/geoespacial/metricas_criterios_risco_restricao.json",
    )
    for reference in references:
        assert client.get(reference).status_code == 200, reference
