import {base,post} from './api.js';

export function descritorOriginal(layer){
 delete layer.geojson;delete layer.geojson_resumido;
 if(layer.tiles_token)layer.tiles_url=`${location.origin}${base}/extracao-atributos/previa-tiles/${encodeURIComponent(layer.tiles_token)}/{z}/{x}/{y}.pbf`;
 return layer;
}
export async function validarCamada(ref){
 const layer=descritorOriginal(await post('/extracao-atributos/preparar-camada',{id:ref.id,arquivo:ref.arquivo||undefined}));
 if(layer.status_validacao!=='valida'||!layer.tiles_url||!layer.feicoes)throw new Error('A camada não foi validada para a prévia.');
 return layer;
}
