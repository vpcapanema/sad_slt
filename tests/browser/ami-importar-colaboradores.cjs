const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const XLSX = require('../../assets/vendor/xlsx/xlsx-0.18.5.min.js');
const base = process.env.SICARD_TEST_URL || 'http://127.0.0.1:8083';

function workbookWithTables() {
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([
    ['Nome', 'Email', null, 'Nome', 'Email'],
    ['Ana Silva', 'ana@example.com', null, 'Marcia Luz', 'marcia@example.com'],
    [null, null, null, 'Total', 1],
  ]), 'Equipes');
  const zip = XLSX.CFB.read(XLSX.write(book, {bookType: 'xlsx', type: 'buffer'}), {type: 'buffer'});
  const add = (path, xml) => XLSX.CFB.utils.cfb_add(zip, path, Buffer.from(xml));
  const read = path => Buffer.from(XLSX.CFB.find(zip, '/' + path).content).toString();
  const ns = 'http://schemas.openxmlformats.org';
  const tables = [['EquipeA', 'A1:B2', 0], ['EquipeB', 'D1:E3', 1]];
  const relationships = tables.map((table, index) => {
    const id = index + 1;
    add(`xl/tables/table${id}.xml`, `<table xmlns="${ns}/spreadsheetml/2006/main" id="${id}" name="${table[0]}" displayName="${table[0]}" ref="${table[1]}" totalsRowCount="${table[2]}"><tableColumns count="2"><tableColumn id="1" name="Nome"/><tableColumn id="2" name="Email"/></tableColumns></table>`);
    return `<Relationship Id="rId${id}" Type="${ns}/officeDocument/2006/relationships/table" Target="../tables/table${id}.xml"/>`;
  });
  add('xl/worksheets/_rels/sheet1.xml.rels', `<Relationships xmlns="${ns}/package/2006/relationships">${relationships.join('')}</Relationships>`);
  const worksheet = 'xl/worksheets/sheet1.xml';
  add(worksheet, read(worksheet).replace('</worksheet>', '<tableParts count="2"><tablePart r:id="rId1"/><tablePart r:id="rId2"/></tableParts></worksheet>'));
  add('[Content_Types].xml', read('[Content_Types].xml').replace('</Types>', tables.map((_, index) =>
    `<Override PartName="/xl/tables/table${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.table+xml"/>`).join('') + '</Types>'));
  return Buffer.from(XLSX.CFB.write(zip, {fileType: 'zip', type: 'buffer'}));
}

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({viewport: {width: 1440, height: 1000}}), errors = [], escritas = [];
  const matriz = {id: 'matriz-de-teste', nome: 'Matriz de teste', conteudo: {linhas: [
    {etapa: 'Fase 3', criterio: 'C1', dimensao: 'Ambiental'},
    {etapa: 'Fase 3', criterio: 'C2', dimensao: 'Ambiental'},
    {etapa: 'Fase 3', criterio: 'C3', dimensao: 'Social'},
    {etapa: 'Fase 3', criterio: 'C4', dimensao: 'Viabilidade institucional e financeira'},
    {etapa: 'Fase 2', criterio: 'C5', dimensao: 'Espacial'},
  ]}};
  const versao = '2026-11-01T12:00:00+00:00';
  let julgamento = {
    id: 'julgamento-teste', nome: 'Julgamento de teste', matriz_id: matriz.id, status: 'ativa',
    criterios: matriz.conteudo.linhas.slice(0, 4), n_criterios: 4, atualizadoEm: versao,
    valido_ate: '2036-01-01T23:59:59-03:00',
  };
  julgamento.convites = julgamento.lista_colaboradores = [
    {nome: 'Ana Silva', email: 'ana@example.com', dimensoes: ['Ambiental']},
    {nome: 'Bia Souza', email: 'bia@example.com'},
  ];
  const confirmacoes = [];
  let payload;
  let autenticado = false;
  try {
    const credentials = fs.readFileSync('credencias_sigma_agentes.txt', 'utf8');
    const username = credentials.match(/^[ \t]*([^\s:]+[._]gestor)[ \t]*$/mi)?.[1];
    const senha = credentials.match(/^[ \t]*senha[ \t]*[:=][ \t]*([^\r\n]+)/mi)?.[1].trim();
    assert.ok(username && senha, 'Credencial local do gestor indisponível.');
    const login = await page.request.post(base + '/api/auth/login', {data: {username, senha, permanecer_conectado: false}});
    assert.equal(login.status(), 200);
    autenticado = true;
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/api/**', route => {
      const req = route.request();
      const path = new URL(req.url()).pathname;
      if (req.method() === 'POST' && path.endsWith('/comparacao-colaborativa/ambientes')) {
        payload = req.postDataJSON();
        return route.fulfill({status: 422, json: {detail: 'Fim do teste isolado.'}});
      }
      if (req.method() === 'PATCH' && path.endsWith('/ambientes/' + julgamento.id)) {
        const dados = req.postDataJSON();
        confirmacoes.push(dados);
        if (confirmacoes.length === 1) return route.fulfill({status: 422, json: {detail: 'A lista precisa ser conferida.'}});
        julgamento = {...julgamento, convites: dados.convites, lista_colaboradores: dados.convites, total_convites: dados.convites.length};
        return route.fulfill({json: julgamento});
      }
      if (req.method() !== 'GET') { escritas.push(req.method()); return route.abort(); }
      if (path.includes('/api/auth/')) return route.continue();
      if (path.endsWith('/comparacao-colaborativa/ambientes')) return route.fulfill({json: [julgamento]});
      if (path.endsWith('/comparacao-colaborativa/matrizes')) return route.fulfill({json: [matriz]});
      if (path.endsWith('/matrizes/' + matriz.id)) return route.fulfill({json: matriz});
      return route.fulfill({ json: [] });
    });
    await page.goto(base + '/restrict/analise-multicriterio/central-julgamentos');
    await page.locator('#ami-new').click();
    const chooserPromise = page.waitForEvent('filechooser');
    await page.locator('#ami-import-collaborators').click();
    const chooser = await chooserPromise;
    await chooser.setFiles({
      name: 'colaboradores.csv', mimeType: 'text/csv',
      buffer: Buffer.from('Nome do colaborador;E-mail válido;Instituição\nANA   DA SILVA;ana@example.com;Instituto Alfa\nbia souza;bia@example.com\nAna Silva;ANA@example.com')
    });
    const modal = page.locator('#ami-import-modal');
    await modal.waitFor({state: 'visible'});
    assert.deepEqual(await modal.locator('th').allTextContents(), ['', 'Nome do colaborador', 'E-mail do colaborador', 'Instituição', 'Todos']);
    assert.equal(await page.locator('#ami-import-list tr').count(), 3);
    const removeDuplicates = modal.getByRole('button', {name: 'Excluir duplicatas'});
    const confirm = page.locator('#ami-import-confirm');
    const duplicateNotes = modal.locator('.ami-import-duplicate');
    await removeDuplicates.waitFor();
    assert.match(await duplicateNotes.textContent(), /E-mail repetido/);
    assert.equal(await confirm.isDisabled(), true);
    assert.equal(await modal.locator('[data-import-scope-column]:enabled').count(), 0);
    const duplicateButtonStyle = await page.evaluate(() => {
      const style = id => {
        const css = getComputedStyle(document.getElementById(id));
        return [css.width, css.height, css.color, css.borderColor];
      };
      return [style('ami-import-remove-duplicates'), style('ami-judgments-delete-action')];
    });
    assert.deepEqual(...duplicateButtonStyle);
    await page.locator('#ami-import-filter-coluna').selectOption('email');
    await page.locator('#ami-import-filter-valor').selectOption('bia@example.com');
    assert.equal(await page.locator('#ami-import-list tr').count(), 1);
    await removeDuplicates.click();
    assert.equal(await modal.locator('tbody [data-import-scope-row]:checked:enabled').count(), 2);
    assert.equal(await removeDuplicates.isVisible(), false);
    await confirm.click();
    await modal.waitFor({state: 'hidden'});
    assert.equal(await page.locator('#ami-email-list tr').count(), 2);
    assert.equal(await page.locator('#ami-email-list').getByText('Instituto Alfa').count(), 1);
    assert.match(await page.locator('#ami-emails-feedback').textContent(), /Lista confirmada/);

    await page.locator('#ami-collaborator-file').setInputFiles({
      name: 'lista-longa.tsv', mimeType: 'text/tab-separated-values',
      buffer: Buffer.from('Nome\tE-mail\n' + Array.from({length: 16}, (_, index) =>
        `Pessoa ${index + 1}\tpessoa${index + 1}@example.com`).join('\n')),
    });
    await modal.waitFor({state: 'visible'});
    assert.equal(await page.locator('#ami-import-list tr').count(), 15);
    await page.setViewportSize({width: 390, height: 470});
    const previewTable = modal.locator('.ami-table-shell');
    const scrollState = () => previewTable.evaluate(shell => {
      const preview = shell.closest('#ami-import-preview');
      const bounds = element => element.getBoundingClientRect();
      return {
        overflow: shell.scrollHeight - shell.clientHeight,
        modalScrollTop: preview.scrollTop,
        headerTop: bounds(shell.querySelector('thead')).top,
        lastRowBottom: bounds(shell.querySelector('tbody tr:last-child')).bottom,
        tableBottom: bounds(shell).top + shell.clientHeight,
        footerVisible: bounds(preview.querySelector('.admin-table-footer')).bottom <= bounds(preview).bottom,
      };
    });
    const beforeScroll = await scrollState();
    assert.ok(beforeScroll.overflow > 0);
    assert.equal(beforeScroll.footerVisible, true);
    await previewTable.hover();
    await page.mouse.wheel(0, 1500);
    await page.waitForFunction(() => {
      const shell = document.querySelector('#ami-import-preview .ami-table-shell');
      return shell.scrollTop + shell.clientHeight >= shell.scrollHeight - 1;
    });
    const afterScroll = await scrollState();
    assert.equal(afterScroll.modalScrollTop, 0);
    assert.ok(Math.abs(afterScroll.headerTop - beforeScroll.headerTop) <= 1);
    assert.ok(afterScroll.lastRowBottom <= afterScroll.tableBottom + 1);
    await page.setViewportSize({width: 1440, height: 1000});
    await modal.getByRole('checkbox', {name: 'Atribuir todos os grupos a todos os colaboradores filtrados'}).uncheck();
    await page.locator('#ami-import-pagination').getByRole('button', {name: 'Próxima página'}).click();
    assert.match(await page.locator('#ami-import-list').innerText(), /Pessoa 16/);
    assert.equal(await modal.locator('tbody [data-import-scope-row]:checked').count(), 0);
    assert.equal((await scrollState()).overflow, 0);
    await page.locator('#ami-import-cancel').click();
    assert.equal(await page.locator('#ami-email-list tr').count(), 2);

    await page.locator('[data-matrix-mode][value="existing"]').check();
    await page.locator('[data-matrix-select]').selectOption(matriz.id);
    await page.locator('#ami-dimension-options input[value="Ambiental"]').waitFor();
    await page.locator('#ami-dimension-options input[value="Espacial"]').waitFor();
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([['Instruções']]), 'Leia primeiro');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
      ['Cargo', 'E-mail', 'Nome completo'],
      ['Gestor', 'ana@example.com', 'Outra grafia de Ana'],
      ['Analista', 'carla@example.com', '  CARLA   DOS REIS '],
      ['Analista', 'debora@example.com', 'DÉBORA NUNES'],
      ['Analista', 'elisa@example.com', 'Elisa Ramos'],
    ]), 'Colaboradores');
    const workbookFile = {
      name: 'colaboradores.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: Buffer.from(XLSX.write(workbook, {bookType: 'xlsx', type: 'array'})),
    };
    await page.locator('#ami-collaborator-file').setInputFiles(workbookFile);
    await modal.waitFor({state: 'visible'});
    const sourceSelect = page.locator('#ami-import-source');
    const load = page.locator('#ami-import-source-continue');
    await sourceSelect.waitFor();
    assert.equal(await load.isDisabled(), true);
    assert.equal(await page.locator('#ami-import-preview').isVisible(), false);
    assert.deepEqual(await sourceSelect.locator('option').allTextContents(), ['Selecione…', 'Aba: Leia primeiro', 'Aba: Colaboradores']);
    await sourceSelect.selectOption({label: 'Aba: Leia primeiro'});
    await load.click();
    await page.locator('#ami-import-source-feedback').getByText(/e-mail correspondente nas linhas 1/).waitFor();
    await sourceSelect.press('Escape');
    await modal.waitFor({state: 'hidden'});
    await page.locator('#ami-collaborator-file').setInputFiles(workbookFile);
    await sourceSelect.selectOption({label: 'Aba: Colaboradores'});
    await load.click();
    assert.match(await duplicateNotes.textContent(), /Já está na lista de colaboradores/);
    assert.equal(await confirm.isDisabled(), true);
    await removeDuplicates.click();
    assert.equal(await page.locator('#ami-import-list tr').count(), 3);
    const groups = ['Ambiental', 'Social', 'Viabilidade institucional e financeira', 'Espacial'];
    const headers = (await modal.locator('th').allTextContents()).map(text => text.trim().replace(/\s+/g, ' '));
    assert.deepEqual(headers, ['', 'Nome do colaborador', 'E-mail do colaborador', 'Instituição', ...groups, 'Todos']);
    const nameHeader = modal.locator('thead th').nth(1);
    for (const direction of ['ascending', 'descending', 'none']) {
      await nameHeader.click();
      assert.equal(await nameHeader.getAttribute('aria-sort'), direction);
    }
    const scope = (email, group) => modal.locator('tbody tr').filter({hasText: email}).getByRole('checkbox', {name: new RegExp('^'+group+' ·')});
    const bulk = group => modal.getByRole('checkbox', {name: `Atribuir ${group} a todos os colaboradores filtrados`});
    assert.equal(await modal.locator('tbody [data-import-scope-row]:checked').count(), 0);
    await scope('carla@example.com', 'Social').check();
    await page.locator('#ami-import-confirm').click();
    assert.match(await page.locator('#ami-import-feedback').innerText(), /ao menos dois critérios para Carla dos Reis/);
    await page.locator('#ami-import-filter-coluna').selectOption('email');
    await page.locator('#ami-import-filter-valor').selectOption('carla@example.com');
    await bulk('Ambiental').check();
    await page.locator('#ami-import-filter-limpar').click();
    assert.equal(await scope('carla@example.com', 'Ambiental').isChecked(), true);
    assert.equal(await scope('debora@example.com', 'Ambiental').isChecked(), false);
    assert.equal(await bulk('Ambiental').evaluate(box => box.indeterminate), true);
    assert.equal(await scope('carla@example.com', 'Todos os grupos').evaluate(box => box.indeterminate), true);
    await scope('debora@example.com', 'Todos os grupos').check();
    for (const group of groups) assert.equal(await scope('debora@example.com', group).isChecked(), true);
    await scope('debora@example.com', 'Social').uncheck();
    assert.equal(await scope('debora@example.com', 'Todos os grupos').evaluate(box => box.indeterminate), true);
    await scope('debora@example.com', 'Social').check();
    assert.equal(await scope('debora@example.com', 'Todos os grupos').isChecked(), true);
    for (const group of groups) await scope('elisa@example.com', group).check();
    assert.equal(await scope('elisa@example.com', 'Todos os grupos').isChecked(), true);

    const comparar = await page.evaluate(() => {
      const style = selector => getComputedStyle(document.querySelector(selector));
      const header = selector => {
        const css = style(selector);
        return [css.backgroundColor, css.fontFamily, css.fontSize, css.color];
      };
      return {
        original: header('#ami-judgments').slice(1, 3),
        preview: header('#ami-import-list').slice(1, 3),
        originalHead: header('table:has(#ami-judgments) thead tr:not(.cg-linha-grupo) th:nth-child(2)'),
        previewHead: header('table:has(#ami-import-list) thead th:nth-child(2)'),
        zebra: [style('#ami-import-list tr:first-child td:nth-child(2)').backgroundColor,
          style('#ami-import-list tr:nth-child(2) td:nth-child(2)').backgroundColor],
        filters: [style('#ami-filter-coluna').height, style('#ami-import-filter-coluna').height],
      };
    });
    assert.deepEqual(comparar.previewHead, comparar.originalHead);
    assert.deepEqual(comparar.preview, comparar.original);
    assert.deepEqual(comparar.zebra, ['rgb(255, 255, 255)', 'rgb(237, 244, 248)']);
    assert.equal(comparar.filters[0], comparar.filters[1]);
    await page.setViewportSize({width: 390, height: 844});
    assert.equal(await modal.locator('.ami-data-modal__card').evaluate(el => el.getBoundingClientRect().right <= innerWidth + 1), true);
    await page.waitForFunction(() => {
      const shell = document.querySelector('#ami-import-modal .ami-table-shell');
      return shell.scrollWidth > shell.clientWidth && getComputedStyle(shell).overflowX === 'auto';
    });
    const reachableColumns = await previewTable.evaluate(shell => {
      const viewport = shell.getBoundingClientRect();
      const frame = shell.closest('.ami-filtered-table').getBoundingClientRect();
      if (viewport.left < frame.left || viewport.right > frame.right) return [];
      return Array.from(shell.querySelectorAll('thead th'), header => {
        header.scrollIntoView({block: 'nearest', inline: 'center'});
        const {left, right} = header.getBoundingClientRect();
        return left >= viewport.left - 1 && right <= viewport.left + shell.clientWidth + 1;
      });
    });
    assert.deepEqual(reachableColumns, headers.map(() => true));
    await page.setViewportSize({width: 1440, height: 1000});
    assert.equal(await modal.locator('tbody .ami-import-scope input').evaluateAll(boxes => boxes.every(box => {
      const input = box.getBoundingClientRect(), cell = box.parentElement.getBoundingClientRect();
      return Math.abs(input.left + input.width / 2 - cell.left - cell.width / 2) <= 1 &&
        Math.abs(input.top + input.height / 2 - cell.top - cell.height / 2) <= 1;
    })), true);
    assert.equal(await modal.locator('thead .ami-import-scope input').evaluateAll(boxes => boxes.every(box => {
      const input = box.getBoundingClientRect(), title = box.parentElement.querySelector('.smart-column-title').getBoundingClientRect();
      return input.left >= title.right;
    })), true);
    await page.locator('#ami-import-confirm').click();
    await modal.waitFor({state: 'hidden'});
    assert.equal(await page.locator('#ami-email-list tr').count(), 5);

    await page.locator('#ami-collaborator-file').setInputFiles({
      name: 'equipes.xlsx', mimeType: workbookFile.mimeType, buffer: workbookWithTables(),
    });
    await sourceSelect.waitFor();
    assert.deepEqual(await sourceSelect.locator('option').allTextContents(), [
      'Selecione…', 'Aba: Equipes', 'Tabela: EquipeA (Equipes)', 'Tabela: EquipeB (Equipes)',
    ]);
    await sourceSelect.selectOption({label: 'Tabela: EquipeB (Equipes)'});
    await load.click();
    assert.equal(await modal.locator('tbody tr').count(), 1);
    assert.match(await modal.locator('tbody').innerText(), /Marcia Luz/);
    assert.equal(await removeDuplicates.isVisible(), false);
    await page.locator('#ami-import-cancel').click();

    await page.locator('#ami-collaborator-file').setInputFiles({
      name: 'incompleto.csv', mimeType: 'text/csv',
      buffer: Buffer.from('Nome;E-mail\nEdna;edna@example.com\n\nDaniel;'),
    });
    await page.locator('#ami-create-feedback').getByText(/e-mail correspondente nas linhas 4/).waitFor();
    assert.equal(await modal.isVisible(), false);
    assert.equal(await page.locator('#ami-confirm-emails').isDisabled(), true);
    assert.match(await page.locator('#ami-emails-feedback').textContent(), /Lista confirmada/);
    assert.match(await page.locator('#ami-email-list').textContent(), /Ana da Silva.*ana@example.com/);
    assert.match(await page.locator('#ami-email-list').textContent(), /Carla dos Reis.*carla@example.com.*Ambiental · Social/);
    assert.match(await page.locator('#ami-email-list').textContent(), /Débora Nunes.*debora@example.com.*Todos/);
    assert.doesNotMatch(await page.locator('#ami-email-list').textContent(), /Outra grafia de Ana/);
    assert.deepEqual(await page.locator('#ami-email-list').locator('xpath=ancestor::table').locator('th').allTextContents(),
      ['', 'Nome do colaborador', 'E-mail do colaborador', 'Instituição', 'Grupos de critérios', 'Data limite']);
    await page.locator('#ami-judgment-name').fill('Teste de atribuição');
    await page.locator('#ami-deadline').fill('2036-01-01');
    await page.locator('#ami-modo-comparacao').selectOption('por_grupo');
    await page.locator('#ami-create-form button[type="submit"]').click();
    await page.locator('#pfsErrorBox').waitFor({state: 'visible'});
    assert.equal(payload.matriz_id, matriz.id);
    assert.equal(payload.modo_comparacao, 'por_grupo');
    assert.deepEqual(payload.convites.find(item => item.email === 'carla@example.com'), {
      nome: 'Carla dos Reis', email: 'carla@example.com', dimensoes: ['Ambiental', 'Social'],
    });
    assert.deepEqual(payload.convites.find(item => item.email === 'debora@example.com'), {
      nome: 'Débora Nunes', email: 'debora@example.com', dimensoes: null,
    });
    assert.deepEqual(payload.convites.find(item => item.email === 'elisa@example.com'), {
      nome: 'Elisa Ramos', email: 'elisa@example.com', dimensoes: null,
    });
    await page.reload({waitUntil: 'domcontentloaded'});
    await page.locator('[data-lista-colaboradores="julgamento-teste"]').click();
    await modal.waitFor({state: 'visible'});
    assert.equal(await scope('ana@example.com', 'Ambiental').isChecked(), true);
    assert.equal(await scope('ana@example.com', 'Ambiental').isDisabled(), true);
    await page.locator('#ami-import-close').click();

    await page.locator('[data-select-id="julgamento-teste"]').check();
    await page.locator('#ami-environment-edit').click();
    assert.equal(await page.locator('#ami-modo-comparacao').inputValue(), 'todos');
    assert.equal(await page.locator('#ami-modo-comparacao').isDisabled(), true);
    await page.locator('#ami-open-collaborators').click();
    await modal.waitFor({state: 'visible'});
    assert.equal(await modal.locator('th').filter({hasText: 'Espacial'}).count(), 0);
    await scope('ana@example.com', 'Todos os grupos').check();
    await page.locator('#ami-import-cancel').click();
    assert.deepEqual(confirmacoes, []);
    await page.locator('#ami-open-collaborators').click();
    assert.equal(await scope('ana@example.com', 'Todos os grupos').isChecked(), false);
    await scope('ana@example.com', 'Todos os grupos').check();
    await page.locator('#ami-import-confirm').click();
    await page.locator('#ami-import-feedback').getByText('A lista precisa ser conferida', {exact: false}).waitFor();
    await page.locator('#ami-import-confirm').click();
    await modal.waitFor({state: 'hidden'});
    assert.equal(confirmacoes.length, 2);
    assert.equal(confirmacoes[1].versao_lista_colaboradores, versao);
    assert.equal(confirmacoes[1].convites[0].dimensoes, null);
    assert.match(await page.locator('#ami-emails-feedback').innerText(), /salvos no julgamento/);
    await page.reload({waitUntil: 'domcontentloaded'});
    await page.locator('[data-lista-colaboradores="julgamento-teste"]').click();
    assert.equal(await scope('ana@example.com', 'Todos os grupos').isChecked(), true);
    await page.locator('#ami-import-close').click();
    await page.locator('[data-select-id="julgamento-teste"]').check();
    await page.locator('#ami-environment-edit').click();
    await page.locator('#ami-collaborator-file').setInputFiles({
      name: 'somente-duplicatas.csv', mimeType: 'text/csv',
      buffer: Buffer.from('Nome;Email\nOutra grafia; ANA@EXAMPLE.COM'),
    });
    await removeDuplicates.click();
    assert.match(await page.locator('#ami-import-feedback').innerText(), /Todos os registros eram duplicados/);
    assert.equal(await confirm.isDisabled(), true);
    assert.equal(confirmacoes.length, 2);
    await page.locator('#ami-import-close').click();
    await page.locator('#ami-collaborator-file').setInputFiles({
      name: 'novos.csv', mimeType: 'text/csv',
      buffer: Buffer.from('Nome;Email\nOutra grafia; ANA@EXAMPLE.COM\nBia;bia@example.com\nFabio Dias;fabio@example.com\nRepetido;FABIO@example.com'),
    });
    await removeDuplicates.waitFor();
    assert.equal(await duplicateNotes.count(), 3);
    assert.equal(await scope('fabio@example.com', 'Ambiental').first().isDisabled(), true);
    await removeDuplicates.click();
    await scope('fabio@example.com', 'Ambiental').check();
    await confirm.click();
    await modal.waitFor({state: 'hidden'});
    assert.equal(confirmacoes.length, 3);
    assert.deepEqual(confirmacoes[2].convites.map(item => [item.nome, item.email, item.dimensoes]), [
      ['Ana Silva', 'ana@example.com', null], ['Bia Souza', 'bia@example.com', null],
      ['Fabio Dias', 'fabio@example.com', ['Ambiental']],
    ]);
    await page.locator('#ami-new').click();
    await page.locator('#ami-collaborator-file').setInputFiles({
      name: 'lista-paginada.csv', mimeType: 'text/csv',
      buffer: Buffer.from('Nome;Email\n' + Array.from({length: 17}, (_, index) =>
        `Pessoa ${index + 1};pessoa${index + 1}@example.com`).join('\n')),
    });
    await modal.waitFor({state: 'visible'});
    await confirm.click();
    await modal.waitFor({state: 'hidden'});
    await page.locator('#ami-edit-emails').click();
    const todosRascunhos = page.locator('#ami-select-all');
    await todosRascunhos.check();
    assert.match(await page.locator('#ami-emails-count').textContent(), /^17 selecionados/);
    await page.locator('#ami-emails-pagination').getByRole('button', {name: 'Próxima página'}).click();
    const rascunhosVisiveis = page.locator('#ami-email-list [data-draft-index]');
    assert.equal(await page.locator('#ami-email-list [data-draft-index]:checked').count(), 2);
    const preservado = await rascunhosVisiveis.first().getAttribute('aria-label');
    await rascunhosVisiveis.first().uncheck();
    assert.equal(await todosRascunhos.evaluate(input => input.indeterminate), true);
    await page.locator('#ami-delete-emails').click();
    assert.equal(await rascunhosVisiveis.count(), 1);
    assert.equal(await rascunhosVisiveis.first().getAttribute('aria-label'), preservado);
    assert.deepEqual(errors, []);
    assert.deepEqual(escritas, []);
    console.log('Importação CSV/XLSX, seleção de aba e tabela, duplicatas, atribuição de grupos, padrão visual e envio verificados.');
  } finally {
    if (autenticado) await page.request.post(base + '/api/auth/logout').catch(() => {});
    await browser.close();
  }
})().catch(error => { console.error(error); process.exit(1); });
