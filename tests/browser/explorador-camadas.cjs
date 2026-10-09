const {chromium}=require('playwright');const fs=require('node:fs'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict');const {execFileSync}=require('node:child_process');
(async()=>{
 const html=execFileSync('.venv/Scripts/python.exe',['-X','utf8','-c',"from fastapi.testclient import TestClient;from api.server import app;r=TestClient(app).get('/restrict/geoespacial/explorador-camadas/');assert r.status_code==200;print(r.text)"],{encoding:'utf8'});
 const folder=(nome,fonte,caminho)=>({nome,fonte,caminho,pasta:true});
 const file={nome:'Camada teste',nome_arquivo:'teste.gpkg',id:'storage:base-geoespacial/pasta/teste.gpkg::rios',fonte:'storage',pasta:false,arquivo:'base-geoespacial/pasta/teste.gpkg',extensao:'GPKG',tamanho_bytes:2048,modificado_em:1728390000,geometria_tipo:'LineString',camada:'rios'};
 const requests=[];
 const server=http.createServer((req,res)=>{
  const u=new URL(req.url,'http://localhost');
  if(u.pathname==='/restrict/geoespacial/explorador-camadas/'){res.setHeader('Content-Type','text/html;charset=utf-8');res.end(html);return;}
  if(u.pathname.startsWith('/api/')){
   requests.push(u.pathname+u.search);let data=[];
   if(u.pathname.endsWith('/navegar')){const s=u.searchParams.get('fonte'),p=u.searchParams.get('caminho');
    data=!s?{itens:[folder('DEMANDAS','demandas',''),folder('SICARD Storage','storage',''),folder('Geometrias de saída','saidas','')]}:
     s==='storage'&&!p?{itens:[folder('Base-Geodatabase','storage','base-geodatabase'),folder('Base-Geoespacial','storage','base-geoespacial'),folder('Superfícies-Índice','storage','superficies-indices')]}:
     p==='base-geoespacial'?{itens:[folder('Pasta vetorial','storage','base-geoespacial/pasta'),file],folha:false}:{itens:[file],folha:true};
   }else if(u.pathname.endsWith('/detalhes'))data={arquivo:file.arquivo,crs:'EPSG:4674',camadas:[{nome:'rios',campo:'<script>window.bad=true</script>'}]};
   res.setHeader('Content-Type','application/json');res.end(JSON.stringify(data));return;
  }
  const relative=u.pathname.replace(/^\//,'').replace(/^restrict\/geoespacial\//,'geoespacial/'),target=path.resolve(relative);
  if(!target.startsWith(process.cwd()+path.sep)||!fs.existsSync(target)||!fs.statSync(target).isFile()){res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type',({'.css':'text/css','.js':'application/javascript','.png':'image/png','.woff2':'font/woff2'})[path.extname(target)]||'application/octet-stream');fs.createReadStream(target).pipe(res);
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1400,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('https://**/*',r=>r.abort());
  await page.goto(`http://127.0.0.1:${server.address().port}/restrict/geoespacial/explorador-camadas/`);
  await page.waitForSelector('.geo-explorer-card');assert.equal(await page.locator('.geo-explorer-card').count(),3);assert.deepEqual(await page.locator('.geo-explorer-card > span:not(.geo-explorer-folder-icon)').allTextContents(),['Demandas','SICARD Storage','Outputs']);assert.equal(await page.locator('#explorer-toolbar').isVisible(),false);
  await page.getByRole('button',{name:'SICARD Storage',exact:true}).click();await page.getByRole('button',{name:'Base-Geoespacial',exact:true}).click();
  await page.waitForSelector('tbody');assert.equal(await page.locator('#explorer-toolbar').isVisible(),true);
  await page.getByRole('button',{name:'Ícones grandes',exact:true}).click();await page.waitForSelector('.geo-explorer-icons');
  await page.getByRole('button',{name:'Pasta Vetorial',exact:true}).click();await page.waitForSelector('tbody');
  assert.equal(await page.locator('[data-view=icons]').isDisabled(),true);assert.equal(await page.locator('th').last().textContent(),'Ações');assert.match(await page.locator('tbody').textContent(),/GPKG/);assert.match(await page.locator('tbody').textContent(),/2 KB/);
  const mapHref=await page.getByRole('link',{name:'Visualizar Camada teste no mapa'}).getAttribute('href');assert.equal(new URL(mapHref,'http://localhost').searchParams.get('camada'),file.id);
  const download=await page.getByRole('link',{name:'Baixar Camada teste em ZIP'}).getAttribute('href');assert.equal(new URL(download,'http://localhost').searchParams.get('id'),file.id);
  await page.getByRole('button',{name:'Detalhes de Camada teste'}).click();await page.waitForSelector('#explorer-details pre');assert.match(await page.locator('#explorer-details-body').textContent(),/EPSG:4674/);assert.equal(await page.evaluate(()=>window.bad),undefined);
  await page.getByRole('button',{name:'Fechar',exact:true}).click();await page.locator('#explorer-search').fill('ausente');assert.match(await page.locator('#explorer-content').textContent(),/Nenhum item/);await page.locator('#explorer-search').fill('');
  await page.screenshot({path:'tmp/explorador-camadas-desktop.png',fullPage:true});
  await page.getByRole('button',{name:'Pasta acima',exact:true}).click();await page.waitForSelector('.geo-explorer-icons');
  await page.getByRole('button',{name:'Lista',exact:true}).click();await page.waitForSelector('.geo-explorer-list');
  await page.setViewportSize({width:390,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=390),true);await page.screenshot({path:'tmp/explorador-camadas-mobile.png',fullPage:true});assert.deepEqual(errors,[]);
  console.log('PASS explorador completo: três fontes, pastas, modos, detalhes obrigatórios na folha, metadados seguros, busca, links e responsividade');
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exit(1);});
