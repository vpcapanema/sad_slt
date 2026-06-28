// Validação visual compartilhada (mesmo padrão da página /cadastro/):
// destaca seletores e campos de texto que já têm valor selecionado/preenchido
// com a classe `field-filled` (estilizada em app.css). Auto-inicializa e cobre
// também elementos criados dinamicamente (listeners em captura no document).
(function () {
  "use strict";

  var SELECTOR =
    "select, textarea, input:not([type=radio]):not([type=checkbox]):not([type=file]):not([type=hidden]):not([type=button]):not([type=submit]):not([type=reset])";

  function sync(el) {
    if (!el || !el.matches || !el.matches(SELECTOR)) return;
    var value = String(el.value == null ? "" : el.value).trim();
    var filled = el.tagName === "SELECT" ? !el.disabled && value !== "" : value !== "";
    el.classList.toggle("field-filled", filled);
  }

  function syncAll(root) {
    (root || document).querySelectorAll(SELECTOR).forEach(sync);
  }

  function handler(e) {
    sync(e.target);
  }

  function init() {
    document.addEventListener("change", handler, true);
    document.addEventListener("input", handler, true);
    syncAll(document);
  }

  window.SLTFieldFilled = { sync: sync, syncAll: syncAll };

  if (document.readyState !== "loading") init();
  else document.addEventListener("DOMContentLoaded", init);
})();
