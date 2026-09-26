// Canal SSE real (worker + fixture FastAPI) alimentando o ProcessFeedback do SIGMA, sem polling.
const {chromium}=require('playwright'),{spawn}=require('node:child_process'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const server=spawn(process.env.SICARD_TEST_PYTHON||'/home/codespace/.venvs/sicard-app/bin/python',[path.join(__dirname,'progresso-eventos-server.py')]);let browser;
 try{
  const port=await new Promise((resolve,reject)=>{server.stdout.once('data',d=>resolve(String(d).trim()));server.once('exit',code=>reject(new Error(`Fixture encerrou: ${code}`)));server.stderr.on('data',d=>process.stderr.write(d));});
  browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:${port}`);
  const tarefa=()=>page.locator('[data-pfs="task-name"]').innerText();
  const tarefaE=texto=>page.waitForFunction(t=>document.querySelector('[data-pfs="task-name"]').textContent===t,texto,{timeout:10000});
  await tarefaE('Aguardando processamento');
  const post=body=>page.request.post(`http://127.0.0.1:${port}/tarefa`,{data:body});
  await post({mensagem:'Lendo base de risco',feitas:3,total:4});
  await tarefaE('Lendo base de risco');
  await page.waitForFunction(()=>document.querySelector('[data-pfs="progress-meta"]').textContent.includes('Tarefa atual: 75%'));
  await post({mensagem:'Calculando interseções'});
  await tarefaE('Calculando interseções');
  assert.match(await page.locator('[data-pfs="progress-meta"]').innerText(),/Tarefa atual: 0%/);
  assert.equal(await page.locator('.pfs-log-spinner').count(),1,'Só a tarefa corrente gira');
  // Poll atrasado não pode substituir uma mensagem já recebida pelo canal vivo.
  await page.evaluate(()=>ProcessFeedback.acompanhar({id:'teste',status:'executando',etapa:'Estado antigo',tarefa_id:1,progresso_tarefa:75,eventos_url:'/eventos'}));
  assert.equal(await tarefa(),'Calculando interseções');
  // Sem rede o canal cai e o polling volta a valer; com rede, o canal reconecta sozinho.
  await page.context().setOffline(true);
  await page.waitForFunction(()=>ProcessFeedback.atual._sicard.vivo===false,null,{timeout:10000});
  await page.evaluate(()=>ProcessFeedback.acompanhar({id:'teste',status:'executando',etapa:'Consulta de recuperação',tarefa_id:9,progresso_tarefa:0,eventos_url:'/eventos'}));
  assert.equal(await tarefa(),'Consulta de recuperação');
  await post({mensagem:'Canal restabelecido'});
  await page.context().setOffline(false);
  await tarefaE('Canal restabelecido');
  // Outro job troca o canal; voltar ao primeiro reabre o canal dele.
  await page.evaluate(()=>ProcessFeedback.acompanhar({id:'outro',status:'executando',etapa:'Outro job sem canal',tarefa_id:1,progresso_tarefa:0}));
  assert.equal(await tarefa(),'Outro job sem canal');
  await page.evaluate(()=>ProcessFeedback.acompanhar({id:'teste',status:'executando',eventos_url:'/eventos'}));
  await tarefaE('Canal restabelecido');
  // Status final chega pelo canal, que se encerra; o desfecho continua com quem chamou.
  await post({status:'concluido'});
  await page.waitForFunction(()=>document.querySelector('[data-pfs="progress-percent"]').textContent==='100%'&&ProcessFeedback.atual._sicard.canal===null);
  assert.equal(await page.locator('#pfsProgressOverlay').evaluate(n=>n.classList.contains('pfs-active')),true);
  assert.deepEqual(errors,[]);
  console.log('PASS: mensagens e percentuais do worker via SSE real no ProcessFeedback; proteção contra polling atrasado, queda e retorno da rede, troca de job e encerramento do canal.');
 }finally{await browser?.close();server.kill();}
})().catch(e=>{console.error(e);process.exit(1)});
