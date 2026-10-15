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
 const browser=await chromium.launch({headless:true,channel:'msedge',args:['--no-sandbox','--no-proxy-server','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
 try{
  const page=await browser.newPage({viewport:{width:1600,height:1100}});
  const errors=[],requests=[],tablePayloads=[],savePayloads=[],geometryPayloads=[];
  page.on('pageerror',error=>errors.push(error.stack||error.message));
  await page.route('**/api/**',async route=>{
   const url=new URL(route.request().url()),pathname=url.pathname;
   requests.push({method:route.request().method(),pathname});
   if(pathname.endsWith('/camadas/resultado-banco/atributos/tabela'))return route.fulfill({json:{colunas:[{nome:'valor',tipo:'int64'}],registros:[{valor:42,_indice:0,__gp_feature:{type:'Feature',properties:{valor:42},geometry:null}}],total:1,revisao:'revisao-banco',somente_leitura:'Resultado de teste'}});
   if(pathname.endsWith('/bancada-arquivos/preparar'))return route.fulfill({json:{id:'storage:table-test',nome:'Tabela remota',arquivo:'base-geoespacial/teste.gpkg',revisao:'rev-1',representacao:'tiles',tiles_url:'http://127.0.0.1/empty-tiles/{z}/{x}/{y}',feicoes:105,campos:[{nome:'valor',tipo:'Integer'}]}});
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
   if(pathname.endsWith('/bancada-arquivos/local/tabela')){const p=route.request().postDataJSON();tablePayloads.push(p);return route.fulfill({json:{id:p.id,revisao:p.revisao,total:2,linhas:[{id:'1',atributos:{valor:7}},{id:'2',atributos:{valor:8}}],has_more:false}});}
   if(pathname.endsWith('/bancada-arquivos/local/geometrias')){const p=route.request().postDataJSON();geometryPayloads.push(p);return route.fulfill({json:{type:'FeatureCollection',features:p.ids.map(id=>({type:'Feature',id,geometry:{type:'Point',coordinates:[-46,-23]},properties:{}}))}});}
   if(pathname.endsWith('/bancada-arquivos/local/classificacao'))return route.fulfill({json:{categorias:[{valor:'7',contagem:1},{valor:'8',contagem:1}],total_distintos:2}});
   if(pathname.endsWith('/storage/camada/raster-preview'))return route.fulfill({json:{image:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==',coordinates:[[-47,-23],[-46,-23],[-46,-24],[-47,-24]],bounds:[-47,-24,-46,-23]}});
   if(pathname.endsWith('/importar_camadas/inspecionar'))return route.fulfill({json:{token_importacao:'raster-token',camadas:[{nome:'Raster',tipo:'raster',crs_original:'EPSG:4326'}],categoria:'raster',crs_identificado:'EPSG:4326'}});
   if(pathname.endsWith('/storage/upload/job'))return route.fulfill({json:{id:'upload',status:'concluido',resultado:{pasta:'base-geoespacial',arquivos:['raster.tif'],camadas:[{id:'storage:raster',arquivo:'base-geoespacial/raster.tif',nome:'Raster',tipo:'raster'}]}}});
   if(pathname.endsWith('/ambientes'))return route.fulfill({json:{}});
   if(pathname.endsWith('/camadas'))return route.fulfill({json:[]});
   if(pathname.endsWith('/catalogo/projeto'))return route.fulfill({json:{toolboxes:[]}});
    if(pathname.endsWith('/funcoes')||pathname.endsWith('/fluxos'))return route.fulfill({json:[]});
    return route.fulfill({json:{}});
  });
  await page.goto(`http://127.0.0.1:${server.address().port}/`,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.gpApp?.state.map?.isStyleLoaded()&&window.gpArquivos?.sessions&&window.gpAttributeTable);
  await page.evaluate(()=>{
    const file={id:'local:sample',nome:'Local upload',origem_geometria:'local_temporaria',representacao:'tiles',tiles_token:'token',revisao:'token',campo_fid_tile:'slt_fid',bounds:[-47,-24,-46,-23],feicoes:2,campos:[{nome:'valor',tipo:'Integer'}]};
    gpArquivos.sessions.set(file.id,file);
    gpApp.adicionarCamadaStorageTiles(file.id,file.nome,{...file,caminho:file.id,tiles_url:location.origin+'/empty-tiles/{z}/{x}/{y}'},{estiloPreparado:true});
  });
  await page.evaluate(()=>gpApp.showAttributes('local:sample'));
  await page.waitForFunction(()=>gpAttributeTable.grid?.getData().length===2);
  assert.equal(await page.locator('[data-at-action="edit"]').isDisabled(),true);
  assert.equal(tablePayloads.at(-1).tiles_token,'token');
  assert.equal(tablePayloads.at(-1).arquivo,undefined);
  assert(!requests.some(r=>r.pathname.endsWith('/bancada-arquivos/preparar')));
  await page.locator('.tabulator-row').first().click();
  await page.waitForFunction(()=>gpApp.state.selectedGeoJSON?.features[0]?.id==='1');
  assert.equal(geometryPayloads.at(-1).tiles_token,'token');
  await page.evaluate(()=>gpApp.openSymbology('local:sample'));
  await page.locator('[data-sym-type="categorizado"]').click();
  await page.waitForFunction(()=>gpApp.state.layerStyles['local:sample']?.renderer?.categorias?.length===2);
  assert(requests.some(r=>r.pathname.endsWith('/local/classificacao')));
  await page.locator('[data-action="import-file"]').click();
  await page.locator('#gp-local-upload').setInputFiles({name:'raster.tif',mimeType:'image/tiff',buffer:Buffer.from('synthetic upload; inspection mocked')});
  await page.locator('#pfsSuccessOk').waitFor({state:'visible'});await page.locator('#pfsSuccessOk').click();
  await page.evaluate(()=>{document.querySelector('#gp-import-pasta').value='base-geoespacial';document.querySelector('#gp-op-form').requestSubmit();});
  await page.locator('#pfsConfirmOk').click();
  await page.waitForFunction(()=>gpApp.state.map.getLayer('storage:raster')&&!gpApp.state.activeImport);

  assert.equal(await page.evaluate(()=>gpApp.state.map.getLayer('storage:raster').type),'raster');
  await page.evaluate(()=>gpApp.refreshLayers(true));
  assert.equal(await page.evaluate(()=>gpApp.state.layers.some(l=>l.id==='storage:raster')),true);
  assert.equal(errors.length,0,errors.join('\n'));
  console.log(JSON.stringify({temporaryTable:true,temporarySelection:true,rasterPreview:true,errors}));
 }finally{
  await browser.close();
  server.closeAllConnections?.();
  await new Promise(resolve=>server.close(resolve));
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
