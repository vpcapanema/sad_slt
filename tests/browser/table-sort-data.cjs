const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
  const browser=await chromium.launch({channel:'msedge',headless:true});
  try {
    const page=await browser.newPage();
    await page.setContent('<table id="data"><thead><tr><th>Nome</th><th>Valor</th><th>Data</th></tr></thead><tbody></tbody></table><table id="legacy"><thead><tr><th>Nome</th></tr></thead><tbody><tr><td>B</td></tr><tr><td>A</td></tr></tbody></table>');
    await page.addScriptTag({path:'assets/js/table-standard.js'});
    await page.addScriptTag({path:'assets/js/table-sort.js'});
    await page.evaluate(()=>{
      const table=document.querySelector('#data');
      const rows=[{name:'Item 10',value:10,date:'02/01/2025'},{name:'Item 2',value:2,date:'31/12/2024'},{name:'Item 1',value:0,date:'01/02/2025'},{name:'Vazio',value:null,date:null}];
      let locked=false;
      const sort=SLTTable.sorting(table,()=>[r=>r.name,r=>r.value,r=>r.date],render,()=>!locked);
      window.lockSort=value=>{locked=value;};
      function render(){table.tBodies[0].innerHTML=sort(rows).map(r=>`<tr><td>${r.name}</td><td><button>${r.value??''}</button></td><td>${r.date??''}</td></tr>`).join('');}
      render();SLTTableSort.enhanceTable(table);
    });
    const names=()=>page.locator('#data tbody tr td:first-child').allTextContents();
    await page.locator('#data th').nth(1).click();
    assert.deepEqual(await names(),['Item 1','Item 2','Item 10','Vazio']);
    await page.locator('#data th').nth(1).click();
    assert.deepEqual(await names(),['Item 10','Item 2','Item 1','Vazio']);
    await page.locator('#data th').nth(2).click();
    assert.deepEqual(await names(),['Item 2','Item 10','Item 1','Vazio']);
    await page.locator('#data th').nth(2).focus();await page.keyboard.press('Space');
    assert.deepEqual(await names(),['Item 1','Item 10','Item 2','Vazio']);
    await page.evaluate(()=>window.lockSort(true));
    await page.locator('#data th').first().click();
    assert.deepEqual(await names(),['Item 1','Item 10','Item 2','Vazio']);
    await page.locator('#legacy th').click();
    assert.deepEqual(await page.locator('#legacy td').allTextContents(),['A','B']);
    console.log('Ordenacao numerica, zero, datas brasileiras, vazios, teclado, bloqueio de edicao e tabelas legadas OK.');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
