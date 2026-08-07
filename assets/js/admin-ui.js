(function (global) {
  let toastTimer = null;

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function showToast(message, isError) {
    let el = document.getElementById("admin-toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "admin-toast";
      el.className = "toast hidden";
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.classList.toggle("toast-error", !!isError);
    el.classList.remove("hidden");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.add("hidden"), 4000);
  }

  function closeModal() {
    const backdrop = document.getElementById("admin-modal-backdrop");
    if (backdrop) backdrop.remove();
    document.body.style.overflow = "";
  }

  function openModal(title, bodyHtml, footerHtml) {
    closeModal();
    const backdrop = document.createElement("div");
    backdrop.id = "admin-modal-backdrop";
    backdrop.className = "admin-modal-backdrop";
    backdrop.innerHTML = `
      <div class="admin-modal" role="dialog" aria-modal="true">
        <div class="admin-modal-header">
          <h3>${title}</h3>
          <button type="button" class="btn btn-secondary btn-sm" data-admin-close>Fechar</button>
        </div>
        <div class="admin-modal-body">${bodyHtml}</div>
        <div class="admin-modal-footer">${footerHtml || ""}</div>
      </div>`;
    document.body.appendChild(backdrop);
    document.body.style.overflow = "hidden";
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop || e.target.closest("[data-admin-close]")) closeModal();
    });
    return backdrop;
  }

  /**
   * Confirmação estilizada (substitui window.confirm). Resolve para true/false.
   * options: { title, message, confirmLabel, cancelLabel, danger, icon }
   */
  function showConfirm(options) {
    const opts = typeof options === "string" ? { message: options } : options || {};
    const {
      title = "Confirmar ação",
      message = "Deseja continuar?",
      confirmLabel = "Confirmar",
      cancelLabel = "Cancelar",
      danger = false,
      icon = danger ? "fa-triangle-exclamation" : "fa-circle-question",
    } = opts;

    return new Promise((resolve) => {
      const footer =
        `<button type="button" class="btn btn-secondary" data-confirm-cancel>${escapeHtml(cancelLabel)}</button>` +
        `<button type="button" class="btn ${danger ? "btn-danger" : "btn-primary"}" data-confirm-ok>${escapeHtml(confirmLabel)}</button>`;
      const body =
        `<div class="admin-confirm ${danger ? "admin-confirm--danger" : ""}">` +
        `<i class="fas ${escapeHtml(icon)} admin-confirm-icon" aria-hidden="true"></i>` +
        `<p class="admin-confirm-message">${escapeHtml(message)}</p>` +
        `</div>`;

      const backdrop = openModal(escapeHtml(title), body, footer);
      backdrop.querySelector(".admin-modal")?.classList.add("admin-modal--confirm");

      let settled = false;
      const finish = (value) => {
        if (settled) return;
        settled = true;
        document.removeEventListener("keydown", onKey);
        closeModal();
        resolve(value);
      };
      function onKey(e) {
        if (e.key === "Escape") finish(false);
        else if (e.key === "Enter") finish(true);
      }

      backdrop.addEventListener("click", (e) => {
        if (e.target.closest("[data-confirm-ok]")) finish(true);
        else if (
          e.target.closest("[data-confirm-cancel]") ||
          e.target.closest("[data-admin-close]") ||
          e.target === backdrop
        ) {
          finish(false);
        }
      });
      document.addEventListener("keydown", onKey);
      backdrop.querySelector("[data-confirm-ok]")?.focus();
    });
  }

  global.SLTAdminUi = { showToast, openModal, closeModal, showConfirm };
})(window);
