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
      assert.match(await page.locator('#collab-group-method').innerText(), /critérios de 2 dimensões em 2 comparações/);
      const next = page.locator('#collab-next-group');
      assert.equal(await next.isDisabled(), true);
      assert.equal(await send.isVisible(), false);
      await pairs.locator('.saaty-scale').press('ArrowRight');
      assert.equal(await page.locator('#collab-rc-status').textContent(), 'RC da dimensão');
      const saved = page.waitForResponse(response => response.url().endsWith('/respostas/progresso'));
      await next.click();
      await saved;
      assert.equal(draft.matriz_comparacao[0][2], 1 / 3);
      assert.equal(draft.matriz_comparacao[0][1], null);

      await openForm();
      assert.match(await page.locator('#collab-group-title').innerText(), /Dimensão 2 de 2 · Social/);
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
      assert.equal(await page.locator('#collab-group-method').isVisible(), false);
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

async function testPublicModel(browser) {
  const page = await browser.newPage({viewport: {width: 390, height: 844}});
  const endpoint = '/api/ahp/comparacao-colaborativa';
  const writes = [], errors = [];
  try {
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**' + endpoint + '/**', route => {
      if (route.request().method() === 'GET') return route.continue();
      writes.push(route.request().url());
      return route.abort();
    });
    const carregamento = page.waitForResponse(response => response.url().endsWith(endpoint + '/modelo-pli'));
    await page.goto(base + '/public/analise-multicriterio/formulario-comparacao-pareada/');
    const modelo = await (await carregamento).json();
    await page.locator('#colab-nome').fill('Simulação');
    await page.locator('#colab-inst').fill('SICARD');
    await page.locator('#colab-email').fill('teste@example.invalid');
    await page.evaluate(() => {
      const api = window.SLTColaborativaApi;
      const enviar = api.enviarResposta;
      api.enviarResposta = (token, payload) => {
        window.respostaSimulada = payload;
        return enviar(token, payload);
      };
    });
    await page.locator('#btn-liberar-form').click();

    const grupos = Object.entries(modelo.grupos_comparacao).filter(([, indices]) => indices.length > 1);
    assert.equal(grupos.length, 6);
    const gruposPorIndice = Object.fromEntries(Object.entries(modelo.grupos_comparacao)
      .flatMap(([nome, indices]) => indices.map(indice => [indice, nome])));
    const titulo = page.locator('#collab-group-title');
    const escalas = page.locator('#comparisonContent .saaty-scale');
    const next = page.locator('#collab-next-group');
    const send = page.locator('#btn-enviar-resposta');
    await titulo.waitFor({state: 'visible'});
    const explicacao = page.locator('.secao-collab-pairwise .collab-dimension-guide');
    const metodo = await explicacao.innerText();
    assert.match(metodo, /Os critérios são organizados em dimensões/);
    assert.match(metodo, /critérios de 6 dimensões em 16 comparações/);
    assert.match(metodo, /Você só compara critérios da dimensão exibida/);
    assert.doesNotMatch(metodo, /grupo|matriz|premissas/i);
    assert.equal(await next.innerText(), 'Próxima dimensão');
    for (const width of [390, 1280]) {
      await page.setViewportSize({width, height: 844});
      const estilo = await explicacao.evaluate(guia => {
        const tamanho = item => parseFloat(getComputedStyle(item).fontSize);
        return {
          texto: tamanho(guia.querySelector('p')),
          instrucao: tamanho(guia.closest('.info-card-content').querySelector(':scope > .collab-pairwise-intro')),
          fundo: getComputedStyle(guia).backgroundColor,
          pesoQuantidade: parseInt(getComputedStyle(guia.querySelector('strong')).fontWeight, 10),
          semTransbordamento: guia.scrollWidth <= guia.clientWidth,
        };
      });
      assert.ok(estilo.texto > estilo.instrucao);
      assert.equal(estilo.fundo, 'rgb(234, 243, 250)');
      assert.ok(estilo.pesoQuantidade >= 700);
      assert.equal(estilo.semTransbordamento, true);
    }
    await page.setViewportSize({width: 390, height: 844});
    let total = 0;
    for (const [ordem, [nome, indices]] of grupos.entries()) {
      assert.equal(await titulo.innerText(), `Dimensão ${ordem + 1} de 6 · ${nome}`);
      const quantidade = indices.length * (indices.length - 1) / 2;
      assert.equal(await escalas.count(), quantidade);
      total += quantidade;
      for (const escala of await escalas.all()) {
        await escala.press('ArrowLeft');
        await escala.press('ArrowRight');
      }
      if (ordem < grupos.length - 1) await next.click();
    }
    assert.equal(total, 16);
    assert.match(await page.locator('#collab-group-note').innerText(), /Segurança.*100%/);
    await send.click();
    await page.getByText('Envio simulado com sucesso. Nenhuma resposta foi gravada.', {exact: true}).first().waitFor();
    const resposta = await page.evaluate(() => window.respostaSimulada);
    assert.equal(Object.keys(resposta.estatisticas.revisoes_por_par).length, 16);
    assert.deepEqual(resposta.matriz_comparacao, modelo.criterios.map((_, i) =>
      modelo.criterios.map((_, j) => gruposPorIndice[i] === gruposPorIndice[j] ? 1 : null)));
    assert.deepEqual(writes, []);
    assert.deepEqual(errors, []);
  } finally {
    await page.close();
  }
}

async function testLinkedStages(browser) {
  const page = await browser.newPage({viewport: {width: 390, height: 844}});
  const token = 'rodada-duas-etapas-teste', key = 'A'.repeat(43);
  const errors = [];
  let version = 0, validations = 0, sent;
  let draft = {status: 'em_preenchimento', atualizadoEm: new Date(version).toISOString(),
    matriz_comparacao: matrix(true), estatisticas: {}};
  try {
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/api/ahp/comparacao-colaborativa/publico/' + token + '**', route => {
      const request = route.request(), path = new URL(request.url()).pathname;
      const meta = {token, escopo: 'Teste das etapas', objetivo: 'Comparar dimensões e critérios',
        status: 'ativa', modo_comparacao: 'duas_etapas'};
      if (request.method() === 'GET') return route.fulfill({json: {...meta, criterios: [], email_autorizado: false}});
      const body = request.postDataJSON();
      assert.equal(body.token_acesso, key);
      if (path.endsWith('/acesso')) return route.fulfill({json: {...meta, criterios: criteria,
        grupos_comparacao: groups, dimensoes_comparacao: Object.keys(groups), email_autorizado: true}});
      if (path.endsWith('/iniciar')) return route.fulfill({json: draft});
      assert.equal(body.versao, draft.atualizadoEm);
      if (path.endsWith('/progresso')) {
        if (body.etapa === 'dimensoes') {
          if (body.concluir_etapa && ++validations === 1) {
            return route.fulfill({status: 422, json: {detail: 'Revise as comparações entre dimensões.'}});
          }
          const anterior = draft.estatisticas.julgamento_dimensoes;
          draft.estatisticas.julgamento_dimensoes = {matriz: body.matriz_comparacao,
            revisoes_por_par: body.estatisticas.revisoes_por_par,
            resultado: body.concluir_etapa ? {CR: 0} : anterior?.resultado};
        } else {
          assert.ok(draft.estatisticas.julgamento_dimensoes?.resultado);
          draft.matriz_comparacao = body.matriz_comparacao;
          Object.assign(draft.estatisticas, body.estatisticas);
        }
        draft.atualizadoEm = new Date(++version).toISOString();
        return route.fulfill({json: draft});
      }
      assert.ok(path.endsWith('/respostas'));
      sent = body;
      return route.fulfill({status: 201, json: {...draft, status: 'enviada'}});
    });
    const open = async () => {
      await page.goto(base + '/public/analise-multicriterio/formulario-comparacao-pareada/' + token + '/');
      await page.locator('#colab-nome').fill('Ana Teste');
      await page.locator('#colab-inst').fill('Teste');
      await page.locator('#colab-email').fill('ana@example.invalid');
      await page.locator('#colab-token').fill(key);
      await page.locator('#btn-liberar-form').click();
      await page.locator('#collab-linked-title').waitFor();
    };
    await open();
    const titulo = page.locator('#collab-linked-title');
    const escalas = page.locator('#comparisonContent .saaty-scale');
    const nextStage = page.locator('#collab-linked-next');
    const send = page.locator('#btn-enviar-resposta');
    assert.match(await titulo.innerText(), /Etapa 1 de 2/);
    assert.equal(await escalas.count(), 3);
    assert.equal(await send.isVisible(), false);
    assert.equal(await nextStage.isDisabled(), true);
    for (const escala of await escalas.all()) {
      await escala.press('ArrowLeft');
      await escala.press('ArrowRight');
    }
    await nextStage.click();
    await page.getByText('Revise as comparações entre dimensões.', {exact:true}).waitFor();
    assert.match(await titulo.innerText(), /Etapa 1 de 2/);
    await nextStage.click();
    await page.getByText('Etapa 2 de 2 · Critérios por dimensão', {exact: true}).waitFor();
    await open();
    assert.match(await titulo.innerText(), /Etapa 2 de 2/);
    await page.locator('#collab-linked-back').click();
    await page.getByText('Etapa 1 de 2 · Dimensões', {exact: true}).waitFor();
    assert.equal(await nextStage.isEnabled(), true);
    await nextStage.click();
    await page.getByText('Etapa 2 de 2 · Critérios por dimensão', {exact: true}).waitFor();
    assert.equal(await escalas.count(), 1);
    await escalas.first().press('ArrowRight');
    await page.locator('#collab-next-group').click();
    assert.equal(await send.isDisabled(), true);
    await escalas.first().press('ArrowLeft');
    await send.click();
    await page.getByText('Resposta enviada com sucesso. Obrigado!', {exact:true}).first().waitFor();
    assert.equal(sent.matriz_comparacao[0][1], null);
    assert.equal(sent.matriz_comparacao[0][2], 1 / 3);
    assert.equal(sent.matriz_comparacao[1][3], 3);
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
    await testPublicModel(browser);
    await testLinkedStages(browser);
    console.log('Comparações por dimensão, integral, simulação de 16 pares e rodada em duas etapas validadas no Edge.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
