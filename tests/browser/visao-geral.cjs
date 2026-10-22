const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const base = process.env.SICARD_BASE_URL || 'http://127.0.0.1:8083';
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
          brokenAnchors: [...document.querySelectorAll('main a[href^="#"]')]
            .filter(a => !document.getElementById(a.hash.slice(1))).map(a => a.hash),
        };
      });
      assert.equal(metrics.overflow, false, `${width}px: sem rolagem horizontal`);
      assert.equal(metrics.contentFits, true, `${width}px: conteúdo dentro do contêiner`);
      assert.equal(metrics.paragraphsJustified, true, `${width}px: parágrafos justificados`);
      assert.equal(metrics.diagramShadow, 'none', 'Diagrama informativo sem relevo de botão');
      assert.notEqual(metrics.cardShadow, 'none', 'Card de navegação com sombra 3D');
      assert.deepEqual(metrics.brokenAnchors, []);
      await page.locator('.visao-pular').focus();
      await page.keyboard.press('Enter');
      assert.equal(await page.locator('#visao-conteudo').evaluate(e => e === document.activeElement), true);
      const focus = await page.locator('#visao-conteudo').evaluate(e => getComputedStyle(e).outlineStyle);
      assert.equal(focus, 'solid');
      await page.goto(`${base}/public/documentacao/glossario/`);
      assert.equal(await page.locator('#objeto-demanda').count(), 1);
      assert.equal(await page.locator('#status').count(), 1);
      await page.goto(`${base}/public/documentacao/`);
      const referenceWidth = await page.locator('main').evaluate(e => e.getBoundingClientRect().width);
      assert(Math.abs(metrics.mainWidth - referenceWidth) < 1, 'Mesma largura da documentação');
      assert.equal(
        await page.locator('a[href="/public/documentacao/visao-geral/"]').textContent(),
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
    console.log('Visão geral: 6 larguras, âncoras, teclado, conceitos e cards 3D aprovados.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
