const {chromium} = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({channel: 'msedge', headless: true});
  try {
    const page = await browser.newPage();
    const errors = [], requests = [];
    const meta = {token: 'fixture-token', escopo: 'Teste', objetivo: 'Comparar critérios',
      criterios: [], valido_ate: '2035-12-31', status: 'ativa', email_autorizado: false};
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/api/**', async route => {
      const request = route.request(), path = new URL(request.url()).pathname;
      if (!path.includes('/publico/')) return route.fulfill({json: []});
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
    await page.goto('http://127.0.0.1:8083/public/analise-multicriterio/fixture-token/');
    assert.equal(await page.locator('#collab-form-section').isVisible(), false);
    await page.locator('#colab-nome').fill('Nome livre do participante');
    await page.locator('#colab-inst').fill('Instituição de teste');
    await page.locator('#colab-email').fill('ana@example.com');
    await page.locator('#btn-liberar-form').click();
    await page.getByText('Informe o token de seis números recebido por e-mail.', {exact: true}).waitFor();
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
    await page.waitForResponse(r => r.url().endsWith('/respostas/progresso'));
    await page.locator('#btn-enviar-resposta').click();
    await page.getByText('Resposta enviada com sucesso. Obrigado!', {exact: true}).waitFor();
    for (const suffix of ['/respostas/iniciar', '/respostas/progresso', '/respostas']) {
      const call = requests.find(r => r.path.endsWith(suffix));
      assert.ok(call, suffix);
      assert.equal(call.body.token_acesso, '012345');
      assert.equal(call.body.email || call.body.identificacao.email, 'ana@example.com');
    }
    assert.equal(new URL(page.url()).searchParams.has('token_acesso'), false);
    assert.deepEqual(await page.evaluate(() => Object.values(localStorage).filter(value => value.includes('012345'))), []);
    assert.deepEqual(errors, []);
    console.log('PASS: token obrigatório, erro sem liberar formulário, zeros iniciais, identificação travada e autorização no progresso/envio.');
  } finally {
    await browser.close();
  }
})().catch(error => {console.error(error); process.exitCode = 1;});
