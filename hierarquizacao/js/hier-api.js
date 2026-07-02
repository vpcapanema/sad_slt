/** Cliente HTTP — Hierarquização e Ranqueamento (/api/ahp/hierarquizacoes + /api/ahp/configuracoes + /api/ahp/objetos). */
(function (global) {
  "use strict";

  function errorMessage(body) {
    if (!body) return "Erro na requisição.";
    if (typeof body.detail === "string") return body.detail;
    if (Array.isArray(body.detail)) return body.detail.map((i) => i.msg || String(i)).join("; ");
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

  const BASE_H = "/api/ahp/hierarquizacoes";
  const BASE_C = "/api/ahp/configuracoes";
  const BASE_O = "/api/ahp/objetos";

  global.HierApi = {
    // --- Hierarquizações ---
    criar(payload) {
      return request(BASE_H, jsonOpts("POST", payload));
    },
    listar(params) {
      const qs = params ? "?" + new URLSearchParams(params).toString() : "";
      return request(`${BASE_H}${qs}`);
    },
    obter(codigo) {
      return request(`${BASE_H}/${encodeURIComponent(codigo)}`);
    },
    atualizar(codigo, payload) {
      return request(`${BASE_H}/${encodeURIComponent(codigo)}`, jsonOpts("PATCH", payload));
    },
    calcular(codigo) {
      return request(`${BASE_H}/${encodeURIComponent(codigo)}/calcular`, jsonOpts("POST"));
    },
    homologar(codigo) {
      return request(`${BASE_H}/${encodeURIComponent(codigo)}/homologar`, jsonOpts("POST"));
    },

    // --- Configurações (portfólio) ---
    listarConfigs(params) {
      const base = { tipo: "portfolio", ...params };
      return request(`${BASE_C}?${new URLSearchParams(base).toString()}`);
    },
    obterConfig(codigo) {
      return request(`${BASE_C}/portfolio/${encodeURIComponent(codigo)}`);
    },

    // --- Objetos AHP ---
    listarObjetos(params) {
      const qs = params ? "?" + new URLSearchParams(params).toString() : "";
      return request(`${BASE_O}${qs}`);
    },
  };
})(window);
