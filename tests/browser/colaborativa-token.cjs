const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const chaveIndividual = 'a'.repeat(43);

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
      if (email !== 'ana@example.com' || body.token_acesso !== chaveIndividual) {
        return route.fulfill({status: 422, json: {detail: 'E-mail ou token inválido. Confira os dados do convite recebido.'}});
      }
      if (path.endsWith('/acesso')) {
        return route.fulfill({json: {...meta, criterios: ['Custo', 'Prazo'], email_autorizado: true}});
      }
      return route.fulfill({json: {id: 'resposta', status: path.endsWith('/respostas') ? 'enviada' : 'em_preenchimento',
        matriz_comparacao: [[1, 1], [1, 1]]}});
    });
    await page.goto('http://127.0.0.1:8083' + prefix + '/public/analise-multicriterio/formulario-comparacao-pareada/fixture-token/');
    assert.equal(await page.locator('#collab-form-section').isVisible(), false);
    await page.locator('#colab-nome').fill('Nome livre do participante');
    await page.locator('#colab-inst').fill('Instituição de teste');
    await page.locator('#colab-email').fill('ana@example.com');
    await page.locator('#btn-liberar-form').click();
    await page.getByText('Informe a chave individual recebida por e-mail. Códigos antigos não são mais aceitos.', {exact: true}).waitFor();
    assert.equal(requests.length, 0);
    await page.locator('#colab-token').fill('b'.repeat(43));
    await page.locator('#btn-liberar-form').click();
    await page.getByText('E-mail ou token inválido. Confira os dados do convite recebido.', {exact: true}).waitFor();
    assert.equal(await page.locator('#collab-form-section').isVisible(), false);
    assert.equal(requests.some(r => r.path.endsWith('/respostas/iniciar')), false);
    await page.locator('#colab-token').fill(chaveIndividual);
    await page.locator('#btn-liberar-form').click();
    await page.locator('#collab-form-section').waitFor({state: 'visible'});
    assert.equal(await page.locator('#colab-email').isDisabled(), true);
    assert.equal(await page.locator('#colab-token').isDisabled(), true);
    await page.waitForResponse(r => r.url().endsWith('/respostas/progresso'));
    await page.locator('#btn-enviar-resposta').click();
    await page.locator('#collab-submit-feedback').filter({hasText: 'Resposta enviada com sucesso. Obrigado!'}).waitFor();
    for (const suffix of ['/respostas/iniciar', '/respostas/progresso', '/respostas']) {
      const call = requests.find(r => r.path.endsWith(suffix));
      assert.ok(call, suffix);
      assert.equal(call.body.token_acesso, chaveIndividual);
      assert.equal(call.body.email || call.body.identificacao.email, 'ana@example.com');
    }
    assert.equal(new URL(page.url()).searchParams.has('token_acesso'), false);
    assert.deepEqual(await page.evaluate(chave => Object.values(localStorage).filter(value => value.includes(chave)), chaveIndividual), []);
    requests.length = 0;
    await page.goto('http://127.0.0.1:8083' + prefix + '/public/analise-multicriterio/formulario-comparacao-pareada/fixture-token/?c=confirmacao#acesso=' + chaveIndividual);
    await page.waitForFunction(() => !location.hash);
    assert.equal(await page.locator('#colab-token').isVisible(), false);
    await page.locator('#colab-nome').fill('Nome do participante');
    await page.locator('#colab-inst').fill('Instituição de teste');
    await page.locator('#colab-email').fill('ana@example.com');
    await page.locator('#btn-liberar-form').click();
    await page.locator('#collab-form-section').waitFor({state: 'visible'});
    assert.equal(requests.find(r => r.path.endsWith('/acesso')).body.token_acesso, chaveIndividual);
    assert.equal(new URL(page.url()).searchParams.get('c'), 'confirmacao');
    assert.deepEqual(await page.evaluate(chave => Object.values(sessionStorage).filter(value => value.includes(chave)), chaveIndividual), []);
    assert.deepEqual(errors, []);
    console.log('PASS ' + (prefix || '/') + ': URLs corretas, chave individual obrigatória, identificação travada e autorização no progresso/envio.');
    await page.close();
    }
  } finally {
    await browser.close();
  }
})().catch(error => {console.error(error); process.exitCode = 1;});
