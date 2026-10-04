"""Prefixo /sicard nos arquivos de configuração servidos em /config/."""
from fastapi.testclient import TestClient
from fastapi import FastAPI
from fastapi.responses import Response

from api.middleware.subpath_rewrite import SubpathRewriteMiddleware
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
    # O texto é testado isoladamente porque os templates AHP antigos foram arquivados.
    probe = FastAPI()
    probe.add_middleware(SubpathRewriteMiddleware)

    @probe.get("/probe.js")
    def source():
        return Response('const step = "/configuracao/";', media_type="application/javascript")

    js = TestClient(probe).get("/probe.js", headers=PREFIXO).text
    assert '"/configuracao/"' in js
    assert '/sicard/configuracao/' not in js


def test_sem_cabecalho_de_prefixo_nada_muda():
    js = TestClient(app).get("/assets/js/catalog.js").text
    assert '"/config/catalogo-slt.json"' in js
