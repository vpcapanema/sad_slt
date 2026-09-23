// Catálogo real opcional; APIs de escrita sempre isoladas da produção.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const real=process.env.SICARD_REAL_CATALOG;
 const catalog=real?JSON.parse(fs.readFileSync(real)): {attributes:Array.from({length:81},(_,i)=>({id:String(i),label:'Indicador de teste com descrição longa para validar leitura e seleção '+i,source:'Fonte',theme:'Teste',year:2022,field:'campo_'+i,detail:i?'{}':'inválido',coverage:645})),municipalities:645,geometryYear:2022,crs:'EPSG:4674'};
 const b=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']});
 const p=await b.newPage();const errors=[],failed=[];let catalogs=0,previews=0;
 p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400&&!r.url().includes('/api/'))failed.push(r.url());});
 await p.route('**/api/**',async r=>{
  const path=new URL(r.request().url()).pathname;
  if(path.includes('/auth/'))return r.fulfill({json:{authenticated:true,id:'teste',tipo_usuario:'ADMIN'}});
  if((path.endsWith('/extracao-atributos/catalogo')||path.endsWith('/municipal/categorias')))return r.fulfill({json:{categorias:[{id:'social',nome:'Social'},{id:'ambiental',nome:'Ambiental'}],camadas:[]}});
  if(path.endsWith('/catalog'))return ++catalogs===1?r.fulfill({status:503,json:{detail:'Falha temporária'}}):r.fulfill({json:catalog});
  if(path.endsWith('/preview'))return ++previews===1?r.fulfill({status:503,json:{detail:'Falha temporária da prévia'}}):r.fulfill({json:{rows:[],fields:[],totalAttributes:1}});
  return r.fulfill({json:[]});
 });
 await p.goto((process.env.SICARD_TEST_URL||'http://127.0.0.1:8082')+'/restrict/geoespacial/gerador-camadas-territoriais/?categoria=social');
 await p.locator('.mlb').getByRole('button',{name:'Tentar novamente',exact:true}).click();
 await p.locator('.mlb-attribute').first().waitFor();
 assert.equal(await p.locator('h1').count(),1);assert.equal(await p.locator('main').count(),1);
 for(const width of [320,390,768,1024,1440]){
  await p.setViewportSize({width,height:1000});
  assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Transbordamento em '+width);
  const clipped=await p.locator('.mlb-listbar button,.mlb-pages button,.mlb-attribute label').evaluateAll(nodes=>nodes.filter(n=>n.scrollWidth>n.clientWidth+2).map(n=>n.textContent));
  assert.deepEqual(clipped,[], 'Conteúdo cortado em '+width);
  if(process.env.SICARD_SCREENSHOT_DIR)await p.screenshot({path:process.env.SICARD_SCREENSHOT_DIR+'/territorial-'+width+'.png',fullPage:true});
 }
 await p.locator('.mlb-attribute input').first().check();
 await p.locator('.mlb-error').getByRole('button',{name:'Tentar novamente'}).click();
 await p.locator('.mlb-preview table').waitFor();
 assert.equal(await p.locator('.mlb-error').count(),0);
 await p.getByLabel('Nome da camada',{exact:true}).fill('Seleção mantida');
 await p.locator('#territorial-category').selectOption('ambiental');
 await p.locator('.mlb-attribute').first().waitFor();
 assert.equal(await p.getByLabel('Nome da camada',{exact:true}).inputValue(),'Seleção mantida');
 assert.equal(await p.locator('.mlb-count strong').textContent(),'1');
 assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
 console.log('PASS: catálogo '+catalog.attributes.length+' atributos, 320–1440px, sem cortes, retry catálogo/prévia, seleção preservada ao trocar categoria, sem erros JS/assets.');
 await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
