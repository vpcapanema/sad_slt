const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const BASE = process.env.SICARD_BROWSER_BASE_URL || 'http://127.0.0.1:8083';

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const names = ['Custo', 'Prazo', 'Benefício', 'Acesso', 'Segurança'];
    const initial = names.map((_, i) => names.map((_, j) => i === j ? 1 : 1));
    await page.route('**/api/**', route => {
      const path = new URL(route.request().url()).pathname;
      if (!path.includes('/publico/')) return route.fulfill({ json: [] });
      if (route.request().method() === 'GET' || path.endsWith('/acesso')) {
        return route.fulfill({ json: { token: 'help', criterios: names, status: 'ativa',
          escopo: 'Teste de consistência', email_autorizado: true } });
      }
      return route.fulfill({ json: { status: 'em_preenchimento',
        matriz_comparacao: initial, estatisticas: {} } });
    });
    await page.goto(BASE + '/public/analise-multicriterio/formulario-comparacao-pareada/help/');
    await page.locator('#colab-nome').fill('Ana');
    await page.locator('#colab-inst').fill('Instituição');
    await page.locator('#colab-email').fill('ana@example.com');
    await page.locator('#colab-token').fill('012345');
    await page.locator('#btn-liberar-form').click();
    await page.locator('#collab-form-section').waitFor({ state: 'visible' });
    await page.clock.install();
    const help = page.locator('#collab-consistency-help');
    const scales = page.locator('#comparisonContent .saaty-scale');
    assert.equal(await help.isVisible(), false, 'Initial equality is not an answer');
    for (let i = 0; i < 7; i++) await scales.nth(i).press(i === 3 ? 'Home' : 'ArrowRight');
    await page.clock.runFor(1100);
    assert.equal(await help.isVisible(), false, 'Exactly 7/10 answered must not display help');
    await scales.nth(7).press('ArrowRight');
    await page.clock.runFor(1100);
    assert.equal(await help.isVisible(), true);
    assert.match(await help.textContent(), /8\/10.*provisório/);
    assert.ok(await help.locator('li a').count() > 0);
    const before = await page.evaluate(() => JSON.stringify(buildLiveMatrix()));
    await help.locator('li a').first().click();
    assert.equal(await page.evaluate(() => document.activeElement.classList.contains('saaty-scale')), true);
    assert.equal(await page.evaluate(() => JSON.stringify(buildLiveMatrix())), before);
    assert.equal(await help.evaluate(el => getComputedStyle(el).fontSize),
      await page.locator('#collab-save-feedback').evaluate(el => getComputedStyle(el).fontSize));
    for (let i = 0; i < 10; i++) {
      await scales.nth(i).press('Home');
      for (let k = 0; k < 4; k++) await scales.nth(i).press('ArrowRight');
    }
    await page.clock.runFor(1100);
    assert.equal(await help.isVisible(), false, 'Hide after consistency is restored');
    assert.deepEqual(errors, []);
    console.log('PASS: public help hidden at 70%, visible at 80%, provisional notice, pair navigation, matching typography and no automatic changes.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exit(1); });
