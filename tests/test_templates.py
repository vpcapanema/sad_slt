from __future__ import annotations

import re
from pathlib import Path
from types import SimpleNamespace

from fastapi.testclient import TestClient

from api.server import app, templates


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
    assert len(page_templates) == 44

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
