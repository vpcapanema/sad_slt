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
    await page.route('http://feedback.test/**', route => {
      const pathname=new URL(route.request().url()).pathname;
      if(pathname==='/icons.css') return route.fulfill({contentType:'text/css',body:fs.readFileSync('assets/vendor/fontawesome/css/all.min.css')});
      if(pathname.startsWith('/webfonts/') && /^fa-[a-z0-9-]+\.woff2$/.test(pathname.split('/').at(-1)))
        return route.fulfill({contentType:'font/woff2',body:fs.readFileSync('assets/vendor/fontawesome'+pathname)});
      return route.fulfill({contentType:'text/html',body:'<!doctype html><html lang="pt-BR"><head><link rel="stylesheet" href="/icons.css"><style>body{font-family:system-ui,sans-serif}</style></head><body><button id="origin">Abrir</button></body></html>'});
    });
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
    assert.equal(await page.locator('#pfsHierarchy > .pfs-level').count(),3);
    assert.equal(await page.locator('#pfsHierarchy details').count(),0);
    assert.deepEqual(await page.locator('#pfsHierarchy > .pfs-level').evaluateAll(nodes=>nodes.map(n=>n.dataset.level)),['operation','task','workflow']);
    const widths=await page.locator('#pfsHierarchy [role=progressbar]').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().width));
    assert.ok(widths.every(w=>w===widths[0]));
    assert.equal(await page.locator('.pfs-current-stage').isVisible(),false);
    assert.equal(await page.locator('.pfs-run-info > div:first-child').isVisible(),false);
    assert.equal(await page.locator('.pfs-run-info').evaluate(n=>getComputedStyle(n).textAlign),'center');
    assert.equal(await page.locator('#pfsDiagnostics').evaluate(n=>n.open),false);
    await page.evaluate(()=>{
      const sentence=document.querySelector('.pfs-level-message').textContent;
      ProcessFeedback.atual.diagnosticoTecnico([sentence,'Campo codigo_municipio ausente na base territorial.','<script>window.injetado=true</script>']);
    });
    await page.locator('#pfsDiagnostics > summary').click();
    const detail=await page.locator('#pfsDiagnostics').innerText();
    assert.match(detail,/codigo_municipio/);
    assert.doesNotMatch(detail,/Nome repetido|Fluxo de teste|Análise/);
    assert.equal(await page.evaluate(()=>window.injetado),undefined);
    await page.locator('#pfsDiagnostics > summary').click();
    assert.equal(await page.locator('[data-level="workflow"] > [role=progressbar]').getAttribute('aria-valuenow'),'25');
    await page.locator('#pfsDiagnostics > summary').click();
    await page.evaluate(() => sources[0].emit(job('a',3,60),3));
    assert.equal(await page.locator('#pfsDiagnostics').evaluate(n=>n.open),true);
    await page.evaluate(() => { ProcessFeedback.acompanhar(job('a',2,10)); sources[0].emit(job('a',3,10),3); });
    assert.equal(await page.locator('[data-level="workflow"] > [role=progressbar]').getAttribute('aria-valuenow'),'60');
    await page.evaluate(() => { ProcessFeedback.atual.ocultar(); sources[0].emit(job('a',4,70),4); });
    assert.equal(await page.locator('#pfsProgressOverlay').evaluate(n=>n.classList.contains('pfs-active')),false);
    await page.evaluate(() => ProcessFeedback.reabrir());
    assert.equal(await page.locator('[data-level="workflow"] > [role=progressbar]').getAttribute('aria-valuenow'),'70');
    // SSE indisponível: polling atualizado permanece aceito.
    await page.evaluate(() => { sources[0].onerror(); ProcessFeedback.acompanhar(job('a',5,80)); });
    assert.equal(await page.locator('[data-level="workflow"] > [role=progressbar]').getAttribute('aria-valuenow'),'80');
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
    assert.equal(await page.locator('#pfsHierarchy > .pfs-level').count(),3);
    assert.equal(await page.locator('[data-level="workflow"] > [role=progressbar]').getAttribute('aria-valuenow'),null);
    assert.equal(await page.locator('#pfsDiagnostics').evaluate(n=>n.open),false);
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
    assert.equal(await page.locator('[data-level="workflow"] > [role=progressbar]').getAttribute('aria-valuenow'),'50');
    await page.evaluate(()=>{const old=ProcessFeedback.atual;ProcessFeedback.iniciarCadastro({title:'Isolamento final'});old.tarefaAtual('Mensagem atrasada');old.erro({message:'Erro atrasado'});});
    assert.equal(await page.locator('[data-pfs="flow-title"]').innerText(),'Isolamento final');
    assert.equal(await page.locator('#pfsStatusOverlay').evaluate(n=>n.classList.contains('pfs-active')),false);
    // As confirmações compartilham a estrutura aprovada, sem altura fixa ou decisão automática.
    await page.evaluate(()=>{
      ProcessFeedback.atual.ocultar();
      window.decision=ProcessFeedback.confirmar({
        title:'Iniciar extração de atributos territoriais?', icon:'fas fa-layer-group',
        message:'O fluxo preparará os dados, analisará as relações espaciais e gerará os arquivos de resultado.',
        warning:'Revise as camadas selecionadas antes de iniciar o processamento.',
        confirmLabel:'Iniciar processamento',cancelLabel:'Voltar'
      });
    });
    assert.equal(await page.locator('#pfsConfirmBox .pfs-body #pfsConfirmTitle').count(),1);
    assert.equal(await page.locator('#pfsConfirmBox .pfs-header #pfsConfirmTitle').count(),0);
    const layout=await page.locator('#pfsConfirmBox').evaluate(box=>{
      const body=box.querySelector('.pfs-body'),footer=box.querySelector('.pfs-footer');
      return {height:box.getBoundingClientRect().height,scroll:body.scrollHeight-body.clientHeight,
        footer:footer.getBoundingClientRect().bottom,viewport:innerHeight};
    });
    assert.ok(layout.height>255);
    assert.ok(layout.scroll<=1,'Conteúdo cabe com os espaçamentos previstos');
    assert.ok(layout.footer<=layout.viewport);
    await page.screenshot({path:'outputs/feedback-confirmacao-mobile.png',animations:'disabled'});
    await page.locator('#pfsConfirmCancel').click();
    assert.equal(await page.evaluate(()=>decision),false);
    await page.evaluate(()=>{
      window.decision=ProcessFeedback.confirmar({title:'Iniciar processamento?',confirmLabel:'Iniciar processamento'});
    });
    await page.locator('#pfsConfirmOk').click();
    assert.equal(await page.evaluate(()=>decision),true);
    await page.evaluate(()=>{
      window.decision=ProcessFeedback.confirmar({title:'Salvar configuração',input:{label:'Nome'},confirmLabel:'Salvar'});
    });
    await page.locator('#pfsConfirmOk').click();
    assert.equal(await page.locator('#pfsConfirmInput').getAttribute('aria-invalid'),'true');
    await page.locator('#pfsConfirmInput').fill('Configuração de teste');
    await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(()=>decision),'Configuração de teste');
    // Resultado mantém o desenho e centraliza somente título e frase principal.
    for(const selector of ['#pfsSuccessBox .pfs-result-message','#pfsPartialBox .pfs-result-message','#pfsErrorBox .pfs-error-message'])
      assert.equal(await page.locator(selector).evaluate(n=>getComputedStyle(n).textAlign),'center');
    assert.deepEqual(errors,[]);
    console.log('PASS: três linhas, medidas, detalhes exclusivos, ordenação, fallback, cancelamento, isolamento, confirmações e responsividade.');
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
