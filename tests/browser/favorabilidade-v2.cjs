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
    let modoExecucao = 'sucesso';
    let falharGrafico = false;
    let indicesIncompletos = false;
    let revisados = false;
    const execucoes = [], normalizacoes = [], jobs = new Map();
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
    const prepared = ref => ({...ref,status_validacao:'valida',representacao:'tiles',revisao:ref.nome,revisao_fonte:'987-654',
      tiles_token:'a'.repeat(32),feicoes:2,bounds:limites,campos:[{nome:'codigo'},{nome:'indice'}],
      metadados_local:{crs:'EPSG:4674',tipos_geometria:ref === entrada ? ['Point','LineString'] : ['Polygon'],feicoes:2}});
    const raw = ref => ref.tipo === 'raster' ? ref : {
      id:`storage:${ref.arquivo}`,nome:ref.nome,arquivo:ref.arquivo,inventariar:true,
    };
    const gradePoligonal = 'storage:superficies-indices/grade.gpkg::grade';
    const poligono = {type:'Polygon',coordinates:[[[-47,-23],[-46.99,-23],[-46.99,-22.99],[-47,-22.99],[-47,-23]]]};
    const fontesResultados = ids => [
      ...ids.map(id => ({id:`entrada:${id}`,nome:`Entrada ${id}`,papel:'entrada',tipo:'camada'})),
      {id:rede.id,nome:'Rede',papel:'rede',tipo:'camada'},
      ...['Mesma classe','Mesma classe','Contato'].map((nome,i) =>
        ({id:`f${i}`,base_id:rede.id,nome,papel:'rede',tipo:'feicao'})),
      ...(ids.includes('reaberta') ? [
        {id:gradePoligonal,nome:'Grade Territorial',papel:'grade',tipo:'camada'},
        {id:'g0',base_id:gradePoligonal,nome:'Município Alfa',papel:'grade',tipo:'feicao'},
      ]:[]),
    ];
    const modeloResultados = (ids, nomes) => {
      const fontes = fontesResultados(ids).map(f => ({...f,nome:nomes[f.id] || f.nome}));
      return {fontes,concluidas:ids.length,previstas:ids.length,metodologia:'Índices _dim e classes originais por demanda e feição, sem agregação.',
        entradas:ids.map(id => {
          const grade = ids.includes('reaberta');
          const campos = [
            ...(grade ? [{id:gradePoligonal,nome:nomes[gradePoligonal] || 'Grade Territorial',papel:'grade'}]:[]),
            {id:rede.id,nome:nomes[rede.id] || 'Rede',papel:'rede'},
          ];
          const linhas = Array.from({length:53},(_,i) => ({
            chave:String(i),id:i===0?'A':i===1?'B':`V${i}`,nome:i===0?'Demanda A':i===1?'Demanda B':`Demanda vazia ${i}`,
            area_total_m2:100,areas:[...(grade?[i===0?25:null]:[]),i===0?15:i===1?20:null],
            sobreposicoes:i<2?[
              ...(grade && i===0 ? [{id:'g0',base_id:gradePoligonal,nome:nomes.g0 || 'Município Alfa',identificador:1,area_m2:25,percentual:25}]:[]),
              {id:'f0',base_id:rede.id,nome:nomes.f0 || 'Mesma classe',identificador:1,area_m2:i===0?10:20,percentual:i===0?10:20},
              {id:i===0?'f1':'f2',base_id:rede.id,nome:i===0?(nomes.f1 || 'Mesma classe'):(nomes.f2 || 'Contato'),identificador:i===0?2:3,area_m2:i===0?5:0,percentual:i===0?5:0},
            ]:[],
          }));
          for (const linha of linhas) for (const item of linha.sobreposicoes) {
            const grade = item.base_id === gradePoligonal;
            item.favorabilidade = {
              indice:{f0:.7,f1:.3,f2:0,g0:.4}[item.id],
              classe:{f0:'ALTA',f1:'baixa',f2:'mUITO bAIXA',g0:'moderada'}[item.id],
              estado_indice:'valido',estado_classe:'valido',
              campo_indice:grade?'fav_territorial_dim':'fav_rede_dim',
              campo_classe:grade?'fav_territorial_classe':'fav_rede_classe',
            };
            if (indicesIncompletos && item.id !== 'f2') {
              item.favorabilidade.indice = null;
              item.favorabilidade.estado_indice = item.id === 'f0' ? 'invalido' : item.id === 'f1' ? 'nulo' : 'ausente';
              if (item.id !== 'f0') {
                item.favorabilidade.classe = null;
                item.favorabilidade.estado_classe = item.id === 'g0' ? 'ausente' : 'nulo';
              }
            }
          }
          const features = (properties,geometry=poligono) => ({type:'Feature',geometry,properties});
          return {id,nome:nomes[`entrada:${id}`] || `Entrada ${id}`,campos,linhas,feicoes:53,com_intersecao:2,sem_intersecao:51,
            geometrias:{type:'FeatureCollection',features:linhas.map(l=>features({chave:l.chave}))},
            intersecoes:{type:'FeatureCollection',features:linhas.flatMap(l=>l.sobreposicoes.map(s=>features(
              {chave:l.chave,base_id:s.base_id,feicao_id:s.id},
              s.area_m2 === 0 ? {type:'LineString',coordinates:[[-47,-23],[-46.99,-23]]} : poligono)))}};
        })};
    };
    await page.route('https://server.arcgisonline.com/**', route => route.abort());
    await page.route('**/api/**', async route => {
      const req = route.request(), url = new URL(req.url()), path = url.pathname;
      const send = data => route.fulfill({json:data});
      requests.push({path,method:req.method(),query:Object.fromEntries(url.searchParams),
        body:req.method() === 'POST' ? req.postDataJSON() : null});
      if (path.includes('/auth/')) return send({authenticated:true,id:'fixture',nome:'Teste',username:'Teste',tipo_usuario:'ADMIN'});
      if (path.endsWith('/ahp/hierarquizacoes')) return send([hier,
        {...hier,codigo:'HIER-F1',dados_hierarquizacao:{cabecalho_grupo:{fases_a_executar:[1]}}}]);
      if (path.endsWith('/ahp/hierarquizacoes/HIER-F2')) return send(hier);
      if (path.endsWith('/favorabilidade/resultados/preparar')) {
        if (falharGrafico) return route.fulfill({status:422,json:{detail:'Saída alterada; gráfico recusado.'}});
        const ids = req.postDataJSON().execucoes;
        return send({fontes:fontesResultados(ids),revisados,concluidas:ids.length,previstas:ids.length});
      }
      if (path.endsWith('/favorabilidade/resultados/visualizar')) {
        const payload = req.postDataJSON();
        assert.equal(payload.revisados,true);
        revisados = true;
        return send(modeloResultados(payload.execucoes,payload.nomes));
      }
      if (path.endsWith('/favorabilidade/resultados/pacote')) {
        return route.fulfill({contentType:'application/zip',body:Buffer.from('PK-fixture')});
      }
      if (path.endsWith('/favorabilidade/resultados/abrir')) {
        return send({execucoes:['reaberta'],fontes:fontesResultados(['reaberta']),revisados:true,concluidas:1,previstas:1});
      }
      if (/\/favorabilidade\/preparar-(demanda|hierarquizacao)$/.test(path)) {
        normalizacoes.push({path,body:req.postDataJSON()});
        const arquivo = `saidas-geoespaciais/preparacao-f2-${normalizacoes.length}.gpkg`;
        return send({...prepared(entrada),id:`storage:${arquivo}::demandas`,arquivo,
          metadados_local:{tipos_geometria:['MultiPolygon'],feicoes:2},revisao:'123-456',revisao_fonte:undefined});
      }
      if (path.endsWith('/favorabilidade/execucoes') && req.method() === 'POST') {
        const payload = req.postDataJSON(), id = `execucao-${execucoes.length + 1}`;
        execucoes.push(payload);
        const arquivo = `saidas-geoespaciais/favorabilidade/${id}.gpkg`;
        const resultado = {...prepared(rede),id:`storage:${arquivo}::favorabilidade_territorial`,
          arquivo,nome:`Favorabilidade ${id}`,camada:'favorabilidade_territorial',
          favorabilidade:{indices_agregados:false}};
        jobs.set(id,{id,status:modoExecucao === 'cancelar' ? 'executando' : modoExecucao === 'erro' ? 'erro' : 'concluido',
          cancelavel:modoExecucao === 'cancelar',erro:modoExecucao === 'erro' ? 'Falha OGR simulada.' : null,
          resultado:modoExecucao === 'erro' ? null : resultado});
        return send({id,status:'executando',cancelavel:true,etapa:'Intersectar entrada integral'});
      }
      if (path.includes('/favorabilidade/execucoes/')) {
        const id = path.split('/').at(path.endsWith('/cancelar') ? -2 : -1);
        if (path.endsWith('/cancelar')) jobs.set(id,{id,status:'cancelado',cancelavel:false,resultado:null});
        return send(jobs.get(id));
      }
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
        return send({caminho,pai:null,pastas:[],arquivos:caminho === pasta ? [raw(rede),grade]
          : caminho === 'saidas-geoespaciais' ? [{id:'storage:saidas-geoespaciais/analise.gpkg',arquivo:'saidas-geoespaciais/analise.gpkg',nome:'Análise salva',inventariar:true}] : [raw(entrada)]});
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
    assert(await page.getByRole('heading',{name:'Conferir e executar'}).isVisible());
    assert(await page.getByRole('button',{name:'Calcular Favorabilidade Territorial',exact:true}).isDisabled());
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
    assert.equal(await page.locator('#ev-resultados-agregados tbody tr').count(),0,'A tabela depende das interseções calculadas, não dos índices oficiais');
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
    assert.equal(normalizacoes.length,0,'Preparar/enviar não normaliza a entrada nem executa interseções');
    await send();
    await visivel(rede.id,true);
    await page.locator('#fv-calcular').click();
    await idle();
    assert.match(await page.locator('#fv-status').textContent(),/somente superfícies poligonais/);
    assert.equal(execucoes.length,0,'Raster é rejeitado sem iniciar cálculo');
    await dismiss();
    await page.locator('iframe').evaluate((f,id) => f.contentWindow.gpApp.removeLayerFromMap(id,false),grade.id);
    await page.waitForFunction(() => document.querySelector('#fv-run-grade').textContent.includes('Nenhuma camada'));
    await page.locator('#fv-calcular').click();
    await page.locator('#pfsConfirmCancel').click();
    await idle();
    assert.equal(normalizacoes.length,0,'Cancelar confirmação não prepara ou grava entradas');
    async function visivel(id, valor) {
      await page.locator('iframe').evaluate((f,{id,valor}) => {
        const app = f.contentWindow.gpApp;
        for (const suffix of ['','-line','-point']) if (app.state.map.getLayer(id+suffix))
          app.state.map.setLayoutProperty(id+suffix,'visibility',valor ? 'visible' : 'none');
        app.renderLayers();
      },{id,valor});
    }
    await visivel('cadastro:projeto:D-0',false);
    await page.waitForFunction(() => document.querySelector('#fv-run-count').textContent.startsWith('1 entrada'));
    await page.locator('#fv-calcular').click();
    await idle();
    assert.match(await page.locator('#fv-status').textContent(),/todas as demandas/);
    await dismiss();
    await visivel('cadastro:projeto:D-0',true);
    await page.waitForFunction(() => document.querySelector('#fv-run-count').textContent.startsWith('2 entrada'));
    async function calcular() {
      await dismiss();
      await page.locator('#fv-calcular').click();
      await page.locator('#pfsConfirmOk').click();
    }
    await calcular();
    await idle();
    assert.equal(normalizacoes[0].body.codigo,hier.codigo);
    assert.deepEqual(normalizacoes[0].body.demandas,['cadastro:projeto:D-0','cadastro:projeto:D-1']);
    assert.equal(execucoes.length,1,'Hierarquização é processada como uma entrada integral');
    assert.equal(execucoes[0].hierarquizacao,hier.codigo);
    assert.equal(execucoes[0].entrada.revisao,'123-456');
    assert.deepEqual(execucoes[0].grade,[]);
    assert.equal(execucoes[0].rede[0].id,rede.id);
    assert.equal(execucoes[0].rede[0].revisao,'987-654','Cálculo recebe a revisão do original, não o token da prévia');
    assert((await panel()).includes(jobs.get('execucao-1').resultado.id),'Saída persistida incluída na bancada');
    assert.match(await page.locator('#fv-status').textContent(),/Nenhum índice ou classe foi agregado/);
    assert(await page.locator('#ev-resultados-aliases').isVisible());
    assert(await page.locator('#ev-resultados-download').isDisabled());
    await page.locator('#ev-resultados-revisados').check();
    await page.locator('#ev-resultados-mostrar').click();
    await page.locator('#ev-resultados-conteudo').waitFor({state:'visible'});
    assert.equal(await page.locator('#ev-resultados-rosca').count(),0,'A Favorabilidade não usa rosca ou fatias de área');
    assert.equal(await page.locator('#ev-resultados-indices-grafico .fv-dot-linha').count(),4,'Nomes iguais e contatos sem área mantêm combinações distintas');
    assert.deepEqual(await page.locator('.fv-dot-linha').evaluateAll(p=>p.map(n=>n.dataset.indice)),['0.7','0.7','0.3','0'],'Lista decrescente por índice, preservando zero e repetições');
    assert.deepEqual(await page.locator('.fv-dot-linha').first().locator(':scope > span').allTextContents(),
      ['Demanda A','Alta','0,70'],'Somente nome da demanda, classe e índice, cada um em sua coluna');
    assert.deepEqual(await page.locator('#ev-resultados-tabela thead th').allTextContents(),
      ['Demanda','Superfície de Favorabilidade','Município de Origem (Feição)',
        'Índice de Favorabilidade Dimensionada (0–1) ↓','Classe de Favorabilidade']);
    assert.deepEqual(await page.locator('#ev-resultados-tabela tbody tr').evaluateAll(rows=>rows.slice(0,4).map(r=>r.dataset.feicao)),
      ['f0','f0','f1','f2'],'Ordenação global antes da paginação');
    const extremos = await page.evaluate(async () => {
      const {renderizarRosca,numeroSobreposicao} = await import('/restrict/hierarquizacao/js/sobreposicoes-rosca.js');
      const svg = document.createElementNS('http://www.w3.org/2000/svg','svg'), legenda = document.createElement('div');
      const item = {id:'a',chave:'a',entradaNome:'Entrada',demandaNome:'Demanda',demandaId:'A',baseNome:'Base',nome:'Feição',identificador:1,area_m2:0};
      const render = itens => renderizarRosca({svg,legenda,itens,aoSelecionar:() => {}});
      render([item]);
      const zero = {fatias:svg.querySelectorAll('path').length,itens:legenda.children.length,texto:legenda.textContent};
      render([]);
      const vazio = {fatias:svg.querySelectorAll('path').length,itens:legenda.children.length,texto:svg.textContent};
      render([{...item,area_m2:1}]);
      return {zero,vazio,unica:svg.querySelectorAll('path').length,pequeno:numeroSobreposicao(.000000001)};
    });
    assert.equal(extremos.zero.fatias,0); assert.equal(extremos.zero.itens,1);
    assert.match(extremos.zero.texto,/Contato sem área/);
    assert.equal(extremos.vazio.fatias,0); assert.equal(extremos.vazio.itens,0);
    assert.match(extremos.vazio.texto,/Sem Interseção/);
    assert.equal(extremos.unica,1); assert.equal(extremos.pequeno,'0,000000001');
    await page.locator('#ev-resultados-indices-grafico .fv-dot-linha').last().click();
    assert.equal(await page.locator('#ev-resultados-nome-ativo').textContent(),'Demanda B');
    assert.equal(await page.locator('#ev-resultados-nome-classe').textContent(),'Contato [3]');
    assert.equal(await page.locator('#ev-resultados-indice').textContent(),'0,00');
    assert.equal(await page.locator('#ev-resultados-classe-original').textContent(),'Muito Baixa');
    assert.equal(await page.locator('#ev-resultados-campo-indice').textContent(),'fav_rede_dim');
    assert.equal(await page.locator('.fv-dot-linha').count(),4,'Seleção não filtra outras combinações');
    assert.equal(await page.locator('#ev-resultados-tabela tbody tr.ativo').getAttribute('data-chave'),'1');
    await page.locator('#ev-resultados-base').selectOption(rede.id);
    assert.equal(await page.locator('#ev-resultados-categoria').textContent(),'Favorabilidade de Rede');
    await page.locator('#ev-resultados-tabela tbody tr').first().click();
    assert.equal(await page.locator('#ev-resultados-nome-ativo').textContent(),'Demanda A');
    await page.locator('#ev-resultados-mapa .leaflet-overlay-pane path[stroke="#440154"]').dispatchEvent('click');
    assert.equal(await page.locator('#ev-resultados-mapa path[stroke="#440154"]').getAttribute('stroke-width'),'3','Contato linear permanece visível, sem impor bordas aos polígonos');
    assert.equal(await page.locator('#ev-resultados-nome-ativo').textContent(),'Demanda B','Seleção no mapa atualiza os detalhes');
    assert.equal(await page.locator('#ev-resultados-nome-classe').textContent(),'Contato [3]');
    await page.locator('#ev-resultados-proxima').click();
    assert.match(await page.locator('#ev-resultados-pagina').textContent(),/Página 2 de 2/);
    assert.equal(await page.locator('.fv-dot-linha').count(),4);
    await page.locator('#ev-resultados-vazias').click();
    assert.equal(await page.locator('#ev-resultados-tabela tbody tr').count(),4);
    assert.equal(await page.locator('.fv-dot-linha').count(),4);
    await page.locator('#ev-resultados-vazias').click();
    await page.locator('#ev-resultados-enquadrar').click();
    const bounds = await page.locator('#ev-resultados-mapa').evaluate(div => ({width:div.clientWidth,height:div.clientHeight}));
    assert(bounds.width>100 && bounds.height>=350);
    assert.equal(await page.locator('#ev-resultados-mapa .leaflet-overlay-pane path').count(),57);
    const calculosAntesRevisao = execucoes.length;
    await page.locator('#ev-resultados-editar').click();
    await page.locator('#ev-resultados-nomes input').first().fill('Demandas com Nomes Revisados');
    assert(await page.locator('#ev-resultados-conteudo').isHidden());
    assert(await page.locator('#ev-resultados-download').isDisabled());
    await page.locator('#ev-resultados-revisados').check();
    await page.locator('#ev-resultados-mostrar').click();
    await page.locator('#ev-resultados-conteudo').waitFor({state:'visible'});
    assert.match(await page.locator('#ev-resultados-resumo').textContent(),/Demandas com Nomes Revisados/);
    assert.equal(execucoes.length,calculosAntesRevisao,'Revisar nomes não repete interseções');
    const downloadPromise = page.waitForEvent('download');
    await page.locator('#ev-resultados-download').click();
    const download = await downloadPromise;
    assert.equal(download.suggestedFilename(),'Relatório e Camadas.zip');
    await download.delete();
    await dismiss();
    modoExecucao = 'cancelar';
    await calcular();
    await page.waitForFunction(() => !document.querySelector('#pfsCancelBtn').hidden);
    await page.locator('#pfsCancelBtn').click();
    await page.locator('#pfsConfirmOk').click();
    await idle();
    assert(requests.some(r => r.path.endsWith('/favorabilidade/execucoes/execucao-2/cancelar')));
    assert.match(await page.locator('#fv-status').textContent(),/cancelado/i);
    assert((await panel()).includes(jobs.get('execucao-1').resultado.id),'Cancelamento mantém a saída anterior');
    modoExecucao = 'erro';
    await calcular();
    await idle();
    assert.match(await page.locator('#fv-status').textContent(),/Falha OGR simulada/);
    assert.equal(await page.locator('#fv-status').getAttribute('data-error'),'true');
    await dismiss();
    modoExecucao = 'sucesso';
    await page.locator('iframe').evaluate(f => {
      const win = f.contentWindow;
      win.adicionarOriginalTeste = win.gpArquivos.adicionar;
      win.gpArquivos.adicionar = () => { throw new Error('Falha de inclusão simulada.'); };
    });
    await calcular();
    await idle();
    assert.match(await page.locator('#fv-status').textContent(),/saída já está gravada.*sem repetir o cálculo/);
    await page.locator('iframe').evaluate(f => {
      const win = f.contentWindow;
      win.gpArquivos.adicionar = win.adicionarOriginalTeste;
      delete win.adicionarOriginalTeste;
    });
    await dismiss();
    await visivel(rede.id,false);
    await page.waitForFunction(() => document.querySelector('#fv-calcular').disabled);
    assert.equal(await page.locator('.fv-dot-linha').count(),4,'Visibilidade da bancada não altera os índices já calculados');
    assert.deepEqual(hier.dados_hierarquizacao.objetos.map(o=>o.hierarquizacao.fase_2),
      [{indice_favorabilidade_grade:.8,indice_favorabilidade_rede:.6},{indice_favorabilidade_grade:.8,indice_favorabilidade_rede:.6}],
      'Consulta não substitui índices oficiais');
    await page.locator('#fv-hier-limpar').click();
    await choose('entrada',entrada);
    await preview('entrada');
    await checkbox('grade').uncheck();
    await send();
    await visivel(rede.id,true);
    await calcular();
    await idle();
    assert.match(normalizacoes.at(-1).path,/\/favorabilidade\/preparar-demanda$/);
    assert.equal(normalizacoes.at(-1).body.id,entrada.id);
    assert.equal(normalizacoes.at(-1).body.revisao,'987-654','Entrada avulsa também confere a revisão do arquivo original');
    assert.equal(execucoes.at(-1).hierarquizacao,undefined,'Análise avulsa não recebe vínculo com uma rodada');
    assert.match(await page.locator('#fv-status').textContent(),/Nenhum índice ou classe foi agregado/);
    assert(!requests.some(r => /\/elegibilidade\/|\/fases\/2\/executar/.test(r.path)),'Execução usa somente as rotas adaptadas da Favorabilidade');
    falharGrafico = true;
    await calcular();
    await idle();
    assert.match(await page.locator('#ev-resultados-status').textContent(),/camadas foram produzidas.*Saída alterada/);
    assert(await page.locator('#ev-resultados-conteudo').isHidden(),'Falha não exibe gráfico desatualizado como resultado atual');
    falharGrafico = false;
    await dismiss();
    const calculosAntes = execucoes.length;
    await page.locator('#ev-resultados-tentar').click();
    await idle();
    assert.equal(execucoes.length,calculosAntes,'Recarregar gráfico não repete geoprocessamento');
    assert.equal(await page.locator('.fv-dot-linha').count(),4);
    assert(await page.locator('#ev-resultados-conteudo').isVisible());
    await page.locator('#ev-resultados-abrir').click();
    const dialog = page.locator('dialog.ea-storage-dialog');
    await dialog.locator('[data-file]').click();
    await dialog.locator('.ea-storage-confirm-button').click();
    await dialog.waitFor({state:'detached'});
    await idle();
    assert.match(await page.locator('#ev-resultados-resumo').textContent(),/Entrada reaberta/);
    assert.equal(execucoes.length,calculosAntes,'Reabrir análise não repete o cálculo');
    assert(await page.locator('#ev-resultados-agregados').evaluate(t => t.closest('#ev-resultados-conteudo') !== null));
    assert.match(await page.locator('#ev-resultados-fontes-grade').textContent(),/Grade Territorial/);
    assert.match(await page.locator('#ev-resultados-fontes-rede').textContent(),/Rede/);
    await page.locator('#ev-resultados-base').selectOption(gradePoligonal);
    assert.equal(await page.locator('#ev-resultados-categoria').textContent(),'Favorabilidade de Grade');
    assert.equal(await page.locator('.fv-dot-linha').count(),5);
    assert.deepEqual(await page.locator('.fv-dot-linha').evaluateAll(p=>p.map(n=>n.dataset.indice)),['0.7','0.7','0.4','0.3','0']);
    await page.locator('#ev-resultados-base').selectOption(rede.id);
    assert.equal(await page.locator('#ev-resultados-categoria').textContent(),'Favorabilidade de Rede');
    await page.locator('.fv-dot-linha[data-indice="0.4"]').click();
    assert.equal(await page.locator('#ev-resultados-indice').textContent(),'0,40');
    assert.equal(await page.locator('#ev-resultados-campo-classe').textContent(),'fav_territorial_classe');
    assert.equal(await page.locator('#ev-resultados-classe-original').textContent(),'Moderada');
    assert(!/km²|hectares|Área Sobreposta/.test(await page.locator('#ev-resultados-tabela').textContent()));
    const superficies = page.locator('#ev-resultados-mapa path[fill-opacity="1"]:not([fill="none"])');
    assert(await superficies.count() >= 4);
    assert((await superficies.evaluateAll(paths=>paths.map(p=>p.getAttribute('stroke-width')))).every(p=>p==='0'),'Polígonos opacos e sem borda');
    const indicesA = page.locator('#ev-resultados-agregados tr[data-chave="0"] td[data-papel="rede"]');
    const gradeA = page.locator('#ev-resultados-agregados tr[data-chave="0"] td[data-papel="grade"]');
    const classesA = page.locator('#ev-resultados-agregados tr[data-chave="0"] td[data-classes="rede"]');
    const indicesOriginais = await indicesA.locator('span').allTextContents();
    const classesOriginais = await classesA.textContent();
    assert.deepEqual(indicesOriginais,['0,70','0,30']);
    assert.equal(await gradeA.textContent(),'0,40','Grade e rede separadas');
    const requisicoesAntesEstatisticas = requests.length;
    await page.selectOption('#ev-resultados-tendencia','media');
    assert.equal(await indicesA.locator('.fv-estatistica-valor').textContent(),'0,50');
    assert.equal(await gradeA.locator('.fv-estatistica-valor').textContent(),'0,40');
    assert.equal(await classesA.textContent(),classesOriginais,'Nenhuma classe inferida');
    await page.selectOption('#ev-resultados-dispersao','variancia');
    assert.equal(await page.locator('#ev-resultados-tendencia').inputValue(),'');
    assert.equal(await indicesA.locator('.fv-estatistica-valor').textContent(),'0,04');
    await page.selectOption('#ev-resultados-posicao','q1');
    assert.equal(await page.locator('#ev-resultados-dispersao').inputValue(),'');
    assert.equal(await indicesA.locator('.fv-estatistica-valor').textContent(),'0,40');
    await page.selectOption('#ev-resultados-posicao','percentil');
    await page.locator('#ev-resultados-percentil').fill('75');
    assert.equal(await indicesA.locator('.fv-estatistica-valor').textContent(),'0,60');
    await page.locator('#ev-resultados-percentil').fill('101');
    assert.equal(await page.locator('#ev-resultados-agregados tbody').count(),0,'Entrada inválida não deixa valores anteriores visíveis');
    assert.match(await page.locator('#ev-resultados-estatisticas-status').textContent(),/entre 0 e 100/);
    await page.locator('#ev-resultados-percentil').fill('');
    assert.equal(await page.locator('#ev-resultados-agregados tbody').count(),0);
    await page.locator('#ev-resultados-percentil').fill('0');
    assert.equal(await indicesA.locator('.fv-estatistica-valor').textContent(),'0,30');
    await page.selectOption('#ev-resultados-tendencia','moda');
    assert.equal(await page.locator('#ev-resultados-posicao').inputValue(),'');
    assert.match(await indicesA.textContent(),/Sem moda/);
    assert(await page.locator('#ev-resultados-percentil').isDisabled());
    await page.selectOption('#ev-resultados-tendencia','');
    assert.deepEqual(await indicesA.locator('span').allTextContents(),indicesOriginais,'Estado neutro restaura todos os índices originais');
    assert.equal(requests.length,requisicoesAntesEstatisticas,'Seletores calculam localmente, sem gravar ou recalcular interseções');
    if (process.env.SICARD_TEST_SCREENSHOT_DIR) {
      await page.locator('.secao-favorabilidade-agregados').screenshot({
        path:require('node:path').join(process.env.SICARD_TEST_SCREENSHOT_DIR,'favorabilidade-agregados-desktop.png')});
      await page.locator('.fv-dot-bloco').screenshot({
        path:require('node:path').join(process.env.SICARD_TEST_SCREENSHOT_DIR,'favorabilidade-combinacoes-desktop.png')});
    }
    indicesIncompletos = true;
    await page.locator('#ev-resultados-editar').click();
    await page.locator('#ev-resultados-mostrar').click();
    await idle();
    assert.equal(await page.locator('.fv-dot-linha').count(),5);
    assert.deepEqual(await page.locator('.fv-dot-linha').evaluateAll(p=>p.map(n=>n.dataset.indice)),['0','','','',''],'Zero válido precede ausentes e inválidos');
    assert.match(await page.locator('#ev-resultados-qualidade').textContent(),/4/);
    assert.match(await page.locator('.fv-dot-linha').nth(3).textContent(),/Sem valor/);
    assert.match(await page.locator('.fv-dot-linha').nth(2).textContent(),/inválido/i);
    await page.locator('.fv-dot-linha').nth(2).focus();
    await page.keyboard.press('Enter');
    assert.match(await page.locator('#ev-resultados-indice').textContent(),/inválido/i);
    assert.equal(await page.locator('#ev-resultados-classe-original').textContent(),'Alta','Classe original continua disponível mesmo com índice inválido');
    await page.selectOption('#ev-resultados-tendencia','media');
    assert.match(await indicesA.textContent(),/Sem índices válidos/);
    assert.match(await gradeA.textContent(),/Sem índices válidos/);
    assert.match(await page.locator('#ev-resultados-agregados tr[data-chave="1"] td[data-papel="rede"]').textContent(),/^0.*1 de 2 índices válidos/);
    await page.selectOption('#ev-resultados-tendencia','');
    await page.locator('#ev-resultados-vazias').click();
    assert.equal(await page.locator('#ev-resultados-tabela tbody tr').count(),3,'Filtro preserva zero e índices inválidos sinalizados');
    assert.equal(await page.locator('.fv-dot-linha').count(),5,'Filtro não reduz o gráfico');
    await page.locator('#ev-resultados-vazias').click();
    assert(await page.locator('.secao-favorabilidade-tabela').evaluate(
      section => section.nextElementSibling.classList.contains('secao-favorabilidade-agregados')));
    assert.equal(await page.locator('#favorabilidade-app > section > header .ea-number').allTextContents().then(n=>n.includes('6')),false);
    await dismiss();
    await page.setViewportSize({width:390,height:844});
    await page.waitForTimeout(250);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth+1),'Layout mobile sem overflow horizontal');
    assert(await page.locator('#ev-resultados-tendencia').isVisible());
    assert(await page.locator('#ev-resultados-posicao').isVisible());
    const compacta = await page.locator('.fv-dot-linha').first().locator(':scope > span').evaluateAll(
      spans=>spans.map(s=>({x:s.getBoundingClientRect().x,y:s.getBoundingClientRect().y})));
    assert(compacta[0].x<compacta[1].x && compacta[1].x<compacta[2].x,'Três colunas preservadas em mobile');
    const seletores = await page.locator('.fv-estatisticas-controles select').evaluateAll(
      spans=>spans.map(s=>s.getBoundingClientRect().y));
    assert(seletores[0]<seletores[1] && seletores[1]<seletores[2],'Seletores empilhados em mobile');
    if (process.env.SICARD_TEST_SCREENSHOT_DIR) {
      await page.locator('.secao-favorabilidade-agregados').screenshot({
        path:require('node:path').join(process.env.SICARD_TEST_SCREENSHOT_DIR,'favorabilidade-agregados-mobile.png')});
      await page.locator('.fv-dot-bloco').screenshot({
        path:require('node:path').join(process.env.SICARD_TEST_SCREENSHOT_DIR,'favorabilidade-combinacoes-mobile.png')});
    }
    assert.deepEqual(errors,[]);
    console.log('Favorabilidade V2: preparação original, conferência, composição visível, entrada integral, execução, polling, cancelamento real, saída na bancada, falhas recuperáveis, índices inalterados e responsividade OK.');
  } finally { await browser.close(); }
})().catch(error => {console.error(error);process.exitCode = 1;});
