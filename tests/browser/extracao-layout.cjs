// Requer Playwright instalado e a aplicação local aberta em SICARD_TEST_URL.
// As APIs são interceptadas; este teste nunca grava dados de produção.
const {chromium}=require('playwright');const assert=require('node:assert/strict');
(async()=>{
const b=await chromium.launch({headless:true,args:['--no-sandbox','--no-proxy-server','--enable-unsafe-swiftshader']});
const p=await b.newPage({viewport:{width:1440,height:1000}});const errors=[],requests=[];let falharTabela=false,saved,polls=0,municipalCatalog=0,municipalPayload;
p.on('pageerror',e=>errors.push(e.message));
await p.addLocatorHandler(p.locator('.slt-fb-modal--info'),async()=>{await p.evaluate(()=>window.SLTFeedback.fechar());});await p.addLocatorHandler(p.locator('.slt-fb-modal').filter({hasText:'Bancada de geoprocessamento'}).filter({has:p.locator('[data-fb-close]')}),async()=>{if(await p.locator('#slt-feedback-backdrop[data-processando="true"]').count()===0)await p.locator('.slt-fb-foot [data-fb-close]').click();});
p.on('dialog',d=>d.accept(d.type()==='prompt'?'Configuração teste':undefined));
const fc={type:'FeatureCollection',features:[{type:'Feature',properties:{nome:'Teste',id:1},geometry:{type:'Point',coordinates:[-47,-23]}}]};
const catalog={categorias:[{id:'ambiental',nome:'Ambiental'},{id:'social',nome:'Social'}],camadas:['entrada','base','adicional'].map(id=>({id,nome:id,origem:'importadas'}))};
const result={id:'00000000-0000-0000-0000-000000000001',modo:'enriquecimento',camadas:{pontos:{camada_resultado_id:'saida',registros:101,campos:2}},dicionario:[{camada:'pontos',campo:'id',apelido:'ID'}],categorias:[],validacao:{aprovada:true},resumo:{ocorrencias:101,camadas_intersectadas:1},geojson:fc};
await p.route('**/api/**',async r=>{
 const u=new URL(r.request().url()),path=u.pathname,method=r.request().method();
 const send=data=>r.fulfill({json:data});
 if(path.endsWith('/municipal/ambiental/catalog')){municipalCatalog++;return send({attributes:[{id:'teste',label:'Indicador de teste',source:'Fonte de teste',year:2022,theme:'Teste',field:'teste',detail:'{}',coverage:0}],municipalities:645,geometryYear:2022,crs:'EPSG:4674'});}
 if(path.endsWith('/municipal/ambiental/preview'))return send({rows:[],fields:[],totalAttributes:1});
 if(path.endsWith('/municipal/ambiental/jobs')){
  municipalPayload=r.request().postDataJSON();catalog.camadas.push({id:'municipal',nome:'Municipal gerada',origem:'importadas'});
  return send({id:'municipal-job',status:'concluido',resultado:{id:'municipal'}});
 }
 if(path.endsWith('/jobs/municipal-job/pacote'))return r.fulfill({contentType:'application/zip',headers:{'X-Camada-Id':'municipal','X-Camada-Arquivo':'teste/municipal.fgb'},body:'fixture-download'});
 if(path.endsWith('/test-204'))return r.fulfill({status:204});
 if(path.endsWith('/test-401'))return r.fulfill({status:401,json:{detail:'negado'}});
 if(path.endsWith('/test-poll'))return ++polls===1?r.fulfill({status:503,contentType:'text/html',body:'<h1>Unavailable</h1>'}):send({id:'job',status:'concluido',resultado:{ok:true}});
 if(path.includes('/auth/'))return send({authenticated:true,id:'ui-test',nome:'Teste local',username:'UI_ADMIN',tipo_usuario:'ADMIN'});
 if(path.endsWith('/storage/navegar'))return send({pastas:[],arquivos:[]});
 if((path.endsWith('/extracao-atributos/catalogo')||path.endsWith('/municipal/categorias')))return send(catalog);
 if(path.endsWith('/arquivo-mapa')){const body=r.request().postDataJSON();return send({...catalog.camadas.find(c=>c.id===body.id),geojson:fc,campos:[{nome:'nome'},{nome:'id'},{nome:'campo_de_outro_registro'}]});}
 if(path.endsWith('/configuracoes')&&method==='POST'){saved=r.request().postDataJSON();return send({nome:saved.nome,camadas:1,categorias:1,entradas:saved.entradas.length,finalidades:0});}
 if(path.endsWith('/configuracoes')&&method==='GET')return send({configuracoes:[{chave:'teste',nome:saved.nome,escopo:saved.escopo,camadas:1,categorias:1}]});
 if(path.endsWith('/configuracoes/teste'))return send({...saved,ausentes:[],categorias:saved.categorias.map(c=>({...c,camadas:c.camadas.map(id=>({id,nome:id,regra:{multiplicidade:'resumo'}}))}))});
 if(path.endsWith('/execucoes')&&method==='POST'){requests.push(r.request().postDataJSON());result.operacao=r.request().postDataJSON().operacao;return send({id:result.id,status:'concluido',resultado:result});}
 if(path.endsWith('/tabela')){if(falharTabela)return r.fulfill({status:503,json:{detail:'Tabela temporariamente indisponível.'}});const offset=Number(u.searchParams.get('offset'));return send({campos:['id','nome'],linhas:Array.from({length:offset?1:100},(_,i)=>({id:offset+i,nome:'Registro '+(offset+i)})),total:101});}
 if(path.endsWith('/pacote'))return r.fulfill({contentType:'application/zip',headers:{'Content-Disposition':'attachment; filename="resultado.zip"'},body:'fixture-download'});
 return send([]);
});
await p.goto('http://127.0.0.1:8083/restrict/geoespacial/extracao-atributos/',{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=>window.SICARDExtracao&&document.querySelector('#ea-category-select').options.length>1);
await p.waitForFunction(()=>document.querySelector('iframe').contentWindow.gpApp?.state.map?.isStyleLoaded());
assert.deepEqual(await p.locator('#ea-operation option').evaluateAll(ns=>ns.map(n=>n.value)),['','estatisticas','enriquecimento']);
assert.equal(await p.locator('#ea-staging').count(),0);
assert.equal(await p.locator('#ea-config-carregar').evaluate(n=>n.compareDocumentPosition(document.querySelector('#ea-input-preview'))&Node.DOCUMENT_POSITION_FOLLOWING),4);
assert.equal(await p.locator('#ea-municipal-open').evaluate(n=>n.closest('.ea-config-grid')===null),true);
assert.deepEqual(await p.locator('#ea-base-form .ea-layer-actions button').evaluateAll(ns=>ns.map(n=>n.id)),['ea-refresh','ea-base-browse','ea-base-local-upload','ea-staging-carregar','ea-staging-salvar']);
async function choose(button,id){await p.locator(button).click();const d=p.locator('dialog.ea-storage-dialog');await d.getByRole('button',{name:'Camadas cadastradas no banco',exact:true}).click();await d.locator(`[data-file="${id}"]`).click();await d.locator('.ea-storage-confirm-button').click();await d.waitFor({state:'detached'});}
await choose('#ea-input-browse','entrada');await p.selectOption('#ea-operation','estatisticas');await p.fill('#ea-nome-saida','Preservar saída');await p.selectOption('#ea-category-select','ambiental');await choose('#ea-base-browse','base');
const tree=p.locator('#ea-input-preview-layers');
await tree.getByRole('checkbox',{name:'Visibilidade no mapa: base',exact:true}).waitFor();
await p.waitForFunction(()=>!document.querySelector('#ea-input-preview-layers input[aria-label="Visibilidade no mapa: base"]').disabled);
assert.equal(await tree.locator(':scope > section').count(),2);
await tree.getByRole('button',{name:'base',exact:true}).click();assert.match(await p.locator('#ea-layer-information').textContent(),/Camada de base/);
await tree.getByRole('button',{name:'entrada',exact:true}).click();assert.match(await p.locator('#ea-layer-information').textContent(),/Camada de entrada/);
await tree.getByRole('checkbox',{name:'Visibilidade no mapa: base',exact:true}).uncheck();
assert.equal(await p.locator('#ea-run').isDisabled(),true,'A prévia não envia bases à bancada');
await p.fill('#ea-nome-saida','Preservar saída');assert.equal(await tree.getByRole('checkbox',{name:'Visibilidade no mapa: base',exact:true}).isChecked(),false);
await p.locator('#ea-staging-editar').click();await tree.getByRole('button',{name:'Remover base pendente base',exact:true}).click();assert.equal(await tree.getByRole('button',{name:'base',exact:true}).count(),0);
await p.locator('#ea-staging-cancelar').click();await tree.getByRole('button',{name:'base',exact:true}).waitFor();
await p.locator('#ea-staging-limpar').click();assert.equal(await tree.getByRole('button',{name:'base',exact:true}).count(),0);
await p.locator('#ea-staging-cancelar').click();await tree.getByRole('button',{name:'base',exact:true}).waitFor();
await p.locator('#ea-staging-salvar').click();await p.locator('[data-fb-input]').fill('Lista');await p.locator('[data-fb-confirmar]').click();await p.waitForFunction(()=>!document.querySelector('[data-fb-input]'));
assert.equal(saved.escopo,'bases');assert.deepEqual(saved.entradas,[]);assert.equal(saved.operacao,'');assert.equal(saved.nome_saida,'');
await p.locator('#ea-staging-carregar').click();await p.locator('dialog .ea-config-entry').click();await p.locator('dialog').getByRole('button',{name:'Carregar',exact:true}).click();await p.locator('[data-fb-confirmar]').click();
await tree.getByRole('button',{name:'base',exact:true}).waitFor();
assert.equal(await p.locator('#ea-input-select').inputValue(),'entrada');assert.equal(await p.locator('#ea-operation').inputValue(),'estatisticas');assert.equal(await p.locator('#ea-nome-saida').inputValue(),'Preservar saída');
assert.equal(await p.locator('#ea-run').isDisabled(),true);
await p.locator('#ea-staging-confirmar').click();await p.locator('[data-fb-confirmar]').click();await p.locator('.slt-fb-foot [data-fb-close]').click();
await p.waitForFunction(()=>!document.querySelector('#ea-run').disabled);
for(const width of [390,1440]){await p.setViewportSize({width,height:1000});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);}
const positions=await p.evaluate(()=>{
 const rect=s=>{const r=document.querySelector(s).getBoundingClientRect();return {x:r.x,right:r.right,width:r.width,y:r.y,bottom:r.bottom};};
 return {tool:rect('.ea-municipal-entry'),saved:rect('.ea-config-tools'),input:rect('.ea-config-grid > section:first-child'),output:rect('.ea-config-grid > section:last-child')};
});
assert.ok(Math.abs(positions.tool.width-positions.output.width)<1);
assert.ok(Math.abs(positions.tool.right-positions.output.right)<1);
assert.ok(Math.abs(positions.saved.width-positions.input.width)<1);
assert.ok(Math.abs(positions.saved.x-positions.input.x)<1);
for(const selector of ['.ea-municipal-entry','.ea-config-tools']){
 const rows=await p.locator(selector).evaluate(n=>[...n.children].filter(c=>!c.hidden).map(c=>{const r=c.getBoundingClientRect();return {top:r.top,bottom:r.bottom};}));
 for(let i=1;i<rows.length;i++)assert.ok(rows[i].top>=rows[i-1].bottom,'Um elemento por linha');
}
await p.locator('#ea-input-browse').click();const selection=p.locator('dialog.ea-storage-dialog');
await selection.getByRole('button',{name:'Camadas cadastradas no banco',exact:true}).click();
await selection.locator('[data-file="entrada"]').click();await selection.locator('[data-file="adicional"]').click();
await selection.locator('.ea-storage-confirm-button').click();await selection.waitFor({state:'detached'});
for(const mode of ['enriquecimento','estatisticas']){
 await p.selectOption('#ea-operation',mode);
 assert.equal(await p.locator('#ea-entradas').count(),0);
 await p.waitForFunction(()=>document.querySelector('#ea-run-selection').textContent.includes('adicional'));
 assert.equal(await p.locator('#ea-input-preview-layers > section:first-child .ea-preview-layer').count(),2);
}
await p.screenshot({path:'/tmp/sicard-extracao-layout.png',fullPage:true});
assert.deepEqual(errors,[]);console.log('PASS: ordem e alcance das ações, dois algoritmos, prévia conjunta, metadados, visibilidade, editar/limpar/desfazer e lista sem alterar entrada ou saída.');await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
