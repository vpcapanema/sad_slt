// Fase 2, seção 5: “Índices por Demanda e Feição” à esquerda e “Onde as Demandas se Sobrepõem” à direita.
// Página real: blocos sintéticos para medir layout, depois controlador real com APIs simuladas para validar estados.
const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs'), http = require('node:http'), path = require('node:path');
const {execFileSync} = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const ROTA = '/restrict/hierarquizacao/fase-2/';

(async () => {
  const python = path.join(root, '.venv', process.platform === 'win32' ? 'Scripts' : 'bin', process.platform === 'win32' ? 'python.exe' : 'python');
  const html = JSON.parse(execFileSync(python, ['-B', '-X', 'utf8', '-c', [
    'import json', 'from fastapi.testclient import TestClient', 'from api.server import app',
    `r = TestClient(app).get(${JSON.stringify(ROTA)})`, 'assert r.status_code == 200', 'print(json.dumps(r.text))',
  ].join('\n')], {cwd: root, encoding: 'utf8'}));
  const server = http.createServer((req, res) => {
    const nome = new URL(req.url, 'http://local').pathname;
    if (nome === ROTA) { res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(html); return; }
    const relativo = nome.replace(/^\/restrict\/geoespacial\//, '/geoespacial/').replace(/^\/restrict\/hierarquizacao\//, '/hierarquizacao/');
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
      args: ['--no-proxy-server', '--enable-unsafe-swiftshader']});
    const page = await browser.newPage({viewport: {width: 1440, height: 1000}});
    const erros = [];
    page.on('pageerror', erro => erros.push(erro.message));
    await page.route('https://**/*', request => request.abort());
    await page.route('**/api/**', request => request.fulfill({json: []}));
    await page.route('**/fase2-favorabilidade-v2.js*', request => request.fulfill({body: '', contentType: 'text/javascript'}));
    await page.route('**/extracao-atributos/app.js*', request => request.fulfill({body: '', contentType: 'text/javascript'}));
    await page.route('**/geoespacial/bancada/', request => request.fulfill({body: '<!doctype html><title>Bancada</title>', contentType: 'text/html'}));
    await page.goto(base + ROTA, {waitUntil: 'domcontentloaded'});
    await page.evaluate(() => {
      document.querySelector('#ev-resultados-conteudo').hidden = false;
      const linhas = Array.from({length: 60}, (_, i) => `<div class="fv-intervalo-linha"><button class="fv-demanda-nome">Demanda ${i} com um nome razoavelmente longo para testar a quebra de linha</button><div class="fv-intervalo-conteudo">intervalo</div></div>`).join('');
      document.querySelector('#ev-resultados-indices-grafico').innerHTML =
        `<div class="fv-grafico-superficie"><h4>Superfície</h4><div class="fv-intervalos-rolagem"><div class="fv-intervalos-quadro">${linhas}</div></div></div>`;
    });
    const medir = () => page.evaluate(() => {
      const r = seletor => document.querySelector(seletor).getBoundingClientRect();
      const grade = r('.evr-analise'), indices = r('.secao-favorabilidade-sobreposicoes'), mapa = r('.secao-favorabilidade-mapa');
      const corpo = r('#ev-resultados .ea-section-body'), g = document.querySelector('.evr-analise');
      const filhos = [...document.querySelectorAll('.secao-favorabilidade-sobreposicoes *, .secao-favorabilidade-mapa *')]
        .filter(n => n.offsetParent && !n.closest('.fv-intervalos-rolagem') && !n.closest('.evr-grafico-conteudo'));
      const vazam = filhos.filter(n => { const b = n.getBoundingClientRect(); const p = n.closest('.evr-painel').getBoundingClientRect(); return b.width && (b.right > p.right + 1 || b.left < p.left - 1); }).map(n => n.className || n.tagName);
      return {grade, indices, mapa, corpo, vazam, rolagemGrade: g.scrollWidth - g.clientWidth,
        direitaCorpo: document.querySelector('#ev-resultados .ea-section-body').getBoundingClientRect().right,
        docLargura: document.documentElement.scrollWidth - document.documentElement.clientWidth};
    });

    for (const largura of [1440, 1200, 1120]) {
      await page.setViewportSize({width: largura, height: 1000});
      const m = await medir();
      assert.ok(m.indices.right <= m.mapa.left, `${largura}px: índices à esquerda, sem sobreposição ao mapa`);
      assert.ok(m.indices.left >= m.grade.left - 1 && m.mapa.right <= m.grade.right + 1, `${largura}px: painéis dentro do container`);
      assert.ok(m.mapa.right <= m.corpo.right, `${largura}px: dentro do corpo da seção`);
      assert.ok(Math.abs(m.indices.height - m.mapa.height) < 2, `${largura}px: mesma altura`);
      assert.ok(m.indices.width > 380 && m.mapa.width > 380, `${largura}px: larguras legíveis (${m.indices.width}/${m.mapa.width})`);
      assert.equal(m.rolagemGrade, 0, `${largura}px: sem rolagem horizontal na grade`);
      assert.deepEqual(m.vazam, [], `${largura}px: nenhum elemento vaza do painel`);
      assert.equal(m.docLargura, 0, `${largura}px: página sem rolagem horizontal`);
    }
    // Em telas estreitas as seções empilham, mantendo os índices antes do mapa.
    await page.setViewportSize({width: 900, height: 1000});
    const estreita = await medir();
    assert.ok(estreita.indices.bottom <= estreita.mapa.top + 1 && Math.abs(estreita.indices.left - estreita.mapa.left) < 2, 'Empilhadas abaixo de 1100px');
    assert.equal(estreita.docLargura, 0);
    assert.deepEqual(erros, []);

    // Mesmo HTML e controlador reais, com falha de leitura e lote parcial sintéticos.
    let preparacoes = 0;
    const campo = {id:'grade', nome:'Superfície municipal de teste', papel:'grade'};
    const valor = indice => ({indice, classe:indice === null ? null : 'Baixa',
      estado_indice:indice === null ? 'nulo' : 'valido', estado_classe:indice === null ? 'nulo' : 'valido',
      campo_indice:'fav_territorial_dim', campo_classe:'fav_territorial_classe'});
    const poligono = i => ({type:'Polygon', coordinates:[[[-47+i*.02,-23],[-46.99+i*.02,-23],
      [-46.99+i*.02,-22.99],[-47+i*.02,-22.99],[-47+i*.02,-23]]]});
    const linhas = [0, null, undefined].map((v,i) => ({chave:String(i), id:`D${i}`, nome:`Demanda de teste ${i}`,
      area_total_m2:100, areas:[i === 2 ? null : 0],
      sobreposicoes:i === 2 ? [] : [{id:`f${i}`, base_id:'grade', nome:`Feição de teste ${i}`, papel:'grade',
        identificador:i, area_m2:0, percentual:0, favorabilidade:valor(v)}]}));
    const modelo = {analise:'favorabilidade', concluidas:1, previstas:2, metodologia:'Amostra sintética, sem processamento.',
      relatorios_hierarquizacao:[{hierarquizacao:'HIER-TESTE'}],
      fontes:[{id:'entrada',nome:'Demandas de teste',papel:'entrada',tipo:'camada'}, {...campo,tipo:'camada'}],
      entradas:[{id:'job-teste', nome:'Demandas de teste', feicoes:3, com_intersecao:2, sem_intersecao:1, campos:[campo], linhas,
        geometrias:{type:'FeatureCollection',features:linhas.map((l,i) => ({type:'Feature',properties:{chave:l.chave},geometry:poligono(i)}))},
        intersecoes:{type:'FeatureCollection',features:linhas.slice(0,2).map((l,i) => ({
          type:'Feature',properties:{chave:l.chave,base_id:'grade',feicao_id:`f${i}`},geometry:poligono(i)}))}}]};
    await page.route('**/api/geoespacial/extracao-atributos/favorabilidade/resultados/**', route => {
      const nome = new URL(route.request().url()).pathname.split('/').pop();
      if (nome === 'preparar') return ++preparacoes === 1
        ? route.fulfill({status:503,json:{detail:'Falha de leitura simulada; saída preservada.'}})
        : route.fulfill({json:{fontes:modelo.fontes,revisados:true,concluidas:1,previstas:2}});
      if (nome === 'visualizar') return route.fulfill({json:modelo});
      if (nome === 'superficie') return route.fulfill({status:503,json:{detail:'Contexto indisponível no teste.'}});
      return route.fulfill({status:400,json:{detail:'Operação não prevista no teste.'}});
    });
    await page.reload({waitUntil:'load'});
    assert.equal(await page.locator('#ev-resultados-download').isDisabled(), true);
    assert.match(await page.locator('#ev-resultados-vazio').innerText(), /Nenhuma análise apresentada/);
    await page.evaluate(async () => {
      window.ProcessFeedback = {iniciarCadastro:() => ({detalhe(){}, sucesso(){}, erro(){}})};
      const {criarResultados} = await import('/restrict/hierarquizacao/js/elegibilidade-resultados.js?v=20261026-comunicacao');
      window.resultadosTeste = criarResultados({analise:'favorabilidade',avisar(){},aoOcupar(){}});
      window.resultadosTeste.iniciar(); window.resultadosTeste.adicionar('job-teste');
      await window.resultadosTeste.finalizar();
    });
    assert.match(await page.locator('#ev-resultados-status').innerText(), /Falha de leitura simulada/);
    assert.equal(await page.locator('#ev-resultados-tentar').isVisible(), true);
    assert.equal(await page.locator('#ev-resultados-download').isDisabled(), true);
    await page.locator('#ev-resultados-tentar').click();
    await page.waitForFunction(() => !document.querySelector('#ev-resultados-download').disabled);
    assert.equal(await page.locator('#ev-resultados-vazio').isHidden(), true);
    assert.match(await page.locator('#ev-resultados-status').innerText(), /Resultados parciais: 1 de 2/);
    assert.match(await page.locator('#ev-resultados-status').innerText(), /Relatório da Fase 2/);
    assert.doesNotMatch(await page.locator('#ev-resultados-status').innerText(), /Relatório da Fase 1/);
    assert.match(await page.locator('#ev-resultados-status').innerText(), /índice ou classe ausente, nulo ou inválido/);
    assert.match(await page.locator('#ev-resultados-tabela').innerText(), /0,00/);
    assert.match(await page.locator('#ev-resultados-tabela').innerText(), /Sem valor/);
    assert.match(await page.locator('#ev-resultados-tabela').innerText(), /Sem interseção/);
    await page.waitForFunction(() => document.querySelector('#ev-resultados-mapa-camada-nota').textContent.includes('indisponível'));
    assert.equal(await page.locator('#ev-resultados-tabela tbody tr').count(), 3);
    await page.locator('#ev-resultados-tendencia').selectOption('media');
    assert.match(await page.locator('#ev-resultados-estatisticas-status').innerText(), /O PDF mantém os valores originais/);
    for (const largura of [1440, 390]) {
      await page.setViewportSize({width:largura,height:1000});
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), 0);
      await page.locator('#ev-resultados').scrollIntoViewIfNeeded();
    }
    assert.deepEqual(erros, []);
    if (process.env.SICARD_SCREENSHOT_DIR) {
      fs.mkdirSync(process.env.SICARD_SCREENSHOT_DIR, {recursive: true});
      await page.setViewportSize({width: 1440, height: 1000});
      await page.locator('.evr-analise').screenshot({path: path.join(process.env.SICARD_SCREENSHOT_DIR, 'fase2-lado-a-lado.png')});
    }
    console.log('PASS: fase 2, seção 5 — layout responsivo; vazio, erro, recuperação, lote parcial, zero, nulo, sem interseção e estatísticas preservados; contexto indisponível não elimina resultados.');
  } finally {
    await browser?.close();
    server.closeAllConnections?.();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(erro => { console.error(erro); process.exitCode = 1; });
