const {chromium} = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({channel: 'msedge', headless: true});
  try {
    for (const prefix of ['', '/sicard']) {
    const page = await browser.newPage();
    const errors = [], requests = [];
    const meta = {token: 'fixture-token', escopo: 'Teste', objetivo: 'Comparar critérios',
      criterios: [], valido_ate: '2035-12-31', status: 'ativa', email_autorizado: false};
    page.on('pageerror', error => errors.push(error.message));
    await page.route('http://127.0.0.1:8083/**', async route => {
      const request = route.request(), url = new URL(request.url()), path = url.pathname;
      if (!path.startsWith(prefix + '/api/')) {
        if (prefix && path.startsWith(prefix + '/')) {
          url.pathname = path.slice(prefix.length);
          const response = await route.fetch({url: url.href,
            headers: {...request.headers(), 'x-forwarded-prefix': prefix}});
          return route.fulfill({response});
        }
        return route.continue();
      }
      if (!path.includes('/publico/')) return route.fulfill({json: []});
      const expected = prefix + '/api/ahp/comparacao-colaborativa/publico/fixture-token';
      assert.ok(path === expected || path.startsWith(expected + '/'), 'URL pública inválida: ' + path);
      if (request.method() === 'GET') return route.fulfill({json: meta});
      const body = request.postDataJSON();
      requests.push({path, body});
      const email = body.email || body.identificacao?.email;
      if (email !== 'ana@example.com' || body.token_acesso !== '012345') {
        return route.fulfill({status: 422, json: {detail: 'E-mail ou token inválido. Confira os dados do convite recebido.'}});
      }
      if (path.endsWith('/acesso')) {
        return route.fulfill({json: {...meta, criterios: ['Custo', 'Prazo'], email_autorizado: true}});
      }
      return route.fulfill({json: {id: 'resposta', status: path.endsWith('/respostas') ? 'enviada' : 'em_preenchimento',
        matriz_comparacao: [[1, 1], [1, 1]]}});
    });
    await page.goto('http://127.0.0.1:8083' + prefix + '/public/analise-multicriterio/formulario-comparacao-pareada/fixture-token/?simulacao=1');
    assert.equal(await page.locator('#collab-form-section').isVisible(), false);
    await page.locator('#colab-nome').fill('Nome livre do participante');
    await page.locator('#colab-inst').fill('Instituição de teste');
    await page.locator('#colab-email').fill('ana@example.com');
    await page.locator('#btn-liberar-form').click();
    await page.getByText('Informe o código de acesso de seis números recebido por e-mail.', {exact: true}).waitFor();
    assert.equal(requests.length, 0);
    await page.locator('#colab-token').fill('999999');
    await page.locator('#btn-liberar-form').click();
    await page.getByText('E-mail ou token inválido. Confira os dados do convite recebido.', {exact: true}).waitFor();
    assert.equal(await page.locator('#collab-form-section').isVisible(), false);
    assert.equal(requests.some(r => r.path.endsWith('/respostas/iniciar')), false);
    await page.locator('#colab-token').fill('012345');
    await page.locator('#btn-liberar-form').click();
    await page.locator('#collab-form-section').waitFor({state: 'visible'});
    assert.equal(await page.locator('#colab-email').isDisabled(), true);
    assert.equal(await page.locator('#colab-token').isDisabled(), true);
    await page.waitForTimeout(1200);
    assert.equal(await page.evaluate(() => SLTColaborativaSimulacao), true);
    await page.locator('#btn-enviar-resposta').click();
    await page.getByText('Envio simulado com sucesso. Nenhuma resposta foi gravada.', {exact: true}).waitFor();
    assert.equal(requests.filter(r => !r.path.endsWith('/acesso')).length, 0, 'simulation must not write responses');
    assert.equal(new URL(page.url()).searchParams.has('token_acesso'), false);
    assert.deepEqual(await page.evaluate(() => Object.values(localStorage).filter(value => value.includes('012345'))), []);
    assert.deepEqual(errors, []);
    console.log('PASS ' + (prefix || '/') + ': Mesmo formulario publico, validacao de acesso e envio simulado sem gravar respostas.');
    await page.close();
    }
  } finally {
    await browser.close();
  }
})().catch(error => {console.error(error); process.exitCode = 1;});
