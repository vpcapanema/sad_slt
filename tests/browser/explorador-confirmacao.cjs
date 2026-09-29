const {chromium}=require('playwright'),assert=require('node:assert/strict');

(async()=>{
 const browser=await chromium.launch({headless:true,channel:process.env.EA_TEST_CHROME||undefined,args:['--no-sandbox','--no-proxy-server','--enable-unsafe-swiftshader']});
 try{
  const page=await browser.newPage(),requests=[],errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  const camada={id:'entrada',nome:'Entrada',arquivo:'base-geoespacial/entrada.gpkg'};
  await page.route('**/api/**',route=>{
   const url=new URL(route.request().url()),path=url.pathname;
   if(path.includes('/auth/'))return route.fulfill({json:{authenticated:true,id:'teste',nome:'Teste',username:'Teste',tipo_usuario:'ADMIN'}});
   if(path.endsWith('/catalogo'))return route.fulfill({json:{categorias:[{id:'risco',nome:'Risco'}],camadas:[camada]}});
   if(path.endsWith('/storage/navegar'))return route.fulfill({json:{caminho:'base-geoespacial',pastas:[],arquivos:[]}});
   if(path.endsWith('/arquivo-mapa')){requests.push(route.request().postDataJSON());return route.fulfill({json:{...camada,campos:[{nome:'codigo'}],geojson:{type:'FeatureCollection',features:[{type:'Feature',properties:{codigo:'A'},geometry:{type:'Point',coordinates:[-46,-23]}}]}}});}
   return route.fulfill({json:[]});
  });
  await page.goto(`${process.env.TEST_BASE_URL||'http://127.0.0.1:8083'}/restrict/geoespacial/extracao-atributos/`,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.SICARDExtracao&&document.querySelector('#ea-category-select').options.length>1);
  await page.locator('#ea-input-browse').click();
  const explorer=page.locator('dialog.ea-storage-dialog');
  const visual=await explorer.evaluate(dialog=>({
   radius:getComputedStyle(dialog).borderRadius,
   header:getComputedStyle(dialog.querySelector('header')).backgroundImage,
   footer:getComputedStyle(dialog.querySelector('.ea-storage-confirm')).backgroundColor,
  }));
  assert.equal(visual.radius,'16px');
  assert.match(visual.header,/linear-gradient/);
  assert.notEqual(visual.footer,'rgba(0, 0, 0, 0)');
  await explorer.getByRole('button',{name:'Camadas cadastradas no banco',exact:true}).click();
  await explorer.locator('[data-file="entrada"]').click();
  await explorer.locator('.ea-storage-confirm-button').click();
  await explorer.locator('#pfsConfirmBox.pfs-active').waitFor();
  assert.equal(await explorer.locator('#pfsProgressBox.pfs-active').count(),0);
  assert.deepEqual(requests,[]);
  await explorer.locator('#pfsConfirmCancel').click();
  assert.equal(await explorer.locator('.ea-storage-confirm-button').isEnabled(),true);
  assert.deepEqual(requests,[]);
  await explorer.locator('.ea-storage-confirm-button').click();
  await explorer.locator('#pfsConfirmOk').click();
  await explorer.waitFor({state:'detached'});
  assert.deepEqual(requests,[{arquivo:camada.arquivo,id:camada.id}]);
  assert.equal(await page.locator('#ea-input-select').inputValue(),'entrada');
  await page.locator('#ea-identificacao-camadas tr').waitFor();
  for(const width of [1440,390]){
   await page.setViewportSize({width,height:1000});
   const layout=await page.evaluate(()=>{
    const rect=selector=>document.querySelector(selector).getBoundingClientRect();
    const input=rect('#ea-config .ea-config-grid-3 > .ea-panel:first-child');
    const identification=rect('#ea-identificacao');
    const table=document.querySelector('#ea-identificacao .ea-table-wrap');
    const font=tag=>getComputedStyle(document.querySelector(`#ea-identificacao ${tag}`)).fontSize;
    return {input:{left:input.left,right:input.right,bottom:input.bottom},
     identification:{left:identification.left,right:identification.right,top:identification.top},
     tableContained:table.getBoundingClientRect().right<=identification.right,
     tableScrolls:table.scrollWidth>table.clientWidth,
     clearInside:document.querySelector('#ea-input-clear').closest('#ea-identificacao .ea-base-list-actions')!==null,
     fonts:['th','td','select'].map(font),overflow:document.documentElement.scrollWidth>innerWidth};
   });
   assert(Math.abs(layout.input.left-layout.identification.left)<1,'Identificação alinhada à entrada');
   assert(Math.abs(layout.input.right-layout.identification.right)<1,'Identificação limitada à coluna de entrada');
   assert(layout.identification.top>=layout.input.bottom,'Identificação abaixo da entrada');
   assert(layout.tableContained&&layout.tableScrolls,'Tabela rola sem ampliar o card');
   assert(layout.clearInside,'Limpar entrada junto de Confirmar configuração');
   assert.deepEqual(layout.fonts,['12px','12px','12px']);
   assert.equal(layout.overflow,false,'Card não amplia a página');
  }
  await page.locator('#ea-input-clear').click();
  assert.equal(await page.locator('#ea-input-select').inputValue(),'');
  assert.equal(await page.locator('#ea-identificacao').isHidden(),true);
  await page.setViewportSize({width:360,height:640});
  await page.evaluate(async()=>{
   const {editarFinalidade}=await import('/restrict/geoespacial/extracao-atributos/regras.js');
   window.edicaoTeste=editarFinalidade({disponiveis:[]});
  });
  const editor=page.locator('dialog.ea-finalidade-dialog');
  const mobile=await editor.evaluate(dialog=>({
   width:dialog.getBoundingClientRect().width,
   radius:getComputedStyle(dialog).borderRadius,
   header:getComputedStyle(dialog.querySelector('h2')).backgroundImage,
   footer:getComputedStyle(dialog.querySelector('.ea-config-dialog-footer')).backgroundColor,
  }));
  assert(mobile.width<=360);
  assert.equal(mobile.radius,'12px');
  assert.match(mobile.header,/linear-gradient/);
  assert.notEqual(mobile.footer,'rgba(0, 0, 0, 0)');
  await editor.getByRole('button',{name:'Cancelar'}).click();
  assert.deepEqual(errors,[]);
  console.log('PASS: confirmar entrada antecede acompanhamento; cancelar preserva seleção e não lê arquivos.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1)});
