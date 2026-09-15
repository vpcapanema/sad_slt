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
      throw new Error(typeof detail === 'string' ? detail : Array.isArray(detail) ? detail.map(x => x.msg).join('; ') : 'Não foi possível concluir a operação.');
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
    if (acao === 'reanalisar') { reanalisar(doc); return; }
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

  function reanalisar(doc) {
    const item = adicionarNaFila(doc, q('sei-tipo-demanda').value);
    // Descarta a leitura anterior (inclusive uma ainda em andamento) e recarrega o formulário limpo.
    item.tipo = q('sei-tipo-demanda').value;
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
        try {
          const leitura = await post(`${API}/${item.id}/analisar`, { tipo_demanda: item.tipo });
          if (execucao !== item.execucao) continue; // reanalisado durante a leitura: vale a nova
          item.detalhe = leitura;
          item.estado = 'pronto';
        } catch (e) {
          if (execucao !== item.execucao) continue;
          item.estado = 'erro';
          item.erro = e.message;
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
    q('sei-leitura').innerHTML = '';
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
    q('sei-leitura').innerHTML = item.detalhe ? leituraHtml(item.detalhe) : '';
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
    q('sei-leitura').innerHTML = leituraHtml(item.detalhe);
    try {
      const preenchidos = q('sei-formulario-frame').contentWindow.SLTCadastroEmbed.preencher(item.detalhe);
      q('sei-formulario-status').textContent = `${preenchidos} campo(s) preenchido(s) a partir do PDF (destacados em verde). Revise e complete o formulário.`;
    } catch (e) {
      erroFormulario(`Não foi possível preencher o formulário: ${e.message}`);
    }
  }

  function leituraHtml(detalhe) {
    const campos = detalhe.campos_sugeridos || {};
    const evidencias = detalhe.evidencias || {};
    const resultados = detalhe.analise?.campos || {};
    const chaves = Object.keys(ROTULOS).filter(chave => chave in campos || chave in resultados || chave === 'numero_processo' && detalhe.numero_processo);
    const linhas = chaves.map(chave => {
      const valor = chave === 'numero_processo' ? detalhe.numero_processo : campos[chave];
      const resultado = resultados[chave] || {};
      const candidatos = (resultado.candidatos || []).map(c => String(c.valor)).join(' | ');
      const exibido = valor ?? (resultado.estado === 'conflitante' ? `Conflito: ${candidatos}` : 'Não encontrado');
      const texto = chave === 'descricao' ? String(exibido).slice(0, 400) : exibido;
      const lista = resultado.evidencias || (Array.isArray(evidencias[chave]) ? evidencias[chave] : [evidencias[chave]].filter(Boolean));
      const origem = lista.map(e => typeof e === 'string' ? e : `p. ${e.pagina}: ${e.trecho || ''}`).join(' | ');
      const estado = resultado.estado ? ` (${resultado.estado}, ${Math.round((resultado.confianca || 0) * 100)}%)` : '';
      return `<tr><th scope="row">${esc(ROTULOS[chave] + estado)}</th><td>${esc(texto)}</td><td class="hint">${esc(origem)}</td></tr>`;
    }).join('');
    const ausentes = detalhe.analise?.ausentes || Object.keys(ROTULOS).filter(chave => !chaves.includes(chave));
    return `<details class="sei-leitura"><summary>O que o sistema leu do PDF (${chaves.length} campos)</summary>
      <table class="admin-table sei-leitura-tabela"><tbody>${linhas || '<tr><td>Nenhum campo reconhecido.</td></tr>'}</tbody></table>
      ${ausentes.length ? `<p class="hint">Sem valor conclusivo, para você preencher: ${esc(ausentes.map(x => ROTULOS[x] || x).join(', '))}.</p>` : ''}</details>`;
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
    const dados = new FormData();
    for (const arquivo of entrada.files) dados.append('arquivos', arquivo);
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
