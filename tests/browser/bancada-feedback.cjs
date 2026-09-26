const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
(async()=>{const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});try{
const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.setContent('<html><body><button id="mapa">Mapa disponível</button></body></html>');
await page.addStyleTag({path:path.resolve('assets/css/bancada-feedback.css')});await page.addScriptTag({path:path.resolve('geoespacial/bancada-feedback.js')});
await page.evaluate(()=>{window.calls=0;window.requestRun=async()=>{if(await gpFeedback.ProcessFeedback.confirmar({title:'Buffer',message:'Executar?',warning:'Entrada: rodovias',confirmLabel:'Executar'}))calls++;};requestRun();});
await page.getByRole('button',{name:'Cancelar',exact:true}).click();assert.equal(await page.evaluate(()=>calls),0);
await page.evaluate(()=>{requestRun();});await page.getByRole('button',{name:'Executar',exact:true}).click();assert.equal(await page.evaluate(()=>calls),1);
await page.evaluate(()=>{window.proc=gpFeedback.ProcessFeedback.iniciarCadastro({title:'Buffer'});gpFeedback.ProcessFeedback.acompanhar({id:'x',etapa:'Cruzando',percentual:40,progresso_tarefa:32,tarefa_concluidas:32,tarefa_total:100,unidade_tarefa:'feições',logs:[{sequencia:1,mensagem:'32 registros analisados'}]});});
assert.equal(await page.getByRole('progressbar',{name:'Tarefa atual',exact:true}).getAttribute('value'),'32');assert.equal(await page.locator('#pfsComponente').count(),0);
await page.locator('#mapa').click();await page.evaluate(()=>proc.sucesso({message:'Buffer concluído'}));assert.match(await page.locator('.gp-feedback-content').innerText(),/32 registros analisados/);assert.match(await page.locator('.gp-feedback-content').innerText(),/Buffer concluído/);assert.deepEqual(errors,[]);console.log('Bancada: confirmação, cancelamento, progresso e histórico independente OK');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1);});
