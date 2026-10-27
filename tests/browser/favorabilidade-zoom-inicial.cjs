const {chromium} = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({headless:true,channel:process.platform === 'win32' ? 'msedge' : undefined});
  try {
    const page = await browser.newPage();
    await page.route('**/teste-zoom', r=>r.fulfill({contentType:'text/html',body:'<div id="mapa" style="width:650px;height:450px"></div><select id="mapa-superficie"></select><select id="mapa-representacao"><option value="classe">Classes</option></select><div id="mapa-legenda"></div><div id="mapa-camada-nota"></div><button id="mapa-recarregar"></button>'}));
    await page.route('**/api/**', r=>r.fulfill({json:{geometrias:{type:'FeatureCollection',features:[{
      type:'Feature',properties:{nome:'Superfície de teste',favorabilidade:{classe:'Alta',estado_classe:'valido',estado_indice:'valido',indice:.8}},
      geometry:{type:'Polygon',coordinates:[[[-53.1,-25.3],[-44.2,-25.3],[-44.2,-19.8],[-53.1,-19.8],[-53.1,-25.3]]]}
    }]}}}));
    await page.goto('http://127.0.0.1:8083/teste-zoom');
    await page.addScriptTag({url:'/assets/vendor/leaflet/leaflet.js'});
    await page.evaluate(async()=>{
      const {criarMapaFavorabilidade}=await import('/restrict/hierarquizacao/js/favorabilidade-mapa.js');
      window.mapaTeste=L.map('mapa',{zoomSnap:.25}).setView([-23,-46],15);
      criarMapaFavorabilidade({mapa:mapaTeste,entrada:{id:'j',campos:[{id:'g',nome:'Teste',papel:'grade'}],linhas:[]},
        recortes:[],demandas:L.featureGroup(),node:id=>document.getElementById(id),avisar(){}});
    });
    await page.waitForFunction(()=>mapaTeste.getZoom()<10);
    const resultado = await page.evaluate(()=>({zoom:mapaTeste.getZoom(),centro:mapaTeste.getCenter(),
      completa:mapaTeste.getBounds().contains(L.latLngBounds([[-25.3,-53.1],[-19.8,-44.2]]))}));
    assert(resultado.completa);
    assert(Math.abs(resultado.centro.lng-(-48.65))<.01);
    assert(resultado.zoom>=5 && resultado.zoom<=8);
    console.log('PASS: zoom inicial enquadra a superfície integral com contexto regional.');
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
