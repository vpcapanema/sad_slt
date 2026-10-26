"""Rotas de recursos e APIs servidas com e sem prefixo de sub-rota."""
import json
import subprocess

from fastapi.testclient import TestClient
from fastapi import FastAPI
from fastapi.responses import Response
import pytest

from api.middleware.subpath_rewrite import SubpathRewriteMiddleware
from api.server import app

PREFIXO = {"X-Forwarded-Prefix": "/sicard"}


@pytest.mark.parametrize("prefix", ["", "/sicard", "/plataforma/sicard"])
def test_superficie_carrega_apis_no_prefixo_publicado(prefix):
    response = TestClient(app).get(
        "/assets/js/paginas/superficie-criterios.js",
        headers={"X-Forwarded-Prefix": prefix},
    )
    assert response.status_code == 200
    source = response.text
    setup = source[:source.index("let catalog")]
    init = source[source.index("async function init()"):source.rindex('operation("Carregando')]
    harness = """
const assert = require('node:assert/strict');
const document = {getElementById: () => ({innerHTML: ''})};
const location = {pathname: PREFIX + '/restrict/geoespacial/gerador-superficies-favorabilidade/', search: ''};
let hierarchies, calls = [];
async function api(url) { calls.push(url); return []; }
async function loadCatalog() { await api(`${endpoint}/catalogo?territorialidade=municipios`); }
async function listSaved() {}
function escape(value) { return value; }
"""
    checks = """
init().then(() => {
  assert.deepEqual(calls, [
    PREFIX + '/api/ahp/hierarquizacoes/portfolio',
    PREFIX + '/api/ahp/superficies-criterios/catalogo?territorialidade=municipios',
  ]);
}).catch(error => { console.error(error); process.exitCode = 1; });
"""
    result = subprocess.run(
        ["node", "-"], input="const PREFIX = " + json.dumps(prefix) + ";\n" + harness + setup + init + checks,
        text=True, capture_output=True, check=False, timeout=15,
    )
    assert result.returncode == 0, result.stdout + result.stderr


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


def test_cliente_colaborativo_prefixa_base_mas_nao_segmento_publico():
    js = TestClient(app).get("/restrict/ahp/js/colaborativa-api.js", headers=PREFIXO).text
    assert 'var BASE = "/sicard/api/ahp/comparacao-colaborativa"' in js
    assert 'request("/publico/"' in js
    assert "/sicard/publico/" not in js


@pytest.mark.parametrize("aspas", ['"', "'", "`"])
def test_reescrita_respeita_limites_dos_segmentos(aspas):
    caminhos = [
        "/public", "/public/formulario", "/api?pagina=1", "/assets#inicio",
        "/restrict/", "/data/base.json", "/config/matriz.json", "/favicon.ico",
        "/publico/", "/apiario/", "/assets-extra/", "/database/", "/restriction/",
        "/favicon.ico.backup", "/configuracao/", "/sicard/public/formulario",
    ]
    esperado = [
        "/sicard/public", "/sicard/public/formulario", "/sicard/api?pagina=1", "/sicard/assets#inicio",
        "/sicard/restrict/", "/sicard/data/base.json", "/sicard/config/matriz.json", "/sicard/favicon.ico",
        *caminhos[8:],
    ]
    probe = FastAPI()
    probe.add_middleware(SubpathRewriteMiddleware)

    @probe.get("/probe.js")
    def source():
        return Response(",".join(aspas + path + aspas for path in caminhos),
                        media_type="application/javascript")

    response = TestClient(probe).get("/probe.js", headers=PREFIXO)
    assert response.text == ",".join(aspas + path + aspas for path in esperado)
