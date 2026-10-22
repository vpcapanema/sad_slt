(function () {
  const select = document.querySelector("#complementacao-hierarquizacao");
  const form = document.querySelector("#complementacao-form");
  const campos = document.querySelector("#complementacao-campos");
  const resumo = document.querySelector("#complementacao-resumo");
  const status = document.querySelector("#complementacao-status");
  const salvar = form.querySelector('button[type="submit"]');
  let itens = [];
  let selecionada = null;
  let tipo = "projeto";
  let revisao = 0;
  const editor = document.querySelector('#complementacao-editor');
  const controles = [...document.querySelectorAll('[data-complementacao]')];
  const cadastro = document.querySelector('#complementacao-cadastro');
  const grupos = ['cadastro', 'geometria'];
  const camposCadastro = {
    origem_sei_processo: ['Processo SEI', 'text'],
    nome: ['Nome', 'text'], descricao: ['Descrição', 'textarea'],
    objetivo_estrategico: ['Objetivo estratégico', 'textarea'], responsavel: ['Responsável', 'text'],
    objetivo: ['Objetivo', 'textarea'], publico_alvo: ['Público-alvo', 'textarea'],
    justificativa: ['Justificativa', 'textarea'], orgao_responsavel: ['Órgão responsável', 'text'],
    vigencia_inicio: ['Vigência inicial', 'date'], vigencia_fim: ['Vigência final', 'date'],
    valor_global: ['Valor global (R$)', 'number'],
  };
  const porTipo = {
    projeto: ['nome', 'descricao', 'vigencia_inicio', 'vigencia_fim', 'valor_global'],
    plano: ['origem_sei_processo', 'nome', 'descricao', 'objetivo_estrategico', 'responsavel', 'vigencia_inicio', 'vigencia_fim', 'valor_global'],
    programa: ['origem_sei_processo', 'nome', 'descricao', 'objetivo', 'publico_alvo', 'justificativa', 'orgao_responsavel', 'valor_global'],
  };

  const caminho = (tipoDemanda, codigo) => `/api/complementacao/demandas/${encodeURIComponent(tipoDemanda)}/${encodeURIComponent(codigo)}`;
  window.SLTComplementacaoTabela = {
    listar: tipoDemanda => api(`/api/complementacao/demandas/${encodeURIComponent(tipoDemanda)}`),
    selecionar(tipoDemanda, registros) {
      const proxima = registros.length === 1 ? registros[0] : null;
      if (tipo !== tipoDemanda || selecionada?.id !== proxima?.id) {
        revisao += 1;
        editor.classList.add('hidden');
        mensagem('');
        controles.forEach(button => button.setAttribute('aria-pressed', 'false'));
      }
      tipo = tipoDemanda;
      selecionada = proxima;
      controles.forEach(button => { button.disabled = !selecionada; });
      const resumoSelecao = document.querySelector('#complementacao-selecao');
      resumoSelecao.textContent = selecionada
        ? `${selecionada.id} — ${selecionada.nome}`
        : registros.length > 1 ? 'Selecione somente uma demanda para complementar.' : '';
      resumoSelecao.hidden = !resumoSelecao.textContent;
    },
  };

  function mensagem(texto, erro = false) {
    status.textContent = texto;
    status.classList.toggle('is-error', erro);
  }

  async function abrir(modo) {
    if (!selecionada) return;
    const versao = ++revisao;
    const alvo = selecionada, tipoAlvo = tipo;
    editor.classList.remove('hidden');
    grupos.forEach(grupo => document.querySelector(`#complementacao-${grupo}`).classList.add('hidden'));
    controles.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.complementacao === modo)));
    document.querySelector('#complementacao-editor-titulo').textContent = `1.1 ${controles.find(button => button.dataset.complementacao === modo).textContent.trim()}`;
    resumo.textContent = `${alvo.id} — ${alvo.nome}`;
    mensagem('Carregando…');
    try {
      const registro = await api(caminho(tipoAlvo, alvo.id));
      if (revisao !== versao) return;
      if (modo === 'cadastro') {
        document.querySelector('#complementacao-editor-titulo').textContent = tipoAlvo === 'projeto' ? '1.1 Informa\u00e7\u00f5es do Projeto' : '1.1 Dados cadastrais';
        document.querySelector('#complementacao-cadastro-campos').classList.toggle('complementacao-grid', tipoAlvo !== 'projeto');
        document.querySelector('#complementacao-cadastro-campos').innerHTML = tipoAlvo === 'projeto'
          ? SLTProjectForm.html(registro)
          : porTipo[tipoAlvo].map(campo => {
          const [rotulo, formato] = camposCadastro[campo];
          let valor = registro[campo] ?? '';
          if (formato === 'date') valor = String(valor).slice(0, 10);
          const attrs = `id="cadastro-${campo}" name="${campo}"${campo === 'nome' ? ' required maxlength="200"' : ''}`;
          return `<div class="form-field"><label for="cadastro-${campo}">${rotulo}</label>${formato === 'textarea'
            ? `<textarea ${attrs} rows="3">${esc(valor)}</textarea>`
            : `<input ${attrs} type="${formato}" value="${esc(valor)}"${formato === 'number' ? ' step="0.01" min="0"' : ''}>`}</div>`;
        }).join('');
        if (tipoAlvo === 'projeto') SLTProjectForm.bind(registro);
      } else {
        document.querySelector('#complementacao-arquivo').value = '';
      }
      document.querySelector(`#complementacao-${modo}`).classList.remove('hidden');
      mensagem('');
    } catch (erro) {
      if (revisao === versao) mensagem(erro.message, true);
    }
  }
  controles.forEach(button => button.addEventListener('click', () => abrir(button.dataset.complementacao)));

  cadastro.addEventListener('submit', async event => {
    event.preventDefault();
    if (!selecionada) return;
    const url = caminho(tipo, selecionada.id), versao = revisao;
    const payload = tipo === 'projeto' ? SLTProjectForm.collect() : {};
    for (const input of (tipo === 'projeto' ? [] : cadastro.querySelectorAll('[name]'))) {
      payload[input.name] = input.value.trim() === '' ? null : input.type === 'number' ? Number(input.value) : input.value;
    }
    const button = cadastro.querySelector('button');
    button.disabled = true;
    try {
      await api(`${url}/cadastro`, {method: 'PATCH', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload)});
      if (versao === revisao) mensagem('Dados cadastrais salvos. A demanda permanece aguardando complementação até a retomada da análise.');
      document.dispatchEvent(new Event('complementacao-salva'));
    } catch (erro) { mensagem(erro.message, true); }
    finally { button.disabled = false; }
  });

  document.querySelector('#complementacao-enviar').addEventListener('click', async event => {
    const file = document.querySelector('#complementacao-arquivo').files[0];
    if (!selecionada || !file) { mensagem('Selecione o arquivo da geometria.', true); return; }
    const url = caminho(tipo, selecionada.id), versao = revisao;
    const button = event.currentTarget;
    button.disabled = true;
    const enviar = (etapa, confirmacao) => {
      const body = new FormData(); body.append('file', file);
      if (confirmacao) body.append('confirmacao', confirmacao);
      return api(`${url}/geometria/${etapa}`, {method: 'POST', body});
    };
    try {
      mensagem('Conferindo geometria…');
      const resultado = await enviar('conferir');
      if (versao !== revisao) return;
      if (!resultado.permitido) throw new Error(resultado.mensagem || 'Geometria fora da abrangência permitida.');
      const confirmou = await SLTAdminUi.showConfirm({title: 'Substituir geometria', message: resultado.mensagem, confirmLabel: 'Confirmar e substituir', cancelLabel: 'Cancelar'});
      if (!confirmou || versao !== revisao) { mensagem('Substituição cancelada.'); return; }
      mensagem('Salvando geometria…');
      await enviar('substituir', resultado.confirmacao);
      if (versao === revisao) mensagem('Geometria substituída. Arquivo original e versões anteriores preservados no histórico.');
      document.dispatchEvent(new Event('complementacao-salva'));
    } catch (erro) { mensagem(erro.message, true); }
    finally { button.disabled = false; }
  });

  const esc = (valor) => String(valor ?? "").replace(
    /[&<>"']/g,
    (caractere) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[caractere]),
  );

  async function api(url, opcoes) {
    const resposta = await fetch(url, { credentials: "same-origin", ...opcoes });
    const corpo = await resposta.json().catch(() => ({}));
    if (!resposta.ok) throw new Error(corpo.detail || `HTTP ${resposta.status}`);
    return corpo;
  }

  const containerAtributos = document.querySelector('#complementacao-atributos-container');
  const statusAtributos = document.querySelector('#complementacao-atributos-status');
  const editar = document.querySelector('#complementacao-atributos-editar');
  const cancelar = document.querySelector('#complementacao-atributos-cancelar');
  const recarregar = document.querySelector('#complementacao-atributos-recarregar');
  const tamanhoPagina = document.querySelector('#complementacao-atributos-page-size');
  const paginacaoAtributos = document.querySelector('#complementacao-atributos-pagination');
  const tabelaAtributos = campos.querySelector('table');
  let linhasAtributos = [], paginaAtributos = 1;
  let atual = null, editando = false, alterado = false, ocupado = false;
  let hierarquiaAtual = '', revisaoAtributos = 0;
  const caminhoAtributos = codigo => `/api/complementacao/hierarquizacoes/${encodeURIComponent(codigo)}`;
  const ordenarAtributos = SLTTable.sorting(tabelaAtributos,
    () => [...tabelaAtributos.tHead.rows[0].cells].map((_, indice) => linha => {
      const celula = linha.cells[indice];
      return celula.querySelector('input, select')?.value ?? celula.textContent.trim();
    }),
    () => { paginaAtributos = 1; paginarAtributos(); },
    () => !ocupado);

  function paginarAtributos() {
    const linhas = ordenarAtributos(linhasAtributos);
    const resultado = SLTTable.paginate(paginacaoAtributos.id, linhas, paginaAtributos, pagina => {
      paginaAtributos = pagina;
      paginarAtributos();
    }, Number(tamanhoPagina.value));
    paginaAtributos = resultado.page;
    const visiveis = new Set(resultado.rows);
    // Mantém os campos de todas as páginas no formulário para validar e salvar o lote inteiro.
    linhas.forEach(linha => { linha.hidden = !visiveis.has(linha); });
    tabelaAtributos.tBodies[0].replaceChildren(...linhas);
    document.querySelector('#complementacao-atributos-summary').textContent =
      `${resultado.rows.length} na página / ${linhas.length} no total`;
    tamanhoPagina.disabled = ocupado;
    paginacaoAtributos.querySelectorAll('button').forEach(button => { button.disabled ||= ocupado; });
  }

  tamanhoPagina.addEventListener('change', () => {
    paginaAtributos = 1;
    paginarAtributos();
  });
  let revelandoInvalido = false;
  form.addEventListener('invalid', event => {
    if (revelandoInvalido) return;
    const linha = event.target.closest('[data-objeto-id]');
    const indice = ordenarAtributos(linhasAtributos).indexOf(linha);
    if (indice < 0) return;
    revelandoInvalido = true;
    paginaAtributos = Math.floor(indice / Number(tamanhoPagina.value)) + 1;
    paginarAtributos();
    setTimeout(() => { revelandoInvalido = false; }, 0);
  }, true);

  function mensagemAtributos(texto, erro = false) {
    statusAtributos.textContent = texto;
    statusAtributos.classList.toggle('is-error', erro);
  }

  function atualizarAcoes() {
    select.disabled = ocupado || !itens.length;
    const editavel = atual?.pode_editar && campos.querySelector('[data-atributo-coluna]');
    editar.disabled = ocupado || editando || !editavel;
    salvar.disabled = ocupado || !editando;
    cancelar.disabled = ocupado || !editando;
    AtributosObjetos.definirEdicao(!ocupado && editando && atual?.pode_editar);
    form.setAttribute('aria-busy', String(ocupado));
    paginarAtributos();
  }

  async function render(item) {
    await AtributosObjetos.render(item, {complementacao: true, colunas: item.colunas, dominios: item.dominios});
    linhasAtributos = [...tabelaAtributos.tBodies[0].rows];
    paginaAtributos = 1;
    SLTResumoFase.secao1(document.querySelector('#complementacao-resumo-hierarquizacao'), item, {mostrarDataCriacao: true});
    atual = item;
    editando = false;
    alterado = false;
    form.classList.remove("hidden");
    document.querySelector('#complementacao-atributos-resumo').textContent = `${item.nome || item.codigo} · ${item.dados_hierarquizacao.objetos.length} demanda(s) autorizada(s)`;
    atualizarAcoes();
    mensagemAtributos('');
  }

  async function podeDescartar() {
    if (!alterado) return true;
    ocupado = true;
    atualizarAcoes();
    try {
      return await SLTAdminUi.showConfirm({
        title: 'Descartar alterações dos atributos',
        message: 'Existem alterações não confirmadas. Deseja descartá-las?',
        confirmLabel: 'Descartar alterações', cancelLabel: 'Continuar editando',
      });
    } finally { ocupado = false; atualizarAcoes(); }
  }

  async function carregarAtributos() {
    ocupado = true;
    atualizarAcoes();
    recarregar.classList.add('hidden');
    mensagemAtributos('Carregando hierarquizações autorizadas…');
    try {
      itens = await api('/api/complementacao/objetos');
      const hierarquizacoes = [...new Map(itens.map(item => [item.hierarquizacao_codigo, item])).values()];
      select.innerHTML = '<option value="">Selecione uma hierarquização</option>' + hierarquizacoes.map(item =>
        `<option value="${esc(item.hierarquizacao_codigo)}">${esc(item.hierarquizacao_codigo)} — ${esc(item.hierarquizacao_nome || '')}</option>`).join('');
      document.querySelector('#complementacao-sem-atributos').classList.toggle('hidden', itens.length > 0);
      mensagemAtributos(itens.length ? 'Selecione uma hierarquização para abrir a tabela de atributos.' : '');
    } catch (erro) {
      select.innerHTML = '<option value="">Não foi possível carregar as hierarquizações</option>';
      recarregar.classList.remove('hidden');
      mensagemAtributos(erro.message, true);
    } finally {
      ocupado = false;
      atualizarAcoes();
    }
  }

  select.addEventListener('change', async () => {
    const proxima = select.value;
    select.value = hierarquiaAtual;
    if (ocupado || !await podeDescartar()) return;
    hierarquiaAtual = select.value = proxima;
    atual = null;
    editando = alterado = false;
    form.classList.add('hidden');
    document.querySelector('#complementacao-resumo-hierarquizacao').classList.add('hidden');
    containerAtributos.classList.toggle('hidden', !proxima);
    if (!proxima) {
      atualizarAcoes();
      mensagemAtributos('Selecione uma hierarquização para abrir a tabela de atributos.');
      return;
    }
    const versao = ++revisaoAtributos;
    ocupado = true;
    atualizarAcoes();
    mensagemAtributos('Carregando a tabela de atributos das demandas…');
    try {
      const item = await api(caminhoAtributos(proxima));
      if (versao === revisaoAtributos) await render(item);
    } catch (erro) {
      if (versao === revisaoAtributos) {
        hierarquiaAtual = select.value = '';
        containerAtributos.classList.add('hidden');
        mensagemAtributos(erro.message, true);
      }
    } finally {
      ocupado = false;
      atualizarAcoes();
    }
  });

  editar.addEventListener('click', () => {
    if (!atual?.pode_editar || ocupado) return;
    editando = true;
    atualizarAcoes();
    mensagemAtributos('Edição de atributos habilitada.');
    campos.querySelector('tr:not([hidden]) [data-atributo-coluna]:not([disabled])')?.focus();
  });
  cancelar.addEventListener('click', async () => {
    if (ocupado || !await podeDescartar()) return;
    await render(atual);
    mensagemAtributos('Edição cancelada. Os valores salvos foram preservados.');
  });
  campos.addEventListener('input', () => { if (editando) alterado = true; });
  campos.addEventListener('change', () => { if (editando) alterado = true; });
  recarregar.addEventListener('click', carregarAtributos);
  window.addEventListener('beforeunload', event => {
    if (alterado || ocupado) { event.preventDefault(); event.returnValue = ''; }
  });

  form.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    if (!atual?.pode_editar || !editando || ocupado) return;
    const versao = revisaoAtributos;
    const alvo = atual;
    const {valores} = AtributosObjetos.coletar();
    if (!Object.keys(valores).length) {
      await render(atual);
      mensagemAtributos('Nenhum atributo foi alterado.');
      return;
    }
    ocupado = true;
    atualizarAcoes();
    mensagemAtributos("Confirmando e salvando os atributos…");
    try {
      const salvo = await api(caminhoAtributos(alvo.codigo), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ valores }),
      });
      if (revisaoAtributos !== versao) return;
      await render(salvo);
      mensagemAtributos("Complementação de atributos salva com sucesso.");
    } catch (erro) {
      if (revisaoAtributos === versao) mensagemAtributos(erro.message, true);
    } finally { ocupado = false; atualizarAcoes(); }
  });

  carregarAtributos();
})();
