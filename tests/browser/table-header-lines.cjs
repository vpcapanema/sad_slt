const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    const template = fs.readFileSync(path.join(__dirname, '..', '..', 'templates', 'componentes', 'tabela_demandas.html'), 'utf8');
    const headings = [...template.matchAll(/<th scope="col">([^<]+)<\/th>/g)].map(match => match[1]);
    headings.push('PalavraExtraordinariamenteLongaSemQualquerEspaco', 'Disponibilidade dos pesos consolidados para todos os participantes');
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await page.setContent(`<style>th {font:700 14px Arial; text-transform:uppercase; padding:8px 16px; overflow-wrap:anywhere} table {border-collapse:collapse} main>div {width:100%; overflow:auto}</style><main><div><table class="admin-table"><thead><tr><th><input type="checkbox"></th>${headings.map(title => `<th>${title}</th>`).join('')}</tr></thead><tbody></tbody></table></div></main>`);
      await page.addScriptTag({ path: path.join(__dirname, '..', '..', 'assets', 'js', 'table-smart-widths.js') });
      await page.waitForSelector('table[data-smart-widths]');
      const results = await page.locator('.smart-column-title').evaluateAll(labels => labels.map(label => ({
        title: label.textContent.trim(),
        lines: [...label.children].map(line => ({
          text: line.textContent,
          width: line.getBoundingClientRect().width,
          scroll: line.scrollWidth,
          height: line.getBoundingClientRect().height,
        })),
      })));
      assert.equal(results.length, headings.length);
      results.forEach((result, index) => {
        assert.equal(result.title.replace(/\s+/g, ' '), headings[index]);
        assert.ok(result.lines.length <= 2, result.title);
        for (const line of result.lines) {
          assert.ok(line.scroll <= line.width + 1, result.title);
          assert.ok(line.height <= 18, result.title);
        }
      });
    }
    console.log('PASS: all demand headings retain whole words and at most two lines at desktop/mobile widths');
  } finally {
    await browser.close();
  }
})();
