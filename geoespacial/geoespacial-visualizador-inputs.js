/* Visualizador de Inputs — Módulo Geoespacial */
(function () {
  "use strict";
  const API = "/api/geoespacial";
  let camadas = [];
  let diretorio = { operacionais: [], biblioteca_canonica: [] };
  let arquivoInspecionado = null;
  let tokenImportacao = null;
  const camadasVisiveis = new Set();
  const BASEMAPS = [
    { id: "osm", name: "OpenStreetMap", provider: "OpenStreetMap Contributors", referenceDate: "Atualização contínua; referência correspondente à data de consulta", tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"] },
    { id: "carto-light", name: "Carto Claro", provider: "CARTO / OpenStreetMap", referenceDate: "Atualização contínua; referência correspondente à data de consulta", tiles: ["https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png"] },
    { id: "carto-dark", name: "Carto Escuro", provider: "CARTO / OpenStreetMap", referenceDate: "Atualização contínua; referência correspondente à data de consulta", tiles: ["https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"] },
    { id: "esri-satellite", name: "Imagem de Satélite", provider: "Esri World Imagery", referenceDate: "Mosaico multitemporal; a data varia conforme a localização e a escala", tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"] },
  ];
  let basemapAtual = localStorage.getItem("geoespacial-viewer-basemap") || "osm";
  let basemapRecolhido = localStorage.getItem("geoespacial-viewer-basemap-collapsed") === "true";
  let rotulosAtivos = localStorage.getItem("geoespacial-viewer-labels") === "true";
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  const formatCrs = (value) => String(value || "CRS não informado").replace(/EPSG:4674(?!\s*\()/g, "EPSG:4674 (SIRGAS 2000)");
  function formatDate(value) {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(date);
  }
  function generationDate(camada) {
    const metadata = camada.metadados || {};
    const extras = metadata.metadados || metadata;
    return extras.data_geracao || extras.gerado_em || extras.generated_at || extras.data_referencia || camada.data_geracao || camada.criado_em || camada.data_importacao;
  }

  function activateContextTab(name) {
    document.querySelectorAll("[data-context-tab]").forEach((button) => {
      const active = button.dataset.contextTab === name;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", String(active));
    });
    document.querySelectorAll("[data-context-content]").forEach((panel) => {
      const active = panel.dataset.contextContent === name;
      panel.classList.toggle("active", active);
      panel.hidden = !active;
    });
    if (name === "properties") setTimeout(() => [["lineWidth", "Espessura da linha (px)"], ["pointRadius", "Tamanho do ponto (px)"]].forEach(([field, label]) => { const input=document.querySelector(`#geoespacial-properties-content [name="${field}"]`),text=[...(input?.closest("label")?.childNodes||[])].find(node=>node.nodeType===Node.TEXT_NODE);if(text)text.nodeValue=label; }), 0);
  }
  function showDetails() {
    const tab = document.querySelector('[data-context-tab="details"]');
    tab.hidden = false;
    activateContextTab("details");
  }
  function legendColor(camada) {
    const type = `${camada.geometria_tipo || ""} ${camada.tipo || ""}`.toLowerCase();
    if (type.includes("point") || type.includes("ponto")) return ["#d97819", "point"];
    if (type.includes("line") || type.includes("linha")) return ["#075b89", "line"];
    if (type.includes("raster")) return ["#7c3aed", "raster"];
    return ["#1683c4", "polygon"];
  }
  function layerSymbol(camada) {
    const [, type] = legendColor(camada);
    const style = GeoespacialMap.getLayerStyle(camada.id || camada.nome);
    return `<span class="geo-layer-tree-symbol geo-layer-tree-symbol--${type}" style="--symbol-color:${style.color};--symbol-fill:${style.fillColor||style.color};--symbol-opacity:${Math.round(style.fillOpacity*100)}%;--symbol-width:${style.lineWidth}px;--symbol-radius:${style.pointRadius}px" aria-label="Editar símbolo da camada" title="Editar propriedades"></span>`;
  }
  function displayName(camada) { return GeoespacialMap.getLayerProperties(camada.id || camada.nome).alias || camada.nome; }
  function openProperties(camada, row) {
    const tab=document.querySelector('[data-context-tab="properties"]');tab.hidden=false;activateContextTab("properties");
    const style=GeoespacialMap.getLayerStyle(camada.id||camada.nome),saved=GeoespacialMap.getLayerProperties(camada.id||camada.nome);
    document.getElementById("geoespacial-properties-content").innerHTML=`<form class="geo-properties-form"><label>Alias da camada<input name="alias" value="${escapeHtml(saved.alias||camada.nome)}" required></label><div class="geo-properties-grid"><label>Cor do contorno/linha<input name="color" type="color" value="${style.color}"></label><label>Cor do preenchimento<input name="fillColor" type="color" value="${style.fillColor||style.color}"></label><label>Espessura da linha<input name="lineWidth" type="number" min="0.5" max="12" step="0.5" value="${style.lineWidth}"></label><label>Tamanho do ponto<input name="pointRadius" type="number" min="2" max="24" step="0.5" value="${style.pointRadius}"></label><label>Tipo de linha<select name="lineStyle"><option value="solid">Contínua</option><option value="dashed">Tracejada</option><option value="dotted">Pontilhada</option></select></label><label>Preenchimento<select name="fillMode"><option value="translucent">Translúcido</option><option value="solid">Sólido</option><option value="outline">Somente contorno</option></select></label></div><label>Opacidade do preenchimento<input name="fillOpacity" type="range" min="0" max="1" step="0.05" value="${style.fillOpacity}"></label><div class="geo-properties-feedback"></div><footer><button class="btn btn-primary" type="submit">Salvar propriedades</button></footer></form>`;
    const form=document.querySelector("#geoespacial-properties-content form");form.insertAdjacentHTML("afterbegin",`<label>Nome técnico<input value="${escapeHtml(camada.nome)}" readonly></label><label>Tipo / CRS<input value="${escapeHtml(`${camada.geometria_tipo||camada.tipo||"Vetorial"} · ${camada.crs||"CRS não informado"}`)}" readonly></label>`);form.elements.lineStyle.value=style.lineStyle||"solid";form.elements.fillMode.value=style.fillMode||"translucent";
    form.addEventListener("submit",event=>{event.preventDefault();const data=new FormData(form),props={alias:String(data.get("alias")).trim(),color:String(data.get("color")),fillColor:String(data.get("fillColor")),lineWidth:Number(data.get("lineWidth")),pointRadius:Number(data.get("pointRadius")),lineStyle:String(data.get("lineStyle")),fillMode:String(data.get("fillMode")),fillOpacity:Number(data.get("fillOpacity"))};GeoespacialMap.saveLayerProperties(camada.id||camada.nome,props);row.querySelector(".layer-group-name").textContent=props.alias;row.querySelector(".geo-layer-tree-symbol").outerHTML=layerSymbol(camada);row.querySelector(".geo-layer-tree-symbol").addEventListener("click",click=>{click.stopPropagation();openProperties(camada,row)});renderLegend();form.querySelector(".geo-properties-feedback").textContent="Propriedades salvas e aplicadas.";});
  }
  function renderLegend() {
    const visible = camadas.filter((camada) => camadasVisiveis.has(camada.id));
    const rows = visible.map((camada) => { const [, type] = legendColor(camada), style = GeoespacialMap.getLayerStyle(camada.id || camada.nome); return `<div class="geo-legend-item"><span class="geo-legend-symbol geo-legend-symbol--${type}" style="--legend-color:${style.fillColor||style.color};--legend-opacity:${Math.round(style.fillOpacity*100)}%;--legend-width:${style.lineWidth}px;--legend-radius:${style.pointRadius}px"></span><span>${escapeHtml(displayName(camada))}</span></div>`; }).join("");
    document.getElementById("geoespacial-legend").innerHTML = `${rows || '<p class="hint">Ative uma camada para visualizar sua legenda.</p>'}<div class="geo-legend-invalid-note"><span class="geo-legend-symbol" style="--legend-color:#dc2626"></span><span>Geometria inválida</span></div>`;
  }

  async function mapReady() {
    const map = GeoespacialMap.map;
    if (map?.isStyleLoaded()) return;
    await new Promise((resolve) => map.once("load", resolve));
  }
  function detail(camada) {
    document.querySelectorAll(".geo-layer-record").forEach((item) => item.classList.toggle("active", item.dataset.id === camada.id));
    document.getElementById("geoespacial-operations-list").innerHTML = `<div class="geoespacial-detail-grid">
      <div class="geoespacial-detail-row"><span>Nome</span><strong>${escapeHtml(camada.nome)}</strong></div>
      <div class="geoespacial-detail-row"><span>Tipo</span><strong>${escapeHtml(camada.geometria_tipo || camada.tipo || camada.categoria_arquivo)}</strong></div>
      <div class="geoespacial-detail-row"><span>CRS</span><strong>${escapeHtml(formatCrs(camada.crs))}</strong></div>
      <div class="geoespacial-detail-row"><span>Origem</span><strong>${escapeHtml(camada.arquivo || camada.origem || "Datastorage")}</strong></div>
      <div class="geoespacial-detail-row"><span>Geração da base</span><strong>${escapeHtml(formatDate(generationDate(camada)))}</strong></div>
      <div class="geoespacial-detail-row"><span>Importação</span><strong>${escapeHtml(formatDate(camada.data_importacao || camada.criado_em))}</strong></div>
    </div>`;
    showDetails();
  }
  function detailBasemap(item) {
    document.querySelectorAll(".geo-layer-record").forEach((row) => row.classList.toggle("active", row.dataset.basemapId === item.id));
    document.getElementById("geoespacial-operations-list").innerHTML = `<div class="geoespacial-detail-grid">
      <div class="geoespacial-detail-row"><span>Mapa-base</span><strong>${escapeHtml(item.name)}</strong></div>
      <div class="geoespacial-detail-row"><span>Tipo</span><strong>Camada raster de referência</strong></div>
      <div class="geoespacial-detail-row"><span>Provedor</span><strong>${escapeHtml(item.provider)}</strong></div>
      <div class="geoespacial-detail-row"><span>Data de referência</span><strong>${escapeHtml(item.referenceDate)}</strong></div>
      <div class="geoespacial-detail-row"><span>Uso</span><strong>Contexto cartográfico; não participa dos cálculos.</strong></div>
    </div>`;
    showDetails();
  }
  async function toggle(camada, visible) {
    if (!visible) { camadasVisiveis.delete(camada.id); GeoespacialMap.toggleLayer(camada.id, false); renderLegend(); return; }
    if (!camada.registrada || !camada.id) throw new Error("O arquivo existe no datastorage, mas ainda não possui registro válido no banco");
    detail(camada);
    camadasVisiveis.add(camada.id); renderLegend();
    if (GeoespacialMap.layers.has(camada.id)) return GeoespacialMap.toggleLayer(camada.id, true);
    if (String(camada.tipo).toLowerCase().includes("raster")) {
      document.getElementById("geoespacial-operations-list").insertAdjacentHTML("beforeend", '<p class="hint">O preview raster está disponível na bancada de geoprocessamento.</p>');
      return;
    }
    await mapReady();
    GeoespacialMap.addVectorTileLayer(camada.id, `${API}/camadas/${encodeURIComponent(camada.id)}/tiles/{z}/{x}/{y}.pbf`, { uniqueStyle: true, label: displayName(camada), labelsVisible: rotulosAtivos });
    const boundsResponse = await fetch(`${API}/camadas/${encodeURIComponent(camada.id)}/bounds`);
    if (!boundsResponse.ok) throw new Error(`Não foi possível obter a extensão da camada (${boundsResponse.status})`);
    GeoespacialMap.layers.get(camada.id).bounds = (await boundsResponse.json()).bounds;
    GeoespacialMap.fitBounds(camada.id);
  }
  function selecionarBasemap(id) {
    basemapAtual = BASEMAPS.some((item) => item.id === id) ? id : "osm";
    localStorage.setItem("geoespacial-viewer-basemap", basemapAtual);
    const basemapVisible = document.getElementById("toggle-basemap-group")?.checked !== false;
    BASEMAPS.forEach((item) => {
      const layerId = `viewer-basemap-${item.id}`;
      if (GeoespacialMap.map?.getLayer(layerId)) {
        GeoespacialMap.map.setLayoutProperty(layerId, "visibility", basemapVisible && item.id === basemapAtual ? "visible" : "none");
      }
    });
    detailBasemap(BASEMAPS.find((item) => item.id === basemapAtual));
  }
  function render() {
    const container = document.getElementById("geoespacial-layers-list");
    const basemapContainer = document.getElementById("geoespacial-basemap-list");
    document.getElementById("viewer-layer-count").textContent = String(camadas.length);
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
      ? operacionais.map((camada) => { const uid = camada.id || `file-${camadas.indexOf(camada)}`; return `<div class="layer-group layer-group--record geo-layer-record" data-id="${escapeHtml(uid)}"><div class="layer-group-header-row"><label class="layer-visibility-toggle" for="layer-${escapeHtml(uid)}"><input type="checkbox" class="layer-visibility-input" id="layer-${escapeHtml(uid)}" ${camada.registrada ? "" : "disabled"}></label><button type="button" class="layer-group-header layer-group-header--record" aria-expanded="false"><span class="layer-group-toggle" aria-hidden="true">›</span><span class="geo-layer-copy"><span class="layer-group-name">${escapeHtml(displayName(camada))}</span>${layerSymbol(camada)}</span></button></div></div>`; }).join("")
      : '<p class="layers-empty layers-empty--nested">Nenhuma camada operacional.</p>';
    const basemapRows = BASEMAPS.map((item) => `<div class="layer-group layer-group--record geo-layer-record geo-basemap-record" data-basemap-id="${item.id}"><div class="layer-group-header-row"><label class="layer-visibility-toggle"><input class="layer-visibility-input" type="radio" name="viewer-basemap" value="${item.id}" ${basemapAtual === item.id ? "checked" : ""}></label><button type="button" class="layer-group-header layer-group-header--record"><span class="layer-group-toggle" aria-hidden="true">•</span><span class="layer-group-name">${escapeHtml(item.name)}</span></button></div></div>`).join("");
    container.innerHTML = operationalRows;
    basemapContainer.innerHTML = basemapRows;
    document.getElementById("geo-basemap-group").classList.toggle("collapsed", basemapRecolhido);
    container.querySelectorAll(".geo-layer-record[data-id]").forEach((item) => {
      const camada = camadas.find((value, index) => (value.id || `file-${index}`) === item.dataset.id);
      const button = item.querySelector("button");
      button.addEventListener("click", () => { const expanded = item.classList.toggle("expanded"); button.setAttribute("aria-expanded", String(expanded)); detail(camada); });
      item.querySelector(".geo-layer-tree-symbol").addEventListener("click", (event) => { event.stopPropagation(); openProperties(camada,item); });
      item.querySelector("input").addEventListener("change", async (event) => { try { await toggle(camada, event.target.checked); } catch (error) { event.target.checked = false; document.getElementById("geoespacial-operations-list").innerHTML = `<p class="hint">${escapeHtml(error.message)}</p>`; } });
    });
    basemapContainer.querySelectorAll(".geo-basemap-record").forEach((row) => { const item=BASEMAPS.find((value)=>value.id===row.dataset.basemapId);row.querySelector("button").addEventListener("click",()=>detailBasemap(item));row.querySelector("input").addEventListener("change",()=>selecionarBasemap(item.id)); });
  }
  async function load() {
    const response = await fetch(`${API}/camadas-diretorio`);
    if (!response.ok) throw new Error("Catálogo de camadas indisponível");
    diretorio = await response.json();
    camadas = diretorio.operacionais || [];
    if (diretorio.banco_disponivel === false) document.getElementById("geoespacial-operations-list").innerHTML = '<p class="hint">Arquivos locais exibidos. O catálogo do banco está temporariamente indisponível; tente atualizar em instantes.</p>';
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
    tokenImportacao = null;
    confirm.disabled = true;
    status.textContent = "Lendo e validando o conteúdo...";
    const data = new FormData(); data.append("arquivo", file);
    const response = await fetch(`${API}/importar_camadas/inspecionar`, { method: "POST", body: data });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.detail || "Arquivo geoespacial inválido");
    arquivoInspecionado = file;
    tokenImportacao = body.token_importacao;
    document.getElementById("import-current-crs").value = formatCrs(body.crs_atual);
    const invalidas = body.camadas.reduce((total, camada) => total + Number(camada.geometrias_invalidas || 0), 0);
    status.textContent = `${body.categoria} · ${body.camadas.length} camada(s) importável(is)${invalidas ? ` · ${invalidas} geometria(s) inválida(s) serão destacadas` : " · geometrias válidas"}${body.arquivo_compactado ? " · pacote compactado" : ""}`;
    confirm.disabled = false;
  }
  function renderImportJob(job) {
    const progress = Math.max(0, Math.min(100, Number(job.percentual) || 0));
    const track = document.querySelector("#dialog-import-progress [role=progressbar]");
    track.setAttribute("aria-valuenow", String(progress));
    document.getElementById("import-progress-bar").style.width = `${progress}%`;
    document.getElementById("import-progress-summary").textContent = `${job.concluidas || 0} de ${job.total || 0} microtarefas concluídas`;
    const running = !["concluido", "erro"].includes(job.status);
    document.getElementById("import-progress-current").innerHTML = running
      ? `<i class="fas fa-spinner fa-spin" aria-hidden="true"></i><span>${escapeHtml(job.etapa_atual || "Processando no servidor…")}</span>`
      : `<i class="fas ${job.status === "concluido" ? "fa-check" : "fa-triangle-exclamation"}" aria-hidden="true"></i><span>${job.status === "concluido" ? "Processamento concluído" : "Processamento interrompido"}</span>`;
    const log = document.getElementById("import-progress-log");
    log.innerHTML = (job.logs || []).map((item) => `<li class="${item.nivel === "erro" ? "error" : ""}"><span>${escapeHtml(item.mensagem)}</span></li>`).join("");
    log.scrollTop = log.scrollHeight;
  }
  async function waitImportJob(initialJob) {
    let job = initialJob;
    renderImportJob(job);
    while (!["concluido", "erro"].includes(job.status)) {
      await new Promise((resolve) => setTimeout(resolve, 350));
      const response = await fetch(`${API}/operacoes-jobs/status/${encodeURIComponent(job.id)}`, { cache: "no-store" });
      job = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(job.detail || "Não foi possível consultar o processamento");
      renderImportJob(job);
    }
    if (job.status === "erro") throw new Error(job.erro || "A importação foi interrompida");
    return job.resultado;
  }
  async function upload(file) {
    const data = new FormData();
    if (tokenImportacao) data.append("token_importacao", tokenImportacao);
    else data.append("arquivo", file);
    if (document.getElementById("import-reproject-enabled").checked) data.append("reprojetar_crs", document.getElementById("import-target-crs").value);
    if (document.getElementById("import-clip-enabled").checked) data.append("recortar_camada_id", document.getElementById("import-clip-layer").value);
    const response = await fetch(`${API}/importar_camadas/job`, { method: "POST", body: data });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.detail || `Falha no upload de ${file.name}`);
    return waitImportJob(body);
  }
  async function init() {
    const sources = {};
    const layers = [];
    BASEMAPS.forEach((item) => {
      sources[item.id] = { type: "raster", tiles: item.tiles, tileSize: 256, attribution: "© provedores do mapa" };
      layers.push({ id: `viewer-basemap-${item.id}`, type: "raster", source: item.id, layout: { visibility: item.id === basemapAtual ? "visible" : "none" } });
    });
    GeoespacialMap.init("map-geoespacial", { center: [-48.5, -22.4], zoom: 6.2, nativeTools: true, style: { version: 8, glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf", sources, layers } });
    document.querySelectorAll("[data-context-tab]").forEach((button) => button.addEventListener("click", () => activateContextTab(button.dataset.contextTab)));
    activateContextTab("legend");
    renderLegend();
    const bindGroup = (id, onChange) => { const group = document.getElementById(id); const header = group.querySelector(":scope > .layer-group-header-row .layer-group-header--tipo"); header.addEventListener("click", () => { const collapsed = group.classList.toggle("collapsed"); header.setAttribute("aria-expanded", String(!collapsed)); onChange?.(collapsed); }); };
    bindGroup("geo-operational-group");
    bindGroup("geo-basemap-group", (collapsed) => { basemapRecolhido = collapsed; localStorage.setItem("geoespacial-viewer-basemap-collapsed", String(collapsed)); });
    const labelButton = document.getElementById("toggle-operational-labels");
    labelButton.classList.toggle("is-active", rotulosAtivos); labelButton.setAttribute("aria-pressed", String(rotulosAtivos));
    labelButton.addEventListener("click", () => { rotulosAtivos = !rotulosAtivos; labelButton.classList.toggle("is-active", rotulosAtivos); labelButton.setAttribute("aria-pressed", String(rotulosAtivos)); localStorage.setItem("geoespacial-viewer-labels", String(rotulosAtivos)); camadas.forEach((camada) => { if (camada.id) GeoespacialMap.toggleLabels(camada.id, rotulosAtivos); }); });
    document.getElementById("toggle-operational-group").addEventListener("change", (event) => { document.querySelectorAll("#geoespacial-layers-list .layer-visibility-input:not(:disabled)").forEach((input) => { if (input.checked !== event.target.checked) { input.checked = event.target.checked; input.dispatchEvent(new Event("change")); } }); });
    document.getElementById("toggle-basemap-group").addEventListener("change", () => selecionarBasemap(basemapAtual));
    const dialog = document.getElementById("dialog-importar-camadas");
    const progressDialog = document.getElementById("dialog-import-progress");
    const form = document.getElementById("form-importar-camadas");
    const input = document.getElementById("viewer-file-input");
    document.getElementById("btn-abrir-camadas").addEventListener("click", load);
    document.getElementById("btn-importar-camadas").addEventListener("click", () => dialog.showModal());
    ["btn-fechar-importacao", "btn-cancelar-importacao"].forEach((id) => document.getElementById(id).addEventListener("click", () => dialog.close()));
    document.getElementById("btn-confirmar-progresso").addEventListener("click", () => progressDialog.close());
    document.getElementById("import-reproject-enabled").addEventListener("change", (event) => { document.getElementById("import-target-crs").disabled = !event.target.checked; });
    document.getElementById("import-clip-enabled").addEventListener("change", (event) => { document.getElementById("import-clip-layer").disabled = !event.target.checked; });
    input.addEventListener("change", async () => {
      try { if (input.files[0]) await inspecionar(input.files[0]); }
      catch (error) { arquivoInspecionado = null; tokenImportacao = null; document.getElementById("import-inspection-status").textContent = error.message; }
    });
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const status = document.getElementById("import-inspection-status");
      const confirm = document.getElementById("btn-confirmar-importacao");
      try {
        if (!arquivoInspecionado) throw new Error("Selecione e valide um arquivo");
        if (document.getElementById("import-clip-enabled").checked && !document.getElementById("import-clip-layer").value) throw new Error("Selecione a camada de máscara");
        confirm.disabled = true; status.textContent = "Importação enviada ao backend.";
        document.getElementById("import-progress-log").innerHTML = "";
        document.getElementById("import-progress-final").hidden = true;
        document.getElementById("btn-confirmar-progresso").disabled = true;
        dialog.close(); progressDialog.showModal();
        const result = await upload(arquivoInspecionado);
        await load();
        const final = document.getElementById("import-progress-final");
        final.className = "import-progress-final"; final.hidden = false;
        final.textContent = `${result.quantidade} camada(s) importada(s) com sucesso e confirmada(s) no catálogo.`;
        document.getElementById("btn-confirmar-progresso").disabled = false;
        arquivoInspecionado = null; tokenImportacao = null; form.reset();
      } catch (error) {
        status.textContent = error.message; confirm.disabled = false;
        if (progressDialog.open) { const final=document.getElementById("import-progress-final");final.className="import-progress-final error";final.hidden=false;final.textContent=`Falha: ${error.message}`;document.getElementById("btn-confirmar-progresso").disabled=false; }
      }
    });
    await load();
  }
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", init) : init();
})();
