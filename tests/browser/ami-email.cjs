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
      n_criterios:2,url_publica:'https://example.com/sicard/public/analise-multicriterio/token-email/',
      convites:[{nome:'Ana',email:'ana@example.com'},{nome:'Bia',email:'bia@example.com'}]
    };
    let rows=[], sends=[], collections=0, pendingRelease, failCollection=false;
    page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/api/**',async route=>{
      const req=route.request(), path=new URL(req.url()).pathname;
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
    await page.goto('http://127.0.0.1:8083/restrict/analise-multicriterio/?modo=espaco');
    await page.locator(`[data-select-id="${env}"]`).check();
    await page.locator('#ami-judgments-view-action').click();
    await page.waitForFunction(()=>!document.getElementById('ami-open-mail').disabled);
    assert.match(await page.locator('#ami-email-draft-card .ahp-subsection-title').textContent(),/Mensagem de email/);
    assert.equal((await page.locator('#ami-open-mail').textContent()).trim(),'Enviar e-mail');
    const texto=await page.locator('#ami-email-template').getAttribute('data-message');
    assert.match(texto,/Critério A/);
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
    await page.locator('#ami-email-draft-card').scrollIntoViewIfNeeded();
    await page.setViewportSize({width:390,height:844});
    const controls=await page.locator('#ami-email-actions').boundingBox();
    for(const id of ['ami-copy-email-link','ami-open-mail','ami-email-receipts']){
      const box=await page.locator('#'+id).boundingBox();
      assert.ok(box.x>=controls.x-1 && box.x+box.width<=controls.x+controls.width+1,'Botão deve permanecer dentro da seção em tela estreita');
    }
    assert.deepEqual(errors,[]);
    console.log('PASS: mensagem exata, dois envios individuais, confirmação SICARD, trava, envio parcial, coleta, persistência na recarga e bloqueio em edição.');
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
