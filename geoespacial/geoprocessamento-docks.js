(function () {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  function activateLeft(id) {
    $(".gp-app").classList.remove("left-collapsed");
    $$('[data-left-pane]').forEach((tab) => {
      const active = tab.dataset.leftPane === id;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", String(active));
      tab.tabIndex = active ? 0 : -1;
    });
    $$('[data-left-panel]').forEach((panel) => {
      const active = panel.dataset.leftPanel === id;
      panel.classList.toggle("active", active);
      panel.hidden = !active;
    });
    requestAnimationFrame(() => window.gpApp?.state.map?.resize());
  }

  function restoreRightTab(id) {
    const tab = $(`[data-right-tab="${id}"]`);
    if (!tab) return;
    tab.hidden = false;
    $(".gp-app").classList.remove("right-collapsed");
    syncToggle("right", id, true);
    requestAnimationFrame(() => window.gpApp?.state.map?.resize());
  }

  function syncToggle(side, id, visible) {
    const checkbox = $(`[data-panel-toggle="${side}:${id}"]`);
    if (checkbox) checkbox.checked = visible;
  }

  function setLeftVisibility(id, visible) {
    const tab = $(`[data-left-pane="${id}"]`);
    if (!tab) return;
    tab.hidden = !visible;
    syncToggle("left", id, visible);
    if (visible) {
      $(".gp-app").classList.remove("left-collapsed");
      activateLeft(id);
    } else if (tab.classList.contains("active")) {
      const next = $('[data-left-pane]:not([hidden])');
      if (next) activateLeft(next.dataset.leftPane);
      else $(".gp-app").classList.add("left-collapsed");
    }
  }

  function setRightVisibility(id, visible) {
    const tab = $(`[data-right-tab="${id}"]`);
    if (!tab) return;
    tab.hidden = !visible;
    syncToggle("right", id, visible);
    if (visible) {
      restoreRightTab(id);
      tab.click();
    } else if (tab.classList.contains("active")) {
      const next = $('.gp-right-tabs button:not([hidden])');
      if (next) next.click();
      else $(".gp-app").classList.add("right-collapsed");
    }
  }

  function bindLeftDock() {
    const tabs = $(".gp-left-dock-tabs");
    tabs.addEventListener("click", (event) => {
      const close = event.target.closest("[data-left-close]");
      if (close) {
        event.stopPropagation();
        const tab = close.closest("button");
        const wasActive = tab.classList.contains("active");
        tab.hidden = true;
        syncToggle("left", tab.dataset.leftPane, false);
        if (wasActive) {
          const next = $('[data-left-pane]:not([hidden])');
          if (next) activateLeft(next.dataset.leftPane);
          else $(".gp-app").classList.add("left-collapsed");
        }
        return;
      }

      const tab = event.target.closest("[data-left-pane]");
      if (tab) {
        activateLeft(tab.dataset.leftPane);
        return;
      }

      if (event.target.closest("[data-open-left]")) {
        const hidden = $('[data-left-pane][hidden]');
        if (hidden) {
          hidden.hidden = false;
          syncToggle("left", hidden.dataset.leftPane, true);
          activateLeft(hidden.dataset.leftPane);
        }
      }
    });

    $('[data-restore="left"]').addEventListener("click", () => {
      const content = $('[data-left-pane="contents"]');
      content.hidden = false;
      syncToggle("left", "contents", true);
      activateLeft("contents");
    });
  }

  function bindRightDock() {
    $(".gp-right-tabs").addEventListener("wheel", (event) => {
      const tabs = event.currentTarget;
      if (tabs.scrollWidth <= tabs.clientWidth) return;
      tabs.scrollLeft += event.deltaX || event.deltaY;
      event.preventDefault();
    }, { passive: false });

    $(".gp-right-tabs").addEventListener("click", (event) => {
      const close = event.target.closest("[data-tab-close]");
      if (!close) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const tab = close.closest("button");
      const wasActive = tab.classList.contains("active");
      const dynamic = tab.hasAttribute("data-dynamic-tab");
      if (dynamic) tab.remove();
      else tab.hidden = true;
      syncToggle("right", tab.dataset.rightTab, false);
      if (wasActive) {
        const next = $('.gp-right-tabs button:not([hidden])');
        if (next) next.click();
        else $(".gp-app").classList.add("right-collapsed");
      }
    }, true);

    $(".gp-right-tabs").addEventListener("click", (event) => {
      const tab = event.target.closest("[data-dynamic-tab]");
      if (tab) window.gpApp.showAttributes(tab.dataset.layerId);
    });

    $("#gp-ribbon-tools").addEventListener("click", (event) => {
      const action = event.target.closest("[data-action]")?.dataset.action;
      const target = {
        tools: "tools",
        "new-function": "functions",
        "new-flow": "flows",
        history: "history",
      }[action];
      if (target) {
        restoreRightTab(target);
        $(`[data-right-tab="${target}"]`).click();
      }
    }, true);

    $('[data-restore="right"]').addEventListener("click", () => {
      const tab = $('.gp-right-tabs [data-right-tab].active:not([hidden])') || $('[data-right-tab="properties"]');
      restoreRightTab(tab.dataset.rightTab);
      tab.click();
    });
  }

  function collapse(side) {
    $(".gp-app").classList.add(`${side}-collapsed`);
    requestAnimationFrame(() => window.gpApp?.state.map?.resize());
  }

  function bindCollapseButtons() {
    document.addEventListener("click", (event) => {
      const button = event.target.closest("[data-collapse]");
      if (button) collapse(button.dataset.collapse);
    });
  }

  function bindViewMenu() {
    const button = $("#gp-view-menu-button");
    const menu = $("#gp-view-menu");
    const setOpen = (open) => {
      menu.hidden = !open;
      button.setAttribute("aria-expanded", String(open));
    };
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      setOpen(menu.hidden);
    });
    menu.addEventListener("click", (event) => event.stopPropagation());
    menu.addEventListener("change", (event) => {
      const control = event.target.closest("[data-panel-toggle]");
      if (!control) return;
      const [side, id] = control.dataset.panelToggle.split(":");
      if (side === "left") setLeftVisibility(id, control.checked);
      else setRightVisibility(id, control.checked);
    });
    document.addEventListener("click", () => setOpen(false));
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") setOpen(false);
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    activateLeft("contents");
    bindLeftDock();
    bindRightDock();
    bindCollapseButtons();
    bindViewMenu();
    // Painel direito inicia recolhido por padrão a cada carregamento da página.
    $(".gp-app").classList.add("right-collapsed");
    requestAnimationFrame(() => window.gpApp?.state.map?.resize());
  });
  window.gpDocks = { activateLeft, restoreRightTab, setLeftVisibility, setRightVisibility, collapse };
})();
