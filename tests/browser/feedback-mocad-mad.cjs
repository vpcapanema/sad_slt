// APIs simuladas; exercita as paginas reais sem alterar bancos ou servicos.
const {chromium} = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({channel: 'msedge', headless: true});
  const base = process.env.SICARD_TEST_URL || 'http://127.0.0.1:8083';
  try {
    const context = await browser.newContext({viewport: {width: 1440, height: 1000}});
    const errors = [], dialogs = [], writes = [];
    let hierarquias = [{id: 'h1', codigo: 'HIER-1', nome: 'Rodada teste', status: 'em_julgamento'}];
    let julgamentos = [{id: 'j1', status: 'ativa', hierarquizacao_id: 'h1', n_criterios: 2,
      criterios: ['A', 'B'], convites: [{email: 'teste@example.org'}], valido_ate: '2027-01-01T23:59:59Z'}];
    let recusar = false, atrasar = null, falharRecarga = false;
    const resposta = {id: 'r1', email: 'teste@example.org', nome_completo: 'Julgador teste', status: 'enviada',
      consistente: true, razao_consistencia: 0, matriz_comparacao: [[1, 1], [1, 1]], pesos: [0.5, 0.5]};
    let analises = [], falharEspaco = false, consistente = true, incluidas = 1;
    const ambiente = {...julgamentos[0], total_respostas: 1, respostas_consistentes: 1};
    context.on('page', page => {
      page.on('pageerror', error => errors.push(error.message));
      page.on('dialog', async dialog => { dialogs.push(dialog.message()); await dialog.dismiss(); });
    });
    await context.route('**/api/**', async route => {
      const request = route.request(), url = new URL(request.url()), method = request.method();
      const path = url.pathname;
      if (method !== 'GET') {
        writes.push({path, method});
        if (atrasar) await new Promise(resolve => { atrasar = resolve; });
        if (recusar) return route.fulfill({status: 409, json: {detail: 'Operação recusada para teste.'}});
        if (path.endsWith('/analises')) {
          const analise = {id: 'a1', codigo: 'ANA-1', nome: 'Teste', consistente, respostas_incluidas: incluidas,
            razao_consistencia: consistente ? 0 : 0.2, pesos_consolidados: [0.5, 0.5], matriz_consolidada: [[1, 1], [1, 1]]};
          analises = [analise];
          return route.fulfill({json: analise});
        }
        if (path.endsWith('/homologar')) return route.fulfill({json: {ok: true}});
        if (path.startsWith('/api/ahp/hierarquizacoes/')) {
          const codigo = decodeURIComponent(path.split('/').at(-1));
          if (method === 'DELETE') hierarquias = hierarquias.filter(h => h.codigo !== codigo);
          else hierarquias = hierarquias.map(h => h.codigo === codigo ? {...h, ...request.postDataJSON()} : h);
        }
        if (path.startsWith('/api/ahp/comparacao-colaborativa/ambientes/')) {
          const id = path.split('/').at(-1);
          if (method === 'DELETE') julgamentos = julgamentos.filter(j => j.id !== id);
          else {
            const updated = {...julgamentos.find(j => j.id === id), ...request.postDataJSON()};
            julgamentos = julgamentos.map(j => j.id === id ? updated : j);
            return route.fulfill({json: updated});
          }
        }
        return route.fulfill({json: {ok: true}});
      }
      if (path.includes('/auth/')) return route.fulfill({json: {authenticated: true, id: 'u', nome: 'Admin teste', tipo_usuario: 'ADMIN'}});
      if (path === '/api/ahp/hierarquizacoes') {
        if (falharRecarga) return route.fulfill({status: 503, json: {detail: 'Lista indisponível.'}});
        return route.fulfill({json: hierarquias});
      }
      if (path === '/api/ahp/comparacao-colaborativa/ambientes') return route.fulfill({json: julgamentos});
      if (path.endsWith('/espaco-analitico')) {
        if (falharEspaco) return route.fulfill({status: 503, json: {detail: 'Espaço indisponível.'}});
        return route.fulfill({json: {ambiente, respostas: [resposta], analises, estatisticas: {por_par: []},
          participacao: {convidados: 1, enviadas: 1, nao_iniciados: 0, em_preenchimento: 0, consistentes: 1, inconsistentes: 0}}});
      }
      return route.fulfill({json: []});
    });
    const page = await context.newPage();
    await page.goto(base + '/restrict/');
    const links = await page.locator('[aria-labelledby="group-mocad"] .platform-tile, [aria-labelledby="group-mad"] .platform-tile')
      .evaluateAll(elements => elements.map(e => e.getAttribute('href')));
    assert.equal(links.length, 13);
    for (const link of links) {
      const response = await context.request.get(base + link);
      assert.equal(response.status(), 200, link);
      const html = await response.text();
      assert.match(html, /process_feedback_unified\.js/, link);
      assert.match(html, /notification_system\.js/, link);
      assert.match(html, /process_feedback_system\.css/, link);
    }
    await page.goto(base + '/restrict/hierarquizacao/processos/');
    await page.locator('.hier-row-select').first().waitFor();
    assert.equal(await page.locator('#pfsComponente').count(), 1);
    await page.locator('.hier-row-select').first().check();
    await page.locator('#hier-bulk-delete').click();
    await page.locator('#pfsConfirmCancel').click();
    assert.equal(writes.length, 0, 'Cancelar nao exclui registros');
    recusar = true;
    await page.locator('#hier-bulk-delete').click();
    await page.locator('#pfsConfirmOk').click();
    await page.locator('#pfsErrorBox.pfs-active').waitFor();
    assert.match(await page.locator('[data-pfs="error-message"]').innerText(), /Operação recusada/);
    await page.evaluate(() => StatusFeedback.fechar());
    recusar = false;
    await page.locator('#hier-bulk-edit').click();
    await page.locator('[data-k="nome"]').fill('Nome atualizado');
    atrasar = true;
    await page.locator('#hier-bulk-save').click();
    await page.locator('#pfsProgressOverlay.pfs-active').waitFor();
    await page.locator('#pfsProgressClose').click();
    assert.equal(await page.locator('#hier-bulk-save').isDisabled(), true);
    assert.equal(await page.locator('#pfsSuccessBox').isVisible(), false, 'Nao anuncia sucesso antes da resposta');
    falharRecarga = true;
    atrasar(); atrasar = null;
    await page.locator('#pfsPartialBox.pfs-active').waitFor();
    assert.match(await page.locator('[data-pfs="partial-message"]').innerText(), /Não foi possível atualizar/);
    await page.evaluate(() => StatusFeedback.fechar());
    falharRecarga = false;

    await page.goto(base + '/restrict/analise-multicriterio/central-julgamentos');
    await page.locator('#ami-judgments [data-select-id]').first().check();
    await page.locator('#ami-judgments-delete-action').click();
    await page.locator('#pfsConfirmCancel').click();
    const before = writes.length;
    assert.equal(julgamentos.length, 1);
    recusar = true;
    await page.locator('#ami-judgments-delete-action').click();
    await page.locator('#pfsConfirmOk').click();
    await page.locator('#pfsErrorBox.pfs-active').waitFor();
    assert.match(await page.locator('[data-pfs="error-message"]').innerText(), /Operação recusada/);
    await page.evaluate(() => StatusFeedback.fechar());
    recusar = false;
    await page.locator('#ami-judgments-delete-action').click();
    await page.locator('#pfsConfirmOk').click();
    await page.locator('#pfsSuccessBox.pfs-active').waitFor();
    assert.equal(julgamentos.length, 0);
    assert.equal(writes.length, before + 2);
    await page.evaluate(() => StatusFeedback.fechar());

    julgamentos = [ambiente];
    await page.goto(base + '/restrict/analise-multicriterio/central-respostas');
    await page.locator('#ami-judgments [data-analysis-round]').first().check();
    await page.locator('#ami-judgments-view-action').click();
    await page.locator('#ami-analysis-workspace:visible').waitFor();
    assert.equal(await page.locator('#ami-process-modal, #ami-result-modal').count(), 0);
    await page.locator('#ami-analysis-calculate').click();
    await page.locator('#pfsSuccessBox.pfs-active').waitFor();
    assert.match(await page.locator('[data-pfs="success-title"]').innerText(), /consolidada com sucesso/);
    await page.evaluate(() => StatusFeedback.fechar());
    await page.locator('[data-homologate-analysis]').click();
    const antesHomologacao = writes.length;
    await page.locator('#pfsConfirmCancel').click();
    assert.equal(writes.length, antesHomologacao);
    falharEspaco = true;
    await page.locator('[data-homologate-analysis]').click();
    await page.locator('#pfsConfirmOk').click();
    await page.locator('#pfsPartialBox.pfs-active').waitFor();
    assert.match(await page.locator('[data-pfs="partial-message"]').innerText(), /servidor confirmou.*Recarregue/);
    await page.evaluate(() => StatusFeedback.fechar());
    falharEspaco = false; consistente = false;
    await page.locator('#ami-analysis-calculate').click();
    await page.locator('#pfsErrorBox.pfs-active').waitFor();
    assert.match(await page.locator('[data-pfs="error-title"]').innerText(), /gravada, mas inconsistente/);
    await page.evaluate(() => StatusFeedback.fechar());
    consistente = true; recusar = true;
    await page.locator('#ami-analysis-calculate').click();
    await page.locator('#pfsErrorBox.pfs-active').waitFor();
    assert.match(await page.locator('[data-pfs="error-message"]').innerText(), /Operação recusada/);
    await page.evaluate(() => StatusFeedback.fechar());
    recusar = false; falharEspaco = true;
    await page.locator('#ami-analysis-calculate').click();
    await page.locator('#pfsPartialBox.pfs-active').waitFor();
    assert.match(await page.locator('[data-pfs="partial-message"]').innerText(), /análise foi gravada.*Recarregue/);
    await page.evaluate(() => StatusFeedback.fechar());
    falharEspaco = false;

    await context.route('**/api/painel/demandas/internas', route =>
      route.fulfill({status: 503, json: {detail: 'Painel indisponível para teste.'}}));
    await page.goto(base + '/restrict/painel/');
    await page.locator('.notification-toast.error').filter({hasText: 'Painel indisponível para teste.'}).waitFor();
    assert.equal(await page.locator('#admin-toast').count(), 0);
    await page.goto(base + '/restrict/demandas/');
    await page.waitForFunction(() => window.SLTAdminUi && window.ProcessFeedback);
    await page.evaluate(() => {
      SLTAdminUi.showToast('Aviso de teste', true);
      window.confirmacaoTeste = SLTAdminUi.showConfirm({title: 'Excluir', message: 'Confirmar?', danger: true});
    });
    assert.equal(await page.locator('.notification-toast.error').count(), 1);
    await page.locator('#pfsConfirmCancel').click();
    assert.equal(await page.evaluate(() => confirmacaoTeste), false);
    assert.equal(await page.locator('#admin-toast, #admin-modal-backdrop').count(), 0);
    assert.deepEqual(dialogs, []);
    assert.deepEqual(errors, []);
    console.log('PASS: 13 cards MOCAD/MAD com infraestrutura; confirmacao, cancelamento, progresso real, erro, parcial e sucesso nas centrais; helpers administrativos padrao; APIs simuladas.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
