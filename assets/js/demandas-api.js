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
    const E = global.SicardApiErro;
    const method = (options && options.method) || "GET";
    let res;
    try { res = await fetch(path, options); }
    catch (e) { throw E ? E.deRede(e, { method, url: path }) : e; }
    if (!res.ok) {
      if (E) throw await E.deResposta(res, { method, url: path });
      throw new Error(errorMessage(await res.json().catch(() => null)));
    }
    return res.json().catch(() => null);
  }

  async function createDemanda(payload, arquivoGeometria = null) {
    if (arquivoGeometria) {
      const form = new FormData();
      form.append("payload", JSON.stringify(payload));
      form.append("arquivo_geometria", arquivoGeometria, arquivoGeometria.name);
      return request("/api/demandas/com-arquivo-geometria", {
        method: "POST",
        body: form,
      });
    }
    return request("/api/demandas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  }

  async function listDemandas() {
    return request("/api/demandas");
  }

  async function listPainelDemandas() {
    return request("/api/painel/demandas");
  }

  async function createPlano(payload) {
    return request("/api/planos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  }

  async function createPrograma(payload) {
    return request("/api/programas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  }

  async function listPlanos() {
    return request("/api/planos");
  }

  async function listPlanosVinculaveis() {
    return (await request("/api/planos/vinculaveis")).map(item => ({ id: item.codigo, nome: item.nome }));
  }

  async function listProgramas() {
    return request("/api/programas");
  }

  async function listProgramasVinculaveis() {
    return (await request("/api/programas/vinculaveis")).map(item => ({ id: item.codigo, nome: item.nome }));
  }

  async function listGeoTipos() {
    return request("/api/geo/tipos");
  }

  async function listGeoUnidades(tipo) {
    const qs = tipo ? `?tipo=${encodeURIComponent(tipo)}` : "";
    return request(`/api/geo/unidades${qs}`);
  }

  async function geoUnidadesGeojson(ids) {
    const q = (ids || []).join(",");
    return request(`/api/geo/unidades/geojson?ids=${encodeURIComponent(q)}`);
  }

  async function analyzeContainment(payload) {
    return request("/api/geo/analyze/containment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  }

  async function analyzeContainmentPrograma(payload) {
    return request("/api/geo/analyze/containment-programa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  }

  async function locateGeometry(geometry) {
    return request("/api/geo/analyze/locate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ geometry }),
    });
  }

  async function analyzeProgramaRegionalidades(unidadeIds) {
    return request("/api/geo/analyze/programa-regionalidades", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ unidade_ids: unidadeIds }),
    });
  }

  global.SLTDemandasApi = {
    createDemanda,
    listDemandas,
    listPainelDemandas,
    createPlano,
    createPrograma,
    listPlanos,
    listPlanosVinculaveis,
    listProgramas,
    listProgramasVinculaveis,
    listGeoTipos,
    listGeoUnidades,
    geoUnidadesGeojson,
    analyzeContainment,
    analyzeContainmentPrograma,
    locateGeometry,
    analyzeProgramaRegionalidades,
  };
})(window);
