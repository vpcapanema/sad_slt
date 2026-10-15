const {chromium}=require('playwright');
const fs=require('fs'),path=require('path'),{execFileSync}=require('child_process');
process.env.PYTHONIOENCODING='utf-8';
const html=execFileSync('.venv/Scripts/python.exe',['-c',"from jinja2 import Environment,FileSystemLoader; e=Environment(loader=FileSystemLoader('templates')); print(''.join(e.get_template('componentes/extracao_atributos/'+n+'.html').render() for n in ['_configuracao','_bancada','_resultados']))"],{encoding:'utf8'});
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 try {
 const page=await browser.newPage(),errors=[],requests=[];
 page.on('pageerror',e=>errors.push(e.message));
 const layer=id=>({id,nome:id,tipo:'vetor',status_validacao:'valida',representacao:'tiles',tiles_url:'http://fixture/tiles',revisao:id,feicoes:1,campos:['id'],metadados_local:{identificacao:{total:1,completa:true,campos:[{nome:'id',nulos:0}],sugestao:'id'}}});
 const result={id:'saved',modo:'enriquecimento',camadas:{saida:{bancada:layer('output')}},dicionario:[]};
 await page.route('**/*',async r=>{
  const u=new URL(r.request().url());
  if(u.pathname==='/fixture')return r.fulfill({contentType:'text/html',body:html+`<script>window.Notify={info(){},error(){},warning(){},success(){}};const noop=()=>{};window.ProcessFeedback={confirmar:async()=>true,iniciarCadastro:()=>({tarefaAtual:noop,concluirTarefa:noop,sucesso:noop,erro:noop,log:noop,progresso:noop})};</script><script type="module" src="/geoespacial/extracao-atributos/app.js"></script>`});
  if(u.pathname.startsWith('/geoespacial/extracao-atributos/')){
   let source=fs.readFileSync(path.join(process.cwd(),u.pathname),'utf8');
   if(u.pathname.endsWith('/configuracao.js'))source=source.replace('export function criarConfiguracao(state, changed) {','export function criarConfiguracao(state, changed) { window.auditState=state;');
   if(u.pathname.endsWith('/mapa.js'))source=`export function criarMapa(cb){window.auditMapChange=cb;window.auditMapItems=[];return {camadas:()=>[],sync:items=>window.auditMapItems=items,exibida:()=>false,assertReady(){},enquadrar:async()=>{},restaurarVisibilidade(){}};}`;
   if(u.pathname.endsWith('/resultados.js'))source=`export function criarResultados(){return {set:v=>window.auditResult=v,clear:()=>window.auditResult=null};}`;
   if(u.pathname.endsWith('/processo.js'))source=`export function acompanharExecucao(){return {acompanhar(){},concluir(){},falhar(){}};}export async function confirmarExecucao(){return true;}`;
   return r.fulfill({contentType:'text/javascript',body:source});
  }
  if(u.pathname.endsWith('/catalogo'))return r.fulfill({json:{camadas:[],categorias:[]}});
  if(u.pathname.endsWith('/execucoes/saved'))return r.fulfill({json:{id:'saved',status:'concluido',resultado:result}});
  if(u.pathname.endsWith('/preparar-camada')){const b=r.request().postDataJSON();requests.push(b.id);return r.fulfill({json:layer(b.id)});}
  return r.fulfill({status:404,body:''});
 });
 await page.goto('http://localhost/fixture');await page.waitForFunction(()=>window.auditState&&!auditState.loadingCatalog);
 await page.evaluate(()=>sessionStorage.setItem('slt-extracao-ultima','saved'));
 await page.locator('#ea-recover').click();await page.waitForFunction(()=>window.auditResult?.id==='saved'&&!auditState.busy);
 const out={recoveredMapLayers:await page.evaluate(()=>auditMapItems.map(i=>i.id)),recoveredResult:await page.evaluate(()=>auditResult.id)};
 await page.evaluate(()=>auditMapChange());out.resultAfterMapEvent=await page.evaluate(()=>auditResult);
 await page.evaluate(layers=>{auditState.catalog=layers;auditState.input='a';auditState.inputConfig={campo_id:'id'};auditState.entradasExtras=[{id:'b',config:{campo_id:'id'}}];SICARDExtracao.renderSelecao();SICARDExtracao.atualizarControles();},[layer('a'),layer('b')]);
 await page.locator('#ea-identificacao-camadas input[type=checkbox]').first().check();
 await page.locator('#ea-identificacao-confirmar').click();await page.waitForFunction(()=>!auditState.busy);
 out.validatedWithOnlyFirstChecked=requests;
 out.errors=errors;
 const assert=require('node:assert/strict');
 assert.deepEqual(out.recoveredMapLayers,['output']);
 assert.deepEqual(out.validatedWithOnlyFirstChecked,['a']);
 assert.deepEqual(errors,[]);
 fs.writeFileSync('outputs/audit-extracao-20261015.json',JSON.stringify(out,null,2));console.log(JSON.stringify(out,null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
