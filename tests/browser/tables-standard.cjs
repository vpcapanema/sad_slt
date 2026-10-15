const {chromium} = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({channel:'msedge', headless:true});
  const items = Array.from({length:17}, (_,i) => ({id:`P${i+1}`, codigo:`P${i+1}`, nome:`Projeto ${i+1}`, status:'analise_aguardando_complementacao', criadoEm:'2026-10-14T12:00:00-03:00', criadoPorNome:'Responsável', complementos:{}}));
  const judgments = items.map(x => ({...x,status:'ativa',convites:[],criterios:[],n_criterios:0}));
  const cases = [
    ['hierarquizacao/processos/','#hier-tbody','hier-filter','codigo','#hier-pagination','hier-filter-count','.hier-row-select'],
    ['analise-multicriterio/?modo=espaco','#ami-judgments','ami-filter','id','#ami-judgments-pagination','ami-count','[data-select-id]'],
    ['analise-multicriterio/?modo=julgamentos','#ami-judgments','ami-filter','id','#ami-judgments-pagination','ami-count','[data-analysis-round]'],
    ['demandas/','[data-demandas-body="projeto"]','filtro','1','#demandas-pagination','demandas-summary','.row-select'],
    ['complementacao/','[data-demandas-body="projeto"]','filtro','1','#demandas-pagination','demandas-summary','.row-select'],
    ['sei-documentos/','#sei-documentos-body','sei-filter','nome_arquivo','#sei-pagination','sei-summary','[data-sei-select]'],
    ['geoespacial/extracoes-atributos/','#ea-indice-tbody','ea-indice','nome','#ea-indice-pagination','ea-indice-contagem','input[type="checkbox"]'],
  ];
  try {
    for (const [url,body,prefix,column,pager,summary,checkbox] of cases) {
      const p = await browser.newPage({viewport:{width:1440,height:1000}}), errors=[];
      p.on('pageerror',e=>errors.push(e.message));
      await p.route('**/api/**', r => {
        const path = new URL(r.request().url()).pathname;
        let json=[];
        if(path==='/api/auth/me') json={id:'u',nome:'Analista',tipo_usuario:'ANALISTA'};
        else if(path==='/api/auth/session') json={authenticated:true,user:{id:'u',tipo_usuario:'ANALISTA'}};
        else if(path==='/api/demandas/internas'||path==='/api/complementacao/demandas/projeto') json=items;
        else if(path==='/api/ahp/hierarquizacoes') json=items.map(x=>({...x,status:'em_julgamento'}));
        else if(path==='/api/ahp/comparacao-colaborativa/ambientes') json=judgments;
        else if(path==='/api/agrupamentos-demandas') json=[{id:'g',nome:'Grupo',codigo:'G1',tipo_demanda:'projeto',quantidade_demandas:17}];
        else if(path==='/api/agrupamentos-demandas/g') json={id:'g',codigo:'G1',nome:'Grupo',tipo_demanda:'projeto',quantidade_demandas:17,objetos:items};
        else if(path==='/api/sei/documentos') json=items.map(x=>({...x,nome_arquivo:x.id+'.pdf',numero_processo:'123',usuario_nome:'Analista',criado_em:x.criadoEm,status:'recebido'}));
        else if(path==='/api/geoespacial/extracao-atributos/execucoes') json=items.map(x=>({id:x.id,nome_saida:x.nome,criado_em:x.criadoEm,entrada:'Entrada',operacao:'intersection',bases:2,resumo:{ocorrencias:3,percentual:25},minha:true,pacote_nome:'saida.zip',pacote_tamanho_bytes:1000}));
        else if(path.includes('/instituicoes')||path.includes('/pessoas')) json={data:[]};
        return r.fulfill({json});
      });
      await p.goto('http://127.0.0.1:8083/restrict/'+url);
      await p.locator(body+' '+checkbox).first().waitFor();
      assert.equal(await p.locator(body+' tr').count(),15,url);
      const selectAll = p.locator(body).locator('..').locator('thead input[type="checkbox"]').first();
      await selectAll.check();
      assert.match(await p.locator('#'+summary).textContent(),/^15 selecionados \/ 15 na página \/ 17 no total$/,url);
      await selectAll.uncheck();
      await p.locator(body+' '+checkbox).first().check();
      assert.match(await p.locator('#'+summary).textContent(),/^1 selecionados \/ 15 na página \/ 17 no total$/,url);
      await p.locator(pager+' button').last().click();
      assert.equal(await p.locator(body+' tr').count(),2,url);
      assert.match(await p.locator('#'+summary).textContent(),/^0 selecionados \/ 2 na página \/ 17 no total$/,url);
      await p.locator('#'+prefix+'-coluna').selectOption(column);
      const value = await p.locator('#'+prefix+'-valor option').nth(1).getAttribute('value');
      await p.locator('#'+prefix+'-valor').selectOption(value);
      assert.equal(await p.locator(body+' tr').count(),1,url);
      await p.locator('#'+prefix+'-inverter').click();
      assert.equal(await p.locator(body+' tr').count(),15,url);
      await p.locator(pager+' button').last().click();
      assert.equal(await p.locator(body+' tr').count(),1,url);
      await p.locator('#'+prefix+'-limpar').click();
      assert.equal(await p.locator(body+' tr').count(),15,url);
      const table=p.locator(body).locator('..');
      const sortIndex=prefix==='sei-filter'?1:prefix==='ea-indice'?3:2;
      const header=table.locator('thead th').nth(sortIndex);
      await header.click();
      assert.equal(await header.getAttribute('aria-sort'),'ascending',url);
      assert.match((await p.locator(body+' tr').first().locator('td').nth(sortIndex).textContent()).trim(),/1(?:\.pdf)?$/,url);
      await header.click();
      assert.equal(await header.getAttribute('aria-sort'),'descending',url);
      assert.match((await p.locator(body+' tr').first().locator('td').nth(sortIndex).textContent()).trim(),/17(?:\.pdf)?$/,url);
      await p.locator(pager+' button').last().click();
      assert.match((await p.locator(body+' tr').first().locator('td').nth(sortIndex).textContent()).trim(),/2(?:\.pdf)?$/,url);
      await header.focus(); await p.keyboard.press('Enter');
      assert.equal(await header.getAttribute('aria-sort'),'none',url);
      assert.match((await p.locator(body+' tr').first().locator('td').nth(sortIndex).textContent()).trim(),/1(?:\.pdf)?$/,url);
      const font=await header.evaluate(el=>{const s=getComputedStyle(el);return [s.fontFamily,s.fontSize];});
      assert.deepEqual(font,['Montserrat, Verdana, sans-serif','11.52px'],url);
      const dataFonts=await p.locator(body+' tr').first().locator('td,td code,td small').evaluateAll(els=>els.map(el=>{const s=getComputedStyle(el);return [s.fontFamily,s.fontSize];}));
      dataFonts.forEach(font=>assert.deepEqual(font,['Roboto, Arial, sans-serif','11.84px'],url));
      const sortable=await table.locator('thead th').evaluateAll(els=>els.map((el,i)=>({i,sortable:el.classList.contains('slt-sortable-column')})));
      sortable.forEach(({i,sortable})=>assert.equal(sortable,i>0&&!(prefix==='ea-indice'&&i===1),url+' coluna '+i));
      const metrics = await p.locator(body+' tr').first().evaluate(tr=>({height:tr.getBoundingClientRect().height,expected:parseFloat(getComputedStyle(document.documentElement).fontSize)*1.7}));
      assert.ok(Math.abs(metrics.height-metrics.expected)<1,JSON.stringify({url,metrics}));
      const actions = p.locator('.standard-table-actions .admin-icon-btn:visible');
      assert.ok(await actions.count()>0,url);
      for(const size of await actions.evaluateAll(els=>els.map(e=>({width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height,radius:getComputedStyle(e).borderRadius,expected:parseFloat(getComputedStyle(document.documentElement).fontSize)*2.35})))) {
        assert.ok(Math.abs(size.width-size.expected)<.1&&Math.abs(size.height-size.expected)<.1&&size.radius==='6px',JSON.stringify({url,size}));
      }
      if(url.startsWith('hierarquizacao')) {
        await p.locator('#hier-new').click(); await p.locator('#hier-agrupamento').selectOption('g');
        await p.waitForFunction(()=>document.querySelectorAll('#hier-agrupamento-demandas tr').length===15);
        await p.locator('#hier-grupo-pagination button').last().click();
        assert.equal(await p.locator('#hier-agrupamento-demandas tr').count(),2);
        await p.locator('#hier-grupo-coluna').selectOption('codigo');
        await p.locator('#hier-grupo-valor').selectOption('P1');
        assert.equal(await p.locator('#hier-agrupamento-demandas tr').count(),1);
      }
      await p.locator('#'+prefix+'-coluna').selectOption(prefix==='filtro'?'0':prefix==='ea-indice'?'operacao':'status');
      const statusValue=await p.locator('#'+prefix+'-valor option').nth(1).getAttribute('value');
      await p.locator('#'+prefix+'-valor').selectOption(statusValue);
      await p.locator('#'+prefix+'-inverter').click();
      assert.equal(await p.locator(body+' '+checkbox).count(),0,url);
      assert.match(await p.locator('#'+summary).textContent(),/^0 selecionados \/ 0 na página \/ 17 no total$/,url);
      assert.equal(await p.locator(pager+' button').last().isDisabled(),true,url);
      await p.locator('#'+prefix+'-limpar').click();
      await p.setViewportSize({width:390,height:844});
      assert.equal(await p.locator('#'+prefix+'-limpar').isVisible(),true,url);
      await p.setViewportSize({width:1440,height:1000});
      assert.deepEqual(errors,[],url);
      await p.screenshot({path:'outputs/table-standard-'+prefix+(url.includes('julgamentos')?'-respostas':'')+'.png'});
      console.log(url+': filtros, inversao, paginas 15/2, selecao, contador e dimensoes OK');
      await p.close();
    }
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
