const assert = require('node:assert/strict');
const fs = require('node:fs');
const {chromium} = require('playwright');

(async () => {
  const browser = await chromium.launch({headless: true});
  let authenticated = false;
  try {
    const page = await browser.newPage({viewport: {width: 1440, height: 1000}, timezoneId: 'America/Sao_Paulo'});
    const credentials = fs.readFileSync('credencias_sigma_agentes.txt', 'utf8');
    const credential = label => {
      const match = credentials.match(new RegExp('^' + label + '\\s*[:=]\\s*(.+)$', 'mi'));
      if (!match) throw new Error('Credencial local indisponível.');
      return match[1].trim();
    };
    await page.goto('http://127.0.0.1:8083/public/login/?next=%2Frestrict%2Fanalise-multicriterio%2Fcentral-respostas');
    await page.locator('[name=login]').fill(credential('Username'));
    await page.locator('[name=senha]').fill(credential('Senha inicial'));
    await page.getByRole('button', {name: 'Entrar', exact: true}).click();
    await page.waitForURL('**/restrict/**');
    authenticated = true;
    await page.waitForFunction(() => Boolean(window.SICARDEmailConvites));
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const env = '00000000-0000-4000-8000-000000000001';
    const email = 'confirmacao@example.org';
    const evento = (tipo, ocorrido_em, detalhe) => ({
      tipo, ocorrido_em, detalhe, fonte: tipo,
      coletado_em: '2026-11-06T12:00:00Z',
      origem_data: tipo === 'leitura' ? 'Date do relatório MDN' : 'Last-Attempt-Date do relatório DSN',
    });
    let rows = ['convite', 'resposta'].map(natureza => ({
      id: natureza, natureza, destinatario: email, criado_em: '2026-11-05T17:00:00Z',
      envio_status: 'aceito_smtp', entrega_status: 'sem_confirmacao', leitura_status: 'sem_confirmacao',
      dsn_solicitada: true, eventos: [], detalhe: 'Aceito em teste',
    }));
    let coletaAutomatica = {ativa: true, erro: '', intervalo_segundos: 30};
    let monitoramentoIndisponivel = false;
    await page.route('**/api/ahp/comparacao-colaborativa/ambientes/' + env + '/emails/**', route => {
      assert.equal(route.request().method(), 'GET', 'Este teste não envia emails nem grava dados');
      if (monitoramentoIndisponivel) {
        return route.fulfill({status: 503, json: {detail: 'Falha sintética de conexão.'}});
      }
      return route.fulfill({json: {registros: rows, coleta_automatica: coletaAutomatica,
        colaboradores: [{nome: 'Teste', email, resposta_recebida: true}]}});
    });
    const carregar = async () => {
      await page.evaluate(({env, email}) => {
        SICARDEmailConvites.modo('view');
        SICARDEmailConvites.mostrar({id: env, convites: [{nome: 'Teste', email}]}, '', '');
      }, {env, email});
      await page.waitForFunction(() => document.querySelectorAll('#ami-email-deliveries .ami-cell-link').length === 2);
      await page.waitForFunction(() => !document.querySelector('#ami-email-status').textContent.includes('Carregando'));
    };
    const status = () => page.locator('#ami-email-deliveries .ami-cell-link').allTextContents();
    await carregar();
    assert.deepEqual(await status(), ['Enviado', 'Enviado']);
    rows = rows.map(row => ({...row, entrega_status: 'adiada',
      eventos: [evento('adiada', '2026-11-05T17:30:00Z', 'smtp; 452 mailbox temporarily unavailable')]}));
    await carregar();
    assert.deepEqual(await status(), Array(2).fill('Recusado temporariamente pelo destinatário'));
    rows = rows.map(row => ({...row, entrega_status: 'confirmada',
      eventos: [...row.eventos, evento('confirmada', '2026-11-05T18:00:00Z', 'smtp; 250 delivered')]}));
    await carregar();
    assert.deepEqual(await status(), ['Entregue', 'Entregue']);
    await page.evaluate(() => {
      document.getElementById('ami-email-draft-card').classList.remove('is-hidden');
      document.querySelector('#ami-email-deliveries .ami-cell-link').click();
    });
    rows = rows.map(row => ({...row, leitura_status: 'confirmada',
      eventos: [...row.eventos, evento('leitura', '2026-11-05T18:10:00Z', 'manual-action/MDN-sent-manually; displayed')]}));
    await page.waitForFunction(() => Array.from(document.querySelectorAll('#ami-email-deliveries .ami-cell-link'))
      .every(button => button.textContent === 'Lido'), null, {timeout: 12000});
    assert.deepEqual(await status(), ['Lido', 'Lido']);
    assert.equal(await page.locator('#ami-email-history-body tr').first().locator('td').nth(2).textContent(),
      '05/11/2026, 15:10:00', 'O modal aberto deve atualizar sem clique nem nova abertura');
    await page.locator('#ami-email-history-close').evaluate(button => button.click());
    for (const index of [0, 1]) {
      await page.locator('#ami-email-deliveries .ami-cell-link').nth(index).evaluate(button => button.click());
      const cells = page.locator('#ami-email-history-body tr').first().locator('td');
      assert.equal(await cells.nth(1).textContent(), '05/11/2026, 15:00:00');
      assert.equal(await cells.nth(2).textContent(), '05/11/2026, 15:10:00');
      assert((await cells.nth(3).textContent()).includes('452 mailbox temporarily unavailable'));
      assert((await cells.nth(3).textContent()).includes('Consultado em 06/11/2026'));
      await page.locator('#ami-email-history-close').evaluate(button => button.click());
    }
    coletaAutomatica = {...coletaAutomatica, erro: 'Falha sintética na coleta automática.'};
    await page.waitForFunction(() => document.getElementById('ami-email-status').textContent
      .includes('Falha sintética na coleta automática.'));
    coletaAutomatica = {...coletaAutomatica, erro: ''};
    rows = rows.map(row => ({...row, eventos: []}));
    await carregar();
    assert.deepEqual(await status(), ['Lido', 'Lido']);
    await page.locator('#ami-email-deliveries .ami-cell-link').first().evaluate(button => button.click());
    assert.deepEqual(await page.locator('#ami-email-history-body tr').first().locator('td').allTextContents(),
      ['', 'Data não informada', 'Data não informada', '05/11/2026, 14:00:00 · Enviado. Aceito em teste']);
    monitoramentoIndisponivel = true;
    await page.waitForFunction(() => document.getElementById('ami-email-status').textContent
      .includes('Histórico indisponível.'), null, {timeout: 12000});
    monitoramentoIndisponivel = false;
    await page.waitForFunction(() => document.getElementById('ami-email-status').textContent
      .includes('Histórico de envios carregado.'), null, {timeout: 12000});
    assert.deepEqual(await status(), ['Lido', 'Lido'], 'A tela deve se recuperar de falhas sem atualização manual');
    assert.deepEqual(errors, []);
    console.log('PASS: convite e resposta, Entregue, Lido, atualização automática do modal, falhas visíveis, recuperação sem clique e datas dos retornos.');
  } catch (error) {
    console.error(authenticated ? error : 'Falha de autenticação; detalhes omitidos.');
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
