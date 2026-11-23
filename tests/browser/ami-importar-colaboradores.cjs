const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const XLSX = require('../../assets/vendor/xlsx/xlsx-0.18.5.min.js');
const base = process.env.SICARD_TEST_URL || 'http://127.0.0.1:8083';

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage(), errors = [], escritas = [];
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
      if (req.method() !== 'GET') { escritas.push(req.method()); return route.abort(); }
      if (new URL(req.url()).pathname.includes('/api/auth/')) return route.continue();
      return route.fulfill({ json: [] });
    });
    await page.goto(base + '/restrict/analise-multicriterio/central-julgamentos');
    await page.locator('#ami-new').click();
    const chooserPromise = page.waitForEvent('filechooser');
    await page.locator('#ami-import-collaborators').click();
    const chooser = await chooserPromise;
    await chooser.setFiles({
      name: 'colaboradores.csv', mimeType: 'text/csv',
      buffer: Buffer.from('Nome do colaborador;E-mail válido\nAna Silva;ana@example.com\nBia Souza;bia@example.com\nAna Silva;ANA@example.com')
    });
    const modal = page.locator('#ami-import-modal');
    await modal.waitFor({state: 'visible'});
    assert.deepEqual(await modal.locator('th').allTextContents(), ['', 'Nome do colaborador', 'E-mail']);
    assert.equal(await page.locator('#ami-import-list tr').count(), 3);
    await page.locator('#ami-import-search').fill('Bia');
    assert.equal(await page.locator('#ami-import-list tr').count(), 1);
    await page.locator('#ami-import-clear').click();
    await page.locator('#ami-import-confirm').click();
    await modal.waitFor({state: 'hidden'});
    assert.equal(await page.locator('#ami-email-list tr').count(), 2);
    assert.match(await page.locator('#ami-emails-feedback').textContent(), /1 registro\(s\) com e-mail repetido/);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
      ['Cargo', 'E-mail', 'Nome completo'],
      ['Gestor', 'ana@example.com', 'Outra grafia de Ana'],
      ['Analista', 'carla@example.com', 'Carla Reis'],
    ]), 'Colaboradores');
    await page.locator('#ami-collaborator-file').setInputFiles({
      name: 'colaboradores.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: Buffer.from(XLSX.write(workbook, {bookType: 'xlsx', type: 'array'})),
    });
    await modal.waitFor({state: 'visible'});
    await page.locator('#ami-import-confirm').click();
    await modal.waitFor({state: 'hidden'});
    assert.equal(await page.locator('#ami-email-list tr').count(), 3);

    await page.locator('#ami-collaborator-file').setInputFiles({
      name: 'incompleto.csv', mimeType: 'text/csv',
      buffer: Buffer.from('Nome;E-mail\nEdna;edna@example.com\n\nDaniel;'),
    });
    await page.locator('#ami-create-feedback').getByText(/e-mail correspondente nas linhas 4/).waitFor();
    assert.equal(await modal.isVisible(), false);
    await page.locator('#ami-confirm-emails').click();
    assert.match(await page.locator('#ami-emails-feedback').textContent(), /Lista confirmada/);
    assert.match(await page.locator('#ami-email-list').textContent(), /Carla Reis.*carla@example.com/);
    assert.doesNotMatch(await page.locator('#ami-email-list').textContent(), /Outra grafia de Ana/);
    assert.deepEqual(await page.locator('#ami-email-list').locator('xpath=ancestor::table').locator('th').allTextContents(),
      ['', 'Colaboradores', 'E-mail colaborador', 'Data limite']);
    assert.deepEqual(errors, []);
    assert.deepEqual(escritas, []);
    console.log('Importação CSV e XLSX por nome e e-mail, sem matriz, com prévia, aviso de linhas incompletas e confirmação da lista.');
  } finally {
    if (autenticado) await page.request.post(base + '/api/auth/logout').catch(() => {});
    await browser.close();
  }
})().catch(error => { console.error(error); process.exit(1); });
