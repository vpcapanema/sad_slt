const {chromium}=require('playwright'),fs=require('fs'),assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
const p=await browser.newPage();await p.setContent('<section class="standard-table-section"><nav id="pager" class="admin-pagination"></nav></section>');
await p.addStyleTag({path:'assets/css/table-standard.css'});
await p.addScriptTag({path:'assets/js/table-standard.js'});
await p.evaluate(()=>{window.rows=Array.from({length:46},(_,i)=>i);window.change=page=>{window.result=SLTTable.paginate('pager',rows,page,change)};change(1)});
assert.deepEqual(await p.locator('button').allTextContents(),['<<','<','>','>>']);
assert.equal(await p.getByRole('button',{name:'Primeira página',exact:true}).isDisabled(),true);
await p.getByRole('button',{name:'Última página',exact:true}).click();
assert.equal(await p.locator('span').textContent(),'Página 4 de 4');
assert.deepEqual(await p.evaluate(()=>result.rows),[45]);
assert.equal(await p.getByRole('button',{name:'Próxima página',exact:true}).isDisabled(),true);
await p.getByRole('button',{name:'Página anterior',exact:true}).click();assert.equal(await p.locator('span').textContent(),'Página 3 de 4');
await p.getByRole('button',{name:'Primeira página',exact:true}).click();assert.equal(await p.locator('span').textContent(),'Página 1 de 4');
await p.getByRole('button',{name:'Próxima página',exact:true}).click();assert.equal(await p.locator('span').textContent(),'Página 2 de 4');
assert.deepEqual(await p.locator('button').first().evaluate(e=>{let s=getComputedStyle(e);return [s.borderTopWidth,s.fontWeight]}),['0px','700']);
for (const [bodyClass, css] of [['agrupamentos-demandas-page','assets/css/paginas/agrupamentos-demandas.css'],['hier-processos-page','assets/css/paginas/hierarquizacao-home-inline-1.css']]) {
 await p.addStyleTag({path:css});
 await p.evaluate(cls=>{document.body.className=cls},bodyClass);
 assert.deepEqual(await p.locator('button').first().evaluate(e=>{const s=getComputedStyle(e);return [s.borderTopWidth,s.fontWeight]}),['0px','700'],bodyClass);
}
await p.evaluate(()=>{rows=[];change(4)});assert.equal(await p.locator('span').textContent(),'Página 1 de 1');assert.equal(await p.locator('button:disabled').count(),4);
console.log('OK: first/previous/next/last, boundaries, empty table, border and bold.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
