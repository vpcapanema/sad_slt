const {chromium}=require('playwright');
const fs=require('node:fs'),http=require('node:http'),assert=require('node:assert/strict');
(async()=>{
 const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end('<html><body></body></html>')});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const source=fs.readFileSync('admin/demanda.js','utf8');
  const handler=source.slice(source.indexOf('  async function uploadReplacementGeometry'),source.indexOf('  async function saveRecord'));
  for(const tipo of ['projeto','plano','programa']){
   const page=await browser.newPage();const calls=[];
   await page.route('**/api/geometria/**',async route=>{
    const url=route.request().url();calls.push(url);
    await route.fulfill({json:url.includes('/conferir/')?{permitido:true,situacao:'marinha',mensagem:'A geometria está inserida na área marítima de referência de São Paulo. Confirma a localização?',confirmacao:'TOKEN'}:{codigo:'COD'}});
   });
   await page.goto(`http://127.0.0.1:${server.address().port}/`);
   await page.setContent('<button id="btn-geometria">Enviar/substituir geometria</button><input type="file" id="arquivo-nova-geometria">');
   await page.addScriptTag({content:fs.readFileSync('assets/js/admin-ui.js','utf8')});
   await page.evaluate(tipo=>{window.tipo=tipo;window.record={id:'COD'};window.$=s=>document.querySelector(s);window.collectPayload=()=>({nome:'Teste'});window.originalFormPayload={nome:'Teste'};window.API={[tipo]:{get:async()=>({id:'COD'})}};window.renderPage=()=>{};window.refreshLists=async()=>{}},tipo);
   await page.addScriptTag({content:handler+'\ndocument.querySelector("input").addEventListener("change",uploadReplacementGeometry);'});
   await page.locator('input').setInputFiles({name:'mar.geojson',mimeType:'application/json',buffer:Buffer.from('{}')});
   await page.locator('[data-confirm-ok]').waitFor();assert.equal(calls.length,1);
   assert.match(await page.locator('.admin-confirm-message').textContent(),/área marítima/);
   await page.locator('[data-confirm-ok]').click();await page.waitForFunction(()=>document.querySelector('#admin-toast')?.textContent.includes('substituída'));
   assert.equal(calls.length,2);assert(calls[1].includes('/substituir/'+tipo+'/'));
   console.log(tipo+': modal marítimo confirmado antes do processamento');await page.close();
  }
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);process.exit(1)});
