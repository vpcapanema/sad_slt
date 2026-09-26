/* Feedback exclusivo da bancada: andamento e mensagens persistentes no painel,
 * com confirmação local. Não utiliza os modais da aplicação hospedeira. */
(() => {
  'use strict';
  const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n;};
  let panel,content,active,confirmation=0;
  function ensure(){
    if(panel){const host=[...document.querySelectorAll('dialog[open]')].filter(d=>!d.classList.contains('gp-feedback-confirm')).at(-1)||document.querySelector('.gp-app')||document.body;if(panel.parentElement!==host)host.append(panel);return;}
    panel=el('section','gp-feedback-panel');panel.setAttribute('aria-label','Geoprocessamento — andamento e histórico');
    const header=el('header'),title=el('strong',null,'Geoprocessamento'),toggle=el('button',null,'Recolher');toggle.type='button';toggle.setAttribute('aria-expanded','true');
    content=el('div','gp-feedback-content');toggle.onclick=()=>{content.hidden=!content.hidden;toggle.textContent=content.hidden?'Expandir':'Recolher';toggle.setAttribute('aria-expanded',String(!content.hidden));};
    header.append(title,toggle);panel.append(header,content);(document.querySelector('.gp-app')||document.body).append(panel);
    new MutationObserver(()=>ensure()).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['open']});
  }
  function bar(label){const group=el('div','gp-feedback-meter'),text=el('span',null,label),meter=el('progress');meter.max=100;meter.setAttribute('aria-label',label);group.append(text,meter);return {group,set(value,detail){text.textContent=detail||label;if(typeof value==='number'&&Number.isFinite(value))meter.value=Math.max(0,Math.min(100,value));else meter.removeAttribute('value');}};}
  function start(opts={}){
    ensure();content.hidden=false;panel.querySelector('header button').textContent='Recolher';panel.querySelector('header button').setAttribute('aria-expanded','true');
    const card=el('article','gp-feedback-run'),heading=el('h3',null,opts.title||'Processamento'),state=el('p',null,opts.subtitle||'Preparando execução…'),task=el('p','gp-feedback-task'),overall=bar('Progresso geral'),individual=bar('Tarefa atual'),details=el('details'),summary=el('summary',null,'Mensagens'),logs=el('ol');
    details.open=true;details.append(summary,logs);card.append(heading,state,task,overall.group,individual.group,details);content.prepend(card);
    const completed=new Set();let current='',seq=0,jobId=null;
    const proc={_finalizado:false,tasks:(opts.tasks||[]).map(name=>({name})),
      tarefaAtual(name,description){current=name;task.textContent=name;individual.set(null,description||'Tarefa em andamento — aguardando medição do servidor');},
      detalhe(message){task.textContent=`${current} — ${message}`;},
      progresso(value){overall.set(value,`Progresso geral${typeof value==='number'?`: ${Math.round(value)}%`:''}`);},
      progressoTarefa(value,done,total,unit='itens'){individual.set(value,total!=null?`${done}/${total} ${unit} · ${Math.round(value||0)}%`:typeof value==='number'?`Tarefa atual: ${Math.round(value)}%`:'Tarefa em andamento — sem medição disponível');},
      log(message,level='info'){const item=el('li',`gp-feedback-${level}`);item.append(el('time',null,new Date().toLocaleTimeString('pt-BR')),el('span',null,message));logs.append(item);summary.textContent=`Mensagens (${logs.children.length})`;},
      etapa(message){proc.tarefaAtual(message);proc.log(message);},
      concluirTarefa(name,message){completed.add(name);individual.set(100,message||`${name}: concluída`);if(opts.tasks?.length)proc.progresso(completed.size/opts.tasks.length*100);},
      sucesso(data={}){ensure();proc._finalizado=true;proc.progresso(100);individual.set(100,'Tarefa concluída');state.textContent=data.message||'Execução concluída';card.dataset.status='success';proc.log(state.textContent,'success');},
      erro(data={}){ensure();proc._finalizado=true;state.textContent=data.message||'Falha na execução';card.dataset.status='error';proc.log(state.textContent,'error');},
      fechar(){details.open=false;},
      sync(job){
        if(jobId!==job.id){jobId=job.id;seq=0;}
        for(const entry of job.logs||job.etapas||[]){const id=entry.sequencia||0;if(id<=seq)continue;seq=id;const detail=entry.detalhes&&Object.keys(entry.detalhes).length?` — ${JSON.stringify(entry.detalhes)}`:'';proc.log((entry.mensagem||'')+detail,entry.nivel==='erro'?'error':entry.nivel==='sucesso'?'success':'info');}
        state.textContent=job.status==='concluido'?'Processamento concluído':job.status==='erro'?'Falha na execução':'Executando';
        current=job.etapa_atual||job.etapa||'Finalizando';task.textContent=job.detalhe?`${current} — ${job.detalhe}`:current;
        proc.progresso(job.percentual);proc.progressoTarefa(job.progresso_tarefa,job.tarefa_concluidas,job.tarefa_total,job.unidade_tarefa);
      }
    };active=proc;return proc;
  }
  function confirmLocal(opts={}){return new Promise(resolve=>{
    const dialog=el('dialog','gp-feedback-confirm'),title=el('h2',null,opts.title||'Confirmar operação'),message=el('p',null,opts.message||'Deseja continuar?'),warning=el('pre',null,opts.warning||''),actions=el('footer'),cancel=el('button',null,'Cancelar'),ok=el('button','primary',opts.confirmLabel||'Continuar');
    title.id=`gp-confirm-${++confirmation}`;dialog.setAttribute('aria-labelledby',title.id);cancel.type=ok.type='button';
    const finish=value=>{dialog.close();dialog.remove();resolve(value);};cancel.onclick=()=>finish(false);ok.onclick=()=>finish(true);dialog.addEventListener('cancel',e=>{e.preventDefault();finish(false);});actions.append(cancel,ok);dialog.append(title,message,warning,actions);document.body.append(dialog);dialog.showModal();cancel.focus();
  });}
  const notify={};for(const level of ['info','success','warning','error'])notify[level]=(title,message)=>{ensure();if(active&&!active._finalizado){active.log(`${title}: ${message}`,level);return;}const row=el('p',`gp-feedback-${level}`,`${title}: ${message}`);content.prepend(row);};
  window.gpFeedback={ProcessFeedback:{iniciarCadastro:start,confirmar:confirmLocal,acompanhar:job=>active?.sync(job),get atual(){return active;}},Notify:notify};
  window.ProcessFeedback=window.gpFeedback.ProcessFeedback;
})();
