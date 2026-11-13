const {chromium} = require('playwright');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const base = process.env.SICARD_BASE_URL || 'http://127.0.0.1:8084';

(async () => {
  const browser = await chromium.launch({channel: 'msedge', headless: true});
  try {
    const context = await browser.newContext({ignoreHTTPSErrors: true});
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const credentials = fs.readFileSync('credencias_sigma_agentes.txt', 'utf8');
    const credential = key => credentials.match(new RegExp('^' + key + '\\s*[:=]\\s*(.+)$', 'mi'))[1].trim();
    await page.goto(base + '/public/login/');
    await page.locator('[name=login]').fill(credential('Username'));
    await page.locator('[name=senha]').fill(credential('Senha inicial'));
    await page.getByRole('button', {name: 'Entrar', exact: true}).click();
    await page.waitForURL(url => !url.pathname.includes('/login'));

    let start = Date.now();
    await page.goto(base + '/restrict/demandas/');
    for (const kind of ['projeto', 'plano', 'programa']) {
      if (kind !== 'projeto') {
        start = Date.now();
        await page.locator('#tipo-tabs [data-tipo="' + kind + '"]').click();
      }
      await page.waitForFunction(kind => {
        const table = document.querySelector('[data-demandas-table="' + kind + '"]');
        return !table.hidden && table.tBodies[0].querySelector('tr[data-codigo]');
      }, kind);
      console.log('table', kind, Date.now() - start, 'ms');
    }
    const resources = await page.evaluate(() => performance.getEntriesByType('resource')
      .filter(r => /\/api\/(demandas|planos|programas)\/internas/.test(r.name))
      .map(r => ({url: new URL(r.name).pathname + new URL(r.name).search, ms: Math.round(r.duration), bytes: r.decodedBodySize})));
    assert.equal(resources.length, 3, 'one request per kind, including editing references');
    assert(resources.find(r => r.url.includes('/demandas/')).url.includes('incluir_geometria=false'));
    console.log(resources);

    // Hold geometry transport to prove that lists/popups work independently.
    for (const path of ['/restrict/painel/', '/public/painel/']) {
      let release;
      const gate = new Promise(resolve => { release = resolve; });
      await page.route('**/api/painel/geometrias', async route => { await gate; await route.continue(); });
      start = Date.now();
      await page.goto(base + path);
      await page.locator('.layer-group--record').first().waitFor({state: 'attached', timeout: 60000});
      console.log(path, 'records', await page.locator('.layer-group--record').count(), Date.now() - start, 'ms');
      await page.locator('.layer-group--record .layer-group-header--record').first().evaluate(e => e.click());
      await page.locator('#painel-detail-popover').waitFor({state: 'visible'});
      release();
      await page.waitForFunction(() => document.querySelector('#map-painel .leaflet-overlay-pane svg path'), null, {timeout: 60000});
      console.log(path, 'map ready', Date.now() - start, 'ms');
      await page.unroute('**/api/painel/geometrias');
    }

    const publicContext = await browser.newContext({ignoreHTTPSErrors: true});
    const geometries = await (await publicContext.request.get(base + '/api/painel/geometrias')).json();
    const original = await (await publicContext.request.get(base + '/api/painel/demandas')).json();
    for (const item of original) {
      assert(item.dados_origem == null && item.representante == null);
      const geo = geometries[item.id];
      assert.deepEqual(geo ? {tipo: geo.type, coordinates: geo.coordinates} : null, item.geometria, 'exact geometry ' + item.id);
    }
    const light = await (await publicContext.request.get(base + '/api/painel/demandas?incluir_geometria=false')).json();
    assert.deepEqual(light.map(({geometria, ...r}) => r), original.map(({geometria, ...r}) => r));
    assert(light.every(r => !r.geometria || r.geometria.coordinates == null));
    await publicContext.close();
    assert.deepEqual(errors, []);
    console.log('PASS exact coordinates, all metadata, public privacy, independent lists/popups, no browser errors');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
