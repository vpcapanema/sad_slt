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

 for(const path of ['/restrict/analise-multicriterio/central-julgamentos','/restrict/agrupamento-demandas/','/restrict/hierarquizacao/processos/','/restrict/analise-multicriterio/central-respostas']){
  await p.goto('http://127.0.0.1:8083'+path);
  await p.waitForSelector('table[data-smart-widths] tbody input');
  for(const viewport of [1440,390]){
   await p.setViewportSize({width:viewport,height:1000}); await p.waitForTimeout(150);
   const checks=await p.locator('table[data-smart-widths]').evaluateAll(ts=>ts.filter(t=>t.getBoundingClientRect().height).map(t=>({selector:t.tHead.rows[0].cells[0].getBoundingClientRect().width,headers:[...t.querySelectorAll('thead th')].map(h=>({text:h.textContent,width:h.clientWidth,scroll:h.scrollWidth,height:h.clientHeight,scrollHeight:h.scrollHeight})),overflow:document.documentElement.scrollWidth>innerWidth+1})));
   for(const c of checks){assert.equal(c.selector,44,path);assert.equal(c.overflow,false,path);for(const h of c.headers){assert.ok(h.scroll<=h.width+1,JSON.stringify(h));assert.ok(h.scrollHeight<=h.height+1,JSON.stringify(h));}}
  }
  await p.screenshot({path:'.tmp/smart-'+path.split('/').filter(Boolean).at(-1)+'.png',fullPage:true});
 }
 await p.setViewportSize({width:1440,height:1000});
 await p.evaluate(()=>{const shell=document.createElement('div');shell.id='width-regression';shell.style.width='900px';shell.innerHTML='<table class="admin-table"><thead><tr><th><input type="checkbox"></th><th>Disponibilidade dos pesos consolidados para todos os participantes</th></tr></thead><tbody><tr><td><input type="checkbox"></td><td>Disponível</td></tr></tbody></table>';document.querySelector('main').append(shell);});
 await p.waitForTimeout(150);
 assert.equal(await p.locator('#width-regression .smart-column-title > span').count(),1,'Long title stays on one line when it fits');
 await p.evaluate(()=>{document.querySelector('#width-regression').style.width='300px';SLTTableFit();});await p.waitForTimeout(150);
 assert.equal(await p.locator('#width-regression .smart-column-title > span').count(),2,'Explicit balanced paragraphs when space is insufficient');
 await p.evaluate(()=>{document.querySelector('#width-regression').style.width='900px';SLTTableFit();});await p.waitForTimeout(150);
 assert.equal(await p.locator('#width-regression .smart-column-title > span').count(),1,'Rejoin title after expanding');
 await p.evaluate(()=>{const shell=document.querySelector('#width-regression'),h=shell.querySelector('th:nth-child(2)'),s=getComputedStyle(h),ctx=document.createElement('canvas').getContext('2d');ctx.font=`${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;const title=h.textContent.trim();shell.style.width=(44+32+ctx.measureText(s.textTransform==='uppercase'?title.toUpperCase():title).width-10)+'px';SLTTableFit();});await p.waitForTimeout(150);
 assert.equal(await p.locator('#width-regression .smart-column-title > span').count(),1,'Small shortfall expands column instead of breaking title');
 assert.deepEqual(errors,[]); console.log('PASS: readable headers, fixed selectors, responsive overflow and conditional explicit breaks');
}finally{await b.close();}})();
