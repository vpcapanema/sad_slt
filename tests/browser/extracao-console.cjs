// Console da extração: Chromium + módulos reais, somente respostas interceptadas.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
 const page=await browser.newPage({acceptDownloads:true}),logs=[],errors=[],logTasks=[];
 page.on('console',msg=>{if(msg.text().startsWith('[SICARD][Extração]'))logTasks.push((async()=>logs.push({type:msg.type(),args:await Promise.all(msg.args().map(a=>a.jsonValue()))}))());});
 page.on('pageerror',e=>errors.push(e.message));
 const secret='SENTINELA_PRIVADA_98372',id='00000000-0000-0000-0000-000000000001';let polls=0;
 await page.route('**/*',async r=>{
  const u=new URL(r.request().url());
  if(u.pathname==='/fixture')return r.fulfill({contentType:'text/html',body:'<button id="ea-run">Executar</button>'});
  if(u.pathname.startsWith('/geoespacial/extracao-atributos/'))return r.fulfill({contentType:'text/javascript',body:fs.readFileSync(path.join(process.cwd(),u.pathname),'utf8')});
  if(u.pathname.endsWith('/compatibilizar'))return r.fulfill({json:{compativel:true}});
  if(u.pathname.endsWith('/execucoes')&&r.request().method()==='POST')return r.fulfill({json:{id,status:'executando',revisao:1,tarefa_id:1,tarefa_estado:'running',etapa:'Lendo a base CSV '+secret,percentual:0,eventos_url:'/api/geoespacial/extracao-atributos/execucoes/'+id+'/eventos?token='+secret}});
  if(u.pathname.endsWith('/execucoes/'+id)){
   polls++;return r.fulfill({json:{id,status:polls<2?'executando':'concluido',revisao:polls<2?1:5,tarefa_id:3,tarefa_estado:polls<2?'running':'concluido',percentual:polls<2?0:100,resultado:polls<2?null:{id,modo:'enriquecimento',camadas:{},dicionario:[],atributos:{senha:secret}}}});
  }
  if(u.pathname.endsWith('/pacote'))return r.fulfill({body:'ZIP'+secret,headers:{'Content-Disposition':'attachment; filename="'+secret+'.zip"'},contentType:'application/zip'});
  if(u.pathname.endsWith('/cancelar'))return r.fulfill({json:{id,status:'executando',revisao:6,cancelamento_solicitado:true}});
  if(u.pathname.endsWith('/erro'))return r.fulfill({status:422,json:{detail:secret+' @pessoa.exemplo 123.456.789-00'}});
  if(u.pathname.endsWith('/rede'))return r.abort('failed');
  if(u.pathname.endsWith('/entrada-local/jobs'))return r.fulfill({json:{id:'upload-'+secret,status:'concluido',revisao:1,tarefa_estado:'concluido',resultado:{camadas:[],resumo:{total:0,invalidas:0}}}});
  return r.fulfill({status:404,body:''});
 });
 await page.goto('http://localhost/fixture');
 await page.addScriptTag({path:path.resolve('assets/js/process_feedback_unified.js')});
 await page.evaluate(async()=>{
  window.Notify={info(){},error(){},warning(){}};
  window.streams=[];window.EventSource=class{constructor(url){this.url=url;this.handlers={};streams.push(this)}addEventListener(n,fn){this.handlers[n]=fn}close(){this.closed=true}};
  window.logger=await import('/geoespacial/extracao-atributos/logger.js');logger.instalarLogs();
  window.api=await import('/geoespacial/extracao-atributos/api.js');
  window.processo=await import('/geoespacial/extracao-atributos/processo.js');
 });
 await page.locator('#ea-run').click();
 await page.evaluate(secret=>{
  window.painel=processo.acompanharExecucao();
  const req={operacao:'estatisticas',input:{id:'input-'+secret,nome:secret,arquivo_local:{nome:secret,conteudo_base64:secret}},entradas:[],categorias:[{id:secret,nome:secret,camadas:[{id:'base-'+secret,nome:secret,geojson:{coordinates:[123,456]},atributos:{cpf:secret}}]}],nome_saida:secret,opcoes:{},finalidades:[]};
  window.execucao=api.adaptador.executar(req,j=>painel.acompanhar(j)).then(result=>{logger.resultado(result);painel.concluir('Concluído');});
 },secret);
 await page.waitForFunction(()=>streams.length===1);
 const action=await page.evaluate(()=>logger.correlacaoAtual());
 await page.evaluate(({secret,id})=>{
  logger.acao('alterar_configuracao');
  const emitir=(rev,data)=>streams[0].handlers.progresso({lastEventId:String(rev),data:JSON.stringify({id,status:'executando',revisao:rev,...data})});
  emitir(2,{tarefa_id:2,tarefa_estado:'running',etapa:'Camada '+secret+' — Consultando ST_Intersects no índice espacial; percentual interno indisponível',detalhe:'token='+secret,progresso_tarefa:null});
  emitir(3,{tarefa_id:3,tarefa_estado:'running',etapa:'Camada '+secret+' — Classificando contatos e serializando vínculos com a base',tarefa_concluidas:3,tarefa_total:9,unidade_tarefa:'registros'});
  emitir(3,{tarefa_id:3,tarefa_estado:'running',etapa:'repetido '+secret,tarefa_concluidas:3,tarefa_total:9,unidade_tarefa:'registros'});
 },{secret,id});
 await page.evaluate(()=>execucao);
 await page.evaluate(async(secret)=>{
  try{await api.json('/extracao-atributos/erro?token='+secret,{method:'POST',headers:{Authorization:'Bearer '+secret},body:JSON.stringify({senha:secret,conteudo_base64:secret})});}catch(e){logger.falha('teste_validacao',e);}
  try{await api.json('/extracao-atributos/rede?token='+secret);}catch{}
  await api.adaptador.exportar({resultado_id:secret});
  const mutable={entradas:2,token:secret,geojson:{coordinates:[1,2]},atributos:{cpf:secret}};
  logger.log('teste.snapshot',mutable);mutable.entradas=999;mutable.token='MUTACAO_SECRETA';
  const job={id:'dedupe',status:'executando',revisao:1,tarefa_id:8,tarefa_concluidas:1,tarefa_total:10};
  for(let i=0;i<12;i++)logger.progresso({...job,revisao:i+1});
  logger.progresso({...job,revisao:13,tarefa_concluidas:2});
  logger.log('teste.fim');
 },secret);
 // Upload direto: usa o módulo real e não mostra nome nem conteúdo do arquivo.
 await page.evaluate(async()=>{
  const box=document.createElement('div');box.innerHTML='<input type="file" id="ea-input-file"><button id="ea-input-upload"></button><button id="ea-input-upload-cancel"></button>';document.body.append(box);
  ProcessFeedback.confirmar=async()=>true;window.SICARDExtracao={atualizarControles(){}};
  window.uploadState={input:'',inputConfig:null,entradasExtras:[],catalog:[],bases:[],staging:[]};
  const {criarEntradaLocal}=await import('/geoespacial/extracao-atributos/entrada-local.js');
  criarEntradaLocal(uploadState,async()=>{});logger.acao('enviar_entrada_local');
 });
 await page.locator('#ea-input-file').setInputFiles({name:secret+'.gpkg',mimeType:'application/octet-stream',buffer:Buffer.from(secret)});
 await page.waitForFunction(()=>uploadState.input&&uploadState.uploading===false);
 await page.waitForFunction(()=>!!window.SICARDExtracaoLogs);
 await new Promise(r=>setTimeout(r,100));
 const text=JSON.stringify(logs);
 assert(!text.includes(secret),'Nunca emitir sentinelas de query/body/headers/base64/nomes/atributos');assert(!text.includes('MUTACAO_SECRETA'));
 assert(logs.some(l=>l.args[0].includes('acao.executar')));assert(logs.some(l=>l.args[0].includes('http.inicio')));assert(logs.some(l=>l.args[0].includes('http.fim')));assert(logs.some(l=>l.args[0].includes('execucao.fim')));assert(logs.some(l=>l.type==='error'));assert(logs.some(l=>l.args[0].includes('upload.validacao_fim')));
 const sse=logs.filter(l=>l.args[0].includes('job.progresso')&&l.args[1]?.origem==='sse');
 assert.equal(sse.length,2);assert.equal(sse[0].args[1].acao,action,'SSE preserva ação do job após cliques posteriores');
 assert.equal(sse[0].args[1].suboperacao,'Consultando ST_Intersects no índice espacial');assert.equal(sse[1].args[1].tarefa_concluidas,3);
 const reading=logs.find(l=>l.args[1]?.suboperacao==='Lendo camada base');assert(reading,'Nome de camada CSV não vira operação de exportação');
 assert.equal(logs.find(l=>l.args[0].includes('teste.snapshot')).args[1].entradas,2,'Log é snapshot, não referência mutável');
 const dedupe=logs.filter(l=>l.args[1]?.tarefa_id===8);assert.equal(dedupe.length,2,'Revisões idênticas não repetem progresso');
 const before=logs.length;await page.evaluate(()=>{SICARDExtracaoLogs.desativar();logger.log('teste.oculto');});await new Promise(r=>setTimeout(r,50));assert.equal(logs.length,before+1);
 await page.evaluate(()=>{
  for(let i=0;i<505;i++)logger.progresso({id:'eviction-'+i,status:'executando',tarefa_id:i});
  SICARDExtracaoLogs.ativar();logger.log('teste.visivel');
  logger.progresso({id:'ultimo-a',status:'executando',tarefa_id:800});logger.progresso({id:'ultimo-b',status:'executando',tarefa_id:801});
  ProcessFeedback.iniciarCadastro({onProgressSnapshot(){throw new Error('Falha isolada do observador');}});
  ProcessFeedback.acompanhar({id:'isolado',revisao:1,tarefa_id:1,etapa:'Operação',progresso_tarefa:50});
 });
 await Promise.all(logTasks);
 const ultimos=logs.filter(l=>[800,801].includes(l.args[1]?.tarefa_id));assert.equal(ultimos.length,2);assert.notEqual(ultimos[0].args[1].job,ultimos[1].args[1].job,'Eviction não reutiliza IDs locais');
 assert.equal(await page.evaluate(()=>ProcessFeedback.atual._sicard.revisao),1,'Observador que falha não interrompe atualização');
 assert.deepEqual(errors,[]);
 console.log('PASS: console ativo, ação/HTTP/job/fim/erro, detalhes SSE, correlação estável, dedupe, download, controle e ausência de segredos.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
