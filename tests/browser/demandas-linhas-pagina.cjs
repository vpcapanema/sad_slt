const {chromium} = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({channel: 'msedge', headless: true});
  try {
    const page = await browser.newPage({viewport: {width: 1440, height: 1000}});
    const errors = [], writes = [];
    page.on('pageerror', error => errors.push(error.message));
    const dados = tipo => Array.from({length: 117}, (_, i) => ({
      id: `${tipo}-${i}`, codigo: `${tipo}-${i}`,
      nome: `${i < 62 ? 'Grupo A' : 'Grupo B'} ${tipo} ${i}`,
      status: 'cadastro_rascunho',
    }));
    await page.route('**/api/**', route => {
      const req = route.request(), path = new URL(req.url()).pathname;
      if (req.method() !== 'GET') writes.push(req.method());
      const json = path.endsWith('/auth/me') ? {id: 'u', nome: 'Teste', tipo_usuario: 'ADMIN'}
        : path === '/api/demandas/internas' ? dados('projeto')
        : path === '/api/planos/internas' ? dados('plano')
        : path === '/api/programas/internas' ? dados('programa') : [];
      return route.fulfill({json});
    });
    await page.goto('http://127.0.0.1:8083/restrict/demandas/');
    const seletor = page.getByRole('combobox', {name: 'Linhas por página', exact: true});
    const linhas = tipo => page.locator(`[data-demandas-body="${tipo}"] tr`);
    const aguardar = (tipo, quantidade) => page.waitForFunction(({tipo, quantidade}) =>
      document.querySelectorAll(`[data-demandas-body="${tipo}"] tr`).length === quantidade, {tipo, quantidade});
    await aguardar('projeto', 15);
    assert.equal(await seletor.inputValue(), '15');
    assert.deepEqual(await seletor.locator('option').evaluateAll(options => options.map(o => o.value)), ['15', '25', '35', '50', '100']);
    for (const quantidade of [15, 25, 35, 50, 100]) {
      await seletor.selectOption(String(quantidade));
      await aguardar('projeto', quantidade);
      const paginas = Math.ceil(117 / quantidade);
      assert.equal(await page.locator('#pagination-info').innerText(), `Página 1 de ${paginas}`);
      assert.match(await page.locator('#demandas-summary').innerText(), new RegExp(`^0 selecionados / ${quantidade} na página / 117 no total$`));
      await page.locator('[data-demandas-table="projeto"] .select-all').check();
      assert.equal(await page.locator('[data-demandas-body="projeto"] .row-select:checked').count(), quantidade);
      await page.locator('#pagination-next').click();
      assert.equal(await page.locator('[data-demandas-body="projeto"] .row-select:checked').count(), 0);
      if (paginas > 2) await page.locator('#pagination-last').click();
      await aguardar('projeto', 117 % quantidade || quantidade);
      assert.equal(await page.locator('#pagination-info').innerText(), `Página ${paginas} de ${paginas}`);
      assert.equal(await page.locator('#pagination-next').isDisabled(), true);
    }
    await seletor.selectOption('35');
    await page.locator('#filtro-coluna').selectOption({label: 'Projeto'});
    await page.locator('#filtro-valor').fill('Grupo A');
    await aguardar('projeto', 35);
    await page.locator('#pagination-last').click();
    await aguardar('projeto', 27);
    await seletor.selectOption('25');
    await aguardar('projeto', 25);
    assert.equal(await page.locator('#filtro-valor').inputValue(), 'Grupo A');
    assert.equal(await page.locator('#pagination-info').innerText(), 'Página 1 de 3');
    const cabecalho = page.locator('[data-demandas-table="projeto"] th').filter({hasText: /^Projeto$/});
    await cabecalho.click();
    const ordem = await cabecalho.getAttribute('aria-sort');
    const primeiro = await linhas('projeto').first().getAttribute('data-codigo');
    await seletor.selectOption('50');
    await aguardar('projeto', 50);
    assert.equal(await cabecalho.getAttribute('aria-sort'), ordem);
    assert.equal(await linhas('projeto').first().getAttribute('data-codigo'), primeiro);
    await page.locator('[data-demandas-body="projeto"] .row-select').first().check();
    await page.locator('#btn-bulk-edit').click();
    assert.equal(await seletor.isDisabled(), true);
    await page.locator('#btn-bulk-cancel').click();
    assert.equal(await seletor.isEnabled(), true);
    for (const tipo of ['plano', 'programa']) {
      await page.locator(`#tipo-tabs [data-tipo="${tipo}"]`).click();
      await aguardar(tipo, 50);
      assert.equal(await seletor.inputValue(), '50');
      await seletor.selectOption('100');
      await aguardar(tipo, 100);
      await seletor.selectOption('50');
    }
    const dimensoes = await page.locator('.admin-table-footer').evaluate(footer => {
      const rect = selector => footer.querySelector(selector).getBoundingClientRect();
      const controle = rect('.demandas-page-size'), paginador = rect('nav'), contador = rect('#demandas-summary');
      return {esquerda: controle.left === footer.getBoundingClientRect().left,
        ordem: controle.right <= paginador.left && paginador.right <= contador.left,
        alinhados: Math.abs(controle.top + controle.height / 2 - paginador.top - paginador.height / 2) < 1,
        altura: rect('select').height};
    });
    assert.deepEqual(dimensoes, {esquerda: true, ordem: true, alinhados: true, altura: 34});
    await page.setViewportSize({width: 390, height: 844});
    assert.equal(await page.locator('.admin-table-footer').evaluate(footer => {
      const controle = footer.querySelector('.demandas-page-size').getBoundingClientRect();
      const nav = footer.querySelector('nav').getBoundingClientRect();
      const contador = footer.querySelector('#demandas-summary').getBoundingClientRect();
      return controle.bottom <= nav.top && nav.bottom <= contador.top;
    }), true);
    assert.deepEqual(errors, []);
    assert.deepEqual(writes, []);
    console.log('Demandas: 15/25/35/50/100 linhas, limites de página, contador, seleção, filtros, ordenação, edição, tipos e rodapé responsivo OK.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
