const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs'), http = require('node:http'), path = require('node:path');
const {execFileSync} = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const rotas = ['/public/painel/', '/restrict/painel/'];
const geo = {tipo: 'Polygon', coordinates: [[[-48, -23], [-47.9, -23], [-47.9, -22.9], [-48, -23]]]};
function rodada(codigo, posicao, indice) {
  return {codigo, nome: `Hierarquização ${codigo}`, status: posicao ? 'calculada' : 'em_julgamento',
    posicao, indice_final: indice, indice_rede: 0.6, indice_territorial: 0.7,
    indice_prioridade: 0.8, indice_risco: 0, elegibilidade: 'apto',
    operador: 'media_simples', pesos_sintese: {rede: 1 / 3, territorial: 1 / 3, prioridade: 1 / 3},
    pesos_prioridade: {Maturidade: 1}};
}
const demandas = [
  {id: 'P1', tipo: 'projeto', nome: 'Projeto sem alterar GRAFIA', status: 'hierarq_finalizada',
    hierarquizacoes: [rodada('H1', 1, 0.7), rodada('H2', 3, 0.5)]},
  {id: 'P2', tipo: 'projeto', nome: 'Projeto sem grupo', status: 'analise_em_avaliacao', hierarquizacoes: []},
  {id: 'PL1', tipo: 'plano', nome: 'Plano teste', status: 'hierarq_em_andamento', hierarquizacoes: [rodada('HPL', null, null)]},
  {id: 'PG1', tipo: 'programa', nome: 'Programa teste', status: 'hierarq_finalizada', hierarquizacoes: [rodada('HPG', 2, 0.8)]},
].map(d => ({...d, criadoEm: '2026-10-28T10:00:00Z', geometria: geo, lat: -22.95, lng: -47.95}));

(async () => {
  const paginas = JSON.parse(execFileSync(path.join(root, '.venv', 'Scripts', 'python.exe'), ['-B', '-X', 'utf8', '-c', [
    'import json', 'from fastapi.testclient import TestClient', 'from api.server import app',
    `rotas = ${JSON.stringify(rotas)}`, 'client = TestClient(app)',
    'respostas = {rota: client.get(rota) for rota in rotas}',
    'assert all(r.status_code == 200 for r in respostas.values())',
    'print(json.dumps({rota: r.text for rota, r in respostas.items()}))',
  ].join('\n')], {cwd: root, encoding: 'utf8'}));
  const server = http.createServer((req, res) => {
    const nome = new URL(req.url, 'http://local').pathname;
    if (paginas[nome]) { res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(paginas[nome]); return; }
    const relativo = nome === '/restrict/painel.js' ? '/admin/painel.js' : nome.replace(/^\/public\/painel\//, '/painel/');
    const arquivo = path.resolve(root, '.' + relativo);
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
    browser = await chromium.launch({channel: process.env.SICARD_TEST_BROWSER || 'msedge', headless: true});
    for (const rota of rotas) {
      const page = await browser.newPage({viewport: {width: 1600, height: 1000}});
      const erros = [];
      page.on('pageerror', e => erros.push(e.stack || e.message));
      await page.route('https://**/*', route => route.abort());
      await page.route('**/api/**', route => {
        const p = new URL(route.request().url()).pathname;
        const json = p === '/api/auth/me' ? {id: 'u1', nome: 'Teste', tipo_usuario: 'ADMIN'}
          : p === '/api/auth/session' ? {authenticated: true}
          : p.startsWith('/api/painel/demandas') ? demandas
          : p.includes('/api/dominios/status-') ? [{codigo: 'hierarq_finalizada', nome: 'Hierarquização concluída'}]
          : p === '/api/ahp/objetos' ? [{...demandas[0], codigo: 'OBJ1', demanda_codigo: 'P1',
            status: 'hierarq_em_andamento', statusAtualizadoEm: '2026-10-28T10:00:00Z'}]
          : [];
        return route.fulfill({json});
      });
      await page.goto(`http://127.0.0.1:${server.address().port}${rota}`);
      const tree = page.locator('#layers-container');
      await tree.locator('.layer-group--hierarquizacao').first().waitFor();
      assert.equal(await tree.locator('.layer-group--hierarquizacao').count(), 4);
      assert.equal(await tree.locator('.layer-group--record').count(), 5, 'duas participações sem duplicar o cadastro');
      assert.equal(await page.locator(rota.startsWith('/public') ? '#demandas-count' : '#projetos-count').textContent(), '4', 'contador de demandas únicas');
      assert.equal(await tree.locator('[data-group-id="plano"] [data-hierarquizacao="HPL"]').count(), 1);
      assert.equal(await tree.locator('[data-group-id="programa"] [data-hierarquizacao="HPG"]').count(), 1);
      const grupo1 = tree.locator('[data-hierarquizacao="H1"]'), grupo2 = tree.locator('[data-hierarquizacao="H2"]');
      assert.match(await grupo1.textContent(), /Hierarquização concluída/);
      assert.match(await grupo1.textContent(), /0.7000/);
      assert.match(await grupo2.textContent(), /0.5000/);
      await page.waitForFunction(() => document.querySelectorAll('#map-painel .painel-pin-wrap').length === 2);
      const geometriaCount = await page.locator('#map-painel .leaflet-overlay-pane path').count();
      assert.equal(geometriaCount, 4, 'uma geometria por demanda, não por participação');
      assert.equal(await tree.locator('.layer-group--tipo[data-group-id="projeto"] > .admin-records-list > .layer-group--record').count(), 1, 'sem grupo fica na raiz do tipo');
      const ids = await tree.locator('input[id]').evaluateAll(inputs => inputs.map(i => i.id));
      assert.equal(new Set(ids).size, ids.length, 'seletores sem ids duplicados');
      await grupo2.locator('.layer-group-header--record').click();
      const pop = page.locator('#painel-detail-popover');
      await pop.waitFor({state: 'visible'});
      assert.match(await pop.textContent(), /Hierarquização H1/);
      assert.match(await pop.textContent(), /Hierarquização H2/);
      const seletor1 = grupo1.locator('.layer-visibility-input--record');
      const seletor2 = grupo2.locator('.layer-visibility-input--record');
      await seletor1.uncheck();
      assert.equal(await seletor2.isChecked(), false, 'visibilidade sincronizada entre participações');
      assert.equal(await page.locator('#map-painel .leaflet-overlay-pane path').count(), 3);
      await seletor2.check();
      assert.equal(await seletor1.isChecked(), true);
      assert.equal(await page.locator('#map-painel .leaflet-overlay-pane path').count(), 4);
      await grupo2.locator('.layer-group-header--hierarquizacao').click();
      assert.equal(await grupo2.locator('.layer-group--record').isVisible(), false, 'grupo recolhível');
      await grupo2.locator('.layer-group-header--hierarquizacao').click();
      assert.equal(await grupo2.locator('.layer-group--record').isVisible(), true);
      const tipoProjetos = tree.locator('.layer-group--tipo[data-group-id="projeto"] > .layer-group-header-row .layer-visibility-input--group');
      await tipoProjetos.uncheck();
      assert.equal(await page.locator('#map-painel .leaflet-overlay-pane path').count(), 2);
      await tipoProjetos.check();
      assert.equal(await page.locator('#map-painel .leaflet-overlay-pane path').count(), 4);
      assert.equal(await seletor1.isChecked(), true);
      assert.equal(await seletor2.isChecked(), true, 'reconstrução da sidebar preserva participações e seletores');
      await page.evaluate(() => {
        const el = document.createElement('div'); el.id = 'teste-sidebar-legada'; document.body.append(el);
        SLTGroupedSidebar.renderGroupedDemandasSidebar({
          containerSelector: '#teste-sidebar-legada', defaultGroupsExpanded: true,
          groups: [{id: 'projeto', label: 'Projetos', records: [{id: 'LEGADO', nome: 'Sem subgrupos'}]}],
          getRecordGroupId: () => 'projeto',
        });
      });
      assert.equal(await page.locator('#teste-sidebar-legada .layer-group--record').count(), 1);
      assert.equal(await page.locator('#teste-sidebar-legada .layer-group--hierarquizacao').count(), 0, 'consumidores sem agrupamento preservados');
      assert.deepEqual(erros, []);
      await page.close();
    }
    console.log('PASS: painéis reais público/restrito, grupos desde a criação, rodadas múltiplas, dados individuais, status atual, geometria única e seleção sincronizada. APIs simuladas.');
  } finally { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
