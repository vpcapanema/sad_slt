const { chromium } = require('playwright');
const assert = require('node:assert/strict'), fs = require('node:fs'), http = require('node:http'), path = require('node:path');
const root = path.resolve(__dirname, '../..');
(async () => {
  const server = http.createServer((req, res) => {
    let name = new URL(req.url, 'http://local').pathname;
    if (name === '/') name = '/templates/componentes/_geoprocessamento.html';
    name = name.replace('/restrict/geoespacial/', '/geoespacial/');
    const file = path.join(root, name);
    if (!file.startsWith(root + path.sep)) return res.writeHead(403).end();
    fs.readFile(file, (err, data) => {
      if (err) return res.writeHead(404).end();
      res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html'); res.end(data);
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader', '--no-proxy-server'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } }), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/api/**', route => route.fulfill({ json: route.request().url().includes('/catalogo/projeto') ? { toolboxes: [] } : route.request().url().endsWith('/ambientes') ? {} : [] }));
    await page.goto(`http://127.0.0.1:${server.address().port}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.gpApp?.state.map && window.gpArquivos && window.gpModeler?.projectSnapshot);
    await page.evaluate(async()=>{
      const map=gpApp.state.map;
      await new Promise(resolve=>{map.once('style.load',resolve);map.setStyle({version:8,sources:{},layers:[]},{diff:false});});
      gpApp.adicionarCamadaGeoJsonEmMemoria('teste','Classes de teste',{type:'FeatureCollection',features:[{type:'Feature',properties:{classe:'Alta',indice:0.8},geometry:{type:'Point',coordinates:[-47,-23]}}]},{lote:true,estiloPreparado:true});
      gpApp.state.symbologyFieldsCache={teste:[{nome:'classe',numerico:false},{nome:'indice',numerico:true}]};
      gpApp.state.layerStyles.teste={renderer:{tipo:'categorizado',campo:'classe',corOutros:'#cccccc',categorias:[{valor:'Alta',rotulo:'Alta',cor:'#ff0000',contagem:1},{valor:'Baixa',rotulo:'Baixa',cor:'#0000ff',contagem:2}]}};
      gpApp.renderLayers();await gpApp.openSymbology('teste');
    });
    await page.locator('[data-sym-toggle-outros]').click();
    await page.waitForFunction(()=>!document.querySelector('#gp-layer-list').textContent.includes('Demais valores'));
    await page.locator('[data-sym-invert-values]').click();
    assert.deepEqual(await page.evaluate(()=>gpApp.state.symDraft.draft.renderer.categorias.map(c=>[c.valor,c.cor,c.contagem])),[['Baixa','#ff0000',2],['Alta','#0000ff',1]]);
    await page.locator('[data-sym-save]').click();
    await page.evaluate(()=>gpApp.openSymbology('teste'));
    assert.equal(await page.locator('[data-sym-outros]').count(),0,'Exclusão persiste após salvar');
    await page.locator('[data-sym-toggle-outros]').click();
    await page.waitForFunction(()=>document.querySelector('#gp-layer-list').textContent.includes('Demais valores'));
    await page.screenshot({path:path.join(root,'outputs/simbologia-controles.png')});
    await page.evaluate(async()=>{
      gpApp.state.layerStyles.teste={renderer:{tipo:'graduado',campo:'indice',min:0,max:1,quebras:[0.3,0.7],fatias:[{de:0,ate:0.3,cor:'#ff0000',rotulo:'Baixa'},{de:0.3,ate:0.7,cor:'#00ff00',rotulo:'Media'},{de:0.7,ate:1,cor:'#0000ff',rotulo:'Alta'}]}};
      await gpApp.openSymbology('teste');
    });
    await page.locator('[data-sym-invert-values]').click();
    const graduated=await page.evaluate(()=>({rows:gpApp.state.symDraft.draft.renderer.fatias.map(f=>[f.de,f.cor]),expression:gpApp.state.map.getPaintProperty('teste','fill-color')}));
    assert.deepEqual(graduated.rows,[[0.7,'#ff0000'],[0.3,'#00ff00'],[0,'#0000ff']]);
    assert.deepEqual(graduated.expression.slice(2),['#0000ff',0.3,'#00ff00',0.7,'#ff0000']);
    await page.locator('[data-sym-break]').first().fill('0.6');
    await page.locator('[data-sym-break]').first().dispatchEvent('change');
    assert.deepEqual(await page.evaluate(()=>gpApp.state.symDraft.draft.renderer.quebras),[0.3,0.6]);
    await page.locator('[data-sym-invert-values]').click();
    assert.deepEqual(await page.evaluate(()=>gpApp.state.symDraft.draft.renderer.fatias.map(f=>f.cor)),['#ff0000','#00ff00','#0000ff']);
    const cssPage=await browser.newPage();
    await cssPage.setContent('<main class="favorabilidade-v2 elegibilidade-v2"><div class="ev-preparacao-grid">'+['entrada','hier','grade','rede'].map(id=>`<ul id="fv-${id}-lista" class="ev-lista"><li>Primeiro</li><li>Segundo</li></ul>`).join('')+'</div></main>');
    await cssPage.addStyleTag({path:path.join(root,'assets/css/fase1-elegibilidade-v2.css')});
    await cssPage.addStyleTag({path:path.join(root,'assets/css/fase2-favorabilidade-v2.css')});
    const borders=await cssPage.locator('.ev-lista').evaluateAll(lists=>lists.map(list=>[getComputedStyle(list).borderTopWidth,getComputedStyle(list.children[1]).borderTopWidth]));
    assert.deepEqual(borders,Array(4).fill(['1px','1px']));
    assert.deepEqual(errors,[]);
    console.log('OK: excluir/restaurar legenda, inversão categorizada/graduada, edição de limites invertidos e bordas nas quatro listas');
  } finally { await browser.close(); server.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
