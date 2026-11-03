const {chromium} = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({channel: 'msedge', headless: true});
  try {
    const page = await browser.newPage();
    const errors = [];
    let releaseSend, releaseProgress, holdProgress = true, failSend = true, sends = 0;
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/api/**', async route => {
      const path = new URL(route.request().url()).pathname;
      const send = data => route.fulfill({json: data});
      if (!path.includes('/publico/')) return send([]);
      if (route.request().method() === 'GET' || path.endsWith('/acesso')) return send({
        token: 'feedback', escopo: 'Teste de envio', criterios: ['Custo', 'Prazo', 'Benefício'],
        status: 'ativa', email_autorizado: true,
      });
      if (path.endsWith('/respostas/progresso') && holdProgress) {
        holdProgress = false;
        await new Promise(resolve => { releaseProgress = resolve; });
      }
      if (path.endsWith('/respostas')) {
        sends++;
        await new Promise(resolve => { releaseSend = resolve; });
        if (failSend) return route.fulfill({status: 503, json: {detail: 'Falha de teste'}});
        return send({status: 'enviada'});
      }
      return send({status: 'em_preenchimento', matriz_comparacao: [[1,1,1],[1,1,1],[1,1,1]],
        estatisticas: {}});
    });
    await page.goto(`${process.env.SICARD_TEST_URL || 'http://127.0.0.1:8083'}/public/analise-multicriterio/formulario-comparacao-pareada/feedback/`);
    await page.getByText('Status da rodada de julgamento: ativa', {exact: true}).waitFor();
    await page.locator('#colab-nome').fill('Especialista de teste');
    await page.locator('#colab-inst').fill('Instituição de teste');
    await page.locator('#colab-email').fill('teste@example.com');
    await page.locator('#colab-token').fill('t'.repeat(43));
    const progress = page.waitForRequest(r => new URL(r.url()).pathname.endsWith('/respostas/progresso'));
    await page.locator('#btn-liberar-form').click();
    await page.waitForFunction(() => !document.querySelector('#collab-form-section').classList.contains('is-hidden')
      || document.querySelector('#colab-id-feedback').classList.contains('is-error'));
    assert.equal(await page.locator('#collab-form-section').isVisible(), true,
      await page.locator('#colab-id-feedback').innerText());
    await page.waitForFunction(() => !document.querySelector('#btn-enviar-resposta').disabled);
    await progress;

    async function enviar() {
      releaseSend = null;
      const request = page.waitForRequest(r => new URL(r.url()).pathname.endsWith('/respostas'));
      await page.locator('#btn-enviar-resposta').click();
      if (releaseProgress) {
        await page.locator('#pfsProgressOverlay.pfs-active').waitFor();
        assert.match(await page.locator('#pfsProgressBox').innerText(), /Concluir salvamentos pendentes/);
        assert.equal(sends, 0, 'O envio definitivo aguarda o salvamento em andamento');
        releaseProgress();
        releaseProgress = null;
      }
      await request;
      await page.locator('#pfsProgressOverlay.pfs-active').waitFor();
      assert.match(await page.locator('#pfsProgressBox').innerText(), /Enviar resposta/);
      assert.equal(await page.locator('#pfsSuccessBox.pfs-active').count(), 0);
      assert.equal(await page.locator('#btn-enviar-resposta').isDisabled(), true);
      assert.equal(await page.locator('#comparisonContent').evaluate(e => e.inert), true);
      await page.evaluate(() => document.querySelector('#btn-enviar-resposta').click());
      assert.equal(sends, failSend ? 1 : 2, 'O duplo envio é bloqueado durante a requisição');
      assert.ok(releaseSend);
      releaseSend();
    }

    await enviar();
    await page.locator('#pfsErrorBox.pfs-active').waitFor();
    assert.match(await page.locator('#pfsErrorBox').innerText(), /Falha de teste/);
    assert.equal(await page.locator('#comparisonContent').evaluate(e => e.inert), false);
    assert.equal(await page.locator('#btn-enviar-resposta').isEnabled(), true);
    assert.equal(await page.locator('.saaty-scale').count(), 3);
    await page.evaluate(() => StatusFeedback.fechar());
    failSend = false;
    await enviar();
    await page.locator('#pfsSuccessBox.pfs-active').waitFor();
    assert.match(await page.locator('#pfsSuccessBox').innerText(), /Resposta enviada com sucesso/);
    assert.equal(await page.locator('#comparisonContent').evaluate(e => e.inert), true);
    assert.deepEqual(errors, []);
    console.log('PASS: envio do especialista com progresso real, erro, nova tentativa e confirmação sem duplicidade.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
