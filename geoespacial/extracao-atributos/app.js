import { $, feedback, camposCamada } from "./ui.js";
import { conectarIntegracao, disponivel, chamar } from "./integracao.js";
import { criarMapa } from "./mapa.js";
import { criarConfiguracao } from "./configuracao.js";
import { criarResultados } from "./resultados.js";

import { adaptador, json, esperar } from './api.js';
import { confirmarExecucao, acompanharExecucao } from './processo.js';
import { editarFinalidade, editarRegra, prefixoPadrao, categoriaBinaria } from './regras.js';
import { renderDiagrama } from './diagramas.js';
import { restaurarRetornoMunicipal } from './municipal.js';

import { componentes, removerPrevia } from './preparacao.js';

const OPCOES_OVERLAY=[
  ["promover_multipartes","Promover a multipartes","PROMOTE_TO_MULTI",true],
  ["manter_dimensoes_menores","Manter bordas e toques","KEEP_LOWER_DIMENSION_GEOMETRIES",false],
  ["ignorar_falhas","Ignorar feições com falha","SKIP_FAILURES",false],
  ["geometrias_preparadas","Geometrias preparadas","USE_PREPARED_GEOMETRIES",true],
  ["pretestar_continencia","Pré-testar continência","PRETEST_CONTAINMENT",false],
];
const state={bancadaEntradas:[],bancadaBases:[],catalog:[],categories:[],bases:[],staging:[],input:"",operation:"",
  opcoes:Object.fromEntries(OPCOES_OVERLAY.map(([chave,,,padrao])=>[chave,padrao])),
  nomeSaida:"",result:null,busy:false,uploading:false,loadingCatalog:false,catalogError:false,
  // Só no enriquecimento: configuração da entrada principal, entradas adicionais e finalidades.
  inputConfig:null,entradasExtras:[],finalidades:[]};
const map=criarMapa(()=>{reconciliarPainel();controls();}),results=criarResultados();
const config=criarConfiguracao(state,changed);
// A seção 2 confirma a composição real da bancada, independentemente de visibilidade.
const componentesEntrada=componentes;
const camadaEntrada=id=>state.bancadaEntradas.find(e=>e.id===id)?.layer||state.catalog.find(l=>l.id===id);
function idsDaComposicao(){
  return [...state.bancadaBases.map(b=>b.id),...entradasEnriquecimento()
    .filter(e=>e.principal||['enriquecimento','estatisticas'].includes(state.operation))
    .flatMap(e=>componentesEntrada(camadaEntrada(e.id)).map(l=>l.id))];
}
function bancadaCompleta(){
  const painel=map.camadas();if(!painel)return false;
  const presentes=new Set(painel.map(l=>l.id));
  return idsDaComposicao().every(id=>presentes.has(id));
}
function renderSelecao() {
  const host=$("#ea-run-selection");if(!host)return;
  const nome=id=>state.catalog.find(l=>l.id===id)?.nome||id;
  const presentes=new Set((map.camadas()||[]).map(l=>l.id));
  const entradas=entradasEnriquecimento().filter(e=>e.principal||['enriquecimento','estatisticas'].includes(state.operation))
    .flatMap(e=>componentesEntrada(camadaEntrada(e.id))).filter(l=>presentes.has(l.id));
  const entrada=entradas[0];
  const bases=state.bancadaBases.filter(b=>presentes.has(b.id));
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
  valor.textContent=entradas.map(e=>e.nome).join('; ');
  host.append(linha("Camadas de entrada:",valor,entrada?"":"nenhuma camada de entrada adicionada à bancada"));

  const grupos=state.categories
    .map(c=>({c,itens:bases.filter(b=>b.category===c.id)}))
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
  host.append(linha(`Camadas de base: (${bases.length})`,lista,
    bases.length?"":"nenhuma base adicionada à bancada; prepare e confirme as bases em 1.2"));
  const algoritmo=document.createElement('span');algoritmo.className='ea-execucao-valor';
  algoritmo.textContent=state.operation?$('#ea-operation').selectedOptions[0]?.textContent:'';
  host.append(linha('Algoritmo:',algoritmo,state.operation?'':'nenhum algoritmo selecionado em 1.3'));
  const saida=document.createElement('span');saida.className='ea-execucao-valor';
  saida.textContent=state.nomeSaida.trim()||(entrada?`Extração de ${state.bancadaEntradas[0]?.layer.nome} (automático)`:'Nome automático após adicionar a entrada');
  host.append(linha('Camada de saída:',saida));
  // Estimativa antes de executar: o que se sabe sem processar.
  if(['enriquecimento','estatisticas'].includes(state.operation)&&state.bancadaEntradas.length){
    const feicoes=entradasEnriquecimento().reduce((soma,item)=>{
      const camada=camadaEntrada(item.id);
      return soma+(camada?.geojson?.features?.length||0);
    },0);
    const recorte=state.operation==='enriquecimento'&&bases.some(b=>b.regra?.papel==="recorte");
    const todas=state.operation==='enriquecimento'?bases.filter(b=>b.regra?.multiplicidade==="todas").map(b=>nome(b.id)):[];
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
  return state.bancadaEntradas.map((e,i)=>({...e,principal:i===0}));
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
    const camada=camadaEntrada(entrada.id);
    const config=entrada.config;
    const campos=state.operation==='estatisticas'?camposCamada(camada):config?.campos||camposCamada(camada);
    for(const campo of campos)if(!itens.some(i=>i.campo===campo))itens.push({campo,rotulo:campo,grupo:`Entrada · ${nome(entrada.id)}`});
  }
  for(const base of state.bancadaBases){
    const camada=base.layer;
    const prefixo=base.regra?.prefixo?(base.regra.prefixo.endsWith("_")?base.regra.prefixo:base.regra.prefixo+"_"):prefixoPadrao(nome(base.id));
    const campos=state.operation==='estatisticas'?camposCamada(camada):base.regra?.campos||camposCamada(camada);
    const grupo=`Base · ${nome(base.id)}`;
    if(state.operation==='estatisticas'&&categoriaBinaria(state.categories.find(c=>c.id===base.category)))itens.push({campo:`${prefixo}intersecao`,rotulo:`${prefixo}intersecao · Sim / Não`,grupo});
    for(const campo of campos)itens.push({campo:prefixo+campo,rotulo:prefixo+campo,grupo});
    itens.push({campo:`${prefixo}n_feicoes`,rotulo:`${prefixo}n_feicoes · nº de feições tocadas`,grupo});
    if(state.operation!=='estatisticas'&&base.regra?.multiplicidade!=="resumo")itens.push({campo:`${prefixo}fid_base`,rotulo:`${prefixo}fid_base · feição escolhida`,grupo});
  }
  return itens;
}
// O que o processamento enxerga e o que esta no painel da bancada. Se o usuario
// remove uma camada la, ela sai das bases e da entrada aqui.
function reconciliarPainel() {
 const noPainel=map.camadas();if(!noPainel||state.busy)return;
 const presentes=new Set(noPainel.map(l=>l.id)),saiu=id=>map.exibida(id)&&!presentes.has(id);
 let alterou=false;
 state.bancadaEntradas=state.bancadaEntradas.filter(e=>{
  const l=e.layer;
  if(l.camadas_bancada){const removidas=l.camadas_bancada.filter(c=>saiu(c.id));for(const c of removidas)removerPrevia(state,{grupo:'entrada',entradaId:e.id,chaveOriginal:c.chave});const restantes=l.camadas_bancada.filter(c=>!saiu(c.id));
   if(restantes.length!==l.camadas_bancada.length){alterou=true;l.camadas_bancada=restantes;l.arquivo_local={...l.arquivo_local,camadas:restantes.map(c=>c.chave)};l.geojson={type:'FeatureCollection',features:restantes.flatMap(c=>c.geojson.features)};}
   return restantes.length>0;
  }
  if(saiu(e.id)){removerPrevia(state,{grupo:'entrada',entradaId:e.id});alterou=true;return false;}return true;
 });
 state.bancadaBases=state.bancadaBases.filter(b=>{if(saiu(b.id)){removerPrevia(state,{grupo:'base',id:b.id});alterou=true;return false;}return true;});
 if(alterou){invalidarResultado();config.render();syncMap();controls();}
}

function controls() {
  config.marcarLista();
  $("#ea-municipal-open").setAttribute("aria-disabled",String(state.busy));
  $("#ea-recover").disabled=state.busy;
  $('#ea-refresh').disabled=state.busy||state.uploading||state.loadingCatalog;
  const catalogStatus=$('#ea-catalog-status');
  catalogStatus.hidden=true;catalogStatus.textContent='';
  document.querySelectorAll("#ea-config input, #ea-config select, #ea-config button").forEach(node=>{if(state.busy)node.disabled=true;});
  $("#ea-run").disabled=state.busy||state.uploading||state.validatingBases||state.loadingMap||state.loadingCatalog||!disponivel("executar")||!state.operation||!state.bancadaEntradas.length||!state.bancadaBases.length||!bancadaCompleta();
  $("#ea-export").disabled=state.busy||!state.result||!disponivel("exportar");
  renderSelecao();
  renderFinalidades();
  const entrada=state.catalog.find(l=>l.id===state.input);
  const campoSaida=$("#ea-nome-saida");
  if(campoSaida){
    campoSaida.placeholder=entrada?`Extração de ${entrada.nome}`:"Extração de <camada de entrada>";
    campoSaida.disabled=state.busy;
  }
  const falta=[!state.operation&&"o algoritmo de processamento",!state.bancadaEntradas.length&&"a camada de entrada na bancada",
    !state.bancadaBases.length&&"as camadas base"].filter(Boolean);
  $("#ea-integration-status").textContent=state.busy?"Processando…"
    :state.loadingCatalog?"Carregando catálogo; a preparação na seção 1 continua disponível…"
    :state.loadingMap?"Carregando camadas no mapa…"
    :!disponivel("executar")?"Carregando catálogo…"
    :falta.length?`Falta selecionar ${falta.join(" e ")}.`
    :!bancadaCompleta()?'Aguardando a inclusão das camadas na bancada.':`Pronto para executar com as entradas e ${state.bancadaBases.length} base(s) presentes na bancada.`;
}
function syncMap() {
  const items=state.bancadaBases.map(base=>{
    const layer=base.layer,category=state.categories.find(c=>c.id===base.category);
    return {...layer,key:`base:${layer.id}`,grupo:category?.nome||base.category,papelExtracao:'base',arquivoGrupo:layer.arquivo_local?.nome||layer.arquivo||layer.nome,color:category?.color};
  });
  for(const entrada of state.bancadaEntradas)for(const layer of componentesEntrada(entrada.layer))items.push({...layer,key:`input:${layer.id}`,grupo:'Input',papelExtracao:'entrada',arquivoGrupo:entrada.layer.arquivo_local?.nome||entrada.layer.arquivo||layer.arquivo||entrada.layer.nome,color:'#d6542b'});
  if(state.result?.geojson) items.push({key:`resultado:${state.result.id}`,nome:"Geometria da extração",geojson:state.result.geojson,grupo:"Resultado",color:"#853eaf"});
  map.sync(items.filter(item=>item.geojson));
}
// Leitura de arquivo no servidor custa uma conexao ao banco remoto: fila curta.
const SIMULTANEAS=3, TENTATIVAS=3;
let mapVersion=0,assinaturaExecucao="";
function invalidarResultado(){
  if(!state.result)return;
  state.result=null;results.clear();
  feedback('A configuração mudou. Execute novamente para atualizar os resultados.');
}
// Assinatura do pedido sem os GeoJSON (podem ter dezenas de MB): ids e contagem de feições bastam.
function assinaturaDe(pedido){
  const leve=l=>l?{id:l.id,n:l.geojson?.features?.length}:l;
  return JSON.stringify({...pedido,input:leve(pedido.input),categorias:pedido.categorias.map(c=>({...c,camadas:c.camadas.map(leve)}))});
}
async function changed(painel) {
  const version=++mapVersion;
  const falhas=[];
  try{
    const assinatura=assinaturaDe(request());
    if(assinatura!==assinaturaExecucao){invalidarResultado();assinaturaExecucao=assinatura;}
    state.loadingMap=true;config.render();syncMap();controls();
    const selected=state.catalog.filter(l=>l.id===state.input||state.bases.some(b=>b.id===l.id)||state.staging.some(b=>b.id===l.id)
      ||state.entradasExtras.some(e=>e.id===l.id));
    const pendentes=selected.filter(l=>!l.geojson&&l.origem!=='local');
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
            l.carregamento??=chamar('carregarCamada',l).finally(()=>{delete l.carregamento;});
            l.geojson=await l.carregamento;delete l.erro;
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
            l.erro=error.message;falhas.push(`${l.nome}: ${error.message}`);
            painel?.etapa(`${l.nome}: ${error.message}`,'erro');
            break;
          }
        }
      }
    }
    await Promise.all(Array.from({length:Math.min(SIMULTANEAS,pendentes.length)},trabalhador));
    if(version===mapVersion){config.render();syncMap();}
    if(falhas.length&&version===mapVersion)feedback(`Não foi possível carregar ${falhas.length} camada(s): ${falhas.join(' · ')}`,'error');
  }catch(error){falhas.push(error.message);painel?.etapa(error.message,'erro');if(version===mapVersion)feedback(`Não foi possível carregar uma camada no mapa: ${error.message}`,'error');}
  finally{if(version===mapVersion){state.loadingMap=false;config.marcarLista();reconciliarPainel();controls();}}
  return falhas;
}
function busy(value) {
  state.busy=value;
  $("#ea-workbench-frame").inert=value;
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
// Recortes por finalidade: os campos são escolhidos numa lista, sem digitar nome de campo.
export function renderFinalidades() {
  const host=$("#ea-finalidades");if(!host)return;
  host.replaceChildren();
  host.hidden=!['enriquecimento','estatisticas'].includes(state.operation);
  if(host.hidden)return;
  host.append(criar("h4","Recortes por finalidade (opcional)","ea-op-params-title"));
  if(!state.finalidades.length)host.append(criar("p","Nenhum recorte. Use Adicionar finalidade para gerar no pacote camadas e tabelas só com os campos que interessam.","ea-hint"));
  for(const finalidade of state.finalidades){
    const linha=criar("div",undefined,"ea-execucao-linha");
    linha.append(criar("strong",finalidade.nome),criar("span",` · ${finalidade.campos.length} campo(s): ${finalidade.campos.slice(0,4).join(", ")}${finalidade.campos.length>4?"…":""} `));
    linha.append(botaoPequeno("Editar",async()=>{
      const nova=await editarFinalidade({...finalidade,disponiveis:camposPrevistos()});
      if(nova){Object.assign(finalidade,nova);changed();}
    }));
    linha.append(" ",botaoPequeno("Remover",()=>{
      state.finalidades=state.finalidades.filter(f=>f!==finalidade);changed();
    }));
    host.append(linha);
  }
  host.append(botaoPequeno("Adicionar finalidade",async()=>{
    const nova=await editarFinalidade({disponiveis:camposPrevistos()});
    if(nova){state.finalidades.push(nova);changed();}
  }));
}
// Os parametros do operador do OGR abrem abaixo do seletor e seguem no pedido.
function renderParametros() {
  // O desenho do algoritmo fica no subcard 1.3, ao lado do seletor.
  renderDiagrama($("#ea-algoritmo-desenho"),state.operation);
  const host=$("#ea-operation-params");if(!host)return;
  host.replaceChildren();
  // Sem algoritmo escolhido nao ha parametro que faca sentido mostrar.
  host.hidden=!['enriquecimento','estatisticas'].includes(state.operation);
  renderFinalidades();
  if(host.hidden)return;
  if(['enriquecimento','estatisticas'].includes(state.operation)){
    const titulo=document.createElement("h4");titulo.className="ea-op-params-title";titulo.textContent="Como as bases entram";
    const texto=document.createElement("p");texto.className="ea-hint";
    texto.textContent=state.operation==='estatisticas'?"Cada feição mantém sua geometria e seus atributos. Risco e Restrição recebem Sim/Não; nas outras bases, escolha a estatística padrão e personalize por campo no botão Regra abaixo. Sem interseção, os campos estatísticos ficam vazios.":"Configure a regra de cada base abaixo: papel (atributos ou unidade de recorte), ligação, multiplicidade, campos, prefixo, apelidos e buffer. Sem mexer, vale o padrão: por localização, feição de maior sobreposição, todos os campos.";
    host.append(titulo,texto);renderSelecao();
    return;
  }

}
function request() {
  return {motor:"gdal",operacao:state.operation,opcoes:{...state.opcoes},nome_saida:state.nomeSaida.trim(),input:state.bancadaEntradas[0]?.layer,categorias:state.categories.filter(c=>state.bancadaBases.some(b=>b.category===c.id)).map(c=>({id:c.id,nome:c.nome,camadas:state.bancadaBases.filter(b=>b.category===c.id).map(b=>b.layer),
    regras:['enriquecimento','estatisticas'].includes(state.operation)?Object.fromEntries(state.bancadaBases.filter(b=>b.category===c.id&&b.regra).map(b=>[b.id,b.regra])):{}})),
    ...(['enriquecimento','estatisticas'].includes(state.operation)?{
      entradas:state.bancadaEntradas.map(e=>({id:e.id,config:e.config||{}})),
      entradas_locais:Object.fromEntries(state.bancadaEntradas.slice(1).filter(e=>e.layer.arquivo_local).map(e=>[e.id,e.layer.arquivo_local])),
      finalidades:state.finalidades.map(f=>({nome:f.nome,campos:[...f.campos]}))}:{})};
}
$("#ea-run").addEventListener("click",async()=>{
  reconciliarPainel();
  if(state.busy||state.uploading||state.validatingBases||state.loadingMap||state.loadingCatalog||!state.operation||!state.bancadaEntradas.length||!state.bancadaBases.length) return;
  try{map.assertReady(idsDaComposicao());}catch(error){feedback(error.message,'error');return;}
  let pedido;
  try{pedido=request();}catch(error){feedback(error.message,'error');return;}
  const confirmado=await confirmarExecucao({
    entrada:pedido.input.nome,
    saida:pedido.nome_saida||`Extração de ${pedido.input.nome}`,
    operacao:$("#ea-operation").selectedOptions[0]?.textContent||pedido.operacao,
    totalCamadas:pedido.categorias.reduce((soma,c)=>soma+c.camadas.length,0),
    categorias:pedido.categorias,
  });
  if(!confirmado){feedback("Execução cancelada. Nada foi processado.");return;}
  reconciliarPainel();
  try{map.assertReady(idsDaComposicao());if(!state.bancadaEntradas.length||!state.bancadaBases.length||assinaturaDe(request())!==assinaturaDe(pedido))throw new Error('A composição da bancada mudou. Confira e execute novamente.');}catch(error){feedback(error.message,'error');return;}
  busy(true);state.result=null;results.clear();syncMap();
  const painel=acompanharExecucao();
  try {
    const value=validateResult(await chamar("executar",pedido,job=>painel.acompanhar(job)));
    state.result=value;results.set(value);syncMap();
    painel.concluir("Extração concluída. Os resultados estão na tela e o pacote de saída (.zip) está pronto para baixar.",
      ()=>$("#ea-results").scrollIntoView({behavior:"smooth",block:"start"}));

  } catch(error) {
    state.result=null;results.clear();syncMap();
    painel.falhar(error.message,error.name==='AbortError');

  }
  finally {busy(false);}
});
$("#ea-export").addEventListener("click",async()=>{
  if(!state.result||state.busy) return;
  busy(true);
  const processo=window.SLTFeedback.processo("Baixando pacote de saída");
  try {await chamar("exportar",{resultado_id:state.result.id});processo.concluir({message:"Download iniciado."});}
  catch(error) {processo.concluir({type:"error",message:`Não foi possível baixar: ${error.message}`});} finally {busy(false);}
});
async function carregarCatalogo(){
  if(state.loadingCatalog)return;
  state.loadingCatalog=true;state.catalogError=false;controls();
  try{
  const catalog=await chamar('listarCatalogo');
  const selecionadas=new Set([state.input,...state.bases.map(b=>b.id),...state.staging.map(b=>b.id),...state.entradasExtras.map(e=>e.id)]);
  state.catalog=[...catalog.camadas,...state.catalog.filter(l=>(l.origem==='local'||selecionadas.has(l.id))&&!catalog.camadas.some(c=>c.id===l.id))];
  const colors=['#1769aa','#52812e','#ad5b22','#8c4495','#217f83','#a34242','#58657a'];
  state.categories=catalog.categorias.map((c,i)=>({...c,color:colors[i%colors.length]}));
  state.bases=state.bases.filter(b=>state.catalog.some(l=>l.id===b.id)&&state.categories.some(c=>c.id===b.category));
  state.staging=state.staging.filter(b=>state.catalog.some(l=>l.id===b.id)&&state.categories.some(c=>c.id===b.category));
  if(!state.catalog.some(l=>l.id===state.input))state.input='';
  state.entradasExtras=state.entradasExtras.filter(e=>state.catalog.some(l=>l.id===e.id));
  config.render();syncMap();controls();
  }catch(error){state.catalogError=true;throw error;}
  finally{state.loadingCatalog=false;controls();}
}
window.addEventListener('extracao:integracao',async()=>{
  if(state.busy||state.loadingCatalog)return;
  const versaoInicial=mapVersion;
  try{
    await carregarCatalogo();
    const retorno=mapVersion===versaoInicial?restaurarRetornoMunicipal(state):null;
    if(retorno){
      if(!['enriquecimento','estatisticas'].includes(state.operation))state.operation='';
      $('#ea-operation').value=state.operation;$('#ea-nome-saida').value=state.nomeSaida;
      renderParametros();await changed();feedback(retorno);
    }
  }catch(error){feedback(`Não foi possível carregar o catálogo: ${error.message}`,'error');}
  abrirExtracaoDaUrl();
});
window.SICARDExtracao={atualizarControles:controls,conectar:conectarIntegracao,renderParametros,renderSelecao,renderFinalidades,changed};
renderParametros();
changed();
conectarIntegracao(adaptador);
document.getElementById('ea-refresh').addEventListener('click',async()=>{
  if(state.busy||state.uploading||state.loadingCatalog)return;
  try{await carregarCatalogo();await changed();feedback('Catálogo atualizado.');}catch(e){feedback(e.message,'error');}
});
document.getElementById('ea-recover').addEventListener('click',async()=>{
  let id;try{id=sessionStorage.getItem('slt-extracao-ultima');}catch{feedback('O navegador bloqueou a sessão local. Use Ver todas as extrações para recuperar sua análise.');return;}if(!id){feedback('Nenhuma execução salva nesta sessão do navegador.');return;}
  if(state.busy)return;busy(true);
  const painel=acompanharExecucao('Recuperando análise');
  try{const job=await json(`/extracao-atributos/execucoes/${id}`);state.result=validateResult(await esperar(job,id=>`/extracao-atributos/execucoes/${id}`,j=>painel.acompanhar(j)));results.set(state.result);syncMap();painel.concluir('Última análise recuperada.');}
  catch(e){painel.falhar(e.message);}finally{busy(false);}
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
  }catch(error){feedback(`Não foi possível abrir: ${error.message}`,'error');}finally{busy(false);}
}
const execucaoDaUrl=new URLSearchParams(location.search).get('execucao');
let execucaoAberta=false;
function abrirExtracaoDaUrl(){
  if(!execucaoDaUrl||execucaoAberta||state.busy)return;
  execucaoAberta=true;abrirExtracao(execucaoDaUrl);
}
abrirExtracaoDaUrl();
