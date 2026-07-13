/* Visualizador de Camadas Finais — Módulo Geoespacial */
(function () {
  "use strict";
  const API = "/api/geoespacial";
  let camadas = [];
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  async function mapReady() { const map = GeoespacialMap.map; if (map?.isStyleLoaded()) return; await new Promise((resolve) => map.once("load", resolve)); }
  function detail(camada) {
    document.querySelectorAll(".geoespacial-layer-item").forEach((item) => item.classList.toggle("active", item.dataset.id === camada.id));
    document.getElementById("geoespacial-details-content").innerHTML = `<div class="geoespacial-detail-grid"><div class="geoespacial-detail-row"><span>Produto</span><strong>${escapeHtml(camada.nome)}</strong></div><div class="geoespacial-detail-row"><span>Tipo</span><strong>${escapeHtml(camada.tipo)}</strong></div><div class="geoespacial-detail-row"><span>CRS</span><strong>${escapeHtml(camada.crs || "Não informado")}</strong></div><div class="geoespacial-detail-row"><span>Status</span><strong>Homologado</strong></div><div class="geoespacial-detail-row"><span>Origem</span><strong>${escapeHtml(camada.origem)}</strong></div></div>`;
  }
  async function toggle(camada, visible) {
    if (!visible) return GeoespacialMap.toggleLayer(camada.id, false);
    detail(camada);
    if (GeoespacialMap.layers.has(camada.id)) return GeoespacialMap.toggleLayer(camada.id, true);
    if (String(camada.tipo).toLowerCase().includes("raster")) return;
    const response = await fetch(`${API}/camadas/${encodeURIComponent(camada.id)}/geojson`); if (!response.ok) throw new Error("Geometria indisponível");
    await mapReady(); GeoespacialMap.addLayer(camada.id, await response.json(), { color: "#18724c" }); GeoespacialMap.fitBounds(camada.id);
  }
  function render() {
    const container = document.getElementById("geoespacial-layers-list"); document.getElementById("viewer-layer-count").textContent = `${camadas.length} ${camadas.length === 1 ? "item" : "itens"}`;
    if (!camadas.length) return container.innerHTML = '<p class="hint">Nenhuma camada homologada está disponível. Produtos processados só aparecem após homologação e publicação.</p>';
    container.innerHTML = camadas.map((camada) => `<div class="geoespacial-layer-item" data-id="${escapeHtml(camada.id)}"><input type="checkbox" class="geoespacial-layer-checkbox" id="layer-${escapeHtml(camada.id)}"><label for="layer-${escapeHtml(camada.id)}" class="geoespacial-layer-name">${escapeHtml(camada.nome)}</label></div>`).join("");
    container.querySelectorAll(".geoespacial-layer-item").forEach((item) => { const camada = camadas.find((value) => value.id === item.dataset.id); item.addEventListener("click", (event) => { if (!event.target.matches("input")) detail(camada); }); item.querySelector("input").addEventListener("change", async (event) => { try { await toggle(camada, event.target.checked); } catch (error) { event.target.checked = false; } }); });
  }
  async function load() { const response = await fetch(`${API}/camadas`); const catalogo = response.ok ? await response.json() : []; camadas = catalogo.filter((camada) => camada.origem === "final" || camada.metadados?.status === "homologado"); render(); }
  async function init() { GeoespacialMap.init("map-geoespacial", { center: [-48.5, -22.4], zoom: 6.2 }); document.getElementById("btn-atualizar").addEventListener("click", load); await load(); }
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", init) : init();
})();
