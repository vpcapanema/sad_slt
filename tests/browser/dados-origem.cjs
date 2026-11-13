const {chromium} = require('playwright');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const base = process.env.SICARD_BASE_URL || 'http://127.0.0.1:8084';

(async () => {
  const browser = await chromium.launch({channel:'msedge', headless:true});
  try {
    const context = await browser.newContext({ignoreHTTPSErrors:true, viewport:{width:1440,height:1000}});
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const credentials=fs.readFileSync('credencias_sigma_agentes.txt','utf8');
    const credential=key=>credentials.match(new RegExp('^'+key+'\\s*[:=]\\s*(.+)$','mi'))[1].trim();
    await page.goto(base+'/public/login/');
    await page.locator('[name=login]').fill(credential('Username'));
    await page.locator('[name=senha]').fill(credential('Senha inicial'));
    await page.getByRole('button',{name:'Entrar',exact:true}).click();
    await page.waitForURL(url=>!url.pathname.includes('/login'));
    const sources = {};
    for(const [kind, endpoint] of [['projeto','demandas'],['programa','programas'],['plano','planos']]) {
      const response=await context.request.get(base+'/api/'+endpoint+'/internas');
      assert(response.ok()); sources[kind]=await response.json();
    }
    await page.goto(base+'/restrict/demandas/');
    for(const kind of ['projeto','programa','plano']) {
      await page.locator('#tipo-tabs [data-tipo="'+kind+'"]').click();
      await page.waitForFunction(kind=>{
        const table=document.querySelector('[data-demandas-table="'+kind+'"]');
        return !table.hidden && table.tBodies[0].rows.length>0;
      },kind,{timeout:60000});
      const table=page.locator('[data-demandas-table="'+kind+'"]');
      const fields=await page.evaluate(rows=>SLTDadosOrigem.columns(rows),sources[kind]);
      assert.equal(await table.locator('th[data-origin-key]').count(),fields.length);
      if(!fields.length){console.log('PASS',kind,'without imported data');continue;}
      const result=await table.evaluate((t, rows)=>{
        const headers=SLTTable.headers(t);
        for(const row of t.tBodies[0].rows){
          const record=rows.find(r=>r.id===row.dataset.codigo);
          for(const header of headers.filter(h=>h.dataset.originKey)){
            const path=JSON.parse(header.dataset.originKey);
            const expected=SLTDadosOrigem.text(SLTDadosOrigem.value(record.dados_origem,{path}));
            if(row.cells[header.cellIndex].textContent!==expected)return false;
          }
        }
        return true;
      },sources[kind]);
      assert.equal(result,true,'original cell values');
      const toggle=page.locator('.cg-botoes:visible [data-grupo=origem]');
      await toggle.click();
      assert.equal(await table.locator('th[data-origin-key]:visible').count(),0);
      await toggle.click();
      assert.equal(await table.locator('th[data-origin-key]:visible').count(),fields.length);
      const sample=sources[kind].find(r=>r.dados_origem?.campos?.COD_pSICARD);
      if(sample){
        const label=await page.locator('#filtro-coluna option').evaluateAll(es=>es.find(e=>e.textContent==='Origem — COD_pSICARD')?.value);
        await page.locator('#filtro-coluna').selectOption(label);
        await page.locator('#filtro-valor').fill(String(sample.dados_origem.campos.COD_pSICARD));
        assert(await table.locator('tbody tr[data-codigo="'+sample.id+'"]').count());
        await page.locator('#filtro-limpar').click();
      }
      console.log('PASS',kind,fields.length,'origin columns, values, visibility and filtering');
    }
    const response=await context.request.get(base+'/api/painel/demandas/internas');
    assert(response.ok());const items=await response.json();
    await page.goto(base+'/restrict/painel/');
    await page.locator('.layer-group--record').first().waitFor({state:'attached',timeout:60000});
    for(const kind of ['programa','projeto']) {
      const item=items.find(d=>d.tipo===kind&&d.dados_origem);
      assert(item,'internal API must include source data');
      const record=page.locator('.layer-group--record[data-record-id="'+item.id+'"] .layer-group-header--record').first();
      await record.evaluate(button=>button.click());
      const details=page.locator('#painel-detail-popover .dados-origem-details');
      await details.waitFor({state:'visible'});
      const expected=await page.evaluate(origin=>SLTDadosOrigem.columns([{dados_origem:origin}]).map(f=>SLTDadosOrigem.text(SLTDadosOrigem.value(origin,f))),item.dados_origem);
      assert.deepEqual(await details.locator('dd').allTextContents(),expected);
      const styles=await details.locator('dt').first().evaluate(e=>({font:getComputedStyle(e).fontSize,overflow:getComputedStyle(e.parentElement.parentElement).overflowWrap}));
      console.log('PASS',kind,'popup original values and existing presentation',styles);
    }
    const publicContext=await browser.newContext({ignoreHTTPSErrors:true});
    const publicResponse=await publicContext.request.get(base+'/api/painel/demandas');
    assert(publicResponse.ok());
    assert((await publicResponse.json()).every(item=>item.dados_origem==null));
    await publicContext.close();
    assert.deepEqual(errors,[]);
    console.log('PASS public panel excludes source data; no browser errors');
  } finally {await browser.close();}
})().catch(error=>{console.error(error.message);process.exitCode=1;});
