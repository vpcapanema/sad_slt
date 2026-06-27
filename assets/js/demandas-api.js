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

  async function listProgramas() {
    return request("/api/programas");
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

  global.SLTDemandasApi = {
    createDemanda,
    listDemandas,
    listPainelDemandas,
    createPlano,
    createPrograma,
    listPlanos,
    listProgramas,
    listGeoTipos,
    listGeoUnidades,
    geoUnidadesGeojson,
  };
})(window);
