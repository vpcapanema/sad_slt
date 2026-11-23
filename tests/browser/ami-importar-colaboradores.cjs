const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const XLSX = require('../../assets/vendor/xlsx/xlsx-0.18.5.min.js');
const base = process.env.SICARD_TEST_URL || 'http://127.0.0.1:8083';

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
  let payload;
  let autenticado = false;
  try {
    const credentials = fs.readFileSync('credencias_sigma_agentes.txt', 'utf8');
    const username = 'sigma.agente_gestor';
    const senha = credentials.match(/^[ \t]*senha[ \t]*[:=][ \t]*([^\r\n]+)/mi)?.[1].trim();
    assert.ok(credentials.includes(username) && senha, 'Credencial local do gestor indisponível.');
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
      if (req.method() !== 'GET') { escritas.push(req.method()); return route.abort(); }
      if (path.includes('/api/auth/')) return route.continue();
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
      buffer: Buffer.from('Nome do colaborador;E-mail válido\nANA   DA SILVA;ana@example.com\nbia souza;bia@example.com\nAna Silva;ANA@example.com')
    });
    const modal = page.locator('#ami-import-modal');
    await modal.waitFor({state: 'visible'});
    assert.deepEqual(await modal.locator('th').allTextContents(), ['', 'Nome do colaborador', 'E-mail', 'Todos']);
    assert.equal(await page.locator('#ami-import-list tr').count(), 3);
    assert.equal(await modal.locator('tbody [data-import-scope-row]:checked').count(), 3);
    await page.locator('#ami-import-filter-coluna').selectOption('email');
    await page.locator('#ami-import-filter-valor').selectOption('bia@example.com');
    assert.equal(await page.locator('#ami-import-list tr').count(), 1);
    await page.locator('#ami-import-filter-limpar').click();
    await page.locator('#ami-import-confirm').click();
    await modal.waitFor({state: 'hidden'});
    assert.equal(await page.locator('#ami-email-list tr').count(), 2);
    assert.match(await page.locator('#ami-emails-feedback').textContent(), /1 registro\(s\) com e-mail repetido/);

    await page.locator('#ami-collaborator-file').setInputFiles({
      name: 'lista-longa.tsv', mimeType: 'text/tab-separated-values',
      buffer: Buffer.from('Nome\tE-mail\n' + Array.from({length: 16}, (_, index) =>
        `Pessoa ${index + 1}\tpessoa${index + 1}@example.com`).join('\n')),
    });
    await modal.waitFor({state: 'visible'});
    assert.equal(await page.locator('#ami-import-list tr').count(), 15);
    await modal.getByRole('checkbox', {name: 'Atribuir todos os grupos a todos os colaboradores filtrados'}).uncheck();
    await page.locator('#ami-import-pagination').getByRole('button', {name: 'Próxima página'}).click();
    assert.match(await page.locator('#ami-import-list').innerText(), /Pessoa 16/);
    assert.equal(await modal.locator('tbody [data-import-scope-row]:checked').count(), 0);
    await page.locator('#ami-import-cancel').click();
    assert.equal(await page.locator('#ami-email-list tr').count(), 2);

    await page.locator('[data-matrix-mode][value="existing"]').check();
    await page.locator('[data-matrix-select]').selectOption(matriz.id);
    await page.locator('#ami-dimension-options input[value="Ambiental"]').waitFor();
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
      ['Cargo', 'E-mail', 'Nome completo'],
      ['Gestor', 'ana@example.com', 'Outra grafia de Ana'],
      ['Analista', 'carla@example.com', '  CARLA   DOS REIS '],
      ['Analista', 'debora@example.com', 'DÉBORA NUNES'],
      ['Analista', 'elisa@example.com', 'Elisa Ramos'],
    ]), 'Colaboradores');
    await page.locator('#ami-collaborator-file').setInputFiles({
      name: 'colaboradores.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: Buffer.from(XLSX.write(workbook, {bookType: 'xlsx', type: 'array'})),
    });
    await modal.waitFor({state: 'visible'});
    const groups = ['Ambiental', 'Social', 'Viabilidade institucional e financeira'];
    const headers = (await modal.locator('th').allTextContents()).map(text => text.trim().replace(/\s+/g, ' '));
    assert.deepEqual(headers, ['', 'Nome do colaborador', 'E-mail', ...groups, 'Todos']);
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
      name: 'incompleto.csv', mimeType: 'text/csv',
      buffer: Buffer.from('Nome;E-mail\nEdna;edna@example.com\n\nDaniel;'),
    });
    await page.locator('#ami-create-feedback').getByText(/e-mail correspondente nas linhas 4/).waitFor();
    assert.equal(await modal.isVisible(), false);
    await page.locator('#ami-confirm-emails').click();
    assert.match(await page.locator('#ami-emails-feedback').textContent(), /Lista confirmada/);
    assert.match(await page.locator('#ami-email-list').textContent(), /Ana da Silva.*ana@example.com/);
    assert.match(await page.locator('#ami-email-list').textContent(), /Carla dos Reis.*carla@example.com.*Ambiental · Social/);
    assert.match(await page.locator('#ami-email-list').textContent(), /Débora Nunes.*debora@example.com.*Todos/);
    assert.doesNotMatch(await page.locator('#ami-email-list').textContent(), /Outra grafia de Ana/);
    assert.deepEqual(await page.locator('#ami-email-list').locator('xpath=ancestor::table').locator('th').allTextContents(),
      ['', 'Colaboradores', 'E-mail colaborador', 'Grupos de critérios', 'Data limite']);
    await page.locator('#ami-judgment-name').fill('Teste de atribuição');
    await page.locator('#ami-deadline').fill('2036-01-01');
    await page.locator('#ami-create-form button[type="submit"]').click();
    await page.locator('#pfsErrorBox').waitFor({state: 'visible'});
    assert.equal(payload.matriz_id, matriz.id);
    assert.deepEqual(payload.convites.find(item => item.email === 'carla@example.com'), {
      nome: 'Carla dos Reis', email: 'carla@example.com', dimensoes: ['Ambiental', 'Social'],
    });
    assert.deepEqual(payload.convites.find(item => item.email === 'debora@example.com'), {
      nome: 'Débora Nunes', email: 'debora@example.com',
    });
    assert.deepEqual(payload.convites.find(item => item.email === 'elisa@example.com'), {
      nome: 'Elisa Ramos', email: 'elisa@example.com',
    });
    assert.deepEqual(errors, []);
    assert.deepEqual(escritas, []);
    console.log('Importação CSV/XLSX, colunas por grupo, atribuição em lote, Todos, padrão visual e envio verificados.');
  } finally {
    if (autenticado) await page.request.post(base + '/api/auth/logout').catch(() => {});
    await browser.close();
  }
})().catch(error => { console.error(error); process.exit(1); });
