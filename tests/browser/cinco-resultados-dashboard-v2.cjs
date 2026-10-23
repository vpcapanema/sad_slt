// Dashboard da seção 5: página real renderizada pelo servidor, APIs interceptadas, sem gravação.
const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs'), http = require('node:http'), path = require('node:path');
const {execFileSync} = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const ROTA = '/restrict/hierarquizacao/fase-1/';
const SAIDA = process.env.SICARD_SCREENSHOT_DIR || '';

function modeloFixture() {
  const bases = [
    {id: 'b-app', nome: 'Áreas de Preservação Permanente', papel: 'restricao', campo: 're_app'},
    {id: 'b-uc', nome: 'Unidades de Conservação', papel: 'restricao', campo: 're_uc'},
    {id: 'b-inund', nome: 'Suscetibilidade à Inundação', papel: 'risco', campo: 'ri_inund'},
  ];
  const quadrado = (x, y, l) => ({type: 'Polygon', coordinates: [[[x, y], [x + l, y], [x + l, y + l], [x, y + l], [x, y]]]});
  const linhas = [], geometrias = [], intersecoes = [];
  const total = 1e6;
  for (let i = 0; i < 30; i++) {
    const x = -47 + (i % 6) * .05, y = -23 + Math.floor(i / 6) * .05, sobreposicoes = [];
    geometrias.push({type: 'Feature', properties: {chave: String(i)}, geometry: quadrado(x, y, .02)});
    bases.forEach((b, j) => {
      const soRisco = i === 28;
      if (soRisco ? b.papel === 'restricao' : ((i + j) % 3 === 0 || i === 29)) return;
      const area = i === 4 && j === 2 ? 0 : total * (.02 + ((i * 7 + j * 13) % 40) / 100);
      const ident = `${b.id}-f${i}`;
      sobreposicoes.push({id: ident, base_id: b.id, nome: `Zona ${j + 1} de ${b.nome}`, papel: b.papel, area_m2: area,
        percentual: area / total * 100, identificador: j + 1});
      intersecoes.push({type: 'Feature', properties: {chave: String(i), base_id: b.id, feicao_id: ident},
        geometry: quadrado(x + .002 * j, y + .002 * j, .01)});
    });
    linhas.push({id: `D-${i}`, chave: String(i), nome: `Demanda ${String(i).padStart(2, '0')} - Trecho Rodoviário`,
      area_total_m2: total, areas: bases.map(() => null), sobreposicoes});
  }
  const fontes = [{id: 'entrada-1', nome: 'Demandas da Rodada', papel: 'entrada', tipo: 'camada'},
    ...bases.map(b => ({id: b.id, nome: b.nome, papel: b.papel, tipo: 'camada'}))];
  const entrada = {id: 'execucao-1', nome: 'Demandas da Rodada', concluido_em: '2026-10-23T15:00:00Z', feicoes: 30,
    com_intersecao: 29, sem_intersecao: 1, campos: bases, linhas, geometrias: {type: 'FeatureCollection', features: geometrias},
    intersecoes: {type: 'FeatureCollection', features: intersecoes}};
  return {fontes, entradas: [entrada], concluidas: 1, previstas: 1, metodologia: 'Interseções independentes em EPSG:5880.', nomes_revisados: true};
}

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
  const modelo = modeloFixture();
  let browser;
  try {
    browser = await chromium.launch({headless: true,
      channel: process.env.SICARD_TEST_BROWSER || (process.platform === 'win32' ? 'msedge' : undefined),
      args: ['--no-proxy-server', '--enable-unsafe-swiftshader']});
    const page = await browser.newPage({viewport: {width: 1440, height: 1000}});
    const erros = [], pedidosAtributos = [];
    page.on('pageerror', erro => erros.push(erro.message));
    await page.route('https://**/*', request => request.abort());
    await page.route('**/api/**', request => {
      const caminho = new URL(request.request().url()).pathname;
      if (caminho.endsWith('/resultados/preparar')) return request.fulfill({json: {fontes: modelo.fontes, revisados: true, concluidas: 1, previstas: 1}});
      if (caminho.endsWith('/resultados/visualizar')) return request.fulfill({json: modelo});
      if (caminho.endsWith('/resultados/feicao/atributos')) {
        const corpo = request.request().postDataJSON();
        pedidosAtributos.push(corpo);
        return request.fulfill({json: {base_id: corpo.base_id, posicao: corpo.posicao, origem: 'Fonte original atual da camada; não é uma cópia histórica da rodada.',
          campos: [{campo: 'nm_zona', alias: 'Nome da zona', valor: `Zona ${corpo.posicao}`}, {campo: 'cd_uc', alias: 'Código da unidade', valor: '42'},
            {campo: 'obs', alias: 'Observações', valor: ''}]}});
      }
      return request.fulfill({json: []});
    });
    await page.route('**/fase1-elegibilidade-v2.js*', request => request.fulfill({body: '', contentType: 'text/javascript'}));
    await page.route('**/extracao-atributos/app.js*', request => request.fulfill({body: '', contentType: 'text/javascript'}));
    await page.route('**/geoespacial/bancada/', request => request.fulfill({body: '<!doctype html><title>Bancada</title>', contentType: 'text/html'}));
    await page.goto(base + ROTA, {waitUntil: 'domcontentloaded'});
    await page.evaluate(async () => {
      const {criarResultados} = await import('/restrict/hierarquizacao/js/cinco-resultados_elegibilidade_v2.js');
      window.__r = criarResultados({avisar() {}, aoOcupar() {}});
      window.__r.iniciar(); window.__r.adicionar('execucao-1'); await window.__r.finalizar();
    });
    const secao = page.locator('#cinco-resultados_elegibilidade_v2');
    await secao.locator('#ev2-conteudo').waitFor({state: 'visible'});
    assert.equal(await page.locator('#ev-resultados').count(), 0, 'A seção 5 antiga não pode estar no HTML ativo da página');

    // Estado inicial: três painéis, 5 indicadores, todas as demandas e todos os registros.
    assert.equal(await secao.locator('.ev2-card').count(), 5, 'Cards: total e as quatro situações');
    // Os cards de situação são ordenados pela quantidade de demandas (decrescente), após o total.
    const rotulos = await secao.locator('.ev2-card > span:not(.ev2-card-trilho)').allTextContents();
    const quantidades = (await secao.locator('.ev2-card > strong').allTextContents()).map(t => Number(t.replace(/\./g, '')));
    assert.equal(rotulos[0], 'Demandas analisadas');
    assert.deepEqual([...rotulos.slice(1)].sort(),
      ['Com restrição e risco', 'Com restrição', 'Com risco', 'Livre de restrições e riscos'].sort());
    const situacoes = quantidades.slice(1);
    assert.deepEqual(situacoes, [...situacoes].sort((a, b) => b - a), 'Situações em ordem decrescente de quantidade');
    assert.equal(await secao.locator('.ev2-linha').count(), 30);
    const registros = await secao.locator('#ev2-tabela tbody tr').count();
    assert.ok(registros > 0 && registros <= 50);
    assert.match(await secao.locator('#ev2-selecao-texto').innerText(), /Nenhuma demanda selecionada/);
    assert.equal(await secao.locator('#ev2-limpar').isDisabled(), true);
    assert.ok(await secao.locator('#ev2-mapa .leaflet-interactive').count() > 30, 'Mapa com demandas e interseções');

    // 1) Clique no gráfico → gráfico, tabela e seleção respondem.
    await secao.locator('.ev2-linha[data-chave="3"] .ev2-linha-botao').click();
    assert.equal(await secao.locator('.ev2-linha.ativa').count(), 1);
    assert.equal(await secao.locator('.ev2-linha.esmaecida').count(), 29);
    assert.ok(await secao.locator('.ev2-linha.ativa .ev2-feicao').count() >= 1, 'A demanda se expande nas feições');
    const linhasTabela = await secao.locator('#ev2-tabela tbody tr').evaluateAll(trs => trs.map(tr => ({d: tr.children[0].textContent, ativa: tr.classList.contains('ativo')})));
    assert.ok(linhasTabela.length >= 1 && linhasTabela.every(l => l.d.startsWith('Demanda 03') && l.ativa), 'Tabela filtrada e destacada');
    assert.match(await secao.locator('#ev2-selecao-texto').innerText(), /Demanda 03/);
    assert.match(await secao.locator('#ev2-selecao-texto').innerText(), /Tem (\d+ )?restri/);
    const textoSecao = await secao.evaluate(el => { const copia = el.cloneNode(true); copia.querySelectorAll('.ev2-conclusao, details').forEach(n => n.remove()); return copia.textContent; });
    const jargao = textoSecao.match(/.{0,40}(interse[cç]|feiç|cobertura|geometri|refer[eê]ncia).{0,40}/is);
    assert.equal(jargao?.[0], undefined, 'Linguagem voltada ao usuário, sem jargão de geoprocessamento');
    assert.equal(await secao.locator('#ev2-limpar').isDisabled(), false);

    // 2) Clique numa feição → um único registro; repetir sobe para a demanda.
    const feicao = secao.locator('.ev2-linha.ativa .ev2-feicao').first();
    const idFeicao = await feicao.getAttribute('data-feicao');
    await feicao.click();
    assert.equal(await secao.locator('#ev2-tabela tbody tr').count(), 1);
    assert.equal(await secao.locator('#ev2-tabela tbody tr').first().getAttribute('data-feicao'), idFeicao);
    assert.match(await secao.locator('#ev2-selecao-texto').innerText(), /sobrepõe-se, em aproximadamente/);
    await secao.locator(`.ev2-linha.ativa .ev2-feicao[data-feicao="${idFeicao}"]`).click();
    assert.ok(await secao.locator('#ev2-tabela tbody tr').count() >= 1);
    assert.doesNotMatch(await secao.locator('#ev2-selecao-texto').innerText(), /Em foco/);

    // 3) Rosca: anel = área total da demanda; um arco por polígono atingido. Clicar no arco → mapa, zoom e popup com atributos.
    assert.equal(await secao.locator('#ev2-rosca .ev2-rosca-anel').count(), 1);
    const arcos = await secao.locator('#ev2-rosca .ev2-arco').count();
    assert.equal(arcos, await secao.locator('.ev2-linha.ativa .ev2-feicao').count(), 'Um arco para cada polígono atingido');
    assert.equal(await secao.locator('#ev2-grafico-title').textContent(), 'Detalhamento da análise');
    const arco = secao.locator('#ev2-rosca .ev2-arco').first();
    const idArco = await arco.getAttribute('data-feicao');
    await arco.dispatchEvent('click');
    await secao.locator('.leaflet-popup .ev2-popup-tabela').last().waitFor();
    assert.equal(await secao.locator('#ev2-tabela tbody tr').count(), 1);
    assert.equal(await secao.locator('#ev2-tabela tbody tr').first().getAttribute('data-feicao'), idArco);
    assert.equal(await secao.locator('#ev2-rosca .ev2-arco[aria-pressed="true"]').count(), 1, 'Arco destacado na rosca');
    const popup = await secao.locator('.leaflet-popup').last().innerText();
    assert.match(popup, /Nome da zona/); assert.match(popup, /Código da unidade/); assert.match(popup, /Observações\s*—/);
    assert.doesNotMatch(popup, /nm_zona|cd_uc/, 'Somente aliases amigáveis, sem nomes técnicos de campo');
    assert.equal(pedidosAtributos.length, 1, 'Atributos já consultados ficam em cache');
    assert.equal(pedidosAtributos[0].execucao, 'execucao-1');
    await arco.dispatchEvent('click');
    await page.waitForFunction(() => !document.querySelector('.leaflet-popup'));

    // 4) Seleção pelo mapa (interseção) e pela tabela.
    await secao.locator('#ev2-limpar').click();
    assert.equal(await secao.locator('.ev2-linha.ativa').count(), 0);
    await secao.locator('#ev2-tabela tbody tr').nth(5).click();
    const escolhida = await secao.locator('#ev2-tabela tbody tr.ativo').first().getAttribute('data-chave');
    assert.equal(await secao.locator(`.ev2-linha.ativa[data-chave="${escolhida}"]`).count(), 1, 'Tabela → gráfico');
    await secao.locator('#ev2-limpar').click();
    await secao.locator('#ev2-mapa path.leaflet-interactive').nth(40).dispatchEvent('click');
    assert.equal(await secao.locator('.ev2-linha.ativa').count(), 1, 'Mapa → gráfico e tabela');
    await secao.locator('#ev2-mapa').focus();
    await page.keyboard.press('Escape');
    assert.equal(await secao.locator('.ev2-linha.ativa').count(), 0, 'Esc limpa a seleção');

    // 4) Filtros: situação por KPI, busca e categorias valem para os três painéis.
    await secao.locator('.ev2-card.sit-livre').click();
    assert.equal(await secao.locator('.ev2-linha').count(), 1);
    assert.match(await secao.locator('#ev2-tabela tbody tr').first().innerText(), /Nenhuma restrição ou risco encontrado/);
    assert.equal(await secao.locator('#ev2-situacao').inputValue(), 'livre', 'O card filtra a lista');
    await secao.locator('.ev2-card.sit-livre').click();
    assert.equal(await secao.locator('.ev2-linha').count(), 30);
    await secao.locator('.ev2-card.sit-restricao').click();
    assert.equal(await secao.locator('.ev2-linha').count(), 9);
    await secao.locator('.ev2-card.sit-todas').click();
    assert.equal(await secao.locator('.ev2-linha').count(), 30);
    await secao.locator('#ev2-busca').fill('demanda 1');
    assert.equal(await secao.locator('.ev2-linha').count(), 10);
    await secao.locator('#ev2-busca').fill('');
    await secao.locator('#ev2-cat-restricao').uncheck();
    assert.equal(await secao.locator('#ev2-tabela td.ev2-cat.restricao').count(), 0);
    assert.equal(await secao.locator('.ev2-linha.ativa .ev2-feicao.restricao').count(), 0);
    await secao.locator('#ev2-cat-risco').click();
    assert.equal(await secao.locator('#ev2-cat-risco').isChecked(), true, 'Ao menos uma categoria permanece');
    await secao.locator('#ev2-cat-restricao').check();

    // 5) Resumo da Elegibilidade: uma linha por demanda sem restrição (risco ou livre), com índice de 0 a 1.
    const resumo = secao.locator('#ev2-resumo-tabela');
    assert.deepEqual(await resumo.locator('thead th').allTextContents(),
      ['Objeto de demanda', 'Camadas de risco', 'Área de sobreposição', 'Porcentagem sobreposta', 'Índice de risco ambiental e territorial']);
    const linhasResumo = await resumo.locator('tbody tr').evaluateAll(trs => trs.map(tr => [...tr.children].map(td => td.textContent.trim())));
    assert.equal(linhasResumo.length, 2, 'Somente a demanda com risco e a livre; demandas com restrição não entram');
    assert.deepEqual(linhasResumo.map(l => l[0].slice(0, 10)), ['Demanda 28', 'Demanda 29'], 'Ordenadas da mais à menos exposta ao risco');
    assert.ok(linhasResumo[0][1].includes('Suscetibilidade à Inundação') && !linhasResumo[0][1].includes('Preservação'));
    const [, , areaRisco, pctRisco, indiceRisco] = linhasResumo[0];
    const pct = Number(pctRisco.replace('%', '').replace(/\./g, '').replace(',', '.')), idx = Number(indiceRisco.replace(',', '.'));
    assert.ok(Math.abs(idx - (1 - pct / 100)) < 1e-3 && idx > 0 && idx < 1, `${pctRisco} → ${indiceRisco}`);
    assert.match(areaRisco, /ha$/);
    assert.deepEqual(linhasResumo[1].slice(1), ['Nenhuma camada de risco atingida', '0,0000 ha', '0,00%', '1,0000']);
    assert.match(await secao.locator('#ev2-resumo-contagem').innerText(), /2 de 30 demanda/);
    await resumo.locator('tbody tr').first().click();
    assert.equal(await secao.locator('.ev2-linha.ativa').count(), 1, 'Clicar no resumo seleciona a demanda nos demais painéis');
    assert.equal(await resumo.locator('tbody tr.ativo').count(), 1);
    assert.match(await secao.locator('#ev2-selecao-texto').innerText(), /Demanda 28/);
    await secao.locator('#ev2-limpar').click();
    assert.equal(await resumo.locator('tbody tr.ativo').count(), 0);
    // Tipografia: todo texto visível em rem inteiro da escala da página, sem tamanhos em px fora da escala.
    const folhas = await page.evaluate(() => [...document.styleSheets].map(s => `${s.href?.split('/').slice(-1)[0]}:${(() => { try { return s.cssRules.length; } catch { return 'x'; } })()}`));
    console.log('Folhas:', JSON.stringify(folhas));
    const tamanhos = await secao.evaluate(raiz => {
      const resultado = new Map();
      for (const n of raiz.querySelectorAll('*')) {
        if (n.closest('[hidden]') || n.closest('svg') || n.closest('.leaflet-pane') || n.closest('.leaflet-control-container') || n.tagName === 'OPTION') continue;
        if (![...n.childNodes].some(c => c.nodeType === 3 && c.textContent.trim())) continue;
        const px = parseFloat(getComputedStyle(n).fontSize);
        const amostra = `${n.tagName.toLowerCase()}.${String(n.className)}#${n.id}<${n.parentElement?.className}> "${n.textContent.trim().slice(0, 24)}"`;
        const atual = resultado.get(px) || {n: 0, amostras: new Set()};
          atual.n++; if (atual.amostras.size < 6) atual.amostras.add(amostra);
        resultado.set(px, atual);
      }
      return [...resultado].sort((a, b) => a[0] - b[0]).map(([px, v]) => [px, v.n, [...v.amostras]]);
    });
    console.log('Tamanhos de fonte (px, ocorrências, amostras):', JSON.stringify(tamanhos));
    const permitidos = new Set([0.72, 0.74, 0.75, 0.78, 0.8, 0.82, 0.84, 0.85, 0.8125, 0.875, 0.9, 0.9375, 0.95].map(r => r * 16));
    for (const [px, , amostras] of tamanhos) assert.ok([...permitidos].some(p => Math.abs(p - px) < .05), `Tamanho fora da escala da página: ${px}px em ${amostras.join(', ')}`);
    const px = seletor => page.locator(seletor).first().evaluate(n => getComputedStyle(n).fontSize);
    assert.equal(await px('#ev2-status'), await px('#ev-status'), 'Notas da seção 5 seguem a hierarquia das notas da página');
    assert.equal(await px('#ev2-title'), await px('#ev-bancada-title'), 'Título da seção 5 igual ao das demais seções');
    assert.equal(await px('.ev2-tabela th'), `${0.72 * 16}px`, 'Cabeçalho de tabela como na referência (Agrupamento)');
    assert.equal(await px('.ev2-tabela td'), `${0.74 * 16}px`, 'Célula de tabela como na referência (Agrupamento)');
    assert.ok(Math.min(...tamanhos.map(t => t[0])) >= 11, 'Nenhum texto menor que 11px');

    if (SAIDA) {
      fs.mkdirSync(SAIDA, {recursive: true});
      await secao.locator('.ev2-linha-botao').nth(0).click();
      await secao.locator('#ev2-rosca .ev2-arco').first().dispatchEvent('click');
      await secao.locator('.leaflet-popup .ev2-popup-tabela').last().waitFor();
      await page.waitForTimeout(400);
      await secao.screenshot({path: path.join(SAIDA, 'secao5-dashboard.png')});
      await secao.locator('.ev2-painel-resumo').screenshot({path: path.join(SAIDA, 'secao5-resumo.png')});
    }
    assert.deepEqual(erros, [], 'Sem erros de JavaScript');
    console.log('PASS: dashboard da seção 5 — gráfico, mapa e tabela interligados pela mesma seleção; filtros e tipografia conferidos.');
  } finally {
    await browser?.close();
    server.closeAllConnections?.();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(erro => { console.error(erro); process.exitCode = 1; });
