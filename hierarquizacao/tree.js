(function () {
  "use strict";
  document.querySelectorAll(".tree-branch--phase").forEach(function (branch) {
    const summary = branch.querySelector(":scope > summary");
    const toggle = summary.querySelector(".tree-toggle");
    const label = summary.querySelector("strong")?.textContent || "fase";

    summary.addEventListener("click", function (event) {
      event.preventDefault();
      if (event.target.closest(".tree-toggle")) return;
      window.location.href = branch.dataset.href;
    });

    toggle.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      branch.open = !branch.open;
      toggle.setAttribute("aria-expanded", String(branch.open));
      toggle.setAttribute("aria-label", (branch.open ? "Recolher " : "Expandir ") + label);
    });
  });
})();
