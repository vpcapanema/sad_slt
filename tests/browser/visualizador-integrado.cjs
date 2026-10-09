const {chromium}=require('playwright');
const fs=require('node:fs'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
(async()=>{
 const rendered=execFileSync('.venv/Scripts/python.exe',['-X','utf8','-c',`from fastapi.testclient import TestClient
from api.server import app
from api.services.session_service import SessionUser,cookie_name,create_token
c=TestClient(app);c.cookies.set(cookie_name(),create_token(SessionUser(id='00000000-0000-0000-0000-000000000021',email='teste@example.org',username='teste_admin',nome='Teste',tipo_usuario='ADMIN')))
r=c.get('/restrict/geoespacial/visualizador-camadas/');assert r.status_code==200
print(r.text)`],{encoding:'utf8'});
 const tile=execFileSync('.venv/Scripts/python.exe',['-c',"from PIL import Image;import io,sys;b=io.BytesIO();Image.new('RGBA',(256,256),(230,235,230,255)).save(b,format='PNG');sys.stdout.buffer.write(b.getvalue())"]);
 const records=Array.from({length:94},(_,i)=>({id:`cadastro:projeto:PRJ-${i}`,codigo:`PRJ-${i}`,tipo:'projeto',nome:`Projeto ${i} com nome longo para testar sobreposições dos controles de carregamento e recarga`,status:'em_analise',criado_em:'2026-10-09T10:00:00',geometria_tipo:'Polygon',bounds:[-47,-23,-46.99,-22.99],posicao:[-47+i*.002,-23],geojson:{type:'FeatureCollection',features:[{type:'Feature',properties:{codigo:`PRJ-${i}`},geometry:{type:'Polygon',coordinates:[[[-47,-23],[-46.99,-23],[-46.99,-22.99],[-47,-23]]]}}]}}));
 const calls=[];
 const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/restrict/geoespacial/visualizador-camadas/') {res.setHeader('Content-Type','text/html;charset=utf-8');res.end(rendered);return;}
  if(url.pathname.startsWith('/api/')){
   calls.push(url.pathname+url.search);let data=[];
   if(url.pathname==='/api/geoespacial/cadastro-filtros')data=records.map(x=>({id:x.codigo,tipo:x.tipo,nome:x.nome,status:x.status}));
   else if(url.pathname.startsWith('/api/geoespacial/cadastro-geometrias/')){const tipo=url.pathname.split('/').pop();data={tipo,itens:tipo==='projeto'?records.filter(x=>!url.searchParams.has('codigo')||x.codigo===url.searchParams.get('codigo')):[]};}
   else if(url.pathname.includes('/contagens'))data={contagens:{[url.pathname.split('/').at(-2)]:0}};
   else if(url.pathname==='/api/auth/session')data={authenticated:true,user:{nome:'Teste',tipo_usuario:'ADMIN'}};
   res.setHeader('Content-Type','application/json');res.end(JSON.stringify(data));return;
  }
  let relative=decodeURIComponent(url.pathname).replace(/^\//,'').replace(/^restrict\/geoespacial\//,'geoespacial/');
  const file=path.resolve(relative);if(!file.startsWith(process.cwd()+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type',({'.js':'application/javascript','.css':'text/css','.png':'image/png','.woff2':'font/woff2'})[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:1400,height:1000}}),errors=[];page.on('pageerror',error=>errors.push(error.message));page.on('console',msg=>{if(msg.type()==='error')console.log('BROWSER',msg.text());});
  await page.route('https://**/*',route=>route.fulfill({contentType:'image/png',body:tile}));
  const start=Date.now();await page.goto(`http://127.0.0.1:${server.address().port}/restrict/geoespacial/visualizador-camadas/`);
  await page.waitForFunction(()=>document.getElementById('postgis-layer-count').textContent==='94');
  await page.locator('#toggle-postgis-group').check();
  await page.waitForFunction(()=>GeoespacialMap.layers.size===94 && [...GeoespacialMap.layers.values()].every(l=>GeoespacialMap.map.isSourceLoaded(l.sourceId)),{},{timeout:30000});
  await page.waitForFunction(()=>document.querySelectorAll('#geo-postgis-group .layer-item__loading--visible').length===0,{},{timeout:30000});
  assert.equal(await page.locator('.maplibregl-marker').count(),94);assert.equal(await page.locator('#geo-postgis-group .geo-layer-record input:checked').count(),94);
  const geometry=await page.evaluate(()=>[...GeoespacialMap.layers.values()][0].data.features[0].geometry);assert.deepEqual(geometry,records[0].geojson.features[0].geometry);
  await page.locator('.geo-layer-folder[data-folder-id="postgis-projeto"] > .layer-group-header-row > .layer-group-header').click();
  const overlapping=await page.locator('#geo-postgis-group .geo-layer-record').evaluateAll(rows=>rows.filter(row=>{const name=row.querySelector('.geo-layer-copy'),actions=row.querySelector('.layer-item__actions');return name.getBoundingClientRect().right>actions.getBoundingClientRect().left+.5;}).length);
  assert.equal(overlapping,0);assert.deepEqual(errors,[]);
  const sidebar=page.locator('.geoespacial-map-sidebar');assert.equal(await sidebar.evaluate(el=>el.scrollWidth<=el.clientWidth+1),true);
  await sidebar.screenshot({path:'tmp/visualizador-sidebar-refatorado.png'});
  const first=page.locator('#geo-postgis-group .geo-layer-record').first(),id=await first.getAttribute('data-id');await first.locator('.layer-reload-btn').click();
  await page.waitForFunction(id=>GeoespacialMap.layers.has(id)&&document.querySelector(`[data-id="${id}"] .layer-health--ok`),id);
  assert.equal(calls.filter(url=>url.includes('?codigo=')).length,1);assert.equal(await page.locator('.maplibregl-marker').count(),94);assert.deepEqual(errors,[]);
  assert.equal(await page.locator('.maplibregl-canvas').evaluate(el=>getComputedStyle(el).cursor),'default');
  const selected=await page.evaluate(()=>{
    const map=GeoespacialMap.map,point=map.project([-46.993,-22.997]);
    const layerIds=[...GeoespacialMap.layers.values()].flatMap(x=>x.mapLayerIds);
    const expected=map.queryRenderedFeatures(point,{layers:layerIds})[0].properties.codigo;
    const box=map.getCanvas().getBoundingClientRect();return {codigo:expected,x:box.left+point.x,y:box.top+point.y};
  });
  await page.mouse.click(selected.x,selected.y);
  assert.match(await page.locator('#geoespacial-details-content').textContent(),new RegExp(selected.codigo));
  assert.equal(await page.locator('.geo-context-panel').evaluate(el=>el.classList.contains('is-collapsed')),false);
  assert.match(await page.locator('#viewer-feedback').textContent(),/Feição selecionada/);
  assert.equal(await page.evaluate(()=>GeoespacialMap.map.getSource('viewer-selected-feature')._data.features.length),1);
  const feedbackBox=await page.locator('#viewer-feedback').boundingBox(),scaleBox=await page.locator('.maplibregl-ctrl-scale').boundingBox();
  assert.ok(feedbackBox.y+feedbackBox.height<=scaleBox.y,'feedback não cobre escala');
  await page.evaluate(()=>GeoespacialMap.map.fire('dragstart'));
  assert.equal(await page.locator('.maplibregl-canvas').evaluate(el=>getComputedStyle(el).cursor),'grabbing');
  await page.evaluate(()=>GeoespacialMap.map.fire('dragend'));
  assert.equal(await page.locator('.maplibregl-canvas').evaluate(el=>getComputedStyle(el).cursor),'default');
  await page.goto(`http://127.0.0.1:${server.address().port}/restrict/geoespacial/visualizador-camadas/?camada=${encodeURIComponent('cadastro:projeto:PRJ-12')}`);
  await page.waitForFunction(()=>GeoespacialMap.layers.size===1&&GeoespacialMap.layers.has('cadastro:projeto:PRJ-12'),{},{timeout:30000});
  assert.equal(await page.locator('#geo-postgis-group .geo-layer-record input:checked').count(),1);
  assert.equal(await page.locator('[data-id="cadastro:projeto:PRJ-12"] input').isChecked(),true);
  console.log('PASS template real:94 camadas/pins, nomes sem sobreposição, barras ocultas após desenho, recarga pontual; total '+(Date.now()-start)+'ms');
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})();
