// Página, prévia e bancada reais; APIs interceptadas, sem gravar dados oficiais.
const {chromium} = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({headless:true,
    channel:process.env.SICARD_TEST_BROWSER || (process.platform === 'win32' ? 'msedge' : undefined),
    args:['--no-proxy-server','--enable-unsafe-swiftshader']});
  try {
    const page = await browser.newPage({viewport:{width:1440,height:1000}});
    page.setDefaultTimeout(20000);
    const errors = [], requests = [], saved = new Map();
    let failLayer = '', missingGeometry = false;
    page.on('pageerror', error => errors.push(error.message));
    await page.addLocatorHandler(page.locator('#pfsStatusOverlay.pfs-active'), async () => {
      await page.evaluate(() => window.StatusFeedback.fechar());
    });
    await page.addLocatorHandler(page.locator('.notification-toast').first(), async () => {
      await page.evaluate(() => window.Notify.clearAll());
    });
    const imagem = await page.evaluate(() => {
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 4;
      const ctx = canvas.getContext('2d'); ctx.fillStyle = '#23754b'; ctx.fillRect(0,0,4,4);
      return canvas.toDataURL();
    });
    const pasta = 'superficies-indices/hierarquizacao/favorabilidade';
    const limites = [-47.2,-23.4,-46.5,-22.9];
    const geometries = [
      {type:'Point',coordinates:[-47,-23]},
      {type:'LineString',coordinates:[[-47,-23],[-46.8,-23.2]]},
    ];
    const hier = {codigo:'HIER-F2',nome:'Rodada de favorabilidade',tipo_demanda:'projeto',
      dados_hierarquizacao:{cabecalho_grupo:{fases_a_executar:[2]},objetos:geometries.map((_,i) => ({
        cabecalho_objeto:{codigo:`D-${i}`,nome:`Demanda ${i}`,demanda_id:`id-${i}`,atributos:{teste:42}},
        hierarquizacao:{fase_2:{indice_favorabilidade_grade:0.8,indice_favorabilidade_rede:0.6}},
      }))}};
    const entrada = {id:'storage:base-geoespacial/entrada.gpkg::demandas',nome:'entrada',
      arquivo:'base-geoespacial/entrada.gpkg',camada:'demandas',tipo:'vetor'};
    const rede = {id:`storage:${pasta}/rede.gpkg::rede`,nome:'rede',arquivo:`${pasta}/rede.gpkg`,camada:'rede',tipo:'vetor'};
    const grade = {id:`storage:${pasta}/grade.tif`,nome:'grade',arquivo:`${pasta}/grade.tif`,tipo:'raster'};
    const prepared = ref => ({...ref,status_validacao:'valida',representacao:'tiles',revisao:ref.nome,
      tiles_token:'a'.repeat(32),feicoes:2,bounds:limites,campos:[{nome:'codigo'},{nome:'indice'}],
      metadados_local:{crs:'EPSG:4674',tipos_geometria:ref === entrada ? ['Point','LineString'] : ['Polygon'],feicoes:2}});
    const raw = ref => ref.tipo === 'raster' ? ref : {
      id:`storage:${ref.arquivo}`,nome:ref.nome,arquivo:ref.arquivo,inventariar:true,
    };
    await page.route('**/api/**', async route => {
      const req = route.request(), url = new URL(req.url()), path = url.pathname;
      const send = data => route.fulfill({json:data});
      requests.push({path,method:req.method(),query:Object.fromEntries(url.searchParams),
        body:req.method() === 'POST' ? req.postDataJSON() : null});
      if (path.includes('/auth/')) return send({authenticated:true,id:'fixture',nome:'Teste',username:'Teste',tipo_usuario:'ADMIN'});
      if (path.endsWith('/ahp/hierarquizacoes')) return send([hier,
        {...hier,codigo:'HIER-F1',dados_hierarquizacao:{cabecalho_grupo:{fases_a_executar:[1]}}}]);
      if (path.endsWith('/ahp/hierarquizacoes/HIER-F2')) return send(hier);
      if (path.includes('/cadastro-geometrias/')) {
        const codigo = url.searchParams.get('codigo'), i = Number(codigo.slice(2));
        return send({itens:missingGeometry ? [] : [{codigo,id:`cadastro:projeto:${codigo}`,nome:`Demanda ${i}`,bounds:limites,
          geojson:{type:'FeatureCollection',features:[{type:'Feature',properties:{codigo},geometry:geometries[i]}]}}]});
      }
      if (path.endsWith('/storage/pastas')) return send({pastas:[
        {caminho:'base-geoespacial',nome:'Bases geoespaciais'},
        {caminho:'superficies-indices',nome:'Superfícies e índices'},
      ]});
      if (path.endsWith('/storage/navegar')) {
        const caminho = url.searchParams.get('caminho');
        return send({caminho,pai:null,pastas:[],arquivos:caminho === pasta ? [raw(rede),grade] : [raw(entrada)]});
      }
      if (path.endsWith('/storage/camadas-arquivo')) {
        const arquivo = url.searchParams.get('arquivo');
        return send({camadas:[entrada,rede,grade].filter(ref => ref.arquivo === arquivo)});
      }
      if (path.endsWith('/preparar-camada')) {
        const ref = [entrada,rede].find(c => c.id === req.postDataJSON().id);
        if (ref?.id === failLayer) return route.fulfill({status:422,json:{detail:'Camada indisponível para a prévia.'}});
        assert(ref, 'Nenhum raster deve ser enviado ao preparador vetorial');
        return send(prepared(ref));
      }
      if (path.endsWith('/storage/camada/raster-preview')) return send({
        image:imagem,bounds:limites,coordinates:[[-47.2,-22.9],[-46.5,-22.9],[-46.5,-23.4],[-47.2,-23.4]],
        width:4,height:4,crs:'EPSG:4326',min:0.2,max:0.8,
      });
      if (path.endsWith('/extracao-atributos/configuracoes')) {
        if (req.method() === 'POST') {
          const data = req.postDataJSON(); saved.set(data.escopo,data);
          return send({chave:'teste',nome:data.nome,camadas:data.categorias[0].camadas.length});
        }
        const data = saved.get(url.searchParams.get('escopo'));
        return send({pasta:'storage/listas',configuracoes:data ? [{
          chave:'teste',nome:data.nome,arquivo:'teste.json',bytes:120,camadas:1,categorias:1,
        }] : []});
      }
      if (path.endsWith('/configuracoes/teste')) {
        const data = saved.get(url.searchParams.get('escopo'));
        return send({...data,categorias:data.categorias.map(c => ({...c,camadas:c.camadas.map(id => [grade,rede].find(l => l.id === id))}))});
      }
      if (path.endsWith('.pbf')) return route.fulfill({status:204});
      return send([]);
    });
    const base = process.env.SICARD_TEST_URL || 'http://127.0.0.1:8083';
    await page.goto(`${base}/restrict/hierarquizacao/fase-2/`,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(() => document.querySelector('#fv-hierarquizacao')?.options.length === 2);
    await page.waitForFunction(() => document.querySelector('iframe').contentWindow.gpApp?.state.map?.isStyleLoaded());
    const panel = () => page.locator('iframe').evaluate(f => f.contentWindow.gpApp.state.layers.map(l => l.id));
    const idle = () => page.waitForFunction(() => document.querySelector('#favorabilidade-app').getAttribute('aria-busy') === 'false');
    async function dismiss() {
      await idle();
      await page.evaluate(() => { window.ProcessFeedback.atual?.fechar(); window.StatusFeedback.fechar(); window.Notify.clearAll(); });
    }
    async function choose(papel, ref) {
      await dismiss();
      await page.locator(`#fv-${papel}-browse`).click();
      const dialog = page.locator('dialog.ea-storage-dialog');
      if (papel === 'entrada') await dialog.locator('.ea-storage-tree-open',{hasText:'Bases geoespaciais'}).click();
      else {
        await dialog.locator(`[data-file="${raw(ref).id}"]`).waitFor();
        const ultima = requests.filter(r => r.path.endsWith('/storage/navegar')).at(-1);
        assert.equal(ultima.query.caminho,pasta,'Explorador de superfícies abre na pasta solicitada');
        assert.equal(ultima.query.incluir_rasters,'true');
      }
      await dialog.locator(`[data-file="${raw(ref).id}"]`).click();
      const antes = requests.length;
      await dialog.getByRole('button',{name:/^Confirmar/}).click();
      await dialog.waitFor({state:'detached'});
      await idle();
      assert.equal(requests.length,antes,'Confirmar seleção transfere referências sem validar fontes');
    }
    async function preview(papel, botao=papel) {
      await dismiss();
      const antes = await panel();
      await page.locator(`#fv-${botao}-enviar`).click();
      await idle();
      assert.equal(await page.locator('#fv-status').getAttribute('data-error'),'false');
      assert.deepEqual(await panel(),antes,'Atualizar prévia não altera a bancada');
      await dismiss();
    }
    async function send(cancel=false) {
      await dismiss();
      const antes = await panel();
      await page.locator('#ea-staging-confirmar').click();
      await page.locator(cancel ? '#pfsConfirmCancel' : '#pfsConfirmOk').click();
      await idle();
      if (cancel) assert.deepEqual(await panel(),antes);
      else assert.equal(await page.locator('#fv-status').getAttribute('data-error'),'false');
      await dismiss();
    }
    const checkbox = nome => page.locator('#ea-input-preview-layers [data-validation]')
      .getByRole('checkbox',{name:`Visibilidade no mapa: ${nome}`,exact:true});

    assert.equal(await page.locator('iframe').count(),1);
    assert.equal(await page.locator('slt-geoprocessamento').count(),0);
    assert(await page.locator('#fv-rede-browse').isEnabled(),'Rede independe de selecionar grade primeiro');
    await choose('rede',rede);
    await preview('rede');
    await choose('grade',grade);
    await preview('grade');
    await choose('entrada',entrada);
    await preview('entrada');
    assert.deepEqual(await panel(),[]);
    assert(await page.locator('#fv-hierarquizacao').isDisabled(),'Origens da entrada são exclusivas');
    assert.equal(await page.locator('#ea-input-preview-layers [data-validation]').count(),3);
    await checkbox('grade').uncheck();
    await send(true);
    await send();
    assert.deepEqual(new Set(await panel()),new Set([entrada.id,rede.id]));
    await checkbox('grade').check();
    await send();
    assert.deepEqual(new Set(await panel()),new Set([entrada.id,rede.id,grade.id]));
    const raster = await page.locator('iframe').evaluate((f,id) => ({
      tipo:f.contentWindow.gpApp.state.map.getLayer(id).type,
      fonte:f.contentWindow.gpApp.state.map.getSource(id).type,
    }),grade.id);
    assert.deepEqual(raster,{tipo:'raster',fonte:'image'});
    await page.locator('iframe').evaluate((f,id) => {
      const app = f.contentWindow.gpApp;
      for (const suffix of ['','-line','-point']) if (app.state.map.getLayer(id+suffix))
        app.state.map.setLayoutProperty(id+suffix,'visibility','none');
      app.renderLayers();
    },rede.id);
    await page.waitForFunction(() => document.querySelector('#fv-run-rede').textContent.includes('Nenhuma camada'));
    await page.locator('iframe').evaluate((f,id) => f.contentWindow.gpApp.removeLayerFromMap(id,false),grade.id);
    await page.waitForFunction(() => document.querySelector('#fv-run-grade').textContent.includes('Nenhuma camada'));
    failLayer = rede.id;
    const antesFalha = await panel();
    await page.locator('#fv-rede-enviar').click();
    await idle();
    assert.equal(await page.locator('#fv-status').getAttribute('data-error'),'true');
    assert.equal(await page.locator('#ea-input-preview-layers [data-validation]').count(),3,'Falha preserva prévia anterior');
    assert.deepEqual(await panel(),antesFalha);
    failLayer = '';
    await dismiss();
    await page.locator('#fv-entrada-limpar').click();
    missingGeometry = true;
    await page.selectOption('#fv-hierarquizacao',hier.codigo);
    await idle();
    assert.match(await page.locator('#fv-status').textContent(),/não possui geometria cadastrada/);
    assert.deepEqual(await panel(),antesFalha);
    missingGeometry = false;
    await dismiss();
    await page.selectOption('#fv-hierarquizacao',hier.codigo);
    await idle();
    await dismiss();
    assert.equal(await page.locator('#fv-hier-lista li').count(),2);
    assert.match(await page.locator('#fv-resultados').textContent(),/0\.8000.*0\.6000/s);
    await preview('entrada','hier');
    await checkbox('D-0 — Demanda 0').uncheck();
    await page.locator('#ea-staging-confirmar').click();
    await idle();
    assert.match(await page.locator('#fv-status').textContent(),/todas as demandas/);
    assert.deepEqual(await panel(),antesFalha);
    await dismiss();
    await checkbox('D-0 — Demanda 0').check();
    await send();
    const originais = await page.locator('iframe').evaluate(f => f.contentWindow.gpApp.state.layers
      .filter(l => l.id.startsWith('cadastro:')).map(l => ({
        geometry:f.contentWindow.gpApp.state.map.getStyle().sources[l.id].data.features[0].geometry,
        propriedades:f.contentWindow.gpApp.state.map.getStyle().sources[l.id].data.features[0].properties,
      })));
    assert.equal(originais.length,2);
    assert.deepEqual(originais.map(o => o.geometry),geometries,'Pontos e linhas mantêm as geometrias, sem buffers');
    assert(originais.every(o => o.propriedades.hierarquizacao === hier.codigo && o.propriedades.objeto_hierarquizacao));
    for (const papel of ['grade','rede']) {
      await page.locator(`#fv-${papel}-salvar`).click();
      await page.locator('#pfsConfirmInput').fill('Superfícies');
      await page.locator('#pfsConfirmOk').click();
      await idle();
      await dismiss();
      assert.equal(saved.get(`favorabilidade-${papel}`).categorias[0].id,papel);
    }
    await page.locator('#fv-grade-carregar').click();
    await page.locator('.ea-config-entry').click();
    await page.locator('dialog.ea-config-dialog').getByRole('button',{name:/Abrir|Carregar/}).last().click();
    await idle();
    await dismiss();
    await preview('grade');
    assert.equal(await page.locator('#fv-status').getAttribute('data-error'),'false','Lista raster pode ser revalidada');
    const naoPermitidas = requests.filter(r => /\/elegibilidade\/|\/fases\/2\/executar|\/bancada-arquivos\/executar/.test(r.path));
    assert.deepEqual(naoPermitidas,[],'Preparação não executa normalização ou cálculos');
    await page.setViewportSize({width:390,height:844});
    await page.waitForTimeout(250);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth+1),'Layout mobile sem overflow horizontal');
    assert.deepEqual(errors,[]);
    console.log('Favorabilidade V2: entrada exclusiva, geometrias originais, pasta de superfícies, grade/rede independentes, prévia, raster e vetor na bancada, cancelamento, falhas, listas e responsividade OK.');
  } finally { await browser.close(); }
})().catch(error => {console.error(error);process.exitCode = 1;});
