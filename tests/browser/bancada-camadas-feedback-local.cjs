const {chromium}=require('playwright'),fs=require('fs'),assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const p=await browser.newPage();await p.setContent('<div id="gp-log"></div>');
 const code=fs.readFileSync('geoespacial/geoprocessamento.js','utf8');
 await p.addScriptTag({content:`const state={layerStyles:{},geometryTypes:{}};const layerColor=()=> '#1683c4';const escapeHtml=s=>String(s);${code.slice(code.indexOf('  function layerSymbol('),code.indexOf('  function camadaVisivel('))}${code.slice(code.indexOf('  function tipoGeometriaBase('),code.indexOf('  function storageTileQuery('))};window.legendTest=(type,renderer)=>{state.layerStyles.x={renderer};return layerLegend({id:'x',geometria_tipo:type})};`});
 for(const [type,cls] of [['MultiLineString','line'],['Point','point'],['MultiPolygon','polygon']]) {
  for(const renderer of [null,{tipo:'categorizado',categorias:[{cor:'#123456',valor:'A'}],corOutros:'#654321'},{tipo:'graduado',fatias:[{cor:'#123456',rotulo:'A'}]}]){
   const html=await p.evaluate(({type,renderer})=>legendTest(type,renderer),{type,renderer});assert.ok(html.includes(`layer-symbol ${cls}`),html);assert.ok(!html.includes('legend-swatch'));
  }
 }
 const files=fs.readFileSync('geoespacial/bancada-arquivos.js','utf8');
 await p.addScriptTag({content:`const ehStorage=r=>r.id.startsWith('storage:');const separarIdStorage=id=>({caminho:id.slice(8).split('::')[0]});let calls=0;const json=async()=>{calls++;return {camadas:[{id:'storage:test.gpkg::roads',nome:'roads'},{id:'storage:test.gpkg::points',nome:'points'}]}};${files.slice(files.indexOf('async function expandirGeoPackages('),files.indexOf('async function abrirReferencias('))};window.expandTest=async()=>({layers:await expandirGeoPackages([{id:'storage:test.gpkg::roads'},{id:'storage:test.gpkg::points'}]),calls});`});
 const expanded=await p.evaluate(()=>expandTest());assert.equal(expanded.calls,1);assert.equal(expanded.layers.length,2);
 await p.addScriptTag({path:'geoespacial/bancada-feedback-local.js'});
 await p.evaluate(()=>{let proc=gpFeedback.ProcessFeedback.iniciarCadastro({tasks:['A']});proc.tarefaAtual('A');proc.progresso(50);proc.sync({etapa_atual:'B'});proc.erro({message:'Erro de teste'});});
 assert.match(await p.locator('#gp-log').innerText(),/Erro de teste/);assert.equal(await p.locator('dialog,.process-feedback-backdrop,.notification').count(),0);
 p.once('dialog',d=>d.dismiss());assert.equal(await p.evaluate(()=>gpFeedback.ProcessFeedback.confirmar({message:'Excluir?'})),false);
 await p.evaluate(()=>{window.cancelled=false;window.proc=gpFeedback.ProcessFeedback.iniciarCadastro({onCancel:()=>{window.cancelled=true}})});
 await p.getByRole('button',{name:'Cancelar execução'}).click();assert.equal(await p.evaluate(()=>cancelled),true);await p.evaluate(()=>proc.confirmarCancelamento());assert.equal(await p.locator('button').count(),0);
 console.log('OK: geometry symbols, classified legends, multi-layer GeoPackage deduplication, no feedback modal, confirmation and cancellation.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
