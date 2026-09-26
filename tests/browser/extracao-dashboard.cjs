// Teste isolado: usa os componentes reais e o cálculo descritivo, nunca o banco.
const {chromium} = require('playwright');
const {spawn} = require('node:child_process');
const path = require('node:path');
const assert = require('node:assert/strict');

(async () => {
  const server = spawn(process.env.SICARD_TEST_PYTHON || 'python', [path.join(__dirname, 'extracao-dashboard-server.py')]);
  let browser;
  try {
    const port = await new Promise((resolve,reject) => {
      server.stdout.once('data', data => resolve(String(data).trim()));
      server.once('error', reject); server.once('exit', code => reject(new Error(`Servidor encerrou: ${code}`)));
      server.stderr.on('data', data => process.stderr.write(data));
    });
    browser = await chromium.launch({headless:true,args:['--no-sandbox']});
    const page = await browser.newPage({viewport:{width:1440,height:1100}}), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    // Nenhuma rede externa ou serviço da aplicação é necessário à fixture.
    await page.route('**/*.tile.openstreetmap.org/**', r => r.fulfill({status:200,contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jQ1kAAAAASUVORK5CYII=','base64')}));
    await page.goto(`http://127.0.0.1:${port}`);
    const readyFor = id => page.waitForFunction(id => { const p=document.querySelector(id);return !p.hidden&&!p.hasAttribute('aria-busy')&&!p.querySelector('[data-role="body"]').hidden;},id);
    const territorial=page.locator('#ea-panel-territorial');
    await readyFor('#ea-panel-territorial');
    assert.deepEqual(await territorial.locator('[data-kpi]').allTextContents(),['32','16','11','2']);
    await page.evaluate(()=>window.originalPanel=document.querySelector('#ea-panel-territorial'));
    await territorial.getByLabel('Camada de entrada',{exact:true}).selectOption('Ferrovias');await readyFor('#ea-panel-territorial');
    assert.equal(await territorial.locator('[data-role="layers"] h3').textContent(),'Ferrovias');
    assert.equal(await territorial.locator('[data-territorial-category="risco"] tbody tr').count(),2);
    assert.match(await territorial.locator('[data-territorial-category="risco"]').textContent(),/Inundação/);
    assert.match(await territorial.locator('[data-territorial-category="restricao"]').textContent(),/Área protegida/);
    assert.match(await territorial.locator('[data-territorial-category="risco"]').textContent(),/Contato na borda/);
    assert.match(await territorial.locator('[data-territorial-category="restricao"]').textContent(),/12 m² em comum/);
    await territorial.locator('[data-territorial-category="risco"] .ea-area-link').click();
    assert.match(await territorial.locator('[data-role="selection-attributes"]').textContent(),/Inundação/);
    await territorial.getByLabel('Categoria territorial').selectOption('restricao');await readyFor('#ea-panel-territorial');
    assert.equal(await territorial.locator('[data-territorial-category="risco"]').isVisible(),false);
    await territorial.getByRole('button',{name:'Limpar filtros',exact:true}).click();await readyFor('#ea-panel-territorial');
    await territorial.getByRole('button',{name:'Próxima',exact:true}).click();await readyFor('#ea-panel-territorial');
    assert.equal(await territorial.locator('[data-territorial-category="risco"] tbody tr').count(),7);
    assert.equal(await page.evaluate(()=>originalPanel===document.querySelector('#ea-panel-territorial')),true,'Estrutura HTML preservada');
    for(const width of [1440,768,390,320]){
      await page.setViewportSize({width,height:1000});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`Painel territorial sem transbordamento ${width}`);
      if(process.env.SICARD_TEST_SCREENSHOTS&&[1440,390].includes(width))await page.screenshot({path:path.join(process.env.SICARD_TEST_SCREENSHOTS,`territorial-${width}.png`),fullPage:true});
    }
    await page.locator('[data-view="explore"]').click();
    const ready=()=>readyFor('#ea-panel-atributos');
    const panel=page.locator('#ea-panel-atributos');
    await ready();
    const kpis = () => panel.locator('.ea-analytics-kpis strong').allTextContents();
    assert.deepEqual(await kpis(), ['33','34','33','1']);
    assert.equal(await panel.locator('.ea-analytics-card tbody tr').count(),25);
    assert.equal(await panel.locator('.ea-frequency-chart img').count(),0,'Fonte não pode inserir HTML');
    await page.getByRole('button',{name:'Próxima',exact:true}).click(); await ready();
    assert.equal(await panel.locator('.ea-analytics-card tbody tr').count(),9);
    assert.deepEqual(await kpis(), ['33','34','33','1'],'Paginação não altera os indicadores');
    await page.getByRole('button',{name:'Localizar',exact:true}).first().click();
    assert.equal(await panel.locator('.ea-analytics-selection h4').count(),1);
    assert.equal(await panel.locator('tr.is-selected').count(),1);
    await panel.getByLabel('Categoria',{exact:true}).selectOption('Ambiental'); await ready();
    assert.equal(await panel.locator('.ea-coverage-row').count(),2);
    await page.getByLabel('Atributo em análise').selectOption('valor'); await ready();
    assert.equal(await panel.locator('.ea-histogram-column').count(),10);
    assert.equal(await panel.locator('.ea-descriptive-stats dd').count(),4);
    await page.getByLabel('Atributo em análise').selectOption('classe'); await ready();
    await page.getByRole('button',{name:/Floresta:.*Filtrar/}).click(); await ready();
    assert.equal((await kpis())[1],'16');
    assert.equal(await panel.locator('.ea-frequency-chart .ea-chart-row').count(),1);
    await page.getByRole('button',{name:/Remover filtro de valor/}).click(); await ready();
    await page.getByLabel('Buscar nos atributos').fill('não existe');
    await page.getByLabel('Buscar nos atributos').press('Enter'); await ready();
    assert.equal((await kpis())[1],'0');
    assert.equal(await panel.locator('.ea-analytics-card tbody tr').count(),0);
    await page.getByRole('button',{name:'Limpar filtros',exact:true}).click(); await ready();
    for (const width of [1440,768,390,320]) {
      await page.setViewportSize({width,height:1000});
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),true,`Sem transbordamento em ${width}px`);
      if (process.env.SICARD_TEST_SCREENSHOTS && [1440,390].includes(width)) await page.screenshot({path:path.join(process.env.SICARD_TEST_SCREENSHOTS,`dashboard-${width}.png`),fullPage:true});
    }
    await page.locator('[data-view="summary"]').click();
    assert.equal(await panel.isVisible(),false);
    await page.locator('[data-view="explore"]').click(); await ready();
    await page.route('**/dashboard', r => r.fulfill({status:503,json:{detail:'Falha de teste'}}));
    await page.getByRole('button',{name:'Limpar filtros',exact:true}).click();
    await page.getByRole('alert').filter({hasText:'Falha de teste'}).waitFor();
    await page.unroute('**/dashboard');
    await page.getByRole('button',{name:'Tentar novamente',exact:true}).click(); await ready();
    // Respostas atrasadas não podem repovoar uma análise invalidada.
    await page.route('**/dashboard', async r => { await new Promise(resolve=>setTimeout(resolve,150)); try { await r.continue(); } catch {} });
    await page.getByRole('button',{name:'Limpar filtros',exact:true}).click();
    await page.evaluate(() => painel.clear());
    await page.waitForTimeout(300);
    assert.equal(await panel.isVisible(),false);
    assert.equal(errors.length,0,JSON.stringify(errors));
    console.log('PASS: dados completos, deduplicação, categorias, histogramas, filtros, paginação, mapa/tabela, vazio, erro/retry, invalidação e responsividade.');
  } finally { await browser?.close(); server.kill(); }
})().catch(error => {console.error(error);process.exit(1);});
