import { log, progresso, correlacaoAtual } from './logger.js';
import {post} from './api.js';
/* Adapta os resumos e etapas da extração ao feedback oficial (ProcessFeedback do SIGMA-PLI). */
export function confirmarExecucao(resumo){
  const detalhes=[
    resumo.entrada&&`Entrada: ${resumo.entrada}`,
    resumo.operacao&&`Geoprocesso: ${resumo.operacao}`,
    resumo.saida&&`Saída: ${resumo.saida}`,
    `${resumo.totalCamadas} camada(s) em ${resumo.categorias.length} categoria(s).`,
    ...resumo.categorias.map(c=>`${c.nome}: ${c.camadas.map(l=>l.nome).join('; ')}`),
    resumo.nota,
  ].filter(Boolean).join('\n');
  return window.ProcessFeedback.confirmar({title:resumo.titulo||'Confirmar execução da extração',
    message:resumo.chamada||'Confira o que será processado.',warning:detalhes,
    confirmLabel:resumo.acao||'Executar extração'});
}

/**
 * Overlay de progresso do SIGMA para uma execução: os retratos do job viram
 * tarefas, log e percentual; o botão CANCELAR aparece enquanto o servidor
 * aceita interrupção. O desfecho abre o modal de sucesso ou de erro.
 */
export function acompanharExecucao(titulo){
  const pf=window.ProcessFeedback;
  let jobId;const correlacao=correlacaoAtual();
  const proc=pf.iniciarCadastro({title:titulo||'Extração em andamento',onProgressSnapshot:(snapshot,origem)=>progresso({...snapshot,id:jobId},origem,correlacao)});
  const etapa=(mensagem,tipo='info')=>tipo==='erro'?proc.log(mensagem,'error'):tipo==='sucesso'?proc.log(mensagem,'success'):proc.etapa(mensagem);
  let vistas=0;
  return {
    etapa,
    acompanhar(job){
      if(pf.atual!==proc)return;
      jobId=job.id;pf.acompanhar(job);
      // O cancelamento só é oferecido enquanto o servidor ainda pode parar com segurança.
      pf.permitirCancelamento(job.cancelavel ? async () => {
        log('cancelamento.solicitado',{job:job.id,acao:correlacao});
        await post(`/extracao-atributos/execucoes/${job.id}/cancelar`, {});
        log('cancelamento.aceito_aguardando',{job:job.id,acao:correlacao});
        // O polling/SSE já ativo confirma o estado terminal; não criar outro loop concorrente.
      } : null);
    },
    etapas(lista){for(const e of (lista||[]).slice(vistas))etapa(e.mensagem);vistas=Math.max(vistas,(lista||[]).length);},
    concluir(mensagem,aoVerResultados){
      log('execucao.fim',{job:jobId,status:'concluido',acao:correlacao});
      proc.sucesso({title:'Extração concluída',message:mensagem,
        subprocesses:aoVerResultados?[{name:'Resultados',status:'success',detail:'Tabela de atributos, mapa e painel analítico.',
          action_label:'Ver resultados',action:aoVerResultados}]:[]});
    },
    falhar(mensagem,cancelado=false){
      log('execucao.fim',{job:jobId,status:cancelado?'cancelado':'erro',acao:correlacao},cancelado?'warn':'error');
      if(cancelado){proc.confirmarCancelamento(mensagem);window.Notify.info('Extração de atributos',mensagem,{duration:7000});}
      else proc.erro({message:mensagem});
    },
    fechado:()=>pf.atual!==proc||proc._finalizado===true,
  };
}
