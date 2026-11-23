const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const base = process.env.SICARD_TEST_URL || 'http://127.0.0.1:8083';
const steps = ['9', '7', '5', '3', '1', '1/3', '1/5', '1/7', '1/9'];

async function exerciseReview(browser, width) {
  const mobile = width < 600;
  const page = await browser.newPage({ viewport: { width, height: 900 }, hasTouch: mobile, isMobile: mobile });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.route('**/*', route => route.request().method() === 'GET' ? route.continue() : route.abort());
    await page.emulateMedia({ reducedMotion: mobile ? 'reduce' : 'no-preference' });
    await page.goto(base + '/public/analise-multicriterio/formulario-comparacao-pareada/');
    await page.locator('#colab-nome').fill('Teste de ajuda');
    await page.locator('#colab-inst').fill('SICARD');
    await page.locator('#colab-email').fill('teste@example.invalid');
    await page.locator('#btn-liberar-form').click();
    const scales = page.locator('.saaty-scale');
    await scales.first().waitFor();
    await page.clock.install();
    await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 300);
    const count = await scales.count();
    assert.equal(count, 21);
    for (let i = 0; i < count; i++) await scales.nth(i).press(i % 2 ? 'End' : 'Home');
    await page.clock.runFor(3000);

    await page.locator('#collab-tab-matrix').click();
    await page.locator('#collab-consistency-help-button').click();
    const panel = page.locator('.ahp-coerencia-modal');
    const item = panel.locator('.collab-consistency-review-item').first();
    const status = item.getByRole('status', { includeHidden: true });
    const link = item.getByRole('link');
    const current = item.getByRole('textbox', { name: 'Valor atual:', includeHidden: true });
    const suggested = item.getByRole('textbox', { name: 'Valor sugerido:' });
    const target = await suggested.inputValue();
    const index = steps.indexOf(target.split(' ')[0]);
    assert.ok(index >= 0, 'A sugestão existe na escala');
    const pair = page.locator(await link.getAttribute('href'));
    const scale = pair.locator('.saaty-scale');
    await link.click();
    assert.equal(await page.locator('#collab-tab-form').getAttribute('aria-selected'), 'true');
    assert.equal(await scale.evaluate(el => document.activeElement === el), true);
    assert.equal(await page.locator('.saaty-pair.is-consistency-review').count(), 1);
    assert.equal(await pair.evaluate(el => getComputedStyle(el).animationName), mobile ? 'none' : 'collab-consistency-pulse');

    async function selectStep(step) {
      const rail = await scale.locator('.saaty-rail').boundingBox();
      const x = rail.x + Math.max(2, Math.min(rail.width - 2, rail.width * step / (steps.length - 1)));
      const y = rail.y + rail.height / 2;
      assert.equal(await scale.evaluate((el, point) => el.contains(document.elementFromPoint(...point)), [x, y]), true,
        'A ajuda deixa a régua disponível para mouse e toque');
      if (mobile) await page.touchscreen.tap(x, y);
      else await page.mouse.click(x, y);
    }

    await selectStep((index + 1) % steps.length);
    await page.clock.runFor(3000);
    assert.match(await status.textContent(), /difere da sugestão/);
    assert.equal(await item.evaluate(el => el.classList.contains('is-review-confirmed')), false);
    assert.equal(await pair.evaluate(el => el.classList.contains('is-consistency-review')), true);

    await selectStep(index);
    assert.equal(await current.inputValue(), target);
    assert.match(await status.textContent(), /Aguardando confirmação/);
    await page.clock.runFor(2999);
    assert.equal(await pair.evaluate(el => el.classList.contains('is-consistency-review')), true);
    assert.equal(await item.evaluate(el => el.classList.contains('is-review-confirmed')), false);
    await page.clock.runFor(1);
    assert.equal(await pair.evaluate(el => el.classList.contains('is-auto-validated')), true);
    assert.equal(await page.locator('.saaty-pair.is-consistency-review').count(), 0);
    assert.equal(await status.innerText(), 'Valor sugerido confirmado.');
    assert.equal(await item.evaluate(el => el.classList.contains('is-review-confirmed')), true);
    assert.equal(await status.evaluate(el => getComputedStyle(el).backgroundColor),
      await pair.evaluate(el => getComputedStyle(el).backgroundColor));

    await scale.press(index === 0 ? 'ArrowRight' : 'ArrowLeft');
    assert.equal(await item.evaluate(el => el.classList.contains('is-review-confirmed')), false);
    await link.click();
    await page.locator('#collab-consistency-modal-close').click();
    assert.equal(await panel.isVisible(), false);
    assert.equal(await page.locator('.saaty-pair.is-consistency-review').count(), 0);
    assert.deepEqual(errors, []);
    console.log(`PASS ${width}px: régua acessível, confirmação sincronizada, destaque removido e preferência de movimento respeitada.`);
  } finally {
    await page.close();
  }
}

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    for (const width of [1280, 390]) await exerciseReview(browser, width);
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
