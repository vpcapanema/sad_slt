// UI real, respostas isoladas: o original do storage abre em tiles, sem GeoJSON integral.
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
(async()=>{
 const server=http.createServer((req,res)=>{
  let name=new URL(req.url,'http://local').pathname;
  if(name==='/')name='/templates/componentes/_geoprocessamento.html';
  name=name.replace('/restrict/geoespacial/','/geoespacial/');
  const file=path.join(root,name);
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end();return;}res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'application/octet-stream');res.end(data);});
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({channel:'msedge',headless:true,args:['--no-sandbox','--no-proxy-server','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
 try{
 const p=await browser.newPage({viewport:{width:1600,height:1100}}),errors=[],preparar=[],completos=[],tiles=[],boundsReqs=[],tabela=[];
 p.on('pageerror',e=>errors.push(e.message));
 const REV='a'.repeat(64),ID='storage:base-geoespacial/rios.gpkg::rios',ARQ='base-geoespacial/rios.gpkg';
 const fc={type:'FeatureCollection',features:[{type:'Feature',id:1,properties:{nome:'Tietê'},geometry:{type:'LineString',coordinates:[[-46.8,-23.8],[-46.2,-23.2]]}}]};
 const meta=(id,arquivo,revisao=REV)=>({id,nome:id.split('::')[1]||'Camada',arquivo,revisao,campos:[{nome:'nome',tipo:'String'}],crs_arquivo:'GEOGCS["WGS 84"]',feicoes:1,geometria_tipo:'Multi Line String',bounds:[-47,-24,-46,-23]});
 let revisaoCompleta=REV;
 await p.route('**/api/**',r=>{
  const u=new URL(r.request().url()),url=u.pathname;let body=[];
  if(url.endsWith('/storage/camadas-arquivo'))body={camadas:[{id:ID,arquivo:ARQ,nome:'rios'},{id:'storage:'+ARQ+'::trechos',arquivo:ARQ,nome:'trechos'}]};
  if(url.endsWith('/bancada-arquivos/preparar')){const d=r.request().postDataJSON();preparar.push(d);body=meta(d.id,d.arquivo);}
  if(url.endsWith('/bancada-arquivos/tabela')){const d=r.request().postDataJSON();tabela.push(d);body={revisao:d.revisao,total:1,offset:d.offset,limite:d.limite,linhas:[{id:'1',atributos:{nome:'Tietê'}}]};}
  if(url.includes('/storage/camada/tiles/')){tiles.push(u);return r.fulfill({status:200,headers:{'Content-Type':'application/x-protobuf'},body:Buffer.alloc(0)});}
  if(url.endsWith('/storage/camada/bounds')){boundsReqs.push(u);body={bounds:[-47,-24,-46,-23]};}
  if(url.endsWith('/extracao-atributos/arquivo-mapa')){const d=r.request().postDataJSON();completos.push(d);body={...meta(d.id||'local-ext',d.arquivo,d.id?revisaoCompleta:REV),geojson:fc};if(!d.id?.startsWith('storage:'))body.id=d.id||'local-ext';if(d.id?.includes('.zip'))body.metadados_local={previa:{metodo:'limites'}};}
  if(url.endsWith('/catalogo/projeto'))body={toolboxes:[]};if(url.endsWith('/ambientes'))body={};
  return r.fulfill({json:body});
 });
 await p.goto(`http://127.0.0.1:${server.address().port}/`,{waitUntil:'domcontentloaded'});
 await p.waitForFunction(()=>window.gpApp?.state.map?.isStyleLoaded()&&window.gpArquivos);

 await p.evaluate(([id,arquivo])=>gpArquivos.abrirReferencias([{id,arquivo,nome:'rios'}]),[ID,ARQ]);
 await p.waitForFunction(()=>gpApp.state.layers.filter(l=>l.id.startsWith('storage:')).length===2);
 assert.equal(await p.locator('#gp-layer-list .tree-layer').count(),2);
 assert.equal(await p.locator('#gp-layer-list .layer-symbol.line').count(),2);
 assert.equal(preparar.length,2);
 assert.equal(await p.locator('script[src*="process_feedback_unified"],script[src*="notification_system"]').count(),0);
 await p.evaluate(()=>{window.zoomCalls=[];const map=gpApp.state.map,fit=map.fitBounds.bind(map);map.fitBounds=(...args)=>{zoomCalls.push(args[0]);return fit(...args)}});
 const row=p.locator('[data-layer="'+ID+'"]');
 await row.hover();await row.locator('[data-zoom-layer]').click();
 assert.equal(await p.evaluate(()=>zoomCalls.length),1,'zoom click must run exactly once');
 await row.locator('[data-edit-layer]').click();
 await p.waitForFunction(()=>gpAttributeTable.grid&&document.querySelector('[data-at-edit]')?.getAttribute('aria-pressed')==='true');
 assert.equal(await p.locator('[data-at-title]').textContent(),'rios');
 assert.equal(await p.evaluate(id=>gpApp.state.editingLayers.has(id),ID),true);
 assert.equal(await p.locator('.leaflet-container').count(),0,'attribute button must not open geometry editor');
 await p.evaluate(fc=>gpApp.adicionarCamadaGeoJsonEmMemoria('memory-lines','Linhas locais',fc,{estiloPreparado:true}),fc);
 const memory=p.locator('[data-layer="memory-lines"]');await memory.hover();
 const before=await p.evaluate(()=>zoomCalls.length);await memory.locator('[data-zoom-layer]').click();
 assert.equal(await p.evaluate(()=>zoomCalls.length),before+1,'memory layer uses its own geometry bounds');
 assert.deepEqual(errors,[]);
 console.log('OK: GeoPackage layers, line symbols, actual attribute edit/zoom button clicks, memory zoom, no JS errors.');
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exit(1)});
