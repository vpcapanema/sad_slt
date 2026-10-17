// Invocado pelo pytest: API/storage reais; banco em transacao revertida.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const url=process.env.SICARD_E2E_URL;
 assert(url&&process.env.SICARD_E2E_TOKEN,'Use o teste pytest opt-in para executar.');
 const browser=await chromium.launch({headless:true,channel:process.env.PW_BROWSER_CHANNEL||'msedge'});
 try{
  const context=await browser.newContext({viewport:{width:1500,height:1000}});
  await context.addCookies([{name:process.env.SICARD_E2E_COOKIE,value:process.env.SICARD_E2E_TOKEN,url}]);
  const page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('dialog',async dialog=>{
   if(dialog.type()==='confirm'&&dialog.message().includes('Executar'))await dialog.accept();
   else await dialog.dismiss();
  });
  page.setDefaultTimeout(45000);
  await page.goto(url+'/restrict/geoespacial/bancada/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.gpApp?.state.map?.isStyleLoaded()&&window.gpArquivos);
  const session=await page.evaluate(async()=>await(await fetch('/api/auth/session')).json());
  assert.equal(session.authenticated,true);
  await page.evaluate(async source=>{
   await gpArquivos.abrirReferencias([{id:'storage:'+source+'::Poligonos',arquivo:source,nome:'Poligonos'}]);
  },process.env.SICARD_E2E_SOURCE);
  await page.waitForFunction(source=>gpApp.state.layers.some(layer=>layer.id==='storage:'+source+'::Poligonos'),
                            process.env.SICARD_E2E_SOURCE).catch(async error=>{
   console.error((await page.locator('body').innerText()).slice(-3500));throw error;
  });
  async function run(input,filename,format){
   await page.evaluate(()=>gpApp.selectOp('OP-03'));
   await page.locator('#gp-op-form [name="camada_id"]').selectOption(input);
   await page.locator('#gp-op-form [name="crs_destino"]').selectOption('EPSG:3857');
   assert.equal(await page.locator('#gp-op-form [name="nome_saida"]').isVisible(),false);
   assert.equal(await page.locator('#gp-op-form [name="formato_saida"]').isVisible(),false);
   await page.locator('#gp-op-form [data-explorar-saida]').click();
   await page.locator(`[data-entrar="${process.env.SICARD_E2E_OUTPUT}"]`).click();
   await page.locator('[data-saida-nome]').fill(filename);
   await page.locator('[data-saida-formato]').selectOption(format);
   await page.locator('[data-acao="salvar"]').click();
   const invalid=await page.locator('#gp-op-form').evaluate(form=>[...form.elements].filter(e=>!e.checkValidity()).map(e=>({name:e.name,value:e.value,message:e.validationMessage})));
   assert.deepEqual(invalid,[]);
   const requests=[];
   page.on('request',r=>{if(r.method()==='POST')requests.push(new URL(r.url()).pathname)});
   const response=page.waitForResponse(r=>r.url().includes('/bancada-arquivos/executar')&&r.request().method()==='POST').catch(()=>null);
   await page.locator('#gp-op-form .editor-actions button.primary').click();
   const reply=await response;
   assert(reply,JSON.stringify({requests,errors,text:(await page.locator('body').innerText()).slice(-4000)}));
   assert(reply.ok(),await reply.text());
   await page.waitForFunction(()=>!gpApp.state.activeExecution&&!gpArquivos.busy,{},{timeout:90000});
   const ext=format==='GeoPackage'?'gpkg':'geojson';
   const path=process.env.SICARD_E2E_OUTPUT+'/'+filename+'.'+ext;
   await page.waitForFunction(path=>gpApp.state.layers.some(layer=>layer.arquivo===path||layer.id==='storage:'+path),path,{timeout:90000});
   const ok=page.locator('#pfsSuccessOk');
   if(await ok.isVisible())await ok.click();
   return 'storage:'+path;
  }
  const first=await run('storage:'+process.env.SICARD_E2E_SOURCE+'::Poligonos','Resultado','GeoPackage');
  await page.reload();
  await page.waitForFunction(()=>window.gpApp?.state.map?.isStyleLoaded()&&window.gpArquivos);
  const reopened=await page.evaluate(async id=>{
   const files=await gpArquivos.abrirReferencias([{id,arquivo:id.slice(8),nome:'Resultado'}]);
   if(!files.length)throw new Error(document.querySelector('#gp-log').innerText);
   return files[0].id;
  },first);
  await run(reopened,'Reprocessado','GeoJSON');
  await page.goto(url+'/restrict/geoespacial/extracao-atributos/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.SICARDExtracao);
  await page.evaluate(()=>SICARDExtracao.aguardarBancada());
  const embedded=page.frame({url:url+'/restrict/geoespacial/bancada/'});
  assert(embedded,'A extração deve incorporar a rota da própria bancada.');
  const embeddedId=await embedded.evaluate(async id=>{
   const files=await gpArquivos.abrirReferencias([{id,arquivo:id.slice(8),nome:'Resultado'}]);
   const resultId=files[0]?.id;
   if(!resultId)throw new Error('Resultado não abriu na bancada incorporada.');
   return resultId;
  },first);
  await page.waitForFunction(id=>SICARDExtracao.camadasNaBancada()?.some(layer=>layer.id===id&&layer.visivel),embeddedId);
  await embedded.evaluate(id=>{
   for(const suffix of ['','-line','-point'])if(gpApp.state.map.getLayer(id+suffix))
    gpApp.state.map.setLayoutProperty(id+suffix,'visibility','none');
   gpApp.renderLayers();
  },embeddedId);
  await page.waitForFunction(id=>SICARDExtracao.camadasNaBancada()?.some(layer=>layer.id===id&&!layer.visivel),embeddedId);
  await embedded.evaluate(id=>gpApp.removeLayerFromMap(id,false),embeddedId);
  await page.waitForFunction(id=>!SICARDExtracao.camadasNaBancada()?.some(layer=>layer.id===id),embeddedId);
  assert.deepEqual(errors,[]);
  console.log('PASS UI real: OP03/storage, recarga/reprocessamento e extração incorporando a mesma bancada, reabertura, visibilidade e remoção pela ponte.');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
