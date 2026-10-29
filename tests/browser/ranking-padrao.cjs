const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs'), http = require('node:http'), path = require('node:path');
const {execFileSync} = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const rota = '/restrict/hierarquizacao/homologacao-ranking-publicacao/';
const referencia = '/restrict/analise-multicriterio/central-julgamentos';
const processos = '/restrict/hierarquizacao/processos/';
const geometria = {tipo: 'Polygon', coordinates: [[[-48, -23], [-47.9, -23], [-47.9, -22.9], [-48, -23]]]};
const statusDemanda = [
  'analise_rascunho', 'analise_em_avaliacao', 'analise_aguardando_complementacao',
  'analise_aprovada', 'analise_reprovada', 'analise_suspensa', 'analise_cancelada',
  'hierarq_em_andamento', 'hierarq_aguardando_complementacao', 'hierarq_finalizada',
  'hierarq_homologada', 'hierarq_publicada', 'hierarq_ranqueada', 'hierarq_suspensa', 'hierarq_retirada',
  'exec_em_execucao', 'exec_suspensa', 'exec_finalizada', 'exec_cancelada',
];
function rodada(codigo, tipo, quantidade = 3) {
  const objetos = Array.from({length: quantidade}, (_, i) => ({
    cabecalho_objeto: {codigo: `${codigo}-D${i + 1}`, demanda_id: `${codigo}-id${i + 1}`,
      nome: i ? `Demanda ${i + 1}` : '  CONSTRUÇÃO   DE PONTE NA SP-270  ', status: 'analise_aprovada', latitude: -23, longitude: -48},
    hierarquizacao: {
      fase_1: {executada: true, status_fase1: 'apto', resumo_elegibilidade: {indice_de_risco_ambiental_e_territorial: 0.1}},
      fase_2: {executada: true, indice_favorabilidade_rede: 0.7, indice_favorabilidade_grade: 0.8,
        valor_por_criterio: {mobilidade: {nome: 'Mobilidade', peso: 0.6}}},
      fase_3: {executada: true, score_fase3: 0.9, pesos_fase3: {'Maturidade': 0.4, 'Benefício': 0.6}},
      sintese: {executada: true, posicao_final: i + 1, score_final: 0.8,
        contribuicoes: {favorabilidade_rede: 0.7, favorabilidade_grade: 0.8, prioridade: 0.9}},
    },
  }));
  return {codigo, nome: `Grupo ${codigo}`, status: 'calculada', tipo_demanda: tipo,
    ranking: objetos.map((o, i) => ({...o.cabecalho_objeto, posicao: i + 1, score: 0.8})).reverse(),
    dados_hierarquizacao: {cabecalho_grupo: {sintese: {operador: 'media_simples'}}, objetos}};
}
(async () => {
  const paginas = JSON.parse(execFileSync(path.join(root, '.venv', 'Scripts', 'python.exe'), ['-B', '-X', 'utf8', '-c', [
    'import json', 'from fastapi.testclient import TestClient', 'from api.server import app, templates',
    `rotas = ${JSON.stringify([rota, referencia, processos])}`, 'client = TestClient(app)',
    'from api.services.session_service import SessionUser, cookie_name, create_token',
    'client.cookies.set(cookie_name(), create_token(SessionUser("fixture", "", "fixture_admin", "Fixture", "ADMIN")))',
    'respostas = {rota: client.get(rota) for rota in rotas}', 'assert all(r.status_code == 200 for r in respostas.values())',
    'paginas = {rota: r.text for rota, r in respostas.items()}',
    'paginas["componente"] = templates.env.get_template("componentes/mapa_ranking.html").module.mapa_ranking(prefixo="teste")',
    'print(json.dumps(paginas))',
  ].join('\n')], {cwd: root, encoding: 'utf8'}));
  const server = http.createServer((req, res) => {
    const nome = new URL(req.url, 'http://local').pathname;
    if (paginas[nome]) { res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(paginas[nome]); return; }
    const arquivo = path.resolve(root, '.' + nome.replace(/^\/restrict\/hierarquizacao\//, '/hierarquizacao/'));
    if (path.relative(root, arquivo).startsWith('..')) { res.writeHead(403).end(); return; }
    fs.readFile(arquivo, (erro, dados) => {
      if (erro) { res.writeHead(404).end(); return; }
      res.setHeader('Content-Type', arquivo.endsWith('.js') ? 'text/javascript; charset=utf-8' : arquivo.endsWith('.css') ? 'text/css' : 'application/octet-stream');
      res.end(dados);
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({channel: process.env.SICARD_TEST_BROWSER || 'msedge', headless: true, args: ['--no-proxy-server']});
    const page = await browser.newPage({viewport: {width: 1600, height: 1000}});
    const erros = [];
    page.on('pageerror', e => erros.push(e.stack || e.message));
    const rodadas = [rodada('H1', 'projeto', 32), rodada('H2', 'plano'), rodada('H3', 'programa')];
    const desatualizada = rodada('VELHA', 'projeto');
    desatualizada.relatorio_consolidado = {desatualizado: true};
    rodadas.push(desatualizada, {...rodada('RASCUNHO', 'plano'), status: 'rascunho'});
    const demandas = rodadas.flatMap(h => h.ranking.map(r => ({
      id: r.codigo, tipo: h.tipo_demanda, status: statusDemanda[(r.posicao - 1) % statusDemanda.length],
      geometria: {...geometria, coordinates: geometria.coordinates.map(anel => anel.map(([lng, lat]) => [lng + r.posicao / 10, lat]))},
    })));
    let falharMapa = false, vazia = false;
    await page.route('https://**/*', route => route.abort());
    await page.route('**/api/**', route => {
      const p = new URL(route.request().url()).pathname;
      if (p === '/api/painel/demandas/internas' && falharMapa) return route.fulfill({status: 503, json: {detail: 'Banco indisponível'}});
      const json = p === '/api/auth/me' ? {id: 'u1', nome: 'Teste', tipo_usuario: 'ADMIN'}
        : p === '/api/auth/session' ? {authenticated: true}
        : p === '/api/ahp/hierarquizacoes' ? vazia ? [] : rodadas
        : p === '/api/painel/demandas/internas' ? demandas : [];
      return route.fulfill({json});
    });
    const base = `http://127.0.0.1:${server.address().port}`;
    await page.goto(base + rota);
    const hierTable = page.locator('.ranking-hier-table');
    const host = page.locator('.ami-report-table:has(.ranking-hier-table)');
    await host.locator('.admin-table-summary').waitFor();
    assert.equal(await host.locator('tbody tr').count(), 3, 'somente finalizadas e atuais');
    assert.equal(await host.getByRole('button', {name: 'Publicar', exact: true}).isDisabled(), true);
    assert.equal(await host.getByRole('button', {name: 'Visualizar', exact: true}).isDisabled(), true);
    assert.equal(await page.locator('[data-ranking-tree]').count(), 0, 'servir somente canvas');
    assert.equal(await page.locator('#ranking-mapa-section').isVisible(), false, 'mapa inicia oculto');
    assert.equal(await page.locator('#ranking-objetos-section').isVisible(), false, 'tabela inicia oculta');
    assert.equal(await page.locator('.ranking-marker-pin').count(), 0);
    const nomes = await page.evaluate(() => [
      SLTRankingDados.dadosRanking({tipo_demanda: 'projeto', ranking: [{nome: '  CONSTRUÇÃO   DE PONTE NA SP-270 '} ]})[0].nome,
      SLTRankingDados.dadosRanking({tipo_demanda: 'projeto', ranking: [{nome: 'aMPLIAÇÃO dE Via em São Paulo'}]})[0].nome,
      SLTRankingDados.indice(null), SLTRankingDados.indice(0),
      SLTRankingDados.objetoPorRanking({dados_hierarquizacao: {objetos: [{cabecalho_objeto: {codigo: 'ERRADO'}}, {cabecalho_objeto: {codigo: 'CERTO'}}]}}, {codigo: 'CERTO'}).cabecalho_objeto.codigo,
    ]);
    assert.deepEqual(nomes, ['  CONSTRUÇÃO   DE PONTE NA SP-270 ', 'aMPLIAÇÃO dE Via em São Paulo', '—', '0.0000', 'CERTO']);
    const nome = host.getByRole('button', {name: 'Grupo H1', exact: true});
    await nome.click();
    const modal = page.locator('#ranking-detalhes-modal');
    await modal.waitFor({state: 'visible'});
    assert.equal(await page.locator('#ranking-objetos-section').isVisible(), false, 'nome abre modal, não seleciona ranking');
    assert.equal(await page.locator('#ranking-mapa-section').isVisible(), false, 'modal não revela mapa');
    assert.match(await modal.innerText(), /Índice de risco ambiental e territorial/);
    assert.match(await modal.innerText(), /Maturidade: 0.4/);
    assert.match(await modal.innerText(), /Mobilidade: 0.6/);
    assert.ok((await modal.textContent()).includes('  CONSTRUÇÃO   DE PONTE NA SP-270  '), 'modal preserva o nome cadastrado');
    assert.match(await modal.innerText(), /Rede: 1\/3; territorial: 1\/3; prioridade: 1\/3/);
    assert.equal(await modal.locator('thead th').count(), 12);
    assert.equal(await modal.locator('.admin-filter-bar').count(), 1);
    assert.match(await modal.textContent(), /utilizado na composição do Índice de prioridade da Fase 3/);
    const resumoTable = modal.locator('table');
    const titulosResumo = ['', 'Posição final', 'Demanda', 'Índice geral de hierarquização', 'Pesos da síntese',
      'Elegibilidade territorial', 'Índice de risco ambiental e territorial', 'Índice de favorabilidade de rede',
      'Índice de favorabilidade territorial', 'Pesos da Fase 2', 'Índice de prioridade', 'Pesos da Fase 3'];
    assert.deepEqual(await resumoTable.locator('thead th').allTextContents(), titulosResumo);
    assert.equal(await resumoTable.locator('tbody tr').first().locator('td').nth(1).textContent(), '1º');
    assert.equal(await resumoTable.locator('tbody tr').first().locator('td').nth(3).textContent(), '0.8000');
    assert.equal(await modal.locator('.ranking-filter-divider').count(), 1);
    const gruposColunas = [
      {nome: 'pesos', ocultas: ['Pesos da síntese', 'Pesos da Fase 2', 'Pesos da Fase 3'], quantidade: 3},
      {nome: 'índices das fases', ocultas: ['Índice de risco ambiental e territorial', 'Índice de favorabilidade de rede', 'Índice de favorabilidade territorial', 'Índice de prioridade'], quantidade: 4},
      {nome: 'elegibilidade', ocultas: ['Elegibilidade territorial'], quantidade: 1},
    ];
    for (const grupo of gruposColunas) {
      const botao = modal.getByRole('button', {name: `Mostrar/ocultar ${grupo.nome}`, exact: true});
      assert.equal(await botao.getAttribute('aria-pressed'), 'false');
      await botao.click();
      assert.equal(await botao.getAttribute('aria-pressed'), 'true');
      assert.deepEqual(await resumoTable.locator('thead th[hidden]').allTextContents(), grupo.ocultas);
      assert.equal(await resumoTable.locator('tbody tr').first().locator('td[hidden]').count(), grupo.quantidade);
      await modal.getByRole('button', {name: 'Última página', exact: true}).click();
      assert.equal(await resumoTable.locator('tbody tr').count(), 2);
      assert.equal(await resumoTable.locator('tbody tr').first().locator('td[hidden]').count(), grupo.quantidade);
      await modal.getByRole('combobox', {name: 'Coluna do filtro', exact: true}).selectOption({label: 'Posição final'});
      await modal.getByRole('combobox', {name: 'Valor do filtro', exact: true}).selectOption({label: '2º'});
      assert.equal(await resumoTable.locator('tbody tr').count(), 1);
      assert.equal(await resumoTable.locator('tbody tr').first().locator('td[hidden]').count(), grupo.quantidade);
      await modal.getByRole('button', {name: 'Limpar filtros', exact: true}).click();
      await botao.click();
      assert.equal(await resumoTable.locator('thead th[hidden]').count(), 0);
    }
    for (const grupo of gruposColunas) await modal.getByRole('button', {name: `Mostrar/ocultar ${grupo.nome}`, exact: true}).click();
    assert.deepEqual(await resumoTable.locator('thead th:not([hidden])').allTextContents(), ['', 'Posição final', 'Demanda', 'Índice geral de hierarquização']);
    await modal.getByRole('checkbox', {name: 'Selecionar registro', exact: true}).first().check();
    const [exportacaoResumo] = await Promise.all([
      page.waitForEvent('download'), modal.getByRole('button', {name: 'Exportar selecionados', exact: true}).click(),
    ]);
    assert.match(fs.readFileSync(await exportacaoResumo.path(), 'utf8'), /Pesos da síntese/, 'ocultar não elimina dados da exportação');
    await page.keyboard.press('Escape');
    assert.equal(await nome.evaluate(el => el === document.activeElement), true);
    await nome.click();
    assert.equal(await modal.locator('thead th[hidden]').count(), 0, 'reabrir restaura todas as colunas');
    await page.keyboard.press('Escape');
    await host.locator('tbody tr').first().getByRole('checkbox').check();
    await host.getByRole('button', {name: 'Visualizar', exact: true}).click();
    assert.equal(await page.locator('#ranking-objetos-titulo').textContent(), 'Ranking de projetos do grupo Grupo H1 aptos à implementação');
    assert.equal(await page.locator('#ranking-mapa-section').isVisible(), true);
    await page.waitForFunction(() => document.querySelectorAll('#ranking-map .ranking-marker-pin').length === 32);
    const molduras = await page.locator('#ranking-map .ranking-marker-wrap, #ranking-map .ranking-label-wrap').evaluateAll(es =>
      es.map(e => ({border: getComputedStyle(e).borderWidth, background: getComputedStyle(e).backgroundColor})));
    molduras.forEach(m => {
      assert.equal(m.border, '0px', 'papel de botão do Leaflet não cria retângulo ao redor do símbolo');
      assert.equal(m.background, 'rgba(0, 0, 0, 0)');
    });
    const labelEstilo = await page.locator('#ranking-map .ranking-position-label[data-posicao="4"]').evaluate(e => {
      const s = getComputedStyle(e);
      return {font: parseFloat(s.fontSize), background: s.backgroundColor, color: s.color, radius: s.borderRadius, shadow: s.boxShadow};
    });
    assert.ok(labelEstilo.font >= 17);
    assert.equal(labelEstilo.background, 'rgb(0, 59, 90)');
    assert.equal(labelEstilo.color, 'rgb(255, 255, 255)');
    assert.equal(labelEstilo.radius, '999px');
    assert.notEqual(labelEstilo.shadow, 'none');
    const podio = await page.locator('#ranking-map .ranking-position-label').evaluateAll(es =>
      es.slice(0, 3).map(e => ({posicao: e.dataset.posicao, cor: getComputedStyle(e).backgroundColor})));
    assert.deepEqual(podio, [
      {posicao: '1', cor: 'rgb(255, 196, 0)'},
      {posicao: '2', cor: 'rgb(203, 213, 225)'},
      {posicao: '3', cor: 'rgb(184, 115, 51)'},
    ]);
    await page.waitForTimeout(100);
    const deslocamento = await page.locator('#ranking-map .ranking-position-label[data-posicao="1"]').evaluate(e =>
      new DOMMatrixReadOnly(getComputedStyle(e).transform).m42);
    assert.equal(deslocamento, -60, 'posição preferencial 12px acima da anterior');
    assert.equal(await page.locator('.ranking-marker-label').count(), 0);
    assert.ok(await page.locator('#ranking-map svg path').count() >= 32);
    assert.equal(await page.locator('#ranking-mapa-legenda').isVisible(), true);
    assert.equal(await page.locator('#ranking-map #ranking-mapa-legenda').count(), 0, 'legenda fora do canvas');
    assert.match(await page.locator('#ranking-mapa-legenda').textContent(), /Legenda das demandas/);
    const fasesLegenda = await page.locator('#ranking-mapa-legenda .status-color-legend-fase').evaluateAll(es =>
      es.map(e => e.getBoundingClientRect().toJSON()));
    assert.equal(fasesLegenda.length, 3);
    assert.equal(fasesLegenda[0].top, fasesLegenda[1].top);
    assert.equal(fasesLegenda[1].top, fasesLegenda[2].top);
    assert.ok(fasesLegenda[0].right < fasesLegenda[1].left && fasesLegenda[1].right < fasesLegenda[2].left);
    const basePadrao = await page.evaluate(() => {
      const el = document.createElement('div');
      el.style.cssText = 'height:200px;width:300px'; document.body.append(el);
      const mapa = SLTPainelMapControls.initPainelMap(el);
      const urls = Object.values(mapa._layers).filter(l => l instanceof L.TileLayer).map(l => l._url);
      mapa.remove(); el.remove();
      return urls;
    });
    assert.deepEqual(basePadrao, ['https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png']);
    const cores = await page.evaluate(() => {
      return [...document.querySelectorAll('#ranking-map .ranking-marker-pin')].map(pin => {
        const referencia = document.createElement('div');
        referencia.innerHTML = SLTStatusColors.leafletPinIcon(pin.dataset.status, 'demanda', L).options.html;
        return {status: pin.dataset.status, mapa: pin.querySelector('svg').outerHTML,
          referencia: referencia.querySelector('svg').outerHTML};
      });
    });
    assert.deepEqual([...new Set(cores.map(c => c.status))].sort(), [...statusDemanda].sort(), 'todos os status atuais representados');
    for (const [i, cor] of cores.entries()) {
      assert.equal(cor.status, statusDemanda[i % statusDemanda.length], 'cadastro atual prevalece sobre snapshot');
      assert.equal(cor.mapa, cor.referencia, 'mapa usa o alfinete canônico dos painéis, por fase e status');
    }
    assert.equal(await page.locator('#ranking-mapa-legenda .ranking-marker-pin').count(), 0);
    assert.equal(await page.locator('#ranking-mapa-legenda .status-legend-pin').count(), 3);
    assert.equal(await page.locator('#ranking-mapa-legenda .status-color-legend-item').count(), statusDemanda.length);
    const legendaPadrao = await page.evaluate(() => {
      const el = document.createElement('div');
      SLTStatusColors.renderLegend(el, {layout: 'demandas', tipoDemanda: 'projeto'});
      return {gotasRanking: el.querySelectorAll('.ranking-marker-pin').length,
        fases: el.querySelectorAll('.status-legend-pin').length};
    });
    assert.deepEqual(legendaPadrao, {gotasRanking: 0, fases: statusDemanda.length}, 'outras legendas preservam sua simbologia');
    const ranking = page.locator('#ranking-objetos-section .ami-report-table');
    assert.equal(await ranking.locator('tbody tr').count(), 15);
    assert.deepEqual(await ranking.locator('tbody .ranking-posicao').allTextContents(), Array.from({length: 15}, (_, i) => `${i + 1}º`));
    assert.match(await ranking.innerText(), /CONSTRUÇÃO DE PONTE NA SP-270/);
    await page.evaluate(() => {
      window.enquadramentos = [];
      const original = L.Map.prototype.fitBounds;
      L.Map.prototype.fitBounds = function(bounds, options) {
        window.enquadramentos.push({oeste: bounds.getWest(), leste: bounds.getEast(), maxZoom: options?.maxZoom});
        return original.call(this, bounds, options);
      };
    });
    await ranking.locator('tbody tr[data-demanda="H1-D2"] .ranking-objeto-identidade').click();
    const bounds = await page.evaluate(() => window.enquadramentos.at(-1));
    assert.ok(Math.abs(bounds.oeste - (-47.8)) < 1e-8);
    assert.ok(Math.abs(bounds.leste - (-47.7)) < 1e-8);
    assert.equal(bounds.maxZoom, 16, 'zoom sobre a geometria exata, não o grupo');
    const antesSeletor = await page.evaluate(() => window.enquadramentos.length);
    await ranking.locator('tbody tr[data-demanda="H1-D2"] input').check();
    assert.equal(await page.evaluate(() => window.enquadramentos.length), antesSeletor, 'checkbox não enquadra');
    await ranking.locator('tbody tr[data-demanda="H1-D2"] input').uncheck();
    await ranking.getByRole('button', {name: 'Última página', exact: true}).click();
    assert.equal(await ranking.locator('tbody tr').count(), 2);
    await ranking.locator('tbody tr').first().focus();
    await page.keyboard.press('Enter');
    assert.ok(Math.abs((await page.evaluate(() => window.enquadramentos.at(-1))).oeste - (-44.9)) < 1e-8, 'linha da segunda página mantém vínculo com geometria');
    await ranking.getByRole('combobox', {name: 'Coluna do filtro', exact: true}).selectOption({label: 'Objeto de demanda'});
    await ranking.getByRole('combobox', {name: 'Valor do filtro', exact: true}).selectOption({label: 'Demanda 2H1-D2'});
    assert.equal(await ranking.locator('tbody tr').count(), 1);
    await ranking.locator('tbody tr').focus();
    await page.keyboard.press('Space');
    assert.ok(Math.abs((await page.evaluate(() => window.enquadramentos.at(-1))).oeste - (-47.8)) < 1e-8, 'linha filtrada mantém vínculo');
    await ranking.getByRole('checkbox', {name: 'Selecionar registro', exact: true}).check();
    const [download] = await Promise.all([page.waitForEvent('download'), ranking.getByRole('button', {name: 'Exportar selecionados', exact: true}).click()]);
    assert.equal(download.suggestedFilename(), 'registros.csv');
    await ranking.getByRole('button', {name: 'Limpar filtros', exact: true}).click();
    await page.evaluate(() => { window.abertos = []; window.open = (...args) => window.abertos.push(args); });
    await host.getByRole('button', {name: 'Visualizar no painel restrito', exact: true}).click();
    await host.getByRole('button', {name: 'Visualizar no painel público', exact: true}).click();
    assert.deepEqual(await page.evaluate(() => window.abertos.map(a => a[0])), ['/restrict/painel/', '/public/painel/']);
    await host.getByRole('checkbox', {name: 'Selecionar todos os registros filtrados', exact: true}).check();
    assert.equal(await host.getByRole('button', {name: 'Visualizar', exact: true}).isDisabled(), true);
    await host.getByRole('checkbox', {name: 'Selecionar todos os registros filtrados', exact: true}).uncheck();
    await host.getByRole('combobox', {name: 'Coluna do filtro', exact: true}).selectOption({label: 'Tipo de demanda'});
    await host.getByRole('combobox', {name: 'Valor do filtro', exact: true}).selectOption({label: 'Plano'});
    assert.equal(await host.locator('tbody tr').count(), 1);
    await host.getByRole('checkbox', {name: 'Selecionar registro', exact: true}).check();
    await host.getByRole('button', {name: 'Visualizar', exact: true}).click();
    assert.equal(await page.locator('#ranking-objetos-titulo').textContent(), 'Ranking de planos do grupo Grupo H2 aptos à implementação');
    assert.equal(await page.locator('#ranking-map .ranking-marker-pin').count(), 3, 'mapa troca para o mesmo grupo da tabela');
    await host.getByRole('button', {name: 'Limpar filtros', exact: true}).click();
    const estilo = el => {
      const s = getComputedStyle(el);
      return {font: s.fontFamily, size: s.fontSize, weight: s.fontWeight, line: s.lineHeight, color: s.color, background: s.backgroundColor, padding: s.padding};
    };
    const refPage = await browser.newPage({viewport: {width: 1600, height: 1000}});
    try {
      await refPage.route('https://**/*', route => route.abort());
      await refPage.route('**/api/**', route => route.fulfill({json: []}));
      await refPage.goto(base + referencia);
      assert.deepEqual(await hierTable.locator('thead th').nth(1).evaluate(estilo),
        await refPage.locator('table:has(#ami-judgments) thead th').nth(1).evaluate(estilo));
      await refPage.locator('#ami-judgments').evaluate(body => { body.innerHTML = '<tr><td class="col-select"><input type="checkbox"></td><td>Referência</td></tr><tr><td class="col-select"><input type="checkbox"></td><td>Referência 2</td></tr>'; });
      assert.deepEqual(await hierTable.locator('tbody td').nth(2).evaluate(estilo),
        await refPage.locator('#ami-judgments tr').first().locator('td').nth(1).evaluate(estilo), 'células seguem tipografia e espaçamento');
      assert.equal(await host.locator('.admin-filter-bar').evaluate(el => el.getBoundingClientRect().height), 32);
      assert.equal(await hierTable.locator('thead th').first().evaluate(el => el.getBoundingClientRect().width), 44);
      const zebra = await ranking.locator('tbody tr').evaluateAll(rows => rows.slice(0, 2).map(row => getComputedStyle(row.cells[1]).backgroundColor));
      assert.deepEqual(zebra, ['rgb(255, 255, 255)', 'rgb(237, 244, 248)']);
      await nome.click();
      await refPage.locator('#ami-judgments-modal').evaluate(el => el.classList.remove('is-hidden'));
      assert.deepEqual(await modal.locator('.json-modal-head').evaluate(estilo),
        await refPage.locator('#ami-judgments-modal .json-modal-head').evaluate(estilo));
      await page.keyboard.press('Escape');
      await refPage.goto(base + processos);
      const botaoEstilo = el => {
        const s = getComputedStyle(el);
        return {font: s.fontFamily, size: s.fontSize, height: s.height, padding: s.padding, background: s.backgroundImage, radius: s.borderRadius};
      };
      const publicarEstilo = await host.getByRole('button', {name: 'Publicar', exact: true}).evaluate(botaoEstilo);
      const controleEstilo = await host.locator('.admin-actions .view').evaluate(botaoEstilo);
      assert.deepEqual({...publicarEstilo, padding: ''}, {...controleEstilo, padding: ''});
    } finally { await refPage.close(); }
    // O componente completo usa a mesma macro e o mesmo controlador do canvas.
    await page.evaluate(([html, h, demandas]) => {
      const div = document.createElement('div'); div.innerHTML = html; document.querySelector('main').append(div);
      window.componenteTeste = SLTRankingMapa.criar(div.querySelector('[data-ranking-map]'), {hierarquizacoes: h, demandas});
    }, [paginas.componente, rodadas.filter(h => h.tipo_demanda !== 'programa'), demandas]);
    const full = page.locator('[data-ranking-map]:has([data-ranking-tree])');
    assert.equal(await full.locator('.layer-group--tipo').count(), 2, 'tipo sem finalizadas fica oculto');
    assert.equal(await full.locator('.ranking-layer-group').count(), 2);
    assert.equal(await full.locator('.ranking-marker-pin').count(), 35);
    await full.getByRole('checkbox', {name: 'Exibir Plano no mapa', exact: true}).uncheck();
    assert.equal(await full.locator('.ranking-marker-pin').count(), 32);
    await full.getByRole('checkbox', {name: 'Exibir Grupo Grupo H1 no mapa', exact: true}).uncheck();
    assert.equal(await full.locator('.ranking-marker-pin').count(), 0);
    await full.getByRole('checkbox', {name: 'Exibir Grupo Grupo H1 no mapa', exact: true}).check();
    await full.locator('[data-hierarquizacao="H1"]').getByRole('checkbox', {name: 'Exibir 1º —   CONSTRUÇÃO   DE PONTE NA SP-270   no mapa', exact: true}).uncheck();
    assert.equal(await full.locator('.ranking-marker-pin').count(), 31);
    await page.evaluate(() => componenteTeste.definirPoliticaPublicacao(h => h.codigo === 'H2'));
    assert.equal(await full.locator('.ranking-layer-group').count(), 1, 'filtro de publicação remove grupo da árvore');
    assert.equal(await full.locator('.ranking-marker-pin').count(), 0, 'visibilidade do tipo continua desativada');
    await full.getByRole('checkbox', {name: 'Exibir Plano no mapa', exact: true}).check();
    assert.equal(await full.locator('.ranking-marker-pin').count(), 3);
    await page.evaluate(() => componenteTeste.definirPoliticaPublicacao(() => false));
    assert.equal(await full.locator('.ranking-marker-pin').count(), 0);
    const geometrias = await page.evaluate(([h, demandas]) => {
      const grupos = ['plano', 'programa', 'projeto'].map(tipo => ({...h, codigo: `${h.codigo}-${tipo}`, tipo_demanda: tipo}));
      const cadastro = grupos.flatMap(g => demandas.filter(d => d.tipo === 'projeto' && d.id.startsWith('H1-')).map(d => ({...d, tipo: g.tipo_demanda})));
      componenteTeste.atualizar(grupos, cadastro);
      componenteTeste.definirPoliticaPublicacao(() => true);
      return [...document.querySelectorAll('[data-ranking-map]:has([data-ranking-tree]) .leaflet-overlay-pane path:not(.ranking-marker-connector)')].map((p, i) => {
        const tipo = grupos[Math.floor(i / h.ranking.length)].tipo_demanda;
        const codigo = cadastro.find(d => d.tipo === tipo && d.id === `H1-D${i % h.ranking.length + 1}`).status;
        const st = SLTStatusColors.STATUS_DEMANDA[codigo];
        return {tipo, codigo, contorno: p.getAttribute('stroke'), esperado: st.text,
          preenchimento: p.getAttribute('fill'), liso: st.row};
      });
    }, [rodadas[0], demandas]);
    assert.equal(geometrias.length, 96);
    for (const g of geometrias) {
      assert.equal(g.contorno, g.esperado);
      assert.equal(g.preenchimento, g.tipo === 'projeto' ? g.liso : `url(#slt-fill-${g.tipo}-${g.codigo})`);
    }
    await page.evaluate(([h, demandas]) => {
      componenteTeste.atualizar([h], demandas.map(d => d.id === 'H2-D1' ? {...d, status: 'desconhecido'} : d));
    }, [rodadas[1], demandas]);
    assert.match(await full.locator('[data-ranking-map-status]').innerText(), /status da demanda ausente ou não reconhecido/);
    assert.equal(await full.locator('.ranking-marker-pin').count(), 2, 'status desconhecido não recebe cor presumida');
    const centroides = await page.evaluate(([h, demandas]) => {
      const formas = [
        {type: 'Polygon', coordinates: [[[-48, -23], [-42, -23], [-48, -20], [-48, -23]]]},
        {type: 'Polygon', coordinates: [
          [[0, 0], [6, 0], [6, 6], [0, 6], [0, 0]],
          [[0, 0], [3, 0], [3, 3], [0, 3], [0, 0]],
        ]},
        {type: 'MultiPolygon', coordinates: [
          [[[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]]],
          [[[4, 0], [8, 0], [8, 4], [4, 4], [4, 0]]],
        ]},
      ];
      const posicoes = [];
      const original = L.marker;
      L.marker = function(latlng, options) {
        if (options.icon?.options.className === 'ranking-marker-wrap') posicoes.push([latlng.lng, latlng.lat]);
        return original(latlng, options);
      };
      try {
        for (const forma of formas) {
          for (const inverter of [false, true]) {
            const geo = structuredClone(forma);
            if (inverter) {
              const partes = geo.type === 'Polygon' ? [geo.coordinates] : geo.coordinates;
              partes.forEach(aneis => aneis.forEach(anel => anel.reverse()));
            }
            componenteTeste.atualizar([h], demandas.map(d => ({...d, geometria: geo})));
          }
        }
      } finally { L.marker = original; }
      return posicoes;
    }, [rodadas[1], demandas]);
    const esperados = [[-46, -22], [3.5, 3.5], [5, 1.8]];
    assert.equal(centroides.length, 18);
    centroides.forEach((p, i) => {
      const esperado = esperados[Math.floor(i / 6)];
      assert.ok(Math.abs(p[0] - esperado[0]) < 1e-10 && Math.abs(p[1] - esperado[1]) < 1e-10,
        'centroide de área exato para triângulo, vazios e multipolígonos, nas duas orientações');
    });
    await page.evaluate(([h, demandas]) => {
      const original = L.marker;
      window.marcasCoincidentes = [];
      L.marker = function(latlng, options) {
        const marca = original(latlng, options);
        if (options.icon?.options.className === 'ranking-marker-wrap') window.marcasCoincidentes.push(marca);
        return marca;
      };
      try {
        componenteTeste.atualizar([{...h, codigo: 'COINCIDENTES'}], demandas.map(d => ({
          ...d, geometria: {type: 'Polygon', coordinates: [[[-48, -23], [-42, -23], [-48, -20], [-48, -23]]]},
        })));
      } finally { L.marker = original; }
    }, [rodadas[0], demandas]);
    const verificarSobreposicoes = async () => {
      await page.waitForTimeout(150);
      const estado = await full.evaluate(el => {
        const numeros = [...el.querySelectorAll('.ranking-position-label')].map(n => n.getBoundingClientRect().toJSON());
        const conflitos = numeros.flatMap((a, i) => numeros.slice(i + 1).filter(b =>
          a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top));
        return {quantidade: numeros.length, conflitos: conflitos.length,
          ancoras: marcasCoincidentes.map(m => [m.getLatLng().lng, m.getLatLng().lat]),
          retangulos: marcasCoincidentes[0]._map && Object.values(marcasCoincidentes[0]._map._layers).filter(l => l instanceof L.Rectangle).length,
          simbolos: [...el.querySelectorAll('.ranking-marker-pin')].map(pin => ({
            transform: getComputedStyle(pin).transform, rect: pin.getBoundingClientRect().toJSON(),
          })),
          rotulo: {font: parseFloat(getComputedStyle(el.querySelector('.ranking-position-label')).fontSize),
            altura: numeros[0].height,
            pane: Number(getComputedStyle(el.querySelector('.leaflet-ranking-labels-pane')).zIndex),
            simboloPane: Number(getComputedStyle(el.querySelector('.leaflet-marker-pane')).zIndex)},
        };
      });
      assert.equal(estado.quantidade, 32);
      assert.equal(estado.conflitos, 0, 'todas as posições ficam legíveis, inclusive demandas 2 e 3');
      assert.equal(estado.retangulos, 0, 'nenhum retângulo envolvente é desenhado');
      assert.ok(estado.rotulo.font >= 15 && estado.rotulo.altura >= 30, 'rótulo ampliado e estilizado');
      assert.ok(estado.rotulo.pane > estado.rotulo.simboloPane, 'rótulos na frente de todos os alfinetes');
      estado.simbolos.forEach(pin => {
        assert.equal(pin.transform, 'none', 'símbolos nunca deslocados, nem visualmente');
        assert.equal(pin.rect.x, estado.simbolos[0].rect.x);
        assert.equal(pin.rect.y, estado.simbolos[0].rect.y);
      });
      estado.ancoras.forEach(([lng, lat]) => {
        assert.ok(Math.abs(lng + 46) < 1e-10 && Math.abs(lat + 22) < 1e-10,
          'deslocamento visual não altera o centroide geográfico');
      });
    };
    await verificarSobreposicoes();
    await full.getByText('3º', {exact: true}).click();
    assert.match(await full.locator('.leaflet-popup-content').innerText(), /Posição: 3º/);
    await full.locator('.leaflet-popup-close-button').click();
    await page.evaluate(() => marcasCoincidentes[0]._map.zoomIn(1, {animate: false}));
    await verificarSobreposicoes();
    await full.getByRole('checkbox', {name: 'Exibir Grupo Grupo H1 no mapa', exact: true}).uncheck();
    assert.equal(await full.locator('.ranking-marker-pin').count(), 0);
    await full.getByRole('checkbox', {name: 'Exibir Grupo Grupo H1 no mapa', exact: true}).check();
    await verificarSobreposicoes();
    await page.evaluate(([h, demandas]) => {
      h.dados_hierarquizacao.objetos[0].cabecalho_objeto.geometria = {type: 'Polygon', coordinates: []};
      const restantes = demandas.filter(d => d.id !== h.ranking.find(r => r.posicao === 1).codigo);
      componenteTeste.definirPoliticaPublicacao(() => true);
      componenteTeste.atualizar([h], restantes);
    }, [rodadas[1], demandas]);
    assert.equal(await full.locator('.ranking-marker-pin').count(), 2, 'geometria inválida não vira ponto substituto');
    assert.match(await full.locator('[data-ranking-map-status]').innerText(), /Não foram criados pontos substitutos/);
    assert.equal(await full.locator('.ranking-layer-record input:disabled').count(), 1);
    await page.evaluate(() => componenteTeste.destruir());
    await page.setViewportSize({width: 390, height: 844});
    const fasesMobile = await page.locator('#ranking-mapa-legenda .status-color-legend-fase').evaluateAll(es =>
      es.map(e => e.getBoundingClientRect().toJSON()));
    assert.ok(fasesMobile[0].bottom <= fasesMobile[1].top && fasesMobile[1].bottom <= fasesMobile[2].top);
    await nome.click();
    const dimensoes = await modal.locator('.json-modal').evaluate(el => {
      const r = el.getBoundingClientRect(); return {left: r.left, right: r.right, width: innerWidth};
    });
    assert.ok(dimensoes.left >= 0 && dimensoes.right <= dimensoes.width);
    await page.keyboard.press('Escape');
    await page.goto(base + rota + '?codigo=H1');
    await page.locator('#ranking-objetos-section').waitFor({state: 'visible'});
    assert.match(await page.locator('#ranking-objetos-titulo').textContent(), /Grupo H1/);
    falharMapa = true;
    await page.reload();
    await page.locator('.ranking-map-status').waitFor({state: 'visible'});
    await page.waitForFunction(() => document.querySelector('.ranking-map-status').textContent.includes('Não foi possível'));
    assert.match(await page.locator('.ranking-map-status').innerText(), /Não foi possível carregar as geometrias reais/);
    assert.equal(await host.locator('tbody tr').count(), 3, 'erro de mapa não impede consulta da tabela');
    for (let i = 4; i < 21; i++) rodadas.push(rodada(`H${i}`, 'projeto', 1));
    falharMapa = false;
    await page.goto(base + rota);
    await host.locator('.admin-table-summary').waitFor();
    assert.equal(await host.locator('tbody tr').count(), 15);
    await host.getByRole('button', {name: 'Última página', exact: true}).click();
    assert.equal(await host.locator('tbody tr').count(), 5);
    falharMapa = false; vazia = true;
    await page.goto(base + rota);
    await host.locator('.admin-table-summary').waitFor();
    assert.match(await host.innerText(), /Nenhum registro encontrado/);
    assert.equal(await page.locator('#ranking-mapa-section').isVisible(), false);
    assert.deepEqual(erros, []);
    console.log('PASS: tabelas, ações, detalhes, nomes, comparação visual, geometria real, canvas, árvore, publicação futura, responsividade e falhas explícitas. APIs simuladas.');
  } finally { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
