// Resposta real do leitor para um GPKG sintético; Leaflet/MapLibre reais, APIs interceptadas.
const {chromium}=require('playwright');
const {execFileSync}=require('node:child_process');
const assert=require('node:assert/strict');
const fixture=JSON.parse(execFileSync(process.env.SICARD_PYTHON||'/home/codespace/.venvs/sicard-app/bin/python',['-c',`
import json,base64,tempfile
from pathlib import Path
import numpy as np,geopandas as gpd
from shapely.geometry import Polygon
from api.services import extracao_entrada_local as l
l.localizacao=lambda f:{'status':'consultado','ufs':[],'municipios':[]}
a=np.linspace(0,2*np.pi,600001)
f=gpd.GeoDataFrame({'codigo':['original']},geometry=[Polygon(np.column_stack((-47+.1*np.cos(a),-23+.1*np.sin(a))))],crs=4326)
with tempfile.TemporaryDirectory() as d:
 p=Path(d)/'complexa.gpkg';f.to_file(p,layer='original',driver='GPKG');data=p.read_bytes()
 print(json.dumps({'arquivo':base64.b64encode(data).decode(),'previa':l.previa(data,p.name)}))
`],{maxBuffer:32*1024*1024,env:{...process.env,SLT_USE_SIGMA_POSTGRES:'false',SLT_DATABASE_URL:''}}));
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--no-proxy-server','--enable-unsafe-swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/**',r=>{
   const path=new URL(r.request().url()).pathname;
   if(path.includes('/auth/'))return r.fulfill({json:{authenticated:true,id:'teste',nome:'Teste',tipo_usuario:'ADMIN'}});
   if(path.endsWith('/catalogo'))return r.fulfill({json:{categorias:[{id:'social',nome:'Social'}],camadas:[]}});
   if(path.endsWith('/entrada-local'))return r.fulfill({json:fixture.previa});
   return r.fulfill({json:[]});
  });
  await page.goto(`${process.env.SICARD_TEST_URL||'http://127.0.0.1:8083'}/restrict/geoespacial/extracao-atributos/`,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.SICARDExtracao&&document.querySelector('#ea-catalog-status').hidden);
  await page.evaluate(()=>{
   const map=L.map,geo=L.geoJSON;
   L.map=function(...args){const m=map(...args);window.testPreviewMap=m;return m;};
   L.geoJSON=function(...args){const g=geo(...args);window.testPreviewGeometry=g;return g;};
  });
  await page.locator('#ea-input-file').setInputFiles({name:'complexa.gpkg',mimeType:'application/octet-stream',buffer:Buffer.from(fixture.arquivo,'base64')});
  await page.locator('#ea-input-preview:not([hidden])').waitFor();
  assert.match(await page.locator('#ea-input-preview-data').textContent(),/600\.001/);
  assert.match(await page.locator('#ea-input-preview-data').textContent(),/Prévia simplificada/);
  const meta=fixture.previa.camadas[0].metadados_local.previa;
  assert.ok(meta.vertices_exibidos>meta.nivel_resumido.vertices_exibidos);
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  for(const [zoom,vertices] of [[13,meta.vertices_exibidos],[8,meta.nivel_resumido.vertices_exibidos]]){
   await page.evaluate(z=>{const m=window.testPreviewMap;m.stop();m.setView(m.getCenter(),z,{animate:false,reset:true});},zoom);
   await page.waitForFunction(n=>window.testPreviewGeometry.toGeoJSON().features[0].geometry.coordinates[0].length===n,vertices);
  }
  const id=fixture.previa.camadas[0].id;
  await page.waitForFunction(id=>document.querySelector('#ea-workbench-frame').contentWindow.gpApp?.state.layers.some(l=>l.id===id),id);
  assert.equal(await page.evaluate(id=>document.querySelector('#ea-workbench-frame').contentWindow.gpApp.state.layers.find(l=>l.id===id).previaAproximada,id),true);
  for(const [zoom,vertices] of [[13,meta.vertices_exibidos],[8,meta.nivel_resumido.vertices_exibidos]]){
   await page.evaluate(z=>document.querySelector('#ea-workbench-frame').contentWindow.gpApp.state.map.stop().jumpTo({zoom:z}),zoom);
   await page.waitForFunction(({id,n})=>document.querySelector('#ea-workbench-frame').contentWindow.gpApp.state.map.getSource(id)?._data.features[0].geometry.coordinates[0].length===n,{id,n:vertices});
  }
  assert.equal(await page.locator('#ea-run').isDisabled(),true,'Sem base e algoritmo não executa');
  assert.deepEqual(errors,[]);
  console.log('PASS: camada de 600 mil vértices validada; Leaflet e bancada alternam prévias leves por zoom.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
