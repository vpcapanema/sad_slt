const { chromium } = require('playwright');
const assert = require('node:assert/strict');

const BASE = process.env.SICARD_BROWSER_BASE_URL || 'http://127.0.0.1:8083';
const MATRIZES = '/api/ahp/comparacao-colaborativa/matrizes';
const AMBIENTES = '/api/ahp/comparacao-colaborativa/ambientes';
const HIER = '/api/ahp/hierarquizacoes';
const ids = {
  matrix: '11111111-1111-4111-8111-111111111111',
  equivalent: '22222222-2222-4222-8222-222222222222',
  different: '33333333-3333-4333-8333-333333333333',
  upload: '44444444-4444-4444-8444-444444444444',
  judgment: '55555555-5555-4555-8555-555555555555',
  hierarchy: '66666666-6666-4666-8666-666666666666',
  surface: '77777777-7777-4777-8777-777777777777',
};
const content = { linhas: [{ criterio: 'Custo', dimensao: 'Financeira', Etapa: 'Fase 3' }, { criterio: 'Benefício', dimensao: 'Financeira', Etapa: 'Fase 3' }] };
const uploadedContent = { linhas: [{ criterio: 'Acesso', dimensao: 'Social', Etapa: 'Fase 3' }, { criterio: 'Impacto', dimensao: 'Social', Etapa: 'Fase 3' }] };

(async () => {
  const preview = await fetch(BASE + '/restrict/analise-multicriterio/central-julgamentos');
  assert.equal(preview.ok, true, 'O servidor de templates deve estar disponível antes de iniciar o browser');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    if (process.env.SICARD_BROWSER_SESSION) {
      await page.context().addCookies([{ name: 'slt_session', value: process.env.SICARD_BROWSER_SESSION, url: BASE }]);
    }
    const errors = [], writes = [], requests = [], confirmations = [];
    let judgments = [], analysisFixture = null;
    const matrices = [
      { id: ids.matrix, nome: 'Matriz "original"', conteudo: content, assinatura: 'equal', arquivo_nome: 'original.json' },
      { id: ids.equivalent, nome: 'Matriz equivalente', conteudo: content, assinatura: 'equal' },
      { id: ids.different, nome: 'Matriz diferente', conteudo: uploadedContent, assinatura: 'other' },
    ];
    let hierarchy = { id: ids.hierarchy, codigo: 'H-1', nome: 'Rodada existente', status: 'em_julgamento',
      matriz_id: ids.matrix, grupo_demanda_id: 'g1', objetos: [], pesos_projetos: [0.4, 0.6],
      dados_hierarquizacao: { cabecalho_grupo: { matriz_premissas_criterios: content } } };
    const group = { id: 'g1', codigo: 'G-1', nome: 'Grupo salvo', objetos: [] };
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/api/**', async route => {
      const req = route.request(), path = new URL(req.url()).pathname, method = req.method();
      requests.push(path);
      if (method !== 'GET') writes.push({ path, method, data: req.postDataJSON() });
      let json = [];
      if (path === '/api/auth/me') json = { id: 'u', nome: 'Analista', tipo_usuario: 'ANALISTA' };
      else if (path === '/api/auth/session') json = { authenticated: true, user: { id: 'u', tipo_usuario: 'ANALISTA' } };
      else if (path === MATRIZES) {
        if (method === 'POST') {
          json = { ...req.postDataJSON(), id: ids.upload, assinatura: 'uploaded' };
          matrices.push(json);
        } else json = matrices;
      } else if (path.startsWith(MATRIZES + '/')) json = matrices.find(matrix => matrix.id === path.split('/').pop());
      else if (path === AMBIENTES) {
        if (method === 'POST') {
          const payload = req.postDataJSON(), matrix = matrices.find(item => item.id === payload.matriz_id);
          json = { ...payload, id: judgments.length ? '88888888-8888-4888-8888-888888888888' : ids.judgment, status: 'ativa', token: 'test', criterios: matrix?.conteudo.linhas || content.linhas,
            n_criterios: matrix?.conteudo.linhas.length || 2, matriz_nome: matrix?.nome, convites: payload.convites,
            url_publica: BASE + '/public/analise-multicriterio/formulario-comparacao-pareada/test/' };
          judgments.push(json);
        } else json = judgments;
      } else if (path.endsWith('/espaco-analitico')) json = analysisFixture;
      else if (path === AMBIENTES + '/' + ids.judgment && method === 'PATCH') {
        json = { ...judgments[0], ...req.postDataJSON() }; judgments = [json];
      } else if (path === HIER + '/portfolio') json = [hierarchy];
      else if (path === HIER) json = method === 'POST' ? { ...req.postDataJSON(), codigo: 'H-2' } : [hierarchy];
      else if (path === HIER + '/H-1' && method === 'PATCH') {
        hierarchy = { ...hierarchy, ...req.postDataJSON() }; json = hierarchy;
      } else if (path === '/api/agrupamentos-demandas') json = [group];
      else if (path === '/api/agrupamentos-demandas/g1') json = group;
      else if (path === '/api/ahp/superficies-criterios/' + ids.surface) json = {
        id: ids.surface, nome: 'Superfície fixa', hierarquizacao_id: ids.hierarchy, criterios: content.linhas,
      };
      return route.fulfill({ json });
    });
    async function prepare(path) {
      await page.goto(BASE + path);
      await page.evaluate(() => {
        window.__confirmations = [];
        window.ProcessFeedback = {
          confirmar: async options => { window.__confirmations.push(options); return true; },
          iniciarCadastro: () => ({ tarefaAtual() {}, concluirTarefa() {}, sucesso() {}, erro(error) { throw new Error(error.message); } }),
        };
      });
    }
    async function collaborators(dimensions, email = 'pessoa@example.com') {
      await page.locator('#ami-collaborator-name').fill('Pessoa convidada');
      await page.locator('#ami-emails').fill(email);
      if (await page.locator('#ami-collaborator-dimensions').isVisible()) {
        for (const box of await page.locator('#ami-dimension-options input').all()) await box.uncheck();
        if (dimensions) {
          for (const dimension of dimensions) await page.locator('#ami-dimension-options').getByRole('checkbox', { name: new RegExp('^' + dimension) }).check();
        } else await page.locator('#ami-dimension-options input').first().check();
      }
      await page.locator('#ami-add-emails').click();
      await page.locator('#ami-confirm-emails').click();
    }
    async function selectMatrix(root, id) {
      await root.locator('[data-matrix-mode][value=existing]').check();
      await root.locator('[data-matrix-select]').selectOption(id);
      await root.locator('[data-matrix-select]').waitFor({ state: 'visible' });
      await page.waitForFunction(selector => !document.querySelector(selector).disabled, await root.locator('[data-matrix-select]').evaluate(el => {
        el.dataset.testSelector = 'active'; return '[data-test-selector="active"]';
      }));
      await root.locator('[data-matrix-select]').evaluate(el => delete el.dataset.testSelector);
    }
    await prepare('/restrict/analise-multicriterio/central-julgamentos');
    await page.locator('#ami-new').click();
    assert.equal(await page.locator('#ami-create-status').isVisible(), false);
    assert.equal(await page.locator('#ami-create-section').getByText('Status do ambiente colaborativo', { exact: true }).count(), 0);
    assert.deepEqual(await page.locator('.ami-registration-grid > section:visible .ahp-subsection-num').allTextContents(), ['1', '2', '3', '4']);
    assert.equal(await page.locator('#ami-interactive-analysis-component > .ahp-section-label').textContent(), 'Configuração do julgamento');
    assert.equal(await page.locator('#ami-create-section > .ahp-subsection-title').count(), 0);
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.locator('.ami-registration-grid').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length), 1);
    assert.deepEqual(await page.locator('.ami-registration-grid > section:visible .ahp-subsection-num').allTextContents(), ['1', '2', '3', '4']);
    await page.setViewportSize({ width: 1280, height: 900 });
    const judgmentPicker = page.locator('#ami-matrix-section');
    assert.equal(await judgmentPicker.locator('[data-matrix-mode]:checked').count(), 0);
    assert.equal(await judgmentPicker.locator('[data-matrix-existing]').isVisible(), false);
    assert.equal(await judgmentPicker.locator('[data-matrix-new]').isVisible(), false);
    assert.match(await judgmentPicker.locator('.matrix-source-help').textContent(), /Selecione uma matriz cadastrada/);
    assert.equal(await judgmentPicker.locator('.matrix-source-option > .form-help').count(), 0);
    assert.deepEqual(await judgmentPicker.locator('.matrix-source-option').evaluateAll(nodes =>
      nodes.map(node => getComputedStyle(node).backgroundColor)), ['rgb(255, 255, 255)', 'rgb(255, 255, 255)']);
    const helpStyles = await page.evaluate(() => {
      const style = selector => {
        const s = getComputedStyle(document.querySelector(selector));
        return [s.fontFamily, s.fontSize, s.fontWeight, s.lineHeight, s.color];
      };
      return { reference: style('#ami-name-help'), matrix: style('.matrix-source-help') };
    });
    assert.deepEqual(helpStyles.matrix, helpStyles.reference);
    await judgmentPicker.locator('[data-matrix-select] option[value="' + ids.matrix + '"]').waitFor({ state: 'attached' });
    assert.equal(await page.locator('#ami-surface-hierarchy-section').isVisible(), false);
    assert.equal(await judgmentPicker.locator('[data-matrix-new]').isVisible(), false);
    assert.equal(await judgmentPicker.locator('[data-matrix-mode][value=existing]').evaluate(radio =>
      radio.closest('fieldset').contains(document.querySelector('#ami-matrix-section [data-matrix-select]'))), true);
    assert.equal(await judgmentPicker.locator('[data-matrix-mode][value=new]').evaluate(radio =>
      radio.closest('fieldset').contains(document.querySelector('#ami-matrix-section [data-matrix-name]'))), true);
    await selectMatrix(judgmentPicker, ids.matrix);
    assert.equal(await judgmentPicker.locator('[data-matrix-existing]').evaluate(panel => {
      const input = panel.querySelector('select').getBoundingClientRect();
      const button = panel.querySelector('button').getBoundingClientRect();
      return Math.abs(input.bottom - button.bottom) < 2 && Math.abs(input.height - button.height) < 2;
    }), true);
    assert.equal(await judgmentPicker.locator('[data-matrix-existing-summary] [data-matrix-details]').isVisible(), true);
    await judgmentPicker.locator('[data-matrix-details]').click();
    assert.match(await judgmentPicker.locator('[data-matrix-dialog]').textContent(), /original.json/);
    assert.equal(await judgmentPicker.locator('[data-matrix-detail-content] input:not([type=checkbox])').count(), 0);
    assert.equal(await judgmentPicker.locator('[data-matrix-dialog] table').count(), 2);
    await judgmentPicker.locator('[data-matrix-close]').click();
    await judgmentPicker.locator('[data-matrix-mode][value=new]').check();
    const model = judgmentPicker.locator('[data-matrix-model]');
    assert.equal(await model.isVisible(), true);
    const modelResponse = await page.request.get(new URL(await model.getAttribute('href'), BASE).href);
    assert.equal(modelResponse.status(), 200);
    assert.equal((await modelResponse.body()).subarray(0, 2).toString(), 'PK');
    assert.equal(await model.evaluate(link => {
      const upload = link.previousElementSibling.getBoundingClientRect(), download = link.getBoundingClientRect();
      return download.left >= upload.right && Math.abs(download.bottom - upload.bottom) < 2;
    }), true);
    assert.equal(await judgmentPicker.locator('[data-matrix-existing]').isVisible(), false);
    assert.equal(await judgmentPicker.locator('[data-matrix-details]').isVisible(), false);
    assert.equal(await judgmentPicker.locator('[data-matrix-upload]').getAttribute('aria-label'), 'Carregar arquivo da matriz');
    await judgmentPicker.locator('[data-matrix-file]').setInputFiles({
      name: 'invalida.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ linhas: [{ criterio: 'Único' }] })),
    });
    await judgmentPicker.locator('[data-matrix-feedback]').filter({ hasText: 'ao menos dois critérios' }).waitFor();
    assert.equal(writes.length, 0, 'Matriz inválida não deve ser enviada ao servidor');
    await judgmentPicker.locator('[data-matrix-file]').setInputFiles({
      name: 'criterios.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(uploadedContent)),
    });
    await judgmentPicker.locator('[data-matrix-feedback]').filter({ hasText: 'Arquivo carregado' }).waitFor();
    await judgmentPicker.locator('[data-matrix-name]').fill('Matriz avulsa');
    assert.equal(await judgmentPicker.locator('[data-matrix-upload]').getAttribute('aria-label'), 'Cadastrar matriz');
    assert.match(await judgmentPicker.locator('[data-matrix-details]').textContent(), /Matriz avulsa · 2 critérios · criterios.json/);
    assert.equal(await judgmentPicker.locator('[data-matrix-new-summary] [data-matrix-details]').isVisible(), true);
    const uploadLayout = await judgmentPicker.locator('[data-matrix-new]').evaluate(panel => {
      const input = panel.querySelector('input[type=text]').getBoundingClientRect();
      const button = panel.querySelector('button').getBoundingClientRect();
      return { sameRow: Math.abs(input.bottom - button.bottom) < 2 && Math.abs(input.height - button.height) < 2, adjacent: button.left >= input.right, bottomGap: input.bottom - button.bottom,
        labelMargin: getComputedStyle(panel.querySelector('label')).marginBottom, inputMargin: getComputedStyle(panel.querySelector('input[type=text]')).marginBottom };
    });
    const typography = await page.evaluate(() => {
      const font = selector => {
        const style = getComputedStyle(document.querySelector(selector));
        return [style.fontFamily, style.fontSize, style.fontWeight, style.lineHeight];
      };
      return {
        referenceLabel: font('.ami-collaborator-fields > label'),
        matrixLabel: font('[data-matrix-new] > label'),
        choice: font('.matrix-source-option legend label'),
        referenceInput: font('#ami-collaborator-name'),
        matrixInput: font('[data-matrix-name]'),
        summary: font('[data-matrix-details]'),
      };
    });
    assert.deepEqual(typography.matrixLabel, typography.referenceLabel);
    assert.deepEqual(typography.choice, typography.referenceLabel);
    assert.deepEqual(typography.matrixInput, typography.referenceInput);
    assert.deepEqual(typography.summary, typography.referenceInput.map((value, index) => index === 2 ? '700' : value));
    assert.deepEqual(await judgmentPicker.locator('[data-matrix-details]').evaluate(node => {
      const style = getComputedStyle(node);
      return [style.backgroundColor, style.color, style.boxShadow];
    }), ['rgba(0, 0, 0, 0)', 'rgb(18, 59, 86)', 'none']);
    assert.equal(uploadLayout.sameRow && uploadLayout.adjacent, true, JSON.stringify(uploadLayout));
    if (process.env.SICARD_BROWSER_SCREENSHOT) await judgmentPicker.screenshot({ path: process.env.SICARD_BROWSER_SCREENSHOT });
    await judgmentPicker.locator('[data-matrix-details]').click();
    assert.match(await judgmentPicker.locator('[data-matrix-dialog]').textContent(), /ainda não cadastrado/);
    assert.equal(writes.length, 0, 'Carregar e visualizar não cadastra nem envia julgamentos');
    const pairCells = await judgmentPicker.locator('[data-matrix-dialog] table').nth(1).locator('tbody td:not(.col-select)').allTextContents();
    assert.deepEqual(pairCells, ['Acesso', '—', '—', 'Impacto', '—', '—']);
    await judgmentPicker.locator('[data-matrix-close]').click();
    await judgmentPicker.locator('[data-matrix-upload]').click();
    await judgmentPicker.locator('[data-matrix-feedback]').filter({ hasText: 'cadastrada e selecionada' }).waitFor();
    const upload = writes.find(write => write.path === MATRIZES);
    assert.equal(upload.data.nome, 'Matriz avulsa');
    assert.deepEqual(upload.data.conteudo, uploadedContent);
    assert.equal(upload.data.arquivo_nome, 'criterios.json');
    assert.deepEqual(JSON.parse(Buffer.from(upload.data.arquivo_base64, 'base64').toString()), uploadedContent);
    assert.equal(writes.length, 1, 'Upload avulso não cria hierarquização ou julgamento');
    assert.equal(await judgmentPicker.locator('[data-matrix-mode][value=new]').isChecked(), true);
    assert.equal(await judgmentPicker.locator('[data-matrix-new-summary] [data-matrix-details]').isVisible(), true);
    assert.match(await judgmentPicker.locator('[data-matrix-details]').textContent(), /Matriz avulsa · 2 critérios · criterios.json/);
    await page.locator('#ami-judgment-name').fill('Julgamento avulso');
    await page.locator('#ami-deadline').fill('2030-12-31');
    await collaborators();
    await page.locator('#ami-create-form button[type=submit]').click();
    await page.locator('#ami-create-section.is-readonly').waitFor();
    assert.equal(await page.locator('#ami-create-status').isVisible(), true);
    const judgmentWrite = writes.find(write => write.path === AMBIENTES);
    assert.equal(judgmentWrite.data.matriz_id, ids.upload);
    assert.deepEqual(judgmentWrite.data.convites[0].dimensoes, ['Social']);
    assert.equal('hierarquizacao_id' in judgmentWrite.data, false);
    assert.equal('superficie_id' in judgmentWrite.data, false);
    assert.match(await page.locator('#ami-judgments').textContent(), /Matriz avulsa/);
    await page.locator('#ami-environment-edit').click();
    assert.equal(await judgmentPicker.locator('[data-matrix-select]').isDisabled(), true);
    assert.equal(await judgmentPicker.locator('[data-matrix-upload]').isDisabled(), true);
    await judgmentPicker.locator('[data-matrix-details]').click();
    assert.equal(await judgmentPicker.locator('[data-matrix-close]').isEnabled(), true);
    await judgmentPicker.locator('[data-matrix-close]').click();
    await page.locator('#ami-judgment-name').fill('Julgamento avulso atualizado');
    await page.locator('#ami-environment-save').click();
    await page.locator('#ami-create-feedback').filter({ hasText: 'sucesso' }).waitFor();
    const judgmentUpdate = writes.find(write => write.path === AMBIENTES + '/' + ids.judgment);
    assert.equal('matriz_id' in judgmentUpdate.data, false);
    assert.equal(judgmentUpdate.data.nome, 'Julgamento avulso atualizado');
    assert.equal('hierarquizacao_id' in judgmentUpdate.data, false);
    assert.equal('arquivo_matriz_base64' in judgmentUpdate.data, false);
    await page.locator('#ami-new').click();
    await selectMatrix(judgmentPicker, ids.upload);
    await page.locator('#ami-judgment-name').fill('Outra rodada da mesma matriz');
    await page.locator('#ami-deadline').fill('2030-12-31');
    await collaborators();
    await page.locator('#ami-create-form button[type=submit]').click();
    await page.locator('#ami-create-section.is-readonly').waitFor();
    assert.equal(judgments.length, 2);
    assert.equal(judgments.every(judgment => judgment.status === 'ativa' && judgment.matriz_id === ids.upload), true);
    assert.deepEqual(await page.evaluate(() => window.__confirmations), [], 'Rodadas independentes não encerram a coleta anterior');

    await prepare('/restrict/hierarquizacao/processos/');
    await page.locator('#hier-new').click();
    await page.locator('#hier-nome').fill('Nova rodada');
    await page.locator('#hier-agrupamento').selectOption('g1');
    const hierarchyPicker = page.locator('#hier-matrix-picker');
    await selectMatrix(hierarchyPicker, ids.upload);
    await page.locator('#nova-hierarquizacao button[type=submit]').click();
    await page.locator('#hier-complementacao-pos-cadastro').waitFor();
    const hierarchyWrite = writes.find(write => write.path === HIER && write.method === 'POST');
    assert.equal(hierarchyWrite.data.matriz_id, ids.upload);
    assert.equal('matriz_premissas_criterios' in hierarchyWrite.data, false);
    await page.locator('.hier-row-select').check();
    await page.locator('#hier-bulk-edit').click();
    const editor = page.locator('[data-hier-matrix-editor]');
    assert.equal(await page.locator('#hier-tbody [data-matrix-picker]').count(), 0, 'Editor não deve ocupar a célula');
    await page.locator('[data-edit-matrix]').click();
    assert.equal(await page.locator('.hier-matrix-editor-dialog').evaluate(el => el.open), true);
    await editor.locator('[data-matrix-select] option[value="' + ids.equivalent + '"]').waitFor({ state: 'attached' });
    await page.waitForFunction(() => document.querySelector('[data-hier-matrix-editor] [data-matrix-select]').value === '11111111-1111-4111-8111-111111111111' &&
      !document.querySelector('[data-hier-matrix-editor] [data-matrix-select]').disabled);
    await selectMatrix(editor, ids.equivalent);
    const reuse = editor.getByRole('checkbox');
    assert.equal(await reuse.isEnabled(), true);
    await reuse.check();
    const pickerFont = await editor.locator('[data-matrix-select]').evaluate(el => getComputedStyle(el).fontSize);
    const referenceFont = await hierarchyPicker.locator('[data-matrix-select]').evaluate(el => getComputedStyle(el).fontSize);
    assert.equal(pickerFont, referenceFont, 'Editor usa a tipografia do cadastro, fora da célula');
    assert.equal(await editor.locator('.hier-matrix-reuse').evaluate(el => getComputedStyle(el).fontSize),
      await editor.locator('[data-matrix-picker]').evaluate(el => getComputedStyle(el).fontSize), 'Reutilização de pesos mantém a escala do seletor');
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.locator('.hier-matrix-editor-dialog').evaluate(el => el.scrollWidth <= el.clientWidth + 1), true, 'Janela sem transbordamento em tela estreita');
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.locator('.hier-matrix-editor-dialog > .json-modal-head .json-modal-close').click();
    assert.equal(await page.locator('[data-matrix-edit-summary]').textContent(), 'Matriz equivalente');
    await page.locator('#hier-bulk-save').click();
    await page.locator('[data-hier-matrix-editor]').waitFor({ state: 'detached' });
    const equivalentWrite = writes.find(write => write.path === HIER + '/H-1');
    assert.equal(equivalentWrite.data.matriz_id, ids.equivalent);
    assert.equal(equivalentWrite.data.confirmar_reuso_pesos, true);
    confirmations.push(...await page.evaluate(() => window.__confirmations));
    assert.match(confirmations[0].warning, /reaproveitamento/);
    await page.locator('.hier-row-select').check();
    await page.locator('#hier-bulk-edit').click();
    await page.locator('[data-edit-matrix]').click();
    await page.waitForFunction(() => document.querySelector('[data-hier-matrix-editor] [data-matrix-select]').value === '22222222-2222-4222-8222-222222222222' &&
      !document.querySelector('[data-hier-matrix-editor] [data-matrix-select]').disabled);
    await selectMatrix(editor, ids.different);
    assert.equal(await editor.getByRole('checkbox').isDisabled(), true);
    await page.keyboard.press('Escape');
    await page.locator('#hier-bulk-save').click();
    await page.locator('[data-hier-matrix-editor]').waitFor({ state: 'detached' });
    const differentWrite = writes.filter(write => write.path === HIER + '/H-1').at(-1);
    assert.equal(differentWrite.data.matriz_id, ids.different);
    assert.equal(differentWrite.data.confirmar_reuso_pesos, false);
    await page.locator('.hier-row-select').check();
    await page.locator('#hier-bulk-edit').click();
    await page.locator('[data-edit-matrix]').click();
    await selectMatrix(editor, ids.equivalent);
    await page.keyboard.press('Escape');
    await page.locator('#hier-bulk-cancel').click();
    assert.equal(await page.locator('[data-hier-matrix-editor]').count(), 0);
    assert.equal(writes.filter(write => write.path === HIER + '/H-1').length, 2, 'Cancelar descarta associação sem gravar');

    matrices.push({ id: '99999999-9999-4999-8999-999999999999', nome: 'Matriz por dimensão',
      conteudo: { linhas: [...content.linhas, ...uploadedContent.linhas,
        { criterio: 'Incidência espacial', dimensao: 'Território', Etapa: 'Favorabilidade territorial — município e rede rodoviária' }] }, arquivo_nome: 'por-dimensao.xlsx' });
    await prepare('/restrict/analise-multicriterio/central-julgamentos');
    await page.locator('#ami-new').click();
    await selectMatrix(judgmentPicker, '99999999-9999-4999-8999-999999999999');
    assert.equal(await page.locator('#ami-dimension-options input').count(), 2);
    assert.doesNotMatch(await page.locator('#ami-dimension-options').textContent(), /Território/);
    await page.locator('#ami-judgment-name').fill('Especialistas por dimensão');
    await page.locator('#ami-deadline').fill('2030-12-31');
    await collaborators(['Social'], 'social@example.com');
    await collaborators(['Financeira', 'Social'], 'multidisciplinar@example.com');
    await page.locator('#ami-create-form button[type=submit]').click();
    await page.locator('#ami-create-section.is-readonly').waitFor();
    const scopedWrite = writes.filter(write => write.path === AMBIENTES).at(-1);
    assert.deepEqual(scopedWrite.data.convites.map(invite => invite.dimensoes), [['Social'], ['Financeira', 'Social']]);
    await page.locator('#ami-email-preview-recipient').selectOption('social@example.com');
    assert.match(await page.locator('#ami-email-template').textContent(), /Acesso/);
    assert.doesNotMatch(await page.locator('#ami-email-template').textContent(), /Custo|Benefício/);
    await page.locator('#ami-email-preview-recipient').selectOption('multidisciplinar@example.com');
    assert.match(await page.locator('#ami-email-template').textContent(), /Custo/);

    const scopedJudgment = { ...judgments.at(-1),
      criterios: [...content.linhas, ...uploadedContent.linhas], n_criterios: 4 };
    const responseFor = (id, email) => ({ id, email, nome_completo: email, status: 'enviada',
      matriz_comparacao: [[1, 2], [0.5, 1]], consistente: true, razao_consistencia: 0,
      pesos: [2 / 3, 1 / 3] });
    const stats = { individuais: [], por_par: [], por_criterio: [] };
    const pairStats = (rows, id) => ({ ...stats, por_par: [{ i: 0, j: 1,
      criterio_a: rows[0].criterio, criterio_b: rows[1].criterio, media: 2, mediana: 2,
      media_geometrica: 2, modas: [2], pontos: [{ resposta_id: id, respondente: id, valor: 2 }] }] });
    const localAnalysis = { id: 'local', nome: 'Pesos sociais', status: 'calculada',
      respostas_incluidas: 1, consistente: true, razao_consistencia: 0,
      pesos_consolidados: [2 / 3, 1 / 3], matriz_consolidada: [[1, 2], [0.5, 1]],
      estatisticas_analise: { criterios_atribuidos: uploadedContent.linhas } };
    analysisFixture = { ambiente: { ...scopedJudgment, convites: [
      { email: 'social@example.com', dimensoes: ['Social'] },
      { email: 'financeira@example.com', dimensoes: ['Financeira'] },
    ] }, respostas: [responseFor('social', 'social@example.com'), responseFor('financeira', 'financeira@example.com')],
      estatisticas: stats, analises: [localAnalysis], participacao: { convidados: 2, nao_iniciados: 0,
        em_preenchimento: 0, enviadas: 2, consistentes: 2, inconsistentes: 0 },
      recortes: [
        { criterios: uploadedContent.linhas, resposta_ids: ['social'], estatisticas: pairStats(uploadedContent.linhas, 'social') },
        { criterios: content.linhas, resposta_ids: ['financeira'], estatisticas: pairStats(content.linhas, 'financeira') },
      ] };
    judgments = [scopedJudgment];
    await prepare('/restrict/analise-multicriterio/central-respostas');
    const headers = await page.locator('#ami-judgments').evaluate(body => [...body.closest('table').tHead.rows[0].cells].map(cell => cell.textContent.trim()));
    assert.equal(headers[1], 'Nome do julgamento');
    assert.equal(headers.includes('ID Julgamento'), false);
    assert.equal(await page.locator('#ami-judgments tr td').nth(1).textContent(), scopedJudgment.nome);
    await page.locator('#ami-filter-coluna').selectOption('nome');
    await page.locator('#ami-filter-valor').selectOption(scopedJudgment.nome);
    assert.equal(await page.locator('#ami-judgments tr').count(), 1);
    await page.locator('#ami-filter-limpar').click();
    await page.locator('[data-analysis-round]').check();
    await page.locator('#ami-responses-edit-action').click();
    await page.locator('#ami-analysis-workspace:not(.is-hidden)').waitFor();
    assert.equal(await page.locator('#ami-analysis-scope').inputValue(), '-1');
    assert.match(await page.locator('#ami-analysis-context').textContent(), /4 critérios/);
    assert.match(await page.locator('#ami-analysis-judges').textContent(), /social@example.com/);
    assert.match(await page.locator('#ami-analysis-judges').textContent(), /financeira@example.com/);
    assert.match(await page.locator('#ami-analysis-pairs').textContent(), /Social — Acesso/);
    assert.match(await page.locator('#ami-analysis-pairs').textContent(), /Financeira — Custo/);
    assert.equal(await page.locator('#ami-analysis-calculate').isDisabled(), true, 'Não agregar matrizes de mesmo tamanho mas critérios distintos');
    assert.match(await page.locator('#ami-analysis-consolidations').textContent(), /Acesso/);
    assert.doesNotMatch(await page.locator('#ami-analysis-consolidations').textContent(), /Custo|Benefício/);
    await page.locator('#ami-pairs-judge').selectOption('social');
    assert.match(await page.locator('#ami-analysis-pairs').textContent(), /Acesso/);
    assert.doesNotMatch(await page.locator('#ami-analysis-pairs').textContent(), /Custo/, 'tabela só com os pares do julgador');
    assert.match(await page.locator('#ami-analysis-pairs-chart .ami-pair-bars__label').first().getAttribute('title'), /Par 1 · Social — Acesso/);
    assert.equal(await page.locator('#ami-analysis-pairs-chart .ami-pair-bars__label').count(), 1, 'gráfico só com os pares do julgador');
    assert.equal(await page.locator('#ami-analysis-pairs-chart .ami-pair-bars__label').first().innerText(), 'Par 1');
    assert.match(await page.locator('#ami-pairs-judge-hint').textContent(), /1 par atribuído a este julgador de 2/);
    assert.match(await page.locator('#ami-analysis-pairs-chart .ami-pane-title').textContent(), /Gráfico dos índices por par de critérios/);
    assert.match(await page.locator('#ami-analysis-matrix').textContent(), /Acesso/);
    assert.doesNotMatch(await page.locator('#ami-analysis-matrix').textContent(), /Custo/);
    await page.locator('#ami-pairs-judge').selectOption('');
    assert.match(await page.locator('#ami-analysis-pairs').textContent(), /Financeira — Custo/);
    assert.match(await page.locator('#ami-analysis-pairs').textContent(), /Social — Acesso/);
    assert.match(await page.locator('#ami-analysis-matrix').textContent(), /recortes diferentes/);
    await page.locator('#ami-analysis-scope').selectOption('0');
    assert.match(await page.locator('#ami-analysis-context').textContent(), /2 critérios/);
    assert.match(await page.locator('#ami-analysis-judges').textContent(), /social@example.com/);
    assert.doesNotMatch(await page.locator('#ami-analysis-judges').textContent(), /financeira@example.com/);
    assert.match(await page.locator('#ami-analysis-consolidations').textContent(), /Pesos locais/);
    assert.equal(await page.locator('[data-homologate-analysis]').count(), 0);
    await page.locator('#ami-analysis-scope').selectOption('1');
    assert.match(await page.locator('#ami-analysis-judges').textContent(), /financeira@example.com/);
    assert.doesNotMatch(await page.locator('#ami-analysis-judges').textContent(), /social@example.com/);
    assert.doesNotMatch(await page.locator('#ami-analysis-consolidations').textContent(), /Pesos sociais/);
    await page.locator('#ami-responses-edit-action').click();
    await page.waitForFunction(() => document.getElementById('ami-analysis-scope').value === '-1');
    await page.locator('#ami-analysis-scope').selectOption('0');
    await page.reload();
    await page.locator('[data-analysis-round]').check();
    await page.locator('#ami-judgments-view-action').click();
    await page.locator('#ami-analysis-workspace:not(.is-hidden)').waitFor();
    assert.equal(await page.locator('#ami-analysis-scope').inputValue(), '-1');
    assert.match(await page.locator('#ami-analysis-judges').textContent(), /financeira@example.com/);

    judgments = [];
    await prepare('/restrict/analise-multicriterio/central-julgamentos?novo=1&superficie_id=' + ids.surface + '&hierarquizacao_id=' + ids.hierarchy);
    await page.waitForFunction(() => document.getElementById('ami-hierarchy-summary').textContent.includes('exclusivos da Fase 3'));
    assert.equal(await page.locator('#ami-create-section').isVisible(), false);
    assert.equal(judgments.length, 0);
    assert.equal(requests.includes(MATRIZES + '/' + ids.matrix), true);
    assert.deepEqual(errors, []);
    console.log('PASS: matrizes independentes, editor modal responsivo com tipografia do cadastro, salvar/cancelar, coluna de nome sem UUID, recorte Todos padrão ao abrir/recarregar, pesos locais e proteção contra agregação de escopos distintos. APIs simuladas.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
