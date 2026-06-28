(function (global) {
  // Navbar compartilhada com duas versões conforme a sessão (/api/auth/me).
  // Usa caminhos absolutos a partir da raiz do site (servido em 127.0.0.1:8080).

  const PUBLIC_LINKS = [
    { href: "/index.html", label: "Início" },
    { href: "/cadastro/", label: "Cadastro de Demandas" },
    { href: "/painel/", label: "Painel de acompanhamento" },
    { href: "/admin/login.html", label: "Área restrita" },
  ];

  const RESTRICTED_LINKS = [
    { href: "/index.html", label: "Início" },
    { href: "/admin/painel.html", label: "Painel de demandas" },
    { href: "/admin/demandas.html", label: "Tabela de demandas" },
    { href: "/ahp/home.html", label: "Configuração da Análise Multicritério" },
    { href: "/hierarquizacao_demandas/", label: "Hierarquização de demandas" },
  ];

  function escapeHtml(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function isActive(href) {
    let path = location.pathname;
    if (path.length > 1 && path.endsWith("/index.html")) {
      // normaliza /x/index.html -> /x/ para casar com hrefs de diretório
    }
    if (href === "/index.html") {
      return path === "/" || path === "/index.html";
    }
    if (href.endsWith("/")) {
      return path === href || path.startsWith(href);
    }
    return path === href;
  }

  function render(links) {
    return links
      .map(
        (l) =>
          `<a href="${escapeHtml(l.href)}"${isActive(l.href) ? ' class="active"' : ""}>${escapeHtml(l.label)}</a>`
      )
      .join("");
  }

  async function isLogged() {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      return res.ok;
    } catch (err) {
      return false;
    }
  }

  async function init() {
    const navs = document.querySelectorAll("nav.app-nav");
    if (!navs.length) return;
    const logged = await isLogged();
    const html = render(logged ? RESTRICTED_LINKS : PUBLIC_LINKS);
    navs.forEach((nav) => {
      nav.innerHTML = html;
      nav.dataset.navMode = logged ? "restrita" : "publica";
    });
  }

  global.SLTNavbar = { init };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(window);
