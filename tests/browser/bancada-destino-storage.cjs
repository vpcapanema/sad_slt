const {chromium}=require('playwright');
const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
(async()=>{
 const server=http.createServer((req,res)=>{
  if(req.url.endsWith('.js')||req.url.endsWith('.css')){
   res.setHeader('Content-Type',req.url.endsWith('.js')?'text/javascript; charset=utf-8':'text/css; charset=utf-8');
   return res.end(fs.readFileSync(path.join(root,req.url.endsWith('.js')?'geoespacial':'assets/css',path.basename(req.url))));
  }
  res.setHeader('Content-Type','text/html; charset=utf-8');
  res.end(`<link rel="stylesheet" href="/geoprocessamento.css"><link rel="stylesheet" href="/storage-pastas.css">
   <div class="gp-app"><div id="gp-ribbon-tools"></div><div id="gp-document-tabs"></div><div id="gp-map"></div><div class="gp-map-tools"></div><div id="gp-modeler-host"></div><div id="gp-model-properties-view"><div class="model-inspector-body"></div></div><div id="gp-toolbox"></div><div id="gp-save-state"></div><div id="gp-right-pane" style="width:280px"><form id="output"></form></div></div>
   <script>window.gpApp={state:{functions:[],flows:[],layers:[]},operationFields:{},renderToolbox(){},log(message){throw new Error(message)}};</script>
   <script src="/geoespacial-storage-pastas.js"></script><script src="/geoprocessamento-modeler.js"></script>`);
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try{
  browser=await chromium.launch({headless:true,channel:process.env.PW_BROWSER_CHANNEL||'msedge'});
  const page=await browser.newPage(),errors=[],writes=[],folders=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/api/**',async route=>{
   const req=route.request(),url=new URL(req.url());
   if(url.pathname.endsWith('/storage/saidas/pastas')){
    const folder=url.searchParams.get('caminho');folders.push(folder);
    if(folder.endsWith('/Falha'))return route.fulfill({status:502,json:{detail:'Storage indisponível'}});
    return route.fulfill({json:{caminho:folder,pastas:folder==='saidas-geoespaciais'?[{nome:'Projeto',caminho:folder+'/Projeto'}]:[],arquivos:[]}});
   }
   if(req.method()==='POST'||req.method()==='PUT'){writes.push(req.postDataJSON());return route.fulfill({json:{id:'synthetic'}})}
   return route.fulfill({json:[]});
  });
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  const main=fs.readFileSync(path.join(root,'geoespacial','geoprocessamento.js'),'utf8');
  const configure=main.slice(main.indexOf('  function configureOutputFields('),main.indexOf('  function fieldHtml('));
  await page.evaluate(source=>{
   window.configureOutput=new Function('state','CONTENT_INPUTS','crsLabel','suggestOutputName',source+';return configureOutputFields;')(gpApp.state,new Set(),value=>value,()=>{});
   window.showOutput=(raster=false,op='OP-03')=>{
    const form=document.querySelector('#output');
    form.innerHTML='<div class="field"><label>Destino</label><select name="destino"><option>storage</option></select></div><div class="field"><input name="nome_saida" value="Original"></div><div class="field"><select name="formato_saida"><option>GeoPackage</option></select></div>';
    configureOutput(form,raster,[op]);return [...form.elements.formato_saida.options].map(option=>option.value);
   };
  },configure);
  assert.deepEqual(await page.evaluate(()=>showOutput()),['GeoPackage','GeoJSON','Shapefile']);
  assert.equal(await page.locator('#output [name="nome_saida"]').isVisible(),false);
  assert.equal(await page.locator('#output [name="formato_saida"]').isVisible(),false);
  const browse=page.locator('#output [data-explorar-saida]');
  assert.equal(await browse.innerText(),'');
  assert.equal(await browse.getAttribute('aria-label'),'Escolher destino da saída');
  assert.equal(await browse.locator('svg').count(),1);
  const inputBox=await page.locator('#output [data-pasta-saida]').boundingBox(),buttonBox=await browse.boundingBox();
  assert(inputBox.width>100&&buttonBox.width>=24);
  assert(Math.abs(inputBox.y-buttonBox.y)<2);
  assert(buttonBox.x>=inputBox.x+inputBox.width&&buttonBox.width<=32);
  await browse.click();
  assert.equal(await page.locator('[data-saida-nome]').isVisible(),true);
  assert.equal(await page.locator('[data-saida-formato]').isVisible(),true);
  await page.locator('[data-entrar="saidas-geoespaciais/Projeto"]').click();
  await page.locator('[data-saida-nome]').fill('Resultado final');
  await page.locator('[data-saida-formato]').selectOption('GeoJSON');
  await page.locator('[data-acao="salvar"]').click();
  assert.deepEqual(await page.locator('#output').evaluate(form=>Object.fromEntries(new FormData(form))),{
   destino:'storage',pasta_saida:'saidas-geoespaciais/Projeto',nome_saida:'Resultado final',formato_saida:'GeoJSON'
  });
  await browse.click();await page.locator('[data-saida-nome]').fill('Descartado');
  await page.locator('.storage-pastas-botoes [data-acao="cancelar"]').click();
  assert.equal(await page.locator('[name="nome_saida"]').inputValue(),'Resultado final');
  assert.deepEqual(await page.evaluate(()=>showOutput(true,'OP-20')),['GeoTIFF']);
  assert.deepEqual(await page.evaluate(()=>showOutput(false,'OP-22')),['JSON']);
  await page.evaluate(()=>{document.querySelector('[data-pasta-saida]').value='saidas-geoespaciais/Falha'});
  await browse.click();await page.locator('.storage-pastas-status.erro').waitFor();
  assert.equal(await page.locator('[data-acao="salvar"]').isDisabled(),true);
  await page.locator('.storage-pastas-botoes [data-acao="cancelar"]').click();
  await page.evaluate(()=>{
   gpModeler.open('function',{id:'synthetic',nome:'Teste',passos:[]});
   const d=gpModeler._debug,e=d.activeEditor();
   e.nodes=[
    {id:'i',kind:'input',ref:'entrada',label:'Entrada',params:{valor:'synthetic'},x:0,y:0},
    {id:'a',kind:'algorithm',ref:'OP-03',label:'Normalizar',params:{camada_id:'$entrada'},x:100,y:0},
    {id:'o',kind:'output',ref:'saida',label:'Saída',params:{nome_saida:'Final',pasta_saida:'saidas-geoespaciais/Projeto',destino:'storage',formato_saida:'GeoJSON'},x:200,y:0}
   ];
   e.edges=[{id:'e1',from:'i',to:'a',parameter:'camada_id'},{id:'e2',from:'a',to:'o'}];e.selected='o';d.render(e);
  });
  assert.equal(await page.locator('#gp-model-properties-view [data-explorar-saida]').innerText(),'');
  assert.equal(await page.locator('[data-output-field="nome_saida"]').isVisible(),false);
  assert.equal(await page.locator('[data-output-field="formato_saida"]').isVisible(),false);
  await page.evaluate(()=>gpModeler._debug.handleModelCommand('model-save'));
  assert.equal(writes.length,1);
  assert.deepEqual(writes[0].passos[1],{algoritmo_id:'OP-27',parametros:{
   nome_saida:'Final',pasta_saida:'saidas-geoespaciais/Projeto',destino:'storage',formato_saida:'GeoJSON',crs_saida:'entrada',entrada:'$camada_id'
  }});
  assert(folders.every(folder=>folder==='saidas-geoespaciais'||folder.startsWith('saidas-geoespaciais/')));
  assert.deepEqual(errors,[]);
  console.log('PASS destino: ícone na mesma linha, navegação, nome/formato, cancelamento, falha de storage, vetor/raster/relatório e compilação do modelo.');
 }finally{await browser?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1});
