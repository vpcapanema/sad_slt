"""O novo invólucro visual conserva o conteúdo científico do relatório."""
import re
from html import unescape
from urllib.parse import urljoin

import pytest
from fastapi.testclient import TestClient

from api.path_policy import project_path
from api.server import app
from api.services.documentacao_favorabilidade_v2 import RELATORIO, RECURSOS


@pytest.mark.parametrize('prefixo', ['', '/sicard'])
def test_relatorio_publico_reutiliza_base_e_preserva_dados(prefixo):
    original = project_path(RELATORIO).read_text(encoding='utf-8')
    resposta = TestClient(app).get('/public/documentacao_favorabilidade_v2/',
        headers={'X-Forwarded-Prefix': prefixo} if prefixo else {})
    assert resposta.status_code == 200
    html = resposta.text
    assert 'data-navegacao="publica"' in html
    assert 'class="cabecalho-glossario standard-page-hero"' in html
    assert 'class="standard-page-hero__eyebrow"' in html
    assert 'Referencial técnico' in html
    assert prefixo + '/assets/css/glossario.css' in html
    assert 'cabecalho-principal app-header' in html
    assert 'rodape-institucional' in html
    assert '<style>' not in html
    assert resposta.headers['Cache-Control'] == 'no-store'

    assert re.findall(r'<math\b.*?</math>', original, re.S) == re.findall(r'<math\b.*?</math>', html, re.S)
    def celulas(documento):
        return [unescape(re.sub('<[^>]+>', '', c)).strip()
                for c in re.findall(r'<t[dh]\b[^>]*>(.*?)</t[dh]>', documento, re.S)]
    assert celulas(original) == celulas(html)
    mapas = re.findall(r'<img\b[^>]*src="([^"]+)"', original)
    assert len(mapas) == 48
    for mapa in mapas:
        assert prefixo + urljoin(RECURSOS, mapa) in html
    assert html.count('class="secao-relatorio glossario-grupo"') == 10
    assert html.count('class="admin-table hier-register-table ami-table--database') == 5


def test_rota_anterior_apresenta_o_mesmo_relatorio():
    client = TestClient(app)
    assert client.get('/documentacao_favorabilidade_v2/').text == client.get('/public/documentacao_favorabilidade_v2/').text
