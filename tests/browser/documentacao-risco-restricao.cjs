// Comparação com a referência visual e leitura navegável do novo referencial.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const base = process.env.SICARD_BASE_URL || 'http://127.0.0.1:8083';
const route = '/public/documentacao/risco-restricao/';
const artifacts = path.join(os.tmpdir(), 'sicard-risco-restricao-revisada');

(async () => {
  fs.mkdirSync(artifacts, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    const selectors = ['main', '.standard-page-hero', 'main h1', '.standard-page-hero__description',
      '.barra-lateral-glossario', '.glossario-busca', '.glossario-indice summary',
      '.glossario-conteudo', '.glossario-grupo', '.glossario-grupo h2', '.glossario-entrada'];
    const styles = () => page.evaluate(selectors => Object.fromEntries(selectors.map(selector => {
      const s = getComputedStyle(document.querySelector(selector));
      return [selector, Object.fromEntries(['fontFamily', 'fontSize', 'lineHeight', 'color',
        'backgroundColor', 'backgroundImage', 'padding', 'margin', 'border', 'borderRadius',
        'boxShadow', 'textAlign', 'width'].map(key => [key, s[key]]))];
    })), selectors);
    for (const width of [1920, 1440, 1036, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(`${base}/public/documentacao/glossario/`);
      await page.evaluate(() => document.fonts.ready);
      const reference = await styles();
      await page.goto(`${base}${route}`);
      await page.evaluate(() => document.fonts.ready);
      assert.deepEqual(await styles(), reference, `${width}px: mesma apresentação do glossário`);
      assert.equal(await page.locator('main h1').count(), 1);
      assert.equal(await page.locator('.glossario-grupo').count(), 7);
      assert.equal(await page.locator('#procedimento .glossario-entrada[id^="etapa-"]').count(), 8);
      assert.equal(await page.locator('tr[data-categoria="restricao"]').count(), 7);
      assert.equal(await page.locator('tr[data-categoria="risco"]').count(), 13);
      assert.deepEqual(await page.locator('#risco-exemplos thead th').allTextContents(), ['', 'Camada/fonte', 'Categoria', 'Fundamento', 'Fonte']);
      const issues = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > innerWidth,
        anchors: [...document.querySelectorAll('main a[href^="#"]')]
          .filter(a => !document.getElementById(a.hash.slice(1))).map(a => a.hash),
        duplicateIds: [...document.querySelectorAll('main [id]')].map(e => e.id)
          .filter((id, i, ids) => ids.indexOf(id) !== i),
        examples: [...document.querySelectorAll('tr[data-camada]')].filter(e =>
          e.cells.length !== 5 || !e.cells[1].querySelector('a') ||
          !['Risco', 'Restrição'].includes(e.cells[2].textContent.trim()) ||
          !e.cells[3].textContent.includes('Condições e limites:') || !e.cells[4].querySelector('a')).length,
      }));
      assert.deepEqual(issues, { overflow: false, anchors: [], duplicateIds: [], examples: 0 });
      await page.locator('nav a[href="#etapa-5"]').focus();
      await page.keyboard.press('Enter');
      assert.equal(await page.locator('#etapa-5').evaluate(e => e === document.activeElement), true);
      if ([1440, 390].includes(width)) {
        await page.evaluate(() => scrollTo(0, 0));
        await page.screenshot({ path: path.join(artifacts, `pagina-${width}.png`), fullPage: true });
        for (const id of await page.locator('.glossario-grupo').evaluateAll(es => es.map(e => e.id))) {
          await page.locator(`#${id}`).screenshot({ path: path.join(artifacts, `${id}-${width}.png`) });
        }
      }
    }
    await page.locator('#risco-filtro-coluna').selectOption('2');
    await page.locator('#risco-filtro-valor').selectOption('Risco');
    assert.equal(await page.locator('tr[data-camada]:visible').count(), 13);
    await page.locator('#risco-filtro-inverter').click();
    assert.equal(await page.locator('tr[data-camada]:visible').count(), 7);
    await page.locator('#risco-selecionar-todos').check();
    assert.equal(await page.locator('[data-selecionar-exemplo]:checked').count(), 7);
    const download = page.waitForEvent('download');
    await page.locator('#risco-exportar').click();
    const exported = await download;
    assert.equal(exported.suggestedFilename(), 'sicard-classificacoes-sugeridas.csv');
    const csv = fs.readFileSync(await exported.path(), 'utf8');
    assert(csv.includes('Manguezal oficialmente mapeado'));
    assert(!csv.includes('Área suscetível a inundação'));
    await page.locator('#risco-filtro-limpar').click();
    assert.equal(await page.locator('tr[data-camada]:visible').count(), 20);
    await page.locator('#glossario-termo').fill('contaminada');
    assert.equal(await page.locator('tr[data-camada]:visible').count(), 2);
    await page.locator('#glossario-termo').fill('zzzz-inexistente');
    assert.equal(await page.locator('.glossario-entrada:visible').count(), 0);
    assert.equal(await page.locator('#glossario-sem-resultados').isVisible(), true);
    await page.evaluate(() => { location.hash = 'exemplo-10'; });
    await page.waitForFunction(() => document.querySelector('#glossario-termo').value === '');
    assert.equal(await page.locator('#exemplo-10').isVisible(), true);
    await page.locator('#glossario-termo').fill('auditoria');
    await page.locator('button[type="reset"]').click();
    assert.equal(await page.locator('.glossario-entrada:visible').count(), 41);
    await page.goto(`${base}/public/documentacao/`);
    const card = page.locator(`.secao-referencial-conceitual a[href="${route}"]`);
    assert.equal(await card.innerText(), 'Risco e restrição — fundamentos para classificação');
    await card.click();
    await page.waitForURL(`**${route}`);
    assert.deepEqual(errors, []);
    console.log(`PASS risco e restrição: 6 larguras, padrão do glossário, 8 etapas, 20 exemplos, busca, âncoras, teclado e acesso pelo card. Imagens: ${artifacts}`);
  } finally {
    await browser.close();
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
