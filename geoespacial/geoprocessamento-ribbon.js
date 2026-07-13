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

  function activeLayerId() {
    return $("[data-layer].active")?.dataset.layer || window.gpApp.state.activeLayerId || null;
  }

  function openOperation(id, values = {}) {
    openToolbox();
    window.gpApp.selectOp(id);
    setTimeout(() => {
      const form = $("#gp-op-form");
      Object.entries(values).forEach(([name, value]) => {
        if (form?.elements[name]) form.elements[name].value = value;
      });
      window.gpApp.configureLoadOperation?.();
      window.gpCommands?.applyEnvironments(form);
    }, 0);
  }

  function selectOnMap() {
    const map = window.gpApp.state.map;
    map.dragPan.disable();
    map.getCanvas().style.cursor = "crosshair";
    map.once("click", (event) => {
      const features = map.queryRenderedFeatures(event.point).filter((feature) => !feature.layer.id.startsWith("basemap-"));
      $("#gp-selection").textContent = `${features.length} selecionada${features.length === 1 ? "" : "s"}`;
      map.dragPan.enable();
      map.getCanvas().style.cursor = "grab";
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    $("#gp-ribbon-tools").addEventListener("click", (event) => {
      const action = event.target.closest("[data-action]")?.dataset.action;
      if (!action) return;
      if (action === "add") openOperation("OP-01", { tipo_entrada: "Local" });
      if (action === "tools") openToolbox();
      if (action === "run") {
        if ($("#gp-op-form")) $("#gp-op-form").requestSubmit();
        else { openToolbox(); message("Selecione um algoritmo para executar."); }
      }
      if (action === "wfs") {
        openOperation("OP-01", { tipo_entrada: "WFS" });
      }
      if (action === "basemap") {
        window.gpApp.showBasemapPanel();
      }
      if (action === "explore") {
        window.gpCommands.explore();
      }
      if (action === "select") window.gpCommands.selectOnMap();
      if (action === "clear") window.gpCommands.clearSelection();
      if (action === "fit") window.gpCommands.fitAllLayers().catch(error => message(error.message));
      if (action === "fit-selection") window.gpCommands.fitSelection();
      if (action === "attributes" && !$("[data-layer].active")) {
        message("Selecione uma camada no painel Conteúdo.");
      }
      if (action === "attributes" && activeLayerId()) window.gpApp.showAttributes(activeLayerId());
      if (action === "remove" && !$("[data-layer].active")) {
        message("Selecione uma camada antes de remover.");
      }
      if (action === "remove" && activeLayerId()) window.gpApp.removeCatalogLayer(activeLayerId()).catch(error => message(error.message));
      if (action === "properties" && activeLayerId()) {
        window.gpApp.showProperties(window.gpApp.state.layers.find(layer => layer.id === activeLayerId()));
      }
      if (action === "properties" && !activeLayerId()) message("Selecione uma camada no painel Conteúdo.");
      if (action === "validate" && activeLayerId()) openOperation("OP-02", { camada_id: activeLayerId() });
      if (action === "reproject" && activeLayerId()) openOperation("OP-03", { camada_id: activeLayerId() });
      if (action === "repair" && activeLayerId()) openOperation("OP-02-CORR", { camada_id: activeLayerId() });
      if (["validate", "reproject", "repair"].includes(action) && !activeLayerId()) message("Selecione uma camada no painel Conteúdo.");
      if (action === "save-result" || action === "save-layer") {
        if (activeLayerId()) openOperation("OP-27", { entrada: activeLayerId() });
        else message("Selecione uma camada ou raster.");
      }
      if (action === "add-result" && activeLayerId()) {
        const id=activeLayerId(),map=window.gpApp.state.map;[id,`${id}-line`,`${id}-point`].forEach(layer=>{if(map.getLayer(layer))map.setLayoutProperty(layer,"visibility","visible")});window.gpApp.zoomToCatalogLayer(id).catch(error => message(error.message));
      }
      if (action === "add-result" && !activeLayerId()) message("Selecione o resultado que deseja adicionar ao mapa.");
      if (["edit-function", "validate-function", "run-function"].includes(action)) window.gpApp.showLibrary("functions");
      if (["edit-flow", "validate-flow", "run-flow"].includes(action)) window.gpApp.showLibrary("flows");
      if (action === "new-function") window.gpApp.newFunction();
      if (action === "new-flow") window.gpApp.newFlow();
      if (action === "history") window.gpApp.showHistory();
      if (action === "environments") window.gpCommands.showEnvironments();
      if (action === "cancel" && !window.gpApp.cancelExecution()) message("Não há execução ativa para cancelar.");
      if (action === "duplicate") window.gpCommands.duplicateDefinition();
      if (action === "import-definition") window.gpCommands.importDefinition();
      if (action === "export-definition") window.gpCommands.exportDefinition();
      if (action === "calculate-field") window.gpCommands.calculateField();
      if (action === "select-attribute") window.gpCommands.selectByAttribute();
      if (action === "filter-layer") window.gpCommands.filterLayer();
      if (action === "refresh-source") window.gpCommands.refreshSource();
      if (action === "export") {
        const layer = window.gpApp.state.layers.find(item => item.id === activeLayerId());
        if (layer) openOperation(layer.tipo.toLowerCase().includes("raster") ? "OP-26" : "OP-25", {
          camada_id: layer.id, raster_id: layer.id,
        });
        else message("Selecione uma camada ou raster para exportar.");
      }
    });
  });
})();
