import { feedback } from './ui.js';
const prefix=location.pathname.includes('/sicard/')?'/sicard':'';
export const base=`${prefix}/api/geoespacial`;
export async function json(path,options={}) {
  const response=await fetch(base+path,options),data=await response.json();
  if(!response.ok)throw new Error(typeof data.detail==='string'?data.detail:'Não foi possível concluir a solicitação. Confira os campos e sua sessão.');
  return data;
}
export const post=(path,body)=>json(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
export async function esperar(job,statusPath) {
  while(job.status==='executando'||job.status==='pendente') {
    feedback(job.etapa||job.etapa_atual||'Processando…');
    await new Promise(resolve=>setTimeout(resolve,1200));job=await json(statusPath(job.id));
  }
  if(job.status!=='concluido')throw new Error(job.erro||'O processamento não foi concluído.');
  return job.resultado;
}
export const adaptador={
  listarCatalogo:()=>json('/extracao-atributos/catalogo'),
  async carregarCamada(layer){
    if(!layer.arquivo)throw new Error('Selecione o arquivo no storage para visualizar a camada.');
    const file=await post('/extracao-atributos/arquivo-mapa',{arquivo:layer.arquivo});
    Object.assign(layer,file);return file.geojson;
  },
  async executar(request) {
    const job=await post('/extracao-atributos/execucoes',{input_id:request.input.id,operacao:request.operacao,
      categorias:request.categorias.map(c=>({id:c.id,camadas:c.camadas.map(l=>l.id)}))});
    sessionStorage.setItem('slt-extracao-ultima',job.id);
    return esperar(job,id=>`/extracao-atributos/execucoes/${id}`);
  },
  async exportar({resultado_id,formato}) {
    const response=await fetch(`${base}/extracao-atributos/execucoes/${encodeURIComponent(resultado_id)}/exportar/${formato}`);
    if(!response.ok){const data=await response.json();throw new Error(data.detail||'Falha ao exportar.');}
    const url=URL.createObjectURL(await response.blob()),link=document.createElement('a');
    link.href=url;link.download=`extracao-${resultado_id}.${formato}`;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
  },
};
