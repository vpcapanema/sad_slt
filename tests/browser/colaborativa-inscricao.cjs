const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { chromium } = require('playwright');

const base = process.env.SICARD_TEST_URL || 'http://127.0.0.1:8083';
const token = 'rodada-inscricao-teste';
const inscricao = '/public/analise-multicriterio/participar/' + token + '/';
const formulario = inscricao + 'formulario/';
const api = '/api/ahp/comparacao-colaborativa/publico/' + token;
const pessoa = { nome_completo: 'Ana Teste', instituicao: 'Instituição Teste', email: 'ana@example.com' };
const codigo = 'a'.repeat(43);
const html = JSON.parse(execFileSync('.venv\\Scripts\\python.exe', ['-c', `
import json
import sys
from starlette.requests import Request
from api.server import render_page

config = json.loads(sys.argv[1])

def render(pagina, caminho, **dados):
    request = Request({"type": "http", "path": caminho, "headers": [], "query_string": b""})
    return render_page(request, f"paginas/analise_multicriterio/{pagina}.html",
                       token=config["token"], julgamento="Julgamento de teste", **dados).body.decode()

print(json.dumps({
    "inscricao": render("inscricao", config["inscricao"], prazo="2035-12-31T23:00:00Z",
                        erro=None, formulario_url=config["formulario"]),
    "fila": render("fila", config["formulario"], fila={"situacao": "aguardando", "posicao": 1}, inscricao=config["pessoa"]),
    "formulario": render("formulario", config["formulario"], modo_inscricao=True, inscricao=config["pessoa"]),
}))
`, JSON.stringify({ token, inscricao, formulario, pessoa })], { encoding: 'utf8' }));

async function testarFluxo(browser, width, aguardar) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  async function conferirCabecalho() {
    const cabecalho = page.locator('.app-header');
    assert.equal(await cabecalho.locator('.app-brand-title').isVisible(), true);
    assert.equal(await cabecalho.locator('nav, a[href]').count(), 0);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
  }
  const erros = [];
  const requisicoes = [];
  let falhar = true;
  let aguardando = aguardar;
  let retomada = false;
  const meta = {
    status: 'ativa', escopo: 'Plano de teste', valido_ate: '2035-12-31T23:00:00Z',
    email_autorizado: true, criterios: ['Acesso', 'Equidade', 'Custo'],
    modo_comparacao: 'duas_etapas', dimensoes_comparacao: ['Social', 'Financeira'],
    grupos_comparacao: { Social: [0, 1], Financeira: [2] },
  };
  try {
    page.on('pageerror', error => erros.push(error.message));
    await page.route(base + inscricao, route => route.fulfill({ contentType: 'text/html; charset=utf-8', body: html.inscricao }));
    await page.route(base + formulario, route => route.fulfill({
      contentType: 'text/html; charset=utf-8', body: aguardando ? html.fila : html.formulario,
    }));
    await page.route(base + api + '**', route => {
      const req = route.request();
      const path = new URL(req.url()).pathname.slice(api.length);
      requisicoes.push(path);
      if (path === '/inscricao') {
        const body = req.postDataJSON();
        assert.deepEqual(body, body.nome_completo ? pessoa : { email: pessoa.email });
        if (falhar) return route.fulfill({ status: 503, json: { detail: 'Inscrição indisponível.' } });
        return route.fulfill({ json: { codigo_retomada: codigo } });
      }
      if (path === '/fila') return route.fulfill({ json: { situacao: aguardando ? 'aguardando' : 'admitida', posicao: 1 } });
      if (path === '/acesso') return route.fulfill({ json: meta });
      assert.equal(path, '/respostas/iniciar');
      assert.deepEqual(req.postDataJSON().identificacao, pessoa);
      return route.fulfill({ json: {
        status: 'em_preenchimento', matriz_comparacao: [[1, null, null], [null, 1, null], [null, null, 1]],
        estatisticas: retomada ? { julgamento_dimensoes: { resultado: { CR: 0 } } } : {},
      } });
    });
    await page.goto(base + inscricao);
    await conferirCabecalho();
    for (const [campo, valor] of Object.entries(pessoa)) await page.locator(`[name="${campo}"]`).fill(valor);
    const confirmar = page.getByRole('button', { name: 'Confirmar inscrição' });
    await confirmar.click();
    await page.getByText('Inscrição indisponível.', { exact: true }).waitFor();
    assert.equal(page.url(), base + inscricao);
    falhar = false;
    await confirmar.click();
    await page.waitForURL(base + formulario);
    if (aguardar) {
      await page.getByText('Sua posição na fila é 1.', { exact: true }).waitFor();
      await conferirCabecalho();
      assert.equal(await page.locator('#collab-form-section').count(), 0);
      assert.equal(requisicoes.includes('/acesso'), false);
      assert.equal(requisicoes.includes('/respostas/iniciar'), false);
      await page.getByText('Código de retomada', { exact: true }).click();
      await page.waitForFunction(() => document.getElementById('collab-retomada-codigo').value === 'a'.repeat(43));
      aguardando = false;
    }
    await page.getByText('Etapa 1 de 2 · Dimensões', { exact: true }).waitFor();
    await conferirCabecalho();
    await page.getByRole('heading', { name: 'A avaliação é feita em duas etapas' }).waitFor();
    assert.equal(await page.locator('#btn-liberar-form').count(), 0);
    const visual = await page.evaluate(() => ({
      contexto: getComputedStyle(document.querySelector('.collab-enrollment-guide li p')).fontSize,
      comparacao: getComputedStyle(document.querySelector('.collab-pairwise-intro')).fontSize,
      identificacao: Math.round(document.querySelector('.collab-inscrito').getBoundingClientRect().height),
      scroll: window.scrollY,
    }));
    assert.equal(visual.contexto, visual.comparacao);
    assert.equal(visual.scroll, 0);
    assert.equal(visual.identificacao < (width < 600 ? 412 : 320), true);
    assert.equal(requisicoes.filter(path => path === '/acesso').length, 1);
    assert.equal(requisicoes.filter(path => path === '/respostas/iniciar').length, 1);
    assert.equal(requisicoes.includes(''), false);
    await page.getByText('Código de retomada', { exact: true }).click();
    await page.waitForFunction(() => document.getElementById('collab-retomada-codigo').value === 'a'.repeat(43));
    retomada = true;
    await page.reload();
    await page.getByText('Etapa 2 de 2 · Critérios por dimensão', { exact: true }).waitFor();
    assert.deepEqual(erros, []);
    console.log(`PASS ${width}px ${JSON.stringify(visual)}`);
  } finally {
    await page.close();
  }
}

(async () => {
  const browser = await chromium.launch();
  try {
    await Promise.all([testarFluxo(browser, 1440, false), testarFluxo(browser, 390, true)]);
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
