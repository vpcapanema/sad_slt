(function (global) {
  // Navbar compartilhada com duas versões conforme a sessão (/api/auth/session).
  // Usa caminhos absolutos a partir da raiz do site (servido em 127.0.0.1:8080).

  const PUBLIC_LINKS = [
    { href: "/public/cadastro/", label: "Cadastro de Demandas" },
    { href: "/public/transparencia/", label: "Transparência e Acompanhamento" },
    { href: "/public/documentacao/", label: "Documentação" },
    { href: "/public/login/", label: "Área restrita", kind: "action" },
  ];

  const RESTRICTED_LINKS = [
    {
      href: "/restrict/",
      label: "Cadastro de Demandas",
      children: [
        { href: "/restrict/painel/", label: "Painel administrativo" },
        { href: "/restrict/demandas/", label: "Análise de demandas" },
      ],
    },
    { href: "/restrict/hierarquizacao/", label: "Hierarquização e Ranking" },
    { href: "/public/transparencia/", label: "Transparência e Acompanhamento" },
    { href: "/public/documentacao/", label: "Documentação" },
  ];

  function restrictedHomeLink() {
    const path = location.pathname.toLowerCase();
    if (path.includes("/ahp/") || path.includes("/hierarquizacao/") || path.includes("/geoespacial/")) {
      return { href: "/restrict/hierarquizacao/", label: "Início" };
    }
    if (/\/restrict\/(painel|demandas|demanda|revisao-status)\//.test(path)) {
      return { href: "/public/cadastro/", label: "Início" };
    }
    return { href: "/restrict/", label: "Início" };
  }

  function escapeHtml(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function isActive(href) {
    let path = location.pathname;
    if (href === "/public/") {
      return path === "/public/";
    }
    if (href.endsWith("/")) {
      return path === href || path.startsWith(href);
    }
    return path === href;
  }

  function render(links) {
    return links
      .map((l) => {
        const classes = [isActive(l.href) ? "active" : "", l.kind === "action" ? "app-nav-action" : ""]
          .filter(Boolean)
          .join(" ");
        const anchor = `<a href="${escapeHtml(l.href)}"${classes ? ` class="${classes}"` : ""}>${escapeHtml(l.label)}${l.children ? '<span class="app-nav-caret" aria-hidden="true">▾</span>' : ""}</a>`;
        if (!l.children) return anchor;
        const children = l.children
          .map((child) => `<a href="${escapeHtml(child.href)}"${isActive(child.href) ? ' class="active"' : ""}>${escapeHtml(child.label)}</a>`)
          .join("");
        return `<div class="app-nav-group">${anchor}<div class="app-nav-submenu">${children}</div></div>`;
      })
      .join("");
  }

  async function isLogged() {
    try {
      const res = await fetch("/api/auth/session", { credentials: "include" });
      if (!res.ok) return false;
      const session = await res.json();
      return session?.authenticated === true;
    } catch (err) {
      return false;
    }
  }

  async function init() {
    const navs = document.querySelectorAll("nav.app-nav");
    if (!navs.length) return;
    const logged = await isLogged();
    const isPublicPage = location.pathname.toLowerCase().startsWith("/public/");
    const publicLinks = PUBLIC_LINKS.map((link) =>
      logged && link.kind === "action" ? { ...link, href: "/restrict/" } : link
    );
    const usePublicNav = isPublicPage || !logged;
    const html = render(usePublicNav ? publicLinks : [restrictedHomeLink(), ...RESTRICTED_LINKS]);
    navs.forEach((nav) => {
      nav.innerHTML = html;
      nav.dataset.navMode = usePublicNav ? "publica" : "restrita";
    });
  }

  global.SLTNavbar = { init };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(window);
