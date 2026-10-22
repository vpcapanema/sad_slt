const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({channel: 'msedge', headless: true});
  const base = process.env.SICARD_BASE_URL || 'http://127.0.0.1:8083';
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    for (const width of [1920, 1440, 768, 390]) {
      await page.setViewportSize({width, height: 1000});
      await page.goto(`${base}/public/cadastro/`);
      assert.equal(await page.locator('#como-funciona, #links-uteis').count(), 0);
      for (const href of [
        'https://56.125.163.194/cadastro/sigma',
        'https://56.125.163.194/cadastro/instituicao',
        '/public/documentacao/',
      ]) {
        assert.equal(await page.locator(`main a[href="${href}"]`).count(), 1);
      }
      const metrics = await page.evaluate(() => {
        const main = document.querySelector('main');
        return {
          width: main.getBoundingClientRect().width,
          left: main.getBoundingClientRect().left,
          overflow: document.documentElement.scrollWidth > innerWidth,
          sections: [...document.querySelectorAll('.action-section, .module-info-section')].map(section => {
            const children = [...section.children];
            return {
              gap: getComputedStyle(section).rowGap,
              gaps: children.slice(1).map((child, index) =>
                child.getBoundingClientRect().top - children[index].getBoundingClientRect().bottom),
              contentFits: section.scrollWidth <= section.clientWidth + 1,
            };
          }),
        };
      });
      assert.equal(metrics.overflow, false, `${width}px: cadastro sem rolagem horizontal`);
      for (const section of metrics.sections) {
        assert.equal(section.gap, '20px');
        assert(section.gaps.every(gap => Math.abs(gap - 20) < 1));
        assert.equal(section.contentFits, true);
      }
      if (width > 850) {
        const positions = await page.locator('.preparation-section .module-link-list a')
          .evaluateAll(links => links.map(link => link.getBoundingClientRect().top));
        assert(positions.every(top => Math.abs(top - positions[0]) < 1));
      }
      for (const route of [
        '/public/documentacao/',
        '/public/cadastro/catalogo-diretorias/',
        '/public/cadastro/catalogo-planos/',
        '/public/cadastro/catalogo-frentes-pli/',
        '/public/cadastro/catalogo-eixos-pef/',
      ]) {
        await page.goto(`${base}${route}`);
        if (route.includes('catalogo-')) {
          await page.waitForFunction(() => document.querySelector('#conteudo').getAttribute('aria-busy') === 'false');
          assert.equal(await page.locator('#conteudo .ref-card').count() > 0, true);
        }
        const actual = await page.locator('main').evaluate(main => ({
          width: main.getBoundingClientRect().width,
          left: main.getBoundingClientRect().left,
          overflow: document.documentElement.scrollWidth > innerWidth,
        }));
        assert(Math.abs(actual.width - metrics.width) < 1, `${width}px: largura de ${route}`);
        assert(Math.abs(actual.left - metrics.left) < 1, `${width}px: alinhamento de ${route}`);
        assert.equal(actual.overflow, false, `${width}px: ${route} sem rolagem horizontal`);
      }
      console.log(`PASS ${width}px: conteudo, espacamento e largura dos catalogos e documentacao`);
    }
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
