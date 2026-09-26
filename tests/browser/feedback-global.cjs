// Componentes do feedback oficial (SIGMA-PLI) em página isolada; sem servidor ou gravações externas.
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const page=await browser.newPage({viewport:{width:1100,height:900},acceptDownloads:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setContent('<html lang="pt-BR"><body><button id="origem">Origem</button><dialog id="formulario"><p>Formulário</p><button id="dentro">Dentro</button></dialog></body></html>');
  await page.addStyleTag({path:path.resolve('assets/css/process_feedback_system.css')});
  for(const arquivo of ['notification_system.js','process_feedback_unified.js','notification_system.js','process_feedback_unified.js'])
    await page.addScriptTag({path:path.resolve('assets/js/'+arquivo)});
  assert.equal(await page.locator('#pfsComponente').count(),1,'Script repetido mantém um único componente');
  assert.equal(await page.locator('.notification-container').count(),1,'Script repetido mantém um único Notify');
  const ativo=sel=>page.locator(sel).evaluate(n=>n.classList.contains('pfs-active'));

  // Confirmação: Promise<boolean>, Esc cancela, foco volta à origem, ação perigosa começa em Cancelar.
  await page.locator('#origem').focus();
  await page.evaluate(()=>{window.decisao=ProcessFeedback.confirmar({title:'Excluir camada',message:'Excluir “Rodovias”?',warning:'Não pode ser desfeita.',confirmLabel:'Excluir',danger:true});});
  assert.equal(await ativo('#pfsConfirmOverlay'),true);
  assert.equal(await page.locator('[data-pfs="confirm-warning"]').innerText(),'Não pode ser desfeita.');
  await page.waitForFunction(()=>document.activeElement?.id==='pfsConfirmCancel');
  assert.match(await page.locator('#pfsConfirmOk').getAttribute('class'),/pfs-btn--error/);
  await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.id),'pfsConfirmOk');
  await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.id),'pfsConfirmClose','Tab fica preso no modal');
  await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(()=>decisao),false);
  assert.equal(await page.evaluate(()=>document.activeElement.id),'origem');
  await page.evaluate(()=>{window.decisao=ProcessFeedback.confirmar({message:'Seguir?'});});
  await page.locator('#pfsConfirmOk').click();assert.equal(await page.evaluate(()=>decisao),true);
  // Entrada obrigatória: vazio não confirma; Enter no campo confirma; cancelar devolve null.
  await page.evaluate(()=>{window.nome=ProcessFeedback.confirmar({title:'Salvar configuração',input:{label:'Nome'},confirmLabel:'Salvar'});});
  await page.locator('#pfsConfirmOk').click();
  assert.equal(await page.locator('#pfsConfirmInput').getAttribute('aria-invalid'),'true');assert.equal(await ativo('#pfsConfirmOverlay'),true);
  await page.locator('#pfsConfirmInput').fill('  Minha lista ');await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(()=>nome),'Minha lista');
  await page.evaluate(()=>{window.nome=ProcessFeedback.confirmar({input:{label:'Nome',defaultValue:'x'}});});
  await page.locator('#pfsConfirmCancel').click();assert.equal(await page.evaluate(()=>nome),null);

  // Progresso: tarefas, segmentos, card, tarefas concluídas, log e barra.
  await page.evaluate(()=>{window.cancelou=0;ProcessFeedback.iniciarCadastro({title:'Calcular Fase 1',tasks:['Validar','Cruzar','Gravar'],onCancel:()=>{cancelou++;}});
    ProcessFeedback.tarefa('Validar','12 camadas');ProcessFeedback.concluirTarefa('Validar','ok');ProcessFeedback.tarefa('Cruzar');ProcessFeedback.etapa('Interseção municipal');});
  assert.equal(await ativo('#pfsProgressOverlay'),true);
  assert.equal(await page.locator('[data-pfs="task-step-num"]').innerText(),'2');
  assert.equal(await page.locator('[data-pfs="task-step-total"]').innerText(),'de 3');
  assert.equal(await page.locator('.pfs-completed-item').count(),1);
  assert.equal(await page.locator('.pfs-segment--completed').count(),1);assert.equal(await page.locator('.pfs-segment--active').count(),1);
  assert.equal(await page.locator('[data-pfs="progress-percent"]').innerText(),'33%');
  assert.equal(await page.locator('.pfs-log .pfs-log-spinner').count(),1,'Só a tarefa corrente gira');
  assert.match(await page.locator('#pfsLog').innerText(),/Interseção municipal/);
  // Ocultar não cancela; CANCELAR chama onCancel e fecha.
  await page.locator('#pfsProgressClose').click();assert.equal(await ativo('#pfsProgressOverlay'),false);assert.equal(await page.evaluate(()=>cancelou),0);
  await page.evaluate(()=>ProcessFeedback.iniciarCadastro({title:'Com cancelamento',tasks:['A'],onCancel:()=>{cancelou++;}}));
  assert.equal(await page.locator('#pfsCancelBtn').isVisible(),true);
  await page.locator('#pfsCancelBtn').click();assert.equal(await page.evaluate(()=>cancelou),1);assert.equal(await ativo('#pfsProgressOverlay'),false);
  await page.evaluate(()=>ProcessFeedback.iniciarCadastro({title:'Sem cancelamento'}));
  assert.equal(await page.locator('#pfsCancelBtn').isHidden(),true);
  await page.evaluate(()=>ProcessFeedback.permitirCancelamento(()=>{cancelou++;}));assert.equal(await page.locator('#pfsCancelBtn').isVisible(),true);
  await page.evaluate(()=>ProcessFeedback.permitirCancelamento(null));assert.equal(await page.locator('#pfsCancelBtn').isHidden(),true);

  // Job do SICARD: etapa vira tarefa; log "sucesso" da tarefa corrente conclui; polling não duplica.
  await page.evaluate(()=>{ProcessFeedback.acompanhar({id:'j1',tarefa_id:1,etapa_atual:'Gravando camada',concluidas:0,total:3,percentual:10,logs:[]});
    const snap={id:'j1',tarefa_id:1,etapa_atual:null,progresso_tarefa:100,concluidas:1,total:3,percentual:33,logs:[{sequencia:1,nivel:'sucesso',mensagem:'Gravando camada'},{sequencia:2,nivel:'aviso',mensagem:'CRS ausente'}]};
    ProcessFeedback.acompanhar(snap);ProcessFeedback.acompanhar(snap);});
  assert.equal(await page.locator('.pfs-completed-item').filter({hasText:'Gravando camada'}).count(),1);
  assert.equal(await page.locator('.pfs-log-entry--warning').filter({hasText:'CRS ausente'}).count(),1);
  assert.equal(await page.locator('[data-pfs="progress-percent"]').innerText(),'33%');

  // Medidas individuais e detalhes atualizam sem recriar a tarefa nem zerar a barra.
  await page.evaluate(()=>{ProcessFeedback.acompanhar({id:'medicao',tarefa_id:1,etapa:'Cruzar base',percentual:40,progresso_tarefa:32,tarefa_concluidas:32,tarefa_total:100,unidade_tarefa:'feições',logs:[{sequencia:1,mensagem:'32 feições processadas'}]});ProcessFeedback.acompanhar({id:'medicao',tarefa_id:1,etapa:'Cruzar base',detalhe:'12 correspondências',percentual:40,progresso_tarefa:32,tarefa_concluidas:32,tarefa_total:100,unidade_tarefa:'feições',logs:[{sequencia:1,mensagem:'32 feições processadas'}]});});
  assert.equal(await page.locator('#pfsTaskProgressBar').getAttribute('aria-valuenow'),'32');
  assert.match(await page.locator('[data-pfs="task-progress-detail"]').innerText(),/32 de 100 feições/);
  assert.equal(await page.locator('.pfs-log-entry').filter({hasText:'32 feições processadas'}).count(),1);

  // Sucesso → modal verde com resumo, subprocessos e ação em código.
  await page.evaluate(()=>{window.acionado=false;ProcessFeedback.sucesso({title:'Fase 1 calculada',message:'Confira o relatório.',summary:[{label:'Demandas',value:148}],
    subprocesses:[{name:'Risco',status:'success'},{name:'Restrição',status:'warning',detail:'3 sem geometria'},{name:'Resultados',action_label:'Ver resultados',action:()=>{window.acionado=true;}}]});});
  await page.waitForFunction(()=>document.querySelector('#pfsSuccessBox').classList.contains('pfs-active'));
  assert.equal(await ativo('#pfsProgressOverlay'),false);
  assert.equal(await page.locator('[data-pfs="success-header-title"]').innerText(),'Sem cancelamento','Cabeçalho mantém o título da ação');
  assert.equal(await page.locator('[data-pfs="success-title"]').innerText(),'Fase 1 calculada');
  assert.match(await page.locator('#pfsSuccessSummary').innerText(),/Demandas:\s*148/);
  assert.equal(await page.locator('.pfs-sp--warning').count(),1);
  await page.waitForFunction(()=>document.activeElement?.id==='pfsSuccessOk','','OK recebe o foco');
  await page.getByRole('button',{name:'Ver resultados'}).click();
  assert.equal(await page.evaluate(()=>acionado),true);assert.equal(await ativo('#pfsStatusOverlay'),false);

  // Parcial → amarelo; erro → vermelho, detalhes do FastAPI, solução e relatório para baixar.
  await page.evaluate(()=>StatusFeedback.parcial({actionTitle:'Enviar e homologar camada',title:'Importada, mas não homologada',message:'Ainda não publicada.'}));
  assert.equal(await page.locator('#pfsPartialBox').evaluate(n=>n.classList.contains('pfs-active')),true);
  assert.equal(await page.locator('[data-pfs="partial-header-title"]').innerText(),'Enviar e homologar camada');
  await page.keyboard.press('Escape');assert.equal(await ativo('#pfsStatusOverlay'),false,'Esc fecha o resultado');
  await page.evaluate(()=>StatusFeedback.erro({actionTitle:'Exportar pacote',detail:[{loc:['body','formato'],msg:'valor inválido'},{loc:['body','atributos'],msg:'lista vazia'}]}));
  assert.equal(await page.locator('[data-pfs="error-message"]').innerText(),'formato: valor inválido');
  assert.equal(await page.locator('#pfsErrorLog > div').count(),2);
  assert.equal(await page.locator('#pfsSolution').isVisible(),true);
  const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#pfsErrorOk').click()]);
  assert.match(download.suggestedFilename(),/^sicard_erro_\d+\.txt$/);
  const relatorio=require('node:fs').readFileSync(await download.path(),'utf8');
  assert.match(relatorio,/RELATÓRIO DE ERRO — SICARD/);assert.match(relatorio,/atributos: lista vazia/);

  // Um processo que termina não fecha o overlay de outro que já começou.
  await page.evaluate(()=>{const a=ProcessFeedback.iniciarCadastro({title:'Primeiro'});a.sucesso({message:'ok'});ProcessFeedback.iniciarCadastro({title:'Segundo'});});
  await page.waitForTimeout(700);
  assert.equal(await ativo('#pfsProgressOverlay'),true);assert.equal(await page.locator('[data-pfs="progress-title"]').innerText(),'Segundo');
  await page.evaluate(()=>{ProcessFeedback.fechar();StatusFeedback.fechar();});

  // Credencial de gestor/admin: senha obrigatória, erro externo, resultado {confirmed,password}.
  await page.evaluate(()=>{window.credencial=ProcessFeedback.confirmarAdmin({title:'Excluir usuário'});});
  assert.match(await page.locator('#pfsCredentialHeader').getAttribute('class'),/pfs-credential-header--admin/);
  await page.locator('#pfsCredentialOk').click();assert.equal(await page.locator('#pfsCredentialErrorInline').innerText(),'Digite sua senha para continuar.');
  await page.locator('#pfsCredentialPassword').fill('segredo');await page.keyboard.press('Enter');
  assert.deepEqual(await page.evaluate(()=>credencial),{confirmed:true,password:'segredo'});

  // Notify: texto (sem HTML), aviso persistente, informação com duração, loading removível, ponte legada.
  await page.evaluate(()=>{Notify.error('Falha','<img src=x onerror="window.xss=1">');window.carregando=Notify.loading('Abrindo','Aguarde');Notify.info('Info','Some',{duration:300});showNotification('danger','Legado');});
  assert.equal(await page.evaluate(()=>window.xss),undefined);
  assert.match(await page.locator('.notification-toast.error').first().innerText(),/<img src=x/);
  assert.equal(await page.locator('.notification-toast.error').count(),2,'showNotification("danger") vira erro');
  await page.waitForFunction(()=>![...document.querySelectorAll('.notification-toast')].some(n=>n.textContent.includes('Some')));
  await page.evaluate(()=>carregando.remove());await page.waitForFunction(()=>![...document.querySelectorAll('.notification-toast')].some(n=>n.textContent.includes('Aguarde')));
  await page.evaluate(()=>Notify.clearAll());

  // Diálogo nativo aberto (top layer): feedback vai para dentro dele e volta ao body quando ele é removido.
  await page.evaluate(()=>{document.querySelector('#formulario').showModal();window.dentro=ProcessFeedback.confirmar({message:'Dentro do formulário?'});Notify.warning('Aviso','No formulário');});
  await page.waitForFunction(()=>document.querySelector('#formulario #pfsComponente')&&document.querySelector('#formulario .notification-container'));
  assert.equal(await page.locator('#pfsConfirmOk').isVisible(),true);
  await page.locator('#pfsConfirmOk').click();assert.equal(await page.evaluate(()=>dentro),true);
  await page.evaluate(()=>{const d=document.querySelector('#formulario');d.close();d.remove();});
  await page.waitForFunction(()=>document.querySelector('body > #pfsComponente')&&document.querySelector('body > .notification-container'));
  await page.evaluate(()=>{window.depois=ProcessFeedback.confirmar({message:'Depois do formulário?'});});
  await page.locator('#pfsConfirmOk').click();assert.equal(await page.evaluate(()=>depois),true,'Componente continua funcional após remover o diálogo');

  // Celular: sem rolagem horizontal.
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(()=>{ProcessFeedback.iniciarCadastro({title:'Exportar seleção com um título bem longo para quebrar',tasks:['Consultar registros','Gravar']});ProcessFeedback.tarefa('Consultar registros','Registro A\nLendo atributos.');});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  assert.deepEqual(errors,[]);
  console.log('PASS: confirmação (foco, Esc, Tab, entrada), progresso com tarefas e cancelamento, job do servidor, sucesso/parcial/erro com relatório, credencial, Notify seguro e diálogo nativo.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
