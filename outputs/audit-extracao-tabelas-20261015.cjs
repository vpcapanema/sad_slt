const {chromium}=require('playwright');
const fs=require('fs'),path=require('path'),{execFileSync}=require('child_process');
process.env.PYTHONIOENCODING='utf-8';
const html=execFileSync('.venv/Scripts/python.exe',['-c',"from jinja2 import Environment,FileSystemLoader; e=Environment(loader=FileSystemLoader('templates')); print(e.get_template('componentes/extracao_atributos/_resultados.html').render())"],{encoding:'utf8'});
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 try{
  const page=await browser.newPage(),errors=[],calls=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',async route=>{
   const u=new URL(route.request().url());
   if(u.pathname==='/fixture')return route.fulfill({contentType:'text/html',body:'<meta charset=utf-8>'+html+'<script src="/assets/js/table-sort.js"></script>'});
   if(u.pathname.endsWith('/intersecoes')){
    const body=route.request().postDataJSON();calls.push(body);
    return route.fulfill({json:{pagina:body.pagina,paginas:2,total:3,entradas:[],categorias:[],areas:{},linhas:(body.pagina?['A']:['Z','Y']).map(x=>({chave:x,nome_demanda:x,fid:x,areas:[]}))}});
   }
   if(u.pathname.endsWith('/dashboard'))return route.fulfill({json:{pagina:0,paginas:1,campo:'valor',categorias:[],bases:[],origens:[],campos:[{campo:'valor'}],resumo:{preenchidos:0,registros:2},cobertura:[],cobertura_categorias:[],distribuicao:[],linhas:[{posicao:1,origem:'Z',registro:1,valor:1,bases:[],atributos:{nome:'Z'}},{posicao:2,origem:'A',registro:2,valor:2,bases:[],atributos:{nome:'A'}}],mapa:{features:[]},representacao_mapa:{metodo:'original'}}});
   const local=path.join(process.cwd(),u.pathname);
   if(fs.existsSync(local)&&fs.statSync(local).isFile())return route.fulfill({contentType:'text/javascript; charset=utf-8',body:fs.readFileSync(local)});
   return route.fulfill({status:404});
  });
  await page.goto('http://localhost/fixture');
  await page.evaluate(async()=>{const m=await import('/geoespacial/extracao-atributos/territorial.js');const h=document.getElementById('ea-panel-territorial');h.hidden=false;m.criarTerritorial({id:'fixture',camadas:{}}).mount(h);});
  await page.waitForFunction(()=>document.querySelector('#ea-panel-territorial tbody tr'));
  const matrix=page.locator('#ea-panel-territorial [data-role=matrix]');
  await matrix.locator('thead button').first().click();
  await matrix.locator('thead button').first().click();
  const out={territorialFirstPageSorted:await matrix.locator('tbody th').allTextContents(),territorialRequestsAfterSorting:calls.length};
  await page.locator('#ea-panel-territorial [data-action=next]').click();
  await page.waitForFunction(()=>document.querySelector('#ea-panel-territorial tbody th')?.textContent==='A');
  out.territorialSecondPage=await matrix.locator('tbody th').allTextContents();
  await page.evaluate(async()=>{const m=await import('/geoespacial/extracao-atributos/dashboard.js');const h=document.querySelector('#ea-panel-atributos');h.hidden=false;m.criarDashboard({id:'fixture',modo:'estatisticas'}).mount(h);});
  await page.waitForFunction(()=>document.querySelector('#ea-panel-atributos [data-role=rows] tr'));
  const dashboard=page.locator('#ea-panel-atributos');
  await dashboard.locator('[data-role=columns] th').first().click();
  out.dashboardOrder=await dashboard.locator('[data-role=rows] tr td:first-child').allTextContents();
  await dashboard.locator('[data-role=rows] tr').first().locator('button').click();
  out.dashboardDetails=await dashboard.locator('[data-role=selection-title]').textContent();
  out.dashboardHighlighted=await dashboard.locator('[data-role=rows] tr.is-selected td:first-child').allTextContents();
  out.errors=errors;
  fs.writeFileSync('outputs/audit-extracao-tabelas-20261015.json',JSON.stringify(out,null,2));console.log(out);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
