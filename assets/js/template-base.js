(function (global) {
  "use strict";

  function caminhoAtivo(link) {
    const href = link.getAttribute("href");
    if (!href || !href.startsWith("/")) return false;
    const atual = global.location.pathname;
    return atual === href || (href !== "/" && atual.startsWith(href));
  }

  function marcarNavegacaoAtual() {
    document.querySelectorAll(".app-nav a[href]").forEach((link) => {
      // A barra de módulo já vem marcada do servidor, que também compara a
      // query string (?menu=, ?modo=); pelo prefixo do caminho, "Início do
      // bloco" e a central do módulo ficariam ativos em todas as páginas.
      if (link.closest(".app-nav")?.querySelector(".app-nav-bloco")) return;
      if (!caminhoAtivo(link)) return;
      link.classList.add("active");
      link.setAttribute("aria-current", "page");
    });
  }

  // Menus suspensos da navbar de módulo: o hover cobre o mouse; o clique cobre
  // toque e teclado. Um menu aberto fecha ao abrir outro, clicar fora ou Esc.
  function ligarMenusSuspensos() {
    const fecharTodos = () => document.querySelectorAll(".app-nav-grupo-modulo.aberto").forEach((grupo) => {
      grupo.classList.remove("aberto");
      const botao = grupo.querySelector(".app-nav-grupo-botao");
      botao?.setAttribute("aria-expanded", "false");
      botao?.blur();
    });
    document.querySelectorAll(".app-nav-grupo-botao").forEach((botao) => {
      botao.addEventListener("click", (evento) => {
        evento.stopPropagation();
        const grupo = botao.closest(".app-nav-grupo-modulo");
        const abrir = !grupo.classList.contains("aberto");
        fecharTodos();
        if (!abrir) return;
        grupo.classList.add("aberto");
        botao.setAttribute("aria-expanded", "true");
      });
    });
    document.addEventListener("click", fecharTodos);
    document.addEventListener("keydown", (evento) => { if (evento.key === "Escape") fecharTodos(); });
  }

  async function atualizarAcessoRestrito() {
    const links = document.querySelectorAll("[data-link-area-restrita]");
    if (!links.length) return;
    try {
      const resposta = await fetch("/api/auth/session", { credentials: "include" });
      if (!resposta.ok) return;
      const sessao = await resposta.json();
      if (sessao?.authenticated !== true) return;
      links.forEach((link) => {
        link.href = "/restrict/";
        link.textContent = "Acessar área restrita";
      });
    } catch (_erro) {
      // A navegação pública continua funcional quando a sessão não está disponível.
    }
  }

  function exigirAutenticacaoQuandoConfigurado() {
    if (document.body.dataset.requerAutenticacao !== "true") return;
    global.SLTAdminAuth?.requireAuth?.();
  }

  function iniciar() {
    marcarNavegacaoAtual();
    ligarMenusSuspensos();
    atualizarAcessoRestrito();
    exigirAutenticacaoQuandoConfigurado();
  }

  global.SLTTemplateBase = { iniciar };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar);
  } else {
    iniciar();
  }
})(window);
