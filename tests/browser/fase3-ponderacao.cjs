// Fase 3, seção 2: o índice do Resumo da Elegibilidade substitui as áreas por camada.
// Página real renderizada pelo servidor; dados de hierarquização e domínios são entregues direto ao componente.
const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs'), http = require('node:http'), path = require('node:path');
const {execFileSync} = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const ROTA = '/restrict/hierarquizacao/fase-3/';

const INDICE = 'indice_de_risco_ambiental_e_territorial';
const objeto = (codigo, indice, executada = true) => ({
  cabecalho_objeto: {codigo, nome: 'Mesmo nome', atributos: {}, atributos_fase3: {[INDICE]: {valor_bruto: 0.123}}},
  hierarquizacao: {fase_1: {executada, resumo_elegibilidade: indice == null ? null : {[INDICE]: indice},
    sobreposicoes_risco: {a: {camada: 'Camada antiga', area_ha: 500}}}},
});

(async () => {
  const python = path.join(root, '.venv', process.platform === 'win32' ? 'Scripts' : 'bin', process.platform === 'win32' ? 'python.exe' : 'python');
  const html = JSON.parse(execFileSync(python, ['-B', '-X', 'utf8', '-c', [
    'import json', 'from fastapi.testclient import TestClient', 'from api.server import app',
    `r = TestClient(app).get(${JSON.stringify(ROTA)})`, 'assert r.status_code == 200', 'print(json.dumps(r.text))',
  ].join('\n')], {cwd: root, encoding: 'utf8'}));
  const server = http.createServer((req, res) => {
    const nome = new URL(req.url, 'http://local').pathname;
    if (nome === ROTA) { res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(html); return; }
    const relativo = nome.replace(/^\/restrict\/hierarquizacao\//, '/hierarquizacao/');
    const arquivo = path.resolve(root, `.${relativo}`);
    if (path.relative(root, arquivo).startsWith('..')) { res.writeHead(403).end(); return; }
    fs.readFile(arquivo, (erro, dados) => {
      if (erro) { res.writeHead(404).end(); return; }
      res.setHeader('Content-Type', arquivo.endsWith('.js') ? 'text/javascript; charset=utf-8' : arquivo.endsWith('.css') ? 'text/css' : 'application/octet-stream');
      res.end(dados);
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  let browser;
  try {
    browser = await chromium.launch({headless: true,
      channel: process.env.SICARD_TEST_BROWSER || (process.platform === 'win32' ? 'msedge' : undefined),
      args: ['--no-proxy-server']});
    const page = await browser.newPage({viewport: {width: 1440, height: 1000}});
    const erros = [];
    page.on('pageerror', erro => erros.push(erro.message));
    await page.route('https://**/*', request => request.abort());
    await page.route('**/api/**', request => request.fulfill({json: []}));
    await page.route('**/hierarquizacao/js/fase3.js*', request => request.fulfill({body: '', contentType: 'text/javascript'}));
    await page.route('**/hierarquizacao-fase3-ajuste-fino-inline-1.js*', request => request.fulfill({body: '', contentType: 'text/javascript'}));
    await page.goto(base + ROTA, {waitUntil: 'domcontentloaded'});
    // This component test stubs the page controller; reveal its host explicitly.
    await page.locator('.secao-criterios-de-atributos').evaluate(el => { el.hidden = false; });

    const dominios = [{codigo: 'maturidade_objeto', nome: 'Maturidade', tipos_objeto: ['projeto'], tipo_dado: 'categoria', dominio_valores: [{rotulo: 'Inicial'}, {rotulo: 'Final'}]}];
    const colunas = [{id: 'beneficio', criterio: 'Benefício', tipo: 'numerico', relacao: 'maior_melhor'}];
    const hierarquizacao = {codigo: 'H-1', nome: 'Logística paulista', dados_hierarquizacao: {
      cabecalho_grupo: {tipo_demanda: 'projeto'}, objetos: [objeto('D-1', 0.75)]}};
    const j = 'd2b7dd5c-d4ac-485e-b432-cf22814687a3';
    await page.route('**/pesos-fase3', route => route.fulfill({json: [
      {id: j, nome: 'Julgamento logística', pesos: {'cadastro:maturidade_objeto': 0.3, beneficio: 0.7}},
      {id: 'pendente', nome: 'Julgamento pendente', pesos: {}, erro: 'Os pesos consolidados deste julgamento ainda não estão disponíveis.'},
    ]}));
    await page.evaluate(() => { window.avisosTeste = []; window.Notify.warning = (_, texto) => window.avisosTeste.push(texto); });
    assert.equal(await page.locator('[name="fonte-pesos-fase3"]').count(), 2, 'opções estão no HTML inicial');
    await page.evaluate(async ([h, colunas, dominios]) => AtributosObjetos.render(h, {colunas, dominios}), [hierarquizacao, colunas, dominios]);
    assert.equal(await page.locator('#fase3-titulo-tabela').textContent(), 'Tabela de atributos de demanda - Logística paulista');
    assert.equal(await page.locator('#fase3-julgamento-campo').isVisible(), false);
    assert.equal(await page.locator('#atributos-objetos-demanda > section').count(), 2);
    assert.equal(await page.locator('#atributos-objetos-demanda .ami-report-table .fase3-titulo-tabela-simples #fase3-titulo-tabela').count(), 1);
    const payload = () => page.evaluate(() => ({criterios: AtributosObjetos.criteriosPayload(), ...AtributosObjetos.configuracaoPayload()}));
    let p = await payload();
    assert.deepEqual(p.criterios.map(c => c.peso), [1, 1, 1]);
    await page.check('[name="ponderacao-fase3"][value="abrangente"]');
    p = await payload();
    assert.ok(Math.abs(p.criterios.reduce((s, c) => s + c.peso, 0) - 1) < 1e-10);
    await page.locator('[data-controles-pesos="cadastro"] .atributo-peso-numero').fill('0.6');
    p = await payload();
    assert.ok(Math.abs(p.criterios[0].peso - 0.6) < 1e-10);
    assert.ok(p.criterios.slice(1).every(c => Math.abs(c.peso - 0.2) < 1e-10));
    const manual = p;
    await page.click('#resetar-pesos-fase3');
    assert.ok((await payload()).criterios.every(c => Math.abs(c.peso - 1 / 3) < 1e-10));
    assert.equal(await page.locator('[data-controles-pesos] input[type="number"]').first().inputValue(), '0.333');
    await page.check('[name="fonte-pesos-fase3"][value="ahp"]');
    await page.locator(`#fase3-julgamento option[value="${j}"]`).waitFor({state: 'attached'});
    assert.equal(await page.locator('#fase3-modo-ponderacao').isVisible(), false);
    await page.selectOption('#fase3-julgamento', j);
    p = await payload();
    assert.deepEqual(p.criterios.map(c => c.peso), [0.3, 0.7, 1]);
    assert.equal(p.julgamento_id, j);
    assert.equal(await page.locator('[data-controles-pesos] input:enabled').count(), 0);
    assert.equal(await page.locator('#resetar-pesos-fase3').isDisabled(), true);
    // Reabrir a rodada restaura fonte, julgamento e pesos oficiais.
    hierarquizacao.dados_hierarquizacao.cabecalho_grupo.configuracoes = {fase_3: p};
    await page.evaluate(async ([h, colunas, dominios]) => AtributosObjetos.render(h, {colunas, dominios}), [hierarquizacao, colunas, dominios]);
    await page.waitForFunction(() => document.querySelector('#fase3-pesos-feedback').textContent.includes('carregados'));
    assert.deepEqual((await payload()).criterios.map(c => c.peso), [0.3, 0.7, 1]);
    await page.selectOption('#fase3-julgamento', 'pendente');
    assert.match((await page.evaluate(() => window.avisosTeste)).at(-1), /ainda não estão disponíveis/);
    assert.equal(await page.evaluate(() => { try { AtributosObjetos.configuracaoPayload(); return false; } catch { return true; } }), true);
    await page.check('[name="fonte-pesos-fase3"][value="manual"]');
    assert.ok(await page.locator('[data-controles-pesos="cadastro"] input').first().isEnabled());
    await page.check('[name="ponderacao-fase3"][value="estratificada"]');
    assert.deepEqual((await payload()).criterios.map(c => c.peso), [1, 1, 1]);
    await page.click('#resetar-pesos-fase3');
    assert.deepEqual((await payload()).criterios.map(c => c.peso), [1, 1, 1]);
    hierarquizacao.dados_hierarquizacao.cabecalho_grupo.configuracoes.fase_3 = manual;
    await page.evaluate(async ([h, colunas, dominios]) => AtributosObjetos.render(h, {colunas, dominios}), [hierarquizacao, colunas, dominios]);
    assert.deepEqual((await payload()).criterios.map(c => c.peso), manual.criterios.map(c => c.peso));
    hierarquizacao.dados_hierarquizacao.objetos = Array.from({length: 20}, (_, i) => objeto('D-' + (i + 1), 0.75));
    await page.evaluate(async ([h, colunas, dominios]) => AtributosObjetos.render(h, {colunas, dominios}), [hierarquizacao, colunas, dominios]);
    const report = page.locator('#atributos-objetos-demanda .ami-report-table');
    assert.equal(await report.count(), 1);
    assert.equal(await report.locator('tbody tr').count(), 15);
    await report.getByRole('button', {name: 'Próxima página', exact: true}).click();
    assert.equal(await report.locator('tbody tr').count(), 5);
    await report.locator('thead input[type="checkbox"]').check();
    assert.match(await report.locator('.admin-table-summary').textContent(), /20 selecionados/);
    await report.getByRole('button', {name: 'Limpar seleção', exact: true}).click();
    assert.match(await report.locator('.admin-table-summary').textContent(), /0 selecionados/);
    const measures = await report.evaluate(host => {
      const rect = selector => host.querySelector(selector).getBoundingClientRect();
      return {filter: rect('.admin-filter-bar').height, input: rect('.admin-filter-bar select').height,
        selector: rect('th.col-select').width, title: getComputedStyle(host.querySelector('.fase3-titulo-tabela-simples')).fontSize,
        gap: getComputedStyle(host).rowGap};
    });
    assert.equal(measures.filter, 32);
    assert.equal(measures.input, 25);
    assert.equal(measures.selector, 44);
    assert.equal(measures.title, '13px');
    assert.equal(measures.gap, '8px');
    const cadastroToggle = report.getByRole('button', {name: 'Cadastro', exact: true});
    assert.equal(await report.locator('.fase3-group-toggle').count(), 3);
    assert.equal(await cadastroToggle.getAttribute('aria-pressed'), 'false');
    await cadastroToggle.click();
    assert.equal(await report.locator('th.col-estatica').isVisible(), false);
    assert.equal(await cadastroToggle.getAttribute('aria-pressed'), 'true');
    await report.getByRole('button', {name: 'Página anterior', exact: true}).click();
    assert.equal(await report.locator('tbody tr').first().locator('td').nth(2).isVisible(), false);
    await cadastroToggle.click();
    assert.equal(await report.locator('th.col-estatica').isVisible(), true);
    assert.equal(await report.locator('tbody tr').first().locator('td').nth(2).isVisible(), true);
    const labels = report.getByRole('button', {name: 'Labels', exact: true});
    assert.equal(await report.locator('.atributo-valor-original').first().isVisible(), false);
    await labels.click();
    assert.equal(await labels.getAttribute('aria-pressed'), 'true');
    assert.equal(await report.locator('.atributo-valor-original').first().isVisible(), true);
    assert.equal(await report.locator('.atributo-valor-original').first().evaluate(el => getComputedStyle(el).fontSize), '9px');
    await labels.click();
    assert.equal(await report.locator('.atributo-valor-original').first().isVisible(), false);
    assert.ok(await report.evaluate(host => host.querySelector('.fase3-titulo-tabela-simples').getBoundingClientRect().bottom <= host.querySelector('.admin-filter-bar').getBoundingClientRect().top));
    await report.locator('.admin-filter-bar select').first().selectOption('0');
    const option = await report.locator('.admin-filter-bar select').nth(1).locator('option').last().getAttribute('value');
    await report.locator('.admin-filter-bar select').nth(1).selectOption(option);
    assert.equal(await report.locator('tbody tr').count(), 1);
    await report.getByRole('button', {name: 'Limpar filtros', exact: true}).click();
    assert.equal(await report.locator('tbody tr').count(), 15);
    await page.locator('.secao-criterios-de-atributos').screenshot({path: path.join(root, '.tmp/fase3-ponderacao.png')});
    await page.setViewportSize({width: 390, height: 844});
    await page.waitForTimeout(150);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'mobile: horizontal overflow stays inside tables');
    await cadastroToggle.click();
    await page.evaluate(async ([h, colunas, dominios]) => AtributosObjetos.render(h, {colunas, dominios}), [hierarquizacao, colunas, dominios]);
    assert.equal(await page.locator('th.col-estatica').isVisible(), true);
    assert.equal(await page.getByRole('button', {name: 'Cadastro', exact: true}).getAttribute('aria-pressed'), 'false');
    const riscoToggle = page.getByRole('button', {name: 'Risco ambiental e territorial', exact: true});
    await riscoToggle.click();
    await riscoToggle.click();
    await page.waitForTimeout(500);
    assert.ok(await page.locator('th.col-risco').evaluate(header => {
      const shell = header.closest('table').parentElement;
      const cell = header.getBoundingClientRect(), viewport = shell.getBoundingClientRect();
      return cell.left >= viewport.left - 1 && cell.right <= viewport.right + 1;
    }), 'showing a group scrolls its first column into view');
    assert.ok(await page.locator('th.col-atributo').evaluateAll(headers => headers.every(header => {
      const title = header.querySelector('.smart-column-title');
      return title.children.length <= 2 && [...title.children].every(line => line.scrollWidth <= header.clientWidth);
    })), 'criterion titles fit in at most two lines');
    await page.evaluate(() => AtributosObjetos.render(null));
    assert.equal(await page.locator('[data-atributos-pesos]').isVisible(), false);
    assert.equal(await page.locator('#fase3-julgamento option').count(), 1);
    assert.deepEqual(erros, []);
    console.log('PASS: subseções, fonte AHP, aviso de pesos pendentes, modos manuais e restauração da configuração. APIs simuladas.');
  } finally { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(erro => { console.error(erro); process.exitCode = 1; });
