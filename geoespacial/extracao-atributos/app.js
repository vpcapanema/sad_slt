import { $, feedback } from "./ui.js";
import { conectarIntegracao, disponivel, chamar } from "./integracao.js";
import { criarMapa } from "./mapa.js";
import { criarConfiguracao } from "./configuracao.js";
import { criarResultados } from "./resultados.js";

import { adaptador, json, esperar } from './api.js';
import { confirmarExecucao, acompanharExecucao } from './processo.js';

const OPCOES_OVERLAY=[
  ["promover_multipartes","Promover a multipartes","PROMOTE_TO_MULTI",true],
  ["manter_dimensoes_menores","Manter bordas e toques","KEEP_LOWER_DIMENSION_GEOMETRIES",false],
  ["ignorar_falhas","Ignorar feições com falha","SKIP_FAILURES",false],
  ["geometrias_preparadas","Geometrias preparadas","USE_PREPARED_GEOMETRIES",true],
  ["pretestar_continencia","Pré-testar continência","PRETEST_CONTAINMENT",false],
];
const state={catalog:[],categories:[],bases:[],staging:[],input:"",operation:"intersection",
  opcoes:Object.fromEntries(OPCOES_OVERLAY.map(([chave,,,padrao])=>[chave,padrao])),result:null,busy:false};
const map=criarMapa(()=>reconciliarPainel()),results=criarResultados();
const config=criarConfiguracao(state,changed);
// Mostra na 1.3 exatamente o que o botao Executar extracao esta enxergando:
// mesma leitura de state.input e state.bases que decide se ele habilita.
function renderSelecao() {
  const host=$("#ea-run-selection");if(!host)return;
  const nome=id=>state.catalog.find(l=>l.id===id)?.nome||id;
  const entrada=state.catalog.find(l=>l.id===state.input);
  host.replaceChildren();
  const linha=(rotulo,conteudo,vazio)=>{
    const bloco=document.createElement("div");bloco.className="ea-execucao-linha";
    const titulo=document.createElement("span");titulo.className="ea-execucao-rotulo";titulo.textContent=rotulo;
    bloco.append(titulo);
    if(vazio){const alerta=document.createElement("em");alerta.className="ea-execucao-falta";alerta.textContent=vazio;bloco.append(alerta);}
    else bloco.append(conteudo);
    return bloco;
  };
  const valor=document.createElement("span");valor.className="ea-execucao-valor";
  valor.textContent=entrada?entrada.nome:"";
  host.append(linha("Entrada",valor,entrada?"":"nenhuma camada de entrada escolhida em 1.2"));

  const grupos=state.categories
    .map(c=>({c,itens:state.bases.filter(b=>b.category===c.id)}))
    .filter(g=>g.itens.length);
  const lista=document.createElement("div");lista.className="ea-execucao-bases";
  for(const {c,itens} of grupos){
    const grupo=document.createElement("div");grupo.className="ea-execucao-grupo";
    const cabeca=document.createElement("strong");cabeca.textContent=c.nome;
    const conta=document.createElement("span");conta.className="ea-badge";conta.textContent=String(itens.length);
    grupo.append(cabeca,conta);
    for(const base of itens){
      const item=document.createElement("span");item.className="ea-execucao-base";item.textContent=nome(base.id);
      grupo.append(item);
    }
    lista.append(grupo);
  }
  host.append(linha(`Bases (${state.bases.length})`,lista,
    state.bases.length?"":"nenhuma base confirmada em 1.1; monte a lista e use Confirmar e enviar à bancada"));
}
// O que o processamento enxerga e o que esta no painel da bancada. Se o usuario
// remove uma camada la, ela sai das bases e da entrada aqui.
function reconciliarPainel() {
  const noPainel=map.camadas();
  if(!noPainel||state.busy)return;
  const presentes=new Set(noPainel.map(item=>item.id));
  const removidas=state.bases.filter(base=>!presentes.has(base.id));
  const entradaSaiu=Boolean(state.input)&&!presentes.has(state.input);
  if(!removidas.length&&!entradaSaiu)return;
  const nome=id=>state.catalog.find(l=>l.id===id)?.nome||id;
  const perdida=state.input;
  state.bases=state.bases.filter(base=>presentes.has(base.id));
  if(entradaSaiu)state.input='';
  config.render();controls();
  const partes=[];
  if(removidas.length)partes.push(`${removidas.length} base(s) removida(s) no painel: ${removidas.map(b=>nome(b.id)).join(', ')}.`);
  if(entradaSaiu)partes.push(`A camada de entrada ${nome(perdida)} saiu do painel.`);
  feedback(`${partes.join(' ')} A extração passa a considerar apenas o que está no painel de camadas.`);
}
function controls() {
  document.querySelectorAll("#ea-config input, #ea-config select, #ea-config button").forEach(node=>{if(state.busy)node.disabled=true;});
  $("#ea-run").disabled=state.busy||state.loadingMap||!disponivel("executar")||!state.input||!state.bases.length;
  $("#ea-export").disabled=state.busy||!state.result||!disponivel("exportar");
  renderSelecao();
  const falta=[!state.input&&"a camada de entrada",!state.bases.length&&"as camadas base"].filter(Boolean);
  $("#ea-integration-status").textContent=state.busy?"Processando…"
    :state.loadingMap?"Carregando camadas no mapa…"
    :!disponivel("executar")?"Carregando catálogo…"
    :falta.length?`Falta selecionar ${falta.join(" e ")}.`
    :`Pronto para executar sobre ${state.bases.length} base(s).`;
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
async function changed(painel) {
  const version=++mapVersion;
  if(state.result) {state.result=null;results.clear();feedback("A configuração mudou. Execute novamente para atualizar os resultados.");}
  state.loadingMap=true;config.render();syncMap();controls();
  const falhas=[];
  try{
    const selected=state.catalog.filter(l=>l.id===state.input||state.bases.some(b=>b.id===l.id));
    const pendentes=selected.filter(l=>!l.geojson);
    if(pendentes.length)painel?.etapa(`Lendo ${pendentes.length} arquivo(s) do storage.`);
    // Uma camada com problema nao pode derrubar a importacao das demais.
    await Promise.all(pendentes.map(async l=>{
      try{
        l.geojson=await chamar('carregarCamada',l);
        painel?.etapa(`${l.nome}: ${l.geojson.features.length} feição(ões) no mapa.`);
      }catch(error){
        falhas.push(`${l.nome}: ${error.message}`);
        painel?.etapa(`${l.nome}: ${error.message}`,'erro');
      }
    }));
    if(version===mapVersion){config.render();syncMap();}
    if(falhas.length)feedback(`Não foi possível carregar ${falhas.length} camada(s): ${falhas.join(' · ')}`);
  }catch(error){falhas.push(error.message);painel?.etapa(error.message,'erro');feedback(`Não foi possível carregar uma camada no mapa: ${error.message}`);}
  finally{if(version===mapVersion){state.loadingMap=false;controls();}}
  return falhas;
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
// Os parametros do operador do OGR abrem abaixo do seletor e seguem no pedido.
function renderParametros() {
  const host=$("#ea-operation-params");if(!host)return;
  const operador=state.operation==="identity"?"ogr.Layer.Identity":"ogr.Layer.Intersection";
  host.replaceChildren();
  const titulo=document.createElement("h4");titulo.className="ea-op-params-title";
  titulo.textContent=`Parâmetros de ${operador}`;host.append(titulo);
  const grade=document.createElement("div");grade.className="ea-op-params-grid";
  for(const [chave,rotulo,opcao] of OPCOES_OVERLAY){
    const campo=document.createElement("label");campo.className="ea-field";
    const nome=document.createElement("span");nome.textContent=rotulo;
    const dica=document.createElement("small");dica.textContent=opcao;
    const select=document.createElement("select");
    select.append(new Option("Sim","sim"),new Option("Não","nao"));
    select.value=state.opcoes[chave]?"sim":"nao";
    select.disabled=state.busy;
    select.setAttribute("aria-label",`${rotulo} (${opcao})`);
    select.addEventListener("change",()=>{state.opcoes[chave]=select.value==="sim";});
    campo.append(nome,dica,select);grade.append(campo);
  }
  host.append(grade);
}
function request() {
  return {motor:"gdal",operacao:state.operation,opcoes:{...state.opcoes},input:state.catalog.find(l=>l.id===state.input),categorias:state.categories.filter(c=>state.bases.some(b=>b.category===c.id)).map(c=>({id:c.id,nome:c.nome,camadas:state.bases.filter(b=>b.category===c.id).map(b=>state.catalog.find(l=>l.id===b.id))}))};
}
$("#ea-run").addEventListener("click",async()=>{
  if(state.busy||!state.input||!state.bases.length) return;
  try{map.assertReady();}catch(error){feedback(error.message);return;}
  const pedido=request();
  const confirmado=await confirmarExecucao({
    entrada:pedido.input.nome,
    operacao:$("#ea-operation").selectedOptions[0]?.textContent||pedido.operacao,
    totalCamadas:pedido.categorias.reduce((soma,c)=>soma+c.camadas.length,0),
    categorias:pedido.categorias,
  });
  if(!confirmado){feedback("Execução cancelada. Nada foi processado.");return;}
  busy(true);state.result=null;results.clear();syncMap();
  const painel=acompanharExecucao();
  try {
    const value=validateResult(await chamar("executar",pedido,job=>painel.etapas(job.etapas)));
    state.result=value;results.set(value);syncMap();
    painel.concluir("Extração concluída. Os resultados estão disponíveis por categoria e camada.",
      ()=>$("#ea-results").scrollIntoView({behavior:"smooth",block:"start"}));
    feedback("Extração concluída. Consulte os resultados por categoria e camada.");
  } catch(error) {
    state.result=null;results.clear();syncMap();
    painel.falhar(error.message);
    feedback(`Não foi possível executar: ${error.message}`);
  }
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
window.SICARDExtracao={conectar:conectarIntegracao,renderParametros};
renderParametros();
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
