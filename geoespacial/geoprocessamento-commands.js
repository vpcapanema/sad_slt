(function () {
  "use strict";
  const API = "/api/geoespacial";
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const state = () => window.gpApp.state;
  const EXPLORE_CURSOR = `url("data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="white" stroke="#17212b" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12.586 12.586 19 19"/><path d="M3.117 3.117 10.5 21l2.7-7.8L21 10.5Z"/></svg>')}") 3 3, default`;

  function icons() { window.lucide?.createIcons({ attrs: { "stroke-width": 1.7 } }); }
  function escapeHtml(value) { return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char])); }
  function activeLayer() { const id = $("[data-layer].active")?.dataset.layer || state().activeLayerId; return state().layers.find(layer => layer.id === id) || null; }
  function notify(text) { const status = $("#gp-save-state"); status.textContent = text; clearTimeout(notify.timer); notify.timer = setTimeout(() => status.textContent = "Ambiente local", 3500); }

  function openPanel(title, html) {
    const tab = $('[data-right-tab="tools"]'); tab.hidden = false; tab.click();
    $("#gp-right-title").textContent = title; $("#gp-tools-view").classList.remove("active"); $("#gp-editor-view").classList.add("active");
    $("#gp-editor-view").innerHTML = `<div class="editor-head"><button class="icon-btn" data-command-back title="Voltar"><i data-lucide="arrow-left"></i></button><h2>${escapeHtml(title)}</h2></div>${html}`;
    $("[data-command-back]").onclick = () => window.gpApp.showTools(); icons();
  }

  async function request(url, options = {}) {
    const response = await fetch(url, { headers: { Accept: "application/json", ...(options.headers || {}) }, ...options });
    const body = await response.json(); if (!response.ok) throw new Error(body.detail || `HTTP ${response.status}`); return body;
  }

  function walkCoordinates(value, callback) { if (!Array.isArray(value)) return; if (typeof value[0] === "number") callback(value); else value.forEach(item => walkCoordinates(item, callback)); }
  function fitGeoJSON(data) { const bounds = new maplibregl.LngLatBounds(); data.features?.forEach(feature => walkCoordinates(feature.geometry?.coordinates, coord => bounds.extend(coord))); if (!bounds.isEmpty()) state().map.fitBounds(bounds, { padding: 40, maxZoom: 15 }); }

  async function fitAllLayers() {
    const bounds = new maplibregl.LngLatBounds();
    for (const layer of state().layers) {
      if (layer.tipo?.toLowerCase().includes("raster")) {
        const preview = await request(`${API}/camadas/${layer.id}/preview`); preview.coordinates.forEach(coord => bounds.extend(coord));
      } else {
        const data = await request(`${API}/camadas/${layer.id}/geojson`); data.features?.forEach(feature => walkCoordinates(feature.geometry?.coordinates, coord => bounds.extend(coord)));
      }
    }
    if (!bounds.isEmpty()) state().map.fitBounds(bounds, { padding: 40, maxZoom: 15 }); else notify("Não há camadas para ajustar.");
  }

  function removeSelectionLayers() {
    const map = state().map; ["gp-selection-point", "gp-selection-line", "gp-selection-fill"].forEach(id => { if (map.getLayer(id)) map.removeLayer(id); }); if (map.getSource("gp-selection")) map.removeSource("gp-selection");
  }
  function featureKey(properties = {}, featureId = null) {
    const identity = featureId ?? properties.OBJECTID ?? properties.ObjectID ?? properties.objectid ?? properties.FID ?? properties.fid ?? properties.id;
    return identity != null ? String(identity) : JSON.stringify(properties);
  }
  function tagSelection(data, layerId) {
    data.features = (data.features || []).map(feature => ({ ...feature, properties: { ...(feature.properties || {}), __gp_layer_id: layerId, __gp_selection_key: featureKey(feature.properties, feature.id) } }));
    return data;
  }
  function renderSelection(data) {
    removeSelectionLayers(); state().selectedGeoJSON = data;
    const map = state().map; map.addSource("gp-selection", { type: "geojson", data });
    map.addLayer({ id: "gp-selection-fill", type: "fill", source: "gp-selection", filter: ["==", ["geometry-type"], "Polygon"], paint: { "fill-color": "#00b7ff", "fill-opacity": .25, "fill-outline-color": "#00a1df" } });
    map.addLayer({ id: "gp-selection-line", type: "line", source: "gp-selection", paint: { "line-color": "#00b7ff", "line-width": 4 } });
    map.addLayer({ id: "gp-selection-point", type: "circle", source: "gp-selection", paint: { "circle-color": "#00b7ff", "circle-radius": 7, "circle-stroke-color": "#fff", "circle-stroke-width": 2 } });
    $("#gp-selection").textContent = `${data.features.length} selecionada${data.features.length === 1 ? "" : "s"}`;
    window.gpApp.syncAttributeSelection?.();
  }
  function clearSelection() { removeSelectionLayers(); state().selectedGeoJSON = { type: "FeatureCollection", features: [] }; $("#gp-selection").textContent = "0 selecionadas"; window.gpApp.syncAttributeSelection?.(); }
  function fitSelection() { const data = state().selectedGeoJSON; if (!data?.features?.length) return notify("Não há feições selecionadas."); fitGeoJSON(data); }

  function stopMapHandlers() {
    const map = state().map;
    if (state().selectionHandler) map.off("click", state().selectionHandler);
    if (state().exploreHandler) map.off("click", state().exploreHandler);
    state().selectionHandler = null; state().exploreHandler = null;
  }
  function popupHtml(feature, lngLat) {
    const layer = state().layers.find(item => item.id === feature.source), properties = feature.properties || {};
    const rows = Object.entries(properties).filter(([key]) => !key.startsWith("__gp_")).map(([key, value]) => `<tr><th>${escapeHtml(key)}</th><td>${escapeHtml(value)}</td></tr>`).join("");
    return `<section class="gp-identify-popup"><h3>${escapeHtml(layer?.nome || feature.source)}</h3><div class="gp-popup-attributes"><table><tbody>${rows || '<tr><td>Sem atributos.</td></tr>'}</tbody></table></div><p>${lngLat.lng.toFixed(6)}, ${lngLat.lat.toFixed(6)}</p></section>`;
  }
  function explore() {
    const map = state().map; stopMapHandlers(); map.dragPan.enable(); map.getCanvas().style.cursor = EXPLORE_CURSOR;
    state().exploreHandler = event => {
      const box = [[event.point.x - 4, event.point.y - 4], [event.point.x + 4, event.point.y + 4]], allowed = new Set(state().layers.map(layer => layer.id));
      const feature = map.queryRenderedFeatures(box).find(item => allowed.has(item.source));
      if (!feature) return;
      new maplibregl.Popup({ closeButton: true, closeOnClick: true, maxWidth: "380px" }).setLngLat(event.lngLat).setHTML(popupHtml(feature, event.lngLat)).addTo(map);
    };
    map.on("click", state().exploreHandler); notify("Explorar ativo: clique em uma feição para consultar seus atributos.");
  }
  function selectOnMap() {
    const map = state().map; stopMapHandlers(); map.dragPan.disable(); map.getCanvas().style.cursor = "crosshair";
    state().selectionHandler = event => {
      const box = [[event.point.x - 4, event.point.y - 4], [event.point.x + 4, event.point.y + 4]];
      const allowed = new Set(state().layers.map(layer => layer.id)); const seen = new Set();
      const features = map.queryRenderedFeatures(box).filter(feature => allowed.has(feature.source)).filter(feature => { const key = `${feature.source}:${featureKey(feature.properties, feature.id)}`; if (seen.has(key)) return false; seen.add(key); return true; }).map(feature => ({ type: "Feature", geometry: feature.geometry, properties: { ...(feature.properties || {}), __gp_layer_id: feature.source, __gp_selection_key: featureKey(feature.properties, feature.id) } }));
      const previous = event.originalEvent.shiftKey ? (state().selectedGeoJSON?.features || []) : [];
      renderSelection({ type: "FeatureCollection", features: [...previous, ...features] });
    };
    map.on("click", state().selectionHandler); notify("Clique no mapa para selecionar; Shift adiciona à seleção.");
  }

  function showEnvironments() {
    const env = JSON.parse(localStorage.getItem("gp-environments") || "{}");
    openPanel("Ambientes de geoprocessamento", `<form id="gp-environments-form"><div class="editor-body"><div class="field"><label>CRS de saída padrão</label><input name="crs" value="${escapeHtml(env.crs || "")}" placeholder="Ex.: EPSG:31983"></div><div class="field"><label>Resolução raster padrão</label><input name="resolution" type="number" min="0" step="any" value="${escapeHtml(env.resolution || "")}" placeholder="Ex.: 50"></div><label class="field-check"><input name="overwrite" type="checkbox" ${env.overwrite ? "checked" : ""}> Sobrescrever saídas existentes</label><p class="field-help">Somente configurações reconhecidas pelo algoritmo aberto são aplicadas.</p></div><div class="editor-actions"><button class="btn primary">Salvar ambientes</button></div></form>`);
    $("#gp-environments-form").onsubmit = event => { event.preventDefault(); const form = event.target; localStorage.setItem("gp-environments", JSON.stringify({ crs: form.crs.value.trim(), resolution: form.resolution.value, overwrite: form.overwrite.checked })); notify("Ambientes salvos."); };
  }
  function applyEnvironments(form) {
    if (!form) return; const env = JSON.parse(localStorage.getItem("gp-environments") || "{}");
    if (env.crs && form.elements.crs_destino) form.elements.crs_destino.value = env.crs;
    if (env.resolution) [...form.elements].filter(element => element.name?.startsWith("resolucao_")).forEach(element => element.value = env.resolution);
  }

  async function calculateField() {
    const layer = activeLayer(); if (!layer) return notify("Selecione uma camada vetorial.");
    openPanel("Calcular campo", `<form id="gp-calculate-field"><div class="editor-body"><div class="field"><label>Camada</label><input value="${escapeHtml(layer.nome)}" readonly></div><div class="field"><label>Campo de destino</label><input name="field" required></div><div class="field"><label>Expressão</label><textarea name="expression" required placeholder="Ex.: OBJECTID * 2"></textarea></div></div><div class="editor-actions"><button class="btn primary">Calcular</button></div></form>`);
    $("#gp-calculate-field").onsubmit = async event => { event.preventDefault(); try { const form = event.target; const params = new URLSearchParams({ campo: form.field.value, expressao: form.expression.value }); const result = await request(`${API}/camadas/${layer.id}/calcular-campo?${params}`, { method: "POST" }); notify(`${result.feicoes_atualizadas} registros atualizados.`); window.gpApp.showAttributes(layer.id); } catch (error) { notify(error.message); } };
  }

  async function queryPanel(mode) {
    const layer = activeLayer(); if (!layer) return notify("Selecione uma camada vetorial."); const filtering = mode === "filter";
    openPanel(filtering ? "Filtrar camada" : "Selecionar por atributo", `<form id="gp-query-attributes"><div class="editor-body"><div class="field"><label>Camada</label><input value="${escapeHtml(layer.nome)}" readonly></div><div class="field"><label>Expressão</label><textarea name="expression" required placeholder="Ex.: Municipio == 'Campinas'"></textarea></div><p class="field-help">Use nomes de campos, operadores ==, !=, &gt;, &lt;, and, or e valores entre aspas.</p></div><div class="editor-actions">${filtering ? '<button type="button" class="btn" data-clear-filter>Limpar filtro</button>' : ""}<button class="btn primary">${filtering ? "Aplicar filtro" : "Selecionar"}</button></div></form>`);
    const form = $("#gp-query-attributes");
    form.onsubmit = async event => { event.preventDefault(); try { const params = new URLSearchParams({ expressao: form.expression.value }); const result = await request(`${API}/camadas/${layer.id}/consultar-atributos?${params}`, { method: "POST" }); if (filtering) { state().map.getSource(layer.id).setData(result.geojson); state().layerFilters ??= {}; state().layerFilters[layer.id] = form.expression.value; notify(`${result.total} feições exibidas.`); } else { renderSelection(tagSelection(result.geojson, layer.id)); notify(`${result.total} feições selecionadas.`); } } catch (error) { notify(error.message); } };
    if (filtering) $("[data-clear-filter]").onclick = async () => { const data = await request(`${API}/camadas/${layer.id}/geojson`); state().map.getSource(layer.id).setData(data); delete state().layerFilters?.[layer.id]; form.expression.value = ""; notify("Filtro removido."); };
  }

  async function refreshSource() {
    const layer = activeLayer(); if (!layer) return notify("Selecione uma camada.");
    try {
      await request(`${API}/camadas/${layer.id}/atualizar-fonte`, { method: "POST" }); const map = state().map;
      [`${layer.id}-point`, `${layer.id}-line`, layer.id].forEach(id => { if (map.getLayer(id)) map.removeLayer(id); }); if (map.getSource(layer.id)) map.removeSource(layer.id);
      await window.gpApp.addCatalogLayerToMap(layer.id, false); window.gpApp.renderLayers(); notify("Fonte atualizada.");
    } catch (error) { notify(error.message); }
  }

  function definitionPool() { return [...state().functions.map(item => ({ kind: "functions", item })), ...state().flows.map(item => ({ kind: "flows", item }))]; }
  function definitionCommand(action) {
    const pool = definitionPool();
    if (action === "import") {
      openPanel("Importar definição", '<form id="gp-import-definition"><div class="editor-body"><div class="field"><label>Arquivo JSON</label><input name="file" type="file" accept="application/json,.json" required></div></div><div class="editor-actions"><button class="btn primary">Importar</button></div></form>');
      $("#gp-import-definition").onsubmit = async event => { event.preventDefault(); try { const raw = JSON.parse(await event.target.file.files[0].text()), item = raw.definicao || raw, kind = item.passos ? "functions" : item.itens ? "flows" : null; if (!kind) throw new Error("Definição JSON inválida"); item.id = `${kind === "functions" ? "funcao" : "fluxo"}_${Date.now()}`; const saved = await request(`${API}/${kind === "functions" ? "funcoes" : "fluxos"}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(item) }); state()[kind].push(saved); window.gpApp.showLibrary(kind); notify("Definição importada."); } catch (error) { notify(error.message); } };
      return;
    }
    openPanel(action === "duplicate" ? "Duplicar definição" : "Exportar definição", `<form id="gp-definition-command"><div class="editor-body"><div class="field"><label>Definição</label><select name="definition" required><option value="">Selecione…</option>${pool.map(({ kind, item }) => `<option value="${kind}:${escapeHtml(item.id)}">${kind === "functions" ? "Função" : "Fluxo"} · ${escapeHtml(item.nome)}</option>`).join("")}</select></div></div><div class="editor-actions"><button class="btn primary">${action === "duplicate" ? "Duplicar" : "Exportar JSON"}</button></div></form>`);
    $("#gp-definition-command").onsubmit = async event => { event.preventDefault(); try { const [kind, ...parts] = event.target.definition.value.split(":"), id = parts.join(":"), entry = pool.find(value => value.kind === kind && value.item.id === id); if (!entry) throw new Error("Selecione uma definição"); const copy = structuredClone(entry.item); if (action === "duplicate") { copy.id = `${kind === "functions" ? "funcao" : "fluxo"}_${Date.now()}`; copy.nome = `${copy.nome} (cópia)`; const saved = await request(`${API}/${kind === "functions" ? "funcoes" : "fluxos"}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(copy) }); state()[kind].push(saved); window.gpApp.showLibrary(kind); notify("Definição duplicada."); } else { const blob = new Blob([JSON.stringify({ tipo: kind, definicao: copy }, null, 2)], { type: "application/json" }), url = URL.createObjectURL(blob), link = document.createElement("a"); link.href = url; link.download = `${copy.id}.json`; link.click(); URL.revokeObjectURL(url); notify("Definição exportada."); } } catch (error) { notify(error.message); } };
  }

  window.gpCommands = { activeLayer, notify, openPanel, fitAllLayers, fitSelection, selectOnMap, explore, clearSelection, showEnvironments, applyEnvironments, calculateField, selectByAttribute: () => queryPanel("select"), filterLayer: () => queryPanel("filter"), refreshSource, duplicateDefinition: () => definitionCommand("duplicate"), importDefinition: () => definitionCommand("import"), exportDefinition: () => definitionCommand("export") };
})();
