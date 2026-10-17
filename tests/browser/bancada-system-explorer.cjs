const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
(async()=>{
 const server=http.createServer((req,res)=>{
  let name=new URL(req.url,'http://local').pathname;
  if(name==='/')name='/templates/componentes/_geoprocessamento.html';
  name=name.replace('/restrict/geoespacial/','/geoespacial/');
  const file=path.join(root,name);
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end();return;}res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'application/octet-stream');res.end(data);});
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try{
  browser=await chromium.launch({headless:true,...(process.env.PW_CHROMIUM?{executablePath:process.env.PW_CHROMIUM}:{}),args:['--no-sandbox','--no-proxy-server','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
  const page=await browser.newPage({viewport:{width:1600,height:1100}}),errors=[];
  page.on('pageerror',error=>errors.push(error.stack||error.message));
  const file={id:'storage:base-geoespacial/rios.gpkg',nome:'Rios',arquivo:'base-geoespacial/rios.gpkg',geometria_tipo:'LineString',tipo:'vetor'};
  const bankFile={id:'banco-rios',nome:'Rios cadastrados',tipo:'vetor'};
  let catalogRequests=0,inventoryRequests=0,releaseRoots,releaseCatalog,releaseInventory;
  const rootsReady=new Promise(resolve=>{releaseRoots=resolve;});
  const catalogReady=new Promise(resolve=>{releaseCatalog=resolve;});
  const inventoryReady=new Promise(resolve=>{releaseInventory=resolve;});
  await page.route('**/api/**',async route=>{
   const url=new URL(route.request().url()).pathname;
   if(url.includes('/bancada-arquivos/tiles/'))return route.fulfill({status:204,body:''});
   if(url.endsWith('/bancada-arquivos/preparar'))return route.fulfill({json:{...file,revisao:'a'.repeat(64),campos:[],bounds:[-46,-23,-45,-22],feicoes:1}});
   if(url.endsWith('/storage/camadas-arquivo')){inventoryRequests++;await inventoryReady;return route.fulfill({json:{camadas:[file]}});}
   if(url.endsWith('/extracao-atributos/catalogo')){catalogRequests++;await catalogReady;return route.fulfill({json:{camadas:[file,bankFile]}});}
   if(url.endsWith('/storage/pastas')){await rootsReady;return route.fulfill({json:{caminho:'',pastas:[{nome:'base-geoespacial',caminho:'base-geoespacial',raiz:true},{nome:'superficies-indices',caminho:'superficies-indices',raiz:true}],arquivos:[]}});}
   if(url.endsWith('/storage/navegar')){const path=new URL(route.request().url()).searchParams.get('caminho');return route.fulfill({json:{caminho:path,pai:null,pastas:[],arquivos:path==='superficies-indices'?[{id:'storage:superficies-indices/indice.gpkg',nome:'indice',arquivo:'superficies-indices/indice.gpkg',formato:'GPKG'}]:[{...file,inventariar:true}]}});}
   if(url.endsWith('/catalogo/projeto'))return route.fulfill({json:{toolboxes:[]}});
   if(url.endsWith('/camadas'))return route.fulfill({json:[]});
   return route.fulfill({json:{}});
  });
  await page.goto(`http://127.0.0.1:${server.address().port}/`,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.gpApp?.state.map?.isStyleLoaded()&&window.gpArquivos);
  await page.locator('[data-action="load-system"]').click();
  await page.locator('#gp-system-load-form').waitFor();
  assert.equal(await page.locator('#gp-system-layer-name').inputValue(),'');
  assert.equal(await page.locator('#gp-system-load-form button[type="submit"]').innerText(),'Carregar camada');
  assert.equal(await page.locator('#gp-system-load-form button[type="submit"]').isDisabled(),true);
  await page.evaluate(()=>{
   document.querySelector('[data-select-system-layer]').addEventListener('click',()=>{
    const start=performance.now();
    const observer=new MutationObserver(()=>{
     if(document.querySelector('dialog.ea-storage-dialog[open]')){window.pickerOpenMs=performance.now()-start;observer.disconnect();}
    });
    observer.observe(document.body,{childList:true});
   },{capture:true,once:true});
  });
  await page.locator('[data-select-system-layer]').click();
  await page.locator('dialog.ea-storage-dialog[open]').waitFor({timeout:1000});
  const openMs=await page.evaluate(()=>window.pickerOpenMs);
  assert.equal(typeof openMs,'number','O modal deve abrir sem aguardar rede');
  assert.ok(openMs<250,`Abertura do modal demorou ${openMs} ms`);
  assert.equal(catalogRequests,0,'Abrir o explorador não deve consultar o catálogo');
  assert.equal(await page.locator('.ea-storage-list').getAttribute('aria-busy'),'true');
  releaseRoots();
  await page.locator('.ea-storage-entry--folder').first().waitFor();
  assert.equal(await page.locator('#gp-editor-view .ea-storage-inline').count(),0);
  assert.equal(await page.locator('#gp-editor-view dialog').count(),0);
  assert.equal(await page.locator('body > dialog.ea-storage-dialog[open]').count(),1);
  assert.deepEqual(await page.locator('.ea-storage-entry--folder .ea-storage-entry-name').allTextContents(),['Bases geoespaciais','Superfícies e índices']);
  assert.equal(await page.locator('#gp-editor-view .gp-feedback-panel').count(),0);
  assert.match(await page.locator('#gp-right-title').innerText(),/Carregar do sistema/);
  assert.match(await page.locator('.ea-storage-status').innerText(),/storage geoespacial|Pasta|camada/i);
  await Promise.all([
   page.waitForRequest('**/extracao-atributos/catalogo'),
   page.locator('.ea-storage-tree-open').filter({hasText:'Camadas cadastradas no banco'}).click(),
  ]);
  assert.equal(catalogRequests,1);
  assert.equal(await page.locator('dialog.ea-storage-dialog[open]').isVisible(),true);
  releaseCatalog();
  await page.locator('.ea-storage-entry[data-file="banco-rios"]').waitFor();
  await page.locator('.ea-storage-tree-open').filter({hasText:'Camadas cadastradas no banco'}).click();
  await page.locator('.ea-storage-entry[data-file="banco-rios"]').waitFor();
  assert.equal(catalogRequests,1,'O catálogo deve ser reutilizado durante a seleção');
  await page.locator('.ea-storage-tree-open').filter({hasText:'Storage geoespacial'}).click();
  await page.locator('.ea-storage-entry--folder').first().waitFor();
  await page.locator('.ea-storage-entry--folder').filter({hasText:'Superfícies e índices'}).click();
  await page.locator('.ea-storage-entry[data-file="storage:superficies-indices/indice.gpkg"]').waitFor();
  await page.locator('[aria-label="Subir um nível (Backspace)"]').click();
  await page.locator('.ea-storage-entry--folder').filter({hasText:'Bases geoespaciais'}).click();
  await page.locator('.ea-storage-entry[data-file]').click();
  await page.evaluate(()=>{
   document.querySelector('.ea-storage-confirm-button').addEventListener('click',()=>{
    const start=performance.now();
    const observer=new MutationObserver(()=>{
     if(!document.querySelector('dialog.ea-storage-dialog[open]')){window.pickerConfirmMs=performance.now()-start;observer.disconnect();}
    });
    observer.observe(document.body,{childList:true});
   },{capture:true,once:true});
  });
  await page.getByRole('button',{name:'Confirmar (1)'}).click();
  await page.locator('dialog.ea-storage-dialog[open]').waitFor({state:'detached',timeout:1000});
  const confirmMs=await page.evaluate(()=>window.pickerConfirmMs);
  assert.equal(typeof confirmMs,'number');
  assert.ok(confirmMs<250,`Confirmação demorou ${confirmMs} ms`);
  assert.equal(inventoryRequests,0,'Confirmar a seleção não deve ler o GeoPackage');
  await page.locator('#gp-system-load-form').waitFor();
  assert.equal(await page.locator('#gp-system-layer-name').inputValue(),'Rios');
  assert.equal(await page.locator('#gp-system-load-form button[type="submit"]').isDisabled(),false);
  assert.equal(await page.locator('#gp-system-load-form button[type="submit"]').innerText(),'Carregar camada');
  assert.equal(await page.locator('#gp-system-load-form button[type="submit"]').isVisible(),true);
  assert.equal(await page.evaluate(id=>window.gpApp.state.layers.some(layer=>layer.id===id),file.id),false);
  await page.locator('[data-select-system-layer]').click();
  await page.locator('dialog.ea-storage-dialog[open]').waitFor();
  await page.locator('dialog.ea-storage-dialog .ea-storage-window-controls [aria-label="Fechar"]').click();
  await page.locator('#gp-system-load-form').waitFor();
  assert.equal(await page.locator('#gp-system-layer-name').inputValue(),'Rios');
  assert.equal(await page.evaluate(id=>window.gpApp.state.layers.some(layer=>layer.id===id),file.id),false);
  await Promise.all([
   page.waitForRequest('**/storage/camadas-arquivo?*'),
   page.locator('#gp-system-load-form button[type="submit"]').click(),
  ]);
  assert.equal(inventoryRequests,1,'O inventário deve ocorrer somente ao carregar a camada');
  releaseInventory();
  await page.waitForFunction(id=>window.gpApp.state.layers.some(layer=>layer.id===id),file.id);
  assert.equal(inventoryRequests,1,'O mesmo arquivo não deve ser inventariado duas vezes');
  assert.match(await page.locator('#gp-system-load-form').innerText(),/1 camada\(s\) carregada\(s\) na bancada/);
  assert.equal(await page.locator('.gp-feedback-panel').count(),0);
  await page.evaluate(async layer=>{
   const {escolherArquivo}=await import('/restrict/geoespacial/extracao-atributos/explorador.js?v=20261016-immediate-system-confirm');
   window.preloadedPicker=escolherArquivo({catalog:[layer],title:'Catálogo já disponível',validar:false});
  },bankFile);
  await page.locator('dialog.ea-storage-dialog[open]').waitFor();
  await page.locator('.ea-storage-entry--folder').first().waitFor();
  await page.locator('.ea-storage-tree-open').filter({hasText:'Camadas cadastradas no banco'}).click();
  await page.locator('.ea-storage-entry[data-file="banco-rios"]').click();
  await page.getByRole('button',{name:'Confirmar',exact:true}).click();
  assert.deepEqual(await page.evaluate(()=>window.preloadedPicker),bankFile);
  assert.equal(catalogRequests,1,'Catálogo fornecido pelo chamador não deve fazer nova consulta');
  await page.evaluate(async()=>{
   const {escolherArquivo}=await import('/restrict/geoespacial/extracao-atributos/explorador.js?v=20261016-immediate-system-confirm');
   window.basePicker=escolherArquivo({catalog:[],title:'Selecionar camadas base',multiple:true,validar:false});
  });
  await page.locator('.ea-storage-entry--folder').filter({hasText:'Bases geoespaciais'}).click();
  await page.locator('.ea-storage-entry[data-file]').click();
  await page.getByRole('button',{name:'Confirmar (1)'}).click();
  await page.locator('dialog.ea-storage-dialog[open]').waitFor({state:'detached'});
  assert.deepEqual(await page.evaluate(()=>window.basePicker),[file]);
  assert.equal(inventoryRequests,2,'O fluxo padrão de bases deve continuar inventariando ao confirmar');
  const simbolos=await page.evaluate(()=>{
    const app=window.gpApp,original=app.state.layers,geometrias=app.state.geometryTypes;
    app.state.geometryTypes={'symbol-line':['Polygon']};
    app.state.layers=[
      {id:'symbol-point',nome:'Pontos',tipo:'vetorial',geometria_tipo:'MultiPoint'},
      {id:'symbol-line',nome:'Linhas',tipo:'vetorial',geometria_tipo:'MultiLineString'},
      {id:'symbol-polygon',nome:'Polígonos',tipo:'vetorial',geometria_tipo:'MultiPolygon'},
    ];
    app.renderLayers();
    const result=Object.fromEntries(app.state.layers.map(layer=>{
      const symbol=document.querySelector(`[data-layer="${layer.id}"] .layer-symbol`);
      return [layer.id,{className:symbol.className,title:symbol.title}];
    }));
    app.state.layers=original;app.state.geometryTypes=geometrias;app.renderLayers();
    return result;
  });
  assert.match(simbolos['symbol-point'].className,/\bpoint\b/);
  assert.equal(simbolos['symbol-point'].title,'Geometria vetorial do tipo ponto');
  assert.match(simbolos['symbol-line'].className,/\bline\b/);
  assert.equal(simbolos['symbol-line'].title,'Geometria vetorial do tipo linha');
  assert.match(simbolos['symbol-polygon'].className,/\bpoligon\b/);
  assert.equal(simbolos['symbol-polygon'].title,'Geometria vetorial do tipo polígono');
  await page.locator('#gp-editor-view [aria-label="Voltar às ferramentas"]').click();
  await page.waitForFunction(()=>document.querySelector('#gp-tools-view').classList.contains('active'));
  assert.deepEqual(errors,[]);
  console.log(`Bancada: modal em ${openMs.toFixed(1)} ms, confirmação em ${confirmMs.toFixed(1)} ms sem aguardar rede e inventário único ao carregar`);
 }finally{if(browser)await browser.close();server.close();}
})().catch(error=>{console.error(error);process.exit(1);});
