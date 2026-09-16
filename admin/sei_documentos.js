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
        const confirmado = await SLTAdminUi.showConfirm({
          title: 'Excluir documento', message: `Excluir ${doc.nome_arquivo} do repositório?`,
          confirmLabel: 'Excluir', danger: true,
        });
        if (!confirmado) return;
        await request(`${API}/${doc.id}`, { method: 'DELETE' });
        removerDaFila(String(doc.id));
        await listar();
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
        const proc = SLTFeedback.processo(`Analisando ${item.nome}`);
        const passo = proc.passo('Lendo o PDF e extraindo os campos…', 'progress');
        try {
          const leitura = await post(`${API}/${item.id}/analisar`, { tipo_demanda: item.tipo });
          if (execucao !== item.execucao) { proc.fechar(); continue; } // reanalisado durante a leitura: vale a nova
          item.detalhe = leitura;
          item.estado = 'pronto';
          proc.atualizar(passo, 'success', 'PDF lido pelo servidor.');
          await aguardarFechamento(proc.concluir(desfechoDaLeitura(item.nome, leitura)));
        } catch (e) {
          if (execucao !== item.execucao) { proc.fechar(); continue; }
          item.estado = 'erro';
          item.erro = e.message;
          proc.atualizar(passo, 'error', 'Leitura interrompida.');
          await aguardarFechamento(proc.concluir({
            type: 'error',
            title: `Erro ${e.status || 'de conexão'} — não foi possível analisar`,
            message: `${item.nome}: ${e.message}`,
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

  const rotular = (chaves) => chaves.map(chave => ROTULOS[chave] || chave).join(', ');

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

  function desfechoDaLeitura(nome, leitura) {
    const resumo = leitura.analise?.resumo;
    if (!resumo) {
      return { type: 'success', title: 'Analisado', message: `${nome}: leitura concluída. Revise o formulário e confirme.` };
    }
    const total = resumo.campos_avaliados.length;
    if (resumo.desfecho === 'sucesso') {
      return {
        type: 'success',
        title: 'Analisado com sucesso',
        message: `${nome}: os ${total} campos que o sistema sabe ler foram extraídos do PDF, cada um com o trecho que o sustenta. Revise o formulário e confirme para criar a demanda.`,
      };
    }
    const ressalvas = [];
    if (resumo.campos_faltando.length) ressalvas.push(`sem valor sustentado no PDF: ${rotular(resumo.campos_faltando)}`);
    if (resumo.campos_conflitantes.length) ressalvas.push(`com valores concorrentes, nenhum escolhido: ${rotular(resumo.campos_conflitantes)}`);
    return {
      type: 'warning',
      title: 'Analisado com ressalvas',
      message: `${nome}: ${resumo.campos_lidos.length} de ${total} campos vieram do PDF. Ficaram em branco para você preencher — ${ressalvas.join('; ')}.`,
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
      erroFormulario(e.message);
      return;
    }
    const botao = q('sei-btn-confirmar');
    botao.disabled = true;
    try {
      const criada = await post(`${API}/${item.id}/criar-demanda`, { tipo_demanda: dados.tipo, campos: dados.campos });
      item.estado = 'criada';
      SLTAdminUi.showToast(criada.ja_existia ? `Este documento já havia gerado a demanda ${criada.id}.` : `Demanda ${criada.id} criada a partir do PDF do SEI.`);
      avancar();
      await listar();
    } catch (e) {
      erroFormulario(e.message);
      botao.disabled = false;
    }
  }

  function descartar() {
    // Fecha este PDF sem criar demanda; o arquivo continua no repositório e pode ser reaberto pela tabela.
    if (atualId) removerDaFila(atualId);
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
    q('sei-btn-enviar').disabled = true;
    aviso('sei-upload-aviso', 'Enviando…');
    try {
      const resultado = await request(API, { method: 'POST', body: dados });
      entrada.value = '';
      const recusados = (resultado.erros || []).map(e => `${e.arquivo}: ${e.mensagem}`).join(' ');
      aviso('sei-upload-aviso', `${resultado.recebidos.length} documento(s) recebido(s).${recusados ? ' Recusados — ' + recusados : ''}`);
      if (resultado.recebidos.length) {
        const novos = resultado.recebidos.map(doc => adicionarNaFila(doc, tipo));
        abrirCard();
        if (!atualId) selecionar(novos[0].id);
        else renderFila();
        processarFila();
      }
      await listar();
    } catch (e) {
      aviso('sei-upload-aviso', e.message);
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
