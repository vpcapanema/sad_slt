const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const base = process.env.SICARD_TEST_URL || 'http://127.0.0.1:8083';

(async () => {
  const browser = await chromium.launch({channel:'msedge', headless:true});
  const items = Array.from({length:17}, (_,i) => ({id:`P${i+1}`, codigo:`P${i+1}`, nome:`Projeto ${i+1}`, origem_sei_processo:`SEI-${i+1}`, status:'analise_aguardando_complementacao', criadoEm:'2026-10-14T12:00:00-03:00', criadoPorNome:'Responsável', complementos:{}}));
  const publicUrl = 'https://sicard.example.invalid/sicard/public/analise-multicriterio/participar/rodada-de-teste/';
  const judgments = items.map((x, i) => ({...x, status:'ativa', matriz_id:'matriz-' + x.id, convites:[], criterios:[], n_criterios:0,
    modo_participacao:i === 0 || i === 2 ? 'publico' : 'convite', url_publica:i === 2 ? 'about:blank' : publicUrl}));
  const cases = [
    ['hierarquizacao/processos/','#hier-tbody','hier-filter','codigo','#hier-pagination','hier-filter-count','.hier-row-select'],
    ['analise-multicriterio/central-julgamentos','#ami-judgments','ami-filter','nome','#ami-judgments-pagination','ami-count','[data-select-id]'],
    ['analise-multicriterio/central-respostas','#ami-judgments','ami-filter','nome','#ami-judgments-pagination','ami-count','[data-analysis-round]'],
    ['demandas/','[data-demandas-body="projeto"]','filtro','1','#demandas-pagination','demandas-summary','.row-select'],
    ['complementacao/','[data-demandas-body="projeto"]','filtro','1','#demandas-pagination','demandas-summary','.row-select'],
    ['sei-documentos/','#sei-documentos-body','sei-filter','nome_arquivo','#sei-pagination','sei-summary','[data-sei-select]'],
    ['geoespacial/extracoes-atributos/','#ea-indice-tbody','ea-indice','nome','#ea-indice-pagination','ea-indice-contagem','input[type="checkbox"]'],
  ];
  try {
    const context = await browser.newContext({viewport:{width:1440,height:1000}});
    await context.route(publicUrl, route => route.fulfill({status:200, contentType:'text/html; charset=utf-8', body:'<title>Inscrição de teste</title>'}));
    const credenciais = fs.readFileSync('credencias_sigma_agentes.txt', 'utf8');
    const username = credenciais.match(/^[ \t]*([^\s:]+[._]gestor)[ \t]*$/mi)?.[1];
    const senha = credenciais.match(/^[ \t]*senha[ \t]*[:=][ \t]*([^\r\n]+)/mi)?.[1].trim();
    assert.ok(username && senha, 'Credencial local do gestor indisponível.');
    const login = await context.request.post(base + '/api/auth/login', {data:{username, senha, permanecer_conectado:false}});
    assert.equal(login.status(), 200);
    for (const [url,body,prefix,column,pager,summary,checkbox] of cases) {
      const p = await context.newPage(), errors=[];
      p.on('pageerror',e=>errors.push(e.message));
      await p.route('**/api/**', r => {
        const path = new URL(r.request().url()).pathname;
        if(path.startsWith('/api/auth/')) return r.continue();
        let json=[];
        if(path==='/api/demandas/internas'||path==='/api/complementacao/demandas/projeto') json=items;
        else if(path==='/api/ahp/hierarquizacoes') json=items.map(x=>({...x,status:'em_julgamento'}));
        else if(path==='/api/ahp/comparacao-colaborativa/ambientes') json=judgments;
        else if(path==='/api/agrupamentos-demandas') json=[{id:'g',nome:'Grupo',codigo:'G1',tipo_demanda:'projeto',quantidade_demandas:17}];
        else if(path==='/api/agrupamentos-demandas/g') json={id:'g',codigo:'G1',nome:'Grupo',tipo_demanda:'projeto',quantidade_demandas:17,objetos:items};
        else if(path==='/api/sei/documentos') json=items.map(x=>({...x,nome_arquivo:x.id+'.pdf',numero_processo:'123',usuario_nome:'Analista',criado_em:x.criadoEm,status:'recebido'}));
        else if(path==='/api/geoespacial/extracao-atributos/execucoes') json=items.map(x=>({id:x.id,nome_saida:x.nome,criado_em:x.criadoEm,entrada:'Entrada',operacao:'intersection',bases:2,resumo:{ocorrencias:3,percentual:25},minha:true,pacote_nome:'saida.zip',pacote_tamanho_bytes:1000}));
        else if(path.includes('/instituicoes')||path.includes('/pessoas')) json={data:[]};
        return r.fulfill({json});
      });
      await p.goto(base+'/restrict/'+url);
      await p.locator(body+' '+checkbox).first().waitFor();
      assert.equal(await p.locator(body+' tr').count(),15,url);
      if (url.endsWith('/central-julgamentos')) {
        const headers = p.locator('table:has(#ami-judgments) thead tr:not(.cg-linha-grupo) th');
        const names = await headers.allTextContents();
        assert.ok(!names.some(name => /^ID /i.test(name)));
        assert.equal(await p.locator('#ami-judgments .ami-cell-id').count(), 0);
        assert.equal(await p.locator('#ami-filter-coluna option:is([value=id], [value=matriz_id])').count(), 0);
        const cells = p.locator('#ami-judgments tr:first-child td');
        assert.equal(await cells.count(), names.length);
        const publicColumn = names.indexOf('Link público');
        assert.ok(publicColumn >= 0);
        const enrollmentLink = cells.nth(publicColumn).getByRole('link');
        assert.equal(await enrollmentLink.getAttribute('href'), publicUrl);
        for (const row of [1, 2]) {
          assert.equal(await p.locator('#ami-judgments tr').nth(row).locator('td').nth(publicColumn).textContent(), '—');
        }
        assert.deepEqual(await enrollmentLink.evaluate(link => {
          const style = getComputedStyle(link);
          return [style.color, style.textDecorationLine];
        }), ['rgb(18, 59, 86)', 'underline']);
        const popup = p.waitForEvent('popup');
        await enrollmentLink.click();
        const enrollmentPage = await popup;
        await enrollmentPage.waitForURL(publicUrl);
        assert.equal(await enrollmentPage.title(), 'Inscrição de teste');
        await enrollmentPage.close();
        const toggle = p.getByRole('button', {name:'Matriz e pesos', exact:true});
        const visibleBefore = await headers.evaluateAll(nodes => nodes.map(node => getComputedStyle(node).display !== 'none'));
        await toggle.click();
        const visibleAfter = await headers.evaluateAll(nodes => nodes.map(node => getComputedStyle(node).display !== 'none'));
        assert.deepEqual(names.filter((_name, i) => visibleBefore[i] && !visibleAfter[i]),
          ['Matriz de comparação pareada consolidada', 'Pesos consolidados']);
        assert.ok(visibleAfter[names.indexOf('Critérios')] && visibleAfter[publicColumn]);
        assert.equal(await p.locator('#ami-judgments tr:first-child [data-modal-kind="criteria"]').isVisible(), true);
        assert.equal(await p.locator('#ami-judgments tr:first-child [data-modal-kind="matrix"]').isVisible(), false);
        assert.equal(await p.locator('#ami-judgments tr:first-child [data-modal-kind="weights"]').isVisible(), false);
        await toggle.click();
        await p.locator('#ami-filter-coluna').selectOption('url_publica');
        await p.locator('#ami-filter-valor').selectOption(publicUrl);
        assert.equal(await p.locator('#ami-judgments tr').count(), 1);
        await p.locator('#ami-filter-limpar').click();
      }
      const selectAll = p.locator(body).locator('..').locator('thead input[type="checkbox"]').first();
      await selectAll.check();
      assert.match(await p.locator('#'+summary).textContent(),/^17 selecionados \/ 15 na página \/ 17 no total$/,url);
      await p.locator(pager+' button').last().click();
      assert.equal(await p.locator(body+' '+checkbox+':checked').count(),2,url);
      await p.locator(body+' '+checkbox).first().uncheck();
      assert.equal(await selectAll.evaluate(input=>input.indeterminate),true,url);
      await selectAll.check();
      await selectAll.uncheck();
      await p.locator(pager+' button').first().click();
      await p.locator(body+' '+checkbox).first().check();
      assert.match(await p.locator('#'+summary).textContent(),/^1 selecionados \/ 15 na página \/ 17 no total$/,url);
      await p.locator(pager+' button').last().click();
      assert.equal(await p.locator(body+' tr').count(),2,url);
      assert.match(await p.locator('#'+summary).textContent(),/^1 selecionados \/ 2 na página \/ 17 no total$/,url);
      await p.locator('#'+prefix+'-coluna').selectOption(column);
      const field = p.locator('#'+prefix+'-valor');
      async function primeiroValor() {
        if (await field.evaluate(el=>el.tagName==='INPUT')) {
          return field.fill(await p.locator('#filtro-valores option').first().getAttribute('value'));
        }
        return field.selectOption(await field.locator('option').nth(1).getAttribute('value'));
      }
      await primeiroValor();
      assert.equal(await p.locator(body+' tr').count(),1,url);
      await p.locator('#'+prefix+'-inverter').click();
      assert.equal(await p.locator(body+' tr').count(),15,url);
      await selectAll.check();
      assert.match(await p.locator('#'+summary).textContent(),/^16 selecionados \/ 15 na página \/ 17 no total$/,url);
      await p.locator(pager+' button').last().click();
      assert.equal(await p.locator(body+' tr').count(),1,url);
      assert.equal(await p.locator(body+' '+checkbox+':checked').count(),1,url);
      await p.locator('#'+prefix+'-limpar').click();
      assert.equal(await p.locator(body+' tr').count(),15,url);
      const table=p.locator(body).locator('..');
      const labels={'sei-filter':/^Arquivo$/,'ea-indice':/^Nome da saída$/,'ami-filter':/^Nome do julgamento$/,'hier-filter':/^Código da hierarquização$/,filtro:/^Código$/};
      const header=table.locator('thead th').filter({hasText:labels[prefix]}).first();
      const sortIndex=await header.evaluate(el=>el.cellIndex);
      await p.locator(body+' '+checkbox).nth(1).check();
      await header.click();
      assert.equal(await header.getAttribute('aria-sort'),'ascending',url);
      assert.match(await p.locator('#'+summary).textContent(),/^1 selecionados \/ 15 na página \/ 17 no total$/,url);
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
      assert.ok([null,'none'].includes(await selectAll.locator('..').getAttribute('aria-sort')),url+' coluna de seleção');
      const metrics = await p.locator(body+' tr').first().evaluate(tr=>({height:tr.getBoundingClientRect().height,expected:parseFloat(getComputedStyle(document.documentElement).fontSize)*1.7}));
      assert.ok(metrics.height>=metrics.expected-1,JSON.stringify({url,metrics}));
      const actions = p.locator('.standard-table-actions .admin-icon-btn:visible');
      assert.ok(await actions.count()>0,url);
      for(const size of await actions.evaluateAll(els=>els.map(e=>({width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height,radius:getComputedStyle(e).borderRadius,rem:parseFloat(getComputedStyle(document.documentElement).fontSize)})))) {
        assert.ok([2.115,2.35].some(d=>Math.abs(size.width-size.rem*d)<.1)&&Math.abs(size.width-size.height)<.1&&size.radius==='6px',JSON.stringify({url,size}));
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
      await primeiroValor();
      await p.locator('#'+prefix+'-inverter').click();
      assert.equal(await p.locator(body+' '+checkbox).count(),0,url);
      assert.match(await p.locator('#'+summary).textContent(),/^0 selecionados \/ 0 na página \/ 17 no total$/,url);
      assert.equal(await selectAll.isDisabled(),true,url);
      assert.equal(await p.locator(pager+' button').last().isDisabled(),true,url);
      await p.locator('#'+prefix+'-limpar').click();
      await p.setViewportSize({width:390,height:844});
      assert.equal(await p.locator('#'+prefix+'-limpar').isVisible(),true,url);
      await p.setViewportSize({width:1440,height:1000});
      assert.deepEqual(errors,[],url);
      if (process.env.SICARD_TEST_SCREENSHOTS === '1') await p.screenshot({path:'outputs/table-standard-'+prefix+(url.includes('julgamentos')?'-respostas':'')+'.png'});
      console.log(url+': filtros, inversao, paginas 15/2, selecao, contador e dimensoes OK');
      await p.close();
    }
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
