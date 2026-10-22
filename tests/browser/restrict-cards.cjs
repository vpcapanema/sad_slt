const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({channel: 'msedge', headless: true});
  const base = process.env.SICARD_BASE_URL || 'http://127.0.0.1:8083';
  try {
    const page = await browser.newPage();
    await page.route('**/api/**', route => {
      const path = new URL(route.request().url()).pathname;
      const user = {id: 'visual-test', username: 'teste_admin', nome: 'Teste visual', tipo_usuario: 'ADMIN'};
      return route.fulfill({json: path === '/api/auth/me' ? user
        : path === '/api/auth/session' ? {authenticated: true, user} : []});
    });
    const styles = card => card.evaluate(element => {
      const style = getComputedStyle(element);
      const probe = document.createElement('span');
      probe.style.color = `color-mix(in srgb, ${style.borderTopColor} 100%, transparent)`;
      element.append(probe);
      const channels = color => color.match(/color\(srgb ([^)]+)\)/)[1]
        .split(' / ')[0].split(' ').map(Number);
      const border = channels(getComputedStyle(probe).color);
      probe.remove();
      const shadows = [...style.boxShadow.matchAll(/color\(srgb [^)]+\)/g)]
        .map(match => channels(match[0]));
      return {
        border, shadows, shadow: style.boxShadow,
        transform: style.transform, transition: style.transitionDuration,
        outline: style.outlineStyle, outlineWidth: style.outlineWidth,
      };
    });
    const checkColor = state => {
      assert(state.shadows.length >= 4);
      for (const channels of state.shadows) {
        assert(channels.every((channel, index) => Math.abs(channel - state.border[index]) < .0001),
          'A sombra deve usar a mesma cor da borda');
      }
      const layers = state.shadow.split(/,(?![^(]*\))/).filter(layer => !layer.includes('inset'));
      assert.equal(layers.length, 4);
      for (const layer of layers) {
        assert(layer.match(/-?[\d.]+px/g).slice(0, 3).map(Number.parseFloat).every(value => value > 0),
          'Sombras difusas devem se projetar para baixo e para a direita');
      }
    };
    for (const width of [1440, 390]) {
      await page.setViewportSize({width, height: 1000});
      await page.emulateMedia({reducedMotion: 'no-preference'});
      await page.goto(`${base}/restrict/`);
      await page.locator('.secao-platform-administracao').waitFor({state: 'visible'});
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      const allCards = page.locator('.restrict-platform-groups a.platform-tile');
      for (const card of await allCards.all()) checkColor(await styles(card));
      const samples = page.locator('.platform-group:not(:has(.platform-subgroup)) .platform-tile:first-child, .platform-subgroup .platform-tile:first-child');
      for (const card of await samples.all()) {
        await card.hover();
        await page.waitForTimeout(220);
        const hover = await styles(card);
        assert.equal(hover.transform, 'matrix(1, 0, 0, 1, 0, 3)');
        checkColor(hover);
        await page.mouse.down();
        await page.waitForTimeout(220);
        const active = await styles(card);
        assert.equal(active.transform, 'matrix(1, 0, 0, 1, 0, 4)');
        checkColor(active);
        await page.mouse.move(0, 0);
        await page.mouse.up();
        await page.keyboard.press('Tab');
        await card.focus();
        await page.waitForTimeout(220);
        const focus = await styles(card);
        assert.equal(focus.transform, 'none');
        assert.equal(focus.outline, 'solid');
        assert(Number.parseFloat(focus.outlineWidth) >= 2, 'Foco deve permanecer visivel com a escala da pagina');
        checkColor(focus);
      }
      await page.emulateMedia({reducedMotion: 'reduce'});
      const first = allCards.first();
      await first.hover();
      assert.equal((await styles(first)).transform, 'none');
      assert.equal((await styles(first)).transition, '0s');
      await page.mouse.down();
      assert.equal((await styles(first)).transform, 'none');
      await page.mouse.move(0, 0);
      await page.mouse.up();
      console.log(`PASS ${width}px: cards restritos 3D, sombras nas cores das bordas, hover pressionado, foco e movimento reduzido`);
    }
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
