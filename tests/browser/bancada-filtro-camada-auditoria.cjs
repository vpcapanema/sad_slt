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
 const p=await browser.newPage({viewport:{width:1600,height:1100}}),errors=[],requests=[],payloads=[],filePayloads=[];
 p.on('pageerror',e=>errors.push(e.stack||e.message));
 const savedFiles=new Map();
 const fc={type:'FeatureCollection',features:[1,2,3].map(id=>({type:'Feature',id,properties:{valor:id},geometry:{type:'Point',coordinates:[-46+id/100,-23]}}))};
 await p.route('**/api/**',r=>{
  const u=new URL(r.request().url()),url=u.pathname;requests.push({url,method:r.request().method()});
  let body=[];
  if(url.endsWith('/bancada-arquivos/executar-job')){filePayloads.push(r.request().postDataJSON());return r.fulfill({json:{id:'file-job',status:'concluido',resultado:{execucao_id:'synthetic',resultado:{validado:true}}}});}
  if(url.includes('/operacoes-jobs/OP-')){payloads.push({op:url.split('/').pop(),params:r.request().postDataJSON()});return r.fulfill({json:{id:'job-test',status:'concluido',total:3,resultado:{validado:true}}});}
  if(url.endsWith('/bancada-arquivos/salvar')){const data=r.request().postDataJSON(),prior=savedFiles.get(data.camada_id);if(prior&&data.revisao!==prior.revisao)return r.fulfill({status:422,json:{detail:'O arquivo mudou desde a abertura.'}});const file={id:data.camada_id,nome:'Arquivo de teste',arquivo:data.arquivo,revisao:prior?(prior.revisao==='b'.repeat(64)?'c':'d').repeat(64):'b'.repeat(64),geojson:data.geojson,campos:[{nome:'valor',tipo:'Real'}]};savedFiles.set(file.id,file);return r.fulfill({json:file});}
  if(url.endsWith('/extracao-atributos/arquivo-mapa')){const data=r.request().postDataJSON(),saved=[...savedFiles.values()].find(file=>data.id?file.id===data.id:file.arquivo===data.arquivo);if(saved)return r.fulfill({json:saved});}
  if(url.endsWith('/consultar-atributos')||url.endsWith('/bancada-arquivos/consultar')){const data=r.request().postDataJSON(),expr=data?.expressao||u.searchParams.get('expressao'),all=(savedFiles.get(data?.camada_id)?.geojson||fc).features,limit=expr==='valor < 0'?0:3,features=all.filter(f=>f.properties.valor<limit);body={geojson:{type:'FeatureCollection',features},total:features.length};}
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

 await p.evaluate(fc=>gpArquivos.adicionar({id:'arquivo',nome:'Arquivo de teste',arquivo:'outputs/teste.geojson',revisao:'a'.repeat(64),geojson:fc,campos:[{nome:'valor',tipo:'Real'}]}),fc);
 await p.waitForFunction(()=>gpApp.state.activeLayerId==='arquivo');
 await p.evaluate(fc=>gpCommands.setLayerSelection('outra',[fc.features[2]]),fc);
 const filter=async expression=>{await p.evaluate(()=>{gpApp.state.activeLayerId='arquivo';gpCommands.filterLayer();});await p.locator('#gp-query-attributes textarea').fill(expression);await p.locator('#gp-query-attributes button.primary').click();await p.waitForFunction(expression=>gpApp.state.layerFilters?.arquivo===expression,expression);};
 await filter('valor < 3');await p.evaluate(()=>gpApp.showAttributes('arquivo'));
 await p.waitForFunction(()=>gpAttributeTable.grid?.getData().length===3&&gpAttributeTable.grid.getData('active').length===2);
 assert.deepEqual(await p.evaluate(()=>gpAttributeTable.grid.getData('active').map(r=>r.__gp_feature.id)),[1,2]);
 await p.evaluate(()=>gpAttributeTable.grid.selectRow(0));await p.locator('[data-at-action="invert"]').click();
 assert.deepEqual(await p.evaluate(()=>gpAttributeTable.grid.getSelectedData().map(r=>r.__gp_feature.id)),[2]);
 assert(await p.evaluate(()=>gpApp.state.selectedGeoJSON.features.some(f=>f.properties.__gp_layer_id==='outra')));
 await p.locator('[data-at-action="clear"]').click();
 assert.equal(await p.evaluate(()=>gpAttributeTable.grid.getSelectedData().length),0);
 assert.equal(await p.evaluate(()=>gpAttributeTable.grid.getData('active').length),2);
 await p.locator('[data-at-action="edit"]').click();await p.evaluate(()=>gpAttributeTable.grid.getRow(0).getCell('valor').edit());
 await p.locator('.tabulator-cell.tabulator-editing input').fill('99');await p.locator('.tabulator-cell.tabulator-editing input').press('Enter');
 await p.locator('[data-at-save]').click();await p.locator('.gp-feedback-confirm button.primary').click();
 await p.waitForFunction(()=>gpArquivos.sessions.get('arquivo').revisao==='b'.repeat(64));
 await p.waitForFunction(()=>gpAttributeTable.grid?.getData('active').length===1);
 const saved=savedFiles.get('arquivo');assert.equal(saved.geojson.features.length,3);assert.equal(saved.geojson.features.find(f=>f.id===3).properties.valor,3);assert.equal(saved.geojson.features.find(f=>f.id===1).properties.valor,99);
 await filter('valor < 0');await p.evaluate(()=>gpApp.showAttributes('arquivo'));await p.waitForFunction(()=>gpAttributeTable.grid?.getData('active').length===0);
 assert.equal(await p.evaluate(()=>gpAttributeTable.grid.getData().length),3);await p.locator('[data-at-action="invert"]').click();assert.equal(await p.evaluate(()=>gpAttributeTable.grid.getSelectedData().length),0);
 await p.evaluate(()=>gpCommands.filterLayer());await p.locator('[data-clear-filter]').click();await p.waitForFunction(()=>!gpApp.state.layerFilters.arquivo);
 await p.evaluate(()=>gpApp.showAttributes('arquivo'));await p.waitForFunction(()=>gpAttributeTable.grid?.getData('active').length===3);
 await p.evaluate(()=>{gpApp.state.layerFilters.pontos='valor < 3';gpApp.state.activeLayerId='pontos';gpApp.selectOp('OP-37');});
 await p.evaluate(()=>{const f=document.querySelector('#gp-op-form');f.elements.camada_id.value='pontos';if(f.elements.nome_saida)f.elements.nome_saida.value='Auditoria';f.requestSubmit();});
 await p.locator('.gp-feedback-confirm button.primary').click();await p.waitForFunction(()=>!gpApp.state.activeExecution);
 assert.equal(payloads.at(-1).params.filtros_camadas.pontos,'valor < 3');
 if(await p.locator('#gp-operation-result').evaluate(d=>d.open))await p.locator('#gp-operation-result-close').click();
 await p.evaluate(()=>{gpApp.state.layerFilters.arquivo='valor < 3';gpApp.state.activeLayerId='arquivo';gpApp.selectOp('OP-37');});
 await p.evaluate(()=>{const f=document.querySelector('#gp-op-form');f.elements.camada_id.value='arquivo';if(f.elements.nome_saida)f.elements.nome_saida.value='AuditoriaArquivo';f.requestSubmit();});
 await p.locator('.gp-feedback-confirm button.primary').click();await p.waitForFunction(()=>gpApp.state.history.some(h=>h.result?.execucao_id==='synthetic'));
 assert.equal(filePayloads.at(-1).parametros.filtros_camadas.arquivo,'valor < 3');assert.equal(filePayloads.at(-1).arquivos.arquivo.arquivo,'outputs/teste.geojson');assert(!filePayloads.at(-1).parametros.filtros_camadas.pontos);
 assert.deepEqual(errors,[]);console.log('PASS filtro UI: full3/active2, inversão, seleção entre camadas, edição storage preserva ocultos, reavaliar, vazio/limpar e payloads catálogo/arquivos.');
 }finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
})().catch(error=>{console.error(error);process.exitCode=1;});
