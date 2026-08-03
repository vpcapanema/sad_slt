(function () {
  "use strict";
  const API = "/api/geoespacial";
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const editors = new Map();
  const RASTER_RESULTS = new Set(["OP-08","OP-10","OP-11","OP-12","OP-13","OP-14","OP-16","OP-17","OP-20","OP-21","OP-26","OP-39","OP-40","OP-41","OP-42","OP-43"]);
  let activeId = "mapa", counter = { function: 0, flow: 0 };

  async function request(path, options = {}) {
    const response = await fetch(`${API}${path}`, {headers:{"Content-Type":"application/json",...(options.headers||{})},...options});
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.detail || `HTTP ${response.status}`);
    return body;
  }
  function icons(){ window.lucide?.createIcons({attrs:{"stroke-width":1.7}}); }
  function uid(prefix){ return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2,7)}`; }
  function operationCatalog(){
    const rows = $$("#gp-toolbox [data-op]").map(row => ({id:row.dataset.op,name:row.querySelector(".tool-name")?.textContent||row.dataset.op}));
    return [...new Map(rows.map(row => [row.id,row])).values()].sort((a,b)=>a.name.localeCompare(b.name,"pt-BR"));
  }
  function displayName(kind,ref,fallback=""){
    if(kind==="algorithm")return operationCatalog().find(item=>item.id===ref)?.name||fallback||"Algoritmo";
    if(kind==="function")return (window.gpApp.state.functions||[]).find(item=>item.id===ref)?.nome||fallback||"Função";
    return fallback||ref;
  }
  function activate(id){
    activeId=id; $$('[data-document-tab]').forEach(tab=>tab.classList.toggle("active",tab.dataset.documentTab===id));
    $("#gp-map").hidden=id!=="mapa"; $(".gp-map-tools").hidden=id!=="mapa"; $("#gp-modeler-host").hidden=id==="mapa";
    $$(".gp-model-document").forEach(view=>view.hidden=view.dataset.modelDocument!==id);
    if(id!=="mapa"){ const editor=editors.get(id); render(editor); setModelRibbon(); showModelPanels(); updateModelRibbon(); }
    else { hideModelPanels(); restoreRibbon(); closeModelMenu(); }
  }
  function setModelRibbon(){
    const modelTab=$('[data-ribbon="modelo"]'); if(modelTab&&!modelTab.classList.contains("active")) modelTab.click();
  }
  function restoreRibbon(){document.dispatchEvent(new Event("gp-modeler-state"));}
  function showModelPanels(){
    const tab=$('[data-model-panel="properties"]'); if(!tab)return;
    tab.hidden=false;
    tab.click();
  }
  function hideModelPanels(){
    $$('[data-model-panel]').forEach(tab=>{tab.hidden=true;tab.classList.remove("active");tab.setAttribute("aria-selected","false");});
    $$('[data-model-view]').forEach(view=>view.classList.remove("active"));
  }
  function showModelPanel(panel){
    const tab=$(`[data-model-panel="${panel}"]`),view=$(`[data-model-view="${panel}"]`); if(!tab||!view)return;
    tab.hidden=false;
    $$("[data-right-tab]").forEach(item=>{const active=item===tab;item.classList.toggle("active",active);item.setAttribute("aria-selected",String(active));});
    $$(".gp-right-view").forEach(item=>item.classList.toggle("active",item===view));
    $(".gp-app").classList.remove("right-collapsed");
  }
  function hasActiveEditor(){return Boolean(activeEditor());}
  function activeEditor(){return activeId!=="mapa"?editors.get(activeId):null;}
  function updateModelRibbon(){
    const editor=activeEditor(),state={
      "model-save":Boolean(editor&&!editor.busy&&editor.dirty),
      "model-validate":Boolean(editor&&!editor.busy&&editor.nodes.length),
      "model-run":Boolean(editor&&!editor.busy&&editor.definitionId&&!editor.dirty&&editor.validated),
      "model-input":Boolean(editor&&!editor.busy),
      "model-variable":Boolean(editor&&!editor.busy),
      "model-iterator":Boolean(editor&&!editor.busy&&!editor.nodes.some(node=>node.kind==="iterator")),
      "model-algorithm":Boolean(editor&&!editor.busy),
      "model-function":Boolean(editor&&!editor.busy&&(window.gpApp.state.functions||[]).length),
      "model-output":Boolean(editor&&!editor.busy),
      "model-connect":Boolean(editor&&!editor.busy&&editor.nodes.length>1),
      "model-fit":Boolean(editor&&!editor.busy&&editor.nodes.length),
      "model-layout":Boolean(editor&&!editor.busy&&editor.nodes.length>1),
      "model-duplicate":Boolean(editor&&!editor.busy&&editor.selected&&!editor.nodes.find(n=>n.id===editor.selected&&["input","output","iterator"].includes(n.kind))),
      "model-delete":Boolean(editor&&!editor.busy&&(editor.selected||editor.selectedEdge)),
    };
    $$('[data-model-command]').forEach(button=>{
      const enabled=Boolean(state[button.dataset.modelCommand]);
      button.disabled=!enabled;
      button.setAttribute("aria-disabled",String(!enabled));
      button.classList.toggle("active-tool",Boolean(editor?.connectionMode&&button.dataset.modelCommand==="model-connect"));
    });
  }
  async function handleModelCommand(command){
    const editor=activeEditor(); if(!editor)return;
    if(command==="model-save")return runWithFeedback(editor,"save");
    if(command==="model-validate")return runWithFeedback(editor,"validate");
    if(command==="model-run")return runWithFeedback(editor,"run");
    if(command==="model-input")return addNode(editor,"input","entrada","Entrada",70,100+editor.nodes.length*30);
    if(command==="model-output")return addNode(editor,"output","saida","Saída",600,100+editor.nodes.length*30);
    if(command==="model-connect"){
      editor.connectionMode=!editor.connectionMode; editor.connectSource=null;
      const canvas=$(`[data-model-document="${editor.id}"] .model-canvas`);
      canvas?.classList.toggle("connect-mode",editor.connectionMode);
      updateModelRibbon();
      if(editor.connectionMode)notify("Clique no elemento de origem e depois no elemento de destino.");
      return;
    }
    if(command==="model-fit")return fitCanvas(editor);
    if(command==="model-layout")return autoLayout(editor);
    if(command==="model-duplicate")return duplicateSelection(editor);
    if(command==="model-delete")return deleteSelection(editor);
  }
  function titleFor(type){ counter[type]++; return `${type==="function"?"Função":"Fluxo"} ${counter[type]}`; }
  function open(type, existing=null, seed=null, draft=null){
    const id=uid(type), title=existing?.nome||draft?.nome||titleFor(type);
    const editor={id,type,title,description:existing?.descricao||draft?.descricao||"",definitionId:existing?.id||null,nodes:[],edges:[],selected:null,selectedEdge:null,dirty:!existing,busy:false,validated:false,connectionMode:false,connecting:null,connectSource:null};
    if(existing?.diagrama){ editor.nodes=structuredClone(existing.diagrama.nos||[]);editor.nodes.forEach(node=>{if(["algorithm","function"].includes(node.kind))node.label=displayName(node.kind,node.ref,node.label)}); editor.edges=structuredClone(existing.diagrama.conexoes||[]); }
    else hydrateLegacy(editor,existing,seed);
    editors.set(id,editor);
    $("#gp-document-tabs").insertAdjacentHTML("beforeend",`<button data-document-tab="${id}"><i data-lucide="${type==="function"?"blocks":"workflow"}"></i><span>${esc(title)}</span><i data-close-model="${id}" data-lucide="x"></i></button>`);
    $("#gp-modeler-host").insertAdjacentHTML("beforeend",documentShell(editor));
    bindEditor(editor); activate(id); document.dispatchEvent(new Event("gp-modeler-state")); icons();
  }
  function showCreateForm(type,seed=null){
    const isFunction=type==="function",kindLabel=isFunction?"função":"fluxo",tab=$('[data-right-tab="tools"]');
    $(".gp-app").classList.remove("right-collapsed");tab.hidden=false;tab.click();
    $("#gp-right-title").textContent=`Nova ${kindLabel}`;$("#gp-tools-view").classList.remove("active");$("#gp-editor-view").classList.add("active");
    $("#gp-editor-view").innerHTML=`<div class="editor-head"><button type="button" class="icon-btn" data-create-back title="Voltar"><i data-lucide="arrow-left"></i></button><h2>Nova ${kindLabel}</h2></div><form id="gp-model-create-form"><div class="editor-body"><div class="field"><label class="required-label" for="gp-model-name">Nome</label><input id="gp-model-name" name="nome" placeholder="Ex.: ${isFunction?"Preparar áreas de análise":"Fluxo de priorização territorial"}" required autofocus></div><div class="field"><label for="gp-model-description">Descrição</label><textarea id="gp-model-description" name="descricao" placeholder="Ex.: ${isFunction?"Prepara e valida as camadas utilizadas pela análise.":"Encadeia as etapas da análise territorial."}"></textarea></div></div><div class="editor-actions"><button class="btn primary">Abrir</button></div></form>`;
    $("[data-create-back]").onclick=()=>window.gpApp.showTools();
    $("#gp-model-create-form").onsubmit=event=>{event.preventDefault();const data=Object.fromEntries(new FormData(event.target)),name=data.nome.trim();if(!name)return;open(type,null,seed,{nome:name,descricao:data.descricao.trim()});icons()};icons();
  }
  function hydrateLegacy(editor,existing,seed){
    const items=existing?(editor.type==="function"?existing.passos:existing.itens):seed?[{algoritmo_id:seed,parametros:{}}]:[];
    const input={id:uid("node"),kind:"input",ref:"entrada",label:"Entrada",x:45,y:150,params:{}},output={id:uid("node"),kind:"output",ref:"saida",label:"Saída",x:500+items.length*210,y:150,params:{}};
    editor.nodes.push(input);let previous=items.length?input:null;
    items.forEach((item,index)=>{const kind=item.funcao_id?"function":"algorithm",ref=item.funcao_id||item.algoritmo_id,node={id:uid("node"),kind,ref,label:displayName(kind,ref),x:240+index*310,y:150,params:item.parametros||{}};editor.nodes.push(node);editor.edges.push({id:uid("edge"),from:previous.id,to:node.id});previous=node;if(index<items.length-1){const variable={id:uid("node"),kind:"variable",ref:`variavel_${index+1}`,label:`Saída de ${displayName(kind,ref)}`,x:445+index*310,y:235,params:{tipo:"dados",valor:""}};editor.nodes.push(variable);editor.edges.push({id:uid("edge"),from:node.id,to:variable.id});previous=variable}});
    editor.nodes.push(output);if(previous)editor.edges.push({id:uid("edge"),from:previous.id,to:output.id});
    editor.edges.forEach(edge=>{const source=editor.nodes.find(node=>node.id===edge.from),target=editor.nodes.find(node=>node.id===edge.to);if(!source||!target||!(["algorithm","function"].includes(target.kind)))return;const reference=referenceFor(source),matching=Object.entries(target.params||{}).find(([,value])=>value===reference);if(matching){edge.parameter=matching[0];return;}if(!["input","variable","iterator"].includes(source.kind))return;const parameter=connectionParameter(editor,target,source);if(parameter){edge.parameter=parameter;if(!target.params)target.params={};if(!target.params[parameter])target.params[parameter]=reference;}});
  }
  function documentShell(editor){ return `<section class="gp-model-document" data-model-document="${editor.id}"><main class="model-canvas-wrap"><div class="model-canvas" tabindex="0"><svg class="model-links" aria-label="Conectores do modelo"><defs><marker id="arrow-${editor.id}" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z"/></marker></defs><g></g></svg><div class="model-nodes"></div><div class="model-hint">Use os botões da barra Editor para adicionar entradas, variáveis, iteradores, algoritmos, funções e saídas. Conecte as saídas dos algoritmos às próximas etapas.</div></div></main></section>`; }
  function palette(){}
  function paletteRow(){return "";}
  const MENU_ITEMS={
    variable:()=>[{kind:"variable",ref:"variavel_dados",label:"Variável de dados",icon:"circle-dot"},{kind:"variable",ref:"variavel_valor",label:"Variável de valor",icon:"whole-word"}],
    iterator:()=>[{kind:"iterator",ref:"vector_layers",label:"Iterar camadas vetoriais",icon:"repeat-2"},{kind:"iterator",ref:"raster_layers",label:"Iterar rasters",icon:"repeat-2"},{kind:"iterator",ref:"features",label:"Iterar feições",icon:"repeat-2"},{kind:"iterator",ref:"values",label:"Iterar valores",icon:"repeat-2"}],
    algorithm:()=>operationCatalog().map(op=>({kind:"algorithm",ref:op.id,label:op.name,icon:"settings-2"})),
    function:()=>(window.gpApp.state.functions||[]).map(fn=>({kind:"function",ref:fn.id,label:fn.nome,icon:"blocks"})),
  };
  const MENU_EMPTY={variable:"Sem tipos de variável disponíveis.",iterator:"Sem iteradores disponíveis.",algorithm:"Nenhum algoritmo carregado no catálogo.",function:"Nenhuma função customizada foi salva ainda."};
  function closeModelMenu(){
    document.querySelectorAll(".model-menu").forEach(menu=>menu.remove());
    document.querySelectorAll('[data-model-menu][aria-expanded="true"]').forEach(button=>button.setAttribute("aria-expanded","false"));
  }
  function positionModelMenu(menu,anchor){
    const rect=anchor.getBoundingClientRect(),width=menu.offsetWidth||230,viewport=document.documentElement.clientWidth;
    const left=Math.max(6,Math.min(rect.left,viewport-width-8));
    menu.style.top=`${Math.round(rect.bottom+2)}px`;
    menu.style.left=`${Math.round(left)}px`;
  }
  function toggleModelMenu(kind,anchor){
    const editor=activeEditor(); if(!editor)return;
    const alreadyOpen=Boolean(document.querySelector(`.model-menu[data-menu-kind="${kind}"]`));
    closeModelMenu();
    if(alreadyOpen)return;
    const items=MENU_ITEMS[kind]?.()||[];
    const menu=document.createElement("div");
    menu.className="model-menu"; menu.dataset.menuKind=kind;
    const needSearch=items.length>8;
    const listHtml=items.length
      ? items.map(item=>`<button type="button" data-menu-item='${esc(JSON.stringify(item))}'><i data-lucide="${item.icon}"></i><span>${esc(item.label)}</span></button>`).join("")
      : `<div class="model-menu-empty">${esc(MENU_EMPTY[kind]||"Sem opções disponíveis.")}</div>`;
    menu.innerHTML=(needSearch?`<div class="model-menu-search"><input placeholder="Filtrar…" aria-label="Filtrar opções"></div>`:"")+`<div class="model-menu-list">${listHtml}</div>`;
    document.body.append(menu);
    positionModelMenu(menu,anchor);
    anchor.setAttribute("aria-expanded","true");
    icons();
    if(needSearch){
      const input=menu.querySelector(".model-menu-search input");
      input.addEventListener("input",()=>{
        const term=input.value.toLocaleLowerCase("pt-BR");
        menu.querySelectorAll("[data-menu-item]").forEach(button=>{
          const label=JSON.parse(button.dataset.menuItem).label;
          button.hidden=term && !label.toLocaleLowerCase("pt-BR").includes(term);
        });
      });
      setTimeout(()=>input.focus(),0);
    }
    menu.addEventListener("click",event=>{
      const button=event.target.closest("[data-menu-item]"); if(!button)return;
      const item=JSON.parse(button.dataset.menuItem);
      closeModelMenu();
      try{
        const canvas=$(`[data-model-document="${editor.id}"] .model-canvas`);
        const scrollLeft=canvas?.scrollLeft||0, scrollTop=canvas?.scrollTop||0;
        addNode(editor,item.kind,item.ref,item.label,240+scrollLeft,150+scrollTop);
      } catch(error){ notify(error.message); }
    });
  }
  function findFreePosition(editor,x,y){
    const nodeW=184,nodeH=104,marginX=20,marginY=20;
    const overlaps=(cx,cy)=>editor.nodes.some(n=>Math.abs(n.x-cx)<nodeW+marginX && Math.abs(n.y-cy)<nodeH+marginY);
    let cx=x,cy=y,attempts=0;
    while(overlaps(cx,cy) && attempts<50){
      cx+=nodeW+marginX*2;
      if(cx>1600){ cx=x; cy+=nodeH+marginY*2; }
      attempts++;
    }
    return { x:cx, y:cy };
  }
  function modelTips(type){
    const isFn=type==="function";
    const title=isFn?"Como construir uma Função":"Como construir um Fluxo";
    const intro=isFn
      ?"Uma <strong>função</strong> encapsula um único algoritmo (ou pequena cadeia deles) com um contrato claro de entradas e saída. Fica reutilizável na SIRCADI Toolbox."
      :"Um <strong>fluxo</strong> encadeia funções salvas e algoritmos em uma sequência de etapas. Cada etapa alimenta a próxima pelas conexões.";
    const steps=isFn?[
      "<strong>Entrada.</strong> Clique em <em>Entrada</em> na faixa Editor e escolha, no painel de propriedades, a camada do Painel de Conteúdo que servirá de valor.",
      "<strong>(Opcional) Iterador.</strong> Adicione <em>Iterador</em> se a função precisar processar cada camada/feição/valor em ciclo. Só cabe um por função.",
      "<strong>Algoritmo.</strong> Adicione <em>Algoritmo</em> pela faixa Editor e escolha a operação (ex.: OP-37 Calcular Área). A conexão automática já preenche o parâmetro de camada compatível.",
      "<strong>Conexões.</strong> Se precisar ajustar, ative <em>Conectar</em> e arraste da porta direita para a porta esquerda. O rótulo da aresta mostra qual parâmetro está sendo alimentado.",
      "<strong>Parâmetros obrigatórios.</strong> No painel de propriedades preencha CRS, Destino, Formato e Nome da saída do algoritmo — sem eles a validação falha.",
      "<strong>Saída.</strong> Adicione <em>Saída</em> e conecte o algoritmo a ela. Ajuste Nome/CRS/Destino/Formato da saída.",
      "<strong>Salvar → Validar → Executar.</strong> Use a faixa Editor. Salvar persiste na Toolbox; Validar checa o contrato; Executar roda com o valor da entrada.",
    ]:[
      "<strong>Entrada.</strong> Clique em <em>Entrada</em> e escolha a camada de partida no painel de propriedades.",
      "<strong>Etapas.</strong> Adicione <em>Função</em> (para reaproveitar uma função salva) e/ou <em>Algoritmo</em>, na ordem em que devem executar.",
      "<strong>Encadear.</strong> Conecte a saída de cada etapa à entrada da próxima. A conexão preenche o parâmetro compatível automaticamente; use a aresta para inspecionar o mapeamento.",
      "<strong>Mapear saídas.</strong> Se uma etapa gera resultado a ser reutilizado, ligue-a a uma <em>Variável</em>; o nome dela vira <code>$variavel</code> nos parâmetros seguintes.",
      "<strong>Saída final.</strong> Adicione <em>Saída</em> ao fim e conecte a última etapa a ela. Preencha CRS, Destino e Formato.",
      "<strong>Salvar → Validar → Executar.</strong> Salvar publica o fluxo na Toolbox; Validar consulta o servidor; Executar processa etapa por etapa e atualiza o Painel de Conteúdo.",
    ];
    const hotkeys="<strong>Atalhos:</strong> <kbd>Del</kbd>/<kbd>Backspace</kbd> apaga nó ou aresta selecionada · <kbd>Ctrl</kbd>+<kbd>D</kbd> duplica · <kbd>Esc</kbd> limpa seleção · clique numa aresta para selecioná-la.";
    return `<details class="model-tips" open><summary><i data-lucide="lightbulb"></i><span>${title}</span></summary><p class="model-tips-intro">${intro}</p><ol class="model-tips-steps">${steps.map(step=>`<li>${step}</li>`).join("")}</ol><p class="model-tips-hotkeys">${hotkeys}</p></details>`;
  }
  function addNode(editor,kind,ref,label,x=240,y=150){
    if(kind==="iterator"&&editor.nodes.some(n=>n.kind==="iterator")) throw new Error("Cada função ou fluxo aceita somente um iterador.");
    const pos=findFreePosition(editor,x,y); x=pos.x; y=pos.y;
    const sequence=base=>{let index=editor.nodes.filter(node=>node.kind===kind).length+1,candidate=index===1?base:`${base}_${index}`;while(editor.nodes.some(node=>node.ref===candidate)){index+=1;candidate=`${base}_${index}`}return candidate};
    const variableRef=kind==="variable"?sequence("variavel"):kind==="input"?sequence("entrada"):ref;
    const defaults={};if(kind==="algorithm")(window.gpApp.operationFields?.[ref]||[]).forEach(([key,,,value])=>{if(value!==undefined&&!Array.isArray(value))defaults[key]=value});
    const iteratorVariable={vector_layers:"camada_atual",raster_layers:"raster_atual",features:"feicao_atual",values:"valor_atual"}[ref]||"item_atual";
    const node={id:uid("node"),kind,ref:variableRef,label,x,y,params:kind==="iterator"?{fonte:"",variavel:iteratorVariable}:kind==="variable"?{tipo:ref==="variavel_valor"?"valor":"dados",valor:""}:defaults}; editor.nodes.push(node);
    if(["algorithm","function"].includes(kind)){
      const iterator=editor.nodes.find(n=>n.kind==="iterator");
      if(iterator){
        const parameter=connectionParameter(editor,node,iterator);
        if(parameter && !node.params[parameter]){ node.params[parameter]=referenceFor(iterator); editor.edges.push({id:uid("edge"),from:iterator.id,to:node.id,parameter}); }
      }
    }
    editor.selected=node.id; editor.dirty=true; editor.validated=false; render(editor); return node;
  }
  function render(editor){
    const view=$(`[data-model-document="${editor.id}"]`); if(!view)return;
    view.querySelector(".model-nodes").innerHTML=editor.nodes.map(node=>`<article class="model-node ${node.kind} ${editor.selected===node.id?"selected":""}" data-node="${node.id}" style="transform:translate(${node.x}px,${node.y}px)"><button class="node-port input" data-port="input" title="Entrada"></button><div class="node-icon"><i data-lucide="${node.kind==="iterator"?"repeat-2":node.kind==="function"?"blocks":node.kind==="input"?"log-in":node.kind==="output"?"log-out":node.kind==="variable"?"circle-dot":"settings-2"}"></i></div><strong>${esc(displayName(node.kind,node.ref,node.label))}</strong><small>${esc(elementClass(node))}</small><button class="node-port output" data-port="output" title="Saída"></button></article>`).join("");
    drawEdges(editor); inspector(editor); icons(); updateModelRibbon();
  }
  function kindLabel(kind){return {iterator:"Iterador",function:"Função",input:"Variável de entrada",output:"Variável de saída",variable:"Variável"}[kind]||kind;}
  function elementClass(node){if(node.kind==="algorithm")return window.gpApp.operationLibraries?.[node.ref]||"Biblioteca Python";return {function:"Função",iterator:"Iterador",input:"Variável de entrada",output:"Saída",variable:node.params.tipo==="valor"?"Variável de valor":"Variável de dados"}[node.kind]||"Elemento";}
  function drawEdges(editor){
    const view=$(`[data-model-document="${editor.id}"]`),group=view.querySelector(".model-links g");
    group.innerHTML=editor.edges.map(edge=>{const a=editor.nodes.find(n=>n.id===edge.from),b=editor.nodes.find(n=>n.id===edge.to);if(!a||!b)return"";const x1=a.x+184,y1=a.y+47,x2=b.x,y2=b.y+47,m=(x1+x2)/2,selected=editor.selectedEdge===edge.id?" selected":"";return `<path data-edge="${edge.id}" class="edge-hit${selected}" d="M${x1},${y1} C${m},${y1} ${m},${y2} ${x2},${y2}" stroke-width="12" stroke="transparent" fill="none"/><path data-edge-visible="${edge.id}" class="edge-visible${selected}" d="M${x1},${y1} C${m},${y1} ${m},${y2} ${x2},${y2}" marker-end="url(#arrow-${editor.id})"/><text x="${m}" y="${(y1+y2)/2-5}">${esc(edge.parameter||"")}</text>`}).join("");
  }
  function iteratorKind(editor){return editor.nodes.find(node=>node.kind==="iterator")?.ref||"vector_layers";}
  function inputLayers(editor){const iterator=iteratorKind(editor);return (window.gpApp.state.layers||[]).filter(layer=>{const raster=String(layer.tipo||"").toLowerCase().includes("raster");return iterator==="raster_layers"?raster:iterator==="vector_layers"||iterator==="features"?!raster:true});}
  function connectedVariables(editor,node){
    const available=[],seen=new Set(),queue=editor.edges.filter(edge=>edge.to===node.id).map(edge=>edge.from);
    while(queue.length){const id=queue.shift();if(seen.has(id))continue;seen.add(id);const item=editor.nodes.find(candidate=>candidate.id===id);if(!item)continue;if(["input","variable"].includes(item.kind))available.push(item);if(item.kind==="iterator")available.push({id:`${item.id}-item`,kind:"variable",ref:item.params.variavel||"item",label:`Item de ${item.label}`,params:{tipo:"dados"}});editor.edges.filter(edge=>edge.to===id).forEach(edge=>queue.push(edge.from));}
    return [...new Map(available.map(item=>[item.ref,item])).values()];
  }
  function renameReference(editor,node,next){
    const normalized=String(next||"").trim().replace(/[^a-zA-Z0-9_]/g,"_").replace(/^\d/,"_$&");
    if(!normalized||editor.nodes.some(item=>item.id!==node.id&&item.ref===normalized))return false;
    const previous=`$${node.ref}`,replacement=`$${normalized}`;editor.nodes.forEach(item=>{Object.keys(item.params||{}).forEach(key=>{if(item.params[key]===previous)item.params[key]=replacement})});node.ref=normalized;return true;
  }
  function iteratorInputs(editor,node){
    const inputs=editor.nodes.filter(item=>item.kind==="input");
    const connected=editor.edges.filter(edge=>edge.to===node.id).map(edge=>inputs.find(item=>item.id===edge.from)).filter(Boolean);
    return {inputs,connected};
  }
  function iteratorSource(editor,node){
    const {inputs,connected}=iteratorInputs(editor,node),current=inputs.find(item=>`$${item.ref}`===node.params.fonte);
    const selected=connected[0]||current||null;
    if(selected)node.params.fonte=`$${selected.ref}`;
    else node.params.fonte="";
    return {inputs,selected};
  }
  function setIteratorSource(editor,node,value){
    const input=editor.nodes.find(item=>item.kind==="input"&&`$${item.ref}`===value);
    const inputIds=new Set(editor.nodes.filter(item=>item.kind==="input").map(item=>item.id));
    editor.edges=editor.edges.filter(edge=>edge.to!==node.id||!inputIds.has(edge.from));
    node.params.fonte=input?`$${input.ref}`:"";
    if(input)editor.edges.push({id:uid("edge"),from:input.id,to:node.id,parameter:"fonte"});
  }
  function sourceProcess(editor,node){let current=node,guard=0;while(current&&guard++<editor.nodes.length){const edge=editor.edges.find(item=>item.to===current.id);current=editor.nodes.find(item=>item.id===edge?.from);if(current&&["algorithm","function"].includes(current.kind))return current}return null;}
  function contractFields(editor,node){
    if(node.kind==="algorithm")return window.gpApp.operationFields?.[node.ref]||[];
    if(node.kind==="function"){const fn=(window.gpApp.state.functions||[]).find(item=>item.id===node.ref);return (fn?.parametros_expostos||[]).map(item=>[item.chave,item.nome||item.chave,item.tipo_entrada||item.tipo||"text",item.opcoes]);}
    return [];
  }
  function connectionParameter(editor,node,sourceNode=null){
    const fields=contractFields(editor,node); if(!fields.length)return "";
    const isFilled=value=>value!==""&&value!==undefined&&value!==null&&!(Array.isArray(value)&&!value.length);
    const available=fields.filter(([key])=>!isFilled(node.params?.[key]));
    const pool=available.length?available:fields;
    const HINTS={vector_layers:/camada|vetorial|feature|feicao|entrada|layer/i,raster_layers:/raster|matricial|entrada|layer/i,features:/feicao|geometria|feature|camada/i,values:/valor|param|numero|number|numeric|threshold|limiar/i};
    let hint=/camada|raster|entrada|layer/i;
    if(sourceNode?.kind==="iterator") hint=HINTS[sourceNode.ref]||hint;
    else if(sourceNode?.kind==="variable"&&sourceNode.params?.tipo==="valor") hint=HINTS.values;
    const match=pool.find(([key])=>hint.test(key));
    return (match||pool[0])[0];
  }
  function referenceFor(sourceNode){
    if(sourceNode.kind==="iterator") return `$${sourceNode.params?.variavel||"item_atual"}`;
    return `$${sourceNode.ref}`;
  }
  function contractControl(editor,node,field){
    const [key,label,type,setting]=field,value=node.params?.[key]??(Array.isArray(setting)?"":setting??""),variables=connectedVariables(editor,node),variableOptions=variables.map(item=>`<option value="$${esc(item.ref)}" ${String(value)===`$${item.ref}`?"selected":""}>Saída anterior: ${esc(item.label)} ($${esc(item.ref)})</option>`).join("");
    if(type==="check")return `<label class="field-check model-contract-field"><input type="checkbox" data-contract-param="${esc(key)}" ${value?"checked":""}> ${esc(label)}</label>`;
    if(type==="layer"||type==="layers"){const layers=window.gpApp.state.layers||[];return `<div class="field model-contract-field"><label>${esc(label)}</label><select data-contract-param="${esc(key)}" ${type==="layers"?"multiple size=5":""}><option value="">Selecione uma entrada…</option>${variableOptions}${layers.map(layer=>`<option value="${esc(layer.id)}" ${value===layer.id?"selected":""}>Painel de Conteúdo: ${esc(layer.nome)}</option>`).join("")}</select></div>`;}
    if(type==="select")return `<div class="field model-contract-field"><label>${esc(label)}</label><select data-contract-param="${esc(key)}"><option value="">Selecione…</option>${variableOptions}${(setting||[]).map(option=>`<option value="${esc(option)}" ${String(value)===String(option)?"selected":""}>${esc(option)}</option>`).join("")}</select></div>`;
    const listId=`vars-${node.id}-${key}`;return `<div class="field model-contract-field"><label>${esc(label)}</label><input data-contract-param="${esc(key)}" type="${type==="number"?"number":"text"}" value="${esc(value)}" list="${listId}" placeholder="Ex.: ${type==="number"?"100 ou $valor_anterior":"$saida_anterior ou texto"}"><datalist id="${listId}">${variables.map(item=>`<option value="$${esc(item.ref)}">${esc(item.label)}</option>`).join("")}</datalist></div>`;
  }
  function inspector(editor){
    const body=$("#gp-model-properties-view .model-inspector-body"),node=editor.nodes.find(n=>n.id===editor.selected);
    if(!node){body.innerHTML=`<div class="field"><label>Nome</label><input data-model-name value="${esc(editor.title)}"></div><div class="field"><label>Descrição</label><textarea data-model-description>${esc(editor.description)}</textarea></div>${modelTips(editor.type)}<p class="field-help">Selecione um elemento para editar suas propriedades.</p>`;return;}
    if(node.kind==="input"){
      const layers=inputLayers(editor),iterator=iteratorKind(editor),multiple=["vector_layers","raster_layers"].includes(iterator),selected=Array.isArray(node.params.valor)?node.params.valor:[node.params.valor];body.innerHTML=`<div class="field"><label>Nome do elemento</label><input data-node-label value="${esc(node.label)}"></div><div class="field"><label>Chave da entrada</label><input data-input-ref value="${esc(node.ref)}" placeholder="Ex.: camada_entrada"></div>${iterator==="values"?`<div class="field"><label>Valor da entrada</label><input data-system-values value="${esc(JSON.stringify(node.params.valor||[]))}" placeholder='Ex.: [10, 20, 30]'></div>`:`<div class="field"><label>Valor da entrada</label><select data-system-input ${multiple?'multiple size="6"':""}><option value="">Selecione no Painel de Conteúdo…</option>${layers.map(layer=>`<option value="${esc(layer.id)}" ${selected.includes(layer.id)?"selected":""}>${esc(layer.nome)}</option>`).join("")}</select></div>`}<p class="field-help">Os parâmetros posteriores usam esta entrada como <code>$${esc(node.ref)}</code>. Tipo aceito: ${iterator==="raster_layers"?"um ou mais rasters":iterator==="features"?"uma camada vetorial cujas feições serão iteradas":iterator==="values"?"uma lista de valores":"uma ou mais camadas vetoriais"}.</p><button class="btn danger" data-delete-node>Excluir elemento</button>`;return;
    }
    if(node.kind==="output"){
      const raster=RASTER_RESULTS.has(sourceProcess(editor,node)?.ref);body.innerHTML=`<div class="field"><label>Nome do elemento</label><input data-node-label value="${esc(node.label)}"></div><div class="field"><label>Nome da saída</label><input data-output-field="nome_saida" value="${esc(node.params.nome_saida||editor.title)}" placeholder="Ex.: resultado_final"></div><div class="field"><label>CRS</label><select data-output-field="crs_saida"><option value="entrada">Da camada de entrada</option><option value="EPSG:4674">EPSG:4674 (SIRGAS 2000)</option><option value="EPSG:4326">EPSG:4326 (WGS 84)</option><option value="EPSG:3857">EPSG:3857 (WGS 84 / Pseudo-Mercator)</option></select></div><div class="field"><label>Destino</label><select data-output-field="destino"><option value="memoria">Memória</option><option value="storage">Storage</option></select></div><div class="field"><label>Formato</label><select data-output-field="formato_saida">${(raster?["JSON","GeoTIFF"]:["GeoJSON","GeoPackage","Shapefile"]).map(format=>`<option value="${format}">${format}</option>`).join("")}</select></div><button class="btn danger" data-delete-node>Excluir elemento</button>`;return;
    }
    const parameterRows=Object.entries(node.params||{}).filter(([key])=>node.kind!=="iterator"||!["fonte","variavel"].includes(key)).map(([key,value],index)=>parameterRow(key,value,index)).join("");
    const variables=editor.nodes.filter(item=>["input","variable","output"].includes(item.kind)&&item.id!==node.id),variableSource=node.kind==="variable"?sourceProcess(editor,node):null;
    const iteratorData=node.kind==="iterator"?iteratorSource(editor,node):null;
    const currentItem=node.kind==="iterator"?(node.params.variavel||"item_atual"):"";
    const contracts=contractFields(editor,node);body.innerHTML=`<div class="field"><label>Nome do elemento</label><input data-node-label value="${esc(displayName(node.kind,node.ref,node.label))}" placeholder="Ex.: Camada validada"></div>${node.kind==="variable"?`<div class="field"><label>Chave da variável</label><input data-variable-ref value="${esc(node.ref)}" placeholder="Ex.: camada_validada"></div><div class="field"><label>Tipo da variável</label><select data-variable-type><option value="dados" ${node.params.tipo==="dados"?"selected":""}>Dados ou camada</option><option value="valor" ${node.params.tipo==="valor"?"selected":""}>Valor ou parâmetro</option></select></div>${variableSource?`<div class="field"><label>Origem do valor</label><input value="Saída de ${esc(displayName(variableSource.kind,variableSource.ref,variableSource.label))}" readonly></div><p class="field-help">O valor será preenchido durante a execução pelo elemento conectado.</p>`:`<div class="field"><label>Valor inicial</label><input data-variable-value value="${esc(node.params.valor||"")}" list="variable-values-${node.id}" placeholder="Ex.: $entrada, 100 ou texto"><datalist id="variable-values-${node.id}">${connectedVariables(editor,node).map(item=>`<option value="$${esc(item.ref)}">${esc(item.label)}</option>`).join("")}</datalist></div>`}`:""}${node.kind==="iterator"?`<div class="field"><label>Entrada que será percorrida</label><select data-iterator-source><option value="">Conecte ou selecione uma Entrada…</option>${iteratorData.inputs.map(input=>`<option value="$${esc(input.ref)}" ${iteratorData.selected?.id===input.id?"selected":""}>${esc(input.label)} — $${esc(input.ref)}</option>`).join("")}</select></div><p class="field-help">Esta é a coleção completa que o iterador percorrerá.</p><div class="field"><label>Nome do item atual</label><input data-iterator-variable value="${esc(currentItem)}" placeholder="Ex.: feicao_atual"></div><p class="field-help">Em cada repetição, <code>$${esc(currentItem)}</code> representa somente o item atual da Entrada. Use essa variável nos parâmetros dos algoritmos seguintes.</p>`:""}${["algorithm","function"].includes(node.kind)?`<section class="model-parameters"><div class="model-parameters-title"><strong>Parâmetros</strong></div>${contracts.map(field=>contractControl(editor,node,field)).join("")||'<p class="field-help">Esta função não possui parâmetros expostos.</p>'}<p class="field-help">Cada campo aceita um valor direto ou uma variável realmente disponível antes deste elemento.</p></section>`:""}<button class="btn danger" data-delete-node>Excluir elemento</button>`;
  }
  function parameterRow(key,value,index){const shown=typeof value==="string"?value:JSON.stringify(value);return `<div class="model-parameter-row" data-parameter-row="${index}"><div class="field"><label>Nome do campo</label><input data-parameter-key value="${esc(key)}" placeholder="Ex.: camada_id"></div><div class="field"><label>Valor</label><input data-parameter-value value="${esc(shown)}" placeholder="Ex.: $entrada, 100 ou true"></div><button type="button" class="icon-btn danger" data-remove-parameter title="Remover parâmetro"><i data-lucide="x"></i></button></div>`;}
  function syncParameters(editor,scope){
    const node=editor.nodes.find(item=>item.id===editor.selected);if(!node)return;
    const preserved=node.kind==="iterator"?{fonte:node.params.fonte||"$camadas",variavel:node.params.variavel||"item"}:{};
    (scope||document).querySelectorAll("[data-parameter-row]").forEach(row=>{const key=row.querySelector("[data-parameter-key]").value.trim(),raw=row.querySelector("[data-parameter-value]").value.trim();if(!key)return;let value=raw;if(/^(true|false|null|-?\d+(\.\d+)?)$/.test(raw)){try{value=JSON.parse(raw)}catch{value=raw}}preserved[key]=value});
    node.params=preserved;editor.dirty=true;
  }
  function deleteSelection(editor){
    if(editor.selected){editor.nodes=editor.nodes.filter(n=>n.id!==editor.selected);editor.edges=editor.edges.filter(e=>e.from!==editor.selected&&e.to!==editor.selected);editor.selected=null;editor.dirty=true;editor.validated=false;render(editor);return true;}
    if(editor.selectedEdge){const edge=editor.edges.find(e=>e.id===editor.selectedEdge);if(edge){const target=editor.nodes.find(n=>n.id===edge.to);if(target&&edge.parameter&&target.params?.[edge.parameter])target.params[edge.parameter]="";}editor.edges=editor.edges.filter(e=>e.id!==editor.selectedEdge);editor.selectedEdge=null;editor.dirty=true;editor.validated=false;render(editor);return true;}
    return false;
  }
  function duplicateSelection(editor){
    if(!editor.selected)return null;
    const src=editor.nodes.find(n=>n.id===editor.selected);if(!src||["input","output","iterator"].includes(src.kind)&&editor.nodes.filter(n=>n.kind===src.kind).length&&src.kind==="iterator")return null;
    const clone=structuredClone(src);clone.id=uid("node");clone.x=src.x+40;clone.y=src.y+40;
    if(["input","variable"].includes(clone.kind)){let i=2,base=clone.ref.replace(/_\d+$/,"");while(editor.nodes.some(n=>n.ref===`${base}_${i}`))i+=1;clone.ref=`${base}_${i}`;}
    editor.nodes.push(clone);editor.selected=clone.id;editor.selectedEdge=null;editor.dirty=true;editor.validated=false;render(editor);return clone;
  }
  function fitCanvas(editor){
    const view=$(`[data-model-document="${editor.id}"]`),canvas=view?.querySelector(".model-canvas");if(!canvas||!editor.nodes.length)return;
    const bounds=editor.nodes.reduce((acc,node)=>({minX:Math.min(acc.minX,node.x),minY:Math.min(acc.minY,node.y),maxX:Math.max(acc.maxX,node.x+184),maxY:Math.max(acc.maxY,node.y+94)}),{minX:Infinity,minY:Infinity,maxX:-Infinity,maxY:-Infinity});
    const cx=(bounds.minX+bounds.maxX)/2,cy=(bounds.minY+bounds.maxY)/2;
    canvas.scrollLeft=Math.max(0,cx-canvas.clientWidth/2);
    canvas.scrollTop=Math.max(0,cy-canvas.clientHeight/2);
  }
  function autoLayout(editor){
    try{const ordered=topological(editor);const columns=new Map();let maxCol=0;const inputs=editor.nodes.filter(n=>n.kind==="input");inputs.forEach(n=>columns.set(n.id,0));
      ordered.forEach(node=>{const preds=editor.edges.filter(e=>e.to===node.id).map(e=>columns.get(e.from)??0);const col=preds.length?Math.max(...preds)+1:1;columns.set(node.id,col);maxCol=Math.max(maxCol,col)});
      const outputs=editor.nodes.filter(n=>n.kind==="output");outputs.forEach(n=>{const preds=editor.edges.filter(e=>e.to===n.id).map(e=>columns.get(e.from)??0);columns.set(n.id,preds.length?Math.max(...preds)+1:maxCol+1);maxCol=Math.max(maxCol,columns.get(n.id))});
      editor.nodes.forEach(n=>{if(!columns.has(n.id))columns.set(n.id,0)});
      const byCol=new Map();editor.nodes.forEach(n=>{const c=columns.get(n.id);if(!byCol.has(c))byCol.set(c,[]);byCol.get(c).push(n)});
      const colWidth=240,rowHeight=140,startX=60,startY=80;
      byCol.forEach((nodes,col)=>{nodes.forEach((n,idx)=>{n.x=startX+col*colWidth;n.y=startY+idx*rowHeight})});
      editor.dirty=true;render(editor);
    }catch(error){notify(error.message)}
  }
  function selectEdge(editor,edgeId){editor.selectedEdge=edgeId;editor.selected=null;render(editor);}
  function openContextMenu(editor,x,y,target){
    document.querySelector(".model-context-menu")?.remove();
    const items=target==="node"
      ?[["Renomear","pencil",()=>{showModelPanel("properties");setTimeout(()=>$("#gp-model-properties-view [data-node-label]")?.focus(),40)}],["Duplicar","copy",()=>duplicateSelection(editor)],null,["Excluir","trash-2",()=>deleteSelection(editor)]]
      :[["Excluir conexão","trash-2",()=>deleteSelection(editor)]];
    const menu=document.createElement("div");menu.className="model-context-menu";
    menu.innerHTML=items.map(item=>item===null?"<hr>":`<button type="button" data-ctx-action><i data-lucide="${item[1]}"></i><span>${esc(item[0])}</span></button>`).join("");
    const actions=items.filter(i=>i!==null).map(i=>i[2]);
    document.body.append(menu);
    const rect=menu.getBoundingClientRect(),vw=innerWidth,vh=innerHeight;
    menu.style.left=`${Math.min(x,vw-rect.width-6)}px`;
    menu.style.top=`${Math.min(y,vh-rect.height-6)}px`;
    icons();
    menu.querySelectorAll("[data-ctx-action]").forEach((button,index)=>{button.onclick=()=>{menu.remove();actions[index]?.()}});
  }
  function isFormField(el){return el&&(el.matches?.("input,textarea,select")||el.isContentEditable);}
  function handleInspectorInput(editor,event){
    if(!event.target.matches("[data-model-search]"))editor.validated=false;
    updateModelRibbon();
    if(event.target.matches("[data-model-search]"))return;
    const node=editor.nodes.find(n=>n.id===editor.selected);
    if(event.target.matches("[data-model-name]")){editor.title=event.target.value;updateTab(editor);editor.dirty=true;return;}
    if(event.target.matches("[data-model-description]")){editor.description=event.target.value;editor.dirty=true;return;}
    if(!node)return;
    if(event.target.matches("[data-node-label]")){node.label=event.target.value;const view=$(`[data-model-document="${editor.id}"]`);const title=view?.querySelector(`[data-node="${node.id}"] strong`);if(title)title.textContent=node.label;editor.dirty=true;return;}
    if(event.target.matches("[data-input-ref],[data-variable-ref]")){const valid=renameReference(editor,node,event.target.value);event.target.setCustomValidity(valid?"":"Use uma chave única, sem espaços ou caracteres especiais.");editor.dirty=true;return;}
    if(event.target.matches("[data-system-input]")){node.params.valor=event.target.multiple?[...event.target.selectedOptions].map(o=>o.value):event.target.value;editor.dirty=true;return;}
    if(event.target.matches("[data-system-values]")){try{node.params.valor=JSON.parse(event.target.value||"[]");event.target.setCustomValidity("")}catch{event.target.setCustomValidity("Informe uma lista JSON válida")}editor.dirty=true;return;}
    if(event.target.matches("[data-output-field]")){node.params[event.target.dataset.outputField]=event.target.value;editor.dirty=true;return;}
    if(event.target.matches("[data-contract-param]")){const key=event.target.dataset.contractParam;if(event.target.type==="checkbox")node.params[key]=event.target.checked;else if(event.target.multiple)node.params[key]=[...event.target.selectedOptions].map(o=>o.value);else node.params[key]=event.target.type==="number"&&event.target.value!==""?Number(event.target.value):event.target.value;editor.dirty=true;return;}
    if(event.target.matches("[data-variable-type]")){node.params.tipo=event.target.value;editor.dirty=true;return;}
    if(event.target.matches("[data-variable-value]")){node.params.valor=event.target.value;editor.dirty=true;return;}
    if(event.target.matches("[data-iterator-source]")){setIteratorSource(editor,node,event.target.value);drawEdges(editor);editor.dirty=true;return;}
    if(event.target.matches("[data-iterator-variable]")){const previous=`$${node.params.variavel||"item"}`,next=event.target.value.trim().replace(/[^a-zA-Z0-9_]/g,"_")||"item";editor.nodes.forEach(item=>Object.keys(item.params||{}).forEach(key=>{if(item.params[key]===previous)item.params[key]=`$${next}`}));node.params.variavel=next;editor.dirty=true;return;}
    if(event.target.matches("[data-parameter-key],[data-parameter-value]")){syncParameters(editor);editor.dirty=true;return;}
  }
  function handleInspectorChange(editor,event){
    if(event.target.matches("[data-insert-variable]")&&event.target.value){const inspector=$("#gp-model-properties-view");const empty=[...inspector.querySelectorAll("[data-parameter-value]")].find(input=>!input.value);if(empty){empty.value=event.target.value;empty.dispatchEvent(new Event("input",{bubbles:true}))}else notify("Adicione um parâmetro e selecione a variável novamente.");event.target.value=""}
  }
  async function handleInspectorClick(editor,event){
    try{
      if(event.target.closest("[data-add-parameter]")){syncParameters(editor);const node=editor.nodes.find(item=>item.id===editor.selected);if(!node)return;node.params[`campo_${Object.keys(node.params).length+1}`]="";editor.dirty=true;render(editor);return;}
      if(event.target.closest("[data-remove-parameter]")){const row=event.target.closest("[data-parameter-row]"),key=row?.querySelector("[data-parameter-key]")?.value;const node=editor.nodes.find(item=>item.id===editor.selected);if(node&&key){delete node.params[key];editor.dirty=true;render(editor)}return;}
      if(event.target.closest("[data-delete-node]")){deleteSelection(editor);return;}
    }catch(error){notify(error.message)}
  }
  function bindEditor(editor){
    const view=$(`[data-model-document="${editor.id}"]`),canvas=view.querySelector(".model-canvas");
    view.addEventListener("dragstart",event=>{const row=event.target.closest("[data-palette-kind]");if(row)event.dataTransfer.setData("application/json",JSON.stringify(row.dataset));});
    canvas.ondragover=event=>event.preventDefault();
    canvas.ondrop=event=>{event.preventDefault();let data;try{data=JSON.parse(event.dataTransfer.getData("application/json")||"{}")}catch{return}if(!data.paletteKind)return;const rect=canvas.getBoundingClientRect();try{addNode(editor,data.paletteKind,data.paletteRef,data.paletteLabel,event.clientX-rect.left+canvas.scrollLeft,event.clientY-rect.top+canvas.scrollTop)}catch(error){notify(error.message)}};
    canvas.addEventListener("click",event=>{
      const edgePath=event.target.closest("[data-edge]");
      if(edgePath){event.stopPropagation();selectEdge(editor,edgePath.dataset.edge);return;}
      if(event.target===canvas||event.target.classList.contains("model-nodes")||event.target.classList.contains("model-hint")){editor.selected=null;editor.selectedEdge=null;render(editor);}
    });
    view.addEventListener("pointerdown",event=>{
      const article=event.target.closest("[data-node]");if(!article)return;
      const node=editor.nodes.find(n=>n.id===article.dataset.node);editor.selected=node.id;editor.selectedEdge=null;
      if(editor.connectionMode){if(!editor.connectSource){editor.connectSource=node.id;notify("Origem escolhida. Agora clique no elemento que receberá a conexão.");render(editor);return}editor.connecting=editor.connectSource;editor.connectSource=null;editor.connectionMode=false;canvas.classList.remove("connect-mode");updateModelRibbon();event.preventDefault();return}
      if(event.target.matches('[data-port="output"]')||event.target.closest('[data-port="output"]')){editor.connecting=node.id;event.preventDefault();return}
      if(!event.target.matches(".node-port")&&!event.target.closest(".node-port")){const rect=canvas.getBoundingClientRect();editor.drag={node,x:event.clientX-rect.left+canvas.scrollLeft-node.x,y:event.clientY-rect.top+canvas.scrollTop-node.y};article.classList.add("dragging");try{article.setPointerCapture(event.pointerId)}catch{}}
      render(editor);
    });
    view.addEventListener("pointermove",event=>{if(!editor.drag)return;const rect=canvas.getBoundingClientRect();editor.drag.node.x=Math.max(10,event.clientX-rect.left+canvas.scrollLeft-editor.drag.x);editor.drag.node.y=Math.max(10,event.clientY-rect.top+canvas.scrollTop-editor.drag.y);editor.dirty=true;const element=view.querySelector(`[data-node="${editor.drag.node.id}"]`);if(element)element.style.transform=`translate(${editor.drag.node.x}px,${editor.drag.node.y}px)`;drawEdges(editor)});
    view.addEventListener("pointerup",event=>{
      const dragging=view.querySelector(".model-node.dragging");if(dragging)dragging.classList.remove("dragging");
      if(editor.drag){editor.drag=null;render(editor);return;}
      if(!editor.connecting)return;
      const target=event.target.closest("[data-node]");const sourceNode=editor.nodes.find(node=>node.id===editor.connecting);const targetNode=editor.nodes.find(node=>node.id===target?.dataset.node);
      if(targetNode&&targetNode.id!==editor.connecting){
        const processes=new Set(["algorithm","function"]);
        if(processes.has(sourceNode.kind)&&processes.has(targetNode.kind)){
          const variable=addNode(editor,"variable","variavel_dados",`Saída de ${displayName(sourceNode.kind,sourceNode.ref,sourceNode.label)}`,(sourceNode.x+targetNode.x)/2,(sourceNode.y+targetNode.y)/2+85);
          variable.params.tipo="dados";variable.params.valor="";
          const parameter=connectionParameter(editor,targetNode,variable);
          if(parameter)targetNode.params[parameter]=`$${variable.ref}`;
          editor.edges.push({id:uid("edge"),from:sourceNode.id,to:variable.id},{id:uid("edge"),from:variable.id,to:targetNode.id,parameter});
        }else{
          const parameter=processes.has(targetNode.kind)?connectionParameter(editor,targetNode,sourceNode):targetNode.kind==="iterator"?"fonte":"";
          if(parameter&&processes.has(targetNode.kind)&&["input","variable","iterator"].includes(sourceNode.kind))targetNode.params[parameter]=referenceFor(sourceNode);
          if(targetNode.kind==="variable"&&["input","variable"].includes(sourceNode.kind))targetNode.params.valor=`$${sourceNode.ref}`;
          if(targetNode.kind==="iterator"&&sourceNode.kind==="input")setIteratorSource(editor,targetNode,`$${sourceNode.ref}`);
          else editor.edges.push({id:uid("edge"),from:editor.connecting,to:targetNode.id,parameter});
        }
        editor.dirty=true;render(editor);
      }
      editor.connecting=null;
    });
    view.addEventListener("dblclick",event=>{
      const article=event.target.closest("[data-node]");if(!article)return;
      const node=editor.nodes.find(n=>n.id===article.dataset.node);if(!node)return;
      editor.selected=node.id;render(editor);showModelPanel("properties");
      setTimeout(()=>$("#gp-model-properties-view [data-node-label]")?.focus(),40);
    });
    icons();
  }
  function topological(editor){
    const nodes=editor.nodes,incoming=new Map(nodes.map(n=>[n.id,0]));editor.edges.forEach(e=>{if(incoming.has(e.to)&&incoming.has(e.from))incoming.set(e.to,incoming.get(e.to)+1)});const queue=nodes.filter(n=>incoming.get(n.id)===0).sort((a,b)=>a.x-b.x),result=[];
    while(queue.length){const n=queue.shift();result.push(n);editor.edges.filter(e=>e.from===n.id).forEach(e=>{if(incoming.has(e.to)){incoming.set(e.to,incoming.get(e.to)-1);if(incoming.get(e.to)===0)queue.push(nodes.find(n=>n.id===e.to))}})}
    if(result.length!==nodes.length){const error=new Error("O diagrama contém uma ligação circular e não pode determinar a ordem de execução.");error.details=["Conexões do modelo: um elemento depende direta ou indiretamente dele mesmo. Esperado: uma sequência que avance da Entrada até a Saída. Como corrigir: remova a ligação que retorna a um elemento anterior; para repetições, use um Iterador."];throw error}return result.filter(n=>["algorithm","function","iterator"].includes(n.kind));
  }
  function validateGraph(editor){
    const inputs=editor.nodes.filter(node=>node.kind==="input"),outputs=editor.nodes.filter(node=>node.kind==="output"),executable=editor.nodes.filter(node=>["algorithm","function","iterator"].includes(node.kind)),issues=[];
    const issue=(element,found,expected,fix)=>issues.push(`${element}: ${found}. Esperado: ${expected}. Como corrigir: ${fix}.`);
    if(!inputs.length)issue("Modelo","nenhum elemento Entrada foi encontrado","ao menos uma Entrada para fornecer dados ou valores","adicione uma Entrada e conecte-a ao primeiro processo");
    if(!outputs.length)issue("Modelo","nenhum elemento Saída foi encontrado","ao menos uma Saída para publicar o resultado","adicione uma Saída e conecte nela o último algoritmo ou função");
    if(!executable.length)issue("Modelo","há entradas e saídas, mas nenhum processamento","ao menos um algoritmo, função ou iterador entre a Entrada e a Saída","arraste um processo da lista e conecte os elementos");
    const referenceNodes=editor.nodes.filter(node=>["input","variable"].includes(node.kind));
    referenceNodes.forEach(node=>{if(!node.ref)issue(`Elemento “${node.label}”`,"a chave está vazia","uma chave única, como camada_entrada","preencha o campo Chave");else{const duplicate=referenceNodes.find(other=>other.id!==node.id&&other.ref===node.ref);if(duplicate)issue(`Elemento “${node.label}”`,`a chave “${node.ref}” também é usada por “${duplicate.label}”`,`uma chave exclusiva para cada Entrada ou Variável`,`renomeie uma das chaves`)}});
    const iterator=editor.nodes.find(node=>node.kind==="iterator");
    if(iterator&&!iterator.params.fonte)issue(`Iterador “${iterator.label}”`,"a Entrada iterada não foi definida","uma Entrada existente conectada ao iterador","selecione uma opção em Entrada iterada ou conecte uma Entrada ao iterador");
    const forward=new Map(editor.nodes.map(node=>[node.id,[]])),reverse=new Map(editor.nodes.map(node=>[node.id,[]]));
    editor.edges.forEach(edge=>{if(forward.has(edge.from)&&forward.has(edge.to)){forward.get(edge.from).push(edge.to);reverse.get(edge.to).push(edge.from)}});
    editor.edges.forEach(edge=>{const source=editor.nodes.find(node=>node.id===edge.from),target=editor.nodes.find(node=>node.id===edge.to);if(!source||!target){issue("Conector órfão","a origem ou o destino não existe mais","as duas extremidades ligadas a elementos existentes","remova o conector e crie a ligação novamente");return}if(["algorithm","function"].includes(target.kind)&&["input","variable","iterator"].includes(source.kind)&&!edge.parameter)issue(`Ligação “${source.label}” → “${target.label}”`,"nenhum campo de destino foi escolhido","o nome do parâmetro que receberá esta variável","refaça a conexão e selecione um dos parâmetros disponíveis")});
    editor.nodes.filter(node=>node.kind==="variable").forEach(node=>{const incoming=editor.edges.some(edge=>edge.to===node.id);if(!incoming&&(node.params.valor===undefined||node.params.valor===""))issue(`Variável “${node.label}”`,"não possui origem nem valor inicial","uma saída anterior conectada ou um valor inicial","conecte um elemento anterior ou preencha Valor inicial")});
    const visit=(starts,graph)=>{const seen=new Set(starts.map(node=>node.id)),queue=[...seen];while(queue.length){for(const next of graph.get(queue.shift())||[])if(!seen.has(next)){seen.add(next);queue.push(next)}}return seen};
    const fromInput=visit(inputs,forward),toOutput=visit(outputs,reverse);
    const disconnected=executable.filter(node=>!fromInput.has(node.id)||!toOutput.has(node.id));
    disconnected.forEach(node=>issue(`Elemento “${node.label}”`,!fromInput.has(node.id)&&!toOutput.has(node.id)?"está isolado da Entrada e da Saída":!fromInput.has(node.id)?"não recebe dados de nenhuma Entrada":"seu resultado não chega a nenhuma Saída","um caminho contínuo Entrada → processamento → Saída","complete os conectores antes e depois deste elemento"));
    outputs.forEach(node=>{const predecessors=(reverse.get(node.id)||[]).map(id=>editor.nodes.find(item=>item.id===id)).filter(Boolean);if(!predecessors.length)issue(`Saída “${node.label}”`,"não recebe nenhum resultado","uma ligação vinda do último algoritmo, função ou variável de resultado","conecte o resultado final a esta Saída")});
    if(issues.length){const error=new Error(`${issues.length} problema(s) impedem a validação.`);error.details=issues;throw error;}
  }
  function compile(editor){
    validateGraph(editor);
    const ordered=topological(editor),steps=ordered.map(node=>{const params={...node.params};editor.edges.filter(e=>e.to===node.id&&e.parameter).forEach(edge=>{const source=editor.nodes.find(n=>n.id===edge.from),resultKey=source?.kind==="iterator"?source.params.variavel:["input","variable","output"].includes(source?.kind)?source.ref:RASTER_RESULTS.has(source?.ref)?"raster_id":"camada_id";params[edge.parameter]=`$${resultKey||"camada_id"}`});if(node.kind==="iterator")return {iterador:node.ref,parametros:params};const outputKey=RASTER_RESULTS.has(node.ref)?"raster_id":"camada_id",mappings={};editor.edges.filter(edge=>edge.from===node.id).forEach(edge=>{const variable=editor.nodes.find(item=>item.id===edge.to);if(variable?.kind==="variable")mappings[outputKey]=variable.ref});const process=node.kind==="function"?{funcao_id:node.ref,parametros:params}:{algoritmo_id:node.ref,parametros:params};if(Object.keys(mappings).length)process.mapear_saidas=mappings;return process});
    const base={id:editor.definitionId||uid(editor.type==="function"?"funcao":"fluxo"),nome:editor.title,descricao:editor.description,categoria:editor.type==="function"?"Funções customizadas":"Fluxos customizados",toolbox:"SIRCADI Toolbox",parametros_expostos:editor.nodes.filter(n=>n.kind==="input").map(n=>({nome:n.label,chave:n.ref,tipo_entrada:iteratorKind(editor),valor:n.params.valor??""})),variaveis:editor.nodes.filter(n=>n.kind==="variable").map(n=>({nome:n.label,chave:n.ref,tipo:n.params.tipo||"dados",valor:n.params.valor??""})),diagrama:{versao:3,nos:editor.nodes,conexoes:editor.edges}};
    const outputNodes=editor.nodes.filter(node=>node.kind==="output"),saidas=outputNodes.map(node=>{const raster=RASTER_RESULTS.has(sourceProcess(editor,node)?.ref);return {nome:node.params.nome_saida||node.label,chave:raster?"raster_id":"camada_id",crs_saida:node.params.crs_saida||"entrada",destino:node.params.destino||"memoria",formato_saida:node.params.formato_saida||(raster?"JSON":"GeoJSON")}});
    return editor.type==="function"?{...base,passos:steps,saidas}:{...base,itens:steps,saidas};
  }
  function processFeedback(editor,action){
    document.querySelector(".model-process-backdrop")?.remove();
    const labels={save:"Salvamento",validate:"Validação",run:"Execução"},kind=editor.type==="function"?"função":"fluxo",backdrop=document.createElement("div");
    backdrop.className="model-process-backdrop";backdrop.innerHTML=`<section class="model-process-modal" role="dialog" aria-modal="true" aria-labelledby="model-process-title"><header><div><small>${labels[action]} de ${kind}</small><h2 id="model-process-title">${esc(editor.title)}</h2></div><span class="model-process-running" data-process-state>Em andamento</span></header><div class="model-process-track"><span></span></div><ol class="model-process-log" aria-live="polite"></ol><footer><strong data-process-final>Aguardando processamento…</strong><button type="button" class="btn" data-process-close disabled>Fechar</button></footer></section>`;
    document.body.append(backdrop);const log=backdrop.querySelector(".model-process-log"),state=backdrop.querySelector("[data-process-state]"),final=backdrop.querySelector("[data-process-final]"),close=backdrop.querySelector("[data-process-close]");
    close.onclick=()=>backdrop.remove();
    const step=(message,status="running")=>{const item=document.createElement("li");item.className=status;item.innerHTML=`<time>${new Date().toLocaleTimeString("pt-BR")}</time><i></i><span>${esc(message)}</span>`;log.append(item);log.scrollTop=log.scrollHeight;};
    const finish=(message,failed=false)=>{backdrop.querySelector(".model-process-modal").classList.add(failed?"failed":"complete");state.textContent=failed?"Falha":"Concluído";state.className=failed?"model-process-failed":"model-process-complete";final.textContent=message;close.disabled=false;close.focus();};
    step(`${labels[action]} iniciado.`);return {step,complete:message=>{step(message,"success");finish(message)},fail:message=>{step(message,"error");finish(message,true)}};
  }
  async function runWithFeedback(editor,action){
    editor.busy=true; updateModelRibbon();
    const feedback=processFeedback(editor,action);
    try{
      let result;
      if(action==="save")result=await saveEditor(editor,feedback);
      else if(action==="validate")result=await validateEditor(editor,feedback);
      else result=await runEditor(editor,feedback);
      if(action==="validate"&&!result.valido)throw new Error(result.erros.join("; ")||"A definição contém pendências.");
      if(action==="validate")editor.validated=true;
      feedback.complete(action==="save"?"Definição salva com sucesso.":action==="validate"?"Definição válida e pronta para executar.":"Processamento concluído e saídas atualizadas.");
      return result;
    }catch(error){(error.details||[]).forEach(detail=>feedback.step(detail,"error"));feedback.fail(`Falha: ${error.message}`);notify(error.message);return null;}
    finally{editor.busy=false;updateModelRibbon();}
  }
  async function saveEditor(editor,feedback){feedback?.step("Compilando elementos, variáveis e conectores.");const data=compile(editor),endpoint=editor.type==="function"?"funcoes":"fluxos";feedback?.step("Estrutura do diagrama validada.","success");feedback?.step(editor.definitionId?"Atualizando definição no repositório.":"Registrando nova definição no repositório.");const saved=await request(`/${endpoint}${editor.definitionId?`/${editor.definitionId}`:""}`,{method:editor.definitionId?"PUT":"POST",body:JSON.stringify(data)});editor.definitionId=saved.id;editor.dirty=false;feedback?.step(`Definição persistida com identificador ${saved.id}.`,"success");feedback?.step("Sincronizando a SIRCADI Toolbox.");const refreshed=await request(`/${endpoint}`);window.gpApp.state[editor.type==="function"?"functions":"flows"].splice(0,Infinity,...refreshed);window.gpApp.renderToolbox?.();feedback?.step("Toolbox atualizada.","success");notify(`${editor.type==="function"?"Função":"Fluxo"} salva em ${data.categoria}, na SIRCADI Toolbox.`);return saved;}
  async function validateEditor(editor,feedback){feedback?.step("Verificando integridade local do diagrama.");compile(editor);feedback?.step("Integridade local confirmada.","success");if(!editor.definitionId||editor.dirty){feedback?.step("Há alterações pendentes; salvamento necessário.");await saveEditor(editor,feedback)}const endpoint=editor.type==="function"?"funcoes":"fluxos";feedback?.step("Solicitando validação canônica ao servidor.");const result=await request(`/${endpoint}/${editor.definitionId}/validar`,{method:"POST",body:"{}"});feedback?.step(result.valido?"Servidor confirmou a validade da definição.":`Servidor encontrou ${result.erros.length} pendência(s).`,result.valido?"success":"error");notify(result.valido?"Definição válida e pronta para executar.":result.erros.join("; "));return result;}
  async function runEditor(editor,feedback){feedback?.step("Preparando definição para execução.");const valid=await validateEditor(editor,feedback);if(!valid.valido)throw new Error(valid.erros.join("; ")||"A definição não pode ser executada.");const inputNodes=editor.nodes.filter(node=>node.kind==="input"&&node.params.valor!==undefined&&node.params.valor!==""),inputs=Object.fromEntries(inputNodes.map(node=>[node.ref,node.params.valor])),endpoint=editor.type==="function"?"funcoes":"fluxos";feedback?.step(`${inputNodes.length} entrada(s) preparada(s).`,"success");feedback?.step("Executando algoritmos e funções encadeados no servidor.");const result=await request(`/${endpoint}/${editor.definitionId}/executar`,{method:"POST",body:JSON.stringify(inputs)});feedback?.step(Array.isArray(result?.etapas)?`Servidor concluiu ${result.etapas.length} etapa(s) de processamento.`:"Servidor concluiu todas as etapas de processamento.","success");feedback?.step("Atualizando camadas no Painel de Conteúdo.");await window.gpApp.refreshLayers?.();window.gpApp.renderLayers?.();feedback?.step("Painel de Conteúdo sincronizado.","success");notify("Execução concluída; as saídas foram atualizadas no Painel de Conteúdo.");return result;}
  function updateTab(editor){const span=$(`[data-document-tab="${editor.id}"] span`);if(span)span.textContent=editor.title;}
  function notify(message){const status=$("#gp-save-state");status.textContent=message;clearTimeout(notify.timer);notify.timer=setTimeout(()=>status.textContent="Ambiente local",4500);}
  function close(id){const editor=editors.get(id);if(editor?.dirty&&!confirm("Fechar sem salvar as alterações?"))return;editors.delete(id);$(`[data-document-tab="${id}"]`)?.remove();$(`[data-model-document="${id}"]`)?.remove();activate("mapa");}
  document.addEventListener("DOMContentLoaded",()=>{
    $("#gp-ribbon-tools").addEventListener("click",event=>{
      const button=event.target.closest("[data-model-command]"); if(!button||button.disabled)return;
      const menuKind=button.dataset.modelMenu;
      if(menuKind){ event.stopPropagation(); toggleModelMenu(menuKind,button); return; }
      Promise.resolve(handleModelCommand(button.dataset.modelCommand)).catch(error=>notify(error.message));
    });
    const inspector=$("#gp-model-properties-view");
    inspector?.addEventListener("input",event=>{const editor=activeEditor();if(editor)handleInspectorInput(editor,event);});
    inspector?.addEventListener("change",event=>{const editor=activeEditor();if(editor)handleInspectorChange(editor,event);});
    inspector?.addEventListener("click",event=>{const editor=activeEditor();if(editor)handleInspectorClick(editor,event);});
    document.addEventListener("keydown",event=>{
      if(event.key==="Escape"){closeModelMenu();document.querySelector(".model-context-menu")?.remove();const editor=activeEditor();if(editor?.connectionMode){editor.connectionMode=false;editor.connectSource=null;$(`[data-model-document="${editor.id}"] .model-canvas`)?.classList.remove("connect-mode");updateModelRibbon();}return;}
      const editor=activeEditor();if(!editor||isFormField(event.target))return;
      if((event.key==="Delete"||event.key==="Backspace")&&(editor.selected||editor.selectedEdge)){event.preventDefault();deleteSelection(editor);return;}
      if((event.ctrlKey||event.metaKey)&&(event.key==="d"||event.key==="D")&&editor.selected){event.preventDefault();duplicateSelection(editor);return;}
    });
    document.addEventListener("click",event=>{
      if(event.target.closest(".model-menu")||event.target.closest("[data-model-menu]"))return;
      closeModelMenu();
      if(!event.target.closest(".model-context-menu"))document.querySelector(".model-context-menu")?.remove();
    });
    document.addEventListener("contextmenu",event=>{
      const editor=activeEditor();if(!editor)return;
      const article=event.target.closest("[data-node]"),edgePath=event.target.closest("[data-edge]");
      if(!article&&!edgePath)return;
      event.preventDefault();
      if(article){editor.selected=article.dataset.node;editor.selectedEdge=null;}
      else{editor.selectedEdge=edgePath.dataset.edge;editor.selected=null;}
      render(editor);openContextMenu(editor,event.clientX,event.clientY,article?"node":"edge");
    });
    window.addEventListener("resize",closeModelMenu);
    window.addEventListener("scroll",closeModelMenu,true);
    $("#gp-document-tabs").addEventListener("click",event=>{const closeButton=event.target.closest("[data-close-model]");if(closeButton){event.stopPropagation();close(closeButton.dataset.closeModel);return}const tab=event.target.closest("[data-document-tab]");if(tab)activate(tab.dataset.documentTab)});
    window.gpApp.newFunction=seed=>showCreateForm("function",seed);window.gpApp.newFlow=()=>showCreateForm("flow");window.gpApp.openVisualDefinition=(kind,item)=>open(kind==="functions"?"function":"flow",item);window.gpModelTips=modelTips;window.gpModeler={open,create:showCreateForm,edit:(kind,item)=>open(kind,item),hasActiveEditor,showPanel:showModelPanel,updateRibbon:updateModelRibbon,_debug:{editors,activeEditor,addNode,render,deleteSelection,duplicateSelection,autoLayout,fitCanvas,selectEdge,handleModelCommand}};icons();
  });
})();
