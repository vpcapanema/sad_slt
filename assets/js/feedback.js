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
    step: "fa-angle-right",
  };
  const TITULOS = {
    success: "Sucesso", error: "Erro", warning: "Atenção",
    info: "Informação", progress: "Processando", question: "Confirmar ação",
  };
  // Semáforo do processo: amarelo em andamento ou com ressalvas, verde concluído,
  // vermelho interrompido por erro. Interrupção pedida pelo usuário apaga as luzes.
  const SEMAFORO = { progress: "amarelo", warning: "amarelo", success: "verde", error: "vermelho" };
  const SITUACAO = {
    progress: "Em andamento", warning: "Concluído com ressalvas", success: "Concluído",
    error: "Interrompido por erro", info: "Encerrado",
  };
  const semaforoHtml = (type) =>
    `<span class="slt-fb-semaforo" role="img" aria-label="Situação: ${SITUACAO[type] || SITUACAO.info}">` +
    `<i data-luz="vermelho"></i><i data-luz="amarelo"></i><i data-luz="verde"></i></span>`;
  const suavizar = (texto) => String(texto ?? "").replace(/nanotarefas|microtarefas/g, "tarefas")
    .replace(/materializando/gi, "preparando").replace(/persistindo/gi, "salvando");

  /** Linha do log de processo, no formato do SIGMA: hora, ícone do nível e mensagem. */
  function entradaLog(log, status, message, instante) {
    const quando = instante ? new Date(instante) : new Date();
    const data = Number.isNaN(quando.getTime()) ? new Date() : quando;
    const li = document.createElement("li");
    li.className = `slt-fb-step slt-fb-step--${status}`;
    const hora = document.createElement("time");
    hora.className = "slt-fb-time";hora.dateTime = data.toISOString();hora.textContent = data.toLocaleTimeString("pt-BR");
    const icone = document.createElement("i");
    icone.className = `fas ${ICONS[status] || ICONS.info}`;icone.setAttribute("aria-hidden", "true");
    const texto = document.createElement("span");texto.textContent = suavizar(message);
    li.append(hora, icone, texto);
    // Quem rolou para ler o histórico não é arrastado de volta ao fim.
    const noFim = log.scrollHeight - log.scrollTop - log.clientHeight < 24;
    log.append(li);log.hidden = false;
    if (noFim) log.scrollTop = log.scrollHeight;
    return li;
  }

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
    li.innerHTML = `<i class="fas ${ICONS[p.status] || ICONS.info}"></i><span>${esc(suavizar(p.message))}</span>`;
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

  function montar({ type = "info", title, message, steps, resultados, footerHtml, painel = false }) {
    if(!painel){travado = false;fechar();retornoFoco=document.activeElement;overflowAnterior=document.body.style.overflow;}
    const bd = document.createElement("div");
    bd.id = painel ? `slt-feedback-processo-${++contador}` : "slt-feedback-backdrop";
    bd.className = painel ? "slt-fb-process-panel" : "slt-fb-backdrop";
    // Painel de processo no desenho do SIGMA-PLI: cabeçalho com a tarefa atual,
    // passo e semáforo; log escuro com hora por linha; barras no rodapé.
    if (painel) bd.innerHTML = `
      <div class="slt-fb-modal slt-fb-modal--${type}" role="region" aria-labelledby="${bd.id}-titulo" tabindex="-1" data-semaforo="${SEMAFORO[type] || "apagado"}">
        <header class="slt-fb-head">
          <span class="slt-fb-icon"><i class="fas ${type === "progress" ? "fa-gear fa-spin" : ICONS[type] || ICONS.info}" aria-hidden="true"></i></span>
          <div class="slt-fb-head-info">
            <h3 class="slt-fb-title" id="${bd.id}-titulo">${esc(title || TITULOS[type] || "Mensagem")}</h3>
            <span class="slt-fb-current-message" role="status" aria-live="polite">Iniciando…</span>
          </div>
          <span class="slt-fb-step-badge" hidden></span>
          ${semaforoHtml(type)}
          <button type="button" class="slt-fb-close" data-fb-close aria-label="Fechar"><i class="fas fa-xmark"></i></button>
        </header>
        <div class="slt-fb-body">
          <ul class="slt-fb-steps slt-fb-log" role="log" aria-live="off" aria-label="Log do processo"></ul>
          <ul class="slt-fb-results" aria-live="polite" hidden></ul>
        </div>
        <div class="slt-fb-progress" aria-label="Progresso do processamento">
          ${[["tarefa", "Tarefa atual"], ["geral", "Processo geral"]].map(([key, label]) => `<div class="slt-fb-progress-item" data-progress="${key}"><div class="slt-fb-progress-label"><span>${label}</span><strong class="slt-fb-percent">Sem percentual informado</strong></div><div class="slt-fb-bar slt-fb-bar--${key}" role="progressbar" aria-label="${label}" aria-valuemin="0" aria-valuemax="100"><div class="slt-fb-bar-fill"></div></div></div>`).join("")}
        </div>
        <footer class="slt-fb-foot"></footer>
      </div>`;
    else bd.innerHTML = `
      <div class="slt-fb-modal slt-fb-modal--${type}" role="dialog" aria-modal="true" aria-labelledby="${bd.id}-titulo" tabindex="-1">
        <header class="slt-fb-head">
          <span class="slt-fb-icon"><i class="fas ${ICONS[type] || ICONS.info}"></i></span>
          <h3 class="slt-fb-title" id="${bd.id}-titulo">${esc(title || TITULOS[type] || "Mensagem")}</h3>
          <button type="button" class="slt-fb-close" data-fb-close aria-label="Fechar"><i class="fas fa-xmark"></i></button>
        </header>
        <div class="slt-fb-body">
          ${message ? `<p class="slt-fb-message">${esc(message)}</p>` : ""}

          <ul class="slt-fb-results" aria-live="polite" hidden></ul>
          <ul class="slt-fb-steps" role="log" aria-live="polite" aria-relevant="additions" hidden></ul>
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
    node.innerHTML=`<i class="fas ${opts.icon||ICONS[type]||ICONS.info} slt-fb-notice-icon" aria-hidden="true"></i><div role="${type==='error'?'alert':'status'}" aria-atomic="true"><strong>${esc(title||TITULOS[type])}</strong><p>${esc(texto)}</p></div>`;
    let timer,restante=opts.action?0:opts.duration??((type==='info'||type==='success')?7000:0),inicio;
    // Contagem visível do fechamento automático; pausa junto com o temporizador.
    if(restante>0){const contagem=document.createElement('span');contagem.className='slt-fb-notice-timer';contagem.setAttribute('aria-hidden','true');contagem.style.animationDuration=`${restante}ms`;node.append(contagem);node.classList.add('is-paused');}
    const fecharAviso=()=>{clearTimeout(timer);document.removeEventListener('visibilitychange',visibilidade);node.remove();};
    node.fechar=fecharAviso;
    if(opts.action){const acao=document.createElement('button');acao.type='button';acao.textContent=opts.action.label;acao.onclick=async()=>{acao.disabled=true;try{await opts.action.run();fecharAviso();}catch(e){acao.disabled=false;contextual(node,'error',e.message||'Não foi possível concluir a ação.');}};node.append(acao);}
    const fecharBotao=document.createElement('button');fecharBotao.type='button';fecharBotao.className='slt-fb-dismiss';fecharBotao.textContent='×';fecharBotao.setAttribute('aria-label','Dispensar notificação');fecharBotao.onclick=fecharAviso;node.append(fecharBotao);
    const pausar=()=>{node.classList.add('is-paused');if(timer){clearTimeout(timer);timer=null;restante=Math.max(0,restante-(Date.now()-inicio));}};
    const iniciar=()=>{if(!timer&&restante>0&&!document.hidden&&!node.matches(':hover')&&!node.contains(document.activeElement)){inicio=Date.now();timer=setTimeout(fecharAviso,restante);node.classList.remove('is-paused');}};
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

  /** Níveis dos logs do servidor (`sucesso`, `erro`…) no vocabulário do feedback. */
  const NIVEL_LOG = { sucesso: "success", erro: "error", aviso: "warning", atencao: "warning", info: "info" };
  const DESFECHO = {
    success: "Processo concluído.", warning: "Processo concluído com ressalvas.",
    error: "Processo interrompido por erro.", info: "Processo encerrado.",
  };

  /**
   * Acompanhamento não modal no desenho do SIGMA-PLI. Recolher preserva a
   * execução; o cancelamento depende do serviço. O log acumula o histórico
   * da execução, uma linha por evento, e o semáforo mostra a situação.
   */
  function processo(title, { barra = true, cancelar, restaurar, target } = {}) {
    const bd = montar({ type: "progress", title: title || TITULOS.progress, painel:true });
    if(target&&alvo(target)){alvo(target).append(bd);bd.classList.add("slt-fb-process-inline");}
    const modal = bd.querySelector(".slt-fb-modal");
    const log = bd.querySelector(".slt-fb-steps");
    const foot = bd.querySelector(".slt-fb-foot");
    const atual = bd.querySelector(".slt-fb-current-message");
    const badge = bd.querySelector(".slt-fb-step-badge");
    const itemTarefa = bd.querySelector('[data-progress="tarefa"]');
    let tarefaAtual=null,chaveAtual=null;
    const mostrarTarefa=texto=>{atual.textContent=suavizar(texto);};
    function ocultarTarefa(){tarefaAtual=null;itemTarefa.hidden=true;}
    function contarPassos(feitos,total){
      const valido=Number.isFinite(feitos)&&Number.isFinite(total)&&total>0;
      badge.hidden=!valido;badge.textContent=valido?`${feitos}/${total}`:"";
      if(valido)badge.setAttribute("aria-label",`Passo ${feitos} de ${total}`);
    }
    /** Só a tarefa corrente gira; as anteriores ficam marcadas como percorridas. */
    function registrar(status,message,instante){
      if(status==="progress")log.querySelectorAll(".slt-fb-step--progress").forEach(li=>{li.className="slt-fb-step slt-fb-step--step";li.querySelector("i").className=`fas ${ICONS.step}`;});
      return entradaLog(log,status,message,instante);
    }
    function iniciarTarefa(message,status='progress',chave=message){
      if(finalizado||cancelado)return null;
      if(chave===chaveAtual&&tarefaAtual){tarefaAtual.querySelector('span').textContent=suavizar(message);mostrarTarefa(message);return tarefaAtual;}
      chaveAtual=chave;
      // A etapa que o servidor acabou de registrar no log vira a tarefa em curso, sem linha repetida.
      const ultima=log.lastElementChild;
      const repetida=status==='progress'&&ultima&&!ultima.classList.contains('slt-fb-step--success')&&ultima.querySelector('span')?.textContent===suavizar(message);
      if(repetida){log.querySelectorAll('.slt-fb-step--progress').forEach(li=>{if(li!==ultima){li.className='slt-fb-step slt-fb-step--step';li.querySelector('i').className=`fas ${ICONS.step}`;}});ultima.className='slt-fb-step slt-fb-step--progress';ultima.querySelector('i').className=`fas ${ICONS.progress}`;}
      const registro=repetida?ultima:registrar(status,message);
      if(status==='success')return registro;
      mostrarTarefa(message);
      if(status!=='progress'){ocultarTarefa();return registro;}
      // Zerar sem interpolar a barra da tarefa anterior até a próxima.
      const fill=bd.querySelector('.slt-fb-bar--tarefa .slt-fb-bar-fill');
      fill.style.transition='none';barraReal('tarefa',0);void fill.offsetWidth;fill.style.transition='';
      tarefaAtual=registro;itemTarefa.hidden=false;
      bd.querySelector('.slt-fb-bar--tarefa').setAttribute('aria-label',`Progresso: ${message}`);
      itemTarefa.querySelector('.slt-fb-progress-label > span').textContent=message;
      return tarefaAtual;
    }
    function sinalizar(type){
      modal.className=`slt-fb-modal slt-fb-modal--${type}`;
      modal.dataset.semaforo=SEMAFORO[type]||"apagado";
      bd.querySelector(".slt-fb-semaforo").setAttribute("aria-label",`Situação: ${SITUACAO[type]||SITUACAO.info}`);
      const icone=bd.querySelector(".slt-fb-icon i");
      if(icone)icone.className=`fas ${ICONS[type]||ICONS.success}`;
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
    let jobDoLog,ultimaSequencia=0;
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
    /** Cada log do servidor entra uma vez, pela sequência; polling e SSE não duplicam linhas. */
    function registrarLogs(job,logs){
      if(String(job.id??'')!==jobDoLog){jobDoLog=String(job.id??'');ultimaSequencia=0;}
      logs.forEach((entrada,indice)=>{
        const sequencia=Number.isFinite(entrada?.sequencia)?entrada.sequencia:indice+1;
        const mensagem=entrada?.mensagem??entrada?.message;
        if(sequencia<=ultimaSequencia||!mensagem)return;
        ultimaSequencia=sequencia;
        const status=NIVEL_LOG[entrada.nivel]||(ICONS[entrada.nivel]?entrada.nivel:'info');
        // A conclusão da tarefa em curso fecha a própria linha em vez de repetir o texto.
        const span=tarefaAtual?.querySelector('span');
        if(span&&span.textContent===suavizar(mensagem))api.atualizar(tarefaAtual,status);
        else registrar(status,mensagem,entrada.instante);
      });
    }
    function mostrarAcompanhamento(job){
      if(finalizado||cancelado||cancelando)return;
      const logs=job.logs||job.etapas||[];
      registrarLogs(job,logs);
      contarPassos(job.concluidas,job.total);
      const temEtapa=Object.hasOwn(job,'etapa_atual')||Object.hasOwn(job,'etapa');
      const message=Object.hasOwn(job,'etapa_atual')?job.etapa_atual:job.etapa;
      const chave=job.tarefa_id!=null?`${job.id||''}:${job.tarefa_id}`:message;
      if(job.atividade){
        api.atividade({id:chave,nome:job.atividade,detalhe:job.detalhe||message,concluidas:job.concluidas,total:job.total,unidade:job.unidade,percentual:job.progresso_tarefa,geral:job.percentual??job.progresso_geral});
      }else if(temEtapa&&message)iniciarTarefa(message,'progress',chave);
      else{ocultarTarefa();chaveAtual=null;const ultimo=logs.at(-1);mostrarTarefa(ultimo?.mensagem||ultimo?.message||'');}
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
      /** Contexto fixo no título; atividade no log, detalhe e contagem no cabeçalho. */
      atividade({id,nome,detalhe,concluidas,total,unidade='',percentual,geral}={}) {
        if(finalizado||cancelado)return;
        if(!nome){ocultarTarefa();chaveAtual=null;return;}
        iniciarTarefa(nome,'progress',id??nome);
        mostrarTarefa(detalhe||nome);
        const contagem=Number.isFinite(concluidas)&&Number.isFinite(total)&&total>0&&concluidas>=0&&concluidas<=total;
        barraReal('tarefa',contagem?concluidas/total*100:percentual);
        const bar=itemTarefa.querySelector('[role="progressbar"]');
        bar.setAttribute('aria-label',nome);
        if(contagem){
          const texto=`${concluidas} de ${total}${unidade?' '+unidade:''}`;
          itemTarefa.querySelector('.slt-fb-percent').textContent=texto;bar.setAttribute('aria-valuetext',texto);
        }else bar.removeAttribute('aria-valuetext');
        if(geral!==undefined)barraReal('geral',geral);
      },
      /** Tarefa no contrato do SIGMA: nome no cabeçalho e no log, passo no selo. */
      tarefa(nome,passo,total){
        if(finalizado||cancelado)return null;
        contarPassos(passo,total);
        return iniciarTarefa(nome,'progress',nome);
      },
      /** Linha avulsa do log; não troca a tarefa em curso. */
      log(status,message){
        if(finalizado||!message)return null;
        return registrar(ICONS[status]?status:'info',message);
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
          if (span) span.textContent = suavizar(message);
        }
        if(li===tarefaAtual){
          if(status==='success'||status==='error'){ocultarTarefa();if(message!=null)mostrarTarefa(message);}
          else if(message!=null){mostrarTarefa(message);bd.querySelector('.slt-fb-bar--tarefa').setAttribute('aria-label',`Progresso: ${message}`);}
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
      progressoGeral(percentual){if(!finalizado)barraReal('geral',percentual);},
      progressoTarefa(percentual){if(!finalizado){barraReal('tarefa',percentual);if(percentual===100)ocultarTarefa();}},
      /**
       * Estágio 3. O cabeçalho mantém o título da ação; o semáforo, o ícone e a
       * última linha do log dão o desfecho. Abaixo do log, os resultados, um por
       * linha (`title` vira a linha de destaque, `message` e `resultados` as demais).
       */
      concluir({ type = "success", title: t, message, resultados, acoesHtml } = {}) {
        if (!bd.isConnected || finalizado) return bd;
        if(cancelando&&!cancelado){desfechoPendente={type,title:t,message,resultados,acoesHtml};return bd;}
        encerrarAssinatura();ocultarTarefa();
        // O servidor confirmou o fim: o que ainda girava terminou junto.
        log.querySelectorAll('.slt-fb-step--progress').forEach(li=>api.atualizar(li,type==='success'?'success':'step'));
        finalizado=true;
        if(type==='success'){barraReal('tarefa',100);barraReal('geral',100);}
        processos.delete(bd);
        delete bd.dataset.processando;
        bd.querySelectorAll('.slt-fb-bar.is-indeterminate').forEach(n=>n.closest('.slt-fb-progress-item').querySelector('.slt-fb-percent').textContent='Percentual não informado');
        sinalizar(type);
        mostrarTarefa(SITUACAO[type]||SITUACAO.info);
        entradaLog(log,ICONS[type]?type:'info',t||DESFECHO[type]||DESFECHO.info);
        foot.innerHTML='<button type="button" class="btn btn-primary" data-fb-close>OK</button>';
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

  /*
   * Contrato do SIGMA-PLI sobre o feedback do SICARD. Código escrito para o
   * SIGMA (`ProcessFeedbackV2`, `ProcessFeedback`, `Notify`) funciona aqui sem
   * alteração e aparece com o painel, as cores e o semáforo do SICARD.
   * Eventos SSE/NDJSON aceitos, um JSON por linha:
   *   {"type":"task","name":"...","step":1,"total":5}
   *   {"type":"log","level":"info|success|warning|error|step","msg":"..."}
   *   {"type":"progress","pct":45}
   *   {"type":"done","data":{...}}
   *   {"type":"error","message":"...","details":"..."}
   * Diferença deliberada: o SICARD não recarrega a página no sucesso, a menos
   * que `reloadOnSuccess: true` seja pedido; o painel fica com o desfecho.
   */
  const NIVEL_SIGMA = { info: "info", success: "success", warning: "warning", error: "error", task: "progress", step: "step" };
  let procSigma = null, opcoesSigma = {}, fonteSigma = null;
  const desligarSigma = () => { fonteSigma?.close(); fonteSigma = null; };
  function eventoSigma(bruto) {
    const texto = String(bruto || "").replace(/^data:\s*/, "").trim();
    if (!texto) return;
    let evt;
    try { evt = JSON.parse(texto); } catch { return; }
    if (!evt || typeof evt !== "object") return;
    switch (evt.type) {
      case "task": ProcessFeedbackV2.task(evt.name, evt.step, evt.total); break;
      case "log": ProcessFeedbackV2.log(evt.level || "info", evt.msg || evt.message || ""); break;
      case "progress": ProcessFeedbackV2.progress(evt.pct ?? evt.percent ?? 0); break;
      case "done": ProcessFeedbackV2.success(evt.data || {}); break;
      case "error": ProcessFeedbackV2.error(evt); break;
    }
  }
  const ProcessFeedbackV2 = {
    open(opts = {}) {
      desligarSigma();
      procSigma?.element.remove();
      procSigma = processo(opts.title || TITULOS.progress, { cancelar: opts.cancelar });
      opcoesSigma = opts;
      return ProcessFeedbackV2;
    },
    close() { desligarSigma(); procSigma?.element.remove(); procSigma = null; },
    task(name, step, total) { procSigma?.tarefa(name || "", step, total); },
    log(level, message) {
      if (level === "task") procSigma?.tarefa(message);
      else procSigma?.log(NIVEL_SIGMA[level] || "info", message);
    },
    progress(pct) { procSigma?.progressoGeral(Number(pct)); },
    success(data = {}) {
      const proc = procSigma, opts = opcoesSigma;
      desligarSigma();
      proc?.concluir({ type: "success", message: data.message || "Processo concluído com sucesso." });
      if (typeof opts.onSuccess === "function") opts.onSuccess(data);
      else if (opts.reloadOnSuccess === true) setTimeout(() => location.reload(), 700);
    },
    error(data = {}) {
      const proc = procSigma, opts = opcoesSigma;
      desligarSigma();
      proc?.concluir({ type: "error", message: data.message || "Erro no processo.", resultados: data.details ? [String(data.details)] : [] });
      if (typeof opts.onError === "function") opts.onError(data);
      else if (opts.reloadOnError === true) setTimeout(() => location.reload(), 1500);
    },
    start(url, opts = {}) {
      ProcessFeedbackV2.open(opts);
      if (!window.EventSource) { ProcessFeedbackV2.error({ message: "O navegador não oferece acompanhamento em tempo real." }); return ProcessFeedbackV2; }
      const fonte = new EventSource(url, { withCredentials: true });
      fonteSigma = fonte;
      fonte.onmessage = (e) => { if (fonteSigma === fonte) eventoSigma(e.data); };
      fonte.onerror = () => { if (fonteSigma === fonte) { desligarSigma(); ProcessFeedbackV2.error({ message: "A conexão com o servidor foi interrompida." }); } };
      return ProcessFeedbackV2;
    },
    async connectStream(response) {
      if (!response || !response.ok) { ProcessFeedbackV2.error({ message: `Erro HTTP ${response?.status ?? "desconhecido"}.` }); return; }
      const leitor = response.body.getReader(), decodificador = new TextDecoder();
      let resto = "";
      try {
        while (true) {
          const { done, value } = await leitor.read();
          if (done) break;
          resto += decodificador.decode(value, { stream: true });
          const partes = resto.split("\n");
          resto = partes.pop();
          partes.forEach((linha) => eventoSigma(linha));
        }
        eventoSigma(resto);
      } catch {
        ProcessFeedbackV2.error({ message: "Erro ao ler resposta do servidor." });
      }
    },
  };
  // Assinatura legada do SIGMA: start(título, mensagem) abre em modo manual.
  const ProcessFeedback = {
    start(tituloOuUrl, mensagemOuOpcoes) {
      if (typeof mensagemOuOpcoes === "string") {
        ProcessFeedbackV2.open({ title: tituloOuUrl, reloadOnSuccess: false });
        if (mensagemOuOpcoes) ProcessFeedbackV2.log("info", mensagemOuOpcoes);
      } else ProcessFeedbackV2.start(tituloOuUrl, mensagemOuOpcoes || {});
    },
    success(tituloOuDados, mensagem) {
      ProcessFeedbackV2.success(typeof tituloOuDados === "string" ? { message: mensagem || tituloOuDados } : tituloOuDados || {});
    },
    error(dados) { ProcessFeedbackV2.error(typeof dados === "string" ? { message: dados } : dados || {}); },
    erro(dados) { this.error(dados); },
    log: (...args) => ProcessFeedbackV2.log(...args),
    progress: (...args) => ProcessFeedbackV2.progress(...args),
    task: (...args) => ProcessFeedbackV2.task(...args),
    open: (...args) => ProcessFeedbackV2.open(...args),
    close: () => ProcessFeedbackV2.close(),
  };
  // Notify do SIGMA recebe (título, mensagem); o SLTFeedback, (mensagem, título).
  const Notify = {
    show({ type = "info", title, message, duration } = {}) {
      const carregando = type === "loading";
      const tipo = carregando ? "info" : ICONS[type] ? type : "info";
      const opcoes = { ...(duration != null ? { duration } : {}), ...(carregando ? { duration: 0, icon: ICONS.progress } : {}) };
      const node = notify(tipo, message || title || "", message ? title : undefined, opcoes);
      return { element: node, close: () => node?.fechar?.() };
    },
    success: (title, message, opts = {}) => Notify.show({ ...opts, type: "success", title, message }),
    error: (title, message, opts = {}) => Notify.show({ ...opts, type: "error", title, message }),
    warning: (title, message, opts = {}) => Notify.show({ ...opts, type: "warning", title, message }),
    info: (title, message, opts = {}) => Notify.show({ ...opts, type: "info", title, message }),
    loading: (title, message, opts = {}) => Notify.show({ ...opts, type: "loading", title, message }),
    clearAll() { raiz().querySelectorAll(".slt-fb-notice").forEach((n) => (n.fechar ? n.fechar() : n.remove())); },
  };
  global.ProcessFeedbackV2 ??= ProcessFeedbackV2;
  global.ProcessFeedback ??= ProcessFeedback;
  global.Notify ??= Notify;
})(window);
