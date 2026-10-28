"""Todos os cards MOCAD/MAD devem carregar o feedback antes dos scripts locais."""
import re

from fastapi.testclient import TestClient

from api.server import app


def test_cards_mocad_mad_carregam_feedback_compartilhado():
    client = TestClient(app)
    index = client.get("/restrict/").text
    links = []
    for group in ("mocad", "mad"):
        section = re.search(
            rf'<section\b[^>]*aria-labelledby="group-{group}".*?</section>',
            index, re.S,
        )
        assert section is not None
        links.extend(re.findall(r'class="platform-tile[^"]*" href="([^"]+)"', section.group()))
    assert len(links) == 11
    for link in links:
        response = client.get(link)
        assert response.status_code == 200, link
        html = response.text
        assert "/assets/css/process_feedback_system.css" in html, link
        assert "/assets/js/notification_system.js" in html, link
        assert "/assets/js/process_feedback_unified.js" in html, link
        local_scripts = re.findall(r'<script\b[^>]*src="([^"]+)"', html)
        feedback = next(i for i, src in enumerate(local_scripts) if "process_feedback_unified.js" in src)
        assert not any(src.startswith("/restrict/") for src in local_scripts[:feedback]), link
