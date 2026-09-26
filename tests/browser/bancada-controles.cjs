// UI real, respostas isoladas: nunca envia gravações ao banco oficial.
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
(async()=>{
 const server=http.createServer((req,res)=>{
  let name=new URL(req.url,'http://local').pathname;
  if(name==='/')name='/templates/componentes/_geoprocessamento.html';
  name=name.replace('/restrict/geoespacial/','/geoespacial/');
  const file=path.join(root,name);
  if(!file.startsWith(root+'/')){res.writeHead(403).end();return;}
  fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end();return;}res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'application/octet-stream');res.end(data);});
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--no-proxy-server','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
 try{
 const p=await browser.newPage({viewport:{width:1600,height:1100}}),errors=[],requests=[],payloads=[];
 p.on('pageerror',e=>errors.push(e.stack||e.message));
 const fc={type:'FeatureCollection',features:[{type:'Feature',id:1,properties:{valor:2},geometry:{type:'Point',coordinates:[-46,-23]}}]};
 await p.route('**/api/**',r=>{
  const u=new URL(r.request().url()),url=u.pathname;requests.push({url,method:r.request().method()});
  let body=[];
  if(url.includes('/operacoes-jobs/OP-')){payloads.push({op:url.split('/').pop(),params:r.request().postDataJSON()});return r.fulfill({json:{id:'job-test',status:'concluido',total:3,resultado:{validado:true}}});}
  if(url.endsWith('/bancada-arquivos/salvar')){const data=r.request().postDataJSON();return r.fulfill({json:{id:data.camada_id,nome:'Arquivo de teste',arquivo:data.arquivo,revisao:'b'.repeat(64),geojson:data.geojson,campos:[{nome:'valor',tipo:'Real'}]}});}
  if(url.endsWith('/consultar-atributos')||url.endsWith('/bancada-arquivos/consultar'))body={geojson:fc,total:1};
  if(url.endsWith('/ambientes'))body={};
  if(url.endsWith('/catalogo/projeto'))body={toolboxes:[]};
  if(url.endsWith('/camadas'))body=[{id:'pontos',nome:'Pontos',tipo:'vetorial',crs:'EPSG:4326',destino:'catalogo'},{id:'raster',nome:'Raster',tipo:'raster',crs:'EPSG:3857'}];
  if(url.endsWith('/geojson'))body=fc;
  if(url.endsWith('/preview'))body={image:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jK1kAAAAASUVORK5CYII=',coordinates:[[-46,-22],[-45,-22],[-45,-23],[-46,-23]]};
  if(url.endsWith('/bounds'))body={bounds:[-46,-23,-45,-22]};
  if(url.endsWith('/simbologia/campos'))body={campos:[],total:1};
  if(url.endsWith('/atributos')||url.endsWith('/atributos/tabela'))body={colunas:[{nome:'valor',tipo:'float64'}],registros:[{valor:2,_indice:0,__gp_feature:fc.features[0]}],total:1,offset:0,limite:100};
  if(url.endsWith('/extracao-atributos/catalogo'))body={camadas:[]};
  if(url.endsWith('/storage/navegar'))body=u.searchParams.get('caminho')==='base-geoespacial/teste'?{pai:'base-geoespacial',pastas:[],arquivos:[{id:'storage:teste',nome:'Teste',arquivo:'base-geoespacial/teste/teste.geojson',geometria_tipo:'Point'}]}:{pastas:[{nome:'Teste',caminho:'base-geoespacial/teste'}],arquivos:[]};
  if(url.endsWith('/extracao-atributos/arquivo-mapa'))body={id:'storage:teste',nome:'Teste',arquivo:'base-geoespacial/teste/teste.geojson',revisao:'a'.repeat(64),geojson:fc,campos:[{nome:'valor',tipo:'Real'}]};
  return r.fulfill({json:body});
 });
 await p.goto(`http://127.0.0.1:${server.address().port}/`,{waitUntil:'domcontentloaded'});
 await p.waitForFunction(()=>window.gpApp?.state.map?.isStyleLoaded());
 await p.waitForTimeout(500);
 await p.evaluate(()=>{gpApp.state.layers=[{id:'pontos',nome:'Pontos',tipo:'vetorial',crs:'EPSG:4326'},{id:'raster',nome:'Raster',tipo:'raster',crs:'EPSG:3857'}];});
 // A bancada autônoma fornece o feedback exigido pelo explorador compartilhado.
 assert.equal(await p.evaluate(()=>typeof window.ProcessFeedback?.iniciarCadastro),'function');
 await p.locator('[data-action="load-system"]').click();
 await p.locator('.ea-storage-entry--folder').filter({hasText:'Teste'}).click().catch(async error=>{console.error(await p.locator('body').innerText());console.error(errors);throw error;});
 await p.locator('[aria-label="Subir um nível (Backspace)"]').click();
 await p.locator('.ea-storage-entry--folder').filter({hasText:'Teste'}).click();
 await p.locator('.ea-storage-entry[data-file="storage:teste"]').click();
 await p.getByRole('button',{name:'Confirmar (1)',exact:true}).click();
 await p.waitForFunction(()=>gpArquivos.sessions.has('storage:teste')).catch(async error=>{console.error(errors);console.error(await p.locator('body').innerText());throw error;});
 await p.waitForFunction(()=>!document.querySelector('.ea-storage-dialog'));
 await p.waitForFunction(()=>gpApp.state.layers.some(l=>l.id==='storage:teste'));
 await p.evaluate(()=>gpApp.removeLayerFromMap('storage:teste',false));
 const forms=[];
 for(const op of await p.evaluate(()=>gpApp.operations)){
  await p.evaluate(id=>gpApp.selectOp(id),op.id);
  const form=await p.locator('#gp-op-form').evaluate(f=>({id:f.dataset.op,fields:[...f.elements].filter(e=>e.name).map(e=>({name:e.name,type:e.type,value:e.value,required:e.required,options:e.options?[...e.options].map(o=>o.value):null}))}));
  forms.push(form);
  await p.locator('#gp-op-form').evaluate(f=>{
    for(const e of f.elements){
      if(e.tagName==='SELECT'&&e.options[0]?.value===''){
        const value=e.name.startsWith('raster')?'raster':'pontos';
        for(const option of e.options)option.selected=option.value===value;
      }
      if(e.required&&!e.value&&['text','number'].includes(e.type))e.value=e.type==='number'?'1':'valor';
    }
    if(f.elements.tipo_entrada)f.elements.tipo_entrada.value='WFS';
    if(f.elements.caminho_arquivo)f.elements.caminho_arquivo.value='https://example.invalid/wfs';
    f.requestSubmit();
  });
  await p.locator(".gp-feedback-confirm button.primary").click();
  await p.waitForFunction(()=>!gpApp.state.activeExecution);
  assert.equal(payloads.at(-1)?.op,op.id,`Botão Executar deve enviar ${op.id}`);
  if(await p.locator('#gp-operation-result').evaluate(d=>d.open))await p.locator('#gp-operation-result-close').click();
  assert(form.fields.length>0,op.id);
 }
 fs.writeFileSync('/tmp/sicard-bancada-forms.json',JSON.stringify(forms,null,2));
 assert.equal(payloads.length,43);
 assert.equal(payloads.find(p=>p.op==='OP-25').params.formato_saida,'JSON');
 assert(!('distancia_maxima' in payloads.find(p=>p.op==='OP-10').params));
 // Filtrar uma fonte vetorial em tiles e restaurar o tipo original.
 await p.evaluate(()=>{const a=gpApp,m=a.state.map;a.state.activeLayerId='pontos';for(const layer of m.getStyle().layers.filter(l=>l.source==='pontos'))m.removeLayer(layer.id);if(m.getSource('pontos'))m.removeSource('pontos');m.addSource('pontos',{type:'vector',tiles:[location.origin+'/api/test/{z}/{x}/{y}.pbf']});m.addLayer({id:'pontos',type:'circle',source:'pontos','source-layer':'camada'});});
 await p.evaluate(()=>gpCommands.filterLayer());
 await p.locator('#gp-query-attributes textarea').fill('valor > 0');
 await p.locator('#gp-query-attributes button.primary').click();
 await p.waitForFunction(()=>gpApp.state.map.getSource('pontos').type==='geojson');
 await p.locator('[data-clear-filter]').click();
 await p.waitForFunction(()=>gpApp.state.map.getSource('pontos').type==='vector');
 await p.evaluate(()=>{gpApp.state.activeLayerId=null;});
 // Abrir cada guia e todos os comandos sem pré-requisitos de gravação.
 for(const tab of ['mapa','analise','modelo','dados']){
  await p.locator(`[data-ribbon="${tab}"]`).click();
  const actions=await p.locator('#gp-ribbon-tools [data-action]').evaluateAll(xs=>xs.map(x=>x.dataset.action));
  for(const action of actions){
   if(action.startsWith('model-')||['run','delete-layer','remove','homologate-layer','load-system','import-definition'].includes(action))continue;
   await p.locator(`[data-action="${action}"]`).click();
   await p.waitForTimeout(30);
  }
 }
 // Sessão de arquivo: seleção, edição de atributo, desfazer/refazer e gravação.
 await p.evaluate(fc=>gpArquivos.adicionar({id:'arquivo',nome:'Arquivo de teste',arquivo:'outputs/teste.gpkg',revisao:'a'.repeat(64),geojson:fc,campos:[{nome:'valor',tipo:'Real'}]}),fc);
 await p.waitForFunction(()=>gpApp.state.activeLayerId==='arquivo');
 // Tabulator: grade única, paginação, consulta, edição e seleção no mapa.
 await p.evaluate(()=>gpApp.showAttributes('pontos'));
 await p.waitForSelector('.tabulator-row');
 assert.equal(await p.locator('.tabulator-header-filter').count(),0);
 assert(await p.locator('.tabulator-page[data-page="first"],.tabulator-page[data-page="prev"],.tabulator-page[data-page="next"],.tabulator-page[data-page="last"]').evaluateAll(buttons=>buttons.length===4&&buttons.every(b=>b.querySelector('svg')&&!b.textContent.trim()&&b.title&&b.getAttribute('aria-label'))));
 assert.equal(await p.locator('.tabulator-cell[tabulator-field="valor"]').first().evaluate(e=>getComputedStyle(e).fontSize),'11px');

 assert(await p.locator('.attribute-toolbar button').evaluateAll(buttons=>buttons.every(b=>b.querySelector('svg')&&b.title&&b.getAttribute('aria-label')&&!b.textContent.trim())));

 await p.evaluate(()=>gpCommands.setLayerSelection('pontos',[{type:'Feature',properties:{valor:2,__gp_indice:0},geometry:{type:'Point',coordinates:[-46,-23]}}]));
 assert.equal(await p.evaluate(()=>gpAttributeTable.grid.getSelectedData().length),1);
 assert.equal(await p.evaluate(()=>gpApp.state.selectedGeoJSON.features.find(f=>f.properties.__gp_layer_id==='pontos').id),1);
 await p.evaluate(()=>gpCommands.clearSelection());
 await p.evaluate(()=>gpArquivos.tabela());
 await p.waitForSelector('.tabulator-row');
 assert.equal(await p.locator('.gp-file-dialog[open]').count(),0);
 await p.locator('[data-at-maximize]').click();
 assert.equal(await p.locator('.attribute-maximized').count(),1);
 assert.equal(await p.locator('.tabulator-cell[tabulator-field="valor"]').first().evaluate(e=>getComputedStyle(e).fontSize),'14px');

 await p.keyboard.press('Escape');
 assert.equal(await p.locator('.attribute-maximized').count(),0);
 await p.evaluate(fc=>gpApp.adicionarCamadaGeoJsonEmMemoria('memoria','Resultado em memória',{...fc,features:Array.from({length:105},(_,i)=>({...fc.features[0],id:i,properties:{valor:i,categoria:i%2?'Linha B':'Linha A'}}))}),fc);
 await p.waitForFunction(()=>gpApp.state.layers.some(l=>l.id==='memoria'));
 await p.evaluate(()=>gpApp.showAttributes('memoria'));
 await p.waitForFunction(()=>gpAttributeTable.grid.getDataCount()===105);
 await p.locator('.tabulator-page[data-page="next"]').click();
 await p.waitForFunction(()=>gpAttributeTable.grid.getPage()===2);
 await p.locator('.tabulator-row').first().click();
 assert.equal(await p.evaluate(()=>gpApp.state.selectedGeoJSON.features[0].id),100);
 await p.locator('.attribute-query summary').click();
 assert.equal(await p.locator('[data-at-values] option').count(),105);
 await p.locator('[data-at-field]').selectOption('categoria');
 assert.deepEqual(await p.locator('[data-at-values] option').evaluateAll(options=>options.map(o=>o.value)),['Linha A','Linha B']);
 await p.locator('[data-at-value]').fill('Valor livre');
 assert.equal(await p.locator('[data-at-value]').inputValue(),'Valor livre');
 await p.locator('[data-at-field]').selectOption('valor');
 assert.equal(await p.locator('[data-at-value]').inputValue(),'');

 await p.locator('[data-at-operator]').selectOption('>=');
 await p.locator('[data-at-value]').fill('102');
 await p.locator('[data-at-query] button').click();
 assert.equal(await p.evaluate(()=>gpApp.state.selectedGeoJSON.features.length),3);
 await p.locator('[data-at-scope]').selectOption('selection');
 await p.locator('[data-at-operator]').selectOption('=');
 await p.locator('[data-at-value]').fill('103');
 await p.locator('[data-at-query] button').click();
 assert.deepEqual(await p.evaluate(()=>gpApp.state.selectedGeoJSON.features.map(f=>f.id)),[103]);
 await p.locator('[data-at-only]').click();
 assert.equal(await p.locator('[data-at-only]').getAttribute('aria-pressed'),'true');
 assert.equal(await p.evaluate(()=>gpAttributeTable.grid.getDataCount('active')),1);
 await p.locator('[data-at-only]').click();
 assert.equal(await p.evaluate(()=>gpAttributeTable.grid.getDataCount('active')),105);
 await p.evaluate(()=>gpAttributeTable.grid.setPage(2));

 await p.locator('[data-at-action="edit"]').click();
 await p.evaluate(()=>gpAttributeTable.grid.getRow(103).getCell('valor').edit());
 await p.locator('.tabulator-cell.tabulator-editing input').fill('777');
 await p.locator('.tabulator-cell.tabulator-editing input').press('Enter');
 assert(await p.locator('[data-at-save]').isEnabled());
 await p.locator('[data-at-action="undo"]').click();
 assert.equal(await p.evaluate(()=>gpAttributeTable.grid.getRow(103).getData().valor),103);
 await p.locator('[data-at-action="redo"]').click();
 assert.equal(await p.evaluate(()=>gpAttributeTable.grid.getRow(103).getData().valor),777);
 await p.locator('[data-at-discard]').click();
 await p.waitForFunction(()=>gpAttributeTable.grid.getData().find(r=>r.__gp_row===103)?.valor===103);
 await p.locator('[data-at-maximize]').click();
 await p.screenshot({path:'/tmp/sicard-tabela-maximizada.png'});
 await p.keyboard.press('Escape');
 await p.screenshot({path:'/tmp/sicard-tabela-painel.png'});
 const customConfirmation=await p.evaluate(()=>Boolean(window.gpFeedback));
 if(!customConfirmation)p.once('dialog',dialog=>dialog.accept());
 await p.locator('[data-at-action="delete"]').click();
 if(customConfirmation)await p.locator('.gp-feedback-confirm button.primary').click();
 await p.waitForFunction(()=>gpAttributeTable.grid.getDataCount()===104);
 await p.locator('[data-at-save]').click();
 await p.locator('.gp-feedback-confirm button.primary').click();
 await p.waitForFunction(()=>gpApp.state.map.getSource('memoria')._data.features.length===104);
 await p.waitForFunction(()=>document.querySelector('[data-at-save]')?.disabled===true);
 await p.waitForSelector('.tabulator-row');
 await p.locator('[data-at-action="edit"]').click();
 await p.evaluate(()=>gpAttributeTable.grid.getRow(0).getCell('valor').edit());
 await p.locator('.tabulator-cell.tabulator-editing input').fill('888');
 await p.locator('.tabulator-cell.tabulator-editing input').press('Enter');
 await p.locator('[data-at-save]').click();
 await p.locator('.gp-feedback-confirm button.primary').click();
 await p.waitForFunction(()=>gpApp.state.map.getSource('memoria')._data.features[0].properties.valor===888);

 await p.evaluate(()=>gpCommands.clearSelection());
 await p.locator('[data-attribute-layer="arquivo"]').click();
 await p.waitForFunction(()=>gpAttributeTable.grid.getDataCount()===1);
 await p.locator('.tabulator-row').first().click();
 assert.equal(await p.evaluate(()=>gpApp.state.selectedGeoJSON.features[0].properties.__gp_layer_id),'arquivo');
 await p.evaluate(()=>{gpCommands.clearSelection();gpCommands.selectOnMap();gpApp.state.map.jumpTo({center:[-46,-23],zoom:12});});
 await p.waitForTimeout(500);
 const point=await p.evaluate(()=>{const p=gpApp.state.map.project([-46,-23]);return {x:p.x,y:p.y};});
 await p.locator('.maplibregl-canvas').click({position:point});
 await p.waitForFunction(()=>gpApp.state.selectedGeoJSON.features.length>0);
 await p.waitForSelector('.tabulator-selected');
 await p.evaluate(()=>{gpCommands.clearSelection();gpApp.state.activeLayerId='arquivo';});
 await p.locator('[data-ribbon="editar"]').click();
 await p.locator('[data-file-action="start"]').click();
 await p.locator('.gp-file-table tbody button').first().click();
 await p.getByLabel('valor — feição 1',{exact:true}).fill('9');
 await p.getByLabel('valor — feição 1',{exact:true}).press('Tab');
 assert(await p.locator('[data-file-action="undo"]').isEnabled());
 await p.locator('[data-file-action="undo"]').click();
 assert.equal(await p.getByLabel('valor — feição 1',{exact:true}).inputValue(),'2');
 await p.locator('[data-file-action="redo"]').click();
 assert.equal(await p.getByLabel('valor — feição 1',{exact:true}).inputValue(),'9');
 await p.locator('[data-file-action="save"]').click();
 await p.locator('.gp-feedback-confirm button.primary').click();
 await p.waitForFunction(()=>gpArquivos.sessions.get('arquivo')?.revisao==='b'.repeat(64));
 assert.equal(await p.evaluate(()=>gpArquivos.sessions.get('arquivo').geojson.features[0].properties.valor),9);
 assert(requests.some(r=>r.url.endsWith('/bancada-arquivos/salvar')&&r.method==='POST'));
 // A própria grade salva a edição do arquivo pela API de edição do original.
 await p.evaluate(()=>gpApp.showAttributes('arquivo'));
 await p.waitForSelector('.tabulator-row');
 await p.locator('[data-at-action="edit"]').click();
 await p.locator('.tabulator-cell[tabulator-field="valor"]').first().dblclick();
 await p.locator('.tabulator-cell.tabulator-editing input').fill('11');
 await p.locator('.tabulator-cell.tabulator-editing input').press('Enter');
 await p.locator('[data-at-save]').click();
 await p.locator('.gp-feedback-confirm button.primary').click();
 await p.waitForFunction(()=>gpArquivos.sessions.get('arquivo').geojson.features[0].properties.valor===11);
 await p.waitForFunction(()=>document.querySelector('[data-at-save]')?.disabled===true);
 const download=p.waitForEvent('download');
 await p.locator('[data-at-action="csv"]').click();
 assert((await download).suggestedFilename().endsWith('.csv'));
 // Resultado de função/fluxo deve entrar no mapa, mesmo sem estar na sessão anterior.
 await p.evaluate(()=>{gpApp.removeLayerFromMap('pontos',false);return gpApp.syncExecutionResults({resultados:[{camada_id:'pontos'}]});});
 assert(await p.evaluate(()=>Boolean(gpApp.state.map.getSource('pontos'))));
 // Definições legadas com diagrama vazio devem reconstruir seus passos.
 await p.evaluate(()=>gpModeler.open('function',{id:'legacy',nome:'Legada',diagrama:{},passos:[{algoritmo_id:'OP-28',parametros:{camada_id:'pontos'}}]}));
 assert(await p.evaluate(()=>gpModeler._debug.activeEditor().nodes.some(n=>n.ref==='OP-28')));
 const before=await p.evaluate(()=>gpModeler._debug.activeEditor().nodes.length);
 await p.locator('[data-model-command="model-input"]').click();
 assert.equal(await p.evaluate(()=>gpModeler._debug.activeEditor().nodes.length),before+1);
 await p.locator('[data-model-command="model-layout"]').click();
 await p.locator('[data-model-command="model-fit"]').click();
 console.log(JSON.stringify({forms:forms.length,errors,requests:requests.length,submitted:payloads.length}));
 assert.deepEqual(errors,[]);
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
