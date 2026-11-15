const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent('<section class="ami-analysis-split"><h2>Demandas</h2><div class="admin-table-wrap"><table hidden><thead><tr><th>Nome</th></tr></thead><tbody><tr><td>Teste</td></tr></tbody></table></div></section>');
    await page.evaluate(() => {
      window.labelMutations = 0;
      new MutationObserver(records => { window.labelMutations += records.length; })
        .observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'class'] });
    });
    await page.addScriptTag({ path: path.resolve('assets', 'js', 'table-labels.js') });
    await page.waitForTimeout(100);
    assert.equal(await page.locator('.sicard-table-label').count(), 1);
    assert.equal(await page.locator('.sicard-table-label').evaluate(e => e.hidden), true);
    const settled = await page.evaluate(() => window.labelMutations);
    await page.waitForTimeout(100);
    assert.equal(await page.evaluate(() => window.labelMutations), settled);
    await page.locator('table').evaluate(e => { e.hidden = false; });
    await page.waitForTimeout(100);
    assert.equal(await page.locator('.sicard-table-label').evaluate(e => e.hidden), false);
    await page.locator('section').evaluate(e => { e.hidden = true; });
    await page.waitForTimeout(100);
    assert.equal(await page.locator('.sicard-table-label').evaluate(e => e.hidden), true);
    const finalCount = await page.evaluate(() => window.labelMutations);
    await page.waitForTimeout(100);
    assert.equal(await page.evaluate(() => window.labelMutations), finalCount);
    assert(finalCount < 20);
    const matrixPage = await browser.newPage();
    await matrixPage.setContent('<section><h2>Comparações</h2>' + '<span>Critério</span>'.repeat(100) +
      '<table><tbody>' + ('<tr>' + '<td>1</td>'.repeat(7) + '</tr>').repeat(7) + '</tbody></table></section>');
    await matrixPage.addScriptTag({ path: path.resolve('assets', 'js', 'table-labels.js') });
    await matrixPage.evaluate(() => document.fonts.ready);
    const cost = await matrixPage.evaluate(async () => {
      const original = window.getComputedStyle;
      let reads = 0;
      window.getComputedStyle = function (...args) { reads++; return original.apply(this, args); };
      document.querySelectorAll('td').forEach(cell => {
        cell.textContent = '3';
        cell.className = 'updated';
      });
      await new Promise(resolve => setTimeout(resolve, 50));
      window.getComputedStyle = original;
      return { reads, nodes: document.querySelectorAll('*').length };
    });
    assert(cost.reads < cost.nodes * 8, 'Uma atualização da matriz deve medir o bloco poucas vezes: ' + JSON.stringify(cost));
    console.log('Matrix style reads per update:', cost.reads);
    assert.equal(await matrixPage.locator('.sicard-table-label').count(), 1);
    assert.equal(await matrixPage.locator('.sicard-table-label').isVisible(), true);
    await matrixPage.close();
    console.log('Table labels: visibility, split layout and observer stabilization verified.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
