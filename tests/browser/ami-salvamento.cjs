const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try {
  const page=await browser.newPage(),writes=[],errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  const criteria=[{nome:'C1'},{nome:'C2'}];
  const hs=['h1','h2'].map(id=>({id,codigo:id,nome:id,dados_hierarquizacao:{cabecalho_grupo:{matriz_premissas_criterios:{linhas:criteria}}}}));
  const rounds=hs.map((h,i)=>({id:'j'+(i+1),hierarquizacao_id:h.id,hierarquizacao_nome:h.nome,hierarquizacao_codigo:h.codigo,status:'ativa',token:'token'+i,valido_ate:'2030-12-31T23:59:59-03:00',criterios:criteria,n_criterios:2,convites:[{nome:'Pessoa',email:'pessoa@example.com'}]}));
  let releaseCreate;const pending=new Promise(r=>{releaseCreate=r;});
  await page.route('**/api/**',async route=>{
   const req=route.request(),path=new URL(req.url()).pathname;let json=[];
   if(req.method()!=='GET'){
    writes.push({path,method:req.method(),data:req.postDataJSON()});
    if(req.method()==='POST'){await pending;return route.fulfill({json:{...rounds[0],...req.postDataJSON(),id:'j3'}});}
    return route.fulfill({json:{...rounds[0],...req.postDataJSON()}});
   }
   if(path==='/api/auth/me')json={id:'u',tipo_usuario:'ANALISTA'};
   if(path==='/api/auth/session')json={authenticated:true,user:{id:'u',tipo_usuario:'ANALISTA'}};
   if(path==='/api/ahp/comparacao-colaborativa/ambientes')json=rounds;
   if(path==='/api/ahp/hierarquizacoes/portfolio')json=hs;
   return route.fulfill({json});
  });
  await page.goto('http://127.0.0.1:8083/restrict/analise-multicriterio/?modo=espaco');
  await page.locator('[data-select-id="j1"]').check();await page.locator('#ami-environment-edit').click();
  await page.getByLabel('Nome do colaborador 1',{exact:true}).fill('Nome preservado');await page.locator('#ami-confirm-emails').click();
  await page.locator('[data-select-id="j1"]').uncheck();await page.locator('[data-select-id="j2"]').check();
  await page.locator('#ami-environment-save').click();await page.waitForFunction(()=>document.getElementById('ami-create-feedback').textContent.includes('sucesso'));
  assert.equal(writes[0].path,'/api/ahp/comparacao-colaborativa/ambientes/j1');assert.equal(writes[0].data.convites[0].nome,'Nome preservado');
  await page.locator('#ami-new').click();await page.locator('#ami-deadline').fill('2030-12-31');await page.locator('#ami-hierarchy').selectOption('h1');
  await page.locator('#ami-emails').fill('novo@example.com');await page.locator('#ami-add-emails').click();await page.locator('#ami-confirm-emails').click();
  await page.locator('#ami-create-form button[type=submit]').click();
  assert.equal(await page.locator('#ami-create-form button[type=submit]').isDisabled(),true);
  await page.locator('#ami-create-form').evaluate(form=>form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
  releaseCreate();await page.waitForFunction(()=>document.querySelector('#ami-create-section').classList.contains('is-readonly'));
  await page.locator('#ami-create-form').evaluate(form=>form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
  assert.equal(writes.filter(r=>r.method==='POST').length,1);assert.deepEqual(errors,[]);
  console.log('Salvar no julgamento aberto, nomes, trava durante envio e apos criacao: OK');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
