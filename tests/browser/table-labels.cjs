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
    console.log('Table labels: visibility, split layout and observer stabilization verified.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
