const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
(async () => {
  const browser = await chromium.launch({headless:true});
  let authenticated=false;
  try {
    const page = await browser.newPage({viewport:{width:1280,height:900}});
    const credentials = fs.readFileSync('credencias_sigma_agentes.txt','utf8');
    const credential = label => {
      const match = credentials.match(new RegExp('^' + label + '\\s*[:=]\\s*(.+)$','mi'));
      if (!match) throw new Error('Credencial local indisponível.');
      return match[1].trim();
    };
    await page.goto('http://127.0.0.1:8083/public/login/?next=%2Frestrict%2Fanalise-multicriterio%2Fcentral-julgamentos');
    await page.locator('[name=login]').fill(credential('Username'));
    await page.locator('[name=senha]').fill(credential('Senha inicial'));
    await page.getByRole('button',{name:'Entrar',exact:true}).click();
    await page.waitForURL('**/restrict/**');
    authenticated=true;
    const errors=[], env='39b5c763-d15a-460b-b58e-d65b57871c57';
    const round={
      id:env,status:'ativa',token:'token-email',hierarquizacao_id:'h1',hierarquizacao_nome:'Análise de teste',
      hierarquizacao_codigo:'H1',atualizadoEm:'2026-10-19T12:00:00+00:00',
      valido_ate:'2035-12-31T23:59:59-03:00',criterios:[{nome:'Critério A'},{nome:'Critério B'}],
      n_criterios:2,url_publica:'https://example.com/sicard/public/analise-multicriterio/formulario-comparacao-pareada/token-email/',
      email_remetente_alias:'SICARD-PLI',email_assunto:'Convite institucional',email_config_persistida:true,
      email_mensagem:'Olá, colaborador(a)!\n\nCritérios a comparar (2):\n1. Critério A\n2. Critério B\n\nhttps://example.com/sicard/public/analise-multicriterio/formulario-comparacao-pareada/token-email/\n\nEquipe SICARD/SLT',
      convites:[{nome:'Ana',email:'ana@example.com'},{nome:'Bia',email:'bia@example.com'}]
    };
    let rows=[], sends=[], patches=[], collections=0, pendingRelease, failCollection=false;
    page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/api/**',async route=>{
      const req=route.request(), path=new URL(req.url()).pathname;
      if(path==='/api/auth/me') return route.fulfill({json:{id:'gestor-teste',username:'gestor.teste',nome:'Gestor de teste',tipo_usuario:'GESTOR',perfil_nome:'Gestor',permissoes:{'area_restrita.visualizar':true,'mad.visualizar':true,'mad.operar':true}}});
      if(path.startsWith('/api/auth/')) return route.fallback();
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
          dsn_solicitada:false,detalhe:payload.destinatario.startsWith('ana')?'Aceito pelo servidor de envio.':'Confira o recebimento antes de reenviar.'
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
      if(path.endsWith('/emails/configuracao')) return route.fulfill({json:{conta_autenticacao:'conta-servico@example.com'}});
      if(path.endsWith('/emails/monitoramento')) return route.fulfill({json:{
        registros:rows,confirmacoes_configuradas:true,
        colaboradores:round.convites.map(c=>({...c,resposta_recebida:false,
          etapa_codigo:'convite_enviado',etapa_rotulo:'Convite enviado'}))
      }});
      if(path==='/api/ahp/comparacao-colaborativa/ambientes') return route.fulfill({json:[round]});
      return route.fulfill({json:[]});
    });
    const currentUrl=round.url_publica;
    for(const publicUrl of [
      'https://example.com/sicard/public/analise-multicriterio/token-email/',
      '/sicard/public/analise-multicriterio/formulario-comparacao-pareada/token-email/'
    ]){
      round.url_publica=publicUrl;
      round.email_mensagem=round.email_mensagem.replace(/https?:\/\/[^\s]+|\/sicard\/public\/[^\s]+/,new URL(publicUrl,'http://127.0.0.1:8083').href);
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
    round.email_mensagem=round.email_mensagem.replace(/https?:\/\/[^\s]+/,currentUrl);
    await page.goto('http://127.0.0.1:8083/restrict/analise-multicriterio/central-julgamentos');
    await page.locator(`[data-select-id="${env}"]`).check();
    await page.locator('#ami-judgments-view-action').click();
    await page.waitForFunction(()=>!document.getElementById('ami-open-mail').disabled);
    assert.match(await page.locator('#ami-email-draft-card > .ahp-section-label').textContent(),/Convites e acompanhamento/);
    assert.equal(await page.locator('#ami-email-draft-card .ahp-subsection-title').count(),2);
    assert.equal(await page.locator('#ami-email-sender-alias').inputValue(),'SICARD-PLI');
    assert.equal(await page.locator('#ami-email-sender-address').inputValue(),'conta-servico@example.com');
    assert.equal(await page.locator('#ami-email-sender-address').getAttribute('readonly'),'');
    assert.equal(await page.locator('#ami-email-subject').inputValue(),'Convite institucional');
    assert.deepEqual(await page.locator('.ami-email-header-fields input').evaluateAll(inputs=>inputs.map(input=>input.id)),[
      'ami-email-sender-address','ami-email-sender-alias','ami-email-subject'
    ]);
    const headerBoxes=await page.locator('.ami-email-header-fields input').evaluateAll(inputs=>inputs.map(input=>input.getBoundingClientRect().toJSON()));
    assert.ok(Math.max(...headerBoxes.map(box=>box.y))-Math.min(...headerBoxes.map(box=>box.y))<2,'Remetente, alias e assunto devem ficar na mesma linha');
    const geometry=await page.locator('.ami-email-content-grid').evaluate(grid=>{
      const box=selector=>grid.querySelector(selector).getBoundingClientRect().toJSON();
      const style=selector=>{const computed=getComputedStyle(grid.querySelector(selector));return {radius:computed.borderRadius,background:computed.backgroundColor};};
      return {messageField:box('.ami-email-message-field'),previewField:box('.ami-email-preview-field'),editor:box('.ami-email-editor-container'),preview:box('#ami-email-institutional-preview'),messageLabel:box('#ami-email-template-label'),previewLabel:box('#ami-email-preview-field-label'),editorStyle:style('.ami-email-editor-container'),previewStyle:style('#ami-email-institutional-preview'),messageLabelStyle:style('#ami-email-template-label'),previewLabelStyle:style('#ami-email-preview-field-label')};
    });
    assert.ok(geometry.messageField.x+geometry.messageField.width<=geometry.previewField.x+1,'Mensagem deve ficar ao lado da prévia institucional');
    assert.ok(Math.abs(geometry.messageField.height-geometry.previewField.height)<2,'As duas colunas devem ter a mesma altura');
    assert.ok(Math.abs(geometry.editor.y-geometry.preview.y)<2 && Math.abs(geometry.editor.height-geometry.preview.height)<2,'Os dois contêineres devem começar juntos e ter a mesma altura');
    assert.ok(Math.abs(geometry.messageLabel.y-geometry.previewLabel.y)<2 && Math.abs(geometry.messageLabel.height-geometry.previewLabel.height)<2,'Os títulos externos devem ficar alinhados');
    assert.deepEqual(geometry.editorStyle,geometry.previewStyle,'O arredondamento e o fundo devem repetir o contêiner de edição');
    assert.deepEqual(geometry.messageLabelStyle,geometry.previewLabelStyle,'Os títulos devem preservar o mesmo padrão visual existente');
    assert.equal(geometry.previewStyle.radius,'6px');
    assert.equal(await page.locator('[data-ami-email-form-link]').count(),2);
    assert.deepEqual(await page.locator('[data-ami-email-form-link]').evaluateAll(links=>links.map(link=>link.href)),[currentUrl,currentUrl]);
    assert.equal(await page.locator('.ami-email-content-grid > #ami-email-link-row').count(),0,'O link não pode ficar solto abaixo do editor');
    assert.match(await page.locator('#ami-email-preview-help').innerText(),/prévia institucional usada pelo serviço de envio/i);
    const previewFonts=await page.evaluate(()=>{
      const selectors={
        subsection:'#ami-email-draft-card .ahp-subsection-title',
        previewTitle:'.ami-email-preview-title',previewBody:'.ami-email-preview-body',
        previewMessage:'#ami-email-preview-message',previewStrong:'.ami-email-preview-body strong',
        previewCode:'#ami-email-preview-token',previewButton:'#ami-email-preview-button',
        fieldLabel:'#ami-email-template-label',fieldText:'#ami-email-template'
      };
      return Object.fromEntries(Object.entries(selectors).map(([name,selector])=>{
        const style=getComputedStyle(document.querySelector(selector));
        return [name,{fontFamily:style.fontFamily,fontSize:style.fontSize,fontWeight:style.fontWeight,lineHeight:style.lineHeight,letterSpacing:style.letterSpacing}];
      }));
    });
    for(const key of ['fontFamily','fontSize','fontWeight','letterSpacing']){
      assert.equal(previewFonts.previewTitle[key],previewFonts.subsection[key],'O cabeçalho da prévia deve repetir a tipografia computada das subseções da Central');
    }
    assert.equal(previewFonts.previewTitle.lineHeight,'16.8px','O cabeçalho da prévia deve usar a altura de linha efetiva da Central em produção');
    for(const key of ['previewBody','previewMessage','previewStrong','previewCode','previewButton']){
      assert.equal(previewFonts[key].fontSize,previewFonts.fieldText.fontSize,'A prévia deve respeitar a escala tipográfica compacta da Central');
    }
    assert.equal(await page.locator('#ami-email-preview-button').innerText(),'Acessar formulário colaborativo');
    await page.locator('#ami-email-sender-alias').fill('Equipe PLI');
    await page.locator('#ami-email-subject').fill('Assunto alterado');
    await page.locator('#ami-email-template').fill((await page.locator('#ami-email-template').inputValue()).replace('Olá, colaborador(a)!','Mensagem persistida.'));
    assert.equal(await page.locator('#ami-save-email-config').isDisabled(),false);
    await page.locator('#ami-save-email-config').click();
    await page.waitForFunction(()=>document.getElementById('ami-save-email-config').disabled);
    assert.equal(patches.length,1);
    assert.equal(patches[0].email_remetente_alias,'Equipe PLI');
    assert.equal(patches[0].email_assunto,'Assunto alterado');
    assert.match(patches[0].email_mensagem,/Mensagem persistida/);
    patches=[];
    assert.equal(await page.locator('#ami-create-status .ami-status-card').count(),3);
    const statusBox=await page.locator('#ami-create-status').boundingBox();
    const formBox=await page.locator('#ami-interactive-analysis-component').boundingBox();
    assert.ok(statusBox.y+statusBox.height<=formBox.y);
    await page.locator('#ami-monitor-filter-coluna').selectOption('1');
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
    assert.deepEqual({...visual.header,height:0},{...visual.refHeader,height:0});
    assert.ok(visual.header.height>=32);
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
    assert.equal(Object.hasOwn(sends[0],'texto'),false);
    assert.equal(Object.hasOwn(sends[1],'texto'),false);
    assert.equal(sends[0].versao,round.atualizadoEm);
    assert.equal(sends[0].destinatario,'ana@example.com');
    assert.equal(sends[1].destinatario,'bia@example.com');
    assert.match(await page.locator('#ami-email-deliveries').textContent(),/Na fila/);
    assert.match(await page.locator('#ami-email-deliveries').textContent(),/Aguardando resposta/);
    await page.locator('#pfsStatusOverlay .pfs-box.pfs-active .pfs-close').click();
    await page.locator('#ami-email-receipts').click();
    await page.waitForFunction(()=>!document.querySelector('.ami-main').inert);
    assert.equal(collections,1);
    assert.equal(sends.length,2);
    await page.locator('#pfsSuccessOk').click();
    await page.locator('#ami-email-deliveries tr', {hasText:'ana@example.com'}).locator('.ami-cell-link').first().click();
    assert.match(await page.locator('#ami-email-history-body').textContent(),/Data não informada/);
    await page.locator('#ami-email-history-body tr').first().locator('.ami-detail-cell').click();
    assert.equal(await page.locator('#ami-email-detail-modal').isVisible(),true);
    assert.match(await page.locator('#ami-email-detail-texto').textContent(),/Enviado\. Aceito pelo servidor de envio/);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#ami-email-detail-modal').isVisible(),false);
    assert.equal(await page.locator('#ami-email-history-modal').isVisible(),true);
    await page.locator('#ami-email-history-close').click();
    await page.reload();
    await page.locator(`[data-select-id="${env}"]`).check();
    await page.locator('#ami-judgments-view-action').click();
    await page.waitForFunction(()=>!document.getElementById('ami-open-mail').disabled);
    await page.locator('#ami-email-deliveries tr', {hasText:'ana@example.com'}).locator('.ami-cell-link').first().click();
    assert.match(await page.locator('#ami-email-history-body').textContent(),/Data não informada/);
    await page.locator('#ami-email-history-close').click();
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
    rows=[
      {id:'aceito-ana',destinatario:'ana@example.com',envio_status:'aceito_smtp',entrega_status:'sem_confirmacao',leitura_status:'sem_confirmacao',criado_em:'2026-10-19T18:00:00Z',detalhe:'Aceito pelo servidor de envio.'},
      {id:'falha-bia',destinatario:'bia@example.com',envio_status:'falha',entrega_status:'sem_confirmacao',leitura_status:'sem_confirmacao',criado_em:'2026-10-19T18:00:03Z',detalhe:'O servidor de email recusou o destinatário. Confira o endereço informado.'}
    ];
    await page.reload();
    await page.locator(`[data-select-id="${env}"]`).check();
    await page.locator('#ami-judgments-view-action').click();
    await page.waitForFunction(()=>!document.getElementById('ami-open-mail').disabled);
    assert.equal((await page.locator('#ami-open-mail').innerText()).trim(),'Enviar aos pendentes (1)');
    await page.locator('#ami-open-mail').click();
    assert.match(await page.locator('#pfsConfirmMessage').innerText(),/1 colaborador/);
    await page.locator('#pfsConfirmOk').click();
    await page.waitForFunction(()=>!document.querySelector('.ami-main').inert);
    assert.equal(sends.length,5);
    assert.equal(sends[4].destinatario,'bia@example.com');
    assert.ok(sends[4].reenvio_id);
    assert.notEqual(sends[4].reenvio_id,sends[2].reenvio_id);
    await page.locator('#pfsStatusOverlay .pfs-box.pfs-active .pfs-close').click();
    assert.equal(await page.locator('#ami-monitor-send').isDisabled(),true);
    await page.locator('#ami-email-deliveries tr', {hasText:'ana@example.com'}).locator('input[type="checkbox"]').check();
    assert.equal(await page.locator('#ami-monitor-send').isDisabled(),true);
    assert.equal(sends.length,5);
    // Convite devolvido pelo servidor do destinatário volta a admitir envio aos selecionados.
    rows=[{id:'devolvido-ana',destinatario:'ana@example.com',envio_status:'aceito_smtp',entrega_status:'falha',leitura_status:'sem_confirmacao',criado_em:'2026-10-19T18:00:00Z',detalhe:'Devolvido: caixa inexistente.'}];
    await page.reload();
    await page.locator(`[data-select-id="${env}"]`).check();
    await page.locator('#ami-judgments-view-action').click();
    await page.waitForFunction(()=>!document.getElementById('ami-open-mail').disabled);
    assert.match(await page.locator('#ami-email-deliveries tr', {hasText:'ana@example.com'}).innerText(),/Devolvido/);
    await page.locator('#ami-email-deliveries tr', {hasText:'ana@example.com'}).locator('input[type="checkbox"]').check();
    assert.equal(await page.locator('#ami-monitor-send').isDisabled(),false,'Devolvido habilita o envio aos selecionados');
    rows=Array.from({length:18},(_,index)=>({id:'historico-'+index,destinatario:'ana@example.com',
      envio_status:'aceito_smtp',entrega_status:index%2?'confirmada':'sem_confirmacao'}));
    await page.reload();
    await page.locator(`[data-select-id="${env}"]`).check();
    await page.locator('#ami-judgments-view-action').click();
    await page.waitForFunction(()=>document.querySelectorAll('#ami-email-deliveries tr').length===2);
    await page.locator('#ami-monitor-select-all').check();
    assert.match(await page.locator('#ami-email-status-count').innerText(),/2 selecionados \/ 2 na página \/ 2 no total/);
    await page.locator('#ami-email-deliveries tr', {hasText:'ana@example.com'}).locator('.ami-cell-link').first().click();
    await page.locator('#ami-email-history-all').check();
    assert.match(await page.locator('#ami-email-history-count').innerText(),/18 selecionados \/ 15 na página \/ 18 no total/);
    await page.locator('#ami-email-history-pagination [aria-label="Próxima página"]').click();
    assert.equal(await page.locator('#ami-email-history-body input:checked').count(),3);
    await page.locator('#ami-email-history-filter-coluna').selectOption('0');
    await page.locator('#ami-email-history-filter-valor').selectOption('Data não informada');
    assert.equal(await page.locator('#ami-email-history-body tr').count(),9);
    assert.match(await page.locator('#ami-email-history-pagination').innerText(),/Página 1 de 1/);
    await page.locator('#ami-email-history-close').click();
    await page.locator('#ami-monitor-clear').click();
    assert.equal(await page.locator('#ami-email-deliveries input:checked').count(),0);
    assert.deepEqual(errors,[]);
    console.log('PASS: mensagem exata, dois envios individuais, confirmação SICARD, trava, envio parcial, coleta, persistência na recarga e bloqueio em edição.');
  } catch (error) {
    console.error(authenticated ? error : 'Falha de autenticação; detalhes omitidos.');
    process.exitCode=1;
  } finally { await browser.close(); }
})();
