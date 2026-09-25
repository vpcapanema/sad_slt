/** Feedback oficial SICARD: notificações, validação contextual, diálogos de
 * decisão e acompanhamento independente de processos. Cor expressa estado;
 * o componente expressa urgência e necessidade de interromper a tarefa. */
(function (global) {
  "use strict";

  const esc = (value) =>
    String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[char]);

  const ICONS = {
    success: "fa-circle-check",
    error: "fa-circle-xmark",
    warning: "fa-triangle-exclamation",
    info: "fa-circle-info",
    progress: "fa-spinner fa-spin",
    question: "fa-circle-question",
  };
  const TITULOS = {
    success: "Sucesso", error: "Erro", warning: "Atenção",
    info: "Informação", progress: "Processando", question: "Confirmar ação",
  };

  let retornoFoco=null, overflowAnterior="", contador=0;
  const processos=new Set();
  let travado = false; // reservado aos diálogos bloqueantes
  let finalizarDialogo = null;
  let ouvinteTeclado = null; // Esc do modal aberto; sai junto com ele para não acumular

  let rootPersistente;
  function posicionarRaiz() {
    if (!rootPersistente) return;
    const dialog = [...document.querySelectorAll("dialog[open]")].filter(d => !rootPersistente.contains(d)).at(-1);
    const destino = dialog || document.body;
    if (rootPersistente.parentNode !== destino) destino.append(rootPersistente);
  }
  // Formulários nativos estão no top layer. O feedback acompanha o formulário
  // e volta ao documento quando ele fecha, sem se perder ao remover o dialog.
  new MutationObserver(posicionarRaiz).observe(document.documentElement, {childList:true, subtree:true, attributes:true, attributeFilter:["open"]});

  function raiz() {
    let root = rootPersistente || document.getElementById("slt-feedback-root");
    if (!root) {
      root = document.createElement("div");
      root.id = "slt-feedback-root";
      document.body.appendChild(root);
    }
    rootPersistente = root;
    posicionarRaiz();
    return root;
  }

  function fechar() {
    if (travado) return;
    if(finalizarDialogo){const finalizar=finalizarDialogo;finalizarDialogo=null;finalizar(false);}
    const bd = document.getElementById("slt-feedback-backdrop");
    if (bd) bd.remove();
    document.body.style.overflow = overflowAnterior;
    if(retornoFoco?.isConnected)retornoFoco.focus({preventScroll:true});
    retornoFoco=null;
    if (ouvinteTeclado) {
      document.removeEventListener("keydown", ouvinteTeclado);
      ouvinteTeclado = null;
    }
  }

  function addPasso(ul, passo) {
    const p = typeof passo === "string" ? { message: passo, status: "info" } : passo || {};
    const li = document.createElement("li");
    li.className = `slt-fb-step slt-fb-step--${p.status || "info"}${p.destaque ? " slt-fb-step--destaque" : ""}`;
    li.innerHTML = `<i class="fas ${ICONS[p.status] || ICONS.info}"></i><span>${esc(String(p.message??'').replace(/nanotarefas|microtarefas/g,'tarefas').replace(/materializando/gi,'preparando').replace(/persistindo/gi,'salvando'))}</span>`;
    ul.appendChild(li);
    ul.hidden = false;
    ul.scrollTop = ul.scrollHeight;
    return li;
  }

  /** Texto ou lista de textos/linhas → linhas { message, status }; texto solto herda `status`. */
  function linhas(conteudo, status) {
    const lista = Array.isArray(conteudo) ? conteudo : conteudo ? [conteudo] : [];
    return lista.map((l) => (typeof l === "string" ? { message: l, status } : l));
  }

  function montar({ type = "info", title, message, steps, resultados, footerHtml, barra = false, painel = false }) {
    if(!painel){travado = false;fechar();retornoFoco=document.activeElement;overflowAnterior=document.body.style.overflow;}
    const bd = document.createElement("div");
    bd.id = painel ? `slt-feedback-processo-${++contador}` : "slt-feedback-backdrop";
    bd.className = painel ? "slt-fb-process-panel" : "slt-fb-backdrop";
    bd.innerHTML = `
      <div class="slt-fb-modal slt-fb-modal--${type}" role="${painel?'region':'dialog'}" ${painel?'':'aria-modal="true"'} aria-labelledby="${bd.id}-titulo" tabindex="-1">
        <header class="slt-fb-head">
          <span class="slt-fb-icon"><i class="fas ${ICONS[type] || ICONS.info}"></i></span>
          <h3 class="slt-fb-title" id="${bd.id}-titulo">${esc(title || TITULOS[type] || "Mensagem")}</h3>
          <button type="button" class="slt-fb-close" data-fb-close aria-label="Fechar"><i class="fas fa-xmark"></i></button>
        </header>
        <div class="slt-fb-body">
          ${message ? `<p class="slt-fb-message">${esc(message)}</p>` : ""}

          <ul class="slt-fb-results" aria-live="polite" hidden></ul>
          ${painel?'<div class="slt-fb-current-message">':''}<ul class="slt-fb-steps" role="log" aria-live="polite" aria-relevant="additions" hidden></ul>${painel?'</div>':''}
          ${barra ? `<div class="slt-fb-progress" aria-label="Progresso do processamento">
            ${[['tarefa','Tarefa atual'],['geral','Processo geral']].map(([key,label])=>`<div class="slt-fb-progress-item" data-progress="${key}"><div class="slt-fb-progress-label"><span>${label}</span><strong class="slt-fb-percent">Sem percentual informado</strong></div><div class="slt-fb-bar slt-fb-bar--${key}" role="progressbar" aria-label="${label}" aria-valuemin="0" aria-valuemax="100"><div class="slt-fb-bar-fill"></div></div></div>`).join('')}
            <p class="slt-fb-etapa"></p></div>` : ""}
        </div>
        <footer class="slt-fb-foot">${footerHtml || '<button type="button" class="btn btn-primary" data-fb-close>OK</button>'}</footer>
      </div>`;
    if(painel){let area=raiz().querySelector('.slt-fb-processes');if(!area){area=document.createElement('div');area.className='slt-fb-processes';area.setAttribute('aria-label','Acompanhamento de processos');raiz().append(area);}area.append(bd);}
    else raiz().appendChild(bd);
    if(!painel)document.body.style.overflow = "hidden";
    bd.addEventListener("click", (e) => {
      if(!painel&&(e.target === bd || e.target.closest("[data-fb-close]"))) fechar();
    });
    // O `fechar()` do início já removeu o ouvinte do modal anterior.
    if(!painel){ouvinteTeclado = (e) => {
      if(e.key==='Tab'){
        const focus=[...bd.querySelectorAll('button,input,select,textarea,a[href],[tabindex="0"]')].filter(n=>!n.disabled&&n.getClientRects().length);
        const first=focus[0],last=focus.at(-1);
        if(!focus.length){e.preventDefault();bd.querySelector('[role="dialog"]').focus();}
        else if(e.shiftKey&&(document.activeElement===first||!bd.contains(document.activeElement))){e.preventDefault();last.focus();}
        else if(!e.shiftKey&&(document.activeElement===last||!bd.contains(document.activeElement))){e.preventDefault();first.focus();}
      }
      if(e.key === "Escape"){e.preventDefault();e.stopPropagation();}
      if (e.key === "Escape" && !travado) fechar();
    };
    document.addEventListener("keydown", ouvinteTeclado);bd.querySelector(".slt-fb-modal").focus();}
    const ul = bd.querySelector(".slt-fb-steps");
    (steps || []).forEach((s) => addPasso(ul, s));
    const res = bd.querySelector(".slt-fb-results");
    linhas(resultados, type).forEach((l) => addPasso(res, l));
    return bd;
  }

  /**
   * Modal de status: cabeçalho com o título da ação, corpo com os resultados,
   * um por linha. `resultados` aceita texto ou lista de textos/{ message, status }.
   */
  function notify(type, resultados, title, options = {}) {
    const opts=typeof title==='object'&&title!==null?title:options;
    title=typeof title==='string'?title:opts.title;
    if(opts.field)return campo(opts.field,linhas(resultados,type).map(l=>l.message).join(' '));
    if(opts.target)return contextual(opts.target,type,resultados,{...opts,title});
    if(opts.modal||opts.critical)return montar({type,title,resultados});
    const area=notificacoes();
    const texto=linhas(resultados,type).map(l=>l.message).join(' ');
    const repetida=[...area.children].find(n=>n.dataset.mensagem===texto&&n.dataset.type===type);
    if(repetida)return repetida;
    const node=document.createElement('section');node.className=`slt-fb-notice slt-fb-notice--${type}`;
    node.dataset.type=type;node.dataset.mensagem=texto;
    node.innerHTML=`<div role="${type==='error'?'alert':'status'}" aria-atomic="true"><strong>${esc(title||TITULOS[type])}</strong><p>${esc(texto)}</p></div>`;
    let timer,restante=opts.action?0:opts.duration??((type==='info'||type==='success')?7000:0),inicio;
    const fecharAviso=()=>{clearTimeout(timer);document.removeEventListener('visibilitychange',visibilidade);node.remove();};
    if(opts.action){const acao=document.createElement('button');acao.type='button';acao.textContent=opts.action.label;acao.onclick=async()=>{acao.disabled=true;try{await opts.action.run();fecharAviso();}catch(e){acao.disabled=false;contextual(node,'error',e.message||'Não foi possível concluir a ação.');}};node.append(acao);}
    const fecharBotao=document.createElement('button');fecharBotao.type='button';fecharBotao.className='slt-fb-dismiss';fecharBotao.textContent='×';fecharBotao.setAttribute('aria-label','Dispensar notificação');fecharBotao.onclick=fecharAviso;node.append(fecharBotao);
    const pausar=()=>{if(timer){clearTimeout(timer);timer=null;restante=Math.max(0,restante-(Date.now()-inicio));}};
    const iniciar=()=>{if(!timer&&restante>0&&!document.hidden&&!node.matches(':hover')&&!node.contains(document.activeElement)){inicio=Date.now();timer=setTimeout(fecharAviso,restante);}};
    node.addEventListener('mouseenter',pausar);node.addEventListener('mouseleave',iniciar);node.addEventListener('focusin',pausar);node.addEventListener('focusout',()=>setTimeout(iniciar,0));
    const visibilidade=()=>document.hidden?pausar():iniciar();document.addEventListener('visibilitychange',visibilidade);
    area.append(node);iniciar();return node;
  }
  function notificacoes(){let area=raiz().querySelector('.slt-fb-notices');if(!area){area=document.createElement('div');area.className='slt-fb-notices';area.setAttribute('aria-label','Notificações do sistema');raiz().append(area);}return area;}
  const alvo=value=>typeof value==='string'?document.querySelector(value):value;
  function contextual(target,type,message,{action,title}={}){
    const host=alvo(target);if(!host)return notify(type,message,title);
    host.querySelector(':scope > .slt-fb-context')?.remove();
    const node=document.createElement('div');node.className=`slt-fb-context slt-fb-notice--${type}`;node.setAttribute('role',type==='error'?'alert':'status');
    if(title){const h=document.createElement('strong');h.textContent=title;node.append(h);}
    const texto=document.createElement('p');texto.textContent=linhas(message,type).map(l=>l.message).join(' ');node.append(texto);
    if(action){const b=document.createElement('button');b.type='button';b.textContent=action.label;b.onclick=action.run;node.append(b);}
    host.append(node);return node;
  }
  const campos=new WeakMap();
  function limparCampo(target){const input=alvo(target),registro=input&&campos.get(input);if(!registro)return;
    document.querySelectorAll('.slt-fb-error-summary button').forEach(b=>{if(b.dataset.feedbackError===registro.node.id){const summary=b.parentNode;b.remove();if(!summary.querySelector('button'))summary.remove();}});
    registro.node.remove();input.removeAttribute('aria-invalid');
    const ids=(input.getAttribute('aria-describedby')||'').split(/\s+/).filter(id=>id&&id!==registro.node.id);
    if(ids.length)input.setAttribute('aria-describedby',ids.join(' '));else input.removeAttribute('aria-describedby');
    input.removeEventListener('input',registro.limpar);input.removeEventListener('change',registro.limpar);campos.delete(input);
  }
  function campo(target,message){const input=alvo(target);if(!input)return notify('warning',message);
    limparCampo(input);const node=document.createElement('p');node.id=`slt-fb-campo-${++contador}`;node.className='slt-fb-field-error';node.textContent=message;node.setAttribute('role','alert');
    input.setAttribute('aria-invalid','true');input.setAttribute('aria-describedby',[input.getAttribute('aria-describedby'),node.id].filter(Boolean).join(' '));input.insertAdjacentElement('afterend',node);
    const limpar=()=>limparCampo(input);campos.set(input,{node,limpar});input.addEventListener('input',limpar);input.addEventListener('change',limpar);return node;
  }
  function validar(form){form=alvo(form);if(!form)return false;
    form.querySelector('.slt-fb-error-summary')?.remove();const invalidos=[...form.querySelectorAll('input,select,textarea')].filter(n=>n.willValidate&&!n.validity.valid);
    if(!invalidos.length)return true;
    const summary=document.createElement('div');summary.className='slt-fb-error-summary';summary.tabIndex=-1;summary.setAttribute('role','alert');
    const h=document.createElement('strong');h.textContent='Revise os campos indicados';summary.append(h);
    invalidos.forEach(input=>{const message=mensagemCampo(input);campo(input,message);const b=document.createElement('button');b.type='button';b.textContent=`${input.labels?.[0]?.textContent.trim()||input.name||'Campo'}: ${message}`;b.dataset.feedbackError=campos.get(input).node.id;b.onclick=()=>input.focus();summary.append(b);});form.prepend(summary);summary.focus();return false;
  }
  function mensagemCampo(input){
    if(input.dataset.errorMessage)return input.dataset.errorMessage;
    if(input.validity.valueMissing)return input.tagName==='SELECT'?'Selecione uma opção.':'Preencha este campo.';
    if(input.validity.typeMismatch)return input.type==='email'?'Informe um endereço de e-mail válido.':'Informe um valor no formato solicitado.';
    return input.validationMessage||'Confira o valor informado.';
  }
  const formulariosPendentes=new Set();
  document.addEventListener('invalid',event=>{
    const input=event.target;if(!input.matches?.('input,select,textarea')||input.closest('[data-feedback-validation="off"]'))return;
    event.preventDefault();campo(input,mensagemCampo(input));
    if(input.form&&!formulariosPendentes.has(input.form)){
      const form=input.form;formulariosPendentes.add(form);queueMicrotask(()=>{formulariosPendentes.delete(form);validar(form);});
    }
  },true);
  const ocupados=new WeakMap();
  function carregamento(target,title='Carregando…'){
    const host=alvo(target)||raiz();const estado=ocupados.get(host)||{total:0,anterior:host.getAttribute('aria-busy')};estado.total++;ocupados.set(host,estado);host.setAttribute('aria-busy','true');
    const node=document.createElement('div');node.className='slt-fb-loading';node.setAttribute('role','status');node.textContent=title;host.append(node);
    let encerrado=false;const fechar=()=>{if(encerrado)return;encerrado=true;node.remove();estado.total--;if(!estado.total){if(estado.anterior===null)host.removeAttribute('aria-busy');else host.setAttribute('aria-busy',estado.anterior);ocupados.delete(host);}};
    return {element:node,signal:new AbortController().signal,passo(message){node.textContent=message;return node;},atualizar(_,status,message){if(message)node.textContent=message;},progresso(){},fechar,concluir({type='success',message,resultados,action}={}){fechar();if(type!=='success')return contextual(host,type,message||resultados,{action});}};
  }

  /**
   * Estágio 1 — revisão e confirmação da ação que está por vir.
   * options: { title, message, detail, confirmLabel, cancelLabel, danger }
   * Resolve true (seguir) ou false (desistir). Esc, clique no fundo, X e
   * "Cancelar" resolvem false; o botão de ação resolve true. Enter aciona o
   * botão focado; em ação perigosa (`danger`), só confirma com o foco no
   * botão de ação — o foco inicial em "Cancelar" não pode virar confirmação.
   */
  function confirmar(options) {
    const opts = typeof options === "string" ? { message: options } : options || {};
    const {
      title = TITULOS.question,
      message = "Deseja continuar?",
      detail = "",
      confirmLabel = "Confirmar",
      cancelLabel = "Cancelar",
      danger = false,
    } = opts;

    return new Promise((resolve) => {
      const footerHtml =
        `<button type="button" class="btn btn-secondary" data-fb-cancelar>${esc(cancelLabel)}</button>` +
        `<button type="button" class="btn ${danger ? "btn-danger" : "btn-primary"}" data-fb-confirmar>${esc(confirmLabel)}</button>`;
      const bd = montar({
        type: danger ? "warning" : "question",
        title,
        message,
        steps: detail ? [{ message: detail, status: "info" }] : [],
        footerHtml,
      });

      let campo;
      if (opts.input) {
        const label = document.createElement("label");label.textContent = opts.input.label || "Nome";
        campo = document.createElement("input");campo.type = "text";campo.value = opts.input.value || "";
        campo.required = true;campo.maxLength = opts.input.maxLength || 200;
        campo.setAttribute("data-fb-input", "");label.append(campo);bd.querySelector(".slt-fb-body").append(label);
      }
      let resolvido = false;
      const encerrar = (valor) => {
        if (resolvido) return;
        if (valor && campo) {
          if (!campo.value.trim()) {global.SLTFeedback.campo(campo,"Informe um nome.");campo.focus();return;}
          valor = campo.value.trim();
        }
        resolvido = true;
        document.removeEventListener("keydown", onKey);
        fechar();
        resolve(valor);
      };
      finalizarDialogo=encerrar;
      function onKey(e) {
        if (e.key === "Escape") {
          encerrar(false);
        } else if (e.key === "Enter") {
          e.preventDefault(); // o clique nativo do botão focado decidiria de novo
          const foco = document.activeElement;
          if (foco?.closest?.("[data-fb-cancelar], [data-fb-close]")) encerrar(false);
          else if (!danger || foco?.closest?.("[data-fb-confirmar]")) encerrar(true);
        }
      }
      bd.addEventListener("click", (e) => {
        if (e.target.closest("[data-fb-confirmar]")) encerrar(true);
        else if (e.target.closest("[data-fb-cancelar]") || e.target.closest("[data-fb-close]") || e.target === bd) {
          encerrar(false);
        }
      });
      document.addEventListener("keydown", onKey);
      // Ação destrutiva nunca começa com o botão perigoso focado.
      if(campo)campo.focus();
      else bd.querySelector(danger ? "[data-fb-cancelar]" : "[data-fb-confirmar]")?.focus();
    });
  }

  /** Acompanhamento não modal: recolher preserva execução, cancelamento depende do serviço. */
  function processo(title, { barra = true, cancelar, restaurar, target } = {}) {
    const bd = montar({ type: "progress", title: title || TITULOS.progress, barra: true, painel:true });
    if(target&&alvo(target)){alvo(target).append(bd);bd.classList.add("slt-fb-process-inline");}
    const modal = bd.querySelector(".slt-fb-modal");
    const ul = bd.querySelector(".slt-fb-steps");
    const foot = bd.querySelector(".slt-fb-foot");
    const etapa = bd.querySelector(".slt-fb-etapa");
    etapa.hidden=true;
    ul.setAttribute('role','status');ul.setAttribute('aria-atomic','true');ul.removeAttribute('aria-relevant');
    let tarefaAtual=null,chaveAtual=null;
    function ocultarTarefa(){ul.replaceChildren();ul.hidden=true;tarefaAtual=null;bd.querySelector('[data-progress="tarefa"]').hidden=true;}
    function iniciarTarefa(message,status='progress',chave=message){
      if(finalizado||cancelado)return null;
      if(chave===chaveAtual){if(tarefaAtual)tarefaAtual.querySelector('span').textContent=message;return tarefaAtual;}
      ocultarTarefa();chaveAtual=chave;
      // Zerar sem interpolar a barra da tarefa anterior até a próxima.
      const fill=bd.querySelector('.slt-fb-bar--tarefa .slt-fb-bar-fill');
      fill.style.transition='none';barraReal('tarefa',0);void fill.offsetWidth;fill.style.transition='';
      const registro=addPasso(document.createElement('ul'),{message,status});
      if(status==='success')return registro;
      tarefaAtual=registro;ul.replaceChildren(tarefaAtual);ul.hidden=false;bd.querySelector('[data-progress="tarefa"]').hidden=false;
      bd.querySelector('.slt-fb-bar--tarefa').setAttribute('aria-label',`Progresso: ${message}`);
      bd.querySelector('[data-progress="tarefa"] .slt-fb-progress-label > span').textContent=message;
      return tarefaAtual;
    }
    let cancelando=false,cancelado=false,finalizado=false,desfechoPendente;
    const controller=new AbortController();
    function barraReal(nome,valor){
      const bar=bd.querySelector(`.slt-fb-bar--${nome}`),label=bar.closest('.slt-fb-progress-item').querySelector('.slt-fb-percent');
      const valido=typeof valor==='number'&&Number.isFinite(valor);
      bar.removeAttribute('aria-valuetext');
      bar.classList.toggle('is-indeterminate',!valido);
      if(valido){const n=Math.round(Math.max(0,Math.min(100,valor)));bar.setAttribute('aria-valuenow',String(n));bar.querySelector('.slt-fb-bar-fill').style.width=`${n}%`;label.textContent=`${n}%`;}
      else{bar.removeAttribute('aria-valuenow');bar.querySelector('.slt-fb-bar-fill').style.width='0%';label.textContent='Sem percentual informado';}
    }
    const cancelButton=document.createElement('button');cancelButton.type='button';cancelButton.className='btn btn-secondary';cancelButton.textContent='Cancelar';cancelButton.dataset.fbCancelProcesso='';
    const motivo=document.createElement('small');motivo.className='slt-fb-cancel-reason';
    const alternar=document.createElement('button');alternar.type='button';alternar.className='btn btn-secondary';alternar.textContent='Recolher acompanhamento';
    const recolher=()=>{const hidden=bd.classList.toggle('is-collapsed');alternar.textContent=hidden?'Mostrar acompanhamento':'Recolher acompanhamento';alternar.setAttribute('aria-expanded',String(!hidden));};
    alternar.onclick=recolher;alternar.setAttribute('aria-expanded','true');
    foot.replaceChildren(motivo,alternar,cancelButton);foot.hidden=false;
    bd.querySelector('[data-fb-close]').remove();
    function permitirCancelamento(fn,razao){cancelar=fn;cancelButton.disabled=!fn||cancelando;motivo.textContent=fn?'':razao||'Este serviço ainda não oferece interrupção segura.';}
    cancelButton.onclick=async()=>{
      if(!cancelar||cancelando||finalizado)return;
      cancelando=true;cancelButton.disabled=true;cancelButton.textContent='Cancelando…';
      iniciarTarefa('Solicitando a interrupção. Aguarde a confirmação.','info');
      try{await cancelar();cancelado=true;controller.abort();await restaurar?.();api.concluir({type:'info',message:'Processo cancelado. Você pode revisar as entradas e tentar novamente.'});}
      catch(error){iniciarTarefa(error?.message||'Não foi possível confirmar o cancelamento.','error');cancelando=false;cancelButton.textContent='Cancelar';permitirCancelamento(cancelar);if(desfechoPendente)api.concluir(desfechoPendente);}
    };
    permitirCancelamento(cancelar);barraReal('tarefa',null);barraReal('geral',null);ocultarTarefa();
    processos.add(bd);bd.dataset.processando = "true";
    let canal=null,canalUrl=null,canalJob=null,referenciaCanal=null,tempoReal=false,versaoEvento=-1;
    function desligarCanal(){canal?.close();canal=null;}
    function mudarRede(){
      if(!navigator.onLine){desligarCanal();canalUrl=null;tempoReal=false;}
      else if(referenciaCanal&&!finalizado)conectarCanal(referenciaCanal);
    }
    window.addEventListener('offline',mudarRede);window.addEventListener('online',mudarRede);
    function encerrarAssinatura(){desligarCanal();window.removeEventListener('offline',mudarRede);window.removeEventListener('online',mudarRede);observarRemocao.disconnect();}
    const observarRemocao=new MutationObserver(()=>{if(!bd.isConnected)encerrarAssinatura();});
    observarRemocao.observe(document.body,{childList:true,subtree:true});
    function conectarCanal(job){
      if(job.id!=null&&String(job.id)!==canalJob){desligarCanal();canalJob=String(job.id);referenciaCanal=null;canalUrl=null;tempoReal=false;versaoEvento=-1;}
      if(!job.eventos_url||!window.EventSource||finalizado||cancelado)return;
      referenciaCanal=job;if(!navigator.onLine)return;
      const url=new URL(job.eventos_url,location.href);
      if(url.origin!==location.origin||url.href===canalUrl)return;
      desligarCanal();canalUrl=url.href;tempoReal=false;versaoEvento=-1;
      const origem=new EventSource(url.href,{withCredentials:true});canal=origem;
      origem.addEventListener('progresso',event=>{
        if(canal!==origem||finalizado||!bd.isConnected)return;
        try{
          const atual=JSON.parse(event.data),versao=Number(event.lastEventId);
          if(String(atual.id)!==String(job.id)||!Number.isFinite(versao)||versao<versaoEvento)return;
          tempoReal=true;if(versao===versaoEvento)return;
          versaoEvento=versao;mostrarAcompanhamento(atual);
          if(['concluido','erro','cancelado'].includes(atual.status)){referenciaCanal=null;desligarCanal();}
        }catch{tempoReal=false;}
      });
      origem.onerror=()=>{if(canal===origem)tempoReal=false;};
    }
    function mostrarAcompanhamento(job){
      if(finalizado||cancelado||cancelando)return;
      const logs=job.logs||job.etapas||[],ultimo=logs.at(-1);
      const message=Object.hasOwn(job,'etapa_atual')?job.etapa_atual:Object.hasOwn(job,'etapa')?job.etapa:ultimo?.nivel==='sucesso'?null:ultimo?.mensagem||ultimo?.message;
      const chave=job.tarefa_id!=null?`${job.id||''}:${job.tarefa_id}`:(ultimo?.sequencia!=null?`${ultimo.sequencia}:${message}`:message);
      if(job.atividade){
        api.atividade({id:chave,nome:job.atividade,detalhe:job.detalhe||message,concluidas:job.concluidas,total:job.total,unidade:job.unidade,percentual:job.progresso_tarefa,geral:job.percentual??job.progresso_geral});
      }else if(message)iniciarTarefa(message,'progress',chave);else{ocultarTarefa();chaveAtual=null;}
      if(!job.atividade){barraReal('geral',job.percentual??job.progresso_geral);barraReal('tarefa',job.progresso_tarefa);}
      if(job.progresso_tarefa===100||['concluido','erro','cancelado'].includes(job.status))ocultarTarefa();
    }
    const api = {
      element:bd,
      signal:controller.signal,
      definirCancelamento(fn,razao){permitirCancelamento(fn,razao);},
      acompanhar(job){
        if(finalizado||cancelado)return;
        conectarCanal(job);
        if(!tempoReal)mostrarAcompanhamento(job);
      },
      /** Contexto fixo no título; atividade, contagem e detalhe vêm de cada execução. */
      atividade({id,nome,detalhe,concluidas,total,unidade='',percentual,geral}={}) {
        if(finalizado||cancelado)return;
        if(!nome){ocultarTarefa();chaveAtual=null;return;}
        iniciarTarefa(detalhe||nome,'progress',id??nome);
        const item=bd.querySelector('[data-progress="tarefa"]');
        item.querySelector('.slt-fb-progress-label > span').textContent=nome;
        const contagem=Number.isFinite(concluidas)&&Number.isFinite(total)&&total>0&&concluidas>=0&&concluidas<=total;
        barraReal('tarefa',contagem?concluidas/total*100:percentual);
        const bar=item.querySelector('[role="progressbar"]');
        bar.setAttribute('aria-label',nome);
        if(contagem){
          const texto=`${concluidas} de ${total}${unidade?' '+unidade:''}`;
          item.querySelector('.slt-fb-percent').textContent=texto;bar.setAttribute('aria-valuetext',texto);
        }else bar.removeAttribute('aria-valuetext');
        if(geral!==undefined)barraReal('geral',geral);
      },
      passo(message, status = "progress") {
        return iniciarTarefa(message,status,Symbol(message));
      },
      atualizar(li, status, message) {
        if (!li || finalizado) return;
        li.className = `slt-fb-step slt-fb-step--${status}`;
        const icone = li.querySelector("i");
        if (icone) icone.className = `fas ${ICONS[status] || ICONS.info}`;
        if (message != null) {
          const span = li.querySelector("span");
          if (span) span.textContent = message;
        }
        if(li===tarefaAtual){
          if(status==='success'||status==='error')ocultarTarefa();
          else if(message!=null)bd.querySelector('.slt-fb-bar--tarefa').setAttribute('aria-label',`Progresso: ${message}`);
        }
      },
      /** Progresso real relatado pelo servidor (percentual + etapa corrente). */
      progresso(percentual, etapaAtual, percentualTarefa) {
        if(finalizado||cancelado)return;
        if(etapaAtual)iniciarTarefa(etapaAtual);
        else if(etapaAtual===null||etapaAtual===''){ocultarTarefa();chaveAtual=null;}
        barraReal('geral',percentual);barraReal('tarefa',percentualTarefa);
        if(percentualTarefa===100)ocultarTarefa();
      },
      progressoTarefa(percentual){if(!finalizado){barraReal('tarefa',percentual);if(percentual===100)ocultarTarefa();}},
      /**
       * Estágio 3. O cabeçalho mantém o título da ação; o status vem pela cor e
       * pelo ícone. O corpo passa a listar os resultados, um por linha
       * (`title` vira a linha de destaque, `message` e `resultados` as demais),
       * e a mensagem da tarefa corrente sai de cena. O log auditável permanece
       * no serviço, sem acumular mensagens no acompanhamento.
       */
      concluir({ type = "success", title: t, message, resultados, acoesHtml } = {}) {
        if (!bd.isConnected || finalizado) return bd;
        if(cancelando&&!cancelado){desfechoPendente={type,title:t,message,resultados,acoesHtml};return bd;}
        encerrarAssinatura();ocultarTarefa();finalizado=true;
        bd.querySelector('[data-progress="tarefa"]').hidden=true;
        if(type==='success'){barraReal('tarefa',100);barraReal('geral',100);}
        processos.delete(bd);
        delete bd.dataset.processando;
        bd.querySelectorAll('.slt-fb-bar.is-indeterminate').forEach(n=>n.closest('.slt-fb-progress-item').querySelector('.slt-fb-percent').textContent='Percentual não informado');
        bd.querySelector('.slt-fb-current-message').hidden=true;
        foot.innerHTML='<button type="button" class="btn btn-primary" data-fb-close>OK</button>';
        modal.className = `slt-fb-modal slt-fb-modal--${type}`;
        const icone = bd.querySelector(".slt-fb-icon i");
        if (icone) icone.className = `fas ${ICONS[type] || ICONS.success}`;
        const res = bd.querySelector(".slt-fb-results");
        res.replaceChildren();
        const lista = [
          ...(t ? [{ message: t, status: type, destaque: true }] : []),
          ...linhas(message, type),
          ...linhas(resultados, type),
        ];
        lista.forEach((l) => addPasso(res, l));
        if (acoesHtml) foot.innerHTML = acoesHtml;
        foot.hidden = false;
        foot.querySelector('[data-fb-close]')?.addEventListener('click',()=>bd.remove());
        if(bd.classList.contains('is-collapsed')){alternar.textContent='Mostrar resultados';foot.prepend(alternar);notify(type,message||t||'Processo finalizado.',title);}
        // A conclusão não rouba o foco da atividade atual.
        return bd;
      },
      fechar() {
        if (!bd.isConnected) return;
        if(!finalizado){if(!bd.classList.contains("is-collapsed"))recolher();}
        else bd.remove();
      },
    };
    return api;
  }

  /** Confirmação opcional, execução e desfecho baseados na resposta da operação. */
  async function acao({ confirmacao, titulo, mensagemInicial, executar, sucesso, acoesHtml, cancelar, restaurar, acompanhamento = false, target }) {
    if (confirmacao && !(await confirmar(confirmacao))) return { ok: false, cancelado: true };
    const monitor=acompanhamento||Boolean(cancelar)||Boolean(acoesHtml);
    const proc = monitor?processo(titulo, {cancelar,restaurar,target}):carregamento(alvo(target)||document.activeElement?.closest('form,section')||document.body,titulo);
    const p = proc.passo(mensagemInicial || "Enviando a solicitação ao servidor…", "progress");
    try {
      const resultado = await executar(proc);
      proc.atualizar(p, "success", "Servidor respondeu com sucesso.");
      const mensagemSucesso=typeof sucesso==='function'?sucesso(resultado):sucesso;
      proc.concluir({
        type: "success",
        resultados: mensagemSucesso,
        acoesHtml,
      });
      if(!monitor)notify('success',mensagemSucesso||'Operação concluída.',titulo);
      return proc.signal.aborted?{ok:false,cancelado:true,proc}:{ ok: true, resultado, proc };
    } catch (erro) {
      proc.atualizar(p, "error", "Não foi possível confirmar a conclusão da operação.");
      proc.concluir({
        type: "error",
        resultados: erro?.message || String(erro),
      });
      return { ok: false, erro };
    }
  }

  global.SLTFeedback = {
    notify,
    campo,limparCampo,validar,contextual,carregamento,
    success: (m, t, o) => notify("success", m, t, o),
    error: (m, t, o) => notify("error", m, t, o),
    warning: (m, t, o) => notify("warning", m, t, o),
    info: (m, t, o) => notify("info", m, t, o),
    confirmar,
    solicitar: options => confirmar({...options, input: options.input || {label: options.label, value: options.value}}),
    processo,
    acao,
    fechar,
  };
})(window);
