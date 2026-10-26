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
    let falharSuperficie = false;
    let revisados = false;
    const execucoes = [], normalizacoes = [], jobs = new Map();
    const cadastro = new Map([
      ['D-0', {id:'D-0', nome:'Demanda A', descricao:'Cadastro original da demanda A'}],
      ['D-1', {id:'D-1', nome:'Demanda B', descricao:'Cadastro original da demanda B'}],
    ]);
    let falharSalvamento = false;
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
            codigo_demanda:grade && i<2 ? `D-${i}` : null,
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
              campo_original:grade?'fav_territorial':'fav_rede', indice_original:20, estado_original:'valido',
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
          return {id,hierarquizacao:grade ? 'HIER-F2' : null,nome:nomes[`entrada:${id}`] || `Entrada ${id}`,campos,linhas,feicoes:53,com_intersecao:2,sem_intersecao:51,
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
        body:['POST','PATCH'].includes(req.method()) ? req.postDataJSON() : null});
      if (path.includes('/auth/')) return send({authenticated:true,id:'fixture',nome:'Teste',username:'Teste',tipo_usuario:'ADMIN'});
      if (path.endsWith('/ahp/hierarquizacoes')) return send([hier,
        {...hier,codigo:'HIER-F1',dados_hierarquizacao:{cabecalho_grupo:{fases_a_executar:[1]}}}]);
      if (path.endsWith('/ahp/hierarquizacoes/HIER-F2')) return send(hier);
      if (path === '/api/demandas/internas') return send([...cadastro.values()]);
      if (path.startsWith('/api/demandas/internas/')) return send(cadastro.get(decodeURIComponent(path.split('/').at(-1))));
      if (path.startsWith('/api/demandas/') && req.method() === 'PATCH') {
        assert.deepEqual(Object.keys(req.postDataJSON()), ['nome']);
        if (falharSalvamento) return route.fulfill({status:422,json:{detail:'Falha simulada ao salvar nome.'}});
        const codigo = decodeURIComponent(path.split('/').at(-1));
        const registro = {...cadastro.get(codigo), ...req.postDataJSON()};
        cadastro.set(codigo,registro); return send(registro);
      }
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
      if (path.endsWith('/favorabilidade/resultados/superficie')) {
        if (falharSuperficie) return route.fulfill({status:404,json:{detail:'Fonte atual indisponível.'}});
        const {base_id} = req.postDataJSON(), grade = base_id === gradePoligonal;
        return send({base_id,consultado_em:'2026-10-23T03:00:00Z',
          geometrias:{type:'FeatureCollection',features:[10,30].map((valor,i) => ({
            type:'Feature',geometry:poligono,properties:{nome:`Fonte atual ${i}`,favorabilidade:{
              campo_original:grade?'fav_territorial':'fav_rede',indice_original:valor,estado_original:'valido',
              campo_indice:grade?'fav_territorial_dim':'fav_rede_dim',indice:i ? .9 : .1,estado_indice:'valido',
              campo_classe:grade?'fav_territorial_classe':'fav_rede_classe',classe:i ? 'Alta' : 'Baixa',estado_classe:'valido',
            }},
          }))}});
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
    await page.evaluate(() => {
      window.avisosTeste = [];
      window.processosTeste = [];
      const iniciar = window.ProcessFeedback.iniciarCadastro;
      window.ProcessFeedback.iniciarCadastro = (...args) => {
        window.processosTeste.push(args[0]?.title || args[0]);
        return iniciar.apply(window.ProcessFeedback,args);
      };
      for (const tipo of ['info','success','warning','error']) {
        const original = window.Notify[tipo];
        window.Notify[tipo] = (...args) => { window.avisosTeste.push({tipo,mensagem:args[1]}); return original.apply(window.Notify,args); };
      }
    });
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
    assert(await page.locator('#fv-superficies-enviar').isDisabled());
    await choose('rede',rede);
    await preview('rede');
    await choose('grade',grade);
    failLayer = rede.id;
    await page.locator('#fv-superficies-enviar').click();
    await idle();
    assert.equal(await page.locator('#fv-status').getAttribute('data-error'),'true');
    assert.equal(await checkbox('grade').count(),0,'Falha no segundo grupo não aplica o primeiro');
    assert.equal(await checkbox('rede').count(),1,'Falha mantém a prévia anterior');
    failLayer = '';
    await dismiss();
    await page.locator('#fv-superficies-enviar').click();
    await idle();
    assert.equal(await page.locator('#fv-status').getAttribute('data-error'),'false');
    assert.equal(await checkbox('grade').count(),1);
    assert.equal(await checkbox('rede').count(),1);
    assert.deepEqual(await panel(),[],'Envio conjunto altera somente a prévia');
    await dismiss();
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
    assert.equal(await page.locator('.fv-tabela-conferencia').count(),3);
    const composicaoAntesFiltro = await page.locator('#fv-run-count').textContent();
    await page.locator('#fv-conferencia-rede-filtro-coluna').selectOption('nome');
    await page.locator('#fv-conferencia-rede-filtro-valor').selectOption('rede');
    await page.locator('#fv-conferencia-rede-filtro-inverter').click();
    assert.match(await page.locator('#fv-run-rede').textContent(), /Nenhuma camada encontrada/);
    assert.equal(await page.locator('#fv-run-count').textContent(),composicaoAntesFiltro,'Filtro de conferência não muda a composição do cálculo');
    assert.deepEqual(new Set(await panel()),new Set([entrada.id,rede.id,grade.id]));
    await page.locator('#fv-conferencia-rede-filtro-limpar').click();
    await page.locator('#fv-conferencia-rede-visualizar').click();
    await page.locator('#modal-objetos').waitFor({state:'visible'});
    assert.equal(await page.locator('#modal-objetos-title').textContent(),'rede');
    await page.locator('#modal-objetos [data-modal-close]').click();
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
    assert.deepEqual(await page.locator('#fv-hier-lista .fv-demanda-link').allTextContents(),['Demanda 0','Demanda 1']);
    assert.equal(await page.locator('#fv-hier-lista .fa-trash-can').count(),2);
    assert.equal(await page.locator('#fv-hier-dados').count(),0);
    assert.equal(await page.locator('#fv-hier-detalhes').count(),0);
    await page.locator('#fv-hier-lista .fv-demanda-link').first().click();
    await idle();
    await page.locator('#modal-objetos').waitFor({state:'visible'});
    assert.equal(await page.locator('#modal-objetos [data-modal-title]').textContent(),'Demanda a');
    assert.equal(await page.locator('#modal-objetos .jv-root > li').count(),1);
    assert.match(await page.locator('#modal-objetos .demanda-corpo').textContent(),/Identificação/);
    await page.locator('#modal-objetos [data-modal-close]').click();
    await page.locator('#fv-hier-lista .fv-demanda-link').nth(1).click();
    await idle();
    await page.locator('#modal-objetos').waitFor({state:'visible'});
    assert.equal(await page.locator('#modal-objetos [data-modal-title]').textContent(),'Demanda B');
    assert.equal(await page.locator('#modal-objetos .jv-root > li').count(),1);
    await page.locator('#modal-objetos [data-modal-close]').click();
    const hierarchyStyle = await page.locator('#fv-hier-lista').evaluate(list => ({
      border:getComputedStyle(list).borderTopWidth,
      rows:[...list.children].map(row => getComputedStyle(row).borderTopWidth),
      inputFont:getComputedStyle(document.querySelector('#fv-hierarquizacao')).fontSize,
      layerFont:getComputedStyle(document.querySelector('#fv-grade-camadas')).fontSize,
      listFont:getComputedStyle(list).fontSize,
    }));
    assert.notEqual(hierarchyStyle.border,'0px');
    assert(hierarchyStyle.rows.every(border => border==='0px'));
    assert.equal(hierarchyStyle.inputFont,hierarchyStyle.layerFont);
    assert.equal(hierarchyStyle.inputFont,'13px');
    if (process.env.SICARD_TEST_SELECTION_ONLY === '1') {
      assert.deepEqual(errors,[]);
      console.log('OK: envio conjunto atômico, lista de demandas, fonte e modal compartilhado.');
      return;
    }
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
    assert.equal(await page.locator('#ev-resultados-frase, #ev-resultados-nome-ativo, #ev-resultados-metricas, .fv-grafico-escala').count(),0);
    assert.equal(await page.locator('.fv-grafico-superficie h4').first().evaluate(n => getComputedStyle(n).textAlign),'center');
    assert.equal(await page.locator('#ev-resultados-rosca').count(),0,'A Favorabilidade não usa rosca ou fatias de área');
    assert.equal(await page.locator('#ev-resultados-indices-grafico .fv-dot-linha').count(),4,'Nomes iguais e contatos sem área mantêm combinações distintas');
    assert.deepEqual(await page.locator('.fv-dot-linha').evaluateAll(p=>p.map(n=>n.dataset.indice)),['0.7','0.3','0.7','0'],'Pontos agrupados por demanda, preservando zero e repetições');
    assert.equal(await page.locator('.fv-intervalo-linha').count(),53,'Uma linha por demanda, inclusive sem interseção');
    assert.deepEqual((await page.locator('.fv-demanda-nome').allTextContents()).slice(0,2),['Demanda A','Demanda B'],'Rótulos contêm somente o nome, sem identificador nem entrada');
    assert.equal(await page.locator('.fv-intervalo-ponto').first().textContent(),'0,70');
    assert.equal(await page.locator('.fv-intervalo-ponto').count(),4);
    assert(await page.locator('.fv-intervalos-rolagem').evaluateAll(ns => ns.every(n => n.scrollWidth<=n.clientWidth+1)),
      'Escala completa de 0 a 1 visível sem rolagem horizontal em desktop');
    assert.equal(await page.locator('.fv-dot-linha[data-indice="0"]').evaluate(b => b.style.left),'0%');
    assert.equal(await page.locator('.fv-dot-linha').first().evaluate(b => b.style.left),'70%');
    const proporcaoPonto = await page.locator('.fv-intervalo-ponto').first().evaluate(ponto => {
      const p = ponto.getBoundingClientRect(), trilha = ponto.parentElement.getBoundingClientRect();
      return (p.x+p.width/2-trilha.x)/(trilha.width-1);
    });
    assert(Math.abs(proporcaoPonto-.7)<.005,'Posição horizontal real equivale ao índice em escala 0–1');
    assert.deepEqual(await page.locator('.fv-intervalo-faixa').evaluateAll(ns => ns.map(n => [n.dataset.min,n.dataset.max])),
      [['0.3','0.7'],['0','0.7']],'Traços preservam os extremos de cada demanda, sem agregação dos índices');
    const legendaInicial = await page.locator('.fv-grafico-superficie').first().evaluate(bloco => {
      const pontos = [...bloco.querySelectorAll('.fv-intervalo-ponto')];
      return [...bloco.querySelectorAll('.fv-indices-legenda-item')].map(item => {
        const correspondentes = pontos.filter(p => p.dataset.feicao === item.dataset.feicao);
        return {nome:item.textContent,
          cor:getComputedStyle(item.querySelector('.fv-indices-legenda-cor')).backgroundColor,
          coresPontos:correspondentes.map(p => p.querySelector('.fv-intervalo-marca').style.backgroundColor)};
      });
    });
    assert.equal(legendaInicial.length,2,'Uma entrada por feição, mesmo quando compartilhada por demandas');
    assert.equal(new Set(legendaInicial.map(l => l.cor)).size,2,'Feições distintas recebem cores distintas, mesmo com nomes iguais');
    assert.deepEqual(legendaInicial.map(l => l.nome),['Mesma classe','Mesma classe']);
    assert(legendaInicial.every(l => l.coresPontos.every(c => c === l.cor)),'Todos os pontos da mesma feição correspondem à legenda');
    await page.locator('.fv-demanda-nome').nth(1).click();
    assert.deepEqual(await page.locator('.fv-indices-legenda-nome').allTextContents(),['Mesma classe','Contato']);
    const coresDemandaB = await page.locator('.fv-indices-legenda-cor').evaluateAll(ns => ns.map(n => getComputedStyle(n).backgroundColor));
    await page.locator('.fv-indices-legenda-item').last().click();
    assert.equal(await page.locator('.fv-intervalo-ponto[aria-pressed="true"]').getAttribute('data-indice'),'0');
    assert(await page.locator('.fv-indices-legenda-item').last().evaluate(n => n === document.activeElement),'Seleção da legenda preserva foco no mesmo controle');
    assert.equal(await page.locator('.fv-indices-legenda-item[aria-pressed="true"] .fv-indices-legenda-nome').textContent(),'Contato');
    assert.deepEqual(await page.locator('.fv-indices-legenda-cor').evaluateAll(ns => ns.map(n => getComputedStyle(n).backgroundColor)),
      coresDemandaB,'Seleção não altera as cores');
    await page.locator('.fv-indices-legenda-item').first().click();
    assert.equal(await page.locator('.fv-demanda-nome[aria-pressed="true"]').first().textContent(),'Demanda B','Legenda prefere a feição na demanda ativa');
    await page.locator('.fv-demanda-nome').first().click();
    assert.equal(await page.locator('.fv-demanda-nome[aria-pressed="true"]').first().textContent(),'Demanda A','Nome da demanda seleciona mapa e detalhes');
    assert.equal(await page.locator('.fv-intervalo-ponto[aria-pressed="true"]').count(),0,'Seleção da demanda não inventa uma feição ativa');
    assert.deepEqual(await page.locator('.fv-indices-legenda-nome').allTextContents(),['Mesma classe','Mesma classe']);
    await page.locator('.fv-demanda-nome').nth(2).click();
    assert.equal(await page.locator('.fv-indices-legenda-item').count(),0);
    await page.locator('.fv-demanda-nome').first().click();
    assert(await page.locator('.fv-intervalo-ponto').evaluateAll(pontos => pontos.every(p => {
      const centro = p.getBoundingClientRect().y + p.getBoundingClientRect().height/2;
      return [...p.parentElement.querySelectorAll('.fv-intervalo-guia')].some(g => {
        const r = g.getBoundingClientRect();
        return r.width > r.height && Math.abs(r.y+r.height/2-centro)<1;
      });
    })), 'Cada ponto fica sobre uma guia horizontal');
    assert.equal(await page.locator('.fv-grafico-superficie').count(),1);
    assert(await page.evaluate(() => window.processosTeste.includes('Resultados da Favorabilidade Territorial')));
    const composicaoVisual = await page.locator('#ev-resultados-conteudo').evaluate(host => ({
      fundos:[...host.querySelectorAll('.evr-fonte')].map(card => getComputedStyle(card).backgroundColor),
      fonte:getComputedStyle(host.querySelector('#ev-resultados-entrada')).fontSize,
    }));
    assert.notEqual(composicaoVisual.fundos[0],composicaoVisual.fundos[1]);
    assert.equal(composicaoVisual.fonte,'12px');
    assert.equal(await page.locator('.fv-intervalo-sem-intersecao').count(),51);
    assert.deepEqual(await page.locator('#ev-resultados-tabela thead th').allTextContents(),
      ['Demanda','Município de Origem (Feição)',
        'Índice de Favorabilidade Dimensionada - Municípios (0–1)','Classe de Favorabilidade - Municípios',
        'Índice de Favorabilidade Dimensionada - Rede Rodoviária (0–1)','Classe de Favorabilidade - Rede Rodoviária']);
    assert.equal(await page.locator('#ev-resultados-tabela tbody tr').first().locator('td').nth(2).textContent(),'—');
    assert.deepEqual(await page.locator('#ev-resultados-tabela tbody tr').evaluateAll(rows=>rows.slice(0,4).map(r=>r.dataset.feicao)),
      ['f0','f1','f0','f2'],'Ordenação global antes da paginação');
    assert.equal(await page.locator('#ev-resumo-paginacao button').count(),4);
    assert.equal(await page.locator('#ev-resultados-paginacao button').count(),4);
    assert.equal(await page.locator('#ev-resultados-agregados tbody tr').count(),50);
    await page.locator('#ev-resumo-paginacao').getByRole('button',{name:'Última página',exact:true}).click();
    assert.equal(await page.locator('#ev-resultados-agregados tbody tr').count(),3);
    assert.equal(await page.locator('#ev-resumo-paginacao').getByRole('button',{name:'Próxima página',exact:true}).isDisabled(),true);
    await page.locator('#ev-resumo-paginacao').getByRole('button',{name:'Primeira página',exact:true}).click();
    await page.locator('#ev-sobreposicoes-filtro-coluna').selectOption('indice-rede');
    await page.locator('#ev-sobreposicoes-filtro-valor').selectOption('0,00');
    assert.equal(await page.locator('#ev-resultados-tabela tbody tr[data-chave]').count(),1,'Filtro mantém índice zero válido');
    assert.equal(await page.locator('.fv-dot-linha').count(),4);
    assert.equal(await page.locator('#ev-resultados-agregados tbody tr').count(),50,'Filtro da tabela por feição é independente');
    await page.locator('#ev-resumo-filtro-coluna').selectOption('0');
    await page.locator('#ev-resumo-filtro-valor').selectOption('Demanda A');
    assert.equal(await page.locator('#ev-resultados-agregados tbody tr[data-chave]').count(),1);
    await page.locator('#ev-resumo-filtro-inverter').click();
    assert.equal(await page.locator('#ev-resultados-agregados tbody tr[data-chave]').count(),50);
    await page.locator('#ev-resumo-filtro-limpar').click();
    await page.locator('#ev-sobreposicoes-filtro-limpar').click();
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
    assert.equal(await page.locator('.fv-demanda-nome[aria-pressed="true"]').first().textContent(),'Demanda B');
    assert.equal(await page.locator('.fv-indices-legenda-item[aria-pressed="true"] .fv-indices-legenda-nome').textContent(),'Contato');
    assert.equal(await page.locator('.fv-dot-linha').count(),4,'Seleção não filtra outras combinações');
    assert.equal(await page.locator('#ev-resultados-tabela tbody tr.ativo').getAttribute('data-chave'),'1');
    await page.locator('#ev-resultados-base').selectOption(rede.id);
    await page.locator('#ev-resultados-tabela tbody tr').first().click();
    assert.equal(await page.locator('.fv-demanda-nome[aria-pressed="true"]').first().textContent(),'Demanda A');
    await page.locator('#ev-resultados-mapa .leaflet-overlay-pane path[stroke="#440154"]').dispatchEvent('click');
    assert.equal(await page.locator('#ev-resultados-mapa path[stroke="#440154"]').getAttribute('stroke-width'),'3','Contato linear permanece visível, sem impor bordas aos polígonos');
    assert.equal(await page.locator('.fv-demanda-nome[aria-pressed="true"]').first().textContent(),'Demanda B','Seleção no mapa atualiza os detalhes');
    assert.equal(await page.locator('.fv-indices-legenda-item[aria-pressed="true"] .fv-indices-legenda-nome').textContent(),'Contato');
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
    assert.equal(await page.locator('#ev-resultados-mapa .leaflet-overlay-pane path').count(),59);
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
    assert(await page.evaluate(() => window.avisosTeste.some(a => /camadas foram produzidas.*Saída alterada/.test(a.mensagem))));
    assert.equal(await page.locator('#ev-resultados-status').count(),0,'Acompanhamento não é emitido na seção de resultados');
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
    assert.equal(await page.locator('.fv-dot-linha').count(),5);
    assert.deepEqual(await page.locator('.fv-dot-linha').evaluateAll(p=>p.map(n=>n.dataset.indice)),['0.4','0.7','0.3','0.7','0']);
    assert.equal(await page.locator('.fv-grafico-superficie').count(),2,'Um gráfico para cada superfície');
    assert.equal(await page.locator('.fv-grafico-superficie').first().locator('.fv-dot-linha').count(),1);
    await page.locator('#ev-resultados-base').selectOption(rede.id);
    await page.locator('.fv-dot-linha[data-indice="0.4"]').click();
    assert.equal(await page.locator('#ev-resultados-mapa-superficie').inputValue(),gradePoligonal);
    await page.waitForFunction(() => document.querySelector('#ev-resultados-mapa-camada-nota').textContent.includes('Camada oficial vinculada'));
    assert.equal(await page.locator('#ev-resultados-mapa-origem').count(),0,'Não há escolha de origem: a camada vinculada à execução é automática');
    assert.equal(await page.locator('#ev-resultados-mapa-representacao').inputValue(),'classe');
    const corGrafico = await page.locator('.fv-dot-linha[data-indice="0.4"] .fv-intervalo-marca').evaluate(n => getComputedStyle(n).backgroundColor);
    assert.equal(corGrafico,'rgb(33, 145, 140)');
    assert(await page.locator('#ev-resultados-mapa path[fill="#21918c"][fill-opacity="1"]').count() > 0, 'Mapa e ponto compartilham a cor da classe');
    for (const id of ['ev-resultados-tabela','ev-resultados-agregados']) {
      const alinhamento = await page.locator(`#${id} tbody tr`).first().locator('td').evaluateAll(ns => ns.map(n => getComputedStyle(n).textAlign));
      assert.equal(alinhamento[0],'left'); assert(alinhamento.slice(1).every(a => a === 'center'));
    }
    assert.deepEqual(await page.locator('.fv-legenda-classe').allTextContents(),['Alta','Baixa','Moderada']);
    assert.equal(await page.locator('#ev-resultados-mapa path[fill-opacity="1"][fill="#3b528b"]').count(),1,'Classe Baixa usa a cor categórica da legenda');
    assert(!/km²|hectares|Área Sobreposta/.test(await page.locator('#ev-resultados-tabela').textContent()));
    const superficies = page.locator('#ev-resultados-mapa path[fill-opacity="1"]:not([fill="none"])');
    assert.equal(await superficies.count(),3,'Somente a superfície selecionada e seus recortes ficam visíveis');
    assert((await superficies.evaluateAll(paths=>paths.map(p=>p.getAttribute('stroke-width')))).every(p=>p==='0'),'Polígonos opacos e sem borda');
    const indicesA = page.locator('#ev-resultados-agregados tr[data-chave="0"] td[data-papel="rede"]');
    const gradeA = page.locator('#ev-resultados-agregados tr[data-chave="0"] td[data-papel="grade"]');
    const classesA = page.locator('#ev-resultados-agregados tr[data-chave="0"] td[data-classes="rede"]');
    const indicesOriginais = await indicesA.locator('span').allTextContents();
    const classesOriginais = await classesA.textContent();
    assert.deepEqual(indicesOriginais,['0,70','0,30']);
    assert.equal(await indicesA.textContent(),'0,70 e 0,30');
    assert.equal(classesOriginais,'Alta e Baixa');
    assert.equal(await gradeA.textContent(),'0,40','Grade e rede separadas');
    await page.waitForFunction(() => !document.querySelector('#ev-resumo-editar').disabled);
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
    const controlesAgregados = page.getByRole('toolbar',{name:'Controles da tabela agregada por demanda'});
    assert.equal(await controlesAgregados.getByRole('button').count(),4);
    assert.equal(await controlesAgregados.locator('[class*="fa-filter"]').count(),0);
    await page.locator('#ev-resumo-visualizar').click();
    await page.locator('#modal-objetos').waitFor({state:'visible'});
    assert.match(await page.locator('#modal-objetos').textContent(),/Cadastro original da demanda A/);
    await page.locator('#modal-objetos [data-modal-close]').click();
    const escritasAntes = requests.filter(r=>r.method==='PATCH').length;
    await page.locator('#ev-resumo-editar').click();
    await page.locator('#ev-resumo-nome').fill('Nome descartado');
    assert.equal(await page.locator('#ev-resumo-filtro-coluna').isDisabled(),true);
    assert.equal(await page.locator('#ev-resultados-tendencia').isDisabled(),true,'Edição bloqueia mudança de medida para preservar o rascunho');
    await page.locator('#ev-resumo-cancelar').click();
    assert.equal(requests.filter(r=>r.method==='PATCH').length,escritasAntes);
    await page.locator('#ev-resumo-editar').click();
    await page.locator('#ev-resumo-nome').fill('Demanda A Revisada');
    falharSalvamento = true;
    await page.locator('#ev-resumo-salvar').click();
    await page.waitForFunction(() => document.querySelector('#ev-resumo-status').textContent.includes('Falha simulada'));
    assert.equal(await page.locator('#ev-resumo-nome').inputValue(),'Demanda A Revisada');
    falharSalvamento = false;
    await page.locator('#ev-resumo-salvar').click();
    await page.waitForFunction(() => document.querySelector('#ev-resumo-status').textContent.startsWith('Nome salvo'));
    assert.equal(cadastro.get('D-0').nome,'Demanda A Revisada');
    assert.deepEqual(await indicesA.locator('span').allTextContents(),indicesOriginais,'Editar nome não altera índices');
    assert.equal(await classesA.textContent(),classesOriginais);
    assert.match(await page.locator('#ev-resultados-tabela tbody').textContent(),/Demanda A Revisada/);
    assert.equal(await page.locator('.fv-demanda-nome').first().textContent(),'Demanda A Revisada','Revisão do nome também atualiza o gráfico');
    if (process.env.SICARD_TEST_SCREENSHOT_DIR) {
      await page.locator('.secao-favorabilidade-agregados').screenshot({
        path:require('node:path').join(process.env.SICARD_TEST_SCREENSHOT_DIR,'favorabilidade-agregados-desktop.png')});
      await page.locator('.fv-dot-bloco').screenshot({
        path:require('node:path').join(process.env.SICARD_TEST_SCREENSHOT_DIR,'favorabilidade-combinacoes-desktop.png')});
    }
    indicesIncompletos = true; falharSuperficie = true;
    await page.locator('#ev-resultados-editar').click();
    await page.locator('#ev-resultados-mostrar').click();
    await idle();
    await page.locator('#ev-resultados-mapa-recarregar').waitFor({state:'visible'});
    assert.match(await page.locator('#ev-resultados-mapa-camada-nota').textContent(),/Fonte atual indisponível/);
    assert(await page.evaluate(() => window.avisosTeste.some(a => a.tipo === 'error' && /camada oficial da execução/.test(a.mensagem))));
    assert(await page.locator('#ev-resultados-tabela').isVisible(),'Falha na fonte não descarta os resultados da execução');
    falharSuperficie = false;
    await page.locator('#ev-resultados-mapa-recarregar').click();
    await page.waitForFunction(() => document.querySelector('#ev-resultados-mapa-camada-nota').textContent.includes('Camada oficial vinculada'));
    assert.equal(await page.locator('.fv-dot-linha').count(),5);
    assert.deepEqual(await page.locator('.fv-dot-linha').evaluateAll(p=>p.map(n=>n.dataset.indice)),['','0','','',''],'Zero válido e ausências permanecem individualizados por demanda');
    assert.equal(await page.locator('.fv-intervalo-ponto').count(),1,'Ausentes e inválidos não recebem pontos fictícios');
    assert(await page.evaluate(() => window.avisosTeste.some(a => a.tipo === 'warning' && /4 combinação/.test(a.mensagem))));
    assert.match(await page.locator('.fv-dot-linha[data-estado="nulo"]').textContent(),/Sem valor/);
    assert.match(await page.locator('.fv-dot-linha[data-estado="invalido"]').first().textContent(),/inválido/i);
    await page.locator('.fv-dot-linha[data-estado="invalido"]').first().focus();
    await page.keyboard.press('Enter');
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
    assert.equal(await page.locator('.fv-demanda-nome').first().textContent(),'Demanda B','Somente nome da demanda também em mobile após recarregar a fixture');
    assert(await page.locator('.fv-intervalos-rolagem').last().evaluate(n => n.scrollWidth>n.clientWidth && n.scrollHeight>n.clientHeight),'Eixo e demandas são acessíveis por rolagem interna');
    const seletores = await page.locator('.fv-estatisticas-controles select').evaluateAll(
      spans=>spans.map(s=>s.getBoundingClientRect().y));
    assert(seletores[0]<seletores[1] && seletores[1]<seletores[2],'Seletores empilhados em mobile');
    if (process.env.SICARD_TEST_SCREENSHOT_DIR) {
      await page.locator('.secao-favorabilidade-agregados').screenshot({
        path:require('node:path').join(process.env.SICARD_TEST_SCREENSHOT_DIR,'favorabilidade-agregados-mobile.png')});
      await page.locator('.fv-dot-bloco').screenshot({
        path:require('node:path').join(process.env.SICARD_TEST_SCREENSHOT_DIR,'favorabilidade-combinacoes-mobile.png')});
    }
    const estilosTabela = container => page.locator(container).evaluate(host => {
      const estilo = (seletor, propriedades) => {
        const s = getComputedStyle(host.querySelector(seletor));
        return propriedades.map(p => s[p]);
      };
      return {
        barra:estilo('.admin-filter-bar',['display','flexWrap','gap','padding','borderRadius','borderTopWidth','borderTopColor','backgroundColor','fontSize']),
        seletor:estilo('.admin-filter-bar select',['height','minWidth','maxWidth','padding','borderRadius','fontSize']),
        filtro:estilo('.admin-filter-bar button',['height','width','padding','borderRadius','borderTopColor','fontSize']),
        acao:estilo('.admin-actions button',['height','width','padding','borderRadius','fontSize']),
        paginador:estilo('.admin-pagination button',['height','width','borderTopWidth','borderRadius','fontSize']),
      };
    });
    const hosts = ['.fv-tabela-conferencia:nth-child(1)', '.fv-tabela-conferencia:nth-child(2)',
      '.fv-tabela-conferencia:nth-child(3)', '.secao-favorabilidade-tabela', '.secao-favorabilidade-agregados'];
    const estilos = new Map();
    for (const width of [1440,390]) {
      await page.setViewportSize({width,height:1000});
      const controlesMapa = await page.locator('.fv-mapa-controles select').evaluateAll(campos => campos.map(c => {
        const r = c.getBoundingClientRect(); return {y:r.y,x:r.x,direita:r.right};
      }));
      assert.equal(controlesMapa.length,2);
      assert(Math.abs(controlesMapa[0].y-controlesMapa[1].y)<1,'Superfície e simbologia na mesma linha');
      assert(controlesMapa[0].direita<=controlesMapa[1].x,'Seletores lado a lado sem sobreposição');
      await page.evaluate(async largura => {
        const {renderizarIndices} = await import('/restrict/hierarquizacao/js/favorabilidade-indices.js?v=20261023-intervalos');
        const fixture = document.createElement('div');
        fixture.id = 'fv-legenda-fixture'; fixture.className = 'favorabilidade-v2';
        fixture.style.width = largura === 1440 ? '560px' : '220px';
        document.body.append(fixture);
        const itens = Array.from({length:7},(_,i) => ({
          chave:`teste-${i}`,id:`f-${i}`,base_id:'base',baseNome:'Superfície',papel:'grade',
          entradaId:'entrada',demandaChave:String(i),
          entradaNome:'Entrada',demandaNome:`Demanda ${i} de integração territorial com um nome bastante extenso para conferir a quebra de linhas`,
          demandaId:i,nome:`Município ${i} com um nome bastante extenso para conferir a quebra de linhas e a simetria da legenda`,identificador:i,area_m2:10,
          favorabilidade:{indice:.7,estado_indice:'valido',classe:'Alta',estado_classe:'valido'},
        }));
        renderizarIndices({container:fixture,itens,selecionada:() => false,aoSelecionar:() => {}});
      },width);
      const legendas = await page.locator('.fv-indices-legenda').evaluateAll(containers => containers.map(container => ({
        display:getComputedStyle(container).display,
        itens:[...container.querySelectorAll('.fv-indices-legenda-item')].map(item => {
          const r = item.getBoundingClientRect(), texto = item.querySelector('.fv-indices-legenda-nome').getBoundingClientRect();
          return {x:r.x,y:r.y,direita:r.right,baixo:r.bottom,largura:r.width,altura:r.height,
            contido:texto.left>=r.left && texto.right<=r.right+1 && texto.top>=r.top && texto.bottom<=r.bottom+1};
        }),
      })));
      await page.locator('#fv-legenda-fixture').evaluate(n => n.remove());
      for (const legenda of legendas.filter(l => l.itens.length)) {
        assert.equal(legenda.display,'flex');
        assert(legenda.itens.every(i => i.contido),'Nomes dentro de suas células, sem transbordamento');
        for (let i=0;i<legenda.itens.length;i++) for (let j=i+1;j<legenda.itens.length;j++) {
          const a = legenda.itens[i], b = legenda.itens[j];
          assert(a.direita<=b.x+1 || b.direita<=a.x+1 || a.baixo<=b.y+1 || b.baixo<=a.y+1,'Entradas da legenda não se sobrepõem');
        }
      }
      const intervalos = await page.evaluate(async largura => {
        const {renderizarIndices} = await import('/restrict/hierarquizacao/js/favorabilidade-indices.js?v=20261023-intervalos');
        const container = document.createElement('div');
        container.className = 'favorabilidade-v2'; container.style.width = largura === 1440 ? '560px' : '220px';
        document.body.append(container);
        const campos = [{id:'base',nome:'Municípios',papel:'grade'},{id:'vazia',nome:'Sem interseções',papel:'rede'}];
        const entradas = ['entrada-1','entrada-2'].map(id => ({id,nome:`Nome da ${id}`,campos,
          linhas:[{chave:'igual',nome:'Mesmo nome'},{chave:'sem',nome:'Somente o Nome da Demanda'}]}));
        const itens = [0,.5,.5,.5000001,1].map((indice,i) => ({
          chave:`p-${i}`,id:`m-${i}`,base_id:'base',baseNome:'Municípios',papel:'grade',
          entradaId:'entrada-1',entradaIndice:0,entradaNome:'Entrada 1',demandaChave:'igual',demandaNome:'Mesmo nome',
          nome:`Município ${i}`,identificador:i,
          favorabilidade:{indice,estado_indice:'valido',classe:'Alta',estado_classe:'valido'},
        }));
        itens.push({...itens[1],chave:'outra-entrada',entradaId:'entrada-2',entradaIndice:1,entradaNome:'Entrada 2'});
        const original = JSON.stringify({itens,entradas});
        const opcoes = {container,itens,entradas,selecionada:() => false,aoSelecionar:() => renderizarIndices(opcoes)};
        renderizarIndices(opcoes);
        const primeiro = container.querySelector('.fv-grafico-superficie');
        const linhas = [...primeiro.querySelectorAll('.fv-intervalo-linha')];
        const pontos = [...linhas[0].querySelectorAll('.fv-intervalo-ponto')];
        const caixas = pontos.map(p => {
          const b = p.getBoundingClientRect(), t = p.querySelector('.fv-dot-valor').getBoundingClientRect();
          return {x:Math.min(b.x,t.x),y:Math.min(b.y,t.y),right:Math.max(b.right,t.right),bottom:Math.max(b.bottom,t.bottom)};
        });
        const faixa = linhas[0].querySelector('.fv-intervalo-faixa');
        const repetidos = [...linhas[0].querySelectorAll('.fv-grupo-opcao')].filter(p => p.dataset.indice === '0.5');
        const grupo = linhas[0].querySelector('.fv-intervalo-grupo');
        grupo.click();
        const listaAberta = linhas[0].querySelector('.fv-grupo-escolhas').matches(':popover-open');
        linhas[0].querySelector('.fv-grupo-escolhas').hidePopover();
        const cor = ponto => ponto.querySelector('.fv-intervalo-marca').style.backgroundColor;
        const rolagem = primeiro.querySelector('.fv-intervalos-rolagem');
        rolagem.scrollLeft = 48;
        const antes = rolagem.scrollLeft;
        const simples = pontos.find(p => p.dataset.sobreposicao);
        simples.focus({preventScroll:true}); simples.click();
        const novaRolagem = container.querySelector('.fv-intervalos-rolagem');
        const saida = {
          nomes:linhas.map(l => l.querySelector('.fv-demanda-nome').textContent),pontosPorLinha:linhas.map(l => l.querySelectorAll('.fv-intervalo-ponto').length),
          superficies:container.querySelectorAll('.fv-grafico-superficie').length,
          semIntersecao:container.querySelectorAll('.fv-intervalo-sem-intersecao').length,
          intervalo:[faixa.dataset.min,faixa.dataset.max],isoladaSemFaixa:!linhas[1].querySelector('.fv-intervalo-faixa'),
          min:pontos.find(p => p.dataset.indice === '0').style.left,max:pontos.find(p => p.dataset.indice === '1').style.left,
          listaAberta, quantidade:grupo.querySelector('.fv-grupo-contagem').textContent,
          alturas:pontos.map(p => p.style.top), guias:linhas[0].querySelectorAll('.fv-intervalo-guia').length, caixas,
          corCompartilhada:cor(repetidos[0]) === cor(linhas[1].querySelector('.fv-intervalo-ponto')),
          foco:document.activeElement.dataset.sobreposicao === simples.dataset.sobreposicao,
          scroll:novaRolagem.scrollLeft === antes,
          imutavel:JSON.stringify({itens,entradas}) === original,
          overflow:container.scrollWidth > container.clientWidth,
        };
        container.remove(); return saida;
      },width);
      assert.deepEqual(intervalos.nomes,['Mesmo nome','Mesmo nome','Somente o Nome da Demanda','Somente o Nome da Demanda']);
      assert.deepEqual(intervalos.pontosPorLinha,[3,1,0,0],'Demandas homônimas e entradas distintas não são fundidas');
      assert.equal(intervalos.superficies,2,'Superfície sem interseções também mantém seu gráfico');
      assert.equal(intervalos.semIntersecao,6);
      assert.deepEqual(intervalos.intervalo,['0','1']);
      assert(intervalos.isoladaSemFaixa,'Um único índice não recebe traço fictício');
      assert.equal(intervalos.min,'0%'); assert.equal(intervalos.max,'100%');
      assert.equal(intervalos.guias,1);
      assert.deepEqual(intervalos.alturas,['32px','32px','32px']);
      assert.equal(intervalos.quantidade,'3');
      assert(intervalos.listaAberta,'Grupo abre lista de todas as feicoes');
      assert(intervalos.corCompartilhada,'Uma feição mantém a cor entre demandas e entradas');
      assert(intervalos.foco && intervalos.scroll,'Renderização por seleção preserva foco e rolagem');
      assert(intervalos.imutavel,'Renderização não modifica entradas, índices ou ordem dos produtos');
      assert(!intervalos.overflow,'Gráfico contido também em contêiner estreito');
      for (let i=0;i<intervalos.caixas.length;i++) for (let j=i+1;j<intervalos.caixas.length;j++) {
        const a = intervalos.caixas[i], b = intervalos.caixas[j];
        assert(a.right<=b.x || b.right<=a.x || a.bottom<=b.y || b.bottom<=a.y,'Pontos e valores próximos não se sobrepõem');
      }
      estilos.set(width, await Promise.all(hosts.map(estilosTabela)));
      for (const host of hosts) {
        assert.equal(await page.locator(host).locator('.admin-filter-bar').count(),1);
        assert.equal(await page.locator(host).locator('.admin-actions').count(),1);
        assert.equal(await page.locator(host).locator('.admin-table-footer').count(),1);
      }
    }
    await page.goto(`${base}/restrict/agrupamento-demandas/`,{waitUntil:'networkidle'});
    await page.locator('#agrupamento-new').click();
    for (const width of [1440,390]) {
      await page.setViewportSize({width,height:1000});
      const referencia = await estilosTabela('.agrupamento-universo');
      estilos.get(width).forEach((estilo,i) => {
        if (i < 3) assert.deepEqual(estilo,referencia,`${hosts[i]} segue a referência em ${width}px`);
        else {
          assert.equal(estilo.barra[0],referencia.barra[0]);
          assert.equal(estilo.seletor[0],'28px');
          assert.equal(estilo.filtro[0],'28px'); assert.equal(estilo.acao[0],'28px');
          assert.deepEqual(estilo.paginador,referencia.paginador);
        }
      });
    }
    assert.deepEqual(errors,[]);
    console.log('Favorabilidade V2: cinco tabelas padronizadas, filtros independentes, paginação, modal, edição cadastral com erro/cancelamento, execução e estatísticas preservadas, paridade visual e responsividade OK.');
  } finally { await browser.close(); }
})().catch(error => {console.error(error);process.exitCode = 1;});
