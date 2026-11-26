const assert = require('node:assert/strict');
const {chromium} = require('playwright');

const base = process.env.SICARD_TEST_URL || 'http://127.0.0.1:8083';
const criterios = ['Custo', 'Prazo', 'Segurança'];
const azul = 'rgb(203, 230, 247)';
const verde = 'rgb(220, 245, 230)';

(async () => {
  const browser = await chromium.launch({channel: 'msedge', headless: true});
  try {
    const page = await browser.newPage({viewport: {width: 1440, height: 900}});
    const erros = [];
    let rascunho = {
      status: 'em_preenchimento',
      matriz_comparacao: criterios.map((_, i) => criterios.map((_, j) => i === j ? 1 : null)),
      estatisticas: {},
    };
    const meta = {token: 'cores-validacao', criterios, escopo: 'Teste', objetivo: 'Comparar critérios',
      status: 'ativa', email_autorizado: true};
    page.on('pageerror', erro => erros.push(erro.message));
    await page.route('**/api/ahp/comparacao-colaborativa/publico/cores-validacao**', rota => {
      const pedido = rota.request(), url = new URL(pedido.url());
      if (pedido.method() === 'GET' || url.pathname.endsWith('/acesso')) return rota.fulfill({json: meta});
      if (url.pathname.endsWith('/progresso')) {
        const {matriz_comparacao, estatisticas} = pedido.postDataJSON();
        rascunho = {...rascunho, matriz_comparacao, estatisticas};
      }
      return rota.fulfill({json: rascunho});
    });
    const abrir = async () => {
      await page.goto(base + '/public/analise-multicriterio/formulario-comparacao-pareada/cores-validacao/');
      await page.locator('#colab-nome').fill('Participante de exemplo');
      await page.locator('#colab-inst').fill('SICARD');
      await page.locator('#colab-email').fill('teste@example.invalid');
      await page.locator('#colab-token').fill('a'.repeat(43));
      await page.locator('#btn-liberar-form').click();
      await page.locator('#comparisonContent .saaty-pair').first().waitFor();
    };
    const pares = page.locator('#comparisonContent .saaty-pair');
    const confirmados = page.locator('#comparisonContent .saaty-pair.is-auto-validated');
    const rcAceitavel = async () => Number(await page.locator('#metricRCValue').textContent()) < 0.10;
    const cor = par => par.evaluate(el => getComputedStyle(el).backgroundColor);
    const ajustar = (indice, intensidade) => pares.nth(indice).evaluate((el, v) => setSaatyPairValue(el, v), intensidade);
    const esperar = quantidade => page.waitForFunction(n =>
      document.querySelectorAll('#comparisonContent .saaty-pair.is-auto-validated').length === n, quantidade);
    const coresDosPares = () => pares.evaluateAll(itens => itens.map(el => getComputedStyle(el).backgroundColor));

    await abrir();
    const neutro = await cor(pares.nth(1));
    await ajustar(0, 9);
    await esperar(1);
    assert.equal(await rcAceitavel(), false);
    assert.deepEqual(await coresDosPares(), [azul, neutro, neutro]);
    assert.notEqual(await page.locator('#collab-form-section').evaluate(el => getComputedStyle(el).backgroundColor), azul);

    await ajustar(0, 1);
    await esperar(1);
    assert.equal(await rcAceitavel(), true);
    assert.deepEqual(await coresDosPares(), [verde, neutro, neutro]);

    await ajustar(0, 3);
    await ajustar(1, 5);
    await ajustar(2, 3);
    await esperar(3);
    assert.equal(await rcAceitavel(), true);
    assert.deepEqual(await coresDosPares(), [verde, verde, verde]);

    await ajustar(1, 1 / 9);
    await esperar(3);
    assert.equal(await rcAceitavel(), false);
    assert.deepEqual(await coresDosPares(), [azul, azul, azul]);
    await page.waitForFunction(() => document.querySelector('#collab-save-feedback').textContent.includes('salvo'));
    await abrir();
    await esperar(3);
    for (const width of [1440, 820, 390]) {
      await page.setViewportSize({width, height: 900});
      assert.equal(await confirmados.count(), 3);
      assert.deepEqual(await coresDosPares(), [azul, azul, azul]);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
    }
    assert.deepEqual(erros, []);
    console.log('Pares pendentes, RC provisória aceitável, retorno ao azul e reabertura do rascunho verificados.');
  } finally {
    await browser.close();
  }
})().catch(erro => { console.error(erro); process.exitCode = 1; });
