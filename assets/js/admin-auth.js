(function (global) {
  const SESSION_BAR_ID = "admin-session-bar";

  const TIPO_LABELS = {
    GESTOR: "Gestor",
    ANALISTA: "Analista",
    OPERADOR: "Operador",
    VISUALIZADOR: "Visualizador",
  };

  function resolveLoginPath() {
    const path = String(location.pathname || "").replace(/\\/g, "/");
    if (path.includes("/ahp/")) return "../admin/login.html";
    if (path.includes("/admin/")) return "login.html";
    return "/admin/login.html";
  }

  function loginUrl(nextPath) {
    const next = nextPath || location.pathname + location.search;
    return `${resolveLoginPath()}?next=${encodeURIComponent(next)}`;
  }

  async function fetchMe() {
    const res = await fetch("/api/auth/me", { credentials: "include" });
    if (!res.ok) return null;
    return res.json();
  }

  function formatTipo(tipo) {
    const key = String(tipo || "").trim().toUpperCase();
    return TIPO_LABELS[key] || tipo || "—";
  }

  function renderSessionBar(user) {
    const el = document.getElementById(SESSION_BAR_ID);
    if (!el || !user) return;

    const username = user.username || String(user.email || "").split("@")[0] || "—";
    const nomePessoa = String(user.nome || "").trim() || "—";
    el.innerHTML = `
      <div class="admin-session-bar-inner">
        <p class="admin-session-info">
          <span class="admin-session-name">${escapeHtml(nomePessoa)}</span>
          <span class="admin-session-sep" aria-hidden="true">·</span>
          <span class="admin-session-username">${escapeHtml(username)}</span>
          <span class="admin-session-sep" aria-hidden="true">·</span>
          <span class="admin-session-type">${escapeHtml(formatTipo(user.tipo_usuario))}</span>
        </p>
        <button type="button" class="btn btn-secondary btn-sm admin-session-logout" id="btn-logout">Sair</button>
      </div>`;
    el.classList.remove("hidden");
    document.getElementById("btn-logout")?.addEventListener("click", () => logout());
  }

  async function requireAuth() {
    const user = await fetchMe();
    if (!user) {
      location.replace(loginUrl());
      return null;
    }
    const bar = document.getElementById(SESSION_BAR_ID);
    if (bar) {
      renderSessionBar(user);
    } else {
      document.addEventListener("DOMContentLoaded", function () {
        renderSessionBar(user);
      }, { once: true });
    }
    return user;
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" }).catch(() => {});
    location.href = resolveLoginPath();
  }

  function escapeHtml(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  global.SLTAdminAuth = {
    requireAuth,
    fetchMe,
    logout,
    renderSessionBar,
    loginUrl,
  };
})(window);
