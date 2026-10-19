// Módulos e bancada reais; todas as APIs são interceptadas, sem gravação em produção.
const {chromium} = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({headless:true,
    channel:process.env.SICARD_TEST_BROWSER || (process.platform === 'win32' ? 'msedge' : undefined),
    args:['--no-proxy-server','--enable-unsafe-swiftshader']});
  try {
    const page = await browser.newPage({viewport:{width:1440,height:1000}});
    const errors = [], writes = [], saved = new Map();
    const inventories = [], preparations = [], selectionTimes = [], normalizations=[], derivados=new Map();
    const executions = [], executionJobs = new Map();
    const reportRequests = [], downloadRequests = [], reportModels = [];
    let reportSources = [], failReport = false, failDownload = false;
    let failExecution = false;
    let invalidGroup = false;
    let failLayer = '', missingGeometry = false, failNormalization=false,holdPreparation='',releasePreparation,holdNormalization='',releaseNormalization;
    page.on('pageerror', error => errors.push(error.message));
    await page.addLocatorHandler(page.locator('#pfsStatusOverlay.pfs-active'), async () => {
      await page.evaluate(() => window.StatusFeedback.fechar());
    });
    await page.addLocatorHandler(page.locator('.notification-toast').first(), async () => {
      await page.evaluate(() => window.Notify.clearAll());
    });
    const geometries = [
      {type:'LineString', coordinates:[[-47,-23],[-46.8,-23.2],[-46.6,-23.1]]},
      {type:'Polygon', coordinates:[[[-47.1,-23.3],[-47,-23.3],[-47,-23.2],[-47.1,-23.3]]]},
    ];
    const hier = {codigo:'HIER-TESTE', nome:'Rodada de teste', tipo_demanda:'projeto',
      dados_hierarquizacao:{cabecalho_grupo:{fases_a_executar:[3]}, objetos:geometries.map((_,i) => ({
        cabecalho_objeto:{codigo:`D-${i}`,nome:`Demanda ${i}`,demanda_id:`id-${i}`,atributos:{teste:42}},
      }))}};
    const layers = ['entrada','restricao-a','restricao-b','risco'].map(nome => ({
      id:`storage:base-geoespacial/${nome}.fgb`, nome, arquivo:`base-geoespacial/${nome}.fgb`,
      tipo:'vetor', status_validacao:'valida', representacao:'tiles', revisao:nome,
      tiles_token:'a'.repeat(32), feicoes:2, bounds:[-47.2,-23.4,-46.5,-22.9],
      campos:[{nome:'codigo'}], metadados_local:{crs:'EPSG:4674',tipos_geometria:['Polygon'],feicoes:2},
    }));
    layers[0].metadados_local.tipos_geometria=['GeometryCollection','Polygon'];
    const packageFile = {id:'storage:base-geoespacial/pacote.gpkg',nome:'pacote',arquivo:'base-geoespacial/pacote.gpkg',inventariar:true};
    const packageLayers = ['linhas','pontos'].map(nome => ({
      ...layers[0], id:`${packageFile.id}::${nome}`, nome, arquivo:packageFile.arquivo, camada:nome,
    }));
    const files = [...layers.map(({id,nome,arquivo}) => ({id,nome,arquivo,inventariar:true})), packageFile];
    const parametros={buffer_ponto_m:50,buffer_linha_m:25,segmentos_quadrante:32,crs_metrico:'EPSG:5880',crs_saida:'EPSG:4674'};
    await page.route('**/api/**', async route => {
      const req = route.request(), url = new URL(req.url()), path = url.pathname;
      const send = data => route.fulfill({json:data});
      if (req.method() !== 'GET') writes.push(path);
      if (path.includes('/auth/')) return send({authenticated:true,id:'fixture',nome:'Teste',username:'Teste',tipo_usuario:'ADMIN'});
      if (path.endsWith('/ahp/hierarquizacoes')) return send([hier]);
      if (path.endsWith('/extracao-atributos/catalogo')) return send({categorias:[],camadas:[]});
      if (path.endsWith('/ahp/hierarquizacoes/HIER-TESTE')) return send(hier);
      if (path.includes('/cadastro-geometrias/')) {
        const codigo = url.searchParams.get('codigo'), i = Number(codigo.slice(2));
        return send({itens:missingGeometry ? [] : [{
          codigo,id:`cadastro:projeto:${codigo}`,nome:`Demanda ${i}`,geometria_tipo:geometries[i].type,
          bounds:[-47.2,-23.4,-46.5,-22.9],geojson:{type:'FeatureCollection',
            features:[{type:'Feature',properties:{codigo},geometry:geometries[i]}]},
        }]});
      }
      if (path.endsWith('/storage/pastas')) return send({pastas:[{caminho:'base-geoespacial',nome:'Bases geoespaciais'}]});
      if (path.endsWith('/storage/navegar')) return send({caminho:'base-geoespacial',pai:'@storage',pastas:[],arquivos:files});
      if (path.endsWith('/storage/camadas-arquivo')) {
        const arquivo = url.searchParams.get('arquivo');
        inventories.push(arquivo);
        return send({camadas:arquivo === packageFile.arquivo ? packageLayers : layers.filter(l => l.arquivo === arquivo)});
      }
      if (path.endsWith('/preparar-camada')) {
        const id = req.postDataJSON().id;
        preparations.push(id);
        if(id===holdPreparation)await new Promise(resolve=>{releasePreparation=resolve;});
        if (id === failLayer) return route.fulfill({status:422,json:{detail:'Camada indisponível para validação.'}});
        return send([...layers,...packageLayers].find(l => l.id === id));
      }
      if(path.endsWith('/elegibilidade/parametros'))return send(parametros);
      if(path.endsWith('/elegibilidade/resultados/preparar')){
        const payload=req.postDataJSON(),fontes=new Map();
        for(const id of payload.execucoes){
          const exec=executions[Number(id.split('-').at(-1))-1];
          for(const papel of ['entrada','restricao','risco']){
            for(const camada of papel==='entrada'?[exec.entrada]:exec[papel])
              fontes.set(camada.id,{id:camada.id,nome:camada.nome.replaceAll('-',' ').replaceAll('_',' '),papel,tipo:'camada'});
          }
        }
        for(const camada of [...fontes.values()].filter(c=>c.papel!=='entrada')){
          for(let i=0;i<2;i++)fontes.set(`${camada.id}::feicao:${i}`,{id:`${camada.id}::feicao:${i}`,
            nome:`Trecho ${i+1} de ${camada.nome}`,papel:camada.papel,tipo:'feicao',base_id:camada.id});
        }
        reportSources=[...fontes.values()];
        return send({fontes:reportSources,concluidas:payload.execucoes.length,previstas:payload.execucoes.length});
      }
      if(path.endsWith('/elegibilidade/resultados/visualizar')){
        const payload=req.postDataJSON();
        reportRequests.push(payload);
        if(failReport)return route.fulfill({status:422,json:{detail:'A camada de saída mudou; relatório recusado.'}});
        const fontes=reportSources.map(f=>({...f,nome:payload.nomes[f.id]}));
        const entradas=payload.execucoes.map(id=>{
          const exec=executions[Number(id.split('-').at(-1))-1];
          const campos=fontes.filter(f=>f.tipo==='camada'&&f.papel!=='entrada');
          const linhas=Array.from({length:53},(_,i)=>({id:`F-${i}`,chave:String(i),nome:`Demanda ${i}`,area_total_m2:100,
            areas:campos.map(()=>i===0?null:i===1?0:12.5),
            sobreposicoes:i===0?[]:fontes.filter(f=>f.tipo==='feicao').map(f=>{
              const v=i===1?0:12.5*(f.id.endsWith(':0')?.6:.4);
              return {id:f.id,base_id:f.base_id,nome:f.nome,papel:f.papel,area_m2:v,percentual:v,identificador:f.id.endsWith(':0')?1:2};
            })}));
          const geo=(i,w=.001)=>{const x=-47+(i%10)*.002,y=-23+Math.floor(i/10)*.002;return {type:'Polygon',coordinates:[[[x,y],[x+w,y],[x+w,y+.001],[x,y+.001],[x,y]]]}};
          return {id,nome:payload.nomes[exec.entrada.id],feicoes:53,com_intersecao:52,sem_intersecao:1,
            concluido_em:'2026-10-19T15:00:00Z',campos,linhas,
            geometrias:{type:'FeatureCollection',features:linhas.map((l,i)=>({type:'Feature',properties:{chave:l.chave},geometry:geo(i)}))},
            intersecoes:{type:'FeatureCollection',features:linhas.flatMap((l,i)=>l.sobreposicoes.map(c=>({
              type:'Feature',properties:{chave:l.chave,base_id:c.base_id,feicao_id:c.id},geometry:geo(i,c.id.endsWith(':0')?.0006:.0004)})))}};
        });
        const modelo={fontes,entradas,concluidas:entradas.length,previstas:entradas.length,metodologia:'Interseções independentes em EPSG:5880, com áreas em m².'};
        reportModels.push(modelo);return send(modelo);
      }
      if(path.endsWith('/elegibilidade/resultados/pacote')){
        downloadRequests.push(req.postDataJSON());
        if(failDownload)return route.fulfill({status:503,json:{detail:'Storage indisponível; tente novamente.'}});
        return route.fulfill({contentType:'application/zip',body:Buffer.from('PK\\x03\\x04-fixture'),
          headers:{'content-disposition':'attachment; filename="Relatorio e Camadas.zip"'}});
      }
      if(path.endsWith('/elegibilidade/execucoes') && req.method()==='POST'){
        const payload=req.postDataJSON(),id=`execucao-${executions.length+1}`;
        executions.push(payload);
        const nome=`${payload.entrada.nome}_elegibilidade_territorial.gpkg`;
        const arquivo=`saidas-geoespaciais/elegibilidade-${id}/${nome}`;
        executionJobs.set(id,{id,status:failExecution?'erro':'concluido',cancelavel:false,
          erro:failExecution?'Falha OGR simulada.':null,resultado:failExecution?null:{
            ...layers[0],id:`storage:${arquivo}::elegibilidade_territorial`,nome,arquivo,
            camada:'elegibilidade_territorial',tiles_token:undefined,revisao:'123-456'}});
        return send({id,status:'executando',etapa:'Intersectar entrada integral',cancelavel:true});
      }
      if(path.includes('/elegibilidade/execucoes/')){
        const id=path.split('/').at(-1);
        return send(executionJobs.get(id));
      }
      if(path.includes('/storage/tiles/')||path.includes('/bancada-arquivos/tiles/'))
        return route.fulfill({body:Buffer.alloc(0),contentType:'application/vnd.mapbox-vector-tile'});
      if(path.endsWith('/elegibilidade/preparar-demanda')||path.endsWith('/elegibilidade/preparar-hierarquizacao')){
        const payload=req.postDataJSON(),grupo=path.endsWith('/preparar-hierarquizacao');
        const id=grupo?`hierarquizacao:${payload.codigo}`:payload.id;
        normalizations.push({...payload,id});
        if(id===holdNormalization)await new Promise(resolve=>{releaseNormalization=resolve;});
        if(failNormalization===true||failNormalization===id||grupo&&payload.demandas.includes(failNormalization))
          return route.fulfill({status:422,json:{detail:'Não foi possível obter um polígono válido da demanda.'}});
        const origem=[...layers,...packageLayers].find(item=>item.id===id);
        const colecoes=origem?.metadados_local.tipos_geometria.includes('GeometryCollection')?1:0;
        const feicoes=grupo?payload.demandas.length:(origem?.feicoes||1);
        const arquivo=`saidas-geoespaciais/execucoes/fixture/camadas/demanda-${normalizations.length}.gpkg`;
        const item={...layers[0],id:`storage:${arquivo}::demandas`,arquivo,camada:'demandas',nome:origem?.nome||id,
          revisao:`derivada-${normalizations.length}`,feicoes,
          metadados_local:{crs:'EPSG:4674',tipos_geometria:['MultiPolygon'],feicoes},
          normalizacao_demanda:{...parametros,feicoes,pontos_convertidos:0,
            linhas_convertidas:grupo||id.endsWith('D-0')?1:0,poligonos_sem_buffer:grupo?1:id.endsWith('D-0')?0:feicoes-colecoes,
            colecoes_convertidas:colecoes,componentes_colecoes:colecoes?{Point:1,LineString:1,Polygon:1}:{},
            ...(grupo?{total_demandas:payload.demandas.length,origem:{hierarquizacao:payload.codigo,
              camadas:(invalidGroup?payload.demandas.slice(1):payload.demandas).map(id=>({id}))}}:{})}};
        derivados.set(item.id,id);
        return send(item);
      }
      if (path.includes('/previa-tiles/')) return route.fulfill({body:Buffer.alloc(0),contentType:'application/vnd.mapbox-vector-tile'});
      if (path.endsWith('/configuracoes')) {
        if (req.method() === 'POST') {
          const data = req.postDataJSON();
          saved.set(data.escopo, data);
          return send({chave:'teste',nome:data.nome,camadas:data.categorias[0].camadas.length});
        }
        const data = saved.get(url.searchParams.get('escopo'));
        return send({pasta:'storage/listas',configuracoes:data ? [{
          chave:'teste',nome:data.nome,arquivo:'teste.json',bytes:120,camadas:data.categorias[0].camadas.length,categorias:1,
        }] : []});
      }
      if (path.endsWith('/configuracoes/teste')) {
        const data = saved.get(url.searchParams.get('escopo'));
        return send({...data,categorias:data.categorias.map(c => ({...c,camadas:c.camadas.map(id => [...layers,...packageLayers].find(l => l.id === id))}))});
      }
      return send([]);
    });
    const base = process.env.SICARD_TEST_URL || 'http://127.0.0.1:8083';
    await page.goto(`${base}/restrict/hierarquizacao/fase-1/`, {waitUntil:'domcontentloaded'});
    await page.waitForFunction(() => document.querySelector('#ev-hierarquizacao')?.options.length === 2);
    const avisoDisponibilidade = () => page.locator('.notification-toast, #pfsStatusOverlay.pfs-active')
      .filter({hasText:/hierarquização\(ões\) disponível\(is\)/}).count();
    assert.equal(await avisoDisponibilidade(),0,'Carregar hierarquizações não abre notificação de disponibilidade');
    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForFunction(() => document.querySelector('#ev-hierarquizacao')?.options.length === 2);
    assert.equal(await avisoDisponibilidade(),0,'Recarregar a página não abre notificação de disponibilidade');
    await page.waitForFunction(() => document.querySelector('iframe').contentWindow.gpApp?.state.map?.isStyleLoaded());
    await page.waitForFunction(() => document.querySelector('#ev-run-warning').textContent.includes('Nenhuma camada de entrada'));
    const panel = async () => (await page.locator('iframe').evaluate(f => f.contentWindow.gpApp.state.layers.map(l => l.id))).map(id=>derivados.get(id)||id);
    const closeProgress=()=>page.waitForFunction(()=>!document.querySelector('#pfsProgressOverlay').classList.contains('pfs-active'));
    const inputIds = layers.map(l => l.id);
    async function assertConferencia(entrada=[],restricao=[],risco=[]) {
      for (const [papel,ids] of Object.entries({entrada,restricao,risco})) {
        const atuais = await page.locator(`#ev-run-${papel} tr[data-id]`).evaluateAll(rows => rows.map(row => row.dataset.id));
        assert.deepEqual(atuais.map(id => derivados.get(id)||id),ids,`Conferência de ${papel} acompanha somente a bancada`);
        if (!ids.length) assert.match(await page.locator(`#ev-run-${papel}`).textContent(),/Nenhuma camada deste grupo marcada/);
      }
      assert.equal(await page.locator('#ev-calcular').isDisabled(),!(entrada.length&&(restricao.length||risco.length)),
        'Execução exige entrada e ao menos uma base confirmadas e marcadas');
    }
    const assertNamedFields = async () => assert.deepEqual(
      await page.evaluate(() => {
        const documents = [document, document.querySelector('#ea-workbench-frame').contentDocument];
        return documents.flatMap(doc => [...doc.querySelectorAll('input,select,textarea')]
          .filter(el => !el.id.trim() && !el.name.trim()).map(el => el.outerHTML.slice(0,200)));
      }), [], 'Todos os campos da página, diálogos e bancada têm id ou name');
    async function choose(button, names) {
      await page.locator(button).click();
      const dialog = page.locator('dialog.ea-storage-dialog');
      await dialog.locator('.ea-storage-tree-open', {hasText:'Bases geoespaciais'}).click();
      await assertNamedFields();
      for (const name of names) await dialog.locator(`[data-file="${files.find(f => f.nome === name).id}"]`).click();
      const reads = [inventories.length, preparations.length], started = Date.now();
      await dialog.getByRole('button', {name:/^Confirmar/}).click();
      await dialog.waitFor({state:'detached'});
      await page.waitForFunction(() => !document.querySelector('#ev-restricao-browse').disabled);
      selectionTimes.push(Date.now()-started);
      assert.deepEqual([inventories.length, preparations.length], reads, 'Confirmar só transfere referências: zero inventários e zero preparações');
      assert(selectionTimes.at(-1) < 1500, 'Confirmar transfere a seleção em menos de 1,5 s');
    }
    async function preview(papel) {
      await closeProgress();
      const before = await panel();
      const alvo = papel === 'entrada' && await page.locator('#ev-hier-enviar').isEnabled() ? 'hier' : papel;
      assert.match(await page.locator(`#ev-${alvo}-enviar`).getAttribute('aria-label'), /para a prévia$/);
      await page.locator(`#ev-${alvo}-enviar`).click();
      await page.waitForFunction(() => !document.querySelector('#ev-restricao-browse').disabled);
      assert.deepEqual(await page.evaluate(()=>ProcessFeedback.atual.tasks.map(t=>t.completed)),[true,true,true], 'Feedback confirma as três etapas da prévia');
      await closeProgress();
      assert.deepEqual(await panel(), before, 'Enviar para prévia nunca altera bancada');
      await assertNamedFields();
    }
    async function send(papel, cancel=false) {
      if (papel) await preview(papel);
      await page.locator('#ea-staging-confirmar').click();
      const antes=normalizations.length;
      if(await page.getByRole('checkbox',{name:'Visibilidade no mapa: entrada',exact:true}).count()){
        assert.match(await page.locator('#pfsConfirmOverlay').textContent(),/50 m.*25 m.*EPSG:5880.*32 segmentos.*EPSG:4674/s,'Confirmação explicita parâmetros oficiais');
      }
      await page.locator(cancel ? '#pfsConfirmCancel' : '#pfsConfirmOk').click();
      await page.waitForFunction(() => !document.querySelector('#ev-restricao-browse').disabled);
      if(cancel)assert.equal(normalizations.length,antes,'Cancelar confirmação não gera arquivos derivados');
      else assert.deepEqual(await page.evaluate(()=>ProcessFeedback.atual.tasks.map(t=>t.completed)),[true,true,true,true], 'Feedback confirma conversão, arquivo e envio');
      await closeProgress();
    }
    if (process.env.SICARD_TEST_GROUP_ONLY === '1') {
      await choose('#ev-restricao-browse',['restricao-a']);
      await preview('restricao');
      await choose('#ev-risco-browse',['risco']);
      await preview('risco');
      await page.selectOption('#ev-hierarquizacao','HIER-TESTE');
      await page.waitForFunction(()=>document.querySelectorAll('#ev-hier-lista li').length===2);
      const antes=normalizations.length;
      await preview('entrada');
      assert.equal(normalizations.length,antes,'A prévia não gera o arquivo do grupo');
      const checkbox=page.locator('#ea-input-preview-layers [data-validation]')
        .getByRole('checkbox',{name:'Visibilidade no mapa: D-0 — Demanda 0',exact:true});
      await checkbox.uncheck();
      await page.locator('#ea-staging-confirmar').click();
      await page.waitForFunction(()=>document.querySelector('#ev-status').dataset.error==='true');
      assert.match(await page.locator('#ev-status').textContent(),/todas as demandas/);
      assert.equal(normalizations.length,antes,'Grupo incompleto não gera arquivos');
      await checkbox.check();
      await send(undefined,true);
      assert.equal(normalizations.length,antes,'Cancelar não gera arquivos');
      for(const falha of ['demanda','rastreio']){
        failNormalization=falha==='demanda'?'cadastro:projeto:D-1':false;
        invalidGroup=falha==='rastreio';
        await page.locator('#ea-staging-confirmar').click();
        await page.locator('#pfsConfirmOk').click();
        await page.waitForFunction(()=>document.querySelector('#ev-status').dataset.error==='true');
        await closeProgress();
        assert.deepEqual(await panel(),[],'Falha em uma demanda ou na auditoria não altera a bancada');
      }
      failNormalization=false;invalidGroup=false;
      await send();
      await assertConferencia(['hierarquizacao:HIER-TESTE'],[inputIds[1]],[inputIds[3]]);
      const entradas=await page.locator('iframe').evaluate(f=>[...f.contentWindow.gpArquivos.sessions.values()]
        .filter(item=>item.origemEntrada==='hierarquizacao')
        .map(item=>({arquivo:item.arquivo,camada:item.camada,fontes:item.fontesElegibilidade.map(fonte=>fonte.id)})));
      assert.equal(entradas.length,1);
      assert(entradas[0].arquivo.endsWith('.gpkg')&&entradas[0].camada==='demandas');
      assert.deepEqual(entradas[0].fontes,['cadastro:projeto:D-0','cadastro:projeto:D-1']);
      assert.equal(await page.locator('#ea-input-preview-layers [data-preview-layer-status]').filter({hasText:'Na bancada'}).count(),4);
      const gravacoes=normalizations.length;
      await send();
      assert.equal(normalizations.length,gravacoes,'Reenvio reutiliza o único arquivo do grupo');
      await page.locator('#ev-calcular').click();
      await page.locator('#pfsConfirmOk').click();
      await page.waitForFunction(()=>document.querySelector('#ev-status').textContent.includes('camada(s) de saída produzida(s)'));
      await closeProgress();
      assert.equal(executions.length,1,'Uma única execução de elegibilidade recebe todo o grupo');
      assert.equal(derivados.get(executions[0].entrada.id),'hierarquizacao:HIER-TESTE');
      assert.deepEqual(executions[0].restricao.map(c=>c.id),[inputIds[1]]);
      assert.deepEqual(executions[0].risco.map(c=>c.id),[inputIds[3]]);
      assert.deepEqual(errors,[]);
      console.log('PASS: hierarquização integral em um GeoPackage/uma camada, fontes, cache, cancelamento, falhas e cálculo único com risco e restrição.');
      return;
    }
    if (process.env.SICARD_TEST_EXECUTION_ONLY === '1') {
      await choose('#ev-entrada-browse',['pacote']);
      await preview('entrada');
      await choose('#ev-restricao-browse',['restricao-a']);
      await preview('restricao');
      await choose('#ev-risco-browse',['risco']);
      await preview('risco');
      await send();
      await verificarExecucao();
      await verificarResultados();
      assert.deepEqual(errors, [], 'Sem erros JavaScript na execução');
      console.log('Elegibilidade: execução, cancelamento da confirmação, fontes visíveis, saída automática, falha explícita e múltiplas entradas OK');
      return;
    }
    assert.equal(await page.getByLabel('Camada de entrada', {exact:true}).getAttribute('placeholder'), 'Selecione as camadas de entrada.');
    assert.equal(await page.getByLabel('Hierarquizações:', {exact:true}).locator('option').first().textContent(), 'Selecione uma hierarquização');
    assert.equal(await page.locator('#ev-entrada-title').evaluate(title => title.closest('section').querySelectorAll('section').length), 0, 'Entrada sem subcontainers 1.1 e 1.2');
    assert.equal(await page.locator('.ev-ou').textContent(), 'ou');
    assert.equal(await page.locator('.ev-ou').evaluate(el => getComputedStyle(el).textAlign), 'center');
    for (const papel of ['entrada','restricao','risco']) {
      const button = page.locator(`#ev-${papel}-browse`);
      assert.equal(await button.getAttribute('title'), 'Adicionar camada');
      assert.match(await button.getAttribute('aria-label'), /^Adicionar camada de /);
      assert.equal(await button.locator('svg.ev-layer-add-icon .ev-layer-add-plus').count(), 1, 'Ícone combina geometria de camadas e sinal de mais');
      assert.equal(await button.locator('.fa-folder-open').count(), 0, 'Adicionar camada não usa mais o ícone de pasta');
    }
    assert.equal(await page.locator('#ev-risco-browse').isDisabled(), true);
    await assertConferencia();
    assert.match(await page.locator('#ev-run-warning').textContent(),/Nenhuma camada de entrada/);
    await choose('#ev-entrada-browse', ['entrada']);
    await assertConferencia();
    assert.equal(await page.locator('#ea-input-preview').isHidden(), true, 'Selecionar não envia automaticamente para prévia');
    assert.equal(await page.locator('.ev-preparacao-grid [aria-label*="bancada"]').count(), 0, 'Seções 1 e 2 não enviam à bancada');
    assert.equal(await page.locator('#ea-input-preview .ea-preview-panel > footer #ea-staging-confirmar').count(), 1, 'Envio à bancada está no rodapé do painel de camadas');
    assert.equal(await page.locator('#ev-entrada-camadas').inputValue(), 'entrada');
    assert.equal(await page.locator('#ev-hierarquizacao').isDisabled(), true, 'Camadas bloqueiam a outra origem');
    await page.locator('#ev-hierarquizacao').evaluate(el => {el.value='HIER-TESTE'; el.dispatchEvent(new Event('change'));});
    await page.waitForFunction(() => document.querySelector('#ev-status').dataset.error === 'true');
    assert.equal(await page.locator('#ev-hierarquizacao').inputValue(), '', 'Tentativa de misturar origens é rejeitada');
    assert.equal(await page.locator('#ev-entrada-camadas').inputValue(), 'entrada');
    assert.equal((await panel()).length, 0, 'Prévia não envia automaticamente');
    await send('entrada', true);
    assert.equal((await panel()).length, 0, 'Cancelar preserva a bancada');
    await assertConferencia();
    failNormalization=true;
    await page.locator('#ea-staging-confirmar').click();
    await page.locator('#pfsConfirmOk').click();
    await page.waitForFunction(()=>document.querySelector('#ev-status').dataset.error==='true');
    await closeProgress();
    assert.equal((await panel()).length,0,'Falha na poligonização não substitui a bancada');
    assert.equal(await page.getByRole('checkbox',{name:'Visibilidade no mapa: entrada',exact:true}).count(),1);
    assert.match(await page.locator('#pfsStatusOverlay').textContent(),/polígono válido/,'Falha aparece no sistema de feedback');
    failNormalization=false;
    holdNormalization=inputIds[0];
    const normalizacaoIniciada=page.waitForRequest('**/elegibilidade/preparar-demanda');
    await page.locator('#ea-staging-confirmar').click();
    await page.locator('#pfsConfirmOk').click();
    await normalizacaoIniciada;
    assert.equal(await page.locator('#elegibilidade-app').getAttribute('aria-busy'),'true');
    assert.equal(await page.getByRole('checkbox',{name:'Visibilidade no mapa: entrada',exact:true}).isDisabled(),true);
    assert.match(await page.locator('#pfsProgressOverlay').textContent(),/Normalizar demandas|Normalizando/);
    await page.locator('#pfsCancelBtn').click();
    assert.equal(await page.locator('#elegibilidade-app').getAttribute('aria-busy'),'true','Cancelar aguarda operação corrente');
    releaseNormalization();holdNormalization='';
    await page.waitForFunction(()=>!document.querySelector('#ev-restricao-browse').disabled);
    await closeProgress();
    assert.equal((await panel()).length,0,'Cancelar durante a conversão não sincroniza parcialmente a bancada');
    assert.match(await page.locator('#ev-status').textContent(),/cancelado.*mantidos.*derivados/s);
    await send('entrada');
    assert.deepEqual(await panel(), [inputIds[0]]);
    await assertConferencia([inputIds[0]]);
    assert.match(await page.locator('#ev-run-entrada [data-source]').textContent(),/^saidas-geoespaciais\/execucoes\/.*\.gpkg::demandas$/,'Conferência aponta para o arquivo poligonal integral, não para a prévia ou fonte original');
    assert.match(await page.locator('#pfsProgressOverlay').textContent(),/1 coleção\(ões\) normalizada\(s\).*Point: 1.*LineString: 1.*Polygon: 1/s,'Feedback registra as coleções e todos os tipos de componentes');
    const entradaDerivada=await page.locator('iframe').evaluate(f=>{
      const win=f.contentWindow,id=win.gpApp.state.layers[0].id,file=win.gpArquivos.sessions.get(id);
      return {id,arquivo:file.arquivo,request:win.gpArquivos.requestPayload(file)};
    });
    assert.match(entradaDerivada.id,/^storage:saidas-geoespaciais/);
    assert.equal(entradaDerivada.request.arquivo,entradaDerivada.arquivo,'Geoprocessos recebem o arquivo derivado, não a fonte original');
    assert.match(entradaDerivada.request.revisao,/^derivada-/);
    assert.equal(await page.getByRole('checkbox',{name:'Visibilidade no mapa: entrada',exact:true}).count(),1,'Prévia preserva referência original');
    await choose('#ev-restricao-browse', ['restricao-a','restricao-b']);
    await assertConferencia([inputIds[0]]);
    assert.deepEqual(await panel(), [inputIds[0]], 'Selecionar restrição não altera bancada');
    assert.equal(await page.getByRole('checkbox', {name:'Visibilidade no mapa: restricao-b',exact:true}).count(), 0, 'Restrição selecionada ainda não está na prévia');
    const trash = page.locator('#ev-restricao-lista .ev-remove-layer').first();
    const trashStyle = () => trash.evaluate(el => {
      const css = getComputedStyle(el);
      return {width:css.width,height:css.height,border:css.borderTopWidth,
        background:css.backgroundColor,shadow:css.boxShadow,
        rowHeight:el.closest('li').getBoundingClientRect().height};
    });
    const compactTrash = {width:'24px',height:'24px',border:'0px',
      background:'rgba(0, 0, 0, 0)',shadow:'none',rowHeight:28};
    assert.deepEqual(await trashStyle(), compactTrash, 'Lixeira sem caixa e linha compacta');
    assert.equal(await trash.locator('i.fa-trash-can').count(), 1);
    assert.match(await trash.getAttribute('aria-label'), /Remover restricao-a/);
    await trash.hover();
    await page.waitForTimeout(200);
    assert.deepEqual(await trashStyle(), compactTrash, 'Hover não recria caixa nem sombra');
    await trash.focus();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Shift+Tab');
    assert.equal(await trash.evaluate(el => document.activeElement === el), true);
    assert.equal(await trash.evaluate(el => getComputedStyle(el).outlineStyle !== 'none'), true, 'Foco de teclado preservado');
    await page.mouse.move(0,0);
    if (process.env.SICARD_TEST_COMPACT_SCREENSHOT) {
      await page.setViewportSize({width:1000,height:1000});
      await page.locator('.ev-preparacao-grid').screenshot({path:process.env.SICARD_TEST_COMPACT_SCREENSHOT});
      await page.setViewportSize({width:1440,height:1000});
    }
    await preview('restricao');
    const visibility = page.getByRole('checkbox', {name:'Visibilidade no mapa: restricao-b',exact:true});
    await visibility.uncheck();
    await send();
    assert.deepEqual(new Set(await panel()), new Set([inputIds[0],inputIds[1]]), 'Somente camadas marcadas');
    await assertConferencia([inputIds[0]],[inputIds[1]]);
    const entryVisible = page.getByRole('checkbox', {name:'Visibilidade no mapa: entrada',exact:true});
    const restrictionVisible = page.getByRole('checkbox', {name:'Visibilidade no mapa: restricao-a',exact:true});
    await entryVisible.uncheck();
    await restrictionVisible.uncheck();
    assert.equal(await page.locator('#ea-staging-confirmar').isDisabled(), true, 'Sem camadas marcadas não há envio à bancada');
    assert.deepEqual(new Set(await panel()), new Set([inputIds[0],inputIds[1]]), 'Desmarcar não altera bancada sem confirmação');
    await assertConferencia([inputIds[0]],[inputIds[1]]);
    await entryVisible.check();
    await restrictionVisible.check();
    await visibility.check();
    await send();
    assert.deepEqual(new Set(await panel()), new Set([inputIds[0],inputIds[1],inputIds[2]]));
    await visibility.uncheck();
    await send(undefined, true);
    assert.equal((await panel()).includes(inputIds[2]), true, 'Cancelar preserva camada agora desmarcada');
    await send();
    assert.equal((await panel()).includes(inputIds[2]), false, 'Envio único retira camadas desmarcadas do conjunto anterior');
    await page.locator('#ev-restricao-salvar').click();
    await page.locator('#pfsConfirmInput').fill('Lista restrição');
    await page.locator('#pfsConfirmOk').click();
    await page.waitForFunction(() => !document.querySelector('#ev-restricao-browse').disabled);
    assert.deepEqual(saved.get('elegibilidade-restricao').categorias[0].camadas, [inputIds[1],inputIds[2]]);
    await choose('#ev-risco-browse', ['risco']);
    await send('risco');
    await assertConferencia([inputIds[0]],[inputIds[1]],[inputIds[3]]);
    const antesDaConferencia = [inventories.length,preparations.length,normalizations.length,writes.length];
    const restricaoNaBancada = page.frameLocator('#ea-workbench-frame').getByRole('checkbox',{name:'Exibir restricao-a',exact:true,includeHidden:true});
    await restricaoNaBancada.evaluate(input => input.click());
    await assertConferencia([inputIds[0]],[],[inputIds[3]]);
    await restricaoNaBancada.evaluate(input => input.click());
    await assertConferencia([inputIds[0]],[inputIds[1]],[inputIds[3]]);
    const entradaNaBancada = page.frameLocator('#ea-workbench-frame').getByRole('checkbox',{name:'Exibir entrada',exact:true,includeHidden:true});
    await entradaNaBancada.evaluate(input => input.click());
    await assertConferencia([],[inputIds[1]],[inputIds[3]]);
    assert.match(await page.locator('#ev-run-warning').textContent(),/Nenhuma camada de entrada/);
    await entradaNaBancada.evaluate(input => input.click());
    await page.locator('iframe').evaluate(f => f.contentWindow.gpApp.adicionarCamadaGeoJsonEmMemoria('adicional-conferencia','Camada adicional',
      {type:'FeatureCollection',features:[{type:'Feature',properties:{},geometry:{type:'Point',coordinates:[-47,-23]}}]},{categoria:'Restrição',lote:false}));
    await page.waitForFunction(() => document.querySelector('iframe').contentWindow.gpApp.state.layers.some(layer => layer.id==='adicional-conferencia'));
    await assertConferencia([inputIds[0]],[inputIds[1]],[inputIds[3]]);
    assert.match(await page.locator('#ev-run-warning').textContent(),/1 camada.*adicionada.*não integra/s,'Camadas adicionadas diretamente não recebem um papel silenciosamente');
    await page.locator('iframe').evaluate(f => f.contentWindow.gpApp.removeLayerFromMap('adicional-conferencia',false));
    assert.equal(await page.locator('#ev-run-warning').textContent(),'');
    await page.locator('iframe').evaluate(f => f.contentWindow.gpApp.removeLayerFromMap(f.contentWindow.gpApp.state.layers.find(layer => layer.nome==='restricao-a').id,false));
    await assertConferencia([inputIds[0]],[],[inputIds[3]]);
    assert.deepEqual([inventories.length,preparations.length,normalizations.length,writes.length],antesDaConferencia,'Conferir, desmarcar ou remover não prepara arquivos nem chama geoprocessos');
    await send();
    await assertConferencia([inputIds[0]],[inputIds[1]],[inputIds[3]]);
    const before = await panel();
    await page.locator('#ev-entrada-limpar').click();
    await assertConferencia([inputIds[0]],[inputIds[1]],[inputIds[3]]);
    assert.equal(await page.locator('#ev-entrada-camadas').inputValue(), '');
    assert.equal(await page.locator('#ev-hierarquizacao').isDisabled(), false);
    assert.deepEqual(await panel(), before, 'Limpar a prévia não altera entrada já confirmada');
    await page.selectOption('#ev-hierarquizacao', 'HIER-TESTE');
    await page.waitForFunction(() => document.querySelector('#ev-hier-detalhes').hidden === false);
    assert.equal(await page.locator('#ev-coluna-hierarquizacao #ev-hier-lista li').count(), 2, 'Demandas ficam abaixo da coluna Hierarquizações');
    assert.equal(await page.locator('#ev-coluna-camadas #ev-entrada-lista li').count(), 0, 'Hierarquização não aparece na coluna de camadas');
    assert.equal(await page.locator('#ev-entrada-enviar').isDisabled(), true);
    assert.equal(await page.locator('#ev-hier-enviar').isEnabled(), true);
    assert.equal(await page.locator('#ev-entrada-browse').isDisabled(), true, 'Hierarquização bloqueia o explorador');
    assert.equal(await page.locator('#ev-entrada-camadas').inputValue(), '');
    assert.deepEqual(await panel(), before, 'Hierarquização permanece só na prévia');
    assert.match(await page.locator('#ev-hier-dados').textContent(), /"teste": 42/);
    const antesDaPrevia=normalizations.length;
    await preview('entrada');
    assert.equal(normalizations.length,antesDaPrevia,'A prévia não gera o GeoPackage consolidado');
    const demandaVisivel=page.locator('#ea-input-preview-layers [data-validation]')
      .getByRole('checkbox',{name:'Visibilidade no mapa: D-0 — Demanda 0',exact:true});
    await demandaVisivel.uncheck();
    await page.locator('#ea-staging-confirmar').click();
    await page.waitForFunction(()=>document.querySelector('#ev-status').dataset.error==='true');
    assert.match(await page.locator('#ev-status').textContent(),/todas as demandas da hierarquização/);
    assert.equal(normalizations.length,antesDaPrevia,'Um grupo incompleto não inicia consolidação');
    assert.deepEqual(await panel(),before,'Desmarcar uma demanda não envia um grupo parcial');
    await demandaVisivel.check();
    await send(undefined,true);
    assert.equal(normalizations.length,antesDaPrevia,'Cancelar não gera o arquivo do grupo');
    failNormalization='cadastro:projeto:D-1';
    await page.locator('#ea-staging-confirmar').click();
    await page.locator('#pfsConfirmOk').click();
    await page.waitForFunction(()=>document.querySelector('#ev-status').dataset.error==='true');
    await closeProgress();
    assert.deepEqual(await panel(),before,'Falha em uma demanda não envia o grupo parcialmente');
    failNormalization=false;
    invalidGroup=true;
    await page.locator('#ea-staging-confirmar').click();
    await page.locator('#pfsConfirmOk').click();
    await page.waitForFunction(()=>document.querySelector('#ev-status').dataset.error==='true');
    assert.match(await page.locator('#ev-status').textContent(),/não confirmou todas as demandas/);
    await closeProgress();
    assert.deepEqual(await panel(),before,'Arquivo sem rastreabilidade de todas as demandas não é enviado');
    invalidGroup=false;
    await send();
    await assertConferencia(['hierarquizacao:HIER-TESTE'],[inputIds[1]],[inputIds[3]]);
    assert.equal((await panel()).length,3,'Bancada recebe uma entrada única, uma restrição e um risco');
    const actualGeometry = await page.locator('iframe').evaluate(f =>
      [...f.contentWindow.gpArquivos.sessions.values()].filter(item=>item.origemEntrada==='hierarquizacao')
        .map(item=>({tipos:item.metadados_local.tipos_geometria,arquivo:item.arquivo,camada:item.camada,
          fontes:item.fontesElegibilidade.map(fonte=>fonte.geojson.features[0])})));
    assert.equal(actualGeometry.length,1,'Somente uma camada de demandas cadastrada na bancada');
    assert(actualGeometry[0].arquivo.endsWith('.gpkg')&&actualGeometry[0].camada==='demandas');
    assert.deepEqual(actualGeometry[0].fontes.map(f=>f.geometry),geometries,'Todas as fontes geométricas preservadas na rastreabilidade');
    assert(actualGeometry.every(item=>item.tipos.every(tipo=>['Polygon','MultiPolygon'].includes(tipo))),'Bancada recebe exclusivamente demandas poligonais');
    assert.equal(actualGeometry[0].fontes[0].properties.objeto_hierarquizacao.cabecalho_objeto.atributos.teste,42);
    const consolidacao=normalizations.find(payload=>payload.id==='hierarquizacao:HIER-TESTE');
    assert.deepEqual(consolidacao.demandas,['cadastro:projeto:D-0','cadastro:projeto:D-1']);
    assert.equal(await page.locator('#ea-input-preview-layers [data-preview-layer-status]').filter({hasText:'Na bancada'}).count(),4,
      'Todas as fontes individuais na prévia são reconhecidas como enviadas');
    const gravacoes=normalizations.length;
    await send();
    assert.equal(normalizations.length,gravacoes,'Reenviar a mesma prévia reutiliza o único GeoPackage do grupo');
    assert(normalizations.every(payload=>!payload.id.includes('restricao')&&!payload.id.includes('risco')),'Bases de risco e restrição não são convertidas');
    assert.equal((await panel()).includes(inputIds[0]), false, 'Novo envio substitui entrada anterior');
    missingGeometry = true;
    await page.selectOption('#ev-hierarquizacao', 'HIER-TESTE');
    await page.waitForFunction(() => document.querySelector('#ev-status').dataset.error === 'true');
    assert.match(await page.locator('#ev-status').textContent(), /não possui geometria cadastrada/);
    assert.equal(await page.locator('#ev-hier-lista li').count(), 2, 'Falha mantém prévia anterior na coluna de hierarquização');
    missingGeometry = false;
    await page.getByRole('button', {name:'Remover D-0 — Demanda 0 da seleção de entrada',exact:true}).click();
    assert.equal(await page.locator('#ea-input-preview-layers [data-validation]').filter({hasText:'D-0 — Demanda 0'}).count(), 1, 'Remover da seleção não altera a prévia sem envio');
    assert.equal(await page.locator('#ev-hierarquizacao').inputValue(), 'HIER-TESTE', 'Remoção parcial mantém origem da hierarquização');
    assert.equal(await page.locator('#ev-entrada-browse').isDisabled(), true);
    await page.selectOption('#ev-hierarquizacao', '');
    assert.equal(await page.locator('#ev-entrada-lista button').count(), 0, 'Desmarcar hierarquização limpa suas geometrias da prévia');
    assert.equal(await page.locator('#ev-entrada-browse').isDisabled(), false);
    await choose('#ev-entrada-browse', ['entrada']);
    await send('entrada');
    assert.deepEqual(new Set(await panel()), new Set([inputIds[0],inputIds[1],inputIds[3]]), 'Troca de hierarquização para camadas também não mistura origens na bancada');
    // Carregar uma lista conflitante deve ser bloqueado mesmo sem o explorador.
    saved.set('elegibilidade-risco', {nome:'Conflito',escopo:'elegibilidade-risco',categorias:[{id:'risco',camadas:[inputIds[1]]}]});
    await page.locator('#ev-risco-carregar').click();
    await page.locator('.ea-config-entry').click();
    await page.locator('dialog.ea-config-dialog').getByRole('button', {name:/Abrir|Carregar/}).last().click();
    await page.waitForFunction(() => document.querySelector('#ev-status').dataset.error === 'true');
    assert.match(await page.locator('#ev-status').textContent(), /já é restrição/);
    assert.equal(await page.locator('#ev-risco-lista').textContent(), 'riscoRemover');
    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForFunction(() => document.querySelector('#ev-hierarquizacao')?.options.length === 2);
    await page.locator('#ev-restricao-carregar').click();
    await assertNamedFields();
    await page.locator('.ea-config-entry').click();
    await page.locator('dialog.ea-config-dialog').getByRole('button', {name:/Abrir|Carregar/}).last().click();
    await page.waitForFunction(() => document.querySelectorAll('#ev-restricao-lista button').length === 2);
    assert.equal((await panel()).length, 0, 'Lista salva volta apenas à seleção após recarregar a página');
    assert.equal(await page.locator('#ea-input-preview').isHidden(), true, 'Lista carregada aguarda envio explícito à prévia');
    await preview('restricao');
    failLayer = inputIds[1];
    await page.locator('#ev-restricao-enviar').click();
    await page.waitForFunction(() => document.querySelector('#ev-status').dataset.error === 'true');
    assert.equal(await page.locator('#ev-restricao-lista button').count(), 2, 'Falha de validação na prévia preserva seleção');
    assert.equal(await page.getByRole('checkbox', {name:'Visibilidade no mapa: restricao-b',exact:true}).count(), 1, 'Falha de validação mantém prévia anterior');
    failLayer = '';
    await closeProgress();
    holdPreparation=inputIds[1];
    const preparoIniciado=page.waitForRequest('**/preparar-camada');
    await page.locator('#ev-restricao-enviar').click();
    await preparoIniciado;
    assert.match(await page.locator('#pfsProgressOverlay').textContent(),/Validando 1 de 2.*restricao-a/s,'Detalhe identifica camada e total real');
    await page.locator('#pfsCancelBtn').click();
    releasePreparation();holdPreparation='';
    await page.waitForFunction(()=>!document.querySelector('#ev-restricao-browse').disabled);
    await closeProgress();
    assert.equal(await page.getByRole('checkbox',{name:'Visibilidade no mapa: restricao-b',exact:true}).count(),1,'Cancelar validação mantém a prévia anterior');
    assert.equal(await page.locator('#ev-restricao-lista button').count(),2,'Cancelar validação preserva seleção');
    await preview('restricao');
    await page.getByRole('button', {name:'Remover restricao-b da seleção de restrição',exact:true}).click();
    assert.equal(await page.getByRole('checkbox', {name:'Visibilidade no mapa: restricao-b',exact:true}).count(), 1, 'Remover seleção mantém prévia até o próximo envio');
    await preview('restricao');
    assert.equal(await page.getByRole('checkbox', {name:'Visibilidade no mapa: restricao-b',exact:true}).count(), 0, 'Novo envio à prévia aplica a remoção');
    await choose('#ev-entrada-browse', ['pacote']);
    assert.equal(await page.locator('#ev-entrada-lista button').count(), 1, 'Arquivo multicamadas é selecionado sem inventário');
    saved.set('elegibilidade-risco', {nome:'Conflito componente',escopo:'elegibilidade-risco',
      categorias:[{id:'risco',camadas:[packageLayers[0].id]}]});
    await page.locator('#ev-risco-carregar').click();
    await assertNamedFields();
    await page.locator('.ea-config-entry').click();
    await page.locator('dialog.ea-config-dialog').getByRole('button', {name:/Abrir|Carregar/}).last().click();
    await page.waitForFunction(() => document.querySelector('#ev-status').dataset.error === 'true');
    assert.match(await page.locator('#ev-status').textContent(), /já é entrada/, 'Componente não pode receber outro papel enquanto o arquivo inteiro é entrada');
    const beforePackage = preparations.length;
    await preview('entrada');
    assert.deepEqual(preparations.slice(beforePackage), packageLayers.map(l => l.id), 'Componentes são identificados e validados apenas ao enviar para prévia');
    assert.equal(await page.locator('#ea-input-preview-layers [data-validation]').count(), 3);
    for (const width of [390,768,1025,1440]) {
      await page.setViewportSize({width,height:1000});
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `Sem transbordamento em ${width}px`);
      const conferenciaLayout = await page.locator('.ea-checkup-tables').evaluate(container => {
        const box = container.getBoundingClientRect();
        const tables = [...container.children].map(table => table.getBoundingClientRect());
        return {colunas:getComputedStyle(container).gridTemplateColumns.split(' ').length,
          dentro:tables.every(table => table.left >= box.left && table.right <= box.right+1)};
      });
      assert.equal(conferenciaLayout.colunas,width>1024?3:1,`Três grupos responsivos em ${width}px`);
      assert(conferenciaLayout.dentro,'Tabelas de conferência respeitam a largura do bloco');
      assert.equal(await page.locator('#ea-staging-actions').evaluate(footer => {
        const f=footer.getBoundingClientRect(), p=footer.parentElement.getBoundingClientRect();
        return f.left >= p.left && f.right <= p.right && Math.abs(f.bottom-p.bottom) <= 2;
      }), true, 'Envio à bancada no rodapé do painel de camadas');
      for (const papel of ['entrada','restricao','risco']) {
        const positions = await page.evaluate(papel => {
          const input = document.getElementById(`ev-${papel}-camadas`);
          const button = document.getElementById(`ev-${papel}-browse`);
          const r = input.getBoundingClientRect(), b = button.getBoundingClientRect();
          const actions = input.closest('.ea-field').querySelector('.ev-field-actions');
          const buttons = [...actions.children].map(el => el.getBoundingClientRect());
          return {
            inside:b.x >= r.x && b.right <= r.right && b.y >= r.y && b.bottom <= r.bottom,
            inputHeight:r.height,
            buttonWidth:b.width,
            buttonHeight:b.height,
            actionsOutside:!input.parentElement.contains(actions),
            below:buttons.every(rect => rect.y >= r.bottom),
            offset:Math.abs((buttons[0].x + buttons.at(-1).right)/2 - (r.x + r.right)/2),
            count:buttons.length,
          };
        }, papel);
        assert(positions.inside, `Adicionar ${papel} fica dentro do campo em ${width}px`);
        assert.equal(positions.inputHeight, 36, 'Campo compacto');
        assert.equal(positions.buttonWidth, 28);
        assert.equal(positions.buttonHeight, 28);
        assert(positions.actionsOutside && positions.below, 'Ações ficam abaixo e fora do contorno do input');
        assert(positions.offset < 2, 'Ações centralizadas na largura do input');
        assert.equal(positions.count, papel === 'entrada' ? 2 : 3);
      }
      const hierActions = await page.locator('#ev-coluna-hierarquizacao').evaluate(coluna => {
        const input = coluna.querySelector('select').getBoundingClientRect();
        const actions = [...coluna.querySelector('.ev-field-actions').children].map(el => el.getBoundingClientRect());
        return {
          below:actions.every(r => r.y >= input.bottom),
          offset:Math.abs((actions[0].x + actions.at(-1).right)/2 - (input.x + input.right)/2),
        };
      });
      assert(hierActions.below && hierActions.offset < 2, 'Ações da hierarquização abaixo e centralizadas na própria coluna');
      if (width > 540) {
        const layout = await page.evaluate(() => {
          const box = selector => {
            const r = document.querySelector(selector).getBoundingClientRect();
            return {x:r.x,y:r.y,right:r.right,width:r.width};
          };
          return {
            campos:['#ev-entrada-camadas','#ev-hierarquizacao'].map(box),
            grupos:[...document.querySelectorAll('.ev-bases-grupo')].map(el => {
              const r = el.getBoundingClientRect();
              return {x:r.x,y:r.y,right:r.right};
            }),
            legendas:[...document.querySelectorAll('.ev-bases-grupo > label')].map(el => getComputedStyle(el).backgroundColor),
            barras:document.querySelectorAll('.ev-bases-grupo .ahp-subsection-title').length,
          };
        });
        assert(Math.abs(layout.campos[0].y - layout.campos[1].y) < 2, `Campos de entrada na mesma linha em ${width}px`);
        assert(layout.campos[1].x > layout.campos[0].right, 'Campos em colunas distintas');
        assert(Math.abs(layout.grupos[0].y - layout.grupos[1].y) < 2, `Restrição e risco lado a lado em ${width}px`);
        assert(layout.grupos[1].x > layout.grupos[0].right, 'Grupos sem sobreposição');
        assert.deepEqual(layout.legendas, ['rgba(0, 0, 0, 0)','rgba(0, 0, 0, 0)'], 'Legendas sem barras coloridas');
        assert.equal(layout.barras, 0, 'Sem cabeçalhos de card nos grupos de restrição e risco');
      }
      if (width === 1440) {
        const boxes = await page.evaluate(() => ['ev-entrada-title','ev-bases-title'].map(id => {
          const box = document.getElementById(id).closest('section').getBoundingClientRect();
          return {x:box.x,y:box.y,right:box.right,width:box.width};
        }));
        assert(Math.abs(boxes[0].y - boxes[1].y) < 2, 'Seções Entrada e Restrição/Risco alinhadas lado a lado');
        assert(boxes[1].x >= boxes[0].right, 'Seções principais não se sobrepõem');
      }
    }
    if (process.env.SICARD_TEST_SCREENSHOT) {
      await page.evaluate(() => window.Notify.clearAll());
      await page.screenshot({path:process.env.SICARD_TEST_SCREENSHOT,fullPage:true});
    }
    assert.equal(writes.some(path => /hierarquizacoes.*(?:executar|fases)/.test(path)), false, 'Nenhum cálculo legado');
    assert.equal(executions.length,0,'Seleção, prévia, envio e conferência não executam cálculos automaticamente');
    await choose('#ev-risco-browse',['risco']);
    await send();
    await send('risco');
    await verificarExecucao();
    await verificarResultados();
    async function verificarResultados(){
      await page.waitForFunction(()=>!document.querySelector('#ev-resultados-aliases').hidden);
      assert.equal(await page.locator('#ev-resultados-download').isDisabled(),true,'Exportação aguarda revisão');
      const campos=page.locator('#ev-resultados-nomes input');
      assert.equal(await campos.count(),8,'Entradas, bases e feições com nomes revisáveis');
      await page.evaluate(()=>window.L.Map.addInitHook(function(){
        if(this.getContainer().id==='ev-resultados-mapa'){
          window.__mapaResultado=this;
          const fit=this.fitBounds;
          this.fitBounds=function(bounds,options){window.__enquadramento=window.L.latLngBounds(bounds);return fit.call(this,bounds,options)};
        }
      }));
      const nomes=['Demandas Lineares','Faixas de Proteção','Áreas Suscetíveis à Erosão','Demandas Pontuais'];
      for(let i=0;i<4;i++)await campos.nth(i).fill(nomes[i]);
      await page.locator('#ev-resultados-mostrar').click();
      assert.equal(reportRequests.length,0,'Revisão explícita obrigatória');
      await page.locator('#ev-resultados-revisados').check();
      await page.locator('#ev-resultados-mostrar').click();
      await page.waitForFunction(()=>!document.querySelector('#ev-resultados-conteudo').hidden);
      assert.equal(await page.locator('#ev-resultados-entrada option').count(),2);
      assert.equal(await page.locator('#ev-resultados-tabela tbody tr').count(),50,'Paginação na tela');
      assert.match(await page.locator('#ev-resultados-tabela thead').textContent(),/Faixas de Proteção.*Áreas Suscetíveis à Erosão/);
      assert.equal(await page.locator('#ev-resultados-tabela th').last().evaluate(th=>getComputedStyle(th).textTransform),'none',
        'Aliases permanecem em title case, sem transformação visual em caixa alta');
      assert.equal(await page.locator('#ev-resultados-aliases').isHidden(),true,'Revisão recolhida após confirmação');
      assert.ok(await page.locator('#ev-resultados-mapa .leaflet-overlay-pane path').count()>53,'Demandas e interseções reais no Leaflet');
      assert.match(await page.locator('#ev-resultados-tabela tbody tr').first().textContent(),/—/);
      assert.match(await page.locator('#ev-resultados-tabela tbody tr').nth(1).textContent(),/0/);
      await page.locator('#ev-resultados-tabela tbody tr').nth(2).locator('td[data-base] button').first().click();
      assert.equal(await page.locator('#ev-resultados-rosca path').count(),4);
      assert.equal(await page.locator('#ev-resultados-rosca path[aria-pressed="true"]').count(),2,'Tabela destaca as feições da base sem filtrar outras');
      const baseId=reportModels.at(-1).entradas[0].campos[0].id,classeId=`${baseId}::feicao:0`;
      await page.locator('#ev-resultados-rosca').scrollIntoViewIfNeeded();
      const svgBox=await page.locator('#ev-resultados-rosca').boundingBox();
      const x=svgBox.x+(120+84*Math.cos(-Math.PI/2+.3*Math.PI))*svgBox.width/240;
      const y=svgBox.y+(120+84*Math.sin(-Math.PI/2+.3*Math.PI))*svgBox.height/240;
      await page.mouse.move(x,y);await page.mouse.down();
      assert.equal(await page.locator('#ev-resultados-rosca path').first().evaluate(p=>getComputedStyle(p).outlineStyle),'none','Sem retângulo de foco durante o clique');
      await page.mouse.up();
      assert.equal(await page.locator('#ev-resultados-percentual').textContent(),'7,50%');
      assert.equal(await page.locator('#ev-resultados-tabela td.ativa').getAttribute('data-base'),baseId);
      const geos=reportModels.at(-1).entradas[0].intersecoes.features.filter(f=>f.properties.chave==='2'&&f.properties.feicao_id===classeId);
      assert.equal(await page.evaluate(features=>{
        const bounds=window.L.geoJSON({type:'FeatureCollection',features}).getBounds();
        return window.__enquadramento.equals(bounds)&&window.__mapaResultado.getBounds().contains(bounds);
      },geos),true,'Zoom enquadra exatamente as interseções da feição selecionada');
      await page.locator('#ev-resultados-proxima').click();
      assert.equal(await page.locator('#ev-resultados-tabela tbody tr').count(),3);
      assert.match(await page.locator('#ev-resultados-tabela tbody').textContent(),/F-52/);
      await page.selectOption('#ev-resultados-entrada','1');
      assert.match(await page.locator('#ev-resultados-resumo').textContent(),/Demandas Pontuais/);
      for(const width of [390,1440]){
        await page.setViewportSize({width,height:1000});
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`Resultados responsivos em ${width}px`);
      }
      failDownload=true;
      await page.locator('#ev-resultados-download').click();
      await page.waitForFunction(()=>document.querySelector('#ev-resultados-status').textContent.includes('Storage indisponível'));
      assert.equal(await page.locator('#ev-resultados-conteudo').isVisible(),true,'Falha no download preserva resultados');
      failDownload=false;
      const download=page.waitForEvent('download');
      await page.locator('#ev-resultados-download').click();
      assert.equal((await download).suggestedFilename(),'Relatório e Camadas.zip');
      assert.deepEqual(downloadRequests.at(-1),reportRequests.at(-1),'PDF e tela usam os mesmos aliases e execuções, não a página da tabela');
      await page.locator('#ev-resultados-tabela tbody tr').nth(2).locator('td[data-base] button').first().click();
      await page.locator('#ev-resultados-legenda button').first().click();
      if(process.env.SICARD_TEST_RESULT_SCREENSHOT)
        await page.locator('#ev-resultados').screenshot({path:process.env.SICARD_TEST_RESULT_SCREENSHOT});
      await page.locator('#ev-resultados-editar').click();
      await campos.nth(1).fill('Faixas de Proteção Revisadas');
      assert.equal(await page.locator('#ev-resultados-download').isDisabled(),true,'Editar alias invalida exportação anterior');
      assert.equal(await page.locator('#ev-resultados-revisados').isChecked(),false);
      failReport=true;
      await page.locator('#ev-resultados-revisados').check();
      await page.locator('#ev-resultados-mostrar').click();
      await page.waitForFunction(()=>document.querySelector('#ev-resultados-status').textContent.includes('relatório recusado'));
      assert.equal(await page.locator('#ev-resultados-download').isDisabled(),true);
      failReport=false;
    }
    async function verificarExecucao() {
      const checkboxBancada = nome => page.frameLocator('#ea-workbench-frame').getByRole('checkbox',{name:`Exibir ${nome}`,exact:true,includeHidden:true});
      await checkboxBancada('pontos').evaluate(input=>input.click());
      await checkboxBancada('risco').evaluate(input=>input.click());
      await page.locator('iframe').evaluate(f=>f.contentWindow.gpApp.adicionarCamadaGeoJsonEmMemoria('fora-do-calculo','Adicional',
        {type:'FeatureCollection',features:[{type:'Feature',properties:{},geometry:{type:'Point',coordinates:[-47,-23]}}]}));
      const antesDoCalculo=await panel();
      await page.locator('#ev-calcular').click();
      await page.locator('#pfsConfirmCancel').click();
      assert.equal(executions.length,0,'Cancelar confirmação não inicia cálculo');
      await page.locator('#ev-calcular').click();
      await page.locator('#pfsConfirmOk').click();
      await page.waitForFunction(()=>document.querySelector('#ev-status').textContent.includes('camada(s) de saída produzida(s)'));
      await closeProgress();
      assert.equal(executions.length,1,'Entrada desmarcada fica fora da execução');
      assert.equal(executions[0].entrada.nome,'linhas');
      assert.deepEqual(executions[0].restricao.map(c=>c.id),[inputIds[1]]);
      assert.deepEqual(executions[0].risco,[],'Risco desmarcado fica fora da execução');
      const resultado=executionJobs.get('execucao-1').resultado;
      assert.deepEqual(new Set(await panel()),new Set([...antesDoCalculo,resultado.id]),'Saída adicionada sem remover insumos e camadas manuais');
      const saidaNaBancada=await page.locator('iframe').evaluate((f,id)=>f.contentWindow.gpApp.state.layers.find(l=>l.id===id),resultado.id);
      assert.equal(saidaNaBancada.nome,'linhas_elegibilidade_territorial.gpkg');
      assert.equal(saidaNaBancada.arquivo,resultado.arquivo);
      failExecution=true;
      await page.locator('#ev-calcular').click();
      await page.locator('#pfsConfirmOk').click();
      await page.waitForFunction(()=>document.querySelector('#ev-status').dataset.error==='true');
      assert.match(await page.locator('#ev-status').textContent(),/Falha OGR simulada/);
      assert.deepEqual(new Set(await panel()),new Set([...antesDoCalculo,resultado.id]),'Falha não remove saída anterior nem adiciona sucesso falso');
      await closeProgress();
      failExecution=false;
      await checkboxBancada('pontos').evaluate(input=>input.click());
      await checkboxBancada('risco').evaluate(input=>input.click());
      await page.locator('#ev-calcular').click();
      await page.locator('#pfsConfirmOk').click();
      await page.waitForFunction(()=>document.querySelector('#ev-status').textContent.startsWith('2 camada(s) de saída'));
      await closeProgress();
      assert.equal(executions.length,4,'Cada entrada gera uma saída independente');
      assert.equal(executionJobs.get('execucao-4').resultado.nome,'pontos_elegibilidade_territorial.gpkg');
      assert.deepEqual(executions[3].risco.map(c=>c.id),[inputIds[3]]);
    }
    assert.deepEqual(errors, [], 'Sem erros JavaScript');
    const buttonStyle = selector => page.locator(selector).evaluate(el => {
      const css = getComputedStyle(el);
      return Object.fromEntries(['width','height','borderRadius','fontFamily','fontSize','fontWeight',
        'color','backgroundColor','borderTopColor','borderTopWidth','paddingTop','paddingLeft'].map(key => [key,css[key]]));
    });
    await page.mouse.move(0,0);
    const normal = await buttonStyle('#ev-entrada-browse');
    const primary = await buttonStyle('#ev-restricao-enviar');
    assert.equal(normal.width, '28px');
    assert.equal(normal.height, '28px');
    assert.equal(primary.width, '28px');
    assert.equal(primary.height, '28px');
    assert.equal(normal.fontSize, '12px');
    const buttonSkin = ({width,height,fontSize,borderRadius,...skin}) => skin;
    await page.locator('#ev-entrada-browse').hover();
    await page.waitForTimeout(200);
    const hovered = await buttonStyle('#ev-entrada-browse');
    const workbenchStyle = () => page.evaluate(() => {
      const keys = ['backgroundColor','color','fontFamily','fontSize','fontWeight','borderRadius',
        'borderTopWidth','borderTopColor','paddingTop','paddingRight','paddingBottom','paddingLeft'];
      const style = el => {
        const css = getComputedStyle(el);
        return Object.fromEntries(keys.map(key => [key,css[key]]));
      };
      const frame = document.getElementById('ea-workbench-frame');
      return {
        source:frame.getAttribute('src'),
        section:style(document.getElementById('ea-workbench')),
        header:style(document.querySelector('#ea-workbench > header')),
        title:style(document.querySelector('#ea-workbench > header h2')),
        number:style(document.querySelector('#ea-workbench .ea-number')),
        frame:style(frame),
        frameHeight:frame.getBoundingClientRect().height,
        inset:frame.getBoundingClientRect().left - document.getElementById('ea-workbench').getBoundingClientRect().left,
        interior:['.gp-titlebar','.gp-ribbon','.gp-ribbon-tabs button','.gp-left-rail','.gp-statusbar']
          .map(selector => style(frame.contentDocument.querySelector(selector))),
        stylesheets:[...frame.contentDocument.querySelectorAll('link[rel=stylesheet]')].map(link => link.href),
      };
    });
    const workbench = await workbenchStyle();
    const checkupStyle = () => page.locator('.ea-checkup').evaluate(section => {
      const style = el => {
        const css = getComputedStyle(el);
        return Object.fromEntries(['backgroundColor','color','fontFamily','fontSize','fontWeight','borderRadius','borderTopColor','borderTopWidth','paddingTop','paddingLeft'].map(key => [key,css[key]]));
      };
      return {section:style(section),title:style(section.querySelector('h4')),hint:style(section.querySelector('.ea-hint')),button:style(section.querySelector('.ea-execute button'))};
    });
    const conferenciaStyle = await checkupStyle();
    await page.goto(`${base}/restrict/geoespacial/extracao-atributos/`, {waitUntil:'networkidle'});
    await page.waitForFunction(() => document.querySelector('#ea-workbench-frame').contentDocument.body.classList.contains('ea-embedded-workbench'));
    assert.deepEqual(await workbenchStyle(), workbench, 'Bancada usa o mesmo visual, documento e dimensões verticais do extrator');
    assert.deepEqual(await checkupStyle(),conferenciaStyle,'Conferir e executar preserva o visual da página de extração');
    assert.deepEqual(buttonSkin(await buttonStyle('#ea-input-browse')), buttonSkin(normal), 'Botão menor preserva cores e tipografia da referência');
    assert.deepEqual(buttonSkin(await buttonStyle('#ea-identificacao-confirmar')), buttonSkin(primary), 'Botão primário menor preserva a referência');
    await page.locator('#ea-input-browse').hover();
    await page.waitForTimeout(200);
    assert.deepEqual(buttonSkin(await buttonStyle('#ea-input-browse')), buttonSkin(hovered), 'Hover preserva cores da referência');
    const defaultReads = [inventories.length, preparations.length];
    await page.locator('#ea-input-browse').click();
    const defaultExplorer = page.locator('dialog.ea-storage-dialog');
    await defaultExplorer.locator('.ea-storage-tree-open', {hasText:'Bases geoespaciais'}).click();
    await defaultExplorer.locator(`[data-file="${inputIds[0]}"]`).click();
    await defaultExplorer.locator('.ea-storage-confirm-button').click();
    await defaultExplorer.locator('#pfsConfirmCancel').click();
    assert.deepEqual([inventories.length, preparations.length], defaultReads, 'Extrator mantém confirmação antes da leitura');
    await defaultExplorer.locator('.ea-storage-confirm-button').click();
    await defaultExplorer.locator('#pfsConfirmOk').click();
    await defaultExplorer.waitFor({state:'detached'});
    assert.deepEqual([inventories.length, preparations.length], defaultReads.map(n => n+1), 'Fluxo padrão do extrator continua identificando e validando no seu próprio momento');
    console.log('PASS: seleção -> prévia -> bancada, conferência por papel, visibilidade, remoções, camadas adicionais, referências integrais, cálculo bloqueado, paridade visual, cancelamento e responsividade.');
    console.log(`Confirmar: máximo ${Math.max(...selectionTimes)} ms; nenhuma chamada de inventário/preparação. Campos identificados: OK.`);
  } finally { await browser.close(); }
})().catch(error => {console.error(error); process.exitCode = 1;});
