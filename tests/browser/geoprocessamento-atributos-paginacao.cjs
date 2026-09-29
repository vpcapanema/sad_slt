const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');
const root=path.resolve(__dirname,'../..');

(async()=>{
 const server=http.createServer((req,res)=>{
  let name=new URL(req.url,'http://local').pathname;
  if(name==='/')name='/templates/componentes/_geoprocessamento.html';
  name=name.replace('/restrict/geoespacial/','/geoespacial/');
  const file=path.resolve(root,`.${name}`);
  if(path.relative(root,file).startsWith('..')){res.writeHead(403).end();return;}
  fs.readFile(file,(error,data)=>{
   if(error){res.writeHead(404).end();return;}
   res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'application/octet-stream');
   res.end(data);
  });
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--no-proxy-server','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
 try{
  const page=await browser.newPage({viewport:{width:1600,height:1100}});
  const errors=[],requests=[],tablePayloads=[],savePayloads=[],geometryPayloads=[];
  page.on('pageerror',error=>errors.push(error.stack||error.message));
  await page.route('**/api/**',async route=>{
   const url=new URL(route.request().url()),pathname=url.pathname;
   requests.push({method:route.request().method(),pathname});
   if(pathname.endsWith('/bancada-arquivos/tabela')){
    const payload=route.request().postDataJSON();
    tablePayloads.push(payload);
    return route.fulfill({json:{
     id:payload.id,arquivo:payload.arquivo,revisao:payload.revisao,total:105,
     offset:payload.offset,limite:payload.limite,
     linhas:Array.from({length:Math.max(0,Math.min(payload.limite,105-payload.offset))},(_,index)=>{
      const fid=payload.offset+index;
      return {id:`fid-${fid}`,atributos:{valor:fid}};
     }),
     has_more:payload.offset+payload.limite<105,
    }});
   }
   if(pathname.endsWith('/bancada-arquivos/geometrias')){
    const payload=route.request().postDataJSON();
    geometryPayloads.push(payload);
    return route.fulfill({json:{type:'FeatureCollection',features:payload.ids.map(id=>({type:'Feature',id,properties:{},geometry:{type:'Point',coordinates:[-46.6+Number(id.slice(4))/1000,-23.5]}}))}});
   }
   if(pathname.endsWith('/bancada-arquivos/salvar-edicoes')){
    savePayloads.push(route.request().postDataJSON());
     return route.fulfill({json:{id:'storage:table-test',arquivo:'base-geoespacial/teste.gpkg',camada:'teste',revisao:'rev-2'}});
   }
   if(pathname.endsWith('/ambientes'))return route.fulfill({json:{}});
   if(pathname.endsWith('/camadas'))return route.fulfill({json:[]});
   if(pathname.endsWith('/catalogo/projeto'))return route.fulfill({json:{toolboxes:[]}});
    if(pathname.endsWith('/funcoes')||pathname.endsWith('/fluxos'))return route.fulfill({json:[]});
    return route.fulfill({json:{}});
  });
  await page.goto(`http://127.0.0.1:${server.address().port}/`,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.gpApp?.state.map?.isStyleLoaded()&&window.gpArquivos?.sessions&&window.gpAttributeTable);
  await page.evaluate(()=>{
   const id='storage:table-test';
   gpApp.state.layers.push({id,nome:'Tabela remota',tipo:'vetorial',destino:'storage'});
   gpArquivos.sessions.set(id,{id,nome:'Tabela remota',arquivo:'base-geoespacial/teste.gpkg',revisao:'rev-1',representacao:'tiles',feicoes:105,campos:[{nome:'valor',tipo:'Integer'}]});
   gpArquivos.sincronizarSalvamento=async result=>{gpArquivos.sessions.get(id).revisao=result.revisao;};
   window.gpFeedback={ProcessFeedback:{confirmar:async()=>true}};
  });
  assert.equal(await page.evaluate(()=>gpApp.showAttributes.__gpFileTableHook),true);
  await page.evaluate(()=>gpApp.showAttributes('storage:table-test'));
  await page.waitForFunction(()=>gpAttributeTable.grid?.getData().length===100);
  await page.waitForFunction(()=>document.querySelector('[data-at-count]')?.textContent.includes('100 registros'));
  assert.equal(tablePayloads[0].offset,0);
  assert.equal(tablePayloads[0].limite,100);
  assert.equal(await page.evaluate(()=>gpAttributeTable.grid.getRows('active').length),100);
  assert(await page.locator('[data-at-count]').innerText().then(text=>text.includes('105 no total')));
  const mapSelection=()=>page.evaluate(()=>(gpApp.state.selectedGeoJSON?.features||[]).filter(feature=>feature.properties?.__gp_layer_id==='storage:table-test').map(feature=>({fid:feature.properties.__gp_selection_key,geometry:feature.geometry?.type})).sort((a,b)=>a.fid.localeCompare(b.fid)));
  await page.locator('.tabulator-row').first().click();
  await page.waitForFunction(()=>(gpApp.state.selectedGeoJSON?.features||[]).some(feature=>feature.properties?.__gp_selection_key==='fid-0'));
  await page.locator('.tabulator-page[data-page="next"]').click();
  await page.waitForFunction(()=>gpAttributeTable.grid?.getData()?.[0]?.__gp_fid==='fid-100');
  assert.equal(tablePayloads.at(-1).offset,100);
  assert.equal(tablePayloads.at(-1).limite,100);
  assert.equal(await page.evaluate(()=>gpAttributeTable.grid.getRows('active').length),5);
  assert(await page.locator('[data-at-count]').innerText().then(text=>text.includes('5 registros')));
  await page.locator('.tabulator-row').first().click();
  await page.waitForFunction(()=>(gpApp.state.selectedGeoJSON?.features||[]).some(feature=>feature.properties?.__gp_selection_key==='fid-100'));
  assert.deepEqual(await mapSelection(),[{fid:'fid-0',geometry:'Point'},{fid:'fid-100',geometry:'Point'}]);
  assert.deepEqual(geometryPayloads.map(payload=>payload.ids),[['fid-0'],['fid-100']]);
  assert(geometryPayloads.every(payload=>payload.revisao==='rev-1'&&payload.arquivo==='base-geoespacial/teste.gpkg'));
  await page.locator('.tabulator-page[data-page="prev"]').click();
  await page.waitForFunction(()=>gpAttributeTable.grid?.getData()?.[0]?.__gp_fid==='fid-0'&&gpAttributeTable.grid.getSelectedData().map(row=>row.__gp_fid).join()==='fid-0');
  await page.locator('.tabulator-page[data-page="next"]').click();
  await page.waitForFunction(()=>gpAttributeTable.grid?.getData()?.[0]?.__gp_fid==='fid-100'&&gpAttributeTable.grid.getSelectedData().map(row=>row.__gp_fid).join()==='fid-100');
  assert.deepEqual(await mapSelection(),[{fid:'fid-0',geometry:'Point'},{fid:'fid-100',geometry:'Point'}]);
  assert.equal(geometryPayloads.length,2);
  await page.locator('[data-at-action="edit"]').click();
  await page.locator('.tabulator-cell[tabulator-field="valor"]').first().dblclick();
  await page.locator('.tabulator-cell.tabulator-editing input').fill('999');
  await page.locator('.tabulator-cell.tabulator-editing input').press('Enter');
  await page.evaluate(()=>{gpAttributeTable.grid.deselectRow();gpAttributeTable.grid.selectRow('fid-101');});
  await page.locator('[data-at-action="delete"]').click();
  await page.waitForFunction(()=>!gpAttributeTable.grid.getData().some(row=>row.__gp_fid==='fid-101'));
  const saveResponse=page.waitForResponse(response=>response.url().endsWith('/bancada-arquivos/salvar-edicoes'));
  await page.locator('[data-at-save]').click();
  await saveResponse;
  await page.waitForFunction(()=>gpArquivos.sessions.get('storage:table-test').revisao==='rev-2');
  assert.deepEqual(savePayloads[0],{
   arquivo:'base-geoespacial/teste.gpkg',camada_id:'storage:table-test',revisao:'rev-1',
   edicoes:[{fid:'fid-100',campos:{valor:999}}],excluidos:['fid-101'],
  });
  assert.equal('geojson' in savePayloads[0],false);
  assert.equal(requests.some(request=>request.pathname.includes('/camadas/storage%3Atable-test/atributos/tabela')),false);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({pages:tablePayloads.length,saves:savePayloads.length,errors}));
 }finally{
  await browser.close();
  server.closeAllConnections?.();
  await new Promise(resolve=>server.close(resolve));
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
