/**
 * SLTFeedback — feedback do sistema por modal.
 *
 * Três estágios de uma ação:
 *   1. `confirmar()`  — revisão do que vai acontecer, antes de qualquer chamada.
 *   2. `processo()`   — acompanhamento enquanto roda (mensagens reais do servidor).
 *   3. `concluir()`   — semáforo do desfecho: verde, amarelo (parcial) ou vermelho.
 *
 * Uso:
 *   if (!(await SLTFeedback.confirmar({ title: "Enviar camada", message: "…", confirmLabel: "Enviar" }))) return;
 *   const proc = SLTFeedback.processo("Enviando camada");
 *   const p = proc.passo("Enviando restrição…");
 *   proc.atualizar(p, "success");
 *   proc.concluir({ type: "success", message: "Par homologado carregado." });
 *
 * Enquanto o processo roda o modal não fecha (X, Esc e clique no fundo ficam
 * inertes): nenhuma destas operações tem cancelamento real no servidor, e
 * fechar a janela só esconderia do usuário algo que continua acontecendo.
 */
(function (global) {
  "use strict";

  const esc = (value) =>
    String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[char]);

  const ICONS = {
    success: "fa-circle-check",
    error: "fa-circle-xmark",
    warning: "fa-triangle-exclamation",
    info: "fa-circle-info",
    progress: "fa-spinner fa-spin",
    question: "fa-circle-question",
  };
  const TITULOS = {
    success: "Sucesso", error: "Erro", warning: "Concluído com ressalvas",
    info: "Informação", progress: "Processando", question: "Confirmar ação",
  };

  let travado = false; // true enquanto um processo roda: ignora pedidos de fechar

  function raiz() {
    let root = document.getElementById("slt-feedback-root");
    if (!root) {
      root = document.createElement("div");
      root.id = "slt-feedback-root";
      document.body.appendChild(root);
    }
    return root;
  }

  function fechar() {
    if (travado) return;
    const bd = document.getElementById("slt-feedback-backdrop");
    if (bd) bd.remove();
    document.body.style.overflow = "";
  }

  function addPasso(ul, passo) {
    const p = typeof passo === "string" ? { message: passo, status: "info" } : passo || {};
    const li = document.createElement("li");
    li.className = `slt-fb-step slt-fb-step--${p.status || "info"}`;
    li.innerHTML = `<i class="fas ${ICONS[p.status] || ICONS.info}"></i><span>${esc(p.message)}</span>`;
    ul.appendChild(li);
    ul.hidden = false;
    ul.scrollTop = ul.scrollHeight;
    return li;
  }

  function montar({ type = "info", title, message, steps, footerHtml, barra = false }) {
    travado = false;
    fechar();
    const bd = document.createElement("div");
    bd.id = "slt-feedback-backdrop";
    bd.className = "slt-fb-backdrop";
    bd.innerHTML = `
      <div class="slt-fb-modal slt-fb-modal--${type}" role="dialog" aria-modal="true" aria-live="polite">
        <header class="slt-fb-head">
          <span class="slt-fb-icon"><i class="fas ${ICONS[type] || ICONS.info}"></i></span>
          <h3 class="slt-fb-title">${esc(title || TITULOS[type] || "Mensagem")}</h3>
          <button type="button" class="slt-fb-close" data-fb-close aria-label="Fechar"><i class="fas fa-xmark"></i></button>
        </header>
        <div class="slt-fb-body">
          ${message ? `<p class="slt-fb-message">${esc(message)}</p>` : ""}
          ${barra ? '<div class="slt-fb-bar"><div class="slt-fb-bar-fill" style="width:0%"></div></div><p class="slt-fb-etapa"></p>' : ""}
          <ul class="slt-fb-steps" hidden></ul>
        </div>
        <footer class="slt-fb-foot">${footerHtml || '<button type="button" class="btn btn-primary" data-fb-close>OK</button>'}</footer>
      </div>`;
    raiz().appendChild(bd);
    document.body.style.overflow = "hidden";
    bd.addEventListener("click", (e) => {
      if (e.target === bd || e.target.closest("[data-fb-close]")) fechar();
    });
    const onKey = (e) => {
      if (e.key === "Escape" && !travado) {
        fechar();
        document.removeEventListener("keydown", onKey);
      }
    };
    document.addEventListener("keydown", onKey);
    const ul = bd.querySelector(".slt-fb-steps");
    (steps || []).forEach((s) => addPasso(ul, s));
    return bd;
  }

  function notify(type, message, title) {
    return montar({ type, message, title });
  }

  /**
   * Estágio 1 — revisão e confirmação da ação que está por vir.
   * options: { title, message, detail, confirmLabel, cancelLabel, danger }
   * Resolve true (seguir) ou false (desistir). Esc, clique no fundo, X e
   * "Cancelar" resolvem false; Enter e o botão de ação resolvem true.
   */
  function confirmar(options) {
    const opts = typeof options === "string" ? { message: options } : options || {};
    const {
      title = TITULOS.question,
      message = "Deseja continuar?",
      detail = "",
      confirmLabel = "Confirmar",
      cancelLabel = "Cancelar",
      danger = false,
    } = opts;

    return new Promise((resolve) => {
      const footerHtml =
        `<button type="button" class="btn btn-secondary" data-fb-cancelar>${esc(cancelLabel)}</button>` +
        `<button type="button" class="btn ${danger ? "btn-danger" : "btn-primary"}" data-fb-confirmar>${esc(confirmLabel)}</button>`;
      const bd = montar({
        type: danger ? "warning" : "question",
        title,
        message,
        steps: detail ? [{ message: detail, status: "info" }] : [],
        footerHtml,
      });

      let resolvido = false;
      const encerrar = (valor) => {
        if (resolvido) return;
        resolvido = true;
        document.removeEventListener("keydown", onKey);
        fechar();
        resolve(valor);
      };
      function onKey(e) {
        if (e.key === "Escape") encerrar(false);
        else if (e.key === "Enter") encerrar(true);
      }
      bd.addEventListener("click", (e) => {
        if (e.target.closest("[data-fb-confirmar]")) encerrar(true);
        else if (e.target.closest("[data-fb-cancelar]") || e.target.closest("[data-fb-close]") || e.target === bd) {
          encerrar(false);
        }
      });
      document.addEventListener("keydown", onKey);
      // Ação destrutiva nunca começa com o botão perigoso focado.
      bd.querySelector(danger ? "[data-fb-cancelar]" : "[data-fb-confirmar]")?.focus();
    });
  }

  /**
   * Estágio 2 — acompanhamento da execução. O modal fica travado (não fecha)
   * até `concluir()` — estágio 3, que pinta o semáforo e libera o fechamento.
   */
  function processo(title, { barra = false } = {}) {
    const bd = montar({ type: "progress", title: title || TITULOS.progress, barra });
    const modal = bd.querySelector(".slt-fb-modal");
    const ul = bd.querySelector(".slt-fb-steps");
    const foot = bd.querySelector(".slt-fb-foot");
    const fill = bd.querySelector(".slt-fb-bar-fill");
    const etapa = bd.querySelector(".slt-fb-etapa");
    foot.hidden = true; // sem botão OK enquanto o processo roda
    travado = true;
    return {
      passo(message, status = "progress") {
        return addPasso(ul, { message, status });
      },
      atualizar(li, status, message) {
        if (!li) return;
        li.className = `slt-fb-step slt-fb-step--${status}`;
        const icone = li.querySelector("i");
        if (icone) icone.className = `fas ${ICONS[status] || ICONS.info}`;
        if (message != null) {
          const span = li.querySelector("span");
          if (span) span.textContent = message;
        }
      },
      /** Progresso real relatado pelo servidor (percentual + etapa corrente). */
      progresso(percentual, etapaAtual) {
        if (fill && Number.isFinite(percentual)) {
          fill.style.width = `${Math.max(0, Math.min(100, percentual))}%`;
        }
        if (etapa && etapaAtual) etapa.textContent = etapaAtual;
      },
      concluir({ type = "success", title: t, message, acoesHtml } = {}) {
        travado = false;
        modal.className = `slt-fb-modal slt-fb-modal--${type}`;
        const icone = bd.querySelector(".slt-fb-icon i");
        if (icone) icone.className = `fas ${ICONS[type] || ICONS.success}`;
        bd.querySelector(".slt-fb-title").textContent = t || TITULOS[type] || TITULOS.success;
        if (message) {
          let p = bd.querySelector(".slt-fb-message");
          if (!p) {
            p = document.createElement("p");
            p.className = "slt-fb-message";
            bd.querySelector(".slt-fb-body").prepend(p);
          }
          p.textContent = message;
        }
        if (acoesHtml) foot.innerHTML = acoesHtml;
        foot.hidden = false;
        foot.querySelector("button")?.focus();
        return bd;
      },
      fechar() {
        travado = false;
        fechar();
      },
    };
  }

  /**
   * Ação síncrona (uma requisição, uma resposta) com os três estágios.
   * `executar` recebe o handle do processo para registrar passos próprios.
   * Devolve { ok, resultado, erro } — quem chama segue renderizando a página.
   */
  async function acao({ confirmacao, titulo, mensagemInicial, executar, sucesso, acoesHtml }) {
    if (confirmacao && !(await confirmar(confirmacao))) return { ok: false, cancelado: true };
    const proc = processo(titulo);
    const p = proc.passo(mensagemInicial || "Enviando a solicitação ao servidor…", "progress");
    try {
      const resultado = await executar(proc);
      proc.atualizar(p, "success", "Servidor respondeu com sucesso.");
      proc.concluir({
        type: "success",
        title: "Processo concluído",
        message: typeof sucesso === "function" ? sucesso(resultado) : sucesso,
        acoesHtml,
      });
      return { ok: true, resultado, proc };
    } catch (erro) {
      proc.atualizar(p, "error", "O servidor interrompeu o processo.");
      proc.concluir({
        type: "error",
        title: "Processo interrompido",
        message: erro?.message || String(erro),
      });
      return { ok: false, erro };
    }
  }

  global.SLTFeedback = {
    notify,
    success: (m, t) => notify("success", m, t),
    error: (m, t) => notify("error", m, t),
    warning: (m, t) => notify("warning", m, t),
    info: (m, t) => notify("info", m, t),
    confirmar,
    processo,
    acao,
    fechar,
  };
})(window);
