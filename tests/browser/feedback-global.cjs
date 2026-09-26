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
  // Log acumulado (SIGMA): cada log do servidor entra uma vez; a etapa ativa fica no cabeçalho.
  const linhasLog=()=>primeiro.locator('.slt-fb-log .slt-fb-step');
  const cabecalho=()=>primeiro.locator('.slt-fb-current-message').innerText();
  const tarefaVisivel=()=>primeiro.locator('[data-progress="tarefa"]').evaluate(n=>!n.hidden);
  await page.evaluate(()=>p1.acompanhar({tarefa_id:1,etapa:'Cruzando áreas de risco',percentual:33,progresso_tarefa:75,etapas:[{sequencia:1,mensagem:'Mensagem antiga'},{sequencia:2,mensagem:'Cruzando áreas de risco'}]}));
  assert.equal(await cabecalho(),'Cruzando áreas de risco');
  assert.equal(await primeiro.locator('.slt-fb-log .slt-fb-step--progress span').innerText(),'Cruzando áreas de risco');
  assert.equal(await primeiro.locator('.slt-fb-log').getByText('Cruzando áreas de risco').count(),1,'Etapa já registrada no log não se repete');
  assert.equal(await primeiro.locator('.slt-fb-bar--tarefa').getAttribute('aria-valuenow'),'75');
  const linhasAntes=await linhasLog().count();
  await page.evaluate(()=>p1.acompanhar({tarefa_id:1,etapa:'Cruzando áreas de risco',percentual:33,progresso_tarefa:80,etapas:[{sequencia:1,mensagem:'Mensagem antiga'},{sequencia:2,mensagem:'Cruzando áreas de risco'}]}));
  assert.equal(await linhasLog().count(),linhasAntes,'Polling repetido não duplica linhas');
  await page.evaluate(()=>p1.acompanhar({tarefa_id:2,etapa:'Identificando áreas de restrição',percentual:33,progresso_tarefa:0}));
  assert.equal(await primeiro.locator('.slt-fb-bar--tarefa').getAttribute('aria-valuenow'),'0');
  assert.equal(await cabecalho(),'Identificando áreas de restrição');
  assert.equal(await primeiro.locator('.slt-fb-log .slt-fb-step--progress').count(),1,'Só a tarefa corrente gira');
  await page.evaluate(()=>{p1.acompanhar({tarefa_id:2,etapa:'Identificando áreas de restrição',percentual:33,progresso_tarefa:100});p1.acompanhar({tarefa_id:2,etapa:'Identificando áreas de restrição',percentual:33,progresso_tarefa:100});});
  assert.equal(await tarefaVisivel(),false);
  assert.equal(await primeiro.locator('.slt-fb-log').getByText('Identificando áreas de restrição').count(),1);
  // A conclusão registrada pelo servidor fecha a linha da tarefa em vez de repeti-la.
  await page.evaluate(()=>{p1.acompanhar({id:'j',tarefa_id:1,etapa_atual:'Gravando camada',concluidas:1,total:4,logs:[]});p1.acompanhar({id:'j',tarefa_id:1,etapa_atual:null,concluidas:2,total:4,logs:[{sequencia:1,nivel:'sucesso',mensagem:'Gravando camada'}]});});
  assert.equal(await primeiro.locator('.slt-fb-log').getByText('Gravando camada').count(),1);
  assert.equal(await primeiro.locator('.slt-fb-log .slt-fb-step--success').filter({hasText:'Gravando camada'}).count(),1);
  assert.equal(await primeiro.locator('.slt-fb-step-badge').innerText(),'2/4');
  await page.evaluate(()=>p1.acompanhar({tarefa_id:3,etapa:'Salvando resultados',percentual:66,progresso_tarefa:null}));
  assert.equal(await primeiro.locator('.slt-fb-bar--tarefa').getAttribute('aria-valuenow'),null);
  assert.equal(await primeiro.locator('[data-progress=tarefa] .slt-fb-percent').innerText(),'Sem percentual informado');
  assert.ok(await primeiro.locator('.slt-fb-bar--tarefa').evaluate(n=>n.getBoundingClientRect().height)<=6);
  await page.evaluate(()=>{window.antiga=p1.passo('Preparando');window.ativa=p1.passo('Gravando');p1.atualizar(antiga,'success');});
  assert.equal(await cabecalho(),'Gravando');
  assert.equal(await page.evaluate(()=>antiga.className),'slt-fb-step slt-fb-step--success');
  await page.evaluate(()=>p1.atualizar(ativa,'success'));
  assert.equal(await tarefaVisivel(),false);
  // Semáforo: amarelo enquanto roda.
  assert.equal(await primeiro.locator('.slt-fb-modal').getAttribute('data-semaforo'),'amarelo');
  assert.equal(await primeiro.locator('.slt-fb-semaforo').getAttribute('aria-label'),'Situação: Em andamento');
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
  await page.evaluate(()=>{window.dinamico=SLTFeedback.processo('Exportar seleção');dinamico.atividade({id:'leitura',nome:'Consultando registros',concluidas:2,total:5,unidade:'registros',detalhe:'Registro A\nLendo atributos.',geral:10});});
  const dinamico=page.locator('.slt-fb-process-panel').filter({hasText:'Exportar seleção'});
  assert.equal(await dinamico.locator('.slt-fb-bar--tarefa').getAttribute('aria-valuenow'),'40');
  assert.equal(await dinamico.locator('[data-progress="tarefa"] .slt-fb-percent').innerText(),'2 de 5 registros');
  await page.evaluate(()=>dinamico.atividade({id:'leitura',nome:'Consultando registros',concluidas:3,total:5,unidade:'registros',detalhe:'Registro B\nLendo atributos.'}));
  assert.match(await dinamico.locator('.slt-fb-current-message').innerText(),/Registro B/);
  assert.doesNotMatch(await dinamico.locator('.slt-fb-current-message').innerText(),/Registro A/);
  assert.equal(await dinamico.locator('.slt-fb-log').getByText('Consultando registros').count(),1,'Uma linha por atividade, não por registro');
  await page.evaluate(()=>dinamico.atividade({id:'gravacao',nome:'Gravando arquivo',detalhe:'saida.geojson',percentual:0}));
  assert.equal(await dinamico.locator('.slt-fb-title').innerText(),'Exportar seleção');
  assert.equal(await dinamico.locator('.slt-fb-bar--tarefa').getAttribute('aria-valuenow'),'0');
  assert.equal(await dinamico.locator('.slt-fb-bar--tarefa').getAttribute('aria-valuetext'),null);
  assert.equal(await dinamico.locator('.slt-fb-log .slt-fb-step--progress span').innerText(),'Gravando arquivo');
  assert.equal(await dinamico.locator('.slt-fb-current-message').innerText(),'saida.geojson');
  // Semáforo do desfecho: verde, amarelo e vermelho, com o texto da situação.
  for(const [type,luz,texto] of [['success','verde','Concluído'],['warning','amarelo','Concluído com ressalvas'],['error','vermelho','Interrompido por erro']]){
    const painel=await page.evaluate(([type])=>{const p=SLTFeedback.processo('Semáforo '+type);p.concluir({type,message:'Desfecho '+type});return p.element.id;},[type]);
    const modal=page.locator(`#${painel} .slt-fb-modal`);
    assert.equal(await modal.getAttribute('data-semaforo'),luz);
    assert.equal(await page.locator(`#${painel} .slt-fb-semaforo`).getAttribute('aria-label'),`Situação: ${texto}`);
    assert.equal(await page.locator(`#${painel} .slt-fb-current-message`).innerText(),texto);
    const cor=await page.locator(`#${painel} [data-luz="${luz}"]`).evaluate(n=>getComputedStyle(n).backgroundColor);
    assert.notEqual(cor,await page.locator(`#${painel} [data-luz="${luz==='verde'?'vermelho':'verde'}"]`).evaluate(n=>getComputedStyle(n).backgroundColor),'Só a luz da situação acende');
  }
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  assert.deepEqual(errors,[]);console.log('PASS: notificações sem modal/foco, validação contextual, concorrência, recuperação, progresso real, recolher sem cancelar, cancelamento confirmado e foco dos diálogos.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
