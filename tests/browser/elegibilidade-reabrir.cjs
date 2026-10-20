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
    let revisados = false, failView = false;
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
        return send({fontes, concluidas: 1, previstas: 1, metodologia: 'Áreas da saída original, sem recalcular.',
          entradas: [{id: 'execucao-anterior', nome: fontes[0].nome, feicoes: 1,
            com_intersecao: 1, sem_intersecao: 0, campos: [fontes[1]],
            linhas: [{chave: '0', id: 'D-1', nome: 'Demanda Norte', area_total_m2: 100, areas: [25],
              sobreposicoes: [{...fontes[2], identificador: 1, area_m2: 25, percentual: 25}]}],
            geometrias: geojson({chave: '0'}),
            intersecoes: geojson({chave: '0', base_id: 'base', feicao_id: 'feicao'})}]});
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
    await page.goto('http://127.0.0.1:8083/restrict/hierarquizacao/fase-1/');
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
    assert.equal(calls.some(c => c.path.endsWith('/elegibilidade/execucoes')), false, 'Não inicia novo processamento');
    assert.equal(calls.some(c => c.path.includes('/arquivo-mapa') || c.path.includes('/camadas-arquivo')), false);
    assert.deepEqual(errors, []);
    console.log('PASS: explorador na pasta de saídas, somente GPKG, cancelamento, leitura sem processamento, nomes persistidos, mapa/tabela, arquivo inválido, retry, download e mobile.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
