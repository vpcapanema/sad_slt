(function (global) {
  function errorMessage(body) {
    if (!body) return "Erro na requisição.";
    if (typeof body.detail === "string") return body.detail;
    if (Array.isArray(body.detail)) {
      return body.detail.map((item) => item.msg || String(item)).join("; ");
    }
    return body.message || "Erro na requisição.";
  }

  async function request(path, options) {
    const res = await fetch(path, { credentials: "include", ...options });
    const body = await res.json().catch(() => null);
    if (res.status === 401) {
      const err = new Error(errorMessage(body) || "Sessão expirada.");
      err.code = "UNAUTHORIZED";
      throw err;
    }
    if (!res.ok) throw new Error(errorMessage(body));
    return body;
  }

  async function listDemandas() {
    return request("/api/demandas");
  }

  async function getDemanda(codigo) {
    return request(`/api/demandas/${encodeURIComponent(codigo)}`);
  }

  async function updateDemanda(codigo, payload) {
    return request(`/api/demandas/${encodeURIComponent(codigo)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  }

  async function aprovarDemanda(codigo, payload) {
    return request(`/api/demandas/${encodeURIComponent(codigo)}/aprovar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload || {}),
    });
  }

  async function listObjetosAhp(params) {
    const qs = new URLSearchParams();
    if (params?.status) qs.set("status", params.status);
    if (params?.grupo) qs.set("grupo", params.grupo);
    const q = qs.toString();
    return request(`/api/ahp/objetos${q ? `?${q}` : ""}`);
  }

  async function getObjetoAhp(codigo) {
    return request(`/api/ahp/objetos/${encodeURIComponent(codigo)}`);
  }

  async function updateObjetoAhp(codigo, payload) {
    return request(`/api/ahp/objetos/${encodeURIComponent(codigo)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  }

  async function listStatusDemanda() {
    return request("/api/dominios/status-demanda");
  }

  async function listStatusObjetoAhp() {
    return request("/api/dominios/status-objeto-ahp");
  }

  async function login(login, senha) {
    return request("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login, senha }),
    });
  }

  async function fetchSession() {
    return request("/api/auth/me");
  }

  async function logout() {
    return request("/api/auth/logout", { method: "POST" });
  }

  global.SLTAdminApi = {
    listDemandas,
    getDemanda,
    updateDemanda,
    aprovarDemanda,
    listObjetosAhp,
    getObjetoAhp,
    updateObjetoAhp,
    listStatusDemanda,
    listStatusObjetoAhp,
    login,
    fetchSession,
    logout,
  };
})(window);
