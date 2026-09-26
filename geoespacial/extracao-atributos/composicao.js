import {componentes} from './preparacao.js';

// A visibilidade da bancada decide o pedido; a prévia não participa da execução.
export function composicaoVisivel(state, painel=[]){
 const visiveis=new Set((painel||[]).filter(l=>l.visivel===true).map(l=>l.id));
 const entradas=[],camadas=[];
 for(const entry of state.bancadaEntradas){
  const partes=componentes(entry.layer).filter(l=>visiveis.has(l.id)&&l.tipo!=='raster');
  if(!partes.length)continue;
  const config=structuredClone(entry.config||{}),layer={...entry.layer};
  const configurar=c=>({...c,processar:true,operacao:state.operation,camada_recorte:state.camadaRecorte||null});
  if(layer.camadas_bancada){
   config.camadas=Object.fromEntries(partes.map(l=>[l.chave,configurar(config.camadas?.[l.chave]||config)]));
   layer.camadas_bancada=partes;
   layer.geojson={type:'FeatureCollection',features:partes.flatMap(l=>l.geojson?.features||[])};
   if(layer.arquivo_local)layer.arquivo_local={...layer.arquivo_local,camadas:partes.map(l=>l.chave)};
  }
  const ajustada={...entry,layer,config:configurar(config)};
  entradas.push(ajustada);
  for(const l of partes)camadas.push({layer:l,config:layer.camadas_bancada?ajustada.config.camadas[l.chave]:ajustada.config});
 }
 const bases=state.bancadaBases.filter(b=>visiveis.has(b.id));
 return {entradas,camadas,bases,ids:[...camadas.map(c=>c.layer.id),...bases.map(b=>b.id)]};
}

export function validarComposicao(state,comp){
 if(!state.operation)throw new Error('Escolha o algoritmo em 1.3.');
 if(!comp.camadas.length)throw new Error('Marque uma camada de demanda no painel da bancada.');
 if(!comp.bases.length)throw new Error('Marque ao menos uma camada base no painel da bancada.');
 if(!state.executarEmLote&&comp.camadas.length>1)throw new Error('Para execução individual, deixe apenas uma camada de demanda marcada na bancada ou selecione “Em lote”.');
 for(const e of comp.camadas)if(!e.config.identificacao_confirmada)throw new Error(`Confirme o ID de ${e.layer.nome} em 1.1.`);
 if(state.operation==='enriquecimento'&&!comp.bases.some(b=>b.id===state.camadaRecorte))throw new Error('Escolha uma base de recorte presente e marcada na bancada.');
}

export function pedidoDaComposicao(state,comp){
 return {motor:'gdal',operacao:state.operation,opcoes:{...state.opcoes},nome_saida:state.nomeSaida.trim(),input:comp.entradas[0]?.layer,
  categorias:state.categories.filter(c=>comp.bases.some(b=>b.category===c.id)).map(c=>({id:c.id,nome:c.nome,
   camadas:comp.bases.filter(b=>b.category===c.id).map(b=>b.layer),
   regras:Object.fromEntries(comp.bases.filter(b=>b.category===c.id&&b.regra).map(b=>[b.id,b.regra]))})),
  entradas:comp.entradas.map(e=>({id:e.id,nome:e.layer.nome,config:e.config})),
  entradas_locais:Object.fromEntries(comp.entradas.slice(1).filter(e=>e.layer.arquivo_local).map(e=>[e.id,e.layer.arquivo_local])),
  finalidades:state.finalidades.map(f=>({nome:f.nome,campos:[...f.campos]}))};
}
