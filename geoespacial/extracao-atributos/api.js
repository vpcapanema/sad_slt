import { feedback } from './ui.js';
const prefix=location.pathname.includes('/sicard/')?'/sicard':'';
export const base=`${prefix}/api/geoespacial`;
export async function json(path,options={}) {
  let response;
  try {
    response=await fetch(base+path,{credentials:'same-origin',...options,
      signal:options.signal||AbortSignal.timeout(180000)});
  } catch(cause) {
    const error=new Error(cause.name==='TimeoutError'?'O servidor demorou para responder. Tente novamente; uma execução já iniciada pode ser recuperada.':'A conexão foi interrompida. Confira sua rede e tente novamente.');
    error.status=0;throw error;
  }
  if(response.status===204)return null;
  const text=await response.text();let data;
  try{data=text?JSON.parse(text):null;}catch{data=null;}
  if(!response.ok){
    const detail=data?.detail;
    const message=response.status===401?'Sua sessão expirou. Entre novamente para continuar ou recuperar a análise.'
      :response.status===403?'Seu perfil não permite esta operação.'
      :typeof detail==='string'?detail:Array.isArray(detail)?detail.map(item=>`${(item.loc||[]).filter(v=>v!=='body').join(' → ')}: ${item.msg}`).join('; ')
      :`O serviço está indisponível (HTTP ${response.status}). Tente novamente.`;
    const error=new Error(message);error.status=response.status;throw error;
  }
  if(data===null)throw new Error('O serviço retornou uma resposta inválida. Atualize a página e tente novamente.');
  return data;
}
export const post=(path,body)=>json(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
export async function esperar(job,statusPath,aoAtualizar) {
  // aoAtualizar recebe o job inteiro, com o historico de etapas, para o modal.
  const notificar=aoAtualizar||(atual=>feedback(atual.etapa||atual.etapa_atual||'Processando…'));
  while(job.status==='executando'||job.status==='pendente') {
    notificar(job);
    await new Promise(resolve=>setTimeout(resolve,1200));
    for(let tentativa=0;;tentativa++){
      try{job=await json(statusPath(job.id));break;}
      catch(error){
        if(tentativa>=2||![0,502,503,504].includes(error.status))throw error;
        notificar({...job,etapa:'Reconectando ao processamento…'});
        await new Promise(resolve=>setTimeout(resolve,1200*(tentativa+1)));
      }
    }
  }
  notificar(job);
  if(job.status!=='concluido')throw new Error(job.erro||'O processamento não foi concluído.');
  return job.resultado;
}
export const adaptador={
  listarCatalogo:()=>json('/extracao-atributos/catalogo'),
  async carregarCamada(layer){
    const file=await post('/extracao-atributos/arquivo-mapa',{arquivo:layer.arquivo||undefined,id:layer.id});
    Object.assign(layer,file);return file.geojson;
  },
  async executar(request,aoAtualizar) {
    // O corpo tem que carregar tudo o que a 1.3 configura: o nome da saida e as
    // opcoes do operador do OGR ficavam para tras e o servidor usava os padroes.
    const job=await post('/extracao-atributos/execucoes',{input_id:request.input.id,operacao:request.operacao,
      nome_saida:request.nome_saida||'',opcoes:request.opcoes||{},
      categorias:request.categorias.map(c=>({id:c.id,camadas:c.camadas.map(l=>l.id),regras:c.regras||{}})),
      entradas:request.entradas||[],finalidades:request.finalidades||[]});
    try{sessionStorage.setItem('slt-extracao-ultima',job.id);}catch{
      feedback('A execução foi iniciada. O navegador não permitiu guardar o atalho; consulte o histórico para recuperá-la.');
    }
    return esperar(job,id=>`/extracao-atributos/execucoes/${id}`,aoAtualizar);
  },
  async exportar({resultado_id}) {
    const response=await fetch(`${base}/extracao-atributos/execucoes/${encodeURIComponent(resultado_id)}/pacote`);
    if(!response.ok){const data=await response.json().catch(()=>({}));throw new Error(data.detail||'Falha ao baixar o arquivo.');}
    // O nome sai do servidor: é o nome da saída, igual ao que está dentro do pacote.
    const nome=/filename="([^"]+)"/.exec(response.headers.get('Content-Disposition')||'')?.[1]||`extracao-${resultado_id}.zip`;
    const url=URL.createObjectURL(await response.blob()),link=document.createElement('a');
    link.href=url;link.download=nome;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
  },
};
