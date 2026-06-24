(function () {
  "use strict";

  var STYLE_ID = "ahp-template-shell-style";

  function getPageName() {
    var parts = window.location.pathname.split("/");
    return parts[parts.length - 1] || "sigma-ahp.html";
  }

  function isStepPage(pageName) {
    return /^step[1-5]-/.test(pageName);
  }

  function getActiveClass(target) {
    var pageName = getPageName();

    if (target === "home") {
      return pageName === "sigma-ahp.html" ? " csch2-navbar__link--active" : "";
    }

    if (target === "calculator") {
      return isStepPage(pageName) ? " csch2-navbar__link--active" : "";
    }

    return "";
  }

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) {
      return;
    }

    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = [
      ".csch2-navbar-band {",
      "  --csch2-navy: #1c3d59;",
      "  --csch2-deep: #003b5a;",
      "  --csch2-blue: #116593;",
      "  --csch2-green: #3ec26e;",
      "  --csch2-text: #1f2933;",
      "  --csch2-muted: #5b6770;",
      "  --csch2-shadow: 0 12px 28px rgba(28, 61, 89, 0.12);",
      "  --font-family-csch2: 'Montserrat', 'Segoe UI', Arial, sans-serif;",
      "  position: fixed;",
      "  top: var(--govsp-topbar-height, 50px);",
      "  left: 0;",
      "  right: 0;",
      "  z-index: 19500;",
      "  background: #f2f2f2;",
      "  border-bottom: 1px solid #e0e0e0;",
      "  box-shadow: var(--csch2-shadow);",
      "}",
      ".csch2-navbar__inner {",
      "  width: 100%;",
      "  max-width: 1440px;",
      "  margin: 0 auto;",
      "  min-height: 64px;",
      "  padding: 0 1.5rem;",
      "  display: flex;",
      "  align-items: center;",
      "  gap: 1.5rem;",
      "}",
      ".csch2-navbar__brand {",
      "  display: inline-flex;",
      "  align-items: center;",
      "  gap: 12px;",
      "  text-decoration: none;",
      "  flex-shrink: 0;",
      "}",
      ".csch2-navbar__badge {",
      "  width: 42px;",
      "  height: 42px;",
      "  border-radius: 12px;",
      "  display: inline-flex;",
      "  align-items: center;",
      "  justify-content: center;",
      "  background: linear-gradient(135deg, var(--csch2-deep), var(--csch2-navy));",
      "  color: #ffffff;",
      "  font-size: 1rem;",
      "  font-weight: 800;",
      "  letter-spacing: -0.02em;",
      "  box-shadow: 0 8px 18px rgba(0, 59, 90, 0.22);",
      "}",
      ".csch2-navbar__brand-copy {",
      "  display: flex;",
      "  flex-direction: column;",
      "  gap: 1px;",
      "  line-height: 1.08;",
      "}",
      ".csch2-navbar__brand-title {",
      "  font-size: 1rem;",
      "  font-weight: 800;",
      "  letter-spacing: 0.05em;",
      "  color: var(--csch2-deep);",
      "}",
      ".csch2-navbar__brand-subtitle {",
      "  font-size: 0.7rem;",
      "  font-weight: 600;",
      "  color: var(--csch2-muted);",
      "  max-width: 420px;",
      "  white-space: nowrap;",
      "  overflow: hidden;",
      "  text-overflow: ellipsis;",
      "}",
      ".csch2-navbar__toggle {",
      "  display: none;",
      "  align-items: center;",
      "  justify-content: center;",
      "  width: 42px;",
      "  height: 42px;",
      "  border: 1px solid #d6dde3;",
      "  border-radius: 12px;",
      "  background: #ffffff;",
      "  color: var(--csch2-deep);",
      "  cursor: pointer;",
      "}",
      ".csch2-navbar__menu {",
      "  display: flex;",
      "  align-items: center;",
      "  gap: 1.25rem;",
      "  flex: 1;",
      "  justify-content: space-between;",
      "}",
      ".csch2-navbar__nav {",
      "  display: flex;",
      "  align-items: center;",
      "  gap: 2px;",
      "  list-style: none;",
      "  margin: 0;",
      "  padding: 0;",
      "  flex: 1;",
      "  justify-content: center;",
      "}",
      ".csch2-navbar__item { position: relative; }",
      ".csch2-navbar__link,",
      ".csch2-navbar__dropdown-toggle {",
      "  display: inline-flex;",
      "  align-items: center;",
      "  gap: 7px;",
      "  padding: 0.45rem 0.65rem;",
      "  font-size: 0.83rem;",
      "  font-weight: 700;",
      "  color: var(--csch2-text);",
      "  text-decoration: none;",
      "  border-radius: 8px;",
      "  border: 0;",
      "  background: transparent;",
      "  cursor: pointer;",
      "  transition: background 0.18s ease;",
      "  font-family: var(--font-family-csch2);",
      "  white-space: nowrap;",
      "}",
      ".csch2-navbar__link i,",
      ".csch2-navbar__dropdown-toggle i:not(.csch2-navbar__caret),",
      ".csch2-navbar__dropdown-link i {",
      "  color: var(--csch2-green);",
      "}",
      ".csch2-navbar__link:hover,",
      ".csch2-navbar__dropdown-toggle:hover {",
      "  background: rgba(28, 61, 89, 0.08);",
      "}",
      ".csch2-navbar__link--active {",
      "  background: rgba(28, 61, 89, 0.1);",
      "}",
      ".csch2-navbar__caret {",
      "  font-size: 0.6rem;",
      "  color: var(--csch2-green);",
      "  transition: transform 0.18s ease;",
      "}",
      ".csch2-navbar__item--open .csch2-navbar__caret { transform: rotate(180deg); }",
      ".csch2-navbar__dropdown {",
      "  position: absolute;",
      "  top: calc(100% + 6px);",
      "  left: 0;",
      "  min-width: 240px;",
      "  padding: 8px;",
      "  background: #ffffff;",
      "  border: 1px solid #e0e0e0;",
      "  border-radius: 12px;",
      "  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);",
      "  opacity: 0;",
      "  visibility: hidden;",
      "  transform: translateY(6px);",
      "  transition: opacity 0.18s ease, transform 0.18s ease, visibility 0.18s ease;",
      "  list-style: none;",
      "  margin: 0;",
      "}",
      ".csch2-navbar__item--open .csch2-navbar__dropdown {",
      "  opacity: 1;",
      "  visibility: visible;",
      "  transform: translateY(0);",
      "}",
      ".csch2-navbar__dropdown-link {",
      "  display: flex;",
      "  align-items: center;",
      "  gap: 10px;",
      "  padding: 0.7rem 0.8rem;",
      "  border-radius: 10px;",
      "  text-decoration: none;",
      "  color: var(--csch2-text);",
      "  font-size: 0.82rem;",
      "  font-weight: 600;",
      "}",
      ".csch2-navbar__dropdown-link:hover { background: rgba(28, 61, 89, 0.06); }",
      ".csch2-navbar__actions { display: flex; align-items: center; }",
      ".csch2-navbar__btn {",
      "  display: inline-flex;",
      "  align-items: center;",
      "  gap: 8px;",
      "  padding: 0.7rem 1rem;",
      "  border-radius: 999px;",
      "  background: linear-gradient(135deg, var(--csch2-deep), var(--csch2-blue));",
      "  color: #ffffff;",
      "  text-decoration: none;",
      "  font-size: 0.78rem;",
      "  font-weight: 700;",
      "  box-shadow: 0 10px 22px rgba(0, 59, 90, 0.18);",
      "}",
      ".csrc-root {",
      "  --pli-navy: #1c3d59;",
      "  --pli-green-dark: #2aa358;",
      "  --pli-white: #ffffff;",
      "  --sigma-gray-400: #a0aec0;",
      "  --sigma-gray-500: #718096;",
      "  display: block;",
      "  width: 100%;",
      "}",
      ".csrc-root, .csrc-root * { box-sizing: border-box; }",
      ".csrc-root .sigma-footer {",
      "  background: linear-gradient(to right, #111111 0%, var(--pli-navy) 50%, var(--pli-green-dark) 100%);",
      "  color: var(--pli-white);",
      "  padding: 0.75rem 0;",
      "  margin: 0;",
      "  font-family: 'Montserrat', 'Segoe UI', Arial, sans-serif;",
      "}",
      ".csrc-root .sigma-footer__container { max-width: 1440px; margin: 0 auto; padding: 0.5rem 1rem; }",
      ".csrc-root .sigma-footer__brand {",
      "  text-align: center;",
      "  margin-bottom: 0.35rem;",
      "  display: flex;",
      "  flex-direction: column;",
      "  align-items: center;",
      "  gap: 0.1rem;",
      "}",
      ".csrc-root .sigma-footer__logo { font-size: 0.95rem; font-weight: 600; color: var(--pli-white); }",
      ".csrc-root .sigma-footer__tagline { color: var(--sigma-gray-400); font-size: 0.75rem; margin: 0; line-height: 1.3; }",
      ".csrc-root .sigma-footer__copyright {",
      "  text-align: center;",
      "  color: var(--sigma-gray-500);",
      "  font-size: 0.7rem;",
      "  padding-top: 0.35rem;",
      "  margin: 0;",
      "  line-height: 1.3;",
      "}",
      ".csrc-root section#govsp-rodape {",
      "  display: flex;",
      "  flex-direction: column;",
      "  justify-content: center;",
      "  align-items: center;",
      "  background: #ffffff !important;",
      "  min-height: 200px;",
      "  width: 100%;",
      "  max-width: 100vw;",
      "  font-family: 'Open Sans', Arial, sans-serif;",
      "}",
      ".csrc-root section#govsp-rodape .container {",
      "  width: 100% !important;",
      "  max-width: 100%;",
      "  display: flex;",
      "  justify-content: center;",
      "  flex-direction: column;",
      "  flex-wrap: wrap;",
      "}",
      ".csrc-root section#govsp-rodape .container.rodape {",
      "  height: 120px;",
      "  width: 100%;",
      "  background: #000000 !important;",
      "  margin-top: 60px;",
      "}",
      ".csrc-root section#govsp-rodape .linha-botoes {",
      "  display: flex;",
      "  width: 100%;",
      "  flex-wrap: wrap;",
      "  justify-content: center;",
      "  padding: 40px 0;",
      "  margin-top: 20px;",
      "}",
      ".csrc-root section#govsp-rodape .coluna-4 {",
      "  width: 33.33333333%;",
      "  text-align: center;",
      "  display: flex;",
      "  align-items: center;",
      "  justify-content: center;",
      "}",
      ".csrc-root section#govsp-rodape .btn-model {",
      "  width: 202px;",
      "  min-height: 35px;",
      "  display: flex;",
      "  align-items: center;",
      "  justify-content: center;",
      "  color: #ffffff !important;",
      "  padding: 4px 35px;",
      "  border-radius: 20px;",
      "  border: 0;",
      "  background: #243e63;",
      "  text-decoration: none;",
      "  font-size: 16px;",
      "}",
      ".csrc-root section#govsp-rodape .btn-model:hover { background: #000000; }",
      ".csrc-root section#govsp-rodape .logo-rodape {",
      "  max-width: 100%;",
      "  margin: 0 auto;",
      "  display: flex;",
      "  justify-content: center;",
      "  align-items: center;",
      "  height: 120px;",
      "}",
      ".ahp-app .ahp-main { padding-top: var(--ahp-shell-header-offset, calc(var(--govsp-topbar-height, 50px) + var(--csch2-navbar-height, 64px) + 20px)); }",
      "@media (max-width: 992px) {",
      "  .csch2-navbar__toggle { display: inline-flex; }",
      "  .csch2-navbar__menu {",
      "    position: absolute;",
      "    top: calc(100% + 1px);",
      "    left: 0;",
      "    right: 0;",
      "    display: none;",
      "    flex-direction: column;",
      "    align-items: stretch;",
      "    padding: 1rem;",
      "    background: #f2f2f2;",
      "    border-bottom: 1px solid #e0e0e0;",
      "    box-shadow: 0 16px 32px rgba(0, 0, 0, 0.12);",
      "  }",
      "  .csch2-navbar__menu.csch2-navbar__menu--open { display: flex; }",
      "  .csch2-navbar__nav { flex-direction: column; align-items: stretch; }",
      "  .csch2-navbar__link, .csch2-navbar__dropdown-toggle { width: 100%; justify-content: flex-start; }",
      "  .csch2-navbar__dropdown { position: static; opacity: 1; visibility: visible; transform: none; display: none; margin-top: 0.35rem; }",
      "  .csch2-navbar__item--open .csch2-navbar__dropdown { display: block; }",
      "  .csch2-navbar__actions { width: 100%; }",
      "  .csch2-navbar__btn { width: 100%; justify-content: center; }",
      "  .csrc-root section#govsp-rodape .linha-botoes { flex-direction: column; padding: 0; margin-top: 12px; }",
      "  .csrc-root section#govsp-rodape .coluna-4 { min-width: 100%; width: 100%; padding-top: 15px; }",
      "  .csrc-root section#govsp-rodape .btn-model { width: 95%; }",
      "}",
      "@media (max-width: 768px) {",
      "  .csch2-navbar__inner { padding: 0 1rem; gap: 1rem; }",
      "  .csch2-navbar__brand-subtitle { max-width: 180px; }",
      "}",
      "@media (max-width: 576px) {",
      "  .csch2-navbar__brand-subtitle { display: none; }",
      "}"
    ].join("\n");

    document.head.appendChild(style);
  }

  function buildHeaderMarkup() {
    return [
      '<section class="govsp-topo">',
      '  <div id="govsp-topbarGlobal" class="blu-e">',
      '    <div id="topbarGlobal">',
      '      <div id="topbarLink" class="govsp-black">',
      '        <div class="govsp-portal">',
      '          <a href="https://www.saopaulo.sp.gov.br" title="Site Governo do Estado de Sao Paulo" target="_blank" rel="noopener noreferrer">',
      '            <img src="assets/govsp/img/logo-governo-do-estado-sp.svg" alt="Logomarca Governo do Estado de Sao Paulo" class="logo">',
      '          </a>',
      '        </div>',
      '      </div>',
      '      <nav class="govsp-navbar govsp-navbar-expand-lg">',
      '        <a class="govsp-social" href="http://bit.ly/govspnozap" rel="noopener noreferrer" target="_blank" aria-label="Whatsapp Governo do Estado de SP" title="Whatsapp Governo do Estado de SP"><i class="fab fa-whatsapp govsp-icon-social"></i></a>',
      '        <a class="govsp-social" href="https://www.flickr.com/governosp/" rel="noopener noreferrer" target="_blank" aria-label="Flickr Governo do Estado de SP" title="Flickr Governo do Estado de SP"><i class="fab fa-flickr govsp-icon-social"></i></a>',
      '        <a class="govsp-social" href="https://www.linkedin.com/company/governosp/" rel="noopener noreferrer" target="_blank" aria-label="LinkedIn Governo do Estado de SP" title="LinkedIn Governo do Estado de SP"><i class="fab fa-linkedin-in govsp-icon-social"></i></a>',
      '        <a class="govsp-social" href="https://www.tiktok.com/@governosp" rel="noopener noreferrer" target="_blank" aria-label="TikTok Governo do Estado de SP" title="TikTok Governo do Estado de SP"><i class="fab fa-tiktok govsp-icon-social"></i></a>',
      '        <a class="govsp-social" href="https://www.youtube.com/governosp/" rel="noopener noreferrer" target="_blank" aria-label="Youtube Governo do Estado de SP" title="Youtube Governo do Estado de SP"><i class="fab fa-youtube govsp-icon-social"></i></a>',
      '        <a class="govsp-social" href="https://www.twitter.com/governosp/" rel="noopener noreferrer" target="_blank" aria-label="Twitter Governo do Estado de SP" title="Twitter Governo do Estado de SP"><i class="fab fa-x-twitter govsp-icon-social"></i></a>',
      '        <a class="govsp-social" href="https://www.instagram.com/governosp/" rel="noopener noreferrer" target="_blank" aria-label="Instagram Governo do Estado de SP" title="Instagram Governo do Estado de SP"><i class="fab fa-instagram govsp-icon-social"></i></a>',
      '        <a class="govsp-social" href="https://www.facebook.com/governosp/" rel="noopener noreferrer" target="_blank" aria-label="Facebook Governo do Estado de SP" title="Facebook Governo do Estado de SP"><i class="fab fa-facebook-f govsp-icon-social"></i></a>',
      '        <p class="govsp-social">/governosp</p>',
      '      </nav>',
      '    </div>',
      '    <button class="govsp-kebab" id="govsp-kebab" aria-expanded="false" aria-label="Menu de redes sociais"><i class="fas fa-ellipsis-v"></i></button>',
      '    <ul class="govsp-dropdown vs3" id="govsp-dropdown" aria-hidden="true">',
      '      <li><a class="govsp-social" role="button" href="http://bit.ly/govspnozap" rel="noopener noreferrer" target="_blank" aria-label="Whatsapp Governo do Estado de SP" title="Whatsapp Governo do Estado de SP"><i class="fab fa-whatsapp govsp-icon-social"></i></a></li>',
      '      <li><a class="govsp-social" role="button" href="https://www.flickr.com/governosp/" rel="noopener noreferrer" target="_blank" aria-label="Flickr Governo do Estado de SP" title="Flickr Governo do Estado de SP"><i class="fab fa-flickr govsp-icon-social"></i></a></li>',
      '      <li><a class="govsp-social" role="button" href="https://www.linkedin.com/company/governosp/" rel="noopener noreferrer" target="_blank" aria-label="LinkedIn Governo do Estado de SP" title="LinkedIn Governo do Estado de SP"><i class="fab fa-linkedin-in govsp-icon-social"></i></a></li>',
      '      <li><a class="govsp-social" role="button" href="https://www.tiktok.com/@governosp" rel="noopener noreferrer" target="_blank" aria-label="TikTok Governo do Estado de SP" title="TikTok Governo do Estado de SP"><i class="fab fa-tiktok govsp-icon-social"></i></a></li>',
      '      <li><a class="govsp-social" role="button" href="https://www.twitter.com/governosp/" rel="noopener noreferrer" target="_blank" aria-label="Twitter Governo do Estado de SP" title="Twitter Governo do Estado de SP"><i class="fab fa-x-twitter govsp-icon-social"></i></a></li>',
      '      <li><a class="govsp-social" role="button" href="https://www.youtube.com/governosp/" rel="noopener noreferrer" target="_blank" aria-label="Youtube Governo do Estado de SP" title="Youtube Governo do Estado de SP"><i class="fab fa-youtube govsp-icon-social"></i></a></li>',
      '      <li><a class="govsp-social" role="button" href="https://www.instagram.com/governosp/" rel="noopener noreferrer" target="_blank" aria-label="Instagram Governo do Estado de SP" title="Instagram Governo do Estado de SP"><i class="fab fa-instagram govsp-icon-social"></i></a></li>',
      '      <li><a class="govsp-social" role="button" href="https://www.facebook.com/governosp/" rel="noopener noreferrer" target="_blank" aria-label="Facebook Governo do Estado de SP" title="Facebook Governo do Estado de SP"><i class="fab fa-facebook-f govsp-icon-social"></i></a></li>',
      '      <li><p class="govsp-social">/governosp</p></li>',
      '    </ul>',
      '  </div>',
      '</section>',
      '<div class="csch2-navbar-band" data-csch2-root>',
      '  <div class="csch2-navbar__inner">',
      '    <a href="sigma-ahp.html" class="csch2-navbar__brand" aria-label="SIGMA-PLI - Inicio">',
      '      <span class="csch2-navbar__badge">SP</span>',
      '      <span class="csch2-navbar__brand-copy">',
      '        <span class="csch2-navbar__brand-title">SIGMA-PLI</span>',
      '        <span class="csch2-navbar__brand-subtitle">Ferramenta de Analise Hierarquica de Processo</span>',
      '      </span>',
      '    </a>',
      '    <button class="csch2-navbar__toggle" type="button" aria-label="Abrir menu" data-csch2-toggle>',
      '      <i class="fas fa-bars" aria-hidden="true"></i>',
      '    </button>',
      '    <div class="csch2-navbar__menu" data-csch2-menu>',
      '      <ul class="csch2-navbar__nav">',
      '        <li class="csch2-navbar__item">',
      '          <a href="sigma-ahp.html" class="csch2-navbar__link' + getActiveClass("home") + '">',
      '            <i class="fas fa-home" aria-hidden="true"></i>',
      '            <span>Home</span>',
      '          </a>',
      '        </li>',
      '        <li class="csch2-navbar__item">',
      '          <a href="step1-criterios.html" class="csch2-navbar__link' + getActiveClass("calculator") + '">',
      '            <i class="fas fa-calculator" aria-hidden="true"></i>',
      '            <span>Calculadora AHP</span>',
      '          </a>',
      '        </li>',
      '        <li class="csch2-navbar__item" data-csch2-dropdown>',
      '          <button type="button" class="csch2-navbar__dropdown-toggle" data-csch2-dropdown-toggle aria-expanded="false">',
      '            <i class="fas fa-folder-open" aria-hidden="true"></i>',
      '            <span>Materiais</span>',
      '            <i class="fas fa-chevron-down csch2-navbar__caret" aria-hidden="true"></i>',
      '          </button>',
      '          <ul class="csch2-navbar__dropdown">',
      '            <li><a href="exemplo_matriz_ahp.csv" class="csch2-navbar__dropdown-link"><i class="fas fa-file-csv" aria-hidden="true"></i><span>Modelo CSV</span></a></li>',
      '            <li><a href="exemplo_matriz_ahp.json" class="csch2-navbar__dropdown-link"><i class="fas fa-file-code" aria-hidden="true"></i><span>Modelo JSON</span></a></li>',
      '            <li><a href="UPLOAD_MATRIX_GUIDE.md" class="csch2-navbar__dropdown-link"><i class="fas fa-book-open" aria-hidden="true"></i><span>Guia de Upload</span></a></li>',
      '            <li><a href="README.md" class="csch2-navbar__dropdown-link"><i class="fas fa-circle-info" aria-hidden="true"></i><span>README</span></a></li>',
      '          </ul>',
      '        </li>',
      '      </ul>',
      '      <div class="csch2-navbar__actions">',
      '        <a href="step1-criterios.html" class="csch2-navbar__btn">',
      '          <i class="fas fa-play" aria-hidden="true"></i>',
      '          <span>Nova analise</span>',
      '        </a>',
      '      </div>',
      '    </div>',
      '  </div>',
      '</div>'
    ].join("\n");
  }

  function buildFooterMarkup() {
    return [
      '<div id="rodape-geral">',
      '  <div class="csrc-root">',
      '    <footer class="sigma-footer">',
      '      <div class="sigma-footer__container">',
      '        <div class="sigma-footer__brand">',
      '          <span class="sigma-footer__logo">SIGMA-PLI</span>',
      '          <span class="sigma-footer__tagline">Sistema Integrado de Gestao, Monitoramento e Apoio tecnico ao PLI/SP</span>',
      '        </div>',
      '        <p class="sigma-footer__copyright">',
      '          &copy; <span data-csrc-year>2026</span> <strong>Desenvolvido por VPC-GEOSER-Geoprocessamento Inteligente</strong> • Desenvolvido para o PLI/SP 2050',
      '        </p>',
      '      </div>',
      '    </footer>',
      '    <section id="govsp-rodape">',
      '      <div class="container">',
      '        <div class="linha-botoes">',
      '          <div class="coluna-4"><a href="https://www.ouvidoria.sp.gov.br/Portal/Default.aspx" class="btn btn-model">Ouvidoria</a></div>',
      '          <div class="coluna-4"><a href="http://www.transparencia.sp.gov.br/" class="btn btn-model">Transparencia</a></div>',
      '          <div class="coluna-4"><a href="http://www.sic.sp.gov.br/" class="btn btn-model">SIC</a></div>',
      '        </div>',
      '      </div>',
      '      <div class="container rodape">',
      '        <div class="logo-rodape">',
      '          <a href="https://www.saopaulo.sp.gov.br/" target="_blank" rel="noopener noreferrer">',
      '            <img src="assets/govsp/img/logo-rodape-governo-do-estado-sp.svg" alt="Site do Governo de Sao Paulo" width="206" height="38">',
      '          </a>',
      '        </div>',
      '      </div>',
      '    </section>',
      '  </div>',
      '</div>'
    ].join("\n");
  }

  function injectHeader() {
    var oldGov = document.querySelector(".govsp-topo");
    var oldHeader = document.querySelector(".sigma-header--public");
    var anchor = oldGov || oldHeader || document.body.firstElementChild;

    if (anchor) {
      anchor.insertAdjacentHTML("beforebegin", buildHeaderMarkup());
    } else {
      document.body.insertAdjacentHTML("afterbegin", buildHeaderMarkup());
    }

    if (oldGov) {
      oldGov.remove();
    }

    if (oldHeader) {
      oldHeader.remove();
    }
  }

  function injectFooter() {
    var oldFooter = document.getElementById("rodape-geral");

    if (oldFooter) {
      oldFooter.insertAdjacentHTML("beforebegin", buildFooterMarkup());
      oldFooter.remove();
      return;
    }

    document.body.insertAdjacentHTML("beforeend", buildFooterMarkup());
  }

  function initHeaderInteractions() {
    var root = document.querySelector("[data-csch2-root]");

    if (!root) {
      return;
    }

    var toggle = root.querySelector("[data-csch2-toggle]");
    var menu = root.querySelector("[data-csch2-menu]");

    if (toggle && menu) {
      toggle.addEventListener("click", function () {
        var isOpen = menu.classList.toggle("csch2-navbar__menu--open");
        toggle.setAttribute("aria-expanded", String(isOpen));
      });
    }

    root.querySelectorAll("[data-csch2-dropdown-toggle]").forEach(function (button) {
      button.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();

        var item = button.closest("[data-csch2-dropdown]");
        var isOpen = item.classList.contains("csch2-navbar__item--open");

        root.querySelectorAll("[data-csch2-dropdown].csch2-navbar__item--open").forEach(function (element) {
          element.classList.remove("csch2-navbar__item--open");
          var dropdownButton = element.querySelector("[data-csch2-dropdown-toggle]");
          if (dropdownButton) {
            dropdownButton.setAttribute("aria-expanded", "false");
          }
        });

        if (!isOpen) {
          item.classList.add("csch2-navbar__item--open");
          button.setAttribute("aria-expanded", "true");
        }
      });
    });

    document.addEventListener("click", function (event) {
      if (!root.contains(event.target)) {
        if (menu) {
          menu.classList.remove("csch2-navbar__menu--open");
        }

        root.querySelectorAll("[data-csch2-dropdown].csch2-navbar__item--open").forEach(function (element) {
          element.classList.remove("csch2-navbar__item--open");
          var dropdownButton = element.querySelector("[data-csch2-dropdown-toggle]");
          if (dropdownButton) {
            dropdownButton.setAttribute("aria-expanded", "false");
          }
        });
      }
    });
  }

  function initGovSpKebab() {
    var topoGlobal = document.querySelector("#topbarGlobal");
    var kebab = document.querySelector(".govsp-kebab");
    var dropdown = document.querySelector(".govsp-dropdown");

    if (!kebab || !dropdown) {
      return;
    }

    kebab.addEventListener("click", function () {
      dropdown.classList.toggle("govsp-active");
      kebab.classList.toggle("govsp-active");

      if (topoGlobal) {
        topoGlobal.classList.toggle("govsp-active");
      }

      if (dropdown.getAttribute("aria-hidden") === "true") {
        dropdown.setAttribute("aria-hidden", "false");
        kebab.setAttribute("aria-expanded", "true");
      } else {
        dropdown.setAttribute("aria-hidden", "true");
        kebab.setAttribute("aria-expanded", "false");
      }
    });
  }

  function syncShellOffsets() {
    var topBar = document.getElementById("govsp-topbarGlobal");
    var navbar = document.querySelector(".csch2-navbar-band");
    var topHeight = topBar ? Math.ceil(topBar.getBoundingClientRect().height) : 50;
    var navHeight = navbar ? Math.ceil(navbar.getBoundingClientRect().height) : 64;
    var totalOffset = topHeight + navHeight + 20;

    if (topHeight >= 24) {
      document.documentElement.style.setProperty("--govsp-topbar-height", topHeight + "px");
    }

    document.documentElement.style.setProperty("--csch2-navbar-height", navHeight + "px");
    document.documentElement.style.setProperty("--navbar-total-offset", totalOffset + "px");
    document.documentElement.style.setProperty("--ahp-shell-header-offset", totalOffset + "px");
  }

  function syncFooterYear() {
    var currentYear = String(new Date().getFullYear());

    document.querySelectorAll("[data-csrc-year], [data-current-year]").forEach(function (element) {
      element.textContent = currentYear;
    });
  }

  function initTemplateShell() {
    if (!document.body || document.body.dataset.ahpTemplateShellInjected === "true") {
      return;
    }

    document.body.dataset.ahpTemplateShellInjected = "true";

    ensureStyles();
    injectHeader();
    injectFooter();
    initHeaderInteractions();
    initGovSpKebab();
    syncFooterYear();
    syncShellOffsets();

    window.addEventListener("resize", syncShellOffsets);

    if ("ResizeObserver" in window) {
      var observer = new ResizeObserver(syncShellOffsets);
      var observedTop = document.getElementById("govsp-topbarGlobal");
      var observedNav = document.querySelector(".csch2-navbar-band");

      if (observedTop) {
        observer.observe(observedTop);
      }

      if (observedNav) {
        observer.observe(observedNav);
      }
    }
  }

  document.addEventListener("DOMContentLoaded", initTemplateShell);
})();
