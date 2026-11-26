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

    await page.setViewportSize({width: 320, height: 800});
    await page.goto(base + '/public/analise-multicriterio/formulario-comparacao-pareada/');
    await page.evaluate(() => {
      criteria = ['Critério ambiental com nome extenso', 'Critério social com nome extenso'];
      generatePairwiseFormStep4();
      document.getElementById('collab-form-section').classList.remove('is-hidden');
    });
    const mobile = await page.locator('.saaty-widget').first().evaluate(widget => {
      const scale = widget.querySelector('.saaty-scale').getBoundingClientRect();
      const card = widget.closest('.saaty-pair').getBoundingClientRect();
      const ticks = [...widget.querySelectorAll('.saaty-tick')].map(tick => tick.getBoundingClientRect());
      const labels = [...widget.querySelectorAll('.saaty-tick-desc')].map(label => label.getBoundingClientRect());
      return {
        scaleLeft: scale.left, scaleRight: scale.right, cardLeft: card.left, cardRight: card.right,
        overflow: widget.scrollWidth - widget.clientWidth,
        firstLeft: ticks[0].left, lastRight: ticks[ticks.length - 1].right,
        fit: getComputedStyle(widget).getPropertyValue('--saaty-fit').trim(),
        labelFont: parseFloat(getComputedStyle(widget.querySelector('.saaty-tick-desc')).fontSize),
        handleWidth: widget.querySelector('.saaty-handle').getBoundingClientRect().width,
        tickColor: getComputedStyle(widget.querySelector('.saaty-tick-mark')).backgroundColor,
        tickLayer: Number(getComputedStyle(widget.querySelector('.saaty-tick')).zIndex),
        arrowLayer: Number(getComputedStyle(widget.querySelector('.saaty-arrow')).zIndex),
        firstLabel: labels[0], secondLabel: labels[1], penultimateLabel: labels[labels.length - 2], lastLabel: labels[labels.length - 1],
      };
    });
    assert.ok(mobile.scaleLeft >= mobile.cardLeft && mobile.scaleRight <= mobile.cardRight,
      'A escala inteira deve caber dentro do card mobile');
    assert.ok(mobile.firstLeft >= mobile.cardLeft && mobile.lastRight <= mobile.cardRight,
      'As duas extremidades da escala devem permanecer visíveis');
    assert.ok(mobile.overflow <= 1, 'A régua mobile não deve exigir rolagem horizontal');
    assert.ok(Number(mobile.fit) < 1, 'O JavaScript deve reduzir proporcionalmente a régua no mobile');
    const textAlignment = await page.locator('.collab-guia-resumo').evaluate(element => getComputedStyle(element).textAlign);
    assert.equal(textAlignment, 'justify', 'Parágrafos de texto corrido devem permanecer justificados no mobile');
    const participationSteps = await page.locator('.secao-collab-scope-steps li').evaluateAll(elements =>
      elements.map(element => getComputedStyle(element).textAlign));
    assert.equal(participationSteps.length, 3, 'O passo a passo deve ter identificação, comparação e envio');
    assert.ok(participationSteps.every(alignment => alignment === 'justify'),
      'Os textos do passo a passo devem ficar justificados');
    const guideCards = await page.locator('.collab-guia-passos li').evaluateAll(cards => cards.map(card => {
      const header = card.querySelector('.collab-guia-passo-cabecalho');
      const number = card.querySelector('.collab-guia-passo-num').getBoundingClientRect();
      const title = header.querySelector('strong').getBoundingClientRect();
      const text = card.querySelector('p').getBoundingClientRect();
      const style = getComputedStyle(card);
      return {
        centerDifference: Math.abs((number.top + number.height / 2) - (title.top + title.height / 2)),
        textAlignment: getComputedStyle(card.querySelector('p')).textAlign,
        rightGap: card.getBoundingClientRect().right - text.right - parseFloat(style.paddingRight),
      };
    }));
    assert.ok(guideCards.every(card => card.centerDifference < 1),
      'A bolinha deve ficar centralizada verticalmente em relação ao título do card');
    assert.ok(guideCards.every(card => card.textAlignment === 'justify' && Math.abs(card.rightGap) < 2),
      'O texto explicativo deve ser justificado e ocupar toda a largura útil do card');
    const tabIntroSpacing = await page.locator('#collab-panel-form > .collab-pairwise-intro').evaluate(element => {
      const style = getComputedStyle(element);
      return {top: parseFloat(style.marginTop), bottom: parseFloat(style.marginBottom)};
    });
    assert.ok(tabIntroSpacing.top >= tabIntroSpacing.bottom,
      'O texto abaixo das abas deve ter folga superior igual ou maior que a inferior');
    assert.match(await page.locator('#collab-panel-form > .ami-section-intro').textContent(), /uma escolha em cada cartão/i,
      'A abertura da aba formulário deve indicar uma escolha por cartão');
    await page.locator('#collab-tab-matrix').click();
    assert.equal(await page.locator('#collab-form-legend').isVisible(), false,
      'A orientação do formulário não deve aparecer na aba matriz');
    assert.equal(await page.locator('#collab-matrix-title').isVisible(), true);
    assert.equal(await page.locator('#collab-matrix-title').evaluate(element => getComputedStyle(element).textAlign), 'left');
    assert.equal(await page.locator('#collab-matrix-wrap caption').count(), 0,
      'O título da matriz não deve permanecer dentro do contêiner da tabela');
    assert.deepEqual(await page.locator('#collab-matrix-title').evaluate(element => {
      const intro = element.nextElementSibling;
      const nota = intro.nextElementSibling;
      return [intro.matches('p.ami-section-intro'), nota.id, nota.nextElementSibling.id];
    }), [true, 'collab-matrix-legend', 'collab-matrix-wrap'],
      'Título, abertura e nota devem ficar acima e fora do contêiner da matriz');
    await page.locator('#collab-tab-form').click();
    assert.ok(mobile.labelFont < 8.96 && mobile.handleWidth < 22,
      'Textos e seletor devem acompanhar proporcionalmente a largura mobile');
    assert.equal(mobile.tickColor, 'rgb(0, 0, 0)', 'Os tiques da régua devem ser pretos');
    assert.ok(mobile.tickLayer < mobile.arrowLayer, 'Os tiques devem ficar atrás da barra colorida');
    assert.ok(mobile.firstLabel.height < mobile.firstLabel.width && mobile.lastLabel.height < mobile.lastLabel.width,
      'Os dois rótulos Extremamente devem permanecer horizontais');
    const overlaps = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
    assert.ok(!overlaps(mobile.firstLabel, mobile.secondLabel) && !overlaps(mobile.penultimateLabel, mobile.lastLabel),
      'Os rótulos Extremamente não devem se sobrepor aos vizinhos');
    console.log('PASS mobile 320px: régua completa, extremos visíveis e sem rolagem horizontal.');

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
