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
    let pacoteLiberar, pacotePendente = false, falharSuperficie = false;
    let falharSalvamento = false;
    let tipoCadastro = 'projeto', perfil = 'ADMIN', comVinculo = true;
    let cadastro = new Map([['D-1', {id:'D-1', nome:'Demanda Norte', descricao:'Cadastro original'}]]);
    const nomesAnalise = new Map();
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
      if (path.includes('/auth/')) return send({authenticated: true, id: 'teste', tipo_usuario: perfil});
      if (path.endsWith('/ahp/hierarquizacoes/HIER-TESTE')) return send({
        tipo_demanda:tipoCadastro, objetos:[...cadastro.keys()].map(codigo => ({codigo})),
      });
      if (/^\/api\/(demandas|planos|programas)\/internas$/.test(path)) return send([...cadastro.values()]);
      if (/^\/api\/(demandas|planos|programas)\/internas\//.test(path)) return send(cadastro.get(decodeURIComponent(path.split('/').at(-1))));
      if (request.method() === 'PATCH' && /^\/api\/(demandas|planos|programas)\//.test(path)) {
        assert.deepEqual(Object.keys(request.postDataJSON()), ['nome']);
        if (falharSalvamento) return route.fulfill({status:422, json:{detail:'Falha de teste ao salvar nome.'}});
        const codigo = decodeURIComponent(path.split('/').at(-1));
        const registro = {...cadastro.get(codigo), ...request.postDataJSON()};
        cadastro.set(codigo, registro); return send(registro);
      }
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
      if (path.endsWith('/elegibilidade/resultados/demanda/nome')) {
        const payload = request.postDataJSON();
        assert.deepEqual(Object.keys(payload).sort(), ['chave','execucao','nome']);
        assert.equal(payload.execucao, 'execucao-anterior');
        if (falharSalvamento) return route.fulfill({status:503, json:{detail:'Falha de teste ao salvar na análise.'}});
        nomesAnalise.set(payload.chave, payload.nome);
        return send(payload);
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
            codigo_demanda:`D-${modoTabela === 'normal' ? 1 : i}`,
            nome: modoTabela === 'normal' ? !comVinculo && nomesAnalise.get(String(i)) || 'Demanda Norte' : `Demanda ${i}`,
            perimetro_m:modoTabela === 'normal' ? 12345.6789 : 40,
            area_total_m2: modoTabela === 'normal' ? 1234567.89 : 100, areas,
            sobreposicoes: campos.flatMap((campo, posicao) => areas[posicao] === null ? [] :
              Array.from({length: i === 54 ? 2 : 1}, (_, j) => ({
                ...fontes.find(f => f.tipo === 'feicao' && f.base_id === campo.id),
                identificador: j + 1, area_m2: areas[posicao], percentual: areas[posicao]})))};
        });
        const comIntersecao = linhas.filter(l => l.areas.some(valor => valor !== null)).length;
        return send({fontes, concluidas: 1, previstas: 1, metodologia: 'Áreas da saída original, sem recalcular.',
          entradas: [{id: 'execucao-anterior', hierarquizacao:comVinculo ? 'HIER-TESTE' : null, nome: fontes[0].nome, feicoes: linhas.length,
            com_intersecao: comIntersecao, sem_intersecao: linhas.length - comIntersecao, campos, linhas,
            geometrias: {type: 'FeatureCollection', features: linhas.flatMap(l => geojson({chave: l.chave}).features)},
            intersecoes: {type: 'FeatureCollection', features: linhas.flatMap(l => l.sobreposicoes.flatMap(c =>
              geojson({chave: l.chave, base_id: c.base_id, feicao_id: c.id}).features))}}]});
      }
      if (path.endsWith('/elegibilidade/resultados/superficie')) {
        assert.equal(request.postDataJSON().base_id,'base');
        if (falharSuperficie) return route.fulfill({status:503,json:{detail:'Fonte indisponivel no teste'}});
        return send({geometrias:geojson({nome:'Superficie original'})});
      }
      if (path.endsWith('/elegibilidade/resultados/pacote')) {
        assert.deepEqual(request.postDataJSON().execucoes, ['execucao-anterior']);
        if (pacotePendente) await new Promise(resolve => { pacoteLiberar = resolve; });
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
    const legendaTeste = await page.evaluate(async () => {
      const {renderizarRosca} = await import('/restrict/hierarquizacao/js/sobreposicoes-rosca.js?v=20261022-legenda');
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      const legenda = document.createElement('div');
      renderizarRosca({svg, legenda, legendaDemanda:true, itens:[
        {demandaNome:'AMPLIAÇÃO DA SP-300', area_m2:1},
        {demandaNome:'áREA DE RISCO', area_m2:0},
      ], aoSelecionar:() => {}});
      return [...legenda.querySelectorAll('button')].map(b => b.textContent);
    });
    assert.deepEqual(legendaTeste, ['Ampliação Da Sp-300', 'Área De Risco']);
    const areasRosca = await page.evaluate(async () => {
      const {demandasDaAnalise, renderizarRoscaDemandas} = await import('/restrict/hierarquizacao/js/sobreposicoes-rosca.js?v=20261023-rosca-demandas');
      const campo = (id, papel) => ({id, papel, nome:id});
      const item = (id, base_id, area_m2) => ({id, base_id, area_m2, nome:'Área com mesmo nome', identificador:id});
      const entradas = [
        {id:'A', nome:'Entrada A', campos:[campo('re','restricao'),campo('ri','risco')], linhas:[
          {chave:'0', id:'D-0', nome:'Mesmo nome', area_total_m2:100, sobreposicoes:[item('f1','re',80),item('f2','ri',80)]},
          {chave:'1', id:'D-1', nome:'Mesmo nome', area_total_m2:300, sobreposicoes:[]}]},
        {id:'B', nome:'Entrada B', campos:[campo('re','restricao')], linhas:[
          {chave:'0', id:'D-0', nome:'Contato', area_total_m2:200, sobreposicoes:[item('f1','re',0)]},
          {chave:'1', id:'D-1', nome:'Outra demanda', area_total_m2:400, sobreposicoes:[item('f1','re',40)]}]},
      ];
      const original = JSON.stringify(entradas), escolhas = [];
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'), legenda = document.createElement('div');
      const desenhar = itens => renderizarRoscaDemandas({svg,legenda,itens,
        cor:item => item.papel === 'restricao' ? '#852c38' : '#856100',
        selecionada:item => item.tipo === 'intersecao' && item.id === 'f1',
        aoSelecionar:item => escolhas.push([item.tipo,item.entradaId,item.demandaChave,item.id || ''])});
      desenhar(demandasDaAnalise(entradas));
      const demandas = [...svg.querySelectorAll('path[data-tipo="demanda"]')];
      const intersecoes = [...svg.querySelectorAll('path[data-tipo="intersecao"]')];
      const raios = p => [...new Set([...p.getAttribute('d').matchAll(/ A (\d+) \d+/g)].map(m => m[1]))].sort().join(',');
      demandas[1].dispatchEvent(new KeyboardEvent('keydown', {key:'Enter'}));
      intersecoes[0].dispatchEvent(new KeyboardEvent('keydown', {key:' '}));
      const resultado = {
        total:svg.dataset.totalM2, demandas:svg.dataset.demandas, sobreposicoes:svg.dataset.sobreposicoes,
        angulos:demandas.map(p => (Number(p.dataset.fim)-Number(p.dataset.inicio))/(2*Math.PI)),
        nomes:[...legenda.querySelectorAll('button')].map(b => b.textContent),
        identidades:demandas.map(p => p.dataset.demanda),
        contatos:demandas[2].parentNode.querySelectorAll('path[data-tipo="intersecao"]').length,
        sobrepostas:intersecoes.slice(0,2).map(p => ({d:p.getAttribute('d'),
          fracao:Number(p.dataset.proporcaoDemanda), proporcao:(Number(p.dataset.fim)-Number(p.dataset.inicio))/
            (Number(p.parentNode.firstChild.dataset.fim)-Number(p.parentNode.firstChild.dataset.inicio)),
          inicio:p.dataset.inicio, inicioDemanda:p.parentNode.firstChild.dataset.inicio})),
        chaves:intersecoes.map(p => p.dataset.sobreposicao), escolhas, preservadas:original === JSON.stringify(entradas),
        cores:intersecoes.map(p => p.dataset.cor),
        mesmoAnel:intersecoes.every(p => raios(p) === raios(p.parentNode.firstChild)),
      };
      const antes = svg.innerHTML;
      try {
        desenhar([{...demandasDaAnalise(entradas)[0],area_m2:0}]);
      } catch (e) { resultado.erro = e.message; }
      resultado.preservouGrafico = antes === svg.innerHTML;
      desenhar([{...demandasDaAnalise(entradas)[1], area_m2:100}]);
      resultado.circuloCompleto = (svg.querySelector('path').getAttribute('d').match(/ A /g) || []).length;
      return resultado;
    });
    assert.equal(areasRosca.total, '1000', 'Denominador é a soma das áreas totais, não a soma das interseções');
    assert.equal(areasRosca.demandas, '4');
    assert.equal(areasRosca.sobreposicoes, '4', 'Inclui contatos de área zero');
    areasRosca.angulos.forEach((angulo,i) => assert.ok(Math.abs(angulo-[.1,.3,.2,.4][i]) < 1e-10));
    assert.deepEqual(areasRosca.nomes, ['Mesmo Nome','Mesmo Nome','Contato','Outra Demanda']);
    assert.equal(new Set(areasRosca.identidades).size, 4, 'Nomes e IDs repetidos em entradas distintas não agrupam demandas');
    assert.equal(new Set(areasRosca.chaves).size, 3);
    assert.deepEqual(areasRosca.cores, ['#856100','#852c38','#852c38'], 'Categorias e cores são recuperadas da camada de base');
    assert.equal(areasRosca.contatos, 0, 'Contato de área zero não ganha área fictícia na fatia');
    assert.equal(areasRosca.mesmoAnel, true, 'Interseções e demanda usam os mesmos raios da rosca');
    assert.equal(areasRosca.sobrepostas[0].d, areasRosca.sobrepostas[1].d, 'As feições coincidem sobre a mesma fatia, sem segundo anel');
    for (const item of areasRosca.sobrepostas) {
      assert.equal(item.fracao, .8, '80% da demanda, não 50% da soma das duas interseções');
      assert.ok(Math.abs(item.proporcao-.8) < 1e-10);
      assert.equal(item.inicio, item.inicioDemanda);
    }
    assert.equal(areasRosca.preservadas, true);
    assert.equal(areasRosca.preservouGrafico, true);
    assert.match(areasRosca.erro, /Área total inválida/);
    assert.equal(areasRosca.circuloCompleto, 4, 'Demanda única ocupa a circunferência completa');
    assert.equal(areasRosca.escolhas[0][0], 'demanda');
    assert.equal(areasRosca.escolhas[1][0], 'intersecao');
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
    assert.equal(await page.locator('#ev-resultados-total-km').innerText(), '1,23 km²');
    assert.equal(await page.locator('#ev-resultados-total-ha').innerText(), '123,4568 ha');
    assert.match(await page.locator('#ev-resultados-tabela td[data-base]').innerText(), /0,000025 km²\s+0,0025 ha/);
    assert.deepEqual(await page.locator('#ev-resultados-legenda button').allTextContents(), ['Demanda Norte']);
    const resumo = page.locator('#ev-resultados-tabela-resumo');
    assert.deepEqual(await resumo.locator('th').allTextContents(), ['', 'Demanda', 'Perímetro (m)', 'Área (km²)', 'Área (ha)', 'Restrição', 'Risco']);
    assert.deepEqual(await resumo.locator('tbody td').allTextContents(),
      ['', 'Demanda Norte', '12.345,68', '1,23', '123,4568', 'Margens do Rio', 'Sem interseção']);
    assert.equal(await resumo.locator('.row-select:checked').count(), 1);
    assert.equal(await resumo.locator('td.restricao').evaluate(el => getComputedStyle(el).color), 'rgb(133, 44, 56)');
    assert.equal(await resumo.locator('td.risco').count(), 0, 'Ausência de interseção não recebe cor de risco');
    const resumoBarra = page.getByRole('toolbar', {name:'Controles da tabela resumo'});
    assert.equal(await resumoBarra.getByRole('button').count(), 4);
    assert.equal(await resumoBarra.locator('.fa-filter-circle-xmark, .fa-filter').count(), 0);
    await page.waitForFunction(() => !document.querySelector('#ev-resumo-editar').disabled);
    await page.locator('#ev-resumo-visualizar').click();
    await page.locator('#modal-objetos').waitFor({state:'visible'});
    assert.match(await page.locator('#modal-objetos').innerText(), /Cadastro original/);
    await page.locator('#modal-objetos [data-modal-close]').click();
    const escritasAntes = calls.length;
    await page.locator('#ev-resumo-editar').click();
    await page.locator('#ev-resumo-nome').fill('Nome descartado');
    assert.equal(await page.locator('#ev-resultados-entrada').isDisabled(), true);
    assert.equal(await page.locator('#ev-resumo-filtro-coluna').isDisabled(), true);
    await page.locator('#ev-resumo-cancelar').click();
    assert.equal(calls.length, escritasAntes, 'Cancelar não altera o cadastro');
    assert.match(await resumo.innerText(), /Demanda Norte/);
    await page.locator('#ev-resumo-editar').click();
    await page.locator('#ev-resumo-nome').fill('   ');
    await page.locator('#ev-resumo-salvar').click();
    assert.equal(calls.length, escritasAntes, 'Nome vazio não é enviado');
    await page.locator('#ev-resumo-nome').fill('Demanda Norte Revisada');
    falharSalvamento = true;
    await page.locator('#ev-resumo-salvar').click();
    await page.waitForFunction(() => document.querySelector('#ev-resumo-status').textContent.includes('Falha de teste'));
    assert.equal(await page.locator('#ev-resumo-nome').inputValue(), 'Demanda Norte Revisada');
    assert.equal(cadastro.get('D-1').nome, 'Demanda Norte');
    falharSalvamento = false;
    await page.locator('#ev-resumo-salvar').click();
    await page.waitForFunction(() => document.querySelector('#ev-resumo-status').textContent.startsWith('Nome salvo'));
    assert.equal(cadastro.get('D-1').nome, 'Demanda Norte Revisada');
    assert.deepEqual(await resumo.locator('tbody td').allTextContents(),
      ['', 'Demanda Norte Revisada', '12.345,68', '1,23', '123,4568', 'Margens do Rio', 'Sem interseção']);
    assert.equal(await page.locator('#ev-resultados-mapa :is(.leaflet-ev-demandas-pane,.leaflet-ev-recortes-pane) path.leaflet-interactive').count(), 2);
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
    await page.locator('.ev-mapa-contexto summary').click();
    await page.getByLabel('Superfície: Área de Proteção',{exact:true}).check();
    await page.locator('.ev-contexto-item [role="status"]').filter({hasText:'Visível na extensão atual'}).waitFor();
    assert.equal(await page.locator('#ev-resultados-mapa .leaflet-ev-superficies-pane path.leaflet-interactive').count(),1);
    await page.getByLabel('Opacidade de Área de Proteção',{exact:true}).fill('60');
    assert.equal(await page.locator('.ev-contexto-item output').textContent(),'60%');
    if (process.env.SICARD_TEST_SCREENSHOT_DIR) {
      for (const [width, nome] of [[390,'mobile'],[1440,'desktop']]) {
        await page.setViewportSize({width,height:1000});
        await page.locator('.secao-elegibilidade-mapa').screenshot({path:require('node:path').join(process.env.SICARD_TEST_SCREENSHOT_DIR,`elegibilidade-mapa-contexto-${nome}.png`)});
      }
    }
    await page.locator('#ev-resultados-mapa-restricao').uncheck();
    assert.equal(await page.locator('#ev-resultados-mapa .leaflet-ev-recortes-pane path.leaflet-interactive').first().getAttribute('stroke-opacity'),'0');
    await page.locator('#ev-resultados-mapa-restricao').check();
    assert.match(await page.locator('#ev-resultados-mapa .leaflet-ev-recortes-pane path.leaflet-interactive').first().getAttribute('fill'),/^url/);
    await page.getByLabel('Superfície: Área de Proteção',{exact:true}).uncheck();
    falharSuperficie = true;
    await page.locator('#ev-resultados-mapa-superficies input[type=checkbox]').first().check();
    await page.locator('.ev-contexto-item [role=status]').filter({hasText:'Fonte indisponivel no teste'}).waitFor();
    assert(await page.locator('#ev-resultados-enquadrar').isEnabled());
    await page.locator('#ev-resultados-mapa-superficies input[type=checkbox]').first().uncheck();
    falharSuperficie = false;
    await page.locator('.ev-mapa-contexto summary').click();
    pacotePendente = true;
    const download = page.waitForEvent('download');
    await page.locator('#ev-resultados-download').click();
    await page.waitForFunction(() => document.querySelector('#ev-resultados-status').textContent.startsWith('Gerando o PDF'));
    assert(await page.locator('#ev-resultados-download').isDisabled());
    assert(await page.locator('#ev-resultados-enquadrar').isEnabled());
    assert(await page.locator('#ev-resultados-base').isEnabled());
    while (!pacoteLiberar) await new Promise(resolve => setTimeout(resolve,20));
    pacoteLiberar(); pacotePendente = false;
    await download;
    for (const tipo of ['plano','programa']) {
      tipoCadastro = tipo;
      await page.reload();
      await escolher('demandas_elegibilidade_territorial.gpkg');
      await page.waitForFunction(() => !document.querySelector('#ev-resumo-editar').disabled);
      assert.match(await resumo.innerText(), new RegExp(cadastro.get('D-1').nome), 'Reabrir consulta o nome persistido');
      await page.locator('#ev-resumo-editar').click();
      await page.locator('#ev-resumo-nome').fill(`Nome do ${tipo}`);
      await page.locator('#ev-resumo-salvar').click();
      await page.waitForFunction(() => document.querySelector('#ev-resumo-status').textContent.startsWith('Nome salvo'));
      assert.equal(calls.at(-1).path, `/api/${tipo === 'plano' ? 'planos' : 'programas'}/D-1`);
    }
    perfil = 'VISUALIZADOR';
    await page.reload();
    await escolher('demandas_elegibilidade_territorial.gpkg');
    await page.waitForFunction(() => document.querySelector('#ev-resumo-status').textContent.includes('nomes atuais'));
    assert.equal(await page.locator('#ev-resumo-editar').isDisabled(), true);
    perfil = 'ADMIN'; comVinculo = false;
    await page.reload();
    await escolher('demandas_elegibilidade_territorial.gpkg');
    await page.locator('#ev-resultados-conteudo').waitFor({state:'visible'});
    assert.equal(await page.locator('#ev-resumo-editar').isEnabled(), true, 'Sem vínculo, permite revisar o nome na análise sem deduzir cadastro por ID');
    await page.locator('#ev-resumo-visualizar').click();
    await page.locator('#modal-objetos').waitFor({state:'visible'});
    assert.match(await page.locator('#modal-objetos-title').innerText(), /sem vínculo cadastral/);
    await page.locator('#modal-objetos [data-modal-close]').click();
    const cadastroAntes = cadastro.get('D-1').nome, chamadasAntes = calls.length;
    await page.locator('#ev-resumo-editar').click();
    await page.locator('#ev-resumo-nome').fill('Rascunho avulso');
    await page.locator('#ev-resumo-cancelar').click();
    assert.equal(calls.length, chamadasAntes, 'Cancelar nome avulso não escreve');
    await page.locator('#ev-resumo-editar').click();
    await page.locator('#ev-resumo-nome').fill('Demanda Avulsa Revisada');
    falharSalvamento = true;
    await page.locator('#ev-resumo-salvar').click();
    await page.waitForFunction(() => document.querySelector('#ev-resumo-status').textContent.includes('Falha de teste'));
    assert.equal(await page.locator('#ev-resumo-nome').inputValue(), 'Demanda Avulsa Revisada');
    falharSalvamento = false;
    await page.locator('#ev-resumo-salvar').click();
    await page.waitForFunction(() => document.querySelector('#ev-resumo-status').textContent.startsWith('Nome salvo na revisão'));
    assert.equal(cadastro.get('D-1').nome, cadastroAntes, 'Revisão avulsa não altera cadastro de ID semelhante');
    assert.equal(calls.at(-1).path, '/api/geoespacial/extracao-atributos/elegibilidade/resultados/demanda/nome');
    await page.reload();
    await escolher('demandas_elegibilidade_territorial.gpkg');
    await page.locator('#ev-resultados-conteudo').waitFor({state:'visible'});
    assert.match(await resumo.innerText(), /Demanda Avulsa Revisada/, 'Nome avulso é reaplicado ao reabrir');
    assert.match(await page.locator('#ev-resultados-legenda').innerText(), /Demanda Avulsa Revisada/i);
    assert.match(await page.locator('#ev-resultados-tabela').innerText(), /Demanda Avulsa Revisada/);
    tipoCadastro = 'projeto'; comVinculo = true;
    modoTabela = 'paginada';
    cadastro = new Map(Array.from({length:55}, (_,i) => [`D-${i}`, {id:`D-${i}`, nome:`Demanda ${i}`}]));
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
    const geometryCount = await page.locator('#ev-resultados-mapa :is(.leaflet-ev-demandas-pane,.leaflet-ev-recortes-pane) path.leaflet-interactive').count();
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
    assert.match(await tabela.locator('tbody tr').first().locator('[data-base="contato"]').innerText(), /0,0000 ha/);
    assert.match(await page.locator('#ev-resultados-contagem').innerText(), /50 na página \/ 55 no total/);
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
    await page.locator('#ev-resultados-feicoes-demanda button').last().click();
    const resumoNav = page.locator('#ev-resumo-paginacao');
    await resumoNav.getByRole('button', {name:'Última página', exact:true}).click();
    assert.deepEqual(await resumo.locator('tbody tr').last().locator('td').allTextContents(),
      ['', 'Demanda 54', '40,00', '0,0001', '0,0100', 'Margens do Rio', 'Feição Posterior']);
    assert.equal(await resumo.locator('td.risco').evaluate(el => getComputedStyle(el).color), 'rgb(133, 97, 0)');
    await resumo.locator('tr[data-chave="53"] .row-select').check();
    assert.equal(await page.locator('#ev-resultados-nome-ativo').innerText(), 'Demanda 53');
    assert.equal(await resumo.locator('.row-select:checked').count(), 1);
    await resumo.locator('tr[data-chave="54"] .row-select').check();
    await page.locator('#ev-resultados-feicoes-demanda button').last().click();
    assert.equal(await resumoNav.getByRole('button', {name:'Próxima página', exact:true}).isDisabled(), true);
    await page.locator('#ev-resumo-filtro-coluna').selectOption('risco');
    await page.locator('#ev-resumo-filtro-valor').selectOption('Feição Posterior');
    assert.equal(await resumo.locator('tbody tr[data-chave]').count(), 1);
    assert.equal(await tabela.locator('tbody tr[data-chave]').count(), 3, 'Resumo tem filtro independente');
    await page.locator('#ev-resumo-filtro-inverter').click();
    assert.equal(await resumo.locator('tbody tr[data-chave]').count(), 50);
    await page.locator('#ev-resumo-filtro-limpar').click();
    await page.locator('#ev-sobreposicoes-filtro-coluna').selectOption('nome');
    await page.locator('#ev-sobreposicoes-filtro-valor').selectOption('Demanda 54');
    assert.equal(await tabela.locator('tbody tr[data-chave]').count(), 1);
    assert.equal(await resumo.locator('tbody tr[data-chave]').count(), 50);
    await page.locator('#ev-sobreposicoes-filtro-limpar').click();
    await page.locator('#ev-resultados-proxima').click();
    assert.equal(await tabela.locator('.evr-foco').evaluate(el => getComputedStyle(el).fontSize), '9.5px');
    assert.equal(await page.locator('#ev-resultados-mapa :is(.leaflet-ev-demandas-pane,.leaflet-ev-recortes-pane) path.leaflet-interactive').count(), geometryCount);
    assert.equal(calls.length, callsBeforeFilter, 'Filtro e navegação não escrevem nem recalculam resultados');
    for (const width of [1440, 390]) {
      await page.setViewportSize({width, height: 1000});
      const layout = await page.locator('.secao-elegibilidade-tabela').first().evaluate(panel => {
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
      assert.ok(layout.fonts.every(size => size <= 16), `Controles usam a escala padronizada em ${width}px`);
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
    const estilos = async (container, acao) => page.locator(container).evaluate((painel, acao) => {
      const estilo = seletor => {
        const s = getComputedStyle(painel.querySelector(seletor));
        return [s.width, s.height, s.borderRadius, s.fontSize, s.borderTopWidth];
      };
      const filtro = seletor => {
        const s = getComputedStyle(painel.querySelector(seletor));
        return [s.height, s.minWidth, s.maxWidth, s.borderRadius, s.borderTopWidth,
          s.borderTopColor, s.backgroundColor, s.padding, s.fontSize];
      };
      return {acao:estilo(acao), paginador:estilo('.admin-pagination button'),
        filtro:filtro('.admin-filter-bar').filter((_, i) => i !== 1), coluna:filtro('.admin-filter-bar select'),
        filtroBotao:filtro('.admin-filter-bar .admin-icon-btn')};
    }, acao);
    const padroesResultados = new Map();
    for (const width of [1440, 390]) {
      await page.setViewportSize({width, height:1000});
      padroesResultados.set(width, await estilos('.secao-elegibilidade-tabela:first-of-type', '.admin-actions .admin-icon-btn'));
    }
    await page.goto('http://127.0.0.1:8083/restrict/agrupamento-demandas/', {waitUntil:'networkidle'});
    await page.locator('#agrupamento-new').click();
    for (const width of [1440, 390]) {
      await page.setViewportSize({width, height:1000});
      const padraoAgrupamento = await estilos('.agrupamento-universo', '.admin-actions .admin-icon-btn');
      assert.deepEqual(padroesResultados.get(width), padraoAgrupamento,
        `Barra de filtros, botões e paginador seguem as medidas e cores da referência em ${width}px`);
    }
    assert.deepEqual(errors, []);
    console.log('PASS: reabertura GPKG, cancelamento e erros; barra de controles, vazias em todas as páginas, zeros preservados, seleção, paginação, filtro reversível, fontes compactas, relatório completo e mobile.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
