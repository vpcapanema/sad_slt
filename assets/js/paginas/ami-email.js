(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  let contexto = null, registros = [], pronto = false, ocupado = false, modo = "create", pagina = 1;
  let loteEmExecucao = false;
  let configuracaoOriginal = null, configuracaoAlterada = false;
  const tituloOrientacoes = "Orientações para preenchimento";
  const tituloConsistencia = "Ajuda com a consistência do julgamento";
  const tituloPrazo = "Prazo para contribuir";
  const aliasInput = $("ami-email-sender-alias"), assuntoInput = $("ami-email-subject"),
    mensagemInput = $("ami-email-template"), mensagemAfterInput = $("ami-email-template-after"),
    mensagemLink = $("ami-email-editor-link");
  const rotulosEnvio = {enviando: "Envio sem confirmação", aceito_smtp: "Enviado",
    falha: "Não enviado", indeterminado: "Resultado indeterminado"};
  const rotulosEntrega = {sem_confirmacao: "Sem confirmação", confirmada: "Entregue", falha: "Devolvido",
    adiada: "Recusado temporariamente pelo destinatário"};
  const ambienteUrl = id => "/api/ahp/comparacao-colaborativa/ambientes/" + encodeURIComponent(id);
  const url = id => ambienteUrl(id) + "/emails";
  const filterColumn = $("ami-monitor-filter-coluna"), filterValue = $("ami-monitor-filter-valor");
  const monitorTable = $("ami-monitor-table"), dataHeader = $("ami-monitor-data-header");
  const monitor = $("ami-monitoring-section"), monitorConvites = monitor.parentElement;
  const monitorPublico = $("ami-public-monitor-host");
  const historyModal = $("ami-email-history-modal"), historyColumn = $("ami-email-history-filter-coluna"),
    historyValue = $("ami-email-history-filter-valor"), historySelected = new Set();
  let historyContext = null, historyPage = 1, historyFiltered = [], historyTrigger = null;
  const detailModal = $("ami-email-detail-modal");
  let detalheAberto = false, detalheTrigger = null;
  let monitorRows = [];
  const selected = new Set();
  let filteredRows = [], visibleCount = 0;
  const rowKey = row => row.destinatario.toLowerCase();
  const chaveSelecao = row => row.inscricao_id || rowKey(row);
  const marcado = row => selected.has(chaveSelecao(row));
  const natureza = row => row.natureza || "convite";
  const registrosPorEmail = new Map();
  const registrosDe = row => registrosPorEmail.get(rowKey(row)) || [];
  const modoMonitor = () => contexto?.publico ? modo === "edit" : modo === "view";
  function definirRegistros(lista) {
    registros = lista;
    registrosPorEmail.clear();
    lista.forEach(item => {
      const chave = rowKey(item);
      if (!registrosPorEmail.has(chave)) registrosPorEmail.set(chave, []);
      registrosPorEmail.get(chave).push(item);
    });
  }
  function historico(row, tipo, lista = registrosDe(row)) {
    return lista.filter(item => natureza(item) === tipo)
      .flatMap(item => [item, ...(item.eventos || []).filter(event => event.tipo === "tentativa" && event.registro)
        .map(event => ({...event.registro, id: item.id + ":" + event.fonte}))])
      .sort((a, b) => Date.parse(b.criado_em) - Date.parse(a.criado_em));
  }
  function estado(row, tipo) {
    const tentativas = historico(row, tipo);
    const atual = tentativas.find(item => item.leitura_status === "confirmada") ||
      tentativas.find(item => item.entrega_status === "confirmada") ||
      tentativas.find(item => item.envio_status === "aceito_smtp") ||
      tentativas.find(item => item.envio_status !== "falha") || tentativas[0];
    if (atual?.leitura_status === "confirmada") return "Lido";
    if (atual && atual.entrega_status !== "sem_confirmacao" && rotulosEntrega[atual.entrega_status]) {
      return rotulosEntrega[atual.entrega_status];
    }
    if (atual) return rotulosEnvio[atual.envio_status];
    if (tipo === "resposta" && !row.resposta_recebida) return "Aguardando resposta";
    return "Não enviado";
  }
  function registroStatusEnvio(row, tipo) {
    const tentativas = historico(row, tipo);
    return tentativas.find(item => item.envio_status === "aceito_smtp") ||
      tentativas.find(item => item.envio_status !== "falha") || tentativas[0];
  }
  function statusEnvio(row, tipo) {
    const atual = registroStatusEnvio(row, tipo);
    if (atual) return rotulosEnvio[atual.envio_status] || "Não enviado";
    return tipo === "resposta" && !row.resposta_recebida ? "Aguardando resposta" : "Não enviado";
  }
  function dataEvento(row, tipo) {
    const datas = (row.eventos || []).filter(evento => evento.tipo === tipo && evento.ocorrido_em)
      .map(evento => Date.parse(evento.ocorrido_em)).filter(Number.isFinite);
    return datas.length ? new Date(Math.min(...datas)).toLocaleString("pt-BR") : "Data não informada";
  }
  function detalhes(row) {
    const aviso = row.envio_status === "aceito_smtp" && !row.dsn_solicitada
      ? " O servidor não oferece confirmação automática de entrega (DSN)." : "";
    const retornos = (row.eventos || []).filter(evento => evento.tipo !== "tentativa").map(evento =>
      [rotulosEntrega[evento.tipo] || (evento.tipo === "leitura" ? "Lido" : evento.tipo),
        evento.detalhe, evento.origem_data,
        evento.coletado_em ? "Consultado em " + new Date(evento.coletado_em).toLocaleString("pt-BR") : ""]
        .filter(Boolean).join(" · ")).join(". ");
    return [row.entrega_status === "confirmada" ? dataEvento(row, "confirmada") : rotulosEntrega[row.entrega_status] || "Sem confirmação",
      row.leitura_status === "confirmada" ? dataEvento(row, "leitura") : "Sem confirmação",
      (row.criado_em ? new Date(row.criado_em).toLocaleString("pt-BR") + " · " : "") +
        (rotulosEnvio[row.envio_status] || "Não enviado") + ". " + (row.detalhe || "") + aviso +
        (retornos ? " " + retornos : "")];
  }
  function dataMonitoramento(row) {
    if (contexto?.publico) return row.registrado_em;
    return registrosDe(row).map(item => item.criado_em).filter(Boolean).sort()[0];
  }
  function cells(row) {
    const data = dataMonitoramento(row);
    return [row.nome, row.destinatario, row.instituicao || "—", data ? new Date(data).toLocaleString("pt-BR") : "—",
      row.etapa_rotulo || (contexto?.publico ? "Inscrito" : "Convite não enviado"),
      contexto?.publico ? "Não se aplica" : statusEnvio(row, "convite"), statusEnvio(row, "resposta")];
  }
  const monitorHeaders = () => [...monitorTable.tHead.rows[0].cells].slice(1).map(th => th.textContent.trim());
  const colunaData = dataHeader.cellIndex - 1;
  const colunasMonitor = monitorHeaders();
  const sortRows = SLTTable.sorting(monitorTable, () => [null, ...colunasMonitor.map((_, index) =>
    index === colunaData ? row => Date.parse(dataMonitoramento(row)) || "" : row => cells(row)[index])], () => { pagina = 1; render(); });
  monitorHeaders().forEach((label, index) => filterColumn.add(new Option(label, String(index))));
  function filterOptions() {
    SLTTable.values(filterValue, monitorRows, row => cells(row)[Number(filterColumn.value)]);
    filterValue.disabled = filterColumn.value === "";
  }
  filterColumn.onchange = () => { filterValue.value = ""; filterOptions(); pagina = 1; render(); };
  filterValue.onchange = () => { pagina = 1; render(); };
  SLTTable.bindFilter("ami-monitor-filter", () => { pagina = 1; render(); }, () => { filterColumn.value = ""; filterValue.value = ""; filterOptions(); });
  const sortHistory = SLTTable.sorting($("ami-email-history-table"),
    () => [null, ...[0, 1, 2].map(index => row => detalhes(row)[index])],
    () => { historyPage = 1; renderHistorico(); });
  ["Entrega", "Leitura", "Detalhes"].forEach((label, index) => historyColumn.add(new Option(label, String(index))));
  function exportar(rows, headings, filename) {
    const quote = value => '"' + String(value).replace(/^[=+@-]/, "'$&").replace(/"/g, '""') + '"';
    const csv = [headings, ...rows].map(row => row.map(quote).join(";")).join("\r\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob(["\uFEFF", csv], {type: "text/csv;charset=utf-8"}));
    link.download = filename; link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }
  function renderHistorico() {
    if (!historyContext) return;
    const rows = historico(historyContext.row, historyContext.tipo, historyContext.registros);
    const keys = new Set(rows.map(row => row.id));
    historySelected.forEach(key => { if (!keys.has(key)) historySelected.delete(key); });
    SLTTable.values(historyValue, rows, row => detalhes(row)[Number(historyColumn.value)]);
    historyValue.disabled = historyColumn.value === "";
    historyFiltered = sortHistory(rows.filter(row => SLTTable.matches("ami-email-history-filter",
      detalhes(row)[Number(historyColumn.value)] === (historyValue.value === "__empty__" ? "" : historyValue.value),
      historyColumn.value !== "" && Boolean(historyValue.value))));
    const result = SLTTable.paginate("ami-email-history-pagination", historyFiltered, historyPage,
      value => { historyPage = value; renderHistorico(); });
    historyPage = result.page;
    const body = $("ami-email-history-body"); body.replaceChildren();
    result.rows.forEach(row => {
      const tr = body.insertRow(), cell = tr.insertCell(), checkbox = document.createElement("input");
      cell.className = "col-select"; checkbox.type = "checkbox"; checkbox.checked = historySelected.has(row.id);
      checkbox.setAttribute("aria-label", "Selecionar envio registrado em " + (row.criado_em || "data indisponível"));
      tr.classList.toggle("is-selected", checkbox.checked);
      checkbox.onchange = () => {
        if (checkbox.checked) historySelected.add(row.id); else historySelected.delete(row.id);
        renderHistorico();
      };
      cell.append(checkbox);
      const valores = detalhes(row);
      const entrega = tr.insertCell(), leitura = tr.insertCell();
      entrega.textContent = valores[0];
      leitura.textContent = valores[1];
      SicardAhpStatus.aplicar(entrega, row.entrega_status === "confirmada" ? "Entregue" : valores[0]);
      SicardAhpStatus.aplicar(leitura, row.leitura_status === "confirmada" ? "Lido" : valores[1]);
      const detalheCell = tr.insertCell();
      detalheCell.className = "ami-detail-cell"; detalheCell.textContent = valores[2];
      detalheCell.tabIndex = 0; detalheCell.setAttribute("role", "button"); detalheCell.setAttribute("aria-haspopup", "dialog");
      detalheCell.title = "Ver detalhes completos do envio";
      detalheCell.onclick = () => abrirDetalhe(row, detalheCell);
      detalheCell.onkeydown = event => {
        if (event.key === "Enter" || event.key === " ") { event.preventDefault(); abrirDetalhe(row, detalheCell); }
      };
    });
    if (!result.rows.length) {
      const cell = body.insertRow().insertCell(); cell.colSpan = 4; cell.className = "ami-empty";
      cell.textContent = rows.length ? "Nenhum registro encontrado." : "Nenhum envio registrado. " + estado(historyContext.row, historyContext.tipo) + ".";
    }
    const count = historyFiltered.filter(row => historySelected.has(row.id)).length, all = $("ami-email-history-all");
    all.disabled = !historyFiltered.length; all.checked = count > 0 && count === historyFiltered.length;
    all.indeterminate = count > 0 && count < historyFiltered.length;
    $("ami-email-history-export").disabled = !historySelected.size;
    $("ami-email-history-clear").disabled = !historySelected.size;
    SLTTable.summary("ami-email-history-count", historySelected.size, result.rows.length, rows.length);
  }
  function abrirHistorico(row, tipo, trigger, registros, julgamento) {
    historyContext = {row, tipo, registros, julgamento}; historyTrigger = trigger; historyPage = 1; historySelected.clear();
    historyColumn.value = ""; historyValue.value = "";
    SLTTable.inversion($("ami-email-history-filter-inverter"), false);
    $("ami-email-history-title").textContent = tipo === "divulgacao" ? "E-mail de divulgação" : tipo === "convite" ? "E-mail convite" : "E-mail resposta";
    $("ami-email-history-context").textContent = row.nome + " · " + row.destinatario;
    historyModal.classList.remove("is-hidden"); renderHistorico(); $("ami-email-history-close").focus();
  }
  function fecharHistorico() {
    historyModal.classList.add("is-hidden"); historyContext = null;
    if (historyTrigger?.isConnected) historyTrigger.focus();
    historyTrigger = null;
  }
  function abrirDetalhe(row, trigger) {
    $("ami-email-detail-title").textContent = "Detalhes do " + $("ami-email-history-title").textContent.toLowerCase();
    $("ami-email-detail-texto").textContent = detalhes(row)[2];
    detalheTrigger = trigger; detalheAberto = true;
    detailModal.classList.remove("is-hidden"); $("ami-email-detail-close").focus();
  }
  function fecharDetalhe() {
    detailModal.classList.add("is-hidden"); detalheAberto = false;
    if (detalheTrigger?.isConnected) detalheTrigger.focus();
    detalheTrigger = null;
  }
  $("ami-email-detail-close").onclick = fecharDetalhe;
  detailModal.onclick = event => { if (event.target === detailModal) fecharDetalhe(); };
  historyColumn.onchange = () => { historyValue.value = ""; historyPage = 1; renderHistorico(); };
  historyValue.onchange = () => { historyPage = 1; renderHistorico(); };
  SLTTable.bindFilter("ami-email-history-filter", () => { historyPage = 1; renderHistorico(); },
    () => { historyColumn.value = ""; historyValue.value = ""; });
  $("ami-email-history-close").onclick = fecharHistorico;
  historyModal.onclick = event => { if (event.target === historyModal) fecharHistorico(); };
  document.addEventListener("keydown", event => {
    if (!historyContext || detalheAberto) return;
    if (event.key === "Escape") { event.preventDefault(); fecharHistorico(); }
    if (event.key === "Tab") {
      const items = Array.from(historyModal.querySelectorAll('button:not(:disabled), select:not(:disabled), input:not(:disabled)'))
        .filter(node => node.getClientRects().length);
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
  // Registrado depois do listener do histórico: com o detalhe aberto, o Escape fecha só o detalhe.
  document.addEventListener("keydown", event => {
    if (!detalheAberto) return;
    if (event.key === "Escape") { event.preventDefault(); fecharDetalhe(); }
    if (event.key === "Tab") {
      const items = Array.from(detailModal.querySelectorAll("button:not(:disabled)")).filter(node => node.getClientRects().length);
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
  $("ami-email-history-all").onchange = event => {
    historyFiltered.forEach(row => { if (event.target.checked) historySelected.add(row.id); else historySelected.delete(row.id); });
    renderHistorico();
  };
  $("ami-email-history-clear").onclick = () => { historySelected.clear(); renderHistorico(); };
  $("ami-email-history-export").onclick = () => {
    if (!historyContext) return;
    exportar(historico(historyContext.row, historyContext.tipo, historyContext.registros).filter(row => historySelected.has(row.id)).map(detalhes),
      ["Entrega", "Leitura", "Detalhes"], SicardNomeArquivo.gerar((historyContext.julgamento || contexto?.julgamento)?.nome, `historico email ${historyContext.tipo}`, 'csv', 'Julgamento Colaborativo'));
  };
  async function request(path, options) {
    const response = await fetch(path, Object.assign({
      credentials: "same-origin", headers: {"Content-Type": "application/json"}
    }, options)).catch(() => {
      throw Object.assign(new Error("A conexão com o SICARD foi interrompida."), {interrupcaoApi: true});
    });
    if (response.status === 204) return null;
    const codigoEmail = response.headers.get("X-SICARD-Email-Error");
    const interrupcaoApi = !codigoEmail && [502, 503, 504].includes(response.status);
    const mensagemInterrupcao = "O SICARD ficou temporariamente indisponível (HTTP " + response.status + ").";
    let body;
    try { body = await response.json(); }
    catch (_) {
      const mensagem = interrupcaoApi ? mensagemInterrupcao :
        "O SICARD retornou um formato inesperado (HTTP " + response.status + "). Consulte o histórico do envio.";
      throw Object.assign(new Error(mensagem), {interrupcaoApi});
    }
    if (!response.ok) {
      const mensagem = interrupcaoApi ? mensagemInterrupcao :
        window.SicardApiErro ? window.SicardApiErro.formatar(body, {status: response.status, method: options?.method || "GET", url: path}) :
          (Array.isArray(body?.detail) ? body.detail.map(item => item.msg).join("; ") : body?.detail || `Não foi possível concluir a operação (HTTP ${response.status}).`);
      throw Object.assign(new Error(mensagem), {codigoEmail, interrupcaoApi});
    }
    return body;
  }
  function configuracaoAtual() {
    const link = contexto?.url || "";
    const antes = mensagemInput.value.trimEnd();
    const depois = mensagemAfterInput.value.trimStart();
    return {
      email_remetente_alias: aliasInput.value.trim(),
      email_assunto: assuntoInput.value.trim(),
      email_mensagem: [antes, link, depois].filter(Boolean).join("\n\n")
    };
  }
  function ajustarAlturaMensagem() {
    [mensagemInput, mensagemAfterInput].forEach(input => {
      input.style.height = "0px";
      input.style.height = input.scrollHeight + "px";
    });
  }
  function definirMensagemProtegida(texto, link) {
    const mensagem = String(texto || ""), url = String(link || "");
    let inicio = url ? mensagem.indexOf(url) : -1;
    let tamanho = url.length;
    if (inicio < 0 && url) {
      const pattern = /(?:https?:\/\/[^\s/]+)?(?:\/[^\s/]+)*\/public\/analise-multicriterio\/(?:formulario-comparacao-pareada\/)?[^/\s]+\/?/;
      const encontrado = mensagem.match(pattern);
      if (encontrado) {
        inicio = encontrado.index;
        tamanho = encontrado[0].length;
      }
    }
    mensagemInput.value = inicio >= 0 ? mensagem.slice(0, inicio).trimEnd() : mensagem;
    mensagemAfterInput.value = inicio >= 0 ? mensagem.slice(inicio + tamanho).trimStart() : "";
    mensagemLink.href = url || "#";
    mensagemLink.textContent = url || "Link do formulário indisponível";
    mensagemLink.setAttribute("aria-disabled", url ? "false" : "true");
    mensagemInput.dataset.message = inicio >= 0 ? mensagemInput.value + url + mensagemAfterInput.value : mensagem;
    ajustarAlturaMensagem();
    requestAnimationFrame(ajustarAlturaMensagem);
  }
  function mensagemPersonalizada(texto) {
    let mensagem = String(texto || "");
    const email = $("ami-email-preview-recipient").value;
    const convite = contexto?.julgamento?.convites?.find(item => String(item.email || "").toLowerCase() === email.toLowerCase());
    const partesNome = String(convite?.nome || "").trim().split(/\s+/).filter(Boolean);
    if (partesNome.length) mensagem = mensagem.replace(/^Olá,[ \t]*colaborador\(a\)!/i, () => "Olá, " + partesNome.slice(0, 2).join(" ") + "!");
    return mensagem;
  }
  function atualizarPreviaInstitucional() {
    const config = configuracaoAtual(), urlAtual = contexto?.url || "";
    const antes = mensagemPersonalizada(mensagemInput.value.trimEnd()).split(/\n\n+/);
    const {blocos, dataHora, observacoes} = separarPrazoPrevia(antes);
    $("ami-email-preview-access").classList.toggle("is-framed", Boolean(dataHora.length));
    $("ami-email-preview-access-title").hidden = !dataHora.length;
    $("ami-email-preview-deadline").replaceChildren(...dataHora.map(valor => {
      const linha = document.createElement("div");
      linha.textContent = valor;
      return linha;
    }));
    const observacoesPrevia = $("ami-email-preview-observacoes");
    renderizarParagrafos(observacoesPrevia, observacoes);
    observacoesPrevia.hidden = !observacoes.length;
    const indiceAjuda = blocos.indexOf(tituloConsistencia);
    const comparacoes = blocos.slice(0, indiceAjuda < 0 ? blocos.length : indiceAjuda);
    const ajuda = indiceAjuda < 0 ? [] : blocos.slice(indiceAjuda);
    const ajudaPrevia = $("ami-email-preview-consistencia");
    renderizarParagrafos($("ami-email-preview-message"), comparacoes);
    renderizarParagrafos(ajudaPrevia, ajuda);
    ajudaPrevia.hidden = !ajuda.length;
    const exemplos = $("ami-email-preview-exemplos");
    exemplos.hidden = !exemplos.childElementCount || !comparacoes.includes(tituloOrientacoes);
    const exemplosAjuda = $("ami-email-preview-exemplos-consistencia");
    exemplosAjuda.hidden = !exemplosAjuda.childElementCount || !ajuda.length;
    renderizarParagrafos($("ami-email-preview-message-after"), mensagemAfterInput.value.trimStart().split(/\n\n+/));
    $("ami-email-preview-button").href = urlAtual || "#";
    mensagemInput.dataset.message = config.email_mensagem;
  }
  function separarPrazoPrevia(paragrafos) {
    const indice = paragrafos.lastIndexOf(tituloPrazo);
    const dataHora = indice < 0 ? null : paragrafos[indice + 1]?.match(/^(\d{2}\/\d{2}\/\d{4})\n(\d{2}h\d{2})$/);
    if (dataHora) {
      return {blocos: paragrafos.slice(0, indice), dataHora: dataHora.slice(1), observacoes: paragrafos.slice(indice + 2)};
    }
    const indiceAnterior = paragrafos.lastIndexOf("Prazo para resposta e acesso ao formulário");
    const paragrafoAnterior = indiceAnterior < 0 ? "" : paragrafos[indiceAnterior + 1] || "";
    const valores = paragrafoAnterior.match(/^Você pode enviar sua resposta até (\d{2}\/\d{2}\/\d{4}), às (\d{2}h\d{2}) \(horário de Brasília\)\./);
    if (valores) {
      return {blocos: paragrafos.slice(0, indiceAnterior), dataHora: valores.slice(1),
        observacoes: ["Horário de Brasília.", paragrafoAnterior.slice(valores[0].length).trim(), ...paragrafos.slice(indiceAnterior + 2)]};
    }
    return {blocos: paragrafos, dataHora: [], observacoes: []};
  }
  function renderizarParagrafos(destino, blocos) {
    destino.replaceChildren(...blocos.filter(texto => texto.trim()).map(texto => {
      const tag = texto === tituloOrientacoes ? "h4" : texto === tituloConsistencia ? "h5" : "p";
      const bloco = document.createElement(tag);
      bloco.textContent = texto;
      return bloco;
    }));
  }
  function renderizarExemplos(destino, exemplos = []) {
    destino.replaceChildren(...exemplos.map(exemplo => {
      const figura = document.createElement("figure");
      const legenda = document.createElement("figcaption");
      const titulo = document.createElement("strong");
      const descricao = document.createElement("p");
      const imagem = document.createElement("img");
      titulo.textContent = exemplo.titulo;
      descricao.textContent = exemplo.legenda;
      legenda.append(titulo, descricao);
      imagem.src = exemplo.url;
      imagem.alt = exemplo.alt;
      if (exemplo.largura) imagem.style.setProperty("--ami-largura-exemplo", exemplo.largura + "px");
      figura.append(legenda, imagem);
      return figura;
    }));
  }
  function marcarConfiguracaoAlterada() {
    ajustarAlturaMensagem();
    const atual = configuracaoAtual();
    configuracaoAlterada = !configuracaoOriginal || Object.keys(atual).some(chave => atual[chave] !== configuracaoOriginal[chave]);
    atualizarPreviaInstitucional(); controles();
  }
  function aplicarEdicao(atual, edicao) {
    if (atual !== contexto) return;
    const mensagem = edicao.rascunho || edicao.padrao;
    aliasInput.value = mensagem.alias_remetente;
    assuntoInput.value = mensagem.assunto;
    definirMensagemProtegida(mensagem.texto, atual.url);
    atual.edicao = edicao;
    renderizarExemplos($("ami-email-preview-exemplos"), edicao.exemplos);
    renderizarExemplos($("ami-email-preview-exemplos-consistencia"), edicao.exemplos_consistencia);
    configuracaoOriginal = configuracaoAtual();
    configuracaoAlterada = false;
    atualizarPreviaInstitucional();
    controles();
  }
  async function carregarEdicao(atual) {
    try {
      aplicarEdicao(atual, await request(url(atual.julgamento.id) + "/mensagem"));
    } catch (error) {
      if (contexto === atual) {
        atual.edicao = null;
        Notify.error("Mensagem de e-mail", error.message);
        controles();
      }
    }
  }
  async function salvarConfiguracao() {
    if (!contexto) return false;
    const atual = contexto;
    const config = configuracaoAtual();
    if (!config.email_remetente_alias || !config.email_assunto || (!mensagemInput.value.trim() && !mensagemAfterInput.value.trim())) {
      Notify.error("Mensagem de e-mail", "Preencha o alias do remetente, o assunto e a mensagem.");
      return false;
    }
    if (config.email_mensagem.length > 49000) {
      Notify.error("Mensagem de e-mail", "A mensagem completa deve ter no máximo 49.000 caracteres.");
      return false;
    }
    if (!contexto.url || !config.email_mensagem.includes(contexto.url)) {
      Notify.error("Mensagem de e-mail", "A mensagem deve manter o link persistente deste julgamento.");
      return false;
    }
    const anterior = ocupado; bloquear(true);
    try {
      const rascunho = await request(url(atual.julgamento.id) + "/mensagem", {
        method: "PUT", body: JSON.stringify({assunto: config.email_assunto, alias_remetente: config.email_remetente_alias,
          texto: config.email_mensagem})
      });
      aplicarEdicao(atual, {...atual.edicao, rascunho});
      Notify.success("Mensagem de e-mail", "Edição salva para o próximo envio deste julgamento.");
      return true;
    } catch (error) {
      Notify.error("Mensagem de e-mail", error.message);
      return false;
    } finally { bloquear(anterior); }
  }
  // Estados usados para identificar pendentes no envio geral de convites.
  const REENVIAVEIS = new Set(["Não enviado", "Devolvido"]);
  function controles() {
    const {pendentes, enviados, incertos} = situacao();
    const rotulo = pendentes.length && (enviados || incertos) ? "Enviar aos pendentes (" + pendentes.length + ")" :
      incertos ? "Envio geral indisponível" : enviados ? "Reenviar e-mails" : "Enviar e-mail";
    $("ami-open-mail").innerHTML = '<i class="fas fa-envelope c-btn__icon" aria-hidden="true"></i>' + rotulo;
    const bloqueiaConvites = ocupado || loteEmExecucao || !pronto || modo !== "view" || !contexto || contexto.publico ||
      !contexto.url || !contexto.edicao || configuracaoAlterada || contexto.julgamento.status !== "ativa" ||
      !(Date.parse(contexto.julgamento.valido_ate) >= Date.now()) || !contexto.destinatarios.length;
    $("ami-open-mail").disabled = bloqueiaConvites || Boolean(incertos && !pendentes.length);
    const editavel = !ocupado && contexto?.edicao && !contexto.publico && contexto.julgamento.status === "ativa" &&
      Date.parse(contexto.julgamento.valido_ate) >= Date.now();
    aliasInput.disabled = assuntoInput.disabled = mensagemInput.disabled = mensagemAfterInput.disabled = !editavel;
    $("ami-save-email-config").disabled = !editavel || !configuracaoAlterada;
    const marcados = monitorRows.filter(marcado);
    const baseBloqueada = ocupado || !pronto || !modoMonitor() || !contexto || !marcados.length;
    $("ami-monitor-send").disabled = bloqueiaConvites || baseBloqueada;
    $("ami-monitor-send-response").disabled = loteEmExecucao || baseBloqueada ||
      !marcados.every(row => row.resposta_recebida);
    $("ami-email-receipts").disabled = ocupado || loteEmExecucao || !contexto || !modoMonitor() || !contexto.confirmacoesConfiguradas;
    $("ami-revoke-invitation").disabled = ocupado || !contexto || modo !== "view" || !contexto.destinatarios.length;
    $("ami-monitor-refresh").disabled = contexto?.publico
      ? ocupado || loteEmExecucao || !modoMonitor() : $("ami-email-receipts").disabled;
    $("ami-monitor-export").disabled = ocupado || !pronto || !selected.size;
    $("ami-monitor-clear").disabled = ocupado || !selected.size;
    $("ami-monitor-delete").disabled = baseBloqueada || !contexto?.publico || marcados.length !== 1 || !marcados[0]?.inscricao_id;
    const all = $("ami-monitor-select-all");
    const count = filteredRows.filter(marcado).length;
    all.disabled = ocupado || !pronto || !filteredRows.length;
    all.checked = count > 0 && count === filteredRows.length;
    all.indeterminate = count > 0 && count < filteredRows.length;
    SLTTable.summary("ami-email-status-count", selected.size, visibleCount, monitorRows.length);
  }
  function render() {
    const tbody = $("ami-email-deliveries");
    tbody.replaceChildren();
    if (!pronto) { controles(); return; }
    const rows = (contexto.colaboradores || []).map(c => ({
      inscricao_id: c.inscricao_id, nome: c.nome, destinatario: c.email, instituicao: c.instituicao,
      resposta_recebida: c.resposta_recebida, registrado_em: c.registrado_em,
      clique_link_em: c.clique_link_em, acesso_formulario_em: c.acesso_formulario_em,
      resposta_enviada_em: c.resposta_enviada_em, etapa_codigo: c.etapa_codigo,
      etapa_rotulo: c.etapa_rotulo, etapa_atualizada_em: c.etapa_atualizada_em
    }));
    monitorRows = rows;
    const keys = new Set(rows.map(chaveSelecao));
    selected.forEach(key => { if (!keys.has(key)) selected.delete(key); });
    filterOptions();
    const filtered = sortRows(rows.filter(row => SLTTable.matches("ami-monitor-filter", cells(row)[Number(filterColumn.value)] === (filterValue.value === "__empty__" ? "" : filterValue.value), filterColumn.value !== "" && Boolean(filterValue.value))));
    const result = SLTTable.paginate("ami-email-status-pagination", filtered, pagina, page => { pagina = page; render(); });
    filteredRows = filtered; visibleCount = result.rows.length;
    pagina = result.page;
    result.rows.forEach(row => {
      const tr = document.createElement("tr");
      tr.classList.toggle("is-selected", marcado(row));
      const cell = tr.insertCell(); cell.className = "col-select";
      const checkbox = document.createElement("input"); checkbox.type = "checkbox";
      checkbox.checked = marcado(row);
      checkbox.setAttribute("aria-label", "Selecionar registro de " + row.destinatario);
      checkbox.addEventListener("change", () => {
        if (checkbox.checked) selected.add(chaveSelecao(row)); else selected.delete(chaveSelecao(row));
        tr.classList.toggle("is-selected", checkbox.checked); controles();
      });
      cell.appendChild(checkbox);
      cells(row).forEach((value, index) => {
        const td = tr.insertCell();
        const tipo = index === colunasMonitor.length - 1 ? "resposta" :
          index === colunasMonitor.length - 2 && !contexto.publico ? "convite" : null;
        if (tipo) {
          const button = document.createElement("button");
          button.type = "button"; button.className = "ami-cell-link"; button.textContent = value;
          button.dataset.emailHistory = tipo;
          button.dataset.emailRecipient = rowKey(row);
          SicardAhpStatus.aplicar(button, value, registroStatusEnvio(row, tipo)?.envio_status === "falha" ? "falha" : undefined);
          const emailLabel = "e-mail de " + tipo;
          button.setAttribute("aria-label", "Histórico do " + emailLabel + " de " + row.nome + ": " + value);
          td.append(button);
        } else {
          td.textContent = value;
          if (index === colunaData + 1 || index === colunasMonitor.length - 2) SicardAhpStatus.aplicar(td, value);
        }
      });
      tbody.appendChild(tr);
    });
    if (!result.rows.length) {
      const td = tbody.insertRow().insertCell(); td.colSpan = colunasMonitor.length + 1; td.className = "ami-empty"; td.textContent = "Nenhum registro encontrado.";
    }
    controles();
    if (historyContext && historyContext.tipo !== "divulgacao") {
      const atual = monitorRows.find(row => rowKey(row) === rowKey(historyContext.row));
      if (atual) { historyContext.row = atual; renderHistorico(); } else fecharHistorico();
    }
  }
  let carregando = null;
  $("ami-email-deliveries").addEventListener("click", event => {
    const button = event.target.closest("button[data-email-history]");
    if (!button) return;
    const row = monitorRows.find(item => rowKey(item) === button.dataset.emailRecipient);
    if (row) abrirHistorico(row, button.dataset.emailHistory, button);
  });
  async function carregar(atual, automatica = false) {
    const leitura = {atual};
    carregando = leitura;
    try {
      const result = await request(url(atual.julgamento.id) + "/monitoramento");
      if (!Array.isArray(result.registros) || !Array.isArray(result.colaboradores)) throw new Error("O monitoramento de e-mails retornou um formato inválido.");
      if (contexto !== atual || carregando !== leitura) return;
      definirRegistros(result.registros); atual.colaboradores = result.colaboradores;
      atual.confirmacoesConfiguradas = result.confirmacoes_configuradas === true; pronto = true;
      $("ami-email-status").textContent = atual.publico ? "Inscrições e confirmações carregadas." : "Histórico de envios carregado.";
      if (result.coleta_automatica) {
        const coleta = result.coleta_automatica;
        $("ami-email-status").textContent += coleta.erro
          ? " " + coleta.erro
          : coleta.ativa
            ? " Confirmações consultadas automaticamente pelo servidor."
            : atual.confirmacoesConfiguradas
              ? " A coleta automática de confirmações está desativada."
              : " Confirmações externas por IMAP não estão configuradas; as etapas internas da colaboração continuam atualizadas automaticamente.";
      }
      render();
    } catch (error) {
      if (contexto !== atual || carregando !== leitura) return;
      pronto = false; controles();
      $("ami-email-status").textContent = "Histórico indisponível. " + error.message;
      if (!automatica) Notify.error("E-mails do julgamento", error.message);
    } finally { if (carregando === leitura) carregando = null; }
  }
  async function carregarRemetente(atual) {
    try {
      const result = await request(url(atual.julgamento.id) + "/configuracao");
      if (contexto !== atual) return;
      $("ami-email-sender-address").value = result.conta_autenticacao || "Conta de envio não configurada";
    } catch (_error) {
      if (contexto === atual) $("ami-email-sender-address").value = "Conta de envio indisponível";
    }
  }
  function bloquear(valor) {
    ocupado = valor;
    document.querySelector(".ami-main").inert = valor;
    controles();
  }
  // O servidor controla a cadência da conta. A tela só espera quando precisa repetir.
  const ESPERAS_LIMITE_MS = [60000, 120000];
  const ESPERAS_API_MS = [5000, 10000, 20000, 30000, 60000];
  const aguardar = ms => new Promise(resolve => setTimeout(resolve, ms));
  const limitadoPeloServidor = row => row.envio_status === "falha" &&
    /limitou temporariamente/i.test(row.detalhe || "");
  const autenticacaoRecusada = row => row.envio_status === "falha" &&
    /recusou a autentica/i.test(row.detalhe || "");
  const bloqueioDoServidor = row => row.envio_status === "falha" &&
    /limitou temporariamente|limite diário|recusou a mensagem|recusou a autentica/i.test(row.detalhe || "");
  function situacao() {
    const pendentes = [];
    let enviados = 0, incertos = 0;
    for (const destinatario of pronto && contexto ? contexto.destinatarios : []) {
      const status = estado({destinatario}, "convite");
      if (REENVIAVEIS.has(status)) pendentes.push(destinatario);
      else if (["Enviado", "Entregue", "Lido", rotulosEntrega.adiada].includes(status)) enviados++;
      else incertos++;
    }
    return {pendentes, enviados, incertos};
  }
  // Destinatários salvos correspondentes às linhas marcadas na coluna de seletores.
  function selecionados() {
    if (!contexto) return [];
    const linhas = monitorRows.filter(marcado);
    if (contexto.publico) return linhas.map(row => row.destinatario);
    const marcados = new Set(linhas.map(rowKey));
    return contexto.destinatarios.filter(destinatario => marcados.has(destinatario.toLowerCase()));
  }
  async function solicitarEnvioConvite(atual, dados, processo) {
    const rota = url(atual.julgamento.id) + "/enviar";
    const opcoes = {method: "POST", body: JSON.stringify(dados)};
    for (let tentativa = 0; ; tentativa++) {
      const espera = ESPERAS_API_MS[tentativa];
      let mensagem;
      try {
        const registro = await request(rota, opcoes);
        if (!espera || !registro?.reutilizado || registro.envio_status !== "enviando") return registro;
        mensagem = "O SICARD ainda está concluindo a tentativa anterior. Consultando novamente em ";
      } catch (erro) {
        if (!erro.interrupcaoApi || !espera) throw erro;
        mensagem = erro.message + " Retomando automaticamente em ";
      }
      processo.tarefaAtual(dados.destinatario, mensagem + espera / 1000 + " s.");
      await aguardar(espera);
    }
  }
  function atualizarProgressoDoLote(processo, indice, total) {
    if (indice < 2) return false;
    if (indice === 2) bloquear(false);
    processo.minimizar("Enviando e-mails · " + indice + " de " + total + " processados");
    return true;
  }

  function encerrarLote(emSegundoPlano) {
    loteEmExecucao = false;
    if (emSegundoPlano) controles();
    else bloquear(false);
  }

  async function enviar(apenasSelecionados) {
    const botao = apenasSelecionados ? $("ami-monitor-send") : $("ami-open-mail");
    if (botao.disabled) return;
    const atual = contexto;
    const rascunhoId = atual.edicao.rascunho?.id;
    const {pendentes, enviados, incertos} = situacao();
    const reenvio = !apenasSelecionados && enviados > 0 && !incertos && !pendentes.length;
    const somentePendentes = !apenasSelecionados && !reenvio;
    const lista = apenasSelecionados ? selecionados() : reenvio ? atual.destinatarios : pendentes;
    if (!lista.length) return;
    const {revisao_convites, atualizadoEm} = atual.julgamento;
    loteEmExecucao = true;
    bloquear(true);
    let processo, aceitos = 0, problemas = 0, interrompido = 0, motivo = "", iniciados = 0;
    let emSegundoPlano = false;
    let codigo = "envio_email";
    const detalhes = [];
    try {
      if (!(await ProcessFeedback.confirmar({
        title: apenasSelecionados ? "Enviar e-mail de convite aos selecionados" : reenvio ? "Reenviar e-mails aos colaboradores" : enviados || incertos ? "Enviar e-mail aos pendentes" : "Enviar e-mail aos colaboradores",
        message: "Enviar a mensagem exibida para " + lista.length + " colaborador(es)" +
          (apenasSelecionados ? " selecionado(s) no monitoramento?" : somentePendentes && (enviados || incertos) ? " com envio pendente?" : " salvo(s)?"),
        warning: rascunhoId ? "A edição salva vale para este envio. O próximo volta ao modelo padrão."
          : apenasSelecionados || reenvio ? "Nos reenvios, o link de acesso continua válido até o prazo do convite."
          : enviados || incertos ? "Convites já aceitos ou com resultado indeterminado são preservados."
          : "Envios individuais aos colaboradores salvos.",
        confirmLabel: reenvio ? "Reenviar e-mails" : "Enviar e-mail"
      }))) return;
      const reenvioId = crypto.randomUUID();
      processo = ProcessFeedback.iniciarCadastro({title: "Enviando convites por e-mail", tasks: lista});
      for (let indice = 0; indice < lista.length; indice++) {
        const destinatario = lista[indice];
        emSegundoPlano = atualizarProgressoDoLote(processo, indice, lista.length);
        iniciados++;
        processo.tarefaAtual(destinatario);
        let row;
        for (let tentativa = 0; ; tentativa++) {
          try {
            row = await solicitarEnvioConvite(atual, {
              destinatario, versao: atualizadoEm, revisao_convites,
              reenvio_id: reenvioId, somente_nao_enviado: somentePendentes, usar_modelo_atual: true,
              rascunho_id: rascunhoId
            }, processo);
          } catch (error) {
            if (error.codigoEmail !== "convite_original_indisponivel") throw error;
            row = null;
            problemas++;
            detalhes.push(destinatario + ": " + error.message);
            processo.concluirTarefa(destinatario);
            break;
          }
          if (!row?.id || !rotulosEnvio[row.envio_status]) throw new Error("O servidor não confirmou o estado do envio. Consulte o histórico antes de tentar novamente.");
          if (contexto === atual) {
            definirRegistros(registros.filter(item => item.id !== row.id).concat(row));
            render();
          }
          if (!limitadoPeloServidor(row) || tentativa >= ESPERAS_LIMITE_MS.length) break;
          const espera = ESPERAS_LIMITE_MS[tentativa];
          processo.tarefaAtual(destinatario, "O servidor de e-mail limitou os envios. Nova tentativa em " + espera / 1000 + " s.");
          await aguardar(espera);
        }
        if (!row) continue;
        if (row.envio_status === "aceito_smtp") aceitos++; else problemas++;
        if (row.envio_status !== "aceito_smtp") {
          detalhes.push(row.detalhe || "O envio de " + destinatario + " ficou sem confirmação. Consulte o histórico antes de reenviar a esse destinatário.");
        }
        if (autenticacaoRecusada(row)) codigo = "smtp_autenticacao";
        processo.concluirTarefa(destinatario);
        if (bloqueioDoServidor(row)) { interrompido = lista.length - indice - 1; motivo = row.detalhe; break; }
      }
      const linhas = [aceitos + " mensagem(ns) aceita(s) pelo servidor.", problemas + " sem envio confirmado."];
      if (!motivo) linhas.push(...new Set(detalhes));
      if (motivo) linhas.push("Envio interrompido: " + motivo + (interrompido ? " " + interrompido + " colaborador(es) não foram tentados e permanecem pendentes." : ""));
      const resumo = linhas.join("\n") + "\n\nConsulte os detalhes por destinatário.";
      if (contexto === atual) $("ami-email-status").textContent = resumo;
      if (problemas || interrompido) processo.erro({message: resumo, codigo});
      else processo.sucesso({title: "Envio de convites", message: resumo});
    } catch (error) {
      const message = [
        "Envio interrompido. " + error.message,
        aceitos + " convite(s) com aceite confirmado nesta operação.",
        (lista.length - iniciados) + " destinatário(s) ainda sem tentativa nesta operação."
      ].join("\n") + "\n\n" + (error.interrupcaoApi
        ? "Quando o SICARD voltar, atualize o monitoramento e use Enviar aos pendentes. " : "") +
        "Consulte o histórico para verificar a última tentativa.";
      if (processo) processo.erro({message});
      else Notify.error("Envio de convites", message);
      if (contexto === atual) await carregar(atual);
      if (contexto === atual) $("ami-email-status").textContent = message;
    } finally {
      if (iniciados && contexto === atual) await carregarEdicao(atual);
      encerrarLote(emSegundoPlano);
    }
  }
  async function coletar() {
    if ($("ami-email-receipts").disabled) return;
    const atual = contexto;
    bloquear(true);
    const tarefa = "Consultando retornos na caixa de e-mail";
    const processo = ProcessFeedback.iniciarCadastro({title: "Atualizando confirmações", tasks: [tarefa]});
    processo.tarefaAtual(tarefa);
    try {
      const result = await request(url(atual.julgamento.id) + "/confirmacoes", {method: "POST"});
      if (!Array.isArray(result.registros)) throw new Error("O servidor retornou um histórico inválido.");
      await carregar(atual);
      const message = result.relatorios_consultados +
        " relatório(s) consultado(s).\n\nSem retorno não significa que o e-mail não foi entregue ou lido.";
      $("ami-email-status").textContent = message;
      processo.concluirTarefa(tarefa); processo.sucesso({title: "Confirmações atualizadas", message});
    } catch (error) {
      const message = "Consulta incompleta. Os envios não foram repetidos. " + error.message;
      processo.erro({message: error.message});
      await carregar(atual);
      $("ami-email-status").textContent = message;
    } finally { bloquear(false); }
  }
  async function enviarResposta() {
    if ($("ami-monitor-send-response").disabled) return;
    const atual = contexto, lista = selecionados();
    loteEmExecucao = true;
    bloquear(true);
    let processo, aceitos = 0, emSegundoPlano = false;
    try {
      if (!(await ProcessFeedback.confirmar({
        title: "Enviar e-mail de resposta aos selecionados",
        message: "Enviar a confirmação de recebimento da resposta para " + lista.length + " colaborador(es) selecionado(s)?",
        warning: "Os selecionados receberão a confirmação, mesmo que já tenham recebido uma anteriormente.",
        confirmLabel: "Enviar e-mail de resposta"
      }))) return;
      const reenvioId = crypto.randomUUID();
      processo = ProcessFeedback.iniciarCadastro({title: "Enviando confirmações de resposta", tasks: lista});
      let problemas = 0, interrompidos = 0;
      let codigo = "envio_email";
      const detalhes = [];
      for (let index = 0; index < lista.length; index++) {
        emSegundoPlano = atualizarProgressoDoLote(processo, index, lista.length);
        const destinatario = lista[index]; processo.tarefaAtual(destinatario);
        const row = await request(url(atual.julgamento.id) + "/resposta/enviar", {
          method: "POST", body: JSON.stringify({destinatario, reenvio_id: reenvioId})
        });
        if (!row.id || !rotulosEnvio[row.envio_status]) throw new Error("O servidor não confirmou o estado do envio. Atualize o monitoramento antes de tentar novamente.");
        if (contexto === atual) {
          definirRegistros(registros.filter(item => item.id !== row.id).concat(row));
          render();
        }
        if (row.envio_status === "aceito_smtp") aceitos++; else problemas++;
        if (row.envio_status !== "aceito_smtp" && row.detalhe) detalhes.push(row.detalhe);
        if (autenticacaoRecusada(row)) codigo = "smtp_autenticacao";
        processo.concluirTarefa(destinatario);
        if (bloqueioDoServidor(row)) { interrompidos = lista.length - index - 1; break; }
      }
      const message = [
        aceitos + (aceitos === 1 ? " confirmação aceita" : " confirmações aceitas") + " pelo servidor.",
        problemas + " sem envio confirmado.",
        interrompidos + (interrompidos === 1 ? " não tentada." : " não tentadas."),
        ...new Set(detalhes)
      ].join("\n") + "\n\nConsulte os detalhes por colaborador.";
      if (contexto === atual) $("ami-email-status").textContent = message;
      if (problemas || interrompidos) processo.erro({message, codigo});
      else processo.sucesso({title: "Confirmações de resposta", message});
    } catch (error) {
      if (processo) processo.erro({message: aceitos + " confirmação(ões) aceita(s).\n" + error.message +
        "\n\nConsulte os detalhes por colaborador."});
      else Notify.error("Confirmações de resposta", error.message);
      if (contexto === atual) await carregar(atual);
    } finally { encerrarLote(emSegundoPlano); }
  }
  async function excluirInscricao() {
    if ($("ami-monitor-delete").disabled) return;
    const atual = contexto;
    const row = monitorRows.find(marcado);
    bloquear(true);
    try {
      if (!(await ProcessFeedback.confirmar({
        title: "Excluir registro",
        message: "Excluir a inscrição de " + (row.nome || row.destinatario) + " (" + row.destinatario + ")?",
        warning: "Os dados da inscrição, a resposta vinculada, se houver, e o histórico de e-mails deste julgamento serão excluídos definitivamente.",
        danger: true, confirmLabel: "Excluir registro"
      }))) return;
      await request(ambienteUrl(atual.julgamento.id) + "/inscricoes/" + encodeURIComponent(row.inscricao_id), {method: "DELETE"});
      if (contexto === atual) {
        atual.colaboradores = atual.colaboradores.filter(item => item.inscricao_id !== row.inscricao_id);
        definirRegistros(registros.filter(item => rowKey(item) !== rowKey(row)));
        render();
        await carregar(atual, true);
        if (contexto === atual) {
          atual.julgamento.total_inscritos = atual.colaboradores.length;
          atual.julgamento.total_respostas = atual.colaboradores.filter(item => item.resposta_recebida).length;
          atual.onExcluir?.();
          if (pronto) $("ami-email-status").textContent = "Inscrição excluída.";
        }
      }
      Notify.success("Excluir registro", "Inscrição excluída.");
    } catch (error) {
      Notify.error("Excluir registro", error.message);
    } finally { bloquear(false); }
  }
  function prepararMonitoramento() {
    const publico = Boolean(contexto.publico);
    const dataLabel = publico ? "Data da inscrição" : dataHeader.dataset.conviteLabel;
    const dataTitle = dataHeader.querySelector(".smart-column-title") || dataHeader;
    dataTitle.textContent = dataLabel;
    if (dataHeader.classList.contains("slt-sortable-column")) dataHeader.title = "Ordenar por " + dataLabel;
    filterColumn.querySelector(`option[value="${colunaData}"]`).textContent = dataLabel;
    (publico ? monitorPublico : monitorConvites).appendChild(monitor);
    monitorPublico.classList.toggle("is-hidden", !publico);
    $("ami-monitor-invited-help").hidden = publico;
    $("ami-monitor-public-help").hidden = !publico;
    const iconeLimpar = $("ami-monitor-clear").querySelector("i");
    iconeLimpar.classList.toggle("fa-xmark", !publico);
    iconeLimpar.classList.toggle("fa-broom", publico);
    $("ami-monitor-delete").classList.toggle("is-hidden", !publico);
    $("ami-monitor-send").title = publico ? "Convite individual não se aplica ao link público" :
      "Enviar e-mail de convite aos selecionados";
    definirRegistros([]); pronto = false; pagina = 1;
    selected.clear(); monitorRows = []; filteredRows = []; visibleCount = 0;
    fecharHistorico();
    filterColumn.value = ""; filterValue.value = "";
    SLTTable.inversion($("ami-monitor-filter-inverter"), false);
    $("ami-email-status").textContent = publico ? "Carregando inscrições e confirmações…" : "Carregando histórico de envios…";
    $("ami-email-status-pagination").replaceChildren();
    render(); carregar(contexto);
  }
  window.SICARDEmailConvites = {
    historicoDivulgacao(contato, registros, julgamento, trigger) {
      abrirHistorico({nome: contato.nome, destinatario: contato.email}, "divulgacao", trigger, registros, julgamento);
    },
    modo(value) {
      modo = value;
      if (modo !== "edit" && contexto?.publico) {
        contexto = null;
        pronto = false;
        fecharHistorico();
        monitorPublico.classList.add("is-hidden");
      }
      controles();
    },
    mostrarPublico(julgamento, onExcluir) {
      contexto = {julgamento, publico: true, destinatarios: [], onExcluir};
      prepararMonitoramento();
    },
    atualizarColaboradores(julgamento) {
      if (contexto?.julgamento.id !== julgamento.id || contexto.publico) return;
      contexto.destinatarios = (julgamento.convites || []).map(c => c.email);
      atualizarPreviaInstitucional();
      carregar(contexto, true);
    },
    mostrar(julgamento, link) {
      contexto = {julgamento, url: link, destinatarios: (julgamento.convites || []).map(c => typeof c === "string" ? c : c.email)};
      aliasInput.value = "";
      assuntoInput.value = "";
      definirMensagemProtegida("", link);
      $("ami-email-sender-address").value = "Carregando conta do serviço…";
      configuracaoOriginal = null;
      configuracaoAlterada = false;
      atualizarPreviaInstitucional();
      prepararMonitoramento();
      if (link) { carregarRemetente(contexto); carregarEdicao(contexto); }
    }
  };
  [aliasInput, assuntoInput, mensagemInput, mensagemAfterInput].forEach(input => input.addEventListener("input", marcarConfiguracaoAlterada));
  $("ami-email-preview-recipient").addEventListener("change", atualizarPreviaInstitucional);
  $("ami-save-email-config").addEventListener("click", salvarConfiguracao);
  $("ami-open-mail").addEventListener("click", () => enviar(false));
  $("ami-monitor-send").addEventListener("click", () => enviar(true));
  $("ami-monitor-send-response").addEventListener("click", enviarResposta);
  $("ami-revoke-invitation").addEventListener("click", async () => {
    const email = $("ami-email-preview-recipient").value;
    if (!contexto || ocupado || !contexto.destinatarios.includes(email)) return;
    if (!(await ProcessFeedback.confirmar({
      title: "Revogar convite individual", message: "Revogar o acesso de " + email + "?",
      warning: "A resposta registrada será preservada. O reenvio não restaura uma chave revogada.",
      confirmLabel: "Revogar convite"
    }))) return;
    bloquear(true);
    try {
      await request("/api/ahp/comparacao-colaborativa/ambientes/" + encodeURIComponent(contexto.julgamento.id) +
        "/convites/" + encodeURIComponent(email), {method: "DELETE"});
      $("ami-email-status").textContent = "Convite individual revogado. Os demais destinatários não foram afetados.";
    } catch (error) {
      $("ami-email-status").textContent = "Não foi possível revogar o convite. " + error.message;
    } finally { bloquear(false); }
  });
  $("ami-email-receipts").addEventListener("click", coletar);
  $("ami-monitor-refresh").addEventListener("click", async () => {
    if (!contexto?.publico || contexto.confirmacoesConfiguradas) return coletar();
    bloquear(true);
    try { await carregar(contexto); }
    finally { bloquear(false); }
  });
  $("ami-monitor-select-all").addEventListener("change", event => {
    filteredRows.forEach(row => { if (event.target.checked) selected.add(chaveSelecao(row)); else selected.delete(chaveSelecao(row)); });
    render();
  });
  $("ami-monitor-clear").addEventListener("click", () => { selected.clear(); render(); });
  $("ami-monitor-delete").addEventListener("click", excluirInscricao);
  $("ami-monitor-export").addEventListener("click", () => {
    const rows = monitorRows.filter(marcado);
    if (!rows.length) return;
    exportar(rows.map(cells), monitorHeaders(), SicardNomeArquivo.gerar(contexto?.julgamento?.nome, 'monitoramento colaboradores', 'csv', 'Julgamento Colaborativo'));
  });
  function atualizarAutomaticamente() {
    if (contexto && !ocupado && carregando?.atual !== contexto && modoMonitor() &&
        !document.hidden && !monitor.closest(".is-hidden")) carregar(contexto, true);
  }
  setInterval(atualizarAutomaticamente, 5000);
  window.addEventListener("focus", atualizarAutomaticamente);
  document.addEventListener("visibilitychange", atualizarAutomaticamente);
})();
