// A prévia e a bancada têm estados independentes. Somente enviar() confirma a composição.
export const entradasPreparadas=s=>[...(s.input?[{id:s.input,config:s.inputConfig}]:[]),...s.entradasExtras];
export const componentes=l=>l?.camadas_bancada||(l?[l]:[]);
export const configuracaoDaCamada=(entry,layer,item)=>layer.camadas_bancada?entry.config?.camadas?.[item.chave]:entry.config;
export function entradasParaPrevia(s){
 return entradasPreparadas(s).flatMap(entry=>{
  const original=s.catalog.find(l=>l.id===entry.id);if(!original)return [];
  const partes=componentes(original).filter(l=>configuracaoDaCamada(entry,original,l)?.identificacao_confirmada);
  if(!partes.length)return [];
  return [{...entry,layer:original.camadas_bancada?{...original,camadas_bancada:partes}:original}];
 });
}
const copiar=l=>({...l,...(l.camadas_bancada?{camadas_bancada:[...l.camadas_bancada]}:{}),...(l.arquivo_local?{arquivo_local:{...l.arquivo_local}}:{})});
export function guardarPrevia(s){
 s.undoPrevia={input:s.input,inputConfig:structuredClone(s.inputConfig),entradasExtras:structuredClone(s.entradasExtras),bases:structuredClone(s.bases),staging:structuredClone(s.staging),previaLocal:s.previaLocal,
 camadas:entradasPreparadas(s).map(e=>s.catalog.find(l=>l.id===e.id)).filter(Boolean).map(copiar)};
}
export function desfazerPrevia(s){
 const u=s.undoPrevia;if(!u)return;
 Object.assign(s,{input:u.input,inputConfig:u.inputConfig,entradasExtras:u.entradasExtras,bases:u.bases,staging:u.staging,previaLocal:u.previaLocal});
 for(const l of u.camadas){const i=s.catalog.findIndex(c=>c.id===l.id);if(i<0)s.catalog.push(l);else s.catalog[i]=l;}
 s.undoPrevia=null;
}
export function removerPrevia(s,item){
 guardarPrevia(s);
 if(item.grupo==='base'){s.bases=s.bases.filter(b=>b.id!==item.id);s.staging=s.staging.filter(b=>b.id!==item.id);return;}
 const source=s.catalog.find(l=>l.id===item.entradaId);
 if(source?.camadas_bancada){
  source.camadas_importadas=source.camadas_importadas.filter(c=>c.chave!==item.chaveOriginal);
  source.camadas_bancada=source.camadas_bancada.filter(c=>c.chave!==item.chaveOriginal);
  if(source.arquivo_local)source.arquivo_local={...source.arquivo_local,camadas:source.camadas_bancada.map(c=>c.chave)};
  source.geojson={type:'FeatureCollection',features:source.camadas_bancada.flatMap(c=>c.geojson?.features||[])};
  if(source.camadas_importadas.length)return;
 }
 if(s.input===item.entradaId){const next=s.entradasExtras.shift();s.input=next?.id||'';s.inputConfig=next?.config||null;}
 else s.entradasExtras=s.entradasExtras.filter(e=>e.id!==item.entradaId);
 if(s.previaLocal)s.previaLocal=null;
}
export function enviarPrevia(s){
 const marcada=chave=>!s.previaVisiveis||s.previaVisiveis.has(chave);
 const entradas=entradasParaPrevia(s).flatMap(e=>{
  const original=e.layer;if(!original?.geojson||original.erro)return [];
  const partes=componentes(original).filter(l=>l.tipo!=='raster'&&!l.erro&&l.status_validacao!=='invalida'&&marcada(`entrada:${e.id}:${l.chave||l.id}`));
  if(!partes.length)return [];
  const layer=copiar(original);
  if(original.camadas_bancada){layer.camadas_bancada=partes;layer.geojson={type:'FeatureCollection',features:partes.flatMap(l=>l.geojson?.features||[])};if(layer.arquivo_local)layer.arquivo_local.camadas=partes.map(l=>l.chave);}
  return [{...e,config:structuredClone(e.config),layer}];
 });
 const prontas=[...s.bases,...s.staging].filter(b=>{const l=s.catalog.find(l=>l.id===b.id);return marcada(`base:${b.id}`)&&l?.geojson&&!l.erro&&l.tipo!=='raster'&&!entradas.some(e=>e.id===b.id);});
 s.bancadaEntradas=entradas;
 s.bancadaBases=prontas.map(b=>({...structuredClone(b),layer:copiar(s.catalog.find(l=>l.id===b.id))}));
 s.bases=prontas;s.staging=s.staging.filter(b=>!prontas.some(p=>p.id===b.id));
 return entradas.reduce((n,e)=>n+componentes(e.layer).length,0)+prontas.length;
}
export function limparPreparacao(s){
 const pendentes=entradasPreparadas(s).filter(e=>{const l=s.catalog.find(l=>l.id===e.id);return componentes(l).some(c=>!configuracaoDaCamada(e,l,c)?.identificacao_confirmada);});
 Object.assign(s,{input:'',inputConfig:null,entradasExtras:[],bases:[],staging:[],previaLocal:null,listaBases:null,undoPrevia:null,lastBase:null,editandoBases:false,previaVisiveis:new Set(),preparacaoConcluida:true});
 if(pendentes.length)Object.assign(s,{input:pendentes[0].id,inputConfig:pendentes[0].config,entradasExtras:pendentes.slice(1),preparacaoConcluida:false});
}
