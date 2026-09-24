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
 if(path.endsWith('/configuracoes')&&method==='GET')return send({configuracoes:[{chave:'teste',nome:saved.nome,camadas:1,categorias:1}]});
 if(path.endsWith('/configuracoes/teste'))return send({...saved,ausentes:[],categorias:saved.categorias.map(c=>({...c,camadas:c.camadas.map(id=>({id,nome:id,regra:{multiplicidade:'resumo'}}))}))});
 if(path.endsWith('/execucoes')&&method==='POST'){requests.push(r.request().postDataJSON());result.operacao=r.request().postDataJSON().operacao;return send({id:result.id,status:'concluido',resultado:result});}
 if(path.endsWith('/tabela')){if(falharTabela)return r.fulfill({status:503,json:{detail:'Tabela temporariamente indisponível.'}});const offset=Number(u.searchParams.get('offset'));return send({campos:['id','nome'],linhas:Array.from({length:offset?1:100},(_,i)=>({id:offset+i,nome:'Registro '+(offset+i)})),total:101});}
 if(path.endsWith('/pacote'))return r.fulfill({contentType:'application/zip',headers:{'Content-Disposition':'attachment; filename="resultado.zip"'},body:'fixture-download'});
 return send([]);
});
await p.goto(`${process.env.SICARD_TEST_URL||'http://127.0.0.1:8081'}/restrict/geoespacial/extracao-atributos/`,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=>window.SICARDExtracao&&document.querySelector('#ea-category-select').options.length>1);
await p.waitForFunction(()=>document.querySelector('iframe').contentWindow.gpApp?.state.map?.isStyleLoaded());
assert.equal(await p.locator('#ea-category-select').inputValue(),'');
for(const width of [320,390,768,1440]){
 await p.setViewportSize({width,height:1000});
 const button=p.getByRole('link',{name:'Abrir ferramenta',exact:true});
 assert.equal(await button.isVisible(),true);
 assert.equal(await button.evaluate(el=>getComputedStyle(el).color),'rgb(255, 255, 255)');
 assert.equal(await button.locator('span').evaluate(el=>getComputedStyle(el).position),'static');
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 if(width<=390){await p.waitForFunction(()=>document.querySelector('iframe').contentDocument.body.classList.contains('ea-embedded-workbench'));
 assert.equal(await p.locator('iframe').evaluate(f=>{const r=f.contentDocument.querySelector('.gp-map-view').getBoundingClientRect();return r.left>=0&&r.right<=f.clientWidth+1;}),true,'Mapa cabe no iframe móvel');}
}
await choose('#ea-input-browse','entrada');
await p.selectOption('#ea-operation','enriquecimento');await p.fill('#ea-nome-saida','Rascunho preservado');
await p.locator('#ea-municipal-open').click();
await p.waitForURL('**/gerador-camadas-territoriais/');
await p.locator('#territorial-category:not([disabled])').waitFor();
assert.equal(await p.locator('dialog,iframe').count(),0);
await p.locator('#territorial-category').selectOption('ambiental');
await p.locator('#territorial-builder .mlb').waitFor();
await p.waitForTimeout(200);assert.equal(municipalCatalog,1);
for(const width of [390,1440]){
 await p.setViewportSize({width,height:1000});
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Página territorial sem transbordamento');
}
if(process.env.SICARD_TEST_SCREENSHOT)await p.screenshot({path:process.env.SICARD_TEST_SCREENSHOT,fullPage:true});
await p.locator('#territorial-back').click();await p.waitForURL('**/extracao-atributos/**');
await p.waitForFunction(()=>document.querySelector('#ea-input-select')?.value==='entrada');
assert.equal(await p.locator('#ea-operation').inputValue(),'enriquecimento');
assert.equal(await p.locator('#ea-nome-saida').inputValue(),'Rascunho preservado');
await p.selectOption('#ea-category-select','ambiental');
await p.waitForFunction(()=>document.querySelector('iframe').contentWindow.gpApp?.state.map?.isStyleLoaded());
assert.equal(await p.locator('#ea-results #ea-recover').count(),1);
assert.equal(await p.locator('.ea-config-tools #ea-config-carregar').count(),1);

async function choose(button,id){await p.locator(button).click();const d=p.locator('dialog.ea-storage-dialog');await d.getByRole('button',{name:'Camadas cadastradas no banco',exact:true}).click();await d.locator(`[data-file="${id}"]`).click();await d.locator('.ea-storage-confirm-button').click();await d.waitFor({state:'detached'});}
await choose('#ea-input-browse','entrada');await p.selectOption('#ea-operation','enriquecimento');await choose('#ea-base-browse','base');
await p.locator('#ea-staging-confirmar').click();await p.locator('#slt-feedback-backdrop').getByRole('button',{name:'Confirmar bases',exact:true}).click();
await p.locator('#slt-feedback-backdrop').getByRole('button',{name:'OK',exact:true}).click();
assert.equal(await p.locator('#ea-config-salvar').isEnabled(),true);
await p.locator('#ea-bases-confirmadas').getByRole('button',{name:/Regra:/}).click();
assert.equal(await p.locator('.ea-regra-grupo').isVisible(),false,'Chaves ocultas para ligação espacial');
await p.locator('dialog select[name=ligacao]').selectOption('atributo');
assert.equal(await p.locator('.ea-regra-grupo').isVisible(),true);
await p.setViewportSize({width:390,height:844});
assert.equal(await p.locator('dialog').evaluate(el=>el.scrollWidth<=el.clientWidth+1),true,'Editor de regras sem corte lateral');
await p.locator('dialog').getByRole('button',{name:'Cancelar',exact:true}).click();
await p.setViewportSize({width:1440,height:1000});
// Os dois editores coexistem; alternar não elimina a estatística personalizada.
await p.selectOption('#ea-operation','estatisticas');
await p.locator('#ea-bases-confirmadas').getByRole('button',{name:/Regra:/}).click();
assert.equal(await p.locator('dialog select[name=estatistica] option').count(),9);
assert.equal(await p.locator('dialog select[name=papel]').count(),0);
await p.locator('dialog select[name=estatistica]').selectOption('mediana');
await p.locator('dialog select[name=campo_estatistica]').selectOption('nome');
await p.locator('dialog select[name=estatistica_campo]').selectOption('moda');
await p.setViewportSize({width:390,height:844});
assert.equal(await p.locator('dialog').evaluate(el=>el.scrollWidth<=el.clientWidth+1),true);
await p.locator('dialog').getByRole('button',{name:'Aplicar',exact:true}).click();
await p.selectOption('#ea-operation','enriquecimento');
await p.locator('#ea-bases-confirmadas').getByRole('button',{name:/Regra:/}).click();
assert.equal(await p.locator('dialog select[name=papel] option[value=recorte]').count(),1);
assert.equal(await p.locator('dialog select[name=multiplicidade] option[value=todas]').count(),1);
await p.locator('dialog').getByRole('button',{name:'Aplicar',exact:true}).click();
await p.setViewportSize({width:1440,height:1000});
await p.locator('#ea-input-browse').click();const d=p.locator('dialog.ea-storage-dialog');await d.getByRole('button',{name:'Camadas cadastradas no banco',exact:true}).click();assert.equal(await d.locator('[data-file="base"]').isDisabled(),true);await d.locator('[data-file="entrada"]').click();await d.locator('[data-file="adicional"]').click();await d.locator('.ea-storage-confirm-button').click();await d.waitFor({state:'detached'});
await p.fill('#ea-nome-saida','Resultado conferido');await p.locator('#ea-config-salvar').click();await p.locator('[data-fb-input]').waitFor();await p.locator('[data-fb-input]').fill('Configuração teste');await p.locator('[data-fb-confirmar]').click();await p.waitForTimeout(200);assert.equal(saved.operacao,'enriquecimento');assert.equal(saved.nome_saida,'Resultado conferido');assert.equal(saved.entradas.length,2);assert.equal(saved.categorias[0].camadas[0],'base');assert.equal(saved.categorias[0].regras.base.estatistica,'mediana');assert.equal(saved.categorias[0].regras.base.estatisticas_campos.nome,'moda');
await p.locator('#ea-run').click();await p.locator('#slt-feedback-backdrop').getByRole('button',{name:'Executar extração',exact:true}).click();await p.locator('#slt-feedback-backdrop').getByRole('button',{name:'OK',exact:true}).click();
assert.equal(requests.length,1);assert.equal(requests[0].entradas.length,2);assert.equal(await p.locator('#ea-export').isEnabled(),true);
await p.locator('#ea-results [data-view="attributes"]').click();await p.getByText('1–100 de 101 registros.',{exact:false}).waitFor();assert.equal(await p.locator('#ea-results-content tbody tr').count(),100);await p.locator('#ea-results-content').getByRole('button',{name:'Próxima'}).click();await p.getByText('101–101 de 101 registros.',{exact:false}).waitFor();
falharTabela=true;await p.locator('#ea-results-content').getByRole('button',{name:'Anterior'}).click();await p.locator('.slt-fb-modal--error').waitFor();assert.match(await p.locator('.slt-fb-results').textContent(),/Tabela temporariamente/);await p.locator('.slt-fb-foot [data-fb-close]').click();falharTabela=false;await p.locator('#ea-results-content').getByRole('button',{name:'Tentar novamente'}).click();await p.getByText('1–100 de 101 registros.',{exact:false}).waitFor();
assert.equal(await p.locator('#ea-results [data-view="dictionary"]').isVisible(),true);assert.equal(await p.locator('#ea-results [data-view="statistics"]').isVisible(),false);
const download=p.waitForEvent('download');await p.locator('#ea-export').click();assert.equal((await download).suggestedFilename(),'resultado.zip');
await p.selectOption('#ea-operation','estatisticas');
await p.locator('#ea-run').click();await p.locator('#slt-feedback-backdrop').getByRole('button',{name:'Executar extração',exact:true}).click();await p.locator('#slt-feedback-backdrop').getByRole('button',{name:'OK',exact:true}).click();
assert.equal(requests.length,2);assert.equal(requests[1].operacao,'estatisticas');
assert.equal(requests[1].categorias[0].regras.base.estatistica,'mediana');
assert.equal(requests[1].categorias[0].regras.base.estatisticas_campos.nome,'moda');
await p.locator('#ea-config-salvar').click();await p.locator('[data-fb-input]').waitFor();await p.locator('[data-fb-input]').fill('Configuração teste');await p.locator('[data-fb-confirmar]').click();await p.waitForTimeout(200);assert.equal(saved.operacao,'estatisticas');
// Editor binário por categoria oficial, sem medidas ou recorte.
await p.evaluate(()=>window.SLTFeedback.fechar());
await p.evaluate(async()=>{const r=await import('/restrict/geoespacial/extracao-atributos/regras.js');window.binaryDialog=r.editarEstatisticas({nomeBase:'Áreas de risco',categoria:{id:'risco',nome:'Risco'},camposDisponiveis:['grau']});});
assert.equal(await p.locator('dialog select[name=estatistica]').count(),0);
assert.match(await p.locator('dialog').textContent(),/Sim.*Não/);
await p.locator('dialog').getByRole('button',{name:'Cancelar',exact:true}).click();
await choose('#ea-input-browse','entrada');assert.equal(await p.locator('#ea-export').isDisabled(),true);
await p.locator('#ea-config-carregar').click();await p.locator('dialog .ea-config-entry').click();await p.locator('dialog').getByRole('button',{name:'Carregar',exact:true}).click();
await p.locator('[data-fb-confirmar]').click();
await p.waitForFunction(()=>document.querySelector('#ea-input-info').textContent.includes('adicional'));
assert.equal(await p.locator('#ea-bases-confirmadas').isVisible(),true);
assert.equal(await p.locator('#ea-operation').inputValue(),'estatisticas');assert.equal(await p.locator('#ea-nome-saida').inputValue(),'Resultado conferido');
const apiChecks=await p.evaluate(async()=>{
 const api=await import('/restrict/geoespacial/extracao-atributos/api.js');
 const empty=await api.json('/test-204');let message;
 try{await api.json('/test-401');}catch(e){message=e.message;}
 const recovered=await api.esperar({id:'job',status:'executando'},()=>'/test-poll',()=>{});
 return {empty,message,recovered};
});
assert.equal(apiChecks.empty,null);assert.match(apiChecks.message,/sessão expirou/);assert.equal(apiChecks.recovered.ok,true);assert.equal(polls,2);
await p.setViewportSize({width:390,height:844});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'A página não pode transbordar horizontalmente');

await p.locator('#ea-municipal-open').click();await p.waitForURL('**/gerador-camadas-territoriais/**');
await p.getByRole('checkbox',{name:'Indicador de teste',exact:true}).check();
await p.getByRole('button',{name:'Gerar camada',exact:true}).click();
await p.locator('[data-fb-confirmar]').click();
await p.locator('#territorial-result:not([hidden])').waitFor();assert.deepEqual(municipalPayload.attributes,['teste']);
await p.locator('#slt-feedback-backdrop').getByRole('button',{name:'OK',exact:true}).click();
const layerDownload=p.waitForEvent('download');await p.locator('#territorial-download').click();
assert.equal((await layerDownload).suggestedFilename(),'municipios_sp_fgb.zip');
await p.locator('#territorial-use').click();await p.waitForURL('**/extracao-atributos/**');
await p.locator('#ea-input-preview-layers').getByText('Municipal gerada',{exact:true}).waitFor().catch(async e=>{console.error(await p.evaluate(()=>({url:location.href,staging:document.querySelector('#ea-input-preview-layers')?.textContent,feedback:document.querySelector('#slt-feedback-backdrop')?.textContent})));throw e;});
assert.equal(await p.locator('#ea-input-select').inputValue(),'entrada');
assert.equal(await p.locator('#ea-nome-saida').inputValue(),'Resultado conferido');
assert.equal(errors.length,0,JSON.stringify(errors));console.log('PASS: acesso visível ao plugin municipal, escolha de categoria, página independente sem modal, retorno com configuração preservada, ações reorganizadas, seleção banco, exclusões, mapa real, entradas adicionais, salvar após confirmar, payload, tabela paginada, abas, download e invalidação.');await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
