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
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--no-proxy-server','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
 try{
 const p=await browser.newPage({viewport:{width:1600,height:1100}}),errors=[],preparar=[],completos=[],tiles=[],boundsReqs=[],tabela=[];
 p.on('pageerror',e=>errors.push(e.message));
 const REV='a'.repeat(64),ID='storage:base-geoespacial/rios.gpkg::rios',ARQ='base-geoespacial/rios.gpkg';
 const fc={type:'FeatureCollection',features:[{type:'Feature',id:1,properties:{nome:'Tietê'},geometry:{type:'LineString',coordinates:[[-46.8,-23.8],[-46.2,-23.2]]}}]};
 const meta=(id,arquivo,revisao=REV)=>({id,nome:id.split('::')[1]||'Camada',arquivo,revisao,campos:[{nome:'nome',tipo:'String'}],crs_arquivo:'GEOGCS["WGS 84"]',feicoes:1,geometria_tipo:'Multi Line String',bounds:[-47,-24,-46,-23]});
 let revisaoCompleta=REV;
 await p.route('**/api/**',r=>{
  const u=new URL(r.request().url()),url=u.pathname;let body=[];
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

 // 1. Abertura leve: só metadados via /preparar e fonte vetorial de tiles do storage.
 await p.evaluate(([id,arquivo])=>gpArquivos.abrirReferencias([{id,arquivo,nome:'rios'}]),[ID,ARQ]);
 assert.deepEqual(preparar,[{id:ID,arquivo:ARQ}]);
 assert.equal(completos.length,0,'abertura não pode baixar o GeoJSON completo');
 const aberto=await p.evaluate(id=>{const m=gpApp.state.map,s=m.getStyle(),f=gpArquivos.sessions.get(id);return{src:s.sources[id],layers:s.layers.filter(l=>l.source===id).map(l=>({id:l.id,sl:l['source-layer']})),rep:f.representacao,temGeo:'geojson' in f,destino:gpApp.state.layers.find(l=>l.id===id)?.destino,ativo:gpApp.state.activeLayerId,tipos:gpApp.state.geometryTypes[id]};},ID);
 assert.equal(aberto.src.type,'vector');
 const tileUrl=new URL(aberto.src.tiles[0].replace('{z}/{x}/{y}','0/0/0'));
 assert(tileUrl.pathname.endsWith('/storage/camada/tiles/0/0/0.pbf'));
 assert.equal(tileUrl.searchParams.get('caminho'),ARQ);assert.equal(tileUrl.searchParams.get('camada'),'rios');assert.equal(tileUrl.searchParams.get('v'),REV);
 assert.equal(aberto.layers.length,3);assert(aberto.layers.every(l=>l.sl==='camada'),'source-layer é a camada interna fixa do MVT');
 assert.equal(aberto.rep,'tiles');assert.equal(aberto.temGeo,false);assert.equal(aberto.destino,'storage_original');assert.equal(aberto.ativo,ID);assert.deepEqual(aberto.tipos,['LineString']);
 for(let i=0;i<50&&!tiles.length;i++)await p.waitForTimeout(200);
 assert(tiles.length>0,'o mapa deve requisitar tiles do original');
 assert(tiles.every(t=>t.searchParams.get('caminho')===ARQ&&t.searchParams.get('camada')==='rios'));
 // Catálogo recarregado não remove a camada do storage aberta em tiles.
 await p.evaluate(()=>gpApp.refreshLayers?.()).catch(()=>{});
 assert(await p.evaluate(id=>gpApp.state.layers.some(l=>l.id===id)&&!!gpApp.state.map.getSource(id),ID));

 // 2. Fluxo fora do storage continua com GeoJSON em memória.
 await p.evaluate(()=>gpArquivos.abrirReferencias([{id:'local-ext',arquivo:'externo/x.geojson',nome:'Externo'}]));
 assert.equal(completos.length,1);assert.equal(preparar.length,1);
 assert.equal(await p.evaluate(()=>gpApp.state.map.getStyle().sources['local-ext'].type),'geojson');
 assert.equal(await p.evaluate(()=>Array.isArray(gpArquivos.sessions.get('local-ext').geojson.features)),true);

 // 3. Atualizar fonte relê pelo /preparar e mantém tiles.
 await p.evaluate(id=>{gpApp.state.activeLayerId=id;},ID);
 await p.locator('[data-ribbon="dados"]').click();await p.locator('[data-action="refresh-source"]').click();
 await p.waitForFunction(()=>true);await p.waitForTimeout(300);
 assert.equal(preparar.length,2);assert.equal(completos.length,1);
 assert.equal(await p.evaluate(id=>gpArquivos.sessions.get(id).representacao==='tiles'&&!gpArquivos.sessions.get(id).geojson,ID),true);

 // 4. Tabela de atributos é paginada no servidor: não lê o GeoJSON integral.
 await p.evaluate(id=>gpApp.showAttributes(id),ID);
 for(let i=0;i<50&&!tabela.length;i++)await p.waitForTimeout(100);
 assert.equal(completos.length,1,'abrir a tabela não pode baixar o GeoJSON completo');
 assert.deepEqual(tabela[0],{id:ID,arquivo:ARQ,revisao:REV,offset:0,limite:tabela[0].limite});
 assert.equal(await p.evaluate(id=>!gpArquivos.sessions.get(id).geojson,ID),true);
 // Carga completa sob demanda (edição): leituras concorrentes compartilham uma requisição.
 await p.evaluate(id=>Promise.all([gpArquivos.garantirGeometria(id),gpArquivos.garantirGeometria(id)]),ID);
 assert.equal(completos.length,2,'leituras concorrentes compartilham a mesma carga completa');
 assert.deepEqual(completos[1],{arquivo:ARQ,id:ID});
 const carregado=await p.evaluate(id=>({n:gpArquivos.sessions.get(id).geojson?.features.length,rep:gpArquivos.sessions.get(id).representacao,src:gpApp.state.map.getStyle().sources[id].type}),ID);
 assert.deepEqual(carregado,{n:1,rep:'tiles',src:'vector'});
 await p.evaluate(id=>gpArquivos.garantirGeometria(id),ID);assert.equal(completos.length,2,'geometria já carregada não é relida');

 // 5. Original mudou no storage: a sessão passa a exibir a revisão lida.
 const ID2='storage:base-geoespacial/rios.gpkg::margens';
 await p.evaluate(([id,arquivo])=>gpArquivos.abrirReferencias([{id,arquivo,nome:'margens'}]),[ID2,ARQ]);
 revisaoCompleta='b'.repeat(64);
 await p.waitForFunction(id=>!!gpApp.state.map.getSource(id),ID2);
 await p.evaluate(id=>gpArquivos.garantirGeometria(id),ID2);
 // Com tiles ainda carregando, a montagem espera o estilo ficar ocioso.
 await p.waitForFunction(id=>gpApp.state.map.getStyle().sources[id]?.tiles?.[0].includes('v='+'b'.repeat(64)),ID2);
 const trocado=await p.evaluate(id=>{const f=gpArquivos.sessions.get(id);return{rev:f.revisao,geo:!!f.geojson,v:new URL(gpApp.state.map.getStyle().sources[id].tiles[0].replace('{z}/{x}/{y}','0/0/0')).searchParams.get('v')};},ID2);
 assert.deepEqual(trocado,{rev:'b'.repeat(64),geo:true,v:'b'.repeat(64)});
 revisaoCompleta=REV;

 // 5b. Pacote compactado do storage: sem /preparar nem tiles; leitura legada explícita.
 const IDZ='storage:uploads/pacote.zip::trechos',ARQZ='uploads/pacote.zip',prepAntes=preparar.length,compAntes=completos.length;
 await p.evaluate(([id,arquivo])=>gpArquivos.abrirReferencias([{id,arquivo,nome:'trechos'}]),[IDZ,ARQZ]);
 assert.equal(preparar.length,prepAntes,'pacote compactado não passa por /preparar');
 assert.equal(completos.length,compAntes+1);assert.deepEqual(completos.at(-1),{arquivo:ARQZ,id:IDZ});
 const pacote=await p.evaluate(id=>{const f=gpArquivos.sessions.get(id);return{rep:f.representacao,aprox:f.geometria_aproximada,src:gpApp.state.map.getStyle().sources[id].type};},IDZ);
 assert.deepEqual(pacote,{rep:'pacote_legado',aprox:true,src:'geojson'});
 await p.evaluate(id=>{gpApp.state.activeLayerId=id;},IDZ);
 const bloqueio=await p.evaluate(()=>gpArquivos.editar().then(()=>'',e=>e.message));
 assert.match(bloqueio,/prévia aproximada/);
 // 6. Edição de sessão em tiles carrega a geometria completa antes de abrir o editor.
 const ID3='storage:base-geoespacial/rios.gpkg::pontes';
 await p.evaluate(([id,arquivo])=>gpArquivos.abrirReferencias([{id,arquivo,nome:'pontes'}]),[ID3,ARQ]);
 await p.waitForFunction(id=>!!gpApp.state.map.getSource(id),ID3);
 const antes=completos.length;
 await p.evaluate(()=>gpArquivos.editar());
 assert.equal(completos.length,antes+1);assert.deepEqual(completos.at(-1),{arquivo:ARQ,id:ID3});
 assert.equal(await p.evaluate(id=>!!gpArquivos.sessions.get(id).geojson,ID3),true);
 assert.deepEqual(errors,[]);
 console.log('OK: storage em tiles via /preparar, source-layer MVT, fluxo local preservado, carga completa sob demanda.');
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
