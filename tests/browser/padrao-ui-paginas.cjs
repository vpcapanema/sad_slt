const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true});try{
 const p=await b.newPage({viewport:{width:1440,height:1000}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.route('**/api/**',r=>{const path=new URL(r.request().url()).pathname;let json=[];
 if(path.endsWith('/auth/me'))json={id:'u',nome:'Teste',tipo_usuario:'ADMINISTRADOR'};
 if(path==='/api/agrupamentos-demandas')json=[{id:'g1',codigo:'G1',nome:'Grupo exemplo',tipo_demanda:'projeto',quantidade_demandas:2}];
 if(path==='/api/agrupamentos-demandas/g1')json={id:'g1',nome:'Grupo exemplo',tipo_demanda:'projeto',objetos:[{id:'d1',codigo:'D1',nome:'Demanda 1'},{id:'d2',codigo:'D2',nome:'Demanda 2'}]};
 if(path==='/api/ahp/universo/projeto')json=[{id:'d1',codigo:'D1',nome:'Demanda 1',tipo_demanda:'projeto',status:'analise_aprovada'}];
 if(path==='/api/ahp/hierarquizacoes')json=[{id:'h1',codigo:'H1',nome:'Hierarquização exemplo',status:'em_julgamento'}];
 if(path.endsWith('/ambientes'))json=[1,2].map(i=>({id:'j'+i,nome:'Julgamento '+i,status:'ativa',convites:[],criterios:[],valido_ate:'2035-01-01T00:00:00Z'}));
 return r.fulfill({json});});
 const style=async selector=>p.locator(selector).first().evaluate(e=>{const c=getComputedStyle(e);return {height:e.getBoundingClientRect().height,font:c.fontSize,family:c.fontFamily,weight:c.fontWeight,bg:c.backgroundColor,border:c.borderRadius};});
 await p.goto('http://127.0.0.1:8083/restrict/analise-multicriterio/central-julgamentos');
 await p.locator('#ami-new').click();
 const reference={title:await style('h1'),primary:await style('.ahp-section-label'),sub:await style('.ahp-subsection-title'),filter:await style('#ami-filter-coluna'),th:await style('.ami-table--database th:nth-child(2)'),td:await style('#ami-judgments td:nth-child(2)'),input:await style('#ami-judgment-name'),newButton:await style('#ami-new')};
 for(const [slug,path,button,input] of [['agrupamentos','/restrict/agrupamento-demandas/','#agrupamento-new','#agrupamento-nome'],['processos','/restrict/hierarquizacao/processos/','#hier-new','#nome'],['respostas','/restrict/analise-multicriterio/central-respostas',null,null]]){
  await p.goto('http://127.0.0.1:8083'+path);if(button)await p.locator(button).click();
  if(slug==='processos')await p.locator('#hier-agrupamento').selectOption('g1');
  if(slug==='agrupamentos')await p.locator('#agrupamento-tipo').selectOption('projeto');
  assert.deepEqual(await style('h1'),reference.title,slug+' hero');
  assert.deepEqual(await style('.ahp-section-label'),reference.primary,slug+' seção');
  for(const el of await p.locator('.ahp-subsection-title').all())if(await el.isVisible())assert.equal(await el.evaluate(e=>e.getBoundingClientRect().height),32,slug+' subseção');
  for(const el of await p.locator('.admin-filter-bar select').all())if(await el.isVisible()){
   const value=await el.evaluate(e=>({height:e.getBoundingClientRect().height,font:getComputedStyle(e).fontSize}));assert.equal(value.height,25,slug+' filtro');assert.equal(value.font,reference.filter.font);
  }
  const heading=await style('main table th:nth-child(2)');
  assert.ok(heading.height>=32,slug+' cabeçalho legível');
  assert.deepEqual({...heading,height:0},{...reference.th,height:0},slug+' cabeçalho tabela');
  assert.equal((await style('main table td:nth-child(2)')).font,reference.td.font,slug+' célula');
  for(const el of await p.locator('main table th:first-child:has(input[type=checkbox]), main table td:first-child:has(input[type=checkbox])').all())if(await el.isVisible())assert.equal(await el.evaluate(e=>e.getBoundingClientRect().width),44,slug+' coluna seletora');
  for(const el of await p.locator('main table .json-cell, main table .matriz-link').all())if(await el.isVisible()){
   const c=await el.evaluate(e=>{const s=getComputedStyle(e);return [s.color,s.borderTopWidth,s.backgroundColor,s.fontSize,getComputedStyle(e.parentElement).fontSize];});
   assert.deepEqual(c.slice(0,3),['rgb(18, 59, 86)','0px','rgba(0, 0, 0, 0)']);assert.equal(c[3],c[4]);
  }
  if(button)assert.deepEqual(await style(button),reference.newButton,slug+' novo');
  for(const el of await p.locator('main input[type=text]:not(table *)').all())if(await el.isVisible())assert.equal(await el.evaluate(e=>e.getBoundingClientRect().height),34,slug+' input');
  for(const el of await p.locator('main .ahp-subcard').all())if(await el.isVisible()){
   const c=await el.evaluate(e=>{let n=0,x=e;while(x){if(x.classList.contains('ahp-subcard'))n++;x=x.parentElement;}return {n,bg:getComputedStyle(e).backgroundColor};});assert.equal(c.bg,c.n%2?'rgb(231, 240, 247)':'rgb(255, 255, 255)',slug+' alternância');
  }
  if(slug==='processos'){
   await p.locator('#hier-grupo-select-all').check();assert.equal(await p.locator('[data-grupo-select]:checked').count(),2);
   const dl=p.waitForEvent('download');await p.locator('#hier-grupo-export').click();assert.equal((await dl).suggestedFilename(),'demandas-do-agrupamento.csv');
   await p.locator('#hier-grupo-clear').click();assert.equal(await p.locator('[data-grupo-select]:checked').count(),0);
  }
  await p.screenshot({path:'.tmp/padrao-validado-'+slug+'.png',fullPage:true});
  await p.setViewportSize({width:390,height:900});
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,slug+' overflow mobile');
  await p.setViewportSize({width:1440,height:1000});
 }
 assert.deepEqual(errors,[]);console.log('PASS: comparação com referência, cabeçalhos, fontes, filtros 25px, inputs, botões, fundos alternados, seleção/exportação e mobile nas três páginas.');
}finally{await b.close();}})();
