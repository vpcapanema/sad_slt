(function () {
  "use strict";
  const $ = (selector, root = document) => root.querySelector(selector);

  function message(text) {
    const status = $("#gp-save-state");
    status.textContent = text;
    clearTimeout(message.timer);
    message.timer = setTimeout(() => status.textContent = "Ambiente local", 3500);
  }

  function openToolbox() {
    const app = $(".gp-app");
    const tab = $('[data-right-tab="tools"]');
    app.classList.remove("right-collapsed");
    tab.hidden = false;
    tab.click();
    window.gpApp.renderToolbox($("#gp-tool-search").value);
    $("#gp-tool-search").focus();
  }

  document.addEventListener("DOMContentLoaded", () => {
    $("#gp-ribbon-tools").addEventListener("click", (event) => {
      const action = event.target.closest("[data-action]")?.dataset.action;
      if (action === "tools") openToolbox();
      if (action === "run" && !$("#gp-op-form")) {
        openToolbox();
        message("Selecione um algoritmo para executar.");
      }
      if (action === "attributes" && !$("[data-layer].active")) {
        message("Selecione uma camada no painel Conteúdo.");
      }
      if (action === "remove" && !$("[data-layer].active")) {
        message("Selecione uma camada antes de remover.");
      }
      if (action === "export") {
        setTimeout(() => {
          const active = $("[data-layer].active")?.dataset.layer;
          const field = $('[name="camada_id"]');
          if (active && field) field.value = active;
        }, 0);
      }
    });
  });
})();
