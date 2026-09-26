import {json,post} from './api.js';
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
  const proc=pf.iniciarCadastro({title:titulo||'Extração em andamento'});
  const etapa=(mensagem,tipo='info')=>tipo==='erro'?proc.log(mensagem,'error'):tipo==='sucesso'?proc.log(mensagem,'success'):proc.etapa(mensagem);
  let vistas=0;
  return {
    etapa,
    acompanhar(job){
      if(pf.atual!==proc)return;
      pf.acompanhar(job);
      // O cancelamento só é oferecido enquanto o servidor ainda pode parar com segurança.
      pf.permitirCancelamento(job.cancelavel?async()=>{
        try{
          await post(`/extracao-atributos/execucoes/${job.id}/cancelar`,{});
          let atual=job;
          while(['executando','pendente'].includes(atual.status)){
            await new Promise(resolve=>setTimeout(resolve,500));
            atual=await json(`/extracao-atributos/execucoes/${job.id}`);
          }
          if(atual.status==='cancelado')window.Notify.info('Extração de atributos','Processamento cancelado. A configuração foi mantida.',{duration:7000});
          else window.Notify.warning('Extração de atributos',atual.erro||'O servidor terminou antes do cancelamento. Confira o resultado.');
        }catch(error){window.Notify.error('Extração de atributos',`Não foi possível confirmar o cancelamento: ${error.message}`);}
      }:null);
    },
    etapas(lista){for(const e of (lista||[]).slice(vistas))etapa(e.mensagem);vistas=Math.max(vistas,(lista||[]).length);},
    concluir(mensagem,aoVerResultados){
      proc.sucesso({title:'Extração concluída',message:mensagem,
        subprocesses:aoVerResultados?[{name:'Resultados',status:'success',detail:'Tabela de atributos, mapa e painel analítico.',
          action_label:'Ver resultados',action:aoVerResultados}]:[]});
    },
    falhar(mensagem,cancelado=false){
      // Cancelado pelo botão: o aviso vem da confirmação do servidor, não repete aqui.
      if(cancelado){const pelaInterface=proc._finalizado;proc.fechar();if(!pelaInterface)window.Notify.info('Extração de atributos',mensagem,{duration:7000});}
      else proc.erro({message:mensagem});
    },
    fechado:()=>pf.atual!==proc||proc._finalizado===true,
  };
}
