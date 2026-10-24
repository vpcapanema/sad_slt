const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    const errors = [], writes = [], requests = [];
    const objetos = [{ id: 'p1', codigo: 'P1', nome: 'Projeto 1', status: 'aprovada' }];
    const matrix = { linhas: [{ criterio: 'C1' }, { criterio: 'C2' }] };
    const grupo = { id: 'g1', nome: 'Grupo 1', codigo: 'G1', tipo_demanda: 'projeto', quantidade_demandas: 1, objetos };
    const hier = { codigo: 'H1', nome: 'Existente', status: 'em_julgamento', objetos,
      relatorio_fase1: {analises_geoespaciais: [
        {arquivo: 'saidas-geoespaciais/analise/saida.gpkg', sha256: 'gpkg',
          relatorio: {arquivo: 'saidas-geoespaciais/analise/relatório.pdf', sha256: 'pdf',
            tabela_resumo: {arquivo: 'saidas-geoespaciais/analise/resumo.xlsx'},
            resumo_elegibilidade: {nota: 'Nota registrada <sem HTML>', linhas: [
              {conjunto_de_demandas: 'Grupo 1', objeto_de_demanda: '<img src=x onerror=alert(1)>',
                camadas_de_risco: ['Inundação', 'Encosta'], area_de_sobreposicao_ha: 12.3456,
                porcentagem_sobreposta: 25, indice_de_risco_ambiental_e_territorial: 0.75},
              {conjunto_de_demandas: 'Grupo 1', objeto_de_demanda: 'Demanda livre',
                camadas_de_risco: [], area_de_sobreposicao_ha: 0,
                porcentagem_sobreposta: 0, indice_de_risco_ambiental_e_territorial: 1},
            ]}}},
        {arquivo: 'saidas-geoespaciais/anterior/saida.gpkg', sha256: 'anterior'},
        {relatorio: {resumo_elegibilidade: {linhas: []}}},
      ]}, relatorio_fase2: {fase: 2, resumo: 'Favorabilidade registrada'},
      relatorio_fase3: {}, relatorio_consolidado: {},
      dados_hierarquizacao: { cabecalho_grupo: { matriz_premissas_criterios: matrix } } };
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/api/**', route => {
      const req = route.request(), path = new URL(req.url()).pathname.replace(/^\/sicard(?=\/api)/, '');
      requests.push(path);
      let json = [];
      if (req.method() !== 'GET') writes.push({ path, method: req.method(), data: req.postDataJSON() });
      if (path === '/api/auth/me') json = { id: 'u', tipo_usuario: 'ANALISTA', nome: 'Analista' };
      else if (path === '/api/auth/session') json = { authenticated: true, user: { id: 'u', tipo_usuario: 'ANALISTA' } };
      else if (path === '/api/ahp/hierarquizacoes') json = req.method() === 'GET' ? [hier] : { codigo: 'H2' };
      else if (path === '/api/agrupamentos-demandas') json = [grupo];
      else if (path === '/api/agrupamentos-demandas/g1') json = grupo;
      return route.fulfill({ json });
    });
    await page.goto('http://127.0.0.1:8083/restrict/hierarquizacao/processos/', {waitUntil:'domcontentloaded'});
    await page.locator('#hier-tbody [data-json="relatorio_fase1"]').waitFor();
    assert.equal(await page.locator('.hier-register-table thead th').count(), 23);
    assert.equal(await page.locator('#hier-tbody tr').first().locator('td').count(), 23);
    for (const rotulo of ['Relatório da Fase 1', 'Relatório da Fase 2', 'Relatório da Fase 3', 'Relatório consolidado']) {
      assert.equal(await page.locator('.hier-register-table thead th').filter({hasText:rotulo}).count(), 1);
    }
    assert.equal(await page.locator('#hier-tbody td').filter({hasText:'Não produzido'}).count(), 2);
    await page.locator('#hier-tbody [data-json="relatorio_fase1"]').click();
    const modal = page.locator('#modal-relatorios');
    assert.equal(await modal.isVisible(), true);
    assert.equal(await modal.getByRole('link').count(), 6, 'Downloads e resumos de cada análise ficam disponíveis');
    const pdf = modal.getByRole('link', {name:/Baixar relatório PDF/});
    const href = new URL(await pdf.getAttribute('href'), page.url());
    assert.equal(href.pathname, '/api/ahp/hierarquizacoes/H1/relatorios/fase1/arquivo');
    assert.equal(href.searchParams.get('arquivo'), 'saidas-geoespaciais/analise/relatório.pdf');
    assert.match(await modal.innerText(), /Confirme os nomes/);
    assert.match(await modal.innerText(), /Tabela-resumo de elegibilidade não registrada nesta análise/);
    const resumoLinks = modal.getByRole('link', {name: 'Visualizar tabela-resumo de elegibilidade'});
    const resumo = page.locator('#modal-resumo-elegibilidade');
    await resumoLinks.first().click();
    assert.equal(await modal.isVisible(), false);
    assert.equal(await resumo.isVisible(), true);
    assert.equal(await resumo.locator('thead th').count(), 6);
    const linhasResumo = resumo.locator('tbody tr');
    assert.equal(await linhasResumo.count(), 2);
    assert.deepEqual(await linhasResumo.first().locator('td').allTextContents(),
      ['Grupo 1', '<img src=x onerror=alert(1)>', 'InundaçãoEncosta', '12,3456', '25,00%', '0,7500']);
    assert.deepEqual(await linhasResumo.last().locator('td').allTextContents(),
      ['Grupo 1', 'Demanda livre', 'Nenhuma camada de risco atingida', '0,0000', '0,00%', '1,0000']);
    assert.equal(await resumo.locator('img').count(), 0, 'Conteúdo salvo é escapado');
    assert.match(await resumo.innerText(), /Nota registrada <sem HTML>/);
    await page.keyboard.press('Tab');
    assert.equal(await resumo.locator('thead th').first().evaluate(el => el === document.activeElement), true);
    await page.keyboard.press('Shift+Tab');
    const fecharResumo = resumo.getByRole('button', {name: 'Fechar resumo e voltar ao relatório'});
    assert.equal(await fecharResumo.evaluate(el => el === document.activeElement), true);
    await page.keyboard.press('Shift+Tab');
    assert.equal(await resumo.locator('thead th').last().evaluate(el => el === document.activeElement), true);
    await page.keyboard.press('Tab');
    assert.equal(await fecharResumo.evaluate(el => el === document.activeElement), true);
    await page.keyboard.press('Escape');
    assert.equal(await resumo.isVisible(), false);
    assert.equal(await modal.isVisible(), true, 'Escape retorna ao relatório sem fechá-lo');
    assert.equal(await resumoLinks.first().evaluate(el => el === document.activeElement), true);
    await resumoLinks.last().click();
    assert.match(await resumo.innerText(), /Nenhuma demanda sem restrição neste conjunto/);
    await resumo.getByRole('button', {name: 'Fechar resumo e voltar ao relatório'}).click();
    assert.equal(await modal.isVisible(), true);
    await resumoLinks.first().click();
    await resumo.click({position: {x: 2, y: 2}});
    assert.equal(await modal.isVisible(), true, 'Clique fora retorna ao relatório');
    await page.keyboard.press('Escape');
    await page.locator('#hier-tbody [data-json="relatorio_fase2"]').click();
    assert.match(await modal.innerText(), /Relatório da Fase 2/);
    assert.match(await modal.innerText(), /Favorabilidade registrada/);
    await page.keyboard.press('Escape');
    await page.locator('.hier-row-select').check();
    await page.locator('#hier-bulk-view').click();
    await page.waitForFunction(() => document.querySelector('#hier-nome').disabled);
    assert.match(await page.locator('#hier-agrupamento-demandas').textContent(), /Projeto 1/);
    assert.equal(await page.locator('#nova-hierarquizacao .process-actions').isVisible(), false);
    await page.locator('#hier-tbody [data-json="objetos"]').click();
    assert.equal(await page.locator('#modal-objetos').isVisible(), true);
    await page.keyboard.press('Escape');
    await page.locator('#hier-tbody .matriz-link').click();
    assert.match(await page.locator('#modal-matriz').textContent(), /C1/);
    await page.keyboard.press('Escape');
    await page.locator('#hier-bulk-edit').click();
    await page.locator('#hier-tbody [data-k="nome"]').fill('Editada');
    await page.locator('#hier-bulk-save').click();
    await page.waitForFunction(() => !document.querySelector('#hier-tbody [data-k="nome"]'));
    assert.equal(writes[0].method, 'PATCH');
    assert.equal(writes[0].data.nome, 'Editada');
    await page.locator('#pfsSuccessBox.pfs-active').waitFor();
    await page.evaluate(() => StatusFeedback.fechar());
    await page.locator('#hier-new').click();
    await page.locator('#hier-nome').fill('Nova');
    await page.locator('#hier-agrupamento').selectOption('g1');
    await page.locator('#hier-criteria-matrix').setInputFiles({ name: 'matriz.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(matrix)) });
    await page.waitForFunction(() => document.querySelector('#hier-criteria-matrix-summary').textContent.includes('2 crit'));
    const created = page.waitForRequest(req => req.method() === 'POST' && req.url().endsWith('/api/ahp/hierarquizacoes'));
    await page.locator('#nova-hierarquizacao button[type="submit"]').click();
    const payload = (await created).postDataJSON();
    assert.deepEqual(Object.keys(payload).sort(), ['descricao', 'grupo_demanda_id', 'matriz_premissas_criterios', 'nome']);
    assert.equal(payload.grupo_demanda_id, 'g1');
    assert.deepEqual(payload.matriz_premissas_criterios.linhas, matrix.linhas);
    await page.locator('#pfsSuccessBox.pfs-active').waitFor();
    assert.match(await page.locator('[data-pfs="success-title"]').innerText(), /Hierarquização cadastrada/);
    assert.equal(requests.some(path => path.includes('/universo')), false);
    await page.route('**/sicard/restrict/hierarquizacao/processos/', async route => {
      const response = await route.fetch({url:'http://127.0.0.1:8083/restrict/hierarquizacao/processos/'});
      return route.fulfill({response});
    });
    await page.goto('http://127.0.0.1:8083/sicard/restrict/hierarquizacao/processos/', {waitUntil:'domcontentloaded'});
    await page.locator('#hier-tbody [data-json="relatorio_fase1"]').click();
    assert.match(await modal.getByRole('link', {name:/Baixar relatório PDF/}).getAttribute('href'),
      /^\/sicard\/api\/ahp\/hierarquizacoes\/H1\/relatorios\/fase1\/arquivo\?/);
    assert.match(await modal.getByRole('link', {name:/Baixar Resumo da Elegibilidade/}).getAttribute('href'),
      /^\/sicard\/api\/ahp\/hierarquizacoes\/H1\/relatorios\/fase1\/arquivo\?/);
    await page.setViewportSize({width:390, height:844});
    assert.equal(await modal.isVisible(), true);
    assert(await modal.locator('.json-modal').evaluate(el => el.getBoundingClientRect().width <= innerWidth));
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Mobile sem overflow da página');
    await resumoLinks.first().click();
    assert.equal(await resumo.isVisible(), true);
    assert(await resumo.locator('.json-modal').evaluate(el => el.getBoundingClientRect().width <= innerWidth));
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Resumo mobile sem overflow da página');
    assert(await resumo.locator('.matriz-table-wrap').evaluate(el => el.scrollWidth > el.clientWidth), 'Tabela rola dentro do modal');
    await page.keyboard.press('Escape');
    assert.equal(await modal.isVisible(), true);
    assert.deepEqual(errors, []);
    console.log('PASS: cadastro, consulta, edição; relatórios, downloads, tabela-resumo por análise, dados legados/vazios, escape de HTML, retorno/foco, prefixo e mobile.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exit(1); });
