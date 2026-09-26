// Feedback oficial (SIGMA-PLI) numa página real do SICARD: formulários em <dialog>, erro, cancelamento e avisos de campo.
const {chromium}=require('playwright');const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--no-proxy-server','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
 try{
  const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/**',r=>r.fulfill({json:new URL(r.request().url()).pathname.includes('/auth/')?{authenticated:true,id:'teste',nome:'Teste',tipo_usuario:'ADMIN'}:[]}));
  await page.goto('http://127.0.0.1:8083/restrict/geoespacial/gerador-camadas-territoriais/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.ProcessFeedback&&window.StatusFeedback&&window.Notify);
  assert.equal(await page.locator('#pfsComponente').count(),1);
  // Confirmação com entrada dentro de um formulário modal: vai para a top layer do diálogo.
  await page.evaluate(()=>{
   const d=document.createElement('dialog');d.id='formulario-teste';d.textContent='Formulário';document.body.append(d);d.showModal();
   window.resposta=ProcessFeedback.confirmar({title:'Salvar configuração',input:{label:'Nome'},confirmLabel:'Salvar'});
  });
  assert.equal(await page.locator('#formulario-teste #pfsComponente').count(),1);
  await page.locator('#pfsConfirmOk').click();assert.equal(await page.locator('#pfsConfirmInput').getAttribute('aria-invalid'),'true');
  await page.locator('#pfsConfirmInput').fill('Minha configuração');await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(()=>window.resposta),'Minha configuração');
  // Aviso aberto sobre o formulário continua visível quando o formulário é removido.
  await page.evaluate(()=>{Notify.warning('Camadas territoriais','Aviso dentro do formulário');});
  await page.locator('#formulario-teste .notification-toast.warning').waitFor();
  await page.evaluate(()=>document.querySelector('#formulario-teste').remove());
  await page.locator('body > .notification-container .notification-toast.warning').waitFor();
  await page.evaluate(()=>Notify.clearAll());
  // Erro durante o processo → modal de erro com o título da ação.
  await page.evaluate(()=>{const p=ProcessFeedback.iniciarCadastro({title:'Gerar camada territorial',tasks:['Ler camadas']});p.tarefaAtual('Ler camadas');p.erro({message:'Falha de uma camada'});});
  await page.locator('#pfsErrorBox.pfs-active').waitFor();
  assert.equal(await page.locator('[data-pfs="error-header-title"]').innerText(),'Gerar camada territorial');
  assert.equal(await page.locator('[data-pfs="error-message"]').innerText(),'Falha de uma camada');
  await page.evaluate(()=>StatusFeedback.fechar());
  // Cancelamento real: o botão só existe com onCancel e chama o serviço.
  await page.evaluate(()=>{window.cancelou=false;ProcessFeedback.iniciarCadastro({title:'Validando',onCancel:()=>{window.cancelou=true;}});});
  await page.getByRole('button',{name:'CANCELAR',exact:true}).click();assert.equal(await page.evaluate(()=>cancelou),true);
  assert.equal(await page.locator('#pfsProgressOverlay.pfs-active').count(),0);
  // Ação perigosa começa em Cancelar: Enter não confirma.
  await page.evaluate(()=>{window.decisao=ProcessFeedback.confirmar({message:'Excluir?',danger:true});});
  await page.waitForFunction(()=>document.activeElement?.id==='pfsConfirmCancel');
  await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>decisao),false);
  // Aviso de campo das regras: Notify dentro do diálogo e campo marcado.
  await page.evaluate(async()=>{const regras=await import('/restrict/geoespacial/extracao-atributos/regras.js');window.regra=regras.editarFinalidade({disponiveis:[]});});
  const dialog=page.locator('dialog');await dialog.getByRole('button',{name:/Salvar|Aplicar|Adicionar/}).click();
  assert.match(await dialog.locator('.notification-toast.warning').textContent(),/nome da finalidade/);
  assert.equal(await dialog.locator('[aria-invalid="true"]').count(),1);
  assert.deepEqual(errors,[]);console.log('PASS: confirmação com nome obrigatório sobre formulário, aviso preservado ao fechar formulário, erro durante processo, cancelamento real, confirmação destrutiva segura e aviso de campo.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
