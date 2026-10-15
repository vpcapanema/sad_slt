const {chromium}=require('playwright'),fs=require('fs'),assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
const p=await browser.newPage();await p.setContent('<select id="filtro-coluna"></select><input id="filtro-valor" list="filtro-valores"><datalist id="filtro-valores"></datalist><input id="filtro-inverter" type="checkbox">');
const s=fs.readFileSync('admin/demandas.js','utf8');
await p.addScriptTag({content:`
const $=s=>document.querySelector(s); let tipo='projeto',columnFilterOptions=[];
const COLUMNS={projeto:[{label:'Projeto',value:r=>r.nome}]};
const rows=[{id:'1',nome:'Terminal de Ribeirão Preto'},{id:'2',nome:'Terminal de Campinas'},{id:'3',nome:'Ponte'}];
const SLTTable={inversion:()=>{},matches:(prefix,match,active)=>!active||($('#filtro-inverter').checked?!match:match)};
${s.slice(s.indexOf('  function columnDisplayValue'),s.indexOf('  function paginatedRows'))}
fillColumnFilter();$('#filtro-coluna').value='0';updateColumnValueFilter();
`});
assert.equal(await p.locator('#filtro-valores option').count(),3);
await p.locator('#filtro-valor').fill('ribeirao');assert.deepEqual(await p.evaluate(()=>filteredRows().map(r=>r.id)),['1']);
await p.locator('#filtro-valor').fill('TERMINAL');assert.equal(await p.evaluate(()=>filteredRows().length),2);
await p.locator('#filtro-valor').fill('Terminal de Campinas');assert.deepEqual(await p.evaluate(()=>filteredRows().map(r=>r.id)),['2']);
await p.locator('#filtro-inverter').check();assert.equal(await p.evaluate(()=>filteredRows().length),2);
await p.evaluate(()=>fillColumnFilter());assert.equal(await p.locator('#filtro-valor').inputValue(),'');
console.log('OK: sugestões, busca parcial, acentos, seleção exata, inversão e limpeza.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
