const {chromium}=require('playwright');
const fs=require('node:fs');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:process.env.PLAYWRIGHT_CHANNEL || "msedge"});
 try {
 const page=await browser.newPage();
 await page.setContent('<div id="geo-postgis-group" class="layer-group"><div class="layer-group-header-row"><input type="checkbox"></div><div class="layer-group-body"></div></div><div id="geo-storage-group" class="layer-group"><div class="layer-group-header-row"><input type="checkbox"></div><div class="layer-group-body"></div></div><div id="geo-operational-group" class="layer-group"><div class="layer-group-header-row"><input type="checkbox"></div><div class="layer-group-body"></div></div><div id="geoespacial-details-content"></div>');
 const source=fs.readFileSync('geoespacial/geoespacial-visualizador-camadas.js','utf8');
 const helpers=source.slice(source.indexOf('  const folderLoads ='),source.indexOf('  function atualizarContagem(pasta)'));
 await page.evaluate(helpers=>{
  window.loadProgress={active:null,begin:()=>({controller:new AbortController()}),plan:()=>{},repaint:()=>{},task:async(op,kind,label,job)=>job(),end:async()=>{}};window.displayName=x=>x.nome || x.id;window.registro=new Map(); window.camadasVisiveis=new Set(); window.aviso=''; window.escapeHtml=x=>x; window.renderLegend=()=>{};
  window.GeoespacialMap={layers:new Map(),map:{fitBounds:()=>{}},removeLayer:id=>camadasVisiveis.delete(id)}; window.syncProjectPin=()=>{}; window.matchesLayerFilter=()=>true; window.applyLayerFilter=()=>visibilityTest.syncVisibility();
  window.toggle=async(layer,on)=>{if(layer.fail)throw Error('indisponível'); if(on)camadasVisiveis.add(layer.id);else camadasVisiveis.delete(layer.id);};
  (0,eval)(helpers+';window.visibilityTest={syncVisibility,setGroupVisibility,setLayerVisibility,groupInput};');
 },helpers);
 const result=await page.evaluate(async()=>{
  const {syncVisibility,setGroupVisibility,setLayerVisibility,groupInput}=visibilityTest;
  const root=document.getElementById('geo-postgis-group');
  const folder=(id)=>{const el=document.createElement('div'); el.className='layer-group geo-layer-folder';el.innerHTML='<div class="layer-group-header-row"><input type="checkbox"></div><div class="layer-group-body"></div>';el.dataset.folderId=id;return el;};
  const row=(id,fail=false)=>{registro.set(id,{id,fail});const el=document.createElement('div');el.className='geo-layer-record';el.dataset.id=id;el.innerHTML='<div class="layer-group-header-row"><input type="checkbox"></div>';return el;};
  const parent=folder('parent');root.querySelector('.layer-group-body').append(parent);
  parent._loadFolder=async()=>{const nested=folder('nested');nested._loadFolder=async()=>{nested.querySelector('.layer-group-body').append(...Array.from({length:94},(_,i)=>row('b'+i)));nested.dataset.carregado='1';};parent.querySelector('.layer-group-body').append(row('a'),nested);parent.dataset.carregado='1';};
  syncVisibility(); const initial=!groupInput(root).checked;
  await setGroupVisibility(root,true); const selected=camadasVisiveis.size===95 && [...root.querySelectorAll(".geo-layer-record input")].every(input=>input.checked)&&groupInput(root).checked&&groupInput(parent).checked;
  await setLayerVisibility(root.querySelector('[data-id="a"]'),false);const partial=groupInput(root).indeterminate&&!groupInput(root).checked;
  await setGroupVisibility(root,false);const cleared=camadasVisiveis.size===0&&!groupInput(root).indeterminate&&!groupInput(root).checked;
  parent.querySelector('.layer-group-body').append(row('error',true));
  await setGroupVisibility(root,true);const failed=!root.querySelector('[data-id="error"] input').checked&&groupInput(root).indeterminate;
  return {initial,selected,partial,cleared,failed};
 });
 for(const [name,passed] of Object.entries(result))assert.equal(passed,true,name);
 await page.addScriptTag({content:fs.readFileSync('assets/js/status-colors.js','utf8')});
 await page.evaluate(pinSource=>{
   window.displayName=c=>c.nome; window.detail=()=>{}; window.pinCalls=[];
   window.maplibregl={Marker:class {constructor(options){this.options=options;} setLngLat(position){this.position=position;return this;} addTo(){pinCalls.push(this);return this;} remove(){this.removed=true;}}};
   (0,eval)(pinSource+';window.testProjectPin=syncProjectPin;');
 },source.slice(source.indexOf('  const projectPins ='),source.indexOf('  /* Liga/desliga uma camada')));
 const pins=await page.evaluate(()=>{
   const layer={id:'p1',fonte:'postgis',tipo:'projeto',status:'analise_aprovada',nome:'Projeto 1',bounds:[-47,-24,-46,-23],posicao:[-46.8,-23.8]};
   testProjectPin(layer,true);testProjectPin(layer,true);
   const shown=pinCalls.length===1&&pinCalls[0].position[0]===-46.8&&!!pinCalls[0].options.element.querySelector('svg');
   testProjectPin(layer,false);
   testProjectPin({...layer,id:'plano',tipo:'plano'},true);
   return shown&&pinCalls[0].removed&&pinCalls.length===1;
 });
 assert.equal(pins,true,'alfinete de projeto, posição, visibilidade e ausência em planos');
 await page.evaluate(()=>{
   const tree=document.createElement('div');tree.id='geo-layers-root';document.body.append(tree);
   ['geo-postgis-group','geo-storage-group','geo-operational-group'].forEach(id=>tree.append(document.getElementById(id)));
 });
 await page.addScriptTag({path:'geoespacial/visualizador-progresso.js'});
 await page.evaluate(()=>{
   window.loadProgress=ViewerLoadProgress.create(document.getElementById('geo-layers-root'),()=>({map:null,layers:new Map()}));
   registro.clear();camadasVisiveis.clear();window.startedLayers=[];
   const root=document.getElementById('geo-postgis-group');
   root.innerHTML='<div class="layer-group-header-row"><input type="checkbox"></div><div class="layer-group-body"></div>';
   for(let i=0;i<40;i++){
     const id=`cancel-${i}`;registro.set(id,{id,nome:id});
     const row=document.createElement('div');row.className='geo-layer-record';row.dataset.id=id;row.innerHTML='<div class="layer-group-header-row"><input type="checkbox"></div>';root.querySelector('.layer-group-body').append(row);
   }
   window.toggle=async(layer,on)=>{
     if(!on){camadasVisiveis.delete(layer.id);return;}
     startedLayers.push(layer.id);
     if(layer.id==='cancel-0'){camadasVisiveis.add(layer.id);return;}
     await new Promise((resolve,reject)=>loadProgress.signal.addEventListener('abort',()=>reject(new DOMException('Abortado','AbortError')),{once:true}));
   };
   window.cancelSelection=visibilityTest.setGroupVisibility(root,true);
 });
 await page.waitForFunction(()=>startedLayers.length>=6);
 await page.evaluate(()=>loadProgress.active.controller.abort());await page.evaluate(()=>cancelSelection);
 const cancelled=await page.evaluate(()=>({started:startedLayers.length,visible:camadasVisiveis.size,checked:[...document.querySelectorAll('#geo-postgis-group .geo-layer-record input')].filter(input=>input.checked).length,remaining:document.querySelectorAll('[data-selecting]').length}));
 assert.ok(cancelled.started<40);assert.equal(cancelled.visible,1);assert.equal(cancelled.checked,1);assert.equal(cancelled.remaining,0);
 console.log('PASS: 95 camadas selecionadas, subpastas lazy, estado parcial, ocultação, falhas, alfinetes e interrupção real da fila de 40 camadas');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});

