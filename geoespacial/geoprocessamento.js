(function(){
  "use strict";
  const API="/api/geoespacial";
  const CRS_DESCRIPTIONS={"EPSG:4674":"SIRGAS 2000","EPSG:4326":"WGS 84","EPSG:3857":"WGS 84 / Pseudo-Mercator","EPSG:31982":"SIRGAS 2000 / UTM zona 22S","EPSG:31983":"SIRGAS 2000 / UTM zona 23S","EPSG:31984":"SIRGAS 2000 / UTM zona 24S","EPSG:5880":"SIRGAS 2000 / Brazil Polyconic"};
  const CRS_VALUES=Object.keys(CRS_DESCRIPTIONS);
  const crsLabel=value=>CRS_DESCRIPTIONS[value]?`${value} (${CRS_DESCRIPTIONS[value]})`:value;
  const OUTPUT_SUFFIX_BY_OPERATION={"OP-01":"camada_importada"};
  const OPS=[
    ["Entrada e preparação",[["OP-01","Importar camada","importar-camada",1],["OP-02","Validar camada","validar-camada",1],["OP-02-CORR","Reparar geometrias","reparar-geometrias",1],["OP-03","Normalizar camada","normalizar-camada",1]]],
    ["Análise vetorial",[["OP-04","Criar buffer","criar-buffer",1],["OP-05","Sobrepor camadas","sobrepor-camadas",1],["OP-05-IDENT","Identity","sobrepor-camadas",1],["OP-06","Dissolver","dissolver",1],["OP-07","Selecionar por localização","selecionar-por-localizacao",1]]],
    ["Transformação",[["OP-08","Converter para raster","converter-para-raster",2]]],
    ["Análise raster",[["OP-10","Calcular distância","calcular-distancia",2],["OP-11","Distância ponderada",null,0],["OP-12","Calcular densidade","calcular-densidade",2],["OP-13","Custo acumulado",null,0],["OP-14","Interpolar valores","interpolar-valores",2],["OP-15","Agregar por território","agregar-por-territorio",1],["OP-16","Criar camada booleana",null,0],["OP-17","Combinar rasters","combinar-rasters",1],["OP-20","Normalizar raster","normalizar-raster",1],["OP-21","Recortar raster",null,0],["OP-22","Estatísticas por zona",null,0]]],
    ["Operações mistas",[["OP-23","Amostrar raster em pontos",null,0],["OP-24","Extrair valores em polígono",null,0]]],
    ["Geometria vetorial",[["OP-28","Calcular centroides",null,1],["OP-29","Criar fecho convexo",null,1],["OP-30","Criar envelopes",null,1],["OP-31","Simplificar geometrias",null,1],["OP-32","Explodir multipartes",null,1]]],
    ["Sobreposição e relacionamento",[["OP-33","Recortar camada vetorial",null,1],["OP-34","Junção espacial",null,1],["OP-35","Mesclar camadas",null,1]]],
    ["Medições e coordenadas",[["OP-36","Reprojetar camada",null,1],["OP-37","Calcular área",null,1],["OP-38","Calcular comprimento",null,1]]],
    ["Álgebra e filtros raster",[["OP-39","Reclassificar raster",null,1],["OP-40","Aplicar limiar raster",null,1],["OP-41","Inverter raster",null,1],["OP-42","Filtro focal raster",null,1],["OP-43","Suavização gaussiana",null,1]]],
    ["Exportação",[["OP-25","Exportar camada vetorial","exportar-camada",1],["OP-26","Exportar raster","exportar-raster",2],["OP-27","Salvar camada","salvar-camada",1]]]
  ];
  const OP_ENDPOINTS={
    "OP-01":"importar-camada","OP-02":"validar-camada","OP-02-CORR":"reparar-geometrias",
    "OP-03":"normalizar-camada","OP-04":"criar-buffer","OP-05":"sobrepor-camadas",
    "OP-05-IDENT":"sobrepor-camadas",
    "OP-06":"dissolver","OP-07":"selecionar-por-localizacao","OP-08":"converter-para-raster",
    "OP-10":"calcular-distancia","OP-11":"calcular-distancia-ponderada","OP-12":"calcular-densidade",
    "OP-13":"calcular-custo-acumulado","OP-14":"interpolar-valores","OP-15":"agregar-por-territorio",
    "OP-16":"criar-camada-booleana","OP-17":"combinar-rasters","OP-20":"normalizar-raster",
    "OP-21":"recortar-raster","OP-22":"estatisticas-por-zona","OP-23":"amostrar-raster-pontos",
    "OP-24":"extrair-valores-poligono","OP-25":"exportar-camada","OP-26":"exportar-raster",
    "OP-27":"salvar-camada","OP-28":"calcular-centroides","OP-29":"criar-fecho-convexo",
    "OP-30":"criar-envelopes","OP-31":"simplificar-geometrias","OP-32":"explodir-multipartes",
    "OP-33":"recortar-camada-vetorial","OP-34":"juncao-espacial","OP-35":"mesclar-camadas",
    "OP-36":"reprojetar-camada","OP-37":"calcular-area","OP-38":"calcular-comprimento",
    "OP-39":"reclassificar-raster","OP-40":"aplicar-limiar-raster","OP-41":"inverter-raster",
    "OP-42":"filtro-focal-raster","OP-43":"suavizacao-gaussiana"
  };
  const TOOLBOX_SCOPES={
    geral:{nome:"SIRCADI Toolbox",ids:null},
    vetor_raster:{nome:"Geospatial Toolbox",ids:new Set(["OP-01","OP-02","OP-02-CORR","OP-03","OP-04","OP-05","OP-05-IDENT","OP-06","OP-07","OP-08","OP-15","OP-16","OP-21","OP-22","OP-23","OP-24","OP-25","OP-26","OP-27","OP-28","OP-29","OP-30","OP-31","OP-32","OP-33","OP-34","OP-35","OP-36"])},
    cientifica:{nome:"Numerical Analysis Toolbox",ids:new Set(["OP-10","OP-11","OP-12","OP-13","OP-17","OP-20","OP-37","OP-38","OP-39","OP-40","OP-41","OP-42","OP-43"])},
    interpolacao:{nome:"Surface Modeling Toolbox",ids:new Set(["OP-10","OP-11","OP-12","OP-14","OP-16","OP-20","OP-39","OP-40","OP-43"])}
  };
  const TOOL_LIBRARY={
    "OP-01":"GDAL","OP-02":"GeoPandas","OP-02-CORR":"Shapely","OP-03":"PyProj","OP-04":"Shapely","OP-05":"GeoPandas","OP-05-IDENT":"GeoPandas","OP-06":"GeoPandas","OP-07":"GeoPandas",
    "OP-08":"Rasterio","OP-10":"SciPy","OP-11":"SciPy","OP-12":"Scikit-learn","OP-13":"SciPy","OP-14":"PyKrige","OP-15":"GeoPandas","OP-16":"Rasterio","OP-17":"NumPy","OP-20":"NumPy","OP-21":"Rasterio","OP-22":"Rasterio","OP-23":"Rasterio","OP-24":"Rasterio",
    "OP-25":"Fiona","OP-26":"GDAL","OP-27":"GDAL","OP-28":"Shapely","OP-29":"Shapely","OP-30":"Shapely","OP-31":"Shapely","OP-32":"GeoPandas","OP-33":"GeoPandas","OP-34":"GeoPandas","OP-35":"Pandas","OP-36":"PyProj","OP-37":"Shapely","OP-38":"Shapely",
    "OP-39":"NumPy","OP-40":"NumPy","OP-41":"NumPy","OP-42":"SciPy","OP-43":"SciPy"
  };
  OPS.forEach(([,operations])=>operations.forEach(op=>{op[2]=OP_ENDPOINTS[op[0]]||null;op[3]=op[2]?1:0}));
  const FIELDS={
    "OP-01":[["tipo_entrada","Tipo de entrada","select",["Local","WFS"]],["caminho_arquivo","Caminho ou URL","text"]],
    "OP-02":[["camada_id","Camada","layer"],["validar_intersecoes_invalidas","Validar geometrias","check",true],["validar_crs","Validar CRS","check",true]],
    "OP-02-CORR":[["camada_id","Camada","layer"],["corrigir_geometrias_invalidas","Corrigir geometrias inválidas","check",true],["corrigir_auto_intersecoes","Corrigir auto-interseções","check",true]],
    "OP-03":[["camada_id","Camada","layer"],["crs_destino","CRS de destino","select",CRS_VALUES],["remover_geometrias_vazias","Remover vazias","check",true],["explodir_multipartes","Explodir multipartes","check",false]],
    "OP-04":[["camada_id","Camada","layer"],["distancia_buffer","Distância","number",100],["unidade_buffer","Unidade","select",["metros","graus"]],["tipo_buffer","Tipo","select",["cheio","externo"]],["dissolver_geometrias","Dissolver","check",false]],
    "OP-05":[["camada_id_1","Camada de entrada","layer"],["camada_id_2","Camada de identidade","layer"],["tipo_overlay","Operação","select",["identity","intersection","union","difference"]],["resolver_conflitos_campos","Preservar e resolver atributos","check",true]],
    "OP-05-IDENT":[["camada_id_1","Camada de entrada","layer"],["camada_id_2","Camada de identidade","layer"],["resolver_conflitos_campos","Preservar e resolver atributos","check",true]],
    "OP-06":[["camada_id","Camada","layer"],["campo_agrupamento","Campo de agrupamento","text"],["funcao_agregacao","Agregação","select",["soma","media","mediana","max","min"]]],
    "OP-07":[["camada_id","Camada alvo","layer"],["camada_ref_id","Camada de referência","layer"],["tipo_selecao","Predicado","select",["intersects","contains","within","touches"]],["inverter_selecao","Inverter seleção","check",false]],
    "OP-08":[["camada_id","Camada","layer"],["resolucao_raster","Resolução","number",50],["crs_destino","CRS","select",CRS_VALUES],["atributo_rasterizacao","Atributo","text"],["valor_preenchimento","Valor de fundo","number",0]],
    "OP-10":[["camada_id","Camada","layer"],["resolucao_distancia","Resolução","number",50],["distancia_maxima","Distância máxima","number"],["unidade_distancia","Unidade","select",["metros","graus"]]],
    "OP-12":[["camada_id","Camada de pontos","layer"],["tipo_kernel","Kernel","select",["gaussiano","epanechnikov","quadratic"]],["largura_kernel","Largura de banda","number",1000],["resolucao_kernel","Resolução","number",50]],
    "OP-14":[["camada_id","Camada de pontos","layer"],["atributo_valor","Atributo numérico","text"],["metodo_interpolacao","Método","select",["idw","kriging","spline"]],["resolucao_interpolacao","Resolução","number",50],["potencia_interpolacao","Potência IDW","number",2]],
    "OP-15":[["camada_id","Camada","layer"],["campo_unidade","Campo territorial","text"],["funcao_agregacao","Agregação","select",["soma","media","mediana","max","min"]],["atributo_agregacao","Atributo","text"]],
    "OP-17":[["raster_ids","IDs dos rasters (separados por vírgula)","text"],["pesos","Pesos (separados por vírgula)","text"],["operador","Operador","select",["soma","media_ponderada","multiplicacao"]]],
    "OP-20":[["raster_id","ID do raster","text"],["metodo_normalizacao","Método","select",["linear","winsorizacao","quebras_naturais"]],["valor_minimo","Mínimo","number"],["valor_maximo","Máximo","number"]],
    "OP-25":[["camada_id","Camada","layer"]],
    "OP-26":[["raster_id","Camada","layer"],["comprimir_arquivo","Comprimir","check",true]]
  };
  const BASEMAPS=[{id:"esri-gray",name:"Cinza Neutro (Esri)",tiles:["https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}"]},{id:"esri-dark-gray",name:"Cinza Escuro (Esri)",tiles:["https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"]},{id:"carto-positron",name:"Carto Positron (sem rótulos)",tiles:["https://a.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png"]},{id:"carto-voyager",name:"Carto Voyager",tiles:["https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png"]},{id:"carto-light",name:"Carto Claro",tiles:["https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png"]},{id:"carto-dark",name:"Carto Escuro",tiles:["https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"]},{id:"osm",name:"OpenStreetMap",tiles:["https://tile.openstreetmap.org/{z}/{x}/{y}.png"]},{id:"esri-street",name:"Ruas (Esri)",tiles:["https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"]},{id:"esri-topo",name:"Topográfico (Esri)",tiles:["https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}"]},{id:"opentopomap",name:"OpenTopoMap",tiles:["https://a.tile.opentopomap.org/{z}/{x}/{y}.png"]},{id:"esri-natgeo",name:"National Geographic (Esri)",tiles:["https://server.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer/tile/{z}/{y}/{x}"]},{id:"esri-satellite",name:"Imagem de Satélite (Esri)",tiles:["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"]}];
  Object.assign(FIELDS,{"OP-11":[["camada_id","Camada","layer"],["atributo_peso","Atributo de peso","text"],["resolucao_distancia","Resolução","number",50]],"OP-13":[["raster_id","ID do raster de custo","text"],["origem_linha","Linha de origem","number",0],["origem_coluna","Coluna de origem","number",0]],"OP-16":[["camada_id","Camada","layer"],["resolucao_raster","Resolução","number",50]],"OP-21":[["raster_id","ID do raster","text"],["camada_mascara_id","Camada de máscara","layer"]],"OP-22":[["raster_id","ID do raster","text"],["camada_zona_id","Camada de zonas","layer"]],"OP-23":[["raster_id","ID do raster","text"],["camada_pontos_id","Camada de pontos","layer"]],"OP-24":[["raster_id","ID do raster","text"],["camada_poligono_id","Camada de polígonos","layer"],["estatistica","Estatística","select",["media","soma","min","max"]]]});
  Object.assign(FIELDS,{
    "OP-28":[["camada_id","Camada","layer"]],"OP-29":[["camada_id","Camada","layer"]],"OP-30":[["camada_id","Camada","layer"]],
    "OP-31":[["camada_id","Camada","layer"],["tolerancia","Tolerância","number",10],["preservar_topologia","Preservar topologia","check",true]],
    "OP-32":[["camada_id","Camada","layer"]],
    "OP-33":[["camada_id","Camada","layer"],["camada_mascara_id","Camada","layer"],["manter_tipo_geometria","Manter tipo geométrico","check",true]],
    "OP-34":[["camada_id","Camada","layer"],["camada_ref_id","Camada","layer"],["predicado","Predicado","select",["intersects","within","contains","touches","crosses","overlaps"]],["tipo_juncao","Tipo de junção","select",["inner","left","right"]]],
    "OP-35":[["camada_ids","Camada","layers"]],
    "OP-36":[["camada_id","Camada","layer"],["crs_destino","CRS de destino","select",CRS_VALUES]],
    "OP-37":[["camada_id","Camada","layer"],["campo_saida","Campo da área","text","area"]],
    "OP-38":[["camada_id","Camada","layer"],["campo_saida","Campo do comprimento","text","comprimento"]],
    "OP-39":[["raster_id","Camada","layer"],["classes","Classes (JSON)","text",'[{"min":0,"max":10,"valor":1}]']],
    "OP-40":[["raster_id","Camada","layer"],["limiar","Limiar","number",0],["valor_abaixo","Valor abaixo","number",0],["valor_acima","Valor acima","number",1]],
    "OP-41":[["raster_id","Camada","layer"]],
    "OP-42":[["raster_id","Camada","layer"],["tamanho_janela","Tamanho da janela","number",3],["estatistica","Estatística","select",["media","minimo","maximo"]]],
    "OP-43":[["raster_id","Camada","layer"],["sigma","Sigma","number",1]]
  });
  FIELDS["OP-27"]=[["entrada","Camada","layer"]];
  const RASTER_OUTPUT=new Set(["OP-08","OP-10","OP-11","OP-12","OP-13","OP-14","OP-16","OP-17","OP-20","OP-21","OP-22","OP-23","OP-24","OP-26","OP-39","OP-40","OP-41","OP-42","OP-43"]);
  const CONTENT_INPUTS=new Set(["camada_id","camada_id_1","camada_id_2","camada_ref_id","camada_ids","raster_id","raster_ids","camada_mascara_id","camada_zona_id","camada_pontos_id","camada_poligono_id","entrada"]);
  OPS.flatMap(group=>group[1]).forEach(op=>{
    const raster=RASTER_OUTPUT.has(op[0]),base=op[1].toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"_").replace(/^_|_$/g,"");
    FIELDS[op[0]]=(FIELDS[op[0]]||[]).map(field=>CONTENT_INPUTS.has(field[0])?[field[0],"Camada",["raster_ids","camada_ids"].includes(field[0])?"layers":"layer",field[3]]:field);
    FIELDS[op[0]].push(
      ["nome_saida","Nome da saída","text",`${base}_saida`],
      ["crs_saida","CRS","select",["entrada","EPSG:4674","EPSG:4326","EPSG:3857","EPSG:31982","EPSG:31983","EPSG:31984","EPSG:5880"]],
      ["destino","Destino","select",["memoria","storage"]],
      ["formato_saida","Formato","select",raster?["JSON","GeoTIFF"]:["GeoJSON","GeoPackage","Shapefile"]]
    );
  });
  const state={map:null,layers:[],basemaps:new Set(["esri-gray"]),selected:null,activeLayerId:null,activeExecution:null,toolboxScope:"geral",functions:[],flows:[],history:load("gp-history",[]),layerGroups:load("gp-layer-groups",{operational:false,basemap:false}),layerColors:load("gp-layer-colors",{}),layerStyles:load("gp-layer-styles",{}),geometryTypes:{},catalogHydrated:false,catalogSyncPending:false,leftTab:"drawing"};
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
  let generatedFieldId=0;
  function associateFormFields(root=document){
    const fields=[];
    if(root instanceof Element&&root.matches("input, select, textarea"))fields.push(root);
    fields.push(...root.querySelectorAll("input, select, textarea"));
    fields.forEach(field=>{
      if(!field.id&&!field.name){
        generatedFieldId+=1;
        field.id=`gp-generated-field-${generatedFieldId}`;
      }
    });
    const labels=[];
    if(root instanceof HTMLLabelElement)labels.push(root);
    labels.push(...root.querySelectorAll("label"));
    labels.forEach(label=>{
      if(label.htmlFor||label.querySelector("input, select, textarea"))return;
      const container=label.closest(".field")||label.parentElement;
      const field=container?.querySelector("input, select, textarea");
      if(!field)return;
      if(!field.id){
        generatedFieldId+=1;
        field.id=`gp-generated-field-${generatedFieldId}`;
      }
      label.htmlFor=field.id;
    });
  }
  function monitorFormAccessibility(){
    associateFormFields(document);
    new MutationObserver(records=>records.forEach(record=>record.addedNodes.forEach(node=>{
      if(node instanceof Element)associateFormFields(node);
    }))).observe(document.body,{childList:true,subtree:true});
  }
  function load(k,d){try{return JSON.parse(localStorage.getItem(k))||d}catch{return d}}
  function save(k,v){localStorage.setItem(k,JSON.stringify(v));$("#gp-save-state").textContent="Alterações salvas"}
  function icons(){window.lucide?.createIcons({attrs:{"stroke-width":1.7}})}
  function emit(name,detail={}){$(".gp-app")?.dispatchEvent(new CustomEvent(`slt:geoprocessamento:${name}`,{detail,bubbles:true}))}
  function log(msg,type=""){const el=$("#gp-log"),time=new Date().toLocaleTimeString();el.insertAdjacentHTML("beforeend",`<div class="log-${type}">[${time}] ${escapeHtml(msg)}</div>`);el.scrollTop=el.scrollHeight}
  function escapeHtml(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
  function slugifyName(value){return String(value??"").toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\.[a-z0-9]+$/i,"").replace(/[^a-z0-9]+/g,"_").replace(/^_+|_+$/g,"")||"camada"}
  function algorithmOutputSuffix(op){return OUTPUT_SUFFIX_BY_OPERATION[op[0]]||slugifyName(op[1])}
  function sourceNameFromForm(form,op){
    const opId=op[0];
    if(opId==="OP-01"){
      const localName=$("#gp-local-file-name")?.value?.trim();
      if(localName)return slugifyName(localName);
      const uploadFile=$("#gp-local-upload")?.files?.[0]?.name;
      if(uploadFile)return slugifyName(uploadFile);
      const caminho=(form.elements.caminho_arquivo?.value||"").trim();
      if(caminho){
        const cleaned=caminho.split("?")[0].split("#")[0];
        const last=cleaned.split("/").filter(Boolean).pop()||cleaned;
        return slugifyName(last);
      }
    }
    const layerInput=[...form.elements].find(element=>CONTENT_INPUTS.has(element.name)&&!element.multiple);
    const selectedId=layerInput?.value;
    if(!selectedId)return "";
    const layer=state.layers.find(item=>item.id===selectedId);
    return slugifyName(layer?.nome||selectedId);
  }
  function suggestOutputName(form,op){
    const outputName=form?.elements?.nome_saida;
    if(!outputName)return;
    const source=sourceNameFromForm(form,op);
    const suffix=algorithmOutputSuffix(op);
    const suggestion=source?`${source}_${suffix}`:suffix;
    const last=outputName.dataset.lastSuggested||"";
    const touched=outputName.dataset.userEdited==="true";
    if(!touched||!outputName.value.trim()||outputName.value===last){
      outputName.value=suggestion;
      outputName.dataset.lastSuggested=suggestion;
    }
    outputName.placeholder=suggestion;
  }
  function bindOutputNameAuto(form,op){
    const outputName=form?.elements?.nome_saida;
    if(!outputName)return;
    outputName.dataset.userEdited="false";
    outputName.dataset.lastSuggested=outputName.value||"";
    outputName.addEventListener("input",()=>{
      outputName.dataset.userEdited=outputName.value.trim()?"true":"false";
    });
    suggestOutputName(form,op);
  }
  function updateComponentPlaceholder(){
    const placeholder=$("#gp-component-placeholder");
    if(!placeholder)return;
    const hasLayers=state.layers.length>0;
    const hasTool=Boolean(state.selected);
    placeholder.hidden=hasLayers||hasTool;
  }
  function layerColor(id,types=state.geometryTypes[id]||[]){return state.layerColors[id]||(types.some(type=>type.includes("Point"))?"#d97819":"#1683c4")}
  function applyLayerColor(id,color,report=true){
    if(!/^#[0-9a-f]{6}$/i.test(color))return false;
    state.layerColors[id]=color.toLowerCase();save("gp-layer-colors",state.layerColors);
    if(state.map?.getLayer(id))state.map.setPaintProperty(id,"fill-color",color),state.map.setPaintProperty(id,"fill-outline-color",color);
    if(state.map?.getLayer(`${id}-line`))state.map.setPaintProperty(`${id}-line`,"line-color",color);
    if(state.map?.getLayer(`${id}-point`))state.map.setPaintProperty(`${id}-point`,"circle-color",color);
    renderLayers();if(report)log(`Cor da camada alterada para ${color}.`,"ok");return true;
  }
  function applyLayerStyle(id,style,report=true,persist=true){
    const current=state.layerStyles[id]||{},next={...current,...style};state.layerStyles[id]=next;if(persist)save("gp-layer-styles",state.layerStyles);
    applyStyleToMap(id,next);
    if(report)log("Simbologia da camada atualizada.","ok");return next;
  }
  function applyStyleToMap(id,next){
    const fill=next.fillColor||layerColor(id),border=next.borderColor||fill,fillOpacity=Number.isFinite(next.fillOpacity)?next.fillOpacity:.32,borderOpacity=Number.isFinite(next.borderOpacity)?next.borderOpacity:1,lineWidth=Number.isFinite(next.lineWidth)?next.lineWidth:2,pointRadius=Number.isFinite(next.pointRadius)?next.pointRadius:5;
    if(state.map?.getLayer(id)){state.map.setPaintProperty(id,"fill-color",fill);state.map.setPaintProperty(id,"fill-outline-color",border);state.map.setPaintProperty(id,"fill-opacity",next.fillTexture==="outline"?0:fillOpacity)}
    if(state.map?.getLayer(`${id}-line`)){state.map.setPaintProperty(`${id}-line`,"line-color",border);state.map.setPaintProperty(`${id}-line`,"line-opacity",borderOpacity);state.map.setPaintProperty(`${id}-line`,"line-width",lineWidth);state.map.setPaintProperty(`${id}-line`,"line-dasharray",next.lineTexture==="dashed"?[3,2]:next.lineTexture==="dotted"?[1,2]:[1,0]);state.map.setLayoutProperty(`${id}-line`,"line-cap",next.lineCap||"butt");state.map.setLayoutProperty(`${id}-line`,"line-join",next.lineJoin||"miter")}
    if(state.map?.getLayer(`${id}-point`)){state.map.setPaintProperty(`${id}-point`,"circle-color",fill);state.map.setPaintProperty(`${id}-point`,"circle-radius",pointRadius);state.map.setPaintProperty(`${id}-point`,"circle-opacity",fillOpacity);state.map.setPaintProperty(`${id}-point`,"circle-stroke-color",border);state.map.setPaintProperty(`${id}-point`,"circle-stroke-opacity",borderOpacity);state.map.setPaintProperty(`${id}-point`,"circle-stroke-width",lineWidth)}
  }
  function replaceLayerStyle(id,style,persist=true){
    state.layerStyles[id]=JSON.parse(JSON.stringify(style||{}));if(persist)save("gp-layer-styles",state.layerStyles);
    applyStyleToMap(id,state.layerStyles[id]);
  }
  function currentEditStyle(layerId){return(state.symDraft&&state.symDraft.layerId===layerId)?state.symDraft.draft:(state.layerStyles[layerId]||{})}
  function stageStyle(layerId,patch){if(state.symDraft&&state.symDraft.layerId===layerId)Object.assign(state.symDraft.draft,patch)}
  function ribbon(tab="mapa"){
    const modelEditor=tab==="modelo"&&window.gpModeler?.hasActiveEditor?.() ? [["Editor",[["save","Salvar","model-save"],["badge-check","Validar","model-validate"],["play","Executar","model-run"],["log-in","Entrada","model-input"],["circle-dot","Variável","model-variable","menu:variable"],["repeat-2","Iterador","model-iterator","menu:iterator"],["settings-2","Algoritmo","model-algorithm","menu:algorithm"],["blocks","Função","model-function","menu:function"],["log-out","Saída","model-output"],["git-commit-horizontal","Conectar","model-connect"],["copy","Duplicar","model-duplicate"],["trash-2","Excluir","model-delete"],["layout-grid","Organizar","model-layout"],["maximize","Ajustar","model-fit"]]]] : [];
    const sets={
      mapa:[["Dados",[["folder-open","Importar arquivo","import-file",true],["cloud-download","Importar WFS","import-wfs"],["database","Carregar do sistema","load-system"],["map","Basemap","basemap"]]],["Navegação",[["mouse-pointer-2","Explorar","explore"],["maximize","Zoom nas camadas","fit"],["scan","Zoom na seleção","fit-selection"]]],["Seleção",[["mouse-pointer-click","Selecionar","select"],["list-x","Limpar seleção","clear"]]],["Camada",[["table-properties","Tabela de atributos","attributes"],["trash-2","Remover camada","remove"],["x","Excluir camada","delete-layer"]]]],
      analise:[["Geoprocessamento",[["briefcase","SIRCADI Toolbox","tools",true],["briefcase","Geospatial Toolbox","tools-vector-raster",true],["briefcase","Numerical Analysis Toolbox","tools-science",true],["briefcase","Surface Modeling Toolbox","tools-interpolation",true]]],["Execução",[["play","Executar","run"],["square","Cancelar","cancel"],["history","Histórico","history"]]],["Configuração",[["sliders-horizontal","Ambientes","environments"],["shield-check","Validar entrada","validate"]]],["Resultados",[["save","Salvar resultado","save-result"],["layers","Adicionar resultado ao mapa","add-result"]]]],
      modelo:[...modelEditor,["Funções",[["blocks","Nova função","new-function",true],["pencil","Editar função","edit-function"],["badge-check","Validar função","validate-function"],["play","Executar função","run-function"]]],["Fluxos",[["workflow","Novo fluxo","new-flow",true],["pencil","Editar fluxo","edit-flow"],["badge-check","Validar fluxo","validate-flow"],["play","Executar fluxo","run-flow"]]],["Definições",[["copy","Duplicar","duplicate"],["file-input","Importar definição","import-definition"],["file-output","Exportar definição","export-definition"]]]],
      dados:[["Inspecionar",[["info","Propriedades","properties"],["table-properties","Tabela de atributos","attributes"]]],["Consulta",[["calculator","Calcular campo","calculate-field"],["list-filter","Selecionar por atributo","select-attribute"],["filter","Filtrar camada","filter-layer"]]],["Preparar",[["globe-2","Reprojetar","reproject"],["wrench","Reparar geometria","repair"]]],["Publicar",[["badge-check","Homologar camada","homologate-layer",true],["download","Exportar dados","export"],["refresh-cw","Atualizar fonte","refresh-source"],["trash-2","Remover camada","remove"],["x","Excluir camada","delete-layer"]]]]
    };
    const marks={tools:"•","tools-vector-raster":"◇","tools-science":"Σ","tools-interpolation":"∿"};
    $("#gp-ribbon-tools").innerHTML=sets[tab].map(([g,items])=>`<div class="ribbon-group" data-label="${g}">${items.map(([i,n,a,t])=>{const menu=typeof t==="string"&&t.startsWith("menu:")?t.slice(5):"";const toolbox=t===true;return `<button class="ribbon-action ${toolbox?"toolbox":""}" data-action="${a}" ${a.startsWith("model-")?`data-model-command="${a}"`:""} ${menu?`data-model-menu="${menu}" aria-haspopup="true" aria-expanded="false"`:""} title="${n}">${marks[a]?`<span class="toolbox-ribbon-icon"><i data-lucide="briefcase"></i><b aria-hidden="true">${marks[a]}</b></span>`:`<i data-lucide="${i}"></i>`}<span>${n}</span></button>`}).join("")}</div>`).join("");icons();window.gpModeler?.updateRibbon?.();
  }
  function initMap(){const sources={},layers=[];BASEMAPS.forEach((b)=>{sources[b.id]={type:"raster",tiles:b.tiles,tileSize:256,attribution:"© provedores do mapa"};layers.push({id:`basemap-${b.id}`,type:"raster",source:b.id,layout:{visibility:state.basemaps.has(b.id)?"visible":"none"}})});state.map=new maplibregl.Map({container:"gp-map",center:[-48.5,-22.4],zoom:6.2,style:{version:8,sources,layers}});state.map.addControl(new maplibregl.NavigationControl({showCompass:false}),"bottom-right");state.map.on("mousemove",e=>$("#gp-coordinates").textContent=`${e.lngLat.lng.toFixed(5)}, ${e.lngLat.lat.toFixed(5)}`);state.map.on("zoom",()=>$("#gp-scale").textContent=`Zoom ${state.map.getZoom().toFixed(1)}`)}
  function removeMapResource(id){
    [`${id}-point`,`${id}-line`,id].forEach(layerId=>{if(state.map?.getLayer(layerId))state.map.removeLayer(layerId)});
    if(state.map?.getSource(id))state.map.removeSource(id);
    delete state.geometryTypes[id];
  }
  async function reconcileCatalog(resources,requestedIds=[],focusId=null,onStage=null){
    const resourceIds=new Set(resources.map(resource=>resource.id));
    const inMemory=state.layers.filter(layer=>layer.destino==="memoria_local");
    const inMemoryIds=new Set(inMemory.map(layer=>layer.id));
    state.layers.filter(layer=>!resourceIds.has(layer.id)&&!inMemoryIds.has(layer.id)).forEach(layer=>removeMapResource(layer.id));
    const loadedIds=new Set([...state.layers.map(layer=>layer.id),...requestedIds]);
    const catalogLayers=resources.filter(resource=>loadedIds.has(resource.id));
    state.layers=[...inMemory,...catalogLayers];
    const visible=[];
    for(const resource of catalogLayers){
      try{await addCatalogLayerToMap(resource.id,resource.id===focusId);visible.push(resource)}
      catch(error){removeMapResource(resource.id);log(`${resource.nome} não foi incluída: ${error.message}`,"error")}
    }
    state.layers=[...inMemory,...visible];state.catalogHydrated=true;renderLayers();onStage?.("Camada representada no mapa");
    return new Set([...inMemoryIds,...visible.map(resource=>resource.id)]);
  }
  async function refreshLayers(strict=false,requestedIds=[],focusId=null,onStage=null){
    try{
      const response=await fetch(`${API}/camadas`);if(!response.ok)throw new Error(`HTTP ${response.status}`);
      const resources=await response.json();onStage?.("Catálogo atualizado");
      if(!state.map?.isStyleLoaded()){
        await new Promise((resolve,reject)=>{
          const timeout=setTimeout(()=>reject(new Error("Mapa não ficou pronto para representar a camada")),10000);
          const pronto=()=>{clearTimeout(timeout);resolve()};
          state.map.once("load",pronto);
          state.map.once("style.load",pronto);
        });
      }
      return await reconcileCatalog(resources,requestedIds,focusId,onStage);
    }catch(error){log(`Catálogo indisponível: ${error.message}`,"error");if(strict)throw error;return new Set(state.layers.map(layer=>layer.id))}
  }
  async function refreshDefinitions(){
    try{
      const [funcoes,fluxos]=await Promise.all([fetch(`${API}/funcoes`),fetch(`${API}/fluxos`)]);
      if(funcoes.ok)state.functions=await funcoes.json();
      if(fluxos.ok)state.flows=await fluxos.json();
      if(state.toolboxScope!=="geral")renderToolbox($("#gp-tool-search")?.value||"");
    }catch(e){log(`Definições indisponíveis: ${e.message}`,"error")}
  }
  function layerSymbol(layer){
    if(layer.tipo?.toLowerCase().includes("raster"))return '<span class="layer-symbol raster" title="Raster"></span>';
    const types=state.geometryTypes[layer.id]||[],type=types[0]||"geometry",symbolStyle=state.layerStyles[layer.id]||{},color=symbolStyle.fillColor||symbolStyle.borderColor||layerColor(layer.id,types),style=` style="--layer-color:${color}"`;
    if(type.includes("Point"))return `<span class="layer-symbol point"${style} title="Pontos"></span>`;
    if(type.includes("Line"))return `<span class="layer-symbol line"${style} title="Linhas"></span>`;
    if(type.includes("Polygon"))return `<span class="layer-symbol polygon"${style} title="Polígonos"></span>`;
    return `<span class="layer-symbol geometry"${style} title="Geometria vetorial"></span>`;
  }
  function renderLayers(){
    const query=$("#gp-layer-search").value.toLocaleLowerCase("pt-BR"),items=state.layers.filter(layer=>layer.nome.toLocaleLowerCase("pt-BR").includes(query));
    const base=BASEMAPS.filter(item=>item.name.toLocaleLowerCase("pt-BR").includes(query)).map(item=>`<label class="tree-row tree-indent"><input type="checkbox" data-basemap-toggle="${item.id}" ${state.basemaps.has(item.id)?"checked":""}><i data-lucide="map"></i><span class="layer-name">${item.name}</span></label>`).join("");
    const bySource=state.leftTab==="source";
    const sourcePath=(layer)=>{
      const meta=layer.metadados||{};
      return meta.arquivo_original||layer.caminho_arquivo||meta.caminho_arquivo||layer.url_origem||meta.url_origem||layer.nome;
    };
    const operational=items.map(layer=>{
      const onMap=Boolean(state.map?.getSource(layer.id));
      const display=bySource?sourcePath(layer):layer.nome;
      return `<div class="tree-row tree-indent ${state.activeLayerId===layer.id?"active":""}" data-layer="${layer.id}" tabindex="0"><input type="checkbox" ${onMap?"checked":""} aria-label="Exibir ${escapeHtml(layer.nome)}">${layerSymbol(layer)}<span class="layer-name" title="${escapeHtml(display)}">${escapeHtml(display)}</span><button class="icon-btn layer-zoom" type="button" data-zoom-layer="${layer.id}" title="Zoom para a camada"><i data-lucide="maximize"></i></button></div>`;
    }).join("");
    const group=(id,label,icon,content,empty)=>`<section class="layer-group ${state.layerGroups[id]?"collapsed":""}" data-layer-group="${id}"><button class="tree-row layer-group-title" type="button" aria-expanded="${!state.layerGroups[id]}"><i data-lucide="chevron-down" class="tree-chevron"></i><i data-lucide="${icon}"></i><strong>${label}</strong></button><div class="layer-group-children">${content||`<div class="empty compact">${empty}</div>`}</div></section>`;
    const operationalLabel=bySource?"Camadas por fonte":"Camadas operacionais";
    $("#gp-layer-list").innerHTML=group("operational",operationalLabel,"layers-3",operational,"Nenhuma camada carregada.")+group("basemap","Basemap","map",base,"Nenhum mapa-base encontrado.");icons();
    updateComponentPlaceholder();
  }
  function setBasemap(id,visible){if(!BASEMAPS.some(b=>b.id===id))return;const show=visible===undefined?!state.basemaps.has(id):Boolean(visible);if(show)state.basemaps.add(id);else state.basemaps.delete(id);const layer=`basemap-${id}`;if(state.map?.getLayer(layer))state.map.setLayoutProperty(layer,"visibility",show?"visible":"none")}
  function renderToolbox(filter=""){const f=filter.toLowerCase();$("#gp-toolbox").innerHTML=OPS.map(([g,ops])=>{const rows=ops.filter(o=>(o[0]+o[1]).toLowerCase().includes(f));return rows.length?`<div class="tool-group"><button class="tool-group-title"><i data-lucide="briefcase"></i>${g}</button>${rows.map(o=>`<button class="tool-row" data-op="${o[0]}"><span class="tool-name">${o[1]}</span><span class="availability ${o[3]===2?"partial":""}" title="${o[3]===1?"Disponível":o[3]===2?"Backend em implementação":"Catalogado; motor pendente"}"></span></button>`).join("")}</div>`:""}).join("");icons()}
  function selectOp(id){state.selected=id;$$('[data-right-tab]').forEach(b=>b.classList.toggle("active",b.dataset.rightTab==="tools"));showEditor();const op=OPS.flatMap(x=>x[1]).find(x=>x[0]===id);const fields=FIELDS[id]||[];$("#gp-right-title").textContent=op[1];$("#gp-editor-view").innerHTML=`<div class="editor-head"><button class="icon-btn" data-back title="Voltar"><i data-lucide="arrow-left"></i></button><h2>${op[1]}</h2></div><form id="gp-op-form" data-op="${op[0]}"><div class="editor-body">${fields.length?fields.map(fieldHtml).join(""):`<div class="empty">O algoritmo está catalogado na stack, mas seu contrato de execução ainda não foi implementado no backend.</div>`}</div><div class="editor-actions"><button type="button" class="btn" data-add-function>Adicionar à função</button><button class="btn primary" ${!op[2]?"disabled":""}>Executar</button></div></form>`;icons();const form=$("#gp-op-form");configureOutputFields(form,RASTER_OUTPUT.has(id),op);configureSelectionScope(form);bindOutputNameAuto(form,op);window.gpCommands?.applyEnvironments(form);form.onsubmit=e=>{e.preventDefault();executeOp(op,e.target)};$("[data-back]").onclick=()=>showTools();$("[data-add-function]").onclick=()=>window.gpApp.newFunction(id);updateComponentPlaceholder()}
  function configureSelectionScope(form){
    form?.querySelector("[data-selection-scope]")?.remove();
    if(!form)return;
    const layerInput=[...form.elements].find(element=>CONTENT_INPUTS.has(element.name)&&element.name.startsWith("camada_id")&&!element.multiple);
    if(!layerInput)return;
    const refresh=()=>{
      form.querySelector("[data-selection-scope]")?.remove();
      const count=(state.selectedGeoJSON?.features||[]).filter(feature=>feature.properties?.__gp_layer_id===layerInput.value).length;
      if(!count)return;
      layerInput.closest(".field")?.insertAdjacentHTML("afterend",`<fieldset class="selection-scope" data-selection-scope><legend>Processar sobre</legend><label><input type="radio" name="processar_sobre" value="todas" checked> Todas as feições</label><label><input type="radio" name="processar_sobre" value="selecionadas"> Apenas selecionadas (${count})</label></fieldset>`);
    };
    layerInput.addEventListener("change",refresh);refresh();
  }
  function configureOutputFields(form,raster,op){
    const destination=form.elements.destino,format=form.elements.formato_saida;
    if(!destination||!format)return;
    const crs=form.elements.crs_saida,layerInput=[...form.elements].find(element=>CONTENT_INPUTS.has(element.name)&&!element.multiple);
    const refreshCrs=()=>{
      if(!crs)return;
      const layer=state.layers.find(item=>item.id===layerInput?.value),sourceCrs=layer?.crs||"CRS não informado",current=crs.value||"entrada";
      crs.options[0].value="entrada";crs.options[0].textContent=`Da camada de entrada — ${crsLabel(sourceCrs)}`;
      crs.value=[...crs.options].some(option=>option.value===current)?current:"entrada";
      if(op)suggestOutputName(form,op);
    };
    const refresh=()=>{
      const formats=destination.value==="memoria"?["JSON"]:(raster?["GeoTIFF"]:["GeoPackage","GeoJSON","Shapefile"]);
      format.innerHTML=formats.map(value=>`<option value="${value}">${value}</option>`).join("");
      format.disabled=destination.value==="memoria";
    };
    destination.onchange=refresh;layerInput?.addEventListener("change",refreshCrs);refreshCrs();refresh();
  }
  function fieldHtml(f){const [id,label,type,val]=f;if(type==="check")return `<label class="field-check"><input name="${id}" type="checkbox" ${val?"checked":""}>${label}</label>`;let input;if(type==="select")input=`<select name="${id}">${val.map(x=>`<option>${x}</option>`).join("")}</select>`;else if(type==="layer")input=`<select name="${id}" required><option value="">Selecione…</option>${state.layers.map(x=>`<option value="${x.id}">${escapeHtml(x.nome)}</option>`).join("")}</select>`;else input=`<input name="${id}" type="${type}" value="${val??""}" ${["number","text"].includes(type)?"":""}>`;return `<div class="field"><label>${label}</label>${input}</div>`}
  function configureLoadOperation(){
    const form=$("#gp-op-form"),type=form?.elements.tipo_entrada;
    if(!form||!type)return;
    const op=OPS.flatMap(group=>group[1]).find(item=>item[0]==="OP-01"),submit=form.querySelector('.editor-actions .primary');let inspectionToken="";
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
        field.innerHTML=`<label class="required-label" for="gp-local-file-name">Arquivo local</label><div class="local-file-picker"><input id="gp-local-upload" type="file" accept=".geojson,.json,.kml,.gml,.fgb,.tif,.tiff,.img,.asc,.vrt,.jp2,.zip,.rar,.7z,.tar,.tgz,.gz,.gpkg" hidden><input id="gp-local-file-name" class="readonly-active" type="text" placeholder="Selecione um arquivo geoespacial" readonly aria-describedby="gp-local-help"><button class="browse-btn" type="button" data-select-local title="Procurar arquivo" aria-label="Procurar arquivo"><i data-lucide="folder-open"></i></button></div><p id="gp-local-help" class="field-help">Para Shapefile, envie um arquivo ZIP com os componentes .shp, .shx e .dbf. O conteúdo será descompactado, identificado e validado antes da importação.</p><div class="field"><label>CRS atual</label><input id="gp-import-current-crs" class="readonly-active" placeholder="Detectado após selecionar o arquivo" readonly></div><label class="field-check"><input id="gp-import-reproject" type="checkbox">Reprojetar CRS</label><div class="field"><label>CRS de destino</label><select id="gp-import-target-crs" disabled><option value="EPSG:4674">EPSG:4674 (SIRGAS 2000) — recomendado</option><option value="EPSG:4326">EPSG:4326 (WGS 84)</option><option value="EPSG:31983">EPSG:31983 (SIRGAS 2000 / UTM zona 23S)</option></select></div><label class="field-check"><input id="gp-import-clip" type="checkbox">Recortar pela camada</label><div class="field"><label>Camada de máscara</label><select id="gp-import-clip-layer" disabled><option value="">Selecione…</option>${state.layers.filter(layer=>!String(layer.tipo).toLowerCase().includes("raster")).map(layer=>`<option value="${escapeHtml(layer.id)}">${escapeHtml(layer.nome)}</option>`).join("")}</select></div><p id="gp-import-inspection" class="field-help">Aguardando arquivo.</p>`;
        const input=$("#gp-local-upload"),name=$("#gp-local-file-name");
        $("#gp-import-target-crs").options[0].textContent="EPSG:4674 (SIRGAS 2000) — recomendado";
        [...$("#gp-import-target-crs").options].forEach((option,index)=>option.textContent=`${crsLabel(option.value)}${index===0?" — recomendado":""}`);
        $("[data-select-local]").onclick=()=>input.click();
        $("#gp-import-reproject").onchange=event=>$("#gp-import-target-crs").disabled=!event.target.checked;
        $("#gp-import-clip").onchange=event=>$("#gp-import-clip-layer").disabled=!event.target.checked;
        input.onchange=async()=>{const file=input.files[0];inspectionToken="";name.value=file?.name||"";submit.disabled=true;suggestOutputName(form,op);const currentCrs=$("#gp-import-current-crs");if(currentCrs)currentCrs.value="";if(!file)return;const status=$("#gp-import-inspection");currentCrs.value="Identificando CRS…";status.textContent="Lendo, extraindo e validando…";try{const data=new FormData();data.append("arquivo",file);const response=await fetch(`${API}/importar_camadas/inspecionar`,{method:"POST",body:data,credentials:"include"}),body=await response.json().catch(()=>({}));if(!response.ok)throw new Error(body.detail||`HTTP ${response.status}`);if(body.importavel===false)throw new Error(body.erro_validacao||"Arquivo sem feições para importação");inspectionToken=body.token_importacao||"";const detectedCrs=body.crs_identificado||body.crs_atual||body.camadas?.[0]?.crs_original||body.camadas?.[0]?.crs_final||"";const crsLabelled=detectedCrs?crsLabel(detectedCrs):"CRS não informado";currentCrs.value=crsLabelled;const invalidas=body.camadas.reduce((total,camada)=>total+Number(camada.geometrias_invalidas||0),0);status.textContent=`${body.categoria} · ${body.camadas.length} camada(s) importável(is) · CRS identificado: ${crsLabelled}${invalidas?` · ${invalidas} geometria(s) inválida(s) serão destacadas`:" · geometrias válidas"}`;submit.disabled=false}catch(error){const message=String(error?.message||"Falha na inspeção automática");const lower=message.toLocaleLowerCase("pt-BR");const validationError=lower.includes("sem fei")||lower.includes("inválido")||lower.includes("invalido")||lower.includes("pacote geoespacial misto");const authError=lower.includes("sessão inválida")||lower.includes("sessao invalida")||lower.includes("não autorizado")||lower.includes("nao autorizado")||lower.includes("http 401");status.textContent=authError?"Sessão expirada. Faça login novamente para inspecionar e importar.":message;currentCrs.value="CRS não detectado";submit.disabled=validationError}};
        submit.textContent="Importar";submit.title="Importar os arquivos para o banco e adicioná-los ao mapa";submit.disabled=true;
        suggestOutputName(form,op);
        form.onsubmit=async event=>{event.preventDefault();if(!input.files.length){$("#gp-import-inspection").textContent="Selecione um arquivo local para importar.";return}if($("#gp-import-clip").checked&&!$("#gp-import-clip-layer").value){$("#gp-import-inspection").textContent="Selecione a camada de máscara.";return}submit.disabled=true;submit.textContent="Importando…";const progress=createExecutionProgress(form),file=input.files[0],status=$("#gp-import-inspection");try{const data=new FormData();if(inspectionToken)data.append("token_importacao",inspectionToken);else data.append("arquivo",file);if($("#gp-import-reproject").checked)data.append("reprojetar_crs",$("#gp-import-target-crs").value);if($("#gp-import-clip").checked)data.append("recortar_camada_id",$("#gp-import-clip-layer").value);progress.note(`${file.name}: iniciando importação`);const started=await fetch(`${API}/importar_camadas/job`,{method:"POST",body:data,credentials:"include"});let job=await started.json().catch(()=>({}));if(!started.ok)throw new Error(job.detail||`HTTP ${started.status}`);job=await waitForJob(job,progress);const result=job.resultado||{};const createdId=result.camada_id||result.raster_id||result.recursos?.[0]?.id;progress.note("Sincronizando catálogo de camadas");const visible=await refreshLayers(true,createdId?[createdId]:[],createdId);if(createdId&&!visible.has(createdId))throw new Error("O recurso foi importado, mas não pôde ser representado no mapa");status.textContent=`Importação concluída: ${result.quantidade||1} camada(s).`;progress.complete();log(`${file.name} importado com sucesso.`,"ok");inspectionToken="";input.value="";name.value="";$("#gp-import-current-crs").value=""}catch(error){status.textContent=error.message;progress.fail(`Falha: ${error.message}`);log(`${file.name}: ${error.message}`,"error");$("#gp-log").classList.add("open")}finally{submit.textContent="Importar";submit.disabled=false}};
      }else{
        field.innerHTML=`<label class="required-label" for="gp-wfs-url">URL do serviço ou camada WFS</label><input id="gp-wfs-url" name="caminho_arquivo" type="url" placeholder="https://servidor.exemplo/wfs" required><p class="field-help">Informe a URL do serviço WFS ou uma requisição de camada compatível.</p>`;
        submit.textContent="Importar";submit.title="Importar a camada externa do serviço WFS";submit.disabled=false;
        form.elements.caminho_arquivo?.addEventListener("input",()=>suggestOutputName(form,op));
        suggestOutputName(form,op);
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
      let value=form.elements[k]?.type==="number"&&v!==""?Number(v):v;
      if(["raster_ids","camada_ids"].includes(k)){
        if(payload[k])continue;
        payload[k]=fd.getAll(k).map(String).filter(Boolean);
        payload[k].forEach(item=>params.append(k,item));
      }else if(k==="pesos"){
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
    if(payload.processar_sobre==="selecionadas"){
      const layerInput=[...form.elements].find(element=>CONTENT_INPUTS.has(element.name)&&element.name.startsWith("camada_id")&&!element.multiple),layerId=layerInput?.value;
      const selected=(state.selectedGeoJSON?.features||[]).filter(feature=>feature.properties?.__gp_layer_id===layerId);
      payload.chaves_selecionadas=[...new Set(selected.map(feature=>feature.properties?.__gp_selection_key).filter(value=>value!=null).map(String))];
      payload.atributos_selecionados=selected.map(feature=>cleanSelectionProperties(feature.properties));
    }
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
  function showBasemapPanel(){activateToolsTab();showEditor();$("#gp-right-title").textContent="Mapa-base";$("#gp-editor-view").innerHTML=`<div class="editor-head"><button class="icon-btn" data-back title="Voltar"><i data-lucide="arrow-left"></i></button><div><h2>Mapa-base</h2><p>Escolha um ou mais mapas de referência da visualização.</p></div></div><div class="editor-body option-list">${BASEMAPS.map(item=>`<label class="option-card ${state.basemaps.has(item.id)?"selected":""}"><input type="checkbox" data-basemap-panel-toggle="${item.id}" ${state.basemaps.has(item.id)?"checked":""}><i data-lucide="map"></i><span><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.id)}</small></span></label>`).join("")}</div>`;$("[data-back]").onclick=showTools;$$('[data-basemap-panel-toggle]').forEach(input=>input.onchange=()=>{setBasemap(input.dataset.basemapPanelToggle,input.checked);showBasemapPanel();renderLayers()});icons()}
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
    const params=Array.isArray(item.parametros_expostos)?item.parametros_expostos:[];
    const isRaster=layer=>String(layer.tipo||"").toLowerCase().includes("raster");
    const layerOptions=filter=>state.layers.filter(filter).map(layer=>`<option value="${escapeHtml(layer.id)}">${escapeHtml(layer.nome)}</option>`).join("");
    const inferMulti=chave=>/(_ids$|_lista$|_list$|s$)/.test(chave)&&!/status$|_class$/.test(chave);
    const paramField=param=>{
      const chave=param.chave||param.nome,label=escapeHtml(param.nome||chave),tipo=(param.tipo_entrada||param.tipo||"text").toLowerCase(),help=param.descricao?`<p class="field-help">${escapeHtml(param.descricao)}</p>`:"",required=param.obrigatorio===false?"":"required",defaultValue=param.valor??param.padrao??"";
      if(tipo==="vector_layers"||tipo==="vector_layer"||tipo==="camada_vetorial"){
        const multi=tipo==="vector_layers"&&inferMulti(chave);
        return `<div class="field"><label>${label}${required?" *":""}</label><select data-param="${escapeHtml(chave)}" data-tipo="vetor${multi?"_multi":""}" ${multi?'multiple size="6"':""} ${required}>${multi?"":'<option value="">Selecione…</option>'}${layerOptions(l=>!isRaster(l))}</select>${help||'<p class="field-help">'+(multi?"Segure Ctrl/Cmd para escolher múltiplas camadas vetoriais.":"Camada vetorial do catálogo.")+"</p>"}</div>`;
      }
      if(tipo==="raster_layers"||tipo==="raster_layer"||tipo==="camada_raster"){
        const multi=tipo==="raster_layers"&&inferMulti(chave);
        return `<div class="field"><label>${label}${required?" *":""}</label><select data-param="${escapeHtml(chave)}" data-tipo="raster${multi?"_multi":""}" ${multi?'multiple size="6"':""} ${required}>${multi?"":'<option value="">Selecione…</option>'}${layerOptions(isRaster)}</select>${help}</div>`;
      }
      if((tipo==="select"||tipo==="enum")&&Array.isArray(param.opcoes)){
        return `<div class="field"><label>${label}${required?" *":""}</label><select data-param="${escapeHtml(chave)}" data-tipo="select" ${required}>${param.opcoes.map(o=>{const v=typeof o==="object"?o.valor??o.value:o,r=typeof o==="object"?o.rotulo??o.label??v:o;return `<option value="${escapeHtml(String(v))}" ${String(defaultValue)===String(v)?"selected":""}>${escapeHtml(String(r))}</option>`}).join("")}</select>${help}</div>`;
      }
      if(tipo==="boolean"||tipo==="bool"||tipo==="check"){
        return `<div class="field"><label class="field-check"><input type="checkbox" data-param="${escapeHtml(chave)}" data-tipo="bool" ${defaultValue?"checked":""}>${label}</label>${help}</div>`;
      }
      if(tipo==="number"||tipo==="int"||tipo==="float"||tipo==="numero"){
        return `<div class="field"><label>${label}${required?" *":""}</label><input type="number" data-param="${escapeHtml(chave)}" data-tipo="number" value="${escapeHtml(String(defaultValue))}" ${required} ${tipo==="int"?'step="1"':'step="any"'}>${help}</div>`;
      }
      if(tipo==="values"||tipo==="text"||tipo==="string"||tipo==="valor"){
        return `<div class="field"><label>${label}${required?" *":""}</label><input type="text" data-param="${escapeHtml(chave)}" data-tipo="text" value="${escapeHtml(String(defaultValue))}" ${required}>${help||'<p class="field-help">Valor literal usado na execução.</p>'}</div>`;
      }
      return `<div class="field"><label>${label}${required?" *":""}</label><textarea data-param="${escapeHtml(chave)}" data-tipo="json" rows="3" spellcheck="false" ${required}>${escapeHtml(defaultValue?JSON.stringify(defaultValue):"")}</textarea><p class="field-help">Tipo <code>${escapeHtml(tipo)}</code> — informe valor em JSON.</p></div>`;
    };
    const body=params.length
      ?params.map(paramField).join("")
      :`<div class="empty">Este ${isFn?"função":"fluxo"} não declara entradas expostas — execute diretamente.</div>`;
    $("#gp-editor-view").innerHTML=`<div class="editor-head"><button class="icon-btn" data-back title="Voltar"><i data-lucide="arrow-left"></i></button><div><h2>${escapeHtml(item.nome)}</h2><p>${escapeHtml(item.descricao||"Preencha as entradas expostas e execute o "+(isFn?"função":"fluxo")+".")}</p></div></div><form id="gp-definition-run"><div class="editor-body">${body}</div><div class="editor-actions"><button type="button" class="btn" data-back-bottom>Cancelar</button><button class="btn primary">Executar</button></div></form>`;
    const back=()=>showLibrary(kind);$("[data-back]").onclick=back;$("[data-back-bottom]").onclick=back;icons();
    $("#gp-definition-run").onsubmit=async event=>{
      event.preventDefault();
      const inputs={};
      try{
        for(const el of event.target.querySelectorAll("[data-param]")){
          const chave=el.dataset.param,tipo=el.dataset.tipo;
          if(tipo==="bool"){inputs[chave]=el.checked;continue}
          if(tipo==="number"){inputs[chave]=el.value===""?null:Number(el.value);continue}
          if(tipo==="vetor_multi"||tipo==="raster_multi"){inputs[chave]=[...el.selectedOptions].map(o=>o.value).filter(Boolean);continue}
          if(tipo==="json"){inputs[chave]=el.value.trim()?JSON.parse(el.value):null;continue}
          inputs[chave]=el.value;
        }
        const response=await fetch(`${API}/${endpoint}/${item.id}/executar`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(inputs)}),body=await response.json();
        if(!response.ok)throw new Error(body.detail||`HTTP ${response.status}`);
        log(`${isFn?"Função":"Fluxo"} executado com sucesso.`,"ok");await refreshLayers();showLibrary(kind);
      }catch(error){log(error.message,"error");$("#gp-log").classList.add("open")}
    };
  }
  function showLibrary(kind){
    if(kind==="properties"){showProperties(state.layers.find(layer=>layer.id===state.activeLayerId)||null);return}
    showEditor();const isFn=kind==="functions",list=isFn?state.functions:state.flows,endpoint=isFn?"funcoes":"fluxos";
    $("#gp-right-title").textContent=isFn?"Funções":"Fluxos";
    const tips=window.gpModelTips?window.gpModelTips(isFn?"function":"flow"):"";
    $("#gp-editor-view").innerHTML=`<div class="editor-head"><h2>${isFn?"Funções":"Fluxos"}</h2><button class="btn primary" data-new>${isFn?"Nova função":"Novo fluxo"}</button></div>${tips}${list.length?`<div class="editor-body builder-list">${list.map(x=>`<div class="builder-item"><i data-lucide="${isFn?"blocks":"workflow"}"></i><strong>${escapeHtml(x.nome)}</strong><span>${(isFn?x.passos:x.itens)?.length||0}</span><button class="btn" data-edit-definition="${x.id}">Editar</button><button class="btn" data-validate-definition="${x.id}">Validar</button><button class="btn primary" data-run-definition="${x.id}">Executar</button><button class="icon-btn danger" data-delete="${x.id}"><i data-lucide="trash-2"></i></button></div>`).join("")}</div>`:`<div class="empty">Nenhum item criado.</div>`}`;icons();
    $("[data-new]").onclick=()=>isFn?window.gpApp.newFunction():window.gpApp.newFlow();
    $("#gp-editor-view").onclick=async event=>{
      const del=event.target.closest("[data-delete]"),edit=event.target.closest("[data-edit-definition]"),validate=event.target.closest("[data-validate-definition]"),run=event.target.closest("[data-run-definition]");
      try{
        if(edit){const item=list.find(value=>value.id===edit.dataset.editDefinition);if(window.gpApp.openVisualDefinition)window.gpApp.openVisualDefinition(kind,item);else{const chosen=isFn?item.passos.map(step=>({ref:step.algoritmo_id,parametros:step.parametros||{}})):item.itens.map(step=>({ref:step.funcao_id?`funcao:${step.funcao_id}`:`algoritmo:${step.algoritmo_id}`,parametros:step.parametros||{}}));builder(isFn?"function":"flow",chosen,item)}}
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
      const response=await fetch(`${API}/camadas/${id}/bounds`);if(!response.ok)return;
      const data=await response.json(),extent=data.bounds;
      if(Array.isArray(extent)&&extent.length===4){bounds.extend([extent[0],extent[1]]);bounds.extend([extent[2],extent[3]])}
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
    if(resource.destino==="memoria"){
      const response=await fetch(`${API}/camadas/${id}/geojson`);
      if(!response.ok)throw new Error(`Geometria em memória indisponível (HTTP ${response.status})`);
      const data=await response.json();state.geometryTypes[id]=[...new Set((data.features||[]).map(feature=>feature.geometry?.type).filter(Boolean))];
      const color=layerColor(id,state.geometryTypes[id]),invalid=["==",["get","slt_geometria_valida"],false],byValidity=["case",invalid,"#dc2626",color];
      state.map.addSource(id,{type:"geojson",data});
      state.map.addLayer({id,type:"fill",source:id,paint:{"fill-color":byValidity,"fill-opacity":["case",invalid,.68,.32],"fill-outline-color":byValidity},filter:["==",["geometry-type"],"Polygon"]});
      state.map.addLayer({id:id+"-line",type:"line",source:id,paint:{"line-color":byValidity,"line-width":["case",invalid,4,2]},filter:["==",["geometry-type"],"LineString"]});
      state.map.addLayer({id:id+"-point",type:"circle",source:id,paint:{"circle-color":byValidity,"circle-radius":["case",invalid,8,5],"circle-stroke-color":"#fff","circle-stroke-width":1},filter:["==",["geometry-type"],"Point"]});
      if(fit){const bounds=new maplibregl.LngLatBounds();data.features?.forEach(feature=>walkCoords(feature.geometry?.coordinates,coord=>bounds.extend(coord)));if(!bounds.isEmpty())state.map.fitBounds(bounds,{padding:40,maxZoom:15})}
      return true;
    }
    state.geometryTypes[id]=resource.geometria_tipo?[resource.geometria_tipo]:[];
    const color=layerColor(id,state.geometryTypes[id]);
    state.map.addSource(id,{type:"vector",tiles:[`${location.origin}${API}/camadas/${encodeURIComponent(id)}/tiles/{z}/{x}/{y}.pbf`],minzoom:0,maxzoom:22});
    const invalid=["==",["get","slt_geometria_valida"],false],byValidity=["case",invalid,"#dc2626",color];
    state.map.addLayer({id,type:"fill",source:id,"source-layer":"camada",paint:{"fill-color":byValidity,"fill-opacity":["case",invalid,.68,.32],"fill-outline-color":byValidity},filter:["==",["geometry-type"],"Polygon"]});
    state.map.addLayer({id:id+"-line",type:"line",source:id,"source-layer":"camada",paint:{"line-color":byValidity,"line-width":["case",invalid,4,2]},filter:["==",["geometry-type"],"LineString"]});
    state.map.addLayer({id:id+"-point",type:"circle",source:id,"source-layer":"camada",paint:{"circle-color":byValidity,"circle-radius":["case",invalid,8,5],"circle-stroke-color":"#fff","circle-stroke-width":1},filter:["==",["geometry-type"],"Point"]});
    if(fit)await zoomToCatalogLayer(id);
    return true;
  }
  async function consumePortalService(service){
    if(service.tipo==="WFS"){
      activateToolsTab();selectOp("OP-01");
      setTimeout(()=>{const type=$("[name=tipo_entrada]"),url=$("#gp-wfs-url");if(type){type.value="WFS";type.dispatchEvent(new Event("change"))}if(url)url.value=service.url},0);
      log(`${service.nome||service.titulo}: serviço WFS preparado para importação.`,"ok");
      return;
    }
    if(service.tipo==="STAC"||service.tipo==="OGCAPI"){
      window.open(service.url,"_blank","noopener");
      log(`${service.nome||service.titulo}: catálogo público aberto em nova guia.`,"ok");
      return;
    }
    if(!["WMS","WMTS","XYZ"].includes(service.tipo))throw new Error("Tipo de serviço não suportado");
    const id=`portal-wms-${service.id||service.servico_id}`;
    if(!state.map.getSource(id)){
      state.map.addSource(id,{type:"raster",tiles:[service.url],tileSize:256});
      state.map.addLayer({id,type:"raster",source:id,paint:{"raster-opacity":.78}});
    }
    log(`${service.nome||service.titulo}: camada WMS adicionada ao mapa.`,"ok");
  }
  async function filesAdded(files,taskProgress=null,options={}){
    const selected=[...files];
    if(!selected.length)return;
    if(!taskProgress){activateToolsTab();showEditor();taskProgress=createExecutionProgress($("#gp-editor-view"))}
    let failures=0;
    for(const file of selected){
      let createdId=null;
      try{
        let token=options.token_importacao;
        if(!token){
          const inspection=new FormData();inspection.append("arquivo",file);
          taskProgress.note(`${file.name}: inspecionando conteúdo geoespacial`);
          const inspected=await fetch(`${API}/importar_camadas/inspecionar`,{method:"POST",body:inspection,credentials:"include"});
          const inspectionBody=await inspected.json().catch(()=>({}));
          if(!inspected.ok)throw new Error(inspectionBody.detail||`HTTP ${inspected.status}`);
          if(inspectionBody.importavel===false)throw new Error(inspectionBody.erro_validacao||"Arquivo sem feições para importação");
          token=inspectionBody.token_importacao;
        }
        const form=new FormData();if(token)form.append("token_importacao",token);else form.append("arquivo",file);if(options.reprojetar_crs)form.append("reprojetar_crs",options.reprojetar_crs);if(options.recortar_camada_id)form.append("recortar_camada_id",options.recortar_camada_id);
        taskProgress.note(`${file.name}: iniciando importação validada`);
        const response=await fetch(`${API}/importar_camadas/job`,{method:"POST",body:form,credentials:"include"});let job=await response.json().catch(()=>({}));
        if(!response.ok)throw new Error(job.detail||`HTTP ${response.status}`);
        job=await waitForJob(job,taskProgress);const body=job.resultado||{};
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
  function bind(){ribbon();renderToolbox();refreshLayers();refreshDefinitions();window.gpCommands?.loadEnvironments?.();$("#gp-tool-search").oninput=e=>renderToolbox(e.target.value);$("#gp-layer-search").oninput=renderLayers;$("#gp-toolbox").addEventListener("click",e=>{const b=e.target.closest("[data-op]");if(b)selectOp(b.dataset.op)});$$('[data-ribbon]').forEach(b=>b.onclick=()=>{$$('[data-ribbon]').forEach(x=>x.classList.toggle("active",x===b));ribbon(b.dataset.ribbon)});$$('[data-right-tab]').forEach(b=>b.addEventListener("click",()=>{$$('[data-right-tab]').forEach(x=>{const active=x===b;x.classList.toggle("active",active);x.setAttribute("aria-selected",String(active))});if(b.dataset.rightTab==="tools")showTools();else if(b.dataset.rightTab==="history")showHistory();else if(b.dataset.rightTab==="model-elements"||b.dataset.rightTab==="model-properties")window.gpModeler?.showPanel?.(b.dataset.rightTab==="model-elements"?"elements":"properties");else showLibrary(b.dataset.rightTab)}));$("#gp-file-input").onchange=e=>{filesAdded(e.target.files);e.target.value=""};const mapView=$(".gp-map-view");["dragenter","dragover"].forEach(n=>mapView.addEventListener(n,e=>{e.preventDefault();mapView.classList.add("dragging")}));["dragleave","drop"].forEach(n=>mapView.addEventListener(n,e=>{e.preventDefault();mapView.classList.remove("dragging")}));mapView.addEventListener("drop",e=>filesAdded(e.dataTransfer.files));$("#gp-home").onclick=()=>state.map.flyTo({center:[-48.5,-22.4],zoom:6.2});$("#gp-fit").onclick=()=>state.map.fitBounds([[-53.2,-25.5],[-44,-19.5]],{padding:20});$("#gp-log-toggle").onclick=()=>$("#gp-log").classList.toggle("open")}
  function symbolPreview(kind,value,color){
    const c=color||"#334155";
    if(kind==="line"){const dash=value==="dashed"?' stroke-dasharray="7 4"':value==="dotted"?' stroke-dasharray="1 4.5" stroke-linecap="round"':'',w=value==="dotted"?3:2.5;return `<svg class="sym-preview" viewBox="0 0 46 14" aria-hidden="true"><line x1="3" y1="7" x2="43" y2="7" stroke="${c}" stroke-width="${w}"${dash}/></svg>`}
    if(kind==="cap"){return `<svg class="sym-preview" viewBox="0 0 46 14" aria-hidden="true"><line x1="13" y1="7" x2="33" y2="7" stroke="${c}" stroke-width="9" stroke-linecap="${value}"/></svg>`}
    if(kind==="join"){return `<svg class="sym-preview" viewBox="0 0 46 14" aria-hidden="true"><polyline points="7,12 23,3 39,12" fill="none" stroke="${c}" stroke-width="6" stroke-linejoin="${value}" stroke-linecap="butt"/></svg>`}
    if(kind==="filledge"){const dash=value==="dashed"?' stroke-dasharray="5 3"':value==="dotted"?' stroke-dasharray="1 3" stroke-linecap="round"':'',w=value==="dotted"?2.4:2;return `<svg class="sym-preview" viewBox="0 0 46 14" aria-hidden="true"><rect x="3.5" y="2.5" width="39" height="9" fill="${c}" fill-opacity="0.9" stroke="${c}" stroke-width="${w}"${dash}/></svg>`}
    if(value==="translucent")return `<svg class="sym-preview" viewBox="0 0 46 14" aria-hidden="true"><rect x="3" y="2" width="40" height="10" fill="${c}" fill-opacity="0.35" stroke="${c}" stroke-width="1.5"/></svg>`;
    if(value==="outline")return `<svg class="sym-preview" viewBox="0 0 46 14" aria-hidden="true"><rect x="4" y="2.5" width="38" height="9" fill="none" stroke="${c}" stroke-width="2"/></svg>`;
    return `<svg class="sym-preview" viewBox="0 0 46 14" aria-hidden="true"><rect x="3" y="2" width="40" height="10" fill="${c}"/></svg>`;
  }
  function symbolSelect(styleKey,kind,current,color,options){
    const cur=options.find(o=>o.value===current)||options[0];
    const items=options.map(o=>`<li role="option" data-option="${o.value}" aria-selected="${o.value===cur.value}">${symbolPreview(kind,o.value,color)}<span>${o.label}</span></li>`).join("");
    return `<div class="symbol-select" data-style="${styleKey}" data-kind="${kind}" data-value="${cur.value}"><button type="button" class="symbol-select-trigger" aria-haspopup="listbox" aria-expanded="false"><span class="symbol-select-preview">${symbolPreview(kind,cur.value,color)}</span><span class="symbol-select-text">${cur.label}</span><i data-lucide="chevron-down" class="symbol-select-caret"></i></button><ul class="symbol-select-list" role="listbox" hidden>${items}</ul></div>`;
  }
  function symbologyFields(layerId){
    const types=state.geometryTypes[layerId]||[],isPoint=types.some(type=>type.includes("Point")),isLine=types.some(type=>type.includes("Line"))&&!types.some(type=>type.includes("Polygon"));
    const isPolygon=!isPoint&&!isLine;
    const color=layerColor(layerId,types),style=currentEditStyle(layerId);
    const borderColor=style.borderColor||color,fillColor=style.fillColor||color;
    const dashOptions=[{value:"solid",label:isLine?"Contínua":"Sólida"},{value:"dashed",label:"Tracejada"},{value:"dotted",label:"Pontilhada"}];
    const capOptions=[{value:"butt",label:"Reta"},{value:"round",label:"Redonda"},{value:"square",label:"Quadrada"}];
    const joinOptions=[{value:"miter",label:"Ponta"},{value:"round",label:"Arredondada"},{value:"bevel",label:"Chanfrada"}];
    const fillOptions=[{value:"solid",label:"Sólido"},{value:"translucent",label:"Translúcido"},{value:"outline",label:"Sem preenchimento"}];
    const dashSelect=symbolSelect("lineTexture","line",style.lineTexture||"solid",borderColor,dashOptions);
    const capSelect=symbolSelect("lineCap","cap",style.lineCap||"butt",borderColor,capOptions);
    const joinSelect=symbolSelect("lineJoin","join",style.lineJoin||"miter",borderColor,joinOptions);
    const fillSelect=symbolSelect("fillTexture","fill",style.fillTexture||"solid",fillColor,fillOptions);
    const borderColorField=`<span class="color-field color-field-border"><span class="color-field-preview">${borderSwatch(borderColor,style.lineWidth??2)}</span><input data-style="borderColor" type="color" value="${borderColor}"></span>`;
    const field=(label,control)=>`<label>${label}${control}</label>`;
    const symField=(label,control)=>`<div class="sym-field"><span class="sym-field-label">${label}</span>${control}</div>`;
    const grp=(title,items)=>`<section class="sym-group"><h4 class="sym-group-title">${title}</h4><div class="geo-properties-grid">${items.join("")}</div></section>`;
    const num=(key,val,min,max,step=.5)=>`<input data-style="${key}" type="number" min="${min}" max="${max}" step="${step}" value="${val}">`;
    const range=(key,val)=>`<input data-style="${key}" type="range" min="0" max="1" step="0.05" value="${val}">`;
    const colorInput=key=>`<input data-style="${key}" type="color" value="${key==="fillColor"?fillColor:borderColor}">`;
    const groups=[];
    if(isPolygon){
      groups.push(grp("Aparência",[field("Cor de preenchimento",colorInput("fillColor")),field("Cor do contorno",borderColorField),field("Largura do contorno",num("lineWidth",style.lineWidth??2,0,12))]));
      groups.push(grp("Preenchimento",[symField("Estilo de preenchimento",fillSelect),field("Transparência do preenchimento",range("fillOpacity",style.fillOpacity??.32))]));
      groups.push(grp("Contorno",[symField("Estilo de linha",dashSelect),symField("Extremidade",capSelect),symField("Junção",joinSelect),field("Transparência do contorno",range("borderOpacity",style.borderOpacity??1))]));
    }else if(isLine){
      groups.push(grp("Aparência",[field("Cor",borderColorField),field("Largura",num("lineWidth",style.lineWidth??2,0,12))]));
      groups.push(grp("Traço",[symField("Estilo de linha",dashSelect),symField("Extremidade",capSelect),symField("Junção",joinSelect),field("Transparência",range("borderOpacity",style.borderOpacity??1))]));
    }else{
      groups.push(grp("Aparência",[field("Cor de preenchimento",colorInput("fillColor")),field("Cor do contorno",colorInput("borderColor")),field("Tamanho",num("pointRadius",style.pointRadius??5,2,24)),field("Largura do contorno",num("lineWidth",style.lineWidth??1,0,8))]));
      groups.push(grp("Efeitos",[field("Transparência do preenchimento",range("fillOpacity",style.fillOpacity??.32)),field("Transparência do contorno",range("borderOpacity",style.borderOpacity??1))]));
    }
    return `<div class="sym-groups">${groups.join("")}</div>`;
  }
  function borderSwatch(color,lineWidth){
    const sw=Math.max(1,Math.min(Number(lineWidth)||2,8));
    return `<svg class="sym-preview" viewBox="0 0 60 22" preserveAspectRatio="none" aria-hidden="true"><rect x="1" y="1" width="58" height="20" fill="none" stroke="${color||"#334155"}" stroke-width="${sw}" vector-effect="non-scaling-stroke"/></svg>`;
  }
  function refreshBorderField(scope,layerId){
    const preview=$(".color-field-border .color-field-preview",scope);if(!preview)return;
    const style=currentEditStyle(layerId),color=style.borderColor||layerColor(layerId);
    preview.innerHTML=borderSwatch(color,style.lineWidth??2);
  }
  function recolorSymbols(scope,layerId){
    const style=currentEditStyle(layerId),types=state.geometryTypes[layerId]||[],base=layerColor(layerId,types),fillColor=style.fillColor||base,borderColor=style.borderColor||fillColor;
    $$(".symbol-select",scope).forEach(root=>{const kind=root.dataset.kind,c=kind==="fill"?fillColor:borderColor;
      root.querySelectorAll("[data-option] .sym-preview").forEach(sp=>{sp.outerHTML=symbolPreview(kind,sp.closest("[data-option]").dataset.option,c)});
      const tp=root.querySelector(".symbol-select-preview");if(tp)tp.innerHTML=symbolPreview(kind,root.dataset.value,c)});
  }
  function wireSymbolSelect(root,layerId){
    const key=root.dataset.style,trigger=root.querySelector(".symbol-select-trigger"),list=root.querySelector(".symbol-select-list");
    trigger.onclick=e=>{e.stopPropagation();const willOpen=list.hidden;$$(".symbol-select.open").forEach(o=>{if(o!==root){o.classList.remove("open");o.querySelector(".symbol-select-list").hidden=true;o.querySelector(".symbol-select-trigger").setAttribute("aria-expanded","false")}});list.hidden=!willOpen;trigger.setAttribute("aria-expanded",String(willOpen));root.classList.toggle("open",willOpen)};
    list.querySelectorAll("[data-option]").forEach(opt=>{opt.onclick=()=>{const value=opt.dataset.option;root.dataset.value=value;root.querySelector(".symbol-select-preview").innerHTML=opt.querySelector(".sym-preview").outerHTML;root.querySelector(".symbol-select-text").textContent=opt.querySelector("span").textContent;list.querySelectorAll("[data-option]").forEach(o=>o.setAttribute("aria-selected",String(o===opt)));list.hidden=true;trigger.setAttribute("aria-expanded","false");root.classList.remove("open");stageStyle(layerId,{[key]:value});markSymbologyDirty()}});
  }
  function wireSymbology(scope,layerId){
    $$(".symbol-select[data-style]",scope).forEach(root=>wireSymbolSelect(root,layerId));
    $$("input[data-style]",scope).forEach(control=>{control.oninput=()=>{const value=["lineWidth","pointRadius","fillOpacity","borderOpacity"].includes(control.dataset.style)?Number(control.value):control.value;stageStyle(layerId,{[control.dataset.style]:value});markSymbologyDirty();if(control.dataset.style==="borderColor"||control.dataset.style==="fillColor")recolorSymbols(scope,layerId);if(control.dataset.style==="borderColor"||control.dataset.style==="lineWidth")refreshBorderField(scope,layerId)}});
  }
  function markSymbologyDirty(){if(state.symDraft)state.symDraft.dirty=true;const bar=$(".symbology-actions");if(bar)bar.classList.add("dirty")}
  function closeSymbologyMenu(){const menu=$("#gp-symbology-menu");if(menu)menu.remove()}
  function openSymbologyMenu(layerId,anchor){
    closeSymbologyMenu();
    const layer=state.layers.find(item=>item.id===layerId);if(!layer)return;
    const isRaster=layer.tipo?.toLowerCase().includes("raster");if(isRaster)return;
    state.activeLayerId=layerId;$$('[data-layer]').forEach(x=>x.classList.toggle("active",x.dataset.layer===layerId));
    const menu=document.createElement("div");menu.className="symbology-menu";menu.id="gp-symbology-menu";
    menu.innerHTML=`<header class="symbology-menu-head"><i data-lucide="shapes"></i><strong title="${escapeHtml(layer.nome)}">${escapeHtml(layer.nome)}</strong><button type="button" class="symbology-menu-close icon-btn" aria-label="Fechar"><i data-lucide="x"></i></button></header>${symbologyFields(layerId)}<p class="symbology-menu-hint">Alterações aplicadas imediatamente ao mapa.</p>`;
    document.body.appendChild(menu);
    const rect=anchor.getBoundingClientRect(),width=menu.offsetWidth||260,height=menu.offsetHeight||0;
    let left=rect.left,top=rect.bottom+6;
    if(left+width>window.innerWidth-8)left=Math.max(8,window.innerWidth-width-8);
    if(top+height>window.innerHeight-8)top=Math.max(8,rect.top-height-6);
    menu.style.left=`${left}px`;menu.style.top=`${top}px`;
    wireSymbology(menu,layerId);icons();
    menu.querySelector(".symbology-menu-close").addEventListener("click",closeSymbologyMenu);
  }
  function showProperties(layer){
    activateRightTab("properties");showEditor();$("#gp-right-title").textContent="Propriedades";
    state.symDraft=null;
    if(!layer){$("#gp-editor-view").innerHTML='<div class="empty">Selecione um recurso no Catálogo ou uma camada no painel Conteúdo para consultar suas propriedades.</div>';return}
    const isRaster=layer.tipo?.toLowerCase().includes("raster"),isMapVector=!isRaster&&state.layers.some(item=>item.id===layer.id);
    if(isMapVector){const saved=state.layerStyles[layer.id]||{};state.symDraft={layerId:layer.id,base:JSON.parse(JSON.stringify(saved)),draft:JSON.parse(JSON.stringify(saved)),dirty:false}}
    const symbology=isMapVector?`<section class="property-symbology"><h3>Simbologia</h3>${symbologyFields(layer.id)}</section>`:"";
    const actions=isMapVector?`<div class="editor-actions symbology-actions"><button type="button" class="btn ghost" data-sym-cancel>Cancelar</button><button type="button" class="btn" data-sym-apply>Aplicar</button><button type="button" class="btn primary" data-sym-save>Salvar</button></div>`:"";
    $("#gp-editor-view").innerHTML=`<div class="editor-head"><i data-lucide="${isRaster?"grid-3x3":"shapes"}"></i><h2>${escapeHtml(layer.nome)}</h2></div><div class="editor-body"><dl class="property-list"><dt>Identificador</dt><dd>${escapeHtml(layer.id)}</dd><dt>Tipo</dt><dd>${escapeHtml(layer.tipo||"Camada")}</dd><dt>CRS</dt><dd>${escapeHtml(layer.crs?crsLabel(layer.crs):"Não informado")}</dd><dt>Origem</dt><dd>${escapeHtml(layer.origem||"Sessão")}</dd><dt>Importação</dt><dd>${escapeHtml(layer.data_importacao||"Sessão atual")}</dd></dl>${symbology}</div>${actions}`;
    wireSymbology($("#gp-editor-view"),layer.id);wireSymbologyActions(layer.id);icons()
  }
  function wireSymbologyActions(layerId){
    const cancel=$("[data-sym-cancel]"),apply=$("[data-sym-apply]"),saveBtn=$("[data-sym-save]");
    if(apply)apply.onclick=()=>{const draft=state.symDraft?.draft;if(!draft)return;replaceLayerStyle(layerId,draft,false);renderLayers();log("Simbologia aplicada ao mapa.","ok")};
    if(saveBtn)saveBtn.onclick=()=>{const draft=state.symDraft?.draft;if(!draft)return;replaceLayerStyle(layerId,draft,true);if(state.symDraft)state.symDraft.base=JSON.parse(JSON.stringify(draft));state.symDraft.dirty=false;$(".symbology-actions")?.classList.remove("dirty");renderLayers();log("Simbologia salva no sistema.","ok")};
    if(cancel)cancel.onclick=()=>{const base=state.symDraft?.base;if(!base)return;replaceLayerStyle(layerId,base,true);if(state.symDraft){state.symDraft.draft=JSON.parse(JSON.stringify(base));state.symDraft.dirty=false}renderLayers();showProperties(state.layers.find(x=>x.id===layerId)||null);log("Alterações de simbologia descartadas.","ok")};
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
  document.addEventListener("DOMContentLoaded",()=>{monitorFormAccessibility();initMap();bind();showProperties(null);$("#gp-layer-list").addEventListener("change",e=>{if(e.target.dataset.basemapToggle){setBasemap(e.target.dataset.basemapToggle,e.target.checked)}});$("#gp-layer-list").addEventListener("click",e=>{const group=e.target.closest("[data-layer-group] > .layer-group-title");if(group){const section=e.target.closest("[data-layer-group]"),collapsed=section.classList.toggle("collapsed");group.setAttribute("aria-expanded",String(!collapsed));state.layerGroups[section.dataset.layerGroup]=collapsed;save("gp-layer-groups",state.layerGroups);return}const symbol=e.target.closest(".layer-symbol");if(symbol){const symbolRow=symbol.closest("[data-layer]");if(symbolRow){e.stopPropagation();state.activeLayerId=symbolRow.dataset.layer;$$('[data-layer]').forEach(x=>x.classList.toggle("active",x===symbolRow));showProperties(state.layers.find(x=>x.id===symbolRow.dataset.layer));return}}const row=e.target.closest("[data-layer]");if(!row)return;state.activeLayerId=row.dataset.layer;$$('[data-layer]').forEach(x=>x.classList.toggle("active",x===row));showProperties(state.layers.find(x=>x.id===row.dataset.layer))});document.addEventListener("click",e=>{const menu=$("#gp-symbology-menu");if(menu&&!menu.contains(e.target)&&!e.target.closest(".layer-symbol"))closeSymbologyMenu();if(!e.target.closest(".symbol-select"))$$(".symbol-select.open").forEach(o=>{o.classList.remove("open");const l=o.querySelector(".symbol-select-list");if(l)l.hidden=true;const t=o.querySelector(".symbol-select-trigger");if(t)t.setAttribute("aria-expanded","false")})});document.addEventListener("keydown",e=>{if(e.key==="Escape")closeSymbologyMenu()});$("#gp-catalog-tree").addEventListener("click",e=>{const row=e.target.closest(".tree-row");if(!row)return;$$('.gp-catalog-tree .tree-row').forEach(x=>x.classList.toggle("active",x===row));showProperties({id:row.textContent.trim().toLowerCase().replaceAll(" ","_"),nome:row.textContent.trim(),tipo:"Recurso do projeto",origem:"Catálogo"})});icons();log("Ambiente de geoprocessamento inicializado.","ok");emit("pronto",{api:API})});
  const TOOL_SUBGROUPS={"OP-01":"Importação e conexão","OP-02":"Qualidade e preparação","OP-02-CORR":"Qualidade e preparação","OP-03":"Qualidade e preparação","OP-04":"Geometria e proximidade","OP-05":"Sobreposição espacial","OP-05-IDENT":"Sobreposição espacial","OP-06":"Agregação vetorial","OP-07":"Consulta e seleção","OP-08":"Conversão de dados","OP-10":"Distância e custo","OP-11":"Distância e custo","OP-12":"Densidade e distribuição","OP-13":"Distância e custo","OP-14":"Interpolação e superfície","OP-15":"Agregação territorial","OP-16":"Criação de superfície","OP-17":"Álgebra de mapas","OP-20":"Normalização raster","OP-21":"Recorte e máscara","OP-22":"Estatística zonal","OP-23":"Amostragem raster","OP-24":"Extração zonal","OP-25":"Dados vetoriais","OP-26":"Dados raster"};
  Object.assign(TOOL_SUBGROUPS,{"OP-28":"Derivação geométrica","OP-29":"Derivação geométrica","OP-30":"Derivação geométrica","OP-31":"Generalização","OP-32":"Conversão geométrica","OP-33":"Recorte","OP-34":"Junção espacial","OP-35":"Mesclagem","OP-36":"Reprojeção","OP-37":"Medições","OP-38":"Medições","OP-39":"Reclassificação","OP-40":"Classificação binária","OP-41":"Transformação de valores","OP-42":"Estatística focal","OP-43":"Suavização"});
  renderToolbox=function(filter=""){
    const term=filter.toLocaleLowerCase("pt-BR"),collator=new Intl.Collator("pt-BR",{sensitivity:"base"}),scope=TOOLBOX_SCOPES[state.toolboxScope]||TOOLBOX_SCOPES.geral;
    if(state.toolboxScope==="geral"){
      const groups={};
      OPS.forEach(([group,operations])=>operations.filter(op=>op[1].toLocaleLowerCase("pt-BR").includes(term)).forEach(op=>(groups[group]??=[]).push({nome:op[1],tipo:"algoritmo",valor:op})));
      (state.functions||[]).filter(fn=>fn.nome.toLocaleLowerCase("pt-BR").includes(term)).forEach(fn=>(groups[fn.categoria||"Funções customizadas"]??=[]).push({nome:fn.nome,tipo:"funcao",valor:fn}));
      (state.flows||[]).filter(flow=>flow.nome.toLocaleLowerCase("pt-BR").includes(term)).forEach(flow=>(groups[flow.categoria||"Fluxos customizados"]??=[]).push({nome:flow.nome,tipo:"fluxo",valor:flow}));
      $("#gp-toolbox").innerHTML=Object.entries(groups).sort(([a],[b])=>collator.compare(a,b)).map(([group,items])=>`<div class="tool-group"><button class="tool-group-title" aria-expanded="true"><i data-lucide="chevron-down"></i><i data-lucide="briefcase"></i><span>${group}</span></button><div class="tool-group-children">${items.sort((a,b)=>collator.compare(a.nome,b.nome)).map(item=>item.tipo==="algoritmo"?toolRow(item.valor):`<button class="tool-row" ${item.tipo==="funcao"?"data-toolbox-function":"data-toolbox-flow"}="${escapeHtml(item.valor.id)}" title="${item.tipo==="funcao"?"Função":"Fluxo"}: ${escapeHtml(item.nome)}"><i data-lucide="${item.tipo==="funcao"?"blocks":"workflow"}"></i><span class="tool-name">${escapeHtml(item.nome)}</span><span class="availability" title="Definição customizada"></span></button>`).join("")}</div></div>`).join("");icons();return;
    }
    const algorithms=OPS.flatMap(group=>group[1]).filter(op=>scope.ids?.has(op[0])&&op[1].toLocaleLowerCase("pt-BR").includes(term));
    const functions=(state.functions||[]).filter(fn=>{const ids=(fn.passos||[]).map(step=>step.algoritmo_id);return ids.length&&ids.every(id=>scope.ids?.has(id))&&fn.nome.toLocaleLowerCase("pt-BR").includes(term)});
    const libraries={};
    algorithms.forEach(op=>{const library=TOOL_LIBRARY[op[0]]||"Núcleo do sistema";(libraries[library]??=[]).push({nome:op[1],tipo:"algoritmo",valor:op})});
    functions.forEach(fn=>{const library=TOOL_LIBRARY[fn.passos?.[0]?.algoritmo_id]||"Núcleo do sistema";(libraries[library]??=[]).push({nome:fn.nome,tipo:"funcao",valor:fn})});
    $("#gp-toolbox").innerHTML=Object.entries(libraries).sort(([a],[b])=>collator.compare(a,b)).map(([library,items])=>`<div class="tool-group"><button class="tool-group-title" aria-expanded="true"><i data-lucide="chevron-down"></i><i data-lucide="library"></i><span>${library}</span></button><div class="tool-group-children">${items.sort((a,b)=>collator.compare(a.nome,b.nome)).map(item=>item.tipo==="algoritmo"?toolRow(item.valor):`<button class="tool-row" data-toolbox-function="${escapeHtml(item.valor.id)}" title="Função: ${escapeHtml(item.nome)}"><i data-lucide="blocks"></i><span class="tool-name">${escapeHtml(item.nome)}</span><span class="availability" title="Função composta"></span></button>`).join("")}</div></div>`).join("");icons();
  };
  function toolRow(op){return`<button class="tool-row" data-op="${op[0]}" title="${escapeHtml(op[1])}"><i data-lucide="settings-2"></i><span class="tool-name">${escapeHtml(op[1])}</span><span class="availability" title="Disponível"></span></button>`}
  function openToolboxScope(scope="geral"){state.toolboxScope=TOOLBOX_SCOPES[scope]?scope:"geral";activateToolsTab();showTools();$("#gp-right-title").textContent=TOOLBOX_SCOPES[state.toolboxScope].nome;renderToolbox($("#gp-tool-search").value)}
  fieldHtml=function(f){const[id,label,type,val]=f,prefix=id==="nome_saida"?'<div class="form-section-title"><i data-lucide="save"></i><span>Saída</span></div>':"";if(type==="check")return`${prefix}<label class="field-check"><input name="${id}" type="checkbox" ${val?"checked":""}>${label}</label>`;let input,help="";if(type==="select")input=`<select name="${id}" required>${val.map(x=>`<option value="${x}">${crsLabel(x)}</option>`).join("")}</select>`;else if(type==="layer"||type==="layers"){input=`<select name="${id}" required ${type==="layers"?'multiple size="5"':""}><option value="">Selecione no Painel de Conteúdo…</option>${state.layers.map(x=>`<option value="${x.id}">${escapeHtml(x.nome)}</option>`).join("")}</select>`;help='<p class="field-help">Origem: Painel de Conteúdo.</p>'}else input=`<input name="${id}" type="${type}" value="${escapeHtml(val??"")}" required>`;return`${prefix}<div class="field"><label>${label}</label>${input}${help}</div>`};
  TOOL_SUBGROUPS["OP-27"]="Persistência";
  document.addEventListener("gp-modeler-state",()=>{const tab=$("[data-ribbon].active")?.dataset.ribbon||"modelo";ribbon(tab)});
  document.addEventListener("click",event=>{const fnRow=event.target.closest?.("[data-toolbox-function]"),flowRow=event.target.closest?.("[data-toolbox-flow]");if(fnRow){const fn=state.functions.find(item=>item.id===fnRow.dataset.toolboxFunction);if(fn)showDefinitionRun("functions",fn)}if(flowRow){const flow=state.flows.find(item=>item.id===flowRow.dataset.toolboxFlow);if(flow)showDefinitionRun("flows",flow)}});
  async function carregarPorIds(ids){
    const solicitados=[...new Set((ids||[]).filter(Boolean))];
    if(!solicitados.length)return [];
    const recursos=await Promise.all(solicitados.map(async id=>{
      const url=`${API}/camadas/${encodeURIComponent(id)}/carregar`;
      let response;
      for(let tentativa=0;tentativa<2;tentativa++){
        try{response=await fetch(url,{method:"POST"});break}
        catch(error){if(tentativa)throw new Error("API geoespacial indisponível");await new Promise(resolve=>setTimeout(resolve,400))}
      }
      if(!response?.ok){const body=await response?.json().catch(()=>null);throw new Error(body?.detail||`Falha ao carregar camada (HTTP ${response?.status||0})`)}
      return {solicitado:id,recurso:await response.json()};
    }));
    const recursoIds=recursos.map(({solicitado,recurso})=>recurso.id||solicitado);
    const visiveis=await refreshLayers(true,recursoIds,null,null);
    if(recursoIds.some(id=>!visiveis.has(id)))throw new Error("Camada carregada, mas não representada no mapa");
    recursos.forEach(({recurso},index)=>emit("recurso-importado",{id:recursoIds[index]}));
    return recursos.map(({recurso})=>recurso);
  }
  async function carregarPorId(id){
    return (await carregarPorIds([id]))[0];
  }
  function adicionarCamadaGeoJsonEmMemoria(id,nome,geojson,opts={}){
    if(!state.map){document.addEventListener("gp-modeler-state",()=>adicionarCamadaGeoJsonEmMemoria(id,nome,geojson,opts),{once:true});return}
    if(!state.map.isStyleLoaded()){state.map.once("load",()=>adicionarCamadaGeoJsonEmMemoria(id,nome,geojson,opts));return}
    removeMapResource(id);
    const color=layerColor(id);
    state.map.addSource(id,{type:"geojson",data:geojson});
    state.map.addLayer({id,type:"fill",source:id,paint:{"fill-color":color,"fill-opacity":.32,"fill-outline-color":color},filter:["==",["geometry-type"],"Polygon"]});
    state.map.addLayer({id:id+"-line",type:"line",source:id,paint:{"line-color":color,"line-width":2},filter:["==",["geometry-type"],"LineString"]});
    state.map.addLayer({id:id+"-point",type:"circle",source:id,paint:{"circle-color":color,"circle-radius":6,"circle-stroke-color":"#fff","circle-stroke-width":1.5},filter:["==",["geometry-type"],"Point"]});
    const bounds=new maplibregl.LngLatBounds();
    (geojson.features||[]).forEach(f=>walkCoords(f.geometry?.coordinates,c=>bounds.extend(c)));
    if(!bounds.isEmpty()) state.map.fitBounds(bounds,{padding:40,maxZoom:14});
    const entry={id,nome:nome||id,tipo:opts.tipo||"vetorial (memória)",origem:opts.origem||"Hierarquização",destino:"memoria_local",crs:"EPSG:4326",geometria_tipo:opts.geometria_tipo||"Point"};
    const idx=state.layers.findIndex(l=>l.id===id);
    if(idx>=0) state.layers[idx]=entry; else state.layers.push(entry);
    renderLayers();
  }
  window.gpApp={state,operationFields:FIELDS,operationLibraries:TOOL_LIBRARY,operations:OPS.flatMap(group=>group[1]).map(item=>({id:item[0],nome:item[1]})),selectOp,configureLoadOperation,cancelExecution,createTaskProgress:createExecutionProgress,waitForJob,applyLayerColor,consumePortalService,showTools,openToolboxScope,showBasemapPanel,showInfoPanel,newFunction,newFlow,showProperties,showAttributes,syncAttributeSelection,configureSelectionScope:()=>configureSelectionScope($("#gp-op-form")),showLibrary,showHistory,log,refreshLayers,renderLayers,setBasemap,renderToolbox,removeLayerFromMap,deleteLayerFromSystem,addCatalogLayerToMap,zoomToCatalogLayer,carregarPorId,carregarPorIds,adicionarCamadaGeoJsonEmMemoria};
})();
