(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  let contexto = null, registros = [], pronto = false, ocupado = false, modo = "create", pagina = 1;
  const rotulosEnvio = {enviando: "Na fila", aceito_smtp: "Enviado",
    falha: "Não enviado", indeterminado: "Na fila"};
  const rotulosEntrega = {sem_confirmacao: "Sem confirmação", confirmada: "Entregue", falha: "Devolvido",
    adiada: "Recusado temporariamente pelo destinatário"};
  const url = id => "/api/ahp/comparacao-colaborativa/ambientes/" + encodeURIComponent(id) + "/emails";
  const filterColumn = $("ami-monitor-filter-coluna"), filterValue = $("ami-monitor-filter-valor");
  const historyModal = $("ami-email-history-modal"), historyColumn = $("ami-email-history-filter-coluna"),
    historyValue = $("ami-email-history-filter-valor"), historySelected = new Set();
  let historyContext = null, historyPage = 1, historyFiltered = [], historyTrigger = null;
  const detailModal = $("ami-email-detail-modal");
  let detalheAberto = false, detalheTrigger = null;
  let monitorRows = [];
  const selected = new Set();
  let filteredRows = [], visibleCount = 0;
  const rowKey = row => row.destinatario.toLowerCase();
  const natureza = row => row.natureza || "convite";
  function historico(row, tipo) {
    return registros.filter(item => rowKey(item) === rowKey(row) && natureza(item) === tipo)
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
  function cells(row) {
    const datas = registros.filter(item => rowKey(item) === rowKey(row)).map(item => item.criado_em).filter(Boolean).sort();
    return [row.nome, row.destinatario, datas.length ? new Date(datas[0]).toLocaleString("pt-BR") : "—",
      estado(row, "convite"), estado(row, "resposta")];
  }
  const sortRows = SLTTable.sorting($("ami-monitor-table"), () => [null, ...Array.from({length: 5}, (_, index) => row => cells(row)[index])], () => { pagina = 1; render(); });
  Array.from($("ami-monitor-table").tHead.rows[0].cells).slice(1).forEach((th, index) => filterColumn.add(new Option(th.textContent, String(index))));
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
    const rows = historico(historyContext.row, historyContext.tipo);
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
      valores.slice(0, 2).forEach(value => { tr.insertCell().textContent = value; });
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
  function abrirHistorico(row, tipo, trigger) {
    historyContext = {row, tipo}; historyTrigger = trigger; historyPage = 1; historySelected.clear();
    historyColumn.value = ""; historyValue.value = "";
    SLTTable.inversion($("ami-email-history-filter-inverter"), false);
    $("ami-email-history-title").textContent = tipo === "convite" ? "E-mail convite" : "E-mail resposta";
    $("ami-email-history-context").textContent = row.nome + " · " + row.destinatario;
    historyModal.classList.remove("is-hidden"); renderHistorico(); $("ami-email-history-close").focus();
  }
  function fecharHistorico() {
    historyModal.classList.add("is-hidden"); historyContext = null;
    if (historyTrigger?.isConnected) historyTrigger.focus();
    historyTrigger = null;
  }
  function abrirDetalhe(row, trigger) {
    $("ami-email-detail-title").textContent = historyContext.tipo === "convite" ? "Detalhes do e-mail convite" : "Detalhes do e-mail resposta";
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
    exportar(historico(historyContext.row, historyContext.tipo).filter(row => historySelected.has(row.id)).map(detalhes),
      ["Entrega", "Leitura", "Detalhes"], "historico-email-" + historyContext.tipo + ".csv");
  };
  async function request(path, options) {
    const response = await fetch(path, Object.assign({
      credentials: "same-origin", headers: {"Content-Type": "application/json"}
    }, options));
    if (response.status === 204) return null;
    let body;
    try { body = await response.json(); }
    catch (_) { throw new Error("O servidor retornou uma resposta inválida. Consulte o histórico antes de tentar enviar novamente."); }
    if (!response.ok) throw new Error(window.SicardApiErro ? window.SicardApiErro.formatar(body, { status: response.status, method: (options && options.method) || "GET", url: path }) : (Array.isArray(body.detail) ? body.detail.map(item => item.msg).join("; ") : body.detail || `Não foi possível concluir a operação (HTTP ${response.status}).`));
    return body;
  }
  // Estados que admitem (re)envio pelo monitoramento: nunca enviado, ou enviado
  // e devolvido pelo servidor do destinatário.
  const REENVIAVEIS = new Set(["Não enviado", "Devolvido"]);
  function controles() {
    const {pendentes, enviados} = situacao();
    const rotulo = !enviados ? "Enviar e-mail" : pendentes.length ? "Enviar aos pendentes (" + pendentes.length + ")" : "Reenviar e-mails";
    $("ami-open-mail").innerHTML = '<i class="fas fa-envelope c-btn__icon" aria-hidden="true"></i>' + rotulo;
    $("ami-open-mail").disabled = ocupado || !pronto || modo !== "view" || !contexto ||
      !contexto.url || contexto.julgamento.status !== "ativa" ||
      !(Date.parse(contexto.julgamento.valido_ate) >= Date.now()) || !contexto.destinatarios.length;
    const marcados = monitorRows.filter(row => selected.has(rowKey(row)));
    const baseBloqueada = ocupado || !pronto || modo !== "view" || !contexto || !marcados.length;
    $("ami-monitor-send").disabled = $("ami-open-mail").disabled || baseBloqueada ||
      !marcados.every(row => REENVIAVEIS.has(estado(row, "convite")));
    $("ami-monitor-send-response").disabled = baseBloqueada ||
      !marcados.every(row => REENVIAVEIS.has(estado(row, "resposta")));
    $("ami-email-receipts").disabled = ocupado || !contexto || modo !== "view";
    $("ami-revoke-invitation").disabled = ocupado || !contexto || modo !== "view" || !contexto.destinatarios.length;
    $("ami-monitor-refresh").disabled = $("ami-email-receipts").disabled;
    $("ami-monitor-export").disabled = ocupado || !pronto || !selected.size;
    $("ami-monitor-clear").disabled = ocupado || !selected.size;
    const all = $("ami-monitor-select-all");
    const count = filteredRows.filter(row => selected.has(rowKey(row))).length;
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
      nome: c.nome, destinatario: c.email, resposta_recebida: c.resposta_recebida
    }));
    monitorRows = rows;
    const keys = new Set(rows.map(rowKey));
    selected.forEach(key => { if (!keys.has(key)) selected.delete(key); });
    filterOptions();
    const filtered = sortRows(rows.filter(row => SLTTable.matches("ami-monitor-filter", cells(row)[Number(filterColumn.value)] === (filterValue.value === "__empty__" ? "" : filterValue.value), filterColumn.value !== "" && Boolean(filterValue.value))));
    const result = SLTTable.paginate("ami-email-status-pagination", filtered, pagina, page => { pagina = page; render(); });
    filteredRows = filtered; visibleCount = result.rows.length;
    pagina = result.page;
    result.rows.forEach(row => {
      const tr = document.createElement("tr");
      tr.classList.toggle("is-selected", selected.has(rowKey(row)));
      const cell = tr.insertCell(); cell.className = "col-select";
      const checkbox = document.createElement("input"); checkbox.type = "checkbox";
      checkbox.checked = selected.has(rowKey(row));
      checkbox.setAttribute("aria-label", "Selecionar registro de " + row.destinatario);
      checkbox.addEventListener("change", () => {
        if (checkbox.checked) selected.add(rowKey(row)); else selected.delete(rowKey(row));
        tr.classList.toggle("is-selected", checkbox.checked); controles();
      });
      cell.appendChild(checkbox);
      cells(row).forEach((value, index) => {
        const td = tr.insertCell();
        if (index >= 3) {
          const button = document.createElement("button");
          button.type = "button"; button.className = "ami-cell-link"; button.textContent = value;
          button.setAttribute("aria-label", (index === 3 ? "E-mail convite" : "E-mail resposta") + " de " + row.nome + ": " + value);
          button.addEventListener("click", () => abrirHistorico(row, index === 3 ? "convite" : "resposta", button));
          td.append(button);
        } else td.textContent = value;
      });
      tbody.appendChild(tr);
    });
    if (!result.rows.length) {
      const td = tbody.insertRow().insertCell(); td.colSpan = 6; td.className = "ami-empty"; td.textContent = "Nenhum registro encontrado.";
    }
    controles();
    if (historyContext) {
      const atual = monitorRows.find(row => rowKey(row) === rowKey(historyContext.row));
      if (atual) { historyContext.row = atual; renderHistorico(); } else fecharHistorico();
    }
  }
  let carregando = false;
  async function carregar(atual, automatica = false) {
    carregando = true;
    try {
      const result = await request(url(atual.julgamento.id) + "/monitoramento");
      if (!Array.isArray(result.registros) || !Array.isArray(result.colaboradores)) throw new Error("O monitoramento de e-mails retornou um formato inválido.");
      if (contexto !== atual) return;
      registros = result.registros; atual.colaboradores = result.colaboradores; pronto = true;
      $("ami-email-status").textContent = "Histórico de envios carregado.";
      if (result.coleta_automatica) {
        const coleta = result.coleta_automatica;
        $("ami-email-status").textContent += coleta.erro
          ? " " + coleta.erro
          : coleta.ativa
            ? " Confirmações consultadas automaticamente pelo servidor."
            : " A coleta automática de confirmações está desativada.";
      }
      render();
    } catch (error) {
      if (contexto !== atual) return;
      pronto = false; controles();
      $("ami-email-status").textContent = "Histórico indisponível. " + error.message;
      if (!automatica) Notify.error("E-mails do julgamento", error.message);
    } finally { carregando = false; }
  }
  function bloquear(valor) {
    ocupado = valor;
    document.querySelector(".ami-main").inert = valor;
    controles();
  }
  // Intervalo entre envios e esperas antes de repetir quando o provedor limita a taxa.
  const INTERVALO_ENVIO_MS = 3000, ESPERAS_LIMITE_MS = [60000, 120000];
  const aguardar = ms => new Promise(resolve => setTimeout(resolve, ms));
  const limitadoPeloServidor = row => row.envio_status === "falha" &&
    /limitou temporariamente/i.test(row.detalhe || "");
  const bloqueioDoServidor = row => row.envio_status === "falha" &&
    /limitou temporariamente|limite diário|recusou a mensagem/i.test(row.detalhe || "");
  function situacao() {
    if (!contexto || !pronto) return {pendentes: [], enviados: 0};
    const pendentes = contexto.destinatarios.filter(destinatario => REENVIAVEIS.has(estado({destinatario}, "convite")));
    return {pendentes, enviados: contexto.destinatarios.length - pendentes.length};
  }
  // Destinatários salvos correspondentes às linhas marcadas na coluna de seletores.
  function selecionados() {
    if (!contexto) return [];
    const marcados = new Set(monitorRows.filter(row => selected.has(rowKey(row))).map(row => row.destinatario.toLowerCase()));
    return contexto.destinatarios.filter(destinatario => marcados.has(destinatario.toLowerCase()));
  }
  async function enviar(apenasSelecionados) {
    const botao = apenasSelecionados ? $("ami-monitor-send") : $("ami-open-mail");
    if (botao.disabled) return;
    const atual = contexto;
    const {pendentes, enviados} = situacao();
    const somentePendentes = !apenasSelecionados && enviados > 0 && pendentes.length > 0;
    const reenvio = !apenasSelecionados && enviados > 0 && !pendentes.length;
    const lista = apenasSelecionados ? selecionados() : somentePendentes ? pendentes : atual.destinatarios;
    bloquear(true);
    let processo, aceitos = 0, problemas = 0, interrompido = 0, motivo = "";
    try {
      if (!(await ProcessFeedback.confirmar({
        title: apenasSelecionados ? "Enviar e-mail de convite aos selecionados" : reenvio ? "Reenviar e-mails aos colaboradores" : somentePendentes ? "Enviar e-mail aos pendentes" : "Enviar e-mail aos colaboradores",
        message: "Enviar a mensagem exibida para " + lista.length + " colaborador(es)" +
          (apenasSelecionados ? " selecionado(s) no monitoramento?" : somentePendentes ? " que ainda não receberam o convite?" : " salvo(s)?"),
        warning: apenasSelecionados ? "Somente colaboradores com E-mail convite igual a Não enviado ou Devolvido podem receber este envio. Os demais colaboradores não são afetados."
          : reenvio ? "Será enviado um novo convite a cada colaborador salvo, inclusive a quem já recebeu. O histórico anterior será preservado."
          : somentePendentes ? "Quem já recebeu o convite não receberá outra mensagem e mantém sua chave individual."
          : "Envios individuais aos colaboradores salvos.",
        confirmLabel: reenvio ? "Reenviar e-mails" : "Enviar e-mail"
      }))) return;
      const reenvioId = apenasSelecionados || enviados > 0 ? crypto.randomUUID() : null;
      processo = ProcessFeedback.iniciarCadastro({title: "Enviando convites por e-mail", tasks: lista});
      for (let indice = 0; indice < lista.length; indice++) {
        const destinatario = lista[indice];
        if (indice) await aguardar(INTERVALO_ENVIO_MS);
        processo.tarefaAtual(destinatario);
        let row;
        for (let tentativa = 0; ; tentativa++) {
          row = await request(url(atual.julgamento.id) + "/enviar", {
            method: "POST", body: JSON.stringify({
              destinatario, texto: atual.mensagem, versao: atual.julgamento.atualizadoEm,
              reenvio_id: apenasSelecionados ? null : reenvioId,
              somente_nao_enviado: apenasSelecionados
            })
          });
          if (!row.id || !rotulosEnvio[row.envio_status]) throw new Error("O servidor não confirmou o estado do envio. Consulte o histórico antes de tentar novamente.");
          registros = registros.filter(item => item.id !== row.id).concat(row);
          render();
          if (!limitadoPeloServidor(row) || tentativa >= ESPERAS_LIMITE_MS.length) break;
          const espera = ESPERAS_LIMITE_MS[tentativa];
          processo.tarefaAtual(destinatario, "O servidor de e-mail limitou os envios. Nova tentativa em " + espera / 1000 + " s.");
          await aguardar(espera);
        }
        if (row.envio_status === "aceito_smtp") aceitos++; else problemas++;
        processo.concluirTarefa(destinatario);
        if (bloqueioDoServidor(row)) { interrompido = lista.length - indice - 1; motivo = row.detalhe; break; }
      }
      const linhas = [aceitos + " mensagem(ns) aceita(s) pelo servidor.", problemas + " sem envio confirmado."];
      if (motivo) linhas.push("Envio interrompido: " + motivo + (interrompido ? " " + interrompido + " colaborador(es) não foram tentados e permanecem pendentes." : ""));
      const resumo = linhas.join("\n") + "\n\nConsulte os detalhes por destinatário.";
      $("ami-email-status").textContent = resumo;
      if (!aceitos && problemas) processo.erro({message: resumo});
      else processo.sucesso({_status: problemas || interrompido ? "partial" : "success", title: "Envio de convites", message: resumo});
    } catch (error) {
      const message = "Envio interrompido. " + error.message + " Mensagens já aceitas não serão repetidas.";
      $("ami-email-status").textContent = message;
      if (processo) {
        if (aceitos) processo.sucesso({_status: "partial", title: "Parte dos convites foi aceita", message});
        else processo.erro({message});
      } else Notify.error("Envio de convites", message);
      await carregar(atual);
      $("ami-email-status").textContent = message;
    } finally { bloquear(false); }
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
      const message = result.relatorios_consultados + " relatório(s) consultado(s). Sem retorno não significa que o e-mail não foi entregue ou lido.";
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
    bloquear(true);
    let processo, aceitos = 0;
    try {
      if (!(await ProcessFeedback.confirmar({
        title: "Enviar e-mail de resposta aos selecionados",
        message: "Enviar a confirmação de recebimento da resposta para " + lista.length + " colaborador(es) selecionado(s)?",
        warning: "Somente confirmações com status Não enviado serão enviadas. Os convites e os envios automáticos não serão alterados.",
        confirmLabel: "Enviar e-mail de resposta"
      }))) return;
      processo = ProcessFeedback.iniciarCadastro({title: "Enviando confirmações de resposta", tasks: lista});
      let problemas = 0, interrompidos = 0;
      for (let index = 0; index < lista.length; index++) {
        if (index) await aguardar(INTERVALO_ENVIO_MS);
        const destinatario = lista[index]; processo.tarefaAtual(destinatario);
        const row = await request(url(atual.julgamento.id) + "/resposta/enviar", {
          method: "POST", body: JSON.stringify({destinatario})
        });
        if (!row.id || !rotulosEnvio[row.envio_status]) throw new Error("O servidor não confirmou o estado do envio. Atualize o monitoramento antes de tentar novamente.");
        registros = registros.filter(item => item.id !== row.id).concat(row); render();
        if (row.envio_status === "aceito_smtp") aceitos++; else problemas++;
        processo.concluirTarefa(destinatario);
        if (bloqueioDoServidor(row)) { interrompidos = lista.length - index - 1; break; }
      }
      const message = aceitos + " confirmação(ões) aceita(s) pelo servidor; " + problemas + " sem envio confirmado; " + interrompidos + " não tentada(s). Consulte os detalhes por colaborador.";
      $("ami-email-status").textContent = message;
      if (!aceitos && problemas) processo.erro({message});
      else processo.sucesso({_status: problemas || interrompidos ? "partial" : "success", title: "Confirmações de resposta", message});
    } catch (error) {
      if (processo && aceitos) processo.sucesso({_status: "partial", title: "Envio interrompido", message: error.message});
      else if (processo) processo.erro({message: error.message});
      else Notify.error("Confirmações de resposta", error.message);
      await carregar(atual);
    } finally { bloquear(false); }
  }
  window.SICARDEmailConvites = {
    modo(value) { modo = value; controles(); },
    mostrar(julgamento, mensagem, link) {
      contexto = {julgamento, mensagem, url: link, destinatarios: (julgamento.convites || []).map(c => typeof c === "string" ? c : c.email)};
      registros = []; pronto = false; pagina = 1;
      selected.clear(); monitorRows = []; filteredRows = []; visibleCount = 0;
      fecharHistorico();
      filterColumn.value = ""; filterValue.value = "";
      SLTTable.inversion($("ami-monitor-filter-inverter"), false);
      $("ami-email-status").textContent = "Carregando histórico de envios…";
      $("ami-email-status-count").textContent = "";
      $("ami-email-status-pagination").replaceChildren();
      render(); carregar(contexto);
    }
  };
  $("ami-open-mail").addEventListener("click", () => enviar(false));
  $("ami-monitor-send").addEventListener("click", () => enviar(true));
  $("ami-monitor-send-response").addEventListener("click", enviarResposta);
  $("ami-revoke-invitation").addEventListener("click", async () => {
    const email = $("ami-email-preview-recipient").value;
    if (!contexto || ocupado || !contexto.destinatarios.includes(email)) return;
    if (!(await ProcessFeedback.confirmar({
      title: "Revogar convite individual", message: "Revogar o acesso de " + email + "?",
      warning: "A resposta registrada será preservada. Um novo envio será necessário para liberar o acesso novamente.",
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
  $("ami-monitor-refresh").addEventListener("click", coletar);
  $("ami-monitor-select-all").addEventListener("change", event => {
    filteredRows.forEach(row => { if (event.target.checked) selected.add(rowKey(row)); else selected.delete(rowKey(row)); });
    render();
  });
  $("ami-monitor-clear").addEventListener("click", () => { selected.clear(); render(); });
  $("ami-monitor-export").addEventListener("click", () => {
    const rows = monitorRows.filter(row => selected.has(rowKey(row)));
    if (!rows.length) return;
    const headings = Array.from($("ami-monitor-table").tHead.rows[0].cells).slice(1).map(th => th.textContent.trim());
    exportar(rows.map(cells), headings, "monitoramento-colaboradores.csv");
  });
  function atualizarAutomaticamente() {
    if (contexto && !ocupado && !carregando && modo === "view" &&
        !document.hidden &&         !$("ami-email-draft-card").classList.contains("is-hidden")) carregar(contexto, true);
  }
  setInterval(atualizarAutomaticamente, 5000);
  window.addEventListener("focus", atualizarAutomaticamente);
  document.addEventListener("visibilitychange", atualizarAutomaticamente);
})();
