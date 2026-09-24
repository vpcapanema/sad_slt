import {json,post} from './api.js';
/* Adapta os resumos e etapas da extração ao feedback padrão do SICARD. */
export function confirmarExecucao(resumo){
  const detalhes=[
    resumo.entrada&&`Entrada: ${resumo.entrada}`,
    resumo.operacao&&`Geoprocesso: ${resumo.operacao}`,
    resumo.saida&&`Saída: ${resumo.saida}`,
    `${resumo.totalCamadas} camada(s) em ${resumo.categorias.length} categoria(s).`,
    ...resumo.categorias.map(c=>`${c.nome}: ${c.camadas.map(l=>l.nome).join('; ')}`),
    resumo.nota,
  ].filter(Boolean).join('\n');
  return window.SLTFeedback.confirmar({title:resumo.titulo||'Confirmar execução da extração',
    message:resumo.chamada||'Confira o que será processado.',detail:detalhes,
    confirmLabel:resumo.acao||'Executar extração'});
}

export function acompanharExecucao(titulo){
  const proc=window.SLTFeedback.processo(titulo||'Extração em andamento');
  const modal=proc.element;modal.dataset.eaProcesso='true';
  let vistas=0;
  const etapa=(mensagem,tipo='info')=>proc.passo(mensagem,tipo==='erro'?'error':tipo==='sucesso'?'success':tipo);
  return {
    etapa,
    acompanhar(job){
      proc.acompanhar(job);
      proc.definirCancelamento(job.cancelavel?async()=>{
        await post(`/extracao-atributos/execucoes/${job.id}/cancelar`,{});
        let atual=job;
        while(['executando','pendente'].includes(atual.status)){
          await new Promise(resolve=>setTimeout(resolve,500));
          atual=await json(`/extracao-atributos/execucoes/${job.id}`);proc.acompanhar(atual);
        }
        if(atual.status!=='cancelado')throw new Error(atual.erro||'O servidor terminou antes do cancelamento. Confira o resultado.');
      }:null,job.cancelamento_solicitado?'Aguardando a tarefa atual parar.':'Gravação final em andamento; aguarde sua conclusão.');
    },
    etapas(lista){for(const e of (lista||[]).slice(vistas))etapa(e.mensagem);vistas=Math.max(vistas,(lista||[]).length);},
    concluir(mensagem,aoVerResultados){
      const root=proc.concluir({type:'success',message:mensagem});
      if(aoVerResultados){const b=document.createElement('button');b.type='button';b.className='btn btn-primary';
        b.textContent='Ver resultados';b.onclick=()=>{proc.fechar();aoVerResultados();};root.querySelector('.slt-fb-foot').append(b);}
    },
    falhar(mensagem,cancelado=false){proc.concluir({type:cancelado?'info':'error',message:mensagem});},
    fechado:()=>!modal.isConnected,
  };
}
