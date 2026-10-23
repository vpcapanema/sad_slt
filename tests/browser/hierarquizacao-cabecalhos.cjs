const {chromium} = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({channel: 'msedge', headless: true});
  try {
    const page = await browser.newPage();
    await page.route('**/api/**', route => {
      const path = new URL(route.request().url()).pathname;
      const user = {id: 'teste', tipo_usuario: 'ANALISTA'};
      return route.fulfill({json: path.endsWith('/auth/me') ? user :
        path.endsWith('/auth/session') ? {authenticated: true, user} : []});
    });
    const selectors = '.ahp-section-label, .ahp-subsection-title, .ea-section-head';
    for (const width of [1440, 768, 390]) {
      await page.setViewportSize({width, height: 1000});
      for (const path of ['agrupamento-demandas', 'hierarquizacao/fase-1',
        'hierarquizacao/fase-2', 'hierarquizacao/fase-3']) {
        await page.goto(`http://127.0.0.1:8083/restrict/${path}/`);
        if (path === 'agrupamento-demandas') await page.locator('#agrupamento-new').click();
        const headers = await page.locator(selectors).evaluateAll(elements => elements
          .filter(el => el.getBoundingClientRect().height > 0)
          .map(el => {
            const children = [...el.children].filter(child => child.getBoundingClientRect().height > 0);
            const centers = children.map(child => {
              const rect = child.getBoundingClientRect();
              return rect.top + rect.height / 2;
            });
            return {
              text: el.textContent.trim(),
              paragraphs: el.querySelectorAll('p').length,
              nestedTitle: !!el.querySelector(':scope > div > h2'),
              row: getComputedStyle(el).flexDirection,
              centerDifference: centers.length ? Math.max(...centers) - Math.min(...centers) : 0,
            };
          }));
        assert.ok(headers.length > 0, `${path}: cabeçalhos disponíveis`);
        for (const header of headers) {
          const label = `${path} em ${width}px: ${header.text}`;
          assert.equal(header.paragraphs, 0, `${label}: explicações ficam no corpo, não no cabeçalho`);
          assert.equal(header.nestedTitle, false, `${label}: título direto, sem segundo bloco`);
          assert.equal(header.row, 'row', `${label}: índice e título na mesma linha`);
          assert.ok(header.centerDifference < 1, `${label}: índice e título alinhados`);
        }
        if (path === 'hierarquizacao/fase-1') {
          for (const [section, description] of [
            ['#ea-workbench', 'Confira aqui as camadas de entrada'],
            ['#cinco-resultados_elegibilidade_v2', 'A demanda é o objeto da análise'],
          ]) {
            assert.match(await page.locator(`${section} > .ea-section-body`).innerText(),
              new RegExp(description), 'Texto de orientação preservado no corpo');
          }
        }
      }
    }
    console.log('PASS: cabeçalhos das três fases sem segunda linha explicativa, com índice e título alinhados como na referência, em desktop e mobile.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
