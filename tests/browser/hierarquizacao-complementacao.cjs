// Interface real; todas as APIs são interceptadas. Nenhum banco ou e-mail é acionado.
const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs'), http = require('node:http'), path = require('node:path');
const {execFileSync} = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const rotas = ['/restrict/complementacao/', '/restrict/hierarquizacao/', '/restrict/hierarquizacao/fase-3/', '/restrict/agrupamento-demandas/'];
const coluna = {id: 'beneficio', alias: 'Benefício', criterio: 'Benefício', tipo: 'numerico', mandatorio: true};
const objeto = codigo => ({cabecalho_objeto: {codigo, nome: 'Mesmo nome', tipo_demanda: 'projeto',
  atributos: {atributos_cadastrais: {capex_estimado: 10, prazo_referencia_meses: 12, maturidade_objeto: 'Estudo',
    base_estimativa_capex: 'Definido', base_estimativa_prazo: 'Definido'}},
  atributos_fase3: {beneficio: {valor_bruto: 4}}}, hierarquizacao: {}});
const hierarquia = () => ({codigo: 'H1', nome: 'Rodada teste', status: 'em_julgamento', pode_editar: true,
  colunas: [coluna], dominios: [
    {codigo: 'capex_estimado', nome: 'Custo de investimento', tipo_dado: 'monetario', tipos_objeto: ['projeto']},
    {codigo: 'prazo_referencia_meses', nome: 'Prazo', tipo_dado: 'inteiro', tipos_objeto: ['projeto']},
    ...['maturidade_objeto', 'base_estimativa_capex', 'base_estimativa_prazo'].map(codigo => ({
      codigo, nome: codigo, tipo_dado: 'categoria', tipos_objeto: ['projeto'],
      dominio_valores: [{rotulo: 'Estudo'}, {rotulo: 'Definido'}],
    })),
  ],
  dados_hierarquizacao: {cabecalho_grupo: {tipo_demanda: 'projeto', fases_a_executar: [1, 2, 3]},
    objetos: ['D1', 'D2'].map(objeto)}});

(async () => {
  const python = path.join(root, '.venv', 'Scripts', 'python.exe');
  const paginas = JSON.parse(execFileSync(python, ['-B', '-X', 'utf8', '-c', [
    'import json', 'from fastapi.testclient import TestClient', 'from api.server import app',
    'c = TestClient(app)', `rotas = ${JSON.stringify(rotas)}`,
    'paginas = {p: c.get(p) for p in rotas}', 'assert all(r.status_code == 200 for r in paginas.values())',
    'print(json.dumps({p: r.text for p, r in paginas.items()}))',
  ].join('\n')], {cwd: root, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024}));
  const server = http.createServer((req, res) => {
    const nome = new URL(req.url, 'http://local').pathname;
    if (paginas[nome]) { res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(paginas[nome]); return; }
    const relativo = nome.replace(/^\/restrict\/hierarquizacao\//, '/hierarquizacao/')
      .replace(/^\/restrict\/demandas.js$/, '/admin/demandas.js');
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
    browser = await chromium.launch({channel: process.env.SICARD_TEST_BROWSER || 'msedge', headless: true, args: ['--no-proxy-server']});
    const page = await browser.newPage({viewport: {width: 1440, height: 1000}});
    const erros = [], chamadas = [];
    let perfil = 'OPERADOR', falharGravacao = false, falharLista = false, falharPedido = false, edicao = true, outraRodada = false;
    let dados = hierarquia();
    page.on('pageerror', erro => erros.push(erro.message));
    await page.route('https://**/*', route => route.abort());
    await page.route('**/api/**', async route => {
      const req = route.request(), url = new URL(req.url()), p = url.pathname;
      chamadas.push({p, query: url.search, method: req.method(), body: req.postDataJSON()});
      let body = [];
      if (p === '/api/auth/me') body = {id: 'u1', nome: 'Teste', tipo_usuario: perfil};
      else if (p === '/api/auth/session') body = {authenticated: true, user: {id: 'u1', tipo_usuario: perfil}};
      else if (p === '/api/complementacao/objetos') {
        if (falharLista) return route.fulfill({status: 503, json: {detail: 'Pendências indisponíveis'}});
        body = (perfil === 'ADMIN' ? ['D1', 'D2'] : ['D1']).map(codigo => ({
          hierarquizacao_codigo: 'H1', hierarquizacao_nome: 'Rodada teste', objeto_codigo: codigo,
          objeto_nome: 'Mesmo nome', pode_editar: edicao, solicitacoes: [], situacao_complementacao: 'pendente',
        }));
      } else if (p === '/api/complementacao/hierarquizacoes/H1') {
        if (req.method() === 'PATCH') {
          if (falharGravacao) return route.fulfill({status: 422, json: {detail: 'Valor inválido para benefício'}});
          const payload = req.postDataJSON();
          for (const [codigo, valores] of Object.entries(payload.valores)) {
            const cab = dados.dados_hierarquizacao.objetos.find(o => o.cabecalho_objeto.codigo === codigo).cabecalho_objeto;
            for (const [id, valor] of Object.entries(valores)) {
              if (id.startsWith('cadastro:')) cab.atributos.atributos_cadastrais[id.slice(9)] = valor;
              else cab.atributos_fase3[id] = {valor_bruto: valor};
            }
            cab.complementacao_atributos = {concluida: true, automatica: true, pendencias: []};
            cab.status = outraRodada ? 'hierarq_aguardando_complementacao' : 'hierarq_em_andamento';
          }
        }
        body = structuredClone(dados);
        body.pode_editar = edicao;
        if (url.searchParams.has('demanda_codigo')) body.dados_hierarquizacao.objetos =
          body.dados_hierarquizacao.objetos.filter(o => o.cabecalho_objeto.codigo === url.searchParams.get('demanda_codigo'));
      } else if (p === '/api/complementacao/hierarquizacoes/H1/solicitar') {
        if (falharPedido) return route.fulfill({status: 503, json: {detail: 'Serviço indisponível'}});
        body = {codigo: 'H1', mensagem: 'Pedidos registrados; envio parcialmente realizado.', solicitacoes: [{id: 'S1'}],
          envios: [
            {demanda_codigo: 'D1', status: 'aceito_smtp', detalhe: 'Servidor aceitou a mensagem'},
            {demanda_codigo: 'D2', status: 'erro', detalhe: 'Servidor recusou o destinatário'},
            {demanda_codigo: 'D3', status: 'indeterminado', detalhe: 'Conexão interrompida'},
            {demanda_codigo: 'D4', status: 'sem_destinatario', detalhe: 'Cadastre o responsável'},
            {demanda_codigo: 'D5', status: 'enviando', detalhe: 'Aguarde a tentativa atual'},
          ]};
      } else if (p === '/api/ahp/hierarquizacoes') body = req.method() === 'POST' ? dados : [dados];
      else if (p === '/api/ahp/hierarquizacoes/H1') body = dados;
      else if (p === '/api/agrupamentos-demandas') body = [{id: 'G1', codigo: 'G1', nome: 'Grupo', tipo_demanda: 'projeto'}];
      else if (p === '/api/agrupamentos-demandas/G1') body = {id: 'G1', codigo: 'G1', nome: 'Grupo', tipo_demanda: 'projeto', objetos: [{codigo: 'D1', nome: 'Mesmo nome'}]};
      else if (p === '/api/ahp/hierarquizacoes/H1/colunas') body = {colunas: [coluna]};
      else if (p === '/api/dominios/atributos-objeto') body = dados.dominios;
      else if (p.includes('/instituicoes') || p.includes('/pessoas')) body = {data: []};
      await route.fulfill({json: body});
    });
    const stubConfirmacoes = () => page.evaluate(() => {
      window.__confirmar = true;
      SLTAdminUi.showConfirm = async () => window.__confirmar;
    });
    const principal = page.locator('#complementacao-hierarquizacao');
    const dinamico = page.locator('[data-atributo-objeto="D1"][data-atributo-coluna="beneficio"]');
    const status = page.locator('#complementacao-atributos-status');
    await page.goto(base + rotas[0]);
    await principal.locator('option[value]').nth(1).waitFor({state: 'attached'});
    assert.equal(await page.locator('#complementacao-seletor-label').innerText(), 'Demanda autorizada');
    assert.equal(await principal.locator('option').count(), 2);
    assert.match(await principal.innerText(), /D1.*Mesmo nome.*H1/);
    assert.doesNotMatch(await principal.innerText(), /D2/);
    await principal.selectOption(JSON.stringify(['H1', 'D1']));
    await dinamico.waitFor();
    await stubConfirmacoes();
    assert.equal(await page.locator('[data-atributos-tbody] tr').count(), 1);
    assert.equal(await page.locator('[data-atributo-objeto="D1"][data-atributo-coluna^="cadastro:"]').count(), 5);
    assert.ok(chamadas.some(c => c.query === '?demanda_codigo=D1'));
    assert.equal(await dinamico.isDisabled(), true);
    assert.equal(await page.locator('#complementacao-pedidos-atributos button').count(), 0);
    await page.locator('#complementacao-atributos-editar').click();
    await dinamico.fill('8');
    await page.evaluate(() => { window.__confirmar = false; });
    await principal.selectOption('');
    await page.waitForTimeout(100);
    assert.equal(await principal.inputValue(), JSON.stringify(['H1', 'D1']));
    assert.equal(await dinamico.inputValue(), '8');
    await page.locator('#complementacao-atributos-confirmar').click();
    await page.waitForFunction(() => document.querySelector('#complementacao-atributos-status').textContent.startsWith('Atributos salvos e status verificado'));
    assert.equal(chamadas.filter(c => c.p.endsWith('/concluir')).length, 0);
    const patch = chamadas.findLast(c => c.method === 'PATCH');
    assert.deepEqual(Object.keys(patch.body.valores), ['D1']);
    assert.match(await page.locator('#complementacao-concluir-demandas').innerText(), /Atributos completos nesta rodada: D1/);
    assert.equal(await page.getByRole('button', {name: /Concluir atributos/}).count(), 0);
    falharGravacao = true;
    await page.locator('#complementacao-atributos-editar').click();
    await dinamico.fill('12');
    await page.locator('#complementacao-atributos-confirmar').click();
    await page.waitForFunction(() => document.querySelector('#complementacao-atributos-status').textContent.includes('Valor inválido'));
    assert.match(await status.innerText(), /Valor inválido para benefício/);
    assert.equal(dados.dados_hierarquizacao.objetos[0].cabecalho_objeto.atributos_fase3.beneficio.valor_bruto, 8);
    falharGravacao = false;
    await page.locator('#complementacao-atributos-confirmar').click();
    await page.waitForFunction(() => document.querySelector('#complementacao-atributos-status').textContent.startsWith('Atributos salvos e status verificado'));

    perfil = 'ADMIN';
    await page.reload();
    await principal.locator('option[value="H1"]').waitFor({state: 'attached'});
    await principal.selectOption('H1');
    await page.locator('[data-atributo-objeto="D2"][data-atributo-coluna="beneficio"]').waitFor();
    await stubConfirmacoes();
    assert.equal(await page.locator('[data-atributos-tbody] tr').count(), 2);
    const antes = chamadas.filter(c => c.p.endsWith('/concluir')).length;
    outraRodada = true;
    await page.locator('#complementacao-atributos-editar').click();
    await page.locator('[data-atributo-objeto="D2"][data-atributo-coluna="beneficio"]').fill('9');
    await page.locator('#complementacao-atributos-confirmar').click();
    await page.waitForFunction(() => document.querySelector('#complementacao-atributos-status').textContent.startsWith('Atributos salvos e status verificado'));
    assert.match(await status.innerText(), /salvo pendência em outra rodada/);
    assert.equal(dados.dados_hierarquizacao.objetos[1].cabecalho_objeto.status, 'hierarq_aguardando_complementacao');
    assert.equal(chamadas.filter(c => c.p.endsWith('/concluir')).length, antes);
    await page.locator('#complementacao-demanda').selectOption('D1');
    await page.waitForFunction(() => document.querySelectorAll('[data-atributos-tbody] tr').length === 1);
    assert.ok(chamadas.findLast(c => c.method === 'GET' && c.p.endsWith('/H1')).query.includes('demanda_codigo=D1'));
    perfil = 'VISUALIZADOR'; edicao = false;
    await page.reload();
    await principal.locator('option').nth(1).waitFor({state: 'attached'});
    await principal.selectOption(JSON.stringify(['H1', 'D1']));
    await dinamico.waitFor();
    assert.equal(await page.locator('#complementacao-atributos-editar').isDisabled(), true);
    assert.equal(await page.getByRole('button', {name: /Concluir atributos/}).count(), 0);
    falharLista = true;
    await page.reload();
    await page.locator('#complementacao-atributos-recarregar').waitFor();
    assert.match(await status.innerText(), /Pendências indisponíveis/);
    falharLista = false; perfil = 'ANALISTA'; edicao = true;
    await page.locator('#complementacao-atributos-recarregar').click();
    await principal.locator('option').nth(1).waitFor({state: 'attached'});

    await page.goto(base + rotas[1]);
    await page.locator('#hier-loading').waitFor({state: 'hidden'});
    await page.evaluate(() => {
      ProcessFeedback.iniciarCadastro = () => ({tarefaAtual() {}, concluirTarefa() {}, sucesso() {}, erro(e) { throw new Error(e.message); }});
    });
    const cadastrar = async () => {
      await page.locator('#hier-new').click();
      await page.locator('#hier-nome').fill('Rodada teste');
      await page.locator('#hier-agrupamento option[value="G1"]').waitFor({state: 'attached'});
      await page.locator('#hier-agrupamento').selectOption('G1');
      await page.locator('#hier-criteria-matrix').setInputFiles({name: 'matriz.json', mimeType: 'application/json',
        buffer: Buffer.from(JSON.stringify([{id: 'beneficio', criterio: 'Benefício'}, {id: 'prazo', criterio: 'Prazo'}]))});
      await page.waitForFunction(() => document.querySelector('#hier-criteria-matrix-summary').textContent.includes('2 critérios carregados'));
      await page.locator('#nova-hierarquizacao button[type="submit"]').click();
      await page.locator('#hier-complementacao-pos-cadastro').waitFor();
      await page.locator('#hier-create-section').waitFor({state: 'hidden'}).catch(async erro => {
        console.error({erros, form: await page.locator('#form-error').innerText(),
          validade: await page.locator('#nova-hierarquizacao').evaluate(form => [...form.querySelectorAll(':invalid')].map(e => [e.id, e.validationMessage])),
          posts: chamadas.filter(c => c.method === 'POST')});
        throw erro;
      });
    };
    await cadastrar();
    const pedidosAntes = chamadas.filter(c => c.p.endsWith('/solicitar')).length;
    await page.locator('#hier-complementacao-depois').click();
    assert.equal(chamadas.filter(c => c.p.endsWith('/solicitar')).length, pedidosAntes);
    assert.match(await page.locator('#hier-complementacao-resultado').innerText(), /não criou pedido nem enviou e-mail/);
    await cadastrar();
    await page.locator('#hier-complementacao-agora').click();
    await page.waitForFunction(() => document.querySelector('#hier-complementacao-resultado').textContent.includes('parcialmente realizado'));
    const retorno = await page.locator('#hier-complementacao-resultado').innerText();
    assert.match(retorno, /Aceito pelo servidor SMTP \(não comprova entrega\)/);
    assert.match(retorno, /D2 — Falha no envio: Servidor recusou/);
    assert.match(retorno, /indeterminado/);
    assert.match(retorno, /Sem destinatário cadastrado/);
    assert.equal(chamadas.filter(c => c.p.endsWith('/solicitar')).length, pedidosAntes + 1);

    await page.goto(base + rotas[2] + '?codigo=H1');
    await page.locator('#fase3-complementacao').waitFor();
    await page.evaluate(() => { ProcessFeedback.confirmar = async () => true; });
    await page.locator('#fase3-solicitar-complementacao').click();
    await page.waitForFunction(() => document.querySelector('#fase3-complementacao-resultado').textContent.includes('parcialmente realizado'));
    assert.match(await page.locator('#fase3-complementacao-resultado').innerText(), /pedidos|Pedidos/);
    assert.equal(chamadas.findLast(c => c.p.endsWith('/solicitar')).body.descricao,
      'Complemente os atributos dos grupos Cadastro e Dinâmicos da tabela 2 para prosseguir com a hierarquização. O risco é obtido da Fase 1.');
    falharPedido = true;
    await page.locator('#fase3-solicitar-complementacao').click();
    await page.waitForFunction(() => document.querySelector('#fase3-complementacao-resultado').textContent.includes('Não foi possível confirmar'));
    assert.match(await page.locator('#fase3-complementacao-resultado').innerText(), /cadastro permanece salvo/);
    perfil = 'OPERADOR';
    await page.reload();
    await page.locator('#fase-hierarquizacao option[value="H1"]').waitFor({state: 'attached'});
    assert.equal(await page.locator('#fase3-complementacao').isVisible(), false);
    perfil = 'ANALISTA';
    const universo = ['analise_aprovada', 'hierarq_em_andamento', 'hierarq_aguardando_complementacao', 'analise_reprovada']
      .map((situacao, i) => ({id: String(i + 1), codigo: `PRJ-${i + 1}`, nome: `Projeto ${i + 1}`, status: situacao, tipo_demanda: 'projeto'}));
    await page.route('**/api/ahp/universo/projeto?*', route => route.fulfill({json: universo}));
    await page.goto(base + rotas[3]);
    await page.locator('#agrupamento-new').click();
    await page.locator('#agrupamento-tipo').selectOption('projeto');
    await page.locator('[data-demanda-id="3"]').waitFor();
    assert.equal(await page.locator('[data-demanda-id]').count(), 3);
    assert.equal(await page.locator('[data-demanda-id="4"]').count(), 0);
    await page.locator('[data-demanda-id="3"]').check();
    await page.locator('#grupo-adicionar').click();
    await page.locator('[data-membro-id="3"]').waitFor();
    assert.match(await page.locator('#grupo-composicao-rows').innerText(), /PRJ-3/);
    const painel = await browser.newPage();
    await painel.setContent(['demandas', 'analise', 'aptas', 'hierarquizacao', 'finalizadas', 'publicadas']
      .map(id => `<span id="stat-${id}"></span>`).join(''));
    await painel.evaluate(items => {
      window.SLTAdminAuth = {requireAuth: async () => ({tipo_usuario: 'ADMIN'})};
      window.SLTAdminApi = {listDemandas: async () => items,
        listPlanos: async () => [], listProgramas: async () => [], listObjetosAhp: async () => []};
    }, universo);
    await painel.addScriptTag({content: fs.readFileSync(path.join(root, 'assets', 'js', 'paginas', 'admin-index-inline-1.js'), 'utf8')});
    await painel.waitForFunction(() => document.querySelector('#stat-hierarquizacao').textContent === '2');
    assert.equal(await painel.locator('#stat-demandas').innerText(), '4');
    await painel.close();
    assert.deepEqual(erros, []);
    console.log('OK: cadastro Agora/Depois, Fase 3, SMTP parcial/erro, permissões, demanda autorizada, rascunhos, validação, conclusão automática, multirrodadas, grupo e indicadores com novo status; somente mocks.');
  } finally { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(erro => {console.error(erro); process.exitCode = 1;});
