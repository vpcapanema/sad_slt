// Contrato de feedback em navegador isolado, sem API, banco ou serviços.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1100,height:900},acceptDownloads:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setContent('<html lang="pt-BR"><body></body></html>');
  await page.addStyleTag({path:path.resolve('assets/css/process_feedback_system.css')});
  await page.addScriptTag({path:path.resolve('assets/js/process_feedback_unified.js')});
  await page.evaluate(()=>{
   ProcessFeedback.iniciarCadastro({title:'Extração'});
   ProcessFeedback.acompanhar({id:'j',revisao:1,tarefa_id:1,tarefa_estado:'running',etapa:'Camada A',progresso_tarefa:10,logs:[]});
   ProcessFeedback.acompanhar({id:'j',revisao:2,tarefa_id:2,tarefa_estado:'running',etapa:'Preparando índice',detalhe:'Inserindo geometrias da base X',progresso_tarefa:null,logs:[{sequencia:1,tarefa_id:2,tipo:'iniciado',mensagem:'Inserindo geometrias',em:'2026-09-26T10:11:12Z'}]});
  });
  assert.equal(await page.locator('.pfs-completed-item').count(),0,'Mudar tarefa não prova conclusão');
  assert.equal(await page.locator('#pfsTaskProgressBar').getAttribute('aria-valuenow'),null);
  await page.waitForFunction(()=>document.querySelector('[data-pfs="current-summary"]').textContent.includes('Preparando índice'));
  assert.match(await page.locator('[data-pfs="active-detail"]').innerText(),/Inserindo geometrias da base X/);
  const time=await page.evaluate(()=>new Date('2026-09-26T10:11:12Z').toLocaleTimeString('pt-BR'));
  assert.equal(await page.locator('.pfs-log-entry').filter({hasText:'Inserindo geometrias'}).locator('.pfs-log-time').textContent(),time);
  const before=await page.evaluate(()=>ProcessFeedback.atual._lastActivity);
  await page.evaluate(()=>ProcessFeedback.acompanhar({id:'j',revisao:1,tarefa_id:1,etapa:'Obsoleto',percentual:0,logs:[]}));
  assert.equal(await page.locator('[data-pfs="task-name"]').textContent(),'Preparando índice');
  assert.equal(await page.evaluate(()=>ProcessFeedback.atual._lastActivity),before,'Polling antigo não renova atividade');
  await page.evaluate(()=>ProcessFeedback.acompanhar({id:'j',revisao:3,tarefa_id:2,tarefa_estado:'running',etapa:'Preparando índice',progresso_tarefa:100,logs:[]}));
  assert.equal(await page.locator('.pfs-completed-item').count(),0,'Fim de contador não encerra operação ainda running');
  await page.evaluate(()=>{
   const snap={id:'j',revisao:4,tarefa_id:3,tarefa_estado:'running',etapa:'Consulta SQL',historico_inicio:300,logs:[{sequencia:300,tarefa_id:2,tipo:'concluido',nivel:'sucesso',mensagem:'Índice preparado',em:'2026-09-26T10:12:12Z'}]};
   ProcessFeedback.acompanhar(snap);ProcessFeedback.acompanhar(snap);
  });
  assert.equal(await page.locator('.pfs-completed-item').count(),1);
  assert.equal(await page.locator('.pfs-log-entry').filter({hasText:'Histórico incompleto'}).count(),1);
  await page.evaluate(()=>{
   window.cancelCalls=0;
   ProcessFeedback.permitirCancelamento(async()=>{cancelCalls++;await new Promise(r=>window.resolveCancel=r);});
   ProcessFeedback.atual.cancelar();ProcessFeedback.atual.cancelar();
  });
  assert.equal(await page.evaluate(()=>cancelCalls),1);
  assert.equal(await page.locator('#pfsCancelBtn').isDisabled(),true);
  assert.equal(await page.locator('#pfsProgressOverlay').evaluate(n=>n.classList.contains('pfs-active')),true);
  assert.notEqual(await page.evaluate(()=>ProcessFeedback.atual._finalizado),true);
  await page.evaluate(()=>{resolveCancel();ProcessFeedback.acompanhar({id:'j',revisao:5,status:'cancelado',tarefa_id:3,tarefa_estado:'cancelado',etapa:'Consulta SQL'});});
  assert.equal(await page.evaluate(()=>ProcessFeedback.atual._finalizado),true);
  await page.evaluate(async()=>{
   ProcessFeedback.iniciarCadastro({title:'Recusa',onCancel:async()=>{throw new Error('Gravação já iniciada');}});
   await ProcessFeedback.atual.cancelar();
  });
  assert.equal(await page.locator('#pfsCancelBtn').isEnabled(),true);
  assert.match(await page.locator('#pfsLog').textContent(),/Gravação já iniciada/);
  await page.evaluate(()=>{
   ProcessFeedback.iniciarCadastro({title:'Retenção'});
   for(let i=0;i<5200;i++)ProcessFeedback.log('Mensagem '+i,'info');
  });
  assert.equal(await page.locator('#pfsLog .pfs-log-entry').count(),250);
  assert.equal(await page.evaluate(()=>ProcessFeedback.atual._history.length),5000);
  await page.locator('.pfs-history-details > summary').click();
  await page.locator('#pfsLog').evaluate(n=>{n.scrollTop=0;n.dispatchEvent(new Event('scroll'));});
  await page.evaluate(()=>ProcessFeedback.log('Atualização enquanto leio','info'));
  assert.equal(await page.locator('#pfsFollowLog').getAttribute('aria-pressed'),'false');
  assert.equal(await page.locator('#pfsLog').evaluate(n=>n.scrollTop),0);
  const download=page.waitForEvent('download');await page.locator('#pfsDownloadLog').click();
  assert.match((await download).suggestedFilename(),/sicard_historico_.*\.json/);
  await page.locator('#pfsFollowLog').click();
  assert.equal(await page.locator('#pfsFollowLog').getAttribute('aria-pressed'),'true');
  // SSE terminal não carrega resultado: só REST completo encerra esperar().
  const apiPage=await browser.newPage();let polls=0;
  const fs=require('node:fs');
  await apiPage.route('http://feedback.test/**',route=>{
   const pathname=new URL(route.request().url()).pathname;
   if(pathname==='/')return route.fulfill({contentType:'text/html',body:'<meta charset="utf-8">'});
   if(['/api.js','/ui.js','/logger.js'].includes(pathname))return route.fulfill({contentType:'text/javascript;charset=utf-8',body:fs.readFileSync(path.resolve('geoespacial/extracao-atributos'+pathname),'utf8')});
   polls++;
   return route.fulfill({json:polls===1?{id:'j',revisao:2,status:'executando'}:{id:'j',revisao:5,status:'concluido',resultado:{id:'resultado-completo'}}});
  });
  await apiPage.goto('http://feedback.test/');
  const result=await apiPage.evaluate(async()=>{
   window.ProcessFeedback={atual:{_sicard:{job:'j',revisao:5,snapshot:{id:'j',revisao:5,status:'concluido'}}}};
   const {esperar}=await import('/api.js');
   return esperar({id:'j',revisao:1,status:'executando'},id=>'/status/'+id,()=>{});
  });
  assert.deepEqual(result,{id:'resultado-completo'});assert.equal(polls,2);
  await apiPage.close();
  // Ponte territorial real: a Promise de recusa chega ao controlador compartilhado.
  const bridge=fs.readFileSync(path.resolve('plugins/municipal-layer/sicard/main.jsx'),'utf8').split('function criarFeedbackSigma(){')[1].split('export function montarMunicipal')[0];
  await page.addScriptTag({content:'function criarFeedbackSigma(){'+bridge});
  await page.evaluate(async()=>{
   window.Notify={info(){},warning(){},error(){}};
   const proc=criarFeedbackSigma().processo('Territorial');
   proc.definirCancelamento(async()=>{throw new Error('Etapa final não cancelável');});
   await ProcessFeedback.atual.cancelar();
  });
  assert.equal(await page.locator('#pfsCancelBtn').isEnabled(),true);
  assert.match(await page.locator('#pfsLog').textContent(),/Etapa final não cancelável/);
  await page.evaluate(async()=>{
   const proc=criarFeedbackSigma().processo('Territorial confirmado');
   proc.definirCancelamento(async()=>{});
   await ProcessFeedback.atual.cancelar();
  });
  assert.equal(await page.evaluate(()=>ProcessFeedback.atual._finalizado),true);
  assert.equal(await page.locator('#pfsCancelBtn').isVisible(),false);
  assert.deepEqual(errors,[]);
  console.log('PASS: conclusão explícita, horário da origem, revisão, lacuna, cancelamento pendente/recusado/confirmado, retenção, download e rolagem voluntária.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
