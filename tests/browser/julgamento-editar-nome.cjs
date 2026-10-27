const {chromium} = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({channel: 'msedge', headless: true});
  try {
    const page = await browser.newPage();
    const errors = [], patches = [];
    page.on('pageerror', error => errors.push(error.message));
    let julgamento = {id: '11111111-1111-4111-8111-111111111111', nome: 'Julgamento original', status: 'consolidada',
      hierarquizacao_id: '22222222-2222-4222-8222-222222222222', hierarquizacao_codigo: 'H-1', hierarquizacao_nome: 'Rodada',
      criterios: [], convites: [], token: 'teste', n_criterios: 0, valido_ate: '2027-01-01T23:59:59Z'};
    await page.route('**/api/**', route => {
      const req = route.request(), path = new URL(req.url()).pathname;
      let json = [];
      if (path.endsWith('/auth/me')) json = {id: 'u', nome: 'Teste', tipo_usuario: 'ANALISTA'};
      if (path.endsWith('/auth/session')) json = {authenticated: true};
      if (path.endsWith('/comparacao-colaborativa/ambientes')) json = [julgamento];
      if (path.endsWith('/ambientes/' + julgamento.id) && req.method() === 'PATCH') {
        patches.push(req.postDataJSON());
        julgamento = {...julgamento, ...req.postDataJSON()}; json = julgamento;
      }
      return route.fulfill({json});
    });
    const url = 'http://127.0.0.1:8083/restrict/analise-multicriterio/central-julgamentos';
    await page.goto(url);
    const row = page.locator('#ami-judgments tr').first();
    await row.filter({hasText: 'Julgamento original'}).waitFor();
    assert.equal(await page.locator('#ami-judgments').evaluate(el => el.closest('table').querySelectorAll('th')[1].textContent), 'Nome do julgamento');
    assert.equal(await row.locator('td').nth(1).textContent(), 'Julgamento original');
    await row.locator('[data-select-id]').check();
    await page.locator('#ami-judgments-edit-action').click();
    const input = page.locator('[data-edit-field="nome"]');
    await input.fill('Descartar');
    await page.locator('#ami-judgments-cancel-action').click();
    assert.equal(await row.locator('td').nth(1).textContent(), 'Julgamento original');
    assert.equal(patches.length, 0);
    await page.locator('#ami-judgments-edit-action').click();
    await input.fill('');
    await page.locator('#ami-judgments-save-action').click();
    assert.equal(patches.length, 0);
    await input.fill('Julgamento "Logística"');
    await page.locator('#ami-judgments-save-action').click();
    await input.waitFor({state: 'detached'});
    assert.deepEqual(patches, [{nome: 'Julgamento "Logística"'}]);
    await page.reload();
    await row.filter({hasText: 'Julgamento "Logística"'}).waitFor();
    assert.equal(await row.locator('td').nth(1).textContent(), 'Julgamento "Logística"');
    assert.deepEqual(errors, []);
    console.log('PASS: ordem da coluna, editar, cancelar, validar nome vazio e salvar nome de julgamento consolidado. APIs simuladas.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
