const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');

(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const page=await browser.newPage();
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.setContent('<html><body><main class="gp-app"><form id="gp-op-form"><div class="editor-actions"><button type="submit">Executar</button></div></form></main></body></html>');
  await page.addStyleTag({path:path.resolve('assets/css/process_feedback_system.css')});
  await page.addScriptTag({path:path.resolve('assets/js/process_feedback_unified.js')});
  await page.addScriptTag({path:path.resolve('geoespacial/bancada-feedback.js')});

  await page.evaluate(()=>{
   window.cancelCalls=0;
   window.confirmCalls=[];
   window.confirmPromise=gpFeedback.ProcessFeedback.confirmar({title:'Buffer',message:'Executar?',warning:'Entrada: rodovias',confirmLabel:'Executar'}).then(value=>confirmCalls.push(value));
  });
  await page.locator('#pfsConfirmCancel').click();
  await page.waitForFunction(()=>confirmCalls.length===1);
  await page.evaluate(()=>{window.confirmPromise=gpFeedback.ProcessFeedback.confirmar({title:'Buffer',message:'Executar?',confirmLabel:'Executar'}).then(value=>confirmCalls.push(value));});
  await page.locator('#pfsConfirmOk').click();
  await page.waitForFunction(()=>confirmCalls.length===2);
  assert.deepEqual(await page.evaluate(()=>confirmCalls),[false,true]);

  await page.evaluate(()=>{
   window.proc=gpFeedback.ProcessFeedback.iniciarCadastro({
    title:'Buffer',
    tasks:['Interseção'],
    onCancel:async()=>{cancelCalls++;}
   });
   proc.sync({id:'x',status:'executando',etapa_atual:'Interseção',percentual:40,progresso_tarefa:32,tarefa_concluidas:32,tarefa_total:100,unidade_tarefa:'feições',logs:[{sequencia:1,mensagem:'32 registros analisados'}]});
  });
  assert.equal(await page.locator('#pfsProgressBox').getAttribute('role'),'dialog');
  assert.equal(await page.locator('#pfsProgressBox .pfs-history-details').evaluate(node=>node.open),false);
  assert.equal(await page.locator('#pfsCancelBtn').isVisible(),true);
  assert.equal(await page.locator('#pfsTaskProgressBar').getAttribute('aria-valuenow'),'32');
  assert.equal(await page.locator('#gp-op-form > .gp-feedback-panel').count(),0);
  assert.equal(await page.locator('#gp-op-form > .pfs-overlay').count(),0);
  await page.locator('#pfsCancelBtn').click();
  await page.waitForFunction(()=>cancelCalls===1);
  await page.evaluate(()=>gpFeedback.ProcessFeedback.acompanhar({id:'x',status:'cancelado',etapa_atual:'Interseção'}));
  assert.equal(await page.locator('#pfsCancelBtn').isVisible(),false);
  assert.deepEqual(errors,[]);
  console.log('Bancada: prévia unificada, confirmação, histórico recolhido e cancelamento real OK');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
