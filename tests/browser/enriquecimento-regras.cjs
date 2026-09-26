// Editores reais, servidos isoladamente; nenhuma chamada ao banco.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
(async()=>{
 const root=path.resolve('.');
 const server=http.createServer((req,res)=>{
  if(req.url==='/'){res.setHeader('Content-Type','text/html');return res.end('<html><body><script src="/assets/js/feedback.js"></script></body></html>');}
  const file=path.resolve(root,'.'+req.url);
  if(!file.startsWith(root+'/')){res.statusCode=404;return res.end();}
  res.setHeader('Content-Type','text/javascript');fs.createReadStream(file).on('error',()=>{res.statusCode=404;res.end();}).pipe(res);
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({args:['--no-sandbox']});
 try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:'+server.address().port);
  await page.evaluate(async()=>{window.regras=await import('/geoespacial/extracao-atributos/regras.js');window.abrir=()=>{window.pedido=regras.editarEstatisticas({nomeBase:'Indicadores',regra:{estatistica:'media'},camposDisponiveis:['codigo','quantidade']});};abrir();});
  assert.match(await page.locator('dialog').innerText(),/configuração antiga/);
  assert.deepEqual(await page.locator('select[name=estatistica] option').evaluateAll(ns=>ns.map(n=>n.value)),['valores']);
  await page.selectOption('[name=campo_estatistica]','quantidade');await page.selectOption('[name=estatistica_campo]','total');
  await page.getByRole('button',{name:'Aplicar',exact:true}).click();
  const regra=await page.evaluate(()=>pedido);assert.equal(regra.estatistica,'valores');assert.deepEqual(regra.estatisticas_campos,{quantidade:'total'});
  await page.evaluate(()=>{window.pedido=regras.editarEstatisticas({nomeBase:'Inundação',categoria:{id:'risco'}});});
  assert.match(await page.locator('dialog').innerText(),/atributos originais/);assert.equal(await page.locator('[name=campo_estatistica]').count(),0);
  await page.getByRole('button',{name:'Aplicar',exact:true}).click();assert.equal((await page.evaluate(()=>pedido)).estatistica,'valores');
  await page.evaluate(()=>{window.pedido=regras.editarRegra({nomeBase:'Base',camposDisponiveis:['codigo','valor']});});
  assert.equal(await page.locator('[name=multiplicidade]').inputValue(),'resumo');
  await page.getByRole('button',{name:'Operações por campo do resumo'}).click();
  await page.selectOption('[name=campo_estatistica]','valor');await page.selectOption('[name=estatistica_campo]','media');
  await page.locator('dialog').last().getByRole('button',{name:'Aplicar',exact:true}).click();
  await page.getByRole('button',{name:'Aplicar',exact:true}).click();
  assert.deepEqual((await page.evaluate(()=>pedido)).estatisticas_campos,{valor:'media'});
  assert.deepEqual(errors,[]);console.log('PASS: padrão preserva valores, revisão de legado, cálculos por campo e atributos de risco.');
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exit(1)});
