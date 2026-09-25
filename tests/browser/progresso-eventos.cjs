const {chromium}=require('playwright'),{spawn}=require('node:child_process'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const server=spawn(process.env.SICARD_TEST_PYTHON||'/home/codespace/.venvs/sicard-app/bin/python',[path.join(__dirname,'progresso-eventos-server.py')]);let browser;
 try{
  const port=await new Promise((resolve,reject)=>{server.stdout.once('data',d=>resolve(String(d).trim()));server.once('exit',code=>reject(new Error(`Fixture encerrou: ${code}`)));server.stderr.on('data',d=>process.stderr.write(d));});
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:${port}`);
  const active=page.locator('.slt-fb-process-panel .slt-fb-steps');
  await page.waitForFunction(()=>document.querySelector('.slt-fb-steps').textContent.includes('Aguardando'));
  const post=body=>page.request.post(`http://127.0.0.1:${port}/tarefa`,{data:body});
  await post({mensagem:'Lendo base de risco',feitas:3,total:4});
  await page.waitForFunction(()=>document.querySelector('.slt-fb-bar--tarefa').getAttribute('aria-valuenow')==='75');
  assert.equal(await active.locator('li').count(),1);assert.match(await active.innerText(),/Lendo base de risco/);
  await post({mensagem:'Calculando interseções'});
  await page.waitForFunction(()=>document.querySelector('.slt-fb-bar--tarefa').getAttribute('aria-valuenow')==='0');
  assert.match(await active.innerText(),/Calculando interseções/);assert.doesNotMatch(await active.innerText(),/Lendo base/);
  // Poll atrasado não pode substituir uma mensagem já recebida pelo canal vivo.
  await page.evaluate(()=>proc.acompanhar({id:'teste',status:'executando',etapa:'Estado antigo',tarefa_id:1,progresso_tarefa:75,eventos_url:'/eventos'}));
  assert.match(await active.innerText(),/Calculando interseções/);
  await page.context().setOffline(true);
  await page.waitForTimeout(300);
  await page.evaluate(()=>proc.acompanhar({id:'teste',status:'executando',etapa:'Consulta de recuperação',tarefa_id:9,progresso_tarefa:0,eventos_url:'/eventos'}));
  assert.match(await active.innerText(),/Consulta de recuperação/);
  await post({mensagem:'Canal restabelecido'});
  await page.context().setOffline(false);
  await page.waitForFunction(()=>document.querySelector('.slt-fb-steps').textContent.includes('Canal restabelecido'),null,{timeout:10000});
  await page.evaluate(()=>proc.acompanhar({id:'outro',status:'executando',etapa:'Outro job sem canal',tarefa_id:1,progresso_tarefa:0}));
  assert.match(await active.innerText(),/Outro job sem canal/);
  await page.evaluate(()=>proc.acompanhar({id:'teste',status:'executando',eventos_url:'/eventos'}));
  await page.waitForFunction(()=>document.querySelector('.slt-fb-steps').textContent.includes('Canal restabelecido'));
  await post({status:'concluido'});await active.waitFor({state:'hidden'});
  assert.deepEqual(errors,[]);
  console.log('PASS: mensagens e percentuais enviados pelo worker via SSE real, sem polling; tarefa única, reset, proteção contra estado antigo e encerramento.');
 }finally{await browser?.close();server.kill();}
})().catch(e=>{console.error(e);process.exit(1)});
