from __future__ import annotations

import re
from pathlib import Path
from types import SimpleNamespace
from urllib.parse import urljoin, urlparse

from fastapi.testclient import TestClient

from api.server import (
    AHP_CLEAN_PAGES,
    GEOSPATIAL_PAGES,
    HIERARQUIZACAO_PROCESS_PAGES,
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


def test_no_legacy_html_remains_outside_template_directory() -> None:
    legacy_html = [
        path
        for path in Path(".").rglob("*.html")
        if ".venv" not in path.parts and "templates" not in path.parts
    ]
    assert legacy_html == []


def test_all_page_templates_compile_and_render() -> None:
    request = SimpleNamespace(url=SimpleNamespace(path="/teste/"))
    page_templates = sorted(PAGES_ROOT.rglob("*.html"))
    assert len(page_templates) == 47

    for path in page_templates:
        name = path.relative_to(TEMPLATES_ROOT).as_posix()
        rendered = templates.env.get_template(name).render(request=request)
        assert "<!DOCTYPE html>" in rendered, name


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
        for tag in re.findall(r"<[a-z][^>]*class=[""'][^""']*[""'][^>]*>", content, re.I):
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


def _canonical_pages() -> list[str]:
    pages = [
        "/public/",
        "/public/cadastro/",
        "/public/painel/",
        "/public/documentacao/",
        "/public/transparencia/",
        "/public/login/",
        "/public/ahp/colaborativa/",
        "/restrict/",
        "/restrict/hierarquizacao/",
        "/restrict/hierarquizacao/processos/",
        "/restrict/hierarquizacao/metodologia/",
        "/restrict/hierarquizacao/fase-1/",
        "/restrict/hierarquizacao/fase-2/",
        "/restrict/hierarquizacao/fase-3/",
        "/restrict/ahp/",
        "/restrict/geoespacial/",
    ]
    pages.extend(f"/public/cadastro/{name}/" for name in PUBLIC_CADASTRO_PAGES)
    pages.extend(f"/restrict/{name}/" for name in RESTRICTED_PAGES)
    pages.extend(f"/restrict/ahp/{name}/" for name in AHP_CLEAN_PAGES)
    pages.extend(
        f"/restrict/hierarquizacao/processos/{name}/"
        for name in HIERARQUIZACAO_PROCESS_PAGES
    )
    pages.extend(f"/restrict/geoespacial/{name}/" for name in GEOSPATIAL_PAGES)
    return sorted(set(pages))


def test_all_page_runtime_assets_are_local_and_available() -> None:
    client = TestClient(app)
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
    client = TestClient(app)
    links: set[str] = set()

    for page in _canonical_pages():
        response = client.get(page)
        for reference in re.findall(r"<a\b[^>]*\bhref=[\"']([^\"']+)", response.text, re.I):
            if reference.startswith(("#", "mailto:", "tel:", "javascript:")):
                continue
            if urlparse(reference).scheme:
                continue
            links.add(urljoin(page, reference))

    for link in sorted(links):
        response = client.get(link, follow_redirects=False)
        assert response.status_code < 400, (link, response.status_code)


def test_frontend_reference_data_is_explicitly_available() -> None:
    client = TestClient(app)
    references = (
        "/data/catalogo-slt.json",
        "/data/referencia-institucional.json",
        "/data/referencia-classificacao.json",
        "/data/matriz-criterios-premissas.json",
        "/data/geoespacial/biblioteca_criterios_risco_restricao.json",
        "/data/geoespacial/metricas_criterios_risco_restricao.json",
    )
    for reference in references:
        assert client.get(reference).status_code == 200, reference
