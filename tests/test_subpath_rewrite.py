"""Prefixo /sicard nos arquivos de configuração servidos em /config/."""
from fastapi.testclient import TestClient

from api.server import app

PREFIXO = {"X-Forwarded-Prefix": "/sicard"}


def test_catalogo_recebe_o_prefixo_da_sub_rota():
    # O catálogo saiu de /data/ para /config/ e o middleware não acompanhou:
    # em produção o fetch ia para /config/catalogo-slt.json, fora de /sicard/,
    # e quebrava cadastro, análise de demanda e o repositório do SEI.
    js = TestClient(app).get("/assets/js/catalog.js", headers=PREFIXO).text
    assert '"/sicard/config/catalogo-slt.json"' in js
    assert '"/config/catalogo-slt.json"' not in js


def test_texto_que_so_comeca_com_config_nao_e_prefixado():
    # O AHP compara location.pathname com "/configuracao/"; prefixar esse
    # texto quebraria a detecção da etapa sob /sicard/.
    js = TestClient(app).get("/restrict/ahp/js/ahp-config-formfill.js", headers=PREFIXO).text
    assert '"/configuracao/"' in js
    assert '/sicard/configuracao/' not in js


def test_sem_cabecalho_de_prefixo_nada_muda():
    js = TestClient(app).get("/assets/js/catalog.js").text
    assert '"/config/catalogo-slt.json"' in js
