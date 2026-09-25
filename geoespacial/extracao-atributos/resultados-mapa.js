import {clone} from './resultados-dom.js';
export function desenharMapa(container, features, selecionar) {
  if (!window.L) return {destroy(){}, focus(){}};
  const map=window.L.map(container,{scrollWheelZoom:false});
  window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap contributors',maxZoom:19}).addTo(map);
  const byKey=new Map(), color=feature=>feature.properties.papel==='area'?(feature.properties.categoria==='risco'?'#6a4791':'#ac7421'):'#176b95';
  const drawing=window.L.geoJSON({type:'FeatureCollection',features}, {
    style:feature=>({color:color(feature),weight:2,fillOpacity:.12}),
    pointToLayer:(feature,latlng)=>window.L.circleMarker(latlng,{radius:7,color:color(feature),fillOpacity:.7}),
    onEachFeature:(feature,layer)=>{
      const key=feature.properties.chave;
      if(!byKey.has(key))byKey.set(key,[]);byKey.get(key).push(layer);
      const tooltip=clone('ea-tpl-tooltip');tooltip.textContent=feature.properties.rotulo||key;
      layer.bindTooltip(tooltip);layer.on('click',()=>{selecionar(key);focus(key);});
    },
  }).addTo(map);
  if(drawing.getBounds().isValid())map.fitBounds(drawing.getBounds(),{maxZoom:14,padding:[20,20]});
  else map.setView([-15,-47],4);
  function focus(key){
    const group=byKey.get(key);if(!group?.length)return;
    const bounds=window.L.featureGroup(group).getBounds();
    if(bounds.isValid())map.fitBounds(bounds,{maxZoom:15,padding:[20,20]});
    for(const [id,layers] of byKey)for(const layer of layers)layer.setStyle?.({weight:id===key?5:2});
  }
  const timer=setTimeout(()=>map.invalidateSize(),0);
  return {focus,destroy(){clearTimeout(timer);map.remove();}};
}
