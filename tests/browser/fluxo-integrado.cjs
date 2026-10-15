const { chromium } = require('playwright');
const fs = require('fs'); const assert = require('node:assert/strict');
(async () => {
 const browser = await chromium.launch({channel:'msedge',headless:true});
 try {
 const page = await browser.newPage(); const errors=[],writes=[],assets=new Map();
 page.on('pageerror',e=>errors.push(e.message));
 page.on('response',async r=>{if(/\.(css|js)(\?|$)/.test(r.url())) {try {assets.set(r.url(),await r.text());}catch{}}});
 const criteria=[{nome:'C1'},{nome:'C2'}];
 const rounds=['j1','j2'].map(id=>({id,token:id,status:'ativa',hierarquizacao_nome:id,hierarquizacao_id:'h1',n_criterios:2,criterios:criteria,convites:[{email:'a@example.com'},{email:'b@example.com'}],total_respostas:2,valido_ate:'2027-12-31'}));
 const answers=[1,9].map((v,i)=>({id:'r'+i,nome_completo:'Pessoa '+i,email:['a','b'][i]+'@example.com',instituicao:'Inst',status:'enviada',consistente:true,razao_consistencia:0,matriz_comparacao:[[1,v],[1/v,1]]}));
 const official={id:'an1',nome:'Somente primeira resposta',codigo:'AN1',status:'homologada',consistente:true,resposta_ids:['r0'],respostas_incluidas:1,pesos_consolidados:[.5,.5],matriz_consolidada:[[1,1],[1,1]],razao_consistencia:0};
 const workspace={ambiente:rounds[0],participacao:{convidados:2,nao_iniciados:0,em_preenchimento:0,enviadas:2,consistentes:2,inconsistentes:0},respostas:answers,estatisticas:{por_par:[{i:0,j:1,criterio_a:'C1',criterio_b:'C2',media:5,mediana:5,media_geometrica:3,pontos:answers.map((r,i)=>({resposta_id:r.id,respondente:r.nome_completo,valor:[1,9][i]}))}]},analises:[official],analise_homologada_id:'an1'};
 const oldObjects=[{id:'p1',codigo:'P1',nome:'Objeto salvo na hierarquizacao',status:'aprovada'}];
 const group={id:'g1',codigo:'G1',nome:'Grupo atual',tipo_demanda:'projeto',objetos:[...oldObjects,{id:'p2',codigo:'P2',nome:'Objeto adicionado posteriormente'}]};
 const hierarchy={id:'h1',codigo:'H1',nome:'Hier',status:'em_julgamento',grupo_demanda_id:'g1',objetos:oldObjects,dados_hierarquizacao:{cabecalho_grupo:{matriz_premissas_criterios:{linhas:criteria}}}};
 await page.route('**/api/**',r=>{const req=r.request(),path=new URL(req.url()).pathname;let json=[];
 if(req.method()!=='GET'){writes.push({method:req.method(),path,data:req.postDataJSON()});return r.fulfill({status:422,json:{detail:'Auditoria: envio capturado'}});}
 if(path==='/api/auth/me')json={id:'u',tipo_usuario:'ANALISTA'};
 if(path==='/api/auth/session')json={authenticated:true,user:{id:'u',tipo_usuario:'ANALISTA'}};
 if(path==='/api/ahp/comparacao-colaborativa/ambientes')json=rounds;
 if(path.endsWith('/espaco-analitico'))json=workspace;
 if(path==='/api/ahp/hierarquizacoes'||path==='/api/ahp/hierarquizacoes/portfolio')json=[hierarchy];
 if(path==='/api/agrupamentos-demandas')json=[group];
 if(path==='/api/agrupamentos-demandas/g1')json=group;
 return r.fulfill({json});});
 const out={};
 await page.goto('http://127.0.0.1:8083/restrict/analise-multicriterio/?modo=julgamentos');
 await page.locator('[data-analysis-round="j1"]').check();await page.locator('#ami-judgments-view-action').click();
 await page.locator('#ami-analysis-workspace').waitFor({state:'visible'});
 out.officialClaim=await page.locator('#ami-analysis-matrix-hint').textContent();
 out.displayedMatrix=await page.locator('#ami-analysis-matrix tbody').innerText();out.officialMatrix=official.matriz_consolidada;
 await page.locator('#ami-analysis-measure').selectOption('aritmetica');
 await page.locator('[data-analysis-response="r1"]').uncheck();
 out.previewAfterSubset=await page.locator('#ami-analysis-matrix tbody').innerText();
 await page.locator('#ami-analysis-calculate').click();await page.locator('#ami-result-modal').waitFor({state:'visible'});
 out.consolidationRequest=writes.at(-1);await page.locator('#ami-result-modal [data-result-close]').first().click();
 await page.locator('[data-analysis-round="j1"]').uncheck();await page.locator('[data-analysis-round="j2"]').check();
 await page.locator('#ami-analysis-calculate').click();await page.locator('#ami-result-modal').waitFor({state:'visible'});out.changedSelectionRequest=writes.at(-1);
 out.analysisTables=await page.locator('#ami-analysis-workspace table').evaluateAll(tables=>tables.map(t=>({rows:t.tBodies[0]?.rows.length,sort:t.dataset.tableSortReady,filters:!!t.closest('.ahp-subcard')?.querySelector('.admin-filter-bar'),pager:!!t.closest('.ahp-subcard')?.querySelector('.admin-pagination')})));
 out.css=[];
 async function inspectCSS(label){out.css.push(await page.evaluate(label=>({label,sheets:[...document.styleSheets].map(sheet=>{let rules=0;function scan(list){for(const rule of list){rules++;if(rule.cssRules)scan(rule.cssRules);}}try{scan(sheet.cssRules);return {url:sheet.href,rules};}catch(e){return {url:sheet.href,error:e.message};}}),tables:[...document.querySelectorAll('table')].filter(t=>t.getBoundingClientRect().height).map(t=>({id:t.tBodies[0]?.id,headFont:getComputedStyle(t.querySelector('th')).fontSize,bodyFont:t.querySelector('td')&&getComputedStyle(t.querySelector('td')).fontSize})),filterRadius:document.querySelector('.admin-filter-bar button')&&getComputedStyle(document.querySelector('.admin-filter-bar button')).borderRadius}),label));}
 await inspectCSS('julgamentos'); await page.screenshot({path:'outputs/fluxo-integrado-respostas.png',fullPage:true});
 for(let i=2;i<17;i++)answers.push({...answers[0],id:'r'+i,email:'p'+i+'@example.com'});
 await page.reload();await page.locator('[data-analysis-round="j1"]').check();await page.locator('#ami-judgments-view-action').click();await page.locator('#ami-analysis-workspace').waitFor({state:'visible'});
 out.judgeRowsWith17=await page.locator('#ami-analysis-judges tr').count();
 await page.goto('http://127.0.0.1:8083/restrict/hierarquizacao/processos/');await page.locator('.hier-row-select').check();await page.locator('#hier-bulk-view').click();await page.waitForFunction(()=>document.querySelector('#hier-nome').disabled);
 out.hierarchySnapshotCount=oldObjects.length;out.hierarchyDisplayedRows=await page.locator('#hier-agrupamento-demandas tr').count();
 await page.locator('#hier-bulk-edit').click();await page.locator('#hier-tbody [data-k="nome"]').fill('Alterado');assert.equal(await page.locator('#hier-select-all').isDisabled(),true);out.nameAfterSelectionToggle=await page.locator('#hier-tbody [data-k="nome"]').inputValue();await inspectCSS('processos');
 await page.goto('http://127.0.0.1:8083/restrict/analise-multicriterio/?modo=espaco');await page.locator('#ami-new').click();
 await inspectCSS('espaco');out.errors=errors;
 out.assetInventory=[...assets].map(([url,text])=>({url,chars:text.length}));
 assert.equal(out.officialClaim.includes('Corresponde'),false); assert.match(out.previewAfterSubset,/1.000/); assert.equal(out.consolidationRequest.data.metodo_agregacao,'aritmetica'); assert.equal(out.changedSelectionRequest.path,'/api/ahp/comparacao-colaborativa/ambientes/j1/analises'); assert.equal(out.hierarchyDisplayedRows,1); assert.equal(out.nameAfterSelectionToggle,'Alterado'); assert.equal(out.judgeRowsWith17,15); assert.deepEqual(errors,[]);
 fs.writeFileSync('outputs/fluxo-integrado-validacao.json',JSON.stringify(out,null,2));
 fs.writeFileSync('outputs/fluxo-integrado-assets.json',JSON.stringify(Object.fromEntries(assets),null,2));
 console.log('Identidade do painel, previa, metodo, historico e paginacao: OK');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
