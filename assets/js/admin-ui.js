(function (global) {
  let toastTimer = null;

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

  global.SLTAdminUi = { showToast, openModal, closeModal };
})(window);
