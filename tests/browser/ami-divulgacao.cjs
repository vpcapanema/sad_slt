const assert = require('node:assert/strict');
const fs = require('node:fs');
const {chromium} = require('playwright');

const base = process.env.SICARD_TEST_URL || 'http://127.0.0.1:8083';
const link = `${base}/public/analise-multicriterio/participar/rodada-publica/`;
const julgamento = {id: 'rodada', token: 'rodada-publica', nome: 'Consulta de teste', modo_participacao: 'publico',
  status: 'encerrada', criadoEm: '2025-01-01T12:00:00Z', valido_ate: '2025-12-31T23:59:59-03:00',
  url_publica: link, n_criterios: 2, criterios: [], convites: []};
const apiBase = '/api/ahp/comparacao-colaborativa/ambientes';
const dataInscricao = '2026-11-26T12:00:00Z';
const dataEnvio = '2026-11-26T14:36:23Z';
const inscricaoDireta = {nome: 'Inscrição Direta', email: 'direto@example.org', inscricao_id: 'inscricao-direta', registrado_em: dataInscricao, etapa_rotulo: 'Inscrito'};

(async () => {
  const browser = await chromium.launch({channel: 'msedge', headless: true});
  try {
    const page = await browser.newPage({viewport: {width: 1440, height: 900}, timezoneId: 'America/Sao_Paulo'});
    const sessao = process.env.SICARD_BROWSER_SESSION;
    assert.ok(sessao, 'Informe uma sessão para carregar o template restrito.');
    await page.context().addCookies([{name: 'slt_session', value: sessao, url: base}]);
    const contatos = [], registros = [], disparos = [], salvamentos = [], catalogo = [], erros = [];
    let inscrito = false, inscricaoDiretaVisivel = false, mensagemSalva = null;
    const usuario = {id: 'gestor', tipo_usuario: 'ANALISTA', permissoes: {'mad.operar': true, 'mad.visualizar': true}};
    page.on('pageerror', erro => erros.push(erro.message));
    await page.route('**/api/**', async route => {
      const req = route.request(), path = new URL(req.url()).pathname;
      if (path === '/api/auth/me') return route.fulfill({json: usuario});
      if (path === '/api/auth/session') return route.fulfill({json: {authenticated: true, user: usuario}});
      if (path === apiBase) return route.fulfill({json: [julgamento]});
      if (path === `${apiBase}/${julgamento.id}` && req.method() === 'PATCH') {
        const alteracao = req.postDataJSON();
        assert.equal(alteracao.reabrir, true);
        Object.assign(julgamento, {status: 'ativa', valido_ate: alteracao.valido_ate});
        return route.fulfill({json: julgamento});
      }
      if (path.endsWith('/emails/monitoramento')) return route.fulfill({json: {registros: [], confirmacoes_configuradas: false,
        colaboradores: [inscricaoDireta, ...(inscrito ? [{nome: 'Ana Lima', email: 'ana@example.org', inscricao_id: 'inscricao', registrado_em: dataInscricao, etapa_rotulo: 'Inscrito'}] : [])]}});
      if (path.endsWith('/divulgacao/listas')) {
        const busca = new URL(req.url()).searchParams, origem = busca.get('origem');
        if (busca.get('catalogo')) {
          return route.fulfill({json: {destinatarios: catalogo.find(lista => lista.id === origem).destinatarios}});
        }
        return route.fulfill({json: origem
          ? {destinatarios: [{nome: 'Caio Silva', email: 'caio@example.org'}, {nome: 'Inscrição Direta', email: 'DIRETO@example.org'}]}
          : {listas: [...catalogo, {id: 'anterior', nome: 'Equipe anterior', tipo: 'Colaboradores convidados'}]}});
      }
      if (path.endsWith('/divulgacao') || path.endsWith('/divulgacao/confirmacoes')) return route.fulfill({json: {
        destinatarios: contatos, emails_inscritos: [...(inscricaoDiretaVisivel ? [inscricaoDireta.email] : []), ...(inscrito ? ['ana@example.org'] : [])],
        registros, mensagem: mensagemSalva, confirmacoes_configuradas: true}});
      if (path.endsWith('/divulgacao/mensagem')) {
        assert.equal(req.method(), 'PUT');
        mensagemSalva = req.postDataJSON();
        return route.fulfill({json: mensagemSalva});
      }
      if (path.endsWith('/divulgacao/destinatarios')) {
        assert.equal(req.method(), 'PUT');
        const payload = req.postDataJSON();
        salvamentos.push(payload);
        const {alterados, removidos, nova_lista, lista_id} = payload;
        const inscritos = [inscricaoDireta.email, ...(inscrito ? ['ana@example.org'] : [])];
        contatos.splice(0, contatos.length, ...contatos.filter(contato => !removidos.includes(contato.email)));
        const ja_inscritos = [];
        for (const {destinatario, nome, instituicao} of alterados) {
          if (inscritos.includes(destinatario)) { ja_inscritos.push(destinatario); continue; }
          const contato = contatos.find(item => item.email === destinatario);
          if (contato) Object.assign(contato, {nome, instituicao});
          else contatos.push({email: destinatario, nome, instituicao, inscrito_em: null});
        }
        if (nova_lista) catalogo.push({id: 'lista-nova', nome: nova_lista, editavel: true, tipo: 'Lista reutilizável'});
        const lista = catalogo.find(item => item.id === (lista_id || (nova_lista ? 'lista-nova' : undefined)));
        if (lista) {
          lista.destinatarios = contatos.filter(item => !inscritos.includes(item.email)).map(({nome, email, instituicao}) =>
            ({nome, email, ...(instituicao ? {instituicao} : {})}));
        }
        return route.fulfill({json: {destinatarios: contatos, emails_inscritos: inscritos, ja_inscritos, lista: lista || null}});
      }
      if (path.endsWith('/divulgacao/enviar')) {
        const payload = req.postDataJSON();
        disparos.push(payload);
        const item = {id: String(disparos.length), destinatario: payload.destinatario, natureza: 'divulgacao',
          criado_em: new Date().toISOString(), envio_status: 'aceito_smtp', entrega_status: 'sem_confirmacao',
          smtp_aceito_em: dataEnvio, leitura_status: 'confirmada', eventos: [{tipo: 'leitura', ocorrido_em: dataInscricao}]};
        registros.push(item);
        return route.fulfill({json: item});
      }
      assert.equal(req.method(), 'GET', `Operação inesperada em ${path}`);
      return route.fulfill({json: []});
    });
    await page.goto(base + '/restrict/analise-multicriterio/central-julgamentos');
    await page.locator('[data-select-id="rodada"]').check();
    await page.locator('#ami-judgments-view-action').click();
    const painel = page.locator('#ami-public-link-card #ami-divulgacao');
    await painel.getByRole('heading', {name: 'Compartilhar link público'}).waitFor();
    const linkMensagem = painel.locator('#ami-divulgacao-link-mensagem');
    const medirEditor = () => painel.locator('.ami-divulgacao-editor').evaluate(grade =>
      [...grade.children].map(elemento => elemento.getBoundingClientRect().toJSON()));
    assert.equal(await painel.getByText('Prévia do e-mail', {exact: true}).count(), 0);
    assert.deepEqual(await painel.locator('.ami-divulgacao-editor h4').allTextContents(), ['Destinatários', 'Mensagem de e-mail']);
    const [esquerda, direita] = await medirEditor();
    assert.equal(esquerda.top, direita.top);
    assert.ok(esquerda.right <= direita.left);
    assert.equal(await page.locator('#ami-public-link').inputValue(), link);
    assert.equal(await linkMensagem.getAttribute('href'), link);
    assert.equal(await linkMensagem.textContent(), link);
    assert.equal(await painel.getByLabel('Mensagem', {exact: true}).isEditable(), false);
    assert.equal(await painel.getByLabel('Carregar lista de um arquivo').isDisabled(), true);
    assert.equal(await painel.getByRole('button', {name: 'Carregar lista existente'}).isDisabled(), true);
    assert.equal(await painel.getByRole('button', {name: 'Salvar mensagem'}).isDisabled(), true);
    await page.locator('#ami-create-cancel').click();
    await page.getByRole('button', {name: 'Editar julgamento', exact: true}).click();
    await painel.getByRole('heading', {name: 'Compartilhar link público'}).waitFor();
    await page.waitForFunction(() => !document.getElementById('ami-divulgacao-listas').disabled);
    const medirEspacos = () => painel.evaluate(divulgacao => {
      const editor = divulgacao.querySelector('.ami-divulgacao-editor');
      const titulo = divulgacao.querySelector('#ami-divulgacao-lista-titulo');
      const tabela = divulgacao.querySelector('.ami-report-table');
      const moldura = tabela.querySelector('.ami-filtered-table');
      const acoes = tabela.querySelector('.admin-actions');
      const referencia = document.querySelector('#ami-judgments').closest('table').closest('.ami-filtered-table');
      const acoesReferencia = referencia.closest('section').querySelector('.ami-table-actions');
      const arquivo = divulgacao.querySelector('#ami-divulgacao-arquivo');
      const campo = getComputedStyle(arquivo), botao = getComputedStyle(arquivo, '::file-selector-button');
      const espaco = (a, b) => b.getBoundingClientRect().top - a.getBoundingClientRect().bottom;
      const fonte = elemento => {
        const estilo = getComputedStyle(elemento);
        return [estilo.fontSize, estilo.fontWeight, estilo.lineHeight, estilo.textAlign, estilo.color];
      };
      return {
        acimaDaSecao: espaco(divulgacao.previousElementSibling, divulgacao),
        acimaDoTitulo: espaco(editor, titulo),
        abaixoDoTitulo: espaco(titulo, moldura),
        acimaDasAcoes: espaco(moldura, acoes),
        acimaDasAcoesReferencia: espaco(referencia, acoesReferencia),
        fonteTitulo: fonte(titulo),
        fonteTituloReferencia: fonte(document.querySelector('#ami-monitoring-section .ami-table-label')),
        alturaBotao: parseFloat(botao.height),
        alturaInternaCampo: arquivo.clientHeight - parseFloat(campo.paddingTop) - parseFloat(campo.paddingBottom),
        alturaLinhaArquivo: parseFloat(campo.lineHeight),
        recuoSuperior: campo.paddingTop, recuoInferior: campo.paddingBottom,
      };
    });
    const verificarEspacos = async (desktop) => {
      const medidas = await medirEspacos();
      if (desktop) {
        assert.ok(medidas.acimaDaSecao > 0 && medidas.acimaDaSecao < desktop.acimaDaSecao);
        assert.ok(medidas.acimaDoTitulo > 0 && medidas.acimaDoTitulo < desktop.acimaDoTitulo);
        assert.ok(parseFloat(medidas.fonteTitulo[0]) < parseFloat(desktop.fonteTitulo[0]));
      } else {
        assert.ok(medidas.acimaDaSecao >= 16, 'Separação da seção em relação aos botões');
        assert.ok(medidas.acimaDoTitulo >= 16, 'Separação do título em relação aos campos');
        assert.equal(medidas.abaixoDoTitulo, 12);
        assert.equal(medidas.acimaDasAcoes, 8);
      }
      assert.equal(medidas.acimaDasAcoes, medidas.acimaDasAcoesReferencia);
      assert.deepEqual(medidas.fonteTitulo, medidas.fonteTituloReferencia);
      assert.equal(medidas.alturaBotao, medidas.alturaInternaCampo);
      assert.equal(medidas.alturaLinhaArquivo, medidas.alturaInternaCampo);
      assert.equal(medidas.recuoSuperior, medidas.recuoInferior);
      return medidas;
    };
    await painel.getByRole('table', {name: 'Tabela de colaboradores convidados', exact: true}).waitFor();
    const espacosDesktop = await verificarEspacos();
    const tipografia = await page.evaluate(() => {
      const fonte = (seletor) => {
        const estilo = getComputedStyle(document.querySelector(seletor));
        return [estilo.fontFamily, estilo.fontSize, estilo.fontWeight, estilo.lineHeight];
      };
      return {
        rotulos: ['nome', 'email', 'instituicao', 'arquivo', 'assunto', 'mensagem'].map(id => fonte(`label[for="ami-divulgacao-${id}"]`)),
        campos: ['nome', 'email', 'instituicao', 'assunto', 'mensagem', 'link-mensagem'].map(id => fonte(`#ami-divulgacao-${id}`)),
        fonteArquivo: fonte('#ami-divulgacao-arquivo').slice(0, 3),
        rotuloReferencia: fonte('label[for="ami-collaborator-name"]'),
        campoReferencia: fonte('#ami-collaborator-name'),
        ajuda: fonte('#ami-divulgacao-link-ajuda'), ajudaReferencia: fonte('#ami-name-help'),
        gapCampos: getComputedStyle(document.querySelector('#ami-divulgacao-contato')).rowGap,
        margemImportacao: getComputedStyle(document.querySelector('#ami-divulgacao-contato .ami-collaborator-import')).marginTop,
      };
    });
    tipografia.rotulos.forEach(fonte => assert.deepEqual(fonte, tipografia.rotuloReferencia));
    tipografia.campos.forEach(fonte => assert.deepEqual(fonte, tipografia.campoReferencia));
    assert.deepEqual(tipografia.fonteArquivo, tipografia.campoReferencia.slice(0, 3));
    assert.deepEqual(tipografia.ajuda, tipografia.ajudaReferencia);
    assert.equal(tipografia.gapCampos, '8px');
    assert.equal(tipografia.margemImportacao, '0px');
    for (const campo of ['Nome do destinatário', 'E-mail do destinatário', 'Assunto do e-mail', 'Mensagem']) {
      assert.equal(await painel.getByLabel(campo, {exact: true}).isEditable(), true, campo);
    }
    const medirLinha = () => painel.locator('#ami-divulgacao-contato').evaluate(form => {
      const [nome, email, instituicao, adicionar, arquivo] = ['nome', 'email', 'instituicao', 'adicionar', 'arquivo']
        .map(id => form.querySelector(`#ami-divulgacao-${id}`).getBoundingClientRect());
      return nome.right <= email.left && email.right <= instituicao.left && instituicao.right <= adicionar.left &&
        Math.max(nome.bottom, email.bottom, instituicao.bottom, adicionar.bottom) - Math.min(nome.bottom, email.bottom, instituicao.bottom, adicionar.bottom) <= 1 &&
        arquivo.top >= nome.bottom;
    });
    assert.equal(await medirLinha(), true);
    assert.equal(await painel.getByLabel('Carregar lista de um arquivo').isEnabled(), true);
    await painel.getByLabel('Nome do destinatário').fill('Ana Lima');
    await painel.getByLabel('E-mail do destinatário').fill('Ana@Example.org');
    const previa = page.locator('#ami-import-modal');
    const adicionar = painel.getByRole('button', {name: 'Adicionar à lista de convidados'});
    assert.equal(await adicionar.locator('.fa-plus').count(), 1);
    await adicionar.click();
    await painel.locator('tr[data-email="ana@example.org"]').waitFor();
    assert.equal(await previa.isVisible(), false);
    assert.deepEqual(contatos, []);
    await painel.getByLabel('Nome do destinatário').fill('Nome diferente');
    await painel.getByLabel('E-mail do destinatário').fill('DIRETO@example.org');
    inscricaoDiretaVisivel = true;
    await adicionar.click();
    await painel.getByRole('alert').getByText('E-mail já inscrito no Monitoramento das atividades', {exact: true}).waitFor();
    assert.equal(await painel.locator('tr[data-email="direto@example.org"]').count(), 0);
    assert.deepEqual(salvamentos, []);

    await painel.locator('#ami-divulgacao-arquivo').setInputFiles({name: 'contatos.csv', mimeType: 'text/csv',
      buffer: Buffer.from('Nome;E-mail;Instituição\nDuplicata;ANA@example.org\nNome diferente;DIRETO@example.org\nBia Melo;bia@example.org;Instituto Beta')});
    await previa.getByText(/Duplicata.*Já está na tabela de colaboradores convidados/).waitFor();
    await previa.getByText(/Duplicata.*E-mail já inscrito no Monitoramento das atividades/).waitFor();
    await previa.getByRole('button', {name: 'Excluir duplicatas'}).click();
    await previa.getByRole('button', {name: 'Confirmar destinatários'}).click();
    await previa.waitFor({state: 'hidden'});
    await painel.locator('#ami-divulgacao-tabela').getByText('Instituto Beta', {exact: true}).waitFor();
    assert.deepEqual(contatos, []);

    await painel.getByRole('button', {name: 'Carregar lista existente'}).click();
    await previa.getByLabel('Lista cadastrada').selectOption({label: 'Equipe anterior · Colaboradores convidados'});
    await previa.getByRole('button', {name: 'Carregar lista', exact: true}).click();
    await previa.getByText('Caio Silva', {exact: true}).waitFor();
    assert.equal(contatos.length, 0);
    await previa.getByText(/Duplicata.*E-mail já inscrito no Monitoramento das atividades/).waitFor();
    await previa.getByRole('button', {name: 'Excluir duplicatas'}).click();
    await previa.getByRole('button', {name: 'Confirmar destinatários'}).click();
    await previa.waitFor({state: 'hidden'});
    assert.deepEqual(salvamentos, []);
    assert.equal(disparos.length, 0);

    const tabela = painel.locator('#ami-divulgacao-tabela');
    const ana = tabela.locator('tr[data-email="ana@example.org"]');
    const cabecalhos = await tabela.locator('thead th').evaluateAll(celulas => celulas.slice(1).map(celula =>
      celula.textContent.replace(/\s+/g, ' ').trim()));
    assert.deepEqual(cabecalhos, ['Nome do colaborador', 'E-mail do colaborador', 'Instituição', 'Status do envio', 'Data do envio', 'Status da entrega']);
    const filtroColunas = painel.locator('.ami-divulgacao-lista .admin-filter-bar select').first();
    assert.deepEqual((await filtroColunas.locator('option').allTextContents()).slice(1), cabecalhos);
    await ana.getByRole('checkbox').check();
    const [exportacao] = await Promise.all([
      page.waitForEvent('download'), painel.getByRole('button', {name: 'Exportar selecionados', exact: true}).click(),
    ]);
    assert.match(fs.readFileSync(await exportacao.path(), 'utf8'), /^\uFEFF?"Nome do colaborador";"E-mail do colaborador";"Instituição"/);
    await ana.getByRole('checkbox').uncheck();
    assert.equal(await ana.locator('td').nth(5).textContent(), '—');
    const modal = page.locator('#ami-divulgacao-modal');
    const bia = tabela.locator('tr[data-email="bia@example.org"]');
    await bia.getByRole('checkbox').check();
    await painel.getByRole('button', {name: 'Editar convidado selecionado'}).click();
    await modal.getByLabel('E-mail', {exact: true}).fill('DIRETO@example.org');
    await modal.getByRole('button', {name: 'Aplicar ao rascunho'}).click();
    await modal.locator('#ami-divulgacao-modal-status').getByText('E-mail já inscrito no Monitoramento das atividades').waitFor();
    await modal.getByLabel('E-mail', {exact: true}).fill('bia@example.org');
    await modal.getByLabel('Nome', {exact: true}).fill('Beatriz Melo');
    assert.equal(await modal.getByLabel('Instituição').inputValue(), 'Instituto Beta');
    await modal.getByLabel('Instituição').fill('Instituto Atualizado');
    await modal.getByRole('button', {name: 'Aplicar ao rascunho'}).click();
    await bia.getByText('Beatriz Melo').waitFor();
    assert.equal(salvamentos.length, 0);
    await painel.getByRole('button', {name: 'Salvar como nova lista'}).click();
    await modal.getByLabel('Nome da lista').fill('Equipe de consulta');
    await modal.getByRole('button', {name: 'Salvar nova lista'}).click();
    await painel.getByText('Convidados da rodada e lista “Equipe de consulta” salvos.').waitFor();
    assert.deepEqual(contatos.map(c => c.email), ['ana@example.org', 'bia@example.org', 'caio@example.org']);
    assert.deepEqual(catalogo[0].destinatarios.map(c => c.nome), ['Ana Lima', 'Beatriz Melo', 'Caio Silva']);
    assert.equal(catalogo[0].destinatarios.find(c => c.email === 'bia@example.org').instituicao, 'Instituto Atualizado');
    await painel.getByRole('button', {name: 'Carregar lista existente'}).click();
    await previa.getByLabel('Lista cadastrada').selectOption({label: 'Equipe de consulta · Lista reutilizável'});
    await previa.getByRole('button', {name: 'Carregar lista', exact: true}).click();
    await previa.getByText(/Duplicata.*Já está na tabela de colaboradores convidados/).first().waitFor();
    await previa.getByRole('button', {name: 'Fechar prévia'}).click();
    await ana.getByRole('checkbox').check();
    assert.equal(await painel.locator('#ami-divulgacao-enviar').isDisabled(), true);
    assert.equal(await painel.locator('#ami-divulgacao-prazo').isVisible(), true);
    const assunto = 'Consulta pública · nova rodada';
    const textoSalvo = '  Prezados,\n\nTexto preparado para este julgamento.\n ';
    await painel.getByLabel('Assunto do e-mail').fill(assunto);
    await painel.getByLabel('Mensagem', {exact: true}).fill(textoSalvo);
    await painel.getByRole('button', {name: 'Salvar mensagem'}).click();
    await painel.getByText('Mensagem salva neste julgamento.').waitFor();
    assert.deepEqual(mensagemSalva, {assunto, texto: textoSalvo});
    await page.locator('#ami-create-cancel').click();
    assert.equal(await painel.getByLabel('Mensagem', {exact: true}).isEditable(), false);
    await page.locator('#ami-create-cancel').click();
    await page.locator('#ami-judgments-view-action').click();
    await painel.getByRole('button', {name: 'Salvar mensagem'}).waitFor();
    await page.waitForFunction(texto => document.querySelector('#ami-divulgacao-mensagem').value === texto, textoSalvo);
    assert.equal(await painel.getByLabel('Assunto do e-mail').inputValue(), assunto);
    assert.equal(await linkMensagem.textContent(), link);
    await page.locator('#ami-environment-edit').click();
    await page.locator('#ami-deadline').fill('2035-12-31');
    await page.locator('#ami-environment-save').click();
    await page.locator('#pfsStatusOverlay .pfs-box.pfs-active .pfs-close').click();
    await ana.getByRole('checkbox').check();
    assert.equal(await painel.locator('#ami-divulgacao-enviar').isDisabled(), true);
    await page.getByRole('button', {name: 'Editar julgamento', exact: true}).click();
    await painel.locator('#ami-divulgacao-prazo').waitFor({state: 'hidden'});
    await painel.getByLabel('Nome do destinatário').fill('Contato temporário');
    await painel.getByLabel('E-mail do destinatário').fill('temporario@example.org');
    await adicionar.click();
    assert.equal(await painel.locator('#ami-divulgacao-enviar').isDisabled(), true);
    assert.equal(await painel.locator('#ami-divulgacao-pendencias').isVisible(), true);
    await painel.getByRole('button', {name: 'Limpar seleção', exact: true}).click();
    await tabela.locator('tr[data-email="temporario@example.org"]').getByRole('checkbox').check();
    await painel.getByRole('button', {name: 'Excluir selecionados', exact: true}).click();
    await ana.getByRole('checkbox').check();
    assert.equal(await painel.locator('#ami-divulgacao-enviar').isEnabled(), true);
    assert.equal(salvamentos.length, 1);
    const textoAtual = '  Mensagem revisada.\n\nNovo parágrafo com acentuação.\n ';
    await painel.getByLabel('Mensagem', {exact: true}).fill(textoAtual);
    await painel.locator('#ami-divulgacao-enviar').click();
    await page.locator('#pfsConfirmOk').click();
    await ana.getByRole('button', {name: /Aceito pelo servidor/}).waitFor();
    assert.equal(await ana.locator('td').nth(5).textContent(), '26/11/2026, 11:36:23');
    assert.equal(disparos[0].assunto, assunto);
    assert.equal(disparos[0].texto, textoAtual);
    assert.equal(disparos[0].destinatario, 'ana@example.org');
    assert.equal(disparos[0].reenvio, false);
    assert.match(await ana.innerText(), /Sem confirmação/);
    assert.equal(await ana.getByText('Lido', {exact: true}).count(), 0);
    assert.equal(await painel.locator('#ami-divulgacao-enviar').isDisabled(), true);

    await painel.locator('#ami-divulgacao-reenviar').click();
    await page.locator('#pfsConfirmOk').click();
    await page.waitForFunction(() => document.querySelector('#ami-divulgacao-status').textContent.includes('1 de 1'));
    assert.equal(disparos[1].reenvio, true);
    await ana.getByRole('button', {name: /Histórico de envio/}).click();
    await page.locator('#ami-email-history-title').getByText('E-mail de divulgação').waitFor();
    assert.equal(await page.locator('#ami-email-history-body tr').count(), 2);
    await page.locator('#ami-email-history-close').click();

    inscrito = true;
    contatos[0].inscrito_em = dataInscricao;
    registros[1].entrega_status = 'confirmada';
    await painel.getByRole('button', {name: 'Atualizar confirmações e inscrições'}).click();
    await ana.waitFor({state: 'detached'});
    assert.equal(contatos[0].email, 'ana@example.org');
    assert.equal(await painel.locator('#ami-divulgacao-reenviar').isDisabled(), true);
    const medir = id => page.locator(id).evaluate(el => {
      const th = el.closest('table').tHead.rows[0].cells[0], filtro = el.closest('.ami-filtered-table').querySelector('.admin-filter-bar');
      return [th.getBoundingClientRect().width, getComputedStyle(th).backgroundColor, getComputedStyle(th).fontSize,
        filtro.getBoundingClientRect().height, filtro.querySelector('select').getBoundingClientRect().height];
    });
    assert.deepEqual(await medir('#ami-divulgacao-tabela'), await medir('#ami-judgments'), 'Medidas da tabela de referência');
    await page.setViewportSize({width: 390, height: 900});
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
    await verificarEspacos(espacosDesktop);
    assert.equal(await medirLinha(), true);
    const [superior, inferior] = await medirEditor();
    assert.equal(superior.left, inferior.left);
    assert.ok(superior.bottom <= inferior.top);
    await page.locator('#ami-environment-edit').click();
    await page.locator('#ami-public-monitor-host #ami-monitor-table').getByText('Ana Lima').waitFor();
    assert.equal(await page.locator('#ami-public-monitor-host #ami-monitor-table').getByText('Beatriz Melo').count(), 0);
    const limpar = painel.getByRole('button', {name: 'Limpar seleção', exact: true});
    const excluir = painel.getByRole('button', {name: 'Excluir selecionados', exact: true});
    const caio = tabela.locator('tr[data-email="caio@example.org"]');
    assert.equal(await limpar.locator('.fa-broom').count(), 1);
    assert.equal(await excluir.locator('.fa-xmark').count(), 1);
    await bia.getByRole('checkbox').check();
    await limpar.click();
    assert.equal(await bia.getByRole('checkbox').isChecked(), false);
    assert.equal(await excluir.isDisabled(), true);
    assert.equal(contatos.length, 3);
    await bia.getByRole('checkbox').check();
    await caio.getByRole('checkbox').check();
    await excluir.click();
    await bia.waitFor({state: 'detached'});
    assert.equal(salvamentos.length, 1);
    assert.equal(contatos.length, 3);
    await painel.getByLabel('Nome do destinatário').fill('Dora Reis');
    await painel.getByLabel('E-mail do destinatário').fill('dora@example.org');
    await adicionar.click();
    await painel.getByRole('button', {name: 'Atualizar lista existente'}).click();
    await modal.getByLabel('Lista a atualizar').selectOption({label: 'Equipe de consulta'});
    await modal.getByRole('button', {name: 'Atualizar lista', exact: true}).click();
    await painel.getByText('Convidados da rodada e lista “Equipe de consulta” salvos.').waitFor();
    assert.deepEqual(salvamentos[1].removidos, ['bia@example.org', 'caio@example.org']);
    assert.deepEqual(contatos.map(item => item.email), ['ana@example.org', 'dora@example.org']);
    assert.deepEqual(catalogo[0].destinatarios, [{nome: 'Dora Reis', email: 'dora@example.org'}]);
    await tabela.locator('tr[data-email="dora@example.org"]').getByRole('checkbox').check();
    await excluir.click();
    await painel.locator('#ami-divulgacao-salvar').click();
    await painel.getByText('Convidados da rodada salvos.', {exact: true}).waitFor();
    assert.deepEqual(contatos.map(item => item.email), ['ana@example.org']);
    assert.equal(registros.length, 2);
    await page.locator('#ami-public-monitor-host #ami-monitor-table').getByText('Ana Lima').waitFor();
    assert.deepEqual(erros, []);
    console.log('PASS: tipografia, espaçamento, ações de seleção e exclusão, envio e tabela responsiva');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exit(1); });
