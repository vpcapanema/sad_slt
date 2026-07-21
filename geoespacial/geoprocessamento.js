(function(){
  "use strict";
  const API="/api/geoespacial";
  const OPS=[
    ["Entrada e preparação",[["OP-01","Importar camada","importar-camada",1],["OP-02","Validar camada","validar-camada",1],["OP-02-CORR","Reparar geometrias","reparar-geometrias",1],["OP-03","Normalizar camada","normalizar-camada",1]]],
    ["Análise vetorial",[["OP-04","Criar buffer","criar-buffer",1],["OP-05","Sobrepor camadas","sobrepor-camadas",1],["OP-06","Dissolver","dissolver",1],["OP-07","Selecionar por localização","selecionar-por-localizacao",1]]],
    ["Transformação",[["OP-08","Converter para raster","converter-para-raster",2]]],
    ["Análise raster",[["OP-10","Calcular distância","calcular-distancia",2],["OP-11","Distância ponderada",null,0],["OP-12","Calcular densidade","calcular-densidade",2],["OP-13","Custo acumulado",null,0],["OP-14","Interpolar valores","interpolar-valores",2],["OP-15","Agregar por território","agregar-por-territorio",1],["OP-16","Criar camada booleana",null,0],["OP-17","Combinar rasters","combinar-rasters",1],["OP-20","Normalizar raster","normalizar-raster",1],["OP-21","Recortar raster",null,0],["OP-22","Estatísticas por zona",null,0]]],
    ["Operações mistas",[["OP-23","Amostrar raster em pontos",null,0],["OP-24","Extrair valores em polígono",null,0]]],
    ["Exportação",[["OP-25","Exportar camada vetorial","exportar-camada",1],["OP-26","Exportar raster","exportar-raster",2],["OP-27","Salvar camada","salvar-camada",1]]]
  ];
  const OP_ENDPOINTS={
    "OP-01":"importar-camada","OP-02":"validar-camada","OP-02-CORR":"reparar-geometrias",
    "OP-03":"normalizar-camada","OP-04":"criar-buffer","OP-05":"sobrepor-camadas",
    "OP-06":"dissolver","OP-07":"selecionar-por-localizacao","OP-08":"converter-para-raster",
    "OP-10":"calcular-distancia","OP-11":"calcular-distancia-ponderada","OP-12":"calcular-densidade",
    "OP-13":"calcular-custo-acumulado","OP-14":"interpolar-valores","OP-15":"agregar-por-territorio",
    "OP-16":"criar-camada-booleana","OP-17":"combinar-rasters","OP-20":"normalizar-raster",
    "OP-21":"recortar-raster","OP-22":"estatisticas-por-zona","OP-23":"amostrar-raster-pontos",
    "OP-24":"extrair-valores-poligono","OP-25":"exportar-camada","OP-26":"exportar-raster",
    "OP-27":"salvar-camada"
  };
  OPS.forEach(([,operations])=>operations.forEach(op=>{op[2]=OP_ENDPOINTS[op[0]]||null;op[3]=op[2]?1:0}));
  const FIELDS={
    "OP-01":[["tipo_entrada","Tipo de entrada","select",["Local","WFS"]],["caminho_arquivo","Caminho ou URL","text"]],
    "OP-02":[["camada_id","Camada","layer"],["validar_intersecoes_invalidas","Validar geometrias","check",true],["validar_crs","Validar CRS","check",true]],
    "OP-02-CORR":[["camada_id","Camada","layer"],["corrigir_geometrias_invalidas","Corrigir geometrias inválidas","check",true],["corrigir_auto_intersecoes","Corrigir auto-interseções","check",true]],
    "OP-03":[["camada_id","Camada","layer"],["crs_destino","CRS de destino","text","EPSG:4674"],["remover_geometrias_vazias","Remover vazias","check",true],["explodir_multipartes","Explodir multipartes","check",false]],
    "OP-04":[["camada_id","Camada","layer"],["distancia_buffer","Distância","number",100],["unidade_buffer","Unidade","select",["metros","graus"]],["tipo_buffer","Tipo","select",["cheio","externo"]],["dissolver_geometrias","Dissolver","check",false]],
    "OP-05":[["camada_id_1","Camada de entrada","layer"],["camada_id_2","Camada de identidade","layer"],["tipo_overlay","Operação","select",["identity","intersection","union","difference"]],["resolver_conflitos_campos","Preservar e resolver atributos","check",true]],
    "OP-06":[["camada_id","Camada","layer"],["campo_agrupamento","Campo de agrupamento","text"],["funcao_agregacao","Agregação","select",["soma","media","mediana","max","min"]]],
    "OP-07":[["camada_id","Camada alvo","layer"],["camada_ref_id","Camada de referência","layer"],["tipo_selecao","Predicado","select",["intersects","contains","within","touches"]],["inverter_selecao","Inverter seleção","check",false]],
    "OP-08":[["camada_id","Camada","layer"],["resolucao_raster","Resolução","number",50],["crs_destino","CRS","text","EPSG:31983"],["atributo_rasterizacao","Atributo","text"],["valor_preenchimento","Valor de fundo","number",0]],
    "OP-10":[["camada_id","Camada","layer"],["resolucao_distancia","Resolução","number",50],["distancia_maxima","Distância máxima","number"],["unidade_distancia","Unidade","select",["metros","graus"]]],
    "OP-12":[["camada_id","Camada de pontos","layer"],["tipo_kernel","Kernel","select",["gaussiano","epanechnikov","quadratic"]],["largura_kernel","Largura de banda","number",1000],["resolucao_kernel","Resolução","number",50]],
    "OP-14":[["camada_id","Camada de pontos","layer"],["atributo_valor","Atributo numérico","text"],["metodo_interpolacao","Método","select",["idw","kriging","spline"]],["resolucao_interpolacao","Resolução","number",50],["potencia_interpolacao","Potência IDW","number",2]],
    "OP-15":[["camada_id","Camada","layer"],["campo_unidade","Campo territorial","text"],["funcao_agregacao","Agregação","select",["soma","media","mediana","max","min"]],["atributo_agregacao","Atributo","text"]],
    "OP-17":[["raster_ids","IDs dos rasters (separados por vírgula)","text"],["pesos","Pesos (separados por vírgula)","text"],["operador","Operador","select",["soma","media_ponderada","multiplicacao"]]],
    "OP-20":[["raster_id","ID do raster","text"],["metodo_normalizacao","Método","select",["linear","winsorizacao","quebras_naturais"]],["valor_minimo","Mínimo","number"],["valor_maximo","Máximo","number"]],
    "OP-25":[["camada_id","Camada","layer"],["nome_arquivo","Nome do arquivo","text","saida.gpkg"],["formato_saida","Formato","select",["GeoPackage","GeoJSON","Shapefile"]],["opcao_salvamento","Destino","select",["memoria","persistir_sistema"]]],
    "OP-26":[["raster_id","ID do raster","text"],["nome_arquivo","Nome do arquivo","text","saida.tif"],["formato_saida","Formato","select",["GeoTIFF"]],["comprimir_arquivo","Comprimir","check",true]]
  };
  const BASEMAPS=[{id:"osm",name:"OpenStreetMap",tiles:["https://tile.openstreetmap.org/{z}/{x}/{y}.png"]},{id:"carto-light",name:"Carto Claro",tiles:["https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png"]},{id:"carto-dark",name:"Carto Escuro",tiles:["https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"]},{id:"esri-satellite",name:"Imagem de Satélite",tiles:["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"]}];
  Object.assign(FIELDS,{"OP-11":[["camada_id","Camada","layer"],["atributo_peso","Atributo de peso","text"],["resolucao_distancia","Resolução","number",50]],"OP-13":[["raster_id","ID do raster de custo","text"],["origem_linha","Linha de origem","number",0],["origem_coluna","Coluna de origem","number",0]],"OP-16":[["camada_id","Camada","layer"],["resolucao_raster","Resolução","number",50]],"OP-21":[["raster_id","ID do raster","text"],["camada_mascara_id","Camada de máscara","layer"]],"OP-22":[["raster_id","ID do raster","text"],["camada_zona_id","Camada de zonas","layer"]],"OP-23":[["raster_id","ID do raster","text"],["camada_pontos_id","Camada de pontos","layer"]],"OP-24":[["raster_id","ID do raster","text"],["camada_poligono_id","Camada de polígonos","layer"],["estatistica","Estatística","select",["media","soma","min","max"]]]});
  FIELDS["OP-27"]=[["entrada","Camada de entrada","text"],["destino","Destino","text","data/geoespacial"],["saida","Saída","text","camada_saida.gpkg"],["crs","CRS","text","auto"],["formato","Formato","select",["auto","gpkg","geojson","shapefile","geotiff"]]];
  const NO_OUTPUT=new Set(["OP-01","OP-02","OP-22","OP-23","OP-24","OP-25","OP-26","OP-27"]),RASTER_OUTPUT=new Set(["OP-08","OP-10","OP-11","OP-12","OP-13","OP-14","OP-16","OP-17","OP-20","OP-21"]);
  OPS.flatMap(x=>x[1]).forEach(op=>{if(NO_OUTPUT.has(op[0]))return;const raster=RASTER_OUTPUT.has(op[0]),base=op[1].toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"_").replace(/^_|_$/g,"");FIELDS[op[0]].push(["destino","Destino","text","data/geoespacial"],["saida","Saída","text",`${base}_saida.${raster?"tif":"gpkg"}`])});
  const state={map:null,layers:[],basemap:"osm",selected:null,activeLayerId:null,activeExecution:null,functions:[],flows:[],history:load("gp-history",[]),layerGroups:load("gp-layer-groups",{operational:false,basemap:false}),layerColors:load("gp-layer-colors",{}),geometryTypes:{},catalogHydrated:false,catalogSyncPending:false};
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
  function load(k,d){try{return JSON.parse(localStorage.getItem(k))||d}catch{return d}}
  function save(k,v){localStorage.setItem(k,JSON.stringify(v));$("#gp-save-state").textContent="Alterações salvas"}
  function icons(){window.lucide?.createIcons({attrs:{"stroke-width":1.7}})}
  function emit(name,detail={}){$(".gp-app")?.dispatchEvent(new CustomEvent(`slt:geoprocessamento:${name}`,{detail,bubbles:true}))}
  function log(msg,type=""){const el=$("#gp-log"),time=new Date().toLocaleTimeString();el.insertAdjacentHTML("beforeend",`<div class="log-${type}">[${time}] ${escapeHtml(msg)}</div>`);el.scrollTop=el.scrollHeight}
  function escapeHtml(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
  function layerColor(id,types=state.geometryTypes[id]||[]){return state.layerColors[id]||(types.some(type=>type.includes("Point"))?"#d97819":"#1683c4")}
  function applyLayerColor(id,color,report=true){
    if(!/^#[0-9a-f]{6}$/i.test(color))return false;
    state.layerColors[id]=color.toLowerCase();save("gp-layer-colors",state.layerColors);
    if(state.map?.getLayer(id))state.map.setPaintProperty(id,"fill-color",color),state.map.setPaintProperty(id,"fill-outline-color",color);
    if(state.map?.getLayer(`${id}-line`))state.map.setPaintProperty(`${id}-line`,"line-color",color);
    if(state.map?.getLayer(`${id}-point`))state.map.setPaintProperty(`${id}-point`,"circle-color",color);
    renderLayers();if(report)log(`Cor da camada alterada para ${color}.`,"ok");return true;
  }
  function ribbon(tab="mapa"){
    const sets={
      mapa:[["Dados",[["folder-open","Importar arquivo","import-file",true],["cloud-download","Importar WFS","import-wfs"],["database","Carregar do sistema","load-system"],["map","Basemap","basemap"]]],["Navegação",[["mouse-pointer-2","Explorar","explore"],["maximize","Zoom nas camadas","fit"],["scan","Zoom na seleção","fit-selection"]]],["Seleção",[["mouse-pointer-click","Selecionar","select"],["list-x","Limpar seleção","clear"]]],["Camada",[["table-properties","Tabela de atributos","attributes"],["trash-2","Remover camada","remove"],["x","Excluir camada","delete-layer"]]]],
      analise:[["Geoprocessamento",[["briefcase","Toolbox","tools",true],["play","Executar","run"],["square","Cancelar","cancel"],["history","Histórico","history"]]],["Configuração",[["sliders-horizontal","Ambientes","environments"],["shield-check","Validar entrada","validate"]]],["Resultados",[["save","Salvar resultado","save-result"],["layers","Adicionar resultado ao mapa","add-result"]]]],
      modelo:[["Funções",[["blocks","Nova função","new-function",true],["pencil","Editar função","edit-function"],["badge-check","Validar função","validate-function"],["play","Executar função","run-function"]]],["Fluxos",[["workflow","Novo fluxo","new-flow",true],["pencil","Editar fluxo","edit-flow"],["badge-check","Validar fluxo","validate-flow"],["play","Executar fluxo","run-flow"]]],["Definições",[["copy","Duplicar","duplicate"],["file-input","Importar definição","import-definition"],["file-output","Exportar definição","export-definition"]]]],
      dados:[["Inspecionar",[["info","Propriedades","properties"],["table-properties","Tabela de atributos","attributes"]]],["Consulta",[["calculator","Calcular campo","calculate-field"],["list-filter","Selecionar por atributo","select-attribute"],["filter","Filtrar camada","filter-layer"]]],["Preparar",[["globe-2","Reprojetar","reproject"],["wrench","Reparar geometria","repair"]]],["Publicar",[["badge-check","Homologar camada","homologate-layer",true],["download","Exportar dados","export"],["refresh-cw","Atualizar fonte","refresh-source"],["trash-2","Remover camada","remove"],["x","Excluir camada","delete-layer"]]]]
    };
    $("#gp-ribbon-tools").innerHTML=sets[tab].map(([g,items])=>`<div class="ribbon-group" data-label="${g}">${items.map(([i,n,a,t])=>`<button class="ribbon-action ${t?"toolbox":""}" data-action="${a}" title="${n}"><i data-lucide="${i}"></i><span>${n}</span></button>`).join("")}</div>`).join("");icons();
  }
  function initMap(){const sources={},layers=[];BASEMAPS.forEach((b,i)=>{sources[b.id]={type:"raster",tiles:b.tiles,tileSize:256,attribution:"© provedores do mapa"};layers.push({id:`basemap-${b.id}`,type:"raster",source:b.id,layout:{visibility:i?"none":"visible"}})});state.map=new maplibregl.Map({container:"gp-map",center:[-48.5,-22.4],zoom:6.2,style:{version:8,sources,layers}});state.map.addControl(new maplibregl.NavigationControl({showCompass:false}),"bottom-right");state.map.on("mousemove",e=>$("#gp-coordinates").textContent=`${e.lngLat.lng.toFixed(5)}, ${e.lngLat.lat.toFixed(5)}`);state.map.on("zoom",()=>$("#gp-scale").textContent=`Zoom ${state.map.getZoom().toFixed(1)}`)}
  function removeMapResource(id){
    [`${id}-point`,`${id}-line`,id].forEach(layerId=>{if(state.map?.getLayer(layerId))state.map.removeLayer(layerId)});
    if(state.map?.getSource(id))state.map.removeSource(id);
    delete state.geometryTypes[id];
  }
  async function reconcileCatalog(resources,requestedIds=[],focusId=null,onStage=null){
    const resourceIds=new Set(resources.map(resource=>resource.id));
    state.layers.filter(layer=>!resourceIds.has(layer.id)).forEach(layer=>removeMapResource(layer.id));
    const loadedIds=new Set([...state.layers.map(layer=>layer.id),...requestedIds]);
    state.layers=resources.filter(resource=>loadedIds.has(resource.id));
    const visible=[];
    for(const resource of state.layers){
      try{await addCatalogLayerToMap(resource.id,resource.id===focusId);visible.push(resource)}
      catch(error){removeMapResource(resource.id);log(`${resource.nome} não foi incluída: ${error.message}`,"error")}
    }
    state.layers=visible;state.catalogHydrated=true;renderLayers();onStage?.("Camada representada no mapa");
    return new Set(visible.map(resource=>resource.id));
  }
  async function refreshLayers(strict=false,requestedIds=[],focusId=null,onStage=null){
    try{
      const response=await fetch(`${API}/camadas`);if(!response.ok)throw new Error(`HTTP ${response.status}`);
      const resources=await response.json();onStage?.("Catálogo atualizado");
      if(!state.map?.isStyleLoaded()){
        if(!state.catalogSyncPending){state.catalogSyncPending=true;state.map.once("load",async()=>{state.catalogSyncPending=false;await refreshLayers()})}
        return new Set();
      }
      return await reconcileCatalog(resources,requestedIds,focusId,onStage);
    }catch(error){log(`Catálogo indisponível: ${error.message}`,"error");if(strict)throw error;return new Set(state.layers.map(layer=>layer.id))}
  }
  async function refreshDefinitions(){
    try{
      const [funcoes,fluxos]=await Promise.all([fetch(`${API}/funcoes`),fetch(`${API}/fluxos`)]);
      if(funcoes.ok)state.functions=await funcoes.json();
      if(fluxos.ok)state.flows=await fluxos.json();
    }catch(e){log(`Definições indisponíveis: ${e.message}`,"error")}
  }
  function layerSymbol(layer){
    if(layer.tipo?.toLowerCase().includes("raster"))return '<span class="layer-symbol raster" title="Raster"></span>';
    const types=state.geometryTypes[layer.id]||[],type=types[0]||"geometry",color=layerColor(layer.id,types),style=` style="--layer-color:${color}"`;
    if(type.includes("Point"))return `<span class="layer-symbol point"${style} title="Pontos"></span>`;
    if(type.includes("Line"))return `<span class="layer-symbol line"${style} title="Linhas"></span>`;
    if(type.includes("Polygon"))return `<span class="layer-symbol polygon"${style} title="Polígonos"></span>`;
    return `<span class="layer-symbol geometry"${style} title="Geometria vetorial"></span>`;
  }
  function renderLayers(){
    const query=$("#gp-layer-search").value.toLocaleLowerCase("pt-BR"),items=state.layers.filter(layer=>layer.nome.toLocaleLowerCase("pt-BR").includes(query));
    const base=BASEMAPS.filter(item=>item.name.toLocaleLowerCase("pt-BR").includes(query)).map(item=>`<label class="tree-row tree-indent"><input type="radio" name="basemap" value="${item.id}" ${state.basemap===item.id?"checked":""}><i data-lucide="map"></i><span class="layer-name">${item.name}</span></label>`).join("");
    const operational=items.map(layer=>{const onMap=Boolean(state.map?.getSource(layer.id));return `<div class="tree-row tree-indent ${state.activeLayerId===layer.id?"active":""}" data-layer="${layer.id}" tabindex="0"><input type="checkbox" ${onMap?"checked":""} aria-label="Exibir ${escapeHtml(layer.nome)}">${layerSymbol(layer)}<span class="layer-name" title="${escapeHtml(layer.nome)}">${escapeHtml(layer.nome)}</span><button class="icon-btn layer-zoom" type="button" data-zoom-layer="${layer.id}" title="Zoom para a camada"><i data-lucide="maximize"></i></button></div>`}).join("");
    const group=(id,label,icon,content,empty)=>`<section class="layer-group ${state.layerGroups[id]?"collapsed":""}" data-layer-group="${id}"><button class="tree-row layer-group-title" type="button" aria-expanded="${!state.layerGroups[id]}"><i data-lucide="chevron-down" class="tree-chevron"></i><i data-lucide="${icon}"></i><strong>${label}</strong></button><div class="layer-group-children">${content||`<div class="empty compact">${empty}</div>`}</div></section>`;
    $("#gp-layer-list").innerHTML=group("operational","Camadas operacionais","layers-3",operational,"Nenhuma camada carregada.")+group("basemap","Basemap","map",base,"Nenhum mapa-base encontrado.");icons();
  }
  function setBasemap(id){state.basemap=id;BASEMAPS.forEach(b=>{const layer=`basemap-${b.id}`;if(state.map.getLayer(layer))state.map.setLayoutProperty(layer,"visibility",b.id===id?"visible":"none")})}
  function renderToolbox(filter=""){const f=filter.toLowerCase();$("#gp-toolbox").innerHTML=OPS.map(([g,ops])=>{const rows=ops.filter(o=>(o[0]+o[1]).toLowerCase().includes(f));return rows.length?`<div class="tool-group"><button class="tool-group-title"><i data-lucide="briefcase"></i>${g}</button>${rows.map(o=>`<button class="tool-row" data-op="${o[0]}"><span class="tool-name">${o[1]}</span><span class="availability ${o[3]===2?"partial":""}" title="${o[3]===1?"Disponível":o[3]===2?"Backend em implementação":"Catalogado; motor pendente"}"></span></button>`).join("")}</div>`:""}).join("");icons()}
  function selectOp(id){state.selected=id;$$('[data-right-tab]').forEach(b=>b.classList.toggle("active",b.dataset.rightTab==="tools"));showEditor();const op=OPS.flatMap(x=>x[1]).find(x=>x[0]===id);const fields=FIELDS[id]||[];$("#gp-right-title").textContent=op[1];$("#gp-editor-view").innerHTML=`<div class="editor-head"><button class="icon-btn" data-back title="Voltar"><i data-lucide="arrow-left"></i></button><h2>${op[1]}</h2></div><form id="gp-op-form" data-op="${op[0]}"><div class="editor-body">${fields.length?fields.map(fieldHtml).join(""):`<div class="empty">O algoritmo está catalogado na stack, mas seu contrato de execução ainda não foi implementado no backend.</div>`}</div><div class="editor-actions"><button type="button" class="btn" data-add-function>Adicionar à função</button><button class="btn primary" ${!op[2]?"disabled":""}>Executar</button></div></form>`;icons();const form=$("#gp-op-form");window.gpCommands?.applyEnvironments(form);form.onsubmit=e=>{e.preventDefault();executeOp(op,e.target)};$("[data-back]").onclick=()=>showTools();$("[data-add-function]").onclick=()=>newFunction(id)}
  function fieldHtml(f){const [id,label,type,val]=f;if(type==="check")return `<label class="field-check"><input name="${id}" type="checkbox" ${val?"checked":""}>${label}</label>`;let input;if(type==="select")input=`<select name="${id}">${val.map(x=>`<option>${x}</option>`).join("")}</select>`;else if(type==="layer")input=`<select name="${id}" required><option value="">Selecione…</option>${state.layers.map(x=>`<option value="${x.id}">${escapeHtml(x.nome)}</option>`).join("")}</select>`;else input=`<input name="${id}" type="${type}" value="${val??""}" ${["number","text"].includes(type)?"":""}>`;return `<div class="field"><label>${label}</label>${input}</div>`}
  function configureLoadOperation(){
    const form=$("#gp-op-form"),type=form?.elements.tipo_entrada;
    if(!form||!type)return;
    const op=OPS.flatMap(group=>group[1]).find(item=>item[0]==="OP-01"),submit=form.querySelector('.editor-actions .primary');
    const originalAdd=form.querySelector('[data-add-function]'),head=$("#gp-editor-view .editor-head");
    form.classList.add("gp-load-form");head.classList.add("tool-parameter-head");originalAdd.hidden=true;
    if(!head.querySelector('[data-add-load-function]')){
      head.insertAdjacentHTML("beforeend",'<button type="button" class="icon-btn tool-head-action" data-add-load-function title="Adicionar este algoritmo a uma função"><i data-lucide="circle-plus"></i></button>');
      head.querySelector('[data-add-load-function]').onclick=()=>originalAdd.click();
    }
    const render=()=>{
      let field=form.querySelector('[data-load-source]')||form.elements.caminho_arquivo?.closest('.field');
      if(!field)return;
      field.dataset.loadSource="";
      if(type.value.toLocaleLowerCase("pt-BR")==="local"){
        field.innerHTML=`<label class="required-label" for="gp-local-file-name">Arquivo local</label><div class="local-file-picker"><input id="gp-local-upload" type="file" accept=".geojson,.json,.kml,.gml,.fgb,.tif,.tiff,.img,.asc,.vrt,.jp2,.zip,.rar,.7z,.tar,.tgz,.gz,.gpkg,.sqlite,.shp" hidden><input id="gp-local-file-name" type="text" placeholder="Selecione um arquivo geoespacial" readonly aria-describedby="gp-local-help"><button class="browse-btn" type="button" data-select-local title="Procurar arquivo" aria-label="Procurar arquivo"><i data-lucide="folder-open"></i></button></div><p id="gp-local-help" class="field-help">O conteúdo será descompactado, identificado e validado antes da importação.</p><div class="field"><label>CRS atual</label><input id="gp-import-current-crs" placeholder="Detectado após selecionar o arquivo" readonly></div><label class="field-check"><input id="gp-import-reproject" type="checkbox">Reprojetar CRS</label><div class="field"><label>CRS de destino</label><select id="gp-import-target-crs" disabled><option value="EPSG:4674">EPSG:4674 — SIRGAS 2000 (recomendado)</option><option value="EPSG:4326">EPSG:4326 — WGS 84</option><option value="EPSG:31983">EPSG:31983 — SIRGAS 2000 / UTM 23S</option></select></div><label class="field-check"><input id="gp-import-clip" type="checkbox">Recortar pela camada</label><div class="field"><label>Camada de máscara</label><select id="gp-import-clip-layer" disabled><option value="">Selecione…</option>${state.layers.filter(layer=>!String(layer.tipo).toLowerCase().includes("raster")).map(layer=>`<option value="${escapeHtml(layer.id)}">${escapeHtml(layer.nome)}</option>`).join("")}</select></div><p id="gp-import-inspection" class="field-help">Aguardando arquivo.</p>`;
        const input=$("#gp-local-upload"),name=$("#gp-local-file-name");
        $("[data-select-local]").onclick=()=>input.click();
        $("#gp-import-reproject").onchange=event=>$("#gp-import-target-crs").disabled=!event.target.checked;
        $("#gp-import-clip").onchange=event=>$("#gp-import-clip-layer").disabled=!event.target.checked;
        input.onchange=async()=>{const file=input.files[0];name.value=file?.name||"";submit.disabled=true;if(!file)return;const status=$("#gp-import-inspection");status.textContent="Lendo e validando…";try{const data=new FormData();data.append("arquivo",file);const response=await fetch(`${API}/importar_camadas/inspecionar`,{method:"POST",body:data}),body=await response.json();if(!response.ok)throw new Error(body.detail||`HTTP ${response.status}`);$("#gp-import-current-crs").value=body.crs_atual||"CRS não informado";status.textContent=`${body.categoria} · ${body.camadas.length} camada(s) válida(s)`;submit.disabled=false}catch(error){status.textContent=error.message}};
        submit.textContent="Importar";submit.title="Importar os arquivos para o banco e adicioná-los ao mapa";submit.disabled=true;
        form.onsubmit=async event=>{event.preventDefault();if(!input.files.length)return;if($("#gp-import-clip").checked&&!$("#gp-import-clip-layer").value){$("#gp-import-inspection").textContent="Selecione a camada de máscara.";return}submit.disabled=true;submit.textContent="Importando…";const progress=createExecutionProgress(form),options={reprojetar_crs:$("#gp-import-reproject").checked?$("#gp-import-target-crs").value:"",recortar_camada_id:$("#gp-import-clip").checked?$("#gp-import-clip-layer").value:""};await filesAdded(input.files,progress,options);submit.textContent="Importar";submit.disabled=false};
      }else{
        field.innerHTML=`<label class="required-label" for="gp-wfs-url">URL do serviço ou camada WFS</label><input id="gp-wfs-url" name="caminho_arquivo" type="url" placeholder="https://servidor.exemplo/wfs" required><p class="field-help">Informe a URL do serviço WFS ou uma requisição de camada compatível.</p>`;
        submit.textContent="Importar";submit.title="Importar a camada externa do serviço WFS";submit.disabled=false;
        form.onsubmit=event=>{event.preventDefault();executeOp(op,form)};
      }
      icons();
    };
    type.onchange=render;render();
  }
  async function executeOp(op,form){
    if(!op[2])return;
    const fd=new FormData(form),params=new URLSearchParams(),payload={};
    for(const [k,v] of fd){
      if(["destino","saida"].includes(k)&&op[0]!=="OP-27")continue;
      let value=form.elements[k]?.type==="number"&&v!==""?Number(v):v;
      if(["raster_ids","pesos"].includes(k)){
        const values=String(v).split(",").map(x=>k==="pesos"?Number(x.trim()):x.trim()).filter(x=>x!=="");
        values.forEach(item=>params.append(k,String(item)));
        payload[k]=values;
      }else{
        params.append(k,String(value));
        payload[k]=value;
      }
    }
    FIELDS[op[0]]?.filter(f=>f[2]==="check").forEach(f=>{
      const value=form.elements[f[0]].checked;params.set(f[0],String(value));payload[f[0]]=value;
    });
    log(`Executando ${op[1]}…`);
    const knownResources=new Set(state.layers.map(layer=>layer.id)),startedAt=Date.now();
    const controller=new AbortController(),submit=form.querySelector('.editor-actions .primary'),submitLabel=submit?.textContent;
    let progress=null;
    state.activeExecution=controller;if(submit){submit.disabled=true;submit.textContent="Executando…"}
    try{
      const started=await fetch(`${API}/operacoes-jobs/${op[0]}`,{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify(payload),signal:controller.signal});
      let job=await started.json();if(!started.ok)throw new Error(job.detail||`HTTP ${started.status}`);
      if(job.total>3){progress=createExecutionProgress(form);job=await waitForJob(job,progress,controller.signal)}
      else job=await waitForJob(job,null,controller.signal);
      const body=job.resultado||{};
      const resultId=body.camada_id||body.raster_id;
      const visible=await refreshLayers(true,resultId?[resultId]:[],resultId);
      if(resultId&&!visible.has(resultId)){
        if(!knownResources.has(resultId))await fetch(`${API}/camadas/${resultId}`,{method:"DELETE"}).catch(()=>{});
        removeMapResource(resultId);state.layers=state.layers.filter(layer=>layer.id!==resultId);renderLayers();
        throw new Error("O resultado foi calculado, mas não pôde ser representado no mapa; a operação foi desfeita")
      }
      log(`${op[1]} concluído.`,"ok");
      state.history.unshift({at:new Date().toISOString(),op:op[0],name:op[1],status:"concluído",durationMs:Date.now()-startedAt,parameters:payload,result:body});
      save("gp-history",state.history.slice(0,100));
      emit("resultado",{algoritmo_id:op[0],resultado:body});
      progress?.complete();
    }catch(e){
      const cancelled=e.name==="AbortError",message=cancelled?"Execução cancelada pelo usuário.":e.message;
      log(`${op[1]} ${cancelled?"cancelado":"falhou"}: ${message}`,cancelled?"":"error");
      state.history.unshift({at:new Date().toISOString(),op:op[0],name:op[1],status:cancelled?"cancelado":"erro",durationMs:Date.now()-startedAt,parameters:payload,result:String(message)});
      save("gp-history",state.history.slice(0,100));if(!cancelled)$("#gp-log").classList.add("open");
      progress?.fail(cancelled?"Execução cancelada":`Falha: ${message}`);
    }finally{if(state.activeExecution===controller)state.activeExecution=null;if(submit){submit.disabled=false;submit.textContent=submitLabel||"Executar"}}
  }
  function createExecutionProgress(host){
    host.querySelector(".execution-progress")?.remove();
    const actions=host.querySelector(".editor-actions");
    const element=document.createElement("section");element.className="execution-progress";element.setAttribute("aria-live","polite");
    element.innerHTML='<div class="execution-progress-head"><span data-progress-label>Preparando</span><strong data-progress-percent>0%</strong></div><div class="execution-progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span data-progress-bar></span></div><ol class="execution-progress-log" data-progress-log></ol>';
    if(actions)actions.before(element);else host.append(element);let value=0,total=0,completed=0;
    const set=(next,label)=>{value=Math.max(0,Math.min(100,next));const displayed=Math.round(value);element.querySelector("[data-progress-label]").textContent=label;element.querySelector("[data-progress-percent]").textContent=`${displayed}%`;const track=element.querySelector("[role=progressbar]");track.setAttribute("aria-valuenow",String(displayed));element.querySelector("[data-progress-bar]").style.width=`${value}%`};
    const configure=(nextTotal,label="Preparando nanotarefas")=>{total=Math.max(0,Number(nextTotal)||0);completed=0;value=0;element.classList.remove("complete","failed");element.querySelector("[data-progress-log]").innerHTML="";if(total<=3){element.remove();return false}set(0,`${label} · 0/${total} nanotarefas`);return true};
    const advance=(label)=>{if(total<=3)return;completed=Math.min(total,completed+1);set((completed/total)*100,`${label} · ${completed}/${total} microtarefas`)};
    const renderLogs=logs=>{const list=element.querySelector("[data-progress-log]");list.innerHTML=(logs||[]).map(item=>`<li class="${item.nivel==="erro"?"error":""}"><time>${escapeHtml(new Date(item.instante).toLocaleTimeString("pt-BR"))}</time><span>${escapeHtml(item.mensagem)}</span></li>`).join("");list.scrollTop=list.scrollHeight};
    const sync=job=>{total=job.total;completed=job.concluidas;set(job.percentual,`${job.etapa_atual} · ${job.concluidas}/${job.total} nanotarefas`);renderLogs(job.logs)};
    const note=label=>{const list=element.querySelector("[data-progress-log]"),item=document.createElement("li");item.innerHTML=`<time>${new Date().toLocaleTimeString("pt-BR")}</time><span>${escapeHtml(label)}</span>`;list.append(item);list.scrollTop=list.scrollHeight};
    return{set,configure,advance,sync,note,remove(){element.remove()},complete(){set(100,"Concluído");element.classList.add("complete");setTimeout(()=>element.remove(),3500)},fail(label){element.classList.add("failed");element.querySelector("[data-progress-label]").textContent=label;note(label);setTimeout(()=>element.remove(),8000)}};
  }
  async function waitForJob(initial,progress=null,signal=null){
    let job=initial;if(progress){progress.configure(job.total,job.etapa_atual);progress.sync(job)}
    while(!["concluido","erro"].includes(job.status)){
      await new Promise((resolve,reject)=>{const timer=setTimeout(resolve,250);signal?.addEventListener("abort",()=>{clearTimeout(timer);reject(new DOMException("Cancelado","AbortError"))},{once:true})});
      const response=await fetch(`${API}/operacoes-jobs/status/${job.id}`,{signal});job=await response.json();if(!response.ok)throw new Error(job.detail||`HTTP ${response.status}`);progress?.sync(job);
    }
    if(job.status==="erro")throw new Error(job.erro||"Falha no processamento");
    return job;
  }
  function cancelExecution(){if(!state.activeExecution)return false;state.activeExecution.abort();return true}
  function activateRightTab(id){const tab=$(`[data-right-tab="${id}"]`);if(!tab)return;tab.hidden=false;$$('[data-right-tab]').forEach(button=>{const active=button===tab;button.classList.toggle("active",active);button.setAttribute("aria-selected",String(active))});$(".gp-app").classList.remove("right-collapsed");tab.scrollIntoView({block:"nearest",inline:"nearest"})}
  function activateToolsTab(){activateRightTab("tools")}
  function showTools(){activateToolsTab();$("#gp-right-title").textContent="Geoprocessamento";$("#gp-tools-view").classList.add("active");$("#gp-editor-view").classList.remove("active")}
  function showEditor(){$("#gp-tools-view").classList.remove("active");$("#gp-editor-view").classList.add("active")}
  function showBasemapPanel(){activateToolsTab();showEditor();$("#gp-right-title").textContent="Mapa-base";$("#gp-editor-view").innerHTML=`<div class="editor-head"><button class="icon-btn" data-back title="Voltar"><i data-lucide="arrow-left"></i></button><div><h2>Mapa-base</h2><p>Escolha o mapa de referência da visualização.</p></div></div><div class="editor-body option-list">${BASEMAPS.map(item=>`<label class="option-card ${state.basemap===item.id?"selected":""}"><input type="radio" name="panel-basemap" value="${item.id}" ${state.basemap===item.id?"checked":""}><i data-lucide="map"></i><span><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.id)}</small></span></label>`).join("")}</div>`;$("[data-back]").onclick=showTools;$$('input[name="panel-basemap"]').forEach(input=>input.onchange=()=>{setBasemap(input.value);showBasemapPanel();renderLayers()});icons()}
  function showInfoPanel(title,description){activateToolsTab();showEditor();$("#gp-right-title").textContent=title;$("#gp-editor-view").innerHTML=`<div class="editor-head"><button class="icon-btn" data-back title="Voltar"><i data-lucide="arrow-left"></i></button><h2>${escapeHtml(title)}</h2></div><div class="editor-body"><div class="notice"><i data-lucide="info"></i><p>${escapeHtml(description)}</p></div></div>`;$("[data-back]").onclick=showTools;icons()}
  function newFunction(seed){showEditor();$("#gp-right-title").textContent="Editor de função";builder("function",seed?[{ref:seed,parametros:{}}]:[])}
  function newFlow(){showEditor();$("#gp-right-title").textContent="Editor de fluxo";builder("flow",[])}
  function builder(type,chosen,existing=null){
    const isFn=type==="function";
    const pool=isFn
      ? OPS.flatMap(x=>x[1]).map(o=>[o[0],o[1]])
      : [
          ...state.functions.map(f=>[`funcao:${f.id}`,`Função · ${f.nome}`]),
          ...OPS.flatMap(x=>x[1]).map(o=>[`algoritmo:${o[0]}`,`Algoritmo · ${o[1]}`]),
        ];
    const labelOf=ref=>pool.find(p=>p[0]===ref)?.[1]||ref;
    $("#gp-editor-view").innerHTML=`<div class="editor-head"><button class="icon-btn" data-back><i data-lucide="arrow-left"></i></button><h2>${existing?"Editar":isFn?"Nova função":"Novo fluxo"}</h2></div><form id="gp-builder"><div class="editor-body"><div class="field"><label>Nome</label><input name="nome" value="${escapeHtml(existing?.nome||"")}" required></div><div class="field"><label>Descrição</label><textarea name="descricao">${escapeHtml(existing?.descricao||"")}</textarea></div><div class="field"><label>${isFn?"Adicionar algoritmo":"Adicionar função ou algoritmo"}</label><select id="gp-pool"><option value="">Selecione…</option>${pool.map(p=>`<option value="${p[0]}">${escapeHtml(p[1])}</option>`).join("")}</select></div><p class="field-help">Use valores como <code>$camada_entrada</code> para expor entradas no momento da execução.</p><div id="gp-builder-list" class="builder-list"></div></div><div class="editor-actions"><button class="btn primary">Salvar</button></div></form>`;
    const render=()=>{
      $("#gp-builder-list").innerHTML=chosen.map((item,i)=>`<div class="builder-item builder-step"><i class="drag" data-lucide="grip-vertical"></i><div><strong>${escapeHtml(labelOf(item.ref))}</strong><label class="field-help">Parâmetros JSON</label><textarea data-step-params="${i}" rows="3">${escapeHtml(JSON.stringify(item.parametros||{},null,2))}</textarea></div><button type="button" class="icon-btn" data-remove="${i}"><i data-lucide="x"></i></button></div>`).join("");icons();
    };
    render();
    $("#gp-pool").onchange=e=>{if(e.target.value){chosen.push({ref:e.target.value,parametros:{}});e.target.value="";render()}};
    $("#gp-builder-list").onclick=e=>{const b=e.target.closest("[data-remove]");if(b){chosen.splice(+b.dataset.remove,1);render()}};
    $("[data-back]").onclick=showTools;
    $("#gp-builder").onsubmit=async e=>{
      e.preventDefault();
      try{
        $$('[data-step-params]').forEach(area=>{chosen[+area.dataset.stepParams].parametros=JSON.parse(area.value||"{}")});
        const base={id:existing?.id||`${isFn?"funcao":"fluxo"}_${Date.now()}`,nome:e.target.nome.value,descricao:e.target.descricao.value,parametros_expostos:[]};
        const obj=isFn
          ? {...base,passos:chosen.map(item=>({algoritmo_id:item.ref,parametros:item.parametros}))}
          : {...base,itens:chosen.map(item=>item.ref.startsWith("funcao:")?{funcao_id:item.ref.slice(7),parametros:item.parametros}:{algoritmo_id:item.ref.replace("algoritmo:",""),parametros:item.parametros})};
        const endpoint=isFn?"funcoes":"fluxos",url=existing?`${API}/${endpoint}/${existing.id}`:`${API}/${endpoint}`,r=await fetch(url,{method:existing?"PUT":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(obj)}),body=await r.json();
        if(!r.ok)throw new Error(body.detail||`HTTP ${r.status}`);
        await refreshDefinitions();log(`${isFn?"Função":"Fluxo"} “${obj.nome}” salvo no backend.`,"ok");showLibrary(isFn?"functions":"flows");
      }catch(error){log(`Definição inválida: ${error.message}`,"error");$("#gp-log").classList.add("open")}
    };
  }
  function showDefinitionRun(kind,item){
    const isFn=kind==="functions",endpoint=isFn?"funcoes":"fluxos";
    showEditor();$("#gp-right-title").textContent=`Executar ${isFn?"função":"fluxo"}`;
    $("#gp-editor-view").innerHTML=`<div class="editor-head"><button class="icon-btn" data-back title="Voltar"><i data-lucide="arrow-left"></i></button><div><h2>${escapeHtml(item.nome)}</h2><p>Informe as entradas expostas pela definição em JSON.</p></div></div><form id="gp-definition-run"><div class="editor-body"><div class="field"><label>Entradas da execução</label><textarea name="inputs" rows="10" spellcheck="false">{}</textarea></div><p class="field-help">Referências como <code>$camada_entrada</code> são resolvidas com estes valores.</p></div><div class="editor-actions"><button type="button" class="btn" data-back-bottom>Cancelar</button><button class="btn primary">Executar</button></div></form>`;
    const back=()=>showLibrary(kind);$("[data-back]").onclick=back;$("[data-back-bottom]").onclick=back;icons();
    $("#gp-definition-run").onsubmit=async event=>{
      event.preventDefault();
      try{
        const inputs=JSON.parse(event.target.inputs.value||"{}"),response=await fetch(`${API}/${endpoint}/${item.id}/executar`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(inputs)}),body=await response.json();
        if(!response.ok)throw new Error(body.detail||`HTTP ${response.status}`);
        log(`${isFn?"Função":"Fluxo"} executado com sucesso.`,"ok");await refreshLayers();showLibrary(kind);
      }catch(error){log(error.message,"error");$("#gp-log").classList.add("open")}
    };
  }
  function showLibrary(kind){
    if(kind==="properties"){showProperties(state.layers.find(layer=>layer.id===state.activeLayerId)||null);return}
    showEditor();const isFn=kind==="functions",list=isFn?state.functions:state.flows,endpoint=isFn?"funcoes":"fluxos";
    $("#gp-right-title").textContent=isFn?"Funções":"Fluxos";
    $("#gp-editor-view").innerHTML=`<div class="editor-head"><h2>${isFn?"Funções":"Fluxos"}</h2><button class="btn primary" data-new>${isFn?"Nova função":"Novo fluxo"}</button></div>${list.length?`<div class="editor-body builder-list">${list.map(x=>`<div class="builder-item"><i data-lucide="${isFn?"blocks":"workflow"}"></i><strong>${escapeHtml(x.nome)}</strong><span>${(isFn?x.passos:x.itens)?.length||0}</span><button class="btn" data-edit-definition="${x.id}">Editar</button><button class="btn" data-validate-definition="${x.id}">Validar</button><button class="btn primary" data-run-definition="${x.id}">Executar</button><button class="icon-btn danger" data-delete="${x.id}"><i data-lucide="trash-2"></i></button></div>`).join("")}</div>`:`<div class="empty">Nenhum item criado.</div>`}`;icons();
    $("[data-new]").onclick=()=>isFn?newFunction():newFlow();
    $("#gp-editor-view").onclick=async event=>{
      const del=event.target.closest("[data-delete]"),edit=event.target.closest("[data-edit-definition]"),validate=event.target.closest("[data-validate-definition]"),run=event.target.closest("[data-run-definition]");
      try{
        if(edit){const item=list.find(value=>value.id===edit.dataset.editDefinition),chosen=isFn?item.passos.map(step=>({ref:step.algoritmo_id,parametros:step.parametros||{}})):item.itens.map(step=>({ref:step.funcao_id?`funcao:${step.funcao_id}`:`algoritmo:${step.algoritmo_id}`,parametros:step.parametros||{}}));builder(isFn?"function":"flow",chosen,item)}
        if(del){const response=await fetch(`${API}/${endpoint}/${del.dataset.delete}`,{method:"DELETE"});if(!response.ok)throw new Error(`HTTP ${response.status}`);await refreshDefinitions();showLibrary(kind)}
        if(validate){const response=await fetch(`${API}/${endpoint}/${validate.dataset.validateDefinition}/validar`,{method:"POST"}),body=await response.json();log(body.valido?"Definição válida.":body.erros.join("; "),body.valido?"ok":"error")}
        if(run)showDefinitionRun(kind,list.find(value=>value.id===run.dataset.runDefinition));
      }catch(error){log(error.message,"error");$("#gp-log").classList.add("open")}
    };
  }
  function showHistory(){showEditor();$("#gp-right-title").textContent="Histórico";$("#gp-editor-view").innerHTML=state.history.length?`<div class="editor-body builder-list">${state.history.map(x=>`<details class="history-item"><summary><i data-lucide="${x.status==="erro"?"circle-x":x.status==="cancelado"?"circle-stop":"circle-check"}"></i><strong>${escapeHtml(x.name)}</strong><span>${escapeHtml(x.status)} · ${new Date(x.at).toLocaleString()}${Number.isFinite(x.durationMs)?` · ${(x.durationMs/1000).toFixed(1)} s`:""}</span></summary><div class="history-details"><strong>Parâmetros</strong><pre>${escapeHtml(JSON.stringify(x.parameters||{},null,2))}</pre><strong>Resultado</strong><pre>${escapeHtml(JSON.stringify(x.result,null,2))}</pre></div></details>`).join("")}</div>`:`<div class="empty">Nenhuma execução registrada.</div>`;icons()}
  async function zoomToCatalogLayer(id){
    const resource=state.layers.find(layer=>layer.id===id),bounds=new maplibregl.LngLatBounds();
    if(resource?.tipo?.toLowerCase().includes("raster")){
      const response=await fetch(`${API}/camadas/${id}/preview`);if(!response.ok)return;
      const preview=await response.json();preview.coordinates.forEach(coord=>bounds.extend(coord));
    }else{
      const response=await fetch(`${API}/camadas/${id}/geojson`);if(!response.ok)return;
      const data=await response.json();data.features?.forEach(feature=>walkCoords(feature.geometry?.coordinates,coord=>bounds.extend(coord)));
    }
    if(!bounds.isEmpty())state.map.fitBounds(bounds,{padding:40,maxZoom:15});
  }
  async function addCatalogLayerToMap(id,fit=true){
    if(state.map.getSource(id)){if(fit)await zoomToCatalogLayer(id);return true}
    const resource=state.layers.find(layer=>layer.id===id);
    if(!resource)throw new Error(`Recurso ${id} ausente do catálogo`);
    if(resource?.tipo?.toLowerCase().includes("raster")){
      const response=await fetch(`${API}/camadas/${id}/preview`);
      if(!response.ok)throw new Error(`Preview raster indisponível (HTTP ${response.status})`);
      const preview=await response.json();
      state.map.addSource(id,{type:"image",url:preview.image,coordinates:preview.coordinates});
      state.map.addLayer({id,type:"raster",source:id,paint:{"raster-opacity":.72}});
      if(fit){const bounds=new maplibregl.LngLatBounds();preview.coordinates.forEach(coord=>bounds.extend(coord));state.map.fitBounds(bounds,{padding:40})}
      return true;
    }
    const response=await fetch(`${API}/camadas/${id}/geojson`);
    if(!response.ok)throw new Error(`Geometria indisponível (HTTP ${response.status})`);
    const data=await response.json();
    if(!Array.isArray(data.features))throw new Error("GeoJSON sem coleção de feições");
    state.geometryTypes[id]=[...new Set((data.features||[]).map(feature=>feature.geometry?.type).filter(Boolean))];
    const color=layerColor(id,state.geometryTypes[id]);
    state.map.addSource(id,{type:"geojson",data});
    state.map.addLayer({id,type:"fill",source:id,paint:{"fill-color":color,"fill-opacity":.32,"fill-outline-color":color},filter:["==",["geometry-type"],"Polygon"]});
    state.map.addLayer({id:id+"-line",type:"line",source:id,paint:{"line-color":color,"line-width":2},filter:["==",["geometry-type"],"LineString"]});
    state.map.addLayer({id:id+"-point",type:"circle",source:id,paint:{"circle-color":color,"circle-radius":5,"circle-stroke-color":"#fff","circle-stroke-width":1},filter:["==",["geometry-type"],"Point"]});
    if(fit){const bounds=new maplibregl.LngLatBounds();data.features?.forEach(f=>walkCoords(f.geometry?.coordinates,c=>bounds.extend(c)));if(!bounds.isEmpty())state.map.fitBounds(bounds,{padding:40})}
    return true;
  }
  async function filesAdded(files,taskProgress=null,options={}){
    const selected=[...files];
    if(!selected.length)return;
    if(!taskProgress){activateToolsTab();showEditor();taskProgress=createExecutionProgress($("#gp-editor-view"))}
    let failures=0;
    for(const file of selected){
      let createdId=null;
      try{
        const form=new FormData();form.append("arquivo",file);if(options.reprojetar_crs)form.append("reprojetar_crs",options.reprojetar_crs);if(options.recortar_camada_id)form.append("recortar_camada_id",options.recortar_camada_id);
        taskProgress.note(`${file.name}: enviando ao algoritmo importar_camadas`);
        const response=await fetch(`${API}/importar_camadas`,{method:"POST",body:form});const body=await response.json();
        if(!response.ok)throw new Error(body.detail||`HTTP ${response.status}`);
        createdId=body.camada_id||body.raster_id||body.recursos?.[0]?.id;
        taskProgress.note(`${file.name}: atualizando representação da interface`);
        const visible=await refreshLayers(true,createdId?[createdId]:[],createdId,label=>taskProgress.note(`${file.name}: ${label.toLocaleLowerCase("pt-BR")}`));
        if(!createdId||!visible.has(createdId))throw new Error("O recurso foi recebido, mas sua representação espacial não pôde ser criada");
        log(`${file.name} ${body.reutilizada?"já estava importado; camada existente carregada":"importado pelo backend"}.`,"ok");
        emit("recurso-importado",body);
      }catch(e){
        failures++;
        if(createdId){removeMapResource(createdId);state.layers=state.layers.filter(layer=>layer.id!==createdId);renderLayers()}
        log(`${file.name}: ${e.message}`,"error");$("#gp-log").classList.add("open")
      }
    }
    if(failures)taskProgress.fail(`${failures} camada${failures===1?"":"s"} não puderam ser importadas`);else taskProgress.complete();
  }
  function walkCoords(v,cb){if(!Array.isArray(v))return;if(typeof v[0]==="number")cb(v);else v.forEach(x=>walkCoords(x,cb))}
  function bind(){ribbon();renderToolbox();refreshLayers();refreshDefinitions();$("#gp-tool-search").oninput=e=>renderToolbox(e.target.value);$("#gp-layer-search").oninput=renderLayers;$("#gp-toolbox").addEventListener("click",e=>{const b=e.target.closest("[data-op]");if(b)selectOp(b.dataset.op)});$$('[data-ribbon]').forEach(b=>b.onclick=()=>{$$('[data-ribbon]').forEach(x=>x.classList.toggle("active",x===b));ribbon(b.dataset.ribbon)});$$('[data-right-tab]').forEach(b=>b.addEventListener("click",()=>{$$('[data-right-tab]').forEach(x=>{const active=x===b;x.classList.toggle("active",active);x.setAttribute("aria-selected",String(active))});if(b.dataset.rightTab==="tools")showTools();else if(b.dataset.rightTab==="history")showHistory();else showLibrary(b.dataset.rightTab)}));$("#gp-file-input").onchange=e=>{filesAdded(e.target.files);e.target.value=""};const mapView=$(".gp-map-view");["dragenter","dragover"].forEach(n=>mapView.addEventListener(n,e=>{e.preventDefault();mapView.classList.add("dragging")}));["dragleave","drop"].forEach(n=>mapView.addEventListener(n,e=>{e.preventDefault();mapView.classList.remove("dragging")}));mapView.addEventListener("drop",e=>filesAdded(e.dataTransfer.files));$("#gp-home").onclick=()=>state.map.flyTo({center:[-48.5,-22.4],zoom:6.2});$("#gp-fit").onclick=()=>state.map.fitBounds([[-53.2,-25.5],[-44,-19.5]],{padding:20});$("#gp-log-toggle").onclick=()=>$("#gp-log").classList.toggle("open")}
  function showProperties(layer){
    activateRightTab("properties");showEditor();$("#gp-right-title").textContent="Propriedades";
    if(!layer){$("#gp-editor-view").innerHTML='<div class="empty">Selecione um recurso no Catálogo ou uma camada no painel Conteúdo para consultar suas propriedades.</div>';return}
    const isRaster=layer.tipo?.toLowerCase().includes("raster"),isMapVector=!isRaster&&state.layers.some(item=>item.id===layer.id),color=layerColor(layer.id);
    const symbology=isMapVector?`<section class="property-symbology"><h3>Simbologia</h3><div class="layer-color-control"><label for="gp-layer-color">Cor do símbolo e do vetor</label><div><input id="gp-layer-color" type="color" value="${color}" aria-label="Cor da camada"><output for="gp-layer-color">${color.toUpperCase()}</output></div><p>A alteração é aplicada imediatamente a pontos, linhas e polígonos.</p></div></section>`:"";
    $("#gp-editor-view").innerHTML=`<div class="editor-head"><i data-lucide="${isRaster?"grid-3x3":"shapes"}"></i><h2>${escapeHtml(layer.nome)}</h2></div><div class="editor-body"><dl class="property-list"><dt>Identificador</dt><dd>${escapeHtml(layer.id)}</dd><dt>Tipo</dt><dd>${escapeHtml(layer.tipo||"Camada")}</dd><dt>CRS</dt><dd>${escapeHtml(layer.crs||"Não informado")}</dd><dt>Origem</dt><dd>${escapeHtml(layer.origem||"Sessão")}</dd><dt>Importação</dt><dd>${escapeHtml(layer.data_importacao||"Sessão atual")}</dd></dl>${symbology}</div>`;
    const picker=$("#gp-layer-color");if(picker)picker.oninput=event=>{const next=event.target.value;applyLayerColor(layer.id,next,false);picker.nextElementSibling.value=next.toUpperCase()};icons()
  }
  function ensureAttributesTab(layerId){
    const tabId="attributes";
    state.attributeTableLayers??=[];if(layerId&&!state.attributeTableLayers.includes(layerId))state.attributeTableLayers.push(layerId);
    if(layerId)state.activeAttributeLayerId=layerId;
    let tab=$(`[data-right-tab="${tabId}"]`);
    if(!tab){
      tab=document.createElement("button");tab.type="button";tab.role="tab";tab.dataset.rightTab=tabId;tab.dataset.dynamicTab="attributes";tab.setAttribute("aria-selected","false");tab.title="Tabela de Atributos";
      tab.innerHTML=`<i data-tab-icon data-lucide="table-2"></i><span>Tabela de Atributos</span><i data-tab-close="${tabId}" data-lucide="x"></i>`;
      $(".gp-right-tabs").append(tab);icons();
    }
    tab.dataset.layerId=state.activeAttributeLayerId||"";
    activateRightTab(tabId);tab.scrollIntoView({behavior:"smooth",block:"nearest",inline:"nearest"});return tab;
  }
  function attributeRecordKey(record={}){const id=record.OBJECTID??record.ObjectID??record.objectid??record.FID??record.fid??record.id;return id!=null?String(id):JSON.stringify(record)}
  function cleanSelectionProperties(properties={}){return Object.fromEntries(Object.entries(properties).filter(([key])=>!key.startsWith("__gp_")))}
  function selectedRecordsForLayer(layerId){return(state.selectedGeoJSON?.features||[]).filter(feature=>feature.properties?.__gp_layer_id===layerId).map(feature=>cleanSelectionProperties(feature.properties))}
  function renderAttributeTable(layerId){
    const body=state.attributeTableCache?.[layerId];if(!body)return;
    const selected=selectedRecordsForLayer(layerId),selectedKeys=new Set(selected.map(attributeRecordKey));
    state.attributeTableModes??={};let mode=state.attributeTableModes[layerId]||"all";if(!selected.length)mode="all";state.attributeTableModes[layerId]=mode;
    const fetched=body.registros||[],known=new Set(fetched.map(attributeRecordKey)),all=[...selected.filter(row=>!known.has(attributeRecordKey(row))),...fetched],rows=mode==="selection"?selected:all;
    const columns=[...new Set([...(body.colunas||[]).map(column=>column.nome),...rows.flatMap(row=>Object.keys(row))])],opened=(state.attributeTableLayers||[]).filter(id=>state.layers.some(layer=>layer.id===id));
    $("#gp-editor-view").innerHTML=`<div class="attribute-workspace"><div class="attribute-layer-tabs" role="tablist" aria-label="Camadas com tabela aberta">${opened.map(id=>{const layer=state.layers.find(item=>item.id===id);return`<button type="button" role="tab" data-attribute-layer="${escapeHtml(id)}" class="${id===layerId?"active":""}" aria-selected="${id===layerId}">${escapeHtml(layer?.nome||id)}</button>`}).join("")}</div><div class="attribute-table-area"><div class="attribute-table-wrap"><table><thead><tr>${columns.map(column=>`<th>${escapeHtml(column)}</th>`).join("")}</tr></thead><tbody>${rows.map(row=>`<tr class="${selectedKeys.has(attributeRecordKey(row))?"selected-record":""}" data-record-key="${escapeHtml(attributeRecordKey(row))}">${columns.map(column=>`<td>${escapeHtml(row[column]??"")}</td>`).join("")}</tr>`).join("")}</tbody></table></div>${rows.length?"":'<div class="empty compact">Nenhum registro nesta visualização.</div>'}</div><footer class="attribute-footer"><div class="attribute-record-tabs" role="tablist"><button type="button" data-attribute-mode="all" class="${mode==="all"?"active":""}">Todos os registros</button><button type="button" data-attribute-mode="selection" class="${mode==="selection"?"active":""}" ${selected.length?"":"hidden"}>Seleção (${selected.length})</button></div><span>${selected.length} de ${body.total} selecionados</span></footer></div>`;
    $$('[data-attribute-layer]').forEach(button=>button.onclick=()=>showAttributes(button.dataset.attributeLayer));
    $$('[data-attribute-mode]').forEach(button=>button.onclick=()=>{state.attributeTableModes[layerId]=button.dataset.attributeMode;renderAttributeTable(layerId)});
    if(mode==="all")$(".selected-record")?.scrollIntoView({block:"nearest"});
  }
  async function showAttributes(layerId){
    layerId=layerId||state.activeAttributeLayerId||state.activeLayerId;if(layerId)ensureAttributesTab(layerId);showEditor();$("#gp-right-title").textContent="Tabela de Atributos";
    if(!layerId){$("#gp-editor-view").innerHTML='<div class="empty">Selecione uma camada vetorial.</div>';return}
    try{
      const response=await fetch(`${API}/camadas/${layerId}/atributos?limite=100`),body=await response.json();
      if(!response.ok)throw new Error(body.detail||`HTTP ${response.status}`);
      state.attributeTableCache??={};state.attributeTableCache[layerId]=body;state.activeAttributeLayerId=layerId;renderAttributeTable(layerId);
    }catch(error){$("#gp-editor-view").innerHTML=`<div class="empty">${escapeHtml(error.message)}</div>`}
  }
  function syncAttributeSelection(){const layerId=state.activeAttributeLayerId;if(layerId&&state.attributeTableCache?.[layerId]&&$('[data-right-tab="attributes"].active'))renderAttributeTable(layerId)}
  function removeLayerFromMap(layerId,report=true){
    if(!layerId)return;
    removeMapResource(layerId);state.layers=state.layers.filter(layer=>layer.id!==layerId);if(state.activeLayerId===layerId)state.activeLayerId=null;renderLayers();showProperties(null);if(report)log(`${layerId} removida apenas do mapa.`,"ok");
  }
  async function deleteLayerFromSystem(layerId){
    if(!layerId)return;
    const layer=state.layers.find(item=>item.id===layerId);
    if(!window.confirm(`Excluir “${layer?.nome||layerId}” definitivamente do sistema?`))return;
    const response=await fetch(`${API}/camadas/${layerId}`,{method:"DELETE"});
    const body=await response.json().catch(()=>({}));if(!response.ok)throw new Error(body.detail||`Não foi possível excluir ${layerId}`);
    removeLayerFromMap(layerId,false);delete state.layerColors[layerId];save("gp-layer-colors",state.layerColors);log(`${layerId} excluída definitivamente do sistema.`,"ok");
  }
  document.addEventListener("DOMContentLoaded",()=>{initMap();bind();showProperties(null);$("#gp-layer-list").addEventListener("change",e=>{if(e.target.name==="basemap"){setBasemap(e.target.value);showBasemapPanel()}});$("#gp-layer-list").addEventListener("click",e=>{const group=e.target.closest("[data-layer-group] > .layer-group-title");if(group){const section=e.target.closest("[data-layer-group]"),collapsed=section.classList.toggle("collapsed");group.setAttribute("aria-expanded",String(!collapsed));state.layerGroups[section.dataset.layerGroup]=collapsed;save("gp-layer-groups",state.layerGroups);return}const row=e.target.closest("[data-layer]");if(!row)return;state.activeLayerId=row.dataset.layer;$$('[data-layer]').forEach(x=>x.classList.toggle("active",x===row));showProperties(state.layers.find(x=>x.id===row.dataset.layer))});$("#gp-catalog-tree").addEventListener("click",e=>{const row=e.target.closest(".tree-row");if(!row)return;$$('.gp-catalog-tree .tree-row').forEach(x=>x.classList.toggle("active",x===row));showProperties({id:row.textContent.trim().toLowerCase().replaceAll(" ","_"),nome:row.textContent.trim(),tipo:"Recurso do projeto",origem:"Catálogo"})});icons();log("Ambiente de geoprocessamento inicializado.","ok");emit("pronto",{api:API})});
  const TOOL_SUBGROUPS={"OP-01":"Importação e conexão","OP-02":"Qualidade e preparação","OP-02-CORR":"Qualidade e preparação","OP-03":"Qualidade e preparação","OP-04":"Geometria e proximidade","OP-05":"Sobreposição espacial","OP-06":"Agregação vetorial","OP-07":"Consulta e seleção","OP-08":"Conversão de dados","OP-10":"Distância e custo","OP-11":"Distância e custo","OP-12":"Densidade e distribuição","OP-13":"Distância e custo","OP-14":"Interpolação e superfície","OP-15":"Agregação territorial","OP-16":"Criação de superfície","OP-17":"Álgebra de mapas","OP-20":"Normalização raster","OP-21":"Recorte e máscara","OP-22":"Estatística zonal","OP-23":"Amostragem raster","OP-24":"Extração zonal","OP-25":"Dados vetoriais","OP-26":"Dados raster"};
  renderToolbox=function(filter=""){const term=filter.toLocaleLowerCase("pt-BR"),collator=new Intl.Collator("pt-BR",{sensitivity:"base"}),groups=[...OPS].sort((a,b)=>collator.compare(a[0],b[0]));$("#gp-toolbox").innerHTML=groups.map(([group,operations])=>{const filtered=operations.filter(op=>op[1].toLocaleLowerCase("pt-BR").includes(term)).sort((a,b)=>collator.compare(a[1],b[1]));if(!filtered.length)return"";const subgroups=Object.groupBy?Object.groupBy(filtered,op=>TOOL_SUBGROUPS[op[0]]||"Outros"):filtered.reduce((acc,op)=>((acc[TOOL_SUBGROUPS[op[0]]||"Outros"]??=[]).push(op),acc),{});return`<div class="tool-group"><button class="tool-group-title" aria-expanded="true"><i data-lucide="chevron-down"></i><i data-lucide="briefcase"></i><span>${group}</span></button><div class="tool-group-children">${Object.entries(subgroups).sort(([a],[b])=>collator.compare(a,b)).map(([sub,items])=>`<div class="tool-subgroup"><button class="tool-subgroup-title" aria-expanded="true"><i data-lucide="chevron-down"></i><span>${sub}</span></button><div class="tool-subgroup-children">${items.map(op=>`<button class="tool-row" data-op="${op[0]}" title="${op[1]}"><i data-lucide="settings-2"></i><span class="tool-name">${op[1]}</span><span class="availability" title="Disponível"></span></button>`).join("")}</div></div>`).join("")}</div></div>`}).join("");icons()};
  fieldHtml=function(f){const[id,label,type,val]=f,prefix=id==="saida"?'<div class="form-section-title"><i data-lucide="save"></i><span>Saída</span></div>':"";if(type==="check")return`${prefix}<label class="field-check"><input name="${id}" type="checkbox" ${val?"checked":""}>${label}</label>`;let input;if(type==="select")input=`<select name="${id}">${val.map(x=>`<option value="${x}">${x}</option>`).join("")}</select>`;else if(type==="layer")input=`<select name="${id}" required><option value="">Selecione…</option>${state.layers.map(x=>`<option value="${x.id}">${escapeHtml(x.nome)}</option>`).join("")}</select>`;else input=`<input name="${id}" type="${type}" value="${escapeHtml(val??"")}">`;return`${prefix}<div class="field"><label>${label}</label>${input}</div>`};
  TOOL_SUBGROUPS["OP-27"]="Persistência";
  window.gpApp={state,selectOp,configureLoadOperation,cancelExecution,createTaskProgress:createExecutionProgress,waitForJob,applyLayerColor,showTools,showBasemapPanel,showInfoPanel,newFunction,newFlow,showProperties,showAttributes,syncAttributeSelection,showLibrary,showHistory,renderLayers,setBasemap,renderToolbox,removeLayerFromMap,deleteLayerFromSystem,addCatalogLayerToMap,zoomToCatalogLayer};
})();
