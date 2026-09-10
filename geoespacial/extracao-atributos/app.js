import { $, feedback } from "./ui.js";
import { conectarIntegracao, disponivel, chamar } from "./integracao.js";
import { criarMapa } from "./mapa.js";
import { criarConfiguracao } from "./configuracao.js";
import { criarResultados } from "./resultados.js";

import { adaptador, json, esperar } from './api.js';

const state={catalog:[],categories:[],bases:[],staging:[],input:"",operation:"intersection",result:null,busy:false};
const map=criarMapa(),results=criarResultados();
const config=criarConfiguracao(state,changed);
function controls() {
  document.querySelectorAll("#ea-config input, #ea-config select, #ea-config button").forEach(node=>{if(state.busy)node.disabled=true;});
  $("#ea-run").disabled=state.busy||state.loadingMap||!disponivel("executar")||!state.input||!state.bases.length;
  $("#ea-export").disabled=state.busy||!state.result||!disponivel("exportar");
  $("#ea-integration-status").textContent=state.busy?"Processando…":state.loadingMap?"Carregando camadas no mapa…":disponivel("executar")?"Selecione as bases e a entrada para executar.":"Carregando catálogo…";
}
function syncMap() {
  const items=state.bases.map(base=>{
    const layer=state.catalog.find(l=>l.id===base.id),category=state.categories.find(c=>c.id===base.category);
    return {...layer,key:`base:${layer.id}`,grupo:category.nome,color:category.color};
  });
  const input=state.catalog.find(l=>l.id===state.input);
  if(input) items.push({...input,key:`input:${input.id}`,grupo:"Input",color:"#d6542b"});
  if(state.result?.geojson) items.push({key:`resultado:${state.result.id}`,nome:"Geometria da extração",geojson:state.result.geojson,grupo:"Resultado",color:"#853eaf"});
  map.sync(items.filter(item=>item.geojson));
}
let mapVersion=0;
async function changed() {
  const version=++mapVersion;
  if(state.result) {state.result=null;results.clear();feedback("A configuração mudou. Execute novamente para atualizar os resultados.");}
  state.loadingMap=true;config.render();syncMap();controls();
  try{
    const selected=state.catalog.filter(l=>l.id===state.input||state.bases.some(b=>b.id===l.id));
    await Promise.all(selected.filter(l=>!l.geojson).map(async l=>{l.geojson=await chamar('carregarCamada',l);}));
    if(version===mapVersion){config.render();syncMap();}
  }catch(error){feedback(`Não foi possível carregar uma camada no mapa: ${error.message}`);}
  finally{if(version===mapVersion){state.loadingMap=false;controls();}}
}
function busy(value) {
  state.busy=value;
  document.querySelectorAll("#ea-config input, #ea-config select, #ea-config button").forEach(node=>{node.disabled=value;});
  if(!value) config.render();controls();
  $("#ea-run").textContent=value?"Processando…":"Executar extração";
}
function validateGeoJSON(value) {
  if(value?.type!=="FeatureCollection"||!Array.isArray(value.features)||!value.features.length) throw new Error("Use um GeoJSON FeatureCollection com feições.");
  const crs=value.crs?.properties?.name;
  if(crs&&!/4326|CRS84/i.test(crs)) throw new Error("A visualização local exige WGS 84. Reprojete a camada na bancada completa.");
  const types=new Set(["Point","MultiPoint","LineString","MultiLineString","Polygon","MultiPolygon"]);
  function coordinates(coords) {
    if(!Array.isArray(coords)||!coords.length) throw new Error("Geometria sem coordenadas.");
    if(typeof coords[0]==="number") {
      if(coords.length<2||!coords.every(Number.isFinite)||Math.abs(coords[0])>180||Math.abs(coords[1])>90) throw new Error("As coordenadas devem estar em longitude/latitude (WGS 84).");
    } else coords.forEach(coordinates);
  }
  for(const feature of value.features) {
    if(feature.type!=="Feature"||!types.has(feature.geometry?.type)) throw new Error("São aceitas feições de ponto, linha ou polígono, incluindo multipartes.");
    coordinates(feature.geometry.coordinates);
  }
  return value;
}
function validateResult(value) {
  if(!value?.id||![0,1,2].includes(value.dimensao_input)||!Array.isArray(value.categorias)) throw new Error("O serviço retornou um resultado incompatível com o contrato de extração.");
  for(const category of value.categorias) {
    if(!category.id||typeof category.nome!=="string"||!Array.isArray(category.camadas)) throw new Error("Categoria de resultado inválida.");
    for(const layer of category.camadas) if(!layer.id||typeof layer.nome!=="string"||!Array.isArray(layer.ocorrencias)) throw new Error("Camada de resultado inválida.");
  }
  if(value.geojson?.features?.length) validateGeoJSON(value.geojson);
  return value;
}
function request() {
  return {motor:"gdal",operacao:state.operation,input:state.catalog.find(l=>l.id===state.input),categorias:state.categories.filter(c=>state.bases.some(b=>b.category===c.id)).map(c=>({id:c.id,nome:c.nome,camadas:state.bases.filter(b=>b.category===c.id).map(b=>state.catalog.find(l=>l.id===b.id))}))};
}
$("#ea-run").addEventListener("click",async()=>{
  if(state.busy||!state.input||!state.bases.length) return;
  try{map.assertReady();}catch(error){feedback(error.message);return;}
  busy(true);state.result=null;results.clear();syncMap();
  try {
    const value=validateResult(await chamar("executar",request()));
    state.result=value;results.set(value);syncMap();feedback("Extração concluída. Consulte os resultados por categoria e camada.");
    $("#ea-results").scrollIntoView({behavior:"smooth",block:"start"});
  } catch(error) {state.result=null;results.clear();syncMap();feedback(`Não foi possível executar: ${error.message}`);}
  finally {busy(false);}
});
$("#ea-export").addEventListener("click",async()=>{
  if(!state.result||state.busy) return;
  busy(true);
  try {await chamar("exportar",{resultado_id:state.result.id,formato:$("#ea-export-format").value});feedback("Exportação solicitada ao serviço.");}
  catch(error) {feedback(`Não foi possível exportar: ${error.message}`);} finally {busy(false);}
});
async function carregarCatalogo(){
  const catalog=await chamar('listarCatalogo'),previous=new Map(state.catalog.map(l=>[l.id,l]));
  state.catalog=catalog.camadas.map(l=>({...l,...Object.fromEntries(['arquivo','origem_geometria','geojson','revisao','campos','crs_arquivo'].filter(key=>previous.get(l.id)?.[key]!==undefined).map(key=>[key,previous.get(l.id)[key]]))}));
  const colors=['#1769aa','#52812e','#ad5b22','#8c4495','#217f83','#a34242','#58657a'];
  state.categories=catalog.categorias.map((c,i)=>({...c,color:colors[i%colors.length]}));
  state.bases=state.bases.filter(b=>state.catalog.some(l=>l.id===b.id)&&state.categories.some(c=>c.id===b.category));
  state.staging=state.staging.filter(b=>state.catalog.some(l=>l.id===b.id)&&state.categories.some(c=>c.id===b.category));
  if(!state.catalog.some(l=>l.id===state.input))state.input='';
  config.render();syncMap();controls();
}
window.addEventListener('extracao:integracao',async()=>{
  if(state.busy)return;busy(true);
  try{await carregarCatalogo();}catch(error){feedback(`Não foi possível carregar o catálogo: ${error.message}`);}finally{busy(false);}
});
window.SICARDExtracao={conectar:conectarIntegracao};
changed();
conectarIntegracao(adaptador);
document.getElementById('ea-refresh').addEventListener('click',async()=>{
  if(state.busy)return;busy(true);try{await carregarCatalogo();await changed();feedback('Catálogo atualizado.');}catch(e){feedback(e.message);}finally{busy(false);}
});
document.getElementById('ea-recover').addEventListener('click',async()=>{
  const id=sessionStorage.getItem('slt-extracao-ultima');if(!id){feedback('Nenhuma execução salva nesta sessão do navegador.');return;}
  if(state.busy)return;busy(true);
  try{const job=await json(`/extracao-atributos/execucoes/${id}`);state.result=validateResult(await esperar(job,id=>`/extracao-atributos/execucoes/${id}`));results.set(state.result);syncMap();feedback('Última análise recuperada.');}
  catch(e){feedback(e.message);}finally{busy(false);}
});
