// Um único contexto WebGL para todas as camadas da prévia.
const mapas=new WeakMap();
let sequencia=0;
export function camadaTiles(mapa,item,color){
 const L=window.L;
 let contexto=mapas.get(mapa);
 if(!contexto){
  const overlay=L.maplibreGL({interactive:false,style:{version:8,sources:{},layers:[]}}).addTo(mapa);
  contexto={gl:overlay.getMaplibreMap(),camadas:new Map()};mapas.set(mapa,contexto);
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
  gl.addLayer({id,source:id,'source-layer':'camada',type:'fill',filter:['==',['geometry-type'],'Polygon'],paint:{'fill-color':color,'fill-opacity':.18,'fill-outline-color':color}});
  gl.addLayer({id:ids[1],source:id,'source-layer':'camada',type:'line',filter:['==',['geometry-type'],'LineString'],paint:{'line-color':color,'line-width':3}});
  gl.addLayer({id:ids[2],source:id,'source-layer':'camada',type:'circle',filter:['==',['geometry-type'],'Point'],paint:{'circle-color':color,'circle-radius':5}});
 };
 const Camada=L.Layer.extend({
  onAdd(){ativa=true;camadas.set(id,this);if(gl.isStyleLoaded())montar();else gl.once('load',montar);},
  onRemove(){ativa=false;camadas.delete(id);gl.off('load',montar);for(const key of ids)if(gl.getLayer(key))gl.removeLayer(key);if(gl.getSource(id))gl.removeSource(id);},
  getBounds(){const b=item.bounds||item.metadados_local?.limites_wgs84;return b?L.latLngBounds([[b[1],b[0]],[b[3],b[2]]]):L.latLngBounds([]);}
 });
 return new Camada();
}
