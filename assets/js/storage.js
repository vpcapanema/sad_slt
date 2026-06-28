(function (global) {
  const STORAGE_KEY = "slt_demandas_v1";

  function loadDemandas() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function saveDemandas(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }

  function addDemanda(demanda) {
    const list = loadDemandas();
    list.push(demanda);
    saveDemandas(list);
    return demanda;
  }

  function uid() {
    const hex = Math.random().toString(16).slice(2, 10).padEnd(8, "0").toUpperCase();
    return "PRJ-" + hex;
  }

  global.SLTStorage = { loadDemandas, saveDemandas, addDemanda, uid, STORAGE_KEY };
})(window);
