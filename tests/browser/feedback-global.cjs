// Componentes globais reais; sem servidor ou gravações externas.
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:1100,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setContent('<html lang="pt-BR"><body><input id="origem" aria-label="Origem"><section id="area"></section><form id="form"><label for="nome">Nome</label><input id="nome" required><button>Salvar</button></form></body></html>');
  await page.addStyleTag({path:path.resolve('assets/css/feedback.css')});await page.addScriptTag({path:path.resolve('assets/js/feedback.js')});
  await page.locator('#origem').focus();
  await page.evaluate(()=>{SLTFeedback.success('Salvo');SLTFeedback.error('Falha recuperável');SLTFeedback.info('Aviso repetido');SLTFeedback.info('Aviso repetido');});
  assert.equal(await page.locator('#slt-feedback-backdrop').count(),0);assert.equal(await page.locator('.slt-fb-notice').count(),3);
  assert.equal(await page.evaluate(()=>document.activeElement.id),'origem');assert.equal(await page.evaluate(()=>document.body.style.overflow),'');
  assert.equal(await page.evaluate(()=>SLTFeedback.validar('#form')),false);
  assert.equal(await page.locator('#nome').getAttribute('aria-invalid'),'true');await page.locator('#nome').fill('Teste');assert.equal(await page.locator('#nome').getAttribute('aria-invalid'),null);
  await page.evaluate(()=>{window.l1=SLTFeedback.carregamento('#area');window.l2=SLTFeedback.carregamento('#area');l1.fechar();});
  assert.equal(await page.locator('#area').getAttribute('aria-busy'),'true');await page.evaluate(()=>l2.concluir({type:'error',message:'Falha ao carregar',action:{label:'Tentar novamente',run:()=>window.tentou=true}}));
  assert.equal(await page.locator('#area').getAttribute('aria-busy'),null);await page.getByRole('button',{name:'Tentar novamente'}).click();assert.equal(await page.evaluate(()=>tentou),true);
  await page.locator('#origem').focus();
  await page.evaluate(()=>{window.p1=SLTFeedback.processo('Primeiro');window.p2=SLTFeedback.processo('Segundo');p1.passo('Lendo 3 arquivos');p1.progresso(33,'Leitura',65);SLTFeedback.error('Falha de outra atividade');});
  assert.equal(await page.locator('.slt-fb-process-panel').count(),2);assert.equal(await page.evaluate(()=>document.activeElement.id),'origem');
  assert.equal(await page.locator('.slt-fb-process-panel [aria-modal]').count(),0);
  const primeiro=page.locator('.slt-fb-process-panel').filter({hasText:'Primeiro'}),segundo=page.locator('.slt-fb-process-panel').filter({hasText:'Segundo'});
  assert.equal(await primeiro.locator('.slt-fb-bar--tarefa').getAttribute('aria-valuenow'),'65');assert.equal(await primeiro.locator('.slt-fb-bar--geral').getAttribute('aria-valuenow'),'33');
  assert.equal(await segundo.locator('.slt-fb-bar--geral').getAttribute('aria-valuenow'),null);
  assert.equal(await primeiro.getByRole('button',{name:'Cancelar',exact:true}).isDisabled(),true);
  assert.doesNotMatch(await primeiro.locator('.slt-fb-steps').textContent(),/outra atividade/);
  await primeiro.getByRole('button',{name:'Recolher acompanhamento'}).click();assert.equal(await primeiro.locator('.slt-fb-body').isVisible(),false);
  await page.evaluate(()=>p1.concluir({message:'Primeiro concluído'}));assert.equal(await primeiro.locator('.slt-fb-body').isVisible(),false);await primeiro.getByRole('button',{name:'Mostrar resultados'}).click();assert.equal(await primeiro.locator('.slt-fb-body').isVisible(),true);
  await page.evaluate(()=>{window.parar=new Promise(resolve=>window.confirmarParada=resolve);p2.definirCancelamento(()=>parar);});
  await segundo.getByRole('button',{name:'Cancelar',exact:true}).click();assert.equal(await page.evaluate(()=>p2.signal.aborted),false);
  assert.match(await segundo.locator('.slt-fb-steps').textContent(),/Aguarde a confirmação/);
  await page.evaluate(()=>confirmarParada());await page.waitForFunction(()=>p2.signal.aborted);assert.match(await segundo.locator('.slt-fb-results').textContent(),/cancelado/);
  await page.locator('#origem').focus();await page.evaluate(()=>{window.decisao=SLTFeedback.confirmar({message:'Excluir arquivo?',danger:true,confirmLabel:'Excluir arquivo'});});
  assert.equal(await page.evaluate(()=>document.activeElement.textContent),'Cancelar');
  await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.textContent),'Excluir arquivo');await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('aria-label')),'Fechar');
  await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>decisao),false);assert.equal(await page.evaluate(()=>document.activeElement.id),'origem');
  await page.evaluate(()=>{window.nomeSolicitado=SLTFeedback.solicitar({title:'Salvar',label:'Nome'});});await page.locator('[data-fb-confirmar]').click();assert.equal(await page.locator('[data-fb-input]').getAttribute('aria-invalid'),'true');assert.equal(await page.locator('.slt-fb-modal').filter({has:page.locator('[role="dialog"]')}).count(),0);
  await page.locator('[data-fb-input]').fill('Configuração');await page.locator('[data-fb-confirmar]').click();assert.equal(await page.evaluate(()=>nomeSolicitado),'Configuração');
  await page.evaluate(()=>{window.finalizar=new Promise(resolve=>window.responder=resolve);window.acao=SLTFeedback.acao({titulo:'Ação pendente',acompanhamento:true,executar:()=>finalizar,sucesso:'Gravado'});});
  assert.equal(await page.locator('.slt-fb-process-panel').filter({hasText:'Ação pendente'}).locator('.slt-fb-modal--success').count(),0);
  await page.evaluate(()=>responder({id:1}));assert.equal(await page.evaluate(async()=>(await acao).ok),true);
  await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  assert.deepEqual(errors,[]);console.log('PASS: notificações sem modal/foco, validação contextual, concorrência, recuperação, progresso real, recolher sem cancelar, cancelamento confirmado e foco dos diálogos.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
