const assert = require('node:assert/strict');
const fs = require('node:fs');
const {chromium} = require('playwright');
const {espacoAnalitico} = require('./fixtures/central-respostas-dados.cjs');

const base = process.env.SICARD_TEST_URL || 'http://127.0.0.1:8083';
const dataInscricao = '2026-11-23T13:30:00Z';
const convidados = [{nome: 'Pessoa convidada', email: 'convite@example.invalid'}];
const inscritos = Array.from({length: 17}, (_, i) => ({
  inscricao_id: 'inscricao-' + (i + 1), instituicao: 'Instituto Alfa',
  nome: `Inscrito ${String(i + 1).padStart(2, '0')}`, email: `inscrito${i + 1}@example.invalid`,
  registrado_em: dataInscricao, etapa_rotulo: i === 0 ? 'Inscrito' : i === 1 ? 'Em preenchimento' : 'Resposta enviada',
  resposta_recebida: i >= 2,
  resposta_enviada_em: i >= 2 ? '2026-11-24T15:00:00Z' : null,
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
    const errors = [], envios = [], registros = [], exclusoes = [], analisesConsultadas = [];
    let leituras = 0;
    page.on('pageerror', error => errors.push(error.message));
    await context.route('**/api/**', async route => {
      const request = route.request(), {pathname} = new URL(request.url());
      if (pathname.startsWith('/api/auth/')) return route.continue();
      if (pathname.endsWith('/ambientes')) return route.fulfill({json: [convite, publico]});
      if (pathname.endsWith('/espaco-analitico')) {
        const ambienteId = pathname.split('/').at(-2);
        analisesConsultadas.push(ambienteId);
        return route.fulfill({json: espacoAnalitico({ambientes: [convite, publico], respostasPor: {}, analisesPor: {}}, ambienteId)});
      }
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
      if (request.method() === 'DELETE' && pathname.endsWith('/publico/inscricoes/inscricao-17')) {
        exclusoes.push(pathname);
        if (exclusoes.length === 1) return route.fulfill({status: 409, json: {detail: 'A resposta integra uma análise salva.'}});
        const index = inscritos.findIndex(item => item.inscricao_id === 'inscricao-17');
        assert.ok(index >= 0);
        inscritos.splice(index, 1);
        return route.fulfill({status: 204});
      }
      assert.equal(request.method(), 'GET', 'Escrita simulada fora dos controles testados.');
      return route.fulfill({json: []});
    });
    await page.goto(base + '/restrict/analise-multicriterio/central-julgamentos');
    const monitor = page.getByRole('table', {name: 'Tabela de monitoramento das atividades dos colaboradores', exact: true});
    const editar = async id => {
      await page.locator(`#ami-judgments [data-select-id="${id}"]`).check();
      await page.locator('#ami-environment-edit').click();
    };
    const estilo = () => monitor.locator('thead th').evaluateAll(nodes => nodes.map(th => {
      const css = getComputedStyle(th);
      return [css.fontFamily, css.fontSize, css.color, css.backgroundColor, css.padding];
    }));
    await editar('convite');
    await monitor.getByText('Pessoa convidada').waitFor();
    const centralRespostas = page.locator('#ami-monitoring-section').getByRole('link', {name: 'Central de Respostas', exact: true});
    assert.equal(await centralRespostas.getAttribute('href'), '/restrict/analise-multicriterio/central-respostas?julgamento=convite');
    const referencia = await estilo();
    assert.equal(referencia.length, 8);
    assert.equal(await monitor.locator('#ami-monitor-data-header').textContent(), 'Data do primeiro registro de e-mail');
    assert.equal(await page.locator('#ami-monitor-delete').isVisible(), false);
    await page.locator('#ami-judgments [data-select-id="convite"]').uncheck();
    await editar('publico');
    await monitor.getByText('Inscrito 01', {exact: true}).waitFor();
    assert.equal(await page.locator('#ami-public-link-card + #ami-public-monitor-host #ami-monitor-table').count(), 1);
    assert.equal(await page.locator('#ami-email-draft-card').isVisible(), false);
    assert.deepEqual(await estilo(), referencia);
    assert.deepEqual((await monitor.locator('thead th').allTextContents()).slice(1), [
      'Nome do colaborador', 'E-mail do colaborador', 'Instituição',
      'Data da inscrição', 'Status da etapa de colaboração',
      'Status do envio do e-mail de convite', 'Status do envio do e-mail de resposta',
    ]);
    assert.deepEqual((await page.locator('#ami-monitor-filter-coluna option').allTextContents()).slice(1, 4),
      ['Nome do colaborador', 'E-mail do colaborador', 'Instituição']);
    assert.equal(await page.locator('#ami-monitor-filter-coluna option[value="3"]').textContent(), 'Data da inscrição');
    assert.equal(await monitor.locator('tbody tr').count(), 15);
    assert.equal(await monitor.locator('tbody tr').first().locator('td').nth(3).textContent(), 'Instituto Alfa');
    assert.equal(await monitor.locator('tbody tr').first().locator('td').nth(4).textContent(), '23/11/2026, 10:30:00');
    assert.equal(await monitor.locator('[data-email-history="convite"]').count(), 0);
    assert.equal(await monitor.getByText('Não se aplica', {exact: true}).count(), 15);
    assert.equal(await page.locator('#ami-monitor-send').isDisabled(), true);
    assert.equal(await page.locator('#ami-monitor-clear i.fa-broom').count(), 1);
    assert.equal(await page.locator('#ami-monitor-delete i.fa-xmark').count(), 1);
    assert.equal(await page.locator('#ami-monitor-delete').isVisible(), true);
    assert.equal(await page.locator('#ami-monitor-delete').isDisabled(), true);
    await page.locator('#ami-monitor-select-all').check();
    assert.match(await page.locator('#ami-email-status-count').textContent(), /^17 selecionados/);
    assert.equal(await page.locator('#ami-monitor-send-response').isDisabled(), true);
    assert.equal(await page.locator('#ami-monitor-delete').isDisabled(), true);
    await page.locator('#ami-email-status-pagination button').last().click();
    assert.equal(await monitor.locator('tbody input:checked').count(), 2);
    await page.locator('#ami-monitor-clear').click();

    await page.locator('#ami-monitor-filter-coluna').selectOption('4');
    await page.locator('#ami-monitor-filter-valor').selectOption('Resposta enviada');
    await page.locator('#ami-monitor-select-all').check();
    assert.match(await page.locator('#ami-email-status-count').textContent(), /^15 selecionados/);
    const download = page.waitForEvent('download');
    await page.locator('#ami-monitor-export').click();
    const arquivo = await download;
    const csv = fs.readFileSync(await arquivo.path(), 'utf8');
    assert.equal(csv.trimEnd().split('\r\n').length, 16);
    assert.match(csv.split('\r\n')[0], /"Nome do colaborador";"E-mail do colaborador";"Instituição";"Data da inscrição";"Status da etapa de colaboração"/);
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
    const resumo = page.locator('#pfsSuccessBox [data-pfs="success-message"] .pfs-result-paragraph');
    assert.equal(await resumo.count(), 2);
    assert.deepEqual(await resumo.first().locator('.pfs-result-line').allTextContents(), [
      '1 confirmação aceita pelo servidor.', '0 sem envio confirmado.', '0 não tentadas.',
    ]);
    assert.equal(await resumo.last().textContent(), 'Consulte os detalhes por colaborador.');
    assert.equal(envios.length, 1);
    assert.equal(envios[0].destinatario, 'inscrito17@example.invalid');
    assert.ok(envios[0].reenvio_id);
    await page.locator('#pfsStatusOverlay .pfs-box.pfs-active .pfs-close').click();
    await linha.getByRole('button', {name: /Histórico do e-mail de resposta.*Enviado/}).click();
    assert.match(await page.locator('#ami-email-history-body').innerText(), /Comprovante aceito em teste/);
    await page.locator('#ami-email-history-close').click();

    await page.locator('#ami-monitor-delete').click();
    await page.locator('#pfsConfirmCancel').click();
    assert.equal(exclusoes.length, 0);
    await page.locator('#ami-monitor-delete').click();
    await page.locator('#pfsConfirmOk').click();
    await page.getByText(/A resposta integra uma análise salva/).waitFor();
    assert.equal(exclusoes.length, 1);
    assert.equal(await linha.getByText('Inscrito 17').count(), 1);
    await page.locator('#ami-monitor-delete').click();
    await page.locator('#pfsConfirmOk').click();
    await monitor.getByText('Inscrito 17', {exact: true}).waitFor({state: 'detached'});
    assert.equal(exclusoes.length, 2);
    assert.equal(await page.locator('#ami-monitor-delete').isDisabled(), true);
    assert.match(await page.locator('#ami-email-status-count').textContent(), /16/);

    const antes = leituras;
    await page.locator('#ami-monitor-refresh').click();
    assert.ok(leituras > antes);
    const titulo = page.locator('#ami-monitor-table-label');
    const fonteDesktop = await titulo.evaluate(rotulo => parseFloat(getComputedStyle(rotulo).fontSize));
    const grupoColunas = page.getByRole('button', {name: 'Participação e prazos', exact: true});
    assert.equal(await grupoColunas.locator('.cg-rotulo').isVisible(), true);
    for (const width of [390, 320]) {
      await page.setViewportSize({width, height: 844});
      assert.ok(await titulo.evaluate(rotulo => parseFloat(getComputedStyle(rotulo).fontSize)) < fonteDesktop);
      assert.equal(await grupoColunas.locator('.cg-rotulo').isVisible(), false);
      assert.deepEqual(await grupoColunas.evaluate(botao => {
        const {width, height, borderRadius} = getComputedStyle(botao);
        const filtro = getComputedStyle(document.getElementById('ami-filter-inverter'));
        return [width === height, width === filtro.width, height === filtro.height, borderRadius,
          getComputedStyle(botao, '::before').content];
      }), [true, true, true, '50%', '"P"']);
      const filtro = page.getByRole('search', {name: 'Filtrar atividades dos colaboradores'});
      assert.equal(await filtro.evaluate(barra => {
        const area = barra.getBoundingClientRect();
        const texto = new Range();
        texto.selectNodeContents(barra.querySelector('.admin-filter-label'));
        return texto.getClientRects().length === 1 && [...barra.children].every(controle => {
          const bordas = controle.getBoundingClientRect();
          return bordas.left >= area.left && bordas.right <= area.right && bordas.top >= area.top && bordas.bottom <= area.bottom;
        });
      }), true);
      assert.equal(await monitor.locator('..').evaluate(wrap => wrap.scrollWidth > wrap.clientWidth), true);
    }
    const grupoAtivo = await grupoColunas.getAttribute('aria-pressed');
    await grupoColunas.click();
    assert.equal(await grupoColunas.getAttribute('aria-pressed'), grupoAtivo === 'true' ? 'false' : 'true');
    assert.equal(await centralRespostas.getAttribute('href'), '/restrict/analise-multicriterio/central-respostas?julgamento=publico');
    const [abaRespostas] = await Promise.all([context.waitForEvent('page'), centralRespostas.click()]);
    await abaRespostas.waitForURL('**/central-respostas?julgamento=publico');
    await abaRespostas.getByRole('heading', {name: 'Análise e consolidação das respostas', exact: true}).waitFor();
    assert.match(await abaRespostas.locator('#ami-analysis-context').textContent(), /Consulta pública/);
    assert.match(page.url(), /\/central-julgamentos$/);
    assert.equal(await centralRespostas.isVisible(), true);
    assert.deepEqual(analisesConsultadas, ['publico']);
    assert.deepEqual(errors, []);
    console.log('Monitoramento em edição: controles verificados e Central de Respostas aberta no julgamento selecionado.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
