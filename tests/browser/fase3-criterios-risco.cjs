// Fase 3, seção 2: cada camada de risco sobreposta na Fase 1 vira um critério (coluna + peso) à direita dos atributos dinâmicos.
// Página real renderizada pelo servidor; dados de hierarquização e domínios são entregues direto ao componente.
const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs'), http = require('node:http'), path = require('node:path');
const {execFileSync} = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const ROTA = '/restrict/hierarquizacao/fase-3/';

const objeto = (codigo, areas, executada = true) => ({
  cabecalho_objeto: {codigo, nome: `Demanda ${codigo}`, atributos: {}, atributos_fase3: {}},
  hierarquizacao: {fase_1: {executada, sobreposicoes_risco: Object.fromEntries(Object.entries(areas).map(([id, ha]) => [id, {camada: id === 'a' ? 'Áreas de Risco de Inundação' : 'Várzeas', area_ha: ha}]))}},
});

(async () => {
  const python = path.join(root, '.venv', process.platform === 'win32' ? 'Scripts' : 'bin', process.platform === 'win32' ? 'python.exe' : 'python');
  const html = JSON.parse(execFileSync(python, ['-B', '-X', 'utf8', '-c', [
    'import json', 'from fastapi.testclient import TestClient', 'from api.server import app',
    `r = TestClient(app).get(${JSON.stringify(ROTA)})`, 'assert r.status_code == 200', 'print(json.dumps(r.text))',
  ].join('\n')], {cwd: root, encoding: 'utf8'}));
  const server = http.createServer((req, res) => {
    const nome = new URL(req.url, 'http://local').pathname;
    if (nome === ROTA) { res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(html); return; }
    const relativo = nome.replace(/^\/restrict\/hierarquizacao\//, '/hierarquizacao/');
    const arquivo = path.resolve(root, `.${relativo}`);
    if (path.relative(root, arquivo).startsWith('..')) { res.writeHead(403).end(); return; }
    fs.readFile(arquivo, (erro, dados) => {
      if (erro) { res.writeHead(404).end(); return; }
      res.setHeader('Content-Type', arquivo.endsWith('.js') ? 'text/javascript; charset=utf-8' : arquivo.endsWith('.css') ? 'text/css' : 'application/octet-stream');
      res.end(dados);
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  let browser;
  try {
    browser = await chromium.launch({headless: true,
      channel: process.env.SICARD_TEST_BROWSER || (process.platform === 'win32' ? 'msedge' : undefined),
      args: ['--no-proxy-server']});
    const page = await browser.newPage({viewport: {width: 1440, height: 1000}});
    const erros = [];
    page.on('pageerror', erro => erros.push(erro.message));
    await page.route('https://**/*', request => request.abort());
    await page.route('**/api/**', request => request.fulfill({json: []}));
    await page.route('**/hierarquizacao/js/fase3.js*', request => request.fulfill({body: '', contentType: 'text/javascript'}));
    await page.route('**/hierarquizacao-fase3-ajuste-fino-inline-1.js*', request => request.fulfill({body: '', contentType: 'text/javascript'}));
    await page.goto(base + ROTA, {waitUntil: 'domcontentloaded'});

    const colunas = [{id: 'r_ano', criterio: 'Custo anual', tipo: 'numerico', relacao: 'menor_melhor', mandatorio: false}];
    const hierarquizacao = {codigo: 'H-1', dados_hierarquizacao: {
      cabecalho_grupo: {tipo_demanda: 'projeto'},
      objetos: [objeto('D-1', {a: 0, b: 0}), objeto('D-2', {a: 4, b: 0}), objeto('D-3', {a: 2, b: 0.5})],
    }};
    const resultado = await page.evaluate(async ([h, cols]) => {
      await window.AtributosObjetos.render(h, {colunas: cols, dominios: [{codigo: 'maturidade_objeto', nome: 'Grau de maturidade do projeto', tipos_objeto: ['projeto'], tipo_dado: 'categoria', dominio_valores: [{rotulo: 'Nível 1'}, {rotulo: 'Nível 2'}]}]});
      const cabecalhos = [...document.querySelectorAll('[data-atributos-thead] th')].map(th => (th.querySelector('.col-atributo-alias')?.title ?? th.textContent) + (th.querySelector('.col-atributo-unidade')?.textContent ? ' ' + th.querySelector('.col-atributo-unidade').textContent : ''));
      const linhas = [...document.querySelectorAll('[data-atributos-tbody] tr')].map(tr => [...tr.querySelectorAll('td')].map(td => td.textContent.replace(/\s+/g, ' ').trim()));
      const pesos = document.querySelector('[data-atributos-pesos]');
      const r = s => document.querySelector(s).getBoundingClientRect();
      return {cabecalhos, linhas, tres: pesos.classList.contains('atributos-pesos--tres'),
        riscoVisivel: !document.querySelector('[data-controles-pesos="risco"]').closest('section').hidden,
        cadastroVisivel: !document.querySelector('[data-controles-pesos="cadastro"]').closest('section').hidden,
        somaRisco: document.querySelector('[data-soma-pesos="risco"]').textContent,
        rotulosRisco: [...document.querySelectorAll('[data-controles-pesos="risco"] label span')].map(s => s.textContent),
        tituloRisco: document.querySelector('.secao-pesos-risco h3').textContent,
        selectsTratamento: document.querySelectorAll('.risco-tratamento-select, #salvar-tratamentos-riscos-fase3').length,
        geo: {pesos: r('[data-atributos-pesos]'), cad: r('.secao-pesos-cadastro'), din: r('.secao-pesos-dinamicos'), ris: r('.secao-pesos-risco')},
        payload: window.AtributosObjetos.criteriosPayload()
          .filter(c => c.grupo_atributo === 'risco_ambiental_territorial').map(c => [c.atributo_id, c.peso, c.direcao, c.valor_minimo, c.escala_absoluta]),
        ausentes: window.AtributosObjetos.atributosAusentes(h).map(o => o.atributos.length)};
    }, [hierarquizacao, colunas]);

    assert.deepEqual(resultado.cabecalhos.slice(-2), ['Sobreposição com Áreas de Risco de Inundação (ha)', 'Sobreposição com Várzeas (ha)'].map(t => t), 'colunas de risco à direita, uma por camada');
    // Normalização absoluta: 0 ha = melhor (1,0000); maior área = pior (0,0000).
    const col = i => resultado.linhas.map(l => l[l.length - 2 + i]);
    assert.ok(col(0)[0].startsWith('1.0000') && col(0)[1].startsWith('0.0000') && col(0)[2].startsWith('0.5000'), col(0).join(' | '));
    assert.ok(col(0)[1].includes('4 ha') && col(1)[2].includes('0,5 ha'));
    assert.equal(resultado.tres, true);
    assert.ok(resultado.riscoVisivel && resultado.cadastroVisivel, 'três grupos de peso visíveis');
    assert.equal(resultado.tituloRisco, 'Critérios de Risco Ambiental e Territorial');
    assert.equal(resultado.somaRisco, '1,000');
    assert.equal(resultado.rotulosRisco.length, 2);
    assert.equal(resultado.selectsTratamento, 0, 'sem seletor nem botão de tratamento barrar/ignorar/penalizar');
    assert.deepEqual(resultado.payload.map(p => p[0]), ['risco_area:a', 'risco_area:b']);
    assert.ok(resultado.payload.every(p => p[2] === 'menor_melhor' && p[3] === 0 && p[4] === true));
    assert.ok(Math.abs(resultado.payload[0][1] + resultado.payload[1][1] - 1) < 1e-9);
    assert.deepEqual(resultado.ausentes, [2, 2, 2], 'cadastro e dinâmico sem valor; riscos sempre têm valor quando a Fase 1 rodou');
    const {pesos, cad, din, ris} = resultado.geo;
    assert.ok(cad.right <= din.left + 1 && din.right <= ris.left + 1 && ris.right <= pesos.right + 1, 'cadastro, dinâmicos e risco lado a lado, dentro do contêiner');

    // Larguras: nenhum contêiner de peso ultrapassa o contêiner pai.
    for (const largura of [1440, 1200, 1000]) {
      await page.setViewportSize({width: largura, height: 1000});
      const m = await page.evaluate(() => {
        const pai = document.querySelector('[data-atributos-pesos]').getBoundingClientRect();
        const vazam = [...document.querySelectorAll('.secao-pesos-cadastro *, .secao-pesos-dinamicos *, .secao-pesos-risco *, .secao-pesos-risco')]
          .filter(n => n.offsetParent).filter(n => { const b = n.getBoundingClientRect(); return b.width && (b.right > pai.right + 1 || b.left < pai.left - 1); }).length;
        const largos = [...document.querySelectorAll('body *')].filter(n => n.offsetParent && n.getBoundingClientRect().right > document.documentElement.clientWidth + 1)
          .slice(0, 6).map(n => `${n.tagName}.${String(n.className).slice(0, 40)}:${Math.round(n.getBoundingClientRect().right)}`);
        return {vazam, largos, doc: document.documentElement.scrollWidth - document.documentElement.clientWidth};
      });
      assert.equal(m.vazam, 0, `${largura}px: nenhum controle de peso ultrapassa o contêiner`);
      assert.equal(m.doc <= 8 || m.largos.every(l => l.startsWith('NAV.') || l.startsWith('A.:')), true, `${largura}px: sem rolagem horizontal causada pela seção (${m.largos.join('; ')})`);
    }

    // Edição do peso redistribui só dentro do grupo de risco.
    await page.setViewportSize({width: 1440, height: 1000});
    await page.locator('[data-controles-pesos="risco"] .atributo-peso-numero').first().fill('0.8');
    await page.locator('[data-controles-pesos="risco"] .atributo-peso-numero').first().dispatchEvent('input');
    const apos = await page.evaluate(() => ({
      risco: window.AtributosObjetos.criteriosPayload().filter(c => c.grupo_atributo === 'risco_ambiental_territorial').map(c => c.peso),
      dinamico: window.AtributosObjetos.criteriosPayload().filter(c => c.grupo_atributo === 'dinamico').map(c => c.peso)}));
    assert.ok(Math.abs(apos.risco[0] - 0.8) < 1e-9 && Math.abs(apos.risco[1] - 0.2) < 1e-9, apos.risco.join(','));
    assert.deepEqual(apos.dinamico, [1]);

    // Fase 1 não executada: valor ausente, e o objeto aparece com o critério vazio.
    const semFase1 = await page.evaluate(async ([h, cols]) => {
      h.dados_hierarquizacao.objetos.push({cabecalho_objeto: {codigo: 'D-4', nome: 'Demanda D-4', atributos: {}}, hierarquizacao: {fase_1: {executada: false}}});
      await window.AtributosObjetos.render(h, {colunas: cols, dominios: []});
      return window.AtributosObjetos.atributosAusentes(h).map(o => o.atributos.length);
    }, [hierarquizacao, colunas]);
    assert.deepEqual(semFase1, [1, 1, 1, 3]);

    // Sem camadas de risco com área, o terceiro grupo some e o layout volta a dois.
    const semRisco = await page.evaluate(async ([cols]) => {
      await window.AtributosObjetos.render({codigo: 'H-2', dados_hierarquizacao: {cabecalho_grupo: {}, objetos: [{cabecalho_objeto: {codigo: 'X', nome: 'X', atributos: {}}, hierarquizacao: {fase_1: {executada: true, sobreposicoes_risco: {a: {camada: 'A', area_ha: 0}}}}}]}}, {colunas: cols, dominios: []});
      return {tres: document.querySelector('[data-atributos-pesos]').classList.contains('atributos-pesos--tres'),
        oculto: document.querySelector('[data-controles-pesos="risco"]').closest('section').hidden};
    }, [colunas]);
    assert.deepEqual(semRisco, {tres: false, oculto: true});
    assert.deepEqual(erros, []);
    if (process.env.SICARD_SCREENSHOT_DIR) {
      fs.mkdirSync(process.env.SICARD_SCREENSHOT_DIR, {recursive: true});
      await page.evaluate(async ([h, cols]) => window.AtributosObjetos.render(h, {colunas: cols, dominios: []}), [hierarquizacao, colunas]);
      await page.locator('#atributos-objetos-demanda').screenshot({path: path.join(process.env.SICARD_SCREENSHOT_DIR, 'fase3-criterios-risco.png')});
    }
    console.log('PASS: fase 3 — critérios de risco por camada (coluna + peso), três grupos sem vazar, sem tratamento barrar/ignorar.');
  } finally {
    await browser?.close();
    server.closeAllConnections?.();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(erro => { console.error(erro); process.exitCode = 1; });
