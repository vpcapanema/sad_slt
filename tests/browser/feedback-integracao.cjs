// Requer Playwright instalado e a aplicação local aberta em SICARD_TEST_URL.
// As APIs são interceptadas; este teste nunca grava dados de produção.
const {chromium}=require('playwright');const assert=require('node:assert/strict');
(async()=>{
const b=await chromium.launch({headless:true,args:['--no-sandbox','--no-proxy-server','--enable-unsafe-swiftshader']});
const p=await b.newPage({viewport:{width:1440,height:1000}});const errors=[],requests=[];let falharTabela=false,saved,polls=0,municipalCatalog=0,municipalPayload;
p.on('pageerror',e=>errors.push(e.message));
await p.addLocatorHandler(p.locator('.notification-toast.info').first(),async()=>{await p.evaluate(()=>Notify.clearAll());});await p.addLocatorHandler(p.locator('#pfsStatusOverlay.pfs-active').filter({hasText:'Bancada de geoprocessamento'}),async()=>{await p.evaluate(()=>StatusFeedback.fechar());});
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
 if(path.endsWith('/compatibilizar'))return send({compativel:true,camadas:[],erros:[]});
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
async function choose(button,id){await p.locator(button).click();const d=p.locator('dialog.ea-storage-dialog');await d.getByRole('button',{name:'Camadas cadastradas no banco',exact:true}).click();await d.locator(`[data-file="${id}"]`).click();await d.locator('.ea-storage-confirm-button').click();await d.waitFor({state:'detached'});}
await p.locator('#ea-base-browse').click();assert.equal(await p.locator('#ea-category-select').getAttribute('aria-invalid'),'true');assert.equal(await p.locator('.notification-toast.warning').count(),1);assert.equal(await p.locator('#pfsConfirmOverlay.pfs-active').count(),0);await p.evaluate(()=>Notify.clearAll());
await p.selectOption('#ea-category-select','ambiental');assert.equal(await p.locator('#ea-category-select').getAttribute('aria-invalid'),null);
await choose('#ea-input-browse','entrada');await p.selectOption('#ea-operation','estatisticas');await choose('#ea-base-browse','base');
assert.equal(await p.locator('#pfsConfirmOverlay.pfs-active').count(),0);
await p.locator('#ea-staging-confirmar').click();await p.waitForFunction(()=>!document.querySelector('#ea-run').disabled);
assert.equal(await p.locator('#pfsConfirmOverlay.pfs-active').count(),0,'Confirmação redundante de bases removida');
await p.locator('#pfsSuccessBox.pfs-active').waitFor();await p.locator('#pfsSuccessOk').click();
await p.locator('#ea-config-salvar').click();await p.locator('#pfsConfirmInput').fill('Configuração');await p.locator('#pfsConfirmOk').click();await p.locator('.notification-toast').filter({hasText:'Configuração'}).first().waitFor();assert.equal(await p.locator('#pfsStatusOverlay.pfs-active').count(),0);await p.evaluate(()=>Notify.clearAll());
await p.locator('#ea-run').click();await p.locator('#pfsConfirmOk').click();
await p.waitForFunction(()=>!document.querySelector('#ea-export').disabled);
await p.locator('#pfsSuccessBox.pfs-active').waitFor();assert.equal(await p.locator('[data-pfs="success-header-title"]').innerText(),'Extração em andamento');
await p.locator('#pfsSuccessBox').getByRole('button',{name:'Ver resultados'}).click();
await p.locator('#ea-results [data-view="attributes"]').click();await p.getByText('1–100 de 101 registros.',{exact:false}).waitFor();assert.equal(await p.locator('#pfsStatusOverlay.pfs-active').count(),0);assert.equal(await p.locator('#pfsProgressOverlay.pfs-active').count(),0);
assert.deepEqual(errors,[]);console.log('PASS: página real com aviso no campo, confirmação apenas da execução, progresso e desfecho no ProcessFeedback, salvamento discreto e atalho para os resultados.');await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
