const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage(), errors = [];
    const credentials = fs.readFileSync('credencias_sigma_agentes.txt', 'utf8');
    const credential = label => {
      const match = credentials.match(new RegExp('^' + label + '\\s*[:=]\\s*(.+)$', 'mi'));
      if (!match) throw new Error('Credencial local indisponível.');
      return match[1].trim();
    };
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:8083/public/login/?next=%2Frestrict%2Fanalise-multicriterio%2Fcentral-julgamentos');
    await page.locator('[name=login]').fill(credential('Username'));
    await page.locator('[name=senha]').fill(credential('Senha inicial'));
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await page.waitForURL('**/restrict/**');
    await page.route('**/api/**', route => {
      const path = new URL(route.request().url()).pathname;
      if (path.startsWith('/api/auth/')) return route.fallback();
      const body = path === '/api/auth/me' ? { id: 'u', nome: 'Analista', tipo_usuario: 'ANALISTA' }
        : path === '/api/auth/session' ? { authenticated: true, user: { id: 'u', tipo_usuario: 'ANALISTA' } }
        : [];
      route.fulfill({ json: body });
    });
    await page.goto('http://127.0.0.1:8083/restrict/analise-multicriterio/central-julgamentos');
    await page.locator('#ami-new').click();
    await page.locator('[data-matrix-mode][value=new]').check();
    await page.locator('[data-matrix-file]').setInputFiles({
      name: 'criterios.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ linhas: [
        { Etapa: 'Fase 3', criterio: 'C1', dimensao: 'Ambiental' },
        { Etapa: 'Fase 3', criterio: 'C2', dimensao: 'Ambiental' },
        { Etapa: 'Fase 3', criterio: 'C3', dimensao: 'Social' }
      ] }))
    });
    await page.locator('[data-matrix-feedback]').filter({ hasText: 'Arquivo carregado' }).waitFor();
    await page.locator('#ami-import-collaborators').click();
    await page.locator('#ami-collaborator-file').setInputFiles({
      name: 'colaboradores.csv', mimeType: 'text/csv',
      buffer: Buffer.from('Nome do colaborador;E-mail válido\nAna Silva;ana@example.com\nBia Souza;bia@example.com')
    });
    await page.locator('#ami-import-modal:not([hidden])').waitFor();
    assert.equal(await page.locator('#ami-import-list tr').count(), 2);
    await page.locator('#ami-import-list [value="Ambiental"]').first().check();
    await page.locator('#ami-import-list [value="Ambiental"]').nth(1).check();
    await page.locator('#ami-import-confirm').click();
    assert.equal(await page.locator('#ami-import-modal').getAttribute('hidden'), '');
    assert.equal(await page.locator('#ami-email-list tr').count(), 2);
    assert.match(await page.locator('#ami-email-list').textContent(), /Ana Silva/);
    assert.match(await page.locator('#ami-email-list').textContent(), /ana@example.com/);
    assert.match(await page.locator('#ami-email-list').textContent(), /Ambiental/);
    assert.deepEqual(errors, []);
    console.log('Importação de colaboradores com prévia e dimensões OK.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
