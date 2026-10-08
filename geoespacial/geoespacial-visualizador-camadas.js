/* Visualizador de Camadas Geoespaciais — Módulo Geoespacial
 * Três fontes na barra lateral, além dos mapas-base:
 *   - Geometria de saída: resultado de uma extração de atributos (?extracao=<id>),
 *     desenhado em tiles vetoriais do banco;
 *   - PostGIS: geometrias materializadas de planos, programas e projetos
 *     (demandas.*.geometria), uma camada GeoJSON por registro;
 *   - SICARD Storage: pastas publicadas do storage, lidas sob demanda —
 *     cada pasta é um subnível do menu, cada arquivo geoespacial uma camada
 *     (tiles vetoriais gerados do arquivo). */
(function () {
  "use strict";
  const API = "/api/geoespacial";
  const extracaoId = new URLSearchParams(location.search).get("extracao");
  let camadas = [];
  let aviso = "";
  // Todas as camadas conhecidas (saída, PostGIS e storage), por id.
  const registro = new Map();
  const contagensStorage = new Map();
  const falhasContagensStorage = new Set();
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
  const POSTGIS_TIPOS = [
    { tipo: "plano", rotulo: "Plano", tabela: "demandas.plano" },
    { tipo: "programa", rotulo: "Programa", tabela: "demandas.programa" },
    { tipo: "projeto", rotulo: "Projeto", tabela: "demandas.projeto" },
  ];
  const STORAGE_RAIZES = [
    { caminho: "base-geodatabase", rotulo: "Base-Geodatabase" },
    { caminho: "base-geoespacial", rotulo: "Base-Geoespacial" },
    { caminho: "superficies-indices", rotulo: "Superfícies-Índice" },
  ];
  // Siglas preservadas ao humanizar nomes de arquivo do storage.
  const SIGLAS = new Set(["sp", "aprm", "ucs", "uc", "ibama", "cetesb", "iphan", "condephaat", "sigam", "uf", "ig", "mma", "pli", "pef", "zee", "ugrhi", "ra", "rg", "rm", "sma", "idesp", "sicg", "cecav", "incra", "pol", "pto", "lin"]);
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  function formatDate(value) { if (!value) return "—"; const date = new Date(value); return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(date); }
  function humanizar(nome) {
    return String(nome || "").replace(/\.[a-z0-9]+$/i, "").split(/[_\-\s]+/).filter(Boolean)
      .map((parte) => { const baixo = parte.toLowerCase(); if (SIGLAS.has(baixo)) return baixo === "ucs" ? "UCs" : baixo.toUpperCase(); if (/^\d/.test(parte)) return parte; return baixo.charAt(0).toUpperCase() + baixo.slice(1); })
      .join(" ");
  }
  function domId(valor) { return String(valor).replace(/[^a-zA-Z0-9_-]/g, "_"); }
  function activateContextTab(name) {
    document.querySelectorAll("[data-context-tab]").forEach((button) => { const active = button.dataset.contextTab === name; button.classList.toggle("active", active); button.setAttribute("aria-selected", String(active)); });
    document.querySelectorAll("[data-context-content]").forEach((panel) => { const active = panel.dataset.contextContent === name; panel.classList.toggle("active", active); panel.hidden = !active; });
  }
  function setContextCollapsed(collapsed) {
    const panel = document.querySelector(".geo-context-panel"), button = document.getElementById("geo-context-toggle");
    panel.classList.toggle("is-collapsed", collapsed);
    button.setAttribute("aria-expanded", String(!collapsed));
    button.setAttribute("aria-label", `${collapsed ? "Expandir" : "Recolher"} legenda e detalhes`);
    button.title = button.getAttribute("aria-label");
    button.querySelector("i").className = `fa-solid fa-chevron-${collapsed ? "down" : "up"}`;
  }
  function showDetails() { const tab = document.querySelector('[data-context-tab="details"]'); tab.hidden = false; activateContextTab("details"); setContextCollapsed(false); }
  function geometryType(camada) { const type = String(camada.geometria_tipo || "").toLowerCase(); return type.includes("ponto") || type.includes("point") ? "point" : type.includes("linha") || type.includes("line") ? "line" : "polygon"; }
  function layerSymbol(camada) { const type = geometryType(camada), style = GeoespacialMap.getLayerStyle(camada.id); return `<span class="geo-layer-tree-symbol geo-layer-tree-symbol--${type}" style="--symbol-color:${style.color};--symbol-fill:${style.fillColor || style.color};--symbol-opacity:${Math.round(style.fillOpacity * 100)}%;--symbol-width:${style.lineWidth}px;--symbol-radius:${style.pointRadius}px" aria-label="Editar símbolo da camada" title="Editar propriedades"></span>`; }
  function displayName(camada) { return GeoespacialMap.getLayerProperties(camada.id).alias || camada.nome; }
  function statusBadge(camada) {
    if (!camada.status || !window.SLTStatusColors) return "";
    const st = SLTStatusColors.getStatusDemanda(camada.status);
    return `<span class="${SLTStatusColors.badgeClass(camada.status)}${SLTStatusColors.actionClass(camada.status)}">${escapeHtml(st.nome)}</span>`;
  }
  function openProperties(camada, row) {
    setContextCollapsed(false);
    const tab = document.querySelector('[data-context-tab="properties"]'); tab.hidden = false; activateContextTab("properties");
    const style = GeoespacialMap.getLayerStyle(camada.id), saved = GeoespacialMap.getLayerProperties(camada.id), host = document.getElementById("geoespacial-properties-content");
    host.innerHTML = `<form class="geo-properties-form"><label>Alias da camada<input name="alias" value="${escapeHtml(saved.alias || camada.nome)}" required></label><div class="geo-properties-grid"><label>Cor do contorno/linha<input name="color" type="color" value="${style.color}"></label><label>Cor do preenchimento<input name="fillColor" type="color" value="${style.fillColor || style.color}"></label><label>Espessura da linha (px)<input name="lineWidth" type="number" min="0.5" max="12" step="0.5" value="${style.lineWidth}"></label><label>Tamanho do ponto (px)<input name="pointRadius" type="number" min="2" max="24" step="0.5" value="${style.pointRadius}"></label><label>Tipo de linha<select name="lineStyle"><option value="solid">Contínua</option><option value="dashed">Tracejada</option><option value="dotted">Pontilhada</option></select></label><label>Preenchimento<select name="fillMode"><option value="translucent">Translúcido</option><option value="solid">Sólido</option><option value="outline">Somente contorno</option></select></label></div><label>Opacidade do preenchimento<input name="fillOpacity" type="range" min="0" max="1" step="0.05" value="${style.fillOpacity}"></label><div class="geo-properties-feedback"></div><footer><button class="btn btn-primary" type="submit">Salvar propriedades</button></footer></form>`;
    const form = host.querySelector("form"); form.elements.lineStyle.value = style.lineStyle || "solid"; form.elements.fillMode.value = style.fillMode || "translucent";
    form.addEventListener("submit", (event) => { event.preventDefault(); const data = new FormData(form), props = { alias: String(data.get("alias")).trim(), color: String(data.get("color")), fillColor: String(data.get("fillColor")), lineWidth: Number(data.get("lineWidth")), pointRadius: Number(data.get("pointRadius")), lineStyle: String(data.get("lineStyle")), fillMode: String(data.get("fillMode")), fillOpacity: Number(data.get("fillOpacity")) }; GeoespacialMap.saveLayerProperties(camada.id, props); row.querySelector(".layer-group-name").textContent = props.alias; row.querySelector(".geo-layer-tree-symbol").outerHTML = layerSymbol(camada); renderLegend(); form.querySelector(".geo-properties-feedback").textContent = "Propriedades salvas e aplicadas."; });
  }
  function renderLegend() {
    const rows = [...registro.values()].filter((camada) => camadasVisiveis.has(camada.id)).map((camada) => { const symbol = geometryType(camada), style = GeoespacialMap.getLayerStyle(camada.id); return `<div class="geo-legend-item"><span class="geo-legend-symbol geo-legend-symbol--${symbol}" style="--legend-color:${style.fillColor || style.color};--legend-opacity:${Math.round(style.fillOpacity * 100)}%;--legend-width:${style.lineWidth}px;--legend-radius:${style.pointRadius}px"></span><span>${escapeHtml(displayName(camada))}</span></div>`; }).join("");
    document.getElementById("geoespacial-legend").innerHTML = rows || '<p class="hint">Ative uma camada para visualizar sua legenda.</p>';
  }
  async function mapReady() { const map = GeoespacialMap.map; if (map?.isStyleLoaded()) return; await new Promise((resolve) => map.once("load", resolve)); }
  function detailRows(linhas) { return `<div class="geoespacial-detail-grid">${linhas.map(([rotulo, valor]) => `<div class="geoespacial-detail-row"><span>${rotulo}</span><strong>${escapeHtml(valor ?? "—")}</strong></div>`).join("")}</div>`; }
  function detail(camada) {
    document.querySelectorAll(".geo-layer-record").forEach((item) => item.classList.toggle("active", item.dataset.id === camada.id));
    let linhas;
    if (camada.fonte === "postgis") {
      linhas = [["Fonte", `PostGIS · ${camada.tabela}`], ["Tipo", camada.tipoRotulo], ["Código", camada.codigo], ["Nome", camada.nome], ["Status", camada.status ? (window.SLTStatusColors?.getStatusDemanda(camada.status).nome || camada.status) : "—"], ["Geometria", camada.geometria_tipo], ["Cadastro", formatDate(camada.criado_em)], ["CRS", "EPSG:4326 (WGS 84)"]];
    } else if (camada.fonte === "storage") {
      linhas = [["Fonte", "SICARD Storage"], ["Arquivo", camada.arquivo], ["Camada no arquivo", camada.camada || "—"], ["Formato", camada.formato || "—"], ["Geometria", camada.geometria_tipo || "—"], ["Feições", camada.feicoes ?? "—"], ["CRS", camada.crs || "—"], ["Modificado em", camada.modificado_em ? formatDate(camada.modificado_em * 1000) : "—"]];
    } else {
      linhas = [["Saída", camada.nome], ["Fonte", "Sicard Storage"], ["Arquivo", camada.arquivo], ["Geometria", camada.geometria_tipo], ["Ferramenta", camada.ferramenta], ["Operação", camada.operacao], ["Data", formatDate(camada.criado_em)], ["CRS", camada.crs], ["Execução", camada.execucao_id]];
    }
    document.getElementById("geoespacial-details-content").innerHTML = detailRows(linhas);
    showDetails();
  }
  function detailBasemap(item) {
    document.querySelectorAll(".geo-layer-record").forEach((row) => row.classList.toggle("active", row.dataset.basemapId === item.id));
    document.getElementById("geoespacial-details-content").innerHTML = detailRows([["Mapa-base", item.name], ["Tipo", item.style ? "Camada vetorial de referência" : "Camada raster de referência"], ["Provedor", item.provider], ["Data de referência", item.referenceDate], ["Uso", "Contexto cartográfico; não participa dos cálculos."]]);
    showDetails();
  }
  function selecionarBasemap(id) {
    basemapAtual = BASEMAPS.some((item) => item.id === id) ? id : "osm"; localStorage.setItem("geoespacial-camadas-basemap", basemapAtual);
    const visible = document.getElementById("toggle-basemap-group")?.checked !== false, mapa = GeoespacialMap.map;
    if (mapa) BASEMAPS.forEach((item) => { const alvo = visible && item.id === basemapAtual ? "visible" : "none"; const pref = `camadas-basemap-${item.id}`; mapa.getStyle().layers.forEach((layer) => { if (layer.id === pref || layer.id.startsWith(`${pref}-`)) mapa.setLayoutProperty(layer.id, "visibility", alvo); }); });
    detailBasemap(BASEMAPS.find((item) => item.id === basemapAtual));
  }
  /* Liga/desliga uma camada de qualquer fonte, criando-a no mapa na primeira vez. */
  async function toggle(camada, visible) {
    if (!visible) { camadasVisiveis.delete(camada.id); GeoespacialMap.toggleLayer(camada.id, false); renderLegend(); return; }
    detail(camada); camadasVisiveis.add(camada.id); renderLegend();
    if (GeoespacialMap.layers.has(camada.id)) return GeoespacialMap.toggleLayer(camada.id, true);
    await mapReady();
    const opcoes = { uniqueStyle: true, label: displayName(camada), labelsVisible: rotulosAtivos && camada.fonte === "saida" };
    if (!camadasVisiveis.has(camada.id)) return;
    if (camada.fonte.startsWith("saida") && camada.tipo === "raster") {
      const previewUrl = camada.fonte === "saida_arquivo" ? `${API}/saidas/raster-preview?caminho=${encodeURIComponent(camada.arquivo)}` : `${API}/camadas/${encodeURIComponent(camada.id)}/preview`;
      const response = await fetch(previewUrl);
      const preview = await response.json();
      if (!response.ok) throw new Error(preview.detail || "Preview raster indisponível");
      if (!camadasVisiveis.has(camada.id)) return;
      GeoespacialMap.addRasterImageLayer(camada.id, preview);
    } else if (camada.fonte === "postgis") {
      GeoespacialMap.addLayer(camada.id, camada.geojson, opcoes);
      GeoespacialMap.layers.get(camada.id).bounds = camada.bounds;
    } else if (camada.fonte === "storage" && /\.(zip|kmz|rar|7z|tar|tgz|tbz2|txz|gz|bz2|xz)$/i.test(camada.arquivo)) {
      const response = await fetch(`${API}/extracao-atributos/arquivo-mapa`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: camada.id }) });
      const dados = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(dados.detail || "Não foi possível abrir a camada do pacote.");
      if (!camadasVisiveis.has(camada.id)) return;
      GeoespacialMap.addLayer(camada.id, dados.geojson, opcoes);
    } else if (camada.fonte === "storage" || camada.fonte === "saida_arquivo") {
      const consulta = `caminho=${encodeURIComponent(camada.arquivo)}${camada.camada ? `&camada=${encodeURIComponent(camada.camada)}` : ""}`;
      GeoespacialMap.addVectorTileLayer(camada.id, `${API}/storage/camada/tiles/{z}/{x}/{y}.pbf?${consulta}`, opcoes);
      const response = await fetch(`${API}/storage/camada/bounds?${consulta}`);
      if (!response.ok) throw new Error("Extensão da camada indisponível");
      GeoespacialMap.layers.get(camada.id).bounds = (await response.json()).bounds;
    } else {
      GeoespacialMap.addVectorTileLayer(camada.id, `${API}/camadas/${encodeURIComponent(camada.id)}/tiles/{z}/{x}/{y}.pbf`, opcoes);
      const response = await fetch(`${API}/camadas/${encodeURIComponent(camada.id)}/bounds`);
      if (!response.ok) throw new Error("Extensão da camada indisponível");
      GeoespacialMap.layers.get(camada.id).bounds = (await response.json()).bounds;
    }
    GeoespacialMap.toggleLayer(camada.id, camadasVisiveis.has(camada.id));
    if (camadasVisiveis.has(camada.id)) GeoespacialMap.fitBounds(camada.id);
  }
  /* Linha de camada (checkbox + nome + símbolo), igual nas três fontes. */
  function layerRowHtml(camada) {
    registro.set(camada.id, camada);
    const inputId = `layer-${domId(camada.id)}`;
    return `<div class="layer-group layer-group--record geo-layer-record" data-id="${escapeHtml(camada.id)}"><div class="layer-group-header-row"><label class="layer-visibility-toggle" for="${inputId}"><input type="checkbox" class="layer-visibility-input" id="${inputId}" ${camadasVisiveis.has(camada.id) ? "checked" : ""}></label><button type="button" class="layer-group-header layer-group-header--record" aria-expanded="false"><span class="layer-group-toggle" aria-hidden="true">›</span><span class="geo-layer-copy"><span class="layer-group-name">${escapeHtml(displayName(camada))}</span>${statusBadge(camada)}${layerSymbol(camada)}</span></button></div></div>`;
  }
  function bindLayerRows(container) {
    container.querySelectorAll(".geo-layer-record:not([data-bound])").forEach((item) => {
      item.dataset.bound = "1";
      const camada = registro.get(item.dataset.id); if (!camada) return;
      const button = item.querySelector(":scope > .layer-group-header-row button");
      button.addEventListener("click", (event) => { if (event.target.closest(".geo-layer-tree-symbol")) return; const expanded = item.classList.toggle("expanded"); button.setAttribute("aria-expanded", String(expanded)); detail(camada); });
      item.querySelector(":scope > .layer-group-header-row input").addEventListener("change", async (event) => { try { await toggle(camada, event.target.checked); } catch (error) { event.target.checked = false; camadasVisiveis.delete(camada.id); GeoespacialMap.removeLayer(camada.id); aviso = error.message; document.getElementById("geoespacial-details-content").innerHTML = `<p class="hint" role="alert">${escapeHtml(error.message)}</p>`; renderLegend(); } });
    });
    if (!container.dataset.symbolBound) {
      container.dataset.symbolBound = "1";
      container.addEventListener("click", (event) => { const symbol = event.target.closest(".geo-layer-tree-symbol"); if (!symbol) return; event.stopPropagation(); const row = symbol.closest(".geo-layer-record"), camada = registro.get(row?.dataset.id); if (camada) openProperties(camada, row); });
    }
  }
  /* Pasta (subnível do menu): cabeçalho recolhível e corpo preenchido sob demanda. */
  function folderHtml({ id, rotulo, caminho, aberto = false, carregado = false, contagem = "0" }) {
    if (caminho) contagem = contagensStorage.has(caminho) ? contagensStorage.get(caminho) : "…";
    return `<div class="layer-group layer-group--pasta geo-layer-folder${aberto ? "" : " collapsed"}" data-folder-id="${escapeHtml(id)}" ${caminho ? `data-caminho="${escapeHtml(caminho)}"` : ""} ${carregado ? 'data-carregado="1"' : ""}><div class="layer-group-header-row"><label class="layer-visibility-toggle" title="Exibir ou ocultar as camadas desta pasta"><input type="checkbox" class="layer-visibility-input layer-visibility-input--group" checked></label><button type="button" class="layer-group-header layer-group-header--record layer-group-header--pasta" aria-expanded="${aberto}"><span class="layer-group-toggle" aria-hidden="true">▼</span><span class="geo-layer-copy"><i class="fa-solid fa-folder geo-layer-folder-icon" aria-hidden="true"></i><span class="layer-group-name">${escapeHtml(rotulo)}</span><span class="layer-group-active-count geo-layer-folder-count">${escapeHtml(contagem)}</span></span></button></div><div class="layer-group-body geo-layer-folder-body" role="group">${carregado ? "" : '<p class="layers-empty layers-empty--nested hint">Carregando…</p>'}</div></div>`;
  }
  function bindFolders(container, carregar) {
    container.querySelectorAll(".geo-layer-folder:not([data-bound])").forEach((pasta) => {
      pasta.dataset.bound = "1";
      const header = pasta.querySelector(":scope > .layer-group-header-row button");
      header.addEventListener("click", async () => {
        const collapsed = pasta.classList.toggle("collapsed"); header.setAttribute("aria-expanded", String(!collapsed));
        if (!collapsed && !pasta.dataset.carregado && !pasta.dataset.carregando && carregar) { pasta.dataset.carregando = "1"; try { await carregar(pasta); } finally { delete pasta.dataset.carregando; } }
      });
      pasta.querySelector(":scope > .layer-group-header-row input").addEventListener("change", (event) => {
        pasta.querySelectorAll(":scope > .geo-layer-folder-body .layer-visibility-input").forEach((input) => { if (input.checked !== event.target.checked) { input.checked = event.target.checked; input.dispatchEvent(new Event("change")); } });
      });
      if (!pasta.classList.contains("collapsed") && !pasta.dataset.carregado && !pasta.dataset.carregando && carregar) { pasta.dataset.carregando = "1"; carregar(pasta).finally(() => { delete pasta.dataset.carregando; }); }
    });
  }
  function atualizarContagem(pasta) {
    for (let grupo = pasta; grupo; grupo = grupo.parentElement?.closest(".geo-layer-folder")) {
      const total = grupo.dataset.caminho ? contagensStorage.get(grupo.dataset.caminho) : grupo.querySelectorAll(".geo-layer-record").length;
      const alvo = grupo.querySelector(":scope > .layer-group-header-row .geo-layer-folder-count"); if (alvo) alvo.textContent = total == null ? "…" : String(total);
    }
  }
  /* ---------- Geometria de saída ---------- */
  function render() {
    const container = document.getElementById("geoespacial-layers-list"), basemapContainer = document.getElementById("geoespacial-basemap-list");
    document.getElementById("viewer-layer-count").textContent = String(camadas.length);
    container.innerHTML = camadas.length ? arvoreSaidas() : `<p class="layers-empty layers-empty--nested">${escapeHtml(aviso || "Nenhuma saída geoespacial disponível.")}</p>`;
    bindFolders(container);
    bindLayerRows(container);
    basemapContainer.innerHTML = BASEMAPS.map((item) => `<div class="layer-group layer-group--record geo-layer-record" data-basemap-id="${item.id}"><div class="layer-group-header-row"><label class="layer-visibility-toggle"><input class="layer-visibility-input" type="radio" name="camadas-basemap" value="${item.id}" ${basemapAtual === item.id ? "checked" : ""}></label><button type="button" class="layer-group-header layer-group-header--record" aria-expanded="false"><span class="layer-group-toggle" aria-hidden="true">›</span><span class="geo-layer-copy"><span class="layer-group-name">${escapeHtml(item.name)}</span><span class="geo-layer-tree-symbol geo-layer-tree-symbol--basemap" aria-label="Símbolo de mapa-base"></span></span></button></div></div>`).join("");
    basemapContainer.querySelectorAll(".geo-layer-record").forEach((row) => { const item = BASEMAPS.find((value) => value.id === row.dataset.basemapId), button = row.querySelector("button"); button.addEventListener("click", () => { const expanded = row.classList.toggle("expanded"); button.setAttribute("aria-expanded", String(expanded)); detailBasemap(item); }); row.querySelector("input").addEventListener("change", () => selecionarBasemap(item.id)); });
  }
  function arvoreSaidas() {
    const ferramentas = new Map();
    camadas.forEach((camada) => {
      const chave = camada.ferramenta || camada.operacao || "Outras saídas";
      if (!ferramentas.has(chave)) ferramentas.set(chave, new Map());
      const execucoes = ferramentas.get(chave), execucao = camada.execucao_id;
      if (!execucoes.has(execucao)) execucoes.set(execucao, []);
      execucoes.get(execucao).push(camada);
    });
    const pasta = (id, nome, total, body) => folderHtml({id, rotulo:nome, contagem:String(total), carregado:true}).replace('<div class="layer-group-body geo-layer-folder-body" role="group"></div>', `<div class="layer-group-body geo-layer-folder-body" role="group">${body}</div>`);
    return [...ferramentas].map(([nome, execucoes]) => {
      const body = [...execucoes].map(([id, layers]) => pasta(`saida-${id}`, `${layers[0].nome} · ${formatDate(layers[0].criado_em)}`, layers.length, layers.map(layerRowHtml).join(""))).join("");
      const total = [...execucoes.values()].reduce((n,layers) => n + layers.length, 0);
      return pasta(`ferramenta-${domId(nome)}`, humanizar(nome), total, body);
    }).join("");
  }
  async function load() {
    camadas.forEach((camada) => registro.delete(camada.id));
    camadas = []; aviso = "";
    try {
      const response = await fetch(`${API}/saidas${extracaoId ? `?execucao_id=${encodeURIComponent(extracaoId)}` : ""}`);
      const rows = await response.json();
      if (!response.ok) throw new Error(rows.detail || "Não foi possível consultar as saídas.");
      camadas = rows.map((row) => ({...row, fonte:row.fonte || "saida"}));
      camadas.forEach((camada) => registro.set(camada.id, camada));
    } catch (error) { aviso = error.message; }
    render();
    const input = document.querySelector("#geoespacial-layers-list .layer-visibility-input");
    if (extracaoId && camadas[0] && input) { input.checked = true; try { await toggle(camadas[0], true); } catch (error) { input.checked = false; aviso = error.message; } }
  }
  /* ---------- PostGIS: Plano / Programa / Projeto ---------- */
  async function loadPostgis() {
    const host = document.getElementById("geoespacial-postgis-tree");
    host.innerHTML = POSTGIS_TIPOS.map((grupo) => folderHtml({ id: `postgis-${grupo.tipo}`, rotulo: grupo.rotulo, aberto: false, contagem: "…" })).join("");
    const contagens = new Map();
    const falhas = new Set();
    function atualizarTotal() {
      document.getElementById("postgis-layer-count").textContent = falhas.size ? "—" : contagens.size === POSTGIS_TIPOS.length ? String([...contagens.values()].reduce((soma, n) => soma + n, 0)) : "…";
    }
    atualizarTotal();
    const consultas = new Map();
    function consultar(grupo) {
      if (!consultas.has(grupo.tipo)) consultas.set(grupo.tipo, (async () => {
        const response = await fetch(`${API}/cadastro-geometrias/${grupo.tipo}`);
        const dados = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(dados.detail || "Cadastro indisponível.");
        return dados;
      })().catch((error) => { consultas.delete(grupo.tipo); throw error; }));
      return consultas.get(grupo.tipo);
    }
    bindFolders(host, async (pasta) => {
      const grupo = POSTGIS_TIPOS.find((item) => `postgis-${item.tipo}` === pasta.dataset.folderId), corpo = pasta.querySelector(":scope > .geo-layer-folder-body");
      try {
        const dados = await consultar(grupo);
        const itens = dados.itens.map((item) => ({ ...item, fonte: "postgis", tabela: grupo.tabela, tipoRotulo: grupo.rotulo }));
        corpo.innerHTML = itens.length ? itens.map(layerRowHtml).join("") : '<p class="layers-empty layers-empty--nested hint">Nenhum registro com geometria.</p>';
        bindLayerRows(corpo); pasta.dataset.carregado = "1";
        contagens.set(grupo.tipo, itens.length);
        falhas.delete(grupo.tipo);
        atualizarContagem(pasta);
      } catch (error) {
        falhas.add(grupo.tipo);
        corpo.innerHTML = `<p class="layers-empty layers-empty--nested hint">${escapeHtml(error.message)}</p>`;
        pasta.querySelector(".geo-layer-folder-count").textContent = "—";
      }
      atualizarTotal();
    });
    // Contagem total do grupo sem abrir as pastas.
    await Promise.all(POSTGIS_TIPOS.map(async (grupo) => {
      try {
        const dados = await consultar(grupo), n = dados.itens.length;
        contagens.set(grupo.tipo, n);
        const alvo = host.querySelector(`[data-folder-id="postgis-${grupo.tipo}"] .geo-layer-folder-count`);
        if (alvo) alvo.textContent = String(n);
      } catch { falhas.add(grupo.tipo); host.querySelector(`[data-folder-id="postgis-${grupo.tipo}"] .geo-layer-folder-count`).textContent = "—"; }
    }));
    atualizarTotal();
  }
  /* ---------- SICARD Storage: pastas sob demanda ---------- */
  async function carregarPastaStorage(pasta) {
    const corpo = pasta.querySelector(":scope > .geo-layer-folder-body");
    try {
      const response = await fetch(`${API}/storage/navegar?caminho=${encodeURIComponent(pasta.dataset.caminho)}`);
      const dados = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(dados.detail || "Pasta indisponível.");
      const subpastas = (dados.pastas || []).map((sub) => folderHtml({ id: `storage-${sub.caminho}`, rotulo: humanizar(sub.nome), caminho: sub.caminho })).join("");
      const arquivos = (dados.arquivos || []).map((item) => layerRowHtml({ ...item, fonte: "storage", nome: item.alias || humanizar(item.nome) })).join("");
      corpo.innerHTML = subpastas + arquivos || '<p class="layers-empty layers-empty--nested hint">Pasta sem camadas geoespaciais.</p>';
      bindFolders(corpo, carregarPastaStorage); bindLayerRows(corpo); pasta.dataset.carregado = "1";
    } catch (error) { corpo.innerHTML = `<p class="layers-empty layers-empty--nested hint">${escapeHtml(error.message)}</p>`; }
    atualizarContagem(pasta);
  }
  function loadStorage() {
    const host = document.getElementById("geoespacial-storage-tree");
    host.innerHTML = STORAGE_RAIZES.map((raiz) => folderHtml({ id: `storage-${raiz.caminho}`, rotulo: raiz.rotulo, caminho: raiz.caminho })).join("");
    bindFolders(host, carregarPastaStorage);
    document.getElementById("storage-layer-count").textContent = "…";
    STORAGE_RAIZES.forEach(async (raiz) => {
      try {
        const response = await fetch(`${API}/storage/${encodeURIComponent(raiz.caminho)}/contagens`);
        const dados = await response.json();
        if (!response.ok) throw new Error(dados.detail || "Contagem indisponível.");
        Object.entries(dados.contagens).forEach(([caminho, total]) => contagensStorage.set(caminho, total));
      } catch (error) {
        falhasContagensStorage.add(raiz.caminho);
        document.getElementById("storage-layer-count").textContent = "—";
        document.getElementById("storage-layer-count").title = error.message;
        host.querySelectorAll(".geo-layer-folder[data-caminho]").forEach((pasta) => {
          if (pasta.dataset.caminho === raiz.caminho || pasta.dataset.caminho.startsWith(`${raiz.caminho}/`)) {
            const count = pasta.querySelector(":scope > .layer-group-header-row .geo-layer-folder-count");
            count.textContent = "—"; count.title = error.message;
          }
        });
        return;
      }
      host.querySelectorAll(".geo-layer-folder[data-caminho]").forEach((pasta) => {
        const total = contagensStorage.get(pasta.dataset.caminho);
        if (total != null) pasta.querySelector(":scope > .layer-group-header-row .geo-layer-folder-count").textContent = String(total);
      });
      const totals = STORAGE_RAIZES.map((item) => contagensStorage.get(item.caminho));
      document.getElementById("storage-layer-count").textContent = falhasContagensStorage.size ? "—" : totals.every((total) => total != null) ? String(totals.reduce((sum, total) => sum + total, 0)) : "…";
    });
  }
  async function carregarEstiloVetorial(item, prefixo) {
    const estilo = await (await fetch(item.style)).json();
    const sufixo = `__${item.id}`, sources = {};
    Object.entries(estilo.sources || {}).forEach(([nome, src]) => { sources[`${nome}${sufixo}`] = { ...src, attribution: item.provider }; });
    const layers = (estilo.layers || []).map((layer, i) => { const novo = { ...layer, id: `${prefixo}${item.id}-${i}` }; if (novo.source) novo.source = `${novo.source}${sufixo}`; return novo; });
    return { sources, layers, glyphs: estilo.glyphs, sprite: estilo.sprite };
  }
  function initGroupReordering() {
    const root = document.getElementById("geo-layers-root");
    const basemap = document.getElementById("geo-basemap-group");
    const defaultOrder = ["geo-postgis-group", "geo-storage-group", "geo-operational-group"];
    const storageKey = "geoespacial-camadas-group-order";
    let savedOrder = [];
    try { const saved = JSON.parse(localStorage.getItem(storageKey) || "[]"); if (Array.isArray(saved)) savedOrder = saved; } catch { /* Usa a ordem inicial. */ }
    let drag = null, suppressClick = false, scrollFrame = null;
    const groups = () => [...root.children].filter((item) => item.classList.contains("layer-group--tipo") && item !== basemap);
    function saveOrder() {
      try { localStorage.setItem(storageKey, JSON.stringify(groups().map((item) => item.id))); } catch { /* Reordenar continua disponível sem armazenamento local. */ }
    }
    function prepareGroups() {
      const available = groups();
      const order = [...new Set([...savedOrder, ...defaultOrder])];
      order.forEach((id) => { const group = available.find((item) => item.id === id); if (group) root.insertBefore(group, basemap); });
      available.filter((item) => !order.includes(item.id)).forEach((item) => root.insertBefore(item, basemap));
      if (root.lastElementChild !== basemap) root.append(basemap);
      groups().forEach((group) => {
        const name = group.querySelector(":scope > .layer-group-header-row .layer-group-name--tipo");
        if (name) { name.classList.add("geo-group-drag-handle"); name.title = "Arraste para reposicionar o grupo"; name.style.touchAction = "none"; }
      });
    }
    prepareGroups();
    // Novos grupos entram depois dos atuais, sempre antes do mapa-base.
    const observer = new MutationObserver(() => {
      if (drag) return;
      observer.disconnect(); prepareGroups();
      savedOrder = groups().map((item) => item.id);
      observer.observe(root, { childList: true });
    });
    observer.observe(root, { childList: true });
    const handleFor = (target) => {
      const handle = target.closest(".geo-group-drag-handle");
      const group = handle?.closest(".layer-group--tipo");
      return group?.parentElement === root && group !== basemap ? { handle, group } : null;
    };
    function moveGroup(y) {
      const next = groups().filter((group) => group !== drag.group).find((group) => {
        const rect = group.getBoundingClientRect(); return y < rect.top + rect.height / 2;
      }) || basemap;
      if (drag.group.nextElementSibling !== next) {
        root.insertBefore(drag.group, next);
        drag.handle.setPointerCapture(drag.pointerId);
      }
    }
    function autoScroll() {
      if (!drag?.active) return;
      const rect = drag.scroller.getBoundingClientRect();
      const delta = drag.y < rect.top + 32 ? -10 : drag.y > rect.bottom - 32 ? 10 : 0;
      if (delta) { drag.scroller.scrollTop += delta; moveGroup(drag.y); }
      scrollFrame = requestAnimationFrame(autoScroll);
    }
    root.addEventListener("pointerdown", (event) => {
      const item = handleFor(event.target);
      if (!item || !event.isPrimary || event.button !== 0) return;
      let scroller = root;
      while (scroller.parentElement && !/(auto|scroll)/.test(getComputedStyle(scroller).overflowY)) scroller = scroller.parentElement;
      drag = { ...item, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, y: event.clientY, scroller, active: false, order: groups() };
      item.handle.setPointerCapture(event.pointerId);
    });
    root.addEventListener("pointermove", (event) => {
      if (!drag || drag.pointerId !== event.pointerId) return;
      drag.y = event.clientY;
      if (!drag.active && Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < 5) return;
      if (!drag.active) { drag.active = true; drag.group.classList.add("geo-group-dragging"); root.classList.add("geo-groups-reordering"); autoScroll(); }
      event.preventDefault(); moveGroup(event.clientY);
    });
    function finish(event, cancel = false) {
      if (!drag || drag.pointerId !== event.pointerId) return;
      const current = drag;
      if (scrollFrame !== null) cancelAnimationFrame(scrollFrame);
      current.group.classList.remove("geo-group-dragging"); root.classList.remove("geo-groups-reordering");
      suppressClick = current.active;
      drag = null;
      if (cancel) current.order.forEach((group) => root.insertBefore(group, basemap));
      if (current.handle.hasPointerCapture(current.pointerId)) current.handle.releasePointerCapture(current.pointerId);
      savedOrder = groups().map((group) => group.id);
      if (current.active && !cancel) saveOrder();
      // O clique emitido ao soltar não deve recolher o grupo arrastado.
      setTimeout(() => { suppressClick = false; }, 0);
    }
    root.addEventListener("pointerup", (event) => finish(event));
    root.addEventListener("pointercancel", (event) => finish(event, true));
    root.addEventListener("lostpointercapture", (event) => finish(event, true));
    root.addEventListener("click", (event) => { if (suppressClick) { event.preventDefault(); event.stopImmediatePropagation(); } }, true);
  }
  function initContextPanel() {
    const panel = document.querySelector(".geo-context-panel"), workspace = panel.parentElement;
    const header = panel.querySelector("[data-context-drag]"), button = document.getElementById("geo-context-toggle");
    let drag = null;
    function place(left, top) {
      const x = Math.max(14, Math.min(left, workspace.clientWidth - panel.offsetWidth - 14));
      const y = Math.max(14, Math.min(top, workspace.clientHeight - panel.offsetHeight - 14));
      panel.style.left = `${x}px`; panel.style.top = `${y}px`;
    }
    button.addEventListener("click", () => setContextCollapsed(!panel.classList.contains("is-collapsed")));
    header.addEventListener("pointerdown", (event) => {
      if (event.target.closest("button") || !event.isPrimary || event.button !== 0) return;
      drag = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, left: panel.offsetLeft, top: panel.offsetTop };
      header.setPointerCapture(event.pointerId); panel.classList.add("is-dragging"); event.preventDefault();
    });
    header.addEventListener("pointermove", (event) => {
      if (!drag || event.pointerId !== drag.pointerId) return;
      place(drag.left + event.clientX - drag.x, drag.top + event.clientY - drag.y);
    });
    function finish(event) {
      if (!drag || event.pointerId !== drag.pointerId) return;
      drag = null; panel.classList.remove("is-dragging");
      if (header.hasPointerCapture(event.pointerId)) header.releasePointerCapture(event.pointerId);
    }
    header.addEventListener("pointerup", finish); header.addEventListener("pointercancel", finish); header.addEventListener("lostpointercapture", finish);
    new ResizeObserver(() => place(panel.offsetLeft, panel.offsetTop)).observe(workspace);
    new ResizeObserver(() => place(panel.offsetLeft, panel.offsetTop)).observe(panel);
  }
  async function init() {
    initContextPanel();
    initGroupReordering();
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
    ["geo-operational-group", "geo-postgis-group", "geo-storage-group", "geo-basemap-group"].forEach((id) => { const group = document.getElementById(id), header = group.querySelector(":scope > .layer-group-header-row .layer-group-header--tipo"); header.addEventListener("click", () => { const collapsed = group.classList.toggle("collapsed"); header.setAttribute("aria-expanded", String(!collapsed)); }); });
    const labelButton = document.getElementById("toggle-operational-labels"); labelButton.classList.toggle("is-active", rotulosAtivos); labelButton.setAttribute("aria-pressed", String(rotulosAtivos));
    labelButton.addEventListener("click", () => { rotulosAtivos = !rotulosAtivos; labelButton.classList.toggle("is-active", rotulosAtivos); labelButton.setAttribute("aria-pressed", String(rotulosAtivos)); localStorage.setItem("geoespacial-camadas-labels", String(rotulosAtivos)); camadas.forEach((camada) => GeoespacialMap.toggleLabels(camada.id, rotulosAtivos)); });
    [["toggle-operational-group", "#geoespacial-layers-list"], ["toggle-postgis-group", "#geoespacial-postgis-tree"], ["toggle-storage-group", "#geoespacial-storage-tree"]].forEach(([toggleId, seletor]) => {
      document.getElementById(toggleId).addEventListener("change", (event) => { document.querySelectorAll(`${seletor} .geo-layer-record > .layer-group-header-row .layer-visibility-input`).forEach((input) => { if (input.checked !== event.target.checked) { input.checked = event.target.checked; input.dispatchEvent(new Event("change")); } }); });
    });
    document.getElementById("toggle-basemap-group").addEventListener("change", () => selecionarBasemap(basemapAtual));
    activateContextTab("legend"); renderLegend();
    loadStorage();
    await Promise.all([load(), loadPostgis()]);
  }
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", init) : init();
})();
