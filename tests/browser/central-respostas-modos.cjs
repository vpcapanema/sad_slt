const { chromium } = require('playwright');
const fs = require('fs'); const assert = require('node:assert/strict');
const BASE = process.env.SICARD_BROWSER_BASE_URL || 'http://127.0.0.1:8083';
(async () => {
 const browser = await chromium.launch({channel:'msedge',headless:true});
 try {
 const page = await browser.newPage(); const errors=[],writes=[],assets=new Map();
 const agentLogin = process.env.SICARD_BROWSER_AGENT_LOGIN === '1';
 if (agentLogin) {
   const credentials = fs.readFileSync('credencias_sigma_agentes.txt', 'utf8');
   const username = 'sigma.agente_gestor';
   const senha = credentials.match(/^[ \t]*senha[ \t]*[:=][ \t]*([^\r\n]+)/mi)?.[1].trim();
   assert.ok(credentials.includes(username) && senha, 'Credencial local do gestor indisponível.');
   const login = await page.request.post(BASE + '/api/auth/login', {data:{username,senha,permanecer_conectado:false}});
   assert.equal(login.status(), 200);
 }
 if (process.env.SICARD_BROWSER_SESSION) await page.context().addCookies([{name:'slt_session',value:process.env.SICARD_BROWSER_SESSION,url:BASE}]);
 page.on('pageerror',e=>errors.push(e.message));
 page.on('response',async r=>{if(/\.(css|js)(\?|$)/.test(r.url())) {try {assets.set(r.url(),await r.text());}catch{}}});
 const criteria=[{nome:'C1'},{nome:'C2'}];
 const rounds=['j1','j2'].map((id,i)=>({id,nome:['Zeta','Alfa'][i],token:id,status:'ativa',hierarquizacao_nome:id,hierarquizacao_id:'h1',n_criterios:2,criterios:criteria,convites:[{email:'a@example.com'},{email:'b@example.com'}],total_respostas:2,valido_ate:'2027-12-31'}));
 const answers=[1,9].map((v,i)=>({id:'r'+i,nome_completo:'Pessoa '+i,email:['a','b'][i]+'@example.com',instituicao:'Inst',status:'enviada',consistente:true,razao_consistencia:0,matriz_comparacao:[[1,v],[1/v,1]]}));
 const official={id:'an1',nome:'Somente primeira resposta',codigo:'AN1',status:'homologada',consistente:true,resposta_ids:['r0'],respostas_incluidas:1,pesos_consolidados:[.2,.8],matriz_consolidada:[[1,4],[.25,1]],lambda_max:2,indice_consistencia:0,indice_aleatorio:0,rc_maximo:.12,excluir_inconsistentes:true,metodo_agregacao:'aij_media_geometrica',razao_consistencia:0};
 const workspace={ambiente:rounds[0],participacao:{convidados:2,nao_iniciados:0,em_preenchimento:0,enviadas:2,consistentes:2,inconsistentes:0},respostas:answers,estatisticas:{por_par:[{i:0,j:1,criterio_a:'C1',criterio_b:'C2',media:5,mediana:5,media_geometrica:3,pontos:answers.map((r,i)=>({resposta_id:r.id,respondente:r.nome_completo,valor:[1,9][i]}))}]},analises:[official,{...official,id:'an2',nome:'Ainda nao homologada',status:'calculada',consistente:false,razao_consistencia:.25}],analise_homologada_id:'an1'};
 const indices = [1/3,1/3,3,5,7];
 const answersJ2 = indices.map((v,i)=>({...answers[0],id:'s'+i,email:`s${i}@example.com`,nome_completo:`Julgador ${i+1}`,matriz_comparacao:[[1,v,2],[1/v,1,3],[1/2,1/3,1]]}));
 const workspaceJ2 = {...workspace, ambiente:{...rounds[1],n_criterios:3,criterios:[...criteria,{nome:'Critério com um cabeçalho longo'}]}, respostas:answersJ2,
   estatisticas:{por_par:[[0,1,indices],[0,2,indices.map(()=>2)],[1,2,indices.map(()=>3)]].map(([i,j,values])=>({i,j,criterio_a:`C${i+1}`,criterio_b:`C${j+1}`,mediana:i===0&&j===1?3:values[0],modas:[values[0]],media:values.reduce((a,b)=>a+b)/values.length,media_geometrica:values.reduce((a,b)=>a*b)**(1/values.length),pontos:answersJ2.map((r,k)=>({resposta_id:r.id,respondente:r.nome_completo,valor:values[k]}))}))},
   analises:[],analise_homologada_id:null};
 let exibirPorGrupo = false;
 const recortes = ['Financeira', 'Social'].map((dimensao, index) => {
   const criteriosDoGrupo = ['Custo', 'Prazo', 'Acesso', 'Equidade'].slice(index * 2, index * 2 + 2)
     .map(nome => ({nome, dimensao}));
   const valor = index ? 5 : 3;
   const resposta = {...answers[0], matriz_comparacao: [[1, valor], [1 / valor, 1]],
     estatisticas: {criterios_atribuidos: criteriosDoGrupo}};
   return {dimensao, criterios: criteriosDoGrupo, respostas: [resposta], resposta_ids: [resposta.id],
     estatisticas: {por_par: [{i: 0, j: 1, criterio_a: criteriosDoGrupo[0].nome, criterio_b: criteriosDoGrupo[1].nome,
       pontos: [{resposta_id: resposta.id, respondente: resposta.nome_completo, valor}]}]}};
 });
 const workspacePorGrupo = {...workspaceJ2, ambiente: {...workspaceJ2.ambiente, modo_comparacao: 'por_grupo',
   n_criterios: 4, criterios: recortes.flatMap(item => item.criterios)}, recortes,
   respostas: [{...answers[0], matriz_comparacao: [[1, 3, null, null], [1/3, 1, null, null],
     [null, null, 1, 5], [null, null, 1/5, 1]]}]};
 const oldObjects=[{id:'p1',codigo:'P1',nome:'Objeto salvo na hierarquizacao',status:'aprovada'}];
 const group={id:'g1',codigo:'G1',nome:'Grupo atual',tipo_demanda:'projeto',objetos:[...oldObjects,{id:'p2',codigo:'P2',nome:'Objeto adicionado posteriormente'}]};
 const hierarchy={id:'h1',codigo:'H1',nome:'Hier',status:'em_julgamento',grupo_demanda_id:'g1',objetos:oldObjects,dados_hierarquizacao:{cabecalho_grupo:{matriz_premissas_criterios:{linhas:criteria}}}};
 await page.route('**/api/**',r=>{const req=r.request(),path=new URL(req.url()).pathname.replace(/^\/sicard\//,'/');let json=[];
 if(agentLogin && path.startsWith('/api/auth/'))return r.continue();
 if(req.method()!=='GET'){writes.push({method:req.method(),path,data:req.postDataJSON()});return r.fulfill({status:422,json:{detail:'Auditoria: envio capturado'}});}
 if(path==='/api/auth/me')json={id:'u',tipo_usuario:'ANALISTA'};
 if(path==='/api/auth/session')json={authenticated:true,user:{id:'u',tipo_usuario:'ANALISTA'}};
 if(path==='/api/ahp/comparacao-colaborativa/ambientes')json=rounds;
 if(path.endsWith('/espaco-analitico'))json=path.includes('/j2/') ? (exibirPorGrupo ? workspacePorGrupo : workspaceJ2) : workspace;
 if(path==='/api/ahp/hierarquizacoes'||path==='/api/ahp/hierarquizacoes/portfolio')json=[hierarchy];
 if(path==='/api/agrupamentos-demandas')json=[group];
 if(path==='/api/agrupamentos-demandas/g1')json=group;
 return r.fulfill({json});});
 const out={};
 await page.goto(BASE+'/restrict/analise-multicriterio/central-respostas');
 const table=page.locator('#ami-judgments').locator('xpath=ancestor::table');
 const nameHeader=table.locator('thead th').nth(1);
 assert.match((await nameHeader.innerText()).replace(/\s+/g,' '),/Nome do julgamento/i);
 await nameHeader.click();
 assert.deepEqual(await page.locator('#ami-judgments tr td:nth-child(2)').allTextContents(),['Alfa','Zeta']);
 await nameHeader.click();
 assert.deepEqual(await page.locator('#ami-judgments tr td:nth-child(2)').allTextContents(),['Zeta','Alfa']);
 assert.equal(await table.locator('thead th').filter({hasText:'ID Julgamento'}).count(),0);
 await page.locator('[data-analysis-round="j1"]').check();await page.locator('#ami-judgments-view-action').click();
 await page.locator('#ami-analysis-workspace').waitFor({state:'visible'});

 assert.equal(await page.locator('#ami-analysis-workspace').getAttribute('data-mode'),'view');
 for(const id of ['ami-analysis-name','ami-analysis-rc','ami-analysis-exclude-inconsistent','ami-analysis-calculate'])assert.equal(await page.locator('#'+id).isDisabled(),true,id);
 assert.equal(await page.locator('#ami-analysis-measure').isEnabled(),true,'medida liberada na consulta');
 assert.equal(await page.locator('[data-analysis-response="r0"]').isDisabled(),true);
 assert.equal(await page.locator('#ami-analysis-name').inputValue(),official.nome);
 assert.equal(await page.locator('#ami-analysis-rc').inputValue(),'0.12');
 assert.match(await page.locator('#ami-analysis-matrix tbody').innerText(),/4.000/);
 assert.match(await page.locator('#ami-analysis-criteria').innerText(),/0.800/);
 assert.equal(await page.locator('#ami-analysis-measure').inputValue(),'registrada');
 const consolidated = page.locator('#ami-analysis-consolidations');
 assert.deepEqual(await consolidated.locator('.ami-consolidated-tables :is(.sicard-table-label, .ami-table-label)').allTextContents(),['Tabela dos pesos finais','Matriz consolidada','Tabela dos pesos finais','Matriz consolidada']);
 assert.equal(await consolidated.locator('.ami-consolidated-tables h4').count(),0);
 for (const [status,color] of [['ok','rgb(31, 138, 76)'],['nok','rgb(179, 38, 30)']]) {
   const cards = consolidated.locator('.ami-kpis .is-'+status);
   assert.equal(await cards.count(),3);
   assert.equal(await cards.first().evaluate(el=>getComputedStyle(el).borderTopColor),color);
 }
 for (const width of [1440, 390]) {
   await page.setViewportSize({width,height:900});
   await page.waitForFunction(()=>Array.from(document.querySelectorAll('.ami-consolidated-tables')).every(grid=>{
     const heights = Array.from(grid.querySelectorAll('thead')).map(el=>el.getBoundingClientRect().height);
     return heights.length===2 && heights[0]>=32 && Math.abs(heights[0]-heights[1])<0.5;
   }));
 }
 await page.setViewportSize({width:1440,height:900});
 await page.locator('#ami-analysis-measure').selectOption('geometrica');
 assert.match(await page.locator('#ami-analysis-matrix tbody').innerText(),/3.000/);
 assert.match(await page.locator('#ami-analysis-criteria').innerText(),/0.750/);
 assert.match(await page.locator('#ami-analysis-metrics').innerText(),/λmax/);
 await page.locator('#ami-pairs-judge').selectOption('r1');
 assert.match(await page.locator('#ami-analysis-matrix tbody').innerText(),/9.000/);
 assert.match(await page.locator('#ami-analysis-criteria').innerText(),/0.900/,'peso do julgador calculado na consulta');
 assert.match(await page.locator('#ami-analysis-criteria').innerText(),/CT1[\s\S]*CT2/,'codigos CT na tabela de pesos');
 assert.equal(await page.locator('#ami-analysis-criteria-chart .ami-donut-chart').count(),1,'rosca de pesos');
 assert.match(await page.locator('#ami-analysis-criteria-chart').innerText(),/CT1[\s\S]*CT2/);
 assert.equal(await page.locator('#ami-analysis-pairs tbody tr td:nth-child(2)').first().innerText(),'Par 1','coluna Código logo após o seletor');
 assert.match(await page.locator('#ami-analysis-pairs-chart .ami-pair-bars__tag').first().innerText(),/Par 1$/);
 await page.locator('#ami-analysis-pairs tbody tr').first().click();
 assert.equal(await page.locator('#ami-analysis-pairs-chart .ami-pair-bars__row.is-sel').count(),1,'clique na tabela seleciona o par no gráfico');
 await page.locator('#ami-analysis-pairs-chart .ami-pair-bars__row').first().click();
 assert.equal(await page.locator('#ami-analysis-pairs tbody tr.is-sel').count(),0,'clique no gráfico desfaz nos dois lados');
 await page.locator('#ami-analysis-pairs-chart .ami-pair-bars__row').first().click();
 assert.equal(await page.locator('#ami-analysis-pairs tbody tr.is-sel').count(),1,'clique no gráfico seleciona o par na tabela');
 await page.locator('#ami-analysis-criteria tr').nth(1).click();
 assert.equal(await page.locator('#ami-analysis-criteria-chart circle.is-sel').count(),1,'clique na tabela seleciona a fatia');
 assert.equal(await page.locator('#ami-analysis-criteria-chart li.is-sel').count(),1);
 await page.locator('#ami-analysis-criteria-chart circle[data-criterio="0"]').dispatchEvent('click');
 assert.equal(await page.locator('#ami-analysis-criteria tr.is-sel').count(),1,'clique na fatia seleciona a linha');
 assert.equal(await page.locator('#ami-analysis-criteria tr.is-sel td').nth(1).innerText(),'CT1');
 await page.locator('#ami-analysis-criteria-chart li[data-criterio="0"]').click();
 assert.equal(await page.locator('#ami-analysis-criteria tr.is-sel').count(),0);
 assert.equal(await page.locator('#ami-analysis-measure-box').isVisible(),true,'a medida segue disponível com um julgador selecionado');
 await page.locator('#ami-pairs-judge').selectOption('');
 assert.equal(await page.locator('#ami-analysis-measure').inputValue(),'geometrica');
 await page.locator('#ami-analysis-measure').selectOption('registrada');
 assert.match(await page.locator('#ami-analysis-criteria').innerText(),/0.800/);
 await page.evaluate(()=>{const b=document.querySelector('#ami-analysis-calculate');b.disabled=false;b.click();});
 await page.evaluate(()=>{const b=document.querySelector('[data-homologate-analysis]');b.disabled=false;b.click();});
 assert.equal(writes.length,0,'readonly handlers prevent writes');
 await page.locator('#ami-responses-edit-action').click();
 await page.waitForFunction(()=>document.querySelector('#ami-analysis-workspace').dataset.mode==='edit');
 for(const id of ['ami-analysis-name','ami-analysis-rc','ami-analysis-exclude-inconsistent','ami-analysis-measure','ami-analysis-calculate'])assert.equal(await page.locator('#'+id).isEnabled(),true,id);
 await page.locator('#ami-analysis-name').fill('Nova configuracao');
 await page.locator('#ami-analysis-measure').selectOption('moda');
 await page.locator('[data-analysis-response="r1"]').uncheck();
 await page.locator('#ami-analysis-calculate').click();
 await page.locator('#pfsStatusOverlay .pfs-box.pfs-active').waitFor({state:'visible'});
 assert.equal(writes.length,1);assert.equal(writes[0].data.nome,'Nova configuracao');assert.deepEqual(writes[0].data.resposta_ids,['r0']);
 assert.equal(writes[0].data.metodo_agregacao,'moda');
 await page.locator('#pfsStatusOverlay .pfs-box.pfs-active .pfs-close').click();
 await page.locator('#ami-judgments-view-action').click();await page.waitForFunction(()=>document.querySelector('#ami-analysis-workspace').dataset.mode==='view');
 assert.equal(await page.locator('#ami-analysis-name').inputValue(),official.nome);
 assert.match(await page.locator('#ami-analysis-criteria').innerText(),/0.800/);
 assert.equal(await page.locator('#ami-analysis-calculate').isDisabled(),true);
 await page.locator('[data-analysis-round="j1"]').uncheck();
 await page.locator('[data-analysis-round="j2"]').check();
 await page.locator('#ami-judgments-view-action').click();
 await page.waitForFunction(()=>document.querySelectorAll('#ami-analysis-matrix tbody tr').length===3);
 const rcs = new Set(), weights = new Set();
 for (const [method,index,label] of [['geometrica',(35/3)**(1/5),/Média geométrica/],['aritmetica',47/15,/Média aritmética/],['mediana',3,/Mediana/],['moda',1/3,/Moda/]]) {
   await page.locator('#ami-analysis-measure').selectOption(method);
   assert.equal(await page.locator('#ami-analysis-pairs [data-pair="0-1"] [data-ami-applied]').innerText(),index.toFixed(3));
   const rows = page.locator('#ami-analysis-matrix tbody tr');
   assert.equal(await rows.nth(0).locator('td').nth(3).innerText(),index.toFixed(3));
   assert.equal(await rows.nth(1).locator('td').nth(2).innerText(),(1/index).toFixed(3));
   assert.match(await page.locator('#ami-analysis-consolidation-measure').innerText(),label);
   rcs.add(await page.locator('#ami-analysis-metrics .ami-metric-card__value').last().innerText());
   weights.add(await page.locator('#ami-analysis-criteria tr').first().locator('strong').last().innerText());
 }
 assert.equal(rcs.size,4);assert.equal(weights.size,4);
 exibirPorGrupo = true;
 await page.locator('#ami-responses-edit-action').click();
 const scope = page.locator('#ami-analysis-scope');
 await scope.locator('option').filter({hasText: 'Financeira'}).waitFor({state: 'attached'});
 assert.deepEqual(await scope.locator('option').allTextContents(), ['Financeira · 2 critérios', 'Social · 2 critérios']);
 assert.match(await page.locator('#ami-analysis-matrix tbody').innerText(), /3.000/);
 await scope.selectOption('1');
 assert.match(await page.locator('#ami-analysis-matrix tbody').innerText(), /5.000/);
 assert.match(await page.locator('#ami-analysis-matrix tbody').innerText(), /Equidade/i);
 await page.locator('#ami-analysis-calculate').click();
 await page.locator('#pfsStatusOverlay .pfs-box.pfs-active').waitFor({state:'visible'});
 assert.equal(writes.at(-1).data.dimensao, 'Social');
 assert.deepEqual(writes.at(-1).data.resposta_ids, ['r0']);
 assert.deepEqual(errors,[]);console.log('PASS: quatro medidas sincronizadas, estilos desktop/mobile e consolidação por grupo');
 if(agentLogin)await page.request.post(BASE+'/api/auth/logout');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
