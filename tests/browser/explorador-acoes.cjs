const assert = require('node:assert/strict');
const {spawn} = require('node:child_process');
const {chromium} = require('playwright');

async function geometry(page, scope, size) {
  const scrollbars=await page.locator(`${scope}, ${scope} *`).evaluateAll(es=>es.map(e=>{
    const bar=getComputedStyle(e,'::-webkit-scrollbar'),thumb=getComputedStyle(e,'::-webkit-scrollbar-thumb');
    return {width:bar.width,height:bar.height,thumb:thumb.backgroundColor,standard:getComputedStyle(e).scrollbarWidth};
  }));
  for(const bar of scrollbars){
    assert.equal(bar.width,'3px');assert.equal(bar.height,'3px');
    assert.ok(['rgba(71, 85, 105, 0.18)','rgba(71, 85, 105, 0.65)'].includes(bar.thumb));
    assert.equal(bar.standard,'auto');
  }
  if(scope==='.ea-storage-dialog'){
    for(const name of ['Modo de visualização','Desmarcar todas']){
      const target=page.getByRole('button',{name:new RegExp(`^${name}`)});
      await target.waitFor({state:'visible'});
      const box=await target.evaluate(e=>{
        const r=e.getBoundingClientRect(),i=e.querySelector('i').getBoundingClientRect();
        const caret=e.querySelector('.fa-caret-down')?.getBoundingClientRect();
        return {w:r.width,h:r.height,text:e.textContent.trim(),dx:(i.left+i.right-r.left-r.right)/2,dy:(i.top+i.bottom-r.top-r.bottom)/2,
          separated:!caret||caret.left>=i.right||caret.top>=i.bottom};
      });
      assert.equal(box.w,size,name);assert.equal(box.h,size,name);
      assert.equal(box.text,'',name);assert.ok(Math.abs(box.dx)<=1&&Math.abs(box.dy)<=1,name);
      assert.ok(box.separated,`${name}: indicator overlaps primary icon`);
    }
  }
  const headers=await page.locator(`${scope} table thead th, ${scope} .ea-storage-details-head > span`).evaluateAll(es=>es.map(e=>{
    const c=getComputedStyle(e);return {left:c.borderLeftColor,right:c.borderRightColor,l:parseFloat(c.borderLeftWidth),r:parseFloat(c.borderRightWidth)};
  }));
  for(const h of headers){assert.equal(h.right,'rgb(255, 255, 255)');assert.equal(h.l,0);assert.equal(h.r,1);}
  for(const icon of await page.locator(`${scope} .explorer-sort-direction`).evaluateAll(es=>es.map(e=>getComputedStyle(e).color)))assert.equal(icon,'rgb(255, 255, 255)');
  const buttons = await page.locator(`${scope} button[data-explorer-action]`).evaluateAll(els =>
    els.filter(e => e.getBoundingClientRect().width && !e.closest('[role=menu]')).map(e => {
      const r=e.getBoundingClientRect(), c=getComputedStyle(e);
      return {action:e.dataset.explorerAction,w:r.width,h:r.height,left:r.left,right:r.right,
        label:e.textContent.trim(),accessible:e.getAttribute('aria-label'),title:e.title,
        radius:c.borderRadius,color:c.color,border:c.borderTopColor,icon:getComputedStyle(e.querySelector('i')).color};
    }));
  assert.ok(buttons.length >= 3);
  for (const b of buttons) {
    assert.equal(b.w,size,b.action); assert.equal(b.h,size,b.action);
    assert.equal(b.label,''); assert.ok(b.accessible && b.title);
    assert.equal(b.radius,'4px'); assert.equal(b.border,b.color); assert.equal(b.icon,b.color);
    assert.ok(b.left>=0 && b.right<=page.viewportSize().width);
  }
}

async function menuGeometry(page) {
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const rects=await page.evaluate(()=>{
    const button=document.querySelector('[data-explorer-action=view]').getBoundingClientRect(),
      menu=document.querySelector('.ea-storage-view-menu').getBoundingClientRect();
    const rect=r=>({left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width});
    return {button:rect(button),menu:rect(menu),w:innerWidth,h:innerHeight};
  });
  const {button:b,menu:m,w,h}=rects;
  assert.ok(m.left>=7.5&&m.right<=w-7.5&&m.top>=7.5&&m.bottom<=h-7.5,JSON.stringify(rects));
  assert.ok(Math.abs(m.left-Math.max(8,Math.min(b.left,w-m.width-8)))<1,JSON.stringify(rects));
  assert.ok(Math.abs(m.top-b.bottom-6)<1||Math.abs(b.top-m.bottom-6)<1,JSON.stringify(rects));
  for(const item of await page.locator('.ea-storage-view-menu button').evaluateAll(es=>es.map(e=>{
    const r=e.getBoundingClientRect(),p=e.parentElement.getBoundingClientRect();
    return r.top>=p.top&&r.bottom<=p.bottom;
  })))assert.ok(item,'menu option cut');
}

(async()=>{
  const server=spawn('.venv\\Scripts\\python.exe',['tests\\browser\\storage-detalhes-server.py'],{stdio:['ignore','pipe','inherit']});
  let browser;
  try {
    const port=await new Promise((resolve,reject)=>{server.stdout.once('data',d=>resolve(Number(String(d).trim())));server.once('error',reject);});
    browser=await chromium.launch({headless:true});
    const page=await browser.newPage();
    await page.route('**/api/geoespacial/storage/**',route=>route.fulfill({json:{caminho:'saidas-geoespaciais',pastas:[],arquivos:[
      {id:'fixture',nome:'fixture',arquivo:'saidas-geoespaciais/fixture.gpkg',tamanho_bytes:128,geometria_tipo:'Polygon'}
    ]}}));
    await page.goto(`http://127.0.0.1:${port}`);
    await page.waitForFunction(()=>typeof abrir==='function');
    for (const [details,inline] of [[false,false],[true,false],[false,true],[true,true]]) {
      await page.evaluate(({details,inline})=>{
        const host=inline?document.body.appendChild(document.createElement('div')):undefined;
        void abrir({multiple:true,detalhesAnalise:details,host});
      },{details,inline});
      for (const width of [1600,390]) {
        await page.setViewportSize({width,height:900});
        for (const mode of ['list','details','list','icons']) {
          const view=page.locator('[data-explorer-action=view]');
          await view.click();
          const option=page.locator(`[data-view=${mode}]`);
          await option.focus(); await page.keyboard.press('Enter');
          await page.waitForFunction(m=>document.querySelector('.ea-storage-list').dataset.mode===m,mode);
          const size=await page.locator('[name=ea-storage-filter]').evaluate(e=>e.getBoundingClientRect().height);
          await geometry(page,'.ea-storage-dialog',size);
          const clear=page.getByRole('button',{name:'Desmarcar todas',exact:true});
          assert.equal(await clear.isDisabled(),true);
          if(details&&mode==='details')await page.locator('.ea-storage-analysis-details tbody input[type=checkbox]:enabled').first().check();
          else await page.locator('.ea-storage-entry[data-file]').first().click();
          assert.equal(await clear.isDisabled(),false);
          await geometry(page,'.ea-storage-dialog',size);
          await clear.click();
          assert.equal(await clear.isDisabled(),true);
          if(details&&mode==='details'){
            const before=await page.locator('.explorer-sort-direction').textContent();
            await page.locator('.ea-storage-analysis-details th[aria-sort]').first().click();
            await geometry(page,'.ea-storage-dialog',size);
            assert.equal(await page.locator('.explorer-sort-direction').textContent(),before==='↑'?'↓':'↑');
          }
          await view.click();
          await menuGeometry(page);
          if(inline){
            await page.locator('.ea-storage-dialog').evaluate(e=>{e.parentElement.style.transform='translate(3px, 2px)';window.dispatchEvent(new Event('scroll'));});
            await menuGeometry(page);
            await page.locator('.ea-storage-dialog').evaluate(e=>{e.parentElement.style.transform='';window.dispatchEvent(new Event('scroll'));});
          }
          await page.evaluate(()=>window.dispatchEvent(new Event('scroll')));
          await page.setViewportSize({width:width-10,height:890});
          await menuGeometry(page);
          await page.setViewportSize({width,height:900});
          await menuGeometry(page);
          const boxes=await page.locator('.ea-storage-view-menu button').evaluateAll(es=>es.map(e=>{
            const box=e.querySelector('.explorer-menu-icon'),label=e.querySelector('.explorer-menu-label'),
              r=box.getBoundingClientRect(),l=label.getBoundingClientRect(),c=getComputedStyle(box),ec=getComputedStyle(e);
            return {w:r.width,h:r.height,left:r.left,right:l.right,labelOutside:!box.contains(label)&&l.left>=r.right,
              radius:c.borderRadius,border:c.borderTopColor,color:c.color,itemBorder:ec.borderTopWidth,bg:ec.backgroundColor,
              labelColor:getComputedStyle(label).color,normal:getComputedStyle(document.documentElement).getPropertyValue('--pli-text').trim(),
              checked:e.getAttribute('aria-checked'),outline:c.outlineStyle,
              check:getComputedStyle(e.querySelector('.explorer-menu-check')).visibility,
              checkColor:getComputedStyle(e.querySelector('.explorer-menu-check')).color,
              checkOutside:!box.contains(e.querySelector('.explorer-menu-check'))};
          }));
          for(const b of boxes){
            assert.equal(b.w,size);assert.equal(b.h,size);assert.equal(b.radius,'4px');
            assert.equal(b.border,b.color);assert.equal(b.itemBorder,'0px');assert.equal(b.bg,'rgba(0, 0, 0, 0)');
            assert.ok(b.labelOutside&&b.left>=0&&b.right<=width);
            assert.notEqual(b.labelColor,b.color);
            assert.equal(b.outline,'none');assert.ok(b.checkOutside);
            assert.equal(b.checkColor,'rgb(22, 101, 52)');
            assert.equal(b.check,b.checked==='true'?'visible':'hidden');
          }
          // Colunas do menu: itens em largura total, caixas de ícone e rótulos no mesmo x, em repouso e com hover.
          for(const estado of ['repouso','hover']){
            if(estado==='hover')await page.locator('.ea-storage-view-menu button').nth(1).hover();
            const alinhamento=await page.locator('.ea-storage-view-menu').evaluate(menu=>{
              const m=menu.getBoundingClientRect(),c=getComputedStyle(menu);
              const inner={left:m.left+parseFloat(c.borderLeftWidth)+parseFloat(c.paddingLeft),right:m.right-parseFloat(c.borderRightWidth)-parseFloat(c.paddingRight)};
              return {inner,items:[...menu.querySelectorAll('button')].map(b=>{
                const r=b.getBoundingClientRect(),s=getComputedStyle(b);
                return {view:b.dataset.view,left:r.left,right:r.right,box:b.querySelector('.explorer-menu-icon').getBoundingClientRect().left,
                  label:b.querySelector('.explorer-menu-label').getBoundingClientRect().left,justify:s.justifyContent,bg:s.backgroundColor,border:s.borderTopWidth};
              })};
            });
            const rotulo=`${estado} ${mode} ${width} ${JSON.stringify(alinhamento)}`;
            assert.equal(alinhamento.items.length,3,rotulo);
            for(const item of alinhamento.items){
              assert.equal(item.justify,'flex-start',rotulo);
              assert.ok(Math.abs(item.left-alinhamento.inner.left)<=.5&&Math.abs(item.right-alinhamento.inner.right)<=.5,`largura total: ${rotulo}`);
              assert.ok(Math.abs(item.box-alinhamento.items[0].box)<=.5,`caixas de ícone: ${rotulo}`);
              assert.ok(Math.abs(item.box-item.left)<=.5,`caixa à esquerda do item: ${rotulo}`);
              assert.ok(Math.abs(item.label-alinhamento.items[0].label)<=.5,`rótulos: ${rotulo}`);
              assert.equal(item.bg,'rgba(0, 0, 0, 0)',rotulo);assert.equal(item.border,'0px',rotulo);
            }
          }
          await page.mouse.move(0,0);
          await option.click();
          assert.equal(await view.getAttribute('aria-expanded'),'false');
          console.log(`shared details=${details} inline=${inline} ${mode} ${width}: ${size} × ${size}`);
        }
      }
      await page.locator('.ea-storage-window-controls button').last().click();
    }
    await page.evaluate(()=>void StoragePastas.escolher({raiz:'saidas-geoespaciais'}));
    await page.waitForSelector('.storage-pastas-dialog[open]');
    for(const width of [1600,390]){
      await page.setViewportSize({width,height:900});
      await page.locator('[data-acao=criar]').click();
      const size=await page.locator('.storage-pastas-edicao input').evaluate(e=>e.getBoundingClientRect().height);
      await geometry(page,'.storage-pastas-ferramentas',size);
      console.log(`folder ${width}: ${size} × ${size}`);
    }
  } finally { await browser?.close();server.kill(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
