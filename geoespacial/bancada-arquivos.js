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
  const groups=[['Sessão',[['pencil','Iniciar edição','start'],['save','Salvar nova versão','save'],['x','Cancelar edições','cancel']]],['Geometria',[['map-pin','Criar ponto','Point'],['waypoints','Criar linha','LineString'],['pentagon','Criar polígono','Polygon'],['pen-tool','Editar vértices','vertices'],['trash-2','Excluir feições','delete']]],['Operação',[['check','Aplicar','apply'],['undo-2','Cancelar operação','revert']]],['Histórico',[['undo','Desfazer','undo'],['redo','Refazer','redo']]]];
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
  if(map&&!map.isStyleLoaded()){
    map.once('idle',()=>{if(sessions.get(file.id)===file)mount(file,opts);});return;
  }
  // origem nomeia o subgrupo em Camadas operacionais; quem chama pode informar a categoria.
  app().adicionarCamadaGeoJsonEmMemoria(file.id,file.nome,file.geojson,{tipo:'vetorial',origem:'Arquivo no storage',categoria:file.categoria||'',geometria_tipo:file.geojson.features[0]?.geometry?.type,lote:opts.lote});
  Object.assign(app().state.layers.find(layer=>layer.id===file.id)||{}, {arquivo:file.arquivo,origem_geometria:'storage'});
  app().state.activeLayerId=file.id;
  if(!opts.lote)app().renderLayers();
  syncEditRibbon();
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
  const footer=el('footer'),name=el('input');name.value=`${source.nome} — edição`;name.setAttribute('aria-label','Nome da nova versão');name.maxLength=200;
  dialog.append(header,workspace,status,footer);
  if(editing){dialog.classList.add('gp-file-inline');document.querySelector('.gp-map-view').append(dialog);dialog.show();}
  else{document.body.append(dialog);dialog.showModal();}
  const map=L.map(mapHost,{preferCanvas:true}).setView([-22,-48],6),group=L.featureGroup().addTo(map),editGroup=L.featureGroup(),signatures=new Map();
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(map);
  const snapshot=clone(source.geojson);let draft=clone(snapshot),history=[clone(snapshot)],cursor=0,selected=null,page=0,sort=null,ascending=true,drawing=false,lastError='';
  editor={dirty:false,table};let handler=null,operation=null;
  const closed=()=>{handler?.disable();map.remove();dialog.close();dialog.remove();editor=null;syncEditRibbon();app().state.map?.resize();};
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
          }catch(error){status.textContent=error.message;}};cell.append(input);
        }else cell.textContent=value==null?'':typeof value==='object'?JSON.stringify(value):String(value);
        row.append(cell);
      }
      body.append(row);
    }
    grid.append(body);scroll.replaceChildren(grid);
    const previous=button('←',()=>{page--;render();}),next=button('→',()=>{page++;render();});previous.disabled=page===0;next.disabled=(page+1)*100>=rows.length;
    pages.replaceChildren(previous,el('span',`${rows.length} registros · página ${page+1}`),next);
    group.eachLayer(layer=>layer.setStyle?.({color:layer._fileId===selected?'#ef7b16':'#1769aa'}));
    status.textContent=lastError||(editor.dirty?'Edições pendentes. Salvar cria uma nova versão no storage.':editing?'Selecione uma feição no mapa ou na tabela para editar seus atributos.':'Fonte: '+source.arquivo);
    undo.disabled=cursor===0||drawing;redo.disabled=cursor===history.length-1||drawing;save.disabled=!editing||!editor.dirty||drawing||busy;
    syncEditRibbon();
  }
  const undo=button('Desfazer',()=>{draft=clone(history[--cursor]);editor.dirty=cursor>0;draw();render();});
  const redo=button('Refazer',()=>{draft=clone(history[++cursor]);editor.dirty=cursor>0;draw();render();});
  const save=button('Salvar nova versão',async()=>{
    busy=true;save.disabled=true;syncEditRibbon();status.textContent='Validando e gravando nova versão…';
    try{const file=await post('/bancada-arquivos/salvar',{arquivo:source.arquivo,revisao:source.revisao,geojson:draft,nome:name.value});closed();mount(file);app().log('Nova versão salva no storage e vinculada à execução.','ok');}
    catch(error){lastError=error.message;}finally{busy=false;if(editor)render();else syncEditRibbon();}
  });
  if(editing){const label=el('label','Nome da nova versão');label.append(name);footer.append(label);}
  else footer.append(button('Fechar',cancel));
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
  window.gpCommands.openPanel('Calcular campo',`<form id="gp-file-calculate"><div class="editor-body"><div class="field"><label>Arquivo</label><input value="${escapar(file.nome)}" readonly></div><div class="field"><label>Campo de destino</label><input name="campo" required></div><div class="field"><label>Expressão</label><textarea name="expressao" required placeholder="Ex.: area * 2"></textarea></div><p class="field-help">O campo é gravado no arquivo do storage e no banco, e o arquivo é recarregado na bancada.</p></div><div class="editor-actions"><button class="btn primary">Calcular</button></div></form>`);
  const form=document.querySelector('#gp-file-calculate');
  form.onsubmit=event=>{
    event.preventDefault();
    const submit=form.querySelector('button.primary');
    busy=true;submit.disabled=true;syncEditRibbon();
    const query=new URLSearchParams({campo:form.campo.value,expressao:form.expressao.value});
    json(`/camadas/${encodeURIComponent(file.id)}/calcular-campo?${query}`,{method:'POST'})
      .then(result=>post('/extracao-atributos/arquivo-mapa',{arquivo:file.arquivo})
        .then(atualizado=>{
          mount(atualizado);
          if(result.gravado_em_arquivo)app().log(`Campo ${form.campo.value} calculado em ${result.feicoes_atualizadas} feição(ões) e gravado no arquivo.`,'ok');
          // Sem arquivo no acervo o campo existe só no banco; dizer isso evita
          // o usuário concluir que o cálculo falhou ao não ver a coluna nova.
          else report(`Campo ${form.campo.value} calculado no banco, mas esta camada não tem arquivo no acervo para regravar.`);
        }))
      .catch(error=>report(error.message))
      .finally(()=>{busy=false;submit.disabled=false;syncEditRibbon();});
  };
}

async function execute(form){
  if(busy||editor)throw new Error('Salve ou cancele a edição antes de executar.');
  const data=new FormData(form),params={};
  for(const [key,value] of data){
    const input=form.elements[key];params[key]=input?.multiple?data.getAll(key):input?.type==='number'&&value!==''?Number(value):value;
  }
  for(const input of form.querySelectorAll('input[type=checkbox]'))params[input.name]=input.checked;
  if(params.pesos)params.pesos=String(params.pesos).split(',').map(Number);
  if(params.processar_sobre==='selecionadas')throw new Error('Neste fluxo execute sobre todas as feições ou salve a seleção como uma camada separada.');
  const files={};for(const [id,file] of sessions)if(Object.values(params).some(value=>value===id||Array.isArray(value)&&value.includes(id)))files[id]={arquivo:file.arquivo,revisao:file.revisao};
  busy=true;const submit=form.querySelector('button[type=submit],button.primary');if(submit)submit.disabled=true;
  try{const result=await post('/bancada-arquivos/executar',{operacao:form.dataset.op,parametros:params,arquivos:files});if(result.camada)mount(result.camada);app().log(`Execução concluída: ${result.execucao_id}`,'ok');}
  finally{busy=false;if(submit)submit.disabled=false;}
}

function init(){
  const previousAttributes=app().showAttributes,previousZoom=app().zoomToCatalogLayer;
  app().showAttributes=id=>{if(sessions.has(id)){app().state.activeLayerId=id;return openEditor(false);}return previousAttributes(id);};
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
    else if((edit&&sessions.has(edit.dataset.editLayer))||active()&&['attributes','calculate-field','select-attribute','filter-layer','save-layer','save-result','refresh-source'].includes(action)){
      event.preventDefault();event.stopImmediatePropagation();
      if(busy)return;
      if(edit)app().state.activeLayerId=edit.dataset.editLayer;
      if(action==='calculate-field'){calcularCampo().catch(error=>report(error.message));return;}
      if(action==='refresh-source'){const file=active();if(editor){report('Salve ou cancele a edição antes de atualizar a fonte.');return;}post('/extracao-atributos/arquivo-mapa',{arquivo:file.arquivo}).then(mount).catch(error=>report(error.message));return;}
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
  window.gpArquivos={abrir:browse,adicionar:mount,editar:()=>openEditor(true),tabela:()=>openEditor(false),sessions};
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
