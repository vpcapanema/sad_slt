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
  let ouvinteTeclado = null; // Esc do modal aberto; sai junto com ele para não acumular

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
    if (ouvinteTeclado) {
      document.removeEventListener("keydown", ouvinteTeclado);
      ouvinteTeclado = null;
    }
  }

  function addPasso(ul, passo) {
    const p = typeof passo === "string" ? { message: passo, status: "info" } : passo || {};
    const li = document.createElement("li");
    li.className = `slt-fb-step slt-fb-step--${p.status || "info"}${p.destaque ? " slt-fb-step--destaque" : ""}`;
    li.innerHTML = `<i class="fas ${ICONS[p.status] || ICONS.info}"></i><span>${esc(p.message)}</span>`;
    ul.appendChild(li);
    ul.hidden = false;
    ul.scrollTop = ul.scrollHeight;
    return li;
  }

  /** Texto ou lista de textos/linhas → linhas { message, status }; texto solto herda `status`. */
  function linhas(conteudo, status) {
    const lista = Array.isArray(conteudo) ? conteudo : conteudo ? [conteudo] : [];
    return lista.map((l) => (typeof l === "string" ? { message: l, status } : l));
  }

  function montar({ type = "info", title, message, steps, resultados, footerHtml, barra = false }) {
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
          <ul class="slt-fb-results" hidden></ul>
          <ul class="slt-fb-steps" hidden></ul>
        </div>
        <footer class="slt-fb-foot">${footerHtml || '<button type="button" class="btn btn-primary" data-fb-close>OK</button>'}</footer>
      </div>`;
    raiz().appendChild(bd);
    document.body.style.overflow = "hidden";
    bd.addEventListener("click", (e) => {
      if (e.target === bd || e.target.closest("[data-fb-close]")) fechar();
    });
    // O `fechar()` do início já removeu o ouvinte do modal anterior.
    ouvinteTeclado = (e) => {
      if (e.key === "Escape" && !travado) fechar();
    };
    document.addEventListener("keydown", ouvinteTeclado);
    const ul = bd.querySelector(".slt-fb-steps");
    (steps || []).forEach((s) => addPasso(ul, s));
    const res = bd.querySelector(".slt-fb-results");
    linhas(resultados, type).forEach((l) => addPasso(res, l));
    return bd;
  }

  /**
   * Modal de status: cabeçalho com o título da ação, corpo com os resultados,
   * um por linha. `resultados` aceita texto ou lista de textos/{ message, status }.
   */
  function notify(type, resultados, title) {
    return montar({ type, title, resultados });
  }

  /**
   * Estágio 1 — revisão e confirmação da ação que está por vir.
   * options: { title, message, detail, confirmLabel, cancelLabel, danger }
   * Resolve true (seguir) ou false (desistir). Esc, clique no fundo, X e
   * "Cancelar" resolvem false; o botão de ação resolve true. Enter aciona o
   * botão focado; em ação perigosa (`danger`), só confirma com o foco no
   * botão de ação — o foco inicial em "Cancelar" não pode virar confirmação.
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
        if (e.key === "Escape") {
          encerrar(false);
        } else if (e.key === "Enter") {
          e.preventDefault(); // o clique nativo do botão focado decidiria de novo
          const foco = document.activeElement;
          if (foco?.closest?.("[data-fb-cancelar], [data-fb-close]")) encerrar(false);
          else if (!danger || foco?.closest?.("[data-fb-confirmar]")) encerrar(true);
        }
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
      /**
       * Estágio 3. O cabeçalho mantém o título da ação; o status vem pela cor e
       * pelo ícone. O corpo passa a listar os resultados, um por linha
       * (`title` vira a linha de destaque, `message` e `resultados` as demais),
       * e as tarefas executadas ficam recolhidas logo abaixo.
       */
      concluir({ type = "success", title: t, message, resultados, acoesHtml } = {}) {
        travado = false;
        modal.className = `slt-fb-modal slt-fb-modal--${type}`;
        const icone = bd.querySelector(".slt-fb-icon i");
        if (icone) icone.className = `fas ${ICONS[type] || ICONS.success}`;
        const res = bd.querySelector(".slt-fb-results");
        res.replaceChildren();
        const lista = [
          ...(t ? [{ message: t, status: type, destaque: true }] : []),
          ...linhas(message, type),
          ...linhas(resultados, type),
        ];
        lista.forEach((l) => addPasso(res, l));
        if (lista.length && ul.children.length) {
          const tarefas = document.createElement("details");
          tarefas.className = "slt-fb-tarefas";
          tarefas.innerHTML = `<summary>Tarefas executadas (${ul.children.length})</summary>`;
          ul.replaceWith(tarefas);
          tarefas.appendChild(ul);
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
      // O cabeçalho já é o título da ação; o corpo lista só os resultados.
      proc.concluir({
        type: "success",
        resultados: typeof sucesso === "function" ? sucesso(resultado) : sucesso,
        acoesHtml,
      });
      return { ok: true, resultado, proc };
    } catch (erro) {
      proc.atualizar(p, "error", "O servidor interrompeu o processo.");
      proc.concluir({
        type: "error",
        resultados: erro?.message || String(erro),
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
