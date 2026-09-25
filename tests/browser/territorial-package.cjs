// Estados e telemetria controlados; nenhum arquivo é gravado no acervo.
const {chromium}=require('playwright');const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({headless:true,args:['--no-sandbox','--no-proxy-server','--enable-unsafe-swiftshader']});
try{
const p=await browser.newPage(),errors=[];let estado='executando',exportacoes=0,cancelamentos=0;
p.on('pageerror',e=>errors.push(e.message));
const job=()=>({id:'j1',status:estado,cancelavel:estado==='executando',percentual:33,progresso_tarefa:65,
 etapa:'Preparando atributos',etapas:[{sequencia:1,mensagem:'Municípios carregados.'},{sequencia:2,mensagem:'Preparando indicador 13 de 20.'}],erro:estado==='erro'?'Geração indisponível no teste.':null});
await p.route('**/api/**',async r=>{
 const path=new URL(r.request().url()).pathname;
 if(path.includes('/auth/'))return r.fulfill({json:{authenticated:true,id:'teste',username:'analista',nome:'Teste',tipo_usuario:'ADMIN'}});
 if(path.endsWith('/categorias'))return r.fulfill({json:{categorias:[{id:'social',nome:'Social'}]}});
 if(path.endsWith('/catalog'))return r.fulfill({json:{municipalities:645,attributes:[{id:'pop',label:'População',field:'populacao_2022',source:'IBGE · Censo 2022',year:2022,theme:'01_populacao',unit:'pessoas',coverage:645,detail:'{}'}]}});
 if(path.endsWith('/preview'))return r.fulfill({json:{rows:[],fields:[],totalAttributes:1}});
 if(path.endsWith('/jobs')){assert.equal(r.request().postDataJSON().format,'geojson');exportacoes++;return r.fulfill({json:job()});}
 if(path.endsWith('/cancelar')){cancelamentos++;estado='cancelado';return r.fulfill({json:job()});}
 if(path.endsWith('/jobs/j1'))return r.fulfill({json:job()});
 if(path.endsWith('/pacote'))return r.fulfill({contentType:'application/zip',headers:{'X-Camada-Arquivo':'data/geoespacial/teste.fgb','X-Camada-Id':'teste-gerado'},body:'ZIP simulado'});
 return r.fulfill({json:[]});
});
await p.goto('http://127.0.0.1:8083/restrict/geoespacial/gerador-camadas-territoriais/',{waitUntil:'domcontentloaded'});
await p.locator('#admin-session-bar:not(.hidden)').waitFor();
assert.match(await p.locator('#admin-session-bar').textContent(),/Teste.*analista.*Administrador/s);
await p.locator('.mlb-attribute input').check();
assert.equal(await p.locator('.mlb-output select').locator('option').count(),4);
await p.locator('.mlb-output select').selectOption('geojson');
async function iniciar(){await p.getByRole('button',{name:'Gerar camada',exact:true}).click();await p.locator('[data-fb-confirmar]').click();await p.locator('.slt-fb-bar--tarefa[aria-valuenow="65"]').waitFor();}
await iniciar();assert.equal(exportacoes,1);
assert.equal(await p.locator('.slt-fb-bar--geral').getAttribute('aria-valuenow'),'33');
assert.match(await p.locator('.slt-fb-steps').textContent(),/Municípios carregados.*Preparando indicador 13/s);
await p.getByRole('button',{name:'Cancelar',exact:true}).click();await p.locator('.slt-fb-modal--info').waitFor();assert.equal(cancelamentos,1);
await p.locator('.slt-fb-foot [data-fb-close]').click();assert.equal(await p.locator('.mlb-attribute input').isChecked(),true);assert.equal(await p.locator('#territorial-result').isVisible(),false);
estado='executando';await iniciar();estado='concluido';await p.locator('.slt-fb-modal--success').waitFor();assert.equal(await p.locator('#territorial-result').isVisible(),true);assert.equal(await p.locator('#territorial-download').getAttribute('download'),'municipios_sp_geojson.zip');
assert.equal(await p.locator('.mlb-status,#ea-feedback').count(),0);await p.locator('.slt-fb-foot [data-fb-close]').click();
estado='executando';await iniciar();estado='erro';await p.locator('.slt-fb-modal--error').waitFor();assert.match(await p.locator('.slt-fb-modal--error').textContent(),/Geração indisponível/);
assert.deepEqual(errors,[]);console.log('PASS: quatro formatos, GeoJSON no pedido e download ZIP, progresso, cancelamento, seleção preservada, sucesso e erro.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
