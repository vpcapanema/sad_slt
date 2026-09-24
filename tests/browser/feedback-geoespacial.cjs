// Contratos do feedback oficial compartilhados por todas as seções.
const {chromium}=require('playwright');const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--no-proxy-server','--enable-unsafe-swiftshader']});
 try{
  const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/**',r=>r.fulfill({json:new URL(r.request().url()).pathname.includes('/auth/')?{authenticated:true,id:'teste',nome:'Teste',tipo_usuario:'ADMIN'}:[]}));
  await page.goto('http://127.0.0.1:8083/restrict/geoespacial/gerador-camadas-territoriais/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.SLTFeedback);
  await page.evaluate(()=>{
   window.SLTFeedback.fechar();const d=document.createElement('dialog');d.id='formulario-teste';d.textContent='Formulário';document.body.append(d);d.showModal();
   window.resposta=window.SLTFeedback.solicitar({title:'Salvar configuração',label:'Nome'});
  });
  assert.equal(await page.locator('#formulario-teste #slt-feedback-root').count(),1);
  await page.locator('[data-fb-confirmar]').click();assert.match(await page.locator('.slt-fb-results').textContent(),/Informe um nome/);
  await page.locator('[data-fb-input]').fill('Minha configuração');await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(()=>window.resposta),'Minha configuração');
  await page.evaluate(()=>{window.SLTFeedback.warning('Aviso dentro do formulário');document.querySelector('#formulario-teste').remove();});
  await page.locator('body > #slt-feedback-root .slt-fb-modal--warning').waitFor();await page.locator('.slt-fb-foot [data-fb-close]').click();
  await page.evaluate(()=>{window.p1=SLTFeedback.processo('Primeiro');window.p2=SLTFeedback.processo('Segundo');p1.fechar();SLTFeedback.error('Falha de uma camada');});
  assert.match(await page.locator('.slt-fb-title').textContent(),/Segundo/);
  assert.match(await page.locator('.slt-fb-steps').textContent(),/Falha de uma camada/);
  await page.keyboard.press('Escape');assert.equal(await page.locator('.slt-fb-modal--progress').count(),1);
  await page.evaluate(()=>p2.concluir({type:'warning',message:'Parcial'}));await page.locator('.slt-fb-foot [data-fb-close]').click();
  await page.evaluate(()=>{window.cancelou=false;window.p3=SLTFeedback.processo('Validando',{cancelar:()=>{window.cancelou=true;p3.concluir({type:'info',message:'Cancelado'});}});});
  await page.getByRole('button',{name:'Cancelar',exact:true}).click();assert.equal(await page.evaluate(()=>cancelou),true);await page.locator('.slt-fb-foot [data-fb-close]').click();
  await page.evaluate(()=>{window.decisao=SLTFeedback.confirmar({message:'Excluir?',danger:true});});
  await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>decisao),false);
  await page.evaluate(async()=>{const regras=await import('/restrict/geoespacial/extracao-atributos/regras.js');window.regra=regras.editarFinalidade({disponiveis:[]});});
  const dialog=page.locator('dialog');await dialog.getByRole('button',{name:/Salvar|Aplicar|Adicionar/}).click();
  assert.equal(await dialog.locator('.slt-fb-modal--warning').count(),1);assert.match(await dialog.locator('.slt-fb-results').textContent(),/nome da finalidade/);
  assert.deepEqual(errors,[]);console.log('PASS: nome obrigatório, feedback sobre formulários, preservação ao fechar formulário, erro durante processo, cancelamento real e confirmação destrutiva segura.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
