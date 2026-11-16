(function (global) {
  const SESSION_BAR_ID = "admin-session-bar";

  const TIPO_LABELS = {
    GESTOR: "Gestor",
    ANALISTA: "Analista",
    OPERADOR: "Operador",
    VISUALIZADOR: "Visualizador",
    ADMIN: "Administrador",
  };
  let currentUser = null;

  function can(permission, user = currentUser) {
    return Boolean(global.SICARDAccess?.can(permission, user || undefined));
  }

  function ensure(permission, action = 'executar esta ação') {
    if (can(permission)) return true;
    if (global.SICARDAccess) global.SICARDAccess.denied(action);
    else if (global.StatusFeedback) global.StatusFeedback.erro({title:'Ação não autorizada',
      message:`Seu perfil no SICARD não possui permissão para ${action}.`, status:403});
    else global.alert(`Ação não autorizada: ${action}. Seu perfil não possui a permissão necessária.`);
    return false;
  }

  function applyPermissions(root = document) {
    root.querySelectorAll("[data-permission]").forEach((element) => {
      const allowed = can(element.dataset.permission);
      if (["administer", "viewAdmin"].includes(element.dataset.permission)) {
        element.hidden = !allowed;
      } else { element.hidden = false; }
      global.SICARDAccess?.scan(element);
    });
  }

  function resolveLoginPath() {
    return "/public/login/";
  }

  function loginUrl(nextPath) {
    const next = nextPath || location.pathname + location.search;
    return `${resolveLoginPath()}?next=${encodeURIComponent(next)}`;
  }

  async function fetchMe() {
    const res = await fetch("/api/auth/me", { credentials: "include" });
    if (res.status === 401) return null;
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const message = body.detail || body.message || 'Não foi possível verificar seu acesso ao SICARD.';
      global.StatusFeedback?.erro({title:'Não foi possível verificar o acesso', message, status:res.status});
      throw new Error(message);
    }
    return res.json();
  }

  function formatTipo(tipo) {
    const key = String(tipo || "")
      .trim()
      .toUpperCase();
    return TIPO_LABELS[key] || tipo || "—";
  }

  function renderSessionBar(user) {
    const el = document.getElementById(SESSION_BAR_ID);
    if (!el || !user) return;

    currentUser = user;
    global.SICARDAccess?.setUser(user);
    document.documentElement.dataset.userProfile = String(
      user.tipo_usuario || "",
    ).toLowerCase();
    applyPermissions();
    const username =
      user.username || String(user.email || "").split("@")[0] || "—";
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
    const header = document.querySelector(
      ".layout-main-header.app-header, .app-header",
    );
    if (header && el.parentElement !== header) {
      header.appendChild(el);
    }
    header?.classList.add("app-header--restricted");
    el.classList.remove("hidden");
    document
      .getElementById("btn-logout")
      ?.addEventListener("click", () => logout());
  }

  async function requireAuth() {
    const user = await fetchMe();
    if (!user) {
      location.replace(loginUrl());
      return null;
    }
    currentUser = user;
    global.SICARDAccess?.setUser(user);
    const bar = document.getElementById(SESSION_BAR_ID);
    if (bar) {
      renderSessionBar(user);
    } else {
      document.addEventListener(
        "DOMContentLoaded",
        function () {
          renderSessionBar(user);
        },
        { once: true },
      );
    }
    return user;
  }

  async function logout() {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    }).catch(() => {});
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
    can,
    ensure,
    applyPermissions,
    get currentUser() {
      return currentUser;
    },
  };
  global.addEventListener('focus', async () => {
    if (!currentUser) return;
    const user = await fetchMe().catch(() => null);
    if (user) renderSessionBar(user);
  });
})(window);
