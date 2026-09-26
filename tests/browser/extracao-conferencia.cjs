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
   return send({id:`job${id}`,status:'concluido',resultado:{camadas,entrada:{id:`local:arquivo${id}`,nome,origem:'local',geojson:fc},resumo:{total:2,validas:2,invalidas:0}}});
  }
  if(path.endsWith('/execucoes')&&r.request().method()==='POST'){pedidos.push(r.request().postDataJSON());return send({id:'teste',status:'erro',erro:'Fim do teste: nenhuma saída foi gravada.'});}
  return send([]);
 });
 await p.addInitScript(()=>{Object.defineProperty(window,'__previewMap',{writable:true,value:null});const timer=setInterval(()=>{if(window.L&&!window.L.__capture){window.L.__capture=true;const fn=window.L.map;window.L.map=function(...args){const m=fn.apply(this,args);if(args[0]?.id==='ea-input-preview-map')window.__previewMap=m;return m;};clearInterval(timer);}},1);});
 await p.goto('http://127.0.0.1:8083/restrict/geoespacial/extracao-atributos/',{waitUntil:'domcontentloaded'});
 await p.waitForFunction(()=>window.SICARDExtracao&&document.querySelector('iframe').contentWindow.gpApp?.state.map?.isStyleLoaded());
 const bancada=()=>p.evaluate(()=>document.querySelector('iframe').contentWindow.gpApp.state.layers.map(l=>l.id));
 async function escolher(botao,id){await p.locator(botao).click();const d=p.locator('dialog.ea-storage-dialog');await d.getByRole('button',{name:'Camadas cadastradas no banco',exact:true}).click();await d.locator(`[data-file="${id}"]`).click();await d.locator('.ea-storage-confirm-button').click();await d.waitFor({state:'detached'});}

 console.log('Preparando bases');await escolher('#ea-base-browse','base');
 await p.locator('#ea-base-list-confirmar').click();await p.locator('#pfsConfirmOk').click();
 await p.waitForFunction(()=>document.querySelectorAll('#ea-input-preview-layers .ea-preview-layer').length===1);
 await p.locator('#pfsSuccessBox.pfs-active').waitFor();await p.evaluate(()=>StatusFeedback.fechar());
 await p.waitForFunction(()=>!document.querySelector('#ea-input-file').disabled);
 console.log('Preparando entrada');await p.locator('#ea-input-file').setInputFiles([{name:'um.gpkg',mimeType:'application/octet-stream',buffer:Buffer.from('fixture')}]);
 await p.locator('#pfsConfirmOk').click();
 await p.waitForFunction(()=>document.querySelectorAll('#ea-identificacao-camadas tr').length===2).catch(async e=>{console.error('UI',await p.locator('#ea-config').innerText(),errors);throw e;});
 await p.locator('#pfsSuccessBox.pfs-active').waitFor();await p.evaluate(()=>StatusFeedback.fechar());
 assert.equal(await p.locator('#ea-identificacao-camadas input[type=checkbox]').count(),0);
 assert.equal(await p.locator('#ea-identificacao-camadas select').count(),2);
 assert.equal(await p.locator('#ea-run-inputs tr').count(),0,'Prévia não entra na execução');
 const fonts=await p.evaluate(()=>['#ea-identificacao h4','#ea-base-list-card h4'].map(s=>getComputedStyle(document.querySelector(s)).fontSize));
 assert.equal(fonts[0],fonts[1]);
 console.log('Confirmando IDs');await p.locator('#ea-identificacao-confirmar').click();
 await p.selectOption('#ea-operation','estatisticas');
 await p.locator('#ea-staging-confirmar').click();await p.locator('#pfsConfirmOk').click();
 await p.waitForFunction(()=>document.querySelector('iframe').contentWindow.gpApp.state.layers.length===3);
 await p.locator('#pfsSuccessBox.pfs-active').waitFor();await p.evaluate(()=>StatusFeedback.fechar());
 await p.waitForFunction(()=>document.querySelectorAll('#ea-run-inputs tr').length===2);
 assert(await p.locator('#ea-run').isDisabled(),'Individual bloqueia duas demandas');
 await p.selectOption('#ea-run-mode','lote');
 await p.waitForFunction(()=>!document.querySelector('#ea-run').disabled);
 console.log('Verificando visibilidade');const frame=p.frameLocator('#ea-workbench-frame');
 const toggle=id=>frame.locator(`[data-layer="${id}"] input[type=checkbox]`).first();
 await toggle('local:1:0').uncheck();
 await p.waitForFunction(()=>document.querySelectorAll('#ea-run-inputs tr').length===1);
 await p.selectOption('#ea-run-mode','individual');
 await toggle('base').uncheck();
 await p.waitForFunction(()=>document.querySelectorAll('#ea-run-bases tr').length===0);
 assert(await p.locator('#ea-run').isDisabled());
 await toggle('base').check();
 await p.waitForFunction(()=>!document.querySelector('#ea-run').disabled);
 await p.selectOption('#ea-operation','enriquecimento');
 assert(await p.locator('#ea-run-cut-field').isVisible());
 assert(await p.locator('#ea-run').isDisabled());
 await p.selectOption('#ea-run-cut','base');
 await p.waitForFunction(()=>!document.querySelector('#ea-run').disabled);
 await p.selectOption('#ea-operation','estatisticas');
 await p.locator('#ea-run').click();await p.locator('#pfsConfirmOk').click();
 await p.waitForFunction(()=>document.querySelector('#pfsErrorBox')?.classList.contains('pfs-active'));
 assert.equal(pedidos.length,1);
 assert.deepEqual(pedidos[0].arquivo_local.camadas,['um.gpkg::1']);
 assert.equal(pedidos[0].entradas.length,1);
 assert.deepEqual(Object.keys(pedidos[0].entradas[0].config.camadas),['um.gpkg::1']);
 assert.deepEqual(errors,[]);
 await browser.close();console.log('OK: identificação simplificada, tipografia, lote e visibilidade da bancada no pedido real.');
})().catch(e=>{console.error(e);process.exit(1)});
