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

 const p=await browser.newPage({viewport:{width:1600,height:1100}}),pending=[],uploads=[],refs=[],errors=[];let uploadRoute;
 p.on('pageerror',e=>errors.push(e.message));
 const fc={type:'FeatureCollection',features:[{type:'Feature',id:1,properties:{valor:2},geometry:{type:'Point',coordinates:[-46,-23]}}]};
 await p.route('**/api/**',async r=>{
  const url=new URL(r.request().url()).pathname;let body=[];
  if(url.endsWith('/importar_camadas/inspecionar')){pending.push(r);return;}
  if(url.endsWith('/storage/upload/job')){uploads.push(r.request().postData());uploadRoute=r;return;}
  if(url.endsWith('/extracao-atributos/arquivo-mapa')){const data=r.request().postDataJSON();refs.push(data);body={id:data.id||'storage:primeira',nome:'Segunda',arquivo:data.arquivo,revisao:'b'.repeat(64),geojson:fc};}
  if(url.endsWith('/bancada-arquivos/executar-job'))body={id:'job',status:'concluido',total:1,resultado:{execucao_id:'exec-test',resultado:{valido:true}}};
  if(url.endsWith('/catalogo/projeto'))body={toolboxes:[]};if(url.endsWith('/ambientes'))body={};
  return r.fulfill({json:body});
 });
 await p.goto(`http://127.0.0.1:${server.address().port}/`,{waitUntil:'domcontentloaded'});
 await p.waitForFunction(()=>window.gpApp?.state.map?.isStyleLoaded()&&window.gpArquivos).catch(async e=>{console.error(errors);console.error(await p.evaluate(()=>({app:!!window.gpApp,map:!!window.gpApp?.state.map,arquivos:!!window.gpArquivos})));throw e;});
 await p.locator('[data-action="import-file"]').click();
 for(const name of ['A.geojson','B.geojson']){await p.locator('#gp-local-upload').setInputFiles({name,mimeType:'application/json',buffer:Buffer.from(JSON.stringify(fc))});await p.waitForTimeout(100);}
 assert.equal(pending.length,2);
 const inspection=token=>({token_importacao:token,camadas:[],categoria:'vetor',crs_identificado:'EPSG:4326'});
 await pending[1].fulfill({json:inspection('TOKEN_B')});await p.waitForTimeout(100);
 await pending[0].fulfill({json:inspection('TOKEN_A')});await p.waitForTimeout(100);
 await p.evaluate(()=>{document.querySelector('#gp-import-pasta').value='teste';document.querySelector('#gp-op-form').requestSubmit();});await p.locator('.gp-feedback-confirm button:not(.primary)').click();assert.equal(uploads.length,0);await p.evaluate(()=>document.querySelector('#gp-op-form').requestSubmit());await p.locator('.gp-feedback-confirm button.primary').click();await p.waitForTimeout(400);
 assert.equal(uploads.length,1);assert(uploads[0].includes('TOKEN_B'));assert(!uploads[0].includes('TOKEN_A'));assert.equal(await p.evaluate(()=>gpApp.state.activeImport),true);assert.equal(await p.evaluate(()=>gpApp.cancelExecution()),true);assert((await p.locator('#gp-log').innerText()).includes('não oferece interrupção segura'));await uploadRoute.fulfill({json:{id:'up',status:'concluido',total:1,resultado:{pasta:'teste',arquivos:[],camadas:[]}}});await p.waitForFunction(()=>!gpApp.state.activeImport);
 await p.evaluate(fc=>gpArquivos.adicionar({id:'storage:segunda',nome:'Segunda',arquivo:'teste.gpkg',revisao:'a'.repeat(64),geojson:fc}),fc);
 await p.locator('[data-ribbon="dados"]').click();await p.locator('[data-action="refresh-source"]').click();
 await p.waitForFunction(()=>gpArquivos.sessions.get('storage:segunda')?.revisao==='b'.repeat(64));assert.equal(refs.at(-1).id,'storage:segunda');
 assert.equal(await p.evaluate(()=>gpArquivos.sessions.has('storage:primeira')),false);
 await p.evaluate(()=>{gpApp.selectOp('OP-02');const f=document.querySelector('#gp-op-form');f.elements.camada_id.value='storage:segunda';f.requestSubmit();});
 await p.locator('.gp-feedback-confirm button.primary').click();await p.waitForFunction(()=>gpApp.state.history.some(x=>x.op==='OP-02'));
 assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('gp-history'))[0].result.execucao_id),'exec-test');
 if(await p.locator('#gp-operation-result').evaluate(d=>d.open))await p.locator('#gp-operation-result-close').click();
 await p.evaluate(()=>gpCommands.showEnvironments());assert.equal(await p.locator('[name="overwrite"]').count(),0);assert.deepEqual(errors,[]);
 console.log('OK: importação concorrente B preservada, refresh GPKG, histórico storage, ambientes.');
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
