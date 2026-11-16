const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const base = process.env.SICARD_BASE_URL || 'http://127.0.0.1:8083';
  const artifacts = path.join(os.tmpdir(), 'sicard-visao-geral-revisada');
  fs.mkdirSync(artifacts, { recursive: true });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    for (const width of [1920, 1440, 1036, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(`${base}/public/documentacao/visao-geral/`);
      assert.equal(await page.locator('h1').textContent(), 'Visão geral do SICARD');
      assert.equal(await page.locator('.visao-section').count(), 11);
      assert.equal(await page.locator('figure').count(), 4);
      assert.deepEqual(await page.locator('#modulos .visao-mapa > li > strong').allTextContents(), [
        'MOCAD', 'MAD', 'Transparência e acompanhamento',
      ]);
      const metrics = await page.evaluate(() => {
        const main = document.querySelector('main');
        const content = document.querySelector('.visao-conteudo');
        const diagram = document.querySelector('figure');
        const card = document.querySelector('.module-link-list a');
        return {
          overflow: document.documentElement.scrollWidth > innerWidth,
          contentFits: content.scrollWidth <= content.clientWidth + 1,
          diagramShadow: getComputedStyle(diagram).boxShadow,
          cardShadow: getComputedStyle(card).boxShadow,
          mainWidth: main.getBoundingClientRect().width,
          mainLeft: main.getBoundingClientRect().left,
          paragraphsJustified: [...document.querySelectorAll('main p')]
            .every(p => getComputedStyle(p).textAlign === 'justify'),
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
          brokenAnchors: [...document.querySelectorAll('main a[href^="#"]')]
            .filter(a => !document.getElementById(a.hash.slice(1))).map(a => a.hash),
        };
      });
      assert.equal(metrics.overflow, false, `${width}px: sem rolagem horizontal`);
      assert.equal(metrics.contentFits, true, `${width}px: conteúdo dentro do contêiner`);
      assert.equal(metrics.paragraphsJustified, true, `${width}px: parágrafos justificados`);
      assert.deepEqual(metrics.proseIssues, [], `${width}px: texto com largura integral e espaçamento uniforme`);
      assert.equal(metrics.diagramShadow, 'none', 'Diagrama informativo sem relevo de botão');
      assert.notEqual(metrics.cardShadow, 'none', 'Card de navegação com sombra 3D');
      assert.deepEqual(metrics.brokenAnchors, []);
      await page.locator('.visao-pular').focus();
      await page.keyboard.press('Enter');
      assert.equal(await page.locator('#visao-conteudo').evaluate(e => e === document.activeElement), true);
      const focus = await page.locator('#visao-conteudo').evaluate(e => getComputedStyle(e).outlineStyle);
      assert.equal(focus, 'solid');
      if ([1440, 390].includes(width)) {
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot({ path: path.join(artifacts, `pagina-${width}.png`), fullPage: true });
        for (const id of await page.locator('.visao-section').evaluateAll(es => es.map(e => e.id))) {
          await page.locator(`#${id}`).screenshot({ path: path.join(artifacts, `${id}-${width}.png`) });
        }
      }
      await page.goto(`${base}/public/documentacao/glossario/`);
      assert.equal(await page.locator('#objeto-demanda').count(), 1);
      assert.equal(await page.locator('#status').count(), 1);
      await page.goto(`${base}/public/documentacao/`);
      const referenceWidth = await page.locator('main').evaluate(e => e.getBoundingClientRect().width);
      assert(Math.abs(metrics.mainWidth - referenceWidth) < 1, 'Mesma largura da documentação');
      assert.equal(
        await page.locator('main a[href="/public/documentacao/visao-geral/"]').textContent(),
        'Visão geral do SICARD',
      );
      assert(metrics.mainLeft >= 0);
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(`${base}/public/documentacao/visao-geral/`);
    const card = page.locator('.module-link-list a').first();
    await card.hover();
    await page.waitForTimeout(250);
    const pressed = await card.evaluate(e => getComputedStyle(e).transform);
    assert.equal(pressed, 'matrix(1, 0, 0, 1, 0, 3)', 'Hover de botão pressionado');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    assert.equal(await card.evaluate(e => getComputedStyle(e).transform), 'none');
    assert.deepEqual(errors, []);
    console.log(`Visão geral: 6 larguras, largura integral, justificação, entrelinha, parágrafos, âncoras, teclado e cards aprovados. Imagens: ${artifacts}`);
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
