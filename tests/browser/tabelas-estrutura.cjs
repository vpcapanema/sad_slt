const {chromium} = require('playwright');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const base = process.env.SICARD_BASE_URL || 'http://127.0.0.1:8083';

(async () => {
  const browser = await chromium.launch({channel: 'msedge', headless: true});
  try {
    const width = Number(process.env.SICARD_TEST_WIDTH || 1440);
    const page = await browser.newPage({ignoreHTTPSErrors: true, viewport: {width, height: 1000}});
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    const credentials = fs.readFileSync('credencias_sigma_agentes.txt', 'utf8');
    const credential = key => credentials.match(new RegExp('^' + key + '\\s*[:=]\\s*(.+)$', 'mi'))[1].trim();
    await page.goto(base + '/public/login/');
    await page.locator('[name=login]').fill(credential('Username'));
    await page.locator('[name=senha]').fill(credential('Senha inicial'));
    await page.getByRole('button', {name: 'Entrar', exact: true}).click();
    await page.waitForURL(url => !url.pathname.includes('/login'));
    for (const route of (process.env.SICARD_TEST_ROUTES || 'analise-multicriterio/central-julgamentos,demandas,sei-documentos,hierarquizacao/fase-3,hierarquizacao/homologacao-ranking-publicacao,complementacao').split(',')) {
      await page.goto(base + '/restrict/' + route + (route.includes('central-julgamentos') ? '' : '/'));
      await page.waitForTimeout(4000);
      if (route === 'demandas') await page.waitForFunction(() => [...document.querySelectorAll('main table')].some(t => t.getBoundingClientRect().width && t.tBodies[0]?.rows.length), null, {timeout: 60000});
      const selector = page.locator('#fase-hierarquizacao, #complementacao-hierarquizacao');
      if (await selector.count()) {
        await page.waitForFunction(() => {
          const el = document.querySelector('#fase-hierarquizacao, #complementacao-hierarquizacao');
          return el.options.length > 1;
        }, null, {timeout: 30000});
        const options = await selector.locator('option').evaluateAll(es => es.filter(e => e.value).map(e => ({value:e.value, text:e.textContent.slice(0,60)})));
        console.log(JSON.stringify({route, options: options.slice(0, 3)}));
        if (options.length) { await selector.selectOption(options[0].value); await page.waitForTimeout(5000); }
      }
      console.log(JSON.stringify({route, url: page.url(), tables: await page.locator('main table').evaluateAll(tables => tables.map(t => ({
        cls:t.className, visible:!!t.getBoundingClientRect().width, rows:t.tBodies[0]?.rows.length,
        labels:[...t.closest('section,main').querySelectorAll('.sicard-table-label')].map(e=>e.textContent),
        filter:!!t.closest('.ami-filtered-table'), heading:t.dataset.tableHeading,
        buttons:t.closest('.ami-filtered-table')?.querySelectorAll('.cg-botao').length,
      })))}));
      if (route.includes('central-julgamentos')) {
        console.log('reference', await page.locator('main table:visible').first().evaluate(t => {
          const f = t.closest('.ami-filtered-table')?.querySelector('.admin-filter-bar');
          return {font:getComputedStyle(t.querySelector('th')).font, filterHeight:f && getComputedStyle(f).height};
        }));
        continue;
      }
      const tables = page.locator('main table:visible');
      for (let i = 0; i < await tables.count(); i++) {
        const table = tables.nth(i);
        const surface = table.locator('xpath=ancestor::*[contains(concat(" ", normalize-space(@class), " "), " ami-filtered-table ")][1]');
        const buttons = surface.locator('.cg-botao, .fase3-group-toggle');
        const count = await buttons.count();
        for (let mask = 0; mask < (1 << count); mask++) {
          for (let j = 0; j < count; j++) {
            const button = buttons.nth(j);
            const desired = Boolean(mask & (1 << j));
            if ((await button.getAttribute('aria-pressed') === 'true') !== desired) await button.evaluate(b=>b.click());
          }
          await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
          const failures = await table.evaluate(t => {
            const problems = [];
            for (const h of t.querySelectorAll('thead th')) {
              if (!h.getBoundingClientRect().width) continue;
              const cell = h.getBoundingClientRect();
              const lines = h.querySelectorAll('.smart-column-title > span');
              for (const line of lines) {
                const range = document.createRange();range.selectNodeContents(line);
                const r = range.getBoundingClientRect();
                if(r.width && (r.left < cell.left-1 || r.right > cell.right+1 || r.bottom > cell.bottom+1)) problems.push('clipped: '+h.textContent.trim()+' '+JSON.stringify({cell:cell.width,text:r.width,style:h.style.width,font:getComputedStyle(h).font,spacing:getComputedStyle(h).letterSpacing,label:line.textContent}));
              }
            }
            const surface=t.closest('.ami-filtered-table');
            if(surface.querySelector('.sicard-table-label,.ami-table-label')) problems.push('title inside surface');
            const filter=surface.querySelector('.admin-filter-bar');
            const controls=[...filter.querySelectorAll('select,button')].filter(e=>e.getBoundingClientRect().width);
            const centers=controls.map(e=>{const r=e.getBoundingClientRect();return (r.top+r.bottom)/2});
            if(Math.max(...centers)-Math.min(...centers)>2)problems.push('wrapped filters');
            for(const cell of t.querySelectorAll('th.col-select,th.cg-vazio,td.col-select')){
              if(!cell.getBoundingClientRect().width)continue;
              const bg=getComputedStyle(cell).backgroundColor;
              if(bg==='transparent'||/rgba\([^)]*,\s*0\)/.test(bg))problems.push('transparent selector');
            }
            for(const row of t.querySelectorAll('tbody tr[data-table-stripe]')){
              if(!row.getBoundingClientRect().width||row.querySelector('input:checked'))continue;
              const expected=row.dataset.tableStripe==='odd'?'rgb(255, 255, 255)':'rgb(237, 244, 248)';
              if([...row.cells].some(c=>c.getBoundingClientRect().width&&getComputedStyle(c).backgroundColor!==expected))problems.push('wrong stripe');
            }
            return [...new Set(problems)];
          });
          assert.deepEqual(failures, [], route+' table '+i+' combination '+mask);
        }
        console.log('PASS',route,'table',i,'combinations',1<<count);
      }
      if (process.env.SICARD_BROWSER_SCREENSHOTS) {
        fs.mkdirSync('outputs/table-layout', {recursive:true});
        await page.screenshot({path:'outputs/table-layout/'+route.replaceAll('/','-')+'-'+width+'.png', fullPage:true});
      }
    }
    console.log(JSON.stringify({errors}));
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
