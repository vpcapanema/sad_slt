const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 try{
  const page=await browser.newPage();const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.setContent('<html><body><button id="inicio">Inicio</button></body></html>');
  await page.addStyleTag({path:path.resolve('assets/css/process_feedback_system.css')});
  for(const file of ['assets/js/notification_system.js','assets/js/process_feedback_unified.js','geoespacial/bancada-feedback.js'])await page.addScriptTag({path:path.resolve(file)});
  await page.evaluate(()=>{
   window.closedSSE=0;
   window.proc=gpFeedback.ProcessFeedback.iniciarCadastro({title:'Teste',tasks:['Executar']});
   proc._eventSource={close(){closedSSE++;}};
  });
  await page.locator('#pfsProgressClose').click();
  const hidden=await page.evaluate(()=>({closedSSE,monitor:proc._activityTimer,finalizado:proc._finalizado,visible:document.querySelector('#pfsProgressOverlay').classList.contains('pfs-active')}));
  assert.equal(hidden.closedSSE,0);assert.notEqual(hidden.monitor,null);assert.equal(hidden.finalizado,false);assert.equal(hidden.visible,false);
  await page.evaluate(()=>{
   window.downloads=0;
   URL.createObjectURL=()=>{downloads++;return 'blob:teste';};URL.revokeObjectURL=()=>{};
   HTMLAnchorElement.prototype.click=function(){};
   StatusFeedback.erro({message:'Erro sintetico',details:['Detalhe']});
  });
  await page.locator('#pfsErrorOk').click();
  await page.locator('#pfsDownloadReport').click();
  await page.locator('#pfsDownloadReport').click();
  assert.equal(await page.evaluate(()=>downloads),2);
  await page.evaluate(()=>proc.fechar());
  assert.equal(await page.evaluate(()=>closedSSE),1);
  assert.equal(await page.evaluate(()=>proc._activityTimer),null);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({hidden,downloads:2,closedAfterExplicitClose:true,errors}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
