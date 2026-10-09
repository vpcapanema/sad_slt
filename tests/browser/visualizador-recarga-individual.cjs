const {chromium}=require('playwright');const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
const page=await browser.newPage();await page.setContent('<div id="geo-postgis-group" class="layer-group--tipo"><div class="layer-group-header-row"><input type="checkbox"><span class="layer-group-name">Demandas</span></div><div class="layer-group-body"></div></div><div id="geo-storage-group" class="layer-group--tipo"><div class="layer-group-header-row"><input type="checkbox"><span class="layer-group-name">Storage</span></div><div class="layer-group-body"></div></div>');
const source=fs.readFileSync('geoespacial/geoespacial-visualizador-camadas.js','utf8');
await page.evaluate(code=>{
 window.API='/api/geoespacial';window.sourceRevision=0;window.aviso='';window.registro=new Map();window.camadasVisiveis=new Set();window.contagensStorage=new Map();window.falhasContagensStorage=new Set();window.requests=[];window.removed=[];
 window.domId=id=>id.replace(/[^a-zA-Z0-9_-]/g,'-');window.displayName=item=>item.nome;window.humanizar=x=>x;
 window.layerRowHtml=item=>{registro.set(item.id,item);return `<div class="geo-layer-record" data-id="${item.id}"><div class="layer-group-header-row"><input type="checkbox" id="layer-${domId(item.id)}"><span>${item.nome}</span></div></div>`;};
 window.bindLayerRows=()=>{};window.groupInput=row=>row.querySelector(':scope > .layer-group-header-row input');window.syncProjectPin=()=>{};window.syncVisibility=()=>{};window.applyLayerFilter=()=>{};
 window.loadProgress={begin:()=>({controller:new AbortController()}),task:async(op,kind,label,job)=>job(),plan:()=>{},end:async()=>{}};
 window.GeoespacialMap={layers:new Map(),removeLayer:id=>{removed.push(id);GeoespacialMap.layers.delete(id);}};
 window.toggle=async(layer,on)=>{if(on){camadasVisiveis.add(layer.id);GeoespacialMap.layers.set(layer.id,{visible:true,data:layer.geojson});}};
 window.setLayerVisibility=async(row,on)=>{groupInput(row).checked=on;await toggle(registro.get(row.dataset.id),on);};
 window.fetch=async url=>{requests.push(url);return {ok:true,json:async()=>({itens:[{id:'cadastro:projeto:1',tipo:'projeto',nome:'Atualizado 1',geojson:{revision:2}},{id:'cadastro:projeto:2',tipo:'projeto',nome:'Atualizado 2',geojson:{revision:2}}]})};};
 for(const item of [{id:'cadastro:projeto:1',tipo:'projeto',fonte:'postgis',nome:'Antigo 1',geojson:{revision:1}},{id:'cadastro:projeto:2',tipo:'projeto',fonte:'postgis',nome:'Antigo 2',geojson:{revision:1}},{id:'storage:1',fonte:'storage',nome:'Storage',geojson:{revision:1}}]){
  document.querySelector(`#${item.fonte==='postgis'?'geo-postgis-group':'geo-storage-group'} .layer-group-body`).insertAdjacentHTML('beforeend',layerRowHtml(item));camadasVisiveis.add(item.id);GeoespacialMap.layers.set(item.id,{visible:true,data:item.geojson});
 }
 window.loadFilterMetadata=async()=>{};
 window.loadPostgis=async()=>{requests.push('loadPostgis');const body=document.querySelector('#geo-postgis-group .layer-group-body');body.innerHTML='';for(let i=1;i<=2;i++)body.insertAdjacentHTML('beforeend',layerRowHtml({id:`cadastro:projeto:${i}`,tipo:'projeto',fonte:'postgis',nome:`Grupo novo ${i}`,geojson:{revision:3}}));};
 (0,eval)(code+';window.testReload=reloadTreeItem;');
},source.slice(source.indexOf('  async function reloadTreeItem('),source.indexOf('  async function refreshSources(')));
await page.evaluate(()=>testReload(document.querySelector('[data-id="cadastro:projeto:1"]')));
let state=await page.evaluate(()=>({requests,removed,first:registro.get('cadastro:projeto:1').nome,second:registro.get('cadastro:projeto:2').nome,other:GeoespacialMap.layers.get('storage:1').data.revision}));
assert.deepEqual(state.requests,['/api/geoespacial/cadastro-geometrias/projeto?codigo=1']);assert.deepEqual(state.removed,['cadastro:projeto:1']);assert.equal(state.first,'Atualizado 1');assert.equal(state.second,'Antigo 2');assert.equal(state.other,1);
await page.evaluate(()=>testReload(document.getElementById('geo-postgis-group')));
state=await page.evaluate(()=>({requests,removed,selected:[...camadasVisiveis],first:registro.get('cadastro:projeto:1').nome,storage:GeoespacialMap.layers.get('storage:1').data.revision}));
assert.equal(state.requests.at(-1),'loadPostgis');assert.equal(state.first,'Grupo novo 1');assert.equal(state.storage,1);assert.ok(state.selected.includes('cadastro:projeto:1')&&state.selected.includes('cadastro:projeto:2'));assert.equal(state.removed.includes('storage:1'),false);
console.log('PASS: recarga individual consulta a fonte e troca apenas a camada; recarga de Demandas mantém seleção e preserva Storage');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1);});
