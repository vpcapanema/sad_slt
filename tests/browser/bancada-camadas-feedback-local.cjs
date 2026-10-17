const {chromium}=require('playwright'),fs=require('fs'),assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const p=await browser.newPage();await p.setContent('<aside id="gp-right-pane"><section id="gp-feedback-host" hidden></section></aside><section id="gp-log" class="gp-log"><header class="gp-log-heading"><strong>Mensagens de geoprocessamento</strong><button data-feedback-close>Fechar mensagens</button></header><div id="gp-log-messages"></div></section><div id="gp-layer-list"><div id="symbols" class="tree-row"></div></div>');
 await p.addStyleTag({path:'assets/css/geoprocessamento.css'});
 const code=fs.readFileSync('geoespacial/geoprocessamento.js','utf8');
 await p.addScriptTag({content:`const state={layerStyles:{},geometryTypes:{}};const layerColor=()=> '#1683c4';const escapeHtml=s=>String(s);${code.slice(code.indexOf('  function layerSymbol('),code.indexOf('  function camadaVisivel('))}${code.slice(code.indexOf('  function tipoGeometriaBase('),code.indexOf('  function storageTileQuery('))};window.legendTest=(type,renderer)=>{state.layerStyles.x={renderer};return layerLegend({id:'x',geometria_tipo:type})};`});
 for(const [type,cls,title] of [['MultiLineString','line','linha'],['Point','point','ponto'],['MultiPolygon','poligon','polígono']]) {
  for(const renderer of [null,{tipo:'categorizado',categorias:[{cor:'#123456',valor:'A'}],corOutros:'#654321'},{tipo:'graduado',fatias:[{cor:'#123456',rotulo:'A'}]}]){
   const html=await p.evaluate(({type,renderer})=>legendTest(type,renderer),{type,renderer});assert.ok(html.includes(`class="layer-symbol ${cls}"`),html);assert.ok(html.includes(`title="Geometria vetorial do tipo ${title}"`),html);assert.ok(!html.includes('legend-swatch'));
   await p.locator('#symbols').evaluate((node,html)=>node.innerHTML=html,html);
   const symbol=p.locator('#symbols .layer-symbol').first();
   assert.equal(await symbol.getAttribute('title'),`Geometria vetorial do tipo ${title}`);
   if(cls==='line'){
    assert.equal(await symbol.locator('svg path').count(),1);
    assert.equal(await symbol.evaluate(node=>getComputedStyle(node,'::after').content),'none');
   }else if(cls==='poligon'){
    assert.equal(await symbol.evaluate(node=>getComputedStyle(node).borderTopWidth),'2px');
    assert.notEqual(await symbol.evaluate(node=>getComputedStyle(node).backgroundColor),'rgba(0, 0, 0, 0)');
    assert.equal(await symbol.evaluate(node=>getComputedStyle(node).borderRadius),'3px');
    const size=await symbol.boundingBox();assert.ok(size.width>size.height);
   }else if(cls==='point'){
    assert.equal(await symbol.evaluate(node=>getComputedStyle(node).borderRadius),'50%');
    const size=await symbol.boundingBox();assert.equal(size.width,size.height);
   }
  }
 }
 const files=fs.readFileSync('geoespacial/bancada-arquivos.js','utf8');
 await p.addScriptTag({content:`const ehStorage=r=>r.id.startsWith('storage:');const separarIdStorage=id=>({caminho:id.slice(8).split('::')[0]});let calls=0;const json=async()=>{calls++;return {camadas:[{id:'storage:test.gpkg::roads',nome:'roads'},{id:'storage:test.gpkg::points',nome:'points'}]}};${files.slice(files.indexOf('async function expandirGeoPackages('),files.indexOf('async function abrirReferencias('))};window.expandTest=async()=>({layers:await expandirGeoPackages([{id:'storage:test.gpkg::roads'},{id:'storage:test.gpkg::points'}]),calls});`});
 const expanded=await p.evaluate(()=>expandTest());assert.equal(expanded.calls,1);assert.equal(expanded.layers.length,2);
 await p.addScriptTag({path:'geoespacial/bancada-feedback-local.js'});
 await p.evaluate(()=>{let proc=gpFeedback.ProcessFeedback.iniciarCadastro({tasks:['A']});proc.tarefaAtual('A');proc.progresso(50);proc.sync({etapa_atual:'B',percentual:62,logs:[{sequencia:1,nivel:'aviso',mensagem:'Aviso de teste'}]});proc.sync({etapa_atual:'C',percentual:62,logs:[{sequencia:1,nivel:'aviso',mensagem:'Aviso de teste'}]});proc.erro({message:'Erro de teste'});});
 assert.equal(await p.locator('#gp-log').isVisible(),false);
 assert.equal(await p.locator('#gp-feedback-host .execution-progress').count(),1);
 await p.getByRole('button',{name:'Exibir detalhes',exact:true}).click();
 assert.match(await p.locator('#gp-log').innerText(),/Erro de teste/);assert.equal(await p.locator('.execution-progress').first().getAttribute('class'),'execution-progress failed');assert.equal(await p.locator('[role="progressbar"]').first().getAttribute('aria-valuenow'),'62');assert.equal(await p.locator('.execution-progress-stage').first().innerText(),'Erro de teste');assert.equal(await p.locator('.log-warning').count(),1);assert.equal(await p.locator('dialog,.process-feedback-backdrop,.notification').count(),0);
 assert.equal(await p.locator('#gp-log').evaluate(node=>getComputedStyle(node).backgroundColor),'rgb(255, 255, 255)');
 await p.getByRole('button',{name:'Fechar mensagens',exact:true}).click();assert.equal(await p.locator('#gp-log').isVisible(),false);
 await p.evaluate(()=>{window.completed=gpFeedback.ProcessFeedback.iniciarCadastro();completed.progresso(41);completed.etapa('Finalizando');completed.sucesso({message:'Resultado disponível.'})});
 assert.equal(await p.locator('.execution-progress').first().getAttribute('class'),'execution-progress complete');assert.equal(await p.locator('[role="progressbar"]').first().getAttribute('aria-valuenow'),'100');assert.equal(await p.locator('.execution-progress-stage').first().innerText(),'Resultado disponível.');
 assert.equal(await p.locator('.execution-progress').count(),1);
 await p.evaluate(()=>{window.warned=gpFeedback.ProcessFeedback.iniciarCadastro({title:'Recortar'});warned.sync({logs:[{sequencia:1,nivel:'aviso',mensagem:'Geometria inválida'}]});warned.sucesso({message:'Concluído com avisos.'});});
 assert.equal(await p.locator('.execution-progress-title').innerText(),'Recortar');
 assert.match(await p.locator('.execution-progress').getAttribute('class'),/has-warnings/);
 assert.match(await p.locator('.execution-progress-footer').innerText(),/Concluído com avisos/);
 p.once('dialog',d=>d.dismiss());assert.equal(await p.evaluate(()=>gpFeedback.ProcessFeedback.confirmar({message:'Excluir?'})),false);
 await p.evaluate(()=>{window.cancelled=false;window.proc=gpFeedback.ProcessFeedback.iniciarCadastro({onCancel:()=>{window.cancelled=true}})});
 await p.getByRole('button',{name:'Cancelar execução'}).click();assert.equal(await p.evaluate(()=>cancelled),true);await p.evaluate(()=>proc.confirmarCancelamento());assert.equal(await p.getByRole('button',{name:'Cancelar execução'}).count(),0);
 assert.match(await p.locator('.execution-progress').getAttribute('class'),/cancelled/);
 await p.evaluate(()=>{window.retryProc=gpFeedback.ProcessFeedback.iniciarCadastro({title:'Teste de cancelamento',onCancel:async()=>{throw new Error('Servidor indisponível ao cancelar');}});});
 await p.getByRole('button',{name:'Cancelar execução'}).click();
 assert.match(await p.locator('.execution-progress-stage').innerText(),/Servidor indisponível ao cancelar/);
 assert.equal(await p.getByRole('button',{name:'Cancelar execução'}).isEnabled(),true);
 assert.doesNotMatch(await p.locator('.execution-progress').getAttribute('class'),/cancelled|complete|failed/);
 await p.evaluate(()=>retryProc.confirmarCancelamento());
 console.log('OK: geometry symbols, classified legends, GeoPackage deduplication, progress and stage feedback, sequenced messages, terminal result states, confirmation and cancellation.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
