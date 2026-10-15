const {chromium}=require('playwright');
const fs=require('fs');
(async()=>{
const b=await chromium.launch({channel:'msedge',headless:true});
const p=await b.newPage();const writes=[],errors=[];p.on('pageerror',e=>errors.push(e.message));
const hs=['h1','h2'].map((id,i)=>({id,codigo:id,nome:'Hier '+id,dados_hierarquizacao:{cabecalho_grupo:{matriz_premissas_criterios:{linhas:[{nome:'C1'},{nome:'C2'},{nome:'C3'}]}}}}));
const js=hs.map((h,i)=>({id:'j'+(i+1),hierarquizacao_id:h.id,hierarquizacao_nome:h.nome,hierarquizacao_codigo:h.codigo,status:'ativa',token:'token'+i,valido_ate:'2026-12-31T23:59:59-03:00',criterios:[{nome:'C1'},{nome:'C2'},{nome:'C3'}],n_criterios:3,convites:[{nome:'Pessoa '+i,email:'p'+i+'@example.com'}]}));
let n=0;
await p.route('**/api/**',r=>{const req=r.request(),path=new URL(req.url()).pathname;let json=[];
if(req.method()!=='GET'){writes.push({method:req.method(),path,data:req.postDataJSON()});if(req.method()==='PATCH')return r.fulfill({status:400,json:{detail:'Auditoria: gravacao simulada'}});if(req.method()==='POST')return r.fulfill({json:{...js[0],id:'novo'+(++n),...req.postDataJSON()}});}
if(path==='/api/auth/me')json={id:'u',tipo_usuario:'ANALISTA'};
if(path==='/api/auth/session')json={authenticated:true,user:{id:'u',tipo_usuario:'ANALISTA'}};
if(path==='/api/ahp/comparacao-colaborativa/ambientes')json=js;
if(path==='/api/ahp/hierarquizacoes/portfolio')json=hs;
return r.fulfill({json});});
await p.goto('http://127.0.0.1:8083/restrict/analise-multicriterio/?modo=espaco');
await p.locator('[data-select-id="j1"]').check();
await p.locator('#ami-judgments-matrix-action').click();
const cell=p.locator('#ami-pairwise-matrix-content select[data-pair-row="0"][data-pair-column="1"]');
await cell.selectOption('5');
const out={section2Visible:await p.locator('#ami-pairwise-panel').isVisible(),matrixAfterEdit:await cell.inputValue(),writesAfterMatrix:writes.length};
await p.reload();await p.locator('[data-select-id="j1"]').check();await p.locator('#ami-judgments-matrix-action').click();out.matrixAfterReload=await cell.inputValue();
await p.locator('#ami-environment-edit').click();await p.locator('#ami-confirm-emails').click();
await p.locator('[data-select-id="j1"]').uncheck();await p.locator('[data-select-id="j2"]').check();
await p.locator('#ami-environment-save').click();await p.waitForFunction(()=>document.getElementById('ami-create-feedback').textContent.includes('simulada'));out.wrongTarget=writes.at(-1);
await p.locator('#ami-new').click();await p.locator('#ami-deadline').fill('2026-12-31');await p.locator('#ami-hierarchy').selectOption('h1');await p.locator('#ami-emails').fill('novo@example.com');await p.locator('#ami-add-emails').click();await p.locator('#ami-confirm-emails').click();const submit=p.locator('#ami-create-form button[type="submit"]');await submit.click();await p.waitForFunction(()=>document.getElementById('ami-create-feedback').textContent.includes('ambiente criado'));await submit.click();await p.waitForFunction(()=>document.querySelectorAll('#ami-judgments tr').length===4);out.createPosts=writes.filter(x=>x.method==='POST').length;
out.errors=errors;out.cssFiles=await p.evaluate(()=>[...document.styleSheets].map(s=>{let count=0,matched=0;function walk(rs){for(const r of rs){count++;if(r.cssRules)walk(r.cssRules);if(r.selectorText){try{if(document.querySelector(r.selectorText))matched++;}catch{}}}}try{walk(s.cssRules);return {href:s.href,rules:count,matched};}catch(e){return {href:s.href,error:e.message}}}));
fs.writeFileSync('outputs/ami-review-runtime.json',JSON.stringify(out,null,2));console.log(JSON.stringify({...out,cssFiles:out.cssFiles.length},null,2));await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
