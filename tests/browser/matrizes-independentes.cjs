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
const content = { linhas: [{ criterio: 'Custo' }, { criterio: 'Benefício' }] };
const uploadedContent = { linhas: [{ criterio: 'Acesso' }, { criterio: 'Impacto' }] };

(async () => {
  const preview = await fetch(BASE + '/restrict/analise-multicriterio/central-julgamentos');
  assert.equal(preview.ok, true, 'O servidor de templates deve estar disponível antes de iniciar o browser');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    const errors = [], writes = [], requests = [], confirmations = [];
    let judgments = [];
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
          json = { ...payload, id: judgments.length ? '88888888-8888-4888-8888-888888888888' : ids.judgment, status: 'ativa', token: 'test', criterios: content.linhas,
            n_criterios: 2, matriz_nome: matrix?.nome, convites: payload.convites };
          judgments.push(json);
        } else json = judgments;
      } else if (path === AMBIENTES + '/' + ids.judgment && method === 'PATCH') {
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
    async function collaborators() {
      await page.locator('#ami-collaborator-name').fill('Pessoa convidada');
      await page.locator('#ami-emails').fill('pessoa@example.com');
      await page.locator('#ami-add-emails').click();
      await page.locator('#ami-confirm-emails').click();
    }
    async function selectMatrix(root, id) {
      await root.locator('[data-matrix-select]').selectOption(id);
      await root.locator('[data-matrix-select]').waitFor({ state: 'visible' });
      await page.waitForFunction(selector => !document.querySelector(selector).disabled, await root.locator('[data-matrix-select]').evaluate(el => {
        el.dataset.testSelector = 'active'; return '[data-test-selector="active"]';
      }));
      await root.locator('[data-matrix-select]').evaluate(el => delete el.dataset.testSelector);
    }
    await prepare('/restrict/analise-multicriterio/central-julgamentos');
    await page.locator('#ami-new').click();
    const judgmentPicker = page.locator('#ami-matrix-section');
    await judgmentPicker.locator('[data-matrix-select] option[value="' + ids.matrix + '"]').waitFor({ state: 'attached' });
    assert.equal(await page.locator('#ami-surface-hierarchy-section').isVisible(), false);
    await judgmentPicker.locator('[data-matrix-file]').setInputFiles({
      name: 'invalida.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ linhas: [{ criterio: 'Único' }] })),
    });
    await judgmentPicker.locator('[data-matrix-upload]').click();
    await judgmentPicker.locator('[data-matrix-feedback]').filter({ hasText: 'ao menos dois critérios' }).waitFor();
    assert.equal(writes.length, 0, 'Matriz inválida não deve ser enviada ao servidor');
    await judgmentPicker.locator('[data-matrix-file]').setInputFiles({
      name: 'criterios.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(uploadedContent)),
    });
    await judgmentPicker.locator('[data-matrix-name]').fill('Matriz avulsa');
    await judgmentPicker.locator('[data-matrix-upload]').click();
    await judgmentPicker.locator('[data-matrix-feedback]').filter({ hasText: 'cadastrada e selecionada' }).waitFor();
    const upload = writes.find(write => write.path === MATRIZES);
    assert.equal(upload.data.nome, 'Matriz avulsa');
    assert.deepEqual(upload.data.conteudo, uploadedContent);
    assert.equal(upload.data.arquivo_nome, 'criterios.json');
    assert.deepEqual(JSON.parse(Buffer.from(upload.data.arquivo_base64, 'base64').toString()), uploadedContent);
    assert.equal(writes.length, 1, 'Upload avulso não cria hierarquização ou julgamento');
    await page.locator('#ami-judgment-name').fill('Julgamento avulso');
    await page.locator('#ami-deadline').fill('2030-12-31');
    await collaborators();
    await page.locator('#ami-create-form button[type=submit]').click();
    await page.locator('#ami-create-section.is-readonly').waitFor();
    const judgmentWrite = writes.find(write => write.path === AMBIENTES);
    assert.equal(judgmentWrite.data.matriz_id, ids.upload);
    assert.equal('hierarquizacao_id' in judgmentWrite.data, false);
    assert.equal('superficie_id' in judgmentWrite.data, false);
    assert.match(await page.locator('#ami-judgments').textContent(), /Matriz avulsa/);
    await page.locator('#ami-environment-edit').click();
    assert.equal(await judgmentPicker.locator('[data-matrix-select]').isDisabled(), true);
    assert.equal(await judgmentPicker.locator('[data-matrix-upload]').isDisabled(), true);
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
    await editor.locator('[data-matrix-select] option[value="' + ids.equivalent + '"]').waitFor({ state: 'attached' });
    await page.waitForFunction(() => document.querySelector('[data-hier-matrix-editor] [data-matrix-select]').value === '11111111-1111-4111-8111-111111111111' &&
      !document.querySelector('[data-hier-matrix-editor] [data-matrix-select]').disabled);
    await selectMatrix(editor, ids.equivalent);
    const reuse = editor.getByRole('checkbox');
    assert.equal(await reuse.isEnabled(), true);
    await reuse.check();
    await page.locator('#hier-bulk-save').click();
    await page.locator('[data-hier-matrix-editor]').waitFor({ state: 'detached' });
    const equivalentWrite = writes.find(write => write.path === HIER + '/H-1');
    assert.equal(equivalentWrite.data.matriz_id, ids.equivalent);
    assert.equal(equivalentWrite.data.confirmar_reuso_pesos, true);
    confirmations.push(...await page.evaluate(() => window.__confirmations));
    assert.match(confirmations[0].warning, /reaproveitamento/);
    await page.locator('.hier-row-select').check();
    await page.locator('#hier-bulk-edit').click();
    await page.waitForFunction(() => document.querySelector('[data-hier-matrix-editor] [data-matrix-select]').value === '22222222-2222-4222-8222-222222222222' &&
      !document.querySelector('[data-hier-matrix-editor] [data-matrix-select]').disabled);
    await selectMatrix(editor, ids.different);
    assert.equal(await editor.getByRole('checkbox').isDisabled(), true);
    await page.locator('#hier-bulk-save').click();
    await page.locator('[data-hier-matrix-editor]').waitFor({ state: 'detached' });
    const differentWrite = writes.filter(write => write.path === HIER + '/H-1').at(-1);
    assert.equal(differentWrite.data.matriz_id, ids.different);
    assert.equal(differentWrite.data.confirmar_reuso_pesos, false);

    judgments = [];
    await prepare('/restrict/analise-multicriterio/central-julgamentos?novo=1&superficie_id=' + ids.surface + '&hierarquizacao_id=' + ids.hierarchy);
    await page.locator('#ami-create-section:not(.is-hidden)').waitFor();
    assert.equal(await judgmentPicker.isVisible(), false);
    assert.equal(await page.locator('#ami-surface-hierarchy-section').isVisible(), true);
    assert.equal(await page.locator('#ami-hierarchy').isDisabled(), true);
    await page.locator('#ami-judgment-name').fill('Julgamento da superfície');
    await page.locator('#ami-deadline').fill('2030-12-31');
    await collaborators();
    await page.locator('#ami-create-form button[type=submit]').click();
    await page.locator('#ami-create-section.is-readonly').waitFor();
    const surfaceWrite = writes.filter(write => write.path === AMBIENTES).at(-1);
    assert.equal(surfaceWrite.data.hierarquizacao_id, ids.hierarchy);
    assert.equal(surfaceWrite.data.superficie_id, ids.surface);
    assert.equal('matriz_id' in surfaceWrite.data, false);
    assert.equal(requests.includes(MATRIZES + '/' + ids.matrix), true);
    assert.deepEqual(errors, []);
    console.log('PASS: upload independente, seleção por UUID, criar/editar julgamento avulso com matriz imutável, criar/editar hierarquização, confirmação de reuso equivalente, invalidação não equivalente e contexto legado de superfície. APIs simuladas.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
