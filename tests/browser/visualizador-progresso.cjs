const {chromium}=require('playwright');
const fs=require('node:fs'),http=require('node:http'),assert=require('node:assert/strict');
(async()=>{
 let release,requested=false;
 const server=http.createServer((req,res)=>{requested=true;release=()=>{res.writeHead(200,{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'});res.end(JSON.stringify({type:'FeatureCollection',features:[{type:'Feature',properties:{},geometry:{type:'Point',coordinates:[-47,-23]}}]}));};});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']});
 try{
 const page=await browser.newPage();
 await page.setContent('<div id="geo-layers-root"><div id="geo-postgis-group" class="layer-group--tipo"><div class="layer-group-header-row"><input type="checkbox" checked><span>Demandas</span></div><div class="layer-group-body"><div class="geo-layer-folder" data-folder-id="projetos"><div class="layer-group-header-row"><input type="checkbox" checked><span>Projetos</span></div><div class="layer-group-body" id="test-rows"></div></div></div></div></div><div id="map" style="width:900px;height:600px"></div>');
 await page.addStyleTag({path:'assets/vendor/maplibre-gl/maplibre-gl.css'});await page.addStyleTag({path:'geoespacial/visualizador-progresso.css'});
 await page.addScriptTag({path:'assets/vendor/maplibre-gl/maplibre-gl.js'});await page.addScriptTag({path:'geoespacial/visualizador-progresso.js'});
 await page.evaluate(async url=>{
  const map=new maplibregl.Map({container:'map',style:{version:8,sources:{},layers:[]},center:[-47,-23],zoom:6});await new Promise(resolve=>map.once('load',resolve));
  window.testMap=map;window.testLayers=new Map();window.reloadCalls=[];
  window.addRow=(id,folder=false)=>{const row=document.createElement('div');row.className=folder?'geo-layer-folder':'geo-layer-record';row.dataset[folder?'folderId':'id']=id;row.innerHTML='<div class="layer-group-header-row"><input type="checkbox" checked><span>'+id+'</span></div>'+(folder?'<div class="layer-group-body"></div>':'');document.getElementById('test-rows').append(row);return row;};
  addRow('demanda');
  window.progress=ViewerLoadProgress.create(document.getElementById('viewer-load-progress'),()=>({map,layers:testLayers,reload:row=>reloadCalls.push(row.dataset.id||row.dataset.folderId||row.id),failSource:id=>{map.removeLayer(id);map.removeSource(id);testLayers.delete(id);}}));
  window.operation=progress.begin('Teste real');progress.plan(operation,'camada','Demanda','demanda');
  await progress.task(operation,'camada','Demanda',async()=>{map.addSource('demanda',{type:'geojson',data:url});map.addLayer({id:'demanda',type:'circle',source:'demanda'});testLayers.set('demanda',{sourceId:'demanda',visible:true});},'demanda');
  window.finished=progress.end(operation);
 },`http://127.0.0.1:${server.address().port}/dados.geojson`);
 await page.waitForFunction(()=>progress.active?.waitingMap);
 const row=page.locator('[data-id="demanda"]');
 assert.equal(await row.locator('.layer-item__loading-bar').getAttribute('aria-valuenow'),null);
 assert.equal(await row.locator('.layer-health--loading').count(),1);
 assert.equal(await row.locator('.layer-reload-btn').isDisabled(),true);
 assert.equal(await page.locator('#geo-postgis-group > .layer-item__loading .layer-item__loading-text').textContent(),'0/1');
 while(!requested)await new Promise(resolve=>setTimeout(resolve,10));release();await page.evaluate(()=>finished);
 assert.equal(await row.locator('.layer-item__loading-bar').getAttribute('aria-valuenow'),'100');
 assert.equal(await row.locator('.layer-health--ok').count(),1);
 assert.equal(await row.locator('.layer-item__loading').isVisible(),false);
 assert.equal(await page.locator('[data-folder-id="projetos"] > .layer-item__loading .layer-item__loading-text').textContent(),'1/1 · Pronto');
 assert.equal(await row.evaluate(el=>el.querySelector('.layer-group-header-row').nextElementSibling.classList.contains('layer-item__loading')),true);
 await row.locator('.layer-reload-btn').click();await page.locator('[data-folder-id="projetos"] > .layer-group-header-row .layer-reload-btn').click();await page.locator('#geo-postgis-group > .layer-group-header-row .layer-reload-btn').click();
 assert.deepEqual(await page.evaluate(()=>reloadCalls),['demanda','projetos','geo-postgis-group']);
 await page.evaluate(async()=>{addRow('bad');const op=progress.begin('Falha');try{await progress.task(op,'camada','Falha',async()=>{throw Error('HTTP 503');},'bad');}catch{}await progress.end(op);});
 assert.equal(await page.locator('[data-id="bad"] .layer-health--error').count(),1);
 assert.match(await page.locator('[data-id="bad"] .layer-item__loading').getAttribute('title'),/HTTP 503/);
 assert.equal(await row.locator('.layer-health--ok').count(),1,'falha independente da camada pronta');
 await page.evaluate(async()=>{
  const op=progress.begin('Falha no desenho');await progress.task(op,'camada','Falha no desenho',async()=>{
   testMap.addSource('bad',{type:'geojson',data:{type:'FeatureCollection',features:[]}});testMap.addLayer({id:'bad',type:'circle',source:'bad'});testLayers.set('bad',{sourceId:'bad',visible:true});
  },'bad');testMap.fire('error',{sourceId:'bad',error:new Error('Falha nos tiles')});await progress.end(op);
 });
 assert.equal(await page.evaluate(()=>testLayers.has('bad')),false);
 assert.match(await page.locator('[data-id="bad"] .layer-health').getAttribute('title'),/Falha nos tiles/);
 assert.equal(await page.locator('#viewer-load-progress').count(),0,'não há quadro unificado');
 console.log('PASS: barras individuais de camada, pasta e grupo; desenho real atrasado; falhas independentes; controles Sigma no cabeçalho; recarga por item');
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exit(1);});
