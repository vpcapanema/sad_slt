const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try {
  const page=await browser.newPage({viewport:{width:900,height:700}});
  await page.setContent('<html lang="pt-BR"><body></body></html>');
  await page.addStyleTag({path:path.resolve('assets/css/process_feedback_system.css')});
  await page.addScriptTag({path:path.resolve('assets/js/process_feedback_unified.js')});
  const suffix='(HTTP 422 — PATCH /api/ahp/comparacao-colaborativa/ambientes/1cc65958-115c-4d53-bbd5-a814d1f6efd3)';
  await page.evaluate(message=>ProcessFeedback.erro({message}),'O prazo deve ser futuro '+suffix);
  const main=page.locator('[data-pfs="error-message"]'), technical=page.locator('[data-pfs="error-technical"]');
  assert.equal(await main.innerText(),'O prazo deve ser futuro');
  assert.equal(await technical.innerText(),suffix);
  const a=await main.boundingBox(),b=await technical.boundingBox();
  assert(b.y>=a.y+a.height);
  await page.screenshot({path:'.tmp/feedback-erro-blocos.png'});
  await page.evaluate(()=>ProcessFeedback.erro({message:'Informe o nome.\nO prazo deve ser futuro (HTTP 422 — PATCH /api/exemplo)'}));
  assert.equal(await main.innerText(),'Informe o nome.\nO prazo deve ser futuro');
  await page.evaluate(()=>ProcessFeedback.erro({message:'Verifique os campos (obrigatórios).'}));
  assert.equal(await main.innerText(),'Verifique os campos (obrigatórios).');
  assert.equal(await technical.isVisible(),false);
  assert.equal(await technical.textContent(),'');
  console.log('PASS: mensagem e HTTP em blocos separados; múltiplas mensagens e erro sem detalhes técnicos.');
 } finally {await browser.close();}
})();
