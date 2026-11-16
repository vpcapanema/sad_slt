// Conteúdo público real: navegação, fórmulas, responsividade e equivalência visual.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const base = process.env.SICARD_BASE_URL || 'http://127.0.0.1:8083';
const route = '/public/documentacao/processo-hierarquizacao/';
const artifacts = process.env.SICARD_DOC_ARTIFACTS || path.join(os.tmpdir(), 'sicard-documentacao-hierarquizacao-revisada');

(async () => {
  fs.mkdirSync(artifacts, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ ignoreHTTPSErrors: true });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const formulaStyles = () => page.locator('.doc-formula').first().evaluate(e => {
      const s = getComputedStyle(e);
      return Object.fromEntries(['backgroundColor', 'border', 'borderRadius', 'padding', 'margin', 'textAlign', 'boxShadow']
        .map(key => [key, s[key]]));
    });
    await page.goto(`${base}/public/documentacao/limite-maritimo/`);
    const formulaReference = await formulaStyles();
    const selectors = ['.app-main', '.visao-hero', '.visao-hero h1', '.visao-indice',
      '.visao-conteudo', '.visao-section h2', '.visao-section h3', '.visao-section > p:not(.module-eyebrow)'];
    const styles = () => page.evaluate(selectors => Object.fromEntries(selectors.map(selector => {
      const s = getComputedStyle(document.querySelector(selector));
      return [selector, Object.fromEntries(['fontFamily', 'fontSize', 'lineHeight', 'color',
        'backgroundColor', 'padding', 'borderRadius'].map(key => [key, s[key]]))];
    })), selectors);
    for (const width of [1920, 1440, 1036, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(`${base}/public/documentacao/visao-geral/`);
      const reference = await styles();
      await page.goto(`${base}${route}`);
      await page.evaluate(() => document.fonts.ready);
      assert.deepEqual(await styles(), reference, `${width}px: estilos da referência preservados`);
      assert.equal(await page.locator('main h1').count(), 1);
      assert.equal(await page.locator('.visao-section').count(), 9);
      assert.equal(await page.locator('.visao-section').first().getAttribute('id'), 'introducao');
      assert.equal(await page.locator('#introducao > h2').innerText(), 'Introdução e contextualização');
      assert.equal(await page.locator('math').count(), 6);
      assert.deepEqual(await formulaStyles(), formulaReference, `${width}px: componente de fórmulas da documentação`);
      for (const id of ['fase-1', 'fase-2', 'fase-3', 'homologacao']) {
        assert.equal(await page.locator(`#${id} > h3`).count(), 6, `${id}: seis tópicos`);
        assert.equal(await page.locator(`#${id} > h2 + p`).count(), 1, `${id}: introdução antes dos tópicos`);
      }
      const metrics = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > innerWidth,
        contentFits: document.querySelector('.visao-conteudo').scrollWidth <= document.querySelector('.visao-conteudo').clientWidth + 1,
        brokenAnchors: [...document.querySelectorAll('main a[href^="#"]')]
          .filter(a => !document.getElementById(a.hash.slice(1))).map(a => a.hash),
        duplicateIds: [...document.querySelectorAll('main [id]')].map(e => e.id)
          .filter((id, i, ids) => ids.indexOf(id) !== i),
        proseIssues: [...document.querySelectorAll('.visao-section p:not(.module-eyebrow), .visao-definicoes dd, .visao-section figcaption')].flatMap(e => {
          const s = getComputedStyle(e), parent = getComputedStyle(e.parentElement);
          const expectedWidth = e.parentElement.clientWidth - parseFloat(parent.paddingLeft) - parseFloat(parent.paddingRight);
          const issues = [];
          if (s.textAlign !== 'justify') issues.push('alinhamento');
          if (s.maxWidth !== 'none' || Math.abs(e.getBoundingClientRect().width - expectedWidth) > 1) issues.push('largura');
          if (Math.abs(parseFloat(s.lineHeight) / parseFloat(s.fontSize) - 1.75) > .01) issues.push('entrelinha');
          if (e.tagName === 'P' && parseFloat(s.marginBottom) < 20) issues.push('espaço após parágrafo');
          return issues.length ? [{ text: e.textContent.slice(0, 50), issues }] : [];
        }),
        formulas: [...document.querySelectorAll('math')].map(e => ({
          width: e.getBoundingClientRect().width, height: e.getBoundingClientRect().height,
          accessible: Boolean(e.getAttribute('aria-label')),
          contained: e.getBoundingClientRect().width <= e.parentElement.clientWidth + 1,
        })),
      }));
      assert.equal(metrics.overflow, false, `${width}px: sem rolagem horizontal na página`);
      assert.equal(metrics.contentFits, true, `${width}px: conteúdo dentro do contêiner`);
      assert.deepEqual(metrics.brokenAnchors, []);
      assert.deepEqual(metrics.duplicateIds, []);
      assert.deepEqual(metrics.proseIssues, [], `${width}px: texto com largura integral, justificação e espaçamento uniforme`);
      assert(metrics.formulas.every(f => f.width > 0 && f.height > 12 && f.accessible));
      if (width >= 390) assert(metrics.formulas.every(f => f.contained), `${width}px: equações cabem`);
      await page.locator('.visao-pular').focus();
      await page.keyboard.press('Enter');
      assert.equal(await page.locator('#hierarquizacao-conteudo').evaluate(e => e === document.activeElement), true);
      if ([1440, 390].includes(width)) {
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot({ path: path.join(artifacts, `pagina-${width}.png`), fullPage: true });
        for (const id of await page.locator('.visao-section').evaluateAll(es => es.map(e => e.id))) {
          await page.locator(`#${id}`).screenshot({ path: path.join(artifacts, `${id}-${width}.png`) });
        }
      }
      await page.goto(`${base}/public/documentacao/`);
      const card = page.locator(`.secao-metodologia-hierarquizacao .module-link-list a[href="${route}"]`);
      assert.equal(await card.count(), 1);
      assert.equal(await card.locator('span').innerText(), 'Fundamentos da Hierarquização e Ranking');
      assert.equal(await page.locator('.secao-documentacao-conceitual').count(), 0);
      const pair = page.locator('.secao-metodologia-hierarquizacao .module-link-list a').locator('nth=0');
      assert.equal(await pair.getAttribute('href'), '/public/documentacao/visao-geral/');
      const positions = await page.locator('.secao-metodologia-hierarquizacao .module-link-list a').evaluateAll(es => es.slice(0, 2).map(e => {
        const r = e.getBoundingClientRect(); return { x: r.x, y: r.y };
      }));
      if (width >= 768) {
        assert(Math.abs(positions[0].y - positions[1].y) < 1, `${width}px: cards na mesma linha`);
        assert(positions[1].x > positions[0].x, `${width}px: card ao lado da visão geral`);
      }
      const cardStyles = await page.locator('.secao-metodologia-hierarquizacao .module-link-list a').evaluateAll(es => es.slice(0, 2).map(e => {
        const read = node => {
          const s = getComputedStyle(node);
          return Object.fromEntries(['fontFamily', 'fontSize', 'fontWeight', 'color', 'padding', 'border',
            'borderRadius', 'backgroundImage', 'boxShadow'].map(key => [key, s[key]]));
        };
        return { box: read(e), icon: read(e.querySelector('i')), title: read(e.querySelector('span')) };
      }));
      assert.deepEqual(cardStyles[0], cardStyles[1], `${width}px: card novo corresponde à visão geral`);
      await card.focus();
      await page.keyboard.press('Enter');
      await page.waitForURL(`**${route}`);
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(`${base}/public/documentacao/`);
    await page.locator('.secao-metodologia-hierarquizacao').scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(artifacts, 'documentacao-card.png'), fullPage: false });
    const card = page.locator(`.secao-metodologia-hierarquizacao .module-link-list a[href="${route}"]`);
    await card.hover();
    await page.waitForTimeout(250);
    assert.equal(await card.evaluate(e => getComputedStyle(e).transform), 'matrix(1, 0, 0, 1, 0, 3)');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    assert.equal(await card.evaluate(e => getComputedStyle(e).transform), 'none');
    assert.deepEqual(errors, []);
    console.log(`PASS documentação conceitual: 6 larguras, largura integral, justificação, entrelinha, parágrafos, introduções, 6 fórmulas, âncoras, teclado e card. Imagens: ${artifacts}`);
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
