// Teste isolado: nenhuma conexão com banco, API real ou storage.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setContent('<button data-action="explore">Explorar</button><button data-action="select">Selecionar</button><span id="gp-selection"></span><div class="gp-app"><button data-right-tab="tools">Tools</button><span id="gp-right-title"></span><div id="gp-tools-view"></div><div id="gp-editor-view"></div></div>');
  await page.evaluate(()=>{
   const feature=id=>({type:'Feature',id,properties:{nome:`Ponto ${id}`},geometry:{type:'Point',coordinates:[id,0]}});
   const handlers=new Map(),sources=new Map(),layers=new Map();
   window.fixture={feature,hits:[{...feature(2),source:'a'}],popups:0,tables:[],requests:[],accept:false,notifications:[],pan:true};
   const map={on:(n,f)=>handlers.set(n,f),off:(n,f)=>{if(handlers.get(n)===f)handlers.delete(n)},getCanvas:()=>({style:{}}),dragPan:{enable:()=>fixture.pan=true,disable:()=>fixture.pan=false},queryRenderedFeatures:()=>fixture.hits,getSource:id=>sources.get(id),getLayer:id=>layers.get(id),addSource:(id,v)=>sources.set(id,v),removeSource:id=>sources.delete(id),addLayer:v=>layers.set(v.id,v),removeLayer:id=>layers.delete(id)};
   window.gpApp={state:{map,layers:[{id:'a',nome:'Camada A',tipo:'vetor'}],activeLayerId:'a',selectedGeoJSON:{type:'FeatureCollection',features:[]}},showAttributes:id=>fixture.tables.push(id),syncAttributeSelection:()=>{},configureSelectionScope:()=>{}};
   window.gpArquivos={sessions:new Map([['a',{geojson:{type:'FeatureCollection',features:[feature(1),feature(2),feature(3)]}}]])};
   window.gpFeedback={Notify:{info:(t,m)=>fixture.notifications.push(m)},ProcessFeedback:{confirmar:async options=>{fixture.confirmation=options;return fixture.accept;}}};
   window.maplibregl={Popup:class{setLngLat(){return this}setHTML(){return this}addTo(){fixture.popups++;return this}}};
   fixture.click=shiftKey=>handlers.get('click')({point:{x:5,y:5},lngLat:{lng:1,lat:0},originalEvent:{shiftKey}});
   window.fetch=async(url,options)=>{fixture.requests.push({url,body:JSON.parse(options.body)});return {ok:true,json:async()=>({feicoes_atualizadas:1})};};
  });
  await page.addScriptTag({path:path.resolve('geoespacial/geoprocessamento-commands.js')});
  await page.evaluate(()=>{gpCommands.setLayerSelection('a',[fixture.feature(1)]);gpCommands.explore();fixture.click(false);fixture.click(true);});
  assert.deepEqual(await page.evaluate(()=>gpApp.state.selectedGeoJSON.features.map(f=>f.id)),[1],'Explorar preserva seleção');
  assert.equal(await page.evaluate(()=>fixture.popups),2);assert.deepEqual(await page.evaluate(()=>fixture.tables),[]);
  await page.evaluate(()=>{gpCommands.selectOnMap();fixture.click(false);fixture.hits=[{...fixture.feature(3),source:'a'}];fixture.click(true);fixture.click(true);});
  assert.deepEqual(await page.evaluate(()=>gpApp.state.selectedGeoJSON.features.map(f=>f.id)),[2,3],'Shift agrega sem duplicar');
  await page.evaluate(()=>{fixture.hits=[];fixture.click(false);gpCommands.explore();fixture.hits=[{...fixture.feature(2),source:'a'}];fixture.click(false);});
  assert.equal(await page.evaluate(()=>gpApp.state.selectedGeoJSON.features.length),0);assert.equal(await page.evaluate(()=>fixture.pan),true);
  await page.evaluate(()=>{gpCommands.selectOnMap();fixture.click(false);gpApp.state.layerFilters={a:"nome == 'Ponto 2'"};gpCommands.refreshLayerFilter=async()=>{};gpCommands.calculateField();});
  await page.locator('[name="field"]').fill('novo');await page.locator('[name="expression"]').fill('7');
  await page.locator('#gp-calculate-field .primary').click();assert.equal(await page.evaluate(()=>fixture.requests.length),0,'Cancelar não grava');
  assert.match(await page.locator('[data-calculation-scope]').innerText(),/1 feição.*filtro ativo/);
  await page.evaluate(()=>fixture.accept=true);await page.locator('#gp-calculate-field .primary').click();
  assert.deepEqual(await page.evaluate(()=>fixture.requests[0].body),{chaves_selecionadas:['2'],filtro:"nome == 'Ponto 2'"});
  assert.match(await page.evaluate(()=>fixture.confirmation.warning),/camada original/);
  await page.evaluate(()=>window.gpAttributeTable={hasPendingChanges:()=>true});await page.locator('#gp-calculate-field .primary').click();
  assert.equal(await page.evaluate(()=>fixture.requests.length),1,'Edição pendente bloqueia gravação');assert.match(await page.evaluate(()=>fixture.notifications.at(-1)),/Salve ou descarte/);
  await page.evaluate(()=>{document.querySelector('#gp-editor-view').innerHTML='';gpCommands.calculateField();});assert.equal(await page.locator('#gp-calculate-field').count(),0);
  assert.deepEqual(errors,[]);console.log('OK: Explorar/seleção, confirmação, escopo de cálculo e bloqueio de edição pendente.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
