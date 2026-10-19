const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const {execFileSync,spawn}=require('node:child_process');
const root=path.resolve(__dirname,'../..');
const routes=['/restrict/hierarquizacao/fase-1/','/restrict/geoespacial/extracao-atributos/','/restrict/geoespacial/bancada/'];

(async()=>{
 const python=path.join(root,'.venv',process.platform==='win32'?'Scripts':'bin',process.platform==='win32'?'python.exe':'python');
 const rendered=JSON.parse(execFileSync(python,['-B','-X','utf8','-c',[
  'import json',
  'from fastapi.testclient import TestClient',
  'from api.server import app',
  `routes = ${JSON.stringify(routes)}`,
  'client = TestClient(app)',
  'pages = {}',
  'for route in routes:',
  '    response = client.get(route)',
  '    assert response.status_code == 200, (route, response.status_code)',
  '    pages[route] = response.text',
  'print(json.dumps(pages))',
 ].join('\n')],{cwd:root,encoding:'utf8'}));
 const server=http.createServer((req,res)=>{
  const pathname=new URL(req.url,'http://local').pathname;
  if(rendered[pathname]){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(rendered[pathname]);return;}
  const relative=pathname.replace(/^\/restrict\/geoespacial\//,'/geoespacial/').replace(/^\/restrict\/hierarquizacao\//,'/hierarquizacao/');
  const file=path.resolve(root,`.${relative}`);
  if(path.relative(root,file).startsWith('..')){res.writeHead(403).end();return;}
  fs.readFile(file,(error,data)=>{
   if(error){res.writeHead(404).end();return;}
   res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript; charset=utf-8':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'application/octet-stream');
   res.end(data);
  });
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base=`http://127.0.0.1:${server.address().port}`;
 let browser;
 try{
  browser=await chromium.launch({headless:true,channel:process.env.SICARD_TEST_BROWSER||(process.platform==='win32'?'msedge':undefined),args:['--no-proxy-server','--enable-unsafe-swiftshader']});
  const nojs=await browser.newContext({javaScriptEnabled:false});
  for(const route of routes.slice(0,2)){
   const page=await nojs.newPage();
   await page.route('https://**/*',request=>request.abort());
   await page.goto(base+route,{waitUntil:'domcontentloaded'});
   assert.equal(await page.locator('[data-preview-group]').count(),2,'Grupos fixos devem vir do HTML, sem JavaScript');
   assert.deepEqual(await page.locator('[data-preview-group] [role="group"]').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('aria-label'))),['Camadas de entrada','Camadas de base']);
   assert.equal(await page.locator('.ea-preview-empty').count(),2);
   assert.equal(await page.locator('[data-preview-value]').count(),40,'Toda a ficha de metadados deve existir no HTML');
   assert.deepEqual(await page.locator('.ea-preview-meta-group h5').allTextContents(),['Identificação','Identificação das demandas','Validação e uso','Conteúdo geoespacial','Sistema de coordenadas','Localização cadastral','Observações']);
   const toolbar=await page.locator('#ea-preview-map-tools-template').evaluate(template=>[...template.content.querySelectorAll('button')].map(button=>({name:button.getAttribute('aria-label'),icon:button.querySelector('i').className})));
   assert.deepEqual(toolbar.map(item=>item.name),['Ajustar às camadas','Zoom na camada','Tela cheia']);
   assert.ok(toolbar.every(item=>item.icon.startsWith('fas ')));
   await page.close();
  }
  await nojs.close();
  for(const route of routes.slice(0,2)){
   const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
   page.on('pageerror',error=>errors.push(error.message));
   await page.route('https://**/*',request=>request.abort());
   await page.route('**/api/**',request=>request.fulfill({json:[]}));
   await page.route('**/fase1-elegibilidade-v2.js*',request=>request.fulfill({body:'',contentType:'text/javascript'}));
   await page.route('**/extracao-atributos/app.js*',request=>request.fulfill({body:'',contentType:'text/javascript'}));
   await page.route('**/geoespacial/bancada/',request=>request.fulfill({body:'<!doctype html><title>Bancada</title>',contentType:'text/html'}));
   await page.goto(base+route,{waitUntil:'domcontentloaded'});
   await page.evaluate(async()=>{
    const {criarPrevia}=await import('/restrict/geoespacial/extracao-atributos/previa.js?v=20261018-html');
    window.previewState={busy:false,previaVisiveis:new Set()};
    window.previewItems=[];
    window.originalMetadata=document.querySelector('[data-preview-value="nome"]');
    window.originalRoot=document.querySelector('[data-preview-group="entrada"]');
    window.preview=criarPrevia(previewState,()=>{}, {obterCamadas:()=>previewItems});
    preview.render();
   });
   assert.equal(await page.locator('#ea-input-preview').isHidden(),true);
   const valid={id:'vetor',chave:'entrada:vetor',nome:'Trechos <img src=x onerror=alert(1)>',arquivo:'base/trechos.gpkg',grupo:'entrada',status_validacao:'valida',pendente:true,
    identificacao:{campo_id:'codigo',categoria_demanda:'Projeto'},
    metadados_local:{crs:'EPSG:4326',crs_nome:'WGS 84',unidade:'degree',tipos_geometria:['LineString'],feicoes:1,vertices:2,bytes:2048,bytes_descompactados:4096,componente:'trechos',formato:'GPKG',area_km2:1.25,comprimento_km:3.5,
     localizacao:{status:'consultado',ufs:['SP'],municipios:[{nm_mun:'São Paulo',cd_mun:'3550308',sigla_uf:'SP'}]}},
    geojson:{type:'FeatureCollection',features:[{type:'Feature',properties:{codigo:'A'},geometry:{type:'LineString',coordinates:[[-47,-23],[-46.8,-23.2]]}}]}};
   const raster={id:'raster',chave:'base:raster',nome:'Superfície',arquivo:'indices/risco.tif',grupo:'base',categoriaId:'risco',categoria:'Risco',tipo:'raster',status_validacao:'valida',
    metadados_local:{largura:10,altura:20,bandas:[{banda:1,tipo:'Float32',nodata:-1}],resolucao:[30,30]},geojson:valid.geojson};
   const invalid={id:'invalida',chave:'base:invalida',nome:'Inválida',grupo:'base',categoriaId:'restricao',categoria:'Restrição',status_validacao:'invalida',erro:'CRS não identificado'};
   await page.evaluate(items=>{window.previewItems=items;preview.render();},[valid,raster,invalid]);
   await page.locator('#ea-input-preview').scrollIntoViewIfNeeded();
   assert.equal(await page.locator('#ea-input-preview').isVisible(),true);
   assert.equal(await page.locator('.ea-preview-layer').count(),3);
   assert.equal(await page.locator('.ea-preview-map-tools button').count(),3);
   assert.equal(await page.locator('#ea-input-preview-layers img').count(),0,'Nomes são inseridos como texto, não HTML');
   assert.equal(await page.locator('[data-preview-value="nome"]').textContent(),valid.nome);
   assert.equal(await page.locator('[data-preview-value="tamanho"]').textContent(),'2 KB');
   assert.equal(await page.locator('[data-preview-value="demanda_id"]').textContent(),'codigo');
   assert.match(await page.locator('[data-preview-value="municipios"]').textContent(),/3550308/);
   assert.equal(await page.locator('[data-preview-metadata-condition="identificacao"]').isVisible(),true);
   assert.equal(await page.locator('[data-preview-value="dimensoes"]').isVisible(),false);
   const entry=page.getByRole('checkbox',{name:`Visibilidade no mapa: ${valid.nome}`,exact:true});
   await entry.uncheck();
   assert.equal(await page.locator('[data-preview-value="visibilidade"]').textContent(),'Não exibida no mapa');
   await entry.check();
   const baseToggle=page.locator('[data-preview-group="base"] > .ea-preview-tree-row > button');
   await baseToggle.click();
   assert.equal(await baseToggle.getAttribute('aria-expanded'),'false');
   await baseToggle.click();
   await page.locator('.ea-preview-layer[data-layer="base:raster"]').click();
   assert.equal(await page.locator('[data-preview-value="dimensoes"]').textContent(),'10 × 20 pixels');
   assert.equal(await page.locator('[data-preview-value="dimensoes"]').isVisible(),true);
   assert.equal(await page.locator('[data-preview-metadata-condition="identificacao"]').isVisible(),false);
   await page.locator('.ea-preview-layer[data-layer="base:invalida"]').click();
   assert.equal(await page.locator('[data-preview-value="validacao"]').textContent(),'Não validada');
   assert.equal(await page.locator('[data-preview-value="motivo"]').textContent(),'CRS não identificado');
   assert.equal(await page.getByRole('checkbox',{name:'Visibilidade no mapa: Inválida',exact:true}).isDisabled(),true);
   await page.locator('.ea-preview-layer[data-layer="entrada:vetor"]').click();
   await page.locator('[data-preview-map-action="fit"]').click();
   await page.locator('[data-preview-map-action="selected"]').click();
   await page.locator('[data-preview-map-action="fullscreen"]').click();
   await page.waitForFunction(()=>document.fullscreenElement?.id==='ea-input-preview');
   await page.locator('[data-preview-map-action="fullscreen"]').click();
   await page.waitForFunction(()=>!document.fullscreenElement);
   await page.evaluate(()=>{previewState.busy=true;preview.render();});
   assert.equal(await entry.isDisabled(),true);
   await page.evaluate(()=>{previewState.busy=false;window.previewItems=[];preview.render();});
   assert.equal(await page.locator('#ea-input-preview').isHidden(),true);
   assert.equal(await page.locator('[data-preview-value="nome"]').textContent(),'');
   await page.evaluate(item=>{window.previewItems=[item];preview.render();},valid);
   assert.equal(await page.evaluate(()=>document.querySelector('[data-preview-value="nome"]')===originalMetadata&&document.querySelector('[data-preview-group="entrada"]')===originalRoot),true,'Estrutura fixa não deve ser destruída ao atualizar ou limpar');
   assert.equal(await page.locator('.ea-preview-map-tools').count(),1);
   assert.equal(await page.locator('[data-preview-value="dimensoes"]').isVisible(),false);
   assert.equal(await page.locator('[data-preview-metadata-condition="identificacao"]').isVisible(),true);
   for(const width of [390,768,1440]){
    await page.setViewportSize({width,height:1000});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`Sem transbordamento em ${width}px`);
   }
   assert.deepEqual(errors,[]);
   await page.close();
  }
  console.log('OK: estrutura em HTML sem JavaScript, metadados e controles preservados, vetor/raster, seleção, visibilidade, limpeza e responsividade nas duas páginas.');
  await browser.close();browser=null;
  await new Promise((resolve,reject)=>{
   const child=spawn(process.execPath,[path.join(__dirname,'elegibilidade-v2.cjs')],{cwd:root,stdio:'inherit',env:{...process.env,SICARD_TEST_URL:base}});
   child.on('error',reject);
   child.on('exit',code=>code===0?resolve():reject(new Error(`Elegibilidade v2 terminou com código ${code}`)));
  });
 }finally{
  if(browser)await browser.close();
  server.closeAllConnections?.();
  await new Promise(resolve=>server.close(resolve));
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
