(function () {
  "use strict";
  const config = document.currentScript.dataset;
  const profile = config.accessProfile;
  function restricted(el) {
    const module = el.closest?.("[data-access-module]")?.dataset.accessModule || config.accessModule;
    return (profile === "GESTOR" && module === "mocad") ||
      (profile === "ANALISTA" && module === "mad") ||
      (profile === "OPERADOR" && module === "mad");
  }
  const reason = "Somente visualização: seu perfil não permite alterar este módulo.";
  const selector = "button,input,select,textarea,[contenteditable],[data-action],a.btn,a.admin-icon-btn";
  const readAction = /(?:visualiz|consult|detalh|abrir|fechar|close|cancel|voltar|download|baixar|export|imprimir|print|filtro|filter|paginar|pagina|page|previous|next|anterior|seguinte|limpar sele|clear|selecionar|select-all|toggle|camada|layer|zoom|expand|recolher|mapa|ordenar|sort)/i;
  const writeAction = /(?:salvar|save|exclu|delet|remov|criar|create|cadastr|aprovar|reprovar|homolog|publicar|executar|calcular|solicitar|enviar|upload|substituir|editar|edit|adicionar|add|alterar|reverter|sincroniz|concluir|consolidar|gerar|importar)/i;

  function isReadControl(el) {
    if (el.matches("#pfsReopen,#pfsSuccessOk")) return true;
    if (el.closest(".app-header,.app-nav,footer,.admin-session-bar,.leaflet-control,.layer-group-header-row,.layer-visibility-toggle,.painel-layer-filter,[data-read-control],.admin-filter,.admin-filter-bar,.admin-pagination,.admin-table-footer,.table-pagination,.pagination")) return true;
    if (el.matches('input[type="checkbox"]') && el.closest("table")) return true;
    const label = [el.id, el.title, el.getAttribute("aria-label"), el.dataset.action, el.textContent].join(" ");
    return !el.hasAttribute("data-write-control") && !writeAction.test(label) && readAction.test(label);
  }

  function lock(el) {
    if (!restricted(el) || isReadControl(el)) return;
    el.dataset.accessLocked = "true";
    if (el.hasAttribute("contenteditable")) el.setAttribute("contenteditable", "false");
    if ("disabled" in el && !el.disabled) el.disabled = true;
    if (el.getAttribute("aria-disabled") !== "true") el.setAttribute("aria-disabled", "true");
    const description = el.closest("[data-access-module]")?.querySelector("[data-access-notice]")?.id || "access-mode-notice";
    if (el.getAttribute("aria-describedby") !== description) el.setAttribute("aria-describedby", description);
    if (el.title !== reason) el.title = reason;
  }

  function scan(root) {
    if (root.matches?.(selector)) lock(root);
    root.querySelectorAll?.(selector).forEach(lock);
  }

  function start() {
    document.querySelectorAll("[data-access-module]:not(script)").forEach((section) => {
      if (!restricted(section)) return;
      const message = document.createElement("p");
      message.className = "pfs-current";
      message.id = `${section.id || section.dataset.accessModule}-access-notice`;
      message.dataset.accessNotice = "true";
      message.setAttribute("role", "status");
      message.textContent = reason;
      section.prepend(message);
    });
    scan(document);
    new MutationObserver((changes) => changes.forEach((change) => {
      if (change.type === "childList") change.addedNodes.forEach(scan);
      else if (change.target.matches(selector)) lock(change.target);
    })).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["disabled"] });
    document.addEventListener("click", (event) => {
      if (!event.target.closest("[data-access-locked]")) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    }, true);
    document.addEventListener("submit", (event) => {
      if (!restricted(event.target) || event.target.closest("[data-read-control],.admin-filter,.admin-filter-bar,[role='search']")) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    }, true);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
