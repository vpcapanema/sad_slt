// HTML/Leaflet reais; APIs interceptadas. Fixtures sem dados de produção.
const {chromium}=require('playwright');const assert=require('node:assert/strict');
(async()=>{
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[],uploads=[],execs=[],saved=[];
page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept(d.type()==='prompt'?'Config local':undefined));
const feature={type:'Feature',properties:{codigo:'001',valor:0},geometry:{type:'Point',coordinates:[-46.63,-23.55]}};
const fc={type:'FeatureCollection',features:[feature]};
const file=Buffer.from(JSON.stringify(fc));
const catalog={categorias:[{id:'social',nome:'Social'}],camadas:[{id:'base',nome:'Base',origem:'importadas'}]};
let fail=false,delay=0,sequence=0;
await page.route('**/api/**',async route=>{
 const url=new URL(route.request().url()),path=url.pathname;const send=data=>route.fulfill({json:data});
 if(path.includes('/auth/'))return send({authenticated:true,id:'ui-test',nome:'Teste',username:'UI_ADMIN',tipo_usuario:'ADMIN'});
 if(path.endsWith('/catalogo'))return send(catalog);
 if(path.endsWith('/storage/navegar'))return send({pastas:[],arquivos:[]});
 if(path.endsWith('/entrada-local')){
  uploads.push(route.request().postDataBuffer());if(delay)await new Promise(r=>setTimeout(r,delay));
  if(fail)return route.fulfill({status:422,json:{detail:'GeoJSON inválido.'}});
  return send({id:`local:${++sequence}`,nome:'Pontos locais',origem:'local',origem_geometria:'memoria',geojson:fc,campos:[{nome:'codigo'},{nome:'valor'}],metadados_local:{arquivo:url.searchParams.get('nome'),nome_camada:'Pontos locais',camada:'pontos.geojson::0',formato:'GeoJSON',bytes:file.length,bytes_descompactados:file.length,feicoes:1,campos_total:2,tipos_geometria:['Point'],crs:'EPSG:4326',crs_nome:'WGS 84',unidade:'degree',limites_wgs84:[-46.63,-23.55,-46.63,-23.55],avisos:[],localizacao:{fonte:'IBGE · Malha municipal 2022',cobertura:'Estado de São Paulo',ufs:['SP'],municipios:[{nm_mun:'São Paulo',cd_mun:'3550308',sigla_uf:'SP'}],aviso:'Consulta espacial em SP.'}}});
 }
 if(path.endsWith('/arquivo-mapa'))return send({...catalog.camadas[0],geojson:fc,campos:[{nome:'valor'}]});
 if(path.endsWith('/configuracoes')&&route.request().method()==='POST'){saved.push(route.request().postDataJSON());return send({nome:'Config local',camadas:1,categorias:1,entradas:0,finalidades:0});}
 if(path.endsWith('/execucoes')&&route.request().method()==='POST'){
  execs.push(route.request().postDataJSON());return send({id:'job',status:'concluido',resultado:{id:'job',modo:'enriquecimento',operacao:'estatisticas',camadas:{pontos:{camada_resultado_id:'saida',registros:1,campos:2}},dicionario:[],validacao:{aprovada:true},resumo:{ocorrencias:1,camadas_intersectadas:1},geojson:fc}});
 }
 return send([]);
});
await page.goto(`${process.env.SICARD_TEST_URL||'http://127.0.0.1:8082'}/restrict/geoespacial/extracao-atributos/`);
await page.waitForFunction(()=>window.SICARDExtracao&&document.querySelector('#ea-input-upload')&&!document.querySelector('#ea-input-upload').disabled);
assert.equal(await page.locator('#ea-input-preview').isVisible(),false);
assert.equal(await page.locator('#ea-staging').isVisible(),false,'Lista vazia permanece oculta mesmo com categoria selecionada');
// Botão dispara o seletor nativo, sem navegação.
const url=page.url();const chooser=page.waitForEvent('filechooser');await page.locator('#ea-input-upload').click();
delay=500;await (await chooser).setFiles({name:'pontos.geojson',mimeType:'application/geo+json',buffer:file});
assert.equal(await page.locator('#ea-input-preview').isVisible(),false,'Sem prévia antes da validação');
await page.locator('#ea-input-preview:not([hidden])').waitFor();assert.equal(page.url(),url);
assert.deepEqual(uploads[0],file);
await page.waitForFunction(()=>document.querySelector('#ea-input-preview-map .leaflet-overlay-pane canvas'));
assert.match(await page.locator('#ea-input-preview-data').textContent(),/EPSG:4326/);
assert.match(await page.locator('#ea-input-preview-data').textContent(),/São Paulo \(3550308\)/);
assert.equal(await page.locator('#ea-staging').isVisible(),false);
for(const width of [320,390,768,1440]){
 await page.setViewportSize({width,height:1000});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 assert.equal(await page.locator('#ea-input-preview-data').evaluate(el=>el.getBoundingClientRect().top>=document.querySelector('#ea-input-preview-map').getBoundingClientRect().bottom),true);
}
if(process.env.SICARD_TEST_SCREENSHOT)await page.screenshot({path:process.env.SICARD_TEST_SCREENSHOT,fullPage:true});
// Uma falha de arquivo não substitui a entrada validada anterior.
fail=true;delay=0;await page.locator('#ea-input-file').setInputFiles({name:'erro.geojson',mimeType:'application/json',buffer:Buffer.from('bad')});
await page.getByText(/GeoJSON inválido.*seleção anterior/).waitFor();assert.equal(await page.locator('#ea-input-select').inputValue(),'local:1');
fail=false;
await page.locator('#ea-base-browse').click();const dialog=page.locator('dialog.ea-storage-dialog');
await dialog.getByRole('button',{name:'Camadas cadastradas no banco',exact:true}).click();
assert.equal(await dialog.locator('[data-file^="local:"]').count(),0,'Upload não aparece como cadastrado');
await dialog.locator('[data-file="base"]').click();await dialog.locator('.ea-storage-confirm-button').click();
await dialog.waitFor({state:'detached'});assert.equal(await page.locator('#ea-staging').isVisible(),true);
await page.locator('#ea-staging-confirmar').click();await page.locator('dialog').getByRole('button',{name:'Confirmar bases',exact:true}).click();await page.locator('dialog').getByRole('button',{name:'Fechar',exact:true}).click();
assert.equal(await page.locator('#ea-staging').isVisible(),false);
await page.selectOption('#ea-operation','estatisticas');
await page.locator('#ea-staging-salvar').click();await page.waitForTimeout(150);
assert.equal(saved[0].entradas.length,0);assert.equal(JSON.stringify(saved).includes('conteudo_base64'),false);
await page.locator('#ea-run').click();await page.locator('dialog').getByRole('button',{name:'Executar extração',exact:true}).click();await page.locator('dialog').getByRole('button',{name:'Fechar',exact:true}).click();
assert.equal(execs[0].input_id,'local:1');assert.equal(Buffer.from(execs[0].arquivo_local.conteudo_base64,'base64').toString(),file.toString());
await page.locator('#ea-refresh').click();await page.waitForTimeout(200);assert.equal(await page.locator('#ea-input-select').inputValue(),'local:1');
await page.locator('#ea-input-clear').click();assert.equal(await page.locator('#ea-input-preview').isVisible(),false);
assert.deepEqual(errors,[]);console.log('PASS: seletor local, prévia pós-validação em Leaflet, metadados, listas condicionais, erros, memória e execução.');
await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
