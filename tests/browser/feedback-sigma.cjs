// Contrato do SIGMA-PLI (ProcessFeedbackV2, ProcessFeedback, Notify) sobre o feedback do SICARD.
// Sem servidor: o stream NDJSON é uma Response construída na própria página.
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const page=await browser.newPage({viewport:{width:1100,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setContent('<html lang="pt-BR"><body><button id="origem">Origem</button></body></html>');
  await page.addStyleTag({path:path.resolve('assets/css/feedback.css')});await page.addScriptTag({path:path.resolve('assets/js/feedback.js')});
  await page.locator('#origem').focus();
  // Modo manual do SIGMA.
  await page.evaluate(()=>{window.recebido=null;ProcessFeedbackV2.open({title:'Exportando',onSuccess:d=>{window.recebido=d;}});
   ProcessFeedbackV2.task('Gerando relatório',1,3);ProcessFeedbackV2.log('info','Coletando dados...');ProcessFeedbackV2.progress(45);});
  const painel=page.locator('.slt-fb-process-panel').filter({hasText:'Exportando'});
  assert.equal(await painel.locator('.slt-fb-step-badge').innerText(),'1/3');
  assert.equal(await painel.locator('.slt-fb-current-message').innerText(),'Gerando relatório');
  assert.equal(await painel.locator('.slt-fb-bar--geral').getAttribute('aria-valuenow'),'45');
  assert.equal(await painel.locator('.slt-fb-log .slt-fb-step--info span').innerText(),'Coletando dados...');
  assert.equal(await painel.locator('.slt-fb-modal').getAttribute('data-semaforo'),'amarelo');
  assert.equal(await page.evaluate(()=>document.activeElement.id),'origem','O painel não rouba o foco');
  await page.evaluate(()=>ProcessFeedbackV2.success({message:'Relatório gerado.',arquivo:'r.pdf'}));
  assert.deepEqual(await page.evaluate(()=>recebido),{message:'Relatório gerado.',arquivo:'r.pdf'});
  assert.equal(await painel.locator('.slt-fb-modal').getAttribute('data-semaforo'),'verde');
  assert.equal(await painel.locator('.slt-fb-bar--geral').getAttribute('aria-valuenow'),'100');
  assert.match(await painel.locator('.slt-fb-results').innerText(),/Relatório gerado/);
  assert.equal(await page.evaluate(()=>performance.getEntriesByType('navigation').length<=1&&!!document.querySelector('#origem')),true,'Sucesso não recarrega a página');
  // Stream NDJSON com o contrato de eventos do SIGMA, em pedaços que cortam linhas.
  await page.evaluate(async()=>{
   ProcessFeedbackV2.open({title:'Importando camada',onError:e=>{window.falha=e;}});
   const eventos=[{type:'task',name:'Lendo shapefile',step:1,total:2},{type:'log',level:'success',msg:'Arquivo aceito'},{type:'progress',pct:50},{type:'log',level:'warning',msg:'CRS ausente'},{type:'error',message:'Geometria inválida',details:'Feição 12'}];
   const texto=eventos.map(e=>JSON.stringify(e)).join('\n');const bytes=new TextEncoder().encode(texto);
   const corpo=new ReadableStream({start(c){for(let i=0;i<bytes.length;i+=17)c.enqueue(bytes.slice(i,i+17));c.close();}});
   await ProcessFeedbackV2.connectStream(new Response(corpo,{status:200}));
  });
  const importando=page.locator('.slt-fb-process-panel').filter({hasText:'Importando camada'});
  assert.equal(await importando.locator('.slt-fb-modal').getAttribute('data-semaforo'),'vermelho');
  assert.equal(await importando.locator('.slt-fb-log .slt-fb-step--warning span').innerText(),'CRS ausente');
  assert.match(await importando.locator('.slt-fb-results').innerText(),/Geometria inválida[\s\S]*Feição 12/);
  assert.equal(await page.evaluate(()=>falha.message),'Geometria inválida');
  // Resposta HTTP de erro.
  await page.evaluate(async()=>{ProcessFeedbackV2.open({title:'Recusado'});await ProcessFeedbackV2.connectStream(new Response('',{status:503}));});
  assert.match(await page.locator('.slt-fb-process-panel').filter({hasText:'Recusado'}).locator('.slt-fb-results').innerText(),/Erro HTTP 503/);
  // Assinatura legada: ProcessFeedback.start(título, mensagem) e success(título, mensagem).
  await page.evaluate(()=>{ProcessFeedback.start('Legado','Iniciando');ProcessFeedback.success('Legado','Pronto');});
  const legado=page.locator('.slt-fb-process-panel').filter({hasText:'Legado'});
  assert.equal(await legado.locator('.slt-fb-modal').getAttribute('data-semaforo'),'verde');
  assert.match(await legado.locator('.slt-fb-log').innerText(),/Iniciando/);
  // Notify(título, mensagem) do SIGMA vira notificação do SICARD, com contagem só quando fecha sozinha.
  await page.evaluate(()=>{window.n1=Notify.success('Salvo','Configuração gravada');Notify.error('Falhou','Sem conexão');window.n3=Notify.loading('Carregando','Aguarde');});
  const salvo=page.locator('.slt-fb-notice--success').filter({hasText:'Configuração gravada'});
  assert.equal(await salvo.locator('strong').innerText(),'Salvo');
  assert.equal(await salvo.locator('.slt-fb-notice-timer').count(),1);
  assert.equal(await page.locator('.slt-fb-notice--error .slt-fb-notice-timer').count(),0,'Erro não some sozinho');
  assert.equal(await page.locator('.slt-fb-notice').filter({hasText:'Aguarde'}).locator('.fa-spinner').count(),1);
  await salvo.hover();assert.equal(await salvo.evaluate(n=>n.classList.contains('is-paused')),true,'Hover pausa a contagem');
  await page.evaluate(()=>n3.close());assert.equal(await page.locator('.slt-fb-notice').filter({hasText:'Aguarde'}).count(),0);
  await page.evaluate(()=>Notify.clearAll());assert.equal(await page.locator('.slt-fb-notice').count(),0);
  assert.equal(await page.locator('[aria-modal]').count(),0);
  assert.deepEqual(errors,[]);console.log('PASS: ProcessFeedbackV2 manual e NDJSON, semáforo verde/vermelho, ProcessFeedback legado, Notify com contagem e sem recarregar a página.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
