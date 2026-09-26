/* Adaptador de apresentação do cliente SFTPGo. Não substitui nem modifica
   uploadFiles, Dropzone, checagem de duplicatas ou transporte nativos. */
(()=>{
  const avisar=(tipo,extra={})=>parent.postMessage({tipo,...extra},location.origin);
  const css=document.createElement('style');
  css.textContent='#kt_app_page{display:none!important}body{background:#fff!important}.modal-dialog{margin:1rem auto;max-width:95%}.modal-backdrop{background:#fff}#errorMsg{margin:1rem!important}';
  document.head.append(css);
  // Somente apresentação: o contrato {isConfirmed} e todas as rotinas de
  // duplicatas, fila, validação e upload do storage continuam sendo os nativos.
  // Confirmação e aviso do storage aparecem no feedback oficial (SIGMA-PLI) da página-mãe.
  const oficial=parent.ProcessFeedback,avisos=parent.Notify;
  if(oficial && avisos && window.ModalAlert){
    window.ModalAlert.fire=async params=>{
      if(params.cancelButtonText)return {isConfirmed:await oficial.confirmar({
        title:'Envio ao storage',message:params.text,warning:(params.items||[]).join('\n'),
        confirmLabel:params.confirmButtonText,cancelLabel:params.cancelButtonText,danger:params.icon==='warning'})};
      const tipo=['success','error','warning','info'].includes(params.icon)?params.icon:'info';
      const aviso=avisos[tipo]('Envio ao storage',[params.text,...(params.items||[])].filter(Boolean).join('\n'));
      // O contrato {isConfirmed} do storage espera o aviso ser dispensado.
      return new Promise(resolve=>{const observer=new MutationObserver(()=>{if(!aviso?.element?.isConnected){observer.disconnect();resolve({isConfirmed:true});}});
        observer.observe(parent.document.documentElement,{childList:true,subtree:true});});
    };
  }
  const erro=document.querySelector('#errorMsg');
  if(erro){
    const style=document.createElement('style');style.textContent='#errorMsg{display:none!important}';document.head.append(style);
    let ultimo='';new MutationObserver(()=>{const texto=erro.textContent.trim();
      if(!erro.classList.contains('d-none')&&texto&&texto!==ultimo){ultimo=texto;avisar('sicard-storage-erro',{mensagem:texto});}
      if(erro.classList.contains('d-none'))ultimo='';
    }).observe(erro,{childList:true,subtree:true,attributes:true,characterData:true});
  }
  let requisicoes=0;
  axios.interceptors.request.use(config=>{
    if(config.method==='post'&&new URL(config.url,location.href).pathname.endsWith('/web/client/file')){
      requisicoes++;avisar('sicard-storage-enviando',{ativo:true});
    }
    return config;
  });
  function terminou(config){
    if(config?.method==='post'&&new URL(config.url,location.href).pathname.endsWith('/web/client/file')){
      requisicoes=Math.max(0,requisicoes-1);avisar('sicard-storage-enviando',{ativo:requisicoes>0});
    }
  }
  axios.interceptors.response.use(r=>{terminou(r.config);return r;},e=>{terminou(e.config);avisar('sicard-storage-erro');return Promise.reject(e);});
  const inicio=Date.now();
  const espera=setInterval(()=>{
    if(document.querySelector('#upload_files')?.dropzone){
      clearInterval(espera);
      bootstrap.Modal.getOrCreateInstance(document.querySelector('#modal_upload')).show();
      avisar('sicard-storage-pronto');
    }else if(Date.now()-inicio>30000){clearInterval(espera);avisar('sicard-storage-erro');}
  },100);
  document.querySelector('#upload_files_cancel')?.addEventListener('click',()=>avisar('sicard-storage-cancelado'));
  document.querySelector('#modal_upload .modal-header [data-bs-dismiss]')?.addEventListener('click',()=>avisar('sicard-storage-cancelado'));
  // Após falha, o erro nativo continua visível e o usuário pode reabrir o modal.
  const repetir=document.createElement('button');repetir.type='button';repetir.className='btn btn-primary m-5';
  repetir.textContent='Selecionar arquivos';repetir.onclick=()=>bootstrap.Modal.getOrCreateInstance(document.querySelector('#modal_upload')).show();
  document.body.append(repetir);
})();
