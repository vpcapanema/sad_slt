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
 const official={id:'an1',nome:'Somente primeira resposta',codigo:'AN1',status:'homologada',consistente:true,resposta_ids:['r0'],respostas_incluidas:1,pesos_consolidados:[.2,.8],matriz_consolidada:[[1,4],[.25,1]],lambda_max:2,indice_consistencia:0,indice_aleatorio:0,rc_maximo:.12,excluir_inconsistentes:true,metodo_agregacao:'aij_media_geometrica',razao_consistencia:0};
 const workspace={ambiente:rounds[0],participacao:{convidados:2,nao_iniciados:0,em_preenchimento:0,enviadas:2,consistentes:2,inconsistentes:0},respostas:answers,estatisticas:{por_par:[{i:0,j:1,criterio_a:'C1',criterio_b:'C2',media:5,mediana:5,media_geometrica:3,pontos:answers.map((r,i)=>({resposta_id:r.id,respondente:r.nome_completo,valor:[1,9][i]}))}]},analises:[official,{...official,id:'an2',nome:'Ainda nao homologada',status:'calculada'}],analise_homologada_id:'an1'};
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
 await page.locator('[data-analysis-round="j1"]').check();await page.locator('#ami-judgments-view-action').click();
 await page.locator('#ami-analysis-workspace').waitFor({state:'visible'});

 assert.equal(await page.locator('#ami-analysis-workspace').getAttribute('data-mode'),'view');
 for(const id of ['ami-analysis-name','ami-analysis-rc','ami-analysis-exclude-inconsistent','ami-analysis-measure','ami-analysis-calculate'])assert.equal(await page.locator('#'+id).isDisabled(),true,id);
 assert.equal(await page.locator('[data-analysis-response="r0"]').isDisabled(),true);
 assert.equal(await page.locator('#ami-analysis-name').inputValue(),official.nome);
 assert.equal(await page.locator('#ami-analysis-rc').inputValue(),'0.12');
 assert.match(await page.locator('#ami-analysis-matrix tbody').innerText(),/4.000/);
 assert.match(await page.locator('#ami-analysis-criteria').innerText(),/0.800/);
 await page.evaluate(()=>{const b=document.querySelector('#ami-analysis-calculate');b.disabled=false;b.click();});
 await page.evaluate(()=>{const b=document.querySelector('[data-homologate-analysis]');b.disabled=false;b.click();});
 assert.equal(writes.length,0,'readonly handlers prevent writes');
 await page.locator('#ami-responses-edit-action').click();
 await page.waitForFunction(()=>document.querySelector('#ami-analysis-workspace').dataset.mode==='edit');
 for(const id of ['ami-analysis-name','ami-analysis-rc','ami-analysis-exclude-inconsistent','ami-analysis-measure','ami-analysis-calculate'])assert.equal(await page.locator('#'+id).isEnabled(),true,id);
 await page.locator('#ami-analysis-name').fill('Nova configuracao');
 await page.locator('#ami-analysis-measure').selectOption('aritmetica');
 await page.locator('[data-analysis-response="r1"]').uncheck();
 await page.locator('#ami-analysis-calculate').click();
 await page.locator('#pfsStatusOverlay .pfs-box.pfs-active').waitFor({state:'visible'});
 assert.equal(writes.length,1);assert.equal(writes[0].data.nome,'Nova configuracao');assert.deepEqual(writes[0].data.resposta_ids,['r0']);
 await page.locator('#pfsStatusOverlay .pfs-box.pfs-active .pfs-close').click();
 await page.locator('#ami-judgments-view-action').click();await page.waitForFunction(()=>document.querySelector('#ami-analysis-workspace').dataset.mode==='view');
 assert.equal(await page.locator('#ami-analysis-name').inputValue(),official.nome);
 assert.match(await page.locator('#ami-analysis-criteria').innerText(),/0.800/);
 assert.equal(await page.locator('#ami-analysis-calculate').isDisabled(),true);
 assert.deepEqual(errors,[]);console.log('PASS: stored read-only values, blocked writes, explicit edit, and mode reset');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
