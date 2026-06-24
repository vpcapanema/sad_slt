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
    const res = await fetch(path, options);
    const body = await res.json().catch(() => null);
    if (!res.ok) throw new Error(errorMessage(body));
    return body;
  }

  async function createDemanda(payload) {
    return request("/api/demandas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  }

  async function listDemandas() {
    return request("/api/demandas");
  }

  global.SLTDemandasApi = { createDemanda, listDemandas };
})(window);
