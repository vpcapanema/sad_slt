const {chromium}=require('playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try {
  const page=await browser.newPage();
  await page.setContent('<div id="geo-layers-root"><div class="layer-group--tipo" id="group"><div class="layer-group-header-row"><input checked type="checkbox"><span>Demandas</span></div><div class="layer-group-body" id="rows"></div></div></div>');
  await page.addScriptTag({path:'geoespacial/visualizador-progresso.js'});
  const result=await page.evaluate(async()=>{
   const body=document.getElementById('rows');
   body.innerHTML=Array.from({length:500},(_,i)=>`<div class="geo-layer-record" data-id="${i}"><div class="layer-group-header-row"><input checked type="checkbox"><span>Camada ${i}</span></div></div>`).join('');
   const handlers=new Map(),map={on:(name,fn)=>{if(!handlers.has(name))handlers.set(name,new Set());handlers.get(name).add(fn);},off:(name,fn)=>handlers.get(name)?.delete(fn),isMoving:()=>false,getSource:()=>true,isSourceLoaded:()=>false,triggerRepaint:()=>{}};
   const progress=ViewerLoadProgress.create(document.getElementById('geo-layers-root'),()=>({map,layers:new Map([['visible',{visible:true,sourceId:'visible'}]])}));
   const op=progress.begin('500 camadas');
   for(let i=0;i<500;i++)progress.plan(op,'camada',String(i),String(i));
   const finished=progress.end(op);
   await new Promise(requestAnimationFrame);
   await new Promise(requestAnimationFrame);
   let queries=0;
   const original=Element.prototype.querySelectorAll;
   Element.prototype.querySelectorAll=function(...args){queries++;return original.apply(this,args);};
   const start=performance.now();
   for(let i=0;i<200;i++)handlers.get('sourcedata').forEach(fn=>fn({type:'sourcedata',sourceId:'test',coord:{i},sourceDataType:'content'}));
   await new Promise(requestAnimationFrame);
   const elapsed=performance.now()-start;
   Element.prototype.querySelectorAll=original;
   const result={queries,elapsed,waitingMap:op.waitingMap,rows:body.children.length,bars:document.querySelectorAll('.layer-item__loading--visible').length};
   op.controller.abort();await finished;return result;
  });
  assert.equal(result.waitingMap,true);assert.equal(result.rows,500);assert.equal(result.bars,501);
  assert.ok(result.queries<=1,`tile burst must reuse DOM index: ${result.queries}`);
  // The real frontend queue must bound all request paths, including refresh.
  const source=fs.readFileSync('geoespacial/geoespacial-visualizador-camadas.js','utf8');
  const queue=source.slice(source.indexOf('  const pendingRequests'),source.indexOf('  const trackLoad'));
  const scheduling=await page.evaluate(async code=>{
   let active=0,max=0,total=0;
   const original=window.fetch;
   window.fetch=async()=>{active++;total++;max=Math.max(max,active);await new Promise(resolve=>setTimeout(resolve,5));active--;return {ok:true};};
   const loadProgress={signal:undefined};
   const fetchQueued=new Function('loadProgress',code+';return fetch;')(loadProgress);
   await Promise.all(Array.from({length:94},(_,i)=>fetchQueued('/layer/'+i)));
   window.fetch=original;return {max,total};
  },queue);
  assert.equal(scheduling.total,94);assert.equal(scheduling.max,6);
  const readyCode=source.slice(source.indexOf('  let initialMapReady'),source.indexOf('  function detailRows'));
  const readiness=await page.evaluate(async code=>{
    let callback,calls=0;
    const map={isStyleLoaded:()=>false,once:(event,fn)=>{calls++;callback=fn;}};
    const ready=new Function('GeoespacialMap',code+';return mapReady;')({map});
    const first=ready();callback();await first;
    // Newly added sources are loading, but the initial load will never fire twice.
    const second=await Promise.race([ready().then(()=>true),new Promise(resolve=>setTimeout(()=>resolve(false),100))]);
    return {calls,second};
  },readyCode);
  assert.deepEqual(readiness,{calls:1,second:true});
  console.log('PASS performance:',JSON.stringify({eventBurst:200,layerRows:500,...result,...scheduling}));
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
