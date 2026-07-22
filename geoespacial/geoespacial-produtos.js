/* Visualizador de Camadas Finais — Módulo Geoespacial */
(function () {
  "use strict";
  const API = "/api/geoespacial";
  let camadas = [];
  const camadasVisiveis = new Set();
  let rotulosAtivos = localStorage.getItem("geoespacial-products-labels") === "true";
  const BASEMAPS = [
    { id: "osm", name: "OpenStreetMap", provider: "OpenStreetMap Contributors", referenceDate: "Atualização contínua; referência correspondente à data de consulta", tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"] },
    { id: "carto-light", name: "Carto Claro", provider: "CARTO / OpenStreetMap", referenceDate: "Atualização contínua; referência correspondente à data de consulta", tiles: ["https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png"] },
    { id: "carto-dark", name: "Carto Escuro", provider: "CARTO / OpenStreetMap", referenceDate: "Atualização contínua; referência correspondente à data de consulta", tiles: ["https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"] },
    { id: "esri-satellite", name: "Imagem de Satélite", provider: "Esri World Imagery", referenceDate: "Mosaico multitemporal; a data varia conforme a localização e a escala", tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"] },
  ];
  let basemapAtual = localStorage.getItem("geoespacial-products-basemap") || "osm";
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  function formatDate(value) { if(!value)return "—";const date=new Date(value);return Number.isNaN(date.getTime())?String(value):new Intl.DateTimeFormat("pt-BR",{dateStyle:"short",timeStyle:"short"}).format(date); }
  function generationDate(camada) { const metadata=camada.metadados||{},extras=metadata.metadados||metadata;return extras.data_geracao||extras.gerado_em||extras.generated_at||extras.data_referencia||camada.data_geracao||camada.criado_em||camada.homologado_em; }
  function activateContextTab(name) {
    document.querySelectorAll("[data-context-tab]").forEach((button) => { const active = button.dataset.contextTab === name; button.classList.toggle("active", active); button.setAttribute("aria-selected", String(active)); });
    document.querySelectorAll("[data-context-content]").forEach((panel) => { const active = panel.dataset.contextContent === name; panel.classList.toggle("active", active); panel.hidden = !active; });
  }
  function showDetails() { const tab = document.querySelector('[data-context-tab="details"]'); tab.hidden = false; activateContextTab("details"); }
  function geometryType(camada) { const type=String(camada.geometria_tipo||camada.tipo||"").toLowerCase();return type.includes("point")?"point":type.includes("line")?"line":type.includes("raster")?"raster":"polygon"; }
  function layerSymbol(camada) { const type=geometryType(camada),style=GeoespacialMap.getLayerStyle(camada.id||camada.nome);return `<span class="geo-layer-tree-symbol geo-layer-tree-symbol--${type}" style="--symbol-color:${style.color};--symbol-opacity:${Math.round(style.fillOpacity*100)}%;--symbol-width:${style.lineWidth}px;--symbol-radius:${style.pointRadius}px" aria-label="Símbolo da camada"></span>`; }
  function renderLegend() {
    const visible = camadas.filter((camada) => camadasVisiveis.has(camada.id));
    const rows = visible.map((camada) => { const symbol=geometryType(camada),style=GeoespacialMap.getLayerStyle(camada.id||camada.nome);return `<div class="geo-legend-item"><span class="geo-legend-symbol geo-legend-symbol--${symbol}" style="--legend-color:${style.color};--legend-opacity:${Math.round(style.fillOpacity*100)}%;--legend-width:${style.lineWidth}px;--legend-radius:${style.pointRadius}px"></span><span>${escapeHtml(camada.nome)}</span></div>`; }).join("");
    document.getElementById("geoespacial-legend").innerHTML = rows || '<p class="hint">Ative uma camada para visualizar sua legenda.</p>';
  }
  async function mapReady() { const map = GeoespacialMap.map; if (map?.isStyleLoaded()) return; await new Promise((resolve) => map.once("load", resolve)); }
  function detail(camada) {
    document.querySelectorAll(".geo-layer-record").forEach((item) => item.classList.toggle("active", item.dataset.id === camada.id));
    document.getElementById("geoespacial-details-content").innerHTML = `<div class="geoespacial-detail-grid"><div class="geoespacial-detail-row"><span>Produto</span><strong>${escapeHtml(camada.nome)}</strong></div><div class="geoespacial-detail-row"><span>Tipo</span><strong>${escapeHtml(camada.tipo)}</strong></div><div class="geoespacial-detail-row"><span>CRS</span><strong>${escapeHtml(camada.crs || "Não informado")}</strong></div><div class="geoespacial-detail-row"><span>Status</span><strong>Homologado</strong></div><div class="geoespacial-detail-row"><span>Origem</span><strong>${escapeHtml(camada.origem)}</strong></div><div class="geoespacial-detail-row"><span>Geração da base</span><strong>${escapeHtml(formatDate(generationDate(camada)))}</strong></div><div class="geoespacial-detail-row"><span>Homologação</span><strong>${escapeHtml(formatDate(camada.homologado_em))}</strong></div></div>`;
    showDetails();
  }
  function detailBasemap(item) {
    document.querySelectorAll(".geo-layer-record").forEach((row) => row.classList.toggle("active", row.dataset.basemapId === item.id));
    document.getElementById("geoespacial-details-content").innerHTML = `<div class="geoespacial-detail-grid"><div class="geoespacial-detail-row"><span>Mapa-base</span><strong>${escapeHtml(item.name)}</strong></div><div class="geoespacial-detail-row"><span>Tipo</span><strong>Camada raster de referência</strong></div><div class="geoespacial-detail-row"><span>Provedor</span><strong>${escapeHtml(item.provider)}</strong></div><div class="geoespacial-detail-row"><span>Data de referência</span><strong>${escapeHtml(item.referenceDate)}</strong></div><div class="geoespacial-detail-row"><span>Uso</span><strong>Contexto cartográfico; não participa dos cálculos.</strong></div></div>`;
    showDetails();
  }
  function selecionarBasemap(id) {
    basemapAtual=BASEMAPS.some(item=>item.id===id)?id:"osm";localStorage.setItem("geoespacial-products-basemap",basemapAtual);const visible=document.getElementById("toggle-basemap-group")?.checked!==false;
    BASEMAPS.forEach(item=>{const layerId=`products-basemap-${item.id}`;if(GeoespacialMap.map?.getLayer(layerId))GeoespacialMap.map.setLayoutProperty(layerId,"visibility",visible&&item.id===basemapAtual?"visible":"none")});
    detailBasemap(BASEMAPS.find(item=>item.id===basemapAtual));
  }
  async function toggle(camada, visible) {
    if (!visible) { camadasVisiveis.delete(camada.id); GeoespacialMap.toggleLayer(camada.id, false); renderLegend(); return; }
    detail(camada);
    camadasVisiveis.add(camada.id); renderLegend();
    if (GeoespacialMap.layers.has(camada.id)) return GeoespacialMap.toggleLayer(camada.id, true);
    if (String(camada.tipo).toLowerCase().includes("raster")) return;
    const response = await fetch(`${API}/camadas/${encodeURIComponent(camada.id)}/geojson`); if (!response.ok) throw new Error("Geometria indisponível");
    await mapReady(); GeoespacialMap.addLayer(camada.id, await response.json(), { uniqueStyle: true, label: camada.nome, labelsVisible: rotulosAtivos }); GeoespacialMap.fitBounds(camada.id);
  }
  function render() {
    const container = document.getElementById("geoespacial-layers-list"),basemapContainer=document.getElementById("geoespacial-basemap-list"); document.getElementById("viewer-layer-count").textContent = String(camadas.length);
    container.innerHTML = camadas.length?camadas.map((camada) => `<div class="layer-group layer-group--record geo-layer-record" data-id="${escapeHtml(camada.id)}"><div class="layer-group-header-row"><label class="layer-visibility-toggle" for="layer-${escapeHtml(camada.id)}"><input type="checkbox" class="layer-visibility-input" id="layer-${escapeHtml(camada.id)}"></label><button type="button" class="layer-group-header layer-group-header--record" aria-expanded="false"><span class="layer-group-toggle" aria-hidden="true">›</span><span class="geo-layer-copy"><span class="layer-group-name">${escapeHtml(camada.nome)}</span>${layerSymbol(camada)}</span></button></div></div>`).join(""):'<p class="layers-empty layers-empty--nested">Nenhuma camada homologada está disponível. Produtos processados só aparecem após homologação e publicação.</p>';
    basemapContainer.innerHTML=BASEMAPS.map(item=>`<div class="layer-group layer-group--record geo-layer-record" data-basemap-id="${item.id}"><div class="layer-group-header-row"><label class="layer-visibility-toggle"><input class="layer-visibility-input" type="radio" name="products-basemap" value="${item.id}" ${basemapAtual===item.id?"checked":""}></label><button type="button" class="layer-group-header layer-group-header--record" aria-expanded="false"><span class="layer-group-toggle" aria-hidden="true">›</span><span class="geo-layer-copy"><span class="layer-group-name">${escapeHtml(item.name)}</span><span class="geo-layer-tree-symbol geo-layer-tree-symbol--basemap" aria-label="Símbolo de mapa-base"></span></span></button></div></div>`).join("");
    container.querySelectorAll(".geo-layer-record").forEach((item) => { const camada = camadas.find((value) => value.id === item.dataset.id); const button=item.querySelector("button"); button.addEventListener("click", () => { const expanded=item.classList.toggle("expanded");button.setAttribute("aria-expanded",String(expanded));detail(camada); }); item.querySelector("input").addEventListener("change", async (event) => { try { await toggle(camada, event.target.checked); } catch (error) { event.target.checked = false; } }); });
    basemapContainer.querySelectorAll(".geo-layer-record").forEach(row=>{const item=BASEMAPS.find(value=>value.id===row.dataset.basemapId),button=row.querySelector("button");button.addEventListener("click",()=>{const expanded=row.classList.toggle("expanded");button.setAttribute("aria-expanded",String(expanded));detailBasemap(item)});row.querySelector("input").addEventListener("change",()=>selecionarBasemap(item.id))});
  }
  async function load() {
    const response = await fetch(`${API}/biblioteca-camadas`);
    const biblioteca = response.ok ? await response.json() : [];
    camadas = biblioteca.map((camada) => ({
      ...camada,
      nome: camada.nome_publicacao || camada.nome,
      origem: `Biblioteca homologada · ${camada.versao}`,
    }));
    render();
  }
  async function init() {
    const sources={},layers=[];BASEMAPS.forEach(item=>{sources[item.id]={type:"raster",tiles:item.tiles,tileSize:256,attribution:item.provider};layers.push({id:`products-basemap-${item.id}`,type:"raster",source:item.id,layout:{visibility:item.id===basemapAtual?"visible":"none"}})});
    GeoespacialMap.init("map-geoespacial", { center: [-48.5, -22.4], zoom: 6.2, style:{version:8,glyphs:"https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",sources,layers} });
    document.querySelectorAll("[data-context-tab]").forEach(button=>button.addEventListener("click",()=>activateContextTab(button.dataset.contextTab)));
    ["geo-operational-group","geo-basemap-group"].forEach(id=>{const group=document.getElementById(id),header=group.querySelector(":scope > .layer-group-header-row .layer-group-header--tipo");header.addEventListener("click",()=>{const collapsed=group.classList.toggle("collapsed");header.setAttribute("aria-expanded",String(!collapsed))})});
    const labelButton=document.getElementById("toggle-operational-labels");labelButton.classList.toggle("is-active",rotulosAtivos);labelButton.setAttribute("aria-pressed",String(rotulosAtivos));labelButton.addEventListener("click",()=>{rotulosAtivos=!rotulosAtivos;labelButton.classList.toggle("is-active",rotulosAtivos);labelButton.setAttribute("aria-pressed",String(rotulosAtivos));localStorage.setItem("geoespacial-products-labels",String(rotulosAtivos));camadas.forEach(camada=>GeoespacialMap.toggleLabels(camada.id,rotulosAtivos))});
    document.getElementById("toggle-operational-group").addEventListener("change",event=>{document.querySelectorAll("#geoespacial-layers-list .layer-visibility-input").forEach(input=>{if(input.checked!==event.target.checked){input.checked=event.target.checked;input.dispatchEvent(new Event("change"))}})});
    document.getElementById("toggle-basemap-group").addEventListener("change",()=>selecionarBasemap(basemapAtual));
    activateContextTab("legend");renderLegend();document.getElementById("btn-atualizar").addEventListener("click",load);await load();
  }
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", init) : init();
})();
