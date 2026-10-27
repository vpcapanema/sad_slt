// Mesa de consolidação: fluxo completo contra a API simulada (mesmo contrato do servidor).
// Capturas de tela opcionais: MESA_CAPTURAS=<pasta>.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('fs');
const { criarCenario, instalarRotas, analisar } = require('./fixtures/central-respostas-dados.cjs');
const motor = require('../../assets/js/paginas/mesa-consolidacao-motor.js');

const PAGINA = 'http://127.0.0.1:8083/restrict/analise-multicriterio/mesa-consolidacao';
const capturas = process.env.MESA_CAPTURAS;

function mediaGeometrica(respostas) {
  const n = respostas[0].matriz_comparacao.length, m = Array.from({ length: n }, () => Array(n).fill(1));
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    const g = Math.exp(respostas.reduce((s, r) => s + Math.log(r.matriz_comparacao[i][j]), 0) / respostas.length); m[i][j] = g; m[j][i] = 1 / g;
  }
  return m;
}

(async () => {
  // O motor reproduz o cálculo do servidor: confere com a implementação independente do fixture.
  const cenarioMotor = criarCenario(), enviadas = cenarioMotor.respostasPor.amb1.filter(r => r.status === 'enviada');
  const consistentes = enviadas.filter(r => r.consistente), esperado = analisar(mediaGeometrica(consistentes));
  const criteriosMotor = cenarioMotor.ambientes[0].criterios, todas = new Set(enviadas.map(r => r.id));
  const direto = motor.consolidar(enviadas, criteriosMotor, { ids: todas, metodo: 'geometrica', rcMaximo: 0.10, excluirInconsistentes: true, superficie: false });
  assert.equal(direto.incluidas.length, consistentes.length);
  assert.ok(Math.abs(direto.analise.rc - esperado.rc) < 1e-12 && Math.abs(direto.analise.lambdaMax - esperado.lambda) < 1e-12);
  direto.analise.pesos.forEach((p, k) => assert.ok(Math.abs(p - esperado.pesos[k]) < 1e-12));
  const mediana = motor.consolidar(enviadas, criteriosMotor, { ids: todas, metodo: 'mediana', rcMaximo: 0.10, excluirInconsistentes: true, superficie: false });
  for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) assert.ok(Math.abs(mediana.matriz[i][j] * mediana.matriz[j][i] - 1) < 1e-12, 'reciprocidade da mediana');
  assert.equal(motor.consolidar(enviadas, criteriosMotor, { ids: new Set(), metodo: 'geometrica', rcMaximo: 0.1, excluirInconsistentes: true, superficie: false }).vazio, true);
  assert.equal(motor.consistenteNoLimite(0.10, 0.10, false), false, 'sem superfície: RC < limite');
  assert.equal(motor.consistenteNoLimite(0.10, 0.10, true), true, 'com superfície: RC <= min(limite, 0,10)');
  assert.equal(motor.consistenteNoLimite(0.09, 0.5, true), true);
  assert.equal(motor.consistenteNoLimite(0.11, 0.5, true), false);

  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const cenario = criarCenario(), page = await browser.newPage({ viewport: { width: 1440, height: 900 } }), erros = [];
    page.on('pageerror', e => erros.push(e.message)); page.on('console', m => { if (m.type() === 'error') erros.push(m.text()); });
    const gravacoes = await instalarRotas(page, cenario);
    const foto = async nome => { if (capturas) { fs.mkdirSync(capturas, { recursive: true }); await page.screenshot({ path: `${capturas}/${nome}.png`, fullPage: true }); } };
    const kpi = id => page.locator('#mesa-k-' + id).innerText();
    const fechar = () => page.locator('#pfsStatusOverlay .pfs-box.pfs-active .pfs-close').click();

    await page.goto(PAGINA);
    await page.locator('#mesa-jul-paginacao button').first().waitFor();
    assert.equal(await page.locator('#mesa-tabela-julgamentos tbody tr').count(), 3);
    assert.equal(await page.locator('#mesa').isVisible(), false, 'a mesa só abre depois da escolha');

    // Julgamento sem análise: regra padrão = consistentes, média geométrica.
    await page.locator('#mesa-tabela-julgamentos input[data-id="amb1"]').check();
    await page.locator('#mesa').waitFor({ state: 'visible' });
    await page.waitForFunction(() => document.querySelector('#mesa-k-rc').textContent !== '—');
    assert.equal(await kpi('incluidas'), '5 de 6');
    assert.equal(await kpi('rc'), esperado.rc.toFixed(3));
    assert.equal(await kpi('lambda'), esperado.lambda.toFixed(3));
    assert.match(await page.locator('#mesa-veredito').innerText(), /dentro do limite/);
    assert.equal(await page.locator('#mesa-barra.is-ok').count(), 1);
    const estados = await page.locator('#mesa-tabela-respostas tbody tr td:nth-child(7)').allInnerTexts();
    assert.deepEqual(estados.slice(0, 6), ['Incluída', 'Incluída', 'Incluída', 'Incluída', 'Incluída', 'Fora: inconsistente']);
    assert.equal(await page.locator('#mesa-tabela-respostas tbody tr:nth-child(7) input[type=checkbox]').isDisabled(), true, 'resposta em preenchimento não pode entrar');
    assert.equal(await page.locator('#mesa-tabela-respostas tbody tr:nth-child(8) input[type=checkbox]').isDisabled(), true, 'convidado que não iniciou não pode entrar');
    assert.match(await page.locator('#mesa-origem').innerText(), /Nenhuma análise homologada/);
    assert.equal(await page.locator('#mesa-tabela-pesos tbody tr').count(), 6);
    await foto('1-mesa-pesos');

    // Desligar a exclusão traz a inconsistente; com limite estrito, a consistência cai sem recarregar nada.
    await page.locator('#mesa-excluir').uncheck();
    assert.equal(await kpi('incluidas'), '6 de 6');
    assert.equal(await page.locator('#mesa-barra.is-ok').count(), 1, 'a média amortece uma resposta ruim; com limite 0,10 ainda é consistente');
    await page.locator('#mesa-rc').fill('0.02');
    assert.equal(await page.locator('#mesa-barra.is-nok').count(), 1);
    assert.match(await page.locator('#mesa-veredito').innerText(), /acima do limite/);
    assert.equal(await page.locator('#mesa-salvar').isEnabled(), true, 'inconsistente pode ser gravada (não homologada)');
    const semEla = await page.locator('#mesa-tabela-respostas tbody tr td:nth-child(8)').allInnerTexts();
    assert.match(semEla[5], /^0\.\d{3} \(−0\.\d{3}\)$/, 'tirar a inconsistente reduz o RC');
    assert.ok(Number(await page.locator('#mesa-tabela-respostas tbody tr:nth-child(6) td:nth-child(9)').innerText()) >= 1, 'pares destoantes da inconsistente');
    await page.locator('#mesa-rc').fill('0.10');
    await page.locator('#mesa-excluir').check();

    // Desmarcar um julgador, seleção rápida e troca de método atualizam o resultado.
    await page.locator('#mesa-tabela-respostas input[data-id="amb1-r1"]').uncheck();
    assert.equal(await kpi('incluidas'), '4 de 6');
    assert.equal(await page.locator('#mesa-tabela-respostas tbody tr:nth-child(1) td:nth-child(7)').innerText(), 'Fora: desmarcada');
    const quatro = analisar(mediaGeometrica(consistentes.filter(r => r.id !== 'amb1-r1')));
    assert.equal(await kpi('rc'), quatro.rc.toFixed(3));
    await page.locator('#mesa-sel-consistentes').click();
    assert.equal(await kpi('incluidas'), '5 de 6');
    await page.locator('#mesa-sel-nenhuma').click();
    assert.equal(await kpi('incluidas'), '0 de 6');
    assert.equal(await kpi('rc'), '—');
    assert.equal(await page.locator('#mesa-salvar').isDisabled(), true);
    assert.equal(await page.locator('#mesa-tabela-pesos tbody tr').count(), 1, 'estado vazio da tabela de pesos');
    await page.locator('#mesa-sel-todas').click();
    await page.locator('#mesa-metodo').selectOption('mediana');
    assert.equal(await kpi('incluidas'), '5 de 6');

    // Abas: pares (julgador × par, com destoantes) e matriz.
    await page.locator('#mesa-aba-pares').click();
    assert.equal(await page.locator('#mesa-painel-pares').isVisible(), true);
    assert.equal(await page.locator('#mesa-painel-pesos').isVisible(), false);
    assert.equal(await page.locator('#mesa-tabela-pares tbody tr').count(), 15);
    assert.equal(await page.locator('#mesa-tabela-pares thead th').count(), 1 + 1 + 6 + 3);
    assert.ok(await page.locator('#mesa-tabela-pares td.is-fora').count() >= 15, 'julgador fora do cálculo fica esmaecido');
    await foto('2-mesa-pares');
    await page.locator('#mesa-aba-matriz').click();
    assert.equal(await page.locator('#mesa-tabela-matriz tbody tr').count(), 6);
    assert.equal(await page.locator('#mesa-tabela-matriz tbody tr:nth-child(1) td:nth-child(3)').innerText(), '1.000');
    await page.locator('#mesa-aba-pesos').click();

    // Gravação: payload e retorno.
    await page.locator('#mesa-metodo').selectOption('geometrica');
    await page.locator('#mesa-rc').fill('0.08');
    await page.locator('#mesa-nome').fill('Rodada final');
    await page.locator('#mesa-salvar').click();
    await page.locator('#pfsStatusOverlay .pfs-box.pfs-active').waitFor({ state: 'visible' });
    assert.equal(gravacoes.length, 1);
    assert.deepEqual(gravacoes[0].corpo, { nome: 'Rodada final', metodo_agregacao: 'geometrica', resposta_ids: ['amb1-r1', 'amb1-r2', 'amb1-r3', 'amb1-r4', 'amb1-r5', 'amb1-r6'], rc_maximo: 0.08, excluir_inconsistentes: true });
    await fechar();
    await page.waitForFunction(() => document.querySelectorAll('#mesa-tabela-analises tbody tr:not(:has(.ami-empty))').length === 1);
    assert.equal(await page.locator('#mesa-tabela-analises tbody tr td:nth-child(10)').innerText(), '0.0 p.p.', 'a análise gravada coincide com a prévia da mesa');
    assert.equal(await page.locator('#mesa-anl-ctl-homologar').isDisabled(), true, 'sem seleção não homologa');
    assert.equal(await page.locator('#mesa-proximos').isHidden(), true);

    // Homologação: pede confirmação, grava e atualiza a situação e a lista de julgamentos.
    await page.locator('#mesa-tabela-analises input[data-id="an-novo-1"]').check();
    assert.equal(await page.locator('#mesa-anl-ctl-homologar').isEnabled(), true);
    await page.locator('#mesa-anl-ctl-homologar').click();
    await page.locator('#pfsConfirmBox').waitFor({ state: 'visible' });
    await page.locator('#pfsConfirmOk').click();
    await page.locator('#pfsStatusOverlay .pfs-box.pfs-active').waitFor({ state: 'visible' });
    assert.equal(gravacoes.length, 2); assert.match(gravacoes[1].path, /\/analises\/an-novo-1\/homologar$/);
    await fechar();
    await page.waitForFunction(() => document.querySelector('#mesa-situacao').classList.contains('is-ok'));
    assert.equal(await page.locator('#mesa-proximos').isVisible(), true);
    assert.match(await page.locator('#mesa-tabela-julgamentos tbody tr:nth-child(1) td:nth-child(10)').innerText(), /Disponível/);
    assert.equal(await page.locator('#mesa-tabela-analises tbody tr td:nth-child(8)').innerText(), 'Homologada');
    await foto('3-mesa-homologada');

    // Carregar uma análise gravada restaura respostas e regras.
    await page.locator('#mesa-tabela-respostas input[data-id="amb1-r2"]').uncheck();
    await page.locator('#mesa-rc').fill('0.05');
    await page.locator('#mesa-tabela-analises input[data-id="an-novo-1"]').check();
    await page.locator('#mesa-anl-ctl-carregar').click();
    assert.equal(await page.locator('#mesa-rc').inputValue(), '0.08');
    assert.equal(await page.locator('#mesa-nome').inputValue(), 'Rodada final — revisão');
    assert.equal(await page.locator('#mesa-tabela-respostas input[data-id="amb1-r2"]').isChecked(), true);

    // Julgamento já homologado: a mesa parte do resultado oficial.
    await page.locator('#mesa-tabela-julgamentos input[data-id="amb2"]').check();
    await page.waitForFunction(() => /Consolidação oficial/.test(document.querySelector('#mesa-origem').textContent));
    assert.equal(await page.locator('#mesa-nome').inputValue(), 'Consolidação oficial — revisão');
    const oficial = cenario.analisesPor.amb2[0];
    assert.equal(await kpi('rc'), Number(oficial.razao_consistencia).toFixed(3));
    assert.equal(await page.locator('#mesa-tabela-pesos tbody tr:nth-child(1) td:nth-child(9)').innerText(), Math.max(...oficial.pesos_consolidados).toFixed(3));
    assert.match(await page.locator('#mesa-tabela-pesos tbody tr:nth-child(1) td:nth-child(10)').innerText(), /^0\.0 p\.p\.$/, 'prévia idêntica ao homologado');
    assert.equal(await page.locator('#mesa-tabela-analises tbody tr td:nth-child(10)').innerText(), '0.0 p.p.');

    // Julgamento sem respostas: mesa vazia, nada habilita gravação.
    await page.locator('#mesa-tabela-julgamentos input[data-id="amb3"]').check();
    await page.waitForFunction(() => /ainda não há respostas/i.test(document.querySelector('#mesa-origem').textContent));
    assert.equal(await kpi('incluidas'), '0 de 0');
    assert.equal(await page.locator('#mesa-salvar').isDisabled(), true);
    assert.equal(await page.locator('#mesa-exportar').isDisabled(), true);

    // Fechar a mesa ao limpar a seleção.
    await page.locator('#mesa-jul-ctl-limpar').click();
    assert.equal(await page.locator('#mesa').isVisible(), false);
    assert.deepEqual(erros, []);

    // Falha do servidor ao gravar: erro explícito e nenhuma análise fantasma.
    const pagina2 = await browser.newPage({ viewport: { width: 1440, height: 900 } }), erros2 = [];
    pagina2.on('pageerror', e => erros2.push(e.message));
    const cenario2 = criarCenario(); await instalarRotas(pagina2, cenario2, { falharAoSalvar: true });
    await pagina2.goto(PAGINA + '?julgamento=amb1');
    await pagina2.locator('#mesa').waitFor({ state: 'visible' });
    assert.equal(await pagina2.locator('#mesa-tabela-julgamentos input[data-id="amb1"]').isChecked(), true, 'o endereço recupera o julgamento');
    await pagina2.waitForFunction(() => document.querySelector('#mesa-k-rc').textContent !== '—');
    await pagina2.locator('#mesa-salvar').click();
    await pagina2.locator('#pfsStatusOverlay .pfs-box.pfs-active').waitFor({ state: 'visible' });
    assert.match(await pagina2.locator('#pfsStatusOverlay .pfs-box.pfs-active').innerText(), /Nenhuma resposta enviada atende/);
    assert.equal(cenario2.analisesPor.amb1.length, 0);
    assert.deepEqual(erros2, []);

    // Telas estreitas: a página não ganha rolagem horizontal; só as tabelas rolam.
    const movel = await browser.newPage({ viewport: { width: 390, height: 800 } });
    await instalarRotas(movel, criarCenario());
    await movel.goto(PAGINA + '?julgamento=amb1');
    await movel.locator('#mesa').waitFor({ state: 'visible' });
    await movel.waitForFunction(() => document.querySelector('#mesa-k-rc').textContent !== '—');
    assert.ok(await movel.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'sem rolagem horizontal da página');
    if (capturas) await movel.screenshot({ path: `${capturas}/4-mesa-movel.png`, fullPage: true });

    // Modo demonstração: funciona sem tocar a API de comparação colaborativa.
    const demo = await browser.newPage({ viewport: { width: 1440, height: 900 } }), requisicoes = [], errosDemo = [];
    demo.on('pageerror', e => errosDemo.push(e.message));
    await demo.route('**/api/**', r => {
      const caminho = new URL(r.request().url()).pathname;
      if (caminho.includes('comparacao-colaborativa')) requisicoes.push(caminho);
      if (caminho === '/api/auth/session') return r.fulfill({ json: { authenticated: true, user: { id: 'u', tipo_usuario: 'ANALISTA' } } });
      return r.fulfill({ json: { id: 'u', tipo_usuario: 'ANALISTA' } });
    });
    await demo.goto(PAGINA + '?demo=1');
    await demo.locator('#mesa-tabela-julgamentos tbody tr').first().waitFor();
    await demo.locator('#mesa-tabela-julgamentos input[data-id="demo1"]').check();
    await demo.waitForFunction(() => document.querySelector('#mesa-k-rc').textContent !== '—');
    await demo.locator('#mesa-salvar').click();
    await demo.locator('#pfsStatusOverlay .pfs-box.pfs-active').waitFor({ state: 'visible' });
    await demo.locator('#pfsStatusOverlay .pfs-box.pfs-active .pfs-close').click();
    await demo.waitForFunction(() => document.querySelectorAll('#mesa-tabela-analises tbody tr:not(:has(.ami-empty))').length === 1);
    assert.equal(requisicoes.length, 0, 'o modo demonstração não chama a API real');
    assert.deepEqual(errosDemo, []);
    console.log('PASS: Mesa de consolidação — cálculo, regras, abas, gravação, homologação, carga, vazio, erro, demo e tela estreita');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
