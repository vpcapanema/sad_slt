const {chromium}=require('playwright');const fs=require('node:fs'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict');const {execFileSync}=require('node:child_process');
(async()=>{
 const html=execFileSync('.venv\\Scripts\\python.exe',['-X','utf8','-c',"from fastapi.testclient import TestClient;from api.server import app;r=TestClient(app).get('/restrict/geoespacial/explorador-camadas/');assert r.status_code==200;print(r.text)"],{encoding:'utf8'});
 const folder=(nome,fonte,caminho)=>({nome,fonte,caminho,pasta:true});
 const file={nome:'Camada teste',nome_arquivo:'teste.gpkg',id:'storage:base-geoespacial/pasta/teste.gpkg::rios',fonte:'storage',pasta:false,arquivo:'base-geoespacial/pasta/teste.gpkg',extensao:'GPKG',tamanho_bytes:2048,modificado_em:1728390000,geometria_tipo:'LineString',camada:'rios'};
 const many=Array.from({length:37},(_,i)=>({...file,id:`storage:camada-${i}.gpkg`,nome:`Camada ${String(i+1).padStart(2,'0')} com nome longo para testar rolagem horizontal`,nome_arquivo:`camada-${i}.gpkg`,extensao:i<20?'GPKG':'GEOJSON',geometria_tipo:i===36?null:'LineString',mapeavel:i!==36}));
 const auxiliary={...file,nome:'Auxiliar',extensao:'PRJ',geometria_tipo:null,camada:null,geometria_aplicavel:false,camada_aplicavel:false,mapeavel:false};
 const multiple={...file,geometria_tipo:'Multi Polygon; Point',camada:'municipios; sedes',geometria_aplicavel:true,camada_aplicavel:true,camadas:[{camada:'municipios',geometria_tipo:'Multi Polygon'},{camada:'sedes',geometria_tipo:'Point'}]};
 const metadataCases={
  folders:[folder('Subpasta','storage','base-geoespacial/subpasta')],
  demand:[{...file,fonte:'demandas',arquivo:'',geometria_tipo:'Polygon',camada:null,geometria_aplicavel:true,camada_aplicavel:false}],
  raster:[{...file,extensao:'TIF',geometria_tipo:'Raster',camada:null,geometria_aplicavel:true,camada_aplicavel:false}],
  auxiliary:[auxiliary],
  multiple:[multiple],
  mixed:[...Array.from({length:15},(_,i)=>({...auxiliary,nome:`Auxiliar ${i}`,id:`aux-${i}`})),multiple],
  broken:[{...file,geometria_tipo:null,camada:null,geometria_aplicavel:true,camada_aplicavel:true,metadados_erro:'Arquivo ilegível <script>window.bad=true</script>'}],
 };
 const requests=[];
 const server=http.createServer((req,res)=>{
  const u=new URL(req.url,'http://localhost');
  if(u.pathname==='/restrict/geoespacial/explorador-camadas/'){res.setHeader('Content-Type','text/html;charset=utf-8');res.end(html);return;}
  if(u.pathname.startsWith('/api/')){
   requests.push(u.pathname+u.search);let data=[];
   if(u.pathname.endsWith('/navegar')){const s=u.searchParams.get('fonte'),p=u.searchParams.get('caminho');
    data=!s?{itens:[folder('DEMANDAS','demandas',''),folder('SICARD Storage','storage',''),folder('Geometrias de saída','saidas','')]}:
     s==='storage'&&!p?{itens:[folder('Base-Geodatabase','storage','base-geodatabase'),folder('Base-Geoespacial','storage','base-geoespacial'),folder('Superfícies-Índice','storage','superficies-indices')]}:
     p==='base-geoespacial'?{itens:[folder('Pasta vetorial','storage','base-geoespacial/pasta'),file],folha:false}:p==='base-geoespacial/paginada'?{itens:many,folha:true}:p.startsWith('base-geoespacial/metadata-')?{itens:metadataCases[p.split('metadata-')[1]],folha:p!=='base-geoespacial/metadata-folders'}:{itens:[file],folha:true};
   }else if(u.pathname.endsWith('/detalhes'))data={arquivo:file.arquivo,crs:'EPSG:4674',camadas:[{nome:'rios',campo:'<script>window.bad=true</script>'}]};
   res.setHeader('Content-Type','application/json');res.end(JSON.stringify(data));return;
  }
  const relative=u.pathname.replace(/^\//,'').replace(/^restrict\/geoespacial\//,'geoespacial/'),target=path.resolve(relative);
  if(!target.startsWith(process.cwd()+path.sep)||!fs.existsSync(target)||!fs.statSync(target).isFile()){res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type',({'.css':'text/css','.js':'application/javascript','.png':'image/png','.woff2':'font/woff2'})[path.extname(target)]||'application/octet-stream');fs.createReadStream(target).pipe(res);
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1400,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('https://**/*',r=>r.abort());
  await page.goto(`http://127.0.0.1:${server.address().port}/restrict/geoespacial/explorador-camadas/`);
  await page.waitForSelector('.geo-explorer-card');assert.equal(await page.locator('.geo-explorer-card').count(),3);assert.deepEqual(await page.locator('.geo-explorer-card > span:not(.geo-explorer-folder-icon)').allTextContents(),['Demandas','SICARD Storage','Outputs']);assert.equal(await page.locator('#explorer-toolbar').isVisible(),false);
  await page.getByRole('button',{name:'SICARD Storage',exact:true}).click();await page.getByRole('button',{name:'Base-Geoespacial',exact:true}).click();
  await page.waitForSelector('tbody');assert.equal(await page.locator('#explorer-toolbar').isVisible(),true);
  assert.equal(await page.locator('#explorer-status').count(),0);
  assert.equal(await page.locator('#explorer-content').evaluate(e=>e.previousElementSibling.id),'explorer-filters');
  assert.equal(await page.locator('.notification-toast').count(),0);
  await page.getByRole('button',{name:'Ícones grandes',exact:true}).click();await page.waitForSelector('.geo-explorer-icons');
  await page.getByRole('button',{name:'Pasta Vetorial',exact:true}).click();await page.waitForSelector('tbody');
  assert.equal(await page.locator('[data-view=icons]').isDisabled(),true);assert.equal(await page.locator('th').nth(1).textContent(),'Ações');assert.match(await page.locator('tbody').textContent(),/GPKG/);assert.match(await page.locator('tbody').textContent(),/2 KB/);
  const mapHref=await page.getByRole('link',{name:'Visualizar Camada teste no mapa'}).getAttribute('href');assert.equal(new URL(mapHref,'http://localhost').searchParams.get('camada'),file.id);
  const download=await page.getByRole('link',{name:'Baixar Camada teste em ZIP'}).getAttribute('href');assert.equal(new URL(download,'http://localhost').searchParams.get('id'),file.id);
  await page.getByRole('button',{name:'Detalhes de Camada teste'}).click();await page.waitForSelector('#explorer-details pre');assert.match(await page.locator('#explorer-details-body').textContent(),/EPSG:4674/);assert.equal(await page.evaluate(()=>window.bad),undefined);
  await page.getByRole('button',{name:'Fechar',exact:true}).click();await page.locator('#explorer-search').fill('ausente');assert.match(await page.locator('#explorer-content').textContent(),/Nenhum item/);await page.locator('#explorer-search').fill('');
  await page.screenshot({path:'tmp/explorador-camadas-desktop.png',fullPage:true});
  await page.getByRole('button',{name:'Pasta acima',exact:true}).click();await page.waitForSelector('.geo-explorer-icons');
  await page.getByRole('button',{name:'Lista',exact:true}).click();await page.waitForSelector('.geo-explorer-list');
  await page.setViewportSize({width:390,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=390),true);await page.screenshot({path:'tmp/explorador-camadas-mobile.png',fullPage:true});assert.deepEqual(errors,[]);
  await page.setViewportSize({width:1400,height:1000});
  await page.goto(`http://127.0.0.1:${server.address().port}/restrict/geoespacial/explorador-camadas/?fonte=storage&caminho=base-geoespacial/paginada`);
  await page.waitForSelector('tbody input');
  assert.equal(await page.locator('tbody tr').count(),15);
  assert.equal(await page.locator('#explorer-pagination span').textContent(),'Página 1 de 3');
  assert.equal(await page.locator('#explorer-filters').evaluate(e=>e.previousElementSibling.id),'explorer-toolbar');
  assert.equal(await page.locator('#explorer-summary').textContent(),'0 selecionados / 15 na página / 37 no total');
  assert.equal(await page.getByRole('button',{name:'Detalhes do selecionado',exact:true}).isDisabled(),true);
  await page.getByRole('checkbox',{name:'Selecionar todas',exact:true}).check();
  assert.equal(await page.locator('#explorer-summary').textContent(),'15 selecionados / 15 na página / 37 no total');
  assert.equal(await page.getByRole('button',{name:'Detalhes do selecionado',exact:true}).isDisabled(),true);
  await page.locator('tbody input').first().uncheck();
  assert.equal(await page.getByRole('checkbox',{name:'Selecionar todas',exact:true}).evaluate(e=>e.indeterminate),true);
  await page.getByRole('checkbox',{name:'Selecionar todas',exact:true}).check();
  await page.getByRole('checkbox',{name:'Selecionar todas',exact:true}).uncheck();
  await page.locator('tbody input').first().check();
  assert.equal(await page.getByRole('button',{name:'Detalhes do selecionado',exact:true}).isDisabled(),false);
  await page.getByRole('button',{name:'Detalhes do selecionado',exact:true}).click();await page.waitForSelector('#explorer-details pre');await page.getByRole('button',{name:'Fechar',exact:true}).click();
  const pendingDownload=page.waitForEvent('download');
  await page.getByRole('button',{name:'Baixar selecionado em ZIP',exact:true}).click();
  const downloaded=await pendingDownload;
  assert.equal(new URL(downloaded.url()).searchParams.get('id'),many[0].id);
  await downloaded.delete();
  await page.route('**/restrict/geoespacial/visualizador-camadas/**',r=>r.fulfill({contentType:'text/html',body:'<h1>Visualizador</h1>'}));
  await page.getByRole('button',{name:'Visualizar selecionado no mapa',exact:true}).click();
  await page.waitForURL('**/visualizador-camadas/**');
  assert.equal(new URL(page.url()).searchParams.get('camada'),many[0].id);
  await page.goBack();await page.waitForSelector('tbody input');
  await page.getByRole('button',{name:'Última página',exact:true}).click();
  assert.equal(await page.locator('tbody tr').count(),7);
  assert.equal(await page.locator('#explorer-summary').textContent(),'0 selecionados / 7 na página / 37 no total');
  await page.locator('tbody input').last().check();
  assert.equal(await page.getByRole('button',{name:'Visualizar selecionado no mapa',exact:true}).isDisabled(),true);
  await page.getByRole('button',{name:'Primeira página',exact:true}).click();
  await page.locator('#explorer-page-size').selectOption('30');
  assert.equal(await page.locator('tbody tr').count(),30);
  assert.equal(await page.locator('#explorer-pagination span').textContent(),'Página 1 de 2');
  await page.locator('#explorer-filter-column').selectOption('extensao');
  await page.locator('#explorer-filter-value').selectOption({label:'GPKG'});
  assert.equal(await page.locator('tbody tr').count(),20);
  await page.getByRole('button',{name:'Inverter seleção',exact:true}).click();
  assert.equal(await page.locator('tbody tr').count(),17);
  await page.getByRole('button',{name:'Limpar',exact:true}).click();
  assert.equal(await page.locator('tbody tr').count(),30);
  await page.locator('#explorer-filter-column').selectOption('geometria_tipo');
  await page.locator('#explorer-filter-value').selectOption('__vazias__');
  assert.equal(await page.locator('tbody tr').count(),1);
  await page.getByRole('button',{name:'Limpar',exact:true}).click();
  await page.locator('#explorer-page-size').selectOption('15');
  await page.locator('tbody input').first().check();
  await page.locator('[data-sort=nome]').click();
  assert.match(await page.locator('tbody tr').first().textContent(),/Camada 37/);
  assert.equal(await page.locator('#explorer-summary').textContent(),'0 selecionados / 15 na página / 37 no total');
  const metrics=await page.locator('tbody tr').first().evaluate(tr=>({height:tr.getBoundingClientRect().height,expected:parseFloat(getComputedStyle(document.documentElement).fontSize)*1.7}));
  assert.ok(Math.abs(metrics.height-metrics.expected)<1,JSON.stringify(metrics));
  const style=await page.locator('#explorer-pagination button').first().evaluate(e=>({border:getComputedStyle(e).borderTopWidth,weight:getComputedStyle(e).fontWeight}));
  assert.deepEqual(style,{border:'0px',weight:'700'});
  for(const width of [1400,390]){
   await page.setViewportSize({width,height:900});
   const sticky=await page.locator('.geo-explorer-table-wrap').evaluate(wrap=>{
    wrap.scrollLeft=0;
    const cells=[...wrap.querySelectorAll('thead th,tbody tr:first-child td')].filter(e=>e.cellIndex<2);
    const before=cells.map(e=>e.getBoundingClientRect().left);
    wrap.scrollLeft=wrap.scrollWidth;
    return {overflow:wrap.scrollWidth>wrap.clientWidth,scrolled:wrap.scrollLeft,before,after:cells.map(e=>e.getBoundingClientRect().left)};
   });
   assert.ok(sticky.overflow&&sticky.scrolled>0,JSON.stringify(sticky));
   sticky.before.forEach((left,i)=>assert.ok(Math.abs(left-sticky.after[i])<1,JSON.stringify(sticky)));
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  }
  await page.locator('#explorer-search').fill('ausente');
  assert.match(await page.locator('tbody').textContent(),/Nenhum item/);
  assert.equal(await page.locator('#explorer-summary').textContent(),'0 selecionados / 0 na página / 37 no total');
  assert.equal(await page.locator('#explorer-pagination button:disabled').count(),4);
  async function reloadTable(){
   const response=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/geoespacial/explorador/navegar');
   await page.getByRole('button',{name:'Recarregar',exact:true}).click();
   await response;await page.waitForFunction(()=>document.getElementById('explorer-content').getAttribute('aria-busy')==='false');
  }
  await reloadTable();
  assert.equal(await page.locator('#explorer-search').inputValue(),'ausente');
  assert.equal(await page.locator('tbody input').count(),0);
  await page.locator('#explorer-search').fill('Camada');
  await page.locator('#explorer-filter-column').selectOption('extensao');
  await page.locator('#explorer-filter-value').selectOption({label:'GPKG'});
  await page.getByRole('button',{name:'Próxima página',exact:true}).click();
  await page.locator('tbody input').first().check();
  many[0].camada='rios atualizados';
  let documentLoads=0;
  page.on('request',request=>{if(request.isNavigationRequest()&&request.frame()===page.mainFrame())documentLoads++;});
  await page.evaluate(()=>{window.explorerDocumentMarker='mesmo documento';document.querySelector('.geo-explorer-table-wrap').scrollLeft=200;});
  const previousScroll=await page.locator('.geo-explorer-table-wrap').evaluate(wrap=>wrap.scrollLeft);
  const requestCount=requests.length,urlBefore=page.url(),historyBefore=await page.evaluate(()=>history.length);
  await reloadTable();
  assert.equal(documentLoads,0);
  assert.equal(await page.evaluate(()=>window.explorerDocumentMarker),'mesmo documento');
  assert.equal(page.url(),urlBefore);
  assert.equal(await page.evaluate(()=>history.length),historyBefore);
  assert.equal(requests.length,requestCount+1);
  assert.equal(await page.locator('#explorer-search').inputValue(),'Camada');
  assert.equal(await page.locator('#explorer-filter-column').inputValue(),'extensao');
  assert.equal(await page.locator('#explorer-filter-value').inputValue(),JSON.stringify('GPKG'));
  assert.equal(await page.locator('#explorer-pagination span').textContent(),'Página 2 de 2');
  assert.equal(await page.locator('#explorer-page-size').inputValue(),'15');
  assert.equal(await page.locator('[data-sort=nome]').locator('..').getAttribute('aria-sort'),'descending');
  assert.equal(await page.locator('.geo-explorer-table-wrap').evaluate(wrap=>wrap.scrollLeft),previousScroll);
  assert.equal(await page.locator('#explorer-summary').textContent(),'0 selecionados / 5 na página / 37 no total');
  assert.match(await page.locator('tbody').textContent(),/rios atualizados/);
  const previousRows=await page.locator('tbody').textContent();
  const failReload=route=>route.fulfill({status:503,json:{detail:'Repositório indisponível'}});
  await page.route('**/api/geoespacial/explorador/navegar?**',failReload);
  await reloadTable();
  assert.equal(await page.locator('tbody').textContent(),previousRows);
  assert.match(await page.locator('.notification-toast.error .notification-message').last().textContent(),/Não foi possível atualizar as camadas: Repositório indisponível/);
  assert.equal(await page.getByRole('button',{name:'Recarregar',exact:true}).isEnabled(),true);
  await page.unroute('**/api/geoespacial/explorador/navegar?**',failReload);
  await page.getByRole('button',{name:'Inverter seleção',exact:true}).click();
  await reloadTable();
  assert.equal(await page.getByRole('button',{name:'Inverter seleção',exact:true}).getAttribute('aria-pressed'),'true');
  assert.equal(await page.locator('tbody tr').count(),15);
  await page.getByRole('button',{name:'Limpar',exact:true}).click();
  for(const quantity of ['50','100']){
   await page.locator('#explorer-page-size').selectOption(quantity);
   assert.equal(await page.locator('tbody tr').count(),37);
   assert.equal(await page.locator('#explorer-pagination span').textContent(),'Página 1 de 1');
  }
  for(const source of ['demandas','saidas']){
   await page.goto(`http://127.0.0.1:${server.address().port}/restrict/geoespacial/explorador-camadas/?fonte=${source}&caminho=base-geoespacial/paginada`);
   await page.waitForSelector('tbody input');
   assert.equal(await page.locator('tbody tr').count(),15);
   assert.equal(await page.locator('#explorer-filters').isVisible(),true);
   assert.equal(await page.locator('thead th').nth(1).textContent(),'Ações');
  }
  await page.evaluate(()=>localStorage.setItem('geo-explorer-view','details'));
  for(const [fixture,geometry,internal] of [['demand',true,false],['raster',true,false],['auxiliary',false,false],['multiple',true,true],['mixed',true,true],['broken',true,true],['folders',false,false]]){
   await page.goto(`http://127.0.0.1:${server.address().port}/restrict/geoespacial/explorador-camadas/?fonte=storage&caminho=base-geoespacial/metadata-${fixture}`);
   await page.waitForSelector('tbody input');
   for(const [field,expected] of [['geometria_tipo',geometry],['camada',internal]]){
    assert.equal(await page.locator(`thead [data-field="${field}"]`).count(),Number(expected),fixture+' '+field);
    assert.equal(await page.locator(`#explorer-filter-column option[value="${field}"]`).count(),Number(expected),fixture+' filtro '+field);
   }
   if(fixture==='multiple'){
    assert.equal(await page.locator('tbody [data-field="geometria_tipo"]').textContent(),'Multi Polygon; Point');
    assert.equal(await page.locator('tbody [data-field="camada"]').textContent(),'municipios; sedes');
    assert.equal(await page.locator('tbody [data-field="camada"] span').getAttribute('title'),'municipios: Multi Polygon; sedes: Point');
    await page.locator('#explorer-filter-column').selectOption('camada');
    await page.locator('#explorer-filter-value').selectOption({label:'municipios; sedes'});
    assert.equal(await page.locator('tbody input').count(),1);
    metadataCases.multiple=[auxiliary];
    await reloadTable();
    assert.equal(await page.locator('thead [data-field="camada"]').count(),0);
    assert.equal(await page.locator('#explorer-filter-column').inputValue(),'');
    assert.equal(await page.locator('#explorer-filter-value').isDisabled(),true);
   }
   if(fixture==='mixed'){
    assert.equal(await page.locator('tbody input').count(),15);
    assert.ok((await page.locator('tbody [data-field="geometria_tipo"]').allTextContents()).every(value=>value==='—'));
    await page.locator('#explorer-filter-column').selectOption('extensao');
    await page.locator('#explorer-filter-value').selectOption({label:'PRJ'});
    assert.equal(await page.locator('thead [data-field="geometria_tipo"]').count(),1);
   }
   if(fixture==='broken'){
    assert.equal(await page.locator('tbody .geo-explorer-metadata-error').count(),2);
    assert.match(await page.locator('.notification-toast.error .notification-message').last().textContent(),/1 arquivo\(s\) com erro/);
    assert.equal(await page.evaluate(()=>window.bad),undefined);
   }
  }
  assert.deepEqual(errors,[]);
  console.log('PASS explorador: navegação, ações, filtros/inversão/vazios, seleção, paginação, quantidade, ordenação global, densidade, colunas fixas e responsividade');
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exit(1);});
