const {chromium} = require('playwright');
const assert = require('node:assert/strict');
(async () => {
 const browser = await chromium.launch({channel:'msedge',headless:true});
 try {
  const page = await browser.newPage();
  const erros=[], pedidos=[];
  page.on('pageerror', e => erros.push(e.message));
  const demanda={id:'D',nome:'Demanda teste',status:'analise_em_avaliacao',criadoEm:'2026-10-24T12:00:00Z',representante:{},complementos:{},classificacao:{}};
  await page.route('**/api/**', async route => {
   const req=route.request(), p=new URL(req.url()).pathname;
   let body=[];
   if(p==='/api/auth/me') body={id:'u',nome:'Analista',tipo_usuario:'ANALISTA'};
   else if(p==='/api/auth/session') body={authenticated:true};
   else if(p==='/api/demandas/internas') body=[demanda];
   else if(p==='/api/demandas/internas/D') body=demanda;
   else if(p==='/api/analise/D') body={criterios:[],avaliacao_geometria:{}};
   else if(p==='/api/analise/D/geometria/historico') body={itens:[],tem_historico:false};
   else if(p==='/api/analise/D/situacao') {pedidos.push(req.postDataJSON());body={status_atual:demanda.status};}
   else if(p.includes('/instituicoes')||p.includes('/pessoas')) body={data:[]};
   await route.fulfill({json:body});
  });
  await page.goto('http://127.0.0.1:8083/restrict/demanda/?tipo=projeto&id=D');
  await page.locator('#solicitacao-tipo').waitFor();
  for(const tipo of ['dados_cadastrais','geometria','dados_cadastrais,geometria','atributos_objeto']) {
   await page.locator('#solicitacao-tipo').selectOption(tipo);
   await page.locator('#solicitacao-motivo').fill('Corrigir os dados solicitados');
   if(tipo==='atributos_objeto') await page.locator('#solicitacao-hierarquizacao').fill('H1');
   await page.locator('[data-situacao="complementar"]').click();
   const resposta=page.waitForResponse(r=>r.url().endsWith('/api/analise/D/situacao'));
   await page.getByRole('button',{name:'Solicitar complementação',exact:true}).last().click();
   await resposta;
   assert.deepEqual(pedidos.at(-1).categorias,tipo.split(','));
   assert.equal(pedidos.at(-1).descricao,'Corrigir os dados solicitados');
   assert.equal(pedidos.at(-1).hierarquizacao_codigo,tipo==='atributos_objeto'?'H1':null);
   await page.reload();
   await page.locator('#solicitacao-tipo').waitFor();
  }
  assert.deepEqual(erros,[]);
  console.log('Página de análise completa: solicitações cadastrais, geometria, conjuntas e atributos enviadas com motivo e contexto.');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

