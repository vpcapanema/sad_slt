const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    const errors = [], writes = [], requests = [];
    const objetos = [{ id: 'p1', codigo: 'P1', nome: 'Projeto 1', status: 'aprovada' }];
    const matrix = { linhas: [{ criterio: 'C1' }, { criterio: 'C2' }] };
    const grupo = { id: 'g1', nome: 'Grupo 1', codigo: 'G1', tipo_demanda: 'projeto', quantidade_demandas: 1, objetos };
    const hier = { codigo: 'H1', nome: 'Existente', status: 'em_julgamento', objetos, dados_hierarquizacao: { cabecalho_grupo: { matriz_premissas_criterios: matrix } } };
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/api/**', route => {
      const req = route.request(), path = new URL(req.url()).pathname;
      requests.push(path);
      let json = [];
      if (req.method() !== 'GET') writes.push({ path, method: req.method(), data: req.postDataJSON() });
      if (path === '/api/auth/me') json = { id: 'u', tipo_usuario: 'ANALISTA', nome: 'Analista' };
      else if (path === '/api/auth/session') json = { authenticated: true, user: { id: 'u', tipo_usuario: 'ANALISTA' } };
      else if (path === '/api/ahp/hierarquizacoes') json = req.method() === 'GET' ? [hier] : { codigo: 'H2' };
      else if (path === '/api/agrupamentos-demandas') json = [grupo];
      else if (path === '/api/agrupamentos-demandas/g1') json = grupo;
      return route.fulfill({ json });
    });
    await page.goto('http://127.0.0.1:8083/restrict/hierarquizacao/processos/');
    await page.locator('.hier-row-select').check();
    await page.locator('#hier-bulk-view').click();
    await page.waitForFunction(() => document.querySelector('#hier-nome').disabled);
    assert.match(await page.locator('#hier-agrupamento-demandas').textContent(), /Projeto 1/);
    assert.equal(await page.locator('#nova-hierarquizacao .process-actions').isVisible(), false);
    await page.locator('#hier-tbody [data-json="objetos"]').click();
    assert.equal(await page.locator('#modal-objetos').isVisible(), true);
    await page.keyboard.press('Escape');
    await page.locator('#hier-tbody .matriz-link').click();
    assert.match(await page.locator('#modal-matriz').textContent(), /C1/);
    await page.keyboard.press('Escape');
    await page.locator('#hier-bulk-edit').click();
    await page.locator('#hier-tbody [data-k="nome"]').fill('Editada');
    await page.locator('#hier-bulk-save').click();
    await page.waitForFunction(() => !document.querySelector('#hier-tbody [data-k="nome"]'));
    assert.equal(writes[0].method, 'PATCH');
    assert.equal(writes[0].data.nome, 'Editada');
    await page.locator('#hier-new').click();
    await page.locator('#hier-nome').fill('Nova');
    await page.locator('#hier-agrupamento').selectOption('g1');
    await page.locator('#hier-criteria-matrix').setInputFiles({ name: 'matriz.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(matrix)) });
    await page.waitForFunction(() => document.querySelector('#hier-criteria-matrix-summary').textContent.includes('2 crit'));
    const created = page.waitForRequest(req => req.method() === 'POST' && req.url().endsWith('/api/ahp/hierarquizacoes'));
    await page.locator('#nova-hierarquizacao button[type="submit"]').click();
    const payload = (await created).postDataJSON();
    assert.deepEqual(Object.keys(payload).sort(), ['descricao', 'grupo_demanda_id', 'matriz_premissas_criterios', 'nome']);
    assert.equal(payload.grupo_demanda_id, 'g1');
    assert.deepEqual(payload.matriz_premissas_criterios.linhas, matrix.linhas);
    assert.equal(requests.some(path => path.includes('/universo')), false);
    assert.deepEqual(errors, []);
    console.log('Cadastro por grupo salvo, consulta dos registros existentes, modais e edicao: OK (APIs simuladas).');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exit(1); });
