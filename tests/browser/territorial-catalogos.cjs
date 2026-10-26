// Contratos de UI com APIs interceptadas; nenhuma escrita no banco ou acervo.
const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{
  const browser=await chromium.launch({headless:true});
  try{
    const page=await browser.newPage(),errors=[],requests=[];
    let generated;
    page.on('pageerror',error=>errors.push(error.message));
    await page.route('**/api/**',async route=>{
      const request=route.request(),url=new URL(request.url()),path=url.pathname;
      const send=json=>route.fulfill({json});
      if(path.includes('/auth/'))return send({authenticated:true,id:'teste',nome:'Teste',username:'TESTE',tipo_usuario:'ADMIN'});
      if(path.endsWith('/categorias'))return send({categorias:[{id:'social',nome:'Social'}]});
      if(path.endsWith('/catalog')){
        const scale=url.searchParams.get('territorialidade');
        requests.push(scale);
        const sector=scale==='setores_2022',prefix=sector?'setorial':'municipal';
        return send({territorialidade:scale,featureCount:sector?103319:645,municipalities:645,
          territoryLabel:sector?'setores censitários':'municípios',keyField:sector?'CD_SETOR':'CD_MUN',
          attributes:['originais','combinados'].map((origin,index)=>({
            id:`${prefix}-${origin}`,origin,field:`${prefix}_${origin}`,source:index?'SICARD':'IBGE',
            year:2022,theme:'06_renda',label:`${prefix} ${origin}`,unit:'%',coverage:sector?100928:645,
            detail:JSON.stringify(index?{formula:'100 * a / b',homologado_hierarquizacao:false}:{}),
          }))});
      }
      if(path.endsWith('/preview')){
        const body=request.postDataJSON(),sector=body.territorialidade==='setores_2022';
        assert(body.attributes.every(id=>id.startsWith(sector?'setorial':'municipal')));
        return send({keyField:sector?'CD_SETOR':'CD_MUN',fields:['valor'],
          fixedFields:sector?['CD_SETOR','CD_MUN','NM_MUN','SIGLA_UF','AREA_KM2','PARTES']:['CD_MUN','NM_MUN','SIGLA_UF','AREA_KM2'],
          aliases:{CD_SETOR:'Código do setor (IBGE)',CD_MUN:'Código do município (IBGE)',NM_MUN:'Nome do município',
            SIGLA_UF:'Unidade da federação',AREA_KM2:'Área territorial (km²)',PARTES:'Partes do setor',valor:'Indicador selecionado'},
          rows:[{CD_SETOR:'350010505000001',CD_MUN:'3500105',NM_MUN:'Adamantina',valor:0}],
          glossario:[],totalAttributes:body.attributes.length});
      }
      if(path.endsWith('/jobs')){
        generated=request.postDataJSON();
        return send({id:'teste',status:'concluido'});
      }
      if(path.endsWith('/pacote'))return route.fulfill({body:'zip-teste',contentType:'application/zip',
        headers:{'X-Camada-Id':'teste','X-Camada-Arquivo':'setores.fgb'}});
      if(path.endsWith('/geojson'))return send({type:'FeatureCollection',features:[]});
      return send([]);
    });
    await page.goto('http://127.0.0.1:8083/restrict/geoespacial/gerador-camadas-territoriais/');
    const q=key=>page.locator(`[data-mlb="${key}"]`);
    await q('attributes').getByText('municipal originais',{exact:true}).waitFor();
    await q('attributes').locator('input').check();
    await q('origin').selectOption('combinados');
    await q('attributes').getByText('municipal combinados',{exact:true}).waitFor();
    await q('attributes').locator('input').check();
    assert.equal(await q('count').textContent(),'2');
    await q('preview').waitFor({state:'visible'});
    assert.deepEqual(await q('preview-head').locator('th').allTextContents(),
      ['Código do município (IBGE)','Nome do município','Unidade da federação','Área territorial (km²)','Indicador selecionado']);
    await page.selectOption('#territorial-scale','setores_2022');
    await q('attributes').getByText('setorial originais',{exact:true}).waitFor();
    assert.equal(await q('count').textContent(),'0');
    assert.match(await page.locator('.mlb-geometry strong').textContent(),/103\.319 setores/);
    await q('attributes').locator('input').check();
    await q('preview-body').getByText('350010505000001',{exact:true}).waitFor();
    assert.equal(await q('preview-head').locator('th').count(),7);
    assert.equal(await q('preview-body').locator('tr').first().locator('td').count(),7);
    await q('origin').selectOption('combinados');
    await q('attributes').getByText('setorial combinados',{exact:true}).waitFor();
    await q('attributes').locator('input').check();
    assert.equal(await q('count').textContent(),'2');
    await page.selectOption('#territorial-category','social');
    await page.evaluate(()=>{window.ProcessFeedback.confirmar=async()=>true;});
    await q('generate').click();
    await page.locator('#territorial-result').waitFor({state:'visible'});
    assert.equal(generated.territorialidade,'setores_2022');
    assert.deepEqual(new Set(generated.attributes),new Set(['setorial-originais','setorial-combinados']));
    assert.equal(await page.locator('#territorial-download').getAttribute('download'),'setores_sp_2022_fgb.zip');
    await page.selectOption('#territorial-scale','municipios');
    await q('attributes').getByText('municipal originais',{exact:true}).waitFor();
    assert.equal(await q('count').textContent(),'2');
    assert.equal(await page.locator('a[href="/restrict/geoespacial/documentacao-camadas-territoriais/"]').count(),1);
    // A pagina documental tambem valida sessao no servidor; a simulacao JS
    // de /auth nao cria cookie real nem deve contornar essa protecao.
    const documentation=await page.request.get('http://127.0.0.1:8083/restrict/geoespacial/documentacao-camadas-territoriais/');
    assert.equal(documentation.status(),401);
    assert.deepEqual(requests,['municipios','setores_2022','municipios']);
    assert.deepEqual(errors,[]);
    console.log('OK: escalas, originais/combinados, cestas separadas, prévia setorial e página de transparência.');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
