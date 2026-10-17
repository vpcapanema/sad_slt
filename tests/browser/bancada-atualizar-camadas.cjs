const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const root=path.resolve(__dirname,'../..');

(async()=>{
 const server=http.createServer((req,res)=>{
  let name=new URL(req.url,'http://local').pathname;
  if(name==='/')name='/templates/componentes/_geoprocessamento.html';
  const file=path.resolve(root,`.${name.replace('/restrict/geoespacial/','/geoespacial/')}`);
  if(path.relative(root,file).startsWith('..')){res.writeHead(403).end();return;}
  fs.readFile(file,(error,data)=>{
   if(error){res.writeHead(404).end();return;}
   res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'application/octet-stream');
   res.end(data);
  });
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try{
  browser=await chromium.launch({headless:true,...(process.env.PW_CHROMIUM?{executablePath:process.env.PW_CHROMIUM}:{}),args:['--no-sandbox','--no-proxy-server','--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[],requests=[];
  page.on('pageerror',error=>errors.push(error.stack||error.message));
  const native={id:'storage:base-geoespacial/projetos/trechos.gpkg::Linhas',nome:'Trechos',arquivo:'base-geoespacial/projetos/trechos.gpkg',representacao:'tiles',revisao:'rev-1',campos:[{nome:'nome',tipo:'String'}],campo_fid_tile:'slt_fid',crs_arquivo:'EPSG:4326',feicoes:1,geometria_tipo:'LineString',bounds:[-47,-24,-46,-23]};
  const catalog={id:'catalogo-rios',nome:'Rios',tipo:'vetorial',destino:'banco',caminho_arquivo:'data/geoespacial/rios.gpkg',geometria_tipo:'LineString'};
  const memory={id:'memoria-pontos',nome:'Pontos',tipo:'vetorial',destino:'memoria'};
  const fc={type:'FeatureCollection',features:[{type:'Feature',id:1,properties:{nome:'Rio'},geometry:{type:'Point',coordinates:[-46.5,-23.5]}}]};
  const raster={id:'storage:superficies-indices/indice.tif',nome:'Indice',arquivo:'superficies-indices/indice.tif',tipo:'raster'};
  let revision=1,failNative=false,releaseNative=null;
  await page.route('https://**/*',route=>{
   if(new URL(route.request().url()).pathname.endsWith('.json'))return route.fulfill({json:{}});
   return route.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==','base64')});
  });
  await page.route('**/api/**',async route=>{
   const url=new URL(route.request().url()),name=url.pathname;
   requests.push({name,method:route.request().method(),query:url.search});
   if(name.endsWith('/bancada-arquivos/preparar')){
    if(releaseNative)await new Promise(resolve=>{releaseNative=resolve;});
    return route.fulfill(failNative?{status:503,json:{detail:'Storage indisponível no teste'}}:{json:{...native,revisao:`rev-${++revision}`}});
   }
   if(name.endsWith('/storage/camada/raster-preview'))return route.fulfill({json:{image:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==',coordinates:[[-47,-23],[-46,-23],[-46,-24],[-47,-24]],bounds:[-47,-24,-46,-23]}});
   if(name.endsWith('/extracao-atributos/arquivo-mapa')){
    const body=route.request().postDataJSON();
    assert.equal(body.id,'banco-sessao','A releitura da sessão deve enviar o identificador mesmo sem arquivo');
    return route.fulfill({json:{id:body.id,nome:'Banco em sessão',origem_geometria:'banco',geojson:fc}});
   }
   if(name.endsWith('/bancada-arquivos/consulta')){
    const body=route.request().postDataJSON();
    return route.fulfill({json:{id:body.id,revisao:body.revisao,ids:[1],total:1,has_more:false}});
   }
   if(name.includes('/tiles/'))return route.fulfill({status:200,contentType:'application/x-protobuf',body:Buffer.alloc(0)});
   if(name.endsWith('/camadas/catalogo-rios'))return route.fulfill({json:catalog});
   if(name.endsWith('/camadas/memoria-pontos'))return route.fulfill({json:memory});
   if(name.endsWith('/geojson'))return route.fulfill({json:fc});
   if(name.endsWith('/camadas')){
    await page.waitForFunction(()=>window.gpApp?.state.map?.isStyleLoaded());
    return route.fulfill({json:[]});
   }
   if(name.endsWith('/funcoes')||name.endsWith('/fluxos'))return route.fulfill({json:[]});
   if(name.endsWith('/catalogo/projeto'))return route.fulfill({json:{toolboxes:[]}});
   return route.fulfill({json:{}});
  });
  await page.goto(`http://127.0.0.1:${server.address().port}/`,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.gpApp?.state.map?.isStyleLoaded()&&window.gpApp.state.catalogHydrated&&window.gpArquivos).catch(async error=>{throw new Error(`${error.message}\n${await page.locator('#gp-log').textContent()}\n${JSON.stringify(await page.evaluate(()=>({style:window.gpApp.state.map.isStyleLoaded(),loaded:window.gpApp.state.map.loaded(),hydrated:window.gpApp.state.catalogHydrated})))}`);});
  await page.evaluate(async({native,catalog,memory,raster,fc})=>{
   const app=window.gpApp,map=app.state.map;
   window.gpArquivos.adicionar({...native,categoria:'Entrada'},{lote:true});
   app.state.layers.push(catalog,memory);
   await app.addCatalogLayerToMap(catalog.id,false);
   await app.addCatalogLayerToMap(memory.id,false);
   await app.adicionarRasterStorage(raster,{fit:false});
   app.adicionarCamadaGeoJsonEmMemoria('local-memory','Memória local',fc,{lote:true,estiloPreparado:true});
   window.gpArquivos.adicionar({id:'banco-sessao',nome:'Banco em sessão',origem_geometria:'banco',geojson:fc},{lote:true,estiloPreparado:true});
   map.setLayoutProperty(catalog.id,'visibility','none');
   map.setLayoutProperty(`${catalog.id}-line`,'visibility','none');
   map.setLayoutProperty(`${catalog.id}-point`,'visibility','none');
   app.state.activeLayerId=catalog.id;
   app.state.layers.find(layer=>layer.id===native.id).papelExtracao='entrada';
   window.gpCommands.selectFeature(native.id,{type:'Feature',id:1,properties:{slt_fid:1},geometry:{type:'LineString',coordinates:[[-47,-24],[-46,-23]]}});
   app.state.layerFilters??={};app.state.layerFilters[native.id]="nome == 'Rio'";
   await window.gpCommands.refreshLayerFilter(native.id);
   app.renderLayers();map.jumpTo({center:[-46.5,-23.5],zoom:7});
   window.beforeRefresh={
    camera:{center:map.getCenter().toArray(),zoom:map.getZoom()},
    active:app.state.activeLayerId,order:map.getStyle().layers.map(layer=>layer.id),
    ids:app.state.layers.map(layer=>layer.id),selected:JSON.stringify(app.state.selectedGeoJSON),
   };
  },{native,catalog,memory,raster,fc});
  await page.waitForFunction(()=>window.gpApp.state.map.isStyleLoaded());
  const title=await page.locator('.gp-layer-section-title').boundingBox(),refresh=await page.locator('#gp-refresh-layers').boundingBox();
  assert.ok(Math.abs(title.x+title.width-refresh.x-refresh.width-10)<2,'Atualizar deve ficar à direita do título');
  const controls=await page.locator('.gp-map-tools button').evaluateAll(buttons=>buttons.map(button=>({id:button.id,rect:{x:button.getBoundingClientRect().x,y:button.getBoundingClientRect().y,w:button.offsetWidth,h:button.offsetHeight},className:button.className})));
  assert.deepEqual(controls.map(button=>button.id),['gp-home','gp-fit','gp-refresh-map']);
  assert.deepEqual(controls[2].className,controls[1].className);
  assert.equal(controls[2].rect.x,controls[1].rect.x);
  assert.equal(controls[2].rect.w,controls[1].rect.w);
  assert.equal(controls[2].rect.h,controls[1].rect.h);
  assert.ok(controls[2].rect.y>controls[1].rect.y);
  await page.locator('[data-left-tab="source"]').click();
  const labels=await page.locator('[data-layer] .layer-name').allTextContents();
  assert.ok(labels.includes(`${native.arquivo}::Linhas`));
  assert.ok(labels.includes(catalog.caminho_arquivo));
  assert.ok(labels.includes(raster.arquivo));
  assert.ok(labels.includes(`memoria/${memory.id}`));
  assert.ok(labels.includes('memoria/local-memory'));
  assert.ok(labels.includes('banco/banco-sessao'));
  const sourceLayout=await page.locator('#gp-layer-list').evaluate(list=>({
   width:list.clientWidth,scrollWidth:list.scrollWidth,
   labelHeight:list.querySelector('.layer-name').getBoundingClientRect().height,
  }));
  assert.ok(sourceLayout.scrollWidth<=sourceLayout.width,'Caminho deve quebrar linhas sem ampliar o painel');
  assert.ok(sourceLayout.labelHeight>20,'Caminho longo deve ser exibido em mais de uma linha');
  await page.screenshot({path:path.join(process.env.TEMP,'sicard-atualizar-fontes.png')});
  await page.locator('#gp-layer-search').fill('projetos/trechos');
  assert.equal(await page.locator('[data-layer]').count(),1);
  const start=requests.length;
  releaseNative=true;
  await page.locator('#gp-refresh-layers').click();
  await page.waitForFunction(()=>document.querySelector('#gp-refresh-layers').disabled);
  assert.equal(await page.locator('#gp-refresh-map').isDisabled(),true);
  await page.waitForTimeout(50);
  releaseNative();releaseNative=null;
  await page.waitForFunction(()=>!document.querySelector('#gp-refresh-layers').disabled);
  const refreshed=requests.slice(start);
  assert.ok(refreshed.some(request=>request.name.endsWith('/bancada-arquivos/preparar')));
  assert.ok(refreshed.some(request=>request.name.endsWith(`/camadas/${catalog.id}`)),'Camada oculta e fora da pesquisa também deve atualizar');
  assert.ok(refreshed.some(request=>request.name.endsWith(`/camadas/${memory.id}/geojson`)));
  assert.ok(refreshed.some(request=>request.name.endsWith('/extracao-atributos/arquivo-mapa')));
  assert.ok(refreshed.some(request=>request.name.endsWith('/storage/camada/raster-preview')));
  assert.equal(refreshed.some(request=>request.name.endsWith('/atualizar-fonte')),false,'Atualização de visualização não deve reimportar ou gravar fontes');
  const preserved=await page.evaluate(nativeId=>{
   const app=window.gpApp,map=app.state.map,previous=window.beforeRefresh;
   return {
    active:app.state.activeLayerId===previous.active,
    ids:JSON.stringify(app.state.layers.map(layer=>layer.id))===JSON.stringify(previous.ids),
    order:JSON.stringify(map.getStyle().layers.map(layer=>layer.id))===JSON.stringify(previous.order),
    camera:JSON.stringify({center:map.getCenter().toArray(),zoom:map.getZoom()})===JSON.stringify(previous.camera),
    hidden:map.getLayoutProperty('catalogo-rios','visibility')==='none',
    selection:JSON.stringify(app.state.selectedGeoJSON)===previous.selected,
    role:app.state.layers.find(layer=>layer.id===nativeId).papelExtracao,
    revision:window.gpArquivos.sessions.get(nativeId).revisao,
    filter:app.state.nativeFilterQueries[nativeId].revision,
    vector:map.getSource(nativeId).type,
    exact:JSON.stringify(map.getFilter(nativeId)).includes('slt_fid'),
   };
  },native.id);
  assert.deepEqual(preserved,{active:true,ids:true,order:true,camera:true,hidden:true,selection:true,role:'entrada',revision:'rev-2',filter:'rev-2',vector:'vector',exact:true});
  await page.locator('[data-left-tab="drawing"]').click();
  await page.locator('#gp-layer-search').fill('');
  assert.equal(await page.locator('#gp-refresh-layers').count(),1,'Trocar a aba não deve remover o botão');
  assert.ok((await page.locator('[data-layer] .layer-name').allTextContents()).includes(native.nome));
  const second=requests.length;
  await page.locator('#gp-refresh-map').click();
  await page.waitForFunction(()=>!document.querySelector('#gp-refresh-map').disabled);
  assert.equal(requests.slice(second).filter(request=>request.name.endsWith('/bancada-arquivos/preparar')).length,1);
  await page.evaluate(()=>{window.gpAttributeTable.hasPendingChanges=()=>true;});
  const blocked=requests.length;
  await page.locator('#gp-refresh-layers').click();
  await page.waitForFunction(()=>!document.querySelector('#gp-refresh-layers').disabled);
  assert.equal(requests.slice(blocked).filter(request=>request.name.endsWith('/bancada-arquivos/preparar')).length,0);
  await page.evaluate(()=>{window.gpAttributeTable.hasPendingChanges=()=>false;});
  failNative=true;
  const failed=requests.length;
  await page.locator('#gp-refresh-map').click();
  await page.waitForFunction(()=>!document.querySelector('#gp-refresh-map').disabled);
  assert.ok(requests.slice(failed).some(request=>request.name.endsWith(`/camadas/${catalog.id}`)),`Falha em uma camada não impede as demais: ${JSON.stringify({requests:requests.slice(failed),log:await page.locator('#gp-log').textContent()})}`);
  assert.ok((await page.locator('#gp-log').textContent()).includes('Storage indisponível no teste'));
  assert.deepEqual(errors,[]);
  await page.screenshot({path:path.join(process.env.TEMP,'sicard-atualizar-camadas.png')});
  console.log('OK: botões padronizados, atualização completa com estado preservado, caminhos por fonte, bloqueio de edição e falhas explícitas.');
 }finally{
  if(browser)await browser.close();
  server.closeAllConnections?.();
  await new Promise(resolve=>server.close(resolve));
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
