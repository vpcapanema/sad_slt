(function () {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  function setLayerVisibility(id, visible) {
    const map = window.gpApp.state.map;
    [`${id}-point`, `${id}-line`, id].forEach((layer) => {
      if (map.getLayer(layer)) map.setLayoutProperty(layer, "visibility", visible ? "visible" : "none");
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    $("#gp-layer-list").addEventListener("click", (event) => {
      const zoom = event.target.closest("[data-zoom-layer]");
      if (!zoom) return;
      event.stopPropagation();
      window.gpApp.zoomToCatalogLayer(zoom.dataset.zoomLayer);
    });

    $("#gp-catalog-tree").addEventListener("click", (event) => {
      const group = event.target.closest("[data-catalog-group]");
      if (!group) return;
      const collapsed = group.classList.toggle("collapsed");
      group.setAttribute("aria-expanded", String(!collapsed));
      $(".catalog-group-children").hidden = collapsed;
    });

    $(".gp-contents .gp-pane-tabs").addEventListener("click", (event) => {
      const tab = event.target.closest("[data-left-tab]");
      if (!tab) return;
      $$('[data-left-tab]').forEach((item) => item.classList.toggle("active", item === tab));
      $(".gp-section-title").textContent = tab.dataset.leftTab === "source" ? "Camadas por fonte" : "Ordem de desenho";
    });

    $("#gp-layer-list").addEventListener("change", (event) => {
      if (event.target.type !== "checkbox") return;
      const id = event.target.closest("[data-layer]")?.dataset.layer;
      if (id) setLayerVisibility(id, event.target.checked);
    });

    $("#gp-catalog-search").addEventListener("input", (event) => {
      const term = event.target.value.toLocaleLowerCase("pt-BR");
      $$("#gp-catalog-tree .tree-row").forEach((row) => {
        row.hidden = !row.textContent.toLocaleLowerCase("pt-BR").includes(term);
      });
    });

    $(".gp-project-catalog .gp-pane-tabs").addEventListener("click", (event) => {
      const tab = event.target.closest("button");
      if (!tab) return;
      $$(".gp-project-catalog .gp-pane-tabs button").forEach((item) => item.classList.toggle("active", item === tab));
      const title = tab.title;
      $$("#gp-catalog-tree .tree-row").forEach((row) => {
        row.hidden = title !== "Projeto" && !row.textContent.includes(title);
      });
    });
  });
})();
