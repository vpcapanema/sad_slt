(function (global) {
  const TITLE = "SICARD";
  const DEFAULT_SUBTITLE = "Subsecretaria de Logística e Transportes — Governo de São Paulo";

  function assetBase() {
    const segments = location.pathname.split("/").filter(Boolean);
    if (!segments.length) return "";
    const last = segments[segments.length - 1];
    const depth = last.includes(".") ? segments.length - 1 : segments.length;
    return depth ? "../".repeat(depth) : "";
  }

  function iconSrc() {
    const existing = document.querySelector(".sidebar-app-icon, .app-header-icon");
    if (existing?.getAttribute("src")) return existing.getAttribute("src");
    return "/assets/img/brand/sicard-simbolo.png";
  }

  function homeHref() {
    return "/public/";
  }

  function escapeHtml(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function resolveSubtitle(existing) {
    const path = location.pathname.replace(/\\/g, "/").toLowerCase();
    if (path.includes("/restrict/painel")) {
      return "Painel administrativo de demandas";
    }
    if (path.includes("/painel")) {
      return "Painel público de acompanhamento de demandas";
    }
    const trimmed = (existing || "").trim();
    return trimmed || DEFAULT_SUBTITLE;
  }

  function brandMarkup(subtitle, home) {
    const sub = escapeHtml(subtitle);
    const homeEsc = escapeHtml(home);
    const icon = escapeHtml(iconSrc());
    return `
      <a href="${homeEsc}" class="app-header-brand" title="Página inicial">
        <span class="app-header-icon-frame" aria-hidden="true">
          <img src="${icon}" alt="" class="app-header-icon sidebar-app-icon">
        </span>
        <div class="app-brand">
          <span class="app-brand-title">${TITLE}</span>
          <small>${sub}</small>
        </div>
      </a>`;
  }

  function frameExistingIcon(img) {
    if (!img || img.closest(".app-header-icon-frame")) return;
    const frame = document.createElement("span");
    frame.className = "app-header-icon-frame";
    frame.setAttribute("aria-hidden", "true");
    img.before(frame);
    frame.appendChild(img);
    img.removeAttribute("width");
    img.removeAttribute("height");
  }

  function upgradeHeaderInner(inner) {
    if (inner.dataset.sadHeader === "1") return;

    // Painéis com sidebar: título só na coluna esquerda; navbar ocupa a faixa superior direita.
    if (inner.closest(".layout-main-header")) {
      inner.classList.remove("app-header-inner--nav-only");
      inner.dataset.sadHeader = "1";
      return;
    }

    let subtitle = DEFAULT_SUBTITLE;
    const legacyBrand = inner.querySelector(":scope > .app-brand");
    if (legacyBrand) {
      subtitle = resolveSubtitle(legacyBrand.querySelector("small")?.textContent);
      legacyBrand.remove();
    } else {
      subtitle = resolveSubtitle("");
    }

    const brandHtml = brandMarkup(subtitle, homeHref());
    inner.insertAdjacentHTML("afterbegin", brandHtml);
    inner.classList.remove("app-header-inner--nav-only");
    inner.dataset.sadHeader = "1";
  }

  function upgradeSidebarBrand() {
    document.querySelectorAll(".layout-sidebar-header .layout-sidebar-home-link").forEach((link) => {
      if (link.dataset.sadHeader === "1") return;
      const brand = link.querySelector(".app-brand");
      if (!brand) return;
      const subtitle = resolveSubtitle(brand.querySelector("small")?.textContent);
      brand.innerHTML = `<span class="app-brand-title">${TITLE}</span><small>${escapeHtml(subtitle)}</small>`;
      const img = link.querySelector(".sidebar-app-icon");
      if (img && !img.classList.contains("app-header-icon")) img.classList.add("app-header-icon");
      frameExistingIcon(img);
      link.dataset.sadHeader = "1";
    });
  }

  function init() {
    document.querySelectorAll(".app-header .app-header-inner").forEach(upgradeHeaderInner);
    document.querySelectorAll(".app-header-inner:not(.app-header *)").forEach(upgradeHeaderInner);
    upgradeSidebarBrand();
    document.querySelectorAll(".app-header-brand > .app-header-icon").forEach(frameExistingIcon);
  }

  global.SLTAppHeader = { init, TITLE, resolveSubtitle };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(window);
