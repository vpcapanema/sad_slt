(function () {
  'use strict';
  const q = (id) => document.getElementById(id);
  const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const API = '/api/sei/documentos';
  const FORMULARIO_URL = '/public/cadastro/nova-demanda/';
  const SITUACAO = {
    recebido: 'Recebido — campos ainda não lidos',
    sem_texto: 'Aguardando nova análise com OCR',
    analisado: 'Analisado — aguardando revisão',
    demanda_criada: 'Demanda criada',
  };
  const ESTADO_FILA = {
    aguardando: 'Na fila',
    extraindo: 'Extraindo informações…',
    pronto: 'Pronto para revisão',
    erro: 'Falha na extração',
    criada: 'Demanda criada',
  };
  const ROTULOS = {
    nome: 'Nome / objeto', descricao: 'Descrição', objetivo: 'Objetivo',
    objetivo_estrategico: 'Objetivo estratégico', justificativa: 'Justificativa', publico_alvo: 'Público-alvo',
    orgao_responsavel: 'Órgão responsável', maturidade_objeto: 'Maturidade', instituicao_label: 'Instituição',
    instituicao_cnpj: 'CNPJ', representante_nome: 'Representante', representante_email: 'E-mail',
    representante_telefone: 'Telefone', municipio: 'Município', valor_global: 'Valor global',
    prazo_referencia_meses: 'Prazo (meses)', vigencia_inicio: 'Vigência — início',
    vigencia_fim: 'Vigência — fim', lat: 'Latitude', lng: 'Longitude',
    numero_processo: 'Número do processo',
  };

  // Fila de PDFs na ordem de processamento. Cada item: { id, nome, tipo, estado, detalhe, erro, execucao }.
  // `detalhe` é a leitura devolvida pelo extrator, que não é gravada; `execucao` descarta leituras superadas por Reanalisar.
  let fila = [];
  let atualId = null;
  let processando = false;
  let frameSeq = 0;
  let formularioProntoSeq = -1;
  let observadorAltura = null;

  async function request(path, options = {}) {
    const res = await fetch(path, { credentials: 'include', ...options });
    const body = await res.json().catch(() => null);
    if (res.status === 401) {
      location.replace(SLTAdminAuth.loginUrl());
      throw new Error('Sessão SICARD expirada.');
    }
    if (!res.ok) {
      const detail = body?.detail;
      const erro = new Error(typeof detail === 'string' ? detail : Array.isArray(detail) ? detail.map(x => x.msg).join('; ') : 'Não foi possível concluir a operação.');
      // O código do erro é o status HTTP; ele nomeia o modal de desfecho.
      erro.status = res.status;
      throw erro;
    }
    return body;
  }
  const post = (path, body) => request(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });

  const NIVEL_DO_PASSO = { erro: 'error', aviso: 'warning' };

  // Acompanha o job de leitura: cada passo que o servidor registra (página
  // aberta, OCR, campo lido…) vira uma linha do modal, na ordem em que ocorre.
  // Devolve o resultado do job ou lança o erro com o código HTTP equivalente.
  async function acompanharJob(inicial, proc) {
    let job = inicial;
    let vistos = 0;
    let emAndamento = null;
    for (;;) {
      for (const log of job.logs.slice(vistos)) {
        if (emAndamento) proc.atualizar(emAndamento, 'success');
        const status = NIVEL_DO_PASSO[log.nivel];
        const linha = proc.passo(log.mensagem, status || 'progress');
        emAndamento = status ? null : linha;
      }
      vistos = job.logs.length;
      if (job.status !== 'executando') break;
      await new Promise(resolve => setTimeout(resolve, 400));
      job = await request(`${API}/jobs/${job.id}`);
    }
    if (job.status === 'concluido') {
      if (emAndamento) proc.atualizar(emAndamento, 'success');
      return job.resultado;
    }
    const erro = new Error(job.erro || 'A leitura foi interrompida.');
    erro.status = job.erro_status;
    throw erro;
  }

  function aviso(id, texto) {
    q(id).textContent = texto || '';
    q(id).classList.toggle('hidden', !texto);
  }
  const dataHora = (iso) => { const d = new Date(iso); return isNaN(d) ? '—' : d.toLocaleString('pt-BR'); };

  // ---------------------------------------------------------------- tabela

  const ICONES = {
    formulario: { icone: 'fa-file-pen', titulo: 'Abrir no formulário' },
    reanalisar: { icone: 'fa-rotate', titulo: 'Reanalisar o PDF' },
    baixar: { icone: 'fa-file-pdf', titulo: 'Abrir PDF' },
    excluir: { icone: 'fa-trash-can', titulo: 'Excluir documento' },
  };

  function botaoIcone(acao) {
    const { icone, titulo } = ICONES[acao];
    return `<button type="button" class="sei-icone sei-icone--${acao}" data-acao="${acao}" title="${titulo}" aria-label="${titulo}"><i class="fas ${icone}" aria-hidden="true"></i></button>`;
  }

  function acoes(doc) {
    const acoesDoc = doc.demanda_id ? ['baixar'] : ['formulario', 'reanalisar', 'baixar', 'excluir'];
    return acoesDoc.map(botaoIcone).join('');
  }

  async function listar() {
    q('sei-btn-atualizar').disabled = true;
    aviso('sei-lista-aviso', 'Carregando documentos…');
    try {
      const documentos = await request(API);
      q('sei-documentos-body').replaceChildren();
      q('sei-documentos-vazio').classList.toggle('hidden', !!documentos.length);
      aviso('sei-lista-aviso', '');
      for (const doc of documentos) {
        const tr = document.createElement('tr');
        const situacao = SITUACAO[doc.status] || doc.status;
        const demanda = doc.demanda_id ? ` (${esc(doc.demanda_id)})` : '';
        tr.innerHTML = `<td>${esc(doc.nome_arquivo)}${doc.aviso ? `<br><span class="hint">${esc(doc.aviso)}</span>` : ''}</td>
          <td>${esc(doc.numero_processo || '—')}</td>
          <td>${esc(doc.usuario_nome || '—')}</td>
          <td>${esc(dataHora(doc.criado_em))}</td>
          <td>${esc(situacao)}${demanda}</td>
          <td class="sei-acoes">${acoes(doc)}</td>`;
        tr.querySelectorAll('button[data-acao]').forEach(botao => {
          botao.onclick = () => executar(botao, doc, botao.dataset.acao);
        });
        q('sei-documentos-body').append(tr);
      }
    } catch (e) {
      aviso('sei-lista-aviso', e.message);
    } finally { q('sei-btn-atualizar').disabled = false; }
  }

  async function executar(botao, doc, acao) {
    if (acao === 'baixar') { window.open(`${API}/${doc.id}/arquivo`, '_blank', 'noopener'); return; }
    if (acao === 'formulario') { abrirDaTabela(doc); return; }
    if (acao === 'reanalisar') { await reanalisar(doc); return; }
    botao.disabled = true;
    try {
      if (acao === 'excluir') {
        const { ok } = await SLTFeedback.acao({
          confirmacao: {
            title: 'Excluir documento',
            message: `Excluir ${doc.nome_arquivo} do repositório?`,
            detail: 'O PDF é apagado do banco e não pode ser recuperado. Nenhuma demanda é afetada: documento que já gerou demanda não pode ser excluído.',
            confirmLabel: 'Excluir',
            danger: true,
          },
          titulo: 'Excluir documento',
          mensagemInicial: 'Pedindo ao servidor a exclusão do PDF…',
          executar: () => request(`${API}/${doc.id}`, { method: 'DELETE' }),
          sucesso: `${doc.nome_arquivo} foi excluído do repositório.`,
        });
        if (ok) {
          removerDaFila(String(doc.id));
          await listar();
        }
      }
    } catch (e) {
      SLTAdminUi.showToast(e.message, true);
    } finally { botao.disabled = false; }
  }

  // ------------------------------------------------------------------ fila

  function adicionarNaFila(doc, tipo) {
    const id = String(doc.id);
    let item = fila.find(x => x.id === id);
    if (!item) {
      item = { id, nome: doc.nome_arquivo, tipo, estado: 'aguardando', detalhe: null, erro: '', execucao: 0 };
      fila.push(item);
    }
    return item;
  }

  function abrirDaTabela(doc) {
    // A leitura não é gravada: o PDF é lido de novo com o tipo escolhido em "Formulário a preencher".
    const item = adicionarNaFila(doc, q('sei-tipo-demanda').value);
    abrirCard();
    selecionar(item.id);
    processarFila();
  }

  async function reanalisar(doc) {
    const tipo = q('sei-tipo-demanda').value;
    const confirmado = await SLTFeedback.confirmar({
      title: 'Reanalisar o PDF',
      message: `${doc.nome_arquivo} será lido de novo, agora como ${tipo}.`,
      detail: 'O formulário aberto deste documento é recarregado do zero: o que você já tiver editado nele se perde. O PDF e o registro no repositório não mudam, e nenhuma demanda é criada por esta ação.',
      confirmLabel: 'Reanalisar',
      danger: true,
    });
    if (!confirmado) return;
    const item = adicionarNaFila(doc, tipo);
    // Descarta a leitura anterior (inclusive uma ainda em andamento) e recarrega o formulário limpo.
    item.tipo = tipo;
    item.estado = 'aguardando';
    item.detalhe = null;
    item.erro = '';
    item.execucao += 1;
    abrirCard();
    atualId = null;
    selecionar(item.id);
    processarFila();
  }

  function renderFila() {
    q('sei-fila').innerHTML = fila.map((item, indice) => {
      const atual = item.id === atualId ? ' is-atual' : '';
      const detalhe = item.estado === 'erro' && item.erro ? ` — ${esc(item.erro)}` : '';
      return `<li><button type="button" class="sei-fila-item${atual}" data-id="${esc(item.id)}" ${item.estado === 'criada' ? 'disabled' : ''} aria-current="${item.id === atualId}">
        <strong>${indice + 1}. ${esc(item.nome)}</strong> <span class="hint">${esc(ESTADO_FILA[item.estado])} · ${esc(item.tipo)}${detalhe}</span>
      </button></li>`;
    }).join('');
    q('sei-fila').querySelectorAll('button[data-id]').forEach(botao => {
      botao.onclick = () => selecionar(botao.dataset.id);
    });
  }

  async function processarFila() {
    if (processando) return;
    processando = true;
    try {
      let item;
      while ((item = fila.find(x => x.estado === 'aguardando'))) {
        item.estado = 'extraindo';
        const execucao = item.execucao;
        renderFila();
        atualizarStatus();
        const proc = SLTFeedback.processo(`Análise de ${item.nome}`);
        const passo = proc.passo(`Pedindo ao servidor a leitura do PDF como ${item.tipo}…`, 'progress');
        try {
          const job = await post(`${API}/${item.id}/analisar`, { tipo_demanda: item.tipo });
          proc.atualizar(passo, 'success', `Servidor iniciou a leitura como ${item.tipo}.`);
          const leitura = await acompanharJob(job, proc);
          if (execucao !== item.execucao) { proc.fechar(); continue; } // reanalisado durante a leitura: vale a nova
          item.detalhe = leitura;
          item.estado = 'pronto';
          await aguardarFechamento(proc.concluir(desfechoDaLeitura(leitura)));
        } catch (e) {
          if (execucao !== item.execucao) { proc.fechar(); continue; }
          item.estado = 'erro';
          item.erro = e.message;
          // Se o pedido foi aceito, a falha já está no log do job; senão, marca o pedido.
          if (!passo.classList.contains('slt-fb-step--success')) proc.atualizar(passo, 'error', 'O servidor recusou o pedido de leitura.');
          await aguardarFechamento(proc.concluir({
            type: 'error',
            resultados: [linhaDeErro(e), 'O formulário fica em branco para preenchimento manual.'],
          }));
        }
        renderFila();
        if (item.id === atualId) aplicarNoFormulario(item);
      }
    } finally {
      processando = false;
    }
    listar();
  }

  function removerDaFila(id) {
    fila = fila.filter(x => x.id !== id);
    if (atualId === id) avancar();
    else renderFila();
  }

  function avancar() {
    const proximo = fila.find(x => x.estado !== 'criada');
    if (proximo) selecionar(proximo.id);
    else fecharCard();
  }

  // ------------------------------------------------------------ cardzão

  function abrirCard() {
    const secao = q('sei-formulario-section');
    if (secao.classList.contains('hidden')) {
      secao.classList.remove('hidden');
      secao.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function fecharCard() {
    fila = [];
    atualId = null;
    frameSeq += 1;
    observadorAltura?.disconnect();
    q('sei-formulario-frame').removeAttribute('src');
    erroFormulario('');
    q('sei-formulario-status').textContent = '';
    q('sei-fila').innerHTML = '';
    q('sei-formulario-section').classList.add('hidden');
  }

  function erroFormulario(texto) {
    q('sei-formulario-erro').textContent = texto || '';
  }

  function atualizarStatus() {
    const item = fila.find(x => x.id === atualId);
    const status = q('sei-formulario-status');
    const confirmar = q('sei-btn-confirmar');
    if (!item) { status.textContent = ''; confirmar.disabled = true; return; }
    const carregado = formularioProntoSeq === frameSeq;
    if (!carregado) {
      status.textContent = 'Carregando o formulário oficial…';
    } else if (item.estado === 'aguardando' || item.estado === 'extraindo') {
      status.textContent = 'Extraindo informações do PDF e preenchendo o formulário…';
    } else if (item.estado === 'erro') {
      status.textContent = 'Não foi possível extrair informações deste PDF. Preencha o formulário manualmente.';
    }
    // Enquanto a extração não termina, a confirmação espera para não criar demanda com o formulário incompleto.
    confirmar.disabled = !carregado || item.estado === 'aguardando' || item.estado === 'extraindo';
  }

  function selecionar(id) {
    const item = fila.find(x => x.id === id);
    // Clicar no item já aberto não recarrega o formulário (perderia o que foi editado).
    if (!item || item.estado === 'criada' || id === atualId) return;
    atualId = id;
    renderFila();
    carregarFormulario(item);
  }

  function ajustarAltura(frame) {
    observadorAltura?.disconnect();
    const doc = frame.contentDocument;
    if (!doc?.body) return;
    const medir = () => {
      const altura = doc.documentElement.scrollHeight;
      if (Math.abs(frame.offsetHeight - altura) > 1) frame.style.height = `${altura}px`;
    };
    medir();
    observadorAltura = new ResizeObserver(medir);
    observadorAltura.observe(doc.body);
  }

  function carregarFormulario(item) {
    const seq = ++frameSeq;
    const frame = q('sei-formulario-frame');
    erroFormulario('');
    atualizarStatus();
    frame.onload = async () => {
      if (seq !== frameSeq) return;
      ajustarAltura(frame);
      try {
        await frame.contentWindow.SLTCadastroEmbed.pronto;
      } catch (e) {
        if (seq === frameSeq) erroFormulario(`Não foi possível carregar o formulário: ${e.message}`);
        return;
      }
      if (seq !== frameSeq) return;
      formularioProntoSeq = seq;
      aplicarNoFormulario(item);
    };
    frame.src = `${FORMULARIO_URL}?embed=sei&tipo=${encodeURIComponent(item.tipo)}`;
  }

  function aplicarNoFormulario(item) {
    if (item.id !== atualId) return;
    atualizarStatus();
    if (formularioProntoSeq !== frameSeq || item.estado !== 'pronto') return;
    try {
      const preenchidos = q('sei-formulario-frame').contentWindow.SLTCadastroEmbed.preencher(item.detalhe);
      q('sei-formulario-status').textContent = `${preenchidos} campo(s) preenchido(s) a partir do PDF (destacados em verde). Revise e complete o formulário.`;
    } catch (e) {
      erroFormulario(`Não foi possível preencher o formulário: ${e.message}`);
    }
  }

  // -------------------------------------------------------------- desfecho

  const rotulo = (chave) => ROTULOS[chave] || chave;
  const linhaDeErro = (e) => ({ message: `Erro ${e.status || 'de conexão'}: ${e.message}`, status: 'error' });

  // O desfecho fica na tela até o usuário dispensá-lo; só então o próximo PDF
  // da fila começa, para que nenhum resultado passe despercebido.
  function aguardarFechamento(backdrop) {
    const raiz = backdrop?.parentNode;
    if (!raiz) return Promise.resolve();
    return new Promise(resolve => {
      const observador = new MutationObserver(() => {
        if (backdrop.isConnected) return;
        observador.disconnect();
        resolve();
      });
      observador.observe(raiz, { childList: true });
    });
  }

  // Estes valores não têm campo de texto no formulário: instituição e
  // representante são escolhidos no SIGMA, e o CNPJ vem junto dessa escolha.
  // Lidos do PDF, servem para o analista localizar ou cadastrar o proponente —
  // e sem mostrá-los o desfecho prometia campos que a tela nunca preencheria.
  const SO_NO_SIGMA = ['instituicao_label', 'instituicao_cnpj', 'municipio',
                       'representante_nome', 'representante_email', 'representante_telefone'];

  function lidosSoNoSigma(leitura) {
    const campos = leitura.campos_sugeridos || {};
    return SO_NO_SIGMA
      .filter(campo => campos[campo] !== undefined && campos[campo] !== null && campos[campo] !== '')
      .map(campo => `${ROTULOS[campo] || campo}: ${campos[campo]}`);
  }

  /** Resultado da leitura, um por linha: lidos (verde), sem valor ou concorrentes (amarelo). */
  function linhasDaLeitura(leitura) {
    const campos = leitura.campos_sugeridos || {};
    const resumo = leitura.analise?.resumo;
    const linhas = [];
    if (leitura.numero_processo) linhas.push({ message: `Processo SEI: ${leitura.numero_processo}`, status: 'info' });
    for (const [chave, valor] of Object.entries(campos)) {
      if (valor === undefined || valor === null || valor === '') continue;
      const texto = String(valor);
      linhas.push({ message: `${rotulo(chave)}: ${texto.length > 140 ? `${texto.slice(0, 140)}…` : texto}`, status: 'success' });
    }
    for (const chave of resumo?.campos_faltando || []) {
      linhas.push({ message: `${rotulo(chave)}: não encontrado no PDF`, status: 'warning' });
    }
    for (const chave of resumo?.campos_conflitantes || []) {
      linhas.push({ message: `${rotulo(chave)}: valores concorrentes no PDF, nenhum escolhido`, status: 'warning' });
    }
    if (lidosSoNoSigma(leitura).length) {
      linhas.push({
        message: 'Instituição, CNPJ, município e representante não têm campo no formulário: use os valores lidos para escolhê-los ou cadastrá-los no SIGMA.',
        status: 'info',
      });
    }
    if (!linhas.length) linhas.push({ message: 'Nenhum campo com valor sustentado no PDF.', status: 'warning' });
    return linhas;
  }

  function desfechoDaLeitura(leitura) {
    const resumo = leitura.analise?.resumo;
    return {
      type: !resumo || resumo.desfecho === 'sucesso' ? 'success' : 'warning',
      resultados: linhasDaLeitura(leitura),
    };
  }

  async function confirmar() {
    const item = fila.find(x => x.id === atualId);
    if (!item) return;
    erroFormulario('');
    let dados;
    try {
      dados = q('sei-formulario-frame').contentWindow.SLTCadastroEmbed.coletar();
    } catch (e) {
      // A validação do formulário oficial barrou o envio: nada foi ao servidor.
      erroFormulario(e.message);
      SLTFeedback.notify('warning', [e.message, 'Nada foi enviado ao servidor: complete o formulário e confirme de novo.'], 'Criar demanda');
      return;
    }
    const nome = dados.campos?.nome || item.nome;
    const confirmado = await SLTFeedback.confirmar({
      title: 'Criar demanda',
      message: `Criar ${dados.tipo} "${nome}" a partir de ${item.nome}?`,
      detail: 'A demanda é gravada no banco com os dados do formulário, na situação inicial de análise. O PDF fica ligado a ela e deixa de poder ser reanalisado ou excluído.',
      confirmLabel: 'Criar demanda',
    });
    if (!confirmado) return;
    const botao = q('sei-btn-confirmar');
    botao.disabled = true;
    const proc = SLTFeedback.processo('Criar demanda');
    proc.passo('Formulário validado pelas regras do cadastro oficial.', 'success');
    const passo = proc.passo(`Enviando o ${dados.tipo} ao servidor…`, 'progress');
    try {
      const criada = await post(`${API}/${item.id}/criar-demanda`, { tipo_demanda: dados.tipo, campos: dados.campos });
      item.estado = 'criada';
      proc.atualizar(passo, 'success', `Servidor respondeu: ${criada.ja_existia ? 'demanda já existente' : 'demanda gravada'}.`);
      // O próximo PDF da fila só abre depois que o desfecho for lido.
      await aguardarFechamento(proc.concluir(criada.ja_existia
        ? {
            type: 'warning',
            resultados: [
              `Demanda ${criada.id} já existia para ${item.nome}.`,
              'Nada novo foi gravado.',
            ],
          }
        : {
            type: 'success',
            resultados: [
              `Demanda criada: ${criada.id}`,
              `Tipo: ${dados.tipo}`,
              `Nome: ${nome}`,
              `Origem: ${item.nome}`,
            ],
          }));
      avancar();
      await listar();
    } catch (e) {
      proc.atualizar(passo, 'error', 'O servidor recusou a criação.');
      erroFormulario(e.message);
      await aguardarFechamento(proc.concluir({
        type: 'error',
        // Só a recusa de validação garante que nada foi gravado.
        resultados: [linhaDeErro(e), e.status === 422
          ? 'Nenhuma demanda foi gravada.'
          : 'Confira a tabela antes de tentar de novo: a demanda pode ter sido gravada antes da falha.'],
      }));
      botao.disabled = false;
    }
  }

  async function descartar() {
    const item = fila.find(x => x.id === atualId);
    if (!item) return;
    const confirmado = await SLTFeedback.confirmar({
      title: 'Descartar demanda',
      message: `Fechar ${item.nome} sem criar demanda?`,
      detail: 'O que foi preenchido ou editado no formulário se perde. O PDF continua no repositório e pode ser reaberto pela tabela.',
      confirmLabel: 'Descartar',
      danger: true,
    });
    if (confirmado) removerDaFila(item.id);
  }

  // ----------------------------------------------------------------- envio

  async function enviar(event) {
    event.preventDefault();
    const entrada = q('sei-arquivos');
    if (!entrada.files.length) return;
    const tipo = q('sei-tipo-demanda').value;
    // A seleção é copiada antes do modal: o input não é tocado durante a espera.
    const arquivos = [...entrada.files];
    const confirmado = await SLTFeedback.confirmar({
      title: 'Enviar e analisar PDFs do SEI',
      message: `${arquivos.length} arquivo(s) para o formulário de ${tipo}: ${arquivos.map(a => a.name).join(', ')}.`,
      detail: 'Cada PDF é guardado no repositório e lido em seguida, um de cada vez. A leitura só preenche o que estiver sustentado no documento. Nenhuma demanda é criada agora: você ainda revisa e confirma cada formulário.',
      confirmLabel: 'Enviar e analisar',
    });
    if (!confirmado) return;
    const dados = new FormData();
    for (const arquivo of arquivos) dados.append('arquivos', arquivo);
    // O tipo decide o contrato de campos, e a leitura acontece já no envio.
    dados.append('tipo_demanda', tipo);
    q('sei-btn-enviar').disabled = true;
    const proc = SLTFeedback.processo(`Enviar e analisar ${arquivos.length} PDF(s)`);
    const passo = proc.passo(`Enviando ${arquivos.length} arquivo(s) ao servidor para gravar e ler…`, 'progress');
    try {
      const job = await request(API, { method: 'POST', body: dados });
      entrada.value = '';
      proc.atualizar(passo, 'success', 'Arquivos recebidos pelo servidor; leitura iniciada.');
      // Cada arquivo, página e campo lido aparece como linha enquanto o job roda.
      const resultado = await acompanharJob(job, proc);
      const erros = resultado.erros || [];
      if (erros.length) {
        // Recusa parcial: o modal fica amarelo e lista cada arquivo, aceito ou recusado.
        await aguardarFechamento(proc.concluir({
          type: 'warning',
          resultados: [
            ...resultado.recebidos.map(doc => ({ message: `${doc.nome_arquivo}: aceito`, status: 'success' })),
            ...erros.map(e => ({ message: `${e.arquivo}: recusado — ${e.mensagem}`, status: 'error' })),
          ],
        }));
      } else {
        proc.fechar();
      }
      const recusados = erros.map(e => `${e.arquivo}: ${e.mensagem}`).join(' ');
      aviso('sei-upload-aviso', `${resultado.recebidos.length} documento(s) recebido(s).${recusados ? ' Recusados — ' + recusados : ''}`);
      if (resultado.recebidos.length) {
        // A leitura veio do servidor junto do arquivo: não há o que reprocessar.
        const novos = resultado.recebidos.map(doc => {
          const item = adicionarNaFila(doc, tipo);
          item.detalhe = doc;
          item.estado = 'pronto';
          return item;
        });
        abrirCard();
        if (!atualId) selecionar(novos[0].id);
        else renderFila();
        for (const item of novos) {
          const desfecho = desfechoDaLeitura(item.detalhe);
          await aguardarFechamento(SLTFeedback.notify(desfecho.type, desfecho.resultados, `Análise de ${item.nome}`));
        }
      }
      await listar();
    } catch (e) {
      // Nenhum arquivo aceito (ou falha de conexão): o erro fica no modal, em vermelho.
      if (!passo.classList.contains('slt-fb-step--success')) proc.atualizar(passo, 'error', 'O servidor recusou o envio.');
      aviso('sei-upload-aviso', e.message);
      await aguardarFechamento(proc.concluir({
        type: 'error',
        // 413 = lote grande demais, conferido antes de gravar; 422 = todos recusados.
        // Outros códigos (503, 500, conexão) podem vir depois de arquivos já gravados.
        resultados: [linhaDeErro(e), [413, 422].includes(e.status)
          ? 'Nenhum arquivo foi gravado.'
          : 'Confira a tabela antes de reenviar: parte dos arquivos pode ter sido gravada antes da falha.'],
      }));
    } finally { q('sei-btn-enviar').disabled = false; }
  }

  async function init() {
    if (!await SLTAdminAuth.requireAuth()) return;
    q('sei-upload-form').onsubmit = enviar;
    q('sei-btn-atualizar').onclick = listar;
    q('sei-btn-confirmar').onclick = confirmar;
    q('sei-btn-descartar').onclick = descartar;
    await listar();
  }
  init().catch(e => SLTAdminUi.showToast(e.message, true));
})();
