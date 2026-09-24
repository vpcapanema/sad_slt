// Aplicação e mapas reais; serviços interceptados para não persistir dados.
const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--no-proxy-server','--enable-unsafe-swiftshader']});
 const p=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],pedidos=[];let seq=0;
 p.on('pageerror',e=>errors.push(e.message));
 const fc={type:'FeatureCollection',features:[{type:'Feature',properties:{valor:1},geometry:{type:'Point',coordinates:[-46,-23]}}]};
 const catalog={categorias:[{id:'social',nome:'Social'}],camadas:['entrada','base'].map(id=>({id,nome:id,origem:'importadas',arquivo:`acervo/${id}.gpkg`}))};
 await p.route('**/api/**',async r=>{
  const u=new URL(r.request().url()),path=u.pathname,send=json=>r.fulfill({json});
  if(path.includes('/auth/'))return send({authenticated:true,id:'teste',nome:'Teste',username:'TESTE',tipo_usuario:'ADMIN'});
  if(path.endsWith('/catalogo'))return send(catalog);
  if(path.endsWith('/storage/navegar'))return send({pastas:[],arquivos:[]});
  if(path.endsWith('/arquivo-mapa'))return send({...catalog.camadas.find(c=>c.id===r.request().postDataJSON().id),geojson:fc,campos:[{nome:'valor'}]});
  if(path.endsWith('/entrada-local/jobs')){
   const nome=u.searchParams.get('nome'),id=++seq;
   const camadas=[0,1].map(i=>({id:`local:${id}:${i}`,chave:`${nome}::${i}`,arquivo:nome,nome:`Camada ${id}.${i}`,tipo:'vetor',origem:'local',status_validacao:'valida',geojson:fc}));
   camadas.push({id:`erro:${id}`,chave:`${nome}::erro`,arquivo:nome,nome:`Sem CRS ${id}`,tipo:'vetor',status_validacao:'invalida',erro:'CRS ausente'});
   return send({id:`job${id}`,status:'concluido',resultado:{camadas,entrada:{id:`local:arquivo${id}`,nome,origem:'local',geojson:fc},resumo:{total:3,validas:2,invalidas:1}}});
  }
  if(path.endsWith('/execucoes')&&r.request().method()==='POST'){pedidos.push(r.request().postDataJSON());return send({id:'teste',status:'erro',erro:'Fim do teste: nenhuma saída foi gravada.'});}
  return send([]);
 });
 await p.addInitScript(()=>{Object.defineProperty(window,'__previewMap',{writable:true,value:null});const timer=setInterval(()=>{if(window.L&&!window.L.__capture){window.L.__capture=true;const fn=window.L.map;window.L.map=function(...args){const m=fn.apply(this,args);if(args[0]?.id==='ea-input-preview-map')window.__previewMap=m;return m;};clearInterval(timer);}},1);});
 await p.goto('http://127.0.0.1:8083/restrict/geoespacial/extracao-atributos/',{waitUntil:'domcontentloaded'});
 await p.waitForFunction(()=>window.SICARDExtracao&&document.querySelector('iframe').contentWindow.gpApp?.state.map?.isStyleLoaded());
 const bancada=()=>p.evaluate(()=>document.querySelector('iframe').contentWindow.gpApp.state.layers.map(l=>l.id));
 async function escolher(botao,id){await p.locator(botao).click();const d=p.locator('dialog.ea-storage-dialog');await d.getByRole('button',{name:'Camadas cadastradas no banco',exact:true}).click();await d.locator(`[data-file="${id}"]`).click();await d.locator('.ea-storage-confirm-button').click();await d.waitFor({state:'detached'});await p.waitForFunction(()=>!document.querySelector('#ea-staging-confirmar').disabled);}
 await escolher('#ea-input-browse','entrada');assert.deepEqual(await bancada(),[],'Existente apenas na prévia');
 await escolher('#ea-base-browse','base');assert.deepEqual(await bancada(),[],'Base apenas na lista');await p.locator('#ea-base-list-confirmar').click();await p.waitForFunction(()=>document.querySelectorAll('#ea-input-preview-layers .ea-preview-layer').length===2);
 await p.locator('#ea-input-file').setInputFiles(['um.gpkg','dois.gpkg','tres.gpkg'].map(name=>({name,mimeType:'application/octet-stream',buffer:Buffer.from('fixture')})));
 await p.waitForFunction(()=>document.querySelectorAll('#ea-input-preview-layers .ea-preview-file-group').length===5);
 assert.deepEqual(await bancada(),[],'Upload não confirma bancada');
 const groups=await p.locator('#ea-input-preview-layers .ea-preview-file-group > .ea-preview-tree-row .ea-preview-group-toggle').allTextContents();
 for(const n of ['entrada.gpkg','base.gpkg','um.gpkg','dois.gpkg','tres.gpkg'])assert(groups.some(t=>t.includes(n)));
 assert(!groups.some(t=>t.includes('acervo/')));
 await p.locator('#ea-input-preview-layers .ea-preview-layer').filter({hasText:'entrada'}).click();assert.match(await p.locator('#ea-input-preview-data').textContent(),/acervo\/entrada.gpkg/);

 const layout=await p.evaluate(()=>{
  const q=s=>document.querySelector(s),box=s=>q(s).getBoundingClientRect();
  const style=getComputedStyle(q('.ea-preview-layout'));
  const cost=box('.ea-preview-panel').width+parseFloat(style.columnGap)+parseFloat(style.paddingLeft)+parseFloat(style.paddingRight)+2;
  return {map:box('#ea-input-preview-map').width,oldMap:box('.ea-preview-workspace').width-cost,left:box('#ea-input-preview').height,right:box('#ea-layer-information').height,infoX:box('#ea-layer-information').x,end:box('#ea-input-preview').right};
 });
 assert(Math.abs(layout.map-layout.oldMap/2)<2,'Canvas com metade da largura anterior');assert(Math.abs(layout.left-layout.right)<1);assert(layout.infoX>layout.end);
 const headings=await p.locator('#ea-input-preview-data h5').allTextContents();
 await p.locator('#ea-input-preview-layers .ea-preview-layer').filter({hasText:'Sem CRS 1'}).click();
 assert.deepEqual(await p.locator('#ea-input-preview-data h5').allTextContents(),headings,'Padrão preservado em camada inválida');
 assert(!/undefined|NaN/.test(await p.locator('#ea-input-preview-data').textContent()));
 await p.locator('#ea-input-preview-layers .ea-preview-layer').filter({hasText:'entrada'}).click();
 await p.waitForFunction(()=>window.__previewMap);
 assert(await p.evaluate(()=>window.__previewMap.scrollWheelZoom.enabled()));
 const zoom=await p.evaluate(()=>window.__previewMap.getZoom());await p.locator('#ea-input-preview-map .leaflet-control-zoom-in').click();await p.waitForTimeout(350);assert((await p.evaluate(()=>window.__previewMap.getZoom()))>zoom);
 await p.locator('#ea-staging-confirmar').click();await p.waitForFunction(()=>document.querySelector('iframe').contentWindow.gpApp.state.layers.length===8);

 const frame=p.frameLocator('#ea-workbench-frame');
 assert.equal(await frame.locator('[data-layer-group="papel:entrada"] [data-layer]').count(),7);
 assert.equal(await frame.locator('[data-layer-group="papel:base"] [data-layer]').count(),1);
 assert.equal(await frame.locator('[data-layer-group="papel:entrada"] [data-layer-group^="arquivo:"]').count(),4);
 assert.equal(await frame.locator('[data-layer-group="papel:base"] [data-layer-group^="arquivo:"]').count(),1);
 assert.equal(await p.locator('.ea-preview-panel > footer button').count(),4);
 for(const button of await p.locator('.ea-preview-panel > footer button').all()){assert.equal((await button.textContent()).trim(),'');assert(await button.getAttribute('aria-label'));}
 const zin=await p.locator('#ea-input-preview-map .leaflet-control-zoom-in').boundingBox(),zout=await p.locator('#ea-input-preview-map .leaflet-control-zoom-out').boundingBox();
 for(const button of await p.locator('#ea-input-preview-map .ea-preview-map-tools button').all()){
  const box=await button.boundingBox();assert(Math.abs(box.width-zin.width)<=1);assert(Math.abs(box.height-zin.height)<=1);assert(box.y>=zout.y+zout.height);assert(Math.abs(box.x-zin.x)<=1);assert.equal((await button.textContent()).trim(),'');
 }
 await p.selectOption('#ea-operation','estatisticas');await p.waitForFunction(()=>!document.querySelector('#ea-run').disabled);
 await p.locator('#ea-run').click();await p.locator('[data-fb-confirmar]').click();await p.waitForTimeout(500);
 assert.equal(pedidos.length,1);assert.equal(Object.keys(pedidos[0].entradas_locais).length,3);assert.equal(pedidos[0].entradas.length,4);
 await p.waitForFunction(()=>!document.querySelector('#ea-staging-editar').disabled);
 await p.locator('#ea-staging-editar').click();await p.locator('#ea-input-preview-layers [aria-label="Remover da prévia: Camada 1.0"]').click();assert.equal((await bancada()).length,8,'Edição aguarda nova confirmação');
 await p.locator('#ea-staging-confirmar').click();await p.waitForFunction(()=>document.querySelector('iframe').contentWindow.gpApp.state.layers.length===7);
 await p.evaluate(()=>document.querySelector('iframe').contentWindow.gpApp.removeLayerFromMap('local:2:0'));
 await p.waitForFunction(()=>!Array.from(document.querySelectorAll('.ea-preview-layer')).some(n=>n.textContent==='Camada 2.0'));
 await p.locator('#ea-staging-limpar').click();assert.equal((await bancada()).length,6,'Limpar prévia mantém bancada confirmada');
 await p.locator('#ea-staging-cancelar').click();assert(await p.locator('#ea-input-preview-layers .ea-preview-layer').count()>0);
 for(const width of [390,768,1440]){await p.setViewportSize({width,height:1000});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));const cards=await p.locator('.ea-preview-workspace > section').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().height));assert(Math.abs(cards[0]-cards[1])<1);const panel=await p.locator('.ea-preview-panel').boundingBox(),map=await p.locator('#ea-input-preview-map').boundingBox();assert(Math.abs(panel.height-map.height)<=1,`Alturas diferentes em ${width}px`);}
 assert.deepEqual(errors,[]);await p.evaluate(()=>{document.querySelectorAll('.slt-fb-process-panel:not([data-processando]) [data-fb-close]').forEach(b=>b.click());document.querySelectorAll('.slt-fb-notice').forEach(n=>n.querySelector('button[aria-label]')?.click());});await p.locator('.ea-preview-workspace').screenshot({path:'/tmp/sicard-previa-informacoes.png'});await p.screenshot({path:'/tmp/sicard-previa-bancada.png',fullPage:true});await browser.close();console.log('OK: prévia, três arquivos, agrupamento, mapa, confirmação, payload e remoção.');
})().catch(e=>{console.error(e);process.exit(1)});
