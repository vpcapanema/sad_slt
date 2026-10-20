const {chromium} = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({channel: 'msedge', headless: true});
  try {
    const page = await browser.newPage({viewport: {width: 1280, height: 900}, timezoneId: 'UTC'});
    const reference = await browser.newPage({viewport: {width: 1280, height: 900}});
    await reference.route('**/api/**', route => {
      const path = new URL(route.request().url()).pathname;
      return route.fulfill({json: path.endsWith('/auth/me') ? {id: 'u', tipo_usuario: 'ANALISTA'} :
        path.endsWith('/auth/session') ? {authenticated: true, user: {id: 'u', tipo_usuario: 'ANALISTA'}} : []});
    });
    await reference.goto('http://127.0.0.1:8083/restrict/hierarquizacao/fase-3/');
    const referenceStyles = await reference.evaluate(() => {
      const style = selector => getComputedStyle(document.querySelector(selector));
      return {
        title: style('.ahp-section-label span:last-child').fontSize,
        label: style('.fase-grid-2 label').fontSize,
        help: style('.ahp-help-text').fontSize,
        bodyGap: style('.ahp-section-body').gap,
        fieldGap: style('.fase-grid-2').gap,
        cardPadding: style('.ahp-step-section').padding,
        cardMargin: style('.ahp-step-section').marginBottom,
        zoom: getComputedStyle(document.body).zoom,
      };
    });
    await reference.close();
    const errors = [], saves = [];
    let criteria = ['Custo', 'Prazo', 'Benefício'], starts = 0, failSend = false;
    let deadline = '2026-10-27T02:59:59+00:00';
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => localStorage.setItem('ahp_criteria', '["Critério de outro julgamento","Outro"]'));
    await page.route('**/api/**', async route => {
      const req = route.request(), path = new URL(req.url()).pathname;
      if (!path.includes('/publico/')) return route.fulfill({json: []});
      const meta = {token: 'feedback', escopo: '<b>Texto literal</b>',
        objetivo: 'Hierarquizar os projetos quanto à favorabilidade à sua implantação ou execução, com base nos critérios definidos para esta análise, para subsidiar a definição de prioridades.',
        criterios: criteria, status: 'ativa', valido_ate: deadline, email_autorizado: true};
      if (req.method() === 'GET' || path.endsWith('/acesso')) return route.fulfill({json: meta});
      if (path.endsWith('/respostas/iniciar')) starts++;
      if (path.endsWith('/respostas/progresso')) saves.push(req.postDataJSON());
      if (path.endsWith('/respostas') && failSend) return route.fulfill({status: 503, json: {detail: 'Falha de teste'}});
      return route.fulfill({json: {status: path.endsWith('/respostas') ? 'enviada' : 'em_preenchimento',
        matriz_comparacao: [[1, 1, 1], [1, 1, 1], [1, 1, 1]],
        estatisticas: {duracao_ms: 40000, revisoes_por_par: {'0_1': 7}}}});
    });
    async function identify() {
      await page.locator('#colab-nome').fill('Ana');
      await page.locator('#colab-inst').fill('Instituição');
      await page.locator('#colab-email').fill('ana@example.com');
      await page.locator('#colab-token').fill('012345');
      await page.locator('#btn-liberar-form').click();
    }
    await page.goto('http://127.0.0.1:8083/public/analise-multicriterio/feedback/');
    await page.getByText('Prazo: 26/10/2026, 23:59:59', {exact: true}).waitFor();
    assert.equal(await page.getByText('Status da rodada de julgamento: ativa', {exact: true}).count(), 1);
    assert.match(await page.locator('#collab-context').innerText(), /Objetivo: Hierarquizar os projetos quanto à favorabilidade/);
    const publicStyles = await page.evaluate(() => {
      const style = selector => getComputedStyle(document.querySelector(selector));
      return {
        title: style('.ahp-section-label span:last-child').fontSize,
        label: style('.c-form-label').fontSize,
        help: style('.form-help').fontSize,
        bodyGap: style('.ahp-section-body').gap,
        fieldGap: style('.collab-identificacao-grid').gap,
        cardPadding: style('.ahp-step-section').padding,
        cardMargin: style('.ahp-step-section').marginBottom,
        zoom: getComputedStyle(document.body).zoom,
      };
    });
    assert.deepEqual(publicStyles, referenceStyles, 'Escala e espaçamento seguem a Fase 3');
    assert.deepEqual(await page.locator('#collab-context p').evaluateAll(elements => elements.map(el => ({
      font: getComputedStyle(el).fontSize, margin: getComputedStyle(el).margin,
    }))), Array(4).fill({font: '12px', margin: '0px'}));
    assert.equal(await page.locator('#colab-id-feedback').isVisible(), false);
    assert.equal(await page.locator('.card-collab-context .step-intro').evaluate(el =>
      getComputedStyle(el).fontSize), referenceStyles.help);
    assert.equal(await page.locator('.card-collab-context .ahp-section-body').evaluate(el =>
      el.firstElementChild.id), 'collab-context');
    for (const selector of ['.card-collab-context', '.card-colab-nome']) {
      const geometry = await page.locator(`${selector} .ahp-section-body`).evaluate(el => {
        const children = [...el.children].filter(child => child.getBoundingClientRect().height);
        return children.slice(1).map((child, index) =>
          child.getBoundingClientRect().top - children[index].getBoundingClientRect().bottom);
      });
      for (const gap of geometry) assert.ok(Math.abs(gap - 20 * Number(referenceStyles.zoom)) < 1);
    }
    async function checkIdentificationGrid(width) {
      const boxes = await Promise.all(['nome', 'inst', 'email', 'token'].map(
        id => page.locator(`#colab-${id}`).boundingBox()));
      if (width > 600) {
        assert.equal(boxes[0].y, boxes[1].y);
        assert.equal(boxes[2].y, boxes[3].y);
        assert.equal(boxes[0].x, boxes[2].x);
        assert.equal(boxes[1].x, boxes[3].x);
        assert.ok(boxes[1].x >= boxes[0].x + boxes[0].width);
        assert.ok(boxes[2].y > boxes[0].y);
      } else {
        for (let i = 1; i < boxes.length; i++) {
          assert.equal(boxes[i].x, boxes[0].x);
          assert.ok(boxes[i].y > boxes[i - 1].y);
        }
      }
    }
    await checkIdentificationGrid(1280);
    await identify();
    await page.locator('#collab-form-section').waitFor({state: 'visible'});
    assert.equal(await page.locator('#collab-context b').count(), 0);
    await page.waitForResponse(r => r.url().endsWith('/respostas/progresso'));
    assert.equal(saves[0].estatisticas.revisoes_por_par['0_1'], 7);
    assert.ok(saves[0].estatisticas.duracao_ms >= 40000);
    await page.clock.install();
    await page.clock.pauseAt(new Date());
    const pair = page.locator('.saaty-pair').first(), scale = pair.locator('.saaty-scale');
    const rc = page.locator('#metricRCValue').locator('..');
    assert.equal(await rc.evaluate(el => el.classList.contains('is-success') || el.classList.contains('is-failure')), false);
    const inverseColor = await pair.locator('.saaty-reciprocal').evaluate(el => getComputedStyle(el).borderColor);
    await scale.press('ArrowRight');
    assert.match(await scale.getAttribute('aria-valuetext'), /\(3\)/);
    assert.match(await page.locator('#collab-save-feedback').innerText(), /aguardando/);
    assert.equal(await pair.evaluate(el => el.classList.contains('is-auto-validated')), false);
    await page.clock.runFor(2999);
    assert.equal(await pair.evaluate(el => el.classList.contains('is-auto-validated')), false);
    await page.clock.runFor(1);
    assert.equal(await pair.evaluate(el => el.classList.contains('is-auto-validated')), true);
    assert.notEqual(await pair.locator('.saaty-reciprocal').evaluate(el => getComputedStyle(el).borderColor), inverseColor);
    await scale.press('ArrowLeft');
    await page.clock.runFor(2000);
    await scale.press('ArrowRight');
    await page.clock.runFor(2999);
    assert.equal(await pair.evaluate(el => el.classList.contains('is-auto-validated')), false);
    await page.clock.runFor(1);
    assert.equal(await pair.evaluate(el => el.classList.contains('is-auto-validated')), true);
    assert.equal(await page.locator('.saaty-pair.is-auto-validated').count(), 1);
    // Real matrix [3,5,3] is consistent but nonzero; [9,1/9,9] is inconsistent.
    async function setScale(index, steps) {
      const slider = page.locator('.saaty-scale').nth(index);
      await slider.press('Home');
      for (let i = 0; i < steps; i++) await slider.press('ArrowRight');
    }
    await setScale(0, 5); await setScale(1, 6); await setScale(2, 5);
    assert.equal(await rc.evaluate(el => el.classList.contains('is-success')), true);
    const okColor = await rc.evaluate(el => getComputedStyle(el).color);
    await setScale(0, 8); await setScale(1, 0); await setScale(2, 8);
    assert.equal(await rc.evaluate(el => el.classList.contains('is-failure')), true);
    assert.notEqual(await rc.evaluate(el => getComputedStyle(el).color), okColor);
    assert.equal(await page.locator('#btn-enviar-resposta').isDisabled(), true);
    // Exact boundary and zero are checked separately from the real engine cases above.
    await page.evaluate(() => {window.originalAnalyze = SLTAhp.analyzeMatrix; SLTAhp.analyzeMatrix = m => ({...originalAnalyze(m), CR: 0.1}); updateLiveMetrics();});
    assert.equal(await rc.evaluate(el => el.classList.contains('is-failure')), true);
    await page.evaluate(() => {SLTAhp.analyzeMatrix = m => ({...originalAnalyze(m), CR: 0}); updateLiveMetrics();});
    assert.equal(await rc.evaluate(el => el.classList.contains('is-success') || el.classList.contains('is-failure')), false);
    await page.evaluate(() => {SLTAhp.analyzeMatrix = originalAnalyze;});
    await setScale(0, 4); await setScale(1, 4); await setScale(2, 4);
    // Mouse and touch use the same inactivity clock and preserve the reciprocal.
    const rail = await pair.locator('.saaty-rail').boundingBox();
    await page.mouse.click(rail.x + rail.width * 0.5, rail.y + rail.height / 2);
    await page.clock.runFor(3000);
    assert.equal(await pair.evaluate(el => el.classList.contains('is-auto-validated')), true);
    await scale.dispatchEvent('touchstart', {touches: [{identifier: 1, clientX: rail.x + rail.width * 0.5, clientY: rail.y + rail.height / 2}]});
    assert.equal(await pair.evaluate(el => el.classList.contains('is-auto-validated')), false);
    await scale.dispatchEvent('touchend');
    await page.clock.runFor(3000);
    assert.equal(await pair.evaluate(el => el.classList.contains('is-auto-validated')), true);
    assert.doesNotMatch(await page.locator('main').innerText(), /Ã[§£ª¡©³µ]|Â[\u00a0-\u00bf]|�/);
    for (const width of [320, 390, 768, 1024, 1280]) {
      await page.setViewportSize({width, height: 900});
      await checkIdentificationGrid(width);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `Overflow em ${width}px`);
    }
    failSend = true;
    await page.locator('#btn-enviar-resposta').click();
    await page.getByText('Falha de teste', {exact: true}).waitFor();
    assert.equal(await page.locator('#comparisonContent').evaluate(el => el.inert), false);
    failSend = false;
    await page.locator('#btn-enviar-resposta').click();
    await page.getByText('Resposta enviada com sucesso. Obrigado!', {exact: true}).waitFor();
    assert.equal(await page.locator('#comparisonContent').evaluate(el => el.inert), true);
    assert.deepEqual(errors, []);
    // Empty authorized criteria must not resurrect another local judgment.
    criteria = [];
    await page.reload();
    await identify();
    await page.getByText('Este julgamento não possui critérios suficientes. Solicite a revisão ao responsável.', {exact: true}).waitFor();
    assert.equal(await page.locator('#collab-form-section').isVisible(), false);
    assert.equal(starts, 1);
    for (const [value, expected] of [
      ['2026-10-27T03:00:00+00:00', '27/10/2026, 00:00:00'],
      ['', 'Não informado'],
      ['invalida', 'Data inválida — solicite a revisão ao responsável.'],
    ]) {
      deadline = value;
      await page.reload();
      await page.getByText(`Prazo: ${expected}`, {exact: true}).waitFor();
    }
    console.log('PASS: contexto visível, escala/espaçamento iguais à Fase 3, layout responsivo, 2999/3000ms, RC, retomada e envio.');
    await page.close();
  } finally { await browser.close(); }
})().catch(error => {console.error(error); process.exitCode = 1;});
