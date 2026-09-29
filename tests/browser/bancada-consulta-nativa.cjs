// Consulta/filtro/seleção sobre arquivo nativo em tiles: nada de GeoJSON integral.
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
 let browser;
 try{
  browser=await chromium.launch({headless:true,...(process.env.PW_CHROMIUM?{executablePath:process.env.PW_CHROMIUM}:{}),args:['--no-sandbox','--no-proxy-server','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
  const p=await browser.newPage({viewport:{width:1600,height:1100}}),errors=[],requests=[],queries=[];
  p.on('pageerror',e=>errors.push(e.stack||e.message));
  let mode='ok';
  await p.route('**/api/**',r=>{
   const u=new URL(r.request().url()),url=u.pathname;requests.push(url);
   if(url.includes('/storage/camada/tiles/'))return r.fulfill({status:204,body:''});
   if(url.endsWith('/bancada-arquivos/consulta')){
    const data=r.request().postDataJSON();queries.push(data);
    if(mode==='missing')return r.fulfill({status:404,json:{detail:'Not Found'}});
    if(mode==='truncado')return r.fulfill({json:{id:data.id,revisao:data.revisao,total:9000,ids:Array.from({length:1000},(_,i)=>String(i)),has_more:true}});
    const ids=data.expressao.includes('valor == 1')?['11']:['10','11'];
    return r.fulfill({json:{id:data.id,revisao:data.revisao,total:ids.length,ids,has_more:false}});
   }
   if(url.endsWith('/bancada-arquivos/geometrias')){
    const data=r.request().postDataJSON();
    return r.fulfill({json:{features:data.ids.map(id=>({type:'Feature',id,properties:{},geometry:{type:'Point',coordinates:[-46,-23]}}))}});
   }
   let body={};
   if(url.endsWith('/catalogo/projeto'))body={toolboxes:[]};
   if(url.endsWith('/camadas'))body=[];
   if(url.endsWith('/extracao-atributos/catalogo'))body={camadas:[]};
   return r.fulfill({json:body});
  });
  await p.goto(`http://127.0.0.1:${server.address().port}/`,{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=>window.gpApp?.state.map?.isStyleLoaded()&&window.gpArquivos&&window.gpCommands);
  await p.evaluate(()=>{window.__msgs=[];const n=window.gpFeedback?.Notify;if(n){const info=n.info.bind(n);n.info=(t,m,o)=>{window.__msgs.push(m);return info(t,m,o);};}});
  const ID='storage:base/nativa.gpkg';
  const file={id:ID,nome:'Nativa',arquivo:'base/nativa.gpkg',revisao:'a'.repeat(64),representacao:'tiles',campos:[{nome:'valor',tipo:'Integer'}],campo_fid_tile:'slt_fid',bounds:[-46,-23,-45,-22],geometria_tipo:'Point',feicoes:3};
  await p.evaluate(file=>gpArquivos.adicionar(file,{lote:true}),file);
  await p.waitForFunction(id=>gpApp.state.layers.some(l=>l.id===id)&&gpApp.state.map.getSource(id),ID);
  await p.evaluate(id=>{gpApp.state.activeLayerId=id;},ID);
  const baseFilters=await p.evaluate(id=>gpApp.state.map.getStyle().layers.filter(l=>l.source===id).map(l=>[l.id,l.filter]),ID);
  const lastMsg=()=>p.evaluate(()=>window.__msgs.at(-1));
  const run=async(action,expression)=>{await p.evaluate(a=>gpCommands[a](),action);await p.locator('#gp-query-attributes textarea').fill(expression);const before=await p.evaluate(()=>window.__msgs.length);await p.locator('#gp-query-attributes button.primary').click();await p.waitForFunction(n=>window.__msgs.length>n,before);return lastMsg();};

  // Filtro: estilo por FID exato, fonte continua vetorial.
  assert.match(await run('filterLayer','valor < 3'),/2 feições exibidas/);
  assert.equal(queries.at(-1).id,ID);assert.equal(queries.at(-1).revisao,'a'.repeat(64));assert.equal(queries.at(-1).limite,1000);
  const state1=await p.evaluate(id=>({type:gpApp.state.map.getSource(id).type,filters:gpApp.state.map.getStyle().layers.filter(l=>l.source===id&&!l.id.startsWith('gp-selection')).map(l=>l.filter),expr:gpApp.state.layerFilters[id],table:gpApp.state.layerFilterFeatures[id].features.map(f=>f.id)}),ID);
  assert.equal(state1.type,'vector');assert.equal(state1.expr,'valor < 3');assert.deepEqual(state1.table,['10','11']);
  state1.filters.forEach(f=>assert(JSON.stringify(f).includes('["in",["to-string",["get","slt_fid"]],["literal",["10","11"]]]'),JSON.stringify(f)));

  // Reabrir tabela/atualizar filtro na mesma revisão não reconsulta; nova revisão reconsulta por FID.
  let n=queries.length;
  await p.evaluate(id=>gpCommands.refreshLayerFilter(id),ID);assert.equal(queries.length,n);
  await p.evaluate(id=>{gpArquivos.sessions.get(id).revisao='e'.repeat(64);return gpCommands.refreshLayerFilter(id);},ID);
  assert.equal(queries.length,n+1);assert.equal(queries.at(-1).revisao,'e'.repeat(64));
  assert.equal(await p.evaluate(id=>gpApp.state.map.getSource(id).type,ID),'vector');

  // Seleção por atributo dentro do filtro: chaves = FIDs, sem geometria de tile.
  assert.match(await run('selectByAttribute','valor == 1'),/1 feições selecionadas/);
  assert.equal(queries.at(-1).expressao,'(valor < 3) and (valor == 1)');
  const sel=await p.evaluate(()=>({feats:gpApp.state.selectedGeoJSON.features.map(f=>[f.properties.__gp_selection_key,f.geometry]),native:gpApp.state.nativeSelectionLayers.map(id=>{const l=gpApp.state.map.getLayer(id);return [l.source,JSON.stringify(gpApp.state.map.getFilter(id))];})}));
  assert.deepEqual(sel.feats,[['11',null]]);assert.equal(sel.native.length,3);sel.native.forEach(([source,filter])=>{assert.equal(source,ID);assert(filter.includes('["literal",["11"]]'));});
  await p.evaluate(()=>gpCommands.fitSelection());
  assert(requests.some(u=>u.endsWith('/bancada-arquivos/geometrias')),'ajuste da seleção lê apenas as geometrias selecionadas');

  // Consulta acima do limite: erro explícito, nada muda.
  mode='truncado';
  assert.match(await run('filterLayer','valor >= 0'),/9000 feições.*limite.*1000.*Nada foi aplicado/);
  assert.equal(await p.evaluate(id=>gpApp.state.layerFilters[id],ID),'valor < 3');
  assert.deepEqual(await p.evaluate(()=>gpApp.state.selectedGeoJSON.features.map(f=>f.properties.__gp_selection_key)),['11']);

  // Endpoint limitado ausente: erro explícito, sem recuo para GeoJSON integral.
  mode='missing';
  assert.match(await run('selectByAttribute','valor == 2'),/\/consulta.*Nada foi aplicado/);
  mode='ok';

  // Limpar filtro restaura os filtros originais do estilo.
  await p.evaluate(()=>gpCommands.filterLayer());await p.locator('[data-clear-filter]').click();
  await p.waitForFunction(id=>!gpApp.state.layerFilters[id],ID);
  assert.deepEqual(await p.evaluate(id=>gpApp.state.map.getStyle().layers.filter(l=>l.source===id&&!l.id.startsWith('gp-selection')).map(l=>[l.id,l.filter]),ID),baseFilters);

  // Sessão em tiles sem FID no tile: recusa sem consultar o servidor.
  const count=queries.length;
  await p.evaluate(file=>gpArquivos.adicionar({...file,id:'storage:base/sem_fid.gpkg',arquivo:'base/sem_fid.gpkg',campo_fid_tile:undefined},{lote:true}),file);
  await p.waitForFunction(()=>gpApp.state.map.getSource('storage:base/sem_fid.gpkg'));
  await p.evaluate(()=>{gpApp.state.activeLayerId='storage:base/sem_fid.gpkg';});
  assert.match(await run('filterLayer','valor < 3'),/não trazem o FID original/);
  assert.equal(queries.length,count);

  // Camada do storage montada em tiles fora da bancada: sem FID no tile, recusa explícita, fonte vetorial preservada.
  const SID='storage:base/catalogo.gpkg';
  await p.evaluate(id=>gpApp.adicionarCamadaStorageTiles(id,'Catálogo',{caminho:'base/catalogo.gpkg',geometria_tipo:'Point',bounds:[-46,-23,-45,-22]},{lote:true}),SID);
  await p.waitForFunction(id=>gpApp.state.map.getSource(id),SID);
  await p.evaluate(id=>{gpApp.state.activeLayerId=id;gpApp.state.layerFilters={...gpApp.state.layerFilters,[id]:'valor < 3'};},SID);
  const refresh=await p.evaluate(id=>gpCommands.refreshLayerFilter(id).then(()=>'ok',e=>e.message),SID);
  assert.match(refresh,/não trazem o FID original/);
  assert.equal(await p.evaluate(id=>gpApp.state.map.getSource(id).type,SID),'vector');
  assert.equal(queries.length,count);

  await p.evaluate(file=>gpArquivos.adicionar({...file,id:'storage:base/zm.gpkg',arquivo:'base/zm.gpkg',geometria_tem_z:true},{lote:true}),file);
  await p.waitForFunction(()=>gpApp.state.map.getSource('storage:base/zm.gpkg'));
  await p.evaluate(()=>{gpApp.state.activeLayerId='storage:base/zm.gpkg';});
  assert.match(await p.evaluate(()=>gpArquivos.editar().then(()=>'ok',error=>error.message)),/não está disponível.*Z\/M.*não preserva/);
  assert.equal(queries.length,count);

  assert(!requests.some(u=>u.endsWith('/bancada-arquivos/consultar')||u.endsWith('/geojson')||u.includes('/consultar-atributos')||u.endsWith('/extracao-atributos/arquivo-mapa')),requests.join('\n'));
  assert.deepEqual(errors,[]);
  console.log('PASS consulta nativa: filtro por FID no estilo, seleção sem geometria de tile, limite e endpoint ausente explícitos, limpar restaura, sem GeoJSON integral.');
 }finally{await browser?.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
})().catch(error=>{console.error(error);process.exitCode=1;});
