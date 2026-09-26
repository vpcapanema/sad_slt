// Estratégia de captura do SIGMA-PLI no SICARD: processar(fetch), NDJSON, SSE e canal de eventos dos jobs.
// Sem servidor: um domínio simulado é servido pelas rotas do Playwright.
const {chromium}=require('playwright');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const BASE='http://sicard.teste';
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const page=await browser.newPage({viewport:{width:1100,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const ndjson=eventos=>eventos.map(e=>JSON.stringify(e)).join('\n');
  await page.route(`${BASE}/**`,rota=>{
   const url=new URL(rota.request().url());
   const arquivo={'/process_feedback_system.css':'assets/css/process_feedback_system.css','/notification_system.js':'assets/js/notification_system.js','/process_feedback_unified.js':'assets/js/process_feedback_unified.js'}[url.pathname];
   if(arquivo)return rota.fulfill({body:fs.readFileSync(path.resolve(arquivo),'utf8'),contentType:arquivo.endsWith('.css')?'text/css':'application/javascript'});
   if(url.pathname==='/')return rota.fulfill({contentType:'text/html',body:'<!doctype html><html lang="pt-BR"><head><link rel="stylesheet" href="/process_feedback_system.css"></head><body><script src="/notification_system.js"></script><script src="/process_feedback_unified.js"></script></body></html>'});
   if(url.pathname==='/api/ok')return rota.fulfill({json:{id:42,nome:'camada.fgb',tamanho:'2 MB'}});
   if(url.pathname==='/api/recusa')return rota.fulfill({status:422,json:{detail:[{loc:['body','pasta'],msg:'campo obrigatório'}]}});
   if(url.pathname==='/api/stream')return rota.fulfill({contentType:'application/x-ndjson',body:ndjson([
     {type:'task',name:'Ler shapefile'},{type:'log',level:'info',message:'3 camadas'},{type:'task_complete',name:'Ler shapefile',message:'3 camadas lidas'},
     {type:'task',name:'Gravar'},{type:'progress',percent:80},{type:'log',level:'warning',message:'CRS ausente'},{type:'partial',data:{title:'Gravado com ressalvas',message:'Uma camada sem CRS.'}}])});
   if(url.pathname==='/api/stream-erro')return rota.fulfill({contentType:'application/x-ndjson',body:ndjson([{type:'task',name:'Ler'},{type:'error',message:'Geometria inválida',errors:['Feição 12']}])});
   if(url.pathname==='/api/sse')return rota.fulfill({contentType:'text/event-stream',body:['{"type":"task","name":"Sincronizar"}','{"type":"progress","percent":50}','{"type":"done","data":{"message":"Sincronizado."}}'].map(d=>`data: ${d}\n\n`).join('')});
   if(url.pathname==='/api/job/eventos')return rota.fulfill({contentType:'text/event-stream',body:
     `event: progresso\nid: 1\ndata: ${JSON.stringify({id:'j9',tarefa_id:2,etapa_atual:'Recortar municípios',percentual:60,concluidas:1,total:3,logs:[{sequencia:1,nivel:'sucesso',mensagem:'Validar entrada'}]})}\n\n`});
   return rota.fulfill({status:404,body:''});
  });
  await page.goto(`${BASE}/`);
  await page.waitForFunction(()=>window.ProcessFeedback&&window.Notify);
  const ativo=sel=>page.locator(sel).evaluate(n=>n.classList.contains('pfs-active'));
  const aguardar=sel=>page.waitForFunction(s=>document.querySelector(s)?.classList.contains('pfs-active'),sel);
  const fecharResultado=()=>page.evaluate(()=>StatusFeedback.fechar());

  // processar(fetch): JSON ok → modal de sucesso com o resumo montado pelos campos da resposta.
  await page.evaluate(async()=>{ProcessFeedback.iniciarCadastro({title:'Enviar camada',tasks:['Enviar']});window.r1=await ProcessFeedback.processar(()=>fetch('/api/ok'),d=>{window.okCb=d;});});
  await aguardar('#pfsSuccessBox');
  assert.deepEqual(await page.evaluate(()=>okCb),{id:42,nome:'camada.fgb',tamanho:'2 MB'});
  assert.equal(await page.evaluate(()=>r1.ok),true);
  const resumo=await page.locator('#pfsSuccessSummary').innerText();
  assert.match(resumo,/ID:\s*42/);assert.match(resumo,/Arquivo:\s*camada\.fgb/);assert.match(resumo,/Tempo:/);
  await fecharResultado();
  // Resposta de erro do FastAPI → modal de erro com loc → msg.
  await page.evaluate(async()=>{ProcessFeedback.iniciarCadastro({title:'Enviar camada'});await ProcessFeedback.processar(()=>fetch('/api/recusa'),null,e=>{window.erroCb=e;});});
  await aguardar('#pfsErrorBox');
  assert.equal(await page.locator('#pfsErrorLog').innerText(),'pasta: campo obrigatório');
  assert.deepEqual(await page.evaluate(()=>erroCb.detail[0].loc),['body','pasta']);
  await fecharResultado();
  // Falha de rede → modal de erro.
  await page.evaluate(async()=>{ProcessFeedback.iniciarCadastro({title:'Sem rede'});await ProcessFeedback.processar(()=>Promise.reject(new TypeError('Failed to fetch')));});
  await aguardar('#pfsErrorBox');assert.equal(await page.locator('[data-pfs="error-message"]').innerText(),'Failed to fetch');
  await fecharResultado();

  // NDJSON pelo processar: tarefas, conclusão, progresso, aviso e desfecho parcial.
  await page.evaluate(async()=>{ProcessFeedback.iniciarCadastro({title:'Importar pacote',tasks:['Ler shapefile','Gravar']});await ProcessFeedback.processar(()=>fetch('/api/stream'));});
  assert.equal(await page.locator('.pfs-completed-item').filter({hasText:'Ler shapefile'}).count(),1);
  assert.equal(await page.locator('.pfs-log-entry--warning').filter({hasText:'CRS ausente'}).count(),1);
  assert.equal(await page.locator('[data-pfs="progress-percent"]').innerText(),'100%');
  await aguardar('#pfsPartialBox');assert.equal(await page.locator('[data-pfs="partial-title"]').innerText(),'Gravado com ressalvas');
  assert.equal(await page.locator('[data-pfs="partial-header-title"]').innerText(),'Importar pacote');
  await fecharResultado();
  // connectStream: erro do stream vira modal de erro e marca o segmento da tarefa.
  await page.evaluate(async()=>{await ProcessFeedback.connectStream(()=>fetch('/api/stream-erro'),{title:'Validar arquivo',tasks:['Ler']});});
  assert.equal(await page.locator('.pfs-segment--error').count(),1);
  await aguardar('#pfsErrorBox');assert.equal(await page.locator('#pfsErrorLog').innerText(),'Feição 12');
  await fecharResultado();
  // SSE: startSSE com eventos "data:".
  await page.evaluate(()=>{ProcessFeedback.startSSE('/api/sse',{title:'Sincronizar acervo'});});
  await aguardar('#pfsSuccessBox');assert.equal(await page.locator('[data-pfs="success-message"]').innerText(),'Sincronizado.');
  assert.equal(await ativo('#pfsProgressOverlay'),false);
  await fecharResultado();

  // Job do SICARD com eventos_url: o canal SSE (evento "progresso") atualiza o overlay sozinho.
  await page.evaluate(()=>{ProcessFeedback.iniciarCadastro({title:'Gerar camada territorial',tasks:['Validar entrada','Recortar municípios','Gravar']});
    ProcessFeedback.acompanhar({id:'j9',tarefa_id:1,etapa_atual:'Validar entrada',percentual:10,eventos_url:'/api/job/eventos',logs:[]});});
  await page.waitForFunction(()=>document.querySelector('[data-pfs="task-name"]').textContent==='Recortar municípios');
  assert.equal(await page.locator('.pfs-completed-item').filter({hasText:'Validar entrada'}).count(),1);
  assert.equal(await page.locator('[data-pfs="progress-percent"]').innerText(),'60%');
  assert.equal(await page.locator('[data-pfs="progress-meta"]').innerText(),'Etapa 2 de 3');
  await page.evaluate(()=>ProcessFeedback.fechar());

  assert.deepEqual(errors,[]);
  console.log('PASS: processar(fetch) com sucesso, erro do FastAPI e falha de rede; NDJSON com parcial; connectStream com erro; SSE; canal de eventos do job.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
