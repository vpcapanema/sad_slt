import { el } from './ui.js';
import { post, esperar } from './api.js';
const definitions={
  'OP-02':{nome:'Validar camada',fields:[]},'OP-02-CORR':{nome:'Reparar geometrias',fields:[]},
  'OP-36':{nome:'Reprojetar',fields:[['crs_destino','CRS de destino','text','EPSG:4674']]},
  'OP-33':{nome:'Recortar',fields:[['camada_mascara_id','Camada de recorte','layer']]},
  'OP-06':{nome:'Dissolver',fields:[['campo_agrupamento','Campo de agrupamento (vazio dissolve tudo)','text','']]},
  'OP-07':{nome:'Selecionar por localização',fields:[['camada_ref_id','Camada de referência','layer']]},
};
export function abrirFerramenta({operacao_id,camadas}) {
  return new Promise(resolve=>{
    const def=definitions[operacao_id],dialog=el('dialog'),form=el('form');dialog.className='ea-tool-dialog';form.append(el('h2',def.nome));
    for(const [key,label,type,value] of [['camada_id','Camada a processar','layer'],...def.fields]){
      const wrap=el('label',label),input=el(type==='layer'?'select':'input');input.name=key;
      if(type==='layer')for(const layer of camadas)input.add(new Option(layer.nome,layer.id));else{input.type=type;input.value=value??'';}
      input.required=key!=='campo_agrupamento';wrap.append(input);form.append(wrap);
    }
    const message=el('p');message.setAttribute('role','status');form.append(message);
    const run=el('button','Executar','ea-btn ea-btn-primary'),cancel=el('button','Fechar','ea-btn');run.type='submit';cancel.type='button';
    form.append(run,cancel);dialog.append(form);document.body.append(dialog);dialog.showModal();let running=false,done=false;
    function close(){if(running)return;dialog.close();dialog.remove();resolve({alterado:done});}
    cancel.addEventListener('click',close);dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
    form.addEventListener('submit',async event=>{
      event.preventDefault();if(running)return;const params=Object.fromEntries(new FormData(form));
      if(params.campo_agrupamento==='')delete params.campo_agrupamento;params.destino='catalogo';running=true;run.disabled=true;cancel.disabled=true;
      try{message.textContent='Processando…';const job=await post(`/operacoes-jobs/${operacao_id}`,params);
        const result=await esperar(job,id=>`/operacoes-jobs/status/${id}`);
        message.textContent=operacao_id==='OP-02'?JSON.stringify(result,null,2):'Nova camada criada no catálogo. Feche para atualizar os seletores.';done=operacao_id!=='OP-02';
      }catch(error){message.textContent=error.message;}finally{running=false;run.disabled=false;cancel.disabled=false;}
    });
  });
}
