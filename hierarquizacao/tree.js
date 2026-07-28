(function () {
  "use strict";
  const tree = document.querySelector(".ranking-tree");
  const svg = tree?.querySelector(".tree-links");
  const pathsHost = svg?.querySelector(".tree-links-paths");
  const SVG_NS = "http://www.w3.org/2000/svg";
  const STORAGE_KEY = "sicard:hierarquizacao:tree-layout:v1";

  const edges = [
    ["node-insumos","node-gerador-risco"],
    ["node-gerador-risco","node-camada-fase1"],
    ["node-rodadas","node-objetos-iniciais"],
    ["node-camada-fase1","node-fase1"],
    ["node-objetos-iniciais","node-fase1"],
    ["node-fase1","node-objetos-fase1"],

    ["node-insumos","node-gerador-favorabilidade"],
    ["node-ahp","node-gerador-favorabilidade"],
    ["node-gerador-favorabilidade","node-camada-fase2"],
    ["node-camada-fase2","node-fase2"],
    ["node-objetos-fase1","node-fase2"],
    ["node-fase2","node-objetos-fase2"],

    ["node-objetos-fase2","node-fase3"],
    ["node-ajuste","node-fase3"],
    ["node-fase3","node-ranking"]
  ];

  function label(element){return element.querySelector("strong")?.textContent.trim()||element.id}
  function points(source,target,treeRect){
    const a=source.getBoundingClientRect(),b=target.getBoundingClientRect();
    const upward=(a.top+a.height/2)>(b.top+b.height/2);
    return{
      sx:a.left+a.width/2-treeRect.left+tree.scrollLeft,
      sy:(upward?a.top:a.bottom)-treeRect.top+tree.scrollTop,
      tx:b.left+b.width/2-treeRect.left+tree.scrollLeft,
      ty:(upward?b.bottom:b.top)-treeRect.top+tree.scrollTop,
      upward
    };
  }

  function draw(){
    if(!tree||!svg||!pathsHost)return;
    const rect=tree.getBoundingClientRect(),width=tree.scrollWidth,height=tree.scrollHeight;
    svg.setAttribute("viewBox",`0 0 ${width} ${height}`);
    svg.setAttribute("width",width);svg.setAttribute("height",height);
    svg.style.width=`${width}px`;svg.style.height=`${height}px`;
    pathsHost.replaceChildren();
    edges.forEach(([from,to])=>{
      const source=document.getElementById(from),target=document.getElementById(to);
      if(!source||!target)return;
      const p=points(source,target,rect),distance=Math.abs(p.ty-p.sy),bend=Math.max(28,distance*.46);
      const c1=p.sy+(p.upward?-bend:bend),c2=p.ty+(p.upward?bend:-bend);
      const path=document.createElementNS(SVG_NS,"path");
      path.setAttribute("class","tree-link");
      path.setAttribute("d",`M ${p.sx} ${p.sy} C ${p.sx} ${c1}, ${p.tx} ${c2}, ${p.tx} ${p.ty}`);
      path.dataset.source=from;path.dataset.target=to;
      const title=document.createElementNS(SVG_NS,"title");
      title.textContent=`${label(source)} → ${label(target)}`;
      path.appendChild(title);pathsHost.appendChild(path);
    });
  }

  function readLayout(){
    try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||"{}")}catch(_error){return{}}
  }

  function saveLayout(){
    const layout={};
    tree.querySelectorAll('[id^="node-"]').forEach(node=>{
      const x=Number(node.dataset.offsetX)||0,y=Number(node.dataset.offsetY)||0;
      if(x||y)layout[node.id]={x,y};
    });
    localStorage.setItem(STORAGE_KEY,JSON.stringify(layout));
  }

  function positionNode(node,x,y){
    node.dataset.offsetX=String(Math.round(x));
    node.dataset.offsetY=String(Math.round(y));
    node.style.transform=`translate(${Math.round(x)}px, ${Math.round(y)}px)`;
  }

  function restoreLayout(){
    const layout=readLayout();
    tree.querySelectorAll('[id^="node-"]').forEach(node=>{
      const saved=layout[node.id];
      positionNode(node,saved?.x||0,saved?.y||0);
    });
  }

  function enableDragging(node){
    let drag=null,moved=false;
    node.addEventListener("pointerdown",event=>{
      if(event.button!==0||event.target.closest("nav a"))return;
      drag={
        pointerId:event.pointerId,
        startX:event.clientX,startY:event.clientY,
        originX:Number(node.dataset.offsetX)||0,
        originY:Number(node.dataset.offsetY)||0
      };
      moved=false;
      node.setPointerCapture(event.pointerId);
      node.classList.add("is-dragging");
    });
    node.addEventListener("pointermove",event=>{
      if(!drag||event.pointerId!==drag.pointerId)return;
      const dx=event.clientX-drag.startX,dy=event.clientY-drag.startY;
      if(!moved&&Math.hypot(dx,dy)<4)return;
      moved=true;
      event.preventDefault();
      positionNode(node,drag.originX+dx,drag.originY+dy);
      window.requestAnimationFrame(draw);
    });
    const finish=event=>{
      if(!drag||event.pointerId!==drag.pointerId)return;
      if(node.hasPointerCapture(event.pointerId))node.releasePointerCapture(event.pointerId);
      node.classList.remove("is-dragging");
      if(moved){saveLayout();draw()}
      drag=null;
    };
    node.addEventListener("pointerup",finish);
    node.addEventListener("pointercancel",finish);
    node.addEventListener("click",event=>{
      if(moved){event.preventDefault();event.stopPropagation();moved=false}
    });
  }

  restoreLayout();
  tree?.querySelectorAll('[id^="node-"]').forEach(enableDragging);
  document.getElementById("tree-reset-layout")?.addEventListener("click",()=>{
    localStorage.removeItem(STORAGE_KEY);
    tree.querySelectorAll('[id^="node-"]').forEach(node=>positionNode(node,0,0));
    draw();
  });

  window.addEventListener("load",()=>{restoreLayout();draw()},{once:true});
  window.addEventListener("resize",draw);
  window.requestAnimationFrame(draw);
})();
