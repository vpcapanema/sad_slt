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
    assert.match(await page.locator('#collab-consistency-modal-summary').textContent(), /6 de 10 pares \(60%\).*não altera/);
    assert.ok(await page.locator('#collab-consistency-pairs li a').count() > 0);
    assert.match(await page.locator('#collab-consistency-why').textContent(), /^Suas respostas indicam a seguinte linha de raciocínio:/);
    assert.match(await page.locator('#collab-consistency-why').textContent(), /Portanto, seria lógico esperar que/);
    assert.match(await page.locator('#collab-consistency-why').textContent(), /você indicou o contrário/);
    assert.doesNotMatch(await page.locator('#collab-consistency-why').textContent(), /Critério de referência/);
    assert.doesNotMatch(await page.locator('#collab-consistency-why').textContent(), /relação próxima de \d+/);
    assert.match(await page.locator('#collab-consistency-tip').textContent(), /Pense novamente na ordem desses três critérios/i);
    assert.equal(await page.evaluate(() => JSON.stringify(buildLiveMatrix())), before);
    await page.locator('#collab-consistency-pairs li a').first().click();
    assert.equal(await page.evaluate(() => document.activeElement.classList.contains('saaty-scale')), true);
    assert.equal(await page.evaluate(() => JSON.stringify(buildLiveMatrix())), before);
    await help.click();
    await page.keyboard.press('Escape');
    assert.equal(await modal.isVisible(), false, 'Escape closes help');
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
