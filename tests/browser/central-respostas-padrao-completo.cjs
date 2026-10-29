const { chromium } = require('playwright');
const fs = require('fs'); const assert = require('node:assert/strict');
(async () => {
 const browser = await chromium.launch({channel:'msedge',headless:true});
 try {
 const page = await browser.newPage(); const errors=[],writes=[],assets=new Map();
 if (process.env.SICARD_BROWSER_SESSION) await page.context().addCookies([{name:'slt_session',value:process.env.SICARD_BROWSER_SESSION,url:'http://127.0.0.1:8083'}]);
 page.on('pageerror',e=>errors.push(e.message));
 page.on('response',async r=>{if(/\.(css|js)(\?|$)/.test(r.url())) {try {assets.set(r.url(),await r.text());}catch{}}});
 const criteria=[{nome:'C1'},{nome:'C2'}];
 const rounds=['j1','j2'].map(id=>({id,token:id,status:'ativa',hierarquizacao_nome:id,hierarquizacao_id:'h1',n_criterios:2,criterios:criteria,convites:[{email:'a@example.com'},{email:'b@example.com'}],total_respostas:2,valido_ate:'2027-12-31T23:59:59-03:00'}));
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
 await page.goto('http://127.0.0.1:8083/restrict/analise-multicriterio/central-respostas');
 await page.locator('#ami-filter-coluna').selectOption('finalizadas');
 await page.locator('#ami-filter-valor').selectOption('2/2 (100%)');
 assert.equal(await page.locator('#ami-judgments tr').count(),2);
 await page.locator('#ami-filter-coluna').selectOption('valido_ate');
 assert.match(await page.locator('#ami-filter-valor').innerText(),/31\/12\/2027/);
 await page.locator('#ami-filter-limpar').click();
 await page.locator('[data-analysis-round="j1"]').check();await page.locator('#ami-responses-edit-action').click();
 await page.locator('#ami-analysis-workspace').waitFor({state:'visible'});

 await page.waitForTimeout(200);
 for (const width of [1440,390]) {
  await page.setViewportSize({width,height:1000}); await page.waitForTimeout(200);
  const audit=await page.locator('#ami-analysis-workspace').evaluate(root=>({overflow:document.documentElement.scrollWidth>innerWidth+1,tables:[...root.querySelectorAll('table')].map(t=>({id:t.tBodies[0].id,heads:[...t.tHead.rows[0].cells].map(h=>({font:getComputedStyle(h).fontSize,text:h.textContent,cut:h.scrollWidth>h.clientWidth+1})),cells:[...t.tBodies[0].rows].slice(0,2).map(r=>[...r.cells].map(c=>({font:getComputedStyle(c).fontSize,bg:getComputedStyle(c).backgroundColor}))),selectors:t.tHead.rows[0].cells[0].getBoundingClientRect().width,filters:t.closest('.ami-report-table')?.querySelectorAll('.admin-filter-bar').length})),subheads:[...root.querySelectorAll('.ahp-subsection-title')].map(h=>({font:getComputedStyle(h).fontSize,height:h.getBoundingClientRect().height})),inputs:[...root.querySelectorAll('.admin-filter-bar select')].map(e=>e.getBoundingClientRect().height)}));
  fs.writeFileSync('.tmp/central-audit-'+width+'.json',JSON.stringify(audit,null,2));
  assert.equal(audit.overflow,false,'overflow '+width);
  for(const table of audit.tables){assert.equal(table.selectors,44,table.id);assert.equal(table.filters,1);for(const h of table.heads){assert.equal(h.font,'11.52px',h.text);assert.equal(h.cut,false,h.text);}for(const row of table.cells)for(const c of row)assert.equal(c.font,'11.84px',table.id);}
  for(const h of audit.subheads){assert.ok(['12px','13px'].includes(h.font));assert.ok(h.height>=32);}
  assert.ok(audit.inputs.every(h=>h===25));
  await page.screenshot({path:'.tmp/central-audit-'+width+'.png',fullPage:true});
 }
 const responseTable=page.locator('#ami-analysis-responses').locator('xpath=ancestor::div[contains(@class,"ami-report-table")][1]');
 const pairs=page.locator('#ami-analysis-pairs table');
 assert.equal(await pairs.locator('thead th[scope=colgroup]').getAttribute('colspan'),'2');
 assert.equal(await pairs.locator('tbody tr').first().locator('td').nth(1).innerText(),'Par 1');
 assert.equal(await pairs.locator('tbody tr').first().locator('td').nth(2).innerText(),'C1');
 assert.equal(await pairs.locator('tbody tr').first().locator('td').nth(3).innerText(),'C2');
 const pairHost=pairs.locator('xpath=ancestor::div[contains(@class,"ami-report-table")][1]');
 assert.equal(await pairs.locator('thead th').filter({hasText:/^Critério 1$/}).isVisible(),false);
 assert.equal(await pairs.locator('thead th').filter({hasText:/^Critério 2$/}).isVisible(),false);
 await pairHost.locator('.admin-filter-bar select').first().selectOption({label:'Critério 2'});
 await pairHost.locator('.admin-filter-bar select').nth(1).selectOption('C2');
 await pairs.locator('thead input').check();
 const download=page.waitForEvent('download');await pairHost.getByRole('button',{name:'Exportar selecionados'}).click();
 const csv=fs.readFileSync(await (await download).path(),'utf8');assert.match(csv,/"Critério 1";"Critério 2"/);assert.match(csv,/"C1";"C2"/);
 await responseTable.getByRole('button',{name:'Limpar sele\u00e7\u00e3o'}).click();
 assert.equal(await page.locator('#ami-analysis-calculate').isDisabled(),true);
 await responseTable.locator('thead input').check();
 assert.equal(await page.locator('#ami-analysis-calculate').isDisabled(),false);
 await page.locator('#ami-pairs-judge').selectOption('r0');
 await page.locator('#ami-pairs-judge').selectOption('');
 await page.locator('#ami-analysis-pairs-chart [data-judge-open="r0"]').first().focus();
 await page.keyboard.press('Enter');
 assert.equal(await page.locator('#ami-pairs-judge').inputValue(),'r0');
 workspace.respostas=[];workspace.estatisticas.por_par=[];workspace.analises=[];
 await page.reload();await page.locator('[data-analysis-round="j1"]').check();await page.locator('#ami-responses-edit-action').click();
 await page.locator('#ami-analysis-workspace').waitFor({state:'visible'});
 assert.equal(await page.locator('#ami-analysis-calculate').isDisabled(),true);
 assert.equal(await page.locator('#ami-analysis-pairs table thead input').isDisabled(),true);
 assert.equal(await page.locator('#ami-analysis-pairs table tbody').innerText(),'Nenhum registro encontrado.');
 assert.equal(await page.locator('.ami-report-table .ami-report-table').count(),0);
 assert.deepEqual(errors,[]);console.log('PASS: typography, all analytical tables, responsive layout, selection and action states');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
