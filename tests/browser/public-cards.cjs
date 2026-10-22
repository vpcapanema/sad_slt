const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({channel: 'msedge', headless: true});
  const base = process.env.SICARD_BASE_URL || 'http://127.0.0.1:8083';
  const styles = locator => locator.evaluate(element => {
    const style = getComputedStyle(element);
    return {
      shadow: style.boxShadow, transform: style.transform,
      background: style.backgroundImage, transition: style.transitionDuration,
      outline: style.outlineStyle, outlineWidth: style.outlineWidth,
    };
  });
  const shadowAlphas = shadow => [...shadow.matchAll(/rgba\([^)]*,\s*([\d.]+)\)/g)]
    .slice(-4).map(match => Number(match[1]));
  const assertDirectionalShadow = shadow => {
    const layers = shadow.split(/,(?![^(]*\))/).filter(layer => !layer.includes('inset'));
    assert.equal(layers.length, 4);
    for (const layer of layers) {
      const dimensions = layer.match(/-?[\d.]+px/g).map(Number.parseFloat);
      const offsets = dimensions.slice(0, 2);
      assert(offsets.every(offset => offset > 0), 'Relevo e sombras devem se projetar para baixo e para a direita');
      assert(dimensions[2] > 0, 'Nenhuma camada externa deve formar uma faixa solida sem desfoque');
      assert.match(layer, /rgba\([^)]*,\s*0\.\d+\)/, 'As sombras devem se misturar ao fundo por transparencia');
    }
  };
  try {
    const page = await browser.newPage();
    await page.route('**/public/documentacao/tutoriais/midias/**', route => route.fulfill({
      contentType: 'image/png',
      body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64'),
    }));
    let checked = 0;
    for (const width of [1440, 390]) {
      await page.setViewportSize({width, height: 1000});
      let documentationWidth;
      for (const route of ['/public/', '/public/cadastro/', '/public/documentacao/', '/public/transparencia/', '/public/documentacao/tutoriais/']) {
        await page.emulateMedia({reducedMotion: 'no-preference'});
        await page.goto(`${base}${route}`);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        if (route === '/public/documentacao/') {
          documentationWidth = await page.locator('main').evaluate(main => main.getBoundingClientRect().width);
        }
        if (route === '/public/documentacao/tutoriais/') {
          assert.equal(await page.locator('.secao-tutoriais-ressalvas, #ressalvas-title').count(), 0);
          const mainWidth = await page.locator('main').evaluate(main => main.getBoundingClientRect().width);
          assert(Math.abs(mainWidth - documentationWidth) < 1, 'Tutoriais devem ter a mesma largura da documentacao');
          assert.equal(await page.locator('body').getAttribute('data-navegacao'), 'publica');
          assert.equal(await page.locator('.rodape-institucional').count(), 1);
          assert.equal(await page.locator('.tutorial-card').count(), 16);
          assert.equal(await page.locator('video[controls][playsinline][preload="none"] track').count(), 16);
          assert.equal(await page.locator('.tutorial-downloads a[download]').count(), 32);
          assert.equal(await page.locator('.tutorial-card > .module-section-heading').count(), 0);
          assert.equal(await page.locator('.tutorial-card > h2.sr-only').count(), 16);
          const details = await page.locator('.tutorial-card').evaluateAll(cards => cards.map(card => {
            const video = card.querySelector('video');
            const videoRect = video.getBoundingClientRect();
            const cardRect = card.getBoundingClientRect();
            const meta = card.querySelector('.tutorial-meta');
            const duration = meta.querySelector('.tutorial-duracao');
            const revision = meta.querySelector('.tutorial-revisao');
            return {
              padding: getComputedStyle(card).paddingLeft,
              border: getComputedStyle(card).borderTop,
              videoWidthDifference: Math.abs(videoRect.width - card.clientWidth),
              videoTopOffset: videoRect.top - cardRect.top,
              videoAspectRatio: videoRect.width / videoRect.height,
              accessibleTitle: document.getElementById(video.getAttribute('aria-labelledby')).textContent.trim(),
              sameLine: !revision || Math.abs(duration.getBoundingClientRect().top - revision.getBoundingClientRect().top) < 1,
              rightAligned: !revision || Math.abs(revision.getBoundingClientRect().right - meta.getBoundingClientRect().right) < 1,
            };
          }));
          for (const detail of details) {
            assert.equal(detail.padding, '0px');
            assert.equal(detail.border, '1px solid rgb(111, 135, 154)');
            assert(detail.videoWidthDifference < 1, 'Video deve ocupar toda a largura interna do card');
            assert(detail.videoTopOffset <= 1, 'Video deve comecar no topo do card sem cabecalho');
            assert(Math.abs(detail.videoAspectRatio - 16 / 9) < .01);
            assert(detail.accessibleTitle.length > 0);
            assert.equal(detail.rightAligned, true);
            if (width > 850) assert.equal(detail.sameLine, true);
          }
          for (const link of await page.locator('.tutorial-downloads a').all()) {
            const rest = await styles(link);
            assert.equal(rest.shadow, 'none');
            assert.equal(rest.background, 'none');
            assert.equal(await link.evaluate(element => element.firstElementChild.tagName), 'I');
            await link.hover();
            assert.equal((await styles(link)).shadow, 'none');
            assert.equal((await styles(link)).transform, 'none');
          }
          const columns = await page.locator('.tutoriais-grid').evaluate(grid => getComputedStyle(grid).gridTemplateColumns.split(' ').length);
          assert.equal(columns, width > 850 ? 2 : 1);
          const firstVideo = page.locator('video').first();
          await firstVideo.dispatchEvent('error');
          assert.match(await page.locator('.erro-midia').first().innerText(), /Não foi possível reproduzir/);
          await firstVideo.dispatchEvent('loadeddata');
          assert.equal(await page.locator('.erro-midia').first().isVisible(), false);
          await firstVideo.locator('track').dispatchEvent('error', {bubbles: false});
          assert.match(await page.locator('.erro-midia').first().innerText(), /legendas opcional/);
          await firstVideo.dispatchEvent('loadeddata');
        }
        for (const selector of ['a.module-card', 'a.module-action-card', 'a.documentation-subcard', '.module-link-list a', 'a.restricted-card']) {
          const card = page.locator(`main ${selector}[href]`).first();
          if (!await card.count()) continue;
          await page.mouse.move(0, 0);
          const rest = await styles(card);
          assert(rest.shadow.includes('inset'), `${route}: realce superior de ${selector}`);
          assert.deepEqual(shadowAlphas(rest.shadow), [.38, .24, .14, .06], 'Sombra em degrade no repouso');
          assertDirectionalShadow(rest.shadow);
          assert(rest.background.includes('gradient'), `${route}: superficie de ${selector}`);
          await card.hover();
          await page.waitForTimeout(220);
          const hover = await styles(card);
          assert.equal(hover.transform, 'matrix(1, 0, 0, 1, 0, 3)');
          assert.notEqual(hover.shadow, rest.shadow);
          assert.deepEqual(shadowAlphas(hover.shadow), [.26, .16, .08, .04], 'Sombra comprimida e botao apertado no hover');
          assertDirectionalShadow(hover.shadow);
          await page.mouse.down();
          await page.waitForTimeout(220);
          const active = await styles(card);
          assert.equal(active.transform, 'matrix(1, 0, 0, 1, 0, 4)');
          assert.notEqual(active.shadow, hover.shadow);
          assert.deepEqual(shadowAlphas(active.shadow), [.22, .12, .06, .03], 'Pressao mais acentuada ao clicar');
          assertDirectionalShadow(active.shadow);
          await page.mouse.move(0, 0);
          await page.mouse.up();
          await page.keyboard.press('Tab');
          await card.focus();
          const focus = await styles(card);
          assert.equal(focus.outline, 'solid');
          assert.equal(focus.outlineWidth, '3px');
          await page.emulateMedia({reducedMotion: 'reduce'});
          await card.hover();
          const reduced = await styles(card);
          assert.equal(reduced.transition, '0s');
          assert.equal(reduced.transform, 'none');
          assert.notEqual(reduced.shadow, 'none');
          assertDirectionalShadow(reduced.shadow);
          await page.mouse.down();
          assert.equal((await styles(card)).transform, 'none');
          await page.mouse.move(0, 0);
          await page.mouse.up();
          await page.emulateMedia({reducedMotion: 'no-preference'});
          checked++;
        }
        for (const selector of ['.action-section', '.module-info-section', '.preparation-grid article', '.documentation-subcard:not(a)']) {
          const card = page.locator(`main ${selector}`).first();
          if (!await card.count()) continue;
          await page.mouse.move(0, 0);
          const rest = await styles(card);
          assert.equal(rest.shadow, 'none', `${route}: informativo plano ${selector}`);
          assert.equal(rest.background, 'none');
          await card.hover();
          const hover = await styles(card);
          assert.equal(hover.shadow, rest.shadow);
          assert.equal(hover.transform, 'none');
          checked++;
        }
      }
      for (const slug of ['diretorias', 'planos', 'frentes-pli', 'eixos-pef']) {
        await page.goto(`${base}/public/cadastro/catalogo-${slug}/`);
        await page.waitForFunction(() => document.querySelector('#conteudo').getAttribute('aria-busy') === 'false');
        const cards = page.locator('.ref-card');
        assert(await cards.count() > 1);
        for (const card of await cards.all()) {
          assert.equal((await styles(card)).shadow, 'none');
          assert.equal((await styles(card)).background, 'none');
          checked++;
        }
      }
    }
    console.log(`PASS: ${checked} verificacoes de cards publicos, hover/pressao 3D, foco, movimento reduzido e informativos planos.`);
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
