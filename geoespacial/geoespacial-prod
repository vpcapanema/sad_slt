/* Produtos — Módulo Geoespacial */
(function () {
  const API_BASE = "/api/geoespacial";
  let mapInitialized = false;

  function init() {
    if (!mapInitialized) {
      GeoespacialMap.init("map-geoespacial");
      mapInitialized = true;
    }

    setupEventListeners();
    loadCamadasFinais();
  }

  function setupEventListeners() {
    document.getElementById("btn-atualizar").addEventListener("click", loadCamadasFinais);
  }

  async function loadCamadasFinais() {
    try {
      const response = await fetch(`${API_BASE}/camadas`);
      const camadas = await response.json();
      const camadasFinais = camadas.filter((c) => c.origem === "final");
      renderCamadas(camadasFinais);
    } catch (error) {
      console.error("Erro ao carregar camadas finais:", error);
    }
  }

  function renderCamadas(camadas) {
    const container = document.getElementById("geoespacial-layers-list");

    if (camadas.length === 0) {
      container.innerHTML = '<p class="hint">Nenhuma camada final disponível.</p>';
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
    console.log("Toggle camada:", layerId, visible);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
