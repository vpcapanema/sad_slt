const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{
const b=await chromium.launch({headless:true,args:['--no-sandbox','--no-proxy-server','--enable-unsafe-swiftshader']}),p=await b.newPage();
const errors=[],inventory=[],reads=[],browse=[];p.on('pageerror',e=>errors.push(e.message));
const fc={type:'FeatureCollection',features:[{type:'Feature',properties:{id:1},geometry:{type:'Point',coordinates:[-46,-23]}}]};
const layers=['rios','lagos'].map(nome=>({id:`storage:base-geoespacial/duas.gpkg::${nome}`,nome,arquivo:'base-geoespacial/duas.gpkg',origem:'storage'}));
await p.route('**/api/**',async r=>{
 const u=new URL(r.request().url()),path=u.pathname,send=json=>r.fulfill({json});
 if(path.includes('/auth/'))return send({authenticated:true,id:'teste',nome:'Teste',username:'Teste',tipo_usuario:'ADMIN'});
 if(path.endsWith('/catalogo'))return send({categorias:[{id:'risco',nome:'Risco'}],camadas:[{id:'base',nome:'Base'}]});
 if(path.endsWith('/storage/navegar')){browse.push(u.searchParams.get('detalhar'));return send({caminho:'base-geoespacial',pastas:[],arquivos:[{id:'storage:base-geoespacial/duas.gpkg',nome:'duas',arquivo:'base-geoespacial/duas.gpkg',inventariar:true}]});}
 if(path.endsWith('/storage/camadas-arquivo')){inventory.push(u.searchParams.get('arquivo'));return send({camadas:layers});}
 if(path.endsWith('/arquivo-mapa')){const {id}=r.request().postDataJSON();reads.push(id);return send({...layers.find(l=>l.id===id),id,geojson:fc});}
 if(path.endsWith('/configuracoes'))return send({pasta:'data/geoespacial/configuracoes/extracao-atributos',configuracoes:[{chave:'risco',nome:'Risco',arquivo:'risco.json',escopo:'analise',lista_legada:true,camadas:1,categorias:1,bytes:900}]});
 if(path.endsWith('/configuracoes/risco'))return send({nome:'Risco',escopo:'analise',categorias:[{id:'risco',camadas:[{id:'base',nome:'Base'}]}],entradas:[{id:'nao-restaurar'}],operacao:'enriquecimento',nome_saida:'Não substituir',ausentes:[]});
 return send([]);
});
await p.goto('http://127.0.0.1:8083/restrict/geoespacial/extracao-atributos/',{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=>window.SICARDExtracao&&document.querySelector('#ea-category-select').options.length>1);
await p.locator('#ea-input-browse').click();const d=p.locator('dialog.ea-storage-dialog');await d.locator('[data-file]').waitFor();
assert.deepEqual(browse,['false']);assert.deepEqual(inventory,[]);assert.deepEqual(reads,[]);
await d.locator('[data-file]').click();assert.deepEqual(inventory,[]);
await d.locator('.ea-storage-confirm-button').click();await d.waitFor({state:'detached'});
assert.deepEqual(inventory,['base-geoespacial/duas.gpkg']);assert.deepEqual(new Set(reads),new Set(layers.map(l=>l.id)));
await p.selectOption('#ea-operation','estatisticas');await p.locator('#ea-nome-saida').fill('Minha saída');
const selected=await p.locator('#ea-input-select').inputValue();
assert.equal(await p.locator('#ea-staging-carregar').textContent(),'Carregar listas');
await p.getByRole('button',{name:'Carregar listas',exact:true}).click();
const listas=p.locator('dialog.ea-config-dialog');await listas.getByRole('heading',{name:'Carregar listas'}).waitFor();
await listas.locator('.ea-config-entry').click();await listas.getByRole('button',{name:'Abrir',exact:true}).click();
assert.equal(reads.length,2);await p.locator('#ea-base-list-card').waitFor();await p.locator('#ea-base-list-confirmar').click();await p.waitForFunction(()=>document.querySelector('#ea-input-preview-layers').textContent.includes('Base'));
assert.equal(await p.locator('#ea-input-select').inputValue(),selected);assert.equal(await p.locator('#ea-operation').inputValue(),'estatisticas');assert.equal(await p.locator('#ea-nome-saida').inputValue(),'Minha saída');
assert.deepEqual(errors,[]);await b.close();console.log('OK: listagem sem leitura, inventário ao confirmar e lista legada sem alterar entradas/algoritmo/saída.');
})().catch(e=>{console.error(e);process.exit(1)});
