// Fase 3, seção 2: o índice do Resumo da Elegibilidade substitui as áreas por camada.
// Página real renderizada pelo servidor; dados de hierarquização e domínios são entregues direto ao componente.
const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs'), http = require('node:http'), path = require('node:path');
const {execFileSync} = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const ROTA = '/restrict/hierarquizacao/fase-3/';

const INDICE = 'indice_de_risco_ambiental_e_territorial';
const objeto = (codigo, indice, executada = true) => ({
  cabecalho_objeto: {codigo, nome: 'Mesmo nome', atributos: {}, atributos_fase3: {[INDICE]: {valor_bruto: 0.123}}},
  hierarquizacao: {fase_1: {executada, resumo_elegibilidade: indice == null ? null : {[INDICE]: indice},
    sobreposicoes_risco: {a: {camada: 'Camada antiga', area_ha: 500}}}},
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
      objetos: [objeto('D-1', 0.75), objeto('D-2', 0), objeto('D-3', 0.9), objeto('D-4', 1)],
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
          .filter(c => c.grupo_atributo === 'risco_ambiental_territorial').map(c => [c.atributo_id, c.peso, c.direcao, c.valor_minimo, c.valor_maximo]),
        ausentes: window.AtributosObjetos.atributosAusentes(h).map(o => o.atributos.length)};
    }, [hierarquizacao, colunas]);

    assert.equal(resultado.cabecalhos.at(-1), 'Índice de risco ambiental e territorial (0–1)');
    assert.equal(resultado.cabecalhos.some(t => t.includes('Sobreposição com')), false, 'não duplica risco por camada');
    const col = resultado.linhas.map(l => l.at(-1));
    assert.deepEqual(col, ['0.7500 0,7500', '0.0000 0,0000', '0.9000 0,9000', '1.0000 1,0000'],
      'consome o resumo do objeto correspondente, inclusive zero, sem usar slot manual nem reescalonar');
    assert.equal(resultado.tres, true);
    assert.ok(resultado.riscoVisivel && resultado.cadastroVisivel, 'três grupos de peso visíveis');
    assert.equal(resultado.tituloRisco, 'Critérios de Risco Ambiental e Territorial');
    assert.equal(resultado.somaRisco, '1,000');
    assert.deepEqual(resultado.rotulosRisco, ['Índice de risco ambiental e territorial']);
    assert.equal(resultado.selectsTratamento, 0, 'sem seletor nem botão de tratamento barrar/ignorar/penalizar');
    assert.deepEqual(resultado.payload, [[INDICE, 1, 'maior_melhor', 0, 1]]);
    assert.deepEqual(resultado.ausentes, [2, 2, 2, 2], 'cadastro e dinâmico sem valor; índice vem do resumo');
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

    // O único critério de risco mantém a soma 1, sem alterar os demais grupos.
    await page.setViewportSize({width: 1440, height: 1000});
    await page.locator('[data-controles-pesos="risco"] .atributo-peso-numero').first().fill('0.8');
    await page.locator('[data-controles-pesos="risco"] .atributo-peso-numero').first().dispatchEvent('input');
    const apos = await page.evaluate(() => ({
      risco: window.AtributosObjetos.criteriosPayload().filter(c => c.grupo_atributo === 'risco_ambiental_territorial').map(c => c.peso),
      dinamico: window.AtributosObjetos.criteriosPayload().filter(c => c.grupo_atributo === 'dinamico').map(c => c.peso)}));
    assert.deepEqual(apos.risco, [1]);
    assert.deepEqual(apos.dinamico, [1]);

    // Fase 1 não executada: valor ausente, e o objeto aparece com o critério vazio.
    const semFase1 = await page.evaluate(async ([h, cols]) => {
      h.dados_hierarquizacao.objetos.push(
        {cabecalho_objeto: {codigo: 'D-5', atributos: {}}, hierarquizacao: {fase_1: {executada: false}}},
        {cabecalho_objeto: {codigo: 'D-6', atributos: {}}, hierarquizacao: {fase_1: {executada: true, resumo_elegibilidade: null}}},
      );
      await window.AtributosObjetos.render(h, {colunas: cols, dominios: []});
      return window.AtributosObjetos.atributosAusentes(h).map(o => [o.atributos.length, o.riscos.length]);
    }, [hierarquizacao, colunas]);
    assert.deepEqual(semFase1, [[1, 0], [1, 0], [1, 0], [1, 0], [1, 1], [1, 1]],
      'risco ausente exige resultado da Fase 1, não complementação manual');

    const invariancia = await page.evaluate(async ([h, cols]) => {
      h.dados_hierarquizacao.objetos = h.dados_hierarquizacao.objetos.slice(0, 1);
      await window.AtributosObjetos.render(h, {colunas: cols, dominios: []});
      return document.querySelector('[data-atributos-tbody] tr td:last-child .atributo-valor-normalizado').textContent;
    }, [hierarquizacao, colunas]);
    assert.equal(invariancia, '0.7500', 'índice não vira 1 quando há uma única demanda');

    const invalidos = await page.evaluate(async ([h, cols, chave]) => {
      h.dados_hierarquizacao.objetos.forEach((o, i) => {
        o.hierarquizacao.fase_1.resumo_elegibilidade[chave] = [-0.1, 1.1, null, 0.4][i];
      });
      await window.AtributosObjetos.render(h, {colunas: cols, dominios: []});
      return [...document.querySelectorAll('[data-atributos-tbody] tr td:last-child .atributo-valor-normalizado')].map(el => el.textContent);
    }, [hierarquizacao, colunas, INDICE]);
    assert.deepEqual(invalidos, ['—', '—', '—', '0.4000'], 'não limita índices inválidos a zero ou um');

    // Sem execução da Fase 1, o grupo não é disponibilizado.
    const semRisco = await page.evaluate(async ([cols]) => {
      await window.AtributosObjetos.render({codigo: 'H-2', dados_hierarquizacao: {cabecalho_grupo: {}, objetos: [{cabecalho_objeto: {codigo: 'X', nome: 'X', atributos: {}}, hierarquizacao: {fase_1: {executada: false}}}]}}, {colunas: cols, dominios: []});
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
    console.log('PASS: fase 3 — índice do resumo por demanda, escala fixa 0–1, zero, ausentes, peso único e layout dos três grupos.');
  } finally {
    await browser?.close();
    server.closeAllConnections?.();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(erro => { console.error(erro); process.exitCode = 1; });
