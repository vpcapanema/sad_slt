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
  const formatCrs = (value) => String(value || "CRS não informado").replace(/EPSG:4674(?!\s*\()/g, "EPSG:4674 (SIRGAS 2000)");
  function formatDate(value) { if(!value)return "—";const date=new Date(value);return Number.isNaN(date.getTime())?String(value):new Intl.DateTimeFormat("pt-BR",{dateStyle:"short",timeStyle:"short"}).format(date); }
  function generationDate(camada) { const metadata=camada.metadados||{},extras=metadata.metadados||metadata;return extras.data_geracao||extras.gerado_em||extras.generated_at||extras.data_referencia||camada.data_geracao||camada.criado_em||camada.homologado_em; }
  function activateContextTab(name) {
    document.querySelectorAll("[data-context-tab]").forEach((button) => { const active = button.dataset.contextTab === name; button.classList.toggle("active", active); button.setAttribute("aria-selected", String(active)); });
    document.querySelectorAll("[data-context-content]").forEach((panel) => { const active = panel.dataset.contextContent === name; panel.classList.toggle("active", active); panel.hidden = !active; });
    if(name==="properties")setTimeout(()=>[["lineWidth","Espessura da linha (px)"],["pointRadius","Tamanho do ponto (px)"]].forEach(([field,label])=>{const input=document.querySelector(`#geoespacial-properties-content [name="${field}"]`),text=[...(input?.closest("label")?.childNodes||[])].find(node=>node.nodeType===Node.TEXT_NODE);if(text)text.nodeValue=label}),0);
  }
  function showDetails() { const tab = document.querySelector('[data-context-tab="details"]'); tab.hidden = false; activateContextTab("details"); }
  function geometryType(camada) { const type=String(camada.geometria_tipo||camada.tipo||"").toLowerCase();return type.includes("point")?"point":type.includes("line")?"line":type.includes("raster")?"raster":"polygon"; }
  function layerSymbol(camada) { const type=geometryType(camada),style=GeoespacialMap.getLayerStyle(camada.id||camada.nome);return `<span class="geo-layer-tree-symbol geo-layer-tree-symbol--${type}" style="--symbol-color:${style.color};--symbol-fill:${style.fillColor||style.color};--symbol-opacity:${Math.round(style.fillOpacity*100)}%;--symbol-width:${style.lineWidth}px;--symbol-radius:${style.pointRadius}px" aria-label="Editar símbolo da camada" title="Editar propriedades"></span>`; }
  function displayName(camada){return GeoespacialMap.getLayerProperties(camada.id||camada.nome).alias||camada.nome;}
  function openProperties(camada,row){const tab=document.querySelector('[data-context-tab="properties"]');tab.hidden=false;activateContextTab("properties");const style=GeoespacialMap.getLayerStyle(camada.id||camada.nome),saved=GeoespacialMap.getLayerProperties(camada.id||camada.nome),host=document.getElementById("geoespacial-properties-content");host.innerHTML=`<form class="geo-properties-form"><label>Alias da camada<input name="alias" value="${escapeHtml(saved.alias||camada.nome)}" required></label><div class="geo-properties-grid"><label>Cor do contorno/linha<input name="color" type="color" value="${style.color}"></label><label>Cor do preenchimento<input name="fillColor" type="color" value="${style.fillColor||style.color}"></label><label>Espessura da linha<input name="lineWidth" type="number" min="0.5" max="12" step="0.5" value="${style.lineWidth}"></label><label>Tamanho do ponto<input name="pointRadius" type="number" min="2" max="24" step="0.5" value="${style.pointRadius}"></label><label>Tipo de linha<select name="lineStyle"><option value="solid">Contínua</option><option value="dashed">Tracejada</option><option value="dotted">Pontilhada</option></select></label><label>Preenchimento<select name="fillMode"><option value="translucent">Translúcido</option><option value="solid">Sólido</option><option value="outline">Somente contorno</option></select></label></div><label>Opacidade do preenchimento<input name="fillOpacity" type="range" min="0" max="1" step="0.05" value="${style.fillOpacity}"></label><div class="geo-properties-feedback"></div><footer><button class="btn btn-primary" type="submit">Salvar propriedades</button></footer></form>`;const form=host.querySelector("form");form.elements.lineStyle.value=style.lineStyle||"solid";form.elements.fillMode.value=style.fillMode||"translucent";form.addEventListener("submit",event=>{event.preventDefault();const data=new FormData(form),props={alias:String(data.get("alias")).trim(),color:String(data.get("color")),fillColor:String(data.get("fillColor")),lineWidth:Number(data.get("lineWidth")),pointRadius:Number(data.get("pointRadius")),lineStyle:String(data.get("lineStyle")),fillMode:String(data.get("fillMode")),fillOpacity:Number(data.get("fillOpacity"))};GeoespacialMap.saveLayerProperties(camada.id||camada.nome,props);row.querySelector(".layer-group-name").textContent=props.alias;row.querySelector(".geo-layer-tree-symbol").outerHTML=layerSymbol(camada);renderLegend();form.querySelector(".geo-properties-feedback").textContent="Propriedades salvas e aplicadas.";});}
  function renderLegend() {
    const visible = camadas.filter((camada) => camadasVisiveis.has(camada.id));
    const rows = visible.map((camada) => { const symbol=geometryType(camada),style=GeoespacialMap.getLayerStyle(camada.id||camada.nome);return `<div class="geo-legend-item"><span class="geo-legend-symbol geo-legend-symbol--${symbol}" style="--legend-color:${style.fillColor||style.color};--legend-opacity:${Math.round(style.fillOpacity*100)}%;--legend-width:${style.lineWidth}px;--legend-radius:${style.pointRadius}px"></span><span>${escapeHtml(displayName(camada))}</span></div>`; }).join("");
    document.getElementById("geoespacial-legend").innerHTML = rows || '<p class="hint">Ative uma camada para visualizar sua legenda.</p>';
  }
  async function mapReady() { const map = GeoespacialMap.map; if (map?.isStyleLoaded()) return; await new Promise((resolve) => map.once("load", resolve)); }
  function detail(camada) {
    document.querySelectorAll(".geo-layer-record").forEach((item) => item.classList.toggle("active", item.dataset.id === camada.id));
    document.getElementById("geoespacial-details-content").innerHTML = `<div class="geoespacial-detail-grid"><div class="geoespacial-detail-row"><span>Produto</span><strong>${escapeHtml(camada.nome)}</strong></div><div class="geoespacial-detail-row"><span>Tipo</span><strong>${escapeHtml(camada.tipo)}</strong></div><div class="geoespacial-detail-row"><span>CRS</span><strong>${escapeHtml(formatCrs(camada.crs))}</strong></div><div class="geoespacial-detail-row"><span>Status</span><strong>Homologado</strong></div><div class="geoespacial-detail-row"><span>Origem</span><strong>${escapeHtml(camada.origem)}</strong></div><div class="geoespacial-detail-row"><span>Geração da base</span><strong>${escapeHtml(formatDate(generationDate(camada)))}</strong></div><div class="geoespacial-detail-row"><span>Homologação</span><strong>${escapeHtml(formatDate(camada.homologado_em))}</strong></div></div>`;
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
    await mapReady(); GeoespacialMap.addVectorTileLayer(camada.id, `${API}/camadas/${encodeURIComponent(camada.id)}/tiles/{z}/{x}/{y}.pbf`, { uniqueStyle: true, label: displayName(camada), labelsVisible: rotulosAtivos });
    const response = await fetch(`${API}/camadas/${encodeURIComponent(camada.id)}/bounds`);if(!response.ok)throw new Error("Extensão da camada indisponível");GeoespacialMap.layers.get(camada.id).bounds=(await response.json()).bounds;GeoespacialMap.fitBounds(camada.id);
  }
  function render() {
    const container = document.getElementById("geoespacial-layers-list"),basemapContainer=document.getElementById("geoespacial-basemap-list"); document.getElementById("viewer-layer-count").textContent = String(camadas.length);
    container.innerHTML = camadas.length?camadas.map((camada) => `<div class="layer-group layer-group--record geo-layer-record" data-id="${escapeHtml(camada.id)}"><div class="layer-group-header-row"><label class="layer-visibility-toggle" for="layer-${escapeHtml(camada.id)}"><input type="checkbox" class="layer-visibility-input" id="layer-${escapeHtml(camada.id)}"></label><button type="button" class="layer-group-header layer-group-header--record" aria-expanded="false"><span class="layer-group-toggle" aria-hidden="true">›</span><span class="geo-layer-copy"><span class="layer-group-name">${escapeHtml(displayName(camada))}</span>${layerSymbol(camada)}</span></button></div></div>`).join(""):'<p class="layers-empty layers-empty--nested">Nenhuma camada homologada está disponível. Produtos processados só aparecem após homologação e publicação.</p>';
    basemapContainer.innerHTML=BASEMAPS.map(item=>`<div class="layer-group layer-group--record geo-layer-record" data-basemap-id="${item.id}"><div class="layer-group-header-row"><label class="layer-visibility-toggle"><input class="layer-visibility-input" type="radio" name="products-basemap" value="${item.id}" ${basemapAtual===item.id?"checked":""}></label><button type="button" class="layer-group-header layer-group-header--record" aria-expanded="false"><span class="layer-group-toggle" aria-hidden="true">›</span><span class="geo-layer-copy"><span class="layer-group-name">${escapeHtml(item.name)}</span><span class="geo-layer-tree-symbol geo-layer-tree-symbol--basemap" aria-label="Símbolo de mapa-base"></span></span></button></div></div>`).join("");
    container.querySelectorAll(".geo-layer-record").forEach((item) => { const camada = camadas.find((value) => value.id === item.dataset.id); const button=item.querySelector("button"); button.addEventListener("click", () => { const expanded=item.classList.toggle("expanded");button.setAttribute("aria-expanded",String(expanded));detail(camada); });item.querySelector(".geo-layer-tree-symbol").addEventListener("click",event=>{event.stopPropagation();openProperties(camada,item)}); item.querySelector("input").addEventListener("change", async (event) => { try { await toggle(camada, event.target.checked); } catch (error) { event.target.checked = false; } }); });
    basemapContainer.querySelectorAll(".geo-layer-record").forEach(row=>{const item=BASEMAPS.find(value=>value.id===row.dataset.basemapId),button=row.querySelector("button");button.addEventListener("click",()=>{const expanded=row.classList.toggle("expanded");button.setAttribute("aria-expanded",String(expanded));detailBasemap(item)});row.querySelector("input").addEventListener("change",()=>selecionarBasemap(item.id))});
    container.onclick=event=>{const symbol=event.target.closest(".geo-layer-tree-symbol");if(!symbol)return;event.stopPropagation();const row=symbol.closest(".geo-layer-record"),camada=camadas.find(value=>value.id===row.dataset.id);if(camada)openProperties(camada,row)};
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
    GeoespacialMap.init("map-geoespacial", { center: [-48.5, -22.4], zoom: 6.2, nativeTools: true, style:{version:8,glyphs:"https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",sources,layers} });
    document.querySelectorAll("[data-context-tab]").forEach(button=>button.addEventListener("click",()=>activateContextTab(button.dataset.contextTab)));
    ["geo-operational-group","geo-basemap-group"].forEach(id=>{const group=document.getElementById(id),header=group.querySelector(":scope > .layer-group-header-row .layer-group-header--tipo");header.addEventListener("click",()=>{const collapsed=group.classList.toggle("collapsed");header.setAttribute("aria-expanded",String(!collapsed))})});
    const labelButton=document.getElementById("toggle-operational-labels");labelButton.classList.toggle("is-active",rotulosAtivos);labelButton.setAttribute("aria-pressed",String(rotulosAtivos));labelButton.addEventListener("click",()=>{rotulosAtivos=!rotulosAtivos;labelButton.classList.toggle("is-active",rotulosAtivos);labelButton.setAttribute("aria-pressed",String(rotulosAtivos));localStorage.setItem("geoespacial-products-labels",String(rotulosAtivos));camadas.forEach(camada=>GeoespacialMap.toggleLabels(camada.id,rotulosAtivos))});
    document.getElementById("toggle-operational-group").addEventListener("change",event=>{document.querySelectorAll("#geoespacial-layers-list .layer-visibility-input").forEach(input=>{if(input.checked!==event.target.checked){input.checked=event.target.checked;input.dispatchEvent(new Event("change"))}})});
    document.getElementById("toggle-basemap-group").addEventListener("change",()=>selecionarBasemap(basemapAtual));
    activateContextTab("legend");renderLegend();document.getElementById("btn-atualizar").addEventListener("click",load);await load();
  }
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", init) : init();
})();
