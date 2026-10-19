(function (global) {
  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function showToast(message, isError) {
    global.Notify[isError ? "error" : "success"]("Gestão de demandas", message);
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
    return global.ProcessFeedback.confirmar(opts);
  }

  global.SLTAdminUi = { showToast, openModal, closeModal, showConfirm };
})(window);
