const {chromium} = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({channel: 'msedge', headless: true});
  try {
    const page = await browser.newPage({viewport: {width: 1440, height: 1000}});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/api/**', route => {
      const path = new URL(route.request().url()).pathname;
      if (path.endsWith('/auth/me')) return route.fulfill({json: {id: 'u', nome: 'Analista', tipo_usuario: 'ANALISTA'}});
      if (path.endsWith('/auth/session')) return route.fulfill({json: {authenticated: true, user: {id: 'u', tipo_usuario: 'ANALISTA'}}});
      return route.fulfill({json: []});
    });
    await page.goto('http://127.0.0.1:8083/restrict/analise-multicriterio/?modo=julgamentos');
    await page.waitForFunction(() => typeof SLTAnalysisTable === 'function');
    // Exercise the same component on each record-table structure in the workspace.
    await page.evaluate(() => {
      document.getElementById('ami-analysis-workspace').classList.remove('is-hidden');
      for (const id of ['ami-analysis-judges', 'ami-analysis-criteria', 'ami-analysis-responses']) {
        const body = document.getElementById(id), table = body.closest('table');
        const columns = table.tHead.rows[0].cells.length;
        body.replaceChildren();
        for (let i = 0; i < 32; i++) {
          const row = body.insertRow();
          for (let j = 0; j < columns; j++) row.insertCell().textContent = `Registro ${i + 1} campo ${j + 1}`;
        }
        SLTAnalysisTable(table);
      }
    });
    for (const id of ['ami-analysis-judges', 'ami-analysis-criteria', 'ami-analysis-responses']) {
      const table = page.locator('#' + id).locator('..');
      const report = table.locator('..').locator('..');
      const footer = report.locator(':scope > .admin-table-footer');
      assert.equal(await footer.count(), 1);
      const nav = await footer.locator('nav').boundingBox(), summary = await footer.locator('.admin-table-summary').boundingBox();
      assert.ok(Math.abs(nav.y + nav.height / 2 - summary.y - summary.height / 2) < 2, id + ': contador e paginador na mesma linha');
      assert.ok(summary.x >= nav.x + nav.width, id + ': contador à direita sem sobreposição');
      assert.equal(await page.locator('#' + id + ' tr').count(), 15);
      await footer.getByRole('button', {name: 'Próxima página', exact: true}).click();
      assert.match(await page.locator('#' + id + ' tr').first().innerText(), /Registro 16/);
      await report.getByLabel('Coluna do filtro', {exact: true}).selectOption('0');
      await report.getByLabel('Valor do filtro', {exact: true}).selectOption({label: 'Registro 32 campo 1'});
      assert.equal(await page.locator('#' + id + ' tr').count(), 1);
      assert.match(await page.locator('#' + id).innerText(), /Registro 32/);
    }
    const mainFooter = page.locator('#ami-count').locator('..');
    assert.equal(await mainFooter.locator('#ami-judgments-pagination').count(), 1);
    for (const footer of await page.locator('.admin-table-footer').all()) {
      if (!(await footer.isVisible())) continue;
      for (const button of await footer.locator('.admin-pagination button').all()) {
        const check = async () => {
          const style = await button.evaluate(el => {
            const s = getComputedStyle(el), nav = getComputedStyle(el.parentElement);
            return {border: s.borderWidth, background: s.backgroundColor, shadow: s.boxShadow,
              weight: s.fontWeight, font: s.fontSize, navFont: nav.fontSize, text: el.textContent.trim(),
              rootFont: parseFloat(getComputedStyle(document.documentElement).fontSize)};
          });
          assert.equal(style.border, '0px');
          assert.equal(style.background, 'rgba(0, 0, 0, 0)');
          assert.equal(style.shadow, 'none');
          assert.equal(style.weight, '700');
          assert.equal(style.font, style.navFont);
          assert.ok(Math.abs(parseFloat(style.font) - style.rootFont * 0.70) < 0.02);
          assert.ok(['<<', '<', '>', '>>'].includes(style.text));
        };
        await check();
        if (await button.isEnabled()) {
          await button.hover();
          await check();
        }
      }
    }
    assert.deepEqual(errors, []);
    console.log('PASS: rodapé alinhado, símbolos em negrito sem borda/fundo/sombra, fonte hierárquica, navegação e filtros preservados.');
  } finally { await browser.close(); }
})().catch(error => {console.error(error); process.exitCode = 1;});
