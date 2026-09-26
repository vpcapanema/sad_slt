// Aplicação e mapas reais; serviços interceptados para não persistir dados.
const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--no-proxy-server','--enable-unsafe-swiftshader']});
 const p=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],pedidos=[];let seq=0,recusarCompatibilidade=false;const conferencias=[];
 p.on('pageerror',e=>errors.push(e.message));
 const fc={type:'FeatureCollection',features:[{type:'Feature',properties:{valor:1},geometry:{type:'Point',coordinates:[-46,-23]}}]};
 const catalog={categorias:[{id:'social',nome:'Social'}],camadas:['entrada','base'].map(id=>({id,nome:id,origem:'importadas',arquivo:`acervo/${id}.gpkg`}))};
 await p.route('**/api/**',async r=>{
  const u=new URL(r.request().url()),path=u.pathname,send=json=>r.fulfill({json});
  if(path.includes('/auth/'))return send({authenticated:true,id:'teste',nome:'Teste',username:'TESTE',tipo_usuario:'ADMIN'});
  if(path.endsWith('/catalogo'))return send(catalog);
  if(path.endsWith('/storage/navegar'))return send({pastas:[],arquivos:[]});
  if(path.endsWith('/compatibilizar')){conferencias.push(r.request().postDataJSON());return send({compativel:!recusarCompatibilidade,camadas:[],erros:recusarCompatibilidade?[{nome:'base',motivo:'CRS incompatível de teste'}]:[]});}
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
 // O ProcessFeedback (SIGMA) é modal: a validação termina num modal de resultado, dispensado para seguir.
 await p.locator('#pfsStatusOverlay.pfs-active').waitFor();await p.evaluate(()=>StatusFeedback.fechar());
 await p.waitForFunction(()=>document.querySelectorAll('#ea-input-preview-layers .ea-preview-file-group').length===4);
 assert.deepEqual(await bancada(),[],'Upload não confirma bancada');
 const groups=await p.locator('#ea-input-preview-layers .ea-preview-file-group > .ea-preview-tree-row .ea-preview-group-toggle').allTextContents();
 for(const n of ['entrada.gpkg','um.gpkg','dois.gpkg','tres.gpkg'])assert(groups.some(t=>t.includes(n)));
 const bases=p.locator('#ea-input-preview-layers .ea-preview-category-group[data-category="social"]');
 assert.equal(await bases.locator('.ea-preview-layer').count(),1);
 assert.equal(await bases.locator('.ea-preview-file-group').count(),0,'Bases aparecem diretamente na categoria');
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

 const footer=await p.locator('#ea-staging-actions').evaluate(n=>{const style=getComputedStyle(n),buttons=[...n.children].map(b=>b.getBoundingClientRect());return {available:n.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight),gap:parseFloat(style.columnGap),widths:buttons.map(b=>b.width)};});
 assert(Math.max(...footer.widths)-Math.min(...footer.widths)<1);
 assert(Math.abs(footer.widths.reduce((a,b)=>a+b,0)+3*footer.gap-footer.available)<2);
 const headers=await p.locator('.ea-preview-workspace > section > header').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().height));
 assert(Math.abs(headers[0]-headers[1])<1);
 await p.selectOption('#ea-operation','estatisticas');
 await p.locator('input[aria-label="Visibilidade no mapa: entrada"]').uncheck();
 await p.locator('input[aria-label="Visibilidade no mapa: Camada 1.0"]').uncheck();
 await p.locator('.ea-preview-workspace').screenshot({path:'/tmp/sicard-previa-informacoes.png'});
 recusarCompatibilidade=true;
 await p.locator('#ea-staging-confirmar').click();
 await p.locator('#pfsErrorBox.pfs-active').waitFor();assert.equal(await p.locator('[data-pfs="error-title"]').innerText(),'Não foi possível enviar à bancada');
 assert.deepEqual(await bancada(),[],'Falha espacial preserva bancada anterior');
 await p.evaluate(()=>StatusFeedback.fechar());
 await p.waitForFunction(()=>!document.querySelector('#ea-staging-confirmar').disabled);
 recusarCompatibilidade=false;
 await p.locator('#ea-staging-confirmar').click();
 await p.waitForFunction(()=>document.querySelector('iframe').contentWindow.gpApp.state.layers.length===6);
 await p.waitForFunction(()=>document.querySelector('#ea-input-preview').hidden);
 assert.equal(conferencias.at(-1).camadas.length,4);
 const local=conferencias.at(-1).camadas.find(c=>c.arquivo_local?.nome==='um.gpkg');
 assert.deepEqual(local.arquivo_local.camadas,['um.gpkg::1']);
 const ids=await bancada();assert(!ids.includes('entrada'));assert(!ids.includes('local:1:0'));
 for(const id of ['ea-input-preview','ea-layer-information','ea-base-list-card','ea-operation-params','ea-finalidades'])assert(await p.locator('#'+id).evaluate(n=>n.hidden));
 assert.equal(await p.locator('#ea-input-preview-data').textContent(),'');
 assert.equal(await p.locator('#ea-input-preview-layers').textContent(),'');
 assert.equal(await p.locator('#ea-base-list-body').textContent(),'');
 assert.equal(await p.locator('#ea-operation-params').textContent(),'');
 await p.waitForFunction(()=>!document.querySelector('#ea-run').disabled);
 await p.locator('#pfsSuccessBox.pfs-active').waitFor();await p.evaluate(()=>StatusFeedback.fechar());
 await p.locator('#ea-run').click();await p.locator('#pfsConfirmOk').click();
 await p.waitForTimeout(500);
 assert.equal(pedidos.length,1);assert.equal(pedidos[0].entradas.length,3);
 assert.equal(Object.keys(pedidos[0].entradas_locais).length,2);assert.deepEqual(pedidos[0].arquivo_local.camadas,['um.gpkg::1']);
 assert.deepEqual(errors,[]);
 await browser.close();console.log('OK: checkboxes, componentes de arquivo, falha preservada, limpeza após envio, layout e execução.');
})().catch(e=>{console.error(e);process.exit(1)});
