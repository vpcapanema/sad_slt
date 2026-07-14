/* Visualizador de Inputs — Módulo Geoespacial */
(function () {
  "use strict";
  const API = "/api/geoespacial";
  let camadas = [];
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));

  async function mapReady() {
    const map = GeoespacialMap.map;
    if (map?.isStyleLoaded()) return;
    await new Promise((resolve) => map.once("load", resolve));
  }
  function detail(camada) {
    document.querySelectorAll(".geoespacial-layer-item").forEach((item) => item.classList.toggle("active", item.dataset.id === camada.id));
    document.getElementById("geoespacial-operations-list").innerHTML = `<div class="geoespacial-detail-grid">
      <div class="geoespacial-detail-row"><span>Nome</span><strong>${escapeHtml(camada.nome)}</strong></div>
      <div class="geoespacial-detail-row"><span>Tipo</span><strong>${escapeHtml(camada.tipo)}</strong></div>
      <div class="geoespacial-detail-row"><span>CRS</span><strong>${escapeHtml(camada.crs || "Não informado")}</strong></div>
      <div class="geoespacial-detail-row"><span>Origem</span><strong>${escapeHtml(camada.origem || "Sessão")}</strong></div>
      <div class="geoespacial-detail-row"><span>Importação</span><strong>${escapeHtml(camada.data_importacao || "—")}</strong></div>
    </div>`;
  }
  async function toggle(camada, visible) {
    if (!visible) return GeoespacialMap.toggleLayer(camada.id, false);
    detail(camada);
    if (GeoespacialMap.layers.has(camada.id)) return GeoespacialMap.toggleLayer(camada.id, true);
    if (String(camada.tipo).toLowerCase().includes("raster")) {
      document.getElementById("geoespacial-operations-list").insertAdjacentHTML("beforeend", '<p class="hint">O preview raster está disponível na bancada de geoprocessamento.</p>');
      return;
    }
    const response = await fetch(`${API}/camadas/${encodeURIComponent(camada.id)}/geojson`);
    if (!response.ok) throw new Error(`Não foi possível carregar a geometria (${response.status})`);
    await mapReady();
    GeoespacialMap.addLayer(camada.id, await response.json());
    GeoespacialMap.fitBounds(camada.id);
  }
  function render() {
    const container = document.getElementById("geoespacial-layers-list");
    document.getElementById("viewer-layer-count").textContent = `${camadas.length} ${camadas.length === 1 ? "item" : "itens"}`;
    if (!camadas.length) return container.innerHTML = '<p class="hint">Nenhuma camada importada. Use “Importar camadas” para registrar uma origem externa no sistema.</p>';
    container.innerHTML = camadas.map((camada) => `<div class="geoespacial-layer-item" data-id="${escapeHtml(camada.id)}"><input type="checkbox" class="geoespacial-layer-checkbox" id="layer-${escapeHtml(camada.id)}"><label for="layer-${escapeHtml(camada.id)}" class="geoespacial-layer-name">${escapeHtml(camada.nome)}</label></div>`).join("");
    container.querySelectorAll(".geoespacial-layer-item").forEach((item) => {
      const camada = camadas.find((value) => value.id === item.dataset.id);
      item.addEventListener("click", (event) => { if (!event.target.matches("input")) detail(camada); });
      item.querySelector("input").addEventListener("change", async (event) => { try { await toggle(camada, event.target.checked); } catch (error) { event.target.checked = false; document.getElementById("geoespacial-operations-list").innerHTML = `<p class="hint">${escapeHtml(error.message)}</p>`; } });
    });
  }
  async function load() {
    const response = await fetch(`${API}/camadas-diretorio`);
    if (!response.ok) throw new Error("Catálogo de camadas indisponível");
    camadas = (await response.json()).importadas || []; render();
  }
  async function upload(files) {
    for (const file of files) {
      const data = new FormData(); data.append("arquivo", file);
      const response = await fetch(`${API}/camadas/importar`, { method: "POST", body: data });
      if (!response.ok) throw new Error((await response.json()).detail || `Falha no upload de ${file.name}`);
    }
    await load();
  }
  async function init() {
    GeoespacialMap.init("map-geoespacial", { center: [-48.5, -22.4], zoom: 6.2 });
    const input = document.getElementById("viewer-file-input");
    document.getElementById("btn-abrir-camadas").addEventListener("click", load);
    document.getElementById("btn-importar-camadas").addEventListener("click", () => input.click());
    input.addEventListener("change", async () => { try { await upload(input.files); } catch (error) { document.getElementById("geoespacial-operations-list").innerHTML = `<p class="hint">${escapeHtml(error.message)}</p>`; } finally { input.value = ""; } });
    await load();
  }
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", init) : init();
})();
