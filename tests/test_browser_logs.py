"""Diagnóstico de navegador executado em Node, sem banco, rede ou credenciais."""
from pathlib import Path
import subprocess


def test_browser_logs_runtime():
    script = r"""
const vm = require("node:vm"), fs = require("node:fs"), assert = require("node:assert/strict");
const source = fs.readFileSync("assets/js/browser-logs.js", "utf8");
function setup(page = "fase1", search = "", stored = null, blocked = false) {
  const messages = [], events = {}, dom = {};
  const context = {
    URL, URLSearchParams, performance: {now: () => 10},
    location: {href: "https://sicard.test/restrict/hierarquizacao/fase-1/", search},
    localStorage: {getItem() { if (blocked) throw Error("blocked"); return stored; }},
    document: {currentScript: {dataset: {sicardLogPage: page}}, readyState: "loading",
      addEventListener: (name, fn) => { dom[name] = fn; }},
    addEventListener: (name, fn) => { events[name] = fn; },
    console: Object.fromEntries(["info", "warn", "error"].map(level => [level, (...args) => messages.push({level, args})])),
    fetch: async () => ({status: 200, ok: true}),
  };
  context.window = context;
  vm.createContext(context); vm.runInContext(source, context);
  return {context, messages, events, dom, logger: context.SICARDBrowserLogs};
}
(async () => {
  for (const page of ["fase1", "fase2", "fase3", "processos", "agrupamentos", "julgamentos", "respostas"]) {
    const state = setup(page, "?sicard_logs=verbose"), {context, logger, messages, events, dom} = state;
    assert.equal(logger.status().pagina, page);
    assert.equal(logger.status().verbose, true);
    events.load();
    assert(messages.some(m => m.args[0].includes("pagina.carregada")));
    const secret = "PRIVATE_EMAIL_TOKEN_FILE";
    logger.log("teste", {rota: "https://user:password@other.test/api/ahp/hierarquizacoes/" + secret + "?token=" + secret,
      body: secret, headers: {Authorization: secret}, message: secret, alvo: secret, status_http: 200});
    assert(!JSON.stringify(messages).includes(secret));
    const safe = messages.at(-1).args[1];
    assert.equal(safe.rota, "/api/ahp/hierarquizacoes/:ref");
    assert(Object.isFrozen(safe));
    let called = 0;
    const originalResponse = {status: 422, ok: false, json() { throw Error("Body must not be read"); }};
    const options = {method: "POST", headers: {Authorization: secret}, body: secret};
    context.fetch = async (input, received) => { called++; assert.equal(received, options); return originalResponse; };
    const fetchBefore = context.fetch;
    assert.equal(await logger.fetch("/api/agrupamentos-demandas?email=" + secret, options), originalResponse);
    assert.equal(called, 1);
    assert.equal(context.fetch, fetchBefore);
    assert.equal(messages.at(-1).level, "error");
    assert.equal(messages.at(-1).args[1].status_http, 422);
    assert.equal(messages.at(-1).args[1].duracao_ms, 0);
    assert(!JSON.stringify(messages).includes(secret));
    const error = Object.assign(Error(secret), {name: "TimeoutError"});
    context.fetch = async () => { throw error; };
    await assert.rejects(logger.fetch("/api/ahp/hierarquizacoes"), e => e === error);
    assert.equal(messages.at(-1).args[1].erro, "TimeoutError");
    const target = {tagName: "BUTTON", id: "ev-run", value: secret};
    target.closest = () => target;
    dom.click({target});
    assert.equal(messages.at(-1).args[1].alvo, "ev-run");
    dom.invalid({target});
    assert.equal(messages.at(-1).args[1].valido, false);
    const listenerCount = Object.keys(events).length;
    vm.runInContext(source, context);
    assert.equal(context.SICARDBrowserLogs, logger);
    assert.equal(Object.keys(events).length, listenerCount);
    logger.desativar();
    const count = messages.length;
    logger.log("silencioso"); dom.click({target});
    assert.equal(messages.length, count);
    events.unhandledrejection({reason: Error(secret)});
    assert.equal(messages.length, count + 1);
    assert.equal(messages.at(-1).level, "error");
    assert(!JSON.stringify(messages).includes(secret));
  }
  assert.equal(setup("other").logger, undefined);
  assert.equal(setup("fase1").logger.status().verbose, false);
  assert.equal(setup("fase1", "", "verbose").logger.status().verbose, true);
  assert.equal(setup("fase1", "?sicard_logs=off", "verbose").logger.status().verbose, false);
  assert.equal(setup("fase1", "?sicard_logs=verbose", null, true).logger.status().verbose, true);
  const existing = setup("fase2", "?sicard_logs=verbose");
  vm.runInContext(fs.readFileSync("geoespacial/extracao-atributos/logger.js", "utf8").replace(/\bexport /g, ""), existing.context);
  vm.runInContext("const trace = iniciarHttp('/extracao-atributos/execucoes/private-job'); trace.concluir(503);", existing.context);
  assert(existing.messages.some(m => m.args[0].includes("http.fim") && m.level === "error"));
  assert(!JSON.stringify(existing.messages).includes("private-job"));
  existing.logger.desativar();
  vm.runInContext("falha('http', new TypeError('private-body'));", existing.context);
  assert.equal(existing.messages.at(-1).level, "error");
  assert(!JSON.stringify(existing.messages).includes("private-body"));
  // Mesmo um console indisponível não pode bloquear a chamada ou alterar seu resultado.
  existing.context.console.error = () => { throw Error("console blocked"); };
  existing.context.fetch = async () => ({status: 500, ok: false});
  assert.equal((await existing.logger.fetch("/api/ahp/hierarquizacoes")).status, 500);
})().catch(error => { console.error(error); process.exitCode = 1; });
"""
    result = subprocess.run(["node", "-e", script], capture_output=True, text=True, cwd=Path(__file__).resolve().parents[1], check=False)
    assert result.returncode == 0, result.stdout + result.stderr


def test_browser_logs_template_wiring():
    from jinja2 import Environment

    root = Path(__file__).resolve().parents[1]
    pages = {
        "hierarquizacao/fase1-elegibilidade-v2.html": "fase1",
        "hierarquizacao/fase2-favorabilidade-v2.html": "fase2",
        "hierarquizacao/fase3-ajuste-fino.html": "fase3",
        "hierarquizacao/home.html": "processos",
        "hierarquizacao/agrupamentos.html": "agrupamentos",
        "analise_multicriterio/central-respostas.html": None,
    }
    for path, scope in pages.items():
        text = (root / "templates" / "paginas" / path).read_text(encoding="utf-8")
        Environment().parse(text)
        assert text.count('src="/assets/js/browser-logs.js?') == 1
        assert "{% block antes_conteudo %}" in text
        if scope:
            assert f'data-sicard-log-page="{scope}"' in text
        else:
            assert "'respostas' if modo_pagina == 'julgamentos' else 'julgamentos'" in text


def test_browser_logs_served_pages():
    import re

    from fastapi.testclient import TestClient

    from api.server import app
    from api.services.session_service import SessionUser, cookie_name, create_token

    client = TestClient(app)
    client.cookies.set(cookie_name(), create_token(SessionUser(
        "00000000-0000-4000-8000-000000000001", "teste@example.org", "teste_ADMIN", "Teste", "ADMIN",
    )))
    routes = {
        "/restrict/hierarquizacao/fase-1/": "fase1",
        "/restrict/hierarquizacao/fase-2/": "fase2",
        "/restrict/hierarquizacao/fase-3/": "fase3",
        "/restrict/hierarquizacao/processos/": "processos",
        "/restrict/agrupamento-demandas/": "agrupamentos",
        "/restrict/analise-multicriterio/central-julgamentos": "julgamentos",
        "/restrict/analise-multicriterio/central-respostas": "respostas",
    }
    for route, scope in routes.items():
        response = client.get(route)
        assert response.status_code == 200
        assert f'data-sicard-log-page="{scope}"' in response.text
        sources = re.findall(r'<script\b[^>]*src="([^"]+)"', response.text)
        logger = next(i for i, src in enumerate(sources) if "/assets/js/browser-logs.js" in src)
        consumers = [i for i, src in enumerate(sources) if any(name in src for name in (
            "hier-api.js", "admin-api.js", "fase1-elegibilidade-v2.js", "fase2-favorabilidade-v2.js",
            "fase3.js", "processos.js", "analise-multicriterio-julgamentos.js", "agrupamentos-demandas.js",
        ))]
        assert consumers and logger < min(consumers), route
