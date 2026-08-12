/**
 * SLTFeedback — feedback do sistema por modal.
 * Notificações por tipo (success, error, warning, info) e acompanhamento de
 * processo com passos (spinner → ok/erro/aviso). Reutilizável em qualquer página.
 *
 * Uso:
 *   SLTFeedback.success("Camadas carregadas.");
 *   SLTFeedback.error("Falha ao executar.", "Erro no cálculo");
 *   const proc = SLTFeedback.processo("Carregando camadas");
 *   const p = proc.passo("Enviando restrição…");
 *   proc.atualizar(p, "success");
 *   proc.concluir({ type: "success", message: "Par homologado carregado." });
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
  };
  const TITULOS = {
    success: "Sucesso", error: "Erro", warning: "Atenção",
    info: "Informação", progress: "Processando",
  };

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
    return li;
  }

  function montar({ type = "info", title, message, steps }) {
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
          <ul class="slt-fb-steps" hidden></ul>
        </div>
        <footer class="slt-fb-foot"><button type="button" class="btn btn--primary" data-fb-close>OK</button></footer>
      </div>`;
    raiz().appendChild(bd);
    document.body.style.overflow = "hidden";
    bd.addEventListener("click", (e) => {
      if (e.target === bd || e.target.closest("[data-fb-close]")) fechar();
    });
    const onKey = (e) => {
      if (e.key === "Escape") {
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

  function processo(title) {
    const bd = montar({ type: "progress", title: title || TITULOS.progress });
    const modal = bd.querySelector(".slt-fb-modal");
    const ul = bd.querySelector(".slt-fb-steps");
    const foot = bd.querySelector(".slt-fb-foot");
    foot.hidden = true; // sem botão OK enquanto o processo roda
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
      concluir({ type = "success", title: t, message } = {}) {
        modal.className = `slt-fb-modal slt-fb-modal--${type}`;
        const icone = bd.querySelector(".slt-fb-icon i");
        if (icone) icone.className = `fas ${ICONS[type] || ICONS.success}`;
        if (t) bd.querySelector(".slt-fb-title").textContent = t;
        else bd.querySelector(".slt-fb-title").textContent = TITULOS[type] || TITULOS.success;
        if (message) {
          let p = bd.querySelector(".slt-fb-message");
          if (!p) {
            p = document.createElement("p");
            p.className = "slt-fb-message";
            bd.querySelector(".slt-fb-body").prepend(p);
          }
          p.textContent = message;
        }
        foot.hidden = false;
      },
      fechar,
    };
  }

  global.SLTFeedback = {
    notify,
    success: (m, t) => notify("success", m, t),
    error: (m, t) => notify("error", m, t),
    warning: (m, t) => notify("warning", m, t),
    info: (m, t) => notify("info", m, t),
    processo,
    fechar,
  };
})(window);
