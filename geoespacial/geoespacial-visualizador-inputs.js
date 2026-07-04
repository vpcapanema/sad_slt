/* Visualizador de Inputs — Módulo Geoespacial */
(function () {
  const API_BASE = "/api/geoespacial";
  let mapInitialized = false;

  function init() {
    if (!mapInitialized) {
      GeoespacialMap.init("map-geoespacial");
      mapInitialized = true;
    }

    setupEventListeners();
    loadCamadas();
  }

  function setupEventListeners() {
    document.getElementById("btn-abrir-camadas").addEventListener("click", handleAbrirCamadas);
    document.getElementById("btn-importar-camadas").addEventListener("click", handleImportarCamadas);
  }

  async function loadCamadas() {
    try {
      const response = await fetch(`${API_BASE}/camadas`);
      const camadas = await response.json();
      renderCamadas(camadas);
    } catch (error) {
      console.error("Erro ao carregar camadas:", error);
    }
  }

  function renderCamadas(camadas) {
    const container = document.getElementById("geoespacial-layers-list");

    if (camadas.length === 0) {
      container.innerHTML = '<p class="hint">Nenhuma camada carregada.</p>';
      return;
    }

    container.innerHTML = camadas
      .map(
        (camada) => `
        <div class="geoespacial-layer-item" data-id="${camada.id}">
          <input type="checkbox" class="geoespacial-layer-checkbox" id="layer-${camada.id}">
          <label for="layer-${camada.id}" class="geoespacial-layer-name">${camada.nome}</label>
        </div>
      `
      )
      .join("");

    container.querySelectorAll(".geoespacial-layer-checkbox").forEach((checkbox) => {
      checkbox.addEventListener("change", (e) => {
        const layerId = e.target.closest(".geoespacial-layer-item").dataset.id;
        toggleCamada(layerId, e.target.checked);
      });
    });
  }

  async function toggleCamada(layerId, visible) {
    // TODO: Implementar carregamento de GeoJSON da camada
    console.log("Toggle camada:", layerId, visible);
  }

  function handleAbrirCamadas() {
    // TODO: Implementar modal para abrir camadas existentes
    console.log("Abrir camadas");
  }

  function handleImportarCamadas() {
    // TODO: Implementar modal para importar camadas
    console.log("Importar camadas");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
