const {chromium} = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({channel: 'msedge', headless: true,
    args: ['--enable-unsafe-swiftshader']});
  try {
    const page = await browser.newPage();
    const errors = [], calls = [], folders = [];
    const pasta = 'saidas-geoespaciais/elegibilidade-teste';
    const arquivo = `${pasta}/demandas_elegibilidade_territorial.gpkg`;
    let revisados = false, failView = false, modoTabela = 'normal';
    let fontes = [
      {id: 'entrada', nome: 'Demandas do Setor Norte', papel: 'entrada', tipo: 'camada'},
      {id: 'base', nome: 'Área de Proteção', papel: 'restricao', tipo: 'camada'},
      {id: 'feicao', nome: 'Margens do Rio', papel: 'restricao', tipo: 'feicao', base_id: 'base'},
    ];
    const geometria = {type: 'Polygon', coordinates: [[[-47, -23], [-46.99, -23],
      [-46.99, -22.99], [-47, -22.99], [-47, -23]]]};
    const geojson = properties => ({type: 'FeatureCollection', features: [
      {type: 'Feature', geometry: geometria, properties},
    ]});
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://server.arcgisonline.com/**', route => route.abort());
    await page.addLocatorHandler(page.locator('.notification-toast').first(),
      () => page.evaluate(() => Notify.clearAll()));
    await page.route('**/api/**', async route => {
      const request = route.request(), url = new URL(request.url()), path = url.pathname;
      const send = data => route.fulfill({json: data});
      if (request.method() !== 'GET') calls.push({path, payload: request.postDataJSON()});
      if (path.includes('/auth/')) return send({authenticated: true, id: 'teste', tipo_usuario: 'ADMIN'});
      if (path.endsWith('/storage/navegar')) {
        const caminho = url.searchParams.get('caminho');
        folders.push(caminho);
        return send({caminho, pai: caminho === pasta ? 'saidas-geoespaciais' : null,
          pastas: caminho === 'saidas-geoespaciais' ? [{nome: 'Análise anterior', caminho: pasta}] : [],
          arquivos: caminho === pasta ? ['demandas_elegibilidade_territorial.gpkg', 'invalido.gpkg', 'outra.fgb']
            .map(nome => ({id: `storage:${pasta}/${nome}`, arquivo: `${pasta}/${nome}`, nome, inventariar: true})) : []});
      }
      if (path.endsWith('/elegibilidade/resultados/abrir')) {
        if (request.postDataJSON().arquivo !== arquivo) {
          return route.fulfill({status: 422, json: {detail: 'O arquivo não é uma saída de elegibilidade concluída.'}});
        }
        return send({execucoes: ['execucao-anterior'], fontes, revisados, concluidas: 1, previstas: 1});
      }
      if (path.endsWith('/elegibilidade/resultados/preparar')) {
        return send({fontes, revisados, concluidas: 1, previstas: 1});
      }
      if (path.endsWith('/elegibilidade/resultados/visualizar')) {
        if (failView) return route.fulfill({status: 503, json: {detail: 'Leitura temporariamente indisponível.'}});
        const payload = request.postDataJSON();
        assert.deepEqual(payload.execucoes, ['execucao-anterior']);
        assert.equal(payload.revisados, true);
        fontes = fontes.map(f => ({...f, nome: payload.nomes[f.id]}));
        revisados = true;
        const campos = fontes.filter(f => f.tipo === 'camada' && f.papel !== 'entrada');
        const linhas = Array.from({length: modoTabela === 'paginada' ? 55 : 1}, (_, i) => {
          const areas = modoTabela === 'normal' ? [25] :
            modoTabela === 'vazia' || i === 0 || i === 52 ? campos.map(() => null) :
              [i === 1 ? 0 : 25, i === 1 ? 0 : null, null, i === 54 ? 50 : null];
          return {chave: String(i), id: `D-${modoTabela === 'normal' ? 1 : i}`,
            nome: modoTabela === 'normal' ? 'Demanda Norte' : `Demanda ${i}`, area_total_m2: 100, areas,
            sobreposicoes: campos.flatMap((campo, posicao) => areas[posicao] === null ? [] :
              [{...fontes.find(f => f.tipo === 'feicao' && f.base_id === campo.id),
                identificador: 1, area_m2: areas[posicao], percentual: areas[posicao]}])};
        });
        const comIntersecao = linhas.filter(l => l.areas.some(valor => valor !== null)).length;
        return send({fontes, concluidas: 1, previstas: 1, metodologia: 'Áreas da saída original, sem recalcular.',
          entradas: [{id: 'execucao-anterior', nome: fontes[0].nome, feicoes: linhas.length,
            com_intersecao: comIntersecao, sem_intersecao: linhas.length - comIntersecao, campos, linhas,
            geometrias: {type: 'FeatureCollection', features: linhas.flatMap(l => geojson({chave: l.chave}).features)},
            intersecoes: {type: 'FeatureCollection', features: linhas.flatMap(l => l.sobreposicoes.flatMap(c =>
              geojson({chave: l.chave, base_id: c.base_id, feicao_id: c.id}).features))}}]});
      }
      if (path.endsWith('/elegibilidade/resultados/pacote')) {
        assert.deepEqual(request.postDataJSON().execucoes, ['execucao-anterior']);
        return route.fulfill({contentType: 'application/zip', body: Buffer.from('PK-fixture')});
      }
      if (request.method() !== 'GET') throw new Error(`Escrita inesperada: ${path}`);
      return send([]);
    });
    async function explorar() {
      const before = folders.length;
      await page.getByRole('link', {name: 'selecione uma análise já realizada'}).click();
      const dialog = page.locator('dialog.ea-storage-dialog');
      await dialog.locator('.ea-storage-entry--folder').click();
      await dialog.locator('[data-file]').first().waitFor();
      assert.deepEqual(folders.slice(before), ['saidas-geoespaciais', pasta], 'Abre diretamente na pasta oficial de saídas');
      assert.equal(await dialog.locator('[data-file]').count(), 2, 'Somente GeoPackages, sem inventariar camadas');
      assert.equal(await dialog.getByText('Camadas cadastradas no banco', {exact: true}).count(), 0);
      return dialog;
    }
    async function escolher(nome) {
      const dialog = await explorar();
      await dialog.locator(`[data-file="storage:${pasta}/${nome}"]`).click();
      await dialog.locator('.ea-storage-confirm-button').click();
      await dialog.waitFor({state: 'detached'});
    }
    await page.goto('http://127.0.0.1:8083/restrict/hierarquizacao/fase-1/', {waitUntil:'domcontentloaded'});
    assert.equal(await page.locator('#ev-resultados-vazio').innerText(),
      'Execute a elegibilidade territorial ou selecione uma análise já realizada para apresentar os resultados.');
    let dialog = await explorar();
    await dialog.getByRole('button', {name: 'Fechar', exact: true}).click();
    assert.equal(calls.length, 0, 'Cancelar não lê nem grava uma análise');
    await escolher('demandas_elegibilidade_territorial.gpkg');
    await page.locator('#ev-resultados-aliases').waitFor({state: 'visible'});
    assert.equal(await page.locator('#ev-resultados-download').isDisabled(), true);
    await page.locator('#ev-resultados-revisados').check();
    await page.locator('#ev-resultados-mostrar').click();
    await page.locator('#ev-resultados-conteudo').waitFor({state: 'visible'});
    assert.match(await page.locator('#ev-resultados-tabela').innerText(), /Demanda Norte/);
    assert.equal(await page.locator('#ev-resultados-mapa .leaflet-overlay-pane path').count(), 2);
    const current = await page.locator('#ev-resultados-tabela').innerText();
    dialog = await explorar();
    await dialog.getByRole('button', {name: 'Fechar', exact: true}).click();
    assert.equal(await page.locator('#ev-resultados-tabela').innerText(), current);
    await escolher('invalido.gpkg');
    await page.waitForFunction(() => document.querySelector('#ev-resultados-status').textContent.includes('não é uma saída'));
    assert.equal(await page.locator('#ev-resultados-conteudo').isVisible(), true);
    assert.equal(await page.locator('#ev-resultados-tabela').innerText(), current, 'Arquivo inválido preserva os resultados atuais');
    await page.reload();
    await escolher('demandas_elegibilidade_territorial.gpkg');
    await page.locator('#ev-resultados-conteudo').waitFor({state: 'visible'});
    assert.equal(await page.locator('#ev-resultados-aliases').isHidden(), true, 'Reaproveita os nomes confirmados após recarregar');
    failView = true;
    await escolher('demandas_elegibilidade_territorial.gpkg');
    await page.locator('#ev-resultados-tentar').waitFor({state: 'visible'});
    failView = false;
    await page.locator('#ev-resultados-tentar').click();
    await page.locator('#ev-resultados-conteudo').waitFor({state: 'visible'});
    for (const width of [1440, 390]) {
      await page.setViewportSize({width, height: 1000});
      assert.equal(await page.getByRole('link', {name: 'selecione uma análise já realizada'}).isVisible(), true);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    }
    const download = page.waitForEvent('download');
    await page.locator('#ev-resultados-download').click();
    await download;
    modoTabela = 'paginada';
    fontes = [fontes[0], fontes[1],
      {id: 'contato', nome: 'Contatos Sem Área', papel: 'restricao', tipo: 'camada'},
      {id: 'vazia', nome: 'Camada Vazia', papel: 'risco', tipo: 'camada'},
      {id: 'tardia', nome: 'Sobreposição Posterior', papel: 'risco', tipo: 'camada'},
      fontes[2],
      {id: 'feicao-contato', nome: 'Contato', papel: 'restricao', tipo: 'feicao', base_id: 'contato'},
      {id: 'feicao-tardia', nome: 'Feição Posterior', papel: 'risco', tipo: 'feicao', base_id: 'tardia'}];
    await page.reload();
    await escolher('demandas_elegibilidade_territorial.gpkg');
    await page.locator('#ev-resultados-conteudo').waitFor({state: 'visible'});
    const tabela = page.locator('#ev-resultados-tabela'), barra = page.getByRole('toolbar', {name: 'Controles da tabela de sobreposições'});
    assert.equal(await tabela.locator('tbody tr[data-chave]').count(), 50);
    assert.equal(await tabela.locator('thead tr').last().locator('th').count(), 6);
    assert.equal(await barra.getByRole('button').count(), 1);
    const callsBeforeFilter = calls.length;
    const geometryCount = await page.locator('#ev-resultados-mapa .leaflet-overlay-pane path').count();
    await barra.getByRole('button', {name: 'Ocultar linhas e colunas vazias'}).click();
    assert.equal(await barra.getByRole('button', {name: 'Mostrar linhas e colunas vazias'}).getAttribute('aria-pressed'), 'true');
    assert.equal(await tabela.locator('thead tr').last().locator('th').count(), 5);
    assert.equal(await tabela.getByRole('columnheader', {name: 'Camada Vazia', exact: true}).count(), 0);
    assert.equal(await tabela.getByRole('columnheader', {name: 'Sobreposição Posterior', exact: true}).count(), 1,
      'Não oculta coluna cujo único valor está em outra página');
    assert.equal(await tabela.getByRole('columnheader', {name: 'Contatos Sem Área', exact: true}).count(), 1,
      'Coluna com somente zero não está vazia');
    assert.equal(await tabela.locator('thead tr').first().locator('th').last().getAttribute('colspan'), '1');
    assert.equal(await tabela.locator('tbody tr').first().getAttribute('data-chave'), '1', 'Oculta a linha sem sobreposição');
    assert.match(await tabela.locator('tbody tr').first().locator('[data-base="contato"]').innerText(), /0,00/);
    assert.match(await page.locator('#ev-resultados-pagina').innerText(), /53 de 55 demandas · 3 de 4 camadas/);
    assert.match(await page.locator('#ev-resultados-visibilidade').innerText(), /2 linhas e 1 coluna/);
    await tabela.locator('tbody tr').last().locator('td').first().click();
    assert.match(await page.locator('#ev-resultados-pagina').innerText(), /Página 1 de 2/,
      'Seleção usa a posição filtrada, não o índice original da demanda');
    await page.locator('#ev-resultados-proxima').click();
    assert.equal(await tabela.locator('tbody tr').count(), 3);
    await tabela.locator('tbody tr').last().locator('[data-base="tardia"] button').click();
    assert.match(await page.locator('#ev-resultados-pagina').innerText(), /Página 2 de 2/);
    assert.equal(await page.locator('#ev-resultados-nome-ativo').innerText(), 'Demanda 54');
    assert.match(await page.locator('#ev-resultados-percentual').innerText(), /50,00%/);
    await page.locator('#ev-resultados-legenda button').last().click();
    assert.equal(await tabela.locator('.evr-foco').evaluate(el => getComputedStyle(el).fontSize), '9.5px');
    assert.equal(await page.locator('#ev-resultados-mapa .leaflet-overlay-pane path').count(), geometryCount);
    assert.equal(calls.length, callsBeforeFilter, 'Filtro e navegação não escrevem nem recalculam resultados');
    for (const width of [1440, 390]) {
      await page.setViewportSize({width, height: 1000});
      const layout = await page.locator('.secao-elegibilidade-tabela').evaluate(panel => {
        const rect = selector => panel.querySelector(selector).getBoundingClientRect();
        return {
          tableBottom: rect('.ea-table-wrap').bottom, toolbarTop: rect('.evr-controles').top,
          toolbarBottom: rect('.evr-controles').bottom, pagerTop: rect('.ev-resultados-paginacao').top,
          fonts: [...panel.querySelectorAll('h3,th,td,button,span,p,i')]
            .filter(el => el.getBoundingClientRect().height)
            .map(el => parseFloat(getComputedStyle(el).fontSize)),
          cellFont: getComputedStyle(panel.querySelector('td')).fontSize,
        };
      });
      assert.ok(layout.tableBottom <= layout.toolbarTop && layout.toolbarBottom <= layout.pagerTop,
        'Barra fica abaixo da tabela e acima do paginador');
      assert.equal(layout.cellFont, '10.5px');
      assert.ok(layout.fonts.every(size => size <= 12), `Todos os componentes da tabela têm fonte compacta em ${width}px`);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    }
    const fullDownload = page.waitForEvent('download');
    await page.locator('#ev-resultados-download').click();
    await fullDownload;
    assert.deepEqual(Object.keys(calls.at(-1).payload).sort(), ['execucoes', 'nomes', 'revisados'],
      'Relatório não recebe o filtro visual');
    await barra.getByRole('button', {name: 'Mostrar linhas e colunas vazias'}).click();
    assert.equal(await tabela.locator('thead tr').last().locator('th').count(), 6);
    assert.equal(await tabela.locator('tbody tr').first().getAttribute('data-chave'), '0');
    await page.locator('#ev-resultados-proxima').click();
    assert.equal(await tabela.locator('tbody tr').count(), 5, 'Mostrar restaura todas as linhas e a paginação');
    modoTabela = 'vazia';
    await page.reload();
    await escolher('demandas_elegibilidade_territorial.gpkg');
    await page.locator('#ev-resultados-conteudo').waitFor({state: 'visible'});
    await barra.getByRole('button', {name: 'Ocultar linhas e colunas vazias'}).click();
    assert.equal(await tabela.locator('thead tr').last().locator('th').count(), 2, 'Identificador e nome são preservados');
    assert.equal(await tabela.locator('tbody tr[data-chave]').count(), 0);
    assert.match(await tabela.locator('tbody').innerText(), /Nenhuma demanda com valores de sobreposição/);
    assert.equal(await page.locator('#ev-resultados-anterior').isDisabled(), true);
    assert.equal(await page.locator('#ev-resultados-proxima').isDisabled(), true);
    assert.equal(await barra.getByRole('button', {name: 'Mostrar linhas e colunas vazias'}).isEnabled(), true);
    await barra.getByRole('button', {name: 'Mostrar linhas e colunas vazias'}).click();
    assert.equal(await tabela.locator('tbody tr[data-chave]').count(), 1);
    assert.equal(calls.some(c => c.path.endsWith('/elegibilidade/execucoes')), false, 'Não inicia novo processamento');
    assert.equal(calls.some(c => c.path.includes('/arquivo-mapa') || c.path.includes('/camadas-arquivo')), false);
    assert.deepEqual(errors, []);
    console.log('PASS: reabertura GPKG, cancelamento e erros; barra de controles, vazias em todas as páginas, zeros preservados, seleção, paginação, filtro reversível, fontes compactas, relatório completo e mobile.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
