(function () {
  "use strict";
  const trigger = document.getElementById("gp-file-menu-button");
  const menu = document.getElementById("gp-file-menu");
  if (!trigger || !menu) return;
  const items = Array.from(menu.querySelectorAll("[data-project-action]"));
  let busy = false;

  function close(restoreFocus = false) {
    menu.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
    if (restoreFocus) trigger.focus();
  }

  function open(last = false) {
    menu.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
    const viewMenu = document.getElementById("gp-view-menu");
    if (viewMenu) viewMenu.hidden = true;
    document.getElementById("gp-view-menu-button")?.setAttribute("aria-expanded", "false");
    (last ? items.at(-1) : items[0])?.focus();
  }

  async function run(action) {
    if (busy) return;
    close(true);
    const method = { new: "new", open: "open", save: "save", "save-as": "saveAs" }[action];
    const handler = window.gpProject?.[method];
    if (!handler) return;
    busy = true;
    try {
      await handler.call(window.gpProject);
    } catch (error) {
      if (error?.name !== "AbortError") {
        const message = error?.message || "Não foi possível concluir a operação do projeto.";
        if (window.gpFeedback?.Notify?.error) window.gpFeedback.Notify.error("Projeto", message);
        else window.alert(message);
      }
    } finally {
      busy = false;
    }
  }

  trigger.addEventListener("click", () => menu.hidden ? open() : close());
  trigger.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      open(event.key === "ArrowUp");
    }
  });
  menu.addEventListener("click", (event) => {
    const item = event.target.closest("[data-project-action]");
    if (item) void run(item.dataset.projectAction);
  });
  menu.addEventListener("keydown", (event) => {
    const index = items.indexOf(document.activeElement);
    let next;
    if (event.key === "ArrowDown") next = (index + 1) % items.length;
    if (event.key === "ArrowUp") next = (index + items.length - 1) % items.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = items.length - 1;
    if (next !== undefined) { event.preventDefault(); items[next].focus(); }
    if (event.key === "Escape") { event.preventDefault(); close(true); }
    if (event.key === "Tab") close();
  });
  document.addEventListener("click", (event) => {
    if (!event.target.closest(".gp-file-menu")) close();
  });
  document.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === "s") {
      if (document.querySelector("dialog[open]")) return;
      event.preventDefault();
      void run(event.shiftKey ? "save-as" : "save");
    }
  });
  window.lucide?.createIcons();
})();
