const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs'), http = require('node:http'), path = require('node:path');
const {execFileSync} = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const rota = '/restrict/hierarquizacao/fase-3/';
const rodada = (codigo, pendente, desatualizada) => ({codigo, nome: codigo, dados_hierarquizacao: {
  cabecalho_grupo: {tipo_demanda: 'projeto'},
  objetos: [{cabecalho_objeto: {codigo: 'D1', nome: 'Demanda teste', tipo_demanda: 'projeto', atributos: {},
    complementacao_atributos: {concluida: !pendente}},
  hierarquizacao: {fase_3: {executada: true, score_fase3: 0.75, ranking_fase3: 1, grau_completude_fase3: 1,
    ...(desatualizada ? {desatualizado: {por: 'atributos', em: '2026-10-27T10:00:00'}} : {})}}}],
}});
(async () => {
  const html = JSON.parse(execFileSync(path.join(root, '.venv', 'Scripts', 'python.exe'), ['-B', '-X', 'utf8', '-c', [
    'import json', 'from fastapi.testclient import TestClient', 'from api.server import app',
    `r = TestClient(app).get(${JSON.stringify(rota)})`, 'assert r.status_code == 200', 'print(json.dumps(r.text))',
  ].join('\n')], {cwd: root, encoding: 'utf8'}));
  const server = http.createServer((req, res) => {
    const nome = new URL(req.url, 'http://local').pathname;
    if (nome === rota) { res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(html); return; }
    const arquivo = path.resolve(root, '.' + nome.replace(/^\/restrict\/hierarquizacao\//, '/hierarquizacao/'));
    if (path.relative(root, arquivo).startsWith('..')) { res.writeHead(403).end(); return; }
    fs.readFile(arquivo, (erro, dados) => {
      if (erro) { res.writeHead(404).end(); return; }
      res.setHeader('Content-Type', arquivo.endsWith('.js') ? 'text/javascript; charset=utf-8' : arquivo.endsWith('.css') ? 'text/css' : 'application/octet-stream');
      res.end(dados);
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({channel: process.env.SICARD_TEST_BROWSER || 'msedge', headless: true, args: ['--no-proxy-server']});
    const page = await browser.newPage();
    const erros = [];
    page.on('pageerror', erro => erros.push(erro.message));
    const rodadas = [rodada('ATUAL', false, false), rodada('COLETA', true, false),
      rodada('ANTIGA', false, true), rodada('AMBOS', true, true)];
    await page.route('https://**/*', route => route.abort());
    await page.route('**/api/**', route => {
      const url = new URL(route.request().url()), p = url.pathname;
      let json = [];
      if (p === '/api/auth/me') json = {id: 'u1', nome: 'Teste', tipo_usuario: 'ADMIN'};
      else if (p === '/api/auth/session') json = {authenticated: true};
      else if (p === '/api/ahp/hierarquizacoes') json = rodadas;
      else if (p.endsWith('/colunas')) json = {colunas: []};
      else if (p === '/api/ahp/hierarquizacoes/ANTIGA/fases/3/executar') json = rodada('ANTIGA', false, false);
      else if (p.startsWith('/api/ahp/hierarquizacoes/')) json = rodadas.find(h => h.codigo === p.split('/').at(-1)) || [];
      return route.fulfill({json});
    });
    await page.goto(`http://127.0.0.1:${server.address().port}${rota}`);
    const seletor = page.locator('#fase-hierarquizacao'), aviso = page.locator('#fase3-resultados-aviso');
    await seletor.locator('option[value="ATUAL"]').waitFor({state: 'attached'});
    await seletor.selectOption('ATUAL');
    await page.waitForFunction(() => document.querySelector('#fase3-resultados').textContent.includes('0.7500'));
    assert.equal(await aviso.isVisible(), false);
    assert.equal(await aviso.getAttribute('role'), 'status');
    assert.equal(await aviso.getAttribute('aria-live'), 'polite');
    for (const codigo of ['COLETA', 'ANTIGA', 'AMBOS']) {
      await seletor.selectOption(codigo);
      await page.waitForFunction(() => document.querySelector('#fase3-resultados').textContent.includes('Não calculado'));
      assert.equal(await aviso.isVisible(), false);
      assert.doesNotMatch(await page.locator('#fase3-resultados').innerText(), /0\.7500/,
        'resultado antigo não deve aparecer como atual');
      assert.doesNotMatch(await page.locator('#fase3-tabela-sintese').innerText(), /0\.7500/,
        'síntese antiga não deve aparecer como atual');
      assert.equal(await page.locator('#sintetizar').isDisabled(), true);
    }
    await seletor.selectOption('ANTIGA');
    await page.evaluate(() => {
      ProcessFeedback.confirmar = async () => true;
      ProcessFeedback.iniciarCadastro = () => ({tarefaAtual() {}, concluirTarefa() {}, sucesso() {}, erro() {}});
    });
    await page.locator('#executar-fase3').click();
    await aviso.waitFor({state: 'hidden'});
    await page.waitForFunction(() => document.querySelector('#fase3-indicadores').textContent.includes('Com score atual'));
    assert.match(await page.locator('#fase3-resultados').innerText(), /0\.7500/);
    assert.deepEqual(erros, []);
    console.log('PASS: resultados antigos nunca aparecem como atuais; a execução da Fase 3 grava e exibe somente resultados do cálculo corrente. APIs simuladas.');
  } finally { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(erro => {console.error(erro); process.exitCode = 1;});
