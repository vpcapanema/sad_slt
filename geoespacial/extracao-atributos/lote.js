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
 const entries=entradas(state),host=document.getElementById('ea-identificacao');host.hidden=!entries.length;
 const rows=document.getElementById('ea-identificacao-camadas');rows.replaceChildren();
 const params=document.getElementById('ea-lote-parametros');params.replaceChildren();
 for(const {layer,config} of entries){
  const info=inspecao(layer);if(info.total>0&&!config.campo_id)config.campo_id=info.sugestao;
  const row=clone('ea-tpl-identificacao'),q=k=>row.querySelector(`[data-id="${k}"]`);
  q('nome').textContent=layer.nome;
  const types=layer.metadados_local?.tipos_geometria||[...new Set((layer.geojson?.features||[]).map(f=>f.geometry?.type))];
  q('geometria').textContent=`${types.join(', ')} · ${layer.metadados_local?.feicoes??info.total} feições`;
  q('fid').textContent=info.fid_nativo||info.campos.find(c=>c.id_feicao)?.nome||'Identificador posicional preservado';
  q('campo').append(new Option('Uma demanda por feição','__feicao__'));
  q('categoria').append(new Option('Sem agrupamento por categoria',''));
  for(const c of info.campos){q('campo').append(new Option(`${c.nome}${c.nome===info.sugestao?' (sugestão)':''}`,c.nome));q('categoria').append(new Option(c.nome,c.nome));}
  if(!info.total){q('campo').prepend(new Option('Aguardando inspeção',''));q('campo').disabled=true;q('confirmar').disabled=true;}
  q('campo').value=config.campo_id||'';q('categoria').value=config.categoria_pontos||'';
  q('categoria').disabled=!types.some(t=>/Point/.test(t));
  q('processar').checked=config.processar!==false;q('confirmar').checked=!!config.identificacao_confirmada;
  const selected=info.campos.find(c=>c.nome===config.campo_id);
  q('inspecao').textContent=selected?`${info.completa?'Camada completa':'Prévia; validação integral na execução'}: ${selected.distintos} valores distintos; ${selected.repetidos} repetições; ${selected.nulos} vazios. Amostra: ${selected.amostra.join(' · ')}`:'Cada feição será uma demanda independente.';
  for(const [control,key] of [['campo','campo_id'],['categoria','categoria_pontos'],['processar','processar'],['confirmar','identificacao_confirmada']])q(control).onchange=()=>{
   config[key]=q(control).type==='checkbox'?q(control).checked:q(control).value||null;
   if(control==='campo')config.identificacao_confirmada=false;
   changed();
  };
  rows.append(row);
  if(config.processar===false)continue;
  const p=clone('ea-tpl-lote-parametro'),f=k=>p.querySelector(`[data-id="${k}"]`);
  f('nome').textContent=layer.nome;f('identificacao').textContent=`${config.campo_id==='__feicao__'?'Uma demanda por feição':config.campo_id}${config.identificacao_confirmada?'':' · confirmar em 1.1'}`;
  f('operacao').value=config.operacao||'';
  const bases=[...new Map([...state.bancadaBases,...state.bases,...state.staging].map(b=>[b.id,b])).values()];
  for(const b of bases)f('recorte').append(new Option(b.layer?.nome||state.catalog.find(l=>l.id===b.id)?.nome||b.id,b.id));
  f('recorte').value=config.camada_recorte||'';f('recorte').disabled=(config.operacao||state.operation)!=='enriquecimento';
  f('saida').value=config.nome_saida||'';f('saida').placeholder=layer.nome;
  for(const [control,key] of [['operacao','operacao'],['recorte','camada_recorte'],['saida','nome_saida']])f(control).onchange=()=>{config[key]=f(control).value;changed();};
  params.append(p);
 }
 const selected=new Set(state.bancadaBases.map(b=>b.category));
 const auto=state.categories.filter(c=>selected.has(c.id)&&/risco|restri/i.test(c.nome)).map(c=>/restri/i.test(c.nome)?'restricao':'risco');
 document.getElementById('ea-campos-automaticos').textContent=`Saída: atributos da demanda + atributos das bases + identificadores e correspondências.${auto.length?' Campos automáticos: '+auto.join(', ')+' (0: sem correspondência; 1: com correspondência).':''}`;
}
export function validarLote(state){
 const all=entradas(state,true).filter(e=>e.config.processar!==false);
 if(!all.length)throw new Error('Selecione ao menos uma camada de demanda em 1.1.');
 for(const e of all){
  if(!e.config.identificacao_confirmada)throw new Error(`Confirme o identificador de ${e.layer.nome} na seção 1.1.`);
  if((e.config.operacao||state.operation)==='enriquecimento'&&!e.config.camada_recorte)throw new Error(`Escolha a base de recorte de ${e.layer.nome} na seção 1.3.`);
 }
}
