// Credencial ADMIN real; estados dos demais perfis são simulados somente no navegador.
// Nenhuma operação de negócio permitida é enviada ao servidor.
const {chromium} = require('playwright');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const base = process.env.SICARD_BASE_URL || 'http://127.0.0.1:8083';
const output = '.git/politica-perfis';
fs.mkdirSync(output, {recursive:true});

function contaAdmin() {
  const blocos = []; let atual = {};
  for (const line of fs.readFileSync('credencias_sigma_agentes.txt','utf8').split(/\r?\n/)) {
    const m = line.match(/^([^:]+):\s*(.+)$/); if (!m) continue;
    const key = m[1].trim().toLowerCase(), value = m[2].trim();
    if (key === 'username' && atual.username) {blocos.push(atual); atual = {};}
    atual[key] = value;
  }
  blocos.push(atual);
  const c = blocos.find(c => /_admin$/i.test(c.username || '') && (c['senha inicial'] || c.senha || c.password));
  assert(c, 'Credencial ADMIN ausente no arquivo local de agentes.');
  return {username:c.username, senha:c['senha inicial'] || c.senha || c.password, permanecer_conectado:false};
}

const all = keys => Object.fromEntries(keys.map(k=>[k,'todos']));
const politicas = {
  ADMIN: all(['area_restrita.visualizar','administracao.configurar','administracao.manter']),
  GESTOR: all(['mocad.visualizar','mocad.reverter_status_inline','mad.visualizar','mad.operar','ferramentas.visualizar','ferramentas.operar']),
  ANALISTA: all(['mocad.visualizar','mocad.analisar','mocad.cadastrar_demanda','mocad.cadastrar_lote','mocad.solicitar_complementacao','mocad.excluir','mad.visualizar','operador.visualizar','ferramentas.visualizar','ferramentas.operar']),
  OPERADOR: Object.fromEntries(['mocad.visualizar','mocad.cadastrar_demanda','operador.visualizar','operador.executar_acoes','solicitacao.cumprir'].map(k=>[k,'proprios'])),
  VISUALIZADOR: all(['area_restrita.visualizar']),
};

(async()=>{
  const browser = await chromium.launch({channel:'msedge',headless:true});
  const real = await browser.newContext({ignoreHTTPSErrors:true,viewport:{width:1440,height:1000}});
  const erros = [], resultados = [];
  try {
    const login = await real.request.post(base+'/api/auth/login',{data:contaAdmin()});
    assert.equal(login.status(),200,'Autenticação normal ADMIN deve funcionar.');
    const user = await (await real.request.get(base+'/api/auth/me')).json();
    assert.equal(user.tipo_usuario,'ADMIN');
    assert(!user.permissoes['mad.operar'] && !user.permissoes['mocad.analisar']);
    const page = await real.newPage();
    page.on('pageerror',e=>erros.push(e.message));
    await page.goto(base+'/restrict/demandas/');
    await page.waitForSelector('table[data-demandas-table="projeto"] .row-select',{timeout:60000});
    await page.waitForFunction(()=>SLTAdminAuth.currentUser?.permissoes);
    await page.locator('table[data-demandas-table="projeto"] .row-select').first().check();
    assert(await page.locator('#btn-bulk-edit').isDisabled());
    await page.locator('#btn-bulk-edit').click({force:true});
    await page.locator('#pfsErrorBox.pfs-active').waitFor();
    assert.match(await page.locator('[data-pfs="error-message"]').innerText(),/não possui a permissão|não autorizada/i);
    await page.evaluate(()=>StatusFeedback.fechar());
    // Mesmo um chamador que ignora o HTTP 403 encerra o progresso e informa a recusa.
    const status = await page.evaluate(async()=>{
      ProcessFeedback.iniciarCadastro('Teste de autorização', ['Verificar permissão']);
      const r = await fetch('/api/agrupamentos-demandas',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
      return r.status;
    });
    assert.equal(status,403);
    await page.locator('#pfsErrorBox.pfs-active').waitFor();
    assert.equal(await page.evaluate(()=>ProcessFeedback.atual._finalizado),true);
    assert.equal(await page.locator('#pfsSuccessBox').isVisible(),false);
    assert.match(await page.locator('[data-pfs="error-message"]').innerText(),/MAD/);
    await page.locator('#pfsErrorBox').evaluate(async el=>{await Promise.all(el.getAnimations().map(a=>a.finished));});
    assert.equal(await page.locator('#pfsErrorBox').evaluate(el=>getComputedStyle(el).opacity),'1');
    await page.locator('.admin-session-username,.admin-session-name').evaluateAll(items=>items.forEach(el=>el.textContent='Conta de teste'));
    await page.screenshot({path:output+'/admin-negativa.png',fullPage:true});
    await page.evaluate(()=>StatusFeedback.fechar());
    resultados.push({perfil:'ADMIN',autenticacao:'real',negativaExplicita:true});
    const estilo = await page.locator('#btn-bulk-edit').evaluate(el=>{
      const s=getComputedStyle(el); return {font:s.fontFamily,size:s.fontSize,width:s.width,height:s.height,radius:s.borderRadius};
    });
    await page.goto(base+'/restrict/analise-multicriterio/central-julgamentos');
    await page.waitForSelector('button.admin-icon-btn',{timeout:60000});
    const referencia = await page.locator('.ami-table-actions button.admin-icon-btn,.admin-actions button.admin-icon-btn').first().evaluate(el=>{
      const s=getComputedStyle(el); return {font:s.fontFamily,size:s.fontSize,width:s.width,height:s.height,radius:s.borderRadius};
    });
    // Mesma classe do componente oficial; a escala geral das páginas é preexistente.
    assert.equal(estilo.font,referencia.font); assert.equal(estilo.radius,referencia.radius);
    resultados.push({estilosTabela:estilo,estilosReferencia:referencia});

    for (const perfil of ['GESTOR','ANALISTA','VISUALIZADOR','OPERADOR']) {
      const context = await browser.newContext({ignoreHTTPSErrors:true,viewport:{width:1440,height:1000}});
      await context.addCookies(await real.cookies());
      await context.route('**/api/auth/me',route=>route.fulfill({json:{...user,nome:'Teste de interface',username:'teste_'+perfil.toLowerCase(),tipo_usuario:perfil,perfil_nome:perfil,permissoes:politicas[perfil]}}));
      await context.route('**/restrict/**',async route=>{
        if (!route.request().isNavigationRequest()) return route.fallback();
        const response=await route.fetch(); let html=await response.text();
        const policy=JSON.stringify({modulo:perfil==='OPERADOR'?'operador':'mocad',permissoes:politicas[perfil],perfil_nome:perfil}).replace(/"/g,'&#34;');
        html=html.replace(/data-policy="[^"]*"/,'data-policy="'+policy+'"');
        if (['GESTOR','ANALISTA'].includes(perfil)) html=html.replace(/<p id="access-mode-notice"[\s\S]*?<\/p>/,'');
        await route.fulfill({response,body:html});
      });
      // Toda escrita sintética é interceptada, inclusive se um teste regredir.
      await context.route('**/api/**',route=>['GET','HEAD'].includes(route.request().method()) ? route.fallback() : route.fulfill({status:403,json:{detail:'Ação não autorizada no ensaio de interface.'}}));
      const p=await context.newPage(); p.on('pageerror',e=>erros.push(e.message));
      await p.goto(base+(perfil==='OPERADOR'?'/restrict/operador/':'/restrict/demandas/'));
      await p.waitForFunction(perfil=>SLTAdminAuth.currentUser?.tipo_usuario===perfil,perfil,{timeout:60000});
      if (perfil!=='OPERADOR') {
        await p.waitForSelector('table[data-demandas-table="projeto"] .row-select',{timeout:60000});
        await p.locator('table[data-demandas-table="projeto"] .row-select').first().check();
        if (perfil==='VISUALIZADOR') {
          assert(await p.locator('#btn-bulk-edit').isDisabled());
          await p.locator('#btn-bulk-edit').click({force:true});
          await p.locator('#pfsErrorBox.pfs-active').waitFor();
          await p.evaluate(()=>StatusFeedback.fechar());
        } else {
          await p.locator('#btn-bulk-edit').click();
          const statusFields=await p.locator('[data-edit-field="status"]').count();
          assert.equal(statusFields,perfil==='GESTOR'?1:0);
          const outros=await p.locator('[data-edit-field]:not([data-edit-field="status"]):not([data-edit-field="justificativa_status"])').count();
          assert.equal(outros>0,perfil==='ANALISTA');
          if(perfil==='GESTOR') {
            const justificativa=p.locator('[data-edit-field="justificativa_status"]');
            assert.equal(await justificativa.count(),1);
            const campo=await justificativa.evaluate(el=>{
              const r=el.getBoundingClientRect(),cell=el.closest('td').getBoundingClientRect();
              return {width:r.width,height:r.height,display:getComputedStyle(el).display,dentroDaCelula:r.right<=cell.right && r.left>=cell.left};
            });
            assert(campo.width>=100 && campo.height>=18 && campo.dentroDaCelula, 'Justificativa deve ficar visível na tabela: '+JSON.stringify(campo));
            resultados.push({campoJustificativa:campo});
          }
        }
      }
      assert.equal(await p.evaluate(()=>SLTAdminAuth.can('mad.operar')),perfil==='GESTOR');
      assert.equal(await p.evaluate(()=>SLTAdminAuth.can('analyzeDemand')),perfil==='ANALISTA');
      await p.screenshot({path:output+'/'+perfil.toLowerCase()+'.png',fullPage:true});
      resultados.push({perfil,autenticacao:'interface simulada',controlesCorretos:true});
      await context.close();
    }
    assert.deepEqual(erros,[]);
    console.log(JSON.stringify({resultado:'PASS',testes:resultados}));
  } finally {
    await real.request.post(base+'/api/auth/logout').catch(()=>{});
    await browser.close();
  }
})().catch(e=>{console.error(e.message);process.exitCode=1;});
