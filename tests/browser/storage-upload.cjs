// Cliente SFTPGo real (leitura/autenticação); uploads interceptados, sem escrita na VM.
const {chromium}=require('playwright');const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const tokenFor=perfil=>execFileSync('/home/codespace/.venvs/sicard-app/bin/python',['-c',`from dotenv import load_dotenv
load_dotenv('.env')
import sys
from api.services.session_service import SessionUser,create_token
p=sys.argv[1]
print(create_token(SessionUser('teste-storage-ui','teste@local','teste_'+p,'Teste',p)))`,perfil],{encoding:'utf8',env:{...process.env,SLT_SESSION_SECRET:'sicard-local-ui-test-only'}}).trim();
const token=tokenFor('ANALISTA');
(async()=>{
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--no-proxy-server']});
try{
const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],fails=[];let arquivos=0,postFiles=0,views=0;
page.on('pageerror',e=>{errors.push(e.message);console.error('PAGEERROR',e.message);});page.on('response',r=>{if(r.status()>=400)fails.push(`${r.status()} ${new URL(r.url()).pathname}`);});
await page.context().addCookies([{name:'slt_session',value:token,domain:'127.0.0.1',path:'/'}]);
const layer={id:'storage:base-geoespacial/teste.geojson::teste',nome:'Teste enviado',arquivo:'base-geoespacial/teste.geojson',origem:'storage',tipo:'vetor',crs:'EPSG:4326'};
await page.route('**/api/auth/**',r=>r.fulfill({json:{authenticated:true,id:'teste-storage-ui',nome:'Teste',username:'teste_ANALISTA',tipo_usuario:'ANALISTA'}}));
await page.route('**/api/geoespacial/**',async r=>{
 const url=new URL(r.request().url()),path=url.pathname;
 if(path.includes('/storage-upload/')){
  if(path.endsWith('/web/client/exist'))return r.fulfill({json:[]});
  if(path.endsWith('/web/client/file')){postFiles++;assert.ok(r.request().postDataBuffer().toString().includes('FeatureCollection'));arquivos++;return r.fulfill({status:201,json:{}});}
  if(path.endsWith('/web/client/files')&&++views>1)return r.fulfill({contentType:'text/html',body:'<script>parent.postMessage({tipo:"sicard-storage-concluido"},location.origin)</script>'});
  if(path.endsWith('/resultado'))return r.fulfill({json:{arquivos:arquivos?[layer.arquivo]:[],camadas:arquivos?[layer]:[],avisos:[],pasta:'base-geoespacial'}});
  return r.continue();
 }
 if(path.endsWith('/catalogo'))return r.fulfill({json:{categorias:[{id:'social',nome:'Social'},{id:'ambiental',nome:'Ambiental'}],camadas:[]}});
 if(path.endsWith('/compatibilizar'))return r.fulfill({json:{compativel:true,camadas:[],erros:[]}});
 if(path.endsWith('/arquivo-mapa'))return r.fulfill({json:{...layer,geojson:{type:'FeatureCollection',features:[{type:'Feature',properties:{},geometry:{type:'Point',coordinates:[-46,-23]}}]}}});
 return r.fulfill({json:[]});
});
await page.goto(`${process.env.SICARD_TEST_URL||'http://127.0.0.1:8084'}/restrict/geoespacial/extracao-atributos/`,{waitUntil:'domcontentloaded',timeout:90000});
await page.waitForFunction(()=>window.SICARDExtracao&&document.querySelector('#ea-catalog-status').hidden).catch(async e=>{console.log(await page.evaluate(()=>({ready:!!window.SICARDExtracao,status:document.querySelector('#ea-catalog-status')?.outerHTML,body:document.querySelector('#slt-feedback-backdrop')?.textContent,url:location.href})),fails);throw e;});
await page.locator('#ea-base-local-upload').click();
const frame=page.frameLocator('iframe[title="Upload nativo do storage SICARD"]');
await frame.locator('#modal_upload.show').waitFor({timeout:60000});
const choose=page.waitForEvent('filechooser');await frame.locator('#upload_files').click();
await (await choose).setFiles({name:'teste.geojson',mimeType:'application/geo+json',buffer:Buffer.from('{"type":"FeatureCollection","features":[]}')});
await page.waitForTimeout(650);await frame.locator('#upload_files_button').click();
await page.locator('#ea-upload-category').waitFor({timeout:30000});
assert.equal(postFiles,1);assert.equal(await page.locator('#ea-staging-confirmar').isEnabled(),false);
assert.equal(await page.getByRole('button',{name:'Adicionar à lista da categoria',exact:true}).isDisabled(),true);
await page.locator('#ea-upload-category').selectOption('ambiental');await page.getByRole('button',{name:'Adicionar à lista da categoria',exact:true}).click();
assert.match(await page.locator('#ea-input-preview-layers').textContent(),/Ambiental/);
assert.equal(await page.evaluate(id=>document.querySelector('#ea-workbench-frame').contentWindow.gpApp.state.layers.some(l=>l.id===id),layer.id),false);
await page.locator('#slt-feedback-backdrop [data-fb-close]').last().click();
await page.locator('#ea-staging-confirmar').click();await page.locator('[data-fb-confirmar]').click();
await page.locator('.slt-fb-modal--success').waitFor();
await page.waitForFunction(id=>document.querySelector('#ea-workbench-frame').contentWindow.gpApp.state.layers.some(l=>l.id===id),layer.id);
assert.equal(await page.locator('#ea-feedback').count(),0);
assert.deepEqual(errors,[]);assert.deepEqual(fails,[]);
await page.locator('#slt-feedback-backdrop').getByRole('button',{name:'OK',exact:true}).click();
for(const perfil of ['OPERADOR','VISUALIZADOR']){
 await page.context().addCookies([{name:'slt_session',value:tokenFor(perfil),domain:'127.0.0.1',path:'/'}]);
 await page.locator('#ea-base-local-upload').click();
 await page.locator('.slt-fb-modal--warning').waitFor();
 assert.match(await page.locator('#slt-feedback-backdrop').textContent(),/perfil Analista, Gestor ou Admin/);
 assert.equal(await page.locator('iframe[title="Upload nativo do storage SICARD"]').count(),0);
 await page.locator('#slt-feedback-backdrop').getByRole('button',{name:'OK',exact:true}).click();
}

console.log('PASS: modal e seletor nativos, upload preservado, categoria obrigatória após envio, bancada só após Confirmar bases, feedback SICARD.');
}finally{await browser.close();}
})().catch(e=>{console.error(e.message);process.exit(1)});
