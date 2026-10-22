const {chromium} = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({channel: 'msedge', headless: true});
  try {
    const page = await browser.newPage({viewport: {width: 1440, height: 1000}});
    const errors = [], requests = [];
    page.on('pageerror', error => errors.push(error.message));
    const rows = Array.from({length: 18}, (_, i) => ({id: `PRJ-${i + 1}`, nome: `Projeto teste ${i + 1}`, status: 'analise_aguardando_complementacao', criadoEm: '2026-10-14T12:00:00-03:00', criadoPorNome: 'Responsável', descricao: 'Descrição cadastral', representante: {nome: 'Representante'}, complementos: {}}));
    const dominios = [
      {codigo: 'capex_estimado', nome: 'Custo de investimento', tipo_dado: 'monetario', unidade: 'R$', tipos_objeto: ['projeto']},
      {codigo: 'prazo_referencia_meses', nome: 'Prazo de implantação', tipo_dado: 'inteiro', unidade: 'meses', tipos_objeto: ['projeto']},
      {codigo: 'maturidade_objeto', nome: 'Maturidade', tipo_dado: 'categoria', tipos_objeto: ['projeto'],
        configuracao_por_tipo: {projeto: {opcoes: [{rotulo: 'Nível 1 — Ideia'}, {rotulo: 'Nível 2 — Estudo'}]}}},
    ];
    const colunas = [{id: 'custo', alias: 'Custo anual', tipo: 'numerico', unidade: 'R$/ano', mandatorio: true},
      {id: 'capex_custo_de_investimento', alias: 'Capex duplicado', tipo: 'numerico'},
      {id: 'aprovado', alias: 'Aprovado', tipo: 'booleano'}, {id: 'observacao', alias: 'Observação', tipo: 'texto'},
      {id: 'percentual', alias: 'Participação', tipo: 'numerico', formato: 'decimal', unidade: '%'},
      {id: 'distancia', alias: 'Extensão', tipo: 'numerico', formato: 'decimal', unidade: 'km'},
      {id: 'contagem', alias: 'Quantidade', tipo: 'numerico', formato: 'inteiro', unidade: 'número'}];
    const nomeLongo = 'Projeto PRJ-1 — Implantação integrada de infraestrutura para mobilidade regional e conexão com os polos logísticos — IdentificadorSemEspacosABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const objeto = codigo => ({cabecalho_objeto: {codigo, nome: codigo === 'PRJ-1' ? nomeLongo : `Projeto ${codigo}`, tipo_demanda: 'projeto',
      atributos: {atributos_cadastrais: {capex_estimado: 500, prazo_referencia_meses: 12, maturidade_objeto: 'Nível 1 — Ideia'}},
      atributos_fase3: {aprovado: {origem: 'gestor', valor_bruto: false},
        percentual: {valor_bruto: 12.5}, distancia: {valor_bruto: 1234.56789}, contagem: {valor_bruto: 1234}}}});
    const salvos = new Map(['H1', 'H2'].map(codigo => [codigo, {codigo, nome: codigo === 'H1' ? 'Matriz vigente' : 'Outra rodada',
      criado_em: '2026-10-20T12:00:00-03:00', pode_editar: true, colunas, dominios,
      dados_hierarquizacao: {objetos: (codigo === 'H1' ? ['PRJ-1', 'PRJ-2'] : ['PRJ-FORA']).map(objeto)}}]));
    salvos.set('H3', {...salvos.get('H1'), codigo: 'H3', nome: 'Rodada paginada',
      dados_hierarquizacao: {objetos: Array.from({length: 18}, (_, i) => objeto(`PAG-${i + 1}`))}});
    const campo = (id, codigo = 'PRJ-1') => page.locator(`[data-atributo-objeto="${codigo}"][data-atributo-coluna="${id}"]`);
    let falharGravacao = false, falharCarga = false;
    const mockApi = async route => {
      const req = route.request(), path = new URL(req.url()).pathname;
      requests.push({path, method: req.method(), body: req.postData()});
      let body = [];
      if (path === '/api/auth/me') body = {id: 'u1', nome: 'Operador teste', tipo_usuario: 'OPERADOR'};
      else if (path === '/api/auth/session') body = {authenticated: true, user: {id: 'u1', tipo_usuario: 'OPERADOR'}};
      else if (path === '/api/dominios/status-demanda') body = [{codigo: 'analise_aguardando_complementacao', nome: 'Aguardando complementação'}];
      else if (path === '/api/complementacao/demandas/projeto') body = rows;
      else if (path === '/api/complementacao/demandas/plano') body = [{...rows[0], id: 'PLN-1', nome: 'Plano teste'}];
      else if (path === '/api/complementacao/demandas/programa') body = [];
      else if (path.endsWith('/cadastro')) body = {...rows[0], ...JSON.parse(req.postData())};
      else if (path === '/api/complementacao/demandas/projeto/PRJ-1') body = rows[0];
      else if (path === '/api/complementacao/demandas/plano/PLN-1') body = {...rows[0], id: 'PLN-1', nome: 'Plano teste'};
      else if (path === '/api/complementacao/objetos') {
        if (falharCarga) return route.fulfill({status: 503, json: {detail: 'Falha temporária ao carregar atributos'}});
        body = [...salvos.values()].flatMap(h => h.dados_hierarquizacao.objetos.map(o => ({
          hierarquizacao_codigo: h.codigo, hierarquizacao_nome: h.nome, objeto_codigo: o.cabecalho_objeto.codigo,
        })));
      }
      else if (path === '/api/dominios/atributos-objeto') body = dominios;
      else if (path.endsWith('/colunas')) body = {colunas};
      else if (salvos.has(path.replace('/api/complementacao/hierarquizacoes/', ''))) {
        const chave = path.replace('/api/complementacao/hierarquizacoes/', '');
        body = salvos.get(chave);
        if (req.method() === 'PATCH') {
          if (falharGravacao) return route.fulfill({status: 503, json: {detail: 'Não foi possível salvar os atributos'}});
          for (const [codigo, valores] of Object.entries(JSON.parse(req.postData()).valores)) {
            const cab = body.dados_hierarquizacao.objetos.find(o => o.cabecalho_objeto.codigo === codigo).cabecalho_objeto;
            for (const [id, valor] of Object.entries(valores)) {
              if (id.startsWith('cadastro:')) cab.atributos.atributos_cadastrais[id.slice(9)] = valor;
              else cab.atributos_fase3[id] = {origem: 'complementacao', valor_bruto: valor};
            }
          }
          await new Promise(resolve => setTimeout(resolve, 150));
        }
      }
      else if (path.includes('/instituicoes') || path.includes('/pessoas')) body = {data: []};
      await route.fulfill({json: body});
    };
    await page.route('**/api/**', mockApi);
    await page.goto('http://127.0.0.1:8083/restrict/complementacao/');
    const table = page.locator('[data-demandas-table="projeto"]');
    await table.locator('tbody tr').first().waitFor();
    assert.equal(await table.locator('tbody tr').count(), 15);
    assert.equal(await page.locator('#complementacao-selecao').isVisible(), false);
    assert.ok(!(await page.locator('main').innerText()).includes('Selecione uma demanda na tabela para complementar.'));
    await page.locator('#demandas-page-size').selectOption('25');
    assert.equal(await table.locator('tbody tr').count(), 18);
    await page.locator('#demandas-page-size').selectOption('15');
    assert.equal(await table.locator('th').count(), 22);
    assert.equal(await page.getByRole('heading', {name: '1. Complementação de Dados Cadastrais e Geometria', exact: true}).isVisible(), true);
    assert.equal(await page.getByRole('heading', {name: '2. Complementação de Atributos de demanda', exact: true}).isVisible(), true);
    assert.equal(await page.locator('[data-complementacao="atributos"]').count(), 0);
    await page.locator('#complementacao-hierarquizacao option[value="H1"]').waitFor({state: 'attached'});
    await page.locator('#complementacao-hierarquizacao').selectOption('H1');
    await campo('custo').waitFor({state: 'visible'});
    assert.equal(await campo('custo').isDisabled(), true);
    assert.equal(await page.locator('[data-atributos-tbody] tr').count(), 2);
    assert.equal(await page.locator('[data-atributos-thead] th').count(), 10);
    const legenda = page.locator('#complementacao-campos .atributos-legenda');
    assert.equal(await legenda.count(), 1);
    assert.equal(await legenda.innerText(), 'Consulte os valores salvos. Use Editar atributos para complementar; confirme para gravar ou cancele para descartar as alterações.');
    assert.equal(await legenda.evaluate(el => Boolean(el.compareDocumentPosition(document.querySelector('.atributos-table-shell')) & Node.DOCUMENT_POSITION_FOLLOWING)), true);
    assert.equal(await page.locator('#complementacao-atributos-status').innerText(), '');
    assert.equal(await page.locator('#complementacao-atributos-summary').innerText(), '2 na página / 2 no total');
    assert.equal(await page.locator('#complementacao-atributos-pagination span').innerText(), 'Página 1 de 1');
    assert.equal(await campo('cadastro:capex_estimado').inputValue(), '500,00');
    assert.equal(await campo('percentual').inputValue(), '12,5');
    assert.equal(await campo('distancia').inputValue(), '1.234,56789');
    assert.equal(await campo('contagem').inputValue(), '1.234');
    assert.equal(await page.locator('[data-col-id="capex_custo_de_investimento"]').count(), 0);
    assert.equal(await page.locator('[data-atributos-pesos]').isVisible(), false);
    assert.equal(await page.locator('.atributo-valor-normalizado').first().isVisible(), false);
    assert.equal(await page.locator('#complementacao-demanda').count(), 0);
    const resumo = page.locator('#complementacao-resumo-hierarquizacao');
    assert.equal(await page.getByRole('heading', {name: '2.1 Resumo da hierarquização', exact: true}).isVisible(), true);
    assert.equal(await page.getByRole('heading', {name: '2.2 Critérios atributo de projeto', exact: true}).isVisible(), true);
    assert.equal(await resumo.locator('.fase1-meta-card').count(), 4);
    assert.equal(await resumo.locator('.fase1-meta-card').last().innerText(), 'DATA DE CRIAÇÃO\n20/10/2026');
    assert.equal(await resumo.locator('.fase1-meta-card').evaluateAll(cards => new Set(cards.map(card => card.getBoundingClientRect().top)).size), 1);
    const referencia = await browser.newPage({viewport: {width: 1440, height: 1000}});
    await referencia.route('**/api/**', mockApi);
    await referencia.goto('http://127.0.0.1:8083/restrict/hierarquizacao/fase-3/');
    await referencia.evaluate(async h => {
      SLTResumoFase.secao1(document.querySelector('#fase-resumo'), h);
      await AtributosObjetos.render(h);
    }, salvos.get('H1'));
    const papeis = {
      secao: ['#complementacao-atributos-titulo', '.secao-selecao-da-rodada .ahp-section-label span:not(.ahp-section-index-icon)'],
      secaoCadastral: ['#complementacao-cadastral-titulo', '.secao-selecao-da-rodada .ahp-section-label span:not(.ahp-section-index-icon)'],
      resumo: ['#complementacao-resumo-titulo', '.secao-selecao-da-rodada .ahp-subsection-title span:not(.cadastro-subsec-num)'],
      criterios: ['#fase3-titulo-atributos', '.secao-selecao-da-rodada .ahp-subsection-title span:not(.cadastro-subsec-num)'],
      rotulo: ['label[for="complementacao-hierarquizacao"]', '.secao-selecao-da-rodada label'],
      selecao: ['#complementacao-hierarquizacao', '.atributo-valor-normalizado'],
      ajuda: ['#complementacao-atributos > .admin-card-body > .field-help', '.step-intro'],
      metadado: ['.fase1-meta-card small', '.fase1-meta-card small'],
      valor: ['.fase1-meta-card strong', '.fase1-meta-card strong'],
      lista: ['.fase1-objs-card > h4', '.fase1-objs-card > h4'],
      nomeDemanda: ['.fase1-obj-link .nome', '.fase1-obj-link .nome'],
      codigoDemanda: ['.fase1-obj-link .cod', '.fase1-obj-link .cod'],
      cabecalho: ['[data-atributos-thead] .col-objeto', '[data-atributos-thead] .col-objeto'],
      atributo: ['.col-atributo-linha', '.col-atributo-linha'],
      unidade: ['.col-atributo-unidade', '.col-atributo-unidade'],
      codigoTabela: ['[data-atributos-tbody] .objeto-codigo', '[data-atributos-tbody] .objeto-codigo'],
      nomeTabela: ['[data-atributos-tbody] .objeto-nome', '[data-atributos-tbody] .objeto-nome'],
      campo: ['.atributo-input', '.atributo-valor-normalizado'],
      legenda: ['.atributos-legenda span', '.atributos-legenda span'],
      mensagem: ['#complementacao-atributos-status', '.ahp-help-text'],
    };
    const tipografia = async (alvo, indice) => alvo.evaluate(({papeis, indice}) => Object.fromEntries(
      Object.entries(papeis).map(([papel, seletores]) => {
        const elemento = document.querySelector(seletores[indice]);
        if (!elemento) throw new Error(`Elemento ausente: ${papel}`);
        return [papel, getComputedStyle(elemento).fontSize];
      })), {papeis, indice});
    const tamanhosReferencia = await tipografia(referencia, 1);
    assert.deepEqual(await tipografia(page, 0), tamanhosReferencia, 'Hierarquia tipográfica deve coincidir com a Fase 3');
    const zoomCorpo = alvo => alvo.evaluate(() => getComputedStyle(document.body).zoom);
    assert.equal(await zoomCorpo(page), await zoomCorpo(referencia));
    assert.equal(await page.locator('#complementacao-atributos').evaluate(el => getComputedStyle(el).zoom), '1');
    assert.equal(await page.locator('#complementacao-cadastral').evaluate(el => getComputedStyle(el).zoom), '1');
    const fonte = elemento => elemento.evaluate(el => getComputedStyle(el).fontSize);
    const conferirTextosDinamicos = async seletor => {
      const foraDaEscala = await page.locator(seletor).evaluate(raiz => {
        const permitidos = new Set([13.3, 12.7, 12, 11.7, 11.5, 10.7, 10.88]);
        const walker = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT);
        const encontrados = [];
        while (walker.nextNode()) {
          const no = walker.currentNode, el = no.parentElement;
          if (!no.textContent.trim() || el.closest('script, style, template, option, .sr-only, [aria-hidden="true"]') || !el.checkVisibility()) continue;
          const tamanho = Number.parseFloat(getComputedStyle(el).fontSize);
          if (!permitidos.has(tamanho)) encontrados.push({texto: no.textContent.trim().slice(0, 90), classe: el.className, tamanho});
        }
        raiz.querySelectorAll('input:not([type="checkbox"]), select, textarea').forEach(el => {
          if (el.checkVisibility() && !permitidos.has(Number.parseFloat(getComputedStyle(el).fontSize))) {
            encontrados.push({campo: el.id || el.className, tamanho: getComputedStyle(el).fontSize});
          }
        });
        return encontrados;
      });
      assert.deepEqual(foraDaEscala, [], `Todos os textos e campos renderizados em ${seletor} devem obedecer à escala`);
    };
    await conferirTextosDinamicos('#complementacao-cadastral');
    await conferirTextosDinamicos('#complementacao-atributos');
    const conferirColunaFixa = async () => {
      const shell = page.locator('.atributos-table-shell');
      await shell.scrollIntoViewIfNeeded();
      const resultado = await shell.evaluate(async el => {
        const cabecalho = el.querySelector('th.col-objeto');
        const celula = el.querySelector('td.col-objeto');
        el.scrollLeft = 0;
        await new Promise(requestAnimationFrame);
        const inicio = [cabecalho.getBoundingClientRect().left, celula.getBoundingClientRect().left];
        const atributoInicio = el.querySelector('td.col-atributo-valor').getBoundingClientRect().left;
        el.scrollLeft = el.scrollWidth;
        await new Promise(requestAnimationFrame);
        return {
          scroll: el.scrollLeft,
          deslocamentoCabecalho: Math.abs(cabecalho.getBoundingClientRect().left - inicio[0]),
          deslocamentoCelula: Math.abs(celula.getBoundingClientRect().left - inicio[1]),
          deslocamentoAtributo: Math.abs(el.querySelector('td.col-atributo-valor').getBoundingClientRect().left - atributoInicio),
          cabeNoContêiner: celula.getBoundingClientRect().width <= el.getBoundingClientRect().width,
          conteudos: [...celula.querySelectorAll('.objeto-codigo, .objeto-nome')].map(texto => {
            const range = document.createRange();
            range.selectNodeContents(texto);
            const fim = range.getBoundingClientRect(), limite = celula.getBoundingClientRect();
            return {texto: texto.textContent, semCorte: texto.scrollWidth <= texto.clientWidth + 1
              && fim.bottom <= limite.bottom + 1 && fim.right <= limite.right + 1 && fim.left >= limite.left - 1};
          }),
        };
      });
      assert.ok(resultado.scroll > 0);
      assert.ok(resultado.deslocamentoAtributo > 50, 'Atributos devem rolar horizontalmente');
      assert.ok(resultado.deslocamentoCabecalho <= 1 && resultado.deslocamentoCelula <= 1, 'Identificação deve permanecer fixa');
      assert.equal(resultado.cabeNoContêiner, true);
      assert.deepEqual(resultado.conteudos.map(item => item.texto), [nomeLongo, 'PRJ-1']);
      assert.ok(resultado.conteudos.every(item => item.semCorte), 'Nome completo e código não podem ser cortados');
      await shell.evaluate(el => { el.scrollLeft = 0; });
    };
    await conferirColunaFixa();
    assert.equal(await fonte(table.locator('th').first()), '12.7px');
    assert.equal(await fonte(table.locator('tbody td').first()), '12px');
    assert.equal(await fonte(page.locator('#filtro-coluna')), '12px');
    await page.setViewportSize({width: 390, height: 844});
    assert.deepEqual(await tipografia(page, 0), tamanhosReferencia, 'Hierarquia tipográfica deve ser mantida no mobile');
    await conferirTextosDinamicos('#complementacao-cadastral');
    await conferirTextosDinamicos('#complementacao-atributos');
    await conferirColunaFixa();
    await page.setViewportSize({width: 1440, height: 1000});
    await referencia.close();
    await resumo.locator('.fase1-obj-link').first().click();
    await page.locator('#modal-objetos').waitFor({state: 'visible'});
    assert.ok((await page.locator('#modal-objetos [data-modal-title]').innerText()).includes('PRJ-1'));
    assert.ok((await page.locator('#modal-objetos [data-modal-body]').innerText()).includes('Projeto PRJ-1'));
    await conferirTextosDinamicos('#modal-objetos');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#modal-objetos').isVisible(), false);
    assert.equal(await page.locator('#complementacao-atributos-confirmar').isDisabled(), true);
    assert.equal(await campo('aprovado').inputValue(), 'false');
    assert.equal(await page.locator('#complementacao-objeto').count(), 0);
    assert.equal(await page.locator('#filtro-status').count(), 0);
    await page.locator('#pagination-next').click();
    assert.equal(await table.locator('tbody tr').count(), 3);
    await page.locator('#filtro-coluna').selectOption({label: 'Código'});
    await page.locator('#filtro-valor').selectOption({label: 'PRJ-1'});
    assert.equal(await table.locator('tbody tr').count(), 1);
    await page.locator('#filtro-limpar').click();
    await table.locator('tr[data-codigo="PRJ-1"] td').nth(3).click();
    await page.getByRole('button', {name: 'Dados cadastrais', exact: true}).click();
    await page.locator('#fld-nome').waitFor({state: 'visible'});
    assert.equal(await page.getByRole('heading', {name: '1.1 Informações do Projeto', exact: true, level: 3}).isVisible(), true);
    assert.equal(await fonte(page.locator('#complementacao-editor-titulo')), '12.7px');
    assert.equal(await fonte(page.locator('#complementacao-cadastro .admin-info-subcard-title').first()), '12px');
    assert.equal(await fonte(page.locator('#complementacao-cadastro label').first()), '12px');
    assert.equal(await fonte(page.locator('#fld-nome')), '12px');
    await conferirTextosDinamicos('#complementacao-editor');
    assert.equal(await page.locator('#complementacao-atributos').isVisible(), true);
    assert.equal(await campo('custo').isVisible(), true);
    assert.ok(await page.locator('#complementacao-editor').evaluate(editor => editor.getBoundingClientRect().bottom <= document.querySelector('#complementacao-atributos').getBoundingClientRect().top));
    assert.equal(await page.locator('#fld-codigo').inputValue(), 'PRJ-1');
    assert.equal(await page.locator('#fld-codigo').getAttribute('readonly'), '');
    assert.equal(await page.locator('#fld-data-cadastro').inputValue(), '14/10/2026, 12:00:00');
    assert.equal(await page.locator('#complementacao-cadastro .admin-info-subcard-title').first().textContent(), 'Cadastro');
    await page.screenshot({path: 'outputs/complementacao-cadastro-desktop.png', fullPage: true});
    await page.setViewportSize({width: 390, height: 844});
    assert.equal(await fonte(page.locator('#complementacao-editor-titulo')), '12.7px');
    assert.equal(await fonte(page.locator('#fld-nome')), '12px');
    await page.screenshot({path: 'outputs/complementacao-cadastro-mobile.png', fullPage: true});
    await page.setViewportSize({width: 1440, height: 1000});
    for (const id of ['instituicao', 'cnpj', 'diretoria', 'plano', 'modal', 'tipologia', 'carteira', 'lat', 'lng', 'rep-nome', 'rep-email', 'rep-tel']) {
      assert.equal(await page.locator(`#fld-${id}`).count(), 1, id);
    }
    await page.locator('#fld-rep-nome').fill('Representante corrigido');
    await page.locator('#fld-lat').fill('-23.5');
    await page.locator('#fld-lng').fill('-46.6');
    await page.locator('#fld-nome').fill('Projeto corrigido');
    await page.getByRole('button', {name: 'Salvar dados cadastrais'}).click();
    await page.waitForFunction(() => document.querySelector('#complementacao-status').textContent.includes('Dados cadastrais salvos'));
    assert.ok(requests.some(req => req.path.endsWith('/cadastro') && req.body.includes('Projeto corrigido')));
    const saved = JSON.parse(requests.find(req => req.path.endsWith('/cadastro')).body);
    assert.equal(saved.nome, 'Projeto corrigido');
    assert.equal(saved.representante.nome, 'Representante corrigido');
    assert.equal(saved.lat, -23.5);
    assert.equal(saved.lng, -46.6);
    assert.ok('classificacao' in saved && 'complementos' in saved && 'diretoria_id' in saved && 'plano_id' in saved);
    if (await page.getByRole('button', {name: 'Geometria', exact: true}).isDisabled()) {
      await table.locator('tr[data-codigo="PRJ-1"] td').nth(3).click();
    }
    await page.getByRole('button', {name: 'Geometria', exact: true}).click();
    await page.locator('#complementacao-arquivo').waitFor({state: 'visible'});
    assert.equal(await page.getByRole('heading', {name: '1.1 Geometria', exact: true, level: 3}).isVisible(), true);
    assert.equal(await fonte(page.locator('#complementacao-editor-titulo')), '12.7px');
    assert.equal(await fonte(page.locator('#complementacao-geometria label')), '12px');
    assert.equal(await fonte(page.locator('#complementacao-arquivo')), '12px');
    await conferirTextosDinamicos('#complementacao-editor');
    assert.equal(await page.locator('#complementacao-hierarquizacao').inputValue(), 'H1');
    assert.equal(await resumo.isVisible(), true);
    assert.equal(await campo('custo').isVisible(), true);
    await page.getByRole('button', {name: 'Editar atributos', exact: true}).click();
    assert.equal(await campo('cadastro:capex_estimado').isEnabled(), true);
    assert.equal(await campo('custo').getAttribute('inputmode'), 'numeric');
    assert.equal(await campo('distancia').getAttribute('inputmode'), 'decimal');
    assert.equal(await campo('contagem').getAttribute('data-mascara'), 'inteiro');
    await campo('custo').fill('');
    await campo('custo').pressSequentially('123456');
    assert.equal(await campo('custo').inputValue(), '1.234,56');
    await campo('custo').evaluate(el => el.setSelectionRange(0, 0));
    await campo('custo').pressSequentially('9');
    assert.equal(await campo('custo').inputValue(), '91.234,56');
    assert.equal(await campo('custo').evaluate(el => el.selectionStart), 1);
    await campo('custo').fill('R$ 1.234,56');
    assert.equal(await campo('custo').inputValue(), '1.234,56');
    await campo('custo').evaluate(el => el.setSelectionRange(2, 2));
    await campo('custo').press('Backspace');
    assert.equal(await campo('custo').inputValue(), '234,56');
    await campo('distancia').fill('12345,678900');
    assert.equal(await campo('distancia').inputValue(), '12.345,678900');
    await campo('percentual').fill('25,50 %');
    assert.equal(await campo('percentual').inputValue(), '25,50');
    assert.equal(await page.evaluate(() => AtributosObjetos.coletar().valores['PRJ-1'].percentual), 25.5);
    await campo('contagem').fill('12,5');
    assert.equal(await campo('contagem').evaluate(el => el.checkValidity()), false);
    assert.match(await campo('contagem').evaluate(el => el.validationMessage), /inteiro/);
    const antesDeInvalido = requests.filter(req => req.method === 'PATCH').length;
    await page.getByRole('button', {name: 'Confirmar atributos', exact: true}).click();
    assert.equal(requests.filter(req => req.method === 'PATCH').length, antesDeInvalido);
    await campo('contagem').fill('12345');
    assert.equal(await campo('contagem').inputValue(), '12.345');
    await campo('distancia').fill('abc');
    assert.equal(await campo('distancia').evaluate(el => el.checkValidity()), false);
    assert.equal(await campo('distancia').inputValue(), 'abc');
    await campo('distancia').fill('12345,6789');
    await campo('cadastro:capex_estimado').fill('-100');
    assert.equal(await campo('cadastro:capex_estimado').evaluate(el => el.checkValidity()), false);
    await campo('cadastro:capex_estimado').fill('50000');
    await campo('custo').fill('99900');
    const patchesAntes = requests.filter(req => req.method === 'PATCH' && !req.path.endsWith('/cadastro')).length;
    await page.getByRole('button', {name: 'Cancelar edição dos atributos', exact: true}).click();
    await page.getByRole('button', {name: 'Descartar alterações', exact: true}).click();
    await page.waitForFunction(() => document.querySelector('#complementacao-atributos-status').textContent.includes('Edição cancelada'));
    assert.equal(await campo('custo').inputValue(), '');
    assert.equal(requests.filter(req => req.method === 'PATCH' && !req.path.endsWith('/cadastro')).length, patchesAntes);
    await page.getByRole('button', {name: 'Editar atributos', exact: true}).click();
    await campo('custo').fill('10000');
    await campo('aprovado').selectOption('true');
    await campo('observacao').fill('true');
    await campo('cadastro:capex_estimado').fill('75000');
    await campo('cadastro:maturidade_objeto').selectOption('Nível 2 — Estudo');
    await campo('cadastro:prazo_referencia_meses', 'PRJ-2').fill('24');
    await campo('percentual').fill('25,5');
    await campo('contagem').fill('4567');
    await campo('distancia').fill('');
    await campo('distancia', 'PRJ-2').fill('12345,6789');
    await campo('custo', 'PRJ-2').fill('0');
    await page.locator('#complementacao-hierarquizacao').selectOption('H2');
    await page.getByRole('button', {name: 'Continuar editando', exact: true}).click();
    assert.equal(await page.locator('#complementacao-hierarquizacao').inputValue(), 'H1');
    assert.equal(await campo('custo').inputValue(), '100,00');
    await page.getByRole('button', {name: 'Confirmar atributos', exact: true}).click();
    assert.equal(await page.locator('#complementacao-hierarquizacao').isDisabled(), true);
    await page.waitForFunction(() => document.querySelector('#complementacao-atributos-status').textContent.includes('salva com sucesso'));
    assert.equal(await campo('custo').isDisabled(), true);
    const atributos = JSON.parse(requests.find(req => req.path === '/api/complementacao/hierarquizacoes/H1' && req.method === 'PATCH').body).valores;
    assert.deepEqual(atributos, {
      'PRJ-1': {custo: 100, aprovado: true, observacao: 'true', 'cadastro:capex_estimado': 750, 'cadastro:maturidade_objeto': 'Nível 2 — Estudo', percentual: 25.5, contagem: 4567, distancia: null},
      'PRJ-2': {'cadastro:prazo_referencia_meses': 24, distancia: 12345.6789, custo: 0},
    });
    assert.equal(await campo('cadastro:capex_estimado').inputValue(), '750,00');
    await page.getByRole('button', {name: 'Editar atributos', exact: true}).click();
    await campo('custo').fill('20000');
    await page.getByRole('tab', {name: 'Plano', exact: true}).click();
    await page.locator('[data-demandas-table="plano"] tbody tr').waitFor();
    assert.equal(await page.locator('#complementacao-hierarquizacao').inputValue(), 'H1');
    assert.equal(await campo('custo').inputValue(), '200,00');
    assert.equal(await campo('custo').isEnabled(), true);
    falharGravacao = true;
    await page.getByRole('button', {name: 'Confirmar atributos', exact: true}).click();
    await page.waitForFunction(() => document.querySelector('#complementacao-atributos-status').textContent.includes('Não foi possível salvar'));
    assert.equal(await campo('custo').inputValue(), '200,00');
    assert.equal(await page.getByRole('button', {name: 'Confirmar atributos', exact: true}).isEnabled(), true);
    falharGravacao = false;
    await page.getByRole('button', {name: 'Cancelar edição dos atributos', exact: true}).click();
    await page.getByRole('button', {name: 'Descartar alterações', exact: true}).click();
    await page.waitForFunction(() => document.querySelector('[data-atributo-objeto="PRJ-1"][data-atributo-coluna="custo"]').value === '100,00');
    await page.screenshot({path: 'outputs/complementacao-desktop.png', fullPage: true});
    await page.getByRole('tab', {name: 'Plano', exact: true}).click();
    await page.locator('[data-demandas-table="plano"] tbody tr').waitFor();
    assert.equal(await page.locator('[data-demandas-table="plano"] th').count(), 20);
    await page.locator('[data-demandas-table="plano"] tbody tr td').nth(3).click();
    await page.getByRole('button', {name: 'Dados cadastrais', exact: true}).click();
    await page.locator('#cadastro-nome').waitFor({state: 'visible'});
    assert.equal(await page.getByRole('heading', {name: '1.1 Dados cadastrais', exact: true, level: 3}).isVisible(), true);
    assert.equal(await fonte(page.locator('#cadastro-nome')), '12px');
    assert.equal(await fonte(page.locator('#complementacao-cadastro label').first()), '12px');
    assert.equal(await page.locator('#complementacao-atributos').isVisible(), true);
    await page.getByRole('tab', {name: 'Programa', exact: true}).click();
    await page.locator('#lista-vazia').waitFor({state: 'visible'});
    assert.equal(await page.getByRole('button', {name: 'Dados cadastrais', exact: true}).isDisabled(), true);
    assert.equal(await page.locator('#complementacao-hierarquizacao').inputValue(), 'H1');
    assert.equal(await campo('custo').inputValue(), '100,00');
    await page.locator('#complementacao-hierarquizacao').selectOption('H2');
    await campo('custo', 'PRJ-FORA').waitFor({state: 'visible'});
    assert.equal(await page.locator('#complementacao-atributos').isVisible(), true);
    assert.ok(!requests.some(req => req.path.includes('/internas')));
    assert.deepEqual(errors, []);
    await page.setViewportSize({width: 390, height: 844});
    await page.screenshot({path: 'outputs/complementacao-mobile.png', fullPage: true});
    assert.equal(await page.locator('#complementacao-atributos').evaluate(element => element.scrollWidth <= element.clientWidth + 1), true);
    // The same component's default mode, used by Fase 3, never renders attribute inputs.
    await page.evaluate(h => AtributosObjetos.render(h), salvos.get('H1'));
    assert.equal(await page.locator('#fase3-titulo-atributos').innerText(), '2. Critérios atributo de projeto');
    assert.equal(await page.locator('[data-atributos-tbody] input, [data-atributos-tbody] select').count(), 0);
    assert.equal(await page.locator('[data-atributos-pesos]').isVisible(), true);
    assert.equal(await page.locator('.atributo-peso-numero').first().isEnabled(), true);
    await page.evaluate(h => SLTResumoFase.secao1(document.querySelector('#complementacao-resumo-hierarquizacao'), h), salvos.get('H1'));
    assert.equal(await resumo.locator('.fase1-meta-card').count(), 3);
    await page.reload();
    await page.locator('#complementacao-hierarquizacao option[value="H1"]').waitFor({state: 'attached'});
    await page.locator('#complementacao-hierarquizacao').selectOption('H1');
    await campo('custo').waitFor({state: 'visible'});
    assert.equal(await campo('custo').inputValue(), '100,00');
    assert.equal(await campo('cadastro:capex_estimado').inputValue(), '750,00');
    assert.equal(await campo('percentual').inputValue(), '25,5');
    assert.equal(await campo('contagem').inputValue(), '4.567');
    assert.equal(await campo('distancia').inputValue(), '');
    assert.equal(await campo('distancia', 'PRJ-2').inputValue(), '12.345,6789');
    assert.equal(await campo('custo', 'PRJ-2').inputValue(), '0,00');
    await page.locator('#complementacao-hierarquizacao').selectOption('H3');
    const linhasVisiveis = page.locator('[data-atributos-tbody] tr:visible');
    const paginador = page.locator('#complementacao-atributos-pagination');
    const tamanhoAtributos = page.locator('#complementacao-atributos-page-size');
    const contador = page.locator('#complementacao-atributos-summary');
    await campo('custo', 'PAG-1').waitFor({state: 'visible'});
    assert.equal(await linhasVisiveis.count(), 15);
    assert.equal(await contador.innerText(), '15 na página / 18 no total');
    assert.equal(await paginador.getByRole('button', {name: 'Primeira página', exact: true}).isDisabled(), true);
    for (const tamanho of ['25', '35', '50', '100']) {
      await tamanhoAtributos.selectOption(tamanho);
      assert.equal(await linhasVisiveis.count(), 18);
      assert.equal(await contador.innerText(), '18 na página / 18 no total');
    }
    await tamanhoAtributos.selectOption('15');
    await page.getByRole('button', {name: 'Editar atributos', exact: true}).click();
    await campo('custo', 'PAG-1').fill('10000');
    await paginador.getByRole('button', {name: 'Última página', exact: true}).click();
    assert.equal(await linhasVisiveis.count(), 3);
    assert.equal(await contador.innerText(), '3 na página / 18 no total');
    assert.equal(await paginador.getByRole('button', {name: 'Próxima página', exact: true}).isDisabled(), true);
    await campo('custo', 'PAG-18').fill('20000');
    await campo('distancia', 'PAG-18').fill('abc');
    await paginador.getByRole('button', {name: 'Primeira página', exact: true}).click();
    assert.equal(await campo('custo', 'PAG-1').inputValue(), '100,00');
    await page.getByRole('button', {name: 'Confirmar atributos', exact: true}).click();
    assert.equal(await campo('distancia', 'PAG-18').isVisible(), true, 'A validação deve revelar a página do campo inválido');
    assert.equal(requests.filter(req => req.path.endsWith('/H3') && req.method === 'PATCH').length, 0);
    await campo('distancia', 'PAG-18').fill('1');
    await page.getByRole('button', {name: 'Confirmar atributos', exact: true}).click();
    assert.equal(await tamanhoAtributos.isDisabled(), true);
    await page.waitForFunction(() => document.querySelector('#complementacao-atributos-status').textContent.includes('salva com sucesso'));
    assert.deepEqual(JSON.parse(requests.find(req => req.path.endsWith('/H3') && req.method === 'PATCH').body).valores, {
      'PAG-1': {custo: 100}, 'PAG-18': {custo: 200, distancia: 1},
    });
    assert.equal(await linhasVisiveis.count(), 15);
    await paginador.getByRole('button', {name: 'Próxima página', exact: true}).click();
    assert.equal(await campo('custo', 'PAG-18').inputValue(), '200,00');
    await page.getByRole('button', {name: 'Editar atributos', exact: true}).click();
    await campo('custo', 'PAG-18').fill('30000');
    await paginador.getByRole('button', {name: 'Página anterior', exact: true}).click();
    await page.getByRole('button', {name: 'Cancelar edição dos atributos', exact: true}).click();
    await page.getByRole('button', {name: 'Descartar alterações', exact: true}).click();
    await page.waitForFunction(() => document.querySelector('#complementacao-atributos-status').textContent.includes('Edição cancelada'));
    await paginador.getByRole('button', {name: 'Última página', exact: true}).click();
    assert.equal(await campo('custo', 'PAG-18').inputValue(), '200,00');
    assert.equal(await page.locator('#complementacao-atributos').evaluate(el => el.scrollWidth <= el.clientWidth + 1), true);
    falharCarga = true;
    await page.reload();
    await page.locator('#complementacao-atributos-recarregar').waitFor({state: 'visible'});
    assert.equal(await page.locator('#complementacao-hierarquizacao').isDisabled(), true);
    falharCarga = false;
    await page.locator('#complementacao-atributos-recarregar').click();
    await page.locator('#complementacao-hierarquizacao option[value="H1"]').waitFor({state: 'attached'});
    salvos.clear();
    await page.reload();
    await page.locator('#complementacao-sem-atributos').waitFor({state: 'visible'});
    assert.equal(await page.locator('#complementacao-hierarquizacao').isDisabled(), true);
    assert.deepEqual(errors, []);
    console.log('Tabela compartilhada: cadastro + matriz sem duplicação, gravação em lote, resumo com data e modal, independência das seções, cancelamento, persistência, erros e mobile; Fase 3 somente leitura com pesos editáveis.');
  } finally { await browser.close(); }
})().catch(error => {console.error(error); process.exitCode = 1;});
