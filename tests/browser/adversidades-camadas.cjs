// CRUD administrativo interceptado: nenhum dado real é modificado.
const {chromium} = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({channel:'msedge', headless:true});
  try {
    const page = await browser.newPage({viewport:{width:1440, height:1000}});
    const errors = [], writes = [];
    const familias = [{
      codigo:'perigo_fisico_geotecnico',nome:'Perigos físicos e geotécnicos',
      conceito:'Condições físicas',ordem:10,
      tipos:[{codigo:'inundacao',nome:'Inundação',conceito:'Área inundável',ordem:10},
        {codigo:'movimento_massa',nome:'Movimento de massa',conceito:'Área suscetível',ordem:20}],
    }];
    let linha = {camada_codigo:'inundacao',tipo_codigo:'inundacao',ativo:true};
    page.on('pageerror', e => errors.push(e.message));
    await page.route('**/api/**', async route => {
      const req = route.request(), path = new URL(req.url()).pathname;
      const send = json => route.fulfill({json});
      if (path.includes('/auth/')) return send({id:'teste',nome:'Teste',tipo_usuario:'ADMIN'});
      if (path.endsWith('/esquemas')) return send({esquemas:[{
        esquema:'dominios',tabelas:[{nome:'camada_adversidade',dominio:true,registros:1}],
      }]});
      if (path.endsWith('/dominios/adversidades')) return send(familias);
      if (req.method() !== 'GET') {
        const body = req.postDataJSON();
        writes.push({method:req.method(),body});
        linha = {...linha,...body.valores};
        return send({ok:true,afetados:1,chave:{camada_codigo:linha.camada_codigo}});
      }
      return send({
        colunas:[
          {nome:'camada_codigo',pk:true,filtravel:true,editavel:true,tipo:'text',udt:'text'},
          {nome:'tipo_codigo',filtravel:true,editavel:true,tipo:'varchar',udt:'varchar'},
          {nome:'ativo',editavel:true,tipo:'boolean',udt:'bool'},
        ],chave_primaria:['camada_codigo'],linhas:[linha],total:1,total_tabela:1,paginas:1,dominio:true,
      });
    });
    const base = process.env.SICARD_TEST_URL || 'http://127.0.0.1:8083';
    await page.goto(`${base}/restrict/admin/?menu=__dominios__&esquema=dominios&tabela=camada_adversidade`);
    await page.locator('.admin-data-table').waitFor();
    assert.match(await page.locator('.admin-data-table').textContent(), /Perigos físicos e geotécnicos/);
    await page.locator('.admin-data-table tbody input[type=checkbox]').check();
    await page.getByRole('button',{name:'Editar selecionado',exact:true}).click();
    const seletor = page.locator('.admin-data-table select[data-col=tipo_codigo]');
    assert.equal(await seletor.inputValue(),'inundacao');
    await seletor.selectOption('movimento_massa');
    await page.getByRole('button',{name:'Salvar alterações',exact:true}).click();
    await page.locator('#pfsSuccessBox').waitFor({state:'visible'});
    assert.equal(writes[0].body.valores.tipo_codigo,'movimento_massa');
    assert.equal(writes[0].body.chave.camada_codigo,'inundacao');
    assert.ok(!('tipo_tratamento' in writes[0].body.valores));
    await page.locator('#pfsSuccessBox .pfs-close').click();
    await page.getByRole('button',{name:'Adicionar registro',exact:true}).click();
    assert.equal(await page.locator('.admin-modal select[data-col=tipo_codigo] option').count(),3);
    assert.match(await page.locator('.admin-modal select[data-col=tipo_codigo]').textContent(),
      /Perigos físicos e geotécnicos · Inundação/);
    await page.getByRole('button',{name:'Cancelar',exact:true}).click();
    assert.deepEqual(errors,[]);
    console.log('Adversidades das camadas: exibição, edição e cadastro validados.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode=1; });
