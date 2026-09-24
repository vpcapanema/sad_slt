// Catálogo lento/indisponível não bloqueia a preparação independente da seção 1.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--no-proxy-server','--enable-unsafe-swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  let soltar,consultas=0;
  const gate=()=>new Promise(resolve=>{soltar=resolve;});
  let espera=gate();
  await page.route('**/api/**',async route=>{
   const path=new URL(route.request().url()).pathname;
   if(path.includes('/auth/'))return route.fulfill({json:{authenticated:true,id:'teste',nome:'Teste',tipo_usuario:'ADMIN'}});
   if(path.endsWith('/extracao-atributos/catalogo')){
    const tentativa=++consultas;await espera;
    return tentativa===1?route.fulfill({status:503,json:{detail:'Catálogo indisponível no teste.'}}):
     route.fulfill({json:{categorias:[{id:'social',nome:'Social'}],camadas:[]}});
   }
   return route.fulfill({json:[]});
  });
  await page.goto(`${process.env.SICARD_TEST_URL||'http://127.0.0.1:8083'}/restrict/geoespacial/extracao-atributos/`,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.SICARDExtracao&&document.querySelector('#ea-refresh')?.disabled);
  for(const id of ['ea-input-upload','ea-input-browse','ea-operation','ea-nome-saida','ea-category-select']){
   assert.equal(await page.locator('#'+id).isEnabled(),true,`${id} disponível durante consulta`);
  }
  assert.equal(await page.locator('#ea-run').isDisabled(),true);
  assert.equal(await page.locator('#ea-refresh').isDisabled(),true,'Evita consultas duplicadas');
  await page.selectOption('#ea-operation','estatisticas');
  await page.fill('#ea-nome-saida','Preparação durante carregamento');
  const chooser=page.waitForEvent('filechooser');await page.locator('#ea-input-upload').click();await(await chooser).setFiles([]);
  soltar();
  await page.locator('.slt-fb-modal--error').waitFor();assert.equal(await page.locator('#ea-catalog-status').isVisible(),false);
  await page.locator('#slt-feedback-backdrop').getByRole('button',{name:'OK',exact:true}).click();
  assert.equal(await page.locator('#ea-input-upload').isEnabled(),true);
  assert.equal(await page.locator('#ea-refresh').isEnabled(),true);
  assert.equal(await page.locator('#ea-operation').inputValue(),'estatisticas');
  espera=gate();await page.locator('#ea-refresh').click();
  await page.waitForFunction(()=>document.querySelector('#ea-refresh').disabled);
  await page.selectOption('#ea-operation','enriquecimento');
  await page.fill('#ea-nome-saida','Nome preservado');
  soltar();
  await page.waitForFunction(()=>!document.querySelector('#ea-refresh').disabled);
  assert.equal(await page.locator('#ea-operation').inputValue(),'enriquecimento');
  assert.equal(await page.locator('#ea-nome-saida').inputValue(),'Nome preservado');
  assert.equal(await page.locator('#ea-refresh').isEnabled(),true);
  assert.equal(consultas,2);
  assert.deepEqual(errors,[]);
  console.log('PASS: preparação disponível com catálogo lento, falha recuperável, nova tentativa e campos preservados.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
