// O relatório reutiliza a apresentação pública e conserva seus recursos e controles.
const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const base = process.env.SICARD_BASE_URL || 'http://127.0.0.1:8083';
const output = '.git/favorabilidade-estilos';

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
      await page.goto(base+'/public/documentacao/processo-hierarquizacao/');
      await page.evaluate(()=>document.fonts.ready);
      const reference=await styles();
      const response=await page.goto(base+'/public/documentacao_favorabilidade_v2/');
      assert.equal(response.status(),200);
      await page.evaluate(()=>document.fonts.ready);
      await page.waitForFunction(()=>[...document.querySelectorAll('#favorabilidade-conteudo table')].every(t=>t.analysisControls));
      assert.deepEqual(await styles(),reference,width+'px: cores, tipografia e estrutura da referencia');
      const metrics=await page.evaluate(()=>({
        overflow:document.documentElement.scrollWidth>innerWidth,
        images:document.querySelectorAll('main img').length,
        math:document.querySelectorAll('main math').length,
        sections:document.querySelectorAll('.secao-relatorio').length,
        tables:document.querySelectorAll('.ami-report-table').length,
        rows:[...document.querySelectorAll('#favorabilidade-conteudo table')].reduce((n,t)=>n+t.analysisControls.rows.length,0),
        cells:[...document.querySelectorAll('#favorabilidade-conteudo table')].reduce((n,t)=>n+t.analysisControls.rows.reduce((m,r)=>m+r.cells.length-1,0),0),
        anchors:[...document.querySelectorAll('main a[href^="#"]')].filter(a=>!document.getElementById(a.hash.slice(1))).map(a=>a.hash),
        duplicateIds:[...document.querySelectorAll('[id]')].map(e=>e.id).filter((id,i,ids)=>ids.indexOf(id)!==i),
        controls:[...document.querySelectorAll('.ami-report-table')].every(host=>{
          const [surface,buttons,footer]=[host.querySelector('.ami-filtered-table'),host.querySelector('.standard-table-actions'),host.querySelector('.admin-table-footer')];
          return surface && buttons && footer && Boolean(surface.compareDocumentPosition(buttons)&Node.DOCUMENT_POSITION_FOLLOWING)
            && Boolean(buttons.compareDocumentPosition(footer)&Node.DOCUMENT_POSITION_FOLLOWING);
        })
      }));
      assert.deepEqual(metrics,{overflow:false,images:48,math:24,sections:10,tables:5,rows:68,cells:519,anchors:[],duplicateIds:[],controls:true});
      if([1440,390].includes(width))await page.screenshot({path:output+'/revisada-'+width+'.png'});
    }
    await page.setViewportSize({width:1440,height:1000});
    await page.goto(base+'/public/documentacao_favorabilidade_v2/');
    await page.waitForFunction(()=>document.querySelector('table').analysisControls);
    await page.locator('main img').evaluateAll(images=>images.forEach(image=>image.loading='eager'));
    await page.waitForFunction(()=>[...document.querySelectorAll('main img')].every(i=>i.complete),null,{timeout:60000});
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
    const paginatedIndex=await page.locator('#favorabilidade-conteudo table').evaluateAll(tables=>tables.findIndex(table=>table.analysisControls.rows.length>15));
    assert(paginatedIndex>=0);
    const paginated=page.locator('.ami-report-table').nth(paginatedIndex);
    await paginated.getByRole('button',{name:'Próxima página',exact:true}).click();
    assert.equal(await paginated.locator('table').evaluate(table=>table.analysisControls.page),2);
    await paginated.getByRole('button',{name:'Primeira página',exact:true}).click();
    assert.equal(await paginated.locator('table').evaluate(table=>table.analysisControls.page),1);
    await page.locator('#glossario-termo').fill('nenhumtopicoesperado');
    assert(await page.locator('#glossario-sem-resultados').isVisible());
    await page.locator('.glossario-busca button').click();
    assert.equal(await page.locator('.secao-relatorio:visible').count(),10);
    await page.locator('.glossario-indice a[href="#criterios"]').focus();
    await page.keyboard.press('Enter');
    assert.equal(new URL(page.url()).hash,'#criterios');
    assert.deepEqual(errors,[]);
    console.log('PASS favorabilidade V2: referencia em seis larguras, 48 mapas, 24 formulas, dados, filtros, selecao, exportacao e busca.');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
