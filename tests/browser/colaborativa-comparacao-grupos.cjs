const {chromium} = require('playwright');
const assert = require('node:assert/strict');

const base = process.env.SICARD_TEST_URL || 'http://127.0.0.1:8083';
const criteria = ['Custo', 'Acesso', 'Prazo', 'Equidade', 'Risco'];
const groups = {Financeira: [0, 2], Social: [1, 3], Ambiental: [4]};
const matrix = grouped => criteria.map((_, i) => criteria.map((_, j) => i === j || !grouped ? 1 : null));

async function testForm(browser, grouped) {
  const page = await browser.newPage({viewport: {width: 390, height: 844}});
  const errors = [];
  const token = 'rodada-teste';
  const key = 'A'.repeat(43);
  const meta = {token, escopo: 'Matriz de teste', objetivo: 'Comparar critérios', valido_ate: '2035-12-31',
    status: 'ativa', modo_comparacao: grouped ? 'por_grupo' : 'todos'};
  let draft = {id: 'resposta', status: 'em_preenchimento', matriz_comparacao: matrix(grouped), estatisticas: {}};
  let submitted;
  try {
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/api/ahp/comparacao-colaborativa/publico/' + token + '**', route => {
      const request = route.request(), path = new URL(request.url()).pathname;
      if (request.method() === 'GET') return route.fulfill({json: {...meta, criterios: [], email_autorizado: false}});
      const body = request.postDataJSON();
      assert.equal(body.token_acesso, key);
      if (path.endsWith('/acesso')) return route.fulfill({json: {...meta, criterios: criteria,
        grupos_comparacao: grouped ? groups : {}, email_autorizado: true}});
      if (path.endsWith('/iniciar')) return route.fulfill({json: draft});
      if (path.endsWith('/progresso')) {
        draft = {...draft, matriz_comparacao: body.matriz_comparacao, estatisticas: body.estatisticas};
        return route.fulfill({json: draft});
      }
      assert.ok(path.endsWith('/respostas'));
      submitted = body;
      return route.fulfill({status: 201, json: {...draft, status: 'enviada'}});
    });
    const openForm = async () => {
      await page.goto(`${base}/public/analise-multicriterio/formulario-comparacao-pareada/${token}/`);
      await page.locator('#colab-nome').fill('Ana Teste');
      await page.locator('#colab-inst').fill('Instituição de teste');
      await page.locator('#colab-email').fill('ana@example.com');
      await page.locator('#colab-token').fill(key);
      await page.locator('#btn-liberar-form').click();
      await page.locator('#comparisonContent .saaty-pair').first().waitFor();
    };
    await openForm();
    const pairs = page.locator('#comparisonContent .saaty-pair');
    const send = page.locator('#btn-enviar-resposta');
    if (grouped) {
      assert.equal(await pairs.count(), 1);
      assert.match(await pairs.first().innerText(), /Custo/);
      assert.match(await pairs.first().innerText(), /Prazo/);
      assert.doesNotMatch(await pairs.first().innerText(), /Acesso|Equidade|Risco/);
      assert.match(await page.locator('#collab-group-note').innerText(), /Ambiental/);
      const next = page.locator('#collab-next-group');
      assert.equal(await next.isDisabled(), true);
      assert.equal(await send.isVisible(), false);
      await pairs.locator('.saaty-scale').press('ArrowRight');
      assert.equal(await page.locator('#collab-rc-status').textContent(), 'RC do grupo');
      const saved = page.waitForResponse(response => response.url().endsWith('/respostas/progresso'));
      await next.click();
      await saved;
      assert.equal(draft.matriz_comparacao[0][2], 1 / 3);
      assert.equal(draft.matriz_comparacao[0][1], null);

      await openForm();
      assert.match(await page.locator('#collab-group-title').innerText(), /Grupo 2 de 2 · Social/);
      assert.equal(await pairs.count(), 1);
      assert.match(await pairs.first().innerText(), /Acesso/);
      assert.match(await pairs.first().innerText(), /Equidade/);
      assert.equal(await send.isDisabled(), true);
      await page.locator('#collab-previous-group').click();
      assert.equal(Number(await pairs.locator('input').inputValue()), 1 / 3);
      await next.click();
      await pairs.locator('.saaty-scale').press('ArrowLeft');
    } else {
      assert.equal(await pairs.count(), 10);
      assert.equal(await page.locator('#collab-group-navigation').isVisible(), false);
    }
    await send.click();
    await page.getByText('Resposta enviada com sucesso. Obrigado!', {exact: true}).first().waitFor();
    const expected = matrix(grouped);
    if (grouped) {
      expected[0][2] = expected[3][1] = 1 / 3;
      expected[2][0] = expected[1][3] = 3;
      assert.deepEqual(Object.keys(submitted.estatisticas.revisoes_por_par).sort(), ['0_2', '1_3']);
    }
    assert.deepEqual(submitted.matriz_comparacao, expected);
    assert.deepEqual(errors, []);
  } finally {
    await page.close();
  }
}

(async () => {
  const browser = await chromium.launch({channel: 'msedge', headless: true});
  try {
    await testForm(browser, true);
    await testForm(browser, false);
    console.log('Comparação por grupo, retomada e envio, e comparação integral validados no Edge.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
