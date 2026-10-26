// APIs interceptadas: valida layout e estados sem gravar no banco ou no Storage.
const {chromium} = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({headless:true});
  try {
    const page = await browser.newPage({viewport:{width:1440,height:1000}});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const hierarchy = '12345678-1234-1234-1234-123456789012';
    const surface = {
      id:'12345678-1234-1234-1234-123456789013', hierarquizacao_id:hierarchy,
      nome:'Superfície de teste', territorialidade:'municipios', calculo:null,
      criterios:[{id:'c001',atributo_id:'a',variavel:'População residente',criterio:'População residente',
        premissa:'Quanto maior a população, maior a favorabilidade territorial.',
        dimensao:'Social',relacao:'positiva',campo_original:'pop',campo_reescalonado:'pop_r'},
      {id:'c002',atributo_id:'b',variavel:'Renda média',criterio:'Renda média',
        premissa:'Quanto maior a renda, menor a favorabilidade territorial.',
        dimensao:'Social',relacao:'negativa',campo_original:'renda',campo_reescalonado:'renda_r'}],
    };
    const attributes = ['População residente','Renda média'].map((label,i)=>({
      id:i?'b':'a',label,origin:'originais',source:'IBGE',year:2022,theme:'Social',unit:'Pessoas',
    }));
    const geojson = {type:'FeatureCollection',features:[{type:'Feature',
      properties:{pop:0,pop_r:0,renda:10,renda_r:1,indice_favorabilidade:.5},
      geometry:{type:'Polygon',coordinates:[[[-47,-23],[-46,-23],[-46,-22],[-47,-23]]]}}]};
    await page.route('**/api/**', route => {
      const path = new URL(route.request().url()).pathname;
      if (path.includes('/auth/')) return route.fulfill({json:{authenticated:true,nome:'Teste',tipo_usuario:'ADMIN'}});
      if (path.endsWith('/hierarquizacoes/portfolio')) return route.fulfill({json:[{id:hierarchy,codigo:'H1',nome:'Teste'}]});
      if (path.endsWith('/catalogo')) return route.fulfill({json:{attributes,dimensoes:['Social','Econômica']}});
      if (path.endsWith('/ambientes')) return route.fulfill({json:[
        {id:'julgamento-salvo',superficie_id:surface.id,status:'consolidada'},
        {id:'julgamento-de-outra-superficie',superficie_id:'outra',status:'consolidada'},
      ]});
      if (path.endsWith('/mapa')) return route.fulfill({json:geojson});
      if (path.endsWith('/calcular')) {
        surface.calculo = {operador:'media_simples',sem_indice:0,pesos:{c001:.5,c002:.5}};
        return route.fulfill({json:surface});
      }
      if (path.endsWith('/superficies-criterios')) {
        return route.fulfill({json:route.request().method()==='POST' ? surface : [surface]});
      }
      if (path.endsWith(surface.id)) return route.fulfill({json:surface});
      return route.fulfill({json:[]});
    });
    await page.goto('http://127.0.0.1:8083/restrict/geoespacial/gerador-superficies-favorabilidade/');
    await page.waitForFunction(()=>document.querySelector('#sc-variable').options.length===2 &&
      !document.querySelector('#sc-app').hasAttribute('aria-busy'));
    assert(await page.locator('#sc-load').isDisabled());
    assert(await page.locator('#sc-save').isDisabled());
    await page.selectOption('#sc-hier',hierarchy);
    await page.waitForFunction(()=>!document.querySelector('#sc-app').hasAttribute('aria-busy'));
    const sizes = await page.locator('#sc-app section').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().height));
    assert(sizes.every(h=>h<850),JSON.stringify(sizes));
    const labels = await page.locator('#sc-app section').first().locator('label').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().height));
    assert(labels.every(h=>h<100),JSON.stringify(labels));
    await page.selectOption('#sc-variable','a');
    await page.click('#sc-add');
    assert.equal(await page.locator('#sc-criteria tr').count(),1);
    await page.selectOption('[data-field="dimensao"]','Social');
    await page.selectOption('[data-field="relacao"]','positiva');
    await page.selectOption('#sc-saved',surface.id);
    await page.click('#sc-load');
    await page.waitForFunction(()=>document.querySelectorAll('.sc-criterion').length===2 &&
      !document.querySelector('#sc-app').hasAttribute('aria-busy'));
    await page.selectOption('#sc-operator','ahp');
    await page.selectOption('#sc-have','nao');
    await page.selectOption('#sc-mode','colaborativo');
    await page.waitForFunction(()=>document.querySelector('#sc-judgment').options.length===2 &&
      !document.querySelector('#sc-app').hasAttribute('aria-busy'));
    await page.selectOption('#sc-judgment','julgamento-salvo');
    assert(await page.locator('#sc-calculate').isEnabled());
    assert(page.url().includes('/gerador-superficies-favorabilidade/'));
    assert(await page.locator('#sc-save').isDisabled());
    assert(await page.locator('#sc-add').isDisabled());
    assert(await page.locator('[data-remove]').first().isDisabled());
    await page.selectOption('#sc-operator','ahp');
    await page.selectOption('#sc-have','sim');
    await page.locator('[data-weight="c001"]').fill('.4');
    await page.locator('[data-weight="c002"]').fill('.6');
    await page.selectOption('#sc-operator','media_simples');
    await page.selectOption('#sc-operator','ahp');
    assert.equal(await page.locator('[data-weight="c001"]').inputValue(),'.4');
    await page.selectOption('#sc-have','nao');
    await page.selectOption('#sc-mode','individual');
    await page.selectOption('[data-pair="0,1"]','2');
    assert.match(await page.locator('#sc-inverse-1-0').textContent(),/0,5/);
    await page.selectOption('#sc-operator','media_simples');
    await page.click('#sc-calculate');
    await page.waitForFunction(()=>!document.querySelector('#sc-app').hasAttribute('aria-busy'));
    await page.click('#sc-calculate');
    await page.waitForFunction(()=>!document.querySelector('#sc-app').hasAttribute('aria-busy'));
    assert(await page.locator('#sc-index-download').isVisible());
    for (const width of [1440,1024,390]) {
      await page.setViewportSize({width,height:900});
      const layout = await page.evaluate(()=>({
        columns:getComputedStyle(document.querySelector('#sc-viewer')).gridTemplateColumns.split(' ').length,
        overflow:document.querySelector('main').getBoundingClientRect().right>innerWidth,
        controls:[...document.querySelectorAll('#sc-app select,#sc-app input')].filter(n=>n.offsetParent)
          .every(n=>n.getBoundingClientRect().width<=n.parentElement.getBoundingClientRect().width+2),
      }));
      assert.equal(layout.columns,width>1100?3:width>700?2:1);
      assert.equal(layout.overflow,false);
      assert.equal(layout.controls,true);
    }
    assert.deepEqual(errors,[]);
    console.log('OK: layout 1440/1024/390, controles, camada carregada, pesos preservados, matriz e recálculo sem erro Leaflet.');
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
