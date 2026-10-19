// Grade e template reais, sem servidor, banco ou persistência externa.
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
const template=fs.readFileSync(path.join(root,'templates','componentes','_geoprocessamento.html'),'utf8').match(/<template id="gp-attribute-template">[\s\S]*?<\/template>/)[0];
(async()=>{
 const browser=await chromium.launch({headless:true,channel:process.platform==='win32'?'msedge':undefined});
 try{
  const page=await browser.newPage({viewport:{width:1400,height:900}}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  async function setup(context){
   await context.setContent(`<style>body{margin:0}#gp-editor-view{position:absolute;right:0;width:360px;height:100vh}</style><div id="gp-editor-view"></div>${template}`);
   for(const file of ['assets\\vendor\\tabulator\\tabulator.min.css','assets\\css\\geoprocessamento-atributos.css'])await context.addStyleTag({path:path.join(root,file)});
   await context.addScriptTag({path:path.join(root,'assets','vendor','tabulator','tabulator.min.js')});
   await context.evaluate(()=>{
    window.gpApp={state:{layers:[{id:'teste',nome:'Camada de teste'}],editingLayers:new Set(),attributeTableLayers:['teste']}};
    window.gpCommands={featureKey:(_properties,id)=>String(id),setLayerSelection:(id,features)=>{gpApp.state.selectedGeoJSON={type:'FeatureCollection',features:features.map(f=>({...f,properties:{...f.properties,__gp_layer_id:id}}))};}};
   });
   await context.addScriptTag({path:path.join(root,'geoespacial','geoprocessamento-atributos.js')});
   await context.evaluate(()=>gpAttributeTable.render('teste',{colunas:[{nome:'nome',tipo:'string'}],registros:[{nome:'Feição',_indice:0,__gp_feature:{type:'Feature',id:0,properties:{nome:'Feição'},geometry:null}}]}));
   await context.waitForSelector('.tabulator-row');
   await context.evaluate(()=>{gpAttributeTable.grid.selectRow(0);window.originalGrid=gpAttributeTable.grid;});
  }
  const rect=context=>context.locator('.attribute-grid-workspace').evaluate(element=>{const r=element.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};});
  async function drag(context,dx,dy){
   const box=await context.locator('.attribute-heading').boundingBox();
   const offset=await context.locator('.attribute-heading').evaluate(element=>{
    const r=element.getBoundingClientRect(),left=Math.max(0,r.left),right=Math.min(innerWidth,r.right);
    return left-r.left+Math.min(60,(right-left)/2);
   });
   await page.mouse.move(box.x+offset,box.y+20);await page.mouse.down();
   await page.mouse.move(box.x+offset+dx,box.y+20+dy,{steps:8});await page.mouse.up();
  }
  async function assertReachable(context){
   const bounds=await context.locator('.attribute-heading').evaluate(element=>{
    const r=element.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:innerWidth,height:innerHeight};
   });
   assert(bounds.right>=95&&bounds.left<=bounds.width-95,'Deve restar uma área horizontal para segurar o cabeçalho');
   assert(bounds.top>=-1&&bounds.bottom<=bounds.height+1,'O cabeçalho deve continuar visível na vertical');
  }
  async function exercise(context){
   const workspace=context.locator('.attribute-grid-workspace');
   const docked=await rect(context);
   await drag(context,-60,30);
   assert.deepEqual(await rect(context),docked,'O painel acoplado não deve arrastar');
   await context.locator('[data-at-maximize]').click();
   await context.waitForSelector('.attribute-maximized');
   const before=await rect(context);
   await drag(context,120,90);
   const after=await rect(context);
   assert(Math.abs(after.x-before.x-120)<1,'Arrastar o cabeçalho deve mover a tabela no eixo X');
   assert(Math.abs(after.y-before.y-90)<1,'Arrastar o cabeçalho deve mover a tabela no eixo Y');
   assert.equal(after.width,before.width);assert.equal(after.height,before.height);
   assert.equal(await context.evaluate(()=>originalGrid===gpAttributeTable.grid),true);
   assert.deepEqual(await context.evaluate(()=>gpAttributeTable.grid.getSelectedData().map(row=>row.__gp_row)),[0]);
   await page.keyboard.press('Escape');
   await context.waitForSelector('.attribute-grid-workspace:not(.attribute-maximized)');
   assert.deepEqual(await rect(context),docked,'Esc restaura a posição acoplada');
   await context.locator('[data-at-maximize]').click();
   assert.deepEqual(await rect(context),before,'Maximizar novamente reinicia a posição');
   await drag(context,-3000,3000);
   await assertReachable(context);
   assert.equal(await workspace.evaluate(element=>element.classList.contains('attribute-dragging')),false,'Soltar fora do painel encerra o arraste');
   if(context===page)await page.setViewportSize({width:720,height:500});
   else await page.locator('iframe').evaluate(element=>{element.style.width='500px';element.style.height='340px';});
   await context.waitForFunction(()=>innerWidth<=720);
   await context.waitForFunction(()=>{const r=document.querySelector('.attribute-heading').getBoundingClientRect();return r.top>=-1&&r.bottom<=innerHeight+1;},undefined,{timeout:2000}).catch(async error=>{
    const bounds=await context.locator('.attribute-heading').evaluate(element=>{const r=element.getBoundingClientRect();return {top:r.top,bottom:r.bottom,height:innerHeight,offset:document.querySelector('.attribute-grid-workspace').style.cssText};});
    throw Error(`${error.message}: ${JSON.stringify(bounds)}`);
   });
   await assertReachable(context);
   if(context===page)await page.setViewportSize({width:1400,height:900});
   else await page.locator('iframe').evaluate(element=>{element.style.width='900px';element.style.height='650px';});
   await context.waitForFunction(()=>innerWidth>=900);
   await page.keyboard.press('Escape');
   await context.waitForSelector('.attribute-grid-workspace:not(.attribute-maximized)');
   await context.locator('[data-at-maximize]').click();
   await drag(context,-100,20);
   await context.locator('[data-at-maximize]').click();
   await context.waitForSelector('.attribute-grid-workspace:not(.attribute-maximized)');
   assert.deepEqual(await rect(context),docked,'O botão restaurar não deve iniciar arraste');
   assert.equal(await workspace.getAttribute('class').then(value=>value.includes('attribute-dragging')),false);
  }
  await setup(page);await exercise(page);
  await page.setContent('<iframe title="Bancada incorporada" style="width:900px;height:650px;border:0"></iframe>');
  const frame=page.frames().find(item=>item!==page.mainFrame());
  await setup(frame);await exercise(frame);
  assert.deepEqual(errors,[]);
  console.log('OK: arraste por cabeçalho, tamanho e seleção preservados, Esc, restaurar e bancada incorporada.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
