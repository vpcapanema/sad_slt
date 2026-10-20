// UI isolada: sem serviços, banco ou processamento real.
const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
(async () => {
  const browser = await chromium.launch({headless:true});
  try {
    const page = await browser.newPage({viewport:{width:1100,height:850}});
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.route('http://feedback.test/**', route => route.fulfill({contentType:'text/html',body:'<!doctype html><button id="origin">Abrir</button>'}));
    await page.goto('http://feedback.test/');
    await page.addStyleTag({content:fs.readFileSync('assets/css/process_feedback_system.css','utf8')});
    await page.addScriptTag({content:fs.readFileSync('assets/js/process_feedback_unified.js','utf8')});
    await page.evaluate(() => {
      window.sources = [];
      window.EventSource = class {
        constructor(url) { this.url = url; sources.push(this); }
        addEventListener(_, cb) { this.cb = cb; }
        close() { this.closed = true; }
        emit(job, seq) { this.cb({data:JSON.stringify(job), lastEventId:String(seq)}); }
      };
      window.job = (id, revisao, pct=25, status='executando', count=2) => ({
        id, revisao, status, eventos_url:'/eventos', cancelavel:true,
        workflow:{id, nome:'Fluxo de teste', estado:status, percentual:pct, tasks:[
          {id:'task',workflow_id:id,nome:'Análise',estado:status,percentual:pct,operations:
            Array.from({length:count}, (_,i)=>({id:String(i),task_id:'task',nome:'Nome repetido',estado:i===0?status:'pendente',percentual:i===0?pct:null}))}
        ]}
      });
      ProcessFeedback.iniciarCadastro({title:'Teste'});
      ProcessFeedback.acompanhar(job('a',1));
    });
    assert.equal(await page.locator('.pfs-entity--operation').count(),2);
    assert.equal(await page.locator('.pfs-entity--workflow > [role=progressbar]').getAttribute('aria-valuenow'),'25');
    await page.locator('.pfs-entity--task > summary').click();
    await page.evaluate(() => sources[0].emit(job('a',3,60),3));
    assert.equal(await page.locator('.pfs-entity--task').getAttribute('open'),null);
    await page.evaluate(() => { ProcessFeedback.acompanhar(job('a',2,10)); sources[0].emit(job('a',3,10),3); });
    assert.equal(await page.locator('.pfs-entity--workflow > [role=progressbar]').getAttribute('aria-valuenow'),'60');
    await page.evaluate(() => { ProcessFeedback.atual.ocultar(); sources[0].emit(job('a',4,70),4); });
    assert.equal(await page.locator('#pfsProgressOverlay').evaluate(n=>n.classList.contains('pfs-active')),false);
    await page.evaluate(() => ProcessFeedback.reabrir());
    assert.equal(await page.locator('.pfs-entity--workflow > [role=progressbar]').getAttribute('aria-valuenow'),'70');
    // SSE indisponível: polling atualizado permanece aceito.
    await page.evaluate(() => { sources[0].onerror(); ProcessFeedback.acompanhar(job('a',5,80)); });
    assert.equal(await page.locator('.pfs-entity--workflow > [role=progressbar]').getAttribute('aria-valuenow'),'80');
    await page.evaluate(() => {
      ProcessFeedback.permitirCancelamento(async()=>{});
    });
    await page.locator('#pfsCancelBtn').click();
    await page.locator('#pfsConfirmCancel').click();
    assert.equal(await page.evaluate(()=>ProcessFeedback.atual._cancelPending),false);
    await page.locator('#pfsCancelBtn').click();
    await page.locator('#pfsConfirmOk').click();
    assert.equal(await page.locator('#pfsCancelBtn').isDisabled(),true);
    assert.equal(await page.evaluate(()=>ProcessFeedback.atual._finalizado),false);
    await page.evaluate(() => sources[0].emit(job('a',6,80,'cancelado'),6));
    assert.equal(await page.evaluate(()=>ProcessFeedback.atual._finalizado),true);
    assert.equal(await page.evaluate(()=>sources[0].closed),true);
    await page.evaluate(() => {
      ProcessFeedback.iniciarCadastro({title:'Outra execução'});
      ProcessFeedback.acompanhar(job('b',1,null,'executando',120));
    });
    assert.equal(await page.locator('.pfs-entity--operation').count(),120);
    assert.equal(await page.locator('.pfs-entity--workflow > [role=progressbar]').getAttribute('aria-valuenow'),null);
    assert.equal(await page.locator('#pfsHierarchy').evaluate(n=>n.scrollHeight>n.clientHeight),true);
    await page.setViewportSize({width:390,height:800});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await page.waitForTimeout(600);
    await page.screenshot({path:'outputs/feedback-hierarquia-mobile.png'});
    // Resultado antigo agendado não pode aparecer sobre nova execução.
    await page.evaluate(() => { ProcessFeedback.sucesso({}); ProcessFeedback.iniciarCadastro({title:'Nova'}); });
    await page.waitForTimeout(650);
    assert.equal(await page.locator('#pfsStatusOverlay').evaluate(n=>n.classList.contains('pfs-active')),false);
    await page.evaluate(()=>{ProcessFeedback.acompanhar(job('c',1));ProcessFeedback.acompanhar(job('d',1));ProcessFeedback.acompanhar(job('c',99));});
    assert.equal(await page.evaluate(()=>ProcessFeedback.atual._sicard.job),'d');
    await page.evaluate(()=>{ProcessFeedback.acompanhar(job('d',2,50,'parcial'));ProcessFeedback.sucesso({message:'Resultado parcial confirmado'});});
    await page.waitForFunction(()=>document.querySelector('#pfsPartialBox').classList.contains('pfs-active'));
    assert.equal(await page.locator('.pfs-entity--workflow > [role=progressbar]').getAttribute('aria-valuenow'),'50');
    await page.evaluate(()=>{const old=ProcessFeedback.atual;ProcessFeedback.iniciarCadastro({title:'Isolamento final'});old.tarefaAtual('Mensagem atrasada');old.erro({message:'Erro atrasado'});});
    assert.equal(await page.locator('[data-pfs="progress-title"]').innerText(),'Isolamento final');
    assert.equal(await page.locator('#pfsStatusOverlay').evaluate(n=>n.classList.contains('pfs-active')),false);
    assert.deepEqual(errors,[]);
    console.log('PASS: hierarquia, medidas, duplicação, ordenação, fallback, cancelamento, isolamento, expansão e responsividade.');
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
