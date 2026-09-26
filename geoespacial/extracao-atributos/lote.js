import {camposCamada} from './ui.js';
import {componentes} from './preparacao.js';

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
   return {layer:l,config:cfg};
  });
 });
}
function inspecao(layer){
 const meta=layer.metadados_local?.identificacao;
 if(meta)return meta;
 const features=layer.geojson?.features||[];
 const fields=camposCamada(layer).map(nome=>{
  const vals=features.map(f=>f.properties?.[nome]).filter(v=>v!=null&&String(v).trim());
  const distintos=new Set(vals.map(String)).size;
  return {nome,preenchidos:vals.length,nulos:features.length-vals.length,distintos,repetidos:vals.length-distintos,amostra:vals.slice(0,4),id_feicao:/^(fid|object_?id|ogc_fid|oid)$/i.test(nome),candidato_demanda:/demanda|projeto|codigo|cod_|^id$/i.test(nome)};
 });
 return {campos:fields,total:features.length,completa:layer.metadados_local?.previa?.metodo==='original',sugestao:fields.find(c=>c.candidato_demanda&&!c.id_feicao&&!c.nulos)?.nome||'__feicao__'};
}
function clone(id){return document.getElementById(id).content.firstElementChild.cloneNode(true);}
export function renderLote(state,changed){
 const entries=state.input||state.entradasExtras.length?entradas(state):[],host=document.getElementById('ea-identificacao');host.hidden=!entries.length;
 const rows=document.getElementById('ea-identificacao-camadas');rows.replaceChildren();
 let pronta=entries.length>0;
 for(const {layer,config} of entries){
  const info=inspecao(layer);if(info.total>0&&!config.campo_id)config.campo_id=info.sugestao;
  const row=clone('ea-tpl-identificacao'),campo=row.querySelector('[data-id="campo"]');
  row.querySelector('[data-id="nome"]').textContent=layer.nome;
  const categoria=row.querySelector('[data-id="categoria"]');
  categoria.append(new Option('Sem categorização',''));
  for(const c of info.campos)categoria.append(new Option(c.nome,c.nome));
  config.categoria_demanda ??= config.categoria_pontos || null;
  delete config.categoria_pontos;
  categoria.value=config.categoria_demanda||'';categoria.disabled=!info.total;
  categoria.onchange=()=>{config.categoria_demanda=categoria.value||null;config.identificacao_confirmada=false;changed();};
  campo.append(new Option('ID da feição · uma demanda por feição','__feicao__'));
  for(const c of info.campos)campo.append(new Option(`${c.nome}${c.nome===info.sugestao?' (sugestão)':''}`,c.nome));
  if(!info.total){campo.prepend(new Option('Aguardando leitura da camada',''));campo.disabled=true;}
  campo.value=config.campo_id||'';
  const selected=info.campos.find(c=>c.nome===config.campo_id);
  if(!info.total||!config.campo_id||(info.completa&&selected?.nulos))pronta=false;
  campo.onchange=()=>{config.campo_id=campo.value||null;config.identificacao_confirmada=false;changed();};
  rows.append(row);
 }
 const confirm=document.getElementById('ea-identificacao-confirmar');
 const confirmed=entries.length>0&&entries.every(e=>e.config.identificacao_confirmada);
 confirm.disabled=state.busy||!pronta||confirmed;
 document.getElementById('ea-identificacao-status').textContent=confirmed?'Configuração confirmada. Camadas disponíveis na prévia.':pronta?'Confira os IDs e as categorias. Confirme para enviar à prévia.':'Aguarde a leitura e escolha um ID preenchido em todas as feições.';
 confirm.onclick=()=>{for(const e of entries)e.config.identificacao_confirmada=true;changed();};
}
export function validarLote(state){
 const all=entradas(state,true).filter(e=>e.config.processar!==false);
 if(!all.length)throw new Error('Selecione ao menos uma camada de demanda em 1.1.');
 for(const e of all){
  if(!e.config.identificacao_confirmada)throw new Error(`Confirme o identificador de ${e.layer.nome} na seção 1.1.`);
  if((e.config.operacao||state.operation)==='enriquecimento'&&!e.config.camada_recorte)throw new Error(`Escolha a base de recorte de ${e.layer.nome} na seção 1.3.`);
 }
}
