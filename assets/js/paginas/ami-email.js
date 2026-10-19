(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  let contexto = null, registros = [], pronto = false, ocupado = false, modo = "create", pagina = 1;
  const rotulosEnvio = {enviando: "Envio sem resultado final", aceito_smtp: "Aceito pelo servidor",
    falha: "Não enviado", indeterminado: "Resultado indeterminado"};
  const rotulosEntrega = {sem_confirmacao: "Sem confirmação", confirmada: "Confirmada", falha: "Devolvido", adiada: "Adiada"};
  const url = id => "/api/ahp/comparacao-colaborativa/ambientes/" + encodeURIComponent(id) + "/emails";
  async function request(path, options) {
    const response = await fetch(path, Object.assign({
      credentials: "same-origin", headers: {"Content-Type": "application/json"}
    }, options));
    let body;
    try { body = await response.json(); }
    catch (_) { throw new Error("O servidor retornou uma resposta inválida. Consulte o histórico antes de tentar enviar novamente."); }
    if (!response.ok) throw new Error(Array.isArray(body.detail) ? body.detail.map(item => item.msg).join("; ") : body.detail || "Não foi possível concluir a operação.");
    return body;
  }
  function controles() {
    $("ami-open-mail").disabled = ocupado || !pronto || modo !== "view" || !contexto ||
      !contexto.url || contexto.julgamento.status !== "ativa" ||
      !(Date.parse(contexto.julgamento.valido_ate) >= Date.now()) || !contexto.destinatarios.length;
    $("ami-email-receipts").disabled = ocupado || !contexto || modo !== "view";
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
    const result = SLTTable.paginate("ami-email-status-pagination", rows, pagina, page => { pagina = page; render(); });
    pagina = result.page;
    result.rows.forEach(row => {
      const tr = document.createElement("tr");
      const aviso = row.envio_status === "aceito_smtp" && !row.dsn_solicitada
        ? " O servidor não oferece confirmação automática de entrega (DSN)." : "";
      [row.destinatario, row.criado_em ? new Date(row.criado_em).toLocaleString("pt-BR") : "—",
        rotulosEnvio[row.envio_status] || "Ainda não enviado",
        rotulosEntrega[row.entrega_status] || "Sem confirmação",
        row.leitura_status === "confirmada" ? "Confirmada pelo aplicativo" : "Sem confirmação",
        (row.detalhe || "") + aviso].forEach(value => {
        const td = document.createElement("td"); td.textContent = value; tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    $("ami-email-status-count").textContent = result.rows.length + " na página / " + rows.length + " no total";
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
  async function enviar() {
    if ($("ami-open-mail").disabled) return;
    const atual = contexto;
    bloquear(true);
    let processo, aceitos = 0, problemas = 0;
    try {
      if (!(await ProcessFeedback.confirmar({
        title: "Enviar e-mail aos colaboradores",
        message: "Enviar a mensagem exibida para " + atual.destinatarios.length + " colaborador(es) salvo(s)?",
        warning: "Envios individuais. Mensagens idênticas já aceitas ou com resultado incerto não serão reenviadas.",
        confirmLabel: "Enviar e-mail"
      }))) return;
      processo = ProcessFeedback.iniciarCadastro({title: "Enviando convites por e-mail", tasks: atual.destinatarios});
      for (const destinatario of atual.destinatarios) {
        processo.tarefaAtual(destinatario);
        const row = await request(url(atual.julgamento.id) + "/enviar", {
          method: "POST", body: JSON.stringify({
            destinatario, texto: atual.mensagem, versao: atual.julgamento.atualizadoEm
          })
        });
        if (!row.id || !rotulosEnvio[row.envio_status]) throw new Error("O servidor não confirmou o estado do envio. Consulte o histórico antes de tentar novamente.");
        if (row.envio_status === "aceito_smtp") aceitos++; else problemas++;
        registros = registros.filter(item => item.id !== row.id).concat(row);
        render();
        processo.concluirTarefa(destinatario);
      }
      const resumo = aceitos + " mensagem(ns) aceita(s) pelo servidor; " + problemas + " sem envio confirmado. Consulte os detalhes por destinatário.";
      $("ami-email-status").textContent = resumo;
      if (!aceitos && problemas) processo.erro({message: resumo});
      else processo.sucesso({_status: problemas ? "partial" : "success", title: "Envio de convites", message: resumo});
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
      $("ami-email-status").textContent = "Carregando histórico de envios…";
      $("ami-email-status-count").textContent = "";
      $("ami-email-status-pagination").replaceChildren();
      render(); carregar(contexto);
    }
  };
  $("ami-open-mail").addEventListener("click", enviar);
  $("ami-email-receipts").addEventListener("click", coletar);
})();
