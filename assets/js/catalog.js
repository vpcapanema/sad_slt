(function (global) {
  let catalog = null;

  async function loadCatalog(basePath) {
    if (catalog) return catalog;
    const url = (basePath || "") + "data/catalogo-slt.json";
    const res = await fetch(url);
    if (!res.ok) throw new Error("Não foi possível carregar o catálogo SLT.");
    catalog = await res.json();
    return catalog;
  }

  function ativos(items) {
    return (items || []).filter((i) => String(i.ativo || "").toUpperCase() === "SIM");
  }

  function planosPorDiretoria(diretoriaId) {
    return ativos(catalog.planos).filter((p) => p.diretoria_id === diretoriaId);
  }

  function frentesPorPlano(planoId) {
    return ativos(catalog.frentes_pli).filter((f) => f.plano_id === planoId);
  }

  function eixosPorPlano(planoId) {
    return ativos(catalog.eixos_pef).filter((e) => e.plano_id === planoId);
  }

  function ticsPorEixo(eixoId) {
    return ativos(catalog.corredores_tic).filter((t) => t.eixo_pef_id === eixoId);
  }

  function carteirasPorPlano(planoId) {
    return ativos(catalog.carteiras).filter((c) => c.plano_id === planoId);
  }

  function getPlano(id) {
    return ativos(catalog.planos).find((p) => p.id === id);
  }

  function getItem(list, id, key) {
    key = key || "id";
    return (list || []).find((x) => x[key] === id);
  }

  global.SLTCatalog = {
    loadCatalog,
    ativos,
    planosPorDiretoria,
    frentesPorPlano,
    eixosPorPlano,
    ticsPorEixo,
    carteirasPorPlano,
    getPlano,
    getItem,
    get catalog() {
      return catalog;
    },
  };
})(window);
