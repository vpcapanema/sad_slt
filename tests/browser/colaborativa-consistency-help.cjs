const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const BASE = process.env.SICARD_BROWSER_BASE_URL || 'http://127.0.0.1:8083';

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.stack || error.message));
    const names = ['Custo', 'Prazo', 'Benefício', 'Acesso', 'Segurança'];
    const initial = names.map((_, i) => names.map((_, j) => i === j ? 1 : 1));
    await page.route('**/api/**', route => {
      const path = new URL(route.request().url()).pathname;
      if (!path.includes('/publico/')) return route.fulfill({ json: [] });
      if (route.request().method() === 'GET' || path.endsWith('/acesso')) {
        return route.fulfill({ json: { token: 'help', criterios: names, status: 'ativa',
          escopo: 'Teste de consistência', email_autorizado: true } });
      }
      return route.fulfill({ json: { status: 'em_preenchimento',
        matriz_comparacao: initial, estatisticas: {} } });
    });
    await page.goto(BASE + '/public/analise-multicriterio/formulario-comparacao-pareada/help/');
    await page.locator('#colab-nome').fill('Ana');
    await page.locator('#colab-inst').fill('Instituição');
    await page.locator('#colab-email').fill('ana@example.com');
    await page.locator('#colab-token').fill('0123456789012345678901234567890123456789012');
    await page.locator('#btn-liberar-form').click();
    await page.locator('#collab-form-section').waitFor({ state: 'visible' });
    const icons = {
      'D1 · Eficiência logística': 'fa-truck-fast',
      'Técnica e logística': 'fa-truck-fast',
      'SEG · Segurança viária': 'fa-shield-halved',
      'Emissões de GEE evitadas': 'fa-earth-americas',
      'Sensibilidade socioambiental': 'fa-leaf',
      'Risco de entrega': 'fa-triangle-exclamation',
      'Risco de demanda e benefício': 'fa-triangle-exclamation',
      'Governança e aderência a planos': 'fa-building-columns',
      'Maturidade do projeto': 'fa-clipboard-check',
      'Prontidão': 'fa-clipboard-check',
      'Prazo': 'fa-clock',
      'Participação não estatal no CAPEX': 'fa-coins',
      'Esforço fiscal e alavancagem': 'fa-coins',
      'Impacto nas cadeias produtivas': 'fa-chart-line',
      'Acesso a serviços essenciais': 'fa-universal-access',
      'Equidade social': 'fa-people-group',
      'Localização territorial': 'fa-map-location-dot',
      'Travessias urbanas': 'fa-road',
      'Saúde': 'fa-heart-pulse',
      'Educação': 'fa-graduation-cap',
      'Energia elétrica': 'fa-bolt',
      'Recursos hídricos': 'fa-droplet',
      'Engenharia': 'fa-gears',
      'Qualidade': 'fa-gauge-high',
      'Critério sem associação conhecida': 'fa-list-check',
    };
    for (const [name, icon] of Object.entries(icons)) {
      assert.equal(await page.evaluate(name => criterionIcon(name), name), icon, name);
    }
    const labels = page.locator('#comparisonContent .saaty-crit__name');
    assert.equal(await labels.count(), 20);
    for (const label of await labels.all()) {
      assert.equal(await label.locator('.saaty-crit__icon[aria-hidden=true]').count(), 1);
      assert.equal(await label.locator('.saaty-crit__icon').evaluate(el => getComputedStyle(el, '::before').content !== 'none'), true, 'Ícone disponível na fonte local');
    }
    assert.deepEqual(await labels.allTextContents(), names.flatMap((name, i) => names.slice(i + 1).flatMap(other => [name, other])));
    assert.equal(await page.evaluate(() => {
      const el = document.createElement('div');
      el.innerHTML = criterionLabelHtml('<img src=x onerror=alert(1)>');
      return el.querySelector('img') === null && el.textContent === '<img src=x onerror=alert(1)>';
    }), true, 'Nome continua escapado e não injeta HTML');
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await labels.evaluateAll(elements => elements.every(el => el.scrollWidth <= el.clientWidth + 1)), true, 'Ícones não cortam os nomes em tela estreita');
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.clock.install();
    const help = page.locator('#collab-consistency-help-button');
    const modal = page.locator('#collab-consistency-modal');
    const scales = page.locator('#comparisonContent .saaty-scale');
    assert.equal(await help.isVisible(), false, 'Initial equality is not an answer');
    for (let i = 0; i < 5; i++) await scales.nth(i).press(i === 0 ? 'ArrowLeft' : (i === 3 ? 'Home' : 'ArrowRight'));
    await page.clock.runFor(1100);
    assert.equal(await help.isVisible(), false, 'Below 60% must not display help');
    await scales.nth(5).press('ArrowLeft');
    await page.clock.runFor(1100);
    assert.equal(await help.isVisible(), true);
    assert.equal(await help.getAttribute('title'), 'Pedir ajuda ao sistema');
    assert.equal(await help.locator('i.fa-circle-question').count(), 1);
    const before = await page.evaluate(() => JSON.stringify(buildLiveMatrix()));
    await help.click();
    assert.equal(await modal.isVisible(), true);
    const panel = modal.locator('.ahp-coerencia-modal');
    assert.equal(await panel.getAttribute('aria-modal'), null, 'A ajuda é uma janela não modal');
    assert.deepEqual(await page.evaluate(() => ({
      overlayPointerEvents: getComputedStyle(document.querySelector('#collab-consistency-modal')).pointerEvents,
      panelPointerEvents: getComputedStyle(document.querySelector('#collab-consistency-modal .ahp-coerencia-modal')).pointerEvents,
      overlayBackground: getComputedStyle(document.querySelector('#collab-consistency-modal')).backgroundColor,
      pageOverflow: getComputedStyle(document.documentElement).overflow,
    })), {
      overlayPointerEvents: 'none',
      panelPointerEvents: 'auto',
      overlayBackground: 'rgba(0, 0, 0, 0)',
      pageOverflow: 'visible',
    }, 'A janela não bloqueia nem escurece a página');
    assert.equal(await page.locator('.collab-consistency-window-controls button').count(), 3);
    assert.match(await page.locator('#collab-consistency-modal-summary').textContent(), /6 de 10 pares \(60%\).*não altera/);
    assert.ok(await page.locator('#collab-consistency-pairs li a').count() > 0);
    const firstReview = page.locator('#collab-consistency-pairs li').first();
    assert.equal(await firstReview.evaluate(element => getComputedStyle(element).display), 'list-item',
      'A lista mantém a numeração visível');
    assert.equal(await firstReview.locator('.collab-consistency-review-field').count(), 3);
    assert.equal(await firstReview.locator('.collab-consistency-review-field strong').count(), 3);
    assert.equal(await firstReview.locator('input[readonly]').count(), 3);
    assert.deepEqual(await firstReview.locator('.collab-consistency-review-field strong').allTextContents(), [
      'Valor atual:',
      'Valor sugerido:',
      'RC projetada após alterar somente este par:',
    ]);
    assert.equal(await firstReview.locator('input').evaluateAll(inputs => inputs.every(input => input.value.length > 0)), true);
    const liveDiagnosis = await page.evaluate(() => {
      const matrix = buildLiveMatrix();
      const href = document.querySelector('#collab-consistency-pairs li a').getAttribute('href');
      const [, first, second] = href.match(/collab-review-(\d+)-(\d+)/).map(Number);
      return {
        rc: SLTAhp.formatMetric(SLTAhp.analyzeMatrix(matrix).CR),
        current: matrix[first][second] < 1 ? '1/' + Math.round(1 / matrix[first][second]) :
          Math.abs(matrix[first][second] - 1) < 1e-8 ? '1 (igual importância)' : String(Math.round(matrix[first][second]))
      };
    });
    assert.match(await page.locator('#collab-consistency-modal-summary').textContent(), new RegExp(liveDiagnosis.rc));
    assert.equal(await firstReview.locator('input').first().inputValue(), liveDiagnosis.current,
      'O valor atual e a RC são recalculados da matriz completa no clique');
    assert.match(await firstReview.locator('.collab-consistency-review-status').textContent(),
      /O valor sugerido é o ajuste isolado que mais reduz a RC.*limite aceitável de 0,10/s);
    assert.match(await page.locator('#collab-consistency-why').textContent(), /^Suas respostas indicam a seguinte linha de raciocínio:/);
    assert.ok(await page.locator('#collab-consistency-why .collab-consistency-narrative__steps li').count() >= 3,
      'Lists every pair involved, not a fixed two-item example');
    assert.match(await page.locator('#collab-consistency-why').textContent(), /seria lógico esperar que/i);
    assert.match(await page.locator('#collab-consistency-why').textContent(), /pouco|médio|bastante|extremamente|igual importância/i);
    assert.ok(await page.locator('#collab-consistency-why .collab-consistency-narrative__contrast').count() >= 1);
    assert.ok(await page.locator('#collab-consistency-why .collab-consistency-narrative__contrast').first().locator('strong').count() >= 5,
      'Criterion names are bold inside the white explanation box');
    assert.equal(await page.locator('#collab-consistency-why .collab-consistency-narrative__contrast').first().locator('.collab-consistency-narrative__line').count(), 2,
      'Each new argument starts in its own text block');
    assert.doesNotMatch(await page.locator('#collab-consistency-why').textContent(), /Critério de referência/);
    assert.doesNotMatch(await page.locator('#collab-consistency-why').textContent(), /relação próxima de \d+/);
    assert.match(await page.locator('#collab-consistency-tip').textContent(), /Pense novamente na ordem dos critérios destacados/i);
    const fontSizes = await page.evaluate(() => {
      const size = selector => parseFloat(getComputedStyle(document.querySelector(selector)).fontSize);
      return {
        title: size('#collab-consistency-modal-title'),
        section: size('#collab-consistency-why-title'),
        lead: size('.collab-consistency-narrative__intro'),
        step: size('.collab-consistency-narrative__steps li'),
        whiteBox: size('.collab-consistency-narrative__contrast'),
      };
    });
    assert.ok(fontSizes.title > fontSizes.section, 'Modal title is larger than section titles');
    assert.ok(fontSizes.section > fontSizes.lead, 'Section title is larger than its lead text');
    assert.ok(fontSizes.lead >= fontSizes.step, 'Lead text is not smaller than the reasoning items');
    assert.ok(fontSizes.step > fontSizes.whiteBox, 'White-box explanation is the smallest nested text level');
    assert.equal(await page.evaluate(() => JSON.stringify(buildLiveMatrix())), before);
    const dragHandle = page.locator('#collab-consistency-modal-drag-handle');
    const beforeDrag = await panel.boundingBox();
    await dragHandle.hover({ position: { x: 120, y: 20 } });
    await page.mouse.down();
    await page.mouse.move(beforeDrag.x + 220, beforeDrag.y + 20);
    await page.mouse.up();
    const afterDrag = await panel.boundingBox();
    assert.notEqual(Math.round(afterDrag.x), Math.round(beforeDrag.x), 'A janela pode ser arrastada pelo cabeçalho');
    const minimize = page.locator('#collab-consistency-modal-minimize');
    const maximize = page.locator('#collab-consistency-modal-maximize');
    await minimize.click();
    assert.equal(await panel.evaluate(element => element.classList.contains('is-minimized')), true);
    assert.equal(await page.locator('#collab-consistency-modal .ahp-coerencia-modal__body').isVisible(), false);
    assert.equal(await minimize.getAttribute('aria-label'), 'Restaurar ajuda');
    await minimize.click();
    assert.equal(await page.locator('#collab-consistency-modal .ahp-coerencia-modal__body').isVisible(), true);
    await maximize.click();
    assert.equal(await panel.evaluate(element => element.classList.contains('is-maximized')), true);
    assert.equal(await maximize.getAttribute('aria-label'), 'Restaurar ajuda');
    await maximize.click();
    assert.equal(await panel.evaluate(element => element.classList.contains('is-maximized')), false);
    await page.locator('#collab-consistency-pairs li a').first().click();
    await page.clock.runFor(1000);
    assert.equal(await modal.isVisible(), true, 'O link mantém a janela aberta');
    assert.equal(await page.locator('#collab-form-section .saaty-pair.is-consistency-review').count(), 1,
      'Somente o par selecionado recebe o destaque vermelho');
    assert.equal(await page.locator('#collab-form-section .saaty-pair.is-consistency-review').evaluate(element =>
      getComputedStyle(element).borderTopColor), 'rgb(185, 28, 28)', 'O par recebe borda vermelha');
    const reviewedPairBox = await page.locator('#collab-form-section .saaty-pair.is-consistency-review').boundingBox();
    const reviewedPairCenter = reviewedPairBox.y + reviewedPairBox.height / 2;
    assert.ok(Math.abs(reviewedPairCenter - 450) < 12,
      `O par selecionado é centralizado verticalmente na tela (${reviewedPairCenter})`);
    assert.equal(await page.evaluate(() => document.activeElement.classList.contains('saaty-scale')), true);
    assert.equal(await page.evaluate(() => JSON.stringify(buildLiveMatrix())), before);
    await page.keyboard.press('Escape');
    assert.equal(await modal.isVisible(), false, 'Escape closes help');
    assert.equal(await page.locator('#collab-form-section .saaty-pair.is-consistency-review').count(), 0,
      'Fechar a ajuda remove o destaque temporário');

    await help.click();
    const projections = modal.locator('.collab-consistency-review-field:last-child input');
    const originalProjections = await projections.evaluateAll(inputs => inputs.map(input => input.value));
    await page.locator('#collab-consistency-modal-close').click();
    assert.equal(await modal.isVisible(), false, 'O botão X fecha a ajuda');
    const browserTime = await page.evaluate(() => Date.now());
    await page.clock.pauseAt(browserTime + 1000);
    await scales.first().press('ArrowRight');
    const editedMatrix = await page.evaluate(() => buildLiveMatrix());
    const updatedDiagnosis = await page.evaluate(matrix => {
      const answered = new Set(['0_1', '0_2', '0_3', '0_4', '1_2', '1_3']);
      return {
        rc: SLTAhp.formatMetric(SLTAhp.analyzeMatrix(matrix).CR),
        projections: SLTAhp.consistencyReviews(matrix, answered).map(review => SLTAhp.formatMetric(review.projectedCR)),
      };
    }, editedMatrix);
    assert.notEqual(updatedDiagnosis.rc, liveDiagnosis.rc);
    assert.equal(await page.locator('#liveMetrics').getAttribute('aria-busy'), 'true');
    await help.click();
    assert.equal(await modal.isVisible(), true, 'A ajuda reabre antes do recálculo agendado dos indicadores');
    assert.ok((await page.locator('#collab-consistency-modal-summary').textContent()).includes(updatedDiagnosis.rc));
    assert.notDeepEqual(updatedDiagnosis.projections, originalProjections);
    assert.deepEqual(await projections.evaluateAll(inputs => inputs.map(input => input.value)), updatedDiagnosis.projections,
      'A reabertura substitui as projeções anteriores pelas da matriz atual');
    assert.deepEqual(await page.evaluate(() => buildLiveMatrix()), editedMatrix);
    await page.locator('#collab-consistency-modal-close').click();

    for (let i = 0; i < 10; i++) {
      await scales.nth(i).press('Home');
      for (let k = 0; k < 4; k++) await scales.nth(i).press('ArrowRight');
    }
    await page.clock.runFor(1100);
    assert.equal(await help.isVisible(), false, 'Hide after consistency is restored');
    assert.deepEqual(errors, []);
    console.log('PASS: ícones semânticos, tela estreita e ajuda de consistência em modal a partir de 60%, sem alterar respostas.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exit(1); });
