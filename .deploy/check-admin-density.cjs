const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true});try{
const p=await b.newPage({viewport:{width:1440,height:1000}});const errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.route('**/api/**',r=>r.fulfill({json:r.request().url().includes('/esquemas')?{esquemas:[{esquema:'dominios',tabelas:[{nome:'categoria_extracao_atributos',dominio:true,registros:1}]}]}:{colunas:[{nome:'id',pk:true},{nome:'nome'},{nome:'conceito'},{nome:'criado_em',udt:'timestamptz'}],chave_primaria:['id'],linhas:[{id:1,nome:'Categoria',conceito:'Texto longo '.repeat(100),criado_em:'2026-10-15T12:00:00Z'}],total:1,paginas:1,dominio:true}}));
await p.goto('http://127.0.0.1:8083/restrict/admin/?menu=__dominios__&esquema=dominios&tabela=categoria_extracao_atributos');await p.locator('.admin-data-table tbody td').first().waitFor();
const sizes=await p.evaluate(()=>({row:document.querySelector('.admin-data-table tbody tr').getBoundingClientRect().height,head:document.querySelector('.admin-data-table thead').getBoundingClientRect().height}));
assert.ok(Math.abs(sizes.row-27.2)<1,JSON.stringify(sizes));
await p.screenshot({path:'outputs/admin-linhas-compactas.png',fullPage:true});
const old=execFileSync('git',['show','HEAD:assets/css/area-administrador.css'],{encoding:'utf8'});
await p.locator('link[href*="area-administrador.css"]').evaluate(e=>e.remove());await p.addStyleTag({content:old});
assert.equal(await p.locator('.admin-data-table thead').evaluate(e=>e.getBoundingClientRect().height),sizes.head);
assert.deepEqual(errors,[]);console.log('Altura das linhas:',sizes.row,'px; cabecalho preservado:',sizes.head,'px.');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
