const {chromium}=require('playwright');
const fs=require('node:fs');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
 const page=await browser.newPage();
 const html=fs.readFileSync('templates/paginas/geoespacial/visualizador-camadas.html','utf8');
 const bar=html.slice(html.indexOf('  <div id="viewer-layer-filter"'),html.indexOf('  <section class="secao-camadas'));
 await page.setContent('<span id="postgis-layer-count"></span><span id="viewer-layer-count"></span>'+bar+['geo-postgis-group','geo-storage-group','geo-operational-group'].map(id=>`<div id="${id}" class="layer-group"><div class="layer-group-header-row"><input type="checkbox"></div><div class="layer-group-body"></div></div>`).join(''));
 await page.addScriptTag({path:'assets/js/status-colors.js'});await page.addScriptTag({path:'assets/js/painel-layer-filter.js'});
 const source=fs.readFileSync('geoespacial/geoespacial-visualizador-camadas.js','utf8');
 await page.evaluate(chunk=>{
 window.loadProgress={active:null,begin:()=>({controller:new AbortController()}),plan:()=>{},repaint:()=>{},task:async(op,kind,label,job)=>job(),end:async()=>{}};window.displayName=x=>x.nome || x.id;window.trackLoad=async(kind,label,job)=>job();window.loadSources=()=>Promise.all([load(),loadPostgis(),loadStorage()]);window.camadas=[];window.registro=new Map();window.camadasVisiveis=new Set();window.contagensStorage=new Map();window.falhasContagensStorage=new Set();window.aviso='';window.sourceRevision=0;
 window.calls=[];window.pinVisibility=new Map();window.renderLegend=()=>{};window.syncVisibility=()=>{};window.syncProjectPin=(layer,shown)=>pinVisibility.set(layer.id,shown);
 window.groupInput=group=>group.querySelector('input');window.ensureFolder=async()=>{};window.setGroupVisibility=async()=>{};
 window.GeoespacialMap={layers:new Map(),toggleLayer:(id,on)=>GeoespacialMap.layers.get(id).visible=on,removeLayer:id=>GeoespacialMap.layers.delete(id)};
 window.addRow=(layer,group)=>{registro.set(layer.id,layer);const row=document.createElement('div');row.className='geo-layer-record';row.dataset.id=layer.id;row.innerHTML='<input type="checkbox">';document.querySelector(`#${group} .layer-group-body`).append(row);GeoespacialMap.layers.set(layer.id,{visible:true});return row;};
 addRow({id:'cadastro:projeto:1',nome:'Projeto A',tipo:'projeto',fonte:'postgis',status:'analise_aprovada'},'geo-postgis-group');
 addRow({id:'cadastro:projeto:2',nome:'Projeto B',tipo:'projeto',fonte:'postgis',status:'analise_em_avaliacao'},'geo-postgis-group');
 camadasVisiveis.add('cadastro:projeto:1');camadasVisiveis.add('cadastro:projeto:2');
 window.fetch=async()=>({ok:true,json:async()=>[{id:'1',tipo:'projeto',nome:'Projeto A',status:'analise_aprovada',plano_nome:'Plano A',programa_nome:'Programa A',abrangencia:['SP'],instituicao_label:'Instituição A'},{id:'2',tipo:'projeto',nome:'Projeto B',status:'analise_em_avaliacao',plano_nome:'Plano B',programa_nome:'Programa B',abrangencia:['RJ'],instituicao_label:'Instituição B'}]});
 window.load=async()=>{calls.push('saidas');document.querySelector('#geo-operational-group .layer-group-body').innerHTML='';addRow({id:'saida:1',nome:'Saída nova'},'geo-operational-group');};
 window.loadPostgis=async()=>{calls.push('postgis');document.querySelector('#geo-postgis-group .layer-group-body').innerHTML='';addRow({id:'cadastro:projeto:1',tipo:'projeto',nome:'Projeto atualizado',status:'analise_aprovada'},'geo-postgis-group');};
 window.loadStorage=async()=>{calls.push('storage');document.querySelector('#geo-storage-group .layer-group-body').innerHTML='';addRow({id:'storage:1',nome:'Arquivo novo'},'geo-storage-group');};
 window.setLayerVisibility=async(row,on)=>{if(on)camadasVisiveis.add(row.dataset.id);else camadasVisiveis.delete(row.dataset.id);};
 (0,eval)(chunk+';window.filtersTest={initLayerFilter,loadFilterMetadata,refreshSources};');
 },source.slice(source.indexOf('  let layerFilterApi ='),source.indexOf('  const projectPins =')));
 await page.evaluate(async()=>{await filtersTest.loadFilterMetadata();filtersTest.initLayerFilter();});
 for(const [field,value] of [['status','analise_aprovada'],['nome','Projeto A'],['plano','Plano A'],['programa','Programa A'],['abrangencia','SP'],['instituicao','Instituição A']]){
  await page.locator('.painel-layer-filter-field').click();await page.locator(`.painel-layer-filter-field [data-value="${field}"]`).click();
  await page.locator('.painel-layer-filter-value').click();await page.locator(`.painel-layer-filter-value [data-value="${value}"]`).click();
  await page.locator('.painel-layer-filter-btn--apply').click();
  assert.deepEqual(await page.evaluate(()=>[...GeoespacialMap.layers.values()].map(x=>x.visible)),[true,false],field);
  assert.equal(await page.locator('.geo-layer-record:not([hidden])').count(),1,field);
  await page.locator('.painel-layer-filter-btn--clear').click();
  assert.deepEqual(await page.evaluate(()=>[...GeoespacialMap.layers.values()].map(x=>x.visible)),[true,true]);
 }
 await page.locator('#viewer-refresh').click();await page.waitForFunction(()=>document.getElementById('viewer-refresh-status').textContent==='Camadas atualizadas.');
 assert.deepEqual(await page.evaluate(()=>calls.sort()),['postgis','saidas','storage']);
 assert.equal(await page.locator('.geo-layer-record').count(),3);
 assert.equal(await page.evaluate(()=>camadasVisiveis.has('cadastro:projeto:1')),true);
 assert.equal(await page.locator('#viewer-refresh').isEnabled(),true);
 console.log('PASS: seis filtros, aplicar/limpar, sidebar/mapa/alfinetes, três fontes atualizadas e seleção preservada');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
