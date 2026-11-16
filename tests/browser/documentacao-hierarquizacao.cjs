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
      const termStyle = await page.locator('.glossario-entrada dt').first().evaluate(e => {
        const s = getComputedStyle(e);
        return [s.fontFamily, s.fontSize, s.fontWeight, s.lineHeight, s.color];
      });
      await page.goto(`${base}${route}`);
      await page.evaluate(() => document.fonts.ready);
      assert.deepEqual(await styles(), reference, `${width}px: estilos da referência preservados`);
      assert.equal(await page.locator('main h1').count(), 1);
      assert.equal(await page.locator('.hier-secao').count(), 9);
      assert.equal(await page.locator('.hier-secao').first().getAttribute('id'), 'introducao');
      assert.equal(await page.locator('#introducao > h2').innerText(), '1. Introdução e contextualização');
      assert.equal(await page.locator('#fundamentos dt').first().innerText(), '3.1. Premissa');
      const numbering = await page.evaluate(() => ({
        sections: [...document.querySelectorAll('.hier-secao > h2')].map(e => e.textContent.trim()),
        index: [...document.querySelectorAll('.glossario-indice-titulo')].map(e => e.textContent.trim()),
        mismatches: [...document.querySelectorAll('.glossario-indice li a')].flatMap(a => {
          const target = document.getElementById(a.hash.slice(1));
          const title = target?.matches('dt') ? target : target?.querySelector('h3');
          return title?.textContent.trim() === a.textContent.trim() ? [] : [a.hash];
        }),
        unnumbered: [...document.querySelectorAll('.hier-secao h2, .hier-secao h3, .hier-secao dt')]
          .filter(e => !/^\d+(?:\.\d+)*\.\s/.test(e.textContent)).map(e => e.textContent),
      }));
      assert.deepEqual(numbering.sections, numbering.index);
      assert.deepEqual(numbering.mismatches, []);
      assert.deepEqual(numbering.unnumbered, []);
      assert(numbering.sections.every((title, i) => title.startsWith(`${i + 1}. `)));
      assert.equal(await page.locator('math').count(), 6);
      assert.deepEqual(await page.locator('.hier-topico').first().evaluate(e => {
        const s = getComputedStyle(e);
        return [s.fontFamily, s.fontSize, s.fontWeight, s.lineHeight, s.color];
      }), termStyle, `${width}px: subtítulos correspondem aos termos da referência`);
      for (const id of ['fase-1', 'fase-2', 'fase-3', 'homologacao']) {
        assert.equal(await page.locator(`#${id} > .glossario-entrada > h3`).count(), 6, `${id}: seis tópicos`);
        assert.equal(await page.locator(`#${id} > h2 + .glossario-entrada > p`).count(), 1, `${id}: introdução antes dos tópicos`);
      }
      const metrics = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > innerWidth,
        contentFits: document.querySelector('.glossario-conteudo').scrollWidth <= document.querySelector('.glossario-conteudo').clientWidth + 1,
        brokenAnchors: [...document.querySelectorAll('main a[href^="#"]')]
          .filter(a => !document.getElementById(a.hash.slice(1))).map(a => a.hash),
        duplicateIds: [...document.querySelectorAll('main [id]')].map(e => e.id)
          .filter((id, i, ids) => ids.indexOf(id) !== i),
        proseIssues: [...document.querySelectorAll('.hier-texto p:not(.glossario-referencias), .hier-definicoes dd')].flatMap(e => {
          const s = getComputedStyle(e), parent = getComputedStyle(e.parentElement);
          const expectedWidth = e.parentElement.clientWidth - parseFloat(parent.paddingLeft) - parseFloat(parent.paddingRight);
          const issues = [];
          if (s.textAlign !== 'justify') issues.push('alinhamento');
          if (s.maxWidth !== 'none' || Math.abs(e.getBoundingClientRect().width - expectedWidth) > 1) issues.push('largura');
          if (Math.abs(parseFloat(s.lineHeight) / parseFloat(s.fontSize) - 1.7) > .01) issues.push('entrelinha');
          if (e.tagName === 'P' && e.nextElementSibling && parseFloat(s.marginBottom) < 16) issues.push('espaço após parágrafo');
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
      await page.locator('nav a[href="#fase-1-topico-1"]').focus();
      await page.keyboard.press('Enter');
      assert.equal(await page.locator('#fase-1-topico-1').evaluate(e => e === document.activeElement), true);
      if ([1440, 390].includes(width)) {
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot({ path: path.join(artifacts, `pagina-${width}.png`), fullPage: true });
        for (const id of await page.locator('.hier-secao').evaluateAll(es => es.map(e => e.id))) {
          await page.locator(`#${id}`).screenshot({ path: path.join(artifacts, `${id}-${width}.png`) });
        }
      }
      await page.goto(`${base}/public/documentacao/`);
      const card = page.locator(`.secao-referencial-conceitual .module-link-list a[href="${route}"]`);
      assert.equal(await card.count(), 1);
      assert.equal(await card.locator('span').innerText(), 'Fundamentos da Hierarquização e Ranking');
      assert.equal(await page.locator('.secao-documentacao-conceitual').count(), 0);
      assert.equal(await page.locator('#referencial-conceitual-titulo').innerText(), 'Referencial conceitual');
      assert.equal(await page.locator('#referencial-tecnico-titulo').innerText(), 'Referencial técnico');
      assert.equal(await page.locator('.secao-referencial-conceitual .module-link-list a').count(), 4);
      assert.equal(await page.locator('.secao-referencial-tecnico .module-link-list a').count(), 4);
      const pair = page.locator('.secao-referencial-conceitual .module-link-list a').first();
      assert.equal(await pair.getAttribute('href'), '/public/documentacao/visao-geral/');
      const positions = await page.locator('.secao-referencial-conceitual .module-link-list a').evaluateAll(es => es.slice(0, 2).map(e => {
        const r = e.getBoundingClientRect(); return { x: r.x, y: r.y };
      }));
      if (width >= 768) {
        assert(Math.abs(positions[0].y - positions[1].y) < 1, `${width}px: cards na mesma linha`);
        assert(positions[1].x > positions[0].x, `${width}px: card ao lado da visão geral`);
      }
      const cardStyles = await page.locator('.secao-referencial-conceitual .module-link-list a').evaluateAll(es => es.slice(0, 2).map(e => {
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
    for (const slug of ['glossario', 'processo-hierarquizacao']) {
      await page.goto(`${base}/public/documentacao/${slug}/`);
      const entries = page.locator('.glossario-entrada');
      const total = await entries.count();
      await page.locator('#glossario-termo').fill('elegibilidade');
      assert(await page.locator('.glossario-entrada:visible').count() > 0);
      assert(await page.locator('.glossario-entrada:visible').count() < total);
      await page.locator('#glossario-termo').fill('zzzz-inexistente');
      assert.equal(await page.locator('.glossario-entrada:visible').count(), 0);
      assert.equal(await page.locator('#glossario-sem-resultados').isVisible(), true);
      const fragment = slug === 'glossario' ? 'ahp' : 'fase-3-topico-5';
      await page.evaluate(id => { location.hash = id; }, fragment);
      await page.waitForFunction(() => document.querySelector('#glossario-termo').value === '');
      assert.equal(await page.locator(`#${fragment}`).isVisible(), true);
      await page.locator('#glossario-termo').fill('risco');
      await page.locator('button[type="reset"]').click();
      assert.equal(await page.locator('.glossario-entrada:visible').count(), total);
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(`${base}/public/documentacao/`);
    await page.locator('.secao-referencial-conceitual').scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(artifacts, 'documentacao-card.png'), fullPage: false });
    const card = page.locator(`.secao-referencial-conceitual .module-link-list a[href="${route}"]`);
    await card.hover();
    await page.waitForTimeout(250);
    assert.equal(await card.evaluate(e => getComputedStyle(e).transform), 'matrix(1, 0, 0, 1, 0, 3)');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    assert.equal(await card.evaluate(e => getComputedStyle(e).transform), 'none');
    assert.deepEqual(errors, []);
    console.log(`PASS documentação conceitual: 6 larguras, padrão visual do glossário, introduções, 6 fórmulas, âncoras, teclado, busca nas duas páginas e card. Imagens: ${artifacts}`);
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
