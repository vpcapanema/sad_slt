const {chromium} = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({channel: 'msedge', headless: true});
  try {
    const page = await browser.newPage();
    const errors = [];
    let releaseView, failView = false, views = 0;
    page.on('pageerror', error => errors.push(error.message));
    const fontes = [{id: 'entrada', nome: 'Demandas', papel: 'entrada', tipo: 'camada'},
      {id: 'base', nome: 'Área protegida', papel: 'restricao', tipo: 'camada'}];
    const geometria = {type: 'FeatureCollection', features: [{
      type: 'Feature', properties: {chave: '0'}, geometry: {type: 'Polygon',
        coordinates: [[[-47,-23],[-46.9,-23],[-46.9,-22.9],[-47,-23]]]}}]};
    await page.route('**/api/**', async route => {
      const path = new URL(route.request().url()).pathname;
      const send = data => route.fulfill({json: data});
      if (path.includes('/auth/')) return send({authenticated: true, id: 'teste', tipo_usuario: 'ADMIN'});
      if (path.endsWith('/storage/navegar')) return send({
        caminho: 'saidas-geoespaciais', pai: null, pastas: [],
        arquivos: [{id: 'saida', nome: 'resultado.gpkg', arquivo: 'saidas-geoespaciais/resultado.gpkg'}],
      });
      if (path.endsWith('/resultados/abrir')) return send({
        execucoes: ['execucao'], fontes, revisados: false, concluidas: 1, previstas: 1});
      if (path.endsWith('/resultados/visualizar')) {
        views++;
        assert.equal(route.request().postDataJSON().revisados, true);
        await new Promise(resolve => { releaseView = resolve; });
        if (failView) return route.fulfill({status: 503, json: {detail: 'Saída temporariamente indisponível'}});
        return send({fontes, concluidas: 1, previstas: 1, metodologia: 'Saída original conferida.',
          entradas: [{id: 'execucao', nome: 'Demandas', feicoes: 1, campos: [fontes[1]],
            linhas: [{chave: '0', id: 'D-1', nome: 'Demanda', area_total_m2: 100,
              areas: [null], sobreposicoes: [], area_uniao_risco_m2: 0}],
            geometrias: geometria, intersecoes: {type: 'FeatureCollection', features: []}}]});
      }
      return send([]);
    });
    await page.goto(`${process.env.SICARD_TEST_URL || 'http://127.0.0.1:8083'}/restrict/hierarquizacao/fase-1/`);
    await page.locator('#ev2-abrir').click();
    await page.locator('dialog .ea-storage-entry:not(.ea-storage-entry--folder)').dblclick();
    await page.locator('#ev2-aliases').waitFor();
    await page.locator('#ev2-revisados').check();

    async function confirmar() {
      releaseView = null;
      await page.locator('#ev2-mostrar').click();
      await page.locator('#pfsProgressOverlay.pfs-active').waitFor();
      assert.match(await page.locator('#pfsProgressBox').innerText(), /Conferir saída e salvar nomes/);
      assert.equal(await page.locator('#ev2-mostrar').isDisabled(), true);
      assert.equal(await page.locator('#ev2-conteudo').isVisible(), false);
      assert.equal(await page.locator('#pfsSuccessBox.pfs-active').count(), 0);
      for (let i = 0; !releaseView && i < 100; i++) await new Promise(resolve => setTimeout(resolve, 10));
      assert.ok(releaseView, 'Requisição de consulta iniciada');
      releaseView();
    }

    failView = true;
    await confirmar();
    await page.locator('#pfsErrorBox.pfs-active').waitFor();
    assert.match(await page.locator('#pfsErrorBox').innerText(), /Saída temporariamente indisponível/);
    assert.equal(await page.locator('#ev2-alias-0').inputValue(), 'Demandas');
    assert.equal(await page.locator('#ev2-mostrar').isEnabled(), true);
    await page.evaluate(() => { StatusFeedback.fechar(); Notify.clearAll(); });
    failView = false;
    await confirmar();
    await page.waitForFunction(() => document.querySelector('#pfsSuccessBox.pfs-active, #pfsErrorBox.pfs-active'));
    assert.equal(await page.locator('#pfsSuccessBox.pfs-active').count(), 1,
      await page.locator('#ev2-status').innerText());
    assert.equal(await page.locator('#ev2-aliases').isHidden(), true);
    assert.equal(await page.locator('#ev2-conteudo').isVisible(), true);
    assert.equal(views, 2);
    assert.deepEqual(errors, []);
    console.log('PASS: confirmação dos nomes com progresso, erro, repetição e apresentação dos resultados.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
