import { $, feedback } from "./ui.js";
import { conectarIntegracao, disponivel, chamar } from "./integracao.js";
import { criarMapa } from "./mapa.js";
import { criarConfiguracao } from "./configuracao.js";
import { criarResultados } from "./resultados.js";

import { adaptador, json, esperar } from './api.js';
import { confirmarExecucao, acompanharExecucao } from './processo.js';
import { editarEntrada, editarFinalidade, editarRegra, prefixoPadrao, resumoEntrada } from './regras.js';
import { renderDiagrama } from './diagramas.js';
import { escolherArquivo } from './explorador.js';

const OPCOES_OVERLAY=[
  ["promover_multipartes","Promover a multipartes","PROMOTE_TO_MULTI",true],
  ["manter_dimensoes_menores","Manter bordas e toques","KEEP_LOWER_DIMENSION_GEOMETRIES",false],
  ["ignorar_falhas","Ignorar feições com falha","SKIP_FAILURES",false],
  ["geometrias_preparadas","Geometrias preparadas","USE_PREPARED_GEOMETRIES",true],
  ["pretestar_continencia","Pré-testar continência","PRETEST_CONTAINMENT",false],
];
const state={catalog:[],categories:[],bases:[],staging:[],input:"",operation:"",
  opcoes:Object.fromEntries(OPCOES_OVERLAY.map(([chave,,,padrao])=>[chave,padrao])),
  nomeSaida:"",result:null,busy:false,
  // Só no enriquecimento: configuração da entrada principal, entradas adicionais e finalidades.
  inputConfig:null,entradasExtras:[],finalidades:[]};
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
  host.append(linha("Camadas de entrada:",valor,entrada?"":"nenhuma camada de entrada escolhida em 1.1"));

  const grupos=state.categories
    .map(c=>({c,itens:state.bases.filter(b=>b.category===c.id)}))
    .filter(g=>g.itens.length);
  const lista=document.createElement("div");lista.className="ea-execucao-bases";
  for(const {c,itens} of grupos){
    const grupo=document.createElement("div");grupo.className="ea-execucao-grupo";
    const cabeca=document.createElement("strong");cabeca.textContent=c.nome;
    const conta=document.createElement("span");conta.className="ea-badge";conta.textContent=String(itens.length);
    grupo.append(cabeca,conta);
    // A regra de cada base fica na 1.1, ao lado da camada; aqui é só conferência.
    for(const base of itens){
      const item=document.createElement("span");item.className="ea-execucao-base";item.textContent=nome(base.id);
      grupo.append(item);
    }
    lista.append(grupo);
  }
  host.append(linha(`Camadas de base: (${state.bases.length})`,lista,
    state.bases.length?"":"nenhuma base confirmada em 1.2; monte a lista e use Confirmar bases"));
  // Estimativa antes de executar: o que se sabe sem processar.
  if(state.operation==="enriquecimento"&&state.input){
    const feicoes=entradasEnriquecimento().reduce((soma,item)=>{
      const camada=state.catalog.find(l=>l.id===item.id);
      return soma+(camada?.geojson?.features?.length||0);
    },0);
    const recorte=state.bases.some(b=>b.regra?.papel==="recorte");
    const todas=state.bases.filter(b=>b.regra?.multiplicidade==="todas").map(b=>nome(b.id));
    const partes=[feicoes?`${feicoes} feição(ões) de entrada`:"contagem da entrada indisponível"];
    if(recorte)partes.push("o recorte divide linhas e polígonos entre as unidades, aumentando o número de registros");
    if(todas.length)partes.push(`a regra "todas" em ${todas.join(", ")} repete o registro por feição tocada`);
    if(!recorte&&!todas.length)partes.push("um registro por feição de entrada");
    const texto=document.createElement("em");texto.className="ea-execucao-estimativa";
    texto.textContent=`Estimativa: ${partes.join("; ")}.`;
    host.append(linha("Registros previstos:",texto));
  }
}
// Entradas do enriquecimento: a principal (1.2) e as adicionais.
function entradasEnriquecimento() {
  return [...(state.input?[{id:state.input,principal:true}]:[]),...state.entradasExtras];
}
// Campos que a saída terá, para escolher os das finalidades sem precisar executar antes.
function camposPrevistos() {
  const nome=id=>state.catalog.find(l=>l.id===id)?.nome||id;
  const itens=[
    {campo:"id_registro",rotulo:"id_registro · identificador do registro",grupo:"Identificação"},
    {campo:"camada_origem",rotulo:"camada_origem · camada de entrada",grupo:"Identificação"},
    {campo:"fid_origem",rotulo:"fid_origem · posição na entrada",grupo:"Identificação"},
    {campo:"id_origem",rotulo:"id_origem · identificador da feição",grupo:"Identificação"},
  ];
  for(const entrada of entradasEnriquecimento()){
    const camada=state.catalog.find(l=>l.id===entrada.id);
    const config=entrada.principal?state.inputConfig:entrada.config;
    const campos=config?.campos||Object.keys(camada?.geojson?.features?.[0]?.properties||{});
    for(const campo of campos)if(!itens.some(i=>i.campo===campo))itens.push({campo,rotulo:campo,grupo:`Entrada · ${nome(entrada.id)}`});
  }
  for(const base of state.bases){
    const camada=state.catalog.find(l=>l.id===base.id);
    const prefixo=base.regra?.prefixo?(base.regra.prefixo.endsWith("_")?base.regra.prefixo:base.regra.prefixo+"_"):prefixoPadrao(nome(base.id));
    const campos=base.regra?.campos||Object.keys(camada?.geojson?.features?.[0]?.properties||{});
    const grupo=`Base · ${nome(base.id)}`;
    for(const campo of campos)itens.push({campo:prefixo+campo,rotulo:prefixo+campo,grupo});
    itens.push({campo:`${prefixo}n_feicoes`,rotulo:`${prefixo}n_feicoes · nº de feições tocadas`,grupo});
    if(base.regra?.multiplicidade!=="resumo")itens.push({campo:`${prefixo}fid_base`,rotulo:`${prefixo}fid_base · feição escolhida`,grupo});
  }
  return itens;
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
  $("#ea-run").disabled=state.busy||state.loadingMap||!disponivel("executar")||!state.operation||!state.input||!state.bases.length;
  $("#ea-export").disabled=state.busy||!state.result||!disponivel("exportar");
  renderSelecao();
  const entrada=state.catalog.find(l=>l.id===state.input);
  const campoSaida=$("#ea-nome-saida");
  if(campoSaida){
    campoSaida.placeholder=entrada?`Extração de ${entrada.nome}`:"Extração de <camada de entrada>";
    campoSaida.disabled=state.busy;
  }
  const falta=[!state.operation&&"o algoritmo de processamento",!state.input&&"a camada de entrada",
    !state.bases.length&&"as camadas base"].filter(Boolean);
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
// Leitura de arquivo no servidor custa uma conexao ao banco remoto: fila curta.
const SIMULTANEAS=3, TENTATIVAS=3;
let mapVersion=0;
async function changed(painel) {
  const version=++mapVersion;
  if(state.result) {state.result=null;results.clear();feedback("A configuração mudou. Execute novamente para atualizar os resultados.");}
  state.loadingMap=true;config.render();syncMap();controls();
  const falhas=[];
  try{
    const selected=state.catalog.filter(l=>l.id===state.input||state.bases.some(b=>b.id===l.id));
    const pendentes=selected.filter(l=>!l.geojson);
    if(pendentes.length)painel?.etapa(`Lendo ${pendentes.length} arquivo(s) do storage, ${SIMULTANEAS} por vez.`);
    // Em paralelo sem limite, 18 camadas abriam 18 conexoes ao banco remoto e a
    // maioria estourava o tempo de conexao. Uma fila curta resolve, e uma camada
    // com problema nao derruba as demais.
    let proxima=0,concluidas=0;
    async function trabalhador(){
      while(proxima<pendentes.length){
        const l=pendentes[proxima++];
        for(let tentativa=1;tentativa<=TENTATIVAS;tentativa++){
          try{
            l.geojson=await chamar('carregarCamada',l);
            painel?.etapa(`${l.nome}: ${l.geojson.features.length} feição(ões) no mapa. (${++concluidas}/${pendentes.length})`);
            break;
          }catch(error){
            const ultima=tentativa===TENTATIVAS;
            if(!ultima&&/tempo|timeout|conectar/i.test(error.message)){
              painel?.etapa(`${l.nome}: ${error.message} Tentando de novo.`);
              await new Promise(resolve=>setTimeout(resolve,700*tentativa));
              continue;
            }
            concluidas++;
            falhas.push(`${l.nome}: ${error.message}`);
            painel?.etapa(`${l.nome}: ${error.message}`,'erro');
            break;
          }
        }
      }
    }
    await Promise.all(Array.from({length:Math.min(SIMULTANEAS,pendentes.length)},trabalhador));
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
  if(value?.modo==="enriquecimento"){
    if(!value.id||!value.camadas||typeof value.camadas!=="object"||!Array.isArray(value.dicionario)) throw new Error("O serviço retornou um resultado incompatível com o contrato do enriquecimento.");
    if(value.geojson?.features?.length) validateGeoJSON(value.geojson);
    return value;
  }
  if(!value?.id||![0,1,2].includes(value.dimensao_input)||!Array.isArray(value.categorias)) throw new Error("O serviço retornou um resultado incompatível com o contrato de extração.");
  for(const category of value.categorias) {
    if(!category.id||typeof category.nome!=="string"||!Array.isArray(category.camadas)) throw new Error("Categoria de resultado inválida.");
    for(const layer of category.camadas) if(!layer.id||typeof layer.nome!=="string"||!Array.isArray(layer.ocorrencias)) throw new Error("Camada de resultado inválida.");
  }
  if(value.geojson?.features?.length) validateGeoJSON(value.geojson);
  return value;
}
const criar=(tag,texto,classe)=>{const node=document.createElement(tag);if(texto!==undefined)node.textContent=texto;if(classe)node.className=classe;return node;};
const botaoPequeno=(texto,acao)=>{const b=criar("button",texto,"ea-btn ea-regra-botao");b.type="button";b.disabled=state.busy;b.addEventListener("click",acao);return b;};
const nomeCamada=id=>state.catalog.find(l=>l.id===id)?.nome||id;
// Entradas do enriquecimento na própria 1.2: a principal e as adicionais, cada uma
// com identificador, filtro e campos.
export function renderEntradas() {
  const host=$("#ea-entradas");if(!host)return;
  host.replaceChildren();
  host.hidden=state.operation!=="enriquecimento";
  if(host.hidden)return;
  host.append(criar("h4","Entradas desta análise","ea-op-params-title"));
  const itens=entradasEnriquecimento();
  if(!itens.length)host.append(criar("p","Escolha a camada de entrada acima; ela será a entrada principal.","ea-hint"));
  for(const item of itens){
    const linha=criar("div",undefined,"ea-execucao-linha");
    const config=item.principal?state.inputConfig:item.config;
    linha.append(criar("strong",`${nomeCamada(item.id)}${item.principal?" (principal)":""}`),criar("span",` · ${resumoEntrada(config)} `));
    linha.append(botaoPequeno("Configurar",async()=>{
      const camada=state.catalog.find(l=>l.id===item.id);
      const nova=await editarEntrada({nomeEntrada:nomeCamada(item.id),config,camposDisponiveis:Object.keys(camada?.geojson?.features?.[0]?.properties||{})});
      if(!nova)return;
      if(item.principal)state.inputConfig=nova;else item.config=nova;
      renderEntradas();renderSelecao();
    }));
    if(!item.principal)linha.append(" ",botaoPequeno("Remover",()=>{
      state.entradasExtras=state.entradasExtras.filter(e=>e!==item);renderEntradas();renderSelecao();
    }));
    host.append(linha);
  }
  host.append(botaoPequeno("Adicionar entrada",async()=>{
    const excluidas=[state.input,...state.entradasExtras.map(e=>e.id),...state.bases.map(b=>b.id),...state.staging.map(b=>b.id)].filter(Boolean);
    const escolha=await escolherArquivo({catalog:state.catalog,excluded:excluidas,multiple:true,title:"Selecionar entradas adicionais"});
    if(!escolha)return;
    for(const camada of escolha)if(!state.entradasExtras.some(e=>e.id===camada.id))state.entradasExtras.push({id:camada.id,config:null});
    renderEntradas();renderSelecao();
  }));
  host.append(criar("small","Cada entrada pode ter identificador, filtro e campos próprios. Entradas do mesmo tipo de geometria saem na mesma camada.","ea-hint"));
}
// Recortes por finalidade: os campos são escolhidos numa lista, sem digitar nome de campo.
export function renderFinalidades() {
  const host=$("#ea-finalidades");if(!host)return;
  host.replaceChildren();
  host.hidden=state.operation!=="enriquecimento";
  if(host.hidden)return;
  host.append(criar("h4","Recortes por finalidade (opcional)","ea-op-params-title"));
  if(!state.finalidades.length)host.append(criar("p","Nenhum recorte. Use Adicionar finalidade para gerar no pacote camadas e tabelas só com os campos que interessam.","ea-hint"));
  for(const finalidade of state.finalidades){
    const linha=criar("div",undefined,"ea-execucao-linha");
    linha.append(criar("strong",finalidade.nome),criar("span",` · ${finalidade.campos.length} campo(s): ${finalidade.campos.slice(0,4).join(", ")}${finalidade.campos.length>4?"…":""} `));
    linha.append(botaoPequeno("Editar",async()=>{
      const nova=await editarFinalidade({...finalidade,disponiveis:camposPrevistos()});
      if(nova)Object.assign(finalidade,nova);
      renderFinalidades();
    }));
    linha.append(" ",botaoPequeno("Remover",()=>{
      state.finalidades=state.finalidades.filter(f=>f!==finalidade);renderFinalidades();
    }));
    host.append(linha);
  }
  host.append(botaoPequeno("Adicionar finalidade",async()=>{
    const nova=await editarFinalidade({disponiveis:camposPrevistos()});
    if(nova)state.finalidades.push(nova);
    renderFinalidades();
  }));
}
// Os parametros do operador do OGR abrem abaixo do seletor e seguem no pedido.
function renderParametros() {
  // O desenho do algoritmo fica no subcard 1.3, ao lado do seletor.
  renderDiagrama($("#ea-algoritmo-desenho"),state.operation);
  const host=$("#ea-operation-params");if(!host)return;
  host.replaceChildren();
  // Sem algoritmo escolhido nao ha parametro que faca sentido mostrar.
  host.hidden=!state.operation;
  if(!state.operation)return;
  renderEntradas();renderFinalidades();
  if(state.operation==="enriquecimento"){
    const titulo=document.createElement("h4");titulo.className="ea-op-params-title";titulo.textContent="Como as bases entram";
    const texto=document.createElement("p");texto.className="ea-hint";
    texto.textContent="Cada base confirmada tem um botão Regra na lista da seção 1.2, ao lado da camada: papel (atributos ou unidade de recorte), ligação, multiplicidade, campos, prefixo, apelidos e buffer. Sem mexer, vale o padrão: por localização, feição de maior sobreposição, todos os campos.";
    host.append(titulo,texto);renderSelecao();
    return;
  }
  const operador=state.operation==="identity"?"ogr.Layer.Identity":"ogr.Layer.Intersection";
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
  return {motor:"gdal",operacao:state.operation,opcoes:{...state.opcoes},nome_saida:state.nomeSaida.trim(),input:state.catalog.find(l=>l.id===state.input),categorias:state.categories.filter(c=>state.bases.some(b=>b.category===c.id)).map(c=>({id:c.id,nome:c.nome,camadas:state.bases.filter(b=>b.category===c.id).map(b=>state.catalog.find(l=>l.id===b.id)),
    regras:state.operation==="enriquecimento"?Object.fromEntries(state.bases.filter(b=>b.category===c.id&&b.regra).map(b=>[b.id,b.regra])):{}})),
    ...(state.operation==="enriquecimento"?{
      entradas:[{id:state.input,config:state.inputConfig||{}},...state.entradasExtras.map(e=>({id:e.id,config:e.config||{}}))],
      finalidades:state.finalidades.map(f=>({nome:f.nome,campos:[...f.campos]}))}:{})};
}
$("#ea-run").addEventListener("click",async()=>{
  if(state.busy||!state.operation||!state.input||!state.bases.length) return;
  try{map.assertReady();}catch(error){feedback(error.message);return;}
  let pedido;
  try{pedido=request();}catch(error){feedback(error.message);return;}
  const confirmado=await confirmarExecucao({
    entrada:pedido.input.nome,
    saida:pedido.nome_saida||`Extração de ${pedido.input.nome}`,
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
    painel.concluir("Extração concluída. Os resultados estão na tela e o pacote de saída (.zip) está pronto para baixar.",
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
  try {await chamar("exportar",{resultado_id:state.result.id});feedback("Download iniciado.");}
  catch(error) {feedback(`Não foi possível baixar: ${error.message}`);} finally {busy(false);}
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
  abrirExtracaoDaUrl();
});
window.SICARDExtracao={conectar:conectarIntegracao,renderParametros,renderSelecao,renderEntradas,renderFinalidades};
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

// Aberta pelo índice (?execucao=<id>): mostra o resultado da extração já executada.
async function abrirExtracao(id){
  if(state.busy)return;busy(true);
  try{
    const job=await json(`/extracao-atributos/execucoes/${encodeURIComponent(id)}`);
    if(job.status!=='concluido'||!job.resultado)throw new Error('Esta extração não tem resultado disponível.');
    state.result=validateResult(job.resultado);results.set(state.result);syncMap();
    $("#ea-results").scrollIntoView({behavior:"smooth",block:"start"});
    feedback(`Resultados de "${job.resultado.input_nome||'extração'}" abertos. O pacote de saída pode ser baixado na seção 03.`);
  }catch(error){feedback(`Não foi possível abrir: ${error.message}`);}finally{busy(false);}
}
const execucaoDaUrl=new URLSearchParams(location.search).get('execucao');
let execucaoAberta=false;
function abrirExtracaoDaUrl(){
  if(!execucaoDaUrl||execucaoAberta||state.busy)return;
  execucaoAberta=true;abrirExtracao(execucaoDaUrl);
}
abrirExtracaoDaUrl();
