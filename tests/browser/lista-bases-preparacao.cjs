const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{
const b=await chromium.launch({headless:true,args:['--no-sandbox','--no-proxy-server','--enable-unsafe-swiftshader']}),p=await b.newPage({viewport:{width:1440,height:1000}});
const errors=[],reads=[],saves=[];let fail=false,delay=0;
p.on('pageerror',e=>errors.push(e.message));
const fc={type:'FeatureCollection',features:[{type:'Feature',properties:{v:1},geometry:{type:'Point',coordinates:[-46,-23]}}]};
const catalog={categorias:[{id:'risco',nome:'Risco'},{id:'social',nome:'Social'}],camadas:['a','b','c','entrada'].map(id=>({id,nome:id,arquivo:`acervo/${id}.gpkg`}))};
await p.route('**/api/**',async r=>{
 const u=new URL(r.request().url()),path=u.pathname,send=json=>r.fulfill({json});
 if(path.includes('/auth/'))return send({authenticated:true,id:'teste',nome:'Teste',username:'Teste',tipo_usuario:'ADMIN'});
 if(path.endsWith('/catalogo'))return send(catalog);
 if(path.endsWith('/storage/navegar'))return send({caminho:'base-geoespacial',pastas:[],arquivos:[]});
 if(path.endsWith('/arquivo-mapa')){const {id}=r.request().postDataJSON();reads.push(id);if(delay)await new Promise(r=>setTimeout(r,delay));if(fail&&id==='c')return r.fulfill({status:422,json:{detail:'CRS ausente'}});return send({...catalog.camadas.find(c=>c.id===id),geojson:fc});}
 if(path.endsWith('/configuracoes')&&r.request().method()==='POST'){const data=r.request().postDataJSON();saves.push(data);return send({nome:data.nome,chave:data.chave_lista||'lista-bases-teste',camadas:2,categorias:2});}
 if(path.endsWith('/configuracoes'))return send({pasta:'data/geoespacial/configuracoes/extracao-atributos',configuracoes:[{chave:'risco',nome:'Risco salvo',arquivo:'risco.json',escopo:'analise',lista_legada:true,camadas:2,categorias:2,bytes:900}]});
 if(path.endsWith('/configuracoes/risco')){assert.equal(u.searchParams.get('lista'),'true');return send({chave:'risco',nome:'Risco salvo',categorias:[{id:'risco',camadas:[catalog.camadas[0]]},{id:'social',camadas:[catalog.camadas[1]]}],ausentes:[]});}
 return send([]);
});
await p.goto('http://127.0.0.1:8083/restrict/geoespacial/extracao-atributos/',{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=>window.SICARDExtracao&&document.querySelector('#ea-category-select').options.length>1);
const card=p.locator('#ea-base-list-card'),rows=card.locator('.ea-base-list-row');
assert(!await card.isVisible());
async function carregar(){await p.locator('#ea-staging-carregar').click();const d=p.locator('.ea-config-dialog');await d.locator('.ea-config-entry').click();await d.getByRole('button',{name:'Abrir',exact:true}).click();await card.waitFor();}
async function escolher(id){await p.locator('#ea-base-browse').click();const d=p.locator('.ea-storage-dialog');await d.getByRole('button',{name:'Camadas cadastradas no banco',exact:true}).click();await d.locator(`[data-file="${id}"]`).click();await d.locator('.ea-storage-confirm-button').click();await d.waitFor({state:'detached'});}
await carregar();assert.equal(await rows.count(),2);assert.deepEqual(reads,[]);assert(!await p.locator('#ea-input-preview').isVisible());
await p.locator('#ea-base-list-editar').click();await card.getByRole('checkbox',{name:'Selecionar para excluir: b',exact:true}).check();await p.locator('#ea-base-list-excluir').click();assert.equal(await rows.count(),1);
await p.locator('#ea-base-list-cancelar').click();assert(!await card.isVisible());assert.deepEqual(reads,[]);
await carregar();await p.locator('#ea-base-list-editar').click();await card.getByRole('checkbox',{name:'Selecionar para excluir: b',exact:true}).check();await p.locator('#ea-base-list-excluir').click();
await p.selectOption('#ea-category-select','social');await escolher('c');assert.equal(await rows.count(),2);assert.deepEqual(reads,[]);
await p.locator('#ea-base-list-salvar').click();await p.waitForFunction(()=>Array.from(document.querySelectorAll('.slt-fb-notice')).some(n=>n.textContent.includes('salva:')));
assert.equal(saves[0].chave_lista,'risco');assert.deepEqual(saves[0].categorias.map(g=>g.camadas),[['a'],['c']]);assert.equal(saves[0].escopo,'bases');assert(!await p.locator('#ea-input-preview').isVisible());
fail=true;await p.locator('#ea-base-list-confirmar').click();await p.getByText('A lista não foi enviada à prévia.',{exact:false}).waitFor();assert(!await p.locator('#ea-input-preview').isVisible());
fail=false;await p.locator('#ea-base-list-confirmar').click();await p.locator('#ea-input-preview').waitFor();assert.equal(await p.locator('#ea-input-preview-layers .ea-preview-layer').count(),2);
await p.waitForFunction(()=>document.querySelector('iframe').contentWindow.gpApp?.state.map?.isStyleLoaded());
assert.equal(await p.evaluate(()=>document.querySelector('iframe').contentWindow.gpApp.state.layers.length),0,'Confirmar lista ainda não envia à bancada');
await p.locator('#ea-staging-confirmar').click();await p.waitForFunction(()=>document.querySelector('iframe').contentWindow.gpApp.state.layers.length===2);
// Edição posterior permanece isolada; cancelar restaura a lista confirmada.
await p.locator('#ea-base-list-editar').click();await card.getByRole('checkbox',{name:'Selecionar para excluir: a',exact:true}).check();await p.locator('#ea-base-list-excluir').click();assert.equal(await rows.count(),1);assert.equal(await p.locator('#ea-input-preview-layers .ea-preview-layer').count(),2);
await p.locator('#ea-base-list-cancelar').click();assert.equal(await rows.count(),2);
// Cancelar durante validação descarta a resposta tardia e mantém prévia/bancada.
await p.locator('#ea-base-list-editar').click();await card.getByRole('checkbox',{name:'Selecionar para excluir: a',exact:true}).check();await p.locator('#ea-base-list-excluir').click();delay=700;
await p.locator('#ea-base-list-confirmar').click();await p.locator('#ea-base-list-cancelar').click();await p.waitForTimeout(1100);
assert.equal(await rows.count(),2);assert.equal(await p.locator('#ea-input-preview-layers .ea-preview-layer').count(),2);
assert.equal(await p.evaluate(()=>document.querySelector('iframe').contentWindow.gpApp.state.layers.length),2);
assert.deepEqual(errors,[]);await b.close();console.log('OK: lista salva/seleção sem geometria; editar/salvar/excluir/cancelar; validação atômica; prévia e bancada independentes.');
})().catch(e=>{console.error(e);process.exit(1)});
