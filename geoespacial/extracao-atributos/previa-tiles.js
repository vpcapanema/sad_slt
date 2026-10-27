// Um único contexto WebGL para todas as camadas da prévia.
import '/assets/js/favorabilidade-simbologia.js?v=20261027-simbologia-compartilhada';
const mapas=new WeakMap();
let sequencia=0;
// Superfícies de favorabilidade nascem com a simbologia temática, sem estilo genérico.
function pinturaFavorabilidade(gl,ids,item){
 const FS=globalThis.FavorabilidadeSimbologia,config=FS?.identificar(item);
 if(!config)return null;
 const alvo={id:item.id,arquivo:config.arquivo,campo:config.campo,revisao:item.revisao};
 const pintura=classificacao=>{
  const cor=FS.expressaoCor(config,config.classe?null:classificacao);
  return {fill:{'fill-color':cor,...FS.PREENCHIMENTO},line:{'line-color':cor,'line-width':3},point:{'circle-color':cor,'circle-radius':5}};
 };
 if(!config.classe&&!FS.classificacaoEmCache(alvo))FS.obterClassificacao(alvo,{cache:true}).then(classificacao=>{
  const p=pintura(classificacao);
  [p.fill,p.line,p.point].forEach((paint,i)=>{if(gl.getLayer(ids[i]))for(const [nome,valor] of Object.entries(paint))gl.setPaintProperty(ids[i],nome,valor);});
 }).catch(erro=>console.warn(`Contraste Jenks indisponível para ${item.nome||item.id}; mantida a rampa contínua 0–1.`,erro));
 return pintura(config.classe?null:FS.classificacaoEmCache(alvo));
}
export function camadaTiles(mapa,item,color){
 const L=window.L;
 let contexto=mapas.get(mapa);
 if(!contexto){
  const overlay=L.maplibreGL({pane:'overlayPane',interactive:false,style:{version:8,sources:{},layers:[]}}).addTo(mapa);
  const gl=overlay.getMaplibreMap();
  contexto={gl,camadas:new Map(),pendentes:new Set(),pronto:gl.isStyleLoaded()};mapas.set(mapa,contexto);
  gl.once('load',()=>{contexto.pronto=true;for(const montar of contexto.pendentes)montar();contexto.pendentes.clear();});
  mapa.on('click',event=>{
   const {gl,camadas}=contexto;
   const point=gl.project([event.latlng.lng,event.latlng.lat]);
   const feature=gl.queryRenderedFeatures(point).find(f=>camadas.has(f.source));
   if(feature)camadas.get(feature.source).fire('click');
  });
 }
 const {gl,camadas}=contexto,id=`previa-original-${++sequencia}`,ids=[id,id+'-line',id+'-point'];
 let ativa=false;
 const montar=()=>{
  if(!ativa||gl.getSource(id))return;
  gl.addSource(id,{type:'vector',tiles:[item.tiles_url],minzoom:0,maxzoom:22});
  const tematica=pinturaFavorabilidade(gl,ids,item);
  gl.addLayer({id,source:id,'source-layer':'camada',type:'fill',filter:['==',['geometry-type'],'Polygon'],paint:tematica?.fill||{'fill-color':color,'fill-opacity':.18,'fill-outline-color':color}});
  gl.addLayer({id:ids[1],source:id,'source-layer':'camada',type:'line',filter:['==',['geometry-type'],'LineString'],paint:tematica?.line||{'line-color':color,'line-width':3}});
  gl.addLayer({id:ids[2],source:id,'source-layer':'camada',type:'circle',filter:['==',['geometry-type'],'Point'],paint:tematica?.point||{'circle-color':color,'circle-radius':5}});
 };
 const Camada=L.Layer.extend({
  onAdd(){ativa=true;camadas.set(id,this);if(contexto.pronto)montar();else contexto.pendentes.add(montar);},
  onRemove(){ativa=false;camadas.delete(id);contexto.pendentes.delete(montar);for(const key of ids)if(gl.getLayer(key))gl.removeLayer(key);if(gl.getSource(id))gl.removeSource(id);},
  getBounds(){const b=item.bounds||item.metadados_local?.limites_wgs84;return b?L.latLngBounds([[b[1],b[0]],[b[3],b[2]]]):L.latLngBounds([]);}
 });
 return new Camada();
}
