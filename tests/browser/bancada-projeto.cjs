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
    await page.evaluate(async () => {
      const map = gpApp.state.map;
      await new Promise((resolve,reject) => { const timer=setTimeout(()=>reject(new Error('style timeout')),10000); map.once('style.load',()=>{clearTimeout(timer);resolve();}); map.setStyle({ version: 8, sources: {}, layers: [] },{diff:false}); });
      gpApp.adicionarCamadaGeoJsonEmMemoria('memoria', 'Camada local', { type: 'FeatureCollection', features: [{ type: 'Feature', properties: { nome: 'Teste' }, geometry: { type: 'Point', coordinates: [-47, -23] } }] }, { lote: true, estiloPreparado: true });
      map.setLayoutProperty('memoria', 'visibility', 'none');
      map.setPaintProperty('memoria-line', 'line-color', '#123456');
      gpApp.state.layerFilters = { memoria: 'nome = Teste' };
      gpApp.state.activeLayerId = 'memoria'; gpApp.renderLayers();
      map.jumpTo({ center: [-47.3, -23.4], zoom: 9.2, pitch: 15, bearing: 22 });
      localStorage.setItem('gp-environments', JSON.stringify({ crs: 'EPSG:5880', resolution: 25 }));
      window.fileWrites = {}; window.pickCount = 0;
      window.showSaveFilePicker = async () => {
        const name = ++window.pickCount === 1 ? 'Primeiro.sicard.json' : 'Segundo.sicard.json';
        return { name, createWritable: async () => ({ write: async text => { window.fileWrites[name] = text; }, close: async () => {}, abort: async () => {} }) };
      };
    });
    assert.equal(await page.locator('.gp-ribbon-tabs button').first().innerText(), 'Arquivo');
    await page.locator('#gp-file-menu-button').click();
    await page.locator('[data-project-action="save"]').click();
    await page.waitForFunction(() => window.fileWrites['Primeiro.sicard.json']);
    await page.evaluate(() => gpProject.save());
    assert.equal(await page.evaluate(() => pickCount), 1, 'Salvar deve reutilizar o arquivo atual');
    await page.evaluate(() => gpProject.saveAs());
    assert.equal(await page.evaluate(() => pickCount), 2);
    const result = await page.evaluate(async () => {
      const saved = JSON.parse(fileWrites['Segundo.sicard.json']);
      gpApp.state.map.setPaintProperty('memoria-line', 'line-color', '#ffffff');
      gpApp.state.map.jumpTo({ center: [0, 0], zoom: 1 });
      await gpProject.restore(saved);
      const restored = await gpProject.snapshot();
      return { saved, restored };
    });
    assert.deepEqual(result.restored.style, result.saved.style);
    assert.deepEqual(result.restored.state.layers, result.saved.state.layers);
    assert.deepEqual(result.restored.camera, result.saved.camera);
    assert.deepEqual(result.restored.environments, result.saved.environments);
    assert.deepEqual(result.restored.state.layerFilters, result.saved.state.layerFilters);
    assert.equal(await page.evaluate(() => {
      const bad = JSON.parse(fileWrites['Segundo.sicard.json']); bad.state.layers[0].id = 'x"><img src=x onerror=alert(1)>';
      try { gpProject.validate(bad); return false; } catch { return true; }
    }), true);
    await page.evaluate(async () => {
      window.showSaveFilePicker = async () => { throw new DOMException('Cancelado', 'AbortError'); };
      await gpProject.saveAs();
      gpApp.state.map.setPaintProperty('memoria-line', 'line-color', '#abcdef');
      await gpProject.save();
    });
    assert.equal(await page.evaluate(() => JSON.parse(fileWrites['Segundo.sicard.json']).style.layers.find(l => l.id === 'memoria-line').paint['line-color']), '#abcdef', 'Cancelar Salvar como preserva arquivo ativo');
    const models = await page.evaluate(async () => {
      gpModeler.open('flow'); const saved=await gpProject.snapshot();
      await gpProject.restore(saved); return {before:saved.models,after:gpModeler.projectSnapshot()};
    });
    assert.deepEqual(models.after,models.before,'Modelos abertos preservados');
    await page.locator('[data-document-tab="mapa"]').click();
    await page.evaluate(async()=>{gpApp.state.layerFilters={};await gpApp.showAttributes('memoria');});
    await page.waitForFunction(()=>gpAttributeTable.projectSnapshot());
    await page.locator('[data-at-maximize]').click();
    const table=await page.evaluate(async()=>{const saved=await gpProject.snapshot();await gpProject.restore(saved);return {before:saved.ui.table,after:gpAttributeTable.projectSnapshot()};});
    assert.deepEqual(table.after,table.before,'Tabela aberta e configurações preservadas');
    await page.locator('[data-at-maximize]').click();
    await page.locator('#gp-file-menu-button').click();
    await page.locator('[data-project-action="new"]').click();
    await page.getByRole('button',{name:'Cancelar',exact:true}).click();
    assert.equal(await page.evaluate(()=>gpApp.state.layers.length),1,'Cancelar Novo mantém projeto');
    const originalFile=await page.evaluate(()=>fileWrites['Primeiro.sicard.json']);
    await page.evaluate(()=>{window.showOpenFilePicker=undefined;});
    await page.locator('#gp-file-menu-button').click();
    await page.locator('[data-project-action="open"]').click();
    await page.locator('#gp-project-file-input').setInputFiles({name:'Reaberto.sicard.json',mimeType:'application/json',buffer:Buffer.from(originalFile)});
    await page.getByRole('button',{name:'Não salvar',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('#gp-save-state').textContent==='Projeto aberto');
    assert.equal(await page.locator('#gp-project-name').innerText(),'Reaberto.sicard.json');
    assert.equal(await page.evaluate(()=>gpApp.state.map.getPaintProperty('memoria-line','line-color')),'#123456');
    const references=await page.evaluate(async()=>{
      const id='storage:base/trechos.gpkg::trechos',map=gpApp.state.map;
      const file={id,nome:'Trechos',arquivo:'base/trechos.gpkg',representacao:'tiles',revisao:'original',campos:[],feicoes:5};
      gpArquivos.sessions.set(id,file);
      gpApp.state.layers.push({id,nome:'Trechos',tipo:'vetorial',representacao:'tiles',destino:'storage_original'});
      map.addSource(id,{type:'vector',tiles:[location.origin+'/api/tiles/{z}/{x}/{y}.pbf']});
      map.addLayer({id,type:'line',source:id,'source-layer':'camada',layout:{visibility:'none'},paint:{'line-color':'#abc123'}});
      const saved=await gpProject.snapshot();await gpProject.restore(saved);
      const after=await gpProject.snapshot();
      const setStyle=map.setStyle.bind(map);let first=true;
      map.setStyle=(...args)=>{if(first){first=false;throw Error('Falha simulada');}return setStyle(...args);};
      let rejected=false;try{await gpProject.restore(saved);}catch{rejected=true;}finally{map.setStyle=setStyle;}
      return {saved:saved.sessions,after:after.sessions,source:after.style.sources[id],rejected,ids:gpApp.state.layers.map(l=>l.id)};
    });
    assert.deepEqual(references.after,references.saved,'Referências do storage preservadas');
    assert.equal(references.source.type,'vector');assert.equal(references.rejected,true);
    assert.deepEqual(references.ids,['memoria','storage:base/trechos.gpkg::trechos'],'Falha de abertura restaura estado anterior');
    await page.evaluate(()=>gpProject.restore(JSON.parse(fileWrites['Primeiro.sicard.json'])));
    let temporaryReads=0;
    await page.route('**/bancada-arquivos/local/*',route=>{
      temporaryReads++;const input=route.request().postDataJSON();
      return route.fulfill({json:{id:input.id,revisao:input.revisao,...(route.request().url().endsWith('/tabela')
        ?{linhas:[{id:'8',atributos:{nome:'Local'}}],total:1,has_more:false}
        :{type:'FeatureCollection',features:[{type:'Feature',id:'8',properties:{nome:'Local'},geometry:{type:'Point',coordinates:[-47,-23]}}]})}});
    });
    const embedded=await page.evaluate(async()=>{
      const id='local:'+'a'.repeat(32),token='b'.repeat(32),map=gpApp.state.map;
      gpArquivos.sessions.set(id,{id,nome:'Temporário',revisao:token,tiles_token:token,representacao:'tiles',origem_geometria:'local_temporaria',campo_fid_tile:'fid_original'});
      gpApp.state.layers.push({id,nome:'Temporário',tipo:'vetorial',destino:'arquivo_original',representacao:'tiles'});
      map.addSource(id,{type:'vector',tiles:[location.origin+'/api/temporary/'+token+'/{z}/{x}/{y}.pbf']});
      map.addLayer({id,type:'circle',source:id,'source-layer':'camada',layout:{visibility:'none'}});
      const saved=await gpProject.snapshot();await gpProject.restore(saved);const again=await gpProject.snapshot();
      return {source:saved.style.sources[id],session:again.sessions.find(s=>s.id===id),layer:saved.style.layers.find(l=>l.id===id)};
    });
    assert.equal(temporaryReads,2,'Camada temporária é incorporada uma vez, sem depender do token na reabertura');
    assert.equal(embedded.source.type,'geojson');assert.equal(embedded.source.data.features[0].properties.fid_original,'8');
    assert.equal(embedded.session.tiles_token,undefined);assert.equal(embedded.layer['source-layer'],undefined);
    await page.evaluate(()=>gpProject.restore(JSON.parse(fileWrites['Primeiro.sicard.json'])));
    await page.locator('#gp-file-menu-button').click();
    await page.screenshot({ path: path.join(root, 'outputs/bancada-menu-arquivo.png') });
    assert.deepEqual(errors, []);
    console.log('OK: menu, salvar, salvar como, cancelamento, roundtrip mapa/estado, arquivo inválido');
  } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
