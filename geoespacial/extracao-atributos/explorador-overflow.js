// Coordenadas do viewport, inclusive quando um ancestral transforma o bloco fixo.
export function posicionarMenu(menu, anchor) {
  if(menu.hidden)return;
  const margin=8,gap=6,rect=anchor.getBoundingClientRect();
  Object.assign(menu.style,{position:'fixed',right:'auto',bottom:'auto',transform:'none',
    maxWidth:`${innerWidth-margin*2}px`,maxHeight:`${innerHeight-margin*2}px`,overflow:'auto',
    left:'0px',top:'0px'});
  const origin=menu.getBoundingClientRect(),width=origin.width,height=origin.height;
  const left=Math.max(margin,Math.min(rect.left,innerWidth-width-margin));
  const below=innerHeight-margin-rect.bottom-gap,above=rect.top-gap-margin;
  const down=height<=below||below>=above;
  const available=Math.max(0,down?below:above);
  menu.style.maxHeight=`${available}px`;
  const visibleHeight=menu.getBoundingClientRect().height;
  const top=down?rect.bottom+gap:rect.top-gap-visibleHeight;
  menu.style.left=`${left-origin.left}px`;
  menu.style.top=`${top-origin.top}px`;
}

// Texto completo pelo Notify existente, sem HTML e sem alterar ações de seleção.
export function ativarTextoCompleto(root) {
  const seletor='.explorer-cell-value,.ea-storage-entry-name,.ea-storage-entry-path,.ea-storage-entry-size,.ea-storage-entry > span:not(.ea-storage-entry-title):not(.ea-storage-entry-open),.ea-storage-entry small,.ea-storage-details-head > span,.ea-storage-analysis-details th,.ea-storage-tree-open,.ea-storage-path button,.geo-explorer-primary > span,.geo-explorer-name > small,.geo-explorer-table th,#explorer-details dd,.storage-pastas-item > span,.storage-pastas-destino strong,.storage-pastas-trilha button';
  let atual,toast;
  function mostrar(event) {
    const target=event.target.closest?.(seletor)||event.target.querySelector?.(seletor);
    if(!target||!root.contains(target)||target.scrollWidth<=target.clientWidth||atual===target)return;
    if(atual)atual.removeAttribute('aria-describedby');
    toast?.remove();
    atual=target;
    toast=window.Notify?.info('Valor completo',target.textContent,{duration:0,showProgress:false});
    if(toast?.element){
      const rect=target.getBoundingClientRect();
      (target.closest('dialog')||document.body).append(toast.element);
      // Mesma cor herdada do .ea-tool-dialog (Nome); no seletor de pastas ela vinha do diálogo hospedeiro.
      Object.assign(toast.element.style,{position:'fixed',width:'min(400px, calc(100vw - 32px))',color:'#243447',
        left:`${Math.max(16,Math.min(innerWidth-416,rect.right+8))}px`,
        top:`${Math.max(16,Math.min(innerHeight*.4,rect.bottom+8))}px`,zIndex:'200001',pointerEvents:'none'});
      toast.element.tabIndex=0;
      const close=toast.element.querySelector('.notification-close');
      if(close)close.style.pointerEvents='auto';
      toast.element.style.maxHeight='60vh';toast.element.style.overflow='auto';
      const message=toast.element.querySelector('.notification-message');
      if(message){message.style.whiteSpace='pre-wrap';message.style.overflowWrap='anywhere';}
      toast.element.id=`explorer-texto-${crypto.randomUUID()}`;
      target.setAttribute('aria-describedby',toast.element.id);
    }
  }
  root.addEventListener('mouseover',mostrar);
  root.addEventListener('focusin',mostrar);
  root.addEventListener('focusout',event=>{
    if(event.target===atual&&!toast?.element.contains(event.relatedTarget)){atual.removeAttribute('aria-describedby');atual=null;toast?.remove();toast=null;}
  });
  function preparar(node){
    if(!(node instanceof Element))return;
    const targets=[...(node.matches(seletor)?[node]:[]),...node.querySelectorAll(seletor)];
    targets.forEach(target=>{
      if(target.title&&!target.hasAttribute('aria-description'))target.setAttribute('aria-description',target.title);
      target.removeAttribute('title');
      target.closest('.ea-storage-entry,.geo-explorer-name')?.removeAttribute('title');
      if(!target.closest('button,a')&&!target.hasAttribute('tabindex'))target.tabIndex=0;
    });
  }
  const observer=new MutationObserver(mutations=>{
    for(const mutation of mutations)for(const node of mutation.addedNodes)preparar(node);
    if(atual&&!root.contains(atual)){atual=null;toast?.remove();toast=null;}
  });
  observer.observe(root,{childList:true,subtree:true});
  root.addEventListener('close',()=>{toast?.remove();toast=null;atual=null;});
  preparar(root);
  return ()=>{toast?.remove();observer.disconnect();};
}
