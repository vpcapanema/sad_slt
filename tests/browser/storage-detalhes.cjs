const assert = require('node:assert/strict');
const {spawn} = require('node:child_process');
const {chromium} = require('playwright');

(async () => {
  const server = spawn('.venv\\Scripts\\python.exe', ['tests\\browser\\storage-detalhes-server.py'], {stdio:['ignore','pipe','inherit']});
  let browser;
  try {
    const port = await new Promise((resolve,reject) => {
      server.stdout.once('data', data => resolve(Number(String(data).trim())));
      server.once('error',reject);
      server.once('exit',code => reject(new Error(`Fixture exit ${code}`)));
    });
    browser = await chromium.launch({headless:true});
    const page = await browser.newPage({viewport:{width:1600,height:1000}});
    const errors = [];
    page.on('pageerror',error=>errors.push(error.message));
    let posts=0,polls=0,fail=false;
    const root='saidas-geoespaciais';
    const files=Array.from({length:30},(_,i)=>({id:`storage:${root}/${i}.gpkg`,nome:String(i),arquivo:`${root}/${i}.gpkg`,inventariar:true,tamanho_bytes:i?1234:null,modificado_em:1730000001}));
    const longo='000_'+ 'Valor completo <seguro> & caracteres çã — '.repeat(20);
    files[0]={...files[0],nome:longo,arquivo:`${root}/${longo}.gpkg`};
    await page.route('**/api/geoespacial/storage/**',async route=>{
      const url=new URL(route.request().url());
      let data;
      if(url.pathname.endsWith('/navegar'))data={caminho:url.searchParams.get('caminho'),pai:root,pastas:url.searchParams.get('caminho')===root?[{nome:'Análises',caminho:`${root}/analises`,modificado_em:1730000001},{nome:'Vazia',caminho:`${root}/vazia`,modificado_em:null}]:[],arquivos:files};
      else if(url.pathname.endsWith('/detalhes')){
        posts++;data={id:'fixture',status:'pendente'};
      }else if(url.pathname.includes('/detalhes/')){
        polls++;data=fail?{status:'erro',erro:'Não foi possível consultar o tamanho total das pastas.'}:{status:'concluido',resultado:{[root]:1000020,[`${root}/analises`]:1000020,[`${root}/vazia`]:0}};
      }else if(url.pathname.endsWith('/pastas'))data={caminho:url.searchParams.get('caminho')||'base-geoespacial',pastas:[{nome:longo,caminho:'base-geoespacial/'+longo}],arquivos:[longo+'.gpkg']};
      else data={pastas:[]};
      await route.fulfill({json:data});
    });
    await page.goto(`http://127.0.0.1:${port}`);
    await page.waitForFunction(()=>typeof window.abrir==='function');
    const computed = async selector=>page.locator(selector).first().evaluate(el=>{
      const c=getComputedStyle(el);return {font:c.font,padding:c.padding,height:c.height,bg:c.backgroundColor,border:c.border,borderRadius:c.borderRadius};
    });
    const referencia=await computed('.ami-filtered-table table th');
    async function conferirAside({stacked=false}={}){
      const sizes=await page.locator('.ea-storage-body').evaluate(body=>{
        const aside=body.querySelector('aside'),pane=body.querySelector('.ea-storage-pane');
        const tree=aside.querySelector('.ea-storage-tree');
        const rect=el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,right:r.right};};
        return {body:rect(body),aside:rect(aside),pane:rect(pane),
          rows:[...tree.children].map(rect),paneMin:getComputedStyle(pane).minWidth,
          labels:[...tree.querySelectorAll('button')].map(el=>({client:el.clientWidth,scroll:el.scrollWidth,whiteSpace:getComputedStyle(el).whiteSpace}))};
      });
      assert.equal(sizes.paneMin,'0px');
      assert.ok(sizes.labels.every(label=>label.scroll<=label.client+1&&label.whiteSpace==='nowrap'));
      assert.ok(sizes.aside.right<=sizes.body.right+1);
      assert.ok(sizes.pane.right<=sizes.body.right+1);
      if(!stacked){
        assert.ok(sizes.aside.width< sizes.body.width*.32,'Intrinsic aside releases the former 32% allocation');
        assert.ok(sizes.rows.every(row=>row.right<=sizes.aside.right),'Ordinary tree labels are fully visible');
        assert.ok(sizes.pane.width>sizes.body.width*.68);
      }
      console.log('Computed explorer widths',sizes.body.width,sizes.aside.width,sizes.pane.width);
    }
    console.log('Referência/template real',referencia);
    assert.deepEqual(await page.evaluate(async()=>{
      const {tamanhoLegivel,modificacaoLegivel}=await import('/geoespacial/extracao-atributos/storage-metadados.js');
      return [tamanhoLegivel(null),tamanhoLegivel(0),tamanhoLegivel(1234),
        modificacaoLegivel(null),modificacaoLegivel('inválida'),modificacaoLegivel('2026-11-04T05:09:12Z')];
    }),['Indisponível','0 B','1,2 kB','Indisponível','Indisponível','04/11/2026 02:09:12']);
    const start=Date.now();
    await page.evaluate(()=>{void window.abrir({detalhesAnalise:true});});
    await page.waitForSelector('.ea-storage-analysis-details tbody tr');
    console.log('Primeira renderização fixture ms',Date.now()-start);
    assert.equal(await page.locator('.ea-storage-list').getAttribute('data-mode'),'details');
    await conferirAside();
    const sidebarLabel=page.locator('.ea-storage-tree-open').first();
    const originalLabel=await sidebarLabel.evaluate(el=>el.lastChild.textContent);
    const initialAside=await page.locator('.ea-storage-body aside').evaluate(el=>el.clientWidth);
    await sidebarLabel.evaluate(el=>{el.lastChild.textContent+=' — pasta com nome mais descritivo';});
    assert.ok(await page.locator('.ea-storage-body aside').evaluate(el=>el.clientWidth)>initialAside);
    await sidebarLabel.evaluate(el=>{el.lastChild.textContent='Pasta extremamente longa '.repeat(50);});
    async function conferirArvoreLonga(){
      const metrics=await page.locator('.ea-storage-body').evaluate(body=>{
        const aside=body.querySelector('aside'),pane=body.querySelector('.ea-storage-pane');
        return {body:body.clientWidth,aside:aside.getBoundingClientRect().width,
          scroll:aside.scrollWidth,client:aside.clientWidth,pane:pane.getBoundingClientRect().width,
          dialog:body.closest('.ea-storage-dialog').getBoundingClientRect().width,viewport:innerWidth};
      });
      assert.ok(metrics.scroll>metrics.client,'Long labels remain accessible by horizontal scrolling');
      assert.ok(metrics.aside<=metrics.body*.45+1,'Long labels cannot take over the files panel');
      assert.ok(metrics.pane>=metrics.body*.55-1);
      assert.ok(metrics.dialog<=metrics.viewport);
    }
    await conferirArvoreLonga();
    await page.setViewportSize({width:800,height:900});
    await conferirArvoreLonga();
    await page.setViewportSize({width:390,height:800});
    await conferirAside({stacked:true});
    await sidebarLabel.evaluate((el,text)=>{el.lastChild.textContent=text;},originalLabel);
    await page.setViewportSize({width:1600,height:1000});
    assert.equal(await page.locator('.ea-storage-analysis-details th').count(),6);
    async function conferirTabela(){
      assert.deepEqual((await page.locator('.ea-storage-analysis-details th').allTextContents()).map(s=>s.replace(/^[↑↓]/,'')),
        ['','Nome','Tipo','Tamanho','Última modificação','Caminho']);
      assert.deepEqual(await page.locator('.ea-storage-analysis-details tbody tr').first().locator('td').evaluateAll(cells=>cells.map(el=>getComputedStyle(el).textAlign)),
        ['center','left','center','center','center','left']);
      assert.equal(await page.locator('.ea-storage-details-footer,.ea-storage-dialog .admin-pagination,.ea-storage-dialog .admin-table-summary').count(),0);
      assert.equal(await page.locator('.ea-storage-pane > .ea-storage-pane-toolbar').count(),0);
      assert.equal(await page.locator('.ea-storage-analysis-details .admin-filter-bar > .ea-storage-pane-toolbar').count(),1);
      assert.equal(await page.locator('.ea-storage-dialog .ea-storage-pane-toolbar').count(),1);
    }
    await conferirTabela();
    assert.equal(await page.locator('.ea-storage-analysis-details tbody tr').count(),32);
    assert.equal(await page.locator('.ea-storage-analysis-details th').filter({hasText:'Extensão'}).count(),0);
    assert.match(await page.locator('.ea-storage-analysis-details').innerText(),/Carregando…/);
    assert.match(await page.locator('.ea-storage-analysis-details').innerText(),/27\/10\/2024 00:33:21/);
    assert.match(await page.locator('.ea-storage-analysis-details').innerText(),/Indisponível/);
    await page.waitForFunction(()=>document.querySelector('.ea-storage-entry-size')?.textContent==='1 MB');
    assert.equal(posts,1);assert.equal(polls,1);
    assert.match(await page.locator('.ea-storage-analysis-details').innerText(),/0 B/);
    assert.match(await page.locator('.ea-storage-analysis-details').innerText(),/Pasta/);
    console.log('Tabela modal',await computed('.ea-storage-analysis-details th'));
    const modal=await computed('.ea-storage-analysis-details th');
    assert.equal(modal.font,referencia.font);assert.equal(modal.padding,referencia.padding);assert.equal(modal.bg,referencia.bg);
    async function conferirLayout(selector){
      assert.ok(await page.locator(selector).first().evaluate(el=>{
        const c=getComputedStyle(el);return c.whiteSpace==='nowrap'&&c.overflow==='hidden'&&c.textOverflow==='ellipsis';
      }));
    }
    async function conferirBordas(selector){
      const header=selector.includes(' th')||selector.includes('details-head');
      for(const cell of await page.locator(selector).evaluateAll(es=>es.map(el=>{
        const c=getComputedStyle(el);return {r:c.borderRightColor,l:c.borderLeftColor,rw:parseFloat(c.borderRightWidth),lw:parseFloat(c.borderLeftWidth)};
      }))){
        assert.equal(cell.r,header?'rgb(255, 255, 255)':'rgb(55, 65, 81)');assert.equal(cell.rw,1);
        assert.equal(cell.lw,0);
      }
    }
    async function conferirToast(selector,full){
      const target=page.locator(selector).filter({hasText:full}).first();
      await target.hover();
      assert.ok(await target.evaluate(el=>el.scrollWidth>el.clientWidth));
      await page.waitForFunction(value=>[...document.querySelectorAll('.notification-message')].some(el=>el.textContent===value),full);
      await target.locator('xpath=ancestor-or-self::button[1]').focus().catch(()=>target.focus());
      assert.ok(await page.locator('.notification-message').filter({hasText:full}).count());
    }
    // Assinatura completa da toast: o Notify oficial, o mesmo título e a mesma regra de posição para todo alvo.
    const assinaturaToast=(target,full)=>target.evaluate((e,value)=>{
      const message=[...document.querySelectorAll('.notification-toast:not(.removing) .notification-message')].find(m=>m.textContent===value);
      const toast=message.closest('.notification-toast'),title=toast.querySelector('.notification-title');
      const pick=(el,props)=>{const c=getComputedStyle(el);return Object.fromEntries(props.map(p=>[p,c[p]]));};
      const r=e.getBoundingClientRect(),t=getComputedStyle(toast);
      const left=Math.max(16,Math.min(innerWidth-416,r.right+8)),top=Math.max(16,Math.min(innerHeight*.4,r.bottom+8));
      return {kind:['info','warning','error','success'].filter(k=>toast.classList.contains(k)),title:title.textContent,
        container:toast.parentElement===(e.closest('dialog')||document.body),
        toast:pick(toast,['backgroundColor','color','borderTopWidth','borderTopColor','borderTopLeftRadius','fontFamily','fontSize','fontWeight','paddingTop','paddingRight','paddingBottom','paddingLeft','boxShadow','width','maxWidth','maxHeight','overflowY','position','zIndex','pointerEvents']),
        message:pick(message,['font','color','whiteSpace','overflowWrap']),titleStyle:pick(title,['font','color']),
        placement:{left:Math.abs(parseFloat(t.left)-left)<1,top:Math.abs(parseFloat(t.top)-top)<1}};
    },full);
    let toastReferencia;
    async function conferirPadraoToast(target,rotulo){
      const full=await target.textContent(),original=await target.getAttribute('style');
      await target.evaluate(e=>{Object.assign(e.style,{display:'block',minWidth:'0',width:'10px',maxWidth:'10px',overflow:'hidden',whiteSpace:'nowrap'});});
      assert.ok(await target.evaluate(e=>e.scrollWidth>e.clientWidth),`Truncated ${rotulo}: ${full}`);
      assert.equal(await target.getAttribute('title'),null,`${rotulo}: tooltip nativo concorrente`);
      const interactions=(await target.evaluate(e=>e.tabIndex>=0))?['focus','hover']:['hover'];
      for(const interaction of interactions){
        await target.evaluate(e=>e.blur());
        await page.mouse.move(0,0);
        await target[interaction]();
        await page.waitForFunction(value=>[...document.querySelectorAll('.notification-toast:not(.removing) .notification-message')].some(e=>e.textContent===value),full);
        const assinatura=await assinaturaToast(target,full);
        assert.equal(assinatura.title,'Valor completo',`${rotulo} ${interaction}`);
        assert.ok(assinatura.container&&assinatura.placement.left&&assinatura.placement.top,`${rotulo} ${interaction}: ${JSON.stringify(assinatura)}`);
        toastReferencia??=assinatura;
        assert.deepEqual(assinatura,toastReferencia,`${rotulo} ${interaction}: toast difere da coluna Nome`);
      }
      await target.evaluate((e,style)=>{e.blur();if(style===null)e.removeAttribute('style');else e.setAttribute('style',style);},original);
    }
    async function conferirToastsDe(seletor,rotulo,limite=2){
      const alvos=page.locator(seletor);
      const total=Math.min(await alvos.count(),limite);
      assert.ok(total>0,`${rotulo}: nenhum alvo ${seletor}`);
      for(let i=0;i<total;i++)await conferirPadraoToast(alvos.nth(i),`${rotulo}[${i}]`);
    }
    await conferirLayout('.ea-storage-analysis-details .ea-storage-entry-name');
    await conferirBordas('.ea-storage-analysis-details td');
    await conferirToast('.ea-storage-entry-name',longo+'.gpkg');
    // Linha distinta da usada em conferirToast: o hover repetido no mesmo alvo preservaria a toast anterior.
    const valueRow=page.locator('.ea-storage-analysis-details tbody tr').nth(3);
    await conferirPadraoToast(valueRow.locator('.ea-storage-entry-name'),'Nome');
    const values=valueRow.locator('.explorer-cell-value');
    for(const column of [0,1,2,3])await conferirPadraoToast(values.nth(column),`coluna ${column+2}`);
    for(const header of ['Nome','Tipo','Tamanho','Última modificação','Caminho'])
      await conferirPadraoToast(page.locator('.ea-storage-analysis-details th').filter({hasText:header}),`cabeçalho ${header}`);
    console.log('Filtro modal',await computed('.ea-storage-analysis-details .admin-filter-bar'));
    console.log('Controles modal',await computed('.ea-storage-analysis-details .standard-table-actions > button'));
    await page.locator('.ea-storage-analysis-details tbody input:not(:disabled)').first().check();
    assert.equal(await page.locator('.ea-storage-analysis-details tbody input:checked').count(),1);
    await page.locator('.ea-storage-analysis-details tbody tr').last().scrollIntoViewIfNeeded();
    assert.equal(await page.locator('.ea-storage-analysis-details tbody tr').count(),32);
    await page.locator('.ea-storage-analysis-details tbody tr').last().locator('input').check();
    assert.equal(await page.locator('.ea-storage-analysis-details tbody input:checked').count(),1);
    assert.ok(await page.locator('.ea-storage-analysis-details tbody tr').last().locator('input').isChecked());
    await page.locator('.ea-storage-analysis-details tbody tr').last().locator('input').uncheck();
    await page.getByRole('searchbox',{name:'Filtrar pastas e camadas por nome'}).fill('Vazia');
    assert.equal(await page.locator('.ea-storage-analysis-details tbody tr').count(),1);
    await page.getByRole('button',{name:'Limpar filtro',exact:true}).click();
    await page.getByRole('columnheader',{name:'Tamanho',exact:true}).click();
    await page.getByRole('button',{name:'Modo de visualização: Detalhes',exact:true}).click();
    await page.getByRole('menuitemradio',{name:'Lista',exact:true}).click();
    assert.equal(await page.locator('.ea-storage-list').getAttribute('data-mode'),'list');
    await conferirLayout('.ea-storage-entry-name');
    await conferirToastsDe('.ea-storage-entry small','Tipo (lista)',1);
    await page.getByRole('button',{name:'Modo de visualização: Lista',exact:true}).click();
    await page.getByRole('menuitemradio',{name:'Ícones grandes',exact:true}).click();
    await conferirLayout('.ea-storage-entry-name');
    await conferirToast('.ea-storage-entry-name',longo+'.gpkg');
    await conferirToastsDe('.ea-storage-entry small','Tipo (ícones)',1);
    await page.getByRole('button',{name:'Fechar',exact:true}).last().click();
    for(const saida of [undefined,{nome:'resultado',formato:'gpkg',formatos:['gpkg']}]){
      await page.evaluate(options=>{void window.StoragePastas.escolher({inicial:'base-geoespacial/pasta',saida:options});},saida);
      await page.waitForSelector('.storage-pastas-item[data-caminho] > span');
      await conferirLayout('.storage-pastas-item[data-caminho] > span');
      await conferirBordas('.storage-pastas-item[data-caminho] > span');
      await conferirToast('.storage-pastas-item[data-caminho] > span',longo);
      await conferirToastsDe('.storage-pastas-item[data-caminho] > span','pastas',1);
      await conferirToastsDe('.storage-pastas-trilha button','trilha',1);
      if(saida)await conferirToastsDe('.storage-pastas-destino strong','destino',1);
      await page.locator('.storage-pastas-item[data-caminho]').click();
      assert.equal(await page.locator('.storage-pastas-item.selecionada').count(),1);
      await page.locator('.storage-pastas-fechar').click();
    }
    await page.evaluate(()=>{void window.abrir({});});
    await page.waitForSelector('.ea-storage-entry');
    await conferirAside();
    assert.equal(await page.locator('.ea-storage-list').getAttribute('data-mode'),'list');
    assert.equal(posts,1);
    await page.getByRole('button',{name:'Modo de visualização: Lista',exact:true}).click();
    await page.getByRole('menuitemradio',{name:'Detalhes',exact:true}).click();
    assert.equal(await page.locator('.ea-storage-details-head > span').count(),3);
    assert.equal(await page.locator('.ea-storage-details-head > span').last().innerText(),'Caminho');
    assert.equal(await page.locator('.ea-storage-entry small').first().evaluate(el=>getComputedStyle(el).textAlign),'center');
    assert.equal(await page.locator('.ea-storage-toolbar > .ea-storage-pane-toolbar').count(),1);
    await conferirLayout('.ea-storage-details-head > span');
    await conferirBordas('.ea-storage-details-head > span');
    await conferirLayout('.ea-storage-entry-path');
    await conferirToast('.ea-storage-entry-name',longo+'.gpkg');
    await conferirToastsDe('.ea-storage-details-head > span','cabeçalhos Detalhes',3);
    await conferirToastsDe('.ea-storage-entry-path','Caminho Detalhes',1);
    await conferirToastsDe('.ea-storage-entry small','Tipo Detalhes',1);
    await page.getByRole('button',{name:'Fechar',exact:true}).last().click();
    fail=true;
    await page.evaluate(()=>{void window.abrir({detalhesAnalise:true});});
    await page.waitForFunction(()=>document.querySelector('.ea-storage-entry-size')?.textContent==='Indisponível');
    assert.equal(posts,2);
    fail=false;
    await page.getByRole('button',{name:'Consultar tamanhos novamente',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('.ea-storage-entry-size')?.textContent==='1 MB');
    assert.equal(posts,3);
    await page.getByRole('button',{name:'Fechar',exact:true}).last().click();
    await page.evaluate(()=>{void window.abrir({title:'Selecionar análise de favorabilidade já realizada',detalhesAnalise:true,multiple:true});});
    await page.waitForSelector('.ea-storage-analysis-details tbody tr');
    assert.equal(await page.locator('.ea-storage-list').getAttribute('data-mode'),'details');
    await conferirAside();
    await page.locator('.ea-storage-analysis-details thead input').check();
    await conferirTabela();
    assert.equal(await page.locator('.ea-storage-analysis-details tbody input:checked').count(),30);
    await page.locator('.ea-storage-entry--folder').first().click();
    await page.waitForFunction(()=>document.querySelector('.ea-storage-path')?.textContent.includes('analises'));
    assert.equal(await page.locator('.ea-storage-analysis-details tbody input:checked').count(),30);
    assert.deepEqual(errors,[]);
    await page.setViewportSize({width:600,height:800});
    await conferirAside({stacked:true});
    assert.equal(await page.locator('.ea-storage-analysis-details th').count(),6);
    const rects=await page.locator('.ea-storage-analysis-details th').evaluateAll(elements=>elements.map(el=>el.getBoundingClientRect().y));
    assert.ok(rects.every(y=>y===rects[0]));
    await page.getByRole('button',{name:'Fechar',exact:true}).last().click();
    await page.evaluate(()=>{const host=document.createElement('div');host.id='inline-fixture';document.body.append(host);void window.abrir({host});});
    await page.waitForSelector('.ea-storage-inline .ea-storage-entry');
    await conferirAside({stacked:true});
    await conferirLayout('.ea-storage-inline .ea-storage-entry-name');
    await page.getByRole('button',{name:'Modo de visualização: Lista',exact:true}).click();
    await page.getByRole('menuitemradio',{name:'Detalhes',exact:true}).click();
    await conferirLayout('.ea-storage-inline .ea-storage-details-head > span');
    await page.getByRole('button',{name:'Fechar',exact:true}).last().click();
    await page.route('**/api/geoespacial/explorador/**',async route=>{
      const url=new URL(route.request().url());
      const data=url.pathname.endsWith('/navegar')?{itens:Array.from({length:30},(_,i)=>({id:'fixture-geo-'+i,fonte:'storage',nome:longo,nome_arquivo:longo+'.gpkg',arquivo:'pasta/'+longo+'.gpkg',extensao:'gpkg',pasta:false,tamanho_bytes:1234,modificado_em:1730000001})),folha:false}:{nome:longo,arquivo:'pasta/'+longo+'.gpkg'};
      await route.fulfill({json:data});
    });
    await page.goto(`http://127.0.0.1:${port}/explorer?fonte=storage&caminho=pasta`);
    await page.waitForSelector('.geo-explorer-table td');
    assert.equal(await page.locator('.geo-explorer-table th').last().innerText(),'Caminho');
    assert.equal(await page.locator('.geo-explorer-table tbody tr').count(),30);
    assert.equal(await page.locator('#explorer-pagination,#explorer-summary,#explorer-page-size').count(),0);
    assert.equal(await page.locator('#explorer-filters #explorer-controls').count(),1);
    assert.equal(await page.locator('#explorer-controls [data-control]').count(),4);
    assert.deepEqual(await page.locator('.geo-explorer-table tbody tr').first().locator('td').evaluateAll(cells=>cells.map(el=>getComputedStyle(el).textAlign)),
      ['center','center','left','center','center','center','left']);
    await conferirLayout('.geo-explorer-table th');
    await conferirBordas('.geo-explorer-table th');
    for(const width of [1600,390]){
      await page.setViewportSize({width,height:900});
      await page.locator('.geo-explorer-table [data-sort]').first().click();
      await conferirBordas('.geo-explorer-table th');
      assert.equal(await page.locator('.geo-explorer-table .explorer-sort-direction').evaluate(el=>getComputedStyle(el).color),'rgb(255, 255, 255)');
    }
    await conferirLayout('.geo-explorer-primary > span');
    await conferirToast('.geo-explorer-primary > span',longo+'.gpkg');
    await page.setViewportSize({width:1600,height:1000});
    await conferirToastsDe('.geo-explorer-table th[data-field]','cabeçalhos Explorador',7);
    await conferirToastsDe('.geo-explorer-table tbody tr:first-child td .explorer-cell-value','colunas Explorador',6);
    const geoHeaders=await page.locator('.geo-explorer-table th').evaluateAll(elements=>elements.map(el=>el.getBoundingClientRect().y));
    assert.ok(geoHeaders.every(y=>y===geoHeaders[0]));
    await page.locator('.geo-explorer-table tbody input').first().check();
    assert.equal(await page.locator('.geo-explorer-table tbody input:checked').count(),1);
    await page.locator('.geo-explorer-actions [data-action=details]').first().click();
    await page.waitForSelector('#explorer-details dd');
    await conferirLayout('#explorer-details dd');
    await conferirToast('#explorer-details dd',longo);
    await page.locator('#explorer-details form button').click();
    for(const view of ['list','icons']){
      await page.locator(`#explorer-toolbar [data-view=${view}]`).click();
      await conferirLayout('.geo-explorer-primary > span');
      await conferirToast('.geo-explorer-primary > span',longo+'.gpkg');
    }
    assert.deepEqual(errors,[]);
    console.log('Browser regressions passed; mock listings/posts/polls:',posts,polls);
  } finally {
    if(browser)await browser.close();
    server.kill();
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
