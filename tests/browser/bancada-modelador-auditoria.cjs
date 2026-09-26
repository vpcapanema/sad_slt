// Fluxos reais do modelador com persistência HTTP inteiramente sintética.
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
(async()=>{
const server=http.createServer((req,res)=>{
 if(req.url.endsWith('.js')){res.setHeader('Content-Type','text/javascript; charset=utf-8');return res.end(fs.readFileSync(path.join(root,'geoespacial',req.url.slice(1))));}
 res.setHeader('Content-Type','text/html; charset=utf-8');res.end(`<div class="gp-app"><div id="gp-ribbon-tools">${['save','validate','run','input','delete'].map(s=>`<button data-model-command="model-${s}">${s}</button>`).join('')}</div><div id="gp-document-tabs"><button data-document-tab="mapa">Mapa</button></div><div id="gp-map"></div><div class="gp-map-tools"></div><div id="gp-modeler-host"></div><div id="gp-model-properties-view"><div class="model-inspector-body"></div></div><div id="gp-toolbox"><div data-op="OP-37"><span class="tool-name">Calcular área</span></div></div><div id="gp-save-state"></div></div><script>window.gpApp={state:{functions:[],flows:[],layers:[{id:'synthetic',nome:'Sintética'}]},operationFields:{'OP-37':[['camada_id','Camada','layer']]},syncExecutionResults:async result=>{window.synced=result},renderLayers(){},renderToolbox(){}};</script><script src="/bancada-feedback.js"></script><script src="/geoprocessamento-modeler.js"></script>`);
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
let browser;
try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--no-proxy-server','--disable-dev-shm-usage']});
 const page=await browser.newPage(),errors=[],writes=[],runs=[],deletes=[];let stored,valid=true,holdSave=false,releaseSave;
 page.setDefaultTimeout(10000);page.setDefaultNavigationTimeout(10000);
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/**',async route=>{
  const req=route.request(),url=new URL(req.url()).pathname;
  if(req.method()==='DELETE'){deletes.push(url);return route.fulfill({json:{ok:true}});}
  if(url.endsWith('/validar'))return route.fulfill({json:{valido:valid,erros:valid?[]:['Entrada indisponível']}});
  if(url.endsWith('/executar')){runs.push(req.postDataJSON());return route.fulfill({json:{camada_id:'resultado_sintetico'}});}
  if(req.method()==='POST'||req.method()==='PUT'){
   stored=req.postDataJSON();writes.push(structuredClone(stored));if(holdSave)await new Promise(resolve=>releaseSave=resolve);
   return route.fulfill({json:{...stored,id:'modelo_sintetico'}});
  }
  return route.fulfill({json:stored?[stored]:[]});
 });
 await page.goto(`http://127.0.0.1:${server.address().port}/`);
 await page.evaluate(()=>gpModeler.open('function',{id:'modelo_sintetico',nome:'Auditoria',passos:[{algoritmo_id:'OP-37',parametros:{camada_id:'$entrada'}}]}));
 const btn=action=>page.locator(`[data-model-command="model-${action}"]`);
 // Primeiro input após abrir um modelo persistido precisa habilitar Salvar.
 assert.equal(await btn('save').isDisabled(),true);
 await page.locator('[data-model-name]').fill('Auditoria persistida');
 assert.equal(await btn('save').isEnabled(),true);
 holdSave=true;await btn('save').click();
 await page.waitForFunction(()=>gpModeler._debug.activeEditor().busy);
 assert.equal(await page.locator('[data-model-name]').isDisabled(),true);
 const before=await page.evaluate(()=>gpModeler._debug.activeEditor().nodes.length);
 await page.evaluate(()=>{const e=gpModeler._debug.activeEditor();e.selected=e.nodes[0].id;gpModeler._debug.deleteSelection(e);document.querySelector('[data-close-model]').click();});
 assert.equal(await page.evaluate(()=>gpModeler._debug.activeEditor().nodes.length),before);
 assert.match(await page.locator('.gp-feedback-content').innerText(),/Aguarde a operação/);
 while(!releaseSave)await new Promise(r=>setTimeout(r,10));releaseSave();holdSave=false;
 await page.waitForFunction(()=>!gpModeler._debug.activeEditor().busy);
 assert.equal(writes[0].nome,'Auditoria persistida');
 assert.equal(await page.locator('[data-model-name]').isEnabled(),true);
 await btn('validate').click();await page.waitForFunction(()=>gpModeler._debug.activeEditor().validated);
 assert.equal(await btn('run').isEnabled(),true);
 // Validação subsequente com falha não pode reutilizar validade anterior.
 valid=false;await btn('validate').click();await page.waitForFunction(()=>!gpModeler._debug.activeEditor().busy);
 assert.equal(await btn('run').isDisabled(),true);
 valid=true;await btn('validate').click();await page.waitForFunction(()=>gpModeler._debug.activeEditor().validated);
 // Cancelar confirmação não envia execução; aceitar sincroniza resultado.
 await btn('run').click();await page.getByRole('button',{name:'Cancelar',exact:true}).click();assert.equal(runs.length,0);
 await btn('run').click();await page.getByRole('button',{name:'Executar fluxo',exact:true}).click();
 await page.waitForFunction(()=>window.synced?.camada_id==='resultado_sintetico');assert.equal(runs.length,1);
 await page.waitForFunction(()=>!gpModeler._debug.activeEditor().busy);
 // Configuração de saída reaberta deve mostrar exatamente o que será persistido.
 await page.evaluate(()=>{const e=gpModeler._debug.activeEditor(),out=e.nodes.find(n=>n.kind==='output');out.params={crs_saida:'EPSG:4674',destino:'storage',formato_saida:'GeoPackage'};e.selected=out.id;gpModeler._debug.render(e);});
 assert.equal(await page.locator('[data-output-field="destino"]').inputValue(),'storage');
 assert.equal(await page.locator('[data-output-field="crs_saida"]').inputValue(),'EPSG:4674');
 assert.equal(await page.locator('[data-output-field="formato_saida"]').inputValue(),'GeoPackage');
 // Biblioteca real: intenção da faixa determina qual ação o usuário pode escolher.
 const main=fs.readFileSync(path.join(root,'geoespacial/geoprocessamento.js'),'utf8');
 const library=main.slice(main.indexOf('  function showLibrary('),main.indexOf('  function showHistory('));
 await page.evaluate(source=>{
  document.body.insertAdjacentHTML('beforeend','<h2 id="gp-right-title"></h2><div id="gp-editor-view"></div>');
  const state={functions:[{id:'fn',nome:'Função auditada',passos:[]}],flows:[{id:'fl',nome:'Fluxo auditado',itens:[]}]};
  window.auditLibrary=new Function('state','$','$$','activateRightTab','showEditor','icons','escapeHtml','API','refreshDefinitions','log',source+';return showLibrary;')(state,s=>document.querySelector(s),s=>[...document.querySelectorAll(s)],()=>{},()=>{},()=>{},s=>s,'/api/geoespacial',async()=>{},()=>{});
 },library);
 for(const kind of ['functions','flows'])for(const intent of ['edit','validate','run']){
  await page.evaluate(({kind,intent})=>auditLibrary(kind,intent),{kind,intent});
  assert.equal(await page.locator(`#gp-editor-view [data-${intent}-definition]`).isVisible(),true);
  for(const other of ['edit','validate','run'].filter(v=>v!==intent))assert.equal(await page.locator(`#gp-editor-view [data-${other}-definition]`).isVisible(),false);
  assert.equal(await page.locator('#gp-editor-view [data-delete]').isVisible(),false);
 }
 await page.evaluate(()=>auditLibrary('functions'));
 await page.locator('#gp-editor-view [data-delete]').click();
 await page.getByRole('button',{name:'Cancelar',exact:true}).click();assert.equal(deletes.length,0);
 assert.equal(await page.locator('#gp-editor-view [data-delete]').isEnabled(),true);
 await page.locator('#gp-editor-view [data-delete]').click();
 await page.getByRole('button',{name:'Excluir definição',exact:true}).click();
 await page.waitForFunction(()=>!document.querySelector('#gp-editor-view [data-delete]').disabled);
 assert.deepEqual(deletes,['/api/geoespacial/funcoes/fn']);
 assert.deepEqual(errors,[]);console.log('PASS modelador: salvar, bloquear edição em voo, fechar em voo, revalidar, cancelar/confirmar execução, sincronizar saída e restaurar parâmetros.');
}finally{await browser?.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
