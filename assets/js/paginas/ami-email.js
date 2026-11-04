(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  let contexto = null, registros = [], pronto = false, ocupado = false, modo = "create", pagina = 1;
  const rotulosEnvio = {enviando: "Envio sem resultado final", aceito_smtp: "Aceito pelo servidor",
    falha: "Não enviado", indeterminado: "Resultado indeterminado"};
  const rotulosEntrega = {sem_confirmacao: "Sem confirmação", confirmada: "Confirmada", falha: "Devolvido", adiada: "Adiada"};
  const url = id => "/api/ahp/comparacao-colaborativa/ambientes/" + encodeURIComponent(id) + "/emails";
  const filterColumn = $("ami-monitor-filter-coluna"), filterValue = $("ami-monitor-filter-valor");
  let monitorRows = [];
  const selected = new Set();
  let filteredRows = [], visibleCount = 0;
  const rowKey = row => row.id || "pendente:" + row.destinatario.toLowerCase();
  function cells(row) {
    const aviso = row.envio_status === "aceito_smtp" && !row.dsn_solicitada
      ? " O servidor não oferece confirmação automática de entrega (DSN)." : "";
    return [row.destinatario, row.criado_em ? new Date(row.criado_em).toLocaleString("pt-BR") : "—",
      rotulosEnvio[row.envio_status] || "Ainda não enviado",
      rotulosEntrega[row.entrega_status] || "Sem confirmação",
      row.leitura_status === "confirmada" ? "Confirmada pelo aplicativo" : "Sem confirmação",
      (row.detalhe || "") + aviso];
  }
  const sortRows = SLTTable.sorting($("ami-monitor-table"), () => [null, ...Array.from({length: 6}, (_, index) => row => cells(row)[index])], () => { pagina = 1; render(); });
  Array.from($("ami-monitor-table").tHead.rows[0].cells).slice(1).forEach((th, index) => filterColumn.add(new Option(th.textContent, String(index))));
  function filterOptions() {
    SLTTable.values(filterValue, monitorRows, row => cells(row)[Number(filterColumn.value)]);
    filterValue.disabled = filterColumn.value === "";
  }
  filterColumn.onchange = () => { filterValue.value = ""; filterOptions(); pagina = 1; render(); };
  filterValue.onchange = () => { pagina = 1; render(); };
  SLTTable.bindFilter("ami-monitor-filter", () => { pagina = 1; render(); }, () => { filterColumn.value = ""; filterValue.value = ""; filterOptions(); });
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
  function controles() {
    const {pendentes, enviados} = situacao();
    const rotulo = !enviados ? "Enviar e-mail" : pendentes.length ? "Enviar aos pendentes (" + pendentes.length + ")" : "Reenviar e-mails";
    $("ami-open-mail").innerHTML = '<i class="fas fa-envelope c-btn__icon" aria-hidden="true"></i>' + rotulo;
    $("ami-open-mail").disabled = ocupado || !pronto || modo !== "view" || !contexto ||
      !contexto.url || contexto.julgamento.status !== "ativa" ||
      !(Date.parse(contexto.julgamento.valido_ate) >= Date.now()) || !contexto.destinatarios.length;
    $("ami-monitor-send").disabled = $("ami-open-mail").disabled || !selecionados().length;
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
    const rows = registros.slice().reverse();
    contexto.destinatarios.forEach(destinatario => {
      if (!registros.some(row => row.destinatario.toLowerCase() === destinatario.toLowerCase())) {
        rows.push({destinatario, envio_status: null, entrega_status: "sem_confirmacao", leitura_status: "sem_confirmacao", detalhe: ""});
      }
    });
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
      cells(row).forEach(value => {
        const td = document.createElement("td"); td.textContent = value; tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    if (!result.rows.length) {
      const td = tbody.insertRow().insertCell(); td.colSpan = 7; td.className = "ami-empty"; td.textContent = "Nenhum registro encontrado.";
    }
    controles();
  }
  async function carregar(atual) {
    try {
      const rows = await request(url(atual.julgamento.id));
      if (!Array.isArray(rows)) throw new Error("O histórico de e-mails retornou um formato inválido.");
      if (contexto !== atual) return;
      registros = rows; pronto = true;
      $("ami-email-status").textContent = "Histórico de envios carregado.";
      render();
    } catch (error) {
      if (contexto !== atual) return;
      pronto = false; controles();
      $("ami-email-status").textContent = "Histórico indisponível. " + error.message;
      Notify.error("E-mails do julgamento", error.message);
    }
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
    /limitou temporariamente|recusou a mensagem/i.test(row.detalhe || "");
  function situacao() {
    if (!contexto || !pronto) return {pendentes: [], enviados: 0};
    const ultimo = new Map();
    registros.forEach(row => {
      const chave = row.destinatario.toLowerCase(), anterior = ultimo.get(chave);
      const data = row => Date.parse(row.atualizado_em || row.criado_em || 0) || 0;
      if (!anterior || data(row) >= data(anterior)) ultimo.set(chave, row);
    });
    const pendentes = contexto.destinatarios.filter(destinatario => {
      const row = ultimo.get(destinatario.toLowerCase());
      return !row || row.envio_status === "falha";
    });
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
    let processo, aceitos = 0, problemas = 0, interrompido = 0;
    try {
      if (!(await ProcessFeedback.confirmar({
        title: apenasSelecionados ? "Enviar e-mail aos selecionados" : reenvio ? "Reenviar e-mails aos colaboradores" : somentePendentes ? "Enviar e-mail aos pendentes" : "Enviar e-mail aos colaboradores",
        message: "Enviar a mensagem exibida para " + lista.length + " colaborador(es)" +
          (apenasSelecionados ? " selecionado(s) no monitoramento?" : somentePendentes ? " que ainda não receberam o convite?" : " salvo(s)?"),
        warning: apenasSelecionados ? "Cada selecionado receberá um novo convite, mesmo que já tenha recebido. A chave anterior dessa pessoa será invalidada; os demais colaboradores não são afetados."
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
              reenvio_id: reenvioId
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
        if (limitadoPeloServidor(row)) { interrompido = lista.length - indice - 1; break; }
      }
      const resumo = aceitos + " mensagem(ns) aceita(s) pelo servidor; " + problemas + " sem envio confirmado." +
        (interrompido ? " O servidor de e-mail continuou limitando os envios; " + interrompido + " colaborador(es) não foram tentados. Aguarde alguns minutos e use Enviar aos pendentes." : "") +
        " Consulte os detalhes por destinatário.";
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
      registros = result.registros; pronto = true; render();
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
  window.SICARDEmailConvites = {
    modo(value) { modo = value; controles(); },
    mostrar(julgamento, mensagem, link) {
      contexto = {julgamento, mensagem, url: link, destinatarios: (julgamento.convites || []).map(c => typeof c === "string" ? c : c.email)};
      registros = []; pronto = false; pagina = 1;
      selected.clear(); monitorRows = []; filteredRows = []; visibleCount = 0;
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
    const quote = value => '"' + String(value).replace(/^[=+@-]/, "'$&").replace(/"/g, '""') + '"';
    const headings = Array.from($("ami-monitor-table").tHead.rows[0].cells).slice(1).map(th => th.textContent.trim());
    const csv = [headings, ...rows.map(cells)].map(row => row.map(quote).join(";")).join("\r\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob(["\uFEFF", csv], {type: "text/csv;charset=utf-8"}));
    link.download = "monitoramento-colaboradores.csv";
    link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  });
})();
