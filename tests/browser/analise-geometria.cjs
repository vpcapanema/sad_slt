const { chromium } = require('playwright');
const fs = require('node:fs');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1100, height: 1000 } });
    const source = fs.readFileSync('admin/demanda.js', 'utf8');
    const section = source.slice(source.indexOf('  function criteriosSectionHtml'), source.indexOf('  function criterioRowHtml'));
    const actions = source.slice(source.indexOf('  const SITUACOES'), source.indexOf('  let tipo'));
    const criterion = source.slice(source.indexOf('  function criterioRowHtml'), source.indexOf('  function collectCriterios'));
    const geometry = source.slice(source.indexOf('  function collectAvaliacaoGeometria'), source.indexOf('  function renderHistoricoGeometria'));
    await page.route('http://sicard.test/**', async route => {
      const path = new URL(route.request().url()).pathname.slice(1);
      if (path.startsWith('assets/') && !path.includes('..') && fs.existsSync(path)) {
        await route.fulfill({ path });
      } else {
        await route.fulfill({ contentType: 'text/html', body: '<body class="admin-data-page admin-dashboard-page page-admin-demanda escala-revisada"><main></main></body>' });
      }
    });
    await page.goto('http://sicard.test/');
    for (const file of ['app.css', 'template-painel-mapa.css', 'admin-demanda-page.css', 'escala-tipografica.css']) {
      await page.addStyleTag({ url: `http://sicard.test/assets/css/${file}` });
    }
    await page.addScriptTag({ url: 'http://sicard.test/assets/js/status-colors.js' });
    await page.addScriptTag({ content: `
      const $ = s => document.querySelector(s);
      const record = {id: 'COD', status: 'analise_em_avaliacao'};
      const SLTAdminAuth = {can: () => true};
      const canApprove = () => true;
      const collectCriterios = () => ({criterio_competencia: true, criterio_nao_duplicidade: true});
      ${actions}
      let geometriaSaveTimer, geometriaSaveRevision = 0, geometriaSaveQueue = Promise.resolve();
      window.saved = [];
      const SLTAdminApi = {saveAnaliseAvaliacaoGeometria: async (id, payload) => {
        saved.push(payload); return {avaliacao_geometria: payload};
      }};
      const reportarErroAnalise = message => { throw new Error(message); };
      const escapeHtml = value => value;
      ${section}
      ${criterion}
      ${geometry}
      document.querySelector('main').innerHTML = analiseSectionHtml(record);
      $('#criterios-grid').innerHTML = criterioRowHtml({campo: 'clareza', rotulo: 'Clareza', pergunta: 'O objeto da demanda está claramente descrito?', resposta: true}, true);
      document.querySelector(".analise-geometria").hidden = false;
      document.querySelector(".analise-geometria").style.display = "";
      renderAvaliacaoGeometria({}, true);
    ` });
    const visible = selector => page.locator(selector).isVisible();
    assert.equal(await visible('#geometria-encaminhamento'), false);
    await page.locator('#geometria-criterios-grid').getByRole('radio', { name: 'Não', exact: true }).check();
    assert.equal(await visible('#geometria-encaminhamento'), true);
    assert.equal(await visible('#btn-geometria'), true);
    await page.locator('#geometria-encaminhamento').getByRole('button', { name: 'Solicitar complementação', exact: true }).click();
    assert.equal(await visible('#geometria-complementacao-tipo'), true);
    assert.equal(await page.locator('#solicitacao-tipo').inputValue(), 'geometria');
    assert.equal(await visible('#btn-geometria'), true);
    await page.evaluate(() => salvarGeometriaAntesDaAcao());
    assert.equal(await page.evaluate(() => saved.at(-1).encaminhamento), 'complementacao');
    await page.getByRole('button', { name: 'Enviar/substituir geometria', exact: true }).click();
    assert.equal(await visible('#btn-geometria'), true);
    assert.equal(await visible('#geometria-complementacao-tipo'), false);
    assert.equal(await page.locator('#sec-criterios #btn-geometria').count(), 1);
    const buttons = await page.locator('#sec-analise .btn').evaluateAll(elements => elements.filter(el => !el.hidden && el.getClientRects().length).map(el => {
      const css = getComputedStyle(el);
      return { height: el.getBoundingClientRect().height, font: css.fontSize, radius: css.borderRadius, padding: css.padding, lineHeight: css.lineHeight };
    }));
    for (const button of buttons) assert.deepEqual(button, buttons[0]);
    const alignment = await page.locator('.analise-geometria').evaluate(el => {
      const left = el.querySelector('#geometria-pergunta').getBoundingClientRect().left;
      return [...el.querySelectorAll('.btn')].filter(button => button.getClientRects().length).map(button => button.getBoundingClientRect().left - left);
    });
    assert.ok(Math.abs(alignment[0]) < 1);
    await page.screenshot({ path: 'outputs/analise-geometria-desktop.png', fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: 'outputs/analise-geometria-mobile.png', fullPage: true });
    const mobileRows = await page.locator('#geometria-encaminhamento .btn').evaluateAll(elements => elements.map(el => {
      const rect = el.getBoundingClientRect(); return {left: rect.left, width: rect.width};
    }));
    for (const button of mobileRows) assert.deepEqual(button, mobileRows[0]);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.locator('#geometria-criterios-grid').getByRole('radio', { name: 'Sim', exact: true }).check();
    assert.equal(await visible('#geometria-encaminhamento'), false);
    assert.equal(await visible('#btn-aprovar-geometria'), true);
    assert.equal(await visible('#geometria-confirmada'), false);
    await page.evaluate(() => salvarGeometriaAntesDaAcao());
    assert.equal(await page.evaluate(() => saved.at(-1).adequada), true);
    assert.equal(await page.evaluate(() => saved.at(-1).confirmada), false);
    assert.equal(await page.evaluate(() => saved.at(-1).encaminhamento), null);
    await page.getByRole('button', { name: 'Aprovar geometria', exact: true }).click();
    await page.locator('#geometria-confirmada').waitFor({ state: 'visible' });
    assert.equal(await page.evaluate(() => saved.at(-1).confirmada), true);
    assert.equal(await visible('#btn-aprovar-geometria'), false);
    await page.evaluate(() => renderAvaliacaoGeometria({avaliacao_geometria: saved.at(-1)}, true));
    assert.equal(await visible('#geometria-confirmada'), true);
    await page.locator('#geometria-criterios-grid').getByRole('radio', { name: 'Não', exact: true }).check();
    assert.equal(await visible('#geometria-confirmada'), false);
    assert.equal(await page.locator('[name="geometria-adequada"]:checked').count(), 1);
    await page.evaluate(() => renderAvaliacaoGeometria({avaliacao_geometria: {adequada: false, encaminhamento: 'substituicao'}}, false));
    assert.equal(await page.locator('#btn-geometria').isDisabled(), true);
    console.log('Geometria: alternativas, persistência antes da ação, upload condicional, consulta e largura móvel verificados.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
