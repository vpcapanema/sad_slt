/** Cliente HTTP da Configuração Multicritério (/api/ahp/configuracoes). */
(function (global) {
  "use strict";

  function errorMessage(body) {
    if (!body) return "Erro na requisição.";
    if (typeof body.detail === "string") return body.detail;
    if (Array.isArray(body.detail)) {
      return body.detail.map((i) => i.msg || String(i)).join("; ");
    }
    return body.message || "Erro na requisição.";
  }

  async function request(path, options) {
    const res = await fetch(path, { credentials: "same-origin", ...(options || {}) });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      const err = new Error(errorMessage(body));
      err.status = res.status;
      throw err;
    }
    return body;
  }

  function jsonOpts(method, payload) {
    return {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload || {}),
    };
  }

  const BASE = "/api/ahp/configuracoes";

  global.SLTConfigApi = {
    criar(payload) {
      return request(BASE, jsonOpts("POST", payload));
    },
    listar(tipo, params) {
      const qs = new URLSearchParams({ tipo, ...(params || {}) }).toString();
      return request(`${BASE}?${qs}`);
    },
    obter(tipo, codigo) {
      return request(`${BASE}/${tipo}/${encodeURIComponent(codigo)}`);
    },
    atualizar(tipo, codigo, payload) {
      return request(`${BASE}/${tipo}/${encodeURIComponent(codigo)}`, jsonOpts("PATCH", payload));
    },
    calcular(tipo, codigo) {
      return request(`${BASE}/${tipo}/${encodeURIComponent(codigo)}/calcular`, jsonOpts("POST"));
    },
    homologar(tipo, codigo) {
      return request(`${BASE}/${tipo}/${encodeURIComponent(codigo)}/homologar`, jsonOpts("POST"));
    },
  };
})(window);
