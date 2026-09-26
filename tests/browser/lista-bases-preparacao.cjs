const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{
const b=await chromium.launch({headless:true,args:['--no-sandbox','--no-proxy-server','--enable-unsafe-swiftshader']}),p=await b.newPage({viewport:{width:1440,height:1000}});
const errors=[],reads=[],saves=[];let fail=false,delay=0;
p.on('pageerror',e=>errors.push(e.message));
await p.addLocatorHandler(p.locator('#pfsSuccessBox.pfs-active, #pfsPartialBox.pfs-active'),async()=>{await p.evaluate(()=>StatusFeedback.fechar());});
const fc={type:'FeatureCollection',features:[{type:'Feature',properties:{v:1},geometry:{type:'Point',coordinates:[-46,-23]}}]};
const catalog={categorias:[{id:'risco',nome:'Risco'},{id:'social',nome:'Social'}],camadas:['a','b','c','entrada'].map(id=>({id,nome:id,arquivo:`acervo/${id}.gpkg`}))};
await p.route('**/api/**',async r=>{
 const u=new URL(r.request().url()),path=u.pathname,send=json=>r.fulfill({json});
 if(path.includes('/auth/'))return send({authenticated:true,id:'teste',nome:'Teste',username:'Teste',tipo_usuario:'ADMIN'});
 if(path.endsWith('/catalogo'))return send(catalog);
 if(path.endsWith('/storage/navegar'))return send({caminho:'base-geoespacial',pastas:[],arquivos:[]});
 if(path.endsWith('/compatibilizar'))return send({compativel:true,camadas:[],erros:[]});
 if(path.endsWith('/arquivo-mapa')){const {id}=r.request().postDataJSON();reads.push(id);if(delay)await new Promise(r=>setTimeout(r,delay));if(fail&&id==='c')return r.fulfill({status:422,json:{detail:'CRS ausente'}});return send({...catalog.camadas.find(c=>c.id===id),geojson:fc});}
 if(path.endsWith('/configuracoes')&&r.request().method()==='POST'){const data=r.request().postDataJSON();saves.push(data);return send({nome:data.nome,chave:data.chave_lista||'lista-bases-teste',camadas:2,categorias:2});}
 if(path.endsWith('/configuracoes')){assert.equal(u.searchParams.get('escopo'),'bases');return send({pasta:'data/geoespacial/configuracoes/extracao-atributos/config-lista-camadas-base',configuracoes:[{chave:'risco',nome:'Risco salvo',arquivo:'risco.json',escopo:'bases',lista_legada:true,camadas:2,categorias:2,bytes:900}]});}
 if(path.endsWith('/configuracoes/risco')){assert.equal(u.searchParams.get('escopo'),'bases');assert.equal(u.searchParams.get('lista'),'true');return send({chave:'risco',nome:'Risco salvo',categorias:saves.length?saves.at(-1).categorias.map(g=>({id:g.id,camadas:g.camadas.map(id=>catalog.camadas.find(c=>c.id===id))})):[{id:'risco',camadas:[catalog.camadas[0]]},{id:'social',camadas:[catalog.camadas[1]]}],ausentes:[]});}
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
await p.locator('#ea-base-list-salvar').click();await p.waitForFunction(()=>Array.from(document.querySelectorAll('.notification-toast')).some(n=>n.textContent.includes('salva:')));
assert.equal(saves[0].chave_lista,'risco');assert.deepEqual(saves[0].categorias.map(g=>g.camadas),[['a'],['c']]);assert.equal(saves[0].escopo,'bases');assert(!await p.locator('#ea-input-preview').isVisible());
fail=true;await p.locator('#ea-base-list-confirmar').click();await p.locator('#pfsErrorBox.pfs-active').waitFor();assert.equal(await p.locator('[data-pfs="error-title"]').innerText(),'A lista não foi enviada à prévia');assert(!await p.locator('#ea-input-preview').isVisible());
await p.evaluate(()=>StatusFeedback.fechar());
fail=false;await p.locator('#ea-base-list-confirmar').click();await p.locator('#ea-input-preview').waitFor();assert.equal(await p.locator('#ea-input-preview-layers .ea-preview-layer').count(),2);
const categorias=p.locator('#ea-input-preview-layers .ea-preview-category-group');
assert.equal(await categorias.count(),2);
for(const [categoria,camada] of [['risco','a'],['social','c']]){
 // Um registro visual por camada, com seu checkbox dentro da mesma linha.
 const botao=p.locator(`.ea-preview-category-group[data-category="${categoria}"] .ea-preview-layer`);
 assert.equal(await botao.count(),1);assert.equal(await botao.textContent(),camada);
 assert.equal(await botao.locator('..').locator('input.ea-preview-visibility').count(),1);
}
assert.equal(await categorias.locator('.ea-preview-file-group').count(),0);
const risco=p.locator('.ea-preview-category-group[data-category="risco"]');
await risco.locator(':scope > .ea-preview-tree-row > input').uncheck();
assert.equal(await risco.locator('.ea-preview-layer').locator('..').locator('input').isChecked(),false);
await risco.locator(':scope > .ea-preview-tree-row > input').check();
await p.waitForFunction(()=>document.querySelector('iframe').contentWindow.gpApp?.state.map?.isStyleLoaded());
assert.equal(await p.evaluate(()=>document.querySelector('iframe').contentWindow.gpApp.state.layers.length),0,'Confirmar lista ainda não envia à bancada');
await p.locator('#ea-staging-confirmar').click();await p.waitForFunction(()=>document.querySelector('iframe').contentWindow.gpApp.state.layers.length===2);
const painel=p.frameLocator('#ea-workbench-frame');
assert.equal(await painel.locator('[data-layer-group="papel:base"] [data-layer-group^="categoria:"]').count(),2);
assert.equal(await painel.locator('[data-layer-group="papel:base"] [data-layer-group^="arquivo:"]').count(),0);
// Lista fecha após a prévia, e a subseção volta à seleção inicial.
assert(!await card.isVisible());assert.equal(await p.locator('#ea-category-select').inputValue(),'');
await carregar();
assert((await card.locator('#ea-base-list-body').boundingBox()).height<=144);
// Uma nova edição não modifica as camadas já enviadas.
await p.locator('#ea-base-list-editar').click();await card.getByRole('checkbox',{name:'Selecionar para excluir: a',exact:true}).check();await p.locator('#ea-base-list-excluir').click();assert.equal(await rows.count(),1);assert.equal(await p.locator('#ea-input-preview-layers .ea-preview-layer').count(),2);
await p.locator('#ea-base-list-cancelar').click();assert(!await card.isVisible());await carregar();
// Cancelar durante validação descarta a resposta tardia e mantém prévia/bancada.
await p.locator('#ea-base-list-editar').click();await card.getByRole('checkbox',{name:'Selecionar para excluir: a',exact:true}).check();await p.locator('#ea-base-list-excluir').click();delay=700;
await p.locator('#ea-base-list-confirmar').click();await p.locator('#ea-base-list-cancelar').click();await p.waitForTimeout(1100);
assert(!await card.isVisible());assert.equal(await p.locator('#ea-input-preview-layers .ea-preview-layer').count(),2);await carregar();
assert.equal(await p.evaluate(()=>document.querySelector('iframe').contentWindow.gpApp.state.layers.length),2);
delay=0;await p.locator('#ea-base-list-editar').click();
await rows.filter({hasText:'acervo/c.gpkg'}).locator('select').selectOption('risco');
await p.locator('#ea-base-list-confirmar').click();
await p.waitForFunction(()=>document.querySelectorAll('.ea-preview-category-group').length===1);
assert.equal(await risco.locator('.ea-preview-layer').count(),2,'Todas as bases da categoria compartilham o mesmo subgrupo');
assert(!await card.isVisible());
assert.deepEqual(errors,[]);await b.close();console.log('OK: lista salva/seleção sem geometria; editar/salvar/excluir/cancelar; validação atômica; prévia e bancada independentes.');
})().catch(e=>{console.error(e);process.exit(1)});
