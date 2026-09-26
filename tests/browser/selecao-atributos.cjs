// Template e Tabulator reais; seleção em memória, nenhuma persistência externa.
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const page=await browser.newPage({viewport:{width:1200,height:900}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',message=>{if(message.text().includes('Table Not Initialized'))errors.push(message.text());});
  const html=fs.readFileSync('templates/componentes/_geoprocessamento.html','utf8');
  await page.setContent(`<div id="gp-editor-view"></div>${html.match(/<template id="gp-attribute-template">[\s\S]*?<\/template>/)[0]}`);
  for(const file of ['assets/vendor/tabulator/tabulator.min.css','assets/css/geoprocessamento-atributos.css'])await page.addStyleTag({path:path.resolve(file)});
  for(const file of ['assets/vendor/tabulator/tabulator.min.js','assets/vendor/lucide/lucide.min.js'])await page.addScriptTag({path:path.resolve(file)});
  await page.evaluate(()=>{
   window.gpApp={state:{layers:[{id:'teste',nome:'Camada de teste'}],editingLayers:new Set(),attributeTableLayers:['teste']}};
   window.gpCommands={featureKey:(_p,id)=>String(id),setLayerSelection:(id,features)=>{
    gpApp.state.selectedGeoJSON={type:'FeatureCollection',features:features.map(f=>({...f,properties:{...f.properties,__gp_layer_id:id}}))};
   }};
   window.body={colunas:[{nome:'numero',tipo:'float64'},{nome:'texto',tipo:'object'},{nome:'booleano',tipo:'boolean'}],registros:Array.from({length:105},(_,i)=>{
    const properties={numero:i%3===0?null:i===1?0:i,texto:i%3===0?null:i===1?'':'null',booleano:i%3===0?null:i%2===0};
    return {...properties,_indice:i,__gp_feature:{type:'Feature',id:i,properties,geometry:{type:'Point',coordinates:[-46,-23]}}};
   })};
  });
  await page.addScriptTag({path:path.resolve('geoespacial/geoprocessamento-atributos.js')});
  await page.evaluate(()=>gpAttributeTable.render('teste',body));
  await page.waitForSelector('.tabulator-row');
  await page.locator('.attribute-query summary').click();
  const selected=()=>page.evaluate(()=>gpAttributeTable.grid.getSelectedData().map(r=>r._indice).sort((a,b)=>a-b));
  const nulls=Array.from({length:105},(_,i)=>i).filter(i=>i%3===0),nonNulls=Array.from({length:105},(_,i)=>i).filter(i=>i%3!==0);
  for(const field of ['numero','texto','booleano']){
   await page.locator('[data-at-field]').selectOption(field);
   await page.locator('[data-at-operator]').selectOption('is_null');
   assert(await page.locator('[data-at-value]').isDisabled());
   await page.locator('[data-at-query] button').click();
   assert.deepEqual(await selected(),nulls);
   await page.locator('[data-at-operator]').selectOption('is_not_null');
   await page.locator('[data-at-query] button').click();
   assert.deepEqual(await selected(),nonNulls);
  }
  // A busca na seleção atual pode reduzir o conjunto a vazio.
  await page.locator('[data-at-scope]').selectOption('selection');
  await page.locator('[data-at-operator]').selectOption('is_null');
  await page.locator('[data-at-query] button').click();
  assert.deepEqual(await selected(),[]);
  await page.getByRole('button',{name:'Inverter seleção',exact:true}).click();
  assert.equal((await selected()).length,105);
  await page.locator('[data-at-query] button').click();
  assert.deepEqual(await selected(),nulls);
  // Inversão alcança outras páginas e funciona com somente selecionados ativo.
  await page.locator('[data-at-action="only"]').click();
  await page.getByRole('button',{name:'Inverter seleção',exact:true}).click();
  assert.deepEqual(await selected(),nonNulls);
  assert.equal(await page.evaluate(()=>gpAttributeTable.grid.getDataCount('active')),70);
  assert.deepEqual(await page.evaluate(()=>gpApp.state.selectedGeoJSON.features.map(f=>f.id).sort((a,b)=>a-b)),nonNulls);
  await page.getByRole('button',{name:'Inverter seleção',exact:true}).click();
  assert.deepEqual(await selected(),nulls);
  await page.locator('[data-at-action="clear"]').click();
  await page.getByRole('button',{name:'Inverter seleção',exact:true}).click();
  await page.getByRole('button',{name:'Inverter seleção',exact:true}).click();
  assert.deepEqual(await selected(),[]);
  // Regressão das condições existentes e distinção entre nulo e zero.
  await page.locator('[data-at-scope]').selectOption('all');
  await page.locator('[data-at-field]').selectOption('numero');
  await page.locator('[data-at-operator]').selectOption('=');
  assert(await page.locator('[data-at-value]').isEnabled());
  await page.locator('[data-at-query] button').click();
  assert.match(await page.locator('[data-at-status]').innerText(),/número válido/);
  await page.locator('[data-at-value]').fill('0');
  await page.locator('[data-at-query] button').click();
  assert.deepEqual(await selected(),[1]);
  // A busca considera o rascunho editado sem chamar uma API de gravação.
  await page.evaluate(()=>gpAttributeTable.grid.updateData([{__gp_row:1,numero:null}]));
  await page.locator('[data-at-operator]').selectOption('is_null');
  await page.locator('[data-at-query] button').click();
  assert.deepEqual(await selected(),[...nulls,1].sort((a,b)=>a-b));
  // Excluir os nulos e salvar mantém as feições restantes e reinicializa a grade.
  page.on('dialog',dialog=>dialog.accept());
  await page.evaluate(()=>{
   window.gpArquivos={sessions:new Map([['teste',{arquivo:'data/geoespacial/outputs/teste.gpkg',revisao:'a'.repeat(64),nome:'Teste'}]]),adicionar:()=>{}};
   window.fetch=async(url,options)=>{
    window.savedRequest={url,payload:JSON.parse(options.body)};
    return {ok:true,json:async()=>({id:'teste'})};
   };
   gpApp.showAttributes=async()=>{
    const features=savedRequest.payload.geojson.features;
    gpAttributeTable.render('teste',{...body,registros:features.map(f=>({...f.properties,__gp_feature:f}))});
   };
  });
  await page.locator('[data-at-delete]').click();
  await page.waitForFunction(()=>gpAttributeTable.grid.getData().length===69);
  await page.locator('[data-at-save]').click();
  await page.waitForFunction(()=>document.querySelector('[data-at-status]').textContent.includes('Nova versão salva'));
  assert.equal(await page.evaluate(()=>savedRequest.payload.geojson.features.length),69);
  assert.equal(await page.evaluate(()=>savedRequest.payload.geojson.features.every(f=>f.properties.numero!==null)),true);
  assert.equal(await page.evaluate(()=>savedRequest.url),'/api/geoespacial/bancada-arquivos/salvar');
  await page.screenshot({path:'/tmp/sicard-selecao-atributos.png',fullPage:true});
  assert.deepEqual(errors,[]);
  console.log('Seleção de nulos/não nulos, inversão, paginação, escopo, mapa e rascunho: OK');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
