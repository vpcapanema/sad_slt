"""Contrato público do glossário, incluindo navegação e publicação em subrota."""
from html.parser import HTMLParser

import pytest
from fastapi.testclient import TestClient

from api.server import app


class GlossarioParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = []
        self.links = []
        self.assets = []
        self.termos = []

    def handle_starttag(self, tag, attrs):
        attributes = dict(attrs)
        if "id" in attributes:
            self.ids.append(attributes["id"])
        if tag == "a":
            self.links.append(attributes.get("href", ""))
        if tag in ("link", "script"):
            self.assets.append(attributes.get("src", attributes.get("href", "")))
        if "glossario-entrada" in attributes.get("class", "").split():
            self.termos.append(attributes["id"])


@pytest.mark.parametrize("prefixo", ["", "/sicard"])
def test_glossario_publico_renderiza_termos_e_links_validos(prefixo):
    client = TestClient(app)
    response = client.get(
        "/public/documentacao/glossario/",
        headers={"X-Forwarded-Prefix": prefixo},
    )
    assert response.status_code == 200
    assert 'data-requer-autenticacao="true"' not in response.text
    parser = GlossarioParser()
    parser.feed(response.text)
    assert parser.termos
    assert len(parser.ids) == len(set(parser.ids))
    for link in parser.links:
        if link.startswith("#"):
            assert link[1:] in parser.ids, link
    for termo in parser.termos:
        assert f"#{termo}" in parser.links
    locais = [
        link for link in parser.links + parser.assets
        if link.startswith(f"{prefixo}/public/documentacao/")
        or "glossario.css" in link or "glossario.js" in link
    ]
    assert f"{prefixo}/public/documentacao/" in locais
    for link in locais:
        assert link.startswith(f"{prefixo}/")
        path = link.removeprefix(prefixo) if prefixo else link
        assert client.get(path).status_code == 200, link


def test_documentacao_oferece_acesso_ao_glossario():
    response = TestClient(app).get("/public/documentacao/")
    assert response.status_code == 200
    assert 'href="/public/documentacao/glossario/"' in response.text
