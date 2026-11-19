const assert = require('node:assert/strict');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
      const page = await browser.newPage({ viewport });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto('http://127.0.0.1:8091/public/pesquisa-experiencia/');
      await page.locator('#pesquisa-form').waitFor();
      assert.equal(await page.locator('.pergunta-escala').count(), 6);
      assert.equal(await page.locator('textarea[name="criticas_sugestoes_elogios"]').isVisible(), true);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
      assert.equal(overflow, false, `Rolagem horizontal em ${viewport.width}px`);
      assert.deepEqual(errors, []);
      await page.screenshot({
        path: `outputs/pesquisa-experiencia-${viewport.width}.png`, fullPage: true,
      });
      await page.close();
    }
  } finally {
    await browser.close();
  }
  console.log('Pesquisa validada em 1440 px e 390 px, sem erros ou rolagem horizontal.');
})().catch(error => { console.error(error); process.exitCode = 1; });
