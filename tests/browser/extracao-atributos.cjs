// Requer Playwright instalado e a aplicação local aberta em SICARD_TEST_URL.
// As APIs são interceptadas; este teste nunca grava dados de produção.
const {chromium}=require('playwright');const assert=require('node:assert/strict');
(async()=>{
const b=await chromium.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
const p=await b.newPage({viewport:{width:1440,height:1000}});const errors=[],requests=[];let saved,polls=0,municipalCatalog=0;
p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept(d.type()==='prompt'?'Configuração teste':undefined));
const fc={type:'FeatureCollection',features:[{type:'Feature',properties:{nome:'Teste',id:1},geometry:{type:'Point',coordinates:[-47,-23]}}]};
const catalog={categorias:[{id:'ambiental',nome:'Ambiental'},{id:'social',nome:'Social'}],camadas:['entrada','base','adicional'].map(id=>({id,nome:id,origem:'importadas'}))};
const result={id:'00000000-0000-0000-0000-000000000001',modo:'enriquecimento',camadas:{pontos:{camada_resultado_id:'saida',registros:101,campos:2}},dicionario:[{camada:'pontos',campo:'id',apelido:'ID'}],categorias:[],validacao:{aprovada:true},resumo:{ocorrencias:101,camadas_intersectadas:1},geojson:fc};
await p.route('**/api/**',async r=>{
 const u=new URL(r.request().url()),path=u.pathname,method=r.request().method();
 const send=data=>r.fulfill({json:data});
 if(path.endsWith('/municipal/ambiental/catalog')){municipalCatalog++;return send({attributes:[],municipalities:645,geometryYear:2022,crs:'EPSG:4674'});}
 if(path.endsWith('/test-204'))return r.fulfill({status:204});
 if(path.endsWith('/test-401'))return r.fulfill({status:401,json:{detail:'negado'}});
 if(path.endsWith('/test-poll'))return ++polls===1?r.fulfill({status:503,contentType:'text/html',body:'<h1>Unavailable</h1>'}):send({id:'job',status:'concluido',resultado:{ok:true}});
 if(path.includes('/auth/'))return send({authenticated:true,id:'ui-test',nome:'Teste local',username:'UI_ADMIN',tipo_usuario:'ADMIN'});
 if(path.endsWith('/storage/navegar'))return send({pastas:[],arquivos:[]});
 if(path.endsWith('/extracao-atributos/catalogo'))return send(catalog);
 if(path.endsWith('/arquivo-mapa')){const body=r.request().postDataJSON();return send({...catalog.camadas.find(c=>c.id===body.id),geojson:fc,campos:[{nome:'nome'},{nome:'id'},{nome:'campo_de_outro_registro'}]});}
 if(path.endsWith('/configuracoes')&&method==='POST'){saved=r.request().postDataJSON();return send({nome:saved.nome,camadas:1,categorias:1,entradas:saved.entradas.length,finalidades:0});}
 if(path.endsWith('/configuracoes')&&method==='GET')return send({configuracoes:[{chave:'teste',nome:saved.nome,camadas:1,categorias:1}]});
 if(path.endsWith('/configuracoes/teste'))return send({...saved,ausentes:[],categorias:saved.categorias.map(c=>({...c,camadas:c.camadas.map(id=>({id,nome:id,regra:{multiplicidade:'resumo'}}))}))});
 if(path.endsWith('/execucoes')&&method==='POST'){requests.push(r.request().postDataJSON());return send({id:result.id,status:'concluido',resultado:result});}
 if(path.endsWith('/tabela')){const offset=Number(u.searchParams.get('offset'));return send({campos:['id','nome'],linhas:Array.from({length:offset?1:100},(_,i)=>({id:offset+i,nome:'Registro '+(offset+i)})),total:101});}
 if(path.endsWith('/pacote'))return r.fulfill({contentType:'application/zip',headers:{'Content-Disposition':'attachment; filename="resultado.zip"'},body:'fixture-download'});
 return send([]);
});
await p.goto(`${process.env.SICARD_TEST_URL||'http://127.0.0.1:8081'}/restrict/geoespacial/extracao-atributos/`);
await p.waitForFunction(()=>window.SICARDExtracao&&document.querySelector('#ea-category-select').options.length>1);
await p.waitForFunction(()=>document.querySelector('iframe').contentWindow.gpApp?.state.map?.isStyleLoaded());
assert.equal(await p.locator('#ea-category-select').inputValue(),'');
for(const width of [390,1440]){
 await p.setViewportSize({width,height:1000});
 const button=p.getByRole('button',{name:'Gerar camada de municípios',exact:true});
 assert.equal(await button.isVisible(),true);
 assert.equal(await button.locator('span').evaluate(el=>getComputedStyle(el).position),'static');
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
}
await p.locator('#ea-municipal-open').click();
const categoryDialog=p.getByRole('dialog',{name:'Categoria da camada municipal'});
await categoryDialog.locator('select').selectOption('ambiental');
await categoryDialog.getByRole('button',{name:'Abrir gerador de municípios'}).click();
await p.locator('.ea-municipal-dialog').getByRole('heading',{name:'Camada municipal · Ambiental',exact:true}).waitFor();
await p.waitForFunction(()=>document.querySelector('.ea-municipal-dialog .mlb'));
await p.waitForTimeout(200);assert.equal(municipalCatalog,1);
await p.getByRole('button',{name:'Fechar gerador municipal'}).click();
assert.equal(await p.locator('#ea-results #ea-recover').count(),1);
assert.equal(await p.locator('.ea-config-tools #ea-staging-carregar').count(),1);
if(process.env.SICARD_TEST_SCREENSHOT)await p.locator('#ea-config').screenshot({path:process.env.SICARD_TEST_SCREENSHOT});
async function choose(button,id){await p.locator(button).click();const d=p.locator('dialog.ea-storage-dialog');await d.getByRole('button',{name:'Camadas cadastradas no banco',exact:true}).click();await d.locator(`[data-file="${id}"]`).click();await d.locator('.ea-storage-confirm-button').click();await d.waitFor({state:'detached'});}
await choose('#ea-input-browse','entrada');await p.selectOption('#ea-operation','enriquecimento');await choose('#ea-base-browse','base');
await p.locator('#ea-staging-confirmar').click();await p.locator('dialog').getByRole('button',{name:'Confirmar bases',exact:true}).click();
await p.locator('dialog').getByRole('button',{name:'Fechar',exact:true}).click();
assert.equal(await p.locator('#ea-staging-salvar').isEnabled(),true);
await p.getByRole('button',{name:'Adicionar entrada',exact:true}).click();const d=p.locator('dialog.ea-storage-dialog');await d.getByRole('button',{name:'Camadas cadastradas no banco',exact:true}).click();assert.equal(await d.locator('[data-file="base"]').isDisabled(),true);await d.locator('[data-file="adicional"]').click();await d.locator('.ea-storage-confirm-button').click();await d.waitFor({state:'detached'});
await p.fill('#ea-nome-saida','Resultado conferido');await p.locator('#ea-staging-salvar').click();await p.waitForTimeout(200);assert.equal(saved.operacao,'enriquecimento');assert.equal(saved.nome_saida,'Resultado conferido');assert.equal(saved.entradas.length,2);assert.equal(saved.categorias[0].camadas[0],'base');
await p.locator('#ea-run').click();await p.locator('dialog').getByRole('button',{name:'Executar extração',exact:true}).click();await p.locator('dialog').getByRole('button',{name:'Fechar',exact:true}).click();
assert.equal(requests.length,1);assert.equal(requests[0].entradas.length,2);assert.equal(await p.locator('#ea-export').isEnabled(),true);
await p.locator('#ea-results [data-view="attributes"]').click();await p.getByText('1–100 de 101 registros.',{exact:false}).waitFor();assert.equal(await p.locator('#ea-results-content tbody tr').count(),100);await p.locator('#ea-results-content').getByRole('button',{name:'Próxima'}).click();await p.getByText('101–101 de 101 registros.',{exact:false}).waitFor();
assert.equal(await p.locator('#ea-results [data-view="dictionary"]').isVisible(),true);assert.equal(await p.locator('#ea-results [data-view="statistics"]').isVisible(),false);
const download=p.waitForEvent('download');await p.locator('#ea-export').click();assert.equal((await download).suggestedFilename(),'resultado.zip');
await p.locator('#ea-entradas').getByRole('button',{name:'Remover',exact:true}).click();assert.equal(await p.locator('#ea-export').isDisabled(),true);
await p.locator('#ea-staging-carregar').click();await p.locator('dialog .ea-config-entry').click();await p.locator('dialog').getByRole('button',{name:'Carregar',exact:true}).click();
await p.waitForFunction(()=>document.querySelector('#ea-entradas').textContent.includes('adicional'));
assert.equal(await p.locator('#ea-bases-confirmadas').isVisible(),false);
assert.equal(await p.locator('#ea-operation').inputValue(),'enriquecimento');assert.equal(await p.locator('#ea-nome-saida').inputValue(),'Resultado conferido');
const apiChecks=await p.evaluate(async()=>{
 const api=await import('/restrict/geoespacial/extracao-atributos/api.js');
 const empty=await api.json('/test-204');let message;
 try{await api.json('/test-401');}catch(e){message=e.message;}
 const recovered=await api.esperar({id:'job',status:'executando'},()=>'/test-poll',()=>{});
 return {empty,message,recovered};
});
assert.equal(apiChecks.empty,null);assert.match(apiChecks.message,/sessão expirou/);assert.equal(apiChecks.recovered.ok,true);assert.equal(polls,2);
await p.setViewportSize({width:390,height:844});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'A página não pode transbordar horizontalmente');

assert.equal(errors.length,0,JSON.stringify(errors));console.log('PASS: acesso visível ao plugin municipal, escolha de categoria, abertura do plugin real, ações reorganizadas, seleção banco, exclusões, mapa real, entradas adicionais, salvar após confirmar, payload, tabela paginada, abas, download e invalidação.');await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
