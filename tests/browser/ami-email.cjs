const {chromium} = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({channel:'msedge',headless:true});
  try {
    const page = await browser.newPage({viewport:{width:1280,height:900}});
    const errors=[], env='39b5c763-d15a-460b-b58e-d65b57871c57';
    const round={
      id:env,status:'ativa',token:'token-email',hierarquizacao_id:'h1',hierarquizacao_nome:'Análise de teste',
      hierarquizacao_codigo:'H1',atualizadoEm:'2026-10-19T12:00:00+00:00',
      valido_ate:'2035-12-31T23:59:59-03:00',criterios:[{nome:'Critério A'},{nome:'Critério B'}],
      n_criterios:2,url_publica:'https://example.com/sicard/public/analise-multicriterio/formulario-comparacao-pareada/token-email/',
      convites:[{nome:'Ana',email:'ana@example.com'},{nome:'Bia',email:'bia@example.com'}]
    };
    let rows=[], sends=[], patches=[], collections=0, pendingRelease, failCollection=false;
    page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/api/**',async route=>{
      const req=route.request(), path=new URL(req.url()).pathname;
      if(req.method()==='PATCH' && path.endsWith('/ambientes/'+env)){
        const data=req.postDataJSON();patches.push(data);
        Object.assign(round,data,{status:data.reabrir?'ativa':round.status});
        return route.fulfill({json:round});
      }
      if(path==='/api/ahp/hierarquizacoes/portfolio') return route.fulfill({json:[{id:'h1',nome:'Análise de teste',codigo:'H1'}]});
      if(path.endsWith('/emails/enviar')){
        const payload=req.postDataJSON(); sends.push(payload);
        if(sends.length===1) await new Promise(resolve=>{pendingRelease=resolve;});
        const row={
          id:'mail-'+payload.destinatario,destinatario:payload.destinatario,
          criado_em:'2026-10-19T18:00:00Z',
          envio_status:payload.destinatario.startsWith('ana')?'aceito_smtp':'indeterminado',
          entrega_status:'sem_confirmacao',leitura_status:'sem_confirmacao',
          dsn_solicitada:false,detalhe:payload.destinatario.startsWith('ana')?'Aceito pelo SMTP.':'Confira o recebimento antes de reenviar.'
        };
        rows=rows.filter(r=>r.id!==row.id).concat(row);
        return route.fulfill({json:row});
      }
      if(path.endsWith('/emails/confirmacoes')){
        collections++;
        if(failCollection) return route.fulfill({status:502,json:{detail:'Não foi possível consultar os retornos. Os envios não foram repetidos.'}});
        rows=rows.map(r=>({...r,entrega_status:r.destinatario.startsWith('ana')?'confirmada':'sem_confirmacao',
          leitura_status:r.destinatario.startsWith('ana')?'confirmada':'sem_confirmacao'}));
        return route.fulfill({json:{registros:rows,relatorios_consultados:2}});
      }
      if(path.endsWith('/emails')) return route.fulfill({json:rows});
      if(path==='/api/ahp/comparacao-colaborativa/ambientes') return route.fulfill({json:[round]});
      if(path==='/api/auth/me') return route.fulfill({json:{id:'u',nome:'Analista',tipo_usuario:'ANALISTA'}});
      if(path==='/api/auth/session') return route.fulfill({json:{authenticated:true,user:{id:'u',tipo_usuario:'ANALISTA'}}});
      return route.fulfill({json:[]});
    });
    const currentUrl=round.url_publica;
    for(const publicUrl of [
      'https://example.com/sicard/public/analise-multicriterio/token-email/',
      '/sicard/public/analise-multicriterio/formulario-comparacao-pareada/token-email/'
    ]){
      round.url_publica=publicUrl;
      await page.goto('http://127.0.0.1:8083/restrict/analise-multicriterio/central-julgamentos');
      await page.locator(`[data-select-id="${env}"]`).check();
      await page.locator('#ami-judgments-view-action').click();
      await page.waitForFunction(()=>!document.getElementById('ami-open-mail').disabled);
      const resolvedUrl=new URL(publicUrl,'http://127.0.0.1:8083').href;
      assert.equal(await page.locator('#ami-email-form-link').getAttribute('href'),resolvedUrl);
      assert.ok((await page.locator('#ami-email-template').getAttribute('data-message')).includes(resolvedUrl));
    }
    assert.equal(sends.length,0);
    round.url_publica=currentUrl;
    await page.goto('http://127.0.0.1:8083/restrict/analise-multicriterio/central-julgamentos');
    await page.locator(`[data-select-id="${env}"]`).check();
    await page.locator('#ami-judgments-view-action').click();
    await page.waitForFunction(()=>!document.getElementById('ami-open-mail').disabled);
    assert.match(await page.locator('#ami-email-draft-card > .ahp-section-label').textContent(),/Notificação e monitoramento/);
    assert.equal(await page.locator('#ami-email-draft-card .ahp-subsection-title').count(),2);
    assert.equal(await page.locator('#ami-create-status .ami-status-card').count(),3);
    const statusBox=await page.locator('#ami-create-status').boundingBox();
    const formBox=await page.locator('#ami-interactive-analysis-component').boundingBox();
    assert.ok(statusBox.y+statusBox.height<=formBox.y);
    await page.locator('#ami-monitor-filter-coluna').selectOption('0');
    await page.locator('#ami-monitor-filter-valor').selectOption('ana@example.com');
    assert.equal(await page.locator('#ami-email-deliveries tr').count(),1);
    assert.match(await page.locator('#ami-email-deliveries').innerText(),/ana@example.com/);
    await page.locator('#ami-monitor-filter-inverter').click();
    assert.match(await page.locator('#ami-email-deliveries').innerText(),/bia@example.com/);
    await page.locator('#ami-monitor-filter-limpar').click();
    assert.equal(await page.locator('#ami-email-deliveries tr').count(),2);
    const visual = await page.evaluate(() => {
      const style = selector => {
        const e=document.querySelector(selector), c=getComputedStyle(e);
        return {font:c.fontFamily,size:c.fontSize,weight:c.fontWeight,line:c.lineHeight,height:e.getBoundingClientRect().height};
      };
      return {
        refHeader:style('.ami-table--database:not(#ami-monitor-table) th:nth-child(2)'),
        header:style('#ami-monitor-table th:nth-child(2)'),
        refCell:style('#ami-judgments td:nth-child(2)'),
        cell:style('#ami-email-deliveries td:nth-child(2)'),
        refButton:style('#ami-judgments-edit-action'),button:style('#ami-monitor-export'),
        colors:[...document.querySelectorAll('#ami-email-deliveries tr td:nth-child(2)')].map(e=>getComputedStyle(e).backgroundColor)
      };
    });
    assert.deepEqual(visual.header,visual.refHeader);
    const filters = await page.locator('#ami-filter-coluna, #ami-filter-valor, #ami-monitor-filter-coluna, #ami-monitor-filter-valor').evaluateAll(es => es.map(e => ({id:e.id,height:e.getBoundingClientRect().height})));
    assert.deepEqual(filters.map(e => e.height), [25,25,25,25], JSON.stringify(filters));
    assert.deepEqual(visual.cell,visual.refCell);
    assert.equal(visual.button.height,visual.refButton.height);
    assert.deepEqual(visual.colors,['rgb(255, 255, 255)','rgb(237, 244, 248)']);
    await page.locator('#ami-monitor-select-all').check();
    assert.equal(await page.locator('#ami-email-deliveries input:checked').count(),2);
    assert.match(await page.locator('#ami-email-status-count').innerText(),/2 selecionados/);
    const downloaded=page.waitForEvent('download');
    await page.locator('#ami-monitor-export').click();
    assert.equal((await downloaded).suggestedFilename(),'monitoramento-colaboradores.csv');
    await page.locator('#ami-monitor-clear').click();
    assert.equal(await page.locator('#ami-email-deliveries input:checked').count(),0);
    await page.screenshot({path:'.tmp/ambiente-reorganizado.png',fullPage:true});
    assert.equal((await page.locator('#ami-open-mail').textContent()).trim(),'Enviar e-mail');
    const texto=await page.locator('#ami-email-template').getAttribute('data-message');
    assert.match(texto,/Critério A/);
    assert.ok(texto.includes(currentUrl));
    await page.locator('#ami-open-mail').click();
    await page.locator('#pfsConfirmCancel').click();
    assert.equal(sends.length,0);
    await page.locator('#ami-open-mail').click();
    await page.locator('#pfsConfirmOk').click();
    await page.waitForFunction(()=>document.querySelector('.ami-main').inert);
    assert.equal(await page.locator('#ami-open-mail').isDisabled(),true);
    await page.locator('#ami-open-mail').evaluate(button=>button.click());
    for(let attempt=0;!pendingRelease && attempt<100;attempt++) await page.waitForTimeout(50);
    assert.equal(typeof pendingRelease,'function');
    assert.equal(sends.length,1);
    pendingRelease();
    await page.waitForFunction(()=>!document.querySelector('.ami-main').inert);
    assert.equal(sends.length,2);
    assert.equal(sends[0].texto,texto);
    assert.equal(sends[1].texto,texto);
    assert.equal(sends[0].versao,round.atualizadoEm);
    assert.equal(sends[0].destinatario,'ana@example.com');
    assert.equal(sends[1].destinatario,'bia@example.com');
    assert.match(await page.locator('#ami-email-deliveries').textContent(),/Resultado indeterminado/);
    assert.match(await page.locator('#ami-email-deliveries').textContent(),/Sem confirmação/);
    await page.locator('#pfsStatusOverlay .pfs-box.pfs-active .pfs-close').click();
    await page.locator('#ami-email-receipts').click();
    await page.waitForFunction(()=>!document.querySelector('.ami-main').inert);
    assert.equal(collections,1);
    assert.equal(sends.length,2);
    assert.match(await page.locator('#ami-email-deliveries').textContent(),/Confirmada pelo aplicativo/);
    await page.locator('#pfsSuccessOk').click();
    await page.reload();
    await page.locator(`[data-select-id="${env}"]`).check();
    await page.locator('#ami-judgments-view-action').click();
    await page.waitForFunction(()=>!document.getElementById('ami-open-mail').disabled);
    assert.match(await page.locator('#ami-email-deliveries').textContent(),/Confirmada pelo aplicativo/);
    assert.equal(sends.length,2);
    failCollection=true;
    await page.locator('#ami-email-receipts').click();
    await page.waitForFunction(()=>!document.querySelector('.ami-main').inert);
    assert.match(await page.locator('#pfsStatusOverlay .pfs-box.pfs-active').textContent(),/Não foi possível consultar/);
    assert.equal(sends.length,2);
    await page.locator('#pfsStatusOverlay .pfs-box.pfs-active .pfs-close').click();
    await page.locator('#ami-environment-edit').click();
    assert.equal(await page.locator('#ami-open-mail').isDisabled(),true);
    assert.equal(await page.locator('#ami-email-receipts').isDisabled(),true);
    await page.locator('#ami-create-cancel').click();
    await page.waitForFunction(()=>!document.getElementById('ami-open-mail').disabled);
    round.status='encerrada';
    await page.reload();
    await page.locator(`[data-select-id="${env}"]`).check();
    assert.equal(await page.locator('#ami-environment-edit').getAttribute('title'),'Editar julgamento');
    await page.locator('#ami-environment-edit').click();
    assert.equal(await page.locator('#ami-deadline').isEnabled(),true);
    assert.equal(await page.locator('.ami-registration-intro p').first().getAttribute('class'),'step-intro');
    await page.locator('#ami-deadline').fill('2020-01-01');
    await page.locator('#ami-environment-save').click();
    assert.equal(patches.length,0);
    assert.match(await page.locator('#ami-create-feedback').innerText(),/data limite já venceu/);
    await page.locator('#ami-deadline').fill('2036-01-31');
    await page.locator('#ami-environment-save').click();
    await page.waitForFunction(()=>document.getElementById('ami-create-feedback').textContent.includes('salvas'));
    assert.equal(patches.length,1);
    assert.equal(patches[0].reabrir,true);
    assert.ok(patches[0].valido_ate.startsWith('2036-02-01') || patches[0].valido_ate.startsWith('2036-01-31'));
    await page.locator('#pfsSuccessOk').click();
    await page.waitForFunction(()=>!document.getElementById('ami-open-mail').disabled);
    assert.match(await page.locator('#ami-open-mail').innerText(),/Reenviar/);
    await page.locator('#ami-open-mail').click();
    await page.locator('#pfsConfirmOk').click();
    await page.waitForFunction(()=>!document.querySelector('.ami-main').inert);
    assert.equal(sends.length,4);
    assert.ok(sends[2].reenvio_id);
    assert.equal(sends[2].reenvio_id,sends[3].reenvio_id);
    await page.locator('#pfsStatusOverlay .pfs-box.pfs-active .pfs-close').click();
    await page.locator('#ami-email-draft-card').scrollIntoViewIfNeeded();
    await page.setViewportSize({width:390,height:844});
    const controls=await page.locator('#ami-email-actions').boundingBox();
    for(const id of ['ami-copy-email-link','ami-open-mail','ami-email-receipts']){
      const box=await page.locator('#'+id).boundingBox();
      assert.ok(box.x>=controls.x-1 && box.x+box.width<=controls.x+controls.width+1,'Botão deve permanecer dentro da seção em tela estreita');
    }
    rows=Array.from({length:18},(_,index)=>({id:'historico-'+index,destinatario:index%2?'ana@example.com':'bia@example.com',envio_status:'aceito_smtp',entrega_status:'sem_confirmacao'}));
    await page.reload();
    await page.locator(`[data-select-id="${env}"]`).check();
    await page.locator('#ami-judgments-view-action').click();
    await page.waitForFunction(()=>document.querySelectorAll('#ami-email-deliveries tr').length===15);
    await page.locator('#ami-monitor-select-all').check();
    assert.match(await page.locator('#ami-email-status-count').innerText(),/18 selecionados \/ 15 na página \/ 18 no total/);
    await page.locator('#ami-email-status-pagination [aria-label="Próxima página"]').click();
    assert.equal(await page.locator('#ami-email-deliveries input:checked').count(),3);
    await page.locator('#ami-monitor-filter-coluna').selectOption('0');
    await page.locator('#ami-monitor-filter-valor').selectOption('ana@example.com');
    assert.equal(await page.locator('#ami-email-deliveries tr').count(),9);
    assert.match(await page.locator('#ami-email-status-pagination').innerText(),/Página 1 de 1/);
    await page.locator('#ami-monitor-clear').click();
    assert.equal(await page.locator('#ami-email-deliveries input:checked').count(),0);
    assert.deepEqual(errors,[]);
    console.log('PASS: mensagem exata, dois envios individuais, confirmação SICARD, trava, envio parcial, coleta, persistência na recarga e bloqueio em edição.');
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
