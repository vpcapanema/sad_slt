(() => {
  'use strict';

  const feedback=window.ProcessFeedback;
  if(!feedback)throw new Error('O controlador unificado de feedback precisa ser carregado antes da bancada.');

  function iniciarCadastro(...args){
    const processo=feedback.iniciarCadastro(...args);
    processo.sync=job=>feedback.acompanhar(job);
    return processo;
  }

  const notifications={};
  for(const nivel of ['info','success','warning','error']){
    notifications[nivel]=(titulo,mensagem,opcoes)=>{
      const processo=feedback.atual;
      if(processo&&!processo._finalizado){
        processo.log(`${titulo}: ${mensagem}`,nivel);
        return;
      }
      if(!window.Notify?.[nivel])throw new Error('O sistema de notificações precisa ser carregado antes da bancada.');
      return window.Notify[nivel](titulo,mensagem,opcoes);
    };
  }

  window.gpFeedback={
    ProcessFeedback:{
      iniciarCadastro,
      confirmar:options=>feedback.confirmar(options),
      acompanhar:job=>feedback.acompanhar(job),
      permitirCancelamento:(handler,label)=>feedback.permitirCancelamento(handler,label),
      get atual(){return feedback.atual;}
    },
    Notify:notifications
  };
})();
