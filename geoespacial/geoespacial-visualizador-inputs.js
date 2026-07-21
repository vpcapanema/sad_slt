/* Visualizador de Inputs — Módulo Geoespacial */
(function () {
  "use strict";
  const API = "/api/geoespacial";
  let camadas = [];
  let diretorio = { operacionais: [], biblioteca_canonica: [] };
  let arquivoInspecionado = null;
  const BASEMAPS = [
    { id: "osm", name: "OpenStreetMap", tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"] },
    { id: "carto-light", name: "Carto Claro", tiles: ["https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png"] },
    { id: "carto-dark", name: "Carto Escuro", tiles: ["https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"] },
    { id: "esri-satellite", name: "Imagem de Satélite", tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"] },
  ];
  let basemapAtual = localStorage.getItem("geoespacial-viewer-basemap") || "osm";
  let basemapRecolhido = localStorage.getItem("geoespacial-viewer-basemap-collapsed") === "true";
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
      <div class="geoespacial-detail-row"><span>Tipo</span><strong>${escapeHtml(camada.geometria_tipo || camada.tipo || camada.categoria_arquivo)}</strong></div>
      <div class="geoespacial-detail-row"><span>CRS</span><strong>${escapeHtml(camada.crs || "Não informado")}</strong></div>
      <div class="geoespacial-detail-row"><span>Origem</span><strong>${escapeHtml(camada.arquivo || camada.origem || "Datastorage")}</strong></div>
      <div class="geoespacial-detail-row"><span>Importação</span><strong>${escapeHtml(camada.data_importacao || "—")}</strong></div>
    </div>`;
  }
  async function toggle(camada, visible) {
    if (!visible) return GeoespacialMap.toggleLayer(camada.id, false);
    if (!camada.registrada || !camada.id) throw new Error("O arquivo existe no datastorage, mas ainda não possui registro válido no banco");
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
  function selecionarBasemap(id) {
    basemapAtual = BASEMAPS.some((item) => item.id === id) ? id : "osm";
    localStorage.setItem("geoespacial-viewer-basemap", basemapAtual);
    BASEMAPS.forEach((item) => {
      const layerId = `viewer-basemap-${item.id}`;
      if (GeoespacialMap.map?.getLayer(layerId)) {
        GeoespacialMap.map.setLayoutProperty(layerId, "visibility", item.id === basemapAtual ? "visible" : "none");
      }
    });
  }
  function render() {
    const container = document.getElementById("geoespacial-layers-list");
    document.getElementById("viewer-layer-count").textContent = `${camadas.length} ${camadas.length === 1 ? "item" : "itens"}`;
    const groups = [
      ["ponto", "Ponto", "location-dot"], ["linha", "Linha", "route"],
      ["poligono", "Polígono", "draw-polygon"], ["raster", "Raster", "border-all"],
    ];
    const category = (layer) => {
      const type = `${layer.geometria_tipo || ""} ${layer.tipo || ""} ${layer.categoria_arquivo || ""}`.toLowerCase();
      if (type.includes("point") || type.includes("ponto")) return "ponto";
      if (type.includes("line") || type.includes("linha")) return "linha";
      if (type.includes("polygon") || type.includes("poligono")) return "poligono";
      if (type.includes("raster")) return "raster";
      return layer.categoria_arquivo === "raster" ? "raster" : "poligono";
    };
    const operacionais = groups.flatMap(([key]) => camadas.filter((layer) => category(layer) === key));
    const operationalRows = operacionais.length
      ? operacionais.map((camada) => { const uid = camada.id || `file-${camadas.indexOf(camada)}`; return `<div class="geoespacial-layer-item" data-id="${escapeHtml(uid)}"><input type="checkbox" class="geoespacial-layer-checkbox" id="layer-${escapeHtml(uid)}" ${camada.registrada ? "" : "disabled"}><label for="layer-${escapeHtml(uid)}" class="geoespacial-layer-name">${escapeHtml(camada.nome)}</label></div>`; }).join("")
      : '<div class="geoespacial-layer-group-empty">Nenhuma camada operacional.</div>';
    const basemapRows = BASEMAPS.map((item) => `<label class="geoespacial-layer-item geoespacial-basemap-item"><input type="radio" name="viewer-basemap" value="${item.id}" ${basemapAtual === item.id ? "checked" : ""}><i class="fa-solid fa-map geoespacial-tree-symbol"></i><span class="geoespacial-layer-name">${escapeHtml(item.name)}</span></label>`).join("");
    container.innerHTML = operationalRows + `<section class="geoespacial-layer-group geoespacial-basemap-group ${basemapRecolhido ? "collapsed" : ""}" data-layer-group="basemap"><button type="button" class="geoespacial-layer-group-title" aria-expanded="${!basemapRecolhido}"><i class="fa-solid fa-chevron-down geoespacial-tree-chevron"></i><i class="fa-solid fa-map"></i><strong>Basemap</strong></button><div class="geoespacial-layer-group-children">${basemapRows}</div></section>`;
    container.querySelectorAll(".geoespacial-layer-item").forEach((item) => {
      if (!item.dataset.id) return;
      const camada = camadas.find((value, index) => (value.id || `file-${index}`) === item.dataset.id);
      item.addEventListener("click", (event) => { if (!event.target.matches("input")) detail(camada); });
      item.querySelector("input").addEventListener("change", async (event) => { try { await toggle(camada, event.target.checked); } catch (error) { event.target.checked = false; document.getElementById("geoespacial-operations-list").innerHTML = `<p class="hint">${escapeHtml(error.message)}</p>`; } });
    });
    container.querySelectorAll('input[name="viewer-basemap"]').forEach((input) => input.addEventListener("change", () => selecionarBasemap(input.value)));
    container.querySelector('[data-layer-group="basemap"] > .geoespacial-layer-group-title').addEventListener("click", (event) => {
      const section = event.currentTarget.closest('[data-layer-group="basemap"]');
      basemapRecolhido = section.classList.toggle("collapsed");
      event.currentTarget.setAttribute("aria-expanded", String(!basemapRecolhido));
      localStorage.setItem("geoespacial-viewer-basemap-collapsed", String(basemapRecolhido));
    });
  }
  async function load() {
    const response = await fetch(`${API}/camadas-diretorio`);
    if (!response.ok) throw new Error("Catálogo de camadas indisponível");
    diretorio = await response.json();
    camadas = diretorio.operacionais || [];
    preencherCamadasRecorte();
    render();
  }
  function preencherCamadasRecorte() {
    const select = document.getElementById("import-clip-layer");
    const vetores = Object.values(diretorio).flat().filter((item) => item.registrada && (item.tipo === "vetor" || item.tipo === "vetorial"));
    select.innerHTML = '<option value="">Selecione uma camada vetorial</option>' + vetores.map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.nome)} · ${escapeHtml(item.crs || "CRS não informado")}</option>`).join("");
  }
  async function inspecionar(file) {
    const status = document.getElementById("import-inspection-status");
    const confirm = document.getElementById("btn-confirmar-importacao");
    arquivoInspecionado = null;
    confirm.disabled = true;
    status.textContent = "Lendo e validando o conteúdo...";
    const data = new FormData(); data.append("arquivo", file);
    const response = await fetch(`${API}/importar_camadas/inspecionar`, { method: "POST", body: data });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.detail || "Arquivo geoespacial inválido");
    arquivoInspecionado = file;
    document.getElementById("import-current-crs").value = body.crs_atual || "CRS não informado";
    status.textContent = `${body.categoria} · ${body.camadas.length} camada(s) válida(s)${body.arquivo_compactado ? " · pacote compactado" : ""}`;
    confirm.disabled = false;
  }
  async function upload(file) {
    const data = new FormData();
    data.append("arquivo", file);
    if (document.getElementById("import-reproject-enabled").checked) data.append("reprojetar_crs", document.getElementById("import-target-crs").value);
    if (document.getElementById("import-clip-enabled").checked) data.append("recortar_camada_id", document.getElementById("import-clip-layer").value);
    const response = await fetch(`${API}/importar_camadas`, { method: "POST", body: data });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.detail || `Falha no upload de ${file.name}`);
    await load();
    return body;
  }
  async function init() {
    const sources = {};
    const layers = [];
    BASEMAPS.forEach((item) => {
      sources[item.id] = { type: "raster", tiles: item.tiles, tileSize: 256, attribution: "© provedores do mapa" };
      layers.push({ id: `viewer-basemap-${item.id}`, type: "raster", source: item.id, layout: { visibility: item.id === basemapAtual ? "visible" : "none" } });
    });
    GeoespacialMap.init("map-geoespacial", { center: [-48.5, -22.4], zoom: 6.2, style: { version: 8, sources, layers } });
    const dialog = document.getElementById("dialog-importar-camadas");
    const form = document.getElementById("form-importar-camadas");
    const input = document.getElementById("viewer-file-input");
    document.getElementById("btn-abrir-camadas").addEventListener("click", load);
    document.getElementById("btn-importar-camadas").addEventListener("click", () => dialog.showModal());
    ["btn-fechar-importacao", "btn-cancelar-importacao"].forEach((id) => document.getElementById(id).addEventListener("click", () => dialog.close()));
    document.getElementById("import-reproject-enabled").addEventListener("change", (event) => { document.getElementById("import-target-crs").disabled = !event.target.checked; });
    document.getElementById("import-clip-enabled").addEventListener("change", (event) => { document.getElementById("import-clip-layer").disabled = !event.target.checked; });
    input.addEventListener("change", async () => {
      try { if (input.files[0]) await inspecionar(input.files[0]); }
      catch (error) { arquivoInspecionado = null; document.getElementById("import-inspection-status").textContent = error.message; }
    });
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const status = document.getElementById("import-inspection-status");
      const confirm = document.getElementById("btn-confirmar-importacao");
      try {
        if (!arquivoInspecionado) throw new Error("Selecione e valide um arquivo");
        if (document.getElementById("import-clip-enabled").checked && !document.getElementById("import-clip-layer").value) throw new Error("Selecione a camada de máscara");
        confirm.disabled = true; status.textContent = "Importando e persistindo metadados...";
        const result = await upload(arquivoInspecionado);
        status.textContent = `${result.quantidade} camada(s) importada(s) com sucesso.`;
        setTimeout(() => dialog.close(), 700);
      } catch (error) { status.textContent = error.message; confirm.disabled = false; }
    });
    await load();
  }
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", init) : init();
})();
