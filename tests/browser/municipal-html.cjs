// APIs interceptadas: não gera arquivos nem grava no acervo oficial.
const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{
 const b=await chromium.launch({headless:true,args:['--no-sandbox']});
 const p=await b.newPage();const errors=[];let payload,catalogRequests=0,categoriesDone=false;
 p.on('pageerror',e=>errors.push(e.message));
 const attributes=Array.from({length:45},(_,i)=>({id:`a${i}`,label:`Indicador ${i}`,source:'Fonte',year:2022,theme:'economia',field:`campo${i}`,unit:'R$',coverage:645,detail:JSON.stringify({categorias:`Grupo: ${i%2?'B':'A'}`})}));
 await p.route('**/api/**',async r=>{
  const path=new URL(r.request().url()).pathname,send=json=>r.fulfill({json});
  if(path.includes('/auth/'))return send({authenticated:true,id:'teste',nome:'Teste',username:'TESTE',tipo_usuario:'ADMIN'});
  if(path.endsWith('/categorias')){await new Promise(resolve=>setTimeout(resolve,800));categoriesDone=true;return send({categorias:[{id:'economico',nome:'Econômico'},{id:'social',nome:'Social'}]});}
  if(path.endsWith('/catalog')){catalogRequests++;assert.equal(path.endsWith('/municipal/catalog'),true);assert.equal(categoriesDone,false);return send({attributes});}
  if(path.endsWith('/preview'))return send({fields:['valor'],rows:[{CD_MUN:'3550308',NM_MUN:'São Paulo',valor:0}],glossario:[{campo_exportado:'valor',alias:'Valor',significado:'Teste',fonte:'Fonte'}],totalAttributes:1});
  if(path.endsWith('/jobs')){payload=r.request().postDataJSON();return send({id:'mock',status:'concluido'});}
  if(path.endsWith('/pacote'))return r.fulfill({body:'zip-teste',headers:{'X-Camada-Id':'mock','X-Camada-Arquivo':'mock.fgb'},contentType:'application/zip'});
  if(path.endsWith('/geojson'))return send({type:'FeatureCollection',features:[]});
  return send([]);
 });
 await p.goto('http://127.0.0.1:8083/restrict/geoespacial/gerador-camadas-territoriais/?categoria=economico');
 const q=key=>p.locator(`[data-mlb="${key}"]`);
 await p.waitForFunction(()=>document.querySelector('[data-mlb="source"]')&&!document.querySelector('[data-mlb="source"]').disabled);
 await p.evaluate(()=>{window.originalControls=[...document.querySelectorAll('.mlb-header,.mlb-filters select,[data-mlb="generate"],[data-mlb="results"],[data-mlb="preview"]')];});
 assert.equal(await q('attributes').locator('article').count(),40);
 await q('next').click();assert.equal(await q('attributes').locator('article').count(),5);
 await q('theme').selectOption('economia');await q('facets').locator('select').selectOption('B');
 assert.equal(await q('attributes').locator('article').count(),22);
 await q('add').click();assert.equal(await q('count').textContent(),'22');
 await q('preview').waitFor({state:'visible'});assert.match(await q('preview-body').textContent(),/São Paulo0/);
 await q('clear').click();assert.equal(await q('count').textContent(),'0');
 await q('attributes').locator('input').first().check();await q('name').fill('Camada de teste');
 assert.equal(await p.locator('#territorial-category').inputValue(),'');
 assert(await q('generate').isDisabled());
 await p.selectOption('#territorial-category','economico');
 await p.evaluate(()=>{window.SLTFeedback.confirmar=async()=>true;});
 await q('generate').click();await p.locator('#territorial-result').waitFor({state:'visible'});
 assert.equal(payload.nome,'Camada de teste');assert.equal(payload.attributes.length,1);
 assert.equal(await p.locator('#territorial-download').getAttribute('download'),'municipios_sp_fgb.zip');
 await p.selectOption('#territorial-category','social');await p.waitForFunction(()=>!document.querySelector('[data-mlb="source"]').disabled);
 assert(await p.evaluate(()=>window.originalControls.every(n=>n.isConnected)),'Controles HTML não foram substituídos');
 assert.equal(catalogRequests,1);
 assert.equal(await q('count').textContent(),'1');
 assert.equal(await q('name').inputValue(),'Camada de teste');
 assert.equal(await q('facets').locator('select').inputValue(),'B');
 assert.deepEqual(errors,[]);
 // Sem JavaScript: estrutura completa já recebida do servidor.
 const c=await b.newContext({javaScriptEnabled:false}),plain=await c.newPage();
 await plain.goto('http://127.0.0.1:8083/restrict/geoespacial/gerador-camadas-territoriais/?categoria=economico');
 assert.equal(await plain.locator('.mlb-title').textContent(),'Monte sua camada');
 assert.equal(await plain.locator('[data-mlb="generate"]').count(),1);
 assert.equal(await plain.locator('[data-mlb="results"]').count(),1);
 await b.close();console.log('OK: HTML persistente, filtros, paginação, seleção, prévia, geração simulada e troca de categoria; sem erros JS.');
})().catch(e=>{console.error(e);process.exit(1);});
