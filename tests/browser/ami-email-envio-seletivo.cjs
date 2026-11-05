const {chromium} = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({channel:'msedge',headless:true});
  try {
    const page = await browser.newPage({viewport:{width:1280,height:900}});
    if (process.env.SICARD_BROWSER_SESSION) await page.context().addCookies([
      {name:'slt_session',value:process.env.SICARD_BROWSER_SESSION,url:'http://127.0.0.1:8083'}
    ]);
    const env='39b5c763-d15a-460b-b58e-d65b57871c57', errors=[], sends=[], requests=[];
    const round={id:env,status:'ativa',token:'token-email',hierarquizacao_id:'h1',hierarquizacao_nome:'Análise de teste',
      hierarquizacao_codigo:'H1',atualizadoEm:'2026-10-19T12:00:00+00:00',valido_ate:'2035-12-31T23:59:59-03:00',
      criterios:[{nome:'Critério A'},{nome:'Critério B'}],n_criterios:2,
      url_publica:'https://example.com/sicard/public/analise-multicriterio/formulario-comparacao-pareada/token-email/',
      convites:[{nome:'Ana',email:'ana@example.com'},{nome:'Bia',email:'bia@example.com'},{nome:'Cid',email:'cid@example.com'}]};
    const registro=(id,email,natureza,status,detalhe)=>({id,destinatario:email,natureza,envio_status:status,detalhe,
      criado_em:'2026-11-05T12:00:00Z',entrega_status:'sem_confirmacao',leitura_status:'sem_confirmacao',eventos:[]});
    let rows=[
      registro('bia-antigo','bia@example.com','convite','falha','Falha antiga do convite'),
      {...registro('bia-convite','bia@example.com','convite','aceito_smtp','Convite aceito'),entrega_status:'confirmada'},
      registro('bia-resposta','bia@example.com','resposta','falha','Falha da confirmação'),
      registro('cid-convite','cid@example.com','convite','falha','Convite não enviado'),
      registro('cid-resposta','cid@example.com','resposta','aceito_smtp','Resposta aceita')
    ];
    let consultas=0;
    page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/api/**',async route=>{
      const req=route.request(), path=new URL(req.url()).pathname;
      requests.push(path);
      if(path.endsWith('/emails/monitoramento')){
        consultas++;
        return route.fulfill({json:{registros:rows,colaboradores:round.convites.map(c=>({...c,resposta_recebida:c.nome!=='Ana'}))}});
      }
      if(path.endsWith('/emails/confirmacoes')){
        rows=rows.map(r=>r.envio_status==='aceito_smtp'?{...r,entrega_status:'confirmada',leitura_status:'confirmada'}:r);
        return route.fulfill({json:{registros:rows,relatorios_consultados:2}});
      }
      if(path.endsWith('/emails/enviar') || path.endsWith('/emails/resposta/enviar')){
        const p=req.postDataJSON(), natureza=path.endsWith('/resposta/enviar')?'resposta':'convite';
        sends.push({natureza,...p});
        const anterior=rows.find(r=>r.destinatario===p.destinatario && r.natureza===natureza);
        const row=registro(anterior?.id || 'email-'+p.destinatario,p.destinatario,natureza,'aceito_smtp','Aceito pelo SMTP');
        rows=rows.filter(r=>r.id!==row.id).concat(row);
        return route.fulfill({json:row});
      }
      if(path==='/api/ahp/comparacao-colaborativa/ambientes') return route.fulfill({json:[round]});
      if(path==='/api/auth/me') return route.fulfill({json:{id:'u',nome:'Analista',tipo_usuario:'ANALISTA'}});
      if(path==='/api/auth/session') return route.fulfill({json:{authenticated:true,user:{id:'u',tipo_usuario:'ANALISTA'}}});
      return route.fulfill({json:[]});
    });
    const navigation=await page.goto('http://127.0.0.1:8083/restrict/analise-multicriterio/central-julgamentos');
    assert.equal(navigation.status(),200,'A página deve carregar antes de validar os controles.');
    assert.equal(new URL(page.url()).pathname,'/restrict/analise-multicriterio/central-julgamentos','A sessão deve continuar válida.');
    try {
      await page.waitForFunction(()=>document.querySelector('[data-select-id="39b5c763-d15a-460b-b58e-d65b57871c57"]') ||
        document.querySelector('#ami-judgments tbody')?.textContent.includes('Não foi possível'));
    } catch (error) {
      throw new Error('Julgamento de teste não carregou. Erros JavaScript: ' + JSON.stringify(errors) +
        '; API: ' + JSON.stringify(requests.slice(0,20)) +
        '; tabela: ' + await page.locator('#ami-judgments').count() + '; ' + error.message);
    }
    assert.deepEqual(errors,[],'A página não pode apresentar erros JavaScript.');
    await page.locator(`[data-select-id="${env}"]`).check();
    await page.locator('#ami-judgments-view-action').click();
    await page.waitForFunction(()=>document.querySelectorAll('#ami-email-deliveries input[type=checkbox]').length===3);
    const linha=email=>page.locator('#ami-email-deliveries tr').filter({hasText:email});
    const marcar=(email)=>linha(email).locator('input[type=checkbox]').check();
    const convite=page.locator('#ami-monitor-send'), resposta=page.locator('#ami-monitor-send-response');
    const limpar=()=>page.locator('#ami-monitor-clear').click();
    const confirmar=async()=>{
      await page.locator('#pfsConfirmOk').click();
      await page.waitForFunction(()=>!document.querySelector('.ami-main').inert);
      await page.locator('#pfsStatusOverlay .pfs-box.pfs-active .pfs-close').click();
    };
    assert.deepEqual(await page.locator('#ami-monitor-table th').allTextContents(),
      ['','Colaboradores','E-mail colaborador','Registrado em','E-mail convite','E-mail resposta']);
    assert.match(await page.locator('#ami-collaborator-table thead').innerText(),/E-MAIL COLABORADOR/i);
    assert.equal(await convite.isDisabled(),true); assert.equal(await resposta.isDisabled(),true);
    assert.match(await linha('bia@example.com').innerText(),/Bia/);
    assert.equal(await linha('bia@example.com').count(),1);
    assert.equal(await linha('bia@example.com').locator('.ami-cell-link').first().innerText(),'Aceito pelo servidor');

    await marcar('ana@example.com');
    assert.equal(await convite.isEnabled(),true); assert.equal(await resposta.isDisabled(),true);
    await marcar('bia@example.com');
    assert.equal(await convite.isDisabled(),true); assert.equal(await resposta.isDisabled(),true);
    await limpar(); await marcar('bia@example.com');
    assert.equal(await convite.isDisabled(),true); assert.equal(await resposta.isEnabled(),true);
    await resposta.click(); await confirmar();
    assert.deepEqual(sends,[{natureza:'resposta',destinatario:'bia@example.com'}]);
    assert.equal(await resposta.isDisabled(),true);

    await limpar(); await marcar('cid@example.com');
    assert.equal(await convite.isEnabled(),true); assert.equal(await resposta.isDisabled(),true);
    await convite.click(); await confirmar();
    assert.equal(sends.length,2); assert.equal(sends[1].natureza,'convite');
    assert.equal(sends[1].somente_nao_enviado,true); assert.equal(sends[1].reenvio_id,null);
    assert.equal(sends[1].destinatario,'cid@example.com');
    assert.equal(await convite.isDisabled(),true);
    assert.equal(await page.locator('#ami-email-deliveries tr').count(),3);

    await linha('bia@example.com').locator('.ami-cell-link').first().click();
    const modal=page.locator('#ami-email-history-modal');
    assert.equal(await modal.isVisible(),true);
    assert.deepEqual(await page.locator('#ami-email-history-table th').allTextContents(),['','Entrega','Leitura','Detalhes']);
    assert.equal(await page.locator('#ami-email-history-body tr').count(),2);
    const estilos=await page.evaluate(()=>{
      const style=selector=>{
        const c=getComputedStyle(document.querySelector(selector));
        return {font:c.font,padding:c.padding,color:c.color};
      };
      return {
        main:style('#ami-monitor-table td:nth-child(2)'),
        modal:style('#ami-email-history-table td:nth-child(2)'),
        mainHeader:style('#ami-monitor-table th:nth-child(2)'),
        modalHeader:style('#ami-email-history-table th:nth-child(2)')
      };
    });
    assert.deepEqual(estilos.modal,estilos.main);
    assert.deepEqual(estilos.modalHeader,estilos.mainHeader);
    assert.match(await page.locator('#ami-email-history-body').innerText(),/Falha antiga do convite/);
    assert.doesNotMatch(await page.locator('#ami-email-history-body').innerText(),/Falha da confirmação/);
    await page.locator('#ami-email-history-filter-coluna').selectOption('0');
    await page.locator('#ami-email-history-filter-valor').selectOption({label:'Confirmada'});
    assert.equal(await page.locator('#ami-email-history-body tr').count(),1);
    await page.locator('#ami-email-history-all').check();
    const download=page.waitForEvent('download'); await page.locator('#ami-email-history-export').click();
    assert.equal((await download).suggestedFilename(),'historico-email-convite.csv');
    await page.locator('#ami-email-history-clear').click();
    assert.equal(await page.locator('#ami-email-history-export').isDisabled(),true);
    await page.keyboard.press('Escape');
    assert.equal(await modal.isVisible(),false);
    await linha('bia@example.com').locator('.ami-cell-link').last().click();
    assert.equal(await page.locator('#ami-email-history-title').innerText(),'E-mail resposta');
    assert.equal(await page.locator('#ami-email-history-body tr').count(),1);
    assert.match(await page.locator('#ami-email-history-body').innerText(),/Aceito pelo SMTP/);
    await page.locator('#ami-email-history-close').click();

    const antes=consultas;
    await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
    await page.waitForFunction(()=>document.getElementById('ami-email-status').textContent.includes('carregado'));
    await page.locator('#ami-monitor-refresh').click();
    await page.waitForFunction(()=>!document.querySelector('.ami-main').inert);
    await page.locator('#pfsStatusOverlay .pfs-box.pfs-active .pfs-close').click();
    assert.ok(consultas>antes);
    await linha('bia@example.com').locator('.ami-cell-link').last().click();
    assert.match(await page.locator('#ami-email-history-body').innerText(),/Confirmada pelo aplicativo/);
    await page.locator('#ami-email-history-close').click();
    assert.equal(sends.length,2,'Atualizar não reenvia mensagens');
    await page.setViewportSize({width:390,height:844});
    await linha('cid@example.com').locator('.ami-cell-link').last().click();
    assert.equal(await modal.isVisible(),true);
    assert.ok(await page.locator('#ami-email-history-close').isVisible());
    assert.deepEqual(errors,[]);
    console.log('PASS: agrupamento, dois envios, seleção estrita, históricos separados, filtros, exportação, atualização e mobile.');
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
