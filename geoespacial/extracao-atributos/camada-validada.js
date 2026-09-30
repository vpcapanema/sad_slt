import {base,post,json} from './api.js';

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

export async function validarEntradaLocal(arquivo){
 if(!arquivo?.conteudo_base64)throw new Error('O arquivo original não está disponível. Carregue a entrada novamente.');
 const bytes=Uint8Array.from(atob(arquivo.conteudo_base64),c=>c.charCodeAt(0));
 let job=await json(`/extracao-atributos/entrada-local/jobs?original=true&nome=${encodeURIComponent(arquivo.nome)}`,{method:'POST',headers:{'Content-Type':'application/octet-stream'},body:bytes});
 while(!['concluido','erro','cancelado'].includes(job.status)){
  await new Promise(resolve=>setTimeout(resolve,350));
  job=await json(`/extracao-atributos/entrada-local/jobs/${job.id}`);
 }
 if(job.status!=='concluido')throw new Error(job.erro||'A validação da entrada não foi concluída.');
 return job.resultado.camadas.map(descritorOriginal);
}
