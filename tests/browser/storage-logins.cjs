// Public login pages only; local branding overrides, no authentication or remote writes.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

(async()=>{
 const origin=process.env.SICARD_STORAGE_TEST_URL||'https://56.125.163.194';
 const published=process.argv.includes('--published');
 const template=fs.readFileSync(path.join('.deploy','storage','templates','common','base.html'),'utf8');
 const definition=template.indexOf('{{- define "theme-setup"}}');
 const opening=template.indexOf('<script',definition);
 const themeScript=template.slice(template.indexOf('>',opening)+1,template.indexOf('</script>',opening));
 const css=fs.readFileSync(path.join('.deploy','storage','static','sicard','cores.css'),'utf8');
 assert.ok(themeScript.includes('data-sicard-storage-login'));
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  for(const colorScheme of ['light','dark']){
   for(const stored of [null,'dark','system']){
    const context=await browser.newContext({ignoreHTTPSErrors:true,colorScheme,viewport:{width:1440,height:1000}});
    try{
     await context.addInitScript(value=>{
      if(value===null)localStorage.removeItem('data-bs-theme');
      else localStorage.setItem('data-bs-theme',value);
     },stored);
     await context.route('**/*',route=>{
      assert.ok(['GET','HEAD'].includes(route.request().method()),'Login validation must not send writes');
      return route.continue();
     });
     if(!published){
      await context.route('**/static/sicard/cores.css',route=>route.fulfill({contentType:'text/css',body:css}));
      await context.route(/\/web\/(?:admin|client)\/login\/?$/,async route=>{
      const response=await route.fetch();
      assert.equal(response.status(),200);
      const html=await response.text();
      const setup=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].find(match=>match[1].includes('var defaultThemeMode'));
      assert.ok(setup,'SFTPGo theme initialization script');
      await route.fulfill({response,body:html.replace(setup[1],themeScript)});
      });
     }
     for(const [area,subtitle] of [['client','Gestão de dados geoespaciais'],['admin','Administração de acesso ao storage']]){
      const page=await context.newPage(),errors=[];
      page.on('pageerror',error=>errors.push(error.message));
      await page.goto(`${origin}/sicard/storage/web/${area}/login`,{waitUntil:'networkidle',timeout:60000});
      const heading=page.locator('form .row .col-7 h1');
      assert.equal((await heading.textContent()).trim(),subtitle);
      assert.equal(await heading.evaluate(e=>getComputedStyle(e).textTransform),'uppercase');
      const state=await page.evaluate(()=>{
       const root=document.documentElement,card=document.querySelector('#app_root .bg-body.rounded');
       return {theme:root.dataset.bsTheme,mode:root.getAttribute('data-bs-theme-mode'),area:root.dataset.sicardStorageLogin,
        saved:localStorage.getItem('data-bs-theme'),scheme:getComputedStyle(root).colorScheme,
        card:getComputedStyle(card).backgroundColor,border:getComputedStyle(card).borderTopColor,
        background:getComputedStyle(document.body).backgroundImage};
      });
      assert.equal(state.theme,'light');
      assert.equal(state.mode,'light');
      assert.equal(state.area,area);
      assert.equal(state.saved,stored,'Internal-page theme preference is preserved');
      assert.equal(state.scheme,'light');
      assert.equal(state.card,'rgb(255, 255, 255)');
      assert.equal(state.border,area==='admin'?'rgb(117, 31, 48)':'rgb(17, 101, 147)');
      if(area==='admin')assert.match(state.background,/rgb\(117, 31, 48\)/);
      await page.emulateMedia({colorScheme:colorScheme==='dark'?'light':'dark'});
      assert.equal(await page.locator('html').getAttribute('data-bs-theme'),'light');
      assert.equal(await page.locator('form input[type=password]').count(),1);
      assert.match(await page.locator('form').getAttribute('action'),new RegExp(`/web/${area}/login$`));
      await page.setViewportSize({width:390,height:844});
      const layout=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,
       overflow:[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>innerWidth).slice(0,8).map(e=>({tag:e.tagName,class:e.className,width:e.getBoundingClientRect().width,text:e.textContent.trim().slice(0,80)}))}));
      assert.ok(layout.scroll<=layout.width,JSON.stringify({area,colorScheme,stored,layout}));
      assert.equal(await heading.evaluate(e=>e.getBoundingClientRect().right<=innerWidth),true);
      if(process.env.SICARD_STORAGE_SCREENSHOT_DIR&&colorScheme==='dark'&&stored==='dark'){
       const directory=process.env.SICARD_STORAGE_SCREENSHOT_DIR;
       await page.screenshot({path:path.join(directory,`storage-login-${area}-mobile.png`),fullPage:true});
       await page.setViewportSize({width:1440,height:1000});
       await page.screenshot({path:path.join(directory,`storage-login-${area}-desktop.png`),fullPage:true});
      }
      assert.deepEqual(errors,[]);
      await page.close();
     }
     const internal=await context.newPage();
     await internal.goto(`${origin}/sicard/storage/static/sicard/cores.css`);
     await internal.setContent('<main>Área interna</main>');
     await internal.evaluate(script=>{document.documentElement.removeAttribute('data-bs-theme-mode');(0,eval)(script);},themeScript);
     assert.equal(await internal.locator('html').getAttribute('data-sicard-storage-login'),null);
     assert.equal(await internal.locator('html').getAttribute('data-bs-theme'),stored==='dark'||colorScheme==='dark'?'dark':'light');
    }finally{await context.close();}
   }
  }
  console.log('PASS Storage logins: always light, uppercase subtitles, distinct admin colors, preserved internal preferences, responsive layout and no remote writes');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
