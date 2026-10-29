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
    const E = global.SicardApiErro;
    const method = (options && options.method) || "GET";
    let res;
    try { res = await fetch(path, { credentials: "same-origin", ...(options || {}) }); }
    catch (e) { throw E ? E.deRede(e, { method, url: path }) : e; }
    if (!res.ok) {
      if (E) throw await E.deResposta(res, { method, url: path });
      const body = await res.json().catch(() => null);
      const err = new Error(errorMessage(body));
      err.status = res.status;
      throw err;
    }
    return res.json().catch(() => null);
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
    // --- Agrupamentos reutilizáveis de demandas ---
    listarAgrupamentos() { return request("/api/agrupamentos-demandas"); },
    obterAgrupamento(id) { return request(`/api/agrupamentos-demandas/${encodeURIComponent(id)}`); },
    atualizarAgrupamento(id, payload) { return request(`/api/agrupamentos-demandas/${encodeURIComponent(id)}`, jsonOpts("PUT", payload)); },
    criarAgrupamento(payload) { return request("/api/agrupamentos-demandas", jsonOpts("POST", payload)); },

    // --- Hierarquizações ---
    criar(payload) {
      return request(BASE_H, jsonOpts("POST", payload));
    },
    solicitarComplementacao(codigo, descricao) {
      return request(`/api/complementacao/hierarquizacoes/${encodeURIComponent(codigo)}/solicitar`, jsonOpts("POST", {descricao}));
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
    excluir(codigo) {
      return request(`${BASE_H}/${encodeURIComponent(codigo)}`, { method: "DELETE" });
    },
    calcular(codigo) {
      return request(`${BASE_H}/${encodeURIComponent(codigo)}/calcular`, jsonOpts("POST"));
    },
    homologar(codigo) {
      return request(`${BASE_H}/${encodeURIComponent(codigo)}/homologar`, jsonOpts("POST"));
    },
    publicar(codigo) {
      return request(`${BASE_H}/${encodeURIComponent(codigo)}/publicar`, jsonOpts("POST"));
    },
    reverterHomologacao(codigo) {
      return request(`${BASE_H}/${encodeURIComponent(codigo)}/reverter-homologacao`, jsonOpts("POST"));
    },
    sincronizarComposicao(codigo) {
      return request(`${BASE_H}/${encodeURIComponent(codigo)}/sincronizar-composicao`, jsonOpts("POST"));
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
    salvarFase1(codigo, payload) {
      return request(`${BASE_H}/${encodeURIComponent(codigo)}/fases/1`, jsonOpts("PATCH", payload));
    },
    executarFase1(codigo, payload) {
      return request(`${BASE_H}/${encodeURIComponent(codigo)}/fases/1/executar`, jsonOpts("POST", payload));
    },
    mapaSobreposicaoFase1(codigo) {
      return request(`${BASE_H}/${encodeURIComponent(codigo)}/fases/1/mapa-sobreposicao`);
    },
    listarPacotes(modulo) { return request(`${BASE_H}/pacotes/${encodeURIComponent(modulo)}`); },
    listarFatiamentosFase1() { return request(`${BASE_H}/fatiamentos/fase1`); },
    salvarFatiamentoFase1(payload) { return request(`${BASE_H}/fatiamentos/fase1`, jsonOpts("POST", payload)); },
    executarFase2(codigo, payload) { return request(`${BASE_H}/${encodeURIComponent(codigo)}/fases/2/executar`, jsonOpts("POST", payload)); },
    executarFase3(codigo, payload, versaoEsperada) {
      const qs = versaoEsperada ? `?versao_esperada=${encodeURIComponent(versaoEsperada)}` : "";
      return request(`${BASE_H}/${encodeURIComponent(codigo)}/fases/3/executar${qs}`, jsonOpts("POST", payload));
    },
    calcularFase3(codigo, payload) { return request(`${BASE_H}/${encodeURIComponent(codigo)}/fases/3/calcular`, jsonOpts("POST", payload)); },
    salvarAtributosFase3(codigo, payload) { return request(`${BASE_H}/${encodeURIComponent(codigo)}/fases/3/atributos`, jsonOpts("PATCH", payload)); },
    salvarPesosFase3(codigo, payload) { return request(`${BASE_H}/${encodeURIComponent(codigo)}/fases/3/pesos`, jsonOpts("PATCH", payload)); },
    salvarRiscosFase3(codigo, payload) { return request(`${BASE_H}/${encodeURIComponent(codigo)}/fases/3/riscos`, jsonOpts("PATCH", payload)); },
    sintetizar(codigo, payload, versaoEsperada) {
      const qs = versaoEsperada ? `?versao_esperada=${encodeURIComponent(versaoEsperada)}` : "";
      return request(`${BASE_H}/${encodeURIComponent(codigo)}/sintetizar${qs}`, jsonOpts("POST", payload));
    },
    calcularSintese(codigo, payload) { return request(`${BASE_H}/${encodeURIComponent(codigo)}/sintese/calcular`, jsonOpts("POST", payload)); },
    listarUniverso(tipo, status) {
      const qs = new URLSearchParams(status ? { status } : {}).toString();
      return request(`/api/ahp/universo/${encodeURIComponent(tipo)}${qs ? "?" + qs : ""}`);
    },
    listarCamposUniverso(tipo) {
      return request(`/api/ahp/universo/${encodeURIComponent(tipo)}/campos`);
    },
  };
})(window);
