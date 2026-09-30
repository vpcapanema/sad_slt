import { iniciarHttp, log, progresso } from './logger.js';
import { feedback } from './ui.js';
const prefix=location.pathname.includes('/sicard/')?'/sicard':'';
export const base=`${prefix}/api/geoespacial`;
export async function json(path,options={}) {
  const rastreio=iniciarHttp(path,options);
  let response;
  try {
    response=await fetch(base+path,{credentials:'same-origin',...options,
      signal:options.signal||AbortSignal.timeout(180000)});
  } catch(cause) {
    rastreio.falhar(cause);
    const error=new Error(cause.name==='TimeoutError'?'O servidor demorou para responder. Tente novamente; uma execução já iniciada pode ser recuperada.':'A conexão foi interrompida. Confira sua rede e tente novamente.');
    error.status=0;throw error;
  }
  if(response.status===204){rastreio.concluir(204);return null;}
  let text;try{text=await response.text();}catch(error){rastreio.falhar(error);throw error;}let data;
  try{data=text?JSON.parse(text):null;}catch{data=null;}
  rastreio.concluir(response.status,data);
  if(!response.ok){
    const detail=data?.detail;
    const message=response.status===401?'Sua sessão expirou. Entre novamente para continuar ou recuperar a análise.'
      :response.status===403?(typeof detail==='string'?detail:'Seu perfil não permite esta operação.')
      :typeof detail==='string'?detail:Array.isArray(detail)?detail.map(item=>`${(item.loc||[]).filter(v=>v!=='body').join(' → ')}: ${item.msg}`).join('; ')
      :`O serviço está indisponível (HTTP ${response.status}). Tente novamente.`;
    const error=new Error(message);error.status=response.status;throw error;
  }
  if(data===null){log('http.resposta_invalida',{status_http:response.status},'error');throw new Error('O serviço retornou uma resposta inválida. Atualize a página e tente novamente.');}
  return data;
}
export const post=(path,body)=>json(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
export async function esperar(job,statusPath,aoAtualizar) {
  // aoAtualizar recebe o job inteiro, com o historico de etapas, para o modal.
  // Sem acompanhamento próprio, o retrato do job vai para o processo aberto no ProcessFeedback.
  const atualizar=aoAtualizar||(atual=>window.ProcessFeedback?.acompanhar(atual));
  const notificar=atual=>{progresso(atual);atualizar(atual);};
  while(job.status==='executando'||job.status==='pendente') {
    notificar(job);
    await new Promise(resolve=>setTimeout(resolve,1200));
    for(let tentativa=0;;tentativa++){
      try{
        const recebido=await json(statusPath(job.id));
        const vivo=window.ProcessFeedback?.atual?._sicard;
        // Polling antigo não encerra a espera. SSE terminal não contém o resultado; aguardar o retrato REST completo.
        if(vivo?.job===String(recebido.id)&&Number.isFinite(recebido.revisao)&&recebido.revisao<vivo.revisao)break;
        else if(!Number.isFinite(job.revisao)||!Number.isFinite(recebido.revisao)||recebido.revisao>=job.revisao)job=recebido;
        break;
      }
      catch(error){
        if(tentativa>=2||![0,502,503,504].includes(error.status))throw error;
        log('http.retentativa',{job:job.id,tentativa:tentativa+1,status_http:error.status},'warn');
        window.ProcessFeedback?.atual?.resumo('Contato interrompido; tentando recuperar o acompanhamento. O processamento pode continuar no servidor.');
        await new Promise(resolve=>setTimeout(resolve,1200*(tentativa+1)));
      }
    }
  }
  notificar(job);
  if(job.status==='cancelado'){const error=new Error('Processamento cancelado. A configuração foi mantida.');error.name='AbortError';throw error;}
  if(job.status!=='concluido')throw new Error(job.erro||'O processamento não foi concluído.');
  return job.resultado;
}
export const adaptador={
  listarCatalogo:()=>json('/extracao-atributos/catalogo'),
  async carregarCamada(layer){
    const {validarCamada}=await import('./camada-validada.js');
    const file=await validarCamada(layer);
    delete layer.geojson;delete layer.geojson_resumido;Object.assign(layer,file);return file;
  },
  async executar(request,aoAtualizar) {
    // O corpo tem que carregar tudo o que a 1.3 configura: o nome da saida e as
    // opcoes do operador do OGR ficavam para tras e o servidor usava os padroes.
    log('validacao.compatibilidade_inicio',{operacao:request.operacao,entradas:request.entradas?.length||1,bases:request.categorias.reduce((n,c)=>n+c.camadas.length,0)});
    const entradas=request.entradas?.length?request.entradas:[{id:request.input.id}];
    const compatibilidade=await post('/extracao-atributos/compatibilizar',{
      operacao:request.operacao,
      camadas:[
        ...entradas.map(e=>({id:e.id,papel:'entrada',arquivo_local:e.id===request.input.id?request.input.arquivo_local:request.entradas_locais?.[e.id]})),
        ...request.categorias.flatMap(c=>c.camadas.map(l=>({id:l.id,nome:l.nome,papel:'base',arquivo_local:l.arquivo_local,regra:c.regras?.[l.id]}))),
      ],
    });
    log('validacao.compatibilidade_fim',{valido:compatibilidade.compativel===true},compatibilidade.compativel===true?'info':'warn');
    if(compatibilidade.compativel!==true)throw new Error((compatibilidade.erros||[]).map(e=>`${e.nome}: ${e.motivo}`).join('; ')||'Não foi possível confirmar a compatibilidade espacial.');
    const job=await post('/extracao-atributos/execucoes',{input_id:request.input.id,operacao:request.operacao,
      nome_saida:request.nome_saida||'',opcoes:request.opcoes||{},
      ...(request.input.arquivo_local?{arquivo_local:request.input.arquivo_local}:{}),
      entradas_locais:request.entradas_locais||{},
      bases_locais:Object.fromEntries(request.categorias.flatMap(c=>c.camadas).filter(l=>l.arquivo_local).map(l=>[l.id,l.arquivo_local])),
      categorias:request.categorias.map(c=>({id:c.id,camadas:c.camadas.map(l=>l.id),regras:c.regras||{}})),
      entradas:request.entradas||[],finalidades:request.finalidades||[]});
    try{sessionStorage.setItem('slt-extracao-ultima',job.id);}catch{
      feedback('A execução foi iniciada. O navegador não permitiu guardar o atalho; consulte o histórico para recuperá-la.');
    }
    return esperar(job,id=>`/extracao-atributos/execucoes/${id}`,aoAtualizar);
  },
  async exportar({resultado_id}) {
    const rota=`/extracao-atributos/execucoes/${encodeURIComponent(resultado_id)}/pacote`,rastreio=iniciarHttp(rota);
    let response;try{response=await fetch(base+rota);}catch(error){rastreio.falhar(error);throw error;}
    rastreio.concluir(response.status);
    if(!response.ok){const data=await response.json().catch(()=>({}));throw new Error(data.detail||'Falha ao baixar o arquivo.');}
    // O nome sai do servidor: é o nome da saída, igual ao que está dentro do pacote.
    const nome=/filename="([^"]+)"/.exec(response.headers.get('Content-Disposition')||'')?.[1]||`extracao-${resultado_id}.zip`;
    let blob;try{blob=await response.blob();}catch(error){rastreio.falhar(error);throw error;}
    log('download.recebido',{job:resultado_id,bytes:blob.size});
    const url=URL.createObjectURL(blob),link=document.createElement('a');
    link.href=url;link.download=nome;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
  },
};
