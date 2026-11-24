const assert = require('node:assert/strict');
const fs = require('node:fs');
const {chromium} = require('playwright');

const base = process.env.SICARD_TEST_URL || 'http://127.0.0.1:8083';
const dataInscricao = '2026-11-23T13:30:00Z';
const convidados = [{nome: 'Pessoa convidada', email: 'convite@example.invalid'}];
const inscritos = Array.from({length: 17}, (_, i) => ({
  nome: `Inscrito ${String(i + 1).padStart(2, '0')}`, email: `inscrito${i + 1}@example.invalid`,
  registrado_em: dataInscricao, etapa_rotulo: i === 0 ? 'Inscrito' : i === 1 ? 'Em preenchimento' : 'Resposta enviada',
  resposta_recebida: i >= 2,
}));
const ambiente = {status: 'ativa', valido_ate: '2035-12-31T23:59:59-03:00', n_criterios: 2, criterios: [], convites: []};
const convite = {...ambiente, id: 'convite', nome: 'Julgamento com convite', convites: convidados};
const publico = {...ambiente, id: 'publico', nome: 'Consulta pública', modo_participacao: 'publico', total_inscritos: inscritos.length,
  url_publica: 'https://example.invalid/sicard/public/analise-multicriterio/participar/rodada/'};

(async () => {
  const browser = await chromium.launch({channel: 'msedge', headless: true});
  try {
    const context = await browser.newContext({viewport: {width: 1440, height: 900}, timezoneId: 'America/Sao_Paulo'});
    const credenciais = fs.readFileSync('credencias_sigma_agentes.txt', 'utf8');
    const username = credenciais.match(/^[ \t]*([^\s:]+[._]gestor)[ \t]*$/mi)?.[1];
    const senha = credenciais.match(/^[ \t]*senha[ \t]*[:=][ \t]*([^\r\n]+)/mi)?.[1].trim();
    assert.ok(username && senha, 'Credencial local do gestor indisponível.');
    const login = await context.request.post(base + '/api/auth/login', {data: {username, senha, permanecer_conectado: false}});
    assert.equal(login.status(), 200);
    const page = await context.newPage();
    const errors = [], envios = [], registros = [];
    let leituras = 0;
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/api/**', async route => {
      const request = route.request(), {pathname} = new URL(request.url());
      if (pathname.startsWith('/api/auth/')) return route.continue();
      if (pathname.endsWith('/ambientes')) return route.fulfill({json: [convite, publico]});
      if (pathname.endsWith('/emails/configuracao')) return route.fulfill({json: {}});
      if (pathname.endsWith('/emails/monitoramento')) {
        if (pathname.includes('/publico/emails')) {
          leituras++;
          return route.fulfill({json: {colaboradores: inscritos, registros, confirmacoes_configuradas: false}});
        }
        return route.fulfill({json: {colaboradores: convidados, registros: [], confirmacoes_configuradas: false}});
      }
      if (pathname.endsWith('/publico/emails/resposta/enviar')) {
        envios.push(request.postDataJSON());
        const registro = {id: 'comprovante-teste', natureza: 'resposta', destinatario: envios.at(-1).destinatario,
          criado_em: '2026-11-24T16:00:00Z', envio_status: 'aceito_smtp', entrega_status: 'sem_confirmacao',
          leitura_status: 'sem_confirmacao', detalhe: 'Comprovante aceito em teste'};
        registros.push(registro);
        return route.fulfill({json: registro});
      }
      assert.equal(request.method(), 'GET', 'A única escrita simulada permitida é o comprovante de resposta.');
      return route.fulfill({json: []});
    });
    await page.goto(base + '/restrict/analise-multicriterio/central-julgamentos');
    const monitor = page.locator('#ami-monitor-table');
    const editar = async id => {
      await page.locator(`#ami-judgments [data-select-id="${id}"]`).check();
      await page.locator('#ami-environment-edit').click();
    };
    const estilo = () => monitor.locator('thead th').evaluateAll(nodes => nodes.map(th => {
      const css = getComputedStyle(th);
      return [th.textContent.trim(), css.fontFamily, css.fontSize, css.color, css.backgroundColor, css.padding];
    }));
    await editar('convite');
    await monitor.getByText('Pessoa convidada').waitFor();
    const referencia = await estilo();
    assert.equal(referencia.length, 7);
    await page.locator('#ami-judgments [data-select-id="convite"]').uncheck();
    await editar('publico');
    await monitor.getByText('Inscrito 01', {exact: true}).waitFor();
    assert.equal(await page.locator('#ami-public-link-card + #ami-public-monitor-host #ami-monitor-table').count(), 1);
    assert.equal(await page.locator('#ami-email-draft-card').isVisible(), false);
    assert.deepEqual(await estilo(), referencia);
    assert.equal(await monitor.locator('tbody tr').count(), 15);
    assert.equal(await monitor.locator('tbody tr').first().locator('td').nth(3).textContent(), '23/11/2026, 10:30:00');
    assert.equal(await monitor.locator('[data-email-history="convite"]').count(), 0);
    assert.equal(await monitor.getByText('Não se aplica', {exact: true}).count(), 15);
    assert.equal(await page.locator('#ami-monitor-send').isDisabled(), true);
    await page.locator('#ami-monitor-select-all').check();
    assert.match(await page.locator('#ami-email-status-count').textContent(), /^17 selecionados/);
    assert.equal(await page.locator('#ami-monitor-send-response').isDisabled(), true);
    await page.locator('#ami-email-status-pagination button').last().click();
    assert.equal(await monitor.locator('tbody input:checked').count(), 2);
    await page.locator('#ami-monitor-clear').click();

    await page.locator('#ami-monitor-filter-coluna').selectOption('3');
    await page.locator('#ami-monitor-filter-valor').selectOption('Resposta enviada');
    await page.locator('#ami-monitor-select-all').check();
    assert.match(await page.locator('#ami-email-status-count').textContent(), /^15 selecionados/);
    const download = page.waitForEvent('download');
    await page.locator('#ami-monitor-export').click();
    const arquivo = await download;
    const csv = fs.readFileSync(await arquivo.path(), 'utf8');
    assert.equal(csv.trimEnd().split('\r\n').length, 16);
    assert.match(csv, /inscrito17@example.invalid/);
    assert.doesNotMatch(csv, /inscrito1@example.invalid/);

    await page.locator('#ami-monitor-clear').click();
    await page.locator('#ami-monitor-filter-limpar').click();
    await page.locator('#ami-email-status-pagination button').last().click();
    assert.equal(await monitor.locator('tbody tr').count(), 2);
    const linha = monitor.locator('tbody tr').last();
    await linha.locator('input[type="checkbox"]').check();
    await page.locator('#ami-monitor-send-response').click();
    await page.locator('#pfsConfirmOk').click();
    await page.getByText('Confirmações de resposta', {exact: true}).waitFor();
    assert.equal(envios.length, 1);
    assert.equal(envios[0].destinatario, 'inscrito17@example.invalid');
    assert.ok(envios[0].reenvio_id);
    await page.locator('#pfsStatusOverlay .pfs-box.pfs-active .pfs-close').click();
    await linha.getByRole('button', {name: /E-mail resposta.*Enviado/}).click();
    assert.match(await page.locator('#ami-email-history-body').innerText(), /Comprovante aceito em teste/);
    await page.locator('#ami-email-history-close').click();

    const antes = leituras;
    await page.locator('#ami-monitor-refresh').click();
    assert.ok(leituras > antes);
    await page.setViewportSize({width: 390, height: 844});
    assert.equal(await page.locator('#ami-monitor-filter-coluna').isVisible(), true);
    assert.equal(await monitor.locator('..').evaluate(wrap => wrap.scrollWidth > wrap.clientWidth), true);
    assert.deepEqual(errors, []);
    console.log('Monitoramento público em edição, filtros, seleção, paginação, exportação, atualização e comprovante simulado verificados.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
