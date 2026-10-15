const {chromium}=require('playwright');
const fs=require('fs'), assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
const page=await browser.newPage();const source=fs.readFileSync('admin/demanda.js','utf8');
const cut=(a,b)=>source.slice(source.indexOf(a),source.indexOf(b));
await page.setContent('<div id="criterios-grid"></div><section class="analise-geometria">Geometria</section><div id="analise-resultado"></div><textarea id="fld-parecer"></textarea>');
await page.addScriptTag({content:`
const $=s=>document.querySelector(s), escapeHtml=s=>String(s??'');
const record={id:'ATUAL'}; const reportarErroAnalise=m=>{throw Error(m)};
const SLTAdminApi={listPlanos:async()=>[{id:'PLANO',nome:'Plano teste'}],listProgramas:async()=>[],listDemandas:async()=>[{id:'ATUAL',nome:'Atual'},{id:'OUTRA',nome:'Outra demanda'}],saveAnaliseCriterios:async(id,p)=>{window.saved=p;return {parecer_texto:'Parecer'}}};
${cut('  function criterioRowHtml','  function collectAvaliacaoGeometria')}
${cut('  const pesosCriterios','  function renderAnalise')}
${cut('  async function onCriterioChange','  function abrirComplemento')}
const campos=['criterio_competencia','criterio_nao_duplicidade',...Object.keys(pesosCriterios)];
$('#criterios-grid').innerHTML=campos.map(c=>criterioRowHtml({campo:c,rotulo:c,pergunta:c,resposta:null,classe:c in pesosCriterios?'classificatorio':'eliminatorio',peso:pesosCriterios[c]},true)).join('');
document.querySelector('[data-campo="criterio_nao_duplicidade"]').insertAdjacentHTML('beforeend','<div id="demanda-duplicada-wrap" hidden><select id="demanda-duplicada"></select></div>');
document.querySelectorAll('input').forEach(el=>el.onchange=onCriterioChange);$('#demanda-duplicada').onchange=onCriterioChange;
atualizarVisibilidadeCriterios();carregarDemandasDuplicidade(null,true);
`});
const row=c=>page.locator('[data-campo="'+c+'"]');
assert.equal(await row('criterio_clareza').isVisible(),false);
assert.equal(await page.locator('.analise-geometria').isVisible(),false);
await row('criterio_competencia').locator('input[value=sim]').check();
await row('criterio_nao_duplicidade').locator('input[value=sim]').check();
assert.equal(await row('criterio_clareza').isVisible(),true);
assert.equal(await page.locator('.analise-geometria').isVisible(),true);
for(const c of ['criterio_clareza','criterio_finalidade_publica','criterio_relevancia_setorial']) await row(c).locator('input[value=sim]').check();
assert.match(await page.locator('#analise-resultado').innerText(),/100%/);
await row('criterio_nao_duplicidade').locator('input[value=nao]').check();
assert.equal(await row('criterio_clareza').isVisible(),false);
assert.equal(await page.locator('.analise-geometria').isVisible(),false);
assert.equal(await page.locator('#demanda-duplicada-wrap').isVisible(),true);
assert.match(await page.locator('#demanda-duplicada').innerText(),/OUTRA — Outra demanda/);
assert.equal(await page.locator('#demanda-duplicada option[value=ATUAL]').count(),0);
await page.selectOption('#demanda-duplicada','OUTRA');await page.evaluate(()=>gravacaoCriterios);
assert.equal(await page.evaluate(()=>saved.demanda_duplicada_codigo),'OUTRA');
await row('criterio_nao_duplicidade').locator('input[value=sim]').check();await page.evaluate(()=>gravacaoCriterios);
assert.equal(await page.evaluate(()=>saved.demanda_duplicada_codigo),null);
console.log('OK: filtros, pesos, lista, vínculo e limpeza de respostas ocultas.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
