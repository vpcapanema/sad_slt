const {chromium}=require('playwright'),fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage();const source=fs.readFileSync('geoespacial/geoespacial-visualizador-camadas.js','utf8');
 const code=source.slice(source.indexOf('  async function openRequestedLayer'),source.indexOf('  /* ---------- Geometria de saída ---------- */'));
 for(const test of [
  {id:'cadastro:projeto:PRJ-1',source:'postgis',folder:'postgis-projeto'},
  {id:'storage:base-geoespacial/vetor/dados.gpkg::rios',source:'storage',folder:'base-geoespacial'},
  {id:'saida_exportada_1',source:'saida',folder:'saida-execucao'}
 ]){
  await page.setContent('<div class="layer-group collapsed" id="group"><div class="layer-group-header-row"><button></button></div><div class="layer-group-body" id="tree"></div></div>');
  const result=await page.evaluate(async({code,test})=>{
   const calls=[],loaded=[],registry=new Map(),tree=document.getElementById('tree');
   const createFolder=(key,parent)=>{const f=document.createElement('div');f.className='layer-group geo-layer-folder collapsed';f.dataset.folderId=key;if(test.source==='storage')f.dataset.caminho=key;f.innerHTML='<div class="layer-group-header-row"><button></button></div><div class="layer-group-body"></div>';parent.append(f);return f;};
   const createRecord=parent=>{const row=document.createElement('div');row.className='geo-layer-record';row.dataset.id=test.id;parent.append(row);registry.set(test.id,{arquivo:'base-geoespacial/vetor/dados.gpkg'});};
   const folder=createFolder(test.folder,tree);if(test.source==='saida')createRecord(folder.querySelector('.layer-group-body'));
   const ensureFolder=async f=>{loaded.push(f.dataset.folderId);const body=f.querySelector('.layer-group-body');if(test.source==='storage'&&f.dataset.caminho==='base-geoespacial')createFolder('base-geoespacial/vetor',body);else createRecord(body);};
   const open=new Function('requestedLayer','registro','ensureFolder','setLayerVisibility','feedback','let requestedLayerHandled=false;'+code+';return openRequestedLayer;')(test.id,registry,ensureFolder,async row=>calls.push(row.dataset.id),()=>{});
   await open('unrelated');await open(test.source);await open(test.source);
   return {calls,loaded,collapsed:document.querySelectorAll('.collapsed').length};
  },{code,test});
  assert.deepEqual(result.calls,[test.id]);assert.equal(result.collapsed,0);
  if(test.source==='storage')assert.deepEqual(result.loaded,['base-geoespacial','base-geoespacial/vetor']);
 }
 console.log('PASS links explorador: demanda, storage aninhado e saída; somente camada solicitada e pais expandidos');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1);});
