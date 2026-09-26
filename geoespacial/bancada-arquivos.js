import { escolherArquivo } from './extracao-atributos/explorador.js';
import { json, post } from './extracao-atributos/api.js';
import { el } from './extracao-atributos/ui.js';

const sessions=new Map();
let editor=null,busy=false;
const app=()=>window.gpApp;
const active=()=>sessions.get(app().state.activeLayerId);
const report=message=>app().log(message,'error');
const clone=value=>structuredClone(value);
function button(label,action){const node=el('button',label,'btn');node.type='button';node.onclick=()=>Promise.resolve().then(action).catch(error=>report(error.message));return node;}

function editRibbon(){
  const host=document.querySelector('#gp-ribbon-tools');host.replaceChildren();
  const groups=[['Sessão',[['pencil','Iniciar edição','start'],['save','Salvar alterações','save'],['x','Cancelar edições','cancel']]],['Geometria',[['map-pin','Criar ponto','Point'],['waypoints','Criar linha','LineString'],['pentagon','Criar polígono','Polygon'],['pen-tool','Editar vértices','vertices'],['trash-2','Excluir feições','delete']]],['Operação',[['check','Aplicar','apply'],['undo-2','Cancelar operação','revert']]],['Histórico',[['undo','Desfazer','undo'],['redo','Refazer','redo']]]];
  for(const [label,items] of groups){
    const group=el('div',undefined,'ribbon-group');group.dataset.label=label;
    for(const [icon,label,action] of items){
      const node=button(label,()=>action==='start'?openEditor(true):editor?.actions[action]?.());
      node.className='ribbon-action';node.dataset.fileAction=action;node.title=label;
      node.replaceChildren();const symbol=el('i');symbol.dataset.lucide=icon;node.append(symbol,el('span',label));group.append(node);
    }host.append(group);
  }
  window.lucide?.createIcons();syncEditRibbon();
}
function syncEditRibbon(){
  document.querySelectorAll('[data-file-action]').forEach(node=>{const key=node.dataset.fileAction;node.disabled=busy||(key==='start'?Boolean(editor):!editor?.enabled?.(key));});
}
function activateEditRibbon(){
  document.querySelectorAll('[data-ribbon]').forEach(node=>node.classList.toggle('active',node.dataset.ribbon==='editar'));editRibbon();
}

function mount(file,opts={}){
  sessions.set(file.id,file);
  const map=app().state.map;
  if(map&&!map.isStyleLoaded()&&!opts.estiloPreparado){
    map.once('idle',()=>{if(sessions.get(file.id)===file)mount(file,opts);});return;
  }
  // origem nomeia o subgrupo em Camadas operacionais; quem chama pode informar a categoria.
  app().adicionarCamadaGeoJsonEmMemoria(file.id,file.nome,file.geojson,{tipo:'vetorial',origem:'Arquivo no storage',categoria:file.categoria||'',geometria_tipo:file.geojson.features[0]?.geometry?.type,lote:opts.lote,estiloPreparado:opts.estiloPreparado});
  Object.assign(app().state.layers.find(layer=>layer.id===file.id)||{}, {arquivo:file.arquivo,origem_geometria:'storage'});
  app().state.activeLayerId=file.id;
  if(!opts.lote)app().renderLayers();
  syncEditRibbon();
}

// A gravação só termina na UI depois de reler a versão efetivamente persistida.
async function sincronizarSalvamento(saved){
  const activeId=app().state.activeLayerId;
  const reference=file=>({arquivo:file.arquivo,...(file.id.startsWith('storage:')?{id:file.id}:{})});
  const related=[...sessions.values()].filter(file=>file.arquivo===saved.arquivo&&file.id!==saved.id);
  // Preserve também a resposta da gravação se a releitura perder a conexão.
  mount(saved);
  let latest=saved;
  try{latest=await post('/extracao-atributos/arquivo-mapa',reference(saved));mount(latest);}
  catch(error){app().log(`Alterações gravadas. Não foi possível reler a camada: ${error.message}`,'error');}
  window.gpAttributeTable?.atualizarArquivo(latest.id);
  window.dispatchEvent(new CustomEvent('gp-arquivo-atualizado',{detail:latest}));
  for(const file of related){
    try{
      const refreshed=await post('/extracao-atributos/arquivo-mapa',reference(file));
      mount(refreshed,{lote:true});
      window.gpAttributeTable?.atualizarArquivo(refreshed.id);
      window.dispatchEvent(new CustomEvent('gp-arquivo-atualizado',{detail:refreshed}));
    }catch(error){app().log(`Arquivo salvo, mas não foi possível atualizar ${file.nome}: ${error.message}`,'error');}
  }
  app().state.activeLayerId=activeId;app().renderLayers();
  return latest;
}

async function browse(){
  // Sem esta mensagem o botão "Carregar do sistema" não fazia absolutamente
  // nada enquanto houvesse edição aberta, sem dizer por quê.
  if(editor)throw new Error('Salve ou cancele a edição antes de abrir outro arquivo.');
  if(busy)throw new Error('Aguarde a operação em andamento terminar.');
  const catalog=await json('/extracao-atributos/catalogo');
  const files=await escolherArquivo({catalog:catalog.camadas,multiple:true,title:'Abrir arquivos na bancada'});
  if(files)for(const file of files)mount(file);
}

function openEditor(editing=false){
  const source=active();if(!source)throw new Error('Abra o arquivo pelo explorador da bancada.');
  if(editor){editor.table.scrollIntoView({block:'nearest'});return;}if(busy)return;
  if(source.geojson.features.some(f=>!['Point','MultiPoint','LineString','MultiLineString','Polygon','MultiPolygon'].includes(f.geometry?.type)))throw new Error('Este editor aceita pontos, linhas e polígonos.');
  const dialog=el('dialog',undefined,'gp-file-dialog'),header=el('header');
  header.append(el('h2',`${editing?'Editar':'Explorar'} — ${source.nome}`));
  const status=el('p',undefined,'gp-file-status');status.setAttribute('role','status');
  const workspace=el('div',undefined,'gp-file-workspace'),mapHost=el('div',undefined,'gp-file-edit-map'),table=el('section',undefined,'gp-file-table');
  const tableControls=el('div',undefined,'gp-file-table-controls'),filter=el('input');filter.type='search';filter.placeholder='Pesquisar atributos';filter.setAttribute('aria-label','Pesquisar atributos');
  const only=el('input');only.type='checkbox';const onlyLabel=el('label','Somente selecionada');onlyLabel.prepend(only);
  const scroll=el('div',undefined,'gp-file-table-scroll'),pages=el('div',undefined,'gp-file-table-controls');
  tableControls.append(filter,onlyLabel);table.append(tableControls,scroll,pages);workspace.append(mapHost,table);
  const footer=el('footer');
  dialog.append(header,workspace,status,footer);
  if(editing){dialog.classList.add('gp-file-inline');document.querySelector('.gp-map-view').append(dialog);dialog.show();}
  else{document.body.append(dialog);dialog.showModal();}
  const map=L.map(mapHost,{preferCanvas:true,zoomAnimation:false}).setView([-22,-48],6),group=L.featureGroup().addTo(map),editGroup=L.featureGroup(),signatures=new Map();
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(map);
  const revisaoInicial=source.revisao;
  const snapshot=clone(source.geojson);let draft=clone(snapshot),history=[clone(snapshot)],cursor=0,selected=null,page=0,sort=null,ascending=true,drawing=false,lastError='';
  editor={dirty:false,table};let handler=null,operation=null;
  const closed=()=>{handler?.disable();map.stop();map.remove();dialog.close();dialog.remove();editor=null;syncEditRibbon();app().state.map?.resize();};
  const cancel=()=>{if(busy)return;closed();};
  header.append(button('×',cancel));header.lastChild.setAttribute('aria-label','Cancelar e fechar');
  dialog.addEventListener('cancel',event=>{event.preventDefault();cancel();});
  function commit(){lastError='';history=history.slice(0,cursor+1);history.push(clone(draft));cursor++;editor.dirty=true;render();}
  function collect(){
    const features=new Map();
    group.eachLayer(layer=>{
      const data=layer.toGeoJSON(),key=layer._fileId;
      if(!features.has(key))features.set(key,{type:'Feature',id:key,properties:clone(layer.feature?.properties||{}),geometry:{type:layer._fileType,coordinates:[]}});
      const feature=features.get(key);
      if(layer._fileType.startsWith('Multi'))feature.geometry.coordinates.push(data.geometry.coordinates);
      else feature.geometry=data.geometry;
    });
    draft={type:'FeatureCollection',features:[...features.values()]};commit();
  }
  function select(id){if(drawing)return;selected=id;editGroup.clearLayers();group.eachLayer(layer=>{if(layer._fileId===id)editGroup.addLayer(layer);});render(true);}
  function draw(){
    editGroup.clearLayers();
    const present=new Set(draft.features.map(f=>String(f.id))),existing=new Map();
    group.eachLayer(layer=>{if(!present.has(layer._fileId))group.removeLayer(layer);else{if(!existing.has(layer._fileId))existing.set(layer._fileId,[]);existing.get(layer._fileId).push(layer);}});
    for(const feature of draft.features){
      const id=String(feature.id),signature=JSON.stringify(feature.geometry),old=existing.get(id)||[];
      if(old.length&&signatures.get(id)===signature){old.forEach(layer=>{layer.feature.properties=clone(feature.properties);if(id===selected)editGroup.addLayer(layer);});continue;}
      old.forEach(layer=>group.removeLayer(layer));signatures.set(id,signature);
      const multi=feature.geometry.type.startsWith('Multi'),type=multi?feature.geometry.type.slice(5):feature.geometry.type;
      const parts=multi?feature.geometry.coordinates:[feature.geometry.coordinates];
      for(const coordinates of parts){
        const data={...clone(feature),geometry:{type,coordinates}};
        L.geoJSON(data,{pointToLayer:(_f,latlng)=>L.marker(latlng)}).eachLayer(layer=>{
          layer._fileId=String(feature.id);layer._fileType=feature.geometry.type;
          layer.on('click',()=>select(String(feature.id)));group.addLayer(layer);if(id===selected)editGroup.addLayer(layer);
        });
      }
    }
  }
  function render(reveal=false){
    const term=filter.value.toLocaleLowerCase('pt-BR');
    let rows=draft.features.filter(f=>(!only.checked||String(f.id)===selected)&&JSON.stringify(f.properties).toLocaleLowerCase('pt-BR').includes(term));
    if(sort)rows=rows.slice().sort((a,b)=>String(a.properties[sort]??'').localeCompare(String(b.properties[sort]??''),'pt-BR',{numeric:true})*(ascending?1:-1));
    if(reveal){const index=rows.findIndex(f=>String(f.id)===selected);if(index>=0)page=Math.floor(index/100);}
    page=Math.min(page,Math.max(0,Math.ceil(rows.length/100)-1));
    const grid=el('table'),head=el('thead'),titles=el('tr');titles.append(el('th','Feição'));
    for(const field of source.campos){const cell=el('th');cell.append(button(field.nome,()=>{ascending=sort===field.nome?!ascending:true;sort=field.nome;render();}));titles.append(cell);}
    head.append(titles);grid.append(head);const body=el('tbody');
    for(const feature of rows.slice(page*100,page*100+100)){
      const row=el('tr');row.setAttribute('aria-selected',String(String(feature.id)===selected));
      const key=el('td');key.append(button(String(feature.id),()=>{select(String(feature.id));const layers=group.getLayers().filter(l=>l._fileId===String(feature.id));if(layers.length)map.fitBounds(L.featureGroup(layers).getBounds(),{maxZoom:18});}));row.append(key);
      for(const field of source.campos){
        const cell=el('td'),value=feature.properties[field.nome];
        if(editing&&String(feature.id)===selected){
          const input=el('input');input.value=value==null?'':typeof value==='object'?JSON.stringify(value):String(value);input.setAttribute('aria-label',`${field.nome} — feição ${feature.id}`);
          input.onchange=()=>{try{
            const numeric=['Integer','Integer64','Real'].includes(field.tipo);
            const next=input.value===''?null:numeric?Number(input.value):typeof value==='object'&&value!==null?JSON.parse(input.value):input.value;
            if(numeric&&next!==null&&(!Number.isFinite(next)||(field.tipo!=='Real'&&!Number.isInteger(next))))throw new Error('Informe um número válido.');
            feature.properties[field.nome]=next;group.eachLayer(layer=>{if(layer._fileId===String(feature.id))layer.feature.properties=clone(feature.properties);});commit();
          }catch(error){if(window.gpFeedback)window.gpFeedback.Notify.warning("Editar atributos",error.message);else status.textContent=error.message;}};cell.append(input);
        }else cell.textContent=value==null?'':typeof value==='object'?JSON.stringify(value):String(value);
        row.append(cell);
      }
      body.append(row);
    }
    grid.append(body);scroll.replaceChildren(grid);
    const previous=button('←',()=>{page--;render();}),next=button('→',()=>{page++;render();});previous.disabled=page===0;next.disabled=(page+1)*100>=rows.length;
    pages.replaceChildren(previous,el('span',`${rows.length} registros · página ${page+1}`),next);
    group.eachLayer(layer=>layer.setStyle?.({color:layer._fileId===selected?'#ef7b16':'#1769aa'}));
    status.textContent=(!window.gpFeedback&&lastError)||(editor.dirty?'Edições pendentes. Salvar altera o arquivo original no storage.':editing?'Selecione uma feição no mapa ou na tabela para editar seus atributos.':'Fonte: '+source.arquivo);
    undo.disabled=cursor===0||drawing;redo.disabled=cursor===history.length-1||drawing;save.disabled=!editing||!editor.dirty||drawing||busy;
    syncEditRibbon();
  }
  const undo=button('Desfazer',()=>{draft=clone(history[--cursor]);editor.dirty=cursor>0;draw();render();});
  const redo=button('Refazer',()=>{draft=clone(history[++cursor]);editor.dirty=cursor>0;draw();render();});
  const save=button('Salvar alterações',async()=>{
    if(!await window.gpFeedback.ProcessFeedback.confirmar({title:'Salvar alterações',message:'Gravar as alterações no arquivo original do storage?',warning:source.arquivo,confirmLabel:'Salvar alterações'}))return;
    busy=true;save.disabled=true;syncEditRibbon();const proc=window.gpFeedback?.ProcessFeedback.iniciarCadastro({title:'Salvando alterações',tasks:['Validar e gravar no storage']});proc?.tarefaAtual('Validar e gravar no storage');if(!proc)status.textContent='Validando e gravando no arquivo original…';
    try{const file=await post('/bancada-arquivos/salvar',{arquivo:source.arquivo,camada_id:source.id,revisao:revisaoInicial,geojson:draft});closed();await sincronizarSalvamento(file);if(proc){proc.concluirTarefa('Validar e gravar no storage','Gravada');proc.sucesso({title:'Alterações salvas',message:'Alterações gravadas no arquivo original do storage.'});}else app().log('Alterações gravadas no arquivo original do storage.','ok');}
    catch(error){lastError=error.message;proc?.erro({message:error.message});}finally{busy=false;if(editor)render();else syncEditRibbon();}
  });
  if(!editing)footer.append(button('Fechar',cancel));
  filter.oninput=()=>{page=0;render();};only.onchange=()=>{page=0;render();};
  if(editing){
    const kinds=new Set(source.geojson.features.map(f=>f.geometry.type.replace('Multi','')));
    Object.assign(L.drawLocal.draw.toolbar.buttons,{polygon:'Criar polígono',polyline:'Criar linha',marker:'Criar ponto'});
    Object.assign(L.drawLocal.edit.toolbar.buttons,{edit:'Editar vértices',editDisabled:'Sem feições para editar',remove:'Excluir feições',removeDisabled:'Sem feições para excluir'});
    Object.assign(L.drawLocal.edit.toolbar.actions.save,{title:'Aplicar ao rascunho',text:'Aplicar'});
    Object.assign(L.drawLocal.edit.toolbar.actions.cancel,{title:'Cancelar esta operação',text:'Cancelar'});
    const stop=apply=>{
      if(!handler)return;
      if(apply){if(operation==='vertices'||operation==='delete')handler.save();else{handler.completeShape?.();if(handler.enabled())return;}}
      else handler.revertLayers?.();
      handler.disable();handler=null;operation=null;render();
    };
    const start=kind=>{
      if(drawing||busy)return;operation=kind;
      if(kind==='vertices')handler=new L.EditToolbar.Edit(map,{featureGroup:editGroup,selectedPathOptions:{maintainColor:true}});
      else if(kind==='delete')handler=new L.EditToolbar.Delete(map,{featureGroup:editGroup});
      else handler=new ({Point:L.Draw.Marker,LineString:L.Draw.Polyline,Polygon:L.Draw.Polygon}[kind])(map);
      handler.enable();render();
    };
    editor.actions={start:()=>{},save:()=>save.click(),cancel,undo:()=>undo.click(),redo:()=>redo.click(),apply:()=>stop(true),revert:()=>stop(false)};
    for(const kind of ['Point','LineString','Polygon','vertices','delete'])editor.actions[kind]=()=>start(kind);
    editor.enabled=key=>{
      if(key==='cancel')return true;
      if(key==='apply')return drawing&&operation!=='Point';
      if(key==='revert')return drawing;
      if(key==='undo')return !undo.disabled;
      if(key==='redo')return !redo.disabled;
      if(key==='save')return !save.disabled;
      if(key==='vertices'||key==='delete')return !drawing&&editGroup.getLayers().length>0;
      return !drawing&&kinds.has(key);
    };
    map.on(L.Draw.Event.CREATED,event=>{
      const layer=event.layer;layer.feature={type:'Feature',properties:Object.fromEntries(source.campos.map(f=>[f.nome,null]))};layer._fileId='nova_'+crypto.randomUUID();layer._fileType=layer.toGeoJSON().geometry.type;group.addLayer(layer);collect();draw();
    });
    map.on(L.Draw.Event.EDITED,()=>{signatures.delete(selected);collect();draw();});map.on(L.Draw.Event.DELETED,event=>{event.layers.eachLayer(layer=>group.removeLayer(layer));signatures.delete(selected);collect();draw();});
    for(const event of ['draw:editstart','draw:deletestart','draw:drawstart'])map.on(event,()=>{drawing=true;render();});
    for(const event of ['draw:editstop','draw:deletestop','draw:drawstop'])map.on(event,()=>{drawing=false;render();});
  }
  draw();render();if(group.getLayers().length)map.fitBounds(group.getBounds(),{maxZoom:16});setTimeout(()=>map.invalidateSize(),0);
  if(editing)activateEditRibbon();
}

const escapar=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// A calculadora do ribbon opera sobre a camada do catálogo; para um arquivo
// aberto na bancada é preciso recarregar o arquivo depois, senão a sessão
// segue mostrando a versão anterior do storage.
async function calcularCampo(){
  const file=active();
  if(!file)throw new Error('Abra o arquivo pelo explorador da bancada.');
  if(busy||editor)throw new Error('Salve ou cancele a edição antes de calcular um campo.');
  if(window.gpAttributeTable?.hasPendingChanges?.(file.id))throw new Error('Salve ou descarte as edições da tabela antes de calcular um campo.');
  const scope=window.gpCommands.calculationScope(file.id);
  window.gpCommands.openPanel('Calcular campo',`<form id="gp-file-calculate"><div class="editor-body"><div class="field"><label>Arquivo</label><input value="${escapar(file.nome)}" readonly></div><div class="field"><label>Campo de destino</label><input name="campo" required></div><div class="field"><label>Expressão</label><textarea name="expressao" required placeholder="Ex.: area * 2"></textarea></div><p class="field-help" data-calculation-scope>${escapar(scope.description)}. O cálculo será gravado no arquivo original do storage.</p></div><div class="editor-actions"><button class="btn primary">Calcular</button></div></form>`);
  const form=document.querySelector('#gp-file-calculate');
  form.onsubmit=async event=>{
    event.preventDefault();
    const submit=form.querySelector('button.primary');
    if(busy||submit.disabled)return;
    busy=true;submit.disabled=true;syncEditRibbon();
    let progress;
    try{
      if(window.gpAttributeTable?.hasPendingChanges?.(file.id))throw new Error('Salve ou descarte as edições da tabela antes de calcular um campo.');
      if(!await window.gpFeedback.ProcessFeedback.confirmar({title:'Calcular campo',message:`Atualizar ${form.campo.value} em ${file.nome}?`,warning:`${scope.description}. O arquivo original será alterado: ${file.arquivo}`,confirmLabel:'Calcular'}))return;
      progress=app().createTaskProgress(form);
      progress.note(`Calculando ${form.campo.value}: ${scope.description}`);
      const result=await post('/bancada-arquivos/calcular-campo',{arquivo:file.arquivo,camada_id:file.id,revisao:file.revisao,campo:form.campo.value,expressao:form.expressao.value,...scope.payload});
      progress.note(`${result.feicoes_atualizadas} feição(ões) gravadas; atualizando a sessão da bancada`);
      await sincronizarSalvamento(result);
      await window.gpCommands.refreshLayerFilter?.(file.id);
      progress.complete();
      app().log(`Campo ${result.campo_calculado} calculado em ${result.feicoes_atualizadas} feição(ões) no arquivo original.`,'ok');
    }catch(error){progress?.fail(error.message);report(error.message);}
    finally{busy=false;submit.disabled=false;syncEditRibbon();}
  };
}

async function execute(form){
  if(busy||editor)throw new Error('Salve ou cancele a edição antes de executar.');
  const data=new FormData(form),params={};
  for(const [key,value] of data){
    if(String(value).trim()==='')continue;
    const input=form.elements[key];params[key]=input?.multiple?data.getAll(key):input?.type==='number'&&value!==''?Number(value):value;
  }
  for(const input of form.querySelectorAll('input[type=checkbox]'))params[input.name]=input.checked;
  if(params.pesos)params.pesos=String(params.pesos).split(',').map(Number);
  if(params.processar_sobre==='selecionadas'){
    const input=[...form.elements].find(element=>element.name.startsWith('camada_id')&&!element.multiple);
    const selected=(app().state.selectedGeoJSON?.features||[]).filter(feature=>feature.properties?.__gp_layer_id===input?.value);
    if(!selected.length)throw new Error('Não há feições selecionadas na camada de entrada.');
    params.chaves_selecionadas=selected.map(feature=>String(feature.properties.__gp_selection_key));
    params.atributos_selecionados=selected.map(feature=>({__gp_feature:feature}));
  }
  params.filtros_camadas=Object.fromEntries(Object.entries(app().state.layerFilters||{}).filter(([id])=>Object.values(params).some(value=>value===id||Array.isArray(value)&&value.includes(id))));
  const files={};for(const [id,file] of sessions)if(Object.values(params).some(value=>value===id||Array.isArray(value)&&value.includes(id)))files[id]={arquivo:file.arquivo,revisao:file.revisao};
  if(!await window.gpFeedback.ProcessFeedback.confirmar({title:'Executar operação da bancada',message:`Iniciar ${form.dataset.op}?`,warning:JSON.stringify(params,null,2),confirmLabel:'Executar'}))return;
  const proc=window.gpFeedback?.ProcessFeedback.iniciarCadastro({title:'Processando arquivos da bancada',tasks:['Executar a operação no servidor']});proc?.tarefaAtual('Executar a operação no servidor');busy=true;const submit=form.querySelector('button[type=submit],button.primary');if(submit)submit.disabled=true;
  const startedAt=Date.now();
  const record=(status,result)=>{app().state.history.unshift({at:new Date().toISOString(),op:form.dataset.op,name:app().operations.find(op=>op.id===form.dataset.op)?.nome||form.dataset.op,status,durationMs:Date.now()-startedAt,parameters:params,result});localStorage.setItem('gp-history',JSON.stringify(app().state.history.slice(0,100)));};
  try{let job=await post('/bancada-arquivos/executar-job',{operacao:form.dataset.op,parametros:params,arquivos:files});window.gpFeedback.ProcessFeedback.acompanhar(job);while(!['concluido','erro','cancelado'].includes(job.status)){await new Promise(resolve=>setTimeout(resolve,300));const response=await fetch(`/api/geoespacial/operacoes-jobs/status/${job.id}`,{credentials:'same-origin'});job=await response.json();if(!response.ok)throw new Error(job.detail||'Falha ao acompanhar operação');window.gpFeedback.ProcessFeedback.acompanhar(job);}if(job.status!=='concluido')throw new Error(job.erro||'Operação interrompida');const result=job.resultado;if(result.camada)mount(result.camada);else if(result.resultado?.raster_id||result.resultado?.camada_id){const id=result.resultado.camada_id||result.resultado.raster_id;await app().refreshLayers(true,[id],id);}else app().showOperationResult('Resultado da operação',result.resultado||result);record('concluído',result);if(proc){proc.concluirTarefa('Executar a operação no servidor','Concluída');proc.sucesso({title:'Execução concluída',message:`Execução ${result.execucao_id} concluída.`,summary:[{label:'Execução',value:result.execucao_id,icon:'fa-hashtag'}]});}else app().log(`Execução concluída: ${result.execucao_id}`,'ok');}
  catch(error){record('erro',error.message);proc?.erro({message:error.message});throw error;}
  finally{busy=false;if(submit)submit.disabled=false;}
}

function init(){
  const previousZoom=app().zoomToCatalogLayer;
  app().zoomToCatalogLayer=async id=>{
    const file=sessions.get(id);if(!file)return previousZoom(id);
    const bounds=new maplibregl.LngLatBounds();
    const walk=coordinates=>{if(typeof coordinates[0]==='number')bounds.extend(coordinates);else coordinates.forEach(walk);};
    file.geojson.features.forEach(feature=>walk(feature.geometry.coordinates));
    if(!bounds.isEmpty())app().state.map.fitBounds(bounds,{padding:40,maxZoom:16});
  };
  const editTab=button('Editar',activateEditRibbon);editTab.className='';editTab.dataset.ribbon='editar';
  document.querySelector('[data-ribbon="mapa"]').after(editTab);
  // A guia pertence a este módulo; evita que o renderizador das guias legadas a processe.
  document.addEventListener('gp-modeler-state',event=>{if(editTab.classList.contains('active')){event.stopImmediatePropagation();editRibbon();}},true);
  document.addEventListener('click',event=>{
    if(event.target.closest('[data-ribbon="editar"]')){event.preventDefault();event.stopImmediatePropagation();activateEditRibbon();return;}
    const action=event.target.closest('[data-action]')?.dataset.action,edit=event.target.closest('[data-edit-layer]');
    if(action==='load-system'){event.preventDefault();event.stopImmediatePropagation();browse().catch(error=>report(error.message));}
    else if((edit&&sessions.has(edit.dataset.editLayer))||active()&&['calculate-field','save-layer','save-result','refresh-source'].includes(action)){
      event.preventDefault();event.stopImmediatePropagation();
      if(busy)return;
      if(edit)app().state.activeLayerId=edit.dataset.editLayer;
      if(action==='calculate-field'){calcularCampo().catch(error=>report(error.message));return;}
      if(action==='refresh-source'){const file=active();if(editor){report('Salve ou cancele a edição antes de atualizar a fonte.');return;}post('/extracao-atributos/arquivo-mapa',{arquivo:file.arquivo,...(file.id.startsWith('storage:')?{id:file.id}:{})}).then(async refreshed=>{mount(refreshed);window.gpAttributeTable?.atualizarArquivo(refreshed.id);window.dispatchEvent(new CustomEvent('gp-arquivo-atualizado',{detail:refreshed}));await window.gpCommands?.refreshLayerFilter?.(refreshed.id);}).catch(error=>report(error.message));return;}
      try{openEditor(Boolean(edit)||['save-layer','save-result'].includes(action));}catch(error){report(error.message);}
    }
  },true);
  document.addEventListener('submit',event=>{
    if(event.target.id!=='gp-op-form')return;
    const values=[...new FormData(event.target).values()];
    if(!values.some(value=>sessions.has(value)))return;
    event.preventDefault();event.stopImmediatePropagation();execute(event.target).catch(error=>report(error.message));
  },true);
  window.addEventListener('beforeunload',event=>{if(editor?.dirty||busy){event.preventDefault();event.returnValue='';}});
  window.gpArquivos={get busy(){return busy;},abrir:browse,adicionar:mount,editar:()=>openEditor(true),tabela:()=>app().showAttributes(app().state.activeLayerId),sessions,sincronizarSalvamento};
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
