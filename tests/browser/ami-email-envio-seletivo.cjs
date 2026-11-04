const {chromium} = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({channel:'msedge',headless:true});
  try {
    const page = await browser.newPage({viewport:{width:1280,height:900}});
    await page.context().addCookies([{name:'slt_session',value:process.env.SICARD_BROWSER_SESSION,url:'http://127.0.0.1:8083'}]);
    const errors=[], env='39b5c763-d15a-460b-b58e-d65b57871c57';
    const round={id:env,status:'ativa',token:'token-email',hierarquizacao_id:'h1',hierarquizacao_nome:'Análise de teste',
      hierarquizacao_codigo:'H1',atualizadoEm:'2026-10-19T12:00:00+00:00',valido_ate:'2035-12-31T23:59:59-03:00',
      criterios:[{nome:'Critério A'},{nome:'Critério B'}],n_criterios:2,
      url_publica:'https://example.com/sicard/public/analise-multicriterio/formulario-comparacao-pareada/token-email/',
      convites:[{nome:'Ana',email:'ana@example.com'},{nome:'Bia',email:'bia@example.com'},{nome:'Cid',email:'cid@example.com'}]};
    let rows=[], sends=[], limitar=0;
    page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/api/**',async route=>{
      const req=route.request(), path=new URL(req.url()).pathname;
      if(path.endsWith('/emails/enviar')){
        const p=req.postDataJSON(); sends.push({...p,t:Date.now()});
        const falhar = limitar>0 && p.destinatario==='cid@example.com';
        if(falhar) limitar--;
        const row={id:'mail-'+p.destinatario+'-'+(p.reenvio_id||'0'),destinatario:p.destinatario,criado_em:new Date().toISOString(),
          envio_status:falhar?'falha':'aceito_smtp',entrega_status:'sem_confirmacao',leitura_status:'sem_confirmacao',
          detalhe:falhar?'O servidor de email limitou temporariamente os envios (código 421). Aguarde alguns minutos e envie novamente aos pendentes.':'Aceito.'};
        rows=rows.filter(r=>r.id!==row.id).concat(row);
        return route.fulfill({json:row});
      }
      if(path.endsWith('/emails')) return route.fulfill({json:rows});
      if(path==='/api/ahp/comparacao-colaborativa/ambientes') return route.fulfill({json:[round]});
      if(path==='/api/auth/me') return route.fulfill({json:{id:'u',nome:'Analista',tipo_usuario:'ANALISTA'}});
      if(path==='/api/auth/session') return route.fulfill({json:{authenticated:true,user:{id:'u',tipo_usuario:'ANALISTA'}}});
      return route.fulfill({json:[]});
    });
    const abrir = async () => {
      await page.goto('http://127.0.0.1:8083/restrict/analise-multicriterio/central-julgamentos');
      await page.locator(`[data-select-id="${env}"]`).check();
      await page.locator('#ami-judgments-view-action').click();
      await page.waitForFunction(()=>!document.getElementById('ami-open-mail').disabled);
    };
    const confirmar = async () => { await page.locator('#pfsConfirmOk').click(); await page.waitForFunction(()=>!document.querySelector('.ami-main').inert,null,{timeout:120000}); };
    const fecharStatus = () => page.locator('#pfsStatusOverlay .pfs-box.pfs-active .pfs-close').click();

    // 1) Primeiro envio: os três, sem reenvio_id, com intervalo de ~3 s.
    await abrir();
    assert.equal((await page.locator('#ami-open-mail').innerText()).trim(),'Enviar e-mail');
    assert.equal(await page.locator('#ami-monitor-send').isDisabled(),true);
    const texto=await page.locator('#ami-email-template').getAttribute('data-message');
    await page.locator('#ami-open-mail').click(); await confirmar(); await fecharStatus();
    assert.deepEqual(sends.map(s=>s.destinatario),['ana@example.com','bia@example.com','cid@example.com']);
    assert.ok(sends.every(s=>s.reenvio_id===null && s.texto===texto));
    assert.ok(sends[1].t-sends[0].t>=2900 && sends[2].t-sends[1].t>=2900, 'intervalo entre envios');
    assert.equal((await page.locator('#ami-open-mail').innerText()).trim(),'Reenviar e-mails');

    // 2) Seleção no monitoramento: envia só a Bia, com o mesmo texto e nova identidade.
    await page.locator('#ami-email-deliveries tr',{hasText:'bia@example.com'}).locator('input[type="checkbox"]').check();
    assert.equal(await page.locator('#ami-monitor-send').isDisabled(),false);
    await page.locator('#ami-monitor-send').click();
    assert.match(await page.locator('#pfsConfirmMessage').innerText(),/1 colaborador\(es\) selecionado/);
    await confirmar(); await fecharStatus();
    assert.equal(sends.length,4);
    assert.equal(sends[3].destinatario,'bia@example.com');
    assert.equal(sends[3].texto,texto);
    assert.ok(sends[3].reenvio_id);

    // 3) Falha por limite: Cid fica pendente; o botão principal envia só ao pendente.
    rows=rows.map(r=>r.destinatario==='cid@example.com'?{...r,envio_status:'falha',detalhe:'O servidor de email recusou o destinatário. Confira o endereço informado.'}:r);
    await abrir();
    assert.equal((await page.locator('#ami-open-mail').innerText()).trim(),'Enviar aos pendentes (1)');
    await page.locator('#ami-open-mail').click(); await confirmar(); await fecharStatus();
    assert.equal(sends.length,5);
    assert.equal(sends[4].destinatario,'cid@example.com');
    assert.ok(sends[4].reenvio_id);
    assert.equal((await page.locator('#ami-open-mail').innerText()).trim(),'Reenviar e-mails');

    // 4) Limite temporário: nova tentativa automática após a espera, com a mesma identidade.
    await page.evaluate(()=>{ const original=window.setTimeout; window.setTimeout=(fn,ms,...a)=>original(fn,ms>=60000?200:ms,...a); });
    limitar=1;
    await page.locator('#ami-email-deliveries tr',{hasText:'cid@example.com'}).first().locator('input[type="checkbox"]').check();
    await page.locator('#ami-monitor-send').click(); await confirmar();
    assert.equal(sends.length,7);
    assert.equal(sends[5].destinatario,'cid@example.com');
    assert.equal(sends[6].destinatario,'cid@example.com');
    assert.equal(sends[5].reenvio_id,sends[6].reenvio_id);
    assert.match(await page.locator('#ami-email-status').innerText(),/1 mensagem\(ns\) aceita/);
    assert.deepEqual(errors,[]);
    console.log('PASS: envio inicial com intervalo, envio aos selecionados, envio aos pendentes e nova tentativa após limite.');
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
