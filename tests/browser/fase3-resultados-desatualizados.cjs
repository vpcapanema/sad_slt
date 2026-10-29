const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs'), http = require('node:http'), path = require('node:path');
const {execFileSync} = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const rota = '/restrict/hierarquizacao/fase-3/';
const referencia = '/restrict/analise-multicriterio/central-julgamentos';
const rodada = (codigo, pendente, desatualizada) => ({codigo, nome: codigo, dados_hierarquizacao: {
  cabecalho_grupo: {tipo_demanda: 'projeto'},
  objetos: [{cabecalho_objeto: {codigo: 'D1', nome: 'Demanda teste', tipo_demanda: 'projeto', atributos: {},
    complementacao_atributos: {concluida: !pendente}},
  hierarquizacao: {fase_3: {executada: true, score_fase3: 0.75, ranking_fase3: 1, grau_completude_fase3: 1,
    ...(desatualizada ? {desatualizado: {por: 'atributos', em: '2026-10-27T10:00:00'}} : {})}}}],
}});
(async () => {
  const paginas = JSON.parse(execFileSync(path.join(root, '.venv', 'Scripts', 'python.exe'), ['-B', '-X', 'utf8', '-c', [
    'import json', 'from fastapi.testclient import TestClient', 'from api.server import app',
    'from api.services.session_service import SessionUser, cookie_name, create_token',
    `rotas = ${JSON.stringify([rota, referencia])}`, 'client = TestClient(app)',
    'usuario = SessionUser(id="00000000-0000-0000-0000-000000000021", email="teste@example.org", username="teste_admin", nome="Teste", tipo_usuario="ADMIN")',
    'client.cookies.set(cookie_name(), create_token(usuario))',
    'respostas = {rota: client.get(rota) for rota in rotas}', 'assert all(r.status_code == 200 for r in respostas.values())',
    'print(json.dumps({rota: r.text for rota, r in respostas.items()}))',
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
    const page = await browser.newPage();
    const erros = [];
    page.on('pageerror', erro => erros.push(erro.message));
    const rodadas = [rodada('ATUAL', false, false), rodada('COLETA', true, false),
      rodada('ANTIGA', false, true), rodada('AMBOS', true, true)];
    const gravacoes = [];
    rodadas[0].dados_hierarquizacao.objetos = [3, 1, 2].map(posicao => {
      const objeto = structuredClone(rodadas[0].dados_hierarquizacao.objetos[0]);
      objeto.cabecalho_objeto.codigo = 'D' + posicao;
      objeto.cabecalho_objeto.nome = '  IMPLANTAÇÃO   DE INFRAESTRUTURA DE TRANSPORTE PARA INTEGRAÇÃO REGIONAL ' + posicao + ' NA SP-270';
      objeto.hierarquizacao.fase_3.ranking_fase3 = posicao;
      return objeto;
    });
    rodadas[0].dados_hierarquizacao.cabecalho_grupo.relatorios = {fase_3: {
      executada_em: '2026-10-27T15:00:00Z', regra_ausentes: 'renormalizar', completude_minima: 0.6,
    }};
    rodadas[0].dados_hierarquizacao.objetos[0].hierarquizacao.fase_3.pesos_fase3 = {Beneficio: 0.5};
    const sintetizada = (codigo, operador) => {
      const h = rodada(codigo, false, false);
      h.dados_hierarquizacao.cabecalho_grupo.sintese = {operador, peso_rede: 0.2, peso_grade: 0.3, peso_prioridade: 0.5};
      h.dados_hierarquizacao.objetos = [3, 1, 2, null].map((posicao, indice) => {
        const o = structuredClone(h.dados_hierarquizacao.objetos[0]);
        o.cabecalho_objeto = {codigo: `D${indice}`, nome: `Demanda ${posicao ?? 'restrita'}`, atributos: {}};
        const valores = posicao ? [1 - posicao / 10, 0.5, 0.75] : [null, 0.5, 0.75];
        o.hierarquizacao.sintese = {executada: true, posicao_final: posicao,
          score_final: posicao ? operador === 'media_simples'
            ? valores.reduce((a, b) => a + b) / 3 : valores[0] * 0.2 + valores[1] * 0.3 + valores[2] * 0.5 : null,
          restrito_segregado: !posicao,
          contribuicoes: {favorabilidade_rede: valores[0], favorabilidade_grade: valores[1], prioridade: valores[2]}};
        return o;
      });
      return h;
    };
    rodadas.push(sintetizada('SIMPLES', 'media_simples'), sintetizada('PONDERADA', 'media_ponderada'));
    const semIndice = sintetizada('SEM-INDICE', 'media_simples');
    semIndice.dados_hierarquizacao.objetos.forEach(o => {
      o.hierarquizacao.sintese.score_final = null;
      o.hierarquizacao.sintese.posicao_final = null;
    });
    const historica = sintetizada('HISTORICA', 'media_simples');
    historica.dados_hierarquizacao.objetos[1].hierarquizacao.sintese.score_final = 0.1234;
    const antiga = sintetizada('SINTESE-ANTIGA', 'media_simples');
    antiga.dados_hierarquizacao.cabecalho_grupo.relatorios = {sintese: {desatualizado: true}};
    const muitas = sintetizada('MUITAS', 'media_simples');
    muitas.dados_hierarquizacao.objetos = Array.from({length: 32}, (_, i) => {
      const o = structuredClone(muitas.dados_hierarquizacao.objetos[1]);
      o.cabecalho_objeto.nome = `Demanda ${i + 1}`;
      o.hierarquizacao.sintese.posicao_final = i + 1;
      return o;
    });
    rodadas.push(semIndice, historica, antiga, muitas);
    await page.route('https://**/*', route => route.abort());
    await page.route('**/api/**', route => {
      const url = new URL(route.request().url()), p = url.pathname;
      if (p.endsWith('/fases/3/relatorio.pdf')) {
        return route.fulfill({contentType: 'application/pdf', body: '%PDF-1.4\n% Mock de download'});
      }
      let json = [];
      if (p === '/api/auth/me') json = {id: 'u1', nome: 'Teste', tipo_usuario: 'ADMIN'};
      else if (p === '/api/auth/session') json = {authenticated: true};
      else if (p === '/api/ahp/hierarquizacoes') json = rodadas;
      else if (p.endsWith('/colunas')) json = {colunas: []};
      else if (p === '/api/ahp/hierarquizacoes/ANTIGA/fases/3/calcular') json = rodada('ANTIGA', false, false);
      else if (p === '/api/ahp/hierarquizacoes/ANTIGA/fases/3/executar') { gravacoes.push(p); json = rodada('ANTIGA', false, false); }
      else if (p === '/api/ahp/hierarquizacoes/ATUAL/sintese/calcular') json = sintetizada('ATUAL', 'media_simples');
      else if (p === '/api/ahp/hierarquizacoes/ATUAL/sintetizar') { gravacoes.push(p); json = sintetizada('ATUAL', 'media_simples'); }
      else if (p.startsWith('/api/ahp/hierarquizacoes/')) json = rodadas.find(h => h.codigo === p.split('/').at(-1)) || [];
      return route.fulfill({json});
    });
    await page.goto(`http://127.0.0.1:${server.address().port}${rota}`);
    const seletor = page.locator('#fase-hierarquizacao'), aviso = page.locator('#fase3-resultados-aviso');
    await seletor.locator('option[value="ATUAL"]').waitFor({state: 'attached'});
    for (const section of ['.secao-criterios-de-atributos', '#fase3-regras-vazios', '.secao-ranking-do-ajuste-fino', '#fase3-relatorio-container', '.fase3-auditoria-details', '.secao-sintese-final', '#fase3-acao-calculo']) {
      assert.equal(await page.locator(section).isVisible(), false);
    }
    await seletor.selectOption('ATUAL');
    await page.waitForFunction(() => document.querySelector('#fase3-resultados').textContent.includes('0.7500'));
    assert.equal(await aviso.isVisible(), false);
    const nomeFormatado = '  IMPLANTAÇÃO   DE INFRAESTRUTURA DE TRANSPORTE PARA INTEGRAÇÃO REGIONAL 1 NA SP-270';
    assert.ok((await page.locator('#fase3-resultados').textContent()).includes(nomeFormatado));
    assert.ok((await page.locator('[data-atributos-tbody]').textContent()).includes(nomeFormatado));
    assert.ok((await page.locator('#fase-resumo').textContent()).includes(nomeFormatado));
    assert.ok((await page.locator('#fase3-tabela-sintese').textContent()).includes(nomeFormatado));
    assert.match(rodadas[0].dados_hierarquizacao.objetos[0].cabecalho_objeto.nome, /^  IMPLANTAÇÃO/, 'cadastro original preservado');
    assert.equal(await page.locator('.secao-criterios-de-atributos').isVisible(), true);
    assert.equal(await page.locator('.secao-ranking-do-ajuste-fino').isVisible(), true);
    assert.equal(await page.locator('.secao-sintese-final').isVisible(), true);
    assert.equal(await page.locator('.secao-sintese-final').evaluate(el => el.open), false,
      'síntese inicia recolhida');
    assert.equal(await page.locator('.fase3-auditoria-details').evaluate(el => el.open), false,
      'auditoria inicia recolhida');
    assert.equal(await page.locator('.fase3-auditoria-details > summary .ahp-section-index-icon').textContent(), '4.1');
    const verificarContainersResultados = async () => {
      const layout = await page.locator('.secao-ranking-do-ajuste-fino').evaluate(resultados => {
        const relatorio = document.querySelector('#fase3-relatorio-container');
        const auditoria = document.querySelector('.fase3-auditoria-details');
        const sintese = document.querySelector('.secao-sintese-final');
        const siblings = resultados.nextElementSibling === relatorio
          && relatorio.nextElementSibling === auditoria && auditoria.nextElementSibling === sintese;
        const boxes = [resultados, relatorio, auditoria, sintese].map(el => el.getBoundingClientRect());
        const scale = boxes[0].width / resultados.offsetWidth;
        const spacing = parseFloat(getComputedStyle(resultados).marginBottom) * scale;
        return {siblings, spacing, gaps: boxes.slice(1).map((box, i) => box.top - boxes[i].bottom)};
      });
      assert.equal(layout.siblings, true, 'Resultados, relatório, Auditoria e síntese são containers irmãos');
      layout.gaps.forEach(gap => assert.ok(gap >= layout.spacing - 1,
        `espaçamento vertical preservado entre containers: ${gap}px; padrão: ${layout.spacing}px`));
    };
    await verificarContainersResultados();
    const estruturaTabela = await page.locator('table[data-ranking-order]').evaluate(table => {
      const container = table.closest('.ami-report-table');
      return {
        filter: container.contains(container.querySelector('.admin-filter-bar')),
        table: container.contains(table),
        controls: container.contains(container.querySelector('.standard-table-actions')),
        footer: container.contains(container.querySelector('.admin-table-footer')),
        reportOutside: !container.contains(document.querySelector('#fase3-relatorio-container')),
      };
    });
    assert.deepEqual(estruturaTabela, {filter: true, table: true, controls: true, footer: true, reportOutside: true});
    assert.equal(await page.locator('#fase3-acao-calculo').evaluate(el =>
      Boolean(el.compareDocumentPosition(document.querySelector('.secao-ranking-do-ajuste-fino')) & Node.DOCUMENT_POSITION_FOLLOWING)),
    true, 'ações de cálculo aparecem antes dos resultados');
    const gapAcoesResultados = await page.locator('#fase3-acao-calculo').evaluate(el => {
      const next = document.querySelector('.secao-ranking-do-ajuste-fino');
      const gap = next.getBoundingClientRect().top - el.getBoundingClientRect().bottom;
      const marginBottom = parseFloat(getComputedStyle(el).marginBottom);
      const spacing = parseFloat(getComputedStyle(document.documentElement).fontSize) * 1.5;
      return {gap, marginBottom, spacing};
    });
    assert.ok(Math.abs(gapAcoesResultados.marginBottom - gapAcoesResultados.spacing) < 1,
      'a barra usa a margem vertical padrão de 1.5rem');
    assert.ok(gapAcoesResultados.gap > 20, 'há um respiro visual entre as ações e Resultados');
    assert.equal(await page.locator('#fase3-baixar-relatorio').isEnabled(), true);
    assert.equal(await page.locator('#fase3-baixar-relatorio-acao').isEnabled(), true);
    const [download] = await Promise.all([
      page.waitForEvent('download'), page.locator('#fase3-baixar-relatorio').click(),
    ]);
    assert.equal(download.suggestedFilename(), 'Relatorio_Fase_3.pdf');
    const [downloadAcao] = await Promise.all([
      page.waitForEvent('download'), page.locator('#fase3-baixar-relatorio-acao').click(),
    ]);
    assert.equal(downloadAcao.suggestedFilename(), 'Relatorio_Fase_3.pdf');
    await page.waitForTimeout(150);
    const demandLayout = await page.locator('table[data-ranking-order]').evaluate(table => {
      const cell = table.tBodies[0].rows[0].cells[2], range = document.createRange();
      range.selectNodeContents(cell);
      return {lines: range.getClientRects().length, width: cell.getBoundingClientRect().width,
        statusWidth: table.tBodies[0].rows[0].cells[5].getBoundingClientRect().width,
        overflow: table.getBoundingClientRect().width > table.parentElement.clientWidth + 1};
    });
    assert.equal(demandLayout.lines, 1, 'demand name must use one line when the table has room');
    assert.ok(demandLayout.width > demandLayout.statusWidth * 2);
    await page.setViewportSize({width: 1600, height: 1000});
    await page.waitForTimeout(150);
    const reportButtonStyles = await page.locator('.fase3-baixar-relatorio').evaluateAll(buttons =>
      buttons.map(button => {
        const style = getComputedStyle(button);
        return {display: style.display, minHeight: style.minHeight};
      }));
    assert.deepEqual(reportButtonStyles, [
      {display: 'flex', minHeight: '46px'},
      {display: 'flex', minHeight: '46px'},
    ]);
    assert.ok(await page.locator('table[data-ranking-order]').evaluate(table => table.parentElement.scrollWidth <= table.parentElement.clientWidth), 'no horizontal scrollbar when columns fit');
    assert.deepEqual(await page.locator('#fase3-resultados .ranking-posicao').allTextContents(), ['1', '2', '3']);
    assert.match(await page.locator('table[data-ranking-order] thead th').nth(1).textContent(), /Posição/);
    assert.equal(await page.locator('#fase3-resultados .ranking-posicao').first().evaluate(el => getComputedStyle(el).backgroundColor), 'rgba(0, 0, 0, 0)');
    assert.deepEqual(await page.locator('table[data-ranking-order] thead th').evaluateAll(headers => headers.slice(1).map(h => h.textContent.trim())), ['Posição', 'Demanda', 'Índice de prioridade', 'Completude', 'Situação', 'Pendências']);
    assert.equal(await page.locator('#fase-resumo').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(231, 240, 247)');
    assert.match((await page.locator('.secao-ranking-do-ajuste-fino > .ahp-section-label').textContent()).trim(), /Resultados$/);
    await page.locator('.fase3-auditoria-details > summary').click();
    assert.equal(await page.locator('.fase3-auditoria-details').evaluate(el => el.open), true);
    assert.match(await page.locator('#fase3-auditoria').innerText(), /60%/);
    assert.match(await page.locator('.fase3-execucao-pesos').innerText(), /Beneficio/);
    assert.equal(await page.locator('.fase3-detalhes-tecnicos pre').isVisible(), false);
    await page.getByText('Detalhes técnicos', {exact: true}).click();
    assert.equal(await page.locator('.fase3-detalhes-tecnicos pre').isVisible(), true);
    assert.equal(await page.locator('#fase3-ranking-final').isVisible(), false, 'não inventar síntese antes do cálculo');
    const ranking = page.locator('#fase3-ranking-final');
    const modal = page.locator('#fase3-memoria-sintese');
    await page.locator('.secao-sintese-final > summary').click();
    const selecionarRodada = async codigo => {
      await seletor.selectOption(codigo);
      await page.waitForFunction(codigo => document.querySelectorAll('#fase-resumo .fase1-meta-card strong')[1]?.textContent === codigo, codigo);
    };
    for (const codigo of ['SIMPLES', 'PONDERADA']) {
      await selecionarRodada(codigo);
      await ranking.waitFor({state: 'visible'});
      assert.deepEqual(await ranking.locator('.ranking-posicao').allTextContents(), ['1', '2', '3', '—']);
      assert.equal(await ranking.locator('[data-memoria-sintese]').count(), 3);
      assert.match(await ranking.innerText(), /Restrita — segregada/);
      assert.equal(await ranking.locator('.ami-report-table').count(), 1);
      // Alterar os controles não altera a memória da execução salva.
      await page.locator('#peso-rede').evaluate(el => { el.value = '0.999'; });
      const link = ranking.locator('[data-memoria-sintese]').first();
      await link.click();
      await modal.waitFor({state: 'visible'});
      assert.equal(await modal.locator('thead th').count(), 7, 'seletor e seis colunas da memória');
      assert.match(await modal.innerText(), /Índice de favorabilidade de rede/);
      assert.match(await modal.innerText(), /Índice de favorabilidade territorial/);
      assert.match(await modal.innerText(), /Índice de prioridade/);
      assert.match(await modal.innerText(), codigo === 'SIMPLES' ? /IGH = \(IFR \+ IFT \+ IP\) \/ 3/ : /IGH = pR × IFR \+ pT × IFT \+ pP × IP/);
      assert.match(await modal.innerText(), codigo === 'SIMPLES' ? /Rede = Territorial = Prioridade = 1\/3/ : /Rede = 0.2; Territorial = 0.3; Prioridade = 0.5/);
      assert.doesNotMatch(await modal.innerText(), /0\.999/);
      assert.equal(await modal.locator('.admin-filter-bar').count(), 1);
      assert.equal(await modal.locator('.admin-actions').count(), 1);
      assert.equal(await modal.locator('.admin-pagination').count(), 1);
      const metricas = await ranking.locator('table').evaluate(table => {
        const cs = el => getComputedStyle(el);
        const rows = table.tBodies[0].rows;
        const link = rows[0].querySelector('button');
        return {header: cs(table.tHead.rows[0].cells[1]).backgroundColor,
          zebra: [...rows].slice(0, 2).map(row => cs(row.cells[1]).backgroundColor),
          selector: table.tHead.rows[0].cells[0].getBoundingClientRect().width,
          link: {color: cs(link).color, decoration: cs(link).textDecorationLine, background: cs(link).backgroundColor},
          filterHeight: table.closest('.ami-report-table').querySelector('.admin-filter-bar').getBoundingClientRect().height};
      });
      assert.deepEqual(metricas.zebra, ['rgb(255, 255, 255)', 'rgb(237, 244, 248)']);
      assert.equal(metricas.selector, 44);
      assert.equal(metricas.filterHeight, 32);
      assert.equal(metricas.link.color, 'rgb(18, 59, 86)');
      assert.equal(metricas.link.decoration, 'underline');
      assert.equal(metricas.link.background, 'rgba(0, 0, 0, 0)');
      if (codigo === 'SIMPLES') {
        const referencePage = await browser.newPage({viewport: {width: 1600, height: 1000}});
        try {
          await referencePage.route('https://**/*', route => route.abort());
          await referencePage.route('**/api/**', route => route.fulfill({json: []}));
          await referencePage.goto(`http://127.0.0.1:${server.address().port}${referencia}`);
          const tabelaReferencia = referencePage.locator('table:has(#ami-judgments)');
          const estilo = el => {
            const s = getComputedStyle(el);
            return {font: s.fontFamily, size: s.fontSize, weight: s.fontWeight, line: s.lineHeight,
              color: s.color, background: s.backgroundColor, padding: s.padding, borderRadius: s.borderRadius};
          };
          assert.deepEqual(await ranking.locator('thead th').nth(1).evaluate(estilo),
            await tabelaReferencia.locator('thead th').nth(1).evaluate(estilo), 'cabeçalho segue referência visual');
          await referencePage.locator('#ami-judgments-modal').evaluate(el => el.classList.remove('is-hidden'));
          assert.deepEqual(await modal.locator('.json-modal-head').evaluate(estilo),
            await referencePage.locator('#ami-judgments-modal .json-modal-head').evaluate(estilo), 'cabeçalho do modal segue referência visual');
        } finally { await referencePage.close(); }
      }
      await page.keyboard.press('Escape');
      assert.equal(await modal.isVisible(), false);
      assert.equal(await link.evaluate(el => el === document.activeElement), true);
      await link.click();
      await modal.getByRole('button', {name: 'Fechar', exact: true}).click();
      await link.click();
      await modal.click({position: {x: 2, y: 2}});
      assert.equal(await modal.isVisible(), false);
      const filter = ranking.getByRole('combobox', {name: 'Coluna do filtro', exact: true});
      await filter.selectOption({label: 'Demanda'});
      await ranking.getByRole('combobox', {name: 'Valor do filtro', exact: true}).selectOption({label: 'Demanda 2'});
      assert.deepEqual(await ranking.locator('.ranking-posicao').allTextContents(), ['2']);
      await ranking.getByRole('checkbox', {name: 'Selecionar registro', exact: true}).check();
      const [csv] = await Promise.all([page.waitForEvent('download'), ranking.getByRole('button', {name: 'Exportar selecionados', exact: true}).click()]);
      assert.equal(csv.suggestedFilename(), 'registros.csv');
      await ranking.getByRole('button', {name: 'Limpar filtros', exact: true}).click();
      assert.deepEqual(await ranking.locator('.ranking-posicao').allTextContents(), ['1', '2', '3', '—']);
    }
    await selecionarRodada('MUITAS');
    await page.waitForFunction(() => document.querySelector('#fase3-ranking-final .admin-table-summary').textContent.includes('32'));
    assert.equal(await ranking.locator('tbody tr').count(), 15);
    await ranking.getByRole('button', {name: 'Próxima página', exact: true}).click();
    assert.equal(await ranking.locator('tbody tr').count(), 15);
    await ranking.getByRole('button', {name: 'Última página', exact: true}).click();
    assert.equal(await ranking.locator('tbody tr').count(), 2);
    await selecionarRodada('SEM-INDICE');
    assert.equal(await ranking.locator('[data-memoria-sintese]').count(), 0);
    assert.match(await ranking.innerText(), /Sem índice combinado/);
    await selecionarRodada('HISTORICA');
    await ranking.locator('[data-memoria-sintese]').first().click();
    assert.match(await modal.innerText(), /não possui dados compatíveis/);
    await page.keyboard.press('Escape');
    await selecionarRodada('SINTESE-ANTIGA');
    assert.equal(await ranking.isVisible(), false, 'não mostrar síntese desatualizada');
    await selecionarRodada('SIMPLES');
    await page.setViewportSize({width: 390, height: 844});
    await verificarContainersResultados();
    const actionMobileWidth = await page.locator('#fase3-acao-calculo').evaluate(el => ({
      action: el.clientWidth,
      button: el.querySelector('.fase3-calculo-btn').getBoundingClientRect().width,
    }));
    assert.ok(actionMobileWidth.button >= actionMobileWidth.action * 0.9,
      'ações de cálculo usam a largura disponível no celular');
    await ranking.locator('[data-memoria-sintese]').first().click();
    const dimensoesModal = await modal.locator('.json-modal').evaluate(el => {
      const rect = el.getBoundingClientRect();
      return {viewport: innerWidth, esquerda: rect.left, direita: rect.right};
    });
    assert.ok(dimensoesModal.esquerda >= 0 && dimensoesModal.direita <= dimensoesModal.viewport,
      'modal não transborda a tela estreita: ' + JSON.stringify(dimensoesModal));
    assert.ok(await modal.locator('.fase-table-wrap').evaluate(el => el.scrollWidth > el.clientWidth), 'tabela usa rolagem horizontal sem cortar títulos');
    await page.keyboard.press('Escape');
    await page.setViewportSize({width: 1600, height: 1000});
    await selecionarRodada('ATUAL');
    await page.evaluate(() => {
      window.feedbackDuracoes = [];
      window.feedbackSucessos = [];
      ProcessFeedback.confirmar = async () => true;
      ProcessFeedback.iniciarCadastro = () => {
        const inicio = performance.now();
        return {tarefaAtual() {}, concluirTarefa() {},
          sucesso(resultado) {
            window.feedbackDuracoes.push(performance.now() - inicio);
            window.feedbackSucessos.push(resultado);
          },
          erro(e) { window.feedbackDuracoes.push(performance.now() - inicio); throw new Error(JSON.stringify(e)); }};
      };
    });
    await page.locator('#sintetizar').click();
    await page.waitForFunction(() => window.feedbackSucessos.length === 1);
    await ranking.waitFor({state: 'visible'});
    assert.ok((await page.evaluate(() => window.feedbackDuracoes.at(-1))) >= 2000,
      'síntese mantém o modal de processamento por pelo menos dois segundos');
    assert.equal(gravacoes.length, 0, 'calcular síntese não deve gravar o resultado');
    assert.match(await page.evaluate(() => window.feedbackSucessos.at(-1).message),
      /Após salvar, homologue a hierarquização antes de publicar os resultados/);
    assert.equal(await page.locator('#salvar-sintese').isDisabled(), false);
    await page.locator('#salvar-sintese').click();
    await page.waitForFunction(() => window.feedbackSucessos.length === 2);
    assert.equal(gravacoes.length, 1, 'salvar síntese grava explicitamente o ranking');
    assert.match(await page.evaluate(() => window.feedbackSucessos.at(-1).message),
      /A homologação é obrigatória antes de publicar os resultados/);
    assert.deepEqual(await ranking.locator('.ranking-posicao').allTextContents(), ['1', '2', '3', '—']);
    await selecionarRodada('SIMPLES');
    await selecionarRodada('ATUAL');
    assert.equal(await ranking.isVisible(), true, 'restaurar síntese ao reabrir rodada');
    assert.equal(await aviso.getAttribute('role'), 'status');
    assert.equal(await aviso.getAttribute('aria-live'), 'polite');
    for (const codigo of ['COLETA', 'ANTIGA', 'AMBOS']) {
      await seletor.selectOption(codigo);
      await page.waitForFunction(() => document.querySelector('#fase3-resultados').textContent.includes('Não calculado'));
      assert.equal(await aviso.isVisible(), false);
      assert.doesNotMatch(await page.locator('#fase3-resultados').innerText(), /0\.7500/,
        'resultado antigo não deve aparecer como atual');
      assert.doesNotMatch(await page.locator('#fase3-tabela-sintese').innerText(), /0\.7500/,
        'síntese antiga não deve aparecer como atual');
      assert.equal(await page.locator('#sintetizar').isDisabled(), true);
      assert.equal(await page.locator('#fase3-baixar-relatorio').isDisabled(), true);
      assert.equal(await page.locator('.secao-ranking-do-ajuste-fino').isVisible(), false);
      assert.equal(await page.locator('#fase3-relatorio-container').isVisible(), false);
      assert.equal(await page.locator('.fase3-auditoria-details').isVisible(), false);
      assert.equal(await page.locator('.secao-sintese-final').isVisible(), false);
    }
    await seletor.selectOption('ANTIGA');
    await page.evaluate(() => {
      ProcessFeedback.confirmar = async () => true;
      ProcessFeedback.iniciarCadastro = () => {
        const inicio = performance.now();
        return {tarefaAtual() {}, concluirTarefa() {},
          sucesso() { window.feedbackDuracoes.push(performance.now() - inicio); },
          erro() { window.feedbackDuracoes.push(performance.now() - inicio); }};
      };
    });
    await page.locator('#executar-fase3').click();
    await aviso.getByText('Prévia do índice de prioridade calculada').waitFor();
    await page.waitForFunction(() => document.querySelector('#fase3-indicadores').textContent.includes('Com índice de prioridade'));
    assert.ok((await page.evaluate(() => window.feedbackDuracoes.at(-1))) >= 2000,
      'cálculo do índice de prioridade mantém o modal de processamento por pelo menos dois segundos');
    assert.match(await page.locator('#fase3-resultados').innerText(), /0\.7500/);
    assert.equal(gravacoes.length, 1, 'calcular Fase 3 não deve gravar o resultado');
    assert.equal(await page.locator('#salvar-resultado-fase3').isDisabled(), false);
    await page.locator('#salvar-resultado-fase3').click();
    assert.equal(gravacoes.length, 2, 'salvar Fase 3 grava explicitamente o resultado');
    await aviso.waitFor({state: 'hidden'});
    assert.equal(await page.locator('.secao-sintese-final').isVisible(), true);
    await seletor.selectOption('');
    assert.equal(await page.locator('.secao-criterios-de-atributos').isVisible(), false);
    assert.equal(await page.locator('.secao-sintese-final').isVisible(), false);
    assert.deepEqual(erros, []);
    console.log('PASS: resultados atuais, ranking final persistido, memória simples/ponderada, histórico, filtros, seleção, exportação, paginação e tela estreita. APIs simuladas.');
  } finally { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(erro => {console.error(erro); process.exitCode = 1;});
