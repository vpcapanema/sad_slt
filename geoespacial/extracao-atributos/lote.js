import {camposCamada} from './ui.js';
import {componentes,camadaPronta,entradaConfirmada} from './preparacao.js';

function entradas(state,confirmadas=false){
 const preparadas=[...(state.input?[{id:state.input,config:state.inputConfig}]:[]),...state.entradasExtras];
 const usarPrevia=!confirmadas&&preparadas.length>0;
 const refs=usarPrevia?preparadas:state.bancadaEntradas;
 return refs.flatMap(e=>{
  // O snapshot confirmado pode conter apenas parte das camadas do arquivo.
  const layer=e.layer||state.catalog.find(l=>l.id===e.id);
  if(!layer)return [];
  const config=e.config||={};
  if(usarPrevia&&e.id===state.input)state.inputConfig=config;
  return componentes(layer).filter(l=>l.tipo!=='raster').map(l=>{
   const cfg=layer.camadas_bancada?((config.camadas||={})[l.chave]||={}):config;
   return {layer:l,origem:layer,config:cfg};
  });
 });
}
function inspecao(layer){
 const meta=layer.metadados_local?.identificacao;

 const features=layer.geojson?.features||[];
 const fields=camposCamada(layer).map(nome=>{
  const vals=features.map(f=>f.properties?.[nome]).filter(v=>v!=null&&String(v).trim());
  const distintos=new Set(vals.map(String)).size;
  return {nome,preenchidos:vals.length,nulos:features.length-vals.length,distintos,repetidos:vals.length-distintos,amostra:vals.slice(0,4),id_feicao:/^(fid|object_?id|ogc_fid|oid)$/i.test(nome),candidato_demanda:/demanda|projeto|codigo|cod_|^id$/i.test(nome)};
 });
 const catalogo=new Map(fields.map(c=>[c.nome,c]));
 for(const c of meta?.campos||[])catalogo.set(c.nome,{...catalogo.get(c.nome),...c});
 const campos=[...catalogo.values()];
 return {campos,total:meta?.total??(layer.geojson?features.length:layer.feicoes??0),completa:meta?.completa??(layer.metadados_local?.previa?.metodo==='original'),sugestao:meta?.sugestao||campos.find(c=>c.candidato_demanda&&!c.id_feicao&&!c.nulos)?.nome||'__feicao__'};
}
export function avaliarIdentificacao(layer,config){
 const info=inspecao(layer);
 if(layer.erro)return {info,erro:`Falha na leitura: ${layer.erro}`};
 if(!layer.geojson&&!layer.metadados_local?.identificacao)return {info,erro:'Leitura da camada em andamento.',aguardando:true};
 if(!info.total)return {info,erro:'Camada sem feições. Remova-a ou selecione uma camada com dados.'};
 if(!config.campo_id)config.campo_id=info.campos.some(c=>c.nome===info.sugestao)?info.sugestao:'__feicao__';
 if(config.campo_id==='__feicao__')return {info,erro:''};
 const campo=info.campos.find(c=>c.nome===config.campo_id);
 if(!campo)return {info,erro:`O campo “${config.campo_id}” não existe nesta camada. Escolha outro ID.`};
 if(info.completa&&campo.nulos>0)return {info,erro:`“${campo.nome}” tem ${campo.nulos} registro(s) sem ID. Escolha um campo preenchido ou “ID da feição”.`};
 return {info,erro:''};
}
// Valida o lote inteiro antes de alterar qualquer confirmação ou descritor.
export async function validarEntradas(entries,validadores,aoEtapa=()=>{}){
 const locais=new Map(),resultados=[];
 for(const entry of entries){
  aoEtapa(entry.layer.nome||entry.layer.id);
  const origem=entry.origem||entry.layer;
  let layer;
  if(origem.arquivo_local){
   if(!locais.has(origem))locais.set(origem,await validadores.validarEntradaLocal(origem.arquivo_local));
   layer=locais.get(origem).find(l=>l.chave===entry.layer.chave);
  }else layer=await validadores.validarCamada(origem);
  if(!camadaPronta(layer)||!layer.revisao||!layer.feicoes)throw new Error(`${entry.layer.nome}: a camada não foi validada para a prévia.`);
  const config={...entry.config},avaliacao=avaliarIdentificacao(layer,config);
  if(avaliacao.erro)throw new Error(`${entry.layer.nome}: ${avaliacao.erro}`);
  resultados.push({entry,layer,config});
 }
 for(const {entry,layer,config} of resultados){
  const {id,chave}=entry.layer;
  Object.assign(entry.layer,layer,{id,...(chave?{chave}:{})});
  delete entry.layer.geojson;delete entry.layer.geojson_resumido;
  Object.assign(entry.config,config,{identificacao_confirmada:true,validacao_previa:layer.revisao});
 }
}
const selecoesIdentificacao=new WeakMap();
function clone(id){return document.getElementById(id).content.firstElementChild.cloneNode(true);}
export function renderLote(state,changed){
 const entries=state.input||state.entradasExtras.length?entradas(state):[],host=document.getElementById('ea-identificacao');host.hidden=!entries.length||entries.every(e=>entradaConfirmada(e.layer,e.config));
 const rows=document.getElementById('ea-identificacao-camadas');rows.replaceChildren();
 const pendencias=[];
 let selecionadas=selecoesIdentificacao.get(state);if(!selecionadas){selecionadas=new Set();selecoesIdentificacao.set(state,selecionadas);}
 const ids=new Set(entries.map(e=>e.layer.id));for(const id of selecionadas)if(!ids.has(id))selecionadas.delete(id);
 for(const {layer,config} of entries){
  const {info,erro,aguardando}=avaliarIdentificacao(layer,config);
  if(erro)pendencias.push(`${layer.nome}: ${erro}`);
  const row=clone('ea-tpl-identificacao'),campo=row.querySelector('[data-id="campo"]');
  row.querySelector('[data-id="nome"]').textContent=layer.nome;
  const selecionar=row.querySelector('[data-id="selecionar"]');
  selecionar.setAttribute('aria-label',`Selecionar camada: ${layer.nome}`);selecionar.checked=selecionadas.has(layer.id);selecionar.disabled=state.busy||state.uploading;
  selecionar.onchange=()=>{if(selecionar.checked)selecionadas.add(layer.id);else selecionadas.delete(layer.id);};
  const status=row.querySelector('[data-id="status"]');status.textContent=erro;status.hidden=!erro;
  const categoria=row.querySelector('[data-id="categoria"]');
  categoria.append(new Option('Sem categorização',''));
  for(const c of info.campos)categoria.append(new Option(c.nome,c.nome));
  config.categoria_demanda ??= config.categoria_pontos || null;
  delete config.categoria_pontos;
  categoria.value=config.categoria_demanda||'';categoria.disabled=state.busy||!info.total;
  categoria.onchange=()=>{config.categoria_demanda=categoria.value||null;config.identificacao_confirmada=false;changed();};
  campo.append(new Option('ID da feição · uma demanda por feição','__feicao__'));
  for(const c of info.campos)campo.append(new Option(`${c.nome}${c.nome===info.sugestao?' (sugestão)':''}`,c.nome));
  if(aguardando||!info.total||layer.erro){campo.prepend(new Option(aguardando?'Aguardando leitura da camada':'Camada indisponível',''));campo.disabled=true;}
  campo.disabled ||= state.busy;
  campo.value=config.campo_id||'';
  campo.setAttribute('aria-invalid',String(Boolean(erro&&!aguardando)));
  campo.title=erro;
  campo.onchange=()=>{config.campo_id=campo.value||null;config.identificacao_confirmada=false;changed();};
  rows.append(row);
 }
 const pronta=entries.length>0&&!pendencias.length;
 const confirm=document.getElementById('ea-identificacao-confirmar');
 const confirmed=entries.length>0&&entries.every(e=>entradaConfirmada(e.layer,e.config));
 confirm.disabled=state.busy||!pronta||confirmed;
 document.getElementById('ea-identificacao-status').textContent=!pronta?pendencias.join(' '):confirmed?'Configuração confirmada. Camadas disponíveis na prévia.':'Confira os IDs e as categorias. Confirme para enviar à prévia.';
 confirm.onclick=async()=>{
  if(!pronta||state.busy)return;
  state.busy=true;window.SICARDExtracao?.ocupar?.(true);renderLote(state,changed);
  const proc=window.ProcessFeedback.iniciarCadastro({title:'Validar camadas de entrada',subtitle:`${entries.length} camada(s)`,tasks:[...entries.map(e=>e.layer.nome||e.layer.id),'Preparar a prévia']});
  try{
   const validadores=await import('./camada-validada.js');
   await validarEntradas(entries,validadores,nome=>proc.tarefaAtual(nome,'Lendo e validando o dado original.'));
   for(const e of entries)proc.concluirTarefa(e.layer.nome||e.layer.id,`${e.layer.feicoes} feição(ões)`);
   proc.tarefaAtual('Preparar a prévia','Disponibilizando as camadas validadas no mapa.');
   const erros=await changed();
   if(erros?.length)throw new Error(erros.join('; '));
   host.hidden=true;
   proc.concluirTarefa('Preparar a prévia','Camadas no mapa');
   proc.sucesso({title:'Entradas validadas',message:'Camadas validadas e disponibilizadas na prévia.'});
  }catch(error){
   for(const e of entries){e.config.identificacao_confirmada=false;delete e.config.validacao_previa;}
   await changed();
   proc.erro({message:error.message});
  }finally{state.busy=false;window.SICARDExtracao?.ocupar?.(false);renderLote(state,changed);}
 };
}
export function validarLote(state){
 const all=entradas(state,true).filter(e=>e.config.processar!==false);
 if(!all.length)throw new Error('Selecione ao menos uma camada de demanda em 1.1.');
 for(const e of all){
  if(!e.config.identificacao_confirmada)throw new Error(`Confirme o identificador de ${e.layer.nome} na seção 1.1.`);
  if((e.config.operacao||state.operation)==='enriquecimento'&&!e.config.camada_recorte)throw new Error(`Escolha a base de recorte de ${e.layer.nome} na seção 1.3.`);
 }
}
