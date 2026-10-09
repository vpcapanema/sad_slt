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
  let loadProgress;
  const pendingRequests = [];
  let activeRequests = 0;
  function pumpRequests() {
    while(activeRequests < 6 && pendingRequests.length) {
      const item=pendingRequests.shift();
      if(item.options.signal?.aborted){item.reject(new DOMException("Carregamento interrompido.","AbortError"));continue;}
      activeRequests++;
      window.fetch(item.url,item.options).then(item.resolve,item.reject).finally(()=>{activeRequests--;pumpRequests();});
    }
  }
  const fetch = (url,options={}) => new Promise((resolve,reject)=> {
    pendingRequests.push({url,options:{...options,signal:options.signal || loadProgress?.signal,cache:"no-store"},resolve,reject});pumpRequests();
  });
  const trackLoad = (kind,label,job) => loadProgress.task(loadProgress.active,kind,label,job);
  const loadSources = () => Promise.allSettled([["Geometrias de saída",load,"geo-operational-group"],["Demandas",loadPostgis,"geo-postgis-group"],["Sicard Storage",loadStorage,"geo-storage-group"]].map(([label,job,key])=>loadProgress.task(loadProgress.active,"fonte",label,job,key)));
  let sourceRevision = Date.now();
  const extracaoId = new URLSearchParams(location.search).get("extracao");
  const requestedLayer = new URLSearchParams(location.search).get("camada");
  let requestedLayerHandled = false;
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
  let legendFrame = null;
  function renderLegend() {
    if(legendFrame!==null)return;
    legendFrame=requestAnimationFrame(()=>{
      legendFrame=null;
    const rows = [...registro.values()].filter((camada) => layerShown(camada)).map((camada) => { const symbol = geometryType(camada), style = GeoespacialMap.getLayerStyle(camada.id); return `<div class="geo-legend-item"><span class="geo-legend-symbol geo-legend-symbol--${symbol}" style="--legend-color:${style.fillColor || style.color};--legend-opacity:${Math.round(style.fillOpacity * 100)}%;--legend-width:${style.lineWidth}px;--legend-radius:${style.pointRadius}px"></span><span>${escapeHtml(displayName(camada))}</span></div>`; }).join("");
    document.getElementById("geoespacial-legend").innerHTML = rows || '<p class="hint">Ative uma camada para visualizar sua legenda.</p>';
    });
  }
  let initialMapReady = null;
  function mapReady() {
    // MapLibre emits load once. New sources temporarily make isStyleLoaded false,
    // so waiting for another load after each batch deadlocks the remaining queue.
    if (!initialMapReady) {
      const map=GeoespacialMap.map;
      initialMapReady=map.isStyleLoaded() ? Promise.resolve() : new Promise(resolve=>map.once("load",resolve));
    }
    return initialMapReady;
  }
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
  function feedback(message, state = "info") {
    const box = document.getElementById("viewer-feedback");
    if (!box) return;
    box.dataset.state = state;
    box.querySelector("span").textContent = message;
  }
  let selectedFeatureLayer = null;
  function detailFeature(camada, feature) {
    detail(camada);
    const properties = feature.properties || {};
    const values = Object.entries(properties).map(([name, value]) => [name,
      value !== null && typeof value === "object" ? JSON.stringify(value) : value]);
    document.getElementById("geoespacial-details-content").innerHTML = detailRows([
      ["Camada", displayName(camada)], ["Feição", feature.id ?? properties.slt_fid ?? "Selecionada"],
      ["Geometria", feature.geometry?.type || camada.geometria_tipo], ...values
    ]) + (!values.length ? '<p class="hint">Esta feição não possui atributos publicados.</p>' : "");
    selectedFeatureLayer = camada.id;
    const map = GeoespacialMap.map;
    const data = {type:"FeatureCollection",features:[{type:"Feature",properties:{},geometry:feature.geometry}]};
    if (map.getSource("viewer-selected-feature")) map.getSource("viewer-selected-feature").setData(data);
    else {
      map.addSource("viewer-selected-feature",{type:"geojson",data,tolerance:0});
      map.addLayer({id:"viewer-selected-feature-line",type:"line",source:"viewer-selected-feature",filter:["in",["geometry-type"],["literal",["Polygon","LineString"]]],paint:{"line-color":"#fde047","line-width":4}});
      map.addLayer({id:"viewer-selected-feature-point",type:"circle",source:"viewer-selected-feature",filter:["==",["geometry-type"],"Point"],paint:{"circle-radius":8,"circle-color":"#fde047","circle-stroke-color":"#1e293b","circle-stroke-width":2}});
    }
    feedback(`Feição selecionada em ${displayName(camada)}. Atributos disponíveis no painel de detalhes.`);
  }
  function initFeatureSelection() {
    const map = GeoespacialMap.map, canvas = map.getCanvas();
    canvas.style.cursor = "default";
    map.on("dragstart",()=>{canvas.style.cursor="grabbing";});
    map.on("dragend",()=>{canvas.style.cursor="default";});
    map.on("styledata",()=>{
      if (!selectedFeatureLayer) return;
      const info=GeoespacialMap.layers.get(selectedFeatureLayer);
      if (!info || !map.getSource(info.sourceId) || !map.getLayer(info.mapLayerIds[0]) || map.getLayoutProperty(info.mapLayerIds[0],"visibility")==="none") {
        selectedFeatureLayer=null;
        map.getSource("viewer-selected-feature")?.setData({type:"FeatureCollection",features:[]});
      }
    });
    map.on("click",event=>{
      const byLayer = new Map();
      GeoespacialMap.layers.forEach((info,id)=>{
        if(info.visible && !info.raster)info.mapLayerIds.forEach(layer=>{if(map.getLayer(layer))byLayer.set(layer,id);});
      });
      const features = byLayer.size ? map.queryRenderedFeatures(event.point,{layers:[...byLayer.keys()]}) : [];
      const feature=features[0], camada=feature && registro.get(byLayer.get(feature.layer.id));
      if(camada)detailFeature(camada,feature);
      else feedback("Nenhuma feição vetorial neste ponto. Clique sobre uma feição de uma camada visível.");
    });
  }
  function detailBasemap(item) {
    document.querySelectorAll(".geo-layer-record").forEach((row) => row.classList.toggle("active", row.dataset.basemapId === item.id));
    document.getElementById("geoespacial-details-content").innerHTML = detailRows([["Mapa-base", item.name], ["Tipo", item.style ? "Camada vetorial de referência" : "Camada raster de referência"], ["Provedor", item.provider], ["Data de referência", item.referenceDate], ["Uso", "Contexto cartográfico; não participa dos cálculos."]]);
    showDetails();
  }
  const basemapLoads = new Map();
  async function selecionarBasemap(id) {
    basemapAtual = BASEMAPS.some((item) => item.id === id) ? id : "osm"; localStorage.setItem("geoespacial-camadas-basemap", basemapAtual);
    const visible = document.getElementById("toggle-basemap-group")?.checked !== false, mapa = GeoespacialMap.map;
    const selected=BASEMAPS.find(item=>item.id===basemapAtual);
    if(mapa && selected?.style && !mapa.getStyle().layers.some(layer=>layer.id.startsWith(`camadas-basemap-${selected.id}-`))) {
      if(!basemapLoads.has(selected.id))basemapLoads.set(selected.id,(async()=>{
        const style=await carregarEstiloVetorial(selected,"camadas-basemap-");
        if(style.glyphs)mapa.setGlyphs(style.glyphs);
        if(style.sprite)mapa.setSprite(style.sprite);
        Object.entries(style.sources).forEach(([key,value])=>{if(!mapa.getSource(key))mapa.addSource(key,value);});
        const before=mapa.getStyle().layers.find(layer=>!layer.id.startsWith('camadas-basemap-'))?.id;
        style.layers.forEach(layer=>mapa.addLayer({...layer,layout:{...layer.layout,visibility:'none'}},before));
      })().catch(error=>{basemapLoads.delete(selected.id);aviso=error.message;throw error;}));
      try{await basemapLoads.get(selected.id);}catch{ return; }
      if(basemapAtual!==selected.id)return;
    }
    if (mapa) BASEMAPS.forEach((item) => { const alvo = visible && item.id === basemapAtual ? "visible" : "none"; const pref = `camadas-basemap-${item.id}`; mapa.getStyle().layers.forEach((layer) => { if (layer.id === pref || layer.id.startsWith(`${pref}-`)) mapa.setLayoutProperty(layer.id, "visibility", alvo); }); });
    detailBasemap(BASEMAPS.find((item) => item.id === basemapAtual));
  }
  let layerFilterApi = null;
  let filterMetadata = new Map();
  function matchesLayerFilter(camada) {
    return window.SLTPainelLayerFilter?.matches({...camada, ...filterMetadata.get(camada.id)}, layerFilterApi?.getFilter()) !== false;
  }
  function layerShown(camada) { return camadasVisiveis.has(camada.id) && matchesLayerFilter(camada); }
  function applyLayerFilter() {
    document.querySelectorAll(".geo-layer-record[data-id]").forEach((row) => {
      const camada = registro.get(row.dataset.id);
      row.hidden = !!camada && !matchesLayerFilter(camada);
    });
    [...document.querySelectorAll(".geo-layer-folder")].reverse().forEach((folder) => {
      const items = [...folder.querySelectorAll(".geo-layer-record[data-id]")];
      const active = !!layerFilterApi?.getFilter();
      const tipo = folder.dataset.folderId?.startsWith("postgis-") ? folder.dataset.folderId.slice(8) : null;
      if (tipo) {
        const matches = [...registro.values()].filter(layer=>layer.fonte==="postgis" && layer.tipo===tipo && matchesLayerFilter(layer));
        folder.querySelector(".geo-layer-folder-count").textContent = String(matches.length);
        folder.hidden = active && matches.length === 0;
      } else {
        folder.hidden = active && !!folder.dataset.carregado && !items.some((row) => !row.hidden);
      }
    });
    registro.forEach((camada) => {
      if (GeoespacialMap.layers.has(camada.id)) GeoespacialMap.toggleLayer(camada.id, layerShown(camada));
      syncProjectPin(camada, layerShown(camada));
    });
    document.getElementById("postgis-layer-count").textContent = String([...registro.values()].filter(layer=>layer.fonte==="postgis" && matchesLayerFilter(layer)).length);
    document.getElementById("viewer-layer-count").textContent = String(camadas.filter(matchesLayerFilter).length);
    renderLegend(); syncVisibility();
  }
  async function loadFilterMetadata() {
    const response = await fetch("/api/geoespacial/cadastro-filtros");
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || "Filtros de demandas indisponíveis.");
    filterMetadata = new Map(data.map((item) => [`cadastro:${item.tipo}:${item.id}`, item]));
  }
  function initLayerFilter() {
    layerFilterApi = SLTPainelLayerFilter.init({container:"#viewer-layer-filter", getAllItems:()=>[...registro.values()].map((item)=>({...item,...filterMetadata.get(item.id)})), statusLabel:(code)=>SLTStatusColors.getStatusDemanda(code).nome, onFilterChange:applyLayerFilter});
    document.getElementById("viewer-refresh").addEventListener("click", refreshSources);
  }
  async function reloadTreeItem(row) {
    const operation=loadProgress.begin("Recarregando este item…");
    sourceRevision=Date.now();
    const id=row.dataset.id;
    try {
      if(id){
        const previous=registro.get(id);
        await loadProgress.task(operation,"camada",displayName(previous),async()=>{
          let fresh;
          if(previous.fonte==="postgis"){
            const response=await fetch(`${API}/cadastro-geometrias/${previous.tipo}?codigo=${encodeURIComponent(previous.codigo || previous.id.split(":").slice(2).join(":"))}`),data=await response.json();
            if(!response.ok)throw new Error(data.detail||"Cadastro indisponível.");
            fresh=data.itens.find(item=>item.id===id);
            if(fresh)fresh={...previous,...fresh};
          }else if(previous.fonte==="storage"){
            const path=previous.arquivo.split('/').slice(0,-1).join('/');
            const response=await fetch(`${API}/storage/navegar?caminho=${encodeURIComponent(path)}`),data=await response.json();
            if(!response.ok)throw new Error(data.detail||"Pasta indisponível.");
            const item=(data.arquivos||[]).find(item=>item.id===id);
            if(item)fresh={...previous,...item,nome:item.alias||humanizar(item.nome)};
          }else{
            const response=await fetch(`${API}/saidas`),data=await response.json();
            if(!response.ok)throw new Error(data.detail||"Saídas indisponíveis.");
            const item=data.find(item=>item.id===id);if(item)fresh={...previous,...item};
          }
          if(!fresh)throw new Error("Camada não existe mais na fonte.");
          GeoespacialMap.removeLayer(id);syncProjectPin(previous,false);camadasVisiveis.delete(id);
          const parent=row.parentElement;row.outerHTML=layerRowHtml(fresh);bindLayerRows(parent);
          const input=document.querySelector(`#layer-${domId(id)}`);if(input)input.checked=true;
          await toggle(fresh,true);
        },id);
      }else{
        const selected=new Set([...row.querySelectorAll('.geo-layer-record[data-id]')].filter(item=>camadasVisiveis.has(item.dataset.id)).map(item=>item.dataset.id));
        const all=groupInput(row).checked;
        const folders=[...row.querySelectorAll('.geo-layer-folder[data-carregado]')].map(folder=>({id:folder.dataset.folderId,open:!folder.classList.contains('collapsed')}));
        const source=row.id==='geo-postgis-group'?'postgis':row.id==='geo-storage-group'?'storage':row.id==='geo-operational-group'?'saida':null;
        const affected=[...registro.values()].filter(layer=>source?source==='saida'?layer.fonte.startsWith('saida'):layer.fonte===source:!![...row.querySelectorAll('.geo-layer-record[data-id]')].find(item=>item.dataset.id===layer.id));
        affected.forEach(layer=>{GeoespacialMap.removeLayer(layer.id);syncProjectPin(layer,false);camadasVisiveis.delete(layer.id);registro.delete(layer.id);});
        if(row.classList.contains('geo-layer-folder')&&row._loadFolder){
          row._invalidateFolder?.();delete row.dataset.carregado;row.querySelector(':scope > .layer-group-body').replaceChildren();await ensureFolder(row);
        }else if(source){
          const job=source==='postgis'?loadPostgis:source==='storage'?loadStorage:load;
          if(source==='storage'){contagensStorage.clear();falhasContagensStorage.clear();}
          if(source==='postgis')await loadFilterMetadata();
          await loadProgress.task(operation,"fonte",row.querySelector('.layer-group-name').textContent,job,row.id);
        }else{
          // Pastas de saídas são geradas pelo catálogo completo; preserva-se apenas sua seleção.
          await loadProgress.task(operation,"pasta",row.dataset.folderId,load,row.dataset.folderId);
          row=[...document.querySelectorAll('.geo-layer-folder')].find(item=>item.dataset.folderId===row.dataset.folderId)||row;
        }
        for(const saved of folders){
          const folder=[...row.querySelectorAll('.geo-layer-folder')].find(item=>item.dataset.folderId===saved.id);
          if(!folder)continue;await ensureFolder(folder);folder.classList.toggle('collapsed',!saved.open);
        }
        if(all)await setGroupVisibility(row,true);
        else{
          const rows=[...row.querySelectorAll('.geo-layer-record[data-id]')].filter(item=>selected.has(item.dataset.id));
          rows.forEach(item=>loadProgress.plan(operation,"camada",displayName(registro.get(item.dataset.id)),item.dataset.id));
          await restoreLayerRows(rows);
        }
      }
      applyLayerFilter();
    }catch(error){
      aviso=error.message;
      if(id){camadasVisiveis.delete(id);GeoespacialMap.removeLayer(id);const layer=registro.get(id);if(layer)syncProjectPin(layer,false);document.querySelectorAll('.geo-layer-record[data-id]').forEach(item=>{if(item.dataset.id===id)groupInput(item).checked=false;});}
      syncVisibility();
    }finally{await loadProgress.end(operation);}
  }
  async function restoreLayerRows(rows) {
    let index=0;
    const worker=async()=>{while(index<rows.length && !loadProgress.signal?.aborted)await setLayerVisibility(rows[index++],true,false);};
    await Promise.all(Array.from({length:Math.min(6,rows.length)},worker));
  }
  async function refreshSources() {
    const button = document.getElementById("viewer-refresh"), status = document.getElementById("viewer-refresh-status");
    const operation = loadProgress.begin("Recarregando fontes e camadas…");
    const selected = new Set(camadasVisiveis);
    const folders = [...document.querySelectorAll(".geo-layer-folder[data-carregado]")].map((folder)=>({id:folder.dataset.folderId,open:!folder.classList.contains("collapsed")}));
    const selectedGroups = ["geo-postgis-group","geo-storage-group","geo-operational-group"].filter((id)=>groupInput(document.getElementById(id)).checked);
    button.disabled = true; button.setAttribute("aria-busy","true"); status.hidden = false; status.textContent = "Atualizando camadas…";
    try {
      // Aguarda as seleções em andamento antes de substituir as árvores e as fontes.
      while (!operation.controller.signal.aborted && document.querySelector("[data-selecting], [data-carregando]")) await new Promise(resolve=>setTimeout(resolve,50));
      await trackLoad("fonte","Filtros de demandas",loadFilterMetadata);
      sourceRevision = Date.now();
      registro.forEach((layer)=>{GeoespacialMap.removeLayer(layer.id);syncProjectPin(layer,false);});
      registro.clear();camadasVisiveis.clear();contagensStorage.clear();falhasContagensStorage.clear();
      await loadSources();
      if (operation.controller.signal.aborted) throw new DOMException("Carregamento interrompido.","AbortError");
      for (const saved of folders) {
        if (operation.controller.signal.aborted) break;
        const folder = [...document.querySelectorAll(".geo-layer-folder")].find((item)=>item.dataset.folderId===saved.id);
        if (!folder) continue;
        await ensureFolder(folder);
        folder.classList.toggle("collapsed",!saved.open);folder.querySelector("button").setAttribute("aria-expanded",String(saved.open));
      }
      if (operation.controller.signal.aborted) throw new DOMException("Carregamento interrompido.","AbortError");
      const rows = [...document.querySelectorAll(".geo-layer-record[data-id]")].filter(row=>selected.has(row.dataset.id));
      rows.forEach(row=>loadProgress.plan(operation,"camada",displayName(registro.get(row.dataset.id)),row.dataset.id));
      await restoreLayerRows(rows);
      for (const id of selectedGroups) await setGroupVisibility(document.getElementById(id),true);
      layerFilterApi.setItemsRefresh();applyLayerFilter();
      status.textContent = aviso ? `Atualização concluída com aviso: ${aviso}` : "Camadas atualizadas.";
    } catch (error) {status.textContent=error.message;}
    finally {await loadProgress.end(operation);button.disabled=false;button.removeAttribute("aria-busy");}
  }
  const projectPins = new Map();
  function syncProjectPin(camada, visible) {
    if (camada.fonte !== "postgis" || camada.tipo !== "projeto") return;
    if (!visible) { projectPins.get(camada.id)?.remove(); projectPins.delete(camada.id); return; }
    if (projectPins.has(camada.id)) return;
    const bounds = camada.bounds;
    if (!bounds || bounds.length !== 4 || !bounds.every(Number.isFinite)) return;
    const colors = window.SLTStatusColors;
    const element = document.createElement("div");
    element.style.width = "24px"; element.style.height = "36px";
    element.setAttribute("aria-label", `Projeto ${displayName(camada)}`);
    element.title = displayName(camada);
    element.innerHTML = colors.pinSvgByFase(colors.getStatusFase(camada.status), colors.getStatusDemanda(camada.status).row);
    const svg = element.querySelector("svg");
    svg.setAttribute("width", "24"); svg.setAttribute("height", "36");
    svg.style.display = "block";
    element.addEventListener("click", (event) => { event.stopPropagation(); const feature=camada.geojson?.features?.[0]; if(feature)detailFeature(camada,feature);else detail(camada); });
    const position = camada.posicao || [(bounds[0] + bounds[2]) / 2, (bounds[1] + bounds[3]) / 2];
    projectPins.set(camada.id, new maplibregl.Marker({ element, anchor: "bottom" }).setLngLat(position).addTo(GeoespacialMap.map));
  }
  /* Liga/desliga uma camada de qualquer fonte, criando-a no mapa na primeira vez. */
  async function toggle(camada, visible, fit = true) {
    if (!visible) { camadasVisiveis.delete(camada.id); GeoespacialMap.toggleLayer(camada.id, false); syncProjectPin(camada, false); renderLegend(); return; }
    if (fit) detail(camada); camadasVisiveis.add(camada.id); renderLegend();
    if (GeoespacialMap.layers.has(camada.id)) { GeoespacialMap.toggleLayer(camada.id, layerShown(camada)); syncProjectPin(camada, layerShown(camada)); return; }
    await mapReady();
    const opcoes = { tolerance: 0, uniqueStyle: true, label: displayName(camada), labelsVisible: rotulosAtivos && camada.fonte === "saida" };
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
      const consulta = `viewer_revision=${sourceRevision}&caminho=${encodeURIComponent(camada.arquivo)}${camada.camada ? `&camada=${encodeURIComponent(camada.camada)}` : ""}`;
      GeoespacialMap.addVectorTileLayer(camada.id, `${API}/storage/camada/tiles/{z}/{x}/{y}.pbf?${consulta}`, opcoes);
      const response = await fetch(`${API}/storage/camada/bounds?${consulta}`);
      if (!response.ok) throw new Error("Extensão da camada indisponível");
      GeoespacialMap.layers.get(camada.id).bounds = (await response.json()).bounds;
    } else {
      GeoespacialMap.addVectorTileLayer(camada.id, `${API}/camadas/${encodeURIComponent(camada.id)}/tiles/{z}/{x}/{y}.pbf?viewer_revision=${sourceRevision}`, opcoes);
      const response = await fetch(`${API}/camadas/${encodeURIComponent(camada.id)}/bounds`);
      if (!response.ok) throw new Error("Extensão da camada indisponível");
      GeoespacialMap.layers.get(camada.id).bounds = (await response.json()).bounds;
    }
    GeoespacialMap.toggleLayer(camada.id, layerShown(camada));
    syncProjectPin(camada, layerShown(camada));
    if (fit && camadasVisiveis.has(camada.id)) GeoespacialMap.fitBounds(camada.id);
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
      groupInput(item).addEventListener("change", (event) => setLayerVisibility(item, event.target.checked));
    });
    loadProgress?.repaint();
    layerFilterApi?.refresh(); applyLayerFilter();
    if (!container.dataset.symbolBound) {
      container.dataset.symbolBound = "1";
      container.addEventListener("click", (event) => { const symbol = event.target.closest(".geo-layer-tree-symbol"); if (!symbol) return; event.stopPropagation(); const row = symbol.closest(".geo-layer-record"), camada = registro.get(row?.dataset.id); if (camada) openProperties(camada, row); });
    }
  }
  /* Pasta (subnível do menu): cabeçalho recolhível e corpo preenchido sob demanda. */
  function folderHtml({ id, rotulo, caminho, aberto = false, carregado = false, contagem = "0" }) {
    if (caminho) contagem = contagensStorage.has(caminho) ? contagensStorage.get(caminho) : "…";
    return `<div class="layer-group layer-group--pasta geo-layer-folder${aberto ? "" : " collapsed"}" data-folder-id="${escapeHtml(id)}" ${caminho ? `data-caminho="${escapeHtml(caminho)}"` : ""} ${carregado ? 'data-carregado="1"' : ""}><div class="layer-group-header-row"><label class="layer-visibility-toggle" title="Exibir ou ocultar as camadas desta pasta"><input type="checkbox" class="layer-visibility-input layer-visibility-input--group"></label><button type="button" class="layer-group-header layer-group-header--record layer-group-header--pasta" aria-expanded="${aberto}"><span class="layer-group-toggle" aria-hidden="true">▼</span><span class="geo-layer-copy"><i class="fa-solid fa-folder geo-layer-folder-icon" aria-hidden="true"></i><span class="layer-group-name">${escapeHtml(rotulo)}</span><span class="layer-group-active-count geo-layer-folder-count">${escapeHtml(contagem)}</span></span></button></div><div class="layer-group-body geo-layer-folder-body" role="group">${carregado ? "" : '<p class="layers-empty layers-empty--nested hint">Carregando…</p>'}</div></div>`;
  }
  const folderLoads = new WeakMap();
  function groupInput(group) {
    return group.querySelector(":scope > .layer-group-header-row input[type=checkbox]");
  }
  function syncVisibility() {
    const groups = [...document.querySelectorAll(".geo-layer-folder"), ...["geo-operational-group", "geo-postgis-group", "geo-storage-group"].map((id) => document.getElementById(id))];
    groups.forEach((group) => {
      const input = groupInput(group);
      if (!input || group.dataset.selecting) return;
      const rows = [...group.querySelectorAll(".geo-layer-record[data-id]")].filter(row=>!row.hidden);
      const active = rows.filter((row) => camadasVisiveis.has(row.dataset.id)).length;
      const unknown = [...group.querySelectorAll(".geo-layer-folder")].some((folder) => !folder.dataset.carregado) || (group.classList.contains("geo-layer-folder") && !group.dataset.carregado);
      input.checked = rows.length > 0 && active === rows.length && !unknown;
      input.indeterminate = active > 0 && !input.checked;
    });
  }
  async function setLayerVisibility(row, visible, fit = true) {
    const input = groupInput(row), camada = registro.get(row.dataset.id);
    if (!camada || !input) return;
    input.checked = visible;
    const operation = visible ? loadProgress.begin("Carregando camadas no mapa…") : null;
    try { await loadProgress.task(operation,"camada",displayName(camada),()=>toggle(camada, visible, fit),camada.id); }
    catch (error) {
      input.checked = false; camadasVisiveis.delete(camada.id); GeoespacialMap.removeLayer(camada.id); syncProjectPin(camada, false);
      aviso = error.message;
      document.getElementById("geoespacial-details-content").innerHTML = `<p class="hint" role="alert">${escapeHtml(error.message)}</p>`;
      renderLegend();
    }
    await loadProgress.end(operation);
    syncVisibility();
  }
  async function ensureFolder(folder) {
    if (folder.dataset.carregado || !folder._loadFolder) return;
    if (!folderLoads.has(folder)) {
      folder.dataset.carregando = "1";
      const operation = loadProgress.begin("Consultando pastas e camadas…");
      folderLoads.set(folder, loadProgress.task(operation,"pasta",folder.dataset.caminho || folder.dataset.folderId,async()=>{
        await folder._loadFolder(folder);
        if (!folder.dataset.carregado) throw new Error("Não foi possível carregar esta pasta.");
      },folder.dataset.folderId).catch(()=>{}).finally(async () => {
        folderLoads.delete(folder); delete folder.dataset.carregando; applyLayerFilter();
        await loadProgress.end(operation);
      }));
    }
    await folderLoads.get(folder);
  }
  async function setGroupVisibility(group, visible) {
    const operation = visible ? loadProgress.begin("Carregando todas as camadas do grupo…") : null;
    const version = (group._selectionVersion || 0) + 1;
    group._selectionVersion = version;
    const current = () => group._selectionVersion === version && !operation?.controller.signal.aborted;
    group.dataset.selecting = "1";
    const input = groupInput(group);
    input.checked = visible; input.indeterminate = false;
    const selectedRows = [];
    async function visit(node) {
      if (!current()) return;
      if (visible && node.classList.contains("geo-layer-folder")) await ensureFolder(node);
      if (!current()) return;
      const body = node.querySelector(":scope > .layer-group-body");
      if (!body) return;
      for (const child of body.children) {
        if (!current()) return;
        if (child.classList.contains("geo-layer-folder")) await visit(child);
        else if (child.matches(".geo-layer-record[data-id]")) { if (matchesLayerFilter(registro.get(child.dataset.id))) selectedRows.push(child); }
      }
    }
    try {
      await visit(group);
      if (!current()) return;
      selectedRows.forEach((row) => { groupInput(row).checked = visible; if (visible) loadProgress.plan(operation,"camada",displayName(registro.get(row.dataset.id)),row.dataset.id); });
      let index = 0;
      async function worker() {
        while (current() && index < selectedRows.length) {
          const row = selectedRows[index++];
          await setLayerVisibility(row, visible, false);
        }
      }
      // Seis carregamentos simultâneos; todas as camadas entram na fila.
      await Promise.all(Array.from({ length: Math.min(6, selectedRows.length) }, worker));
      if (current() && visible) {
        const bounds = selectedRows.filter((row) => camadasVisiveis.has(row.dataset.id)).map((row) => GeoespacialMap.layers.get(row.dataset.id)?.bounds).filter((value) => value?.length === 4);
        if (bounds.length) GeoespacialMap.map.fitBounds([[Math.min(...bounds.map((b) => b[0])), Math.min(...bounds.map((b) => b[1]))], [Math.max(...bounds.map((b) => b[2])), Math.max(...bounds.map((b) => b[3]))]], { padding: 60, maxZoom: 14 });
      }
    }
    finally {
      if (group._selectionVersion === version) {
        selectedRows.forEach(row=>{groupInput(row).checked=camadasVisiveis.has(row.dataset.id);});
        delete group.dataset.selecting; syncVisibility();
      }
      await loadProgress.end(operation);
    }
  }
  function bindFolders(container, carregar) {
    container.querySelectorAll(".geo-layer-folder:not([data-bound])").forEach((pasta) => {
      pasta.dataset.bound = "1";
      pasta._loadFolder = carregar;
      const header = pasta.querySelector(":scope > .layer-group-header-row button");
      header.addEventListener("click", async () => {
        const collapsed = pasta.classList.toggle("collapsed"); header.setAttribute("aria-expanded", String(!collapsed));
        if (!collapsed) await ensureFolder(pasta);
      });
      groupInput(pasta).addEventListener("change", (event) => setGroupVisibility(pasta, event.target.checked));
      if (!pasta.classList.contains("collapsed")) ensureFolder(pasta);
    });
    loadProgress?.repaint();
    syncVisibility();
  }
  function atualizarContagem(pasta) {
    for (let grupo = pasta; grupo; grupo = grupo.parentElement?.closest(".geo-layer-folder")) {
      const total = grupo.dataset.caminho ? contagensStorage.get(grupo.dataset.caminho) : grupo.querySelectorAll(".geo-layer-record").length;
      const alvo = grupo.querySelector(":scope > .layer-group-header-row .geo-layer-folder-count"); if (alvo) alvo.textContent = total == null ? "…" : String(total);
    }
  }
  async function openRequestedLayer(source) {
    if (!requestedLayer || requestedLayerHandled) return;
    const expected=requestedLayer.startsWith("cadastro:")?"postgis":requestedLayer.startsWith("storage:")?"storage":"saida";
    if (source!==expected) return;
    requestedLayerHandled=true;
    try {
      if (source==="storage") {
        const relative=requestedLayer.slice(8).split("::")[0];
        const parts=relative.split("/").slice(0,-1);
        for(let i=1;i<=parts.length;i++) {
          const path=parts.slice(0,i).join("/");
          const folder=[...document.querySelectorAll(".geo-layer-folder[data-caminho]")].find(row=>row.dataset.caminho===path);
          if(!folder)throw new Error("A pasta da camada não está disponível.");
          await ensureFolder(folder);folder.classList.remove("collapsed");folder.querySelector("button").setAttribute("aria-expanded","true");
        }
      } else if(source==="postgis") {
        const folder=[...document.querySelectorAll(".geo-layer-folder")].find(row=>row.dataset.folderId===`postgis-${requestedLayer.split(":")[1]}`);
        if(folder)await ensureFolder(folder);
      }
      const relative=source==="storage"?requestedLayer.slice(8).split("::")[0]:null;
      const rows=[...document.querySelectorAll(".geo-layer-record[data-id]")].filter(row=>row.dataset.id===requestedLayer || (relative&&!requestedLayer.includes("::")&&registro.get(row.dataset.id)?.arquivo===relative));
      if(!rows.length)throw new Error("Camada solicitada não encontrada ou indisponível.");
      for(const row of rows) {
        for(let parent=row.parentElement.closest(".layer-group");parent;parent=parent.parentElement?.closest(".layer-group")) {parent.classList.remove("collapsed");parent.querySelector(":scope > .layer-group-header-row button")?.setAttribute("aria-expanded","true");}
        await setLayerVisibility(row,true,true);
      }
      feedback("Camada aberta a partir do explorador.");
    } catch(error) {feedback(error.message,"error");}
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
    let sourceError;
    try {
      const response = await fetch(`${API}/saidas${extracaoId ? `?execucao_id=${encodeURIComponent(extracaoId)}` : ""}`);
      const rows = await response.json();
      if (!response.ok) throw new Error(rows.detail || "Não foi possível consultar as saídas.");
      camadas = rows.map((row) => ({...row, fonte:row.fonte || "saida"}));
      camadas.forEach((camada) => registro.set(camada.id, camada));
    } catch (error) { aviso = error.message; sourceError=error; }
    render();
    const input = document.querySelector("#geoespacial-layers-list .geo-layer-record[data-id] .layer-visibility-input");
    if (extracaoId && camadas[0] && input) { input.checked = true; try { await setLayerVisibility(input.closest(".geo-layer-record"),true); } catch (error) { input.checked = false; aviso = error.message; } }
    if (sourceError) throw sourceError;
    await openRequestedLayer("saida");
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
    host.querySelectorAll('.geo-layer-folder').forEach(folder=>{
      folder._invalidateFolder=()=>consultas.delete(folder.dataset.folderId.replace('postgis-',''));
    });
    // Contagem total do grupo sem abrir as pastas.
    await Promise.all(POSTGIS_TIPOS.map(async (grupo) => {
      try {
        const dados = await consultar(grupo), n = dados.itens.length;
        dados.itens.forEach(item=>registro.set(item.id,{...item,fonte:"postgis",tabela:grupo.tabela,tipoRotulo:grupo.rotulo}));
        contagens.set(grupo.tipo, n);
        const alvo = host.querySelector(`[data-folder-id="postgis-${grupo.tipo}"] .geo-layer-folder-count`);
        if (alvo) alvo.textContent = String(n);
      } catch { falhas.add(grupo.tipo); host.querySelector(`[data-folder-id="postgis-${grupo.tipo}"] .geo-layer-folder-count`).textContent = "—"; }
    }));
    atualizarTotal();
    layerFilterApi?.refresh();applyLayerFilter();
    await openRequestedLayer("postgis");
    if (falhas.size) throw new Error("Um ou mais cadastros de demandas não puderam ser carregados.");
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
  async function loadStorage() {
    const host = document.getElementById("geoespacial-storage-tree");
    host.innerHTML = STORAGE_RAIZES.map((raiz) => folderHtml({ id: `storage-${raiz.caminho}`, rotulo: raiz.rotulo, caminho: raiz.caminho })).join("");
    bindFolders(host, carregarPastaStorage);
    void openRequestedLayer("storage");
    document.getElementById("storage-layer-count").textContent = "…";
    await Promise.all(STORAGE_RAIZES.map(async (raiz) => {
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
    }));
    if (falhasContagensStorage.size) throw new Error("Uma ou mais fontes do Storage não puderam ser consultadas.");
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
    loadProgress = ViewerLoadProgress.create(document.getElementById("geo-layers-root"),()=>({map:GeoespacialMap.map,layers:GeoespacialMap.layers,reload:reloadTreeItem,feedback,failSource:(id,message)=>{
      GeoespacialMap.removeLayer(id);camadasVisiveis.delete(id);const layer=registro.get(id);if(layer)syncProjectPin(layer,false);
      document.querySelectorAll(".geo-layer-record[data-id]").forEach(row=>{if(row.dataset.id===id)groupInput(row).checked=false;});
      aviso=message;applyLayerFilter();
    },cancelPending:()=>{
      const map=GeoespacialMap.map; map?.stop();
      registro.forEach(layer=>{
        const info=GeoespacialMap.layers.get(layer.id);
        if (info?.visible && map.getSource(info.sourceId) && !map.isSourceLoaded(info.sourceId)) {
          GeoespacialMap.removeLayer(layer.id);camadasVisiveis.delete(layer.id);syncProjectPin(layer,false);
          document.querySelectorAll(".geo-layer-record[data-id]").forEach(row=>{if(row.dataset.id===layer.id)groupInput(row).checked=false;});
        }
      });
      applyLayerFilter();
    }}));
    initContextPanel();
    initGroupReordering();
    const sources = {}, layers = [];
    let glyphs = "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf", sprite;
    for (const item of BASEMAPS.filter(item=>!item.style)) {
      sources[item.id] = {type:"raster",tiles:item.tiles,tileSize:256,attribution:item.provider};
      layers.push({id:`camadas-basemap-${item.id}`,type:"raster",source:item.id,layout:{visibility:item.id===basemapAtual?"visible":"none"}});
    }
    GeoespacialMap.init("map-geoespacial", { center: [-48.5, -22.4], zoom: 6.2, nativeTools: true, style: { version: 8, glyphs, ...(sprite ? { sprite } : {}), sources, layers } });
    mapReady();
    document.querySelectorAll("[data-context-tab]").forEach((button) => button.addEventListener("click", () => activateContextTab(button.dataset.contextTab)));
    ["geo-operational-group", "geo-postgis-group", "geo-storage-group", "geo-basemap-group"].forEach((id) => { const group = document.getElementById(id), header = group.querySelector(":scope > .layer-group-header-row .layer-group-header--tipo"); header.addEventListener("click", () => { const collapsed = group.classList.toggle("collapsed"); header.setAttribute("aria-expanded", String(!collapsed)); }); });
    const labelButton = document.getElementById("toggle-operational-labels"); labelButton.classList.toggle("is-active", rotulosAtivos); labelButton.setAttribute("aria-pressed", String(rotulosAtivos));
    labelButton.addEventListener("click", () => { rotulosAtivos = !rotulosAtivos; labelButton.classList.toggle("is-active", rotulosAtivos); labelButton.setAttribute("aria-pressed", String(rotulosAtivos)); localStorage.setItem("geoespacial-camadas-labels", String(rotulosAtivos)); camadas.forEach((camada) => GeoespacialMap.toggleLabels(camada.id, rotulosAtivos)); });
    [["toggle-operational-group", "#geoespacial-layers-list"], ["toggle-postgis-group", "#geoespacial-postgis-tree"], ["toggle-storage-group", "#geoespacial-storage-tree"]].forEach(([toggleId, seletor]) => {
      document.getElementById(toggleId).addEventListener("change", (event) => setGroupVisibility(document.querySelector(seletor).closest(".layer-group"), event.target.checked));
    });
    document.getElementById("toggle-basemap-group").addEventListener("change", () => selecionarBasemap(basemapAtual));
    activateContextTab("legend"); renderLegend();
    if(BASEMAPS.find(item=>item.id===basemapAtual)?.style)mapReady().then(()=>selecionarBasemap(basemapAtual));
    initFeatureSelection();
    initLayerFilter();
    const initialLoad = loadProgress.begin("Carregando as fontes de camadas…");
    try {
      await Promise.all([trackLoad("fonte","Filtros de demandas",loadFilterMetadata).catch(error=>{aviso=error.message;}), loadSources()]);
    } finally { await loadProgress.end(initialLoad); }
    layerFilterApi?.refresh();applyLayerFilter();
    syncVisibility();
  }
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", init) : init();
})();
