// Login real (template, CSS, API JS e feedback); HTTP simulado, sem credenciais/banco reais.
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const root=process.cwd(),python=process.env.SICARD_TEST_PYTHON||path.join(root,'.venv/Scripts/python.exe');
const html=execFileSync(python,['-c',"from jinja2 import Environment,FileSystemLoader; print(Environment(loader=FileSystemLoader('templates')).get_template('paginas/admin/login.html').render())"],{encoding:'utf8'});
assert.doesNotMatch(fs.readFileSync('admin/login.js','utf8'),/ProcessFeedback|Notify\?\.error/);
(async()=>{
 const browser=await chromium.launch({headless:true});
 try {
 for(const mode of ['success','invalid','unavailable','session-missing','malformed','timeout','network']) {
  const page=await browser.newPage(); const errors=[],logs=[];let posts=0,accepted=false,release;
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',async msg=>{const values=await Promise.all(msg.args().map(a=>a.jsonValue().catch(()=>'')));logs.push(JSON.stringify(values));});
  if(mode==='timeout') await page.addInitScript(()=>{const original=AbortSignal.timeout;AbortSignal.timeout=ms=>original.call(AbortSignal,ms===45000?50:ms);});
  await page.route('**/*',async route=>{
   const u=new URL(route.request().url());
   if(u.pathname==='/public/login/')return route.fulfill({contentType:'text/html',body:html});
   if(u.pathname==='/restrict/login.js')return route.fulfill({contentType:'text/javascript',body:fs.readFileSync('admin/login.js','utf8')});
   if(u.pathname==='/restrict/')return route.fulfill({contentType:'text/html',body:'<h1>Restrita</h1>'});
   if(u.pathname==='/api/auth/session')return route.fulfill({json:{authenticated:accepted&&mode!=='session-missing'}});
   if(u.pathname==='/api/auth/login'){
    posts++;const payload=route.request().postDataJSON();assert.equal(payload.permanecer_conectado,true);
    if(mode==='network')return route.abort();
    if(mode==='timeout'){await new Promise(r=>setTimeout(r,150));return route.fulfill({json:{ok:true}}).catch(()=>{});}
    await new Promise(r=>release=r);
    if(mode==='invalid'||mode==='unavailable')return route.fulfill({status:mode==='invalid'?401:503,json:{detail:'SERVER_SECRET_SENTINEL'}});
    if(mode==='malformed')return route.fulfill({contentType:'text/html',body:'bad'});
    accepted=true;return route.fulfill({json:{ok:true,user:{nome:'PRIVATE_SENTINEL'}}});
   }
   if(u.pathname.startsWith('/assets/')){
    const file=path.join(root,u.pathname);if(fs.existsSync(file))return route.fulfill({path:file});
   }
   return route.fulfill({status:200,contentType:'application/json',body:'{}'});
  });
  await page.goto('http://localhost/public/login/');
  await page.waitForFunction(()=>document.querySelector('#login-status').textContent.includes('credenciais'));
  await page.click('#btn-entrar');
  assert.equal(posts,0);
  assert.match(await page.locator('#login-erro').innerText(),/usuário e senha/);
  await page.fill('#login','PRIVATE_SENTINEL_analista');await page.fill('#senha','PASSWORD_SENTINEL');await page.check('#permanecer-conectado');
  await page.click('#btn-entrar');
  if(!['timeout','network'].includes(mode)){
   await page.waitForFunction(()=>document.querySelector('#btn-entrar').disabled);
   assert.match(await page.locator('#login-status').innerText(),/aguardando validação/);
   assert.equal(await page.locator('#form-login').getAttribute('aria-busy'),'true');
   await page.evaluate(()=>document.querySelector('#form-login').dispatchEvent(new Event('submit',{cancelable:true})));
   for(let i=0;!release&&i<100;i++)await new Promise(r=>setTimeout(r,10));
   assert.equal(posts,1);release();
  }
  if(mode==='success')await page.waitForURL('**/restrict/');
  else {
   await page.waitForFunction(()=>!document.querySelector('#btn-entrar').disabled);
   assert.equal(await page.locator('#login-erro').isVisible(),true);
   assert.equal(await page.locator('#login-status').isVisible(),false);
   if(mode==='invalid')assert.equal(await page.locator('#login-erro').innerText(),'Acesso negado. Usuário ou senha incorretos.');
   if(mode==='timeout')assert.match(await page.locator('#login-erro').innerText(),/demorou/);
   if(mode==='session-missing')assert.match(await page.locator('#login-erro').innerText(),/não foi confirmada/);
  }
  assert.deepEqual(errors,[]);
  await page.waitForTimeout(40);
  const output=logs.join('\n');assert.match(output,/\[SICARD\]\[Login\]/);assert.match(output,/http.inicio/);
  assert.doesNotMatch(output,/PASSWORD_SENTINEL|PRIVATE_SENTINEL|SERVER_SECRET_SENTINEL/);
  await page.close();
 }
 console.log('PASS login feedback: success, validation, duplicate, 401, 503, session, malformed, timeout, network, safe logs');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
