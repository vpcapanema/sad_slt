const {chromium}=require('playwright');
const fs=require('fs'),path=require('path'),{spawnSync}=require('child_process');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:900}}),urls=new Set(),errors=[],failed=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(/\.(js|css)(\?|$)/.test(r.url()))urls.add(r.url());if(r.status()>=400)failed.push({url:r.url(),status:r.status()});});
  await page.route('**/api/**',r=>r.fulfill({json:r.request().url().includes('/auth/')?{autenticado:true,username:'audit',usuario:{username:'audit',perfil:'ADMIN',tipo_usuario:'ADMIN'},perfil:'ADMIN',tipo_usuario:'ADMIN'}:r.request().url().includes('/catalogo')?{camadas:[],categorias:[]}:[]}));
  await page.goto('http://127.0.0.1:8083/restrict/geoespacial/extracao-atributos/');
  await page.waitForFunction(()=>!!window.SICARDExtracao);
  await page.waitForTimeout(3000);
  const sources=[];
  for(const url of urls){
   const pathname=new URL(url).pathname;
   let local=pathname.startsWith('/restrict/geoespacial/')?pathname.slice('/restrict/'.length):pathname.slice(1);
   if(!fs.existsSync(local))continue;
   const source=fs.readFileSync(local,'utf8');
   const record={file:local,bytes:Buffer.byteLength(source),vendor:local.includes('/vendor/')};
   if(local.endsWith('.js')){const result=spawnSync(process.execPath,['--input-type=module','--check'],{input:source,encoding:'utf8'});record.syntax=result.status===0?'ok':result.stderr;}
   else record.cssRules=await page.evaluate(text=>{const sheet=new CSSStyleSheet();sheet.replaceSync(text);return sheet.cssRules.length;},source);
   sources.push(record);
  }
  const sizes=[];
  for(const width of [1280,768,390]){await page.setViewportSize({width,height:900});sizes.push(await page.evaluate(()=>({width:innerWidth,documentWidth:document.documentElement.scrollWidth,overflowing:[...document.querySelectorAll('main *')].filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.right>innerWidth+1&&!e.closest('iframe')}).slice(0,8).map(e=>({tag:e.tagName,id:e.id,class:e.className}))})));}
  const report={sources,sizes,errors,failed};fs.writeFileSync('outputs/audit-extracao-assets-20261015.json',JSON.stringify(report,null,2));
  console.log(JSON.stringify({assets:sources.length,own:sources.filter(s=>!s.vendor).length,syntaxFailures:sources.filter(s=>s.syntax&&s.syntax!=='ok'),sizes,errors,failed},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
