// Canal SSE real (worker + fixture FastAPI) alimentando o ProcessFeedback do SIGMA, sem polling.
const {chromium}=require('playwright'),{spawn}=require('node:child_process'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const server=spawn(process.env.SICARD_TEST_PYTHON||'/home/codespace/.venvs/sicard-app/bin/python',[path.join(__dirname,'progresso-eventos-server.py')]);let browser;
 try{
  const port=await new Promise((resolve,reject)=>{server.stdout.once('data',d=>resolve(String(d).trim()));server.once('exit',code=>reject(new Error(`Fixture encerrou: ${code}`)));server.stderr.on('data',d=>process.stderr.write(d));});
  browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:${port}`);
  const tarefa=async()=>(await page.locator('.pfs-entity--operation strong').last().innerText()).replace('Operation: ','');
  const tarefaE=texto=>page.waitForFunction(t=>[...document.querySelectorAll('.pfs-entity--operation strong')].at(-1)?.textContent===`Operation: ${t}`,texto,{timeout:10000});
  await page.waitForSelector('.pfs-entity--workflow');
  const post=body=>page.request.post(`http://127.0.0.1:${port}/tarefa`,{data:body});
  await post({mensagem:'Lendo base de risco',feitas:3,total:4});
  await tarefaE('Lendo base de risco');
  await page.waitForFunction(()=>document.querySelector('.pfs-entity--operation [role="progressbar"]').getAttribute('aria-valuenow')==='75');
  await post({mensagem:'Calculando interseções'});
  await tarefaE('Calculando interseções');
  assert.equal(await page.locator('.pfs-entity--operation [role="progressbar"]').last().getAttribute('aria-valuenow'),null,'Nova operação permanece indeterminada até receber medição');
  assert.equal(await page.locator('.pfs-entity--operation[data-state="executando"]').count(),2,'Começar outra operação não conclui a anterior');
  // Poll atrasado não pode substituir uma mensagem já recebida pelo canal vivo.
  await page.evaluate(()=>ProcessFeedback.acompanhar({id:'teste',status:'executando',etapa:'Estado antigo',tarefa_id:1,progresso_tarefa:75,eventos_url:'/eventos'}));
  assert.equal(await tarefa(),'Calculando interseções');
  // Sem rede o canal cai e o polling volta a valer; com rede, o canal reconecta sozinho.
  await page.context().setOffline(true);
  await page.waitForFunction(()=>ProcessFeedback.atual._sicard.vivo===false,null,{timeout:10000});
  await post({mensagem:'Consulta de recuperação'});
  const recovery=await (await page.request.get(`http://127.0.0.1:${port}/estado`)).json();
  await page.evaluate(job=>ProcessFeedback.acompanhar(job),recovery);
  assert.equal(await tarefa(),'Consulta de recuperação');
  await post({mensagem:'Canal restabelecido'});
  await page.context().setOffline(false);
  await tarefaE('Canal restabelecido');
  // Outro job troca o canal; eventos antigos não retomam a execução abandonada.
  await page.evaluate(()=>ProcessFeedback.acompanhar({id:'outro',status:'executando',etapa:'Outro job sem canal',tarefa_id:1,progresso_tarefa:0}));
  assert.equal(await page.locator('[data-pfs="task-name"]').innerText(),'Outro job sem canal');
  await page.evaluate(()=>ProcessFeedback.acompanhar({id:'teste',status:'executando',eventos_url:'/eventos'}));
  assert.equal(await page.evaluate(()=>ProcessFeedback.atual._sicard.job),'outro');
  await page.evaluate(()=>{ProcessFeedback.iniciarCadastro({title:'Retomar execução'});ProcessFeedback.acompanhar({id:'teste',status:'executando',eventos_url:'/eventos'});});
  await tarefaE('Canal restabelecido');
  // Status final chega pelo canal, que se encerra; o desfecho continua com quem chamou.
  await post({status:'concluido'});
  await page.waitForFunction(()=>document.querySelector('[data-pfs="progress-percent"]').textContent==='100%'&&ProcessFeedback.atual._sicard.canal===null);
  assert.equal(await page.locator('#pfsProgressOverlay').evaluate(n=>n.classList.contains('pfs-active')),true);
  assert.deepEqual(errors,[]);
  console.log('PASS: mensagens e percentuais do worker via SSE real no ProcessFeedback; proteção contra polling atrasado, queda e retorno da rede, troca de job e encerramento do canal.');
 }finally{await browser?.close();server.kill();}
})().catch(e=>{console.error(e);process.exit(1)});
