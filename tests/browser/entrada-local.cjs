// HTML/Leaflet reais; APIs interceptadas. Fixtures sem dados de produção.
const {chromium}=require('playwright');const assert=require('node:assert/strict');
(async()=>{
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--no-proxy-server','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[],uploads=[],execs=[],saved=[];
page.on('pageerror',e=>errors.push(e.message));
await page.addLocatorHandler(page.locator('.slt-fb-modal--info'),async()=>{await page.evaluate(()=>window.SLTFeedback.fechar());});await page.addLocatorHandler(page.locator('.slt-fb-modal').filter({hasText:'Bancada de geoprocessamento'}).filter({has:page.locator('[data-fb-close]')}),async()=>{if(await page.locator('#slt-feedback-backdrop[data-processando="true"]').count()===0)await page.locator('.slt-fb-foot [data-fb-close]').click();});
page.on('dialog',d=>d.accept(d.type()==='prompt'?'Config local':undefined));
const feature={type:'Feature',properties:{codigo:'001',valor:0},geometry:{type:'Point',coordinates:[-46.63,-23.55]}};
const fc={type:'FeatureCollection',features:[feature]};
const file=Buffer.from(JSON.stringify(fc));
const catalog={categorias:[{id:'social',nome:'Social'}],camadas:[{id:'base',nome:'Base',origem:'importadas'},{id:'base2',nome:'Base 2',origem:'importadas'}]};
let fail=false,delay=0,sequence=0;
await page.route('**/api/**',async route=>{
 const url=new URL(route.request().url()),path=url.pathname;const send=data=>route.fulfill({json:data});
 if(path.includes('/auth/'))return send({authenticated:true,id:'ui-test',nome:'Teste',username:'UI_ADMIN',tipo_usuario:'ADMIN'});
 if(path.endsWith('/catalogo'))return send(catalog);
 if(path.endsWith('/storage/navegar'))return send({pastas:[],arquivos:[]});
 if(path.endsWith('/entrada-local')){
  uploads.push(route.request().postDataBuffer());if(delay)await new Promise(r=>setTimeout(r,delay));
  if(fail)return route.fulfill({status:422,json:{detail:'GeoJSON inválido.'}});
  const nome=url.searchParams.get('nome');
  const seq=++sequence;
  function vetor(i){return {id:`local:${seq}-camada-${i}`,chave:`dados.gpkg::${i}`,nome:`Camada ${i+1}`,arquivo:'dados.gpkg',tipo:'vetor',status_validacao:'valida',origem:'local',origem_geometria:'memoria',geojson:{type:'FeatureCollection',features:[{...feature,geometry:{type:'Point',coordinates:[-46.63+i/10,-23.55+i/10]}}]},campos:[{nome:'codigo'},{nome:'valor'}],metadados_local:{arquivo:nome,nome_camada:`Camada ${i+1}`,camada:`dados.gpkg::${i}`,formato:'GPKG',bytes:file.length,bytes_descompactados:file.length,feicoes:1,campos_total:2,tipos_geometria:['Point'],crs:'EPSG:4326',crs_nome:'WGS 84',unidade:'degree',limites_wgs84:[-46.63,-23.55,-46.63,-23.55],avisos:[],localizacao:{fonte:'IBGE · Malha municipal 2022',cobertura:'Estado de São Paulo',ufs:['SP'],municipios:[{nm_mun:'São Paulo',cd_mun:'3550308',sigla_uf:'SP'}],aviso:'Consulta espacial em SP.'}}};}
  const camadas=nome==='multicamadas.gpkg'?[vetor(0),vetor(1),vetor(2),{chave:'dados.gpkg::erro',nome:'Sem CRS',arquivo:'dados.gpkg',tipo:'vetor',status_validacao:'invalida',erro:'CRS ausente ou inválido.'}]:[vetor(0)];
  if(nome==='pacote.zip')camadas.push({chave:'dados.gpkg::raster:0',nome:'Imagem',arquivo:'dados.gpkg',status_validacao:'valida',tipo:'raster',compativel_extracao:false,mensagem:'Os algoritmos desta página exigem camadas vetoriais.',imagem:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=',geojson:{type:'FeatureCollection',features:[{type:'Feature',properties:{},geometry:{type:'Polygon',coordinates:[[[-47,-24],[-46,-24],[-46,-23],[-47,-23],[-47,-24]]]}}]},metadados_local:{arquivo:nome,nome_camada:'Imagem',formato:'GPKG',bytes:100,largura:8,altura:8,bandas:[{banda:1,tipo:'Byte',nodata:0}],crs:'EPSG:4326',crs_nome:'WGS 84',limites_wgs84:[-47,-24,-46,-23],avisos:[]}});
  const vetores=camadas.filter(c=>c.tipo==='vetor'&&c.status_validacao==='valida');
  const entrada={...vetores[0],id:`local:${seq}`,nome:nome,geojson:{type:'FeatureCollection',features:vetores.flatMap(c=>c.geojson.features)}};
  return send({arquivo:nome,camadas,entrada,resumo:{total:camadas.length,validas:camadas.filter(c=>c.status_validacao==='valida').length,invalidas:camadas.filter(c=>c.status_validacao==='invalida').length,vetores:vetores.length,rasters:camadas.filter(c=>c.tipo==='raster').length}});

 }
 if(path.endsWith('/compatibilizar'))return send({compativel:true,camadas:[],erros:[]});
 if(path.endsWith('/arquivo-mapa'))return send({...catalog.camadas.find(c=>c.id===route.request().postDataJSON().id),geojson:fc,campos:[{nome:'valor'}]});
 if(path.endsWith('/configuracoes')&&route.request().method()==='POST'){saved.push(route.request().postDataJSON());return send({nome:'Config local',camadas:1,categorias:1,entradas:0,finalidades:0});}
 if(path.endsWith('/execucoes')&&route.request().method()==='POST'){
  execs.push(route.request().postDataJSON());return send({id:'job',status:'concluido',resultado:{id:'job',modo:'enriquecimento',operacao:'estatisticas',camadas:{pontos:{camada_resultado_id:'saida',registros:1,campos:2}},dicionario:[],validacao:{aprovada:true},resumo:{ocorrencias:1,camadas_intersectadas:1},geojson:fc}});
 }
 return send([]);
});
await page.goto(`${process.env.SICARD_TEST_URL||'http://127.0.0.1:8082'}/restrict/geoespacial/extracao-atributos/`,{waitUntil:'domcontentloaded'});
await page.waitForFunction(()=>window.SICARDExtracao&&document.querySelector('#ea-input-upload')&&!document.querySelector('#ea-input-upload').disabled);
assert.equal(await page.locator('#ea-input-preview').isVisible(),false);
assert.equal(await page.locator('#ea-staging-confirmar').isEnabled(),false,'Lista vazia permanece oculta mesmo com categoria selecionada');
// Botão dispara o seletor nativo, sem navegação.
const url=page.url();const chooser=page.waitForEvent('filechooser');await page.locator('#ea-input-upload').click();
delay=500;await (await chooser).setFiles({name:'pontos.geojson',mimeType:'application/geo+json',buffer:file});
assert.equal(await page.locator('#ea-input-preview').isVisible(),false,'Sem prévia antes da validação');
await page.locator('#ea-input-preview:not([hidden])').waitFor();assert.equal(page.url(),url);
assert.deepEqual(uploads[0],file);
await page.waitForFunction(()=>document.querySelector('#ea-input-preview-map .leaflet-overlay-pane canvas'));
assert.match(await page.locator('#ea-input-preview-data').textContent(),/EPSG:4326/);
assert.match(await page.locator('#ea-input-preview-data').textContent(),/São Paulo \(3550308\)/);
assert.equal(await page.locator('#ea-staging-confirmar').isEnabled(),false);
for(const width of [320,390,768,1440]){
 await page.setViewportSize({width,height:1000});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 assert.equal(await page.locator('#ea-input-preview-data').evaluate(el=>el.getBoundingClientRect().top>=document.querySelector('#ea-input-preview-map').getBoundingClientRect().bottom),true);
}
if(process.env.SICARD_TEST_SCREENSHOT)await page.screenshot({path:process.env.SICARD_TEST_SCREENSHOT,fullPage:true});
await page.locator('.slt-fb-foot [data-fb-close]').click();
// Uma falha de arquivo não substitui a entrada validada anterior.
fail=true;delay=0;await page.locator('#ea-input-file').setInputFiles({name:'erro.geojson',mimeType:'application/json',buffer:Buffer.from('bad')});
await page.getByText(/GeoJSON inválido.*seleção anterior/).waitFor();assert.equal(await page.locator('#ea-input-select').inputValue(),'local:1');
await page.locator('.slt-fb-foot [data-fb-close]').click();fail=false;
await page.locator('#ea-base-browse').click();const dialog=page.locator('dialog.ea-storage-dialog');
await dialog.getByRole('button',{name:'Camadas cadastradas no banco',exact:true}).click();
assert.equal(await dialog.locator('[data-file^="local:"]').count(),0,'Upload não aparece como cadastrado');
await dialog.locator('[data-file="base"]').click();await dialog.locator('.ea-storage-confirm-button').click();
await dialog.waitFor({state:'detached'});assert.equal(await page.locator('#ea-staging-confirmar').isEnabled(),true);
await page.locator('#ea-staging-confirmar').click();await page.locator('#slt-feedback-backdrop').getByRole('button',{name:'Confirmar bases',exact:true}).click();await page.locator('#slt-feedback-backdrop').getByRole('button',{name:'OK',exact:true}).click();
assert.equal(await page.locator('#ea-staging-confirmar').isEnabled(),false);
await page.selectOption('#ea-operation','estatisticas');
await page.locator('#ea-config-salvar').click();await page.locator('[data-fb-input]').fill('Config local');await page.locator('[data-fb-confirmar]').click();await page.waitForTimeout(150);
assert.equal(saved[0].entradas.length,0);assert.equal(JSON.stringify(saved).includes('conteudo_base64'),false);
await page.locator('#ea-run').click();await page.locator('#slt-feedback-backdrop').getByRole('button',{name:'Executar extração',exact:true}).click();await page.locator('#slt-feedback-backdrop').getByRole('button',{name:'OK',exact:true}).click();
assert.equal(execs[0].input_id,'local:1');assert.equal(Buffer.from(execs[0].arquivo_local.conteudo_base64,'base64').toString(),file.toString());
await page.locator('#ea-refresh').click();await page.waitForTimeout(200);assert.equal(await page.locator('#ea-input-select').inputValue(),'local:1');
await page.locator('#ea-input-clear').click();assert.equal(await page.locator('#ea-input-preview').isVisible(),true,'A prévia mantém as bases');
// Instrumenta objetos Leaflet reais: testar remoção do mapa, não apenas checkboxes.
await page.evaluate(()=>{
 const original=window.L.geoJSON;
 window.previewTestLayers=[];
 window.L.geoJSON=function(...args){const layer=original.apply(this,args);window.previewTestLayers.push(layer);return layer;};
});
// GeoPackage multicamada não oferece seletor: valida todas e mostra as três juntas.
await page.locator('#ea-input-file').setInputFiles({name:'multicamadas.gpkg',mimeType:'application/octet-stream',buffer:file});
await page.waitForFunction(()=>document.querySelector('#ea-input-select').value==='local:2');await page.locator('.slt-fb-modal--warning .slt-fb-foot [data-fb-close]').click();
assert.equal(await page.locator('#ea-input-layer-choice').count(),0);
assert.equal(await page.locator('#ea-input-preview-layers > section:first-child [data-validation="valida"] .ea-preview-layer').count(),3);
assert.equal(await page.locator('#ea-input-preview-layers > section:first-child [data-validation="invalida"] .ea-preview-layer').count(),1);
const mapBounds=await page.locator('#ea-input-preview-map').boundingBox();
const panelBounds=await page.locator('#ea-input-preview-layers').boundingBox();
assert.ok(panelBounds.x+panelBounds.width<=mapBounds.x,'Painel fica à esquerda do mapa');
await page.locator('#ea-input-preview-layers').getByRole('button',{name:/Camada 3/}).click();
assert.match(await page.locator('#ea-input-preview-data').textContent(),/Camada 3/);
assert.equal(await page.locator('#ea-input-select').inputValue(),'local:2','Clicar metadados não muda a entrada inteira');
await page.locator('#ea-input-preview-layers').getByRole('button',{name:/Sem CRS/}).click();
assert.match(await page.locator('#ea-input-preview-data').textContent(),/Não validada: CRS/);
const tree=page.locator('#ea-input-preview-layers');
const grupo=tree.getByRole('checkbox',{name:'Visibilidade no mapa: Camadas de entrada',exact:true});
const segunda=tree.getByRole('checkbox',{name:'Visibilidade no mapa: Camada 2',exact:true});
assert.equal(await page.evaluate(()=>window.previewTestLayers.filter(l=>!!l._map).length),4);
await segunda.uncheck();
assert.match(await page.locator('#ea-input-preview-data').textContent(),/Camada 2.*Oculta nesta prévia/s);
assert.equal(await page.evaluate(()=>window.previewTestLayers.filter(l=>!!l._map).length),3);
assert.equal(await grupo.evaluate(e=>e.indeterminate),true);
assert.equal(await page.locator('#ea-input-select').inputValue(),'local:2');
await segunda.focus();await page.keyboard.press('Space');
assert.equal(await segunda.isChecked(),true);
assert.equal(await page.evaluate(()=>window.previewTestLayers.filter(l=>!!l._map).length),4);
assert.match(await page.locator('#ea-input-preview-data').textContent(),/Visível no mapa/);
await grupo.uncheck();
assert.equal(await page.evaluate(()=>window.previewTestLayers.filter(l=>!!l._map).length),1);
assert.match(await page.locator('#ea-input-preview-map-status').textContent(),/1 camada\(s\) visível/);
await grupo.check();
assert.equal(await page.evaluate(()=>window.previewTestLayers.filter(l=>!!l._map).length),4);
const pasta=tree.locator(':scope > section:first-child .ea-preview-file-group').filter({has:page.getByRole('checkbox',{name:'Visibilidade no mapa: Validadas · dados.gpkg',exact:true})}).locator(':scope > .ea-preview-tree-row');
await pasta.getByRole('checkbox').uncheck();
assert.equal(await page.evaluate(()=>window.previewTestLayers.filter(l=>!!l._map).length),1);
await pasta.getByRole('checkbox').check();
await pasta.getByRole('button').click();
assert.equal(await segunda.isVisible(),false);
assert.equal(await page.evaluate(()=>window.previewTestLayers.filter(l=>!!l._map).length),4,'Recolher grupo não oculta as camadas');
await pasta.getByRole('button').click();
assert.equal(await segunda.isVisible(),true);
assert.equal(await tree.getByRole('checkbox',{name:'Visibilidade no mapa: Sem CRS',exact:true}).isDisabled(),true);
await tree.getByRole('button',{name:/Camada 2/}).click();
for(const width of [320,390,768,1440]){
 await page.setViewportSize({width,height:1000});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Árvore responsiva');
}

if(process.env.SICARD_TEST_SCREENSHOT)await page.locator('#ea-input-preview').screenshot({path:process.env.SICARD_TEST_SCREENSHOT});
assert.equal(uploads.length,3,'A validação em lote usa só uma requisição por arquivo, sem selecionar camada');
// Bases existentes continuam passando pela lista e pelo feedback padrão.
async function base2(){
 await page.locator('#ea-base-browse').click();const d=page.locator('dialog.ea-storage-dialog');
 await d.getByRole('button',{name:'Camadas cadastradas no banco',exact:true}).click();
 await d.locator('[data-file="base2"]').click();await d.locator('.ea-storage-confirm-button').click();await d.waitFor({state:'detached'});
}
await base2();
await page.locator('#ea-staging-confirmar').click();await page.locator('[data-fb-confirmar]').click();await page.locator('#slt-feedback-backdrop').getByRole('button',{name:'OK',exact:true}).click();
await page.locator('#ea-run').click();await page.locator('[data-fb-confirmar]').click();await page.locator('#slt-feedback-backdrop').getByRole('button',{name:'OK',exact:true}).click();
assert.deepEqual(execs[1].arquivo_local.camadas,['dados.gpkg::0','dados.gpkg::1','dados.gpkg::2']);
assert.equal(await tree.getByRole('checkbox',{name:'Visibilidade no mapa: Sem CRS',exact:true}).isDisabled(),true);
// A bancada governa a execução; visibilidade da prévia não equivale a remoção.
assert.equal(await page.locator('#ea-config #ea-run').count(),0);
assert.equal(await page.locator('#ea-workbench #ea-run').count(),1);
assert.equal(await page.locator('#ea-run').evaluate(e=>e.getBoundingClientRect().top>document.querySelector('#ea-workbench-frame').getBoundingClientRect().bottom),true);
await page.waitForFunction(()=>document.querySelector('#ea-workbench-frame').contentWindow.gpApp.state.layers.some(l=>l.id==='local:2-camada-1'));
if(process.env.SICARD_BANCADA_SCREENSHOT)await page.locator('#ea-workbench').screenshot({path:process.env.SICARD_BANCADA_SCREENSHOT});
const bancada=page.frameLocator('#ea-workbench-frame');
await page.evaluate(()=>document.querySelector('#ea-workbench-frame').contentWindow.gpDocks.activateLeft('contents'));
await bancada.locator('[data-layer="local:2-camada-1"] .layer-name').click();
await bancada.locator('[data-action="remove"]').click();
await page.waitForFunction(()=>!document.querySelector('#ea-run-selection').textContent.includes('Camada 2'));
await page.fill('#ea-nome-saida','');
assert.equal(await page.evaluate(()=>document.querySelector('#ea-workbench-frame').contentWindow.gpApp.state.layers.some(l=>l.id==='local:2-camada-1')),false,'Alterar configuração não ressuscita camada removida');
assert.equal(await tree.getByRole('button',{name:'Camada 2',exact:true}).count(),0,'A prévia acompanha a remoção da entrada');
await page.selectOption('#ea-operation','');assert.equal(await page.locator('#ea-run').isDisabled(),true);
await page.selectOption('#ea-operation','estatisticas');
await page.locator('#ea-run').click();await page.locator('#slt-feedback-backdrop').getByRole('button',{name:'Executar extração',exact:true}).click();await page.locator('#slt-feedback-backdrop').getByRole('button',{name:'OK',exact:true}).click();
assert.deepEqual(execs[2].arquivo_local.camadas,['dados.gpkg::0','dados.gpkg::2'],'Backend recebe só as entradas mantidas na bancada');
assert.equal(execs[2].nome_saida,'','Nome é opcional');
await bancada.locator('[data-layer="base"] .layer-name').click();await bancada.locator('[data-action="remove"]').click();
await page.locator('#ea-run').click();await page.locator('#slt-feedback-backdrop').getByRole('button',{name:'Executar extração',exact:true}).click();await page.locator('#slt-feedback-backdrop').getByRole('button',{name:'OK',exact:true}).click();
assert.deepEqual(execs[3].categorias.flatMap(c=>c.camadas),['base2']);
await bancada.locator('[data-layer="base2"] .layer-name').click();await bancada.locator('[data-action="remove"]').click();
assert.equal(await page.locator('#ea-run').isDisabled(),true,'Sem base na bancada não executa');
// Volta à lista de bases para testar que limpar entrada não apaga uma base confirmada.
await base2();
await page.locator('#ea-staging-confirmar').click();await page.locator('#slt-feedback-backdrop').getByRole('button',{name:'Confirmar bases',exact:true}).click();await page.locator('#slt-feedback-backdrop').getByRole('button',{name:'OK',exact:true}).click();
for(const id of ['local:2-camada-0','local:2-camada-2']){
 await bancada.locator(`[data-layer="${id}"] .layer-name`).click();
 await bancada.locator('[data-action="remove"]').click();
}
assert.equal(await page.locator('#ea-run').isDisabled(),true,'Remover todas as entradas na bancada bloqueia execução');
assert.equal(await page.locator('#ea-input-select').inputValue(),'');
assert.equal(await page.locator('#ea-bases-confirmadas').isVisible(),true,'Remover entradas preserva bases locais');
assert.deepEqual(errors,[]);console.log('PASS: seletor local, prévia pós-validação em Leaflet, metadados, listas condicionais, erros, memória e execução.');
await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
