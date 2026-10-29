const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs'), http = require('node:http'), path = require('node:path');
const {execFileSync} = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const rota = '/restrict/hierarquizacao/homologacao-ranking-publicacao/';
const referencia = '/restrict/analise-multicriterio/central-julgamentos';
(async () => {
  const paginas = JSON.parse(execFileSync(path.join(root, '.venv', 'Scripts', 'python.exe'), ['-B', '-X', 'utf8', '-c', [
    'import json',
    'from fastapi.testclient import TestClient',
    'from api.server import app',
    'from api.services.session_service import SessionUser, cookie_name, create_token',
    'c = TestClient(app)',
    'c.cookies.set(cookie_name(), create_token(SessionUser("fixture", "", "fixture_admin", "Fixture", "ADMIN")))',
    `rotas = ${JSON.stringify([rota, referencia, '/public/painel/'])}`,
    'respostas = {p: c.get(p) for p in rotas}',
    'assert all(r.status_code == 200 for r in respostas.values())',
    'print(json.dumps({p:r.text for p,r in respostas.items()}))',
  ].join('\n')], {cwd: root, encoding: 'utf8'}));
  const server = http.createServer((req, res) => {
    const nome = new URL(req.url, 'http://local').pathname;
    if (paginas[nome]) { res.setHeader('Content-Type', 'text/html; charset=utf-8'); return res.end(paginas[nome]); }
    const arquivo = path.resolve(root, '.' + nome.replace(/^\/restrict\/hierarquizacao\//, '/hierarquizacao/').replace(/^\/public\/painel\//, '/painel/'));
    if (path.relative(root, arquivo).startsWith('..')) return res.writeHead(403).end();
    fs.readFile(arquivo, (erro, dados) => {
      if (erro) return res.writeHead(404).end();
      res.setHeader('Content-Type', arquivo.endsWith('.js') ? 'text/javascript' : arquivo.endsWith('.css') ? 'text/css' : 'application/octet-stream');
      res.end(dados);
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({channel: process.env.SICARD_TEST_BROWSER || 'msedge', headless: true});
    const page = await browser.newPage({viewport: {width: 1600, height: 1000}});
    let perfil = 'ADMIN', publicacoes = 0, homologacoes = 0, falhar = false;
    const objeto = {cabecalho_objeto: {demanda_id: 'D', codigo: 'D', nome: 'Demanda'},
      hierarquizacao: {fase_1: {}, fase_2: {}, fase_3: {}, sintese: {executada: true, posicao_final: 7, score_final: 0.123456}}};
    const rodadas = ['calculada', 'homologada'].map((status, i) => ({
      codigo: `H${i}`, nome: `Grupo ${i}`, status, tipo_demanda: 'projeto',
      ranking: [{demanda_id: 'D', codigo: 'D', posicao: 7, score: 0.123456}],
      dados_hierarquizacao: {cabecalho_grupo: {}, objetos: [objeto]},
    }));
    await page.route('https://**/*', route => route.abort());
    await page.route('**/api/**', route => {
      const p = new URL(route.request().url()).pathname;
      if (p.endsWith('/homologar')) {
        homologacoes++;
        if (falhar) return route.fulfill({status: 503, json: {detail: 'Falha ao homologar'}});
        rodadas[0].status = 'homologada';
        return route.fulfill({json: rodadas[0]});
      }
      if (p.endsWith('/publicar')) {
        publicacoes++;
        rodadas[1].dados_hierarquizacao.cabecalho_grupo.publicacao = {ativa: true, publicado_em: '2026-10-29T12:00:00Z', publicado_por: 'fixture'};
        return route.fulfill({json: rodadas[1]});
      }
      return route.fulfill({json: p === '/api/auth/me' ? {id: 'fixture', nome: 'Fixture', tipo_usuario: perfil}
        : p === '/api/auth/session' ? {authenticated: true}
        : p === '/api/ahp/hierarquizacoes' ? rodadas : []});
    });
    const base = `http://127.0.0.1:${server.address().port}`;
    await page.goto(base + rota);
    const host = page.locator('.ami-report-table:has(.ranking-hier-table)');
    await host.locator('.admin-actions button').first().waitFor();
    const estilo = el => {
      const s = getComputedStyle(el);
      return Object.fromEntries(['fontFamily', 'fontSize', 'fontWeight', 'height', 'padding', 'borderRadius', 'backgroundColor'].map(k => [k, s[k]]));
    };
    const atual = await host.locator('.admin-actions button').first().evaluate(estilo);
    const ref = await browser.newPage();
    await ref.route('https://**/*', r => r.abort());
    await ref.route('**/api/**', r => r.fulfill({json: []}));
    await ref.goto(base + referencia);
    const padrao = await ref.locator('.ami-collaborator-controls .admin-icon-btn').first().evaluate(estilo);
    console.log(JSON.stringify({barraAtual: atual, referencia: padrao}));
    assert.ok(Math.abs(parseFloat(atual.height) - parseFloat(padrao.height)) < 0.02);
    assert.deepEqual({...atual, height: ''}, {...padrao, height: ''});
    if (process.argv.includes('--baseline')) return;
    const publico = await browser.newPage();
    await publico.route('https://**/*', r => r.abort());
    await publico.route('**/api/**', route => {
      const p = new URL(route.request().url()).pathname;
      return route.fulfill({json: p.startsWith('/api/painel/demandas') ? [{
        id: 'D', nome: 'Demanda', tipo: 'projeto', status: 'hierarq_finalizada', criadoEm: '',
        lat: -23, lng: -48, geometria: {tipo: 'Point', coordinates: [-48, -23]},
        hierarquizacoes: publicacoes ? [
          {codigo: 'H1', nome: 'Rodada publicada', grupo_nome: 'Grupo comparável A', status: 'homologada',
            posicao: 7, indice_final: 0.123456, indice_rede: 0.7, indice_territorial: 0, indice_prioridade: 0.9,
            elegibilidade: 'apto', indice_risco: 0},
          {codigo: 'H2', nome: 'Outra rodada publicada', grupo_nome: 'Grupo comparável B', status: 'homologada', posicao: null},
        ] : [],
      }] : []});
    });
    await publico.goto(base + '/public/painel/');
    await publico.locator('.layer-group-header--record').first().click();
    const popup = publico.locator('#painel-detail-popover');
    await popup.waitFor({state: 'visible'});
    assert.match(await popup.innerText(), /Demanda/);
    assert.equal(await popup.locator('.painel-hierarquizacao-resultados').count(), 0, 'cadastro visível antes de publicar, sem resultados');
    const publicar = host.getByRole('button', {name: 'Publicar', exact: true});
    assert.equal(await publicar.isDisabled(), true);
    await host.locator('tbody tr[data-row-codigo="H0"] input').check();
    assert.equal(await publicar.isDisabled(), true);
    await host.locator('tbody tr[data-row-codigo="H0"] input').uncheck();
    await host.locator('tbody tr[data-row-codigo="H1"] input').check();
    assert.equal(await publicar.isEnabled(), true);
    assert.equal((await publicar.innerText()).trim(), '', 'publicação usa somente o ícone');
    const homologar = host.getByRole('button', {name: 'Homologar', exact: true});
    assert.equal((await homologar.innerText()).trim(), '', 'homologação usa somente o ícone');
    const estiloHomologar = await homologar.evaluate(estilo);
    assert.deepEqual({...estiloHomologar, backgroundColor: ''}, {...atual, backgroundColor: ''},
      'homologação mantém dimensões do botão padrão');
    await host.locator('tbody tr[data-row-codigo="H0"] input').check();
    assert.equal(await publicar.isDisabled(), true);
    await host.locator('tbody tr[data-row-codigo="H0"] input').uncheck();
    await publicar.click();
    await page.locator('#pfsConfirmBox').waitFor({state: 'visible'});
    assert.equal(publicacoes, 0, 'confirmação ainda não publica');
    await page.locator('#pfsConfirmCancel').click();
    assert.equal(publicacoes, 0, 'cancelamento não publica');
    await publicar.click();
    await page.locator('#pfsConfirmOk').click();
    await page.locator('#pfsProgressBox').waitFor({state: 'visible'});
    await page.locator('#pfsSuccessBox').waitFor({state: 'visible'});
    assert.match(await page.locator('#pfsSuccessBox').innerText(), /Hierarquização publicada/);
    await page.locator('#pfsSuccessOk').click();
    await page.waitForFunction(() => document.querySelector('#ranking-hier-tbody').textContent.includes('Publicada'));
    assert.equal(publicacoes, 1);
    await host.locator('tbody tr[data-row-codigo="H0"] input').check();
    await homologar.click();
    await page.locator('#pfsConfirmCancel').click();
    assert.equal(homologacoes, 0, 'cancelamento não homologa');
    falhar = true;
    await homologar.click();
    await page.locator('#pfsConfirmOk').click();
    await page.locator('#pfsProgressBox').waitFor({state: 'visible'});
    await page.locator('#pfsErrorBox').waitFor({state: 'visible'});
    assert.match(await page.locator('#pfsErrorBox').innerText(), /Falha ao homologar/);
    await page.locator('#pfsErrorClose').click();
    falhar = false;
    await homologar.click();
    await page.locator('#pfsConfirmOk').click();
    await page.locator('#pfsProgressBox').waitFor({state: 'visible'});
    await page.locator('#pfsSuccessBox').waitFor({state: 'visible'});
    assert.match(await page.locator('#pfsSuccessBox').innerText(), /Hierarquização homologada/);
    assert.match(await page.locator('#pfsSuccessBox').innerText(), /Agora você pode publicar/);
    assert.equal(homologacoes, 2);
    assert.match(await host.locator('tbody tr[data-row-codigo="H0"]').innerText(), /Finalizada e homologada/);
    await page.locator('#pfsSuccessOk').click();
    await publico.reload();
    await publico.locator('.layer-group-header--record').first().click();
    await popup.waitFor({state: 'visible'});
    assert.equal(await popup.locator('.painel-hierarquizacao-resultados').count(), 2);
    const textoPopup = await popup.textContent();
    assert.match(textoPopup, /Grupo comparável A/);
    assert.match(textoPopup, /Grupo comparável B/);
    assert.match(textoPopup, /7º/);
    assert.match(textoPopup, /Sem posição/);
    for (const label of ['Elegibilidade territorial', 'Índice de risco', 'Índice de favorabilidade de rede',
      'Índice de favorabilidade territorial', 'Índice de prioridade', 'Índice geral de hierarquização']) assert.ok(textoPopup.includes(label));
    for (perfil of ['ANALISTA', 'GESTOR']) {
      await page.reload();
      await host.locator('tbody tr[data-row-codigo="H1"] input').check();
      assert.equal(await publicar.isEnabled(), perfil === 'GESTOR');
    }
    await page.addScriptTag({path: path.join(root, 'assets', 'js', 'grouped-sidebar.js')});
    const html = await page.evaluate(() => SLTGroupedSidebar.resultadosHierarquizacaoHtml([
      {codigo: 'H1', nome: 'Grupo A', status: 'homologada', posicao: 7, indice_final: 0.123456},
      {codigo: 'H2', nome: 'Grupo B', status: 'homologada', posicao: null},
    ]));
    assert.match(html, /Grupo A.*H1.*7º/);
    assert.match(html, /Grupo B.*H2/);
    assert.match(html, /Sem posição/);
    const pilha = await browser.newPage();
    await pilha.route('https://**/*', r => r.abort());
    await pilha.route('**/api/**', route => {
      const p = new URL(route.request().url()).pathname;
      const registros = [
        ['plano', 'analise_aprovada'], ['programa', 'analise_reprovada'], ['projeto', 'hierarq_em_andamento'],
      ].map(([tipo, status]) => ({
        id: tipo, nome: tipo, tipo, status, lat: -23, lng: -48,
        geometria: {tipo: 'Polygon', coordinates: [[[-48, -23], [-47.9, -23], [-47.9, -22.9], [-48, -23]]]},
        hierarquizacoes: [],
      }));
      return route.fulfill({json: p.startsWith('/api/painel/demandas') ? registros : []});
    });
    await pilha.goto(base + '/public/painel/');
    await pilha.waitForFunction(() => document.querySelectorAll('#map-painel .leaflet-overlay-pane path.leaflet-interactive').length === 3);
    const conferirPilha = async () => {
      const estado = await pilha.evaluate(() => ({
        cores: [...document.querySelectorAll('#map-painel .leaflet-overlay-pane path.leaflet-interactive')].map(e => e.getAttribute('stroke')),
        esperadas: ['analise_aprovada', 'analise_reprovada', 'hierarq_em_andamento'].map(s => SLTStatusColors.getStatusDemanda(s).text),
        sidebar: [...document.querySelectorAll('#layers-container > .layer-group--tipo')].map(e => e.dataset.groupId),
      }));
      assert.deepEqual(estado.cores, estado.esperadas, 'mapa: plano no fundo, programa no meio, projeto por cima');
      assert.deepEqual(estado.sidebar, ['plano', 'programa', 'projeto'], 'ordem da sidebar preservada');
    };
    await conferirPilha();
    for (const tipo of ['plano', 'programa', 'projeto']) {
      const grupo = pilha.locator(`.layer-visibility-input--group[data-group-id="${tipo}"]`);
      await grupo.uncheck();
      await grupo.check();
      await conferirPilha();
      const registro = pilha.locator(`.layer-visibility-input--record[data-group-id="${tipo}"]`).first();
      await registro.uncheck();
      await registro.check();
      await conferirPilha();
    }
    await pilha.close();
    console.log('Publicação e ordem pública: projetos sobre programas sobre planos, inclusive após alternar visibilidade. OK.');
  } finally { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
