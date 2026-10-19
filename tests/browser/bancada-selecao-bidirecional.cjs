// Mapa, comandos e Tabulator reais; fontes e respostas sintéticas, sem banco.
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
(async()=>{
 const server=http.createServer((req,res)=>{
  let name=new URL(req.url,'http://local').pathname;
  if(name==='/')name='/templates/componentes/_geoprocessamento.html';
  const file=path.resolve(root,`.${name.replace('/restrict/geoespacial/','/geoespacial/')}`);
  if(path.relative(root,file).startsWith('..')){res.writeHead(403).end();return;}
  fs.readFile(file,(error,data)=>{
   if(error){res.writeHead(404).end();return;}
   res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(data);
  });
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({headless:true,...(process.env.PW_CHROMIUM?{executablePath:process.env.PW_CHROMIUM}:{channel:'msedge'}),args:['--enable-unsafe-swiftshader','--no-proxy-server']});
 let releaseGeometry,releaseLocate,releaseSource;
 try{
  const page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];
  let delayGeometry=false,geometryStarted,sourcePreparations=0,failGeometry=false,holdLocate=false,locateStarted;
  const geometryRequested=new Promise(resolve=>geometryStarted=resolve);
  const locateRequested=new Promise(resolve=>locateStarted=resolve);
  let sourceStarted;
  const sourceRequested=new Promise(resolve=>sourceStarted=resolve);
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/api/**',async route=>{
   const pathname=new URL(route.request().url()).pathname;
   if(pathname.endsWith('/bancada-arquivos/preparar')){
    sourcePreparations++;
    await new Promise(resolve=>{releaseSource=resolve;sourceStarted();});
    const p=route.request().postDataJSON();
    return route.fulfill({json:{...p,nome:'Remota',revisao:'r1',coluna_fid:'OBJECTID',campo_fid_tile:'slt_fid',feicoes:105,campos:[{nome:'nome',tipo:'String'}],geometria_tipo:'Point',bounds:[-47,-24,-46,-23]}});
   }
   if(pathname.endsWith('/bancada-arquivos/tabela')){
    const p=route.request().postDataJSON();
    if(p.id==='storage:identificadores.gpkg::teste')return route.fulfill({json:{revisao:p.revisao,total:3,linhas:['0','9007199254740993','9007199254740995'].map(id=>({id,atributos:{}}))}});
    if(holdLocate&&p.localizar_fid!=null){await new Promise(resolve=>{releaseLocate=resolve;locateStarted();});holdLocate=false;return route.fulfill({status:422,json:{detail:'Localização antiga indisponível.'}});}
    const offset=p.localizar_fid==null?p.offset:Math.floor(Number(p.localizar_fid)/3/p.limite)*p.limite;
    return route.fulfill({json:{id:p.id,arquivo:p.arquivo,revisao:p.revisao,total:105,offset,limite:p.limite,has_more:offset+p.limite<105,
     linhas:Array.from({length:Math.min(p.limite,105-offset)},(_,i)=>({id:String((offset+i)*3),atributos:{nome:`Feição ${offset+i}`}}))}});
   }
   if(pathname.endsWith('/bancada-arquivos/geometrias')){
    const p=route.request().postDataJSON();
    if(failGeometry)return route.fulfill({status:422,json:{detail:'Falha sintética na geometria.'}});
    if(delayGeometry){await new Promise(resolve=>{releaseGeometry=resolve;geometryStarted();});delayGeometry=false;}
    return route.fulfill({json:{type:'FeatureCollection',features:p.ids.map(id=>({type:'Feature',id,properties:{},geometry:{type:'Point',coordinates:[p.id==='storage:identificadores.gpkg::teste'?-46.5:-46.5+Number(id)/10000,-23.5]}}))}});
   }
   if(pathname.includes('/tiles/'))return route.fulfill({body:Buffer.alloc(0),contentType:'application/x-protobuf'});
   if(pathname.endsWith('/camadas')||pathname.endsWith('/funcoes')||pathname.endsWith('/fluxos'))return route.fulfill({json:[]});
   if(pathname.endsWith('/catalogo/projeto'))return route.fulfill({json:{toolboxes:[]}});
   return route.fulfill({json:{}});
  });
  await page.goto(`http://127.0.0.1:${server.address().port}/`,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.gpApp?.state.map?.isStyleLoaded()&&window.gpArquivos?.sessions&&window.gpAttributeTable);
  await page.evaluate(()=>{
   const map=gpApp.state.map;
   map.queryRenderedFeatures=()=>window.syntheticHit?[{...window.syntheticHit,properties:gpArquivos.sessions.get(window.syntheticHit.source)?.tiles_token?{}:window.syntheticHit.properties}]:[];
   window.clickFeature=(source,feature,shiftKey=false)=>{
    window.syntheticHit=feature?{...feature,source}:null;
    map.fire('click',{point:{x:20,y:20},lngLat:{lng:-46.5,lat:-23.5},originalEvent:{shiftKey}});
   };
   gpApp.adicionarCamadaGeoJsonEmMemoria('memoria','Duplicadas',{type:'FeatureCollection',features:Array.from({length:105},(_,i)=>({
    type:'Feature',properties:{nome:'Mesmo atributo'},geometry:{type:'Point',coordinates:[-46.5+i/10000,-23.5]},
   }))},{lote:true});
   gpCommands.selectOnMap();
   clickFeature('memoria',map.getSource('memoria')._data.features[104]);
  });
  await page.waitForFunction(()=>gpAttributeTable.grid?.getData().length===105);
  assert.equal(await page.evaluate(()=>gpAttributeTable.grid.getColumn('__gp_row')?.getDefinition().title),'Índice (sessão)','Feições sem FID devem mostrar o índice técnico, sem inventar um ID persistente');
  assert.equal(await page.evaluate(()=>gpAttributeTable.grid.getColumn('__gp_row').getDefinition().frozen),true,'Identificador permanece visível ao rolar horizontalmente');
  assert.equal(await page.locator('.tabulator-col[tabulator-field="__gp_row"]').isVisible(),true);
  await page.evaluate(()=>gpAttributeTable.sync());
  assert.equal(await page.evaluate(()=>gpAttributeTable.grid.getSelectedData().length),1,'Atributos iguais não identificam a mesma feição');
  assert.equal(await page.evaluate(()=>gpAttributeTable.grid.getSelectedData()[0].__gp_row),104);
  await page.waitForFunction(()=>gpAttributeTable.grid.getPage()===2);
  await page.evaluate(()=>{gpAttributeTable.grid.deselectRow();gpAttributeTable.grid.selectRow(103);});
  assert.equal(await page.evaluate(()=>gpApp.state.selectedGeoJSON.features.length),1);
  assert.equal(await page.evaluate(()=>gpApp.state.selectedGeoJSON.features[0].geometry.coordinates[0]),-46.5+103/10000);
  await page.evaluate(()=>gpAttributeTable.sync());
  assert.deepEqual(await page.evaluate(()=>gpAttributeTable.grid.getSelectedData().map(row=>row.__gp_row)),[103]);
  await page.locator('[data-at-action="only"]').click();
  await page.evaluate(()=>clickFeature('memoria',gpApp.state.map.getSource('memoria')._data.features[102]));
  await page.waitForFunction(()=>gpAttributeTable.grid.getRows('active').length===1&&gpAttributeTable.grid.getRows('active')[0].getData().__gp_row===102);
  assert.equal(await page.evaluate(()=>gpApp.state.selectedGeoJSON.features.length),1);
  await page.evaluate(()=>{gpFeedback.ProcessFeedback.confirmar=async()=>true;});
  await page.locator('[data-at-action="edit"]').click();
  assert.equal(await page.evaluate(()=>{const cell=gpAttributeTable.grid.getRow(102).getCell('__gp_row');return cell.getColumn().getDefinition().editable(cell);}),false,'Identificador técnico não é editável');
  await page.locator('[data-at-delete]').click();
  await page.waitForFunction(()=>gpAttributeTable.grid.getData().length===104);
  await page.locator('[data-at-save]').click();
  await page.waitForFunction(()=>document.querySelector('[data-at-status]').textContent==='Alterações salvas.');
  await page.waitForFunction(()=>gpAttributeTable.grid.getData().length===104);
  await page.evaluate(()=>clickFeature('memoria',gpApp.state.map.getSource('memoria')._data.features[103]));
  await page.waitForFunction(()=>gpAttributeTable.grid.getSelectedData().length===1&&gpAttributeTable.grid.getSelectedData()[0].__gp_row===103);
  assert.equal(await page.evaluate(()=>gpApp.state.selectedGeoJSON.features[0].geometry.coordinates[0]),-46.5+104/10000,'Salvar uma exclusão recompõe as posições das feições em memória');
  await page.evaluate(()=>{
   gpCommands.clearSelection();
   const id='storage:teste.gpkg::teste',file={id,nome:'Remota',arquivo:'teste.gpkg',revisao:'r1',representacao:'tiles',tiles_token:'a'.repeat(32),feicoes:105,campos:[{nome:'nome',tipo:'String'}]};
   gpArquivos.sessions.set(id,file);
   gpApp.adicionarCamadaStorageTiles(id,file.nome,{...file,caminho:file.arquivo,tiles_url:`${location.origin}/api/tiles/{z}/{x}/{y}.pbf`,geometria_tipo:'Point'},{lote:true});
   clickFeature(id,{type:'Feature',id:999,properties:{slt_fid:312},geometry:{type:'Point',coordinates:[-46.5,-23.5]}});
  });
  await sourceRequested;
  await page.evaluate(()=>gpCommands.clearSelection());
  releaseSource();releaseSource=null;
  await page.waitForFunction(()=>gpArquivos.sessions.get('storage:teste.gpkg::teste').campo_fid_tile&&gpApp.state.map.areTilesLoaded());
  await page.evaluate(()=>new Promise(resolve=>setTimeout(resolve,150)));
  assert.equal(await page.evaluate(()=>gpApp.state.selectedGeoJSON.features.length),0,'Limpar seleção cancela o clique que aguardava a fonte original');
  await page.evaluate(()=>clickFeature('storage:teste.gpkg::teste',{type:'Feature',properties:{slt_fid:312},geometry:null}));
  await page.waitForFunction(()=>gpAttributeTable.grid?.getSelectedData().some(row=>row.__gp_fid==='312')&&gpAttributeTable.grid.getPage()===2);
  assert.equal(sourcePreparations,1,'Prévia sem FID deve migrar para os tiles do original antes da seleção');
  assert.deepEqual(await page.evaluate(()=>gpApp.state.selectedGeoJSON.features.map(f=>f.properties.__gp_selection_key)),['312']);
  await page.evaluate(()=>{
   window.originalGrid=gpAttributeTable.grid;
   clickFeature('storage:teste.gpkg::teste',{type:'Feature',properties:{slt_fid:303},geometry:null});
  });
  await page.waitForFunction(()=>gpAttributeTable.grid?.getSelectedData().map(row=>row.__gp_fid).join()==='303');
  assert.equal(await page.evaluate(()=>gpAttributeTable.grid.getColumn('__gp_fid').getDefinition().title),'OBJECTID');
  assert.equal(await page.evaluate(()=>gpAttributeTable.grid.getRow('303').getCell('__gp_fid').getValue()),'303','Tabela mostra o FID esparso real, não o número da linha');
  assert.equal(await page.evaluate(()=>originalGrid===gpAttributeTable.grid),true,'Um clique não recria a tabela aberta');
  await page.evaluate(()=>clickFeature('storage:teste.gpkg::teste',{type:'Feature',properties:{slt_fid:306},geometry:null},true));
  assert.deepEqual(await page.evaluate(()=>gpAttributeTable.grid.getSelectedData().map(row=>row.__gp_fid)),['303','306']);
  delayGeometry=true;
  await page.evaluate(()=>{gpAttributeTable.grid.deselectRow();gpAttributeTable.grid.selectRow('309');});
  await geometryRequested;
  await page.evaluate(()=>clickFeature('storage:teste.gpkg::teste',{type:'Feature',properties:{slt_fid:0},geometry:null}));
  await page.waitForFunction(()=>gpAttributeTable.grid?.getSelectedData().map(row=>row.__gp_fid).join()==='0');
  const geometryResponse=page.waitForResponse(response=>response.url().endsWith('/geometrias'));
  releaseGeometry();releaseGeometry=null;await geometryResponse;
  await page.evaluate(()=>new Promise(resolve=>setTimeout(resolve,150)));
  assert.deepEqual(await page.evaluate(()=>gpApp.state.selectedGeoJSON.features.map(f=>f.properties.__gp_selection_key)),['0'],'Resposta atrasada não sobrescreve o clique no mapa');
  assert.deepEqual(await page.evaluate(()=>gpAttributeTable.grid.getSelectedData().map(row=>row.__gp_fid)),['0']);
  failGeometry=true;
  await page.evaluate(()=>gpAttributeTable.grid.selectRow('3'));
  await page.waitForFunction(()=>document.querySelector('[data-at-status]').textContent.includes('Seleção não aplicada ao mapa'));
  assert.deepEqual(await page.evaluate(()=>gpAttributeTable.grid.getSelectedData().map(row=>row.__gp_fid)),['0'],'Falha na geometria restaura a seleção da tabela');
  failGeometry=false;holdLocate=true;
  await page.evaluate(()=>clickFeature('storage:teste.gpkg::teste',{type:'Feature',properties:{slt_fid:312},geometry:null}));
  await locateRequested;
  await page.evaluate(()=>clickFeature('storage:teste.gpkg::teste',{type:'Feature',properties:{slt_fid:3},geometry:null}));
  await page.waitForFunction(()=>gpAttributeTable.grid.getSelectedData().map(row=>row.__gp_fid).join()==='3');
  await page.waitForFunction(()=>document.querySelector('[data-at-status]').textContent==='Seleção do mapa sincronizada com a tabela.');
  const locateResponse=page.waitForResponse(response=>response.request().postDataJSON()?.localizar_fid==='312');
  releaseLocate();releaseLocate=null;await locateResponse;
  await page.evaluate(()=>new Promise(resolve=>setTimeout(resolve,150)));
  assert.equal(await page.evaluate(()=>gpAttributeTable.grid.getPage()),1,'Localização atrasada não muda a página da seleção mais recente');
  assert.deepEqual(await page.evaluate(()=>gpAttributeTable.grid.getSelectedData().map(row=>row.__gp_fid)),['3']);
  assert.equal(await page.locator('[data-at-status]').innerText(),'Seleção do mapa sincronizada com a tabela.','Erro de uma busca antiga não substitui o feedback atual');
  await page.evaluate(()=>clickFeature('',null));
  assert.equal(await page.evaluate(()=>gpAttributeTable.grid.getSelectedData().length),0);
  assert.equal(await page.evaluate(()=>gpApp.state.selectedGeoJSON.features.length),0);
  await page.evaluate(async()=>{
   const id='storage:identificadores.gpkg::teste',file={id,nome:'Sem atributos',arquivo:'identificadores.gpkg',revisao:'r1',representacao:'tiles',coluna_fid:'OBJECTID',feicoes:3,campos:[]};
   gpArquivos.sessions.set(id,file);
   gpApp.adicionarCamadaStorageTiles(id,file.nome,{...file,caminho:file.arquivo,tiles_url:`${location.origin}/api/tiles/{z}/{x}/{y}.pbf`,geometria_tipo:'Point'},{lote:true,estiloPreparado:true});
   await gpApp.showAttributes(id);
  });
  await page.waitForFunction(()=>gpAttributeTable.grid?.getData().length===3);
  assert.deepEqual(await page.evaluate(()=>gpAttributeTable.grid.getData().map(row=>row.__gp_fid)),['0','9007199254740993','9007199254740995'],'FID 0 e inteiros de 64 bits não perdem precisão');
  assert.equal(await page.locator('.tabulator-col[tabulator-field="__gp_fid"]').isVisible(),true,'Camada sem atributos também mostra seu identificador');
  await page.locator('[data-at-action="edit"]').click();
  assert.equal(await page.evaluate(()=>{const cell=gpAttributeTable.grid.getRow('0').getCell('__gp_fid');return cell.getColumn().getDefinition().editable(cell);}),false);
  await page.locator('[data-at-query]').evaluate(form=>form.closest('details').open=true);
  await page.locator('[data-at-field]').selectOption('__gp_fid');
  await page.locator('[data-at-operator]').selectOption('>');
  await page.locator('[data-at-value]').fill('9007199254740993');
  await page.locator('[data-at-query] button').click();
  await page.waitForFunction(()=>gpAttributeTable.grid.getSelectedData().map(row=>row.__gp_fid).join()==='9007199254740995');
  const downloadPromise=page.waitForEvent('download');
  await page.locator('[data-at-action="csv"]').click();
  const stream=await (await downloadPromise).createReadStream(),chunks=[];
  for await(const chunk of stream)chunks.push(chunk);
  const csv=Buffer.concat(chunks).toString('utf8');
  assert.match(csv,/OBJECTID/);
  for(const fid of ['9007199254740993','9007199254740995'])assert(csv.includes(fid),'CSV preserva identificadores sem arredondar');
  await page.evaluate(async()=>{
   gpCommands.clearSelection();
   gpApp.adicionarCamadaGeoJsonEmMemoria('ids-geojson','IDs GeoJSON',{type:'FeatureCollection',features:['original-A','original-B'].map(id=>({
    type:'Feature',id,properties:{FID:5,OBJECTID:8},geometry:{type:'Point',coordinates:[-47,-23]},
   }))},{lote:true,estiloPreparado:true});
   await gpApp.showAttributes('ids-geojson');
  });
  await page.waitForFunction(()=>gpAttributeTable.grid?.getData().length===2);
  assert.deepEqual(await page.evaluate(()=>gpAttributeTable.grid.getData().map(row=>row.__gp_feature_id)),['original-A','original-B']);
  assert.equal(await page.locator('.tabulator-col[tabulator-field="__gp_feature_id"]').isVisible(),true);
  assert.deepEqual(await page.evaluate(()=>gpAttributeTable.grid.getData().map(row=>[row.FID,row.OBJECTID])),[[5,8],[5,8]],'Atributos chamados FID/OBJECTID não substituem a identidade real da feição');
  await page.evaluate(async()=>{
   gpApp.adicionarCamadaGeoJsonEmMemoria('ids-repetidos','IDs repetidos',{type:'FeatureCollection',features:[0,1].map(()=>({
    type:'Feature',id:'repetido',properties:{},geometry:{type:'Point',coordinates:[-47,-23]},
   }))},{lote:true,estiloPreparado:true});
   await gpApp.showAttributes('ids-repetidos');
  });
  await page.waitForFunction(()=>gpAttributeTable.grid?.getColumn('__gp_row')&&gpAttributeTable.grid.getData().length===2);
  assert.deepEqual(await page.evaluate(()=>gpAttributeTable.grid.getData().map(row=>row.__gp_row)),[0,1]);
  assert.deepEqual(await page.evaluate(()=>gpAttributeTable.grid.getData().map(row=>row.__gp_feature_id)),['repetido','repetido'],'ID GeoJSON repetido é exibido, mas não apresentado como único');
  assert.deepEqual(errors,[]);
  console.log('OK: IDs visíveis e somente leitura, camada sem atributos, FID 0/64 bits, CSV, mapa ↔ tabela, páginas e respostas atrasadas.');
 }finally{
  releaseGeometry?.();releaseLocate?.();releaseSource?.();
  await browser.close();server.closeAllConnections?.();await new Promise(resolve=>server.close(resolve));
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
