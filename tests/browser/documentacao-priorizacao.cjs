const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const base = process.env.SICARD_BASE_URL || 'http://127.0.0.1:8084';
const route = '/public/documentacao/priorizacao-atributos/';
const output = '.git/fase3-documentacao';

(async () => {
  fs.mkdirSync(output, {recursive:true});
  const browser = await chromium.launch({headless:true});
  try {
    const page = await browser.newPage({ignoreHTTPSErrors:true});
    const errors = []; page.on('pageerror',e=>errors.push(e.message));
    const selectors = ['body','.app-header','main','.standard-page-hero','.standard-page-hero__title',
      '.standard-page-hero__eyebrow','.standard-page-hero__description','.barra-lateral-glossario',
      '.glossario-busca','.glossario-indice summary','.glossario-grupo','.glossario-grupo h2','.glossario-entrada'];
    const styles = () => page.evaluate(selectors => Object.fromEntries(selectors.map(selector=>{
      const style=getComputedStyle(document.querySelector(selector));
      return [selector,Object.fromEntries(['fontFamily','fontSize','fontWeight','lineHeight','color','backgroundColor',
        'backgroundImage','padding','border','borderRadius','boxShadow','textAlign','width'].map(key=>[key,style[key]]))];
    })),selectors);
    for(const width of [1920,1440,1036,768,390,320]) {
      await page.setViewportSize({width,height:1000});
      await page.goto(base+'/public/documentacao_favorabilidade_v2/');
      await page.evaluate(()=>document.fonts.ready);
      const reference=await styles();
      const response=await page.goto(base+route);
      assert.equal(response.status(),200);
      await page.evaluate(()=>document.fonts.ready);
      await page.waitForFunction(()=>[...document.querySelectorAll('[data-documentacao-tabelas] table')].every(t=>t.analysisControls));
      assert.deepEqual(await styles(),reference,width+'px: cores, tipografia e estrutura da referencia');
      const metrics=await page.evaluate(()=>(
        {overflow:document.documentElement.scrollWidth>innerWidth,
        headings:document.querySelectorAll('h1').length,
        images:document.querySelectorAll('main img').length,
        math:document.querySelectorAll('main math').length,
        sections:document.querySelectorAll('.secao-priorizacao').length,
        tables:document.querySelectorAll('.ami-report-table').length,
        rows:[...document.querySelectorAll('[data-documentacao-tabelas] table')].reduce((n,t)=>n+t.analysisControls.rows.length,0),
        cells:[...document.querySelectorAll('[data-documentacao-tabelas] table')].reduce((n,t)=>n+t.analysisControls.rows.reduce((m,r)=>m+r.cells.length-1,0),0),
        anchors:[...document.querySelectorAll('main a[href^="#"]')].filter(a=>!document.getElementById(a.hash.slice(1))).map(a=>a.hash),
        duplicateIds:[...document.querySelectorAll('[id]')].map(e=>e.id).filter((id,i,ids)=>ids.indexOf(id)!==i),
        controls:[...document.querySelectorAll('.ami-report-table')].every(host=>{
          const [surface,buttons,footer]=[host.querySelector('.ami-filtered-table'),host.querySelector('.standard-table-actions'),host.querySelector('.admin-table-footer')];
          return surface && buttons && footer && Boolean(surface.compareDocumentPosition(buttons)&Node.DOCUMENT_POSITION_FOLLOWING)
            && Boolean(buttons.compareDocumentPosition(footer)&Node.DOCUMENT_POSITION_FOLLOWING);
        })}));
      assert.deepEqual(metrics,{overflow:false,headings:1,images:3,math:8,sections:12,tables:4,rows:14,cells:72,anchors:[],duplicateIds:[],controls:true});
      if([1440,390].includes(width)) {
        await page.screenshot({path:output+'/pagina-'+width+'.png'});
        await page.locator('#contexto').screenshot({path:output+'/contexto-'+width+'.png'});
        await page.locator('#normalizacao').screenshot({path:output+'/normalizacao-'+width+'.png'});
        await page.locator('.priorizacao-figura').first().screenshot({path:output+'/fluxo-'+width+'.png'});
      }
    }
    await page.setViewportSize({width:1440,height:1000});
    await page.goto(base+route);
    await page.waitForFunction(()=>document.querySelector('table').analysisControls);
    await page.locator('main img').evaluateAll(images=>images.forEach(image=>image.loading='eager'));
    await page.waitForFunction(()=>[...document.querySelectorAll('main img')].every(i=>i.complete));
    assert.equal(await page.locator('main img').evaluateAll(images=>images.filter(i=>i.naturalWidth===0).length),0);
    const host=page.locator('.ami-report-table').first();
    await host.locator('.admin-filter-bar select').first().selectOption('0');
    await host.locator('.admin-filter-bar select').nth(1).selectOption({index:1});
    assert.equal(await host.locator('table tbody tr').count(),1);
    await host.locator('table tbody input[type="checkbox"]').first().check();
    const downloadPromise=page.waitForEvent('download');
    await host.getByRole('button',{name:'Exportar selecionados'}).click();
    assert.equal((await downloadPromise).suggestedFilename(),'registros.csv');
    await host.getByRole('button',{name:'Limpar filtros'}).click();
    await host.getByRole('button',{name:'Limpar seleção',exact:true}).click();
    assert.equal(await host.locator('table tbody input:checked').count(),0);
    await page.locator('#glossario-termo').fill('nenhumtopicoesperado');
    assert(await page.locator('#glossario-sem-resultados').isVisible());
    await page.locator('.glossario-busca button').click();
    assert.equal(await page.locator('.secao-priorizacao:visible').count(),12);
    await page.locator('.glossario-indice a[href="#calculo"]').focus();
    await page.keyboard.press('Enter');
    assert.equal(new URL(page.url()).hash,'#calculo');
    const old='MODULO_FASE3_ATRIBUTOS_PROJETO_AJUSTE.md';
    for(const root of ['/public/documentacao/hierarquizacao/','/documentos/hierarquizacao/']) {
      assert.equal((await page.request.get(base+root+old)).status(),404);
      const redirected=await page.goto(base+root+'ESPINHA_DORSAL_SISTEMA_HIERARQUIZACAO.md');
      assert.equal(redirected.status(),200);
      assert(page.url().endsWith('/public/documentacao/processo-hierarquizacao/'));
    }
    await page.goto(base+'/public/documentacao/visao-geral/');
    assert.equal(await page.locator('main a[href$="'+route+'"]').count(),1);
    assert.equal(await page.locator('a[href$="'+old+'"]').count(),0);
    assert.deepEqual(errors,[]);
    console.log('PASS Fase 3: referencia visual em seis larguras, formulas, figuras, exemplos, busca, tabelas e retirada das rotas antigas.');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
