const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1100}});
  const sourceA='IBGE / Produto Interno Bruto dos Municípios',sourceB='MTE / RAIS';
  const attributes=[
   ['original','originais','IBGE',2022,'01_populacao'],
   ['pib21','combinados',sourceA,2021,'economia'],
   ['pib22','combinados',sourceA,2022,'economia'],
   ['emprego22','combinados',sourceB,2022,'empresas_emprego'],
   ['emprego24','combinados',sourceB,2024,'07_trabalho'],
  ].map(([id,origin,source,year,theme])=>({id,origin,source,year,theme,label:id,field:id,
    coverage:645,unit:'%',detail:'{}'}));
  await page.route('**/api/**',route=>{
   const path=new URL(route.request().url()).pathname;
   if(path.includes('/auth/'))return route.fulfill({json:{authenticated:true,id:'teste',nome:'Teste',username:'TESTE',tipo_usuario:'ADMIN'}});
   if(path.endsWith('/catalog'))return route.fulfill({json:{attributes,featureCount:645}});
   if(path.endsWith('/categorias'))return route.fulfill({json:{categorias:[]}});
   if(path.endsWith('/preview'))return route.fulfill({json:{rows:[],fields:[],glossario:[]}});
   return route.fulfill({json:[]});
  });
  await page.goto('http://127.0.0.1:8083/restrict/geoespacial/gerador-camadas-territoriais/');
  const q=key=>page.locator(`[data-mlb="${key}"]`);
  const values=key=>q(key).locator('option').evaluateAll(nodes=>nodes.map(n=>n.value));
  await q('attributes').getByText('original',{exact:true}).waitFor();
  await q('origin').selectOption('combinados');
  assert.deepEqual(await values('source'),['__todas__',sourceA,sourceB]);
  await q('source').selectOption(sourceB);
  assert.deepEqual(await values('year'),['','2024','2022']);
  assert.deepEqual(await values('theme'),['','empresas_emprego','07_trabalho']);
  await q('year').selectOption('2024');
  assert.deepEqual(await values('theme'),['','07_trabalho']);
  await q('theme').selectOption('07_trabalho');
  await q('attributes').locator('input').check();
  await q('source').selectOption(sourceA);
  assert.equal(await q('year').inputValue(),'');
  assert.equal(await q('theme').inputValue(),'');
  assert.deepEqual(await values('year'),['','2022','2021']);
  assert.deepEqual(await values('theme'),['','economia']);
  assert.equal(await q('count').textContent(),'1');
  const geometry=await page.evaluate(()=>{
   const keys=['origin','source','year','theme'];
   return keys.map(key=>{
    const node=document.querySelector(`[data-mlb="${key}"]`),rect=node.getBoundingClientRect();
    const ctx=document.createElement('canvas').getContext('2d');ctx.font=getComputedStyle(node).font;
    return {key,top:rect.top,width:rect.width,needed:Math.max(...[...node.options].map(o=>ctx.measureText(o.text).width))+40};
   });
  });
  assert(Math.max(...geometry.map(r=>r.top))-Math.min(...geometry.map(r=>r.top))<2,JSON.stringify(geometry));
  assert(geometry[2].width<110,JSON.stringify(geometry));
  assert(geometry[1].width>=geometry[1].needed,JSON.stringify(geometry));
  await q('origin').selectOption('originais');
  assert.deepEqual(await values('source'),['__todas__','IBGE']);
  assert.deepEqual(await values('year'),['','2022']);
  assert.deepEqual(await values('theme'),['','01_populacao']);
  await page.setViewportSize({width:390,height:844});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
  console.log('OK: cascata tipo/fonte/ano/tema, seleção preservada, quatro campos alinhados, fonte sem corte e ano compacto.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
