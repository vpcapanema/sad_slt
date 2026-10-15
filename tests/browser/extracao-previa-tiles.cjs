const assert=require('node:assert/strict');
const fs=require('fs'),path=require('path');
const {chromium}=require('playwright');
const varint=n=>{const a=[];while(n>127){a.push((n&127)|128);n>>>=7;}return Buffer.from([...a,n]);};
const bytes=(field,b)=>Buffer.concat([varint(field*8+2),varint(b.length),b]);
const integer=(field,n)=>Buffer.concat([varint(field*8),varint(n)]);
const geometry=Buffer.concat([9,2000,2000,26,4000,0,0,4000,3999,0,15].map(varint));
const feature=Buffer.concat([integer(1,1),integer(3,3),bytes(4,geometry)]);
const tile=bytes(3,Buffer.concat([bytes(1,Buffer.from('camada')),bytes(2,feature),integer(5,4096),integer(15,2)]));
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 try{
  const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>{
   const url=new URL(route.request().url());
   if(url.pathname==='/')return route.fulfill({contentType:'text/html',body:`<meta charset="utf-8"><link rel="stylesheet" href="/assets/vendor/leaflet/leaflet.css"><link rel="stylesheet" href="/assets/vendor/maplibre-gl/maplibre-gl.css"><div id="map" style="width:800px;height:600px"></div><script src="/assets/vendor/leaflet/leaflet.js"></script><script src="/assets/vendor/maplibre-gl/maplibre-gl.js"></script><script src="/assets/vendor/maplibre-gl/leaflet-maplibre-gl.js"></script>`});
   if(url.pathname.startsWith('/tiles/'))return route.fulfill({body:tile,contentType:'application/x-protobuf'});
   const file=path.join(process.cwd(),url.pathname);return route.fulfill({body:fs.readFileSync(file),contentType:url.pathname.endsWith('.css')?'text/css':'text/javascript; charset=utf-8'});
  });
  await page.goto('http://localhost/');
  await page.evaluate(async()=>{
   const {camadaTiles}=await import('/geoespacial/extracao-atributos/previa-tiles.js');
   window.map=L.map('map').setView([0,0],1);
   window.layer=camadaTiles(map,{tiles_url:'http://localhost/tiles/a/{z}/{x}/{y}',bounds:[-90,-66,90,66]},'#ff0000').addTo(map);
   window.overlay=Object.values(map._layers).find(l=>l.getMaplibreMap);window.gl=overlay.getMaplibreMap();
   window.addMore=()=>{window.second=camadaTiles(map,{tiles_url:'http://localhost/tiles/b/{z}/{x}/{y}'},'#0000ff').addTo(map);window.third=camadaTiles(map,{tiles_url:'http://localhost/tiles/c/{z}/{x}/{y}'},'#00ff00').addTo(map);};
  });
  await page.waitForFunction(()=>gl.loaded()&&gl.queryRenderedFeatures().length>0);
  assert.equal(await page.evaluate(()=>overlay.getPaneName()),'overlayPane');
  await page.evaluate(()=>addMore());
  await page.waitForFunction(()=>Object.keys(gl.getStyle().sources).length===3&&gl.loaded());
  assert.equal(await page.evaluate(()=>new Set(gl.queryRenderedFeatures().map(f=>f.source)).size),3);
  await page.evaluate(()=>{map.removeLayer(second);second.addTo(map);});
  await page.waitForFunction(()=>Object.keys(gl.getStyle().sources).length===3&&gl.loaded());
  assert.deepEqual(errors,[]);console.log('Leaflet/MapLibre reais: três camadas renderizadas, acima do fundo; remoção e reexibição OK.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
