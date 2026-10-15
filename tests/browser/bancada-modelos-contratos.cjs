// Isolated browser and mocked HTTP: no real catalog writes.
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
(async()=>{
 const server=http.createServer((req,res)=>{
  res.setHeader('Content-Type',req.url.endsWith('.js')?'text/javascript; charset=utf-8':'text/html; charset=utf-8');
  if(req.url.endsWith('.js'))return res.end(fs.readFileSync(path.join(root,'geoespacial',path.basename(req.url))));
  res.end(`<div class="gp-app"><div id="gp-ribbon-tools"></div><div id="gp-document-tabs"></div><div id="gp-map"></div><div class="gp-map-tools"></div><div id="gp-modeler-host"></div><div id="gp-model-properties-view"><div class="model-inspector-body"></div></div><div id="gp-toolbox"></div><div id="gp-save-state"></div><div id="gp-right-title"></div><div id="gp-tools-view"></div><div id="gp-editor-view"></div></div><script>window.gpApp={state:{functions:[],flows:[],layers:[{id:'vector',nome:'Vector',tipo:'vetor'},{id:'raster',nome:'Raster',tipo:'raster'}]},operationFields:{'OP-35':[['camada_ids','Camadas','layers']]},openToolboxScope(){},showTools(){},waitForJob:async job=>{window.jobSeen=job;return {resultado:{camada_id:'result'}}},syncExecutionResults:async()=>{}};</script><script src="/geoprocessamento-modeler.js"></script><script src="/geoprocessamento-portal.js"></script>`);
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({headless:true,channel:process.env.PW_BROWSER_CHANNEL||'msedge'});
  const page=await browser.newPage(),errors=[],posts=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/**',async route=>{posts.push(route.request().url());await route.fulfill({json:{id:'mock-job',status:'pendente'}})});
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.evaluate(()=>{
   gpModeler.open('function');const d=gpModeler._debug,e=d.activeEditor();
   e.selected=e.nodes.find(n=>n.kind==='input').id;d.render(e);
  });
  assert.equal(await page.locator('[data-system-input] option[value="raster"]').count(),1);
  assert.equal(await page.locator('[data-system-input]').evaluate(el=>el.multiple),false);
  await page.evaluate(()=>{const d=gpModeler._debug,e=d.activeEditor(),n=d.addNode(e,'algorithm','OP-35','Merge');n.params.camada_ids=['vector','raster'];d.render(e)});
  assert.deepEqual(await page.locator('[data-contract-param="camada_ids"]').evaluate(el=>[...el.selectedOptions].map(o=>o.value)),['vector','raster']);
  const result=await page.evaluate(()=>gpModeler.executeDefinition('functions',{id:'demo'},{}));
  assert.equal(result.camada_id,'result');assert(posts.some(url=>url.endsWith('/funcoes/demo/executar-job')));
  assert.equal(await page.evaluate(()=>gpApp.state.activeExecution),false);
  const cancelled=await page.evaluate(async()=>{
   gpApp.waitForJob=async job=>{gpApp.state.activeJob={...job,resultados_parciais:[{camada_id:'completed'}]};throw new DOMException('Cancelled','AbortError')};
   gpApp.syncExecutionResults=async rows=>window.preserved=rows;
   try{await gpModeler.executeDefinition('flows',{id:'demo'},{});}catch(error){return {name:error.name,active:gpApp.state.activeExecution,job:gpApp.state.activeJob,preserved:window.preserved}}
  });
  assert.deepEqual(cancelled,{name:'AbortError',active:false,job:null,preserved:[{camada_id:'completed'}]});
  // A late response must not overwrite another tool's editor.
  let release;await page.route('**/colecoes',route=>new Promise(resolve=>release=async()=>{await route.fulfill({json:[]});resolve()}));
  await page.evaluate(()=>{window.opening=gpPortal.open({tipo:'STAC',id:'synthetic'});});
  await page.waitForFunction(()=>document.querySelector('.editor-body'));
  await page.evaluate(()=>document.querySelector('#gp-editor-view').innerHTML='<div id="other-tool">Other tool</div>');
  while(!release)await new Promise(r=>setTimeout(r,5));await release();await page.evaluate(()=>window.opening);
  assert.equal(await page.locator('#other-tool').textContent(),'Other tool');assert.deepEqual(errors,[]);
  console.log(JSON.stringify({multipleSelection:true,rasterInput:true,modelJob:true,portalRace:true,errors}));
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1});
