(function () {
  "use strict";
  const $ = (selector, root = document) => root.querySelector(selector);

  document.addEventListener("DOMContentLoaded", () => {
    $("#gp-toolbox").addEventListener("click", (event) => {
      const subgroupTitle = event.target.closest(".tool-subgroup-title");
      if (subgroupTitle) {
        const subgroup = subgroupTitle.closest(".tool-subgroup");
        const collapsed = subgroup.classList.toggle("collapsed");
        subgroupTitle.setAttribute("aria-expanded", String(!collapsed));
      }

      const groupTitle = event.target.closest(".tool-group-title");
      if (groupTitle) {
        const group = groupTitle.closest(".tool-group");
        const collapsed = group.classList.toggle("collapsed");
        groupTitle.setAttribute(
          "aria-expanded",
          String(!collapsed),
        );
      }

      const row = event.target.closest(".tool-row");
      if (row) {
        setTimeout(() => {
          if (row.dataset.op === "OP-01") window.gpApp.configureLoadOperation?.();
          window.gpCommands?.applyEnvironments($("#gp-op-form"));
          const heading = $("#gp-editor-view .editor-head h2");
          if (heading) heading.textContent = row.title;
        }, 0);
      }
    });

    $("#gp-editor-view").addEventListener("change", (event) => {
      if (!event.target.matches('select[name^="camada_id"]')) return;
      const output = event.target.form?.elements.saida;
      if (!output) return;
      const clean = (value) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
      const layer = event.target.selectedOptions[0]?.textContent || "camada";
      const operation = $("#gp-right-title").textContent || "resultado";
      const extension = output.value.toLowerCase().endsWith(".tif") ? "tif" : "gpkg";
      output.value = `${clean(layer)}_${clean(operation)}.${extension}`;
    });
  });
})();
