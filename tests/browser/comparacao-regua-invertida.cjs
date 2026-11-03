const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const expected = [9, 7, 5, 3, 1, 1 / 3, 1 / 5, 1 / 7, 1 / 9];
const labels = ['9', '7', '5', '3', '1', '1/3', '1/5', '1/7', '1/9'];
const base = process.env.SICARD_TEST_URL || 'http://127.0.0.1:8083';

async function checkColor(page) {
  await page.locator('.saaty-pair').first().evaluate(async pair => {
    await Promise.all([...pair.querySelectorAll('.saaty-handle, .saaty-tick-desc')].flatMap(element => {
      getComputedStyle(element).backgroundColor;
      return element.getAnimations().map(animation => animation.finished);
    }));
  });
  const actual = await page.locator('.saaty-pair').first().evaluate(pair => {
    const arrow = pair.querySelector('.saaty-arrow').getBoundingClientRect();
    const rail = pair.querySelector('.saaty-rail').getBoundingClientRect();
    const scale = pair.querySelector('.saaty-scale');
    return {
      fraction: 1 - (rail.left + rail.width * Number(scale.getAttribute('aria-valuenow')) / 8 - arrow.left) / arrow.width,
      color: getComputedStyle(pair.querySelector('.saaty-handle')).backgroundColor,
      border: getComputedStyle(pair.querySelector('.saaty-handle')).borderColor,
      index: Number(scale.getAttribute('aria-valuenow')),
      stripe: getComputedStyle(pair.querySelector('.saaty-handle'), '::after').backgroundColor,
      highlight: getComputedStyle(pair.querySelector('.saaty-tick.is-selected .saaty-tick-desc')).backgroundColor,
    };
  });
  const stops = [[0, [123, 26, 26]], [.18, [192, 57, 43]], [.4, [244, 167, 160]],
    [.5, [245, 245, 245]], [.6, [169, 205, 236]], [.82, [47, 111, 173]], [1, [13, 59, 102]]];
  const fraction = Math.max(0, Math.min(1, actual.fraction));
  const index = stops.findIndex(([position]) => position >= fraction);
  const [end, rgbEnd] = stops[index], [start, rgbStart] = stops[Math.max(0, index - 1)];
  const ratio = start === end ? 0 : (fraction - start) / (end - start);
  const rgb = rgbStart.map((channel, i) => Math.round(channel + (rgbEnd[i] - channel) * ratio));
  assert.equal(actual.color, `rgb(${rgb.join(', ')})`, 'Seletor usa a cor interpolada da régua na posição real');
  assert.equal(actual.border, actual.index === 4 ? 'rgb(0, 0, 0)' : 'rgb(255, 255, 255)',
    'Nível neutro tem borda preta; demais níveis mantêm a borda branca');
  if (actual.index === 4) assert.equal(actual.stripe, 'rgb(0, 0, 0)', 'Risquinho neutro preto');
  assert.equal(actual.highlight, actual.color, 'Nome da intensidade acompanha exatamente a cor do seletor e da régua');
}

(async () => {
  const browser = await chromium.launch({channel: 'msedge', headless: true});
  try {
    const page = await browser.newPage({ignoreHTTPSErrors: true});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/api/**', route => route.fulfill({json: {
      token: 'fixture', criterios: ['Custo', 'Prazo'], status: 'ativa',
      valido_ate: '2035-12-31', escopo: 'Teste', objetivo: 'Comparar critérios',
    }}));
    for (const suffix of ['fixture/', 'fixture/?simulacao=1', '']) {
      await page.goto(base + '/public/analise-multicriterio/formulario-comparacao-pareada/' + suffix);
      await page.evaluate(() => {
        criteria = ['Custo', 'Prazo'];
        generatePairwiseFormStep4();
        document.getElementById('collab-form-section').classList.remove('is-hidden');
      });
      assert.deepEqual(await page.locator('.saaty-tick-val').allTextContents(), labels);
      const scale = page.locator('.saaty-scale').first();
      await scale.focus();
      await scale.press('Home');
      for (let i = 0; i < expected.length; i++) {
        if (i) await scale.press('ArrowRight');
        const state = await page.evaluate(() => ({
          value: Number(document.getElementById('pair_0_1').value),
          matrix: buildLiveMatrix(), readout: document.querySelector('.saaty-readout').textContent,
          reciprocal: document.querySelector('.saaty-reciprocal__value').textContent,
          aria: document.querySelector('.saaty-scale').getAttribute('aria-valuetext'),
        }));
        assert.equal(state.value, expected[i]);
        assert.equal(state.matrix[0][1], expected[i]);
        assert.equal(state.matrix[1][0], 1 / expected[i]);
        assert.equal(state.reciprocal, labels[8 - i]);
        assert.equal(state.aria, state.readout);
        assert.match(state.readout, i === 4 ? /igual importância/ : i < 4 ? /mais importante/ : /menos importante/);
        await checkColor(page);
      }
      await scale.press('Home');
      assert.equal(await page.locator('#pair_0_1').inputValue(), '9');
      await scale.press('End');
      assert.equal(Number(await page.locator('#pair_0_1').inputValue()), 1 / 9);
      await page.evaluate(() => {
        document.getElementById('pair_0_1').value = '2.4';
        initSaatySliders();
      });
      assert.equal(await page.locator('#pair_0_1').inputValue(), '2.4', 'Reabertura não inverte nem arredonda matriz salva');
      assert.equal(await scale.getAttribute('aria-valuenow'), '3');
      await checkColor(page);
      assert.equal(await page.locator('.saaty-readout').first().evaluate(el => getComputedStyle(el).fontSize), '10.24px');
      console.log('PASS formulário ' + (suffix || 'modelo') + ': nove posições, cálculo, recíprocos e reabertura.');
    }

    const source = fs.readFileSync(path.join(__dirname, '..', '..', 'assets', 'js', 'paginas', 'analise-multicriterio-julgamentos.js'), 'utf8');
    const start = source.indexOf('  var FORM_SAATY_STEPS =');
    const end = source.indexOf('  function renderPairwise(', start);
    assert.ok(start >= 0 && end > start);
    await page.addScriptTag({content: `(function () {
      function escapeHtml(value) { const el = document.createElement('span'); el.textContent = value; return el.innerHTML; }
      function saatySimulationLabel(value) { return formatSaatyValue(value); }
      function pairwiseMatrix(judgment) { return judgment.matrix; }
      function markPairConfigured() {}
      function updateLiveMetrics() {}
      ${source.slice(start, end)}
      const judgment = {matrix: [[1, 1], [1, 1]]}, names = ['Custo', 'Prazo'];
      document.body.classList.remove('ami-public-page');
      document.body.classList.add('ami-page');
      document.getElementById('comparisonContent').id = 'ami-pairwise-panel';
      document.getElementById('ami-pairwise-panel').innerHTML = buildSaatyFormPair(0, 1, names, 1) + buildSaatyFormPair(1, 0, names, 1);
      document.querySelectorAll('.saaty-pair').forEach(pair => wireSaatyFormPair(pair, judgment, names));
      window.reguaTestMatrix = judgment.matrix;
    })();`});
    const simulator = page.locator('.saaty-scale').first();
    await simulator.focus();
    await simulator.press('Home');
    for (let i = 0; i < expected.length; i++) {
      if (i) await simulator.press('ArrowRight');
      const matrix = await page.evaluate(() => window.reguaTestMatrix);
      assert.equal(matrix[0][1], expected[i]);
      assert.equal(matrix[1][0], 1 / expected[i]);
      assert.equal(Number(await page.locator('[data-pair-row="1"]').inputValue()), 1 / expected[i]);
      assert.equal(await page.locator('.saaty-scale').nth(1).getAttribute('aria-valuenow'), String(8 - i));
      await checkColor(page);
    }
    assert.deepEqual(errors, []);
    console.log('PASS simulador: nove posições e card oposto sincronizado sem dupla inversão.');
  } finally {
    await browser.close();
  }
})().catch(error => {console.error(error); process.exitCode = 1;});
