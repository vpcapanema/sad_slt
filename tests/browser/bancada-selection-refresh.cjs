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
  const page=await browser.newPage(),errors=[],requests=[];
  page.on('pageerror',error=>errors.push(error.stack||error.message));
  const id='storage:base-geoespacial/rios.gpkg::rios',arquivo='base-geoespacial/rios.gpkg';
  await page.route('**/api/**',route=>{
   const url=new URL(route.request().url()),pathname=url.pathname;
   requests.push(pathname);
   if(pathname.endsWith('/bancada-arquivos/preparar'))return route.fulfill({json:{
    id,nome:'rios',arquivo,revisao:'rev-1',representacao:'tiles',
    campos:[{nome:'nome',tipo:'String'}],campo_fid_tile:'slt_fid',
    crs_arquivo:'EPSG:4326',feicoes:1,geometria_tipo:'Multi Line String',
    bounds:[-47,-24,-46,-23],
   }});
   if(pathname.includes('/storage/camada/tiles/'))return route.fulfill({status:200,headers:{'Content-Type':'application/x-protobuf'},body:Buffer.alloc(0)});
   if(pathname.endsWith('/catalogo/projeto'))return route.fulfill({json:{toolboxes:[]}});
   if(pathname.endsWith('/ambientes'))return route.fulfill({json:{}});
   if(pathname.endsWith('/funcoes')||pathname.endsWith('/fluxos'))return route.fulfill({json:[]});
   return route.fulfill({json:{}});
  });
  await page.goto(`http://127.0.0.1:${server.address().port}/`,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.gpApp?.state.map?.isStyleLoaded()&&window.gpArquivos?.sessions);
  await page.evaluate(([layerId,file])=>gpArquivos.abrirReferencias([{id:layerId,arquivo:file,nome:'rios'}]),[id,arquivo]);
  await page.waitForFunction(layerId=>!!gpApp.state.map.getSource(layerId),id);

  await page.evaluate(layerId=>gpApp.openSymbology(layerId),id);
  await page.waitForFunction(layerId=>gpApp.state.symbologyFieldsCache?.[layerId]?.length,id);
  assert.deepEqual(await page.evaluate(layerId=>gpApp.state.symbologyFieldsCache[layerId].map(field=>field.nome),id),['nome']);
  assert.equal(requests.some(pathname=>pathname.includes('/simbologia/campos')),false);

  await page.evaluate(layerId=>gpCommands.selectFeature(layerId,{
   type:'Feature',id:1,properties:{slt_fid:1},
   geometry:{type:'LineString',coordinates:[[-46.8,-23.8],[-46.2,-23.2]]},
  }),id);
  assert.equal(await page.evaluate(()=>gpApp.state.nativeSelectionLayers.length),3);
  await page.evaluate(layerId=>{
   window.__storageSourceBefore=gpApp.state.map.getSource(layerId);
   window.__storageLayersBefore=['fill','line','point'].map(suffix=>gpApp.state.map.getLayer(suffix==='fill'?layerId:`${layerId}-${suffix}`));
   window.__selectionLayersBefore=gpApp.state.nativeSelectionLayers.map(selectionId=>gpApp.state.map.getLayer(selectionId));
  },id);
  await page.evaluate(([layerId,file])=>gpApp.adicionarCamadaStorageTiles(layerId,'rios',{
   caminho:file,arquivo:file,revisao:'rev-2',geometria_tipo:'Multi Line String',
   campo_fid_tile:'slt_fid',bounds:[-47,-24,-46,-23],
  }),[id,arquivo]);
  assert.equal(await page.evaluate(layerId=>gpApp.state.map.getSource(layerId)===window.__storageSourceBefore,id),true,'a mesma fonte vetorial é mantida e somente seus tiles são atualizados');
  assert.equal(await page.evaluate(([layerId,suffixes])=>suffixes.every((suffix,index)=>{
   const layerIdAtual=suffix==='fill'?layerId:`${layerId}-${suffix}`;
   return gpApp.state.map.getLayer(layerIdAtual)===window.__storageLayersBefore[index];
  }),[id,['fill','line','point']]),true,'as mesmas camadas do mapa continuam montadas');
  assert.equal(await page.evaluate(()=>gpApp.state.nativeSelectionLayers.length),3);
  assert.equal(await page.evaluate(()=>gpApp.state.nativeSelectionLayers.every((selectionId,index)=>gpApp.state.map.getLayer(selectionId)===window.__selectionLayersBefore[index])),true,'as camadas de seleção também permanecem montadas');
  assert.deepEqual(await page.evaluate(layerId=>gpApp.state.selectedGeoJSON.features.map(feature=>feature.properties.__gp_selection_key),id),['1']);
  assert.equal(await page.evaluate(layerId=>gpApp.state.map.getStyle().layers
   .filter(layer=>layer.id.startsWith('gp-selection-native-'))
   .every(layer=>layer.source===layerId),id),true);
  assert.deepEqual(errors,[]);
  console.log('OK: simbologia usa metadados nativos e seleção é preservada ao atualizar a fonte.');
 }finally{
  await browser.close();
  server.closeAllConnections?.();
  await new Promise(resolve=>server.close(resolve));
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
