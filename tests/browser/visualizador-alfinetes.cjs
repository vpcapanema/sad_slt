const {chromium}=require('playwright');
const fs=require('node:fs');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:1200,height:800}});
  await page.setContent('<div id="map" style="width:1100px;height:700px"></div>');
  await page.addStyleTag({path:'assets/vendor/maplibre-gl/maplibre-gl.css'});
  await page.addScriptTag({path:'assets/vendor/maplibre-gl/maplibre-gl.js'});
  await page.addScriptTag({path:'assets/js/status-colors.js'});
  const source=fs.readFileSync('geoespacial/geoespacial-visualizador-camadas.js','utf8');
  await page.evaluate(async pinSource=>{
   const map=new maplibregl.Map({container:'map',style:{version:8,sources:{},layers:[]},center:[-47,-23],zoom:6});
   await new Promise(resolve=>map.once('load',resolve));
   window.GeoespacialMap={map};window.displayName=x=>x.nome;window.detail=()=>{};
   (0,eval)(pinSource+';window.testProjectPin=syncProjectPin;');
  },source.slice(source.indexOf('  const projectPins ='),source.indexOf('  /* Liga/desliga uma camada')));
  const rows=process.argv[2]?JSON.parse(fs.readFileSync(process.argv[2],'utf8')):Array.from({length:94},(_,i)=>({id:`p${i}`,tipo:'projeto',nome:`Projeto ${i}`,status:['analise_aprovada','analise_em_avaliacao','hierarq_em_andamento'][i%3],bounds:[-49,-25,-45,-21],posicao:[-48+(i%13)*.2,-24+Math.floor(i/13)*.2]}));
  const result=await page.evaluate(async rows=>{
   rows.forEach(row=>testProjectPin({...row,fonte:'postgis'},true));
   const positions=rows.map(row=>row.posicao||[(row.bounds[0]+row.bounds[2])/2,(row.bounds[1]+row.bounds[3])/2]);
   GeoespacialMap.map.fitBounds([[Math.min(...positions.map(p=>p[0])),Math.min(...positions.map(p=>p[1]))],[Math.max(...positions.map(p=>p[0])),Math.max(...positions.map(p=>p[1]))]],{padding:60,duration:0});
   await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
   const markers=[...document.querySelectorAll('.maplibregl-marker')];
   const correctlySized=markers.every(marker=>{const r=marker.querySelector('svg').getBoundingClientRect();return Math.abs(r.width-24)<.1&&Math.abs(r.height-36)<.1;});
   const onMap=markers.filter(marker=>{const r=marker.getBoundingClientRect();return r.right>0&&r.left<1100&&r.bottom>0&&r.top<700;}).length;
   rows.forEach(row=>testProjectPin({...row,fonte:'postgis'},false));
   return {total:markers.length,correctlySized,onMap,remaining:document.querySelectorAll('.maplibregl-marker').length};
  },rows);
  assert.equal(result.total,rows.length);assert.equal(result.correctlySized,true);assert.equal(result.onMap,rows.length);assert.equal(result.remaining,0);
  console.log('PASS MapLibre real:',JSON.stringify(result));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
