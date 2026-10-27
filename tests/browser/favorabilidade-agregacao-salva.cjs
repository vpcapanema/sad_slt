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
    const modelo = {analise:'favorabilidade', concluidas:1, previstas:1, metodologia:'Amostra sintética, sem processamento.',
      relatorios_hierarquizacao:[{hierarquizacao:'HIER-TESTE'}],
      fontes:[{id:'entrada',nome:'Demandas de teste',papel:'entrada',tipo:'camada'}, {...campo,tipo:'camada'}],
      entradas:[{id:'job-teste', hierarquizacao:'HIER-TESTE', nome:'Demandas de teste', feicoes:3, com_intersecao:2, sem_intersecao:1, campos:[campo], linhas,
        geometrias:{type:'FeatureCollection',features:linhas.map((l,i) => ({type:'Feature',properties:{chave:l.chave},geometry:poligono(i)}))},
        intersecoes:{type:'FeatureCollection',features:linhas.slice(0,2).map((l,i) => ({
          type:'Feature',properties:{chave:l.chave,base_id:'grade',feicao_id:`f${i}`},geometry:poligono(i)}))}}]};

    linhas[0].sobreposicoes[0].favorabilidade = valor(.2);
    linhas[0].sobreposicoes.push({...linhas[0].sobreposicoes[0], id:'outra', favorabilidade:valor(.8)});
    let salva = null, gravacoes = 0;
    await page.route('**/api/geoespacial/extracao-atributos/favorabilidade/resultados/**', route => {
      const nome = new URL(route.request().url()).pathname.split('/').pop();
      const dados = route.request().postDataJSON();
      if (nome === 'preparar') return route.fulfill({json:{fontes:modelo.fontes,revisados:true,concluidas:1,previstas:1}});
      if (nome === 'visualizar') return route.fulfill({json:modelo});
      if (nome === 'consultar') return route.fulfill({json:{configuracao:salva}});
      if (nome === 'salvar') {
        salva = {medida:dados.medida,percentil:dados.percentil};
        return route.fulfill({json:{configuracao:salva}});
      }
      if (nome === 'registrar') {
        assert.deepEqual(dados.agregacao, salva);
        if (dados.versao) gravacoes++;
        return route.fulfill({json:dados.versao ? {registrado:true} : {versao:'v1',hierarquizacao:'HIER-TESTE',demandas:3}});
      }
      return route.fulfill({status:503,json:{detail:'Contexto indisponível no teste.'}});
    });
    assert(await page.locator('#ev-resultados-relatorios').isHidden());
    assert(await page.locator('#ev-resultados-abrir').isVisible());
    assert.equal(await page.locator('.secao-favorabilidade-conferencia table, .secao-favorabilidade-conferencia .admin-actions, .secao-favorabilidade-conferencia .admin-pagination').count(), 0);
    assert.equal(await page.locator('.fv-conferencia-grupo').count(), 3);
    await page.evaluate(async () => {
      window.ProcessFeedback = {iniciarCadastro:() => ({detalhe(){}, sucesso(){}, erro(){}}), confirmar:async()=>true};
      const {criarResultados} = await import('/restrict/hierarquizacao/js/elegibilidade-resultados.js');
      window.resultadosTeste = criarResultados({analise:'favorabilidade',avisar(){},aoOcupar(){}});
      const {criarConferencia} = await import('/restrict/hierarquizacao/js/favorabilidade-conferencia.js');
      for (const papel of ['entrada','grade','rede']) criarConferencia(papel).atualizar([{id:'camada',nome:'Camada de teste',arquivo:'pasta/arquivo.gpkg'}]);
      window.resultadosTeste.iniciar(); window.resultadosTeste.adicionar('job-teste');
      await window.resultadosTeste.finalizar();
    });
    assert(await page.locator('#ev-resultados-relatorios').isVisible());
    assert(await page.locator('#ev-resultados-vazio').isHidden());
    const registrar = page.getByRole('button', {name:'Registrar resultados da fase', exact:true});
    const salvar = page.locator('#ev-resultados-salvar-medida');
    assert(await registrar.isDisabled());
    assert(await salvar.isDisabled());
    await page.locator('#ev-resultados-tendencia').selectOption('media');
    assert.match(await page.locator('#ev-resultados-agregados tbody tr').first().innerText(), /0,50/);
    assert.equal(await page.locator('#ev-resultados-agregados th.evr-col-selecao').evaluate(n=>n.getBoundingClientRect().width),44);
    assert.equal(await page.locator('.fv-agregados-quadro .admin-filter-bar').evaluate(n=>n.getBoundingClientRect().height),32);
    const todos = page.getByRole('checkbox', {name:'Selecionar todas as demandas filtradas'});
    await todos.check();
    assert.equal(await page.locator('#ev-resultados-agregados tbody input:checked').count(),3);
    await todos.uncheck();
    assert.equal(await page.locator('#ev-resultados-agregados tbody input:checked').count(),0);
    assert(await salvar.isEnabled());
    assert(await registrar.isDisabled());
    await salvar.click();
    await page.waitForFunction(() => document.querySelector('#ev-resultados-estatisticas-status').textContent.includes('Medida salva'));
    assert.equal(salva.medida, 'media');
    assert.equal(gravacoes, 0, 'Salvar não grava no banco');
    assert(await registrar.isEnabled());
    await page.locator('#ev-resultados-posicao').selectOption('percentil');
    await page.locator('#ev-resultados-percentil').fill('75');
    assert.match(await page.locator('#ev-resultados-agregados tbody tr').first().innerText(), /0,65/);
    assert(await registrar.isDisabled(), 'Alterar medida exige salvar novamente');
    assert.equal(await page.locator('#ev-resultados-tendencia').inputValue(), '');
    await salvar.click();
    await page.waitForFunction(() => document.querySelector('#ev-resultados-estatisticas-status').textContent.includes('Medida salva'));
    await registrar.click();
    await page.waitForFunction(() => document.querySelector('#ev-resultados-status').textContent.includes('sem repetir'));
    assert.equal(gravacoes, 1);
    assert.deepEqual(salva, {medida:'percentil',percentil:75});
    await page.evaluate(async () => {
      window.resultadosTeste.iniciar(); window.resultadosTeste.adicionar('job-teste');
      await window.resultadosTeste.finalizar();
    });
    assert.equal(await page.locator('#ev-resultados-posicao').inputValue(), 'percentil');
    assert.equal(await page.locator('#ev-resultados-percentil').inputValue(), '75');
    await page.evaluate(async () => {
      const {renderizarLegendaFavorabilidade} = await import('/restrict/hierarquizacao/js/favorabilidade-legenda.js');
      renderizarLegendaFavorabilidade(document.getElementById('ev-resultados-mapa-legenda'),
        ['Alta','Muito Alta','Baixa','Média','Muito Baixa','Especial'].map(classe => ({classe,estado_classe:'valido'})));
    });
    assert.deepEqual(await page.locator('.fv-legenda-escala li span').allTextContents(),
      ['Muito Baixa','Baixa','Média','Alta','Muito Alta']);
    assert.deepEqual(await page.locator('.fv-legenda-outras li span').allTextContents(), ['Especial']);
    for (const [width,height] of [[1440,1000],[1440,720],[390,844]]) {
      await page.setViewportSize({width,height});
      const layout = await page.evaluate(() => {
        const r = id => document.querySelector(id).getBoundingClientRect();
        return {mapa:r('#ev-resultados-mapa'),legenda:r('#ev-resultados-mapa-legenda'),painel:r('.secao-favorabilidade-mapa')};
      });
      assert(layout.legenda.top >= layout.mapa.bottom - 1, 'Legenda abaixo do canvas');
      assert(layout.legenda.bottom <= layout.painel.bottom + 1, 'Legenda dentro do painel');
    }
    for (const largura of [1440,390]) {
      await page.setViewportSize({width:largura,height:1000});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth),0);
    }
    assert.deepEqual(erros, []);
    await page.setViewportSize({width:1440,height:1000});
    fs.mkdirSync(path.join(root,'.tmp'),{recursive:true});
    await page.locator('#ev-resultados-relatorios').screenshot({path:path.join(root,'.tmp/favorabilidade-finalizacao.png')});
    await page.locator('.secao-favorabilidade-mapa').screenshot({path:path.join(root,'.tmp/favorabilidade-legenda.png')});
    await page.locator('.secao-favorabilidade-agregados').screenshot({path:path.join(root,'.tmp/favorabilidade-agregacao.png')});
    campo.tipo = 'raster';
    linhas.forEach((linha,i) => {
      linha.rasters = [{base_id:'grade',papel:'grade',indice:i === 0 ? .6 : i === 1 ? 0 : null,
        cobertura_percentual:i === 0 ? 75 : i === 1 ? 50 : 0,celulas_validas:i === 0 ? 2 : i === 1 ? 1 : 0,
        metrica:'media_ponderada_area'}];
    });
    salva = {medida:'media',percentil:null};
    await page.evaluate(async () => {
      window.resultadosTeste.iniciar(); window.resultadosTeste.adicionar('job-teste');
      await window.resultadosTeste.finalizar();
    });
    assert.match(await page.locator('#ev-resultados-agregados tbody tr').first().innerText(), /0,60/);
    assert.match(await page.locator('#ev-resultados-agregados tbody tr').first().innerText(), /75%/);
    assert.match(await page.locator('#ev-resultados-estatisticas-status').innerText(), /Regra fixa/);
    for (const id of ['tendencia','dispersao','posicao','percentil'])
      assert(await page.locator(`#ev-resultados-${id}`).isDisabled(),`Raster: ${id} não altera a média por área`);
    await todos.check();
    assert(await page.locator('#ev-resultados-tendencia').isDisabled(),'Seleção de linha não reativa medidas alternativas para raster');
    assert(await salvar.isDisabled(),'Não exige salvar medida alternativa para raster');
    assert(await registrar.isEnabled(),'Regra raster auditada permite registro explícito');
    assert.deepEqual(erros, []);
    console.log('PASS: conferência sem tabela; resultados progressivos; escolha obrigatória, salvar, registrar, alteração e reabertura da medida.');
  } finally {
    await browser?.close(); server.closeAllConnections?.(); await new Promise(resolve=>server.close(resolve));
  }
})().catch(erro=>{console.error(erro);process.exitCode=1;});
