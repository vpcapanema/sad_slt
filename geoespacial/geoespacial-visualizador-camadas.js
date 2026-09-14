/* Visualizador de Camadas Geoespaciais — Módulo Geoespacial
 * Mostra a geometria de saída de uma extração de atributos (?extracao=<id>), lida
 * da tabela onde a saída é gravada e desenhada em tiles vetoriais do banco. Deriva
 * do visualizador de bases; a barra lateral aponta para a tabela de extrações. */
(function () {
  "use strict";
  const API = "/api/geoespacial";
  const extracaoId = new URLSearchParams(location.search).get("extracao");
  let camadas = [];
  let aviso = "";
  const camadasVisiveis = new Set();
  let rotulosAtivos = localStorage.getItem("geoespacial-camadas-labels") === "true";
  const BASEMAPS = [
    { id: "osm", name: "OpenStreetMap", provider: "OpenStreetMap Contributors", referenceDate: "Atualização contínua; referência correspondente à data de consulta", tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"] },
    { id: "ofm-positron", name: "OpenFreeMap Claro", provider: "OpenFreeMap / OpenStreetMap", referenceDate: "Atualização contínua; referência correspondente à data de consulta", style: "https://tiles.openfreemap.org/styles/positron" },
    { id: "ofm-dark", name: "OpenFreeMap Escuro", provider: "OpenFreeMap / OpenStreetMap", referenceDate: "Atualização contínua; referência correspondente à data de consulta", style: "https://tiles.openfreemap.org/styles/dark" },
    { id: "esri-satellite", name: "Imagem de Satélite", provider: "Esri World Imagery", referenceDate: "Mosaico multitemporal; a data varia conforme a localização e a escala", tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"] },
  ];
  const _basemapSalvo = localStorage.getItem("geoespacial-camadas-basemap");
  let basemapAtual = BASEMAPS.some((item) => item.id === _basemapSalvo) ? _basemapSalvo : "osm";
  const OPERACOES = { intersection: "Interseção", identity: "Identidade" };
  const GEOMETRIAS = { 0: "Pontos", 1: "Linhas", 2: "Polígonos" };
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  function formatDate(value) { if (!value) return "—"; const date = new Date(value); return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(date); }
  function activateContextTab(name) {
    document.querySelectorAll("[data-context-tab]").forEach((button) => { const active = button.dataset.contextTab === name; button.classList.toggle("active", active); button.setAttribute("aria-selected", String(active)); });
    document.querySelectorAll("[data-context-content]").forEach((panel) => { const active = panel.dataset.contextContent === name; panel.classList.toggle("active", active); panel.hidden = !active; });
  }
  function showDetails() { const tab = document.querySelector('[data-context-tab="details"]'); tab.hidden = false; activateContextTab("details"); }
  function geometryType(camada) { const type = String(camada.geometria_tipo || "").toLowerCase(); return type.includes("ponto") ? "point" : type.includes("linha") ? "line" : "polygon"; }
  function layerSymbol(camada) { const type = geometryType(camada), style = GeoespacialMap.getLayerStyle(camada.id); return `<span class="geo-layer-tree-symbol geo-layer-tree-symbol--${type}" style="--symbol-color:${style.color};--symbol-fill:${style.fillColor || style.color};--symbol-opacity:${Math.round(style.fillOpacity * 100)}%;--symbol-width:${style.lineWidth}px;--symbol-radius:${style.pointRadius}px" aria-label="Editar símbolo da camada" title="Editar propriedades"></span>`; }
  function displayName(camada) { return GeoespacialMap.getLayerProperties(camada.id).alias || camada.nome; }
  function openProperties(camada, row) {
    const tab = document.querySelector('[data-context-tab="properties"]'); tab.hidden = false; activateContextTab("properties");
    const style = GeoespacialMap.getLayerStyle(camada.id), saved = GeoespacialMap.getLayerProperties(camada.id), host = document.getElementById("geoespacial-properties-content");
    host.innerHTML = `<form class="geo-properties-form"><label>Alias da camada<input name="alias" value="${escapeHtml(saved.alias || camada.nome)}" required></label><div class="geo-properties-grid"><label>Cor do contorno/linha<input name="color" type="color" value="${style.color}"></label><label>Cor do preenchimento<input name="fillColor" type="color" value="${style.fillColor || style.color}"></label><label>Espessura da linha (px)<input name="lineWidth" type="number" min="0.5" max="12" step="0.5" value="${style.lineWidth}"></label><label>Tamanho do ponto (px)<input name="pointRadius" type="number" min="2" max="24" step="0.5" value="${style.pointRadius}"></label><label>Tipo de linha<select name="lineStyle"><option value="solid">Contínua</option><option value="dashed">Tracejada</option><option value="dotted">Pontilhada</option></select></label><label>Preenchimento<select name="fillMode"><option value="translucent">Translúcido</option><option value="solid">Sólido</option><option value="outline">Somente contorno</option></select></label></div><label>Opacidade do preenchimento<input name="fillOpacity" type="range" min="0" max="1" step="0.05" value="${style.fillOpacity}"></label><div class="geo-properties-feedback"></div><footer><button class="btn btn-primary" type="submit">Salvar propriedades</button></footer></form>`;
    const form = host.querySelector("form"); form.elements.lineStyle.value = style.lineStyle || "solid"; form.elements.fillMode.value = style.fillMode || "translucent";
    form.addEventListener("submit", (event) => { event.preventDefault(); const data = new FormData(form), props = { alias: String(data.get("alias")).trim(), color: String(data.get("color")), fillColor: String(data.get("fillColor")), lineWidth: Number(data.get("lineWidth")), pointRadius: Number(data.get("pointRadius")), lineStyle: String(data.get("lineStyle")), fillMode: String(data.get("fillMode")), fillOpacity: Number(data.get("fillOpacity")) }; GeoespacialMap.saveLayerProperties(camada.id, props); row.querySelector(".layer-group-name").textContent = props.alias; row.querySelector(".geo-layer-tree-symbol").outerHTML = layerSymbol(camada); renderLegend(); form.querySelector(".geo-properties-feedback").textContent = "Propriedades salvas e aplicadas."; });
  }
  function renderLegend() {
    const rows = camadas.filter((camada) => camadasVisiveis.has(camada.id)).map((camada) => { const symbol = geometryType(camada), style = GeoespacialMap.getLayerStyle(camada.id); return `<div class="geo-legend-item"><span class="geo-legend-symbol geo-legend-symbol--${symbol}" style="--legend-color:${style.fillColor || style.color};--legend-opacity:${Math.round(style.fillOpacity * 100)}%;--legend-width:${style.lineWidth}px;--legend-radius:${style.pointRadius}px"></span><span>${escapeHtml(displayName(camada))}</span></div>`; }).join("");
    document.getElementById("geoespacial-legend").innerHTML = rows || '<p class="hint">Ative a camada para visualizar sua legenda.</p>';
  }
  async function mapReady() { const map = GeoespacialMap.map; if (map?.isStyleLoaded()) return; await new Promise((resolve) => map.once("load", resolve)); }
  function detail(camada) {
    document.querySelectorAll(".geo-layer-record").forEach((item) => item.classList.toggle("active", item.dataset.id === camada.id));
    const linhas = [["Saída", camada.nome], ["Geometria", camada.geometria_tipo], ["Camada de entrada", camada.entrada], ["Operação", camada.operacao], ["Categorias", camada.categorias], ["Ocorrências", camada.ocorrencias], ["Parcela da entrada", camada.parcela], ["Data da extração", formatDate(camada.data)], ["CRS", "EPSG:4674 (SIRGAS 2000)"], ["Execução", camada.execucao]];
    document.getElementById("geoespacial-details-content").innerHTML = `<div class="geoespacial-detail-grid">${linhas.map(([rotulo, valor]) => `<div class="geoespacial-detail-row"><span>${rotulo}</span><strong>${escapeHtml(valor ?? "—")}</strong></div>`).join("")}</div>`;
    showDetails();
  }
  function detailBasemap(item) {
    document.querySelectorAll(".geo-layer-record").forEach((row) => row.classList.toggle("active", row.dataset.basemapId === item.id));
    document.getElementById("geoespacial-details-content").innerHTML = `<div class="geoespacial-detail-grid"><div class="geoespacial-detail-row"><span>Mapa-base</span><strong>${escapeHtml(item.name)}</strong></div><div class="geoespacial-detail-row"><span>Tipo</span><strong>${item.style ? "Camada vetorial de referência" : "Camada raster de referência"}</strong></div><div class="geoespacial-detail-row"><span>Provedor</span><strong>${escapeHtml(item.provider)}</strong></div><div class="geoespacial-detail-row"><span>Data de referência</span><strong>${escapeHtml(item.referenceDate)}</strong></div><div class="geoespacial-detail-row"><span>Uso</span><strong>Contexto cartográfico; não participa dos cálculos.</strong></div></div>`;
    showDetails();
  }
  function selecionarBasemap(id) {
    basemapAtual = BASEMAPS.some((item) => item.id === id) ? id : "osm"; localStorage.setItem("geoespacial-camadas-basemap", basemapAtual);
    const visible = document.getElementById("toggle-basemap-group")?.checked !== false, mapa = GeoespacialMap.map;
    if (mapa) BASEMAPS.forEach((item) => { const alvo = visible && item.id === basemapAtual ? "visible" : "none"; const pref = `camadas-basemap-${item.id}`; mapa.getStyle().layers.forEach((layer) => { if (layer.id === pref || layer.id.startsWith(`${pref}-`)) mapa.setLayoutProperty(layer.id, "visibility", alvo); }); });
    detailBasemap(BASEMAPS.find((item) => item.id === basemapAtual));
  }
  async function toggle(camada, visible) {
    if (!visible) { camadasVisiveis.delete(camada.id); GeoespacialMap.toggleLayer(camada.id, false); renderLegend(); return; }
    detail(camada); camadasVisiveis.add(camada.id); renderLegend();
    if (GeoespacialMap.layers.has(camada.id)) return GeoespacialMap.toggleLayer(camada.id, true);
    await mapReady();
    GeoespacialMap.addVectorTileLayer(camada.id, `${API}/camadas/${encodeURIComponent(camada.id)}/tiles/{z}/{x}/{y}.pbf`, { uniqueStyle: true, label: displayName(camada), labelsVisible: rotulosAtivos });
    const response = await fetch(`${API}/camadas/${encodeURIComponent(camada.id)}/bounds`);
    if (!response.ok) throw new Error("Extensão da camada indisponível");
    GeoespacialMap.layers.get(camada.id).bounds = (await response.json()).bounds;
    GeoespacialMap.fitBounds(camada.id);
  }
  function render() {
    const container = document.getElementById("geoespacial-layers-list"), basemapContainer = document.getElementById("geoespacial-basemap-list");
    document.getElementById("viewer-layer-count").textContent = String(camadas.length);
    container.innerHTML = camadas.length ? camadas.map((camada) => `<div class="layer-group layer-group--record geo-layer-record" data-id="${escapeHtml(camada.id)}"><div class="layer-group-header-row"><label class="layer-visibility-toggle" for="layer-saida"><input type="checkbox" class="layer-visibility-input" id="layer-saida"></label><button type="button" class="layer-group-header layer-group-header--record" aria-expanded="false"><span class="layer-group-toggle" aria-hidden="true">›</span><span class="geo-layer-copy"><span class="layer-group-name">${escapeHtml(displayName(camada))}</span>${layerSymbol(camada)}</span></button></div></div>`).join("") : `<p class="layers-empty layers-empty--nested">${escapeHtml(aviso || "Abra este visualizador pela coluna Ação da tabela de extrações de atributos.")}</p>`;
    basemapContainer.innerHTML = BASEMAPS.map((item) => `<div class="layer-group layer-group--record geo-layer-record" data-basemap-id="${item.id}"><div class="layer-group-header-row"><label class="layer-visibility-toggle"><input class="layer-visibility-input" type="radio" name="camadas-basemap" value="${item.id}" ${basemapAtual === item.id ? "checked" : ""}></label><button type="button" class="layer-group-header layer-group-header--record" aria-expanded="false"><span class="layer-group-toggle" aria-hidden="true">›</span><span class="geo-layer-copy"><span class="layer-group-name">${escapeHtml(item.name)}</span><span class="geo-layer-tree-symbol geo-layer-tree-symbol--basemap" aria-label="Símbolo de mapa-base"></span></span></button></div></div>`).join("");
    container.querySelectorAll(".geo-layer-record").forEach((item) => { const camada = camadas.find((value) => value.id === item.dataset.id); const button = item.querySelector("button"); button.addEventListener("click", () => { const expanded = item.classList.toggle("expanded"); button.setAttribute("aria-expanded", String(expanded)); detail(camada); }); item.querySelector("input").addEventListener("change", async (event) => { try { await toggle(camada, event.target.checked); } catch (error) { event.target.checked = false; aviso = error.message; } }); });
    basemapContainer.querySelectorAll(".geo-layer-record").forEach((row) => { const item = BASEMAPS.find((value) => value.id === row.dataset.basemapId), button = row.querySelector("button"); button.addEventListener("click", () => { const expanded = row.classList.toggle("expanded"); button.setAttribute("aria-expanded", String(expanded)); detailBasemap(item); }); row.querySelector("input").addEventListener("change", () => selecionarBasemap(item.id)); });
    container.onclick = (event) => { const symbol = event.target.closest(".geo-layer-tree-symbol"); if (!symbol) return; event.stopPropagation(); const row = symbol.closest(".geo-layer-record"), camada = camadas.find((value) => value.id === row.dataset.id); if (camada) openProperties(camada, row); };
  }
  async function load() {
    camadas = []; aviso = "";
    if (extracaoId) {
      try {
        const response = await fetch(`${API}/extracao-atributos/execucoes/${encodeURIComponent(extracaoId)}`);
        const job = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(job.detail || "Extração não encontrada.");
        if (job.status !== "concluido" || !job.resultado?.camada_resultado_id) throw new Error("Esta extração não tem geometria de saída disponível.");
        const resultado = job.resultado;
        camadas = [{ id: resultado.camada_resultado_id, nome: job.nome_saida || `Extração de ${resultado.input_nome}`, geometria_tipo: GEOMETRIAS[resultado.dimensao_input],
          entrada: resultado.input_nome, operacao: OPERACOES[resultado.operacao] || resultado.operacao, categorias: (resultado.categorias || []).map((c) => c.nome).join(", "),
          ocorrencias: resultado.resumo?.ocorrencias, parcela: typeof resultado.resumo?.percentual === "number" ? `${resultado.resumo.percentual.toLocaleString("pt-BR", { maximumFractionDigits: 4 })}%` : "—",
          data: resultado.criado_em, execucao: job.id }];
      } catch (error) { aviso = error.message; }
    }
    render();
    const input = document.querySelector("#geoespacial-layers-list .layer-visibility-input");
    if (camadas[0] && input) { input.checked = true; try { await toggle(camadas[0], true); } catch (error) { input.checked = false; aviso = error.message; } }
  }
  async function carregarEstiloVetorial(item, prefixo) {
    const estilo = await (await fetch(item.style)).json();
    const sufixo = `__${item.id}`, sources = {};
    Object.entries(estilo.sources || {}).forEach(([nome, src]) => { sources[`${nome}${sufixo}`] = { ...src, attribution: item.provider }; });
    const layers = (estilo.layers || []).map((layer, i) => { const novo = { ...layer, id: `${prefixo}${item.id}-${i}` }; if (novo.source) novo.source = `${novo.source}${sufixo}`; return novo; });
    return { sources, layers, glyphs: estilo.glyphs, sprite: estilo.sprite };
  }
  async function init() {
    const sources = {}, layers = [];
    let glyphs = "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf", sprite;
    for (const item of BASEMAPS) {
      const visivel = item.id === basemapAtual ? "visible" : "none";
      if (item.style) {
        try {
          const vetorial = await carregarEstiloVetorial(item, "camadas-basemap-");
          Object.assign(sources, vetorial.sources);
          vetorial.layers.forEach((layer) => layers.push({ ...layer, layout: { ...(layer.layout || {}), visibility: visivel } }));
          if (vetorial.glyphs) glyphs = vetorial.glyphs;
          if (vetorial.sprite) sprite = vetorial.sprite;
        } catch { /* mapa-base vetorial indisponível: os demais continuam */ }
      } else {
        sources[item.id] = { type: "raster", tiles: item.tiles, tileSize: 256, attribution: item.provider };
        layers.push({ id: `camadas-basemap-${item.id}`, type: "raster", source: item.id, layout: { visibility: visivel } });
      }
    }
    GeoespacialMap.init("map-geoespacial", { center: [-48.5, -22.4], zoom: 6.2, nativeTools: true, style: { version: 8, glyphs, ...(sprite ? { sprite } : {}), sources, layers } });
    document.querySelectorAll("[data-context-tab]").forEach((button) => button.addEventListener("click", () => activateContextTab(button.dataset.contextTab)));
    ["geo-operational-group", "geo-basemap-group"].forEach((id) => { const group = document.getElementById(id), header = group.querySelector(":scope > .layer-group-header-row .layer-group-header--tipo"); header.addEventListener("click", () => { const collapsed = group.classList.toggle("collapsed"); header.setAttribute("aria-expanded", String(!collapsed)); }); });
    const labelButton = document.getElementById("toggle-operational-labels"); labelButton.classList.toggle("is-active", rotulosAtivos); labelButton.setAttribute("aria-pressed", String(rotulosAtivos));
    labelButton.addEventListener("click", () => { rotulosAtivos = !rotulosAtivos; labelButton.classList.toggle("is-active", rotulosAtivos); labelButton.setAttribute("aria-pressed", String(rotulosAtivos)); localStorage.setItem("geoespacial-camadas-labels", String(rotulosAtivos)); camadas.forEach((camada) => GeoespacialMap.toggleLabels(camada.id, rotulosAtivos)); });
    document.getElementById("toggle-operational-group").addEventListener("change", (event) => { document.querySelectorAll("#geoespacial-layers-list .layer-visibility-input").forEach((input) => { if (input.checked !== event.target.checked) { input.checked = event.target.checked; input.dispatchEvent(new Event("change")); } }); });
    document.getElementById("toggle-basemap-group").addEventListener("change", () => selecionarBasemap(basemapAtual));
    activateContextTab("legend"); renderLegend();
    document.getElementById("btn-atualizar").addEventListener("click", load);
    await load();
  }
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", init) : init();
})();
