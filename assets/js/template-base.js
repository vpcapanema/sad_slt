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
      if (!caminhoAtivo(link)) return;
      link.classList.add("active");
      link.setAttribute("aria-current", "page");
    });
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
