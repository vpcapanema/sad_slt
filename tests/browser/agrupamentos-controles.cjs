const {chromium} = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({channel: 'msedge', headless: true});
  try {
    const page = await browser.newPage({viewport: {width: 1440, height: 1000}});
    const errors = [], writes = [], nativeDialogs = [];
    const iniciais = [
      {id: 'g1', codigo: 'AGR-1', nome: 'Grupo A', tipo_demanda: 'projeto', quantidade_demandas: 2, criado_por_nome: 'Maria'},
      {id: 'g2', codigo: 'AGR-2', nome: 'Grupo B', tipo_demanda: 'plano', quantidade_demandas: 1, criado_por_nome: 'Joao'},
    ];
    let groups = [...iniciais], cenario = 'sucesso', falharLista = false;
    page.on('pageerror', error => errors.push(error.message));
    page.on('dialog', async dialog => { nativeDialogs.push(dialog.message()); await dialog.dismiss(); });
    await page.route('**/api/**', async route => {
      const url = new URL(route.request().url()).pathname;
      let json = [];
      if (url.endsWith('/auth/me')) json = {id: 'u', nome: 'Admin teste', tipo_usuario: 'ADMIN'};
      else if (url === '/api/agrupamentos-demandas') {
        if (falharLista) return route.fulfill({status: 503, json: {detail: 'Lista temporariamente indisponível.'}});
        json = groups;
      } else if (url === '/api/admin/tabelas/demandas/grupos_demandas') {
        const body = route.request().postDataJSON(), method = route.request().method();
        writes.push({body, method});
        if (method === 'PATCH') {
          groups = groups.map(g => g.id === body.chave.id ? {...g, ...body.valores} : g);
          json = {ok: true, afetados: 1};
        } else {
          if (cenario === 'conflito') return route.fulfill({status: 409, json: {
            detail: 'O Grupo B (AGR-2) é utilizado por Rodovias Regionais (HIER-1). Revise os vínculos na Gestão das Hierarquizações. Nenhum agrupamento foi excluído.',
          }});
          if (cenario === 'rede') return route.abort('failed');
          if (cenario === 'parcial') groups = groups.filter(g => g.id !== 'g2');
          const antes = groups.length;
          groups = groups.filter(g => !body.chaves.some(chave => chave.id === g.id));
          json = {ok: true, removidos: antes - groups.length, arquivos_removidos: 0};
          falharLista = cenario === 'falha-lista';
        }
      }
      await route.fulfill({json});
    });
    await page.goto('http://127.0.0.1:8083/restrict/agrupamento-demandas/');
    await page.locator('[data-grupo-id]').first().waitFor();
    assert.equal(await page.locator('.agrupamentos-table th').count(), 7);
    await page.locator('#grupos-filtro-coluna').selectOption('tipo_demanda');
    await page.locator('#grupos-filtro-valor').selectOption('Projeto');
    assert.equal(await page.locator('[data-grupo-id]').count(), 1);
    await page.locator('#grupos-filtro-inverter').click();
    assert.equal(await page.locator('[data-grupo-id]').getAttribute('data-grupo-id'), 'g2');
    await page.locator('#grupos-filtro-limpar').click();
    await page.locator('[data-grupo-id="g1"]').check();
    assert.equal(await page.locator('[data-grupo-acao="edit"]').isDisabled(), false);
    await page.locator('[data-grupo-acao="edit"]').click();
    await page.locator('#grupo-nome-edicao').fill('Corrigido');
    await page.locator('[data-grupo-acao="save"]').click();
    await page.locator('#pfsSuccessBox').waitFor({state: 'visible'});
    assert.equal(writes[0].body.valores.nome, 'Corrigido');
    assert.match(await page.locator('#agrupamentos-tbody').innerText(), /Corrigido/);
    await page.locator('#pfsSuccessBox .pfs-close').click();

    await page.locator('#grupos-selecionar-todos').check();
    assert.equal(await page.locator('[data-grupo-acao="edit"]').isDisabled(), true);
    await page.locator('[data-grupo-acao="delete"]').click();
    await page.locator('#pfsConfirmBox').waitFor({state: 'visible'});
    assert.match(await page.locator('[data-pfs="confirm-warning"]').innerText(), /AGR-1 — Corrigido[\s\S]*AGR-2 — Grupo B/);
    assert.match(await page.locator('[data-pfs="confirm-warning"]').innerText(), /As demandas não serão excluídas/);
    assert.equal(await page.locator('[data-grupo-acao="delete"]').isDisabled(), true);
    assert.equal(await page.locator('[data-grupo-id]:disabled').count(), 2);
    await page.keyboard.press('Escape');
    assert.equal(writes.length, 1, 'Cancelar a confirmação não envia DELETE');
    assert.equal(await page.locator('[data-grupo-id]:checked').count(), 2);

    cenario = 'conflito';
    await page.locator('[data-grupo-acao="delete"]').click();
    await page.locator('#pfsConfirmOk').click();
    await page.locator('#pfsErrorBox').waitFor({state: 'visible'});
    assert.match(await page.locator('[data-pfs="error-message"]').innerText(), /Rodovias Regionais.*HIER-1/);
    assert.match(await page.locator('[data-pfs="error-message"]').innerText(), /Nenhum agrupamento foi excluído/);
    assert.equal(await page.locator('[data-grupo-id]:checked').count(), 2);
    assert.equal(await page.locator('#pfsSuccessBox').isVisible(), false);
    await page.locator('#pfsErrorBox .pfs-close').click();

    cenario = 'rede';
    await page.locator('[data-grupo-acao="delete"]').click();
    await page.locator('#pfsConfirmOk').click();
    await page.locator('#pfsErrorBox').waitFor({state: 'visible'});
    assert.match(await page.locator('[data-pfs="error-message"]').innerText(), /Não foi possível confirmar.*recarregue a lista/);
    assert.equal(await page.locator('[data-grupo-acao="delete"]').isEnabled(), true);
    assert.equal(await page.locator('[data-grupo-id]:checked').count(), 2);
    await page.locator('#pfsErrorBox .pfs-close').click();

    cenario = 'sucesso';
    await page.locator('[data-grupo-acao="delete"]').click();
    await page.locator('#pfsConfirmOk').click();
    await page.locator('#pfsSuccessBox').waitFor({state: 'visible'});
    assert.deepEqual(writes.at(-1).body.chaves, [{id: 'g1'}, {id: 'g2'}]);
    assert.match(await page.locator('[data-pfs="success-message"]').innerText(), /2 agrupamentos excluídos.*demandas foram preservadas/);
    assert.equal(await page.locator('[data-grupo-id]').count(), 0);
    await page.locator('#pfsSuccessBox .pfs-close').click();

    for (const modo of ['parcial', 'falha-lista']) {
      groups = [...iniciais]; cenario = modo;
      await page.locator('[data-grupo-acao="reload"]').click();
      await page.locator('[data-grupo-id]').first().waitFor();
      await page.locator('#grupos-selecionar-todos').check();
      await page.locator('[data-grupo-acao="delete"]').click();
      await page.locator('#pfsConfirmOk').click();
      await page.locator('#pfsPartialBox').waitFor({state: 'visible'});
      assert.equal(await page.locator('#pfsSuccessBox').isVisible(), false);
      assert.match(await page.locator('[data-pfs="partial-message"]').innerText(),
        modo === 'parcial' ? /1 agrupamento excluído.*já não estavam disponíveis/ : /2 agrupamentos excluídos.*Não foi possível atualizar a lista/);
      await page.locator('#pfsPartialBox .pfs-close').click();
    }
    assert.deepEqual(nativeDialogs, [], 'Não utiliza confirm/alert nativos');
    assert.deepEqual(errors, []);
    assert.ok(writes.every(write => write.method !== 'DELETE' ||
      JSON.stringify(write.body) === JSON.stringify({chaves: [{id: 'g1'}, {id: 'g2'}]})));
    console.log('Agrupamentos: filtros, edição, confirmação padrão, cancelamento, vínculo, falha de rede, exclusão por IDs, resultado parcial e falha de atualização OK; APIs simuladas.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
