// Fixtures locais; rede integralmente interceptada, sem aplicação ou banco.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const root=process.cwd(),prefix='/geoespacial/extracao-atributos/';
const python=process.env.SICARD_TEST_PYTHON||path.join(root,'.venv/Scripts/python.exe');
const html=execFileSync(python,['-c',"from jinja2 import Environment,FileSystemLoader; e=Environment(loader=FileSystemLoader('templates')); print(''.join(e.get_template('componentes/extracao_atributos/'+n+'.html').render() for n in ['_configuracao','_bancada','_resultados']))"],{encoding:'utf8'});
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 let saved,saves=0;
 await page.route('**/*',async route=>{
  const u=new URL(route.request().url());
  if(u.pathname==='/fixture')return route.fulfill({contentType:'text/html',body:html});
  if(u.pathname.endsWith('/configuracoes')&&route.request().method()==='POST'){saves++;saved=route.request().postDataJSON();return route.fulfill({json:{nome:saved.nome,camadas:1,categorias:1,entradas:saved.entradas.length,finalidades:0}});}
  if(u.pathname.endsWith('/configuracoes'))return route.fulfill({json:{configuracoes:[{chave:'teste',nome:'Teste',camadas:1,categorias:1}]}});
  if(u.pathname.endsWith('/configuracoes/teste'))return route.fulfill({json:{...saved,ausentes:[],categorias:saved.categorias.map(c=>({...c,camadas:c.camadas.map(id=>({id,nome:id,regra:c.regras[id]}))}))}});
  if(u.pathname.startsWith(prefix))return route.fulfill({contentType:'text/javascript',body:fs.readFileSync(path.join(root,u.pathname),'utf8')});
  return route.fulfill({status:404,body:''});
 });
 await page.goto('http://localhost/fixture');
 await page.evaluate(async()=>{
  window.prep=await import('/geoespacial/extracao-atributos/preparacao.js');
  window.comp=await import('/geoespacial/extracao-atributos/composicao.js');
  const geojson={type:'FeatureCollection',features:[{type:'Feature',properties:{id:1},geometry:{type:'Point',coordinates:[0,0]}}]};
  window.layer=id=>({id,nome:id,geojson:structuredClone(geojson)});
  window.state={input:'entrada',inputConfig:{identificacao_confirmada:true,campo_id:'id'},entradasExtras:[],catalog:['entrada','base','extra'].map(layer),categories:[{id:'c',nome:'Categoria'}],bases:[{id:'base',category:'c',regra:{prefixo:'base_'}}],staging:[],bancadaEntradas:[],bancadaBases:[],operation:'enriquecimento',opcoes:{},nomeSaida:'Saída',camadaRecorte:'base',finalidades:[],busy:false};
  prep.enviarPrevia(state);prep.limparPreparacao(state);
  state.staging=[{id:'extra',category:'c'}];state.previaVisiveis=new Set(['base:extra']);prep.enviarPrevia(state);prep.limparPreparacao(state);
 });
 assert.deepEqual(await page.evaluate(()=>({entradas:state.bancadaEntradas.map(e=>e.id),bases:state.bancadaBases.map(e=>e.id)})),{entradas:['entrada'],bases:['base','extra']},'F01 adiciona sem apagar');
 await page.evaluate(()=>{
  const a=layer('local:pacote:a'),b=layer('local:pacote:b');a.chave='a';b.chave='b';
  const source={...layer('local:pacote'),arquivo_local:{nome:'pacote.gpkg',conteudo_base64:'YWJj',camadas:['a','b']},camadas_bancada:[a,b]};
  state.catalog.push(source);state.input=source.id;state.inputConfig={camadas:{a:{identificacao_confirmada:true},b:{identificacao_confirmada:true}}};
  state.previaVisiveis=new Set(['entrada:local:pacote:a']);prep.enviarPrevia(state);
  state.previaVisiveis=new Set(['entrada:local:pacote:b']);prep.enviarPrevia(state);prep.limparPreparacao(state);
 });
 assert.deepEqual(await page.evaluate(()=>state.bancadaEntradas.find(e=>e.id==='local:pacote').layer.arquivo_local.camadas),['a','b'],'F01 conserva componentes já enviados');
 // F02: snapshot maior que o limite típico de sessionStorage e restauração após navegação.
 await page.evaluate(async()=>{
  window.Notify={info(){},error(){},warning(){}};
  window.SICARDExtracao={camadasNaBancada:()=>[{id:'base',visivel:true},{id:'extra',visivel:false}]};
  state.catalog.find(l=>l.id==='local:pacote').arquivo_local.conteudo_base64='A'.repeat(6*1024*1024);
  state.result={id:'resultado',geojson:layer('r').geojson};
  window.municipal=await import('/geoespacial/extracao-atributos/municipal.js');
  await municipal.salvarRascunhoMunicipal(state);
 });
 await page.goto('http://localhost/fixture?retomar=municipal&camada_municipal=municipal&categoria=c');
 const restored=await page.evaluate(async()=>{
  const m=await import('/geoespacial/extracao-atributos/municipal.js');
  window.state={catalog:[{id:'municipal',nome:'Gerada'}],categories:[{id:'c',nome:'Categoria'}]};
  const msg=await m.restaurarRetornoMunicipal(state);
  const data={msg,entradas:state.bancadaEntradas.map(e=>e.id),bases:state.bancadaBases.map(b=>b.id),local:state.catalog.find(l=>l.id==='local:pacote').arquivo_local.conteudo_base64.length,recorte:state.camadaRecorte,painel:state.painelRestaurado,resultado:state.result.id,nova:state.staging[0].id};
  await m.concluirRetornoMunicipal();return data;
 });
 assert.deepEqual(restored.entradas,['entrada','local:pacote']);assert.deepEqual(restored.bases,['base','extra']);assert.equal(restored.local,6*1024*1024);assert.equal(restored.recorte,'base');assert.equal(restored.resultado,'resultado');assert.equal(restored.nova,'municipal');assert.equal(restored.painel[1].visivel,false);
 assert.equal(await page.evaluate(()=>sessionStorage.getItem('sicard-extracao-retorno-municipal')),null);
 // F03: usa composição marcada e recorte; não guarda entradas locais parcialmente.
 await page.evaluate(async()=>{
  const comp=await import('/geoespacial/extracao-atributos/composicao.js');
  window.feedbacks=[];window.Notify={info:(_t,m)=>feedbacks.push(m),error:(_t,m)=>feedbacks.push(m)};
  window.ProcessFeedback={confirmar:async opts=>opts.input?'Salva':true};
  window.SICARDExtracao={composicaoAtual:()=>comp.composicaoVisivel(state,[{id:'entrada',visivel:true},{id:'base',visivel:true}]),renderParametros(){}};
  state.busy=false;state.bases=[];state.staging=[];state.input='';state.entradasExtras=[];state.result=null;
  const {criarListaCamadas}=await import('/geoespacial/extracao-atributos/lista-camadas.js');
  window.lista=criarListaCamadas(state,async()=>{},()=>{});lista.render();
 });
 await page.locator('#ea-config-salvar').click();await page.waitForFunction(()=>feedbacks.some(x=>x.includes('salva:')));
 assert.deepEqual(saved.entradas.map(e=>e.id),['entrada']);assert.deepEqual(saved.categorias[0].camadas,['base']);assert.equal(saved.entradas[0].config.camada_recorte,'base');
 await page.evaluate(async()=>{
  const c=await import('/geoespacial/extracao-atributos/composicao.js');
  SICARDExtracao.composicaoAtual=()=>c.composicaoVisivel(state,[{id:'local:pacote:a',visivel:true},{id:'base',visivel:true}]);
 });
 await page.locator('#ea-config-salvar').click();
 assert.equal(saves,1,'F03 entradas locais não são descartadas para salvar configuração parcial');
 assert.match(await page.evaluate(()=>feedbacks.at(-1)),/não foi salva/);
 await page.evaluate(()=>state.camadaRecorte='extra');
 await page.locator('#ea-config-carregar').click();await page.locator('.ea-config-entry').click();await page.getByRole('button',{name:'Carregar',exact:true}).click();
 await page.waitForFunction(()=>state.input==='entrada');
 assert.equal(await page.evaluate(()=>state.camadaRecorte),'base');assert.equal(await page.evaluate(()=>state.bancadaEntradas.length),0,'Configuração substitui explicitamente bancada anterior');
 // F04/F05: app real com adaptadores de mapa/resultados substituídos e API interceptada.
 await page.unroute('**/*');
 const modules={
  'configuracao.js':`import {criarConfiguracao as real} from './configuracao.js?real';export function criarConfiguracao(s,c){window.state=s;return real(s,c)}`,
  'mapa.js':`export function criarMapa(onChange){window.painel=[];window.mudarPainel=onChange;return {camadas:()=>window.painel,sync(){},exibida:()=>false,assertReady(){},restaurarVisibilidade(){}}}`,
  'resultados.js':`export function criarResultados(){return {set(v){window.resultado=v},clear(){window.resultado=null}}}`,
  'processo.js':`export async function confirmarExecucao(){return true}export function acompanharExecucao(){return {acompanhar(){},concluir(){},falhar(m){throw new Error(m)}}}`,
 };
 await page.route('**/*',async route=>{
  const u=new URL(route.request().url()),name=u.pathname.split('/').pop();
  if(u.pathname==='/fixture')return route.fulfill({contentType:'text/html',body:html+`<script>window.Notify={info(){},error(){},warning(){}};</script><script type="module" src="${prefix}app.js"></script>`});
  if(u.pathname.endsWith('/catalogo'))return route.fulfill({json:{camadas:[],categorias:[]}});
  if(u.pathname.endsWith('/compatibilizar'))return route.fulfill({json:{compativel:true}});
  if(u.pathname.endsWith('/execucoes'))return route.fulfill({json:{id:'job',status:'concluido',resultado:{id:'resultado',modo:'enriquecimento',camadas:{},dicionario:[]}}});
  if(u.pathname.startsWith(prefix))return route.fulfill({contentType:'text/javascript',body:(!u.searchParams.has('real')&&modules[name])||fs.readFileSync(path.join(root,u.pathname),'utf8')});
  return route.fulfill({status:404,body:''});
 });
 await page.goto('http://localhost/fixture');await page.waitForFunction(()=>window.state&&!state.loadingCatalog);
 await page.evaluate(async()=>{
  const geojson={type:'FeatureCollection',features:[{type:'Feature',properties:{id:1,nome:'A'},geometry:{type:'Point',coordinates:[0,0]}}]};
  const layer=id=>({id,nome:id,geojson});
  Object.assign(state,{catalog:['entrada','base','extra'].map(layer),categories:[{id:'c',nome:'Categoria'}],operation:'estatisticas',
   bancadaEntradas:[{id:'entrada',layer:layer('entrada'),config:{campo_id:'id',identificacao_confirmada:true}}],
   bancadaBases:['base','extra'].map(id=>({id,category:'c',layer:layer(id),regra:{prefixo:id+'_'}}))});
  window.painel=['entrada','base','extra'].map(id=>({id,visivel:true}));
  document.querySelector('#ea-operation').value='estatisticas';await SICARDExtracao.changed();
 });
 await page.locator('#ea-run').click();await page.waitForFunction(()=>window.resultado?.id==='resultado');
 assert.equal(await page.locator('#ea-export').isEnabled(),true);
 await page.evaluate(()=>{painel.find(l=>l.id==='extra').visivel=false;mudarPainel();});
 assert.equal(await page.evaluate(()=>state.result),null,'F04 resultado obsoleto invalidado');assert.equal(await page.locator('#ea-export').isDisabled(),true);
 await page.evaluate(()=>{state.finalidades=[{nome:'Extra',campos:['extra_nome']}];SICARDExtracao.atualizarControles();});
 assert.equal(await page.locator('#ea-run').isDisabled(),true,'F05 finalidade depende da composição marcada');assert.match(await page.locator('#ea-run-warning').innerText(),/extra_nome/);
 await page.evaluate(()=>{painel.find(l=>l.id==='extra').visivel=true;mudarPainel();});
 assert.equal(await page.locator('#ea-run').isEnabled(),true,'F05 reativar base restaura campo');
 // Falha de persistência impede navegação e preserva os dados na página.
 await page.evaluate(()=>{
  window.originalOpen=indexedDB.open;
  indexedDB.open=()=>{throw new Error('Quota bloqueada pela fixture');};
 });
 await page.locator('#ea-municipal-open').click();
 await page.waitForFunction(()=>state.busy===false);
 assert.equal(new URL(page.url()).pathname,'/fixture');
 assert.equal(await page.evaluate(()=>state.bancadaEntradas.length),1,'F02 falha de gravação preserva a composição');
 await page.evaluate(()=>indexedDB.open=originalOpen);
 assert.deepEqual(errors,[]);
 console.log('PASS: F01 adição incremental/componentes; F02 IndexedDB 6MB, locais, resultados e visibilidade; F03 seleção/recorte salvar-carregar; F04 invalidação no app; F05 bloqueio de finalidade obsoleta.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
