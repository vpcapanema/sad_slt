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

    // O nome de saída é controlado por bindOutputNameAuto/configureOutputFields
    // no formulário central, que preserva nomes definidos pelo usuário.
  });
})();
