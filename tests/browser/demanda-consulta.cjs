// Login normal; perfis de UI simulados. Escritas bloqueadas no navegador.
// A autorização real de cada perfil é coberta por test_demanda_analista_exclusivo.py.
const {chromium} = require('playwright');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const base = process.env.SICARD_BASE_URL || 'http://127.0.0.1:8084';
(async () => {
  const browser = await chromium.launch({channel: 'msedge', headless: true});
  try {
    const page = await browser.newPage({ignoreHTTPSErrors: true});
    const credentials = fs.readFileSync('credencias_sigma_agentes.txt', 'utf8');
    const credential = key => credentials.match(new RegExp('^' + key + '\\s*[:=]\\s*(.+)$', 'mi'))[1].trim();
    await page.goto(base + '/public/login/');
    await page.locator('[name=login]').fill(credential('Username'));
    await page.locator('[name=senha]').fill(credential('Senha inicial'));
    await page.getByRole('button', {name: 'Entrar', exact: true}).click();
    await page.waitForURL(url => !url.pathname.includes('/login'));
    const me = await (await page.request.get(base + '/api/auth/me')).json();
    const records = await (await page.request.get(base + '/api/demandas/internas?incluir_geometria=false')).json();
    const record = records.find(r => r.status === 'analise_em_avaliacao');
    assert.ok(record, 'Demanda em análise disponível para consulta');
    let profile = me.tipo_usuario;
    const writes = [], errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.route('**/api/**', async route => {
      if (!['GET', 'HEAD'].includes(route.request().method())) {
        writes.push(route.request().url());
        return route.abort();
      }
      if (new URL(route.request().url()).pathname.endsWith('/api/auth/me')) {
        return route.fulfill({json: {...me, tipo_usuario: profile}});
      }
      return route.continue();
    });
    for (profile of ['ADMIN', 'GESTOR', 'OPERADOR', 'VISUALIZADOR', 'ANALISTA']) {
      await page.goto(base + '/restrict/demanda/?tipo=projeto&id=' + encodeURIComponent(record.id));
      await page.locator('#criterios-grid input[type=radio]').first().waitFor();
      const editable = profile === 'ANALISTA';
      assert.equal(await page.locator('#criterios-grid input[type=radio]').first().isEnabled(), editable);
      assert.equal(await page.locator('#btn-editar').count(), editable ? 1 : 0);
      assert.equal(await page.locator('[data-decisao]').count() > 0, editable);
      assert.equal(await page.locator('#fld-parecer-complemento').evaluate(e => e.readOnly), !editable);
      assert.equal(await page.evaluate(() => !!window.ProcessFeedback && !!window.StatusFeedback), true);
      console.log('PASS interface:', profile, editable ? 'análise habilitada' : 'somente consulta');
    }
    assert.deepEqual(writes, [], 'Nenhuma gravação solicitada');
    assert.deepEqual(errors, []);
  } finally {await browser.close();}
})().catch(e => {console.error(e); process.exitCode = 1;});
