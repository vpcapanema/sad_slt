// Fase 2, seção 5: “Índices por Demanda e Feição” à esquerda e “Onde as Demandas se Sobrepõem” à direita.
// Página real renderizada pelo servidor; o conteúdo dos painéis é substituído por blocos de teste, só para medir o layout.
const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs'), http = require('node:http'), path = require('node:path');
const {execFileSync} = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const ROTA = '/restrict/hierarquizacao/fase-2/';

(async () => {
  const python = path.join(root, '.venv', process.platform === 'win32' ? 'Scripts' : 'bin', process.platform === 'win32' ? 'python.exe' : 'python');
  const html = JSON.parse(execFileSync(python, ['-B', '-X', 'utf8', '-c', [
    'import json', 'from fastapi.testclient import TestClient', 'from api.server import app',
    `r = TestClient(app).get(${JSON.stringify(ROTA)})`, 'assert r.status_code == 200', 'print(json.dumps(r.text))',
  ].join('\n')], {cwd: root, encoding: 'utf8'}));
  const server = http.createServer((req, res) => {
    const nome = new URL(req.url, 'http://local').pathname;
    if (nome === ROTA) { res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(html); return; }
    const relativo = nome.replace(/^\/restrict\/geoespacial\//, '/geoespacial/').replace(/^\/restrict\/hierarquizacao\//, '/hierarquizacao/');
    const arquivo = path.resolve(root, `.${relativo}`);
    if (path.relative(root, arquivo).startsWith('..')) { res.writeHead(403).end(); return; }
    fs.readFile(arquivo, (erro, dados) => {
      if (erro) { res.writeHead(404).end(); return; }
      res.setHeader('Content-Type', arquivo.endsWith('.js') ? 'text/javascript; charset=utf-8' : arquivo.endsWith('.css') ? 'text/css' : 'application/octet-stream');
      res.end(dados);
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  let browser;
  try {
    browser = await chromium.launch({headless: true,
      channel: process.env.SICARD_TEST_BROWSER || (process.platform === 'win32' ? 'msedge' : undefined),
      args: ['--no-proxy-server', '--enable-unsafe-swiftshader']});
    const page = await browser.newPage({viewport: {width: 1440, height: 1000}});
    const erros = [];
    page.on('pageerror', erro => erros.push(erro.message));
    await page.route('https://**/*', request => request.abort());
    await page.route('**/api/**', request => request.fulfill({json: []}));
    await page.route('**/fase2-favorabilidade-v2.js*', request => request.fulfill({body: '', contentType: 'text/javascript'}));
    await page.route('**/extracao-atributos/app.js*', request => request.fulfill({body: '', contentType: 'text/javascript'}));
    await page.route('**/geoespacial/bancada/', request => request.fulfill({body: '<!doctype html><title>Bancada</title>', contentType: 'text/html'}));
    await page.goto(base + ROTA, {waitUntil: 'domcontentloaded'});
    await page.evaluate(() => {
      document.querySelector('#ev-resultados-conteudo').hidden = false;
      const linhas = Array.from({length: 60}, (_, i) => `<div class="fv-intervalo-linha"><button class="fv-demanda-nome">Demanda ${i} com um nome razoavelmente longo para testar a quebra de linha</button><div class="fv-intervalo-conteudo">intervalo</div></div>`).join('');
      document.querySelector('#ev-resultados-indices-grafico').innerHTML =
        `<div class="fv-grafico-superficie"><h4>Superfície</h4><div class="fv-intervalos-rolagem"><div class="fv-intervalos-quadro">${linhas}</div></div></div>`;
    });
    const medir = () => page.evaluate(() => {
      const r = seletor => document.querySelector(seletor).getBoundingClientRect();
      const grade = r('.evr-analise'), indices = r('.secao-favorabilidade-sobreposicoes'), mapa = r('.secao-favorabilidade-mapa');
      const corpo = r('#ev-resultados .ea-section-body'), g = document.querySelector('.evr-analise');
      const filhos = [...document.querySelectorAll('.secao-favorabilidade-sobreposicoes *, .secao-favorabilidade-mapa *')]
        .filter(n => n.offsetParent && !n.closest('.fv-intervalos-rolagem') && !n.closest('.evr-grafico-conteudo'));
      const vazam = filhos.filter(n => { const b = n.getBoundingClientRect(); const p = n.closest('.evr-painel').getBoundingClientRect(); return b.width && (b.right > p.right + 1 || b.left < p.left - 1); }).map(n => n.className || n.tagName);
      return {grade, indices, mapa, corpo, vazam, rolagemGrade: g.scrollWidth - g.clientWidth,
        direitaCorpo: document.querySelector('#ev-resultados .ea-section-body').getBoundingClientRect().right,
        docLargura: document.documentElement.scrollWidth - document.documentElement.clientWidth};
    });

    for (const largura of [1440, 1200, 1120]) {
      await page.setViewportSize({width: largura, height: 1000});
      const m = await medir();
      assert.ok(m.indices.right <= m.mapa.left, `${largura}px: índices à esquerda, sem sobreposição ao mapa`);
      assert.ok(m.indices.left >= m.grade.left - 1 && m.mapa.right <= m.grade.right + 1, `${largura}px: painéis dentro do container`);
      assert.ok(m.mapa.right <= m.corpo.right, `${largura}px: dentro do corpo da seção`);
      assert.ok(Math.abs(m.indices.height - m.mapa.height) < 2, `${largura}px: mesma altura`);
      assert.ok(m.indices.width > 380 && m.mapa.width > 380, `${largura}px: larguras legíveis (${m.indices.width}/${m.mapa.width})`);
      assert.equal(m.rolagemGrade, 0, `${largura}px: sem rolagem horizontal na grade`);
      assert.deepEqual(m.vazam, [], `${largura}px: nenhum elemento vaza do painel`);
      assert.equal(m.docLargura, 0, `${largura}px: página sem rolagem horizontal`);
    }
    // Em telas estreitas as seções empilham, mantendo os índices antes do mapa.
    await page.setViewportSize({width: 900, height: 1000});
    const estreita = await medir();
    assert.ok(estreita.indices.bottom <= estreita.mapa.top + 1 && Math.abs(estreita.indices.left - estreita.mapa.left) < 2, 'Empilhadas abaixo de 1100px');
    assert.equal(estreita.docLargura, 0);
    assert.deepEqual(erros, []);
    if (process.env.SICARD_SCREENSHOT_DIR) {
      fs.mkdirSync(process.env.SICARD_SCREENSHOT_DIR, {recursive: true});
      await page.setViewportSize({width: 1440, height: 1000});
      await page.locator('.evr-analise').screenshot({path: path.join(process.env.SICARD_SCREENSHOT_DIR, 'fase2-lado-a-lado.png')});
    }
    console.log('PASS: fase 2, seção 5 — índices à esquerda e mapa à direita, sem sobreposição nem vazamento; empilha abaixo de 1100px.');
  } finally {
    await browser?.close();
    server.closeAllConnections?.();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(erro => { console.error(erro); process.exitCode = 1; });
