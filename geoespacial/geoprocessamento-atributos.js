/* Tabulator cuida da grade; este adaptador conecta as sessões, o mapa e a API. */
(() => {
  const drafts=new Map(),app=()=>window.gpApp;
  const pageSymbol=paths=>`<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths.map(d=>`<path d="${d}"/>`).join('')}</svg>`;

  let current=null,grid=null,root=null,syncing=false,ready=false;
  const clean=row=>Object.fromEntries(Object.entries(row).filter(([k])=>k!=='_indice'&&!k.startsWith('__gp_')));
  const key=feature=>window.gpCommands.featureKey(feature.properties,feature.id);
  const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const $=selector=>root.querySelector(selector);
  async function request(url,payload){const response=await fetch(url,{method:payload?'POST':'GET',headers:payload?{'Content-Type':'application/json'}:undefined,body:payload?JSON.stringify(payload):undefined});const body=await response.json();if(!response.ok)throw Error(body.detail||`HTTP ${response.status}`);return body;}
  function status(text,error=false){$('[data-at-status]').textContent=text;$('[data-at-status]').classList.toggle('error',error);}
  function changed(d=current){return Boolean(d.dirty);}
  function markDirty(d){d.rows=grid.getData();d.dirty=JSON.stringify(d.rows)!==JSON.stringify(d.original);controls();}
  function controls(){if(!current||!root?.isConnected)return;const dirty=changed(),count=ready?grid.getSelectedData().length:0;$('[data-at-action="undo"]').disabled=!ready||!grid.getHistoryUndoSize()||current.busy;$('[data-at-action="redo"]').disabled=!ready||!grid.getHistoryRedoSize()||current.busy;$('[data-at-save]').disabled=!dirty||current.busy;$('[data-at-discard]').disabled=!dirty||current.busy;$('[data-at-edit]').disabled=current.readonly||current.busy;$('[data-at-delete]').disabled=current.readonly||!count||current.busy;$('[data-at-edit]').classList.toggle('active',current.editing);$('[data-at-edit]').setAttribute('aria-pressed',String(current.editing));$('[data-at-count]').textContent=`${current.rows.length} registros · ${count} selecionados${dirty?' · alterações pendentes':''}`;}
  function selection(){if(syncing||!ready)return;const rows=grid.getSelectedData();app().state.activeLayerId=current.id;window.gpCommands.setLayerSelection(current.id,rows.map(row=>({...row.__gp_feature,properties:clean(row)})));controls();}
  function sync(){
    if(syncing||!ready||!root?.isConnected)return;
    syncing=true;
    const features=(app().state.selectedGeoJSON?.features||[]).filter(f=>f.properties?.__gp_layer_id===current.id);
    const selected=new Set(features.filter(f=>f.properties.__gp_indice==null).map(f=>String(f.properties.__gp_selection_key??key(f))));
    const positions=new Set(features.filter(f=>f.properties.__gp_indice!=null).map(f=>Number(f.properties.__gp_indice)));
    const rows=current.rows.filter(r=>positions.has(r._indice)||selected.has(key(r.__gp_feature))||selected.has(key({...r.__gp_feature,properties:clean(r)})));
    grid.deselectRow();grid.selectRow(rows.map(r=>r.__gp_row));
    // O tile contém um recorte: usa a geometria integral já carregada pela tabela.
    if(positions.size)window.gpCommands.setLayerSelection(current.id,rows.map(r=>({...r.__gp_feature,properties:clean(r)})));
    syncing=false;controls();
  }
  function applyView(){grid.clearFilter();if(($('[data-at-only]').getAttribute('aria-pressed')==='true')){const ids=new Set(grid.getSelectedData().map(r=>r.__gp_row));grid.setFilter(row=>ids.has(row.__gp_row));}}
  function suggestValues(){
    const field=$('[data-at-field]').value;
    const values=[...new Set(current.rows.map(row=>row[field]).filter(value=>value!=null&&typeof value!=='object').map(String))];
    values.sort(new Intl.Collator('pt-BR',{numeric:true}).compare);
    const options=document.createDocumentFragment();
    values.forEach(value=>{const option=document.createElement('option');option.value=value;options.append(option);});
    $('[data-at-values]').replaceChildren(options);
  }
  function nullOperator(){return ['is_null','is_not_null'].includes($('[data-at-operator]').value);}
  function queryControls(){
    const input=$('[data-at-value]'),nullable=nullOperator();
    input.disabled=nullable;
    if(nullable)input.value='';
    input.placeholder=nullable?'Não requer valor':'Escolha ou digite um valor';
  }
  function selectRows(rows){
    syncing=true;
    try{grid.deselectRow();grid.selectRow(rows.map(r=>r.getIndex()));}
    finally{syncing=false;}
    selection();applyView();
  }
  function invertSelection(){
    const selected=new Set(grid.getSelectedData().map(r=>r.__gp_row));
    const rows=grid.getRows().filter(r=>!selected.has(r.getIndex()));
    selectRows(rows);status(`${rows.length} registros selecionados após inverter a seleção.`);
  }
  function query(){
    const field=$('[data-at-field]').value,type=$('[data-at-operator]').value;
    let rows;
    if(nullOperator()){
      rows=grid.getRows().filter(row=>type==='is_null'?row.getData()[field]==null:row.getData()[field]!=null);
    }else{
      let value=$('[data-at-value]').value;
      const column=current.body.colunas.find(c=>c.nome===field);
      if(/int|float|real|double/i.test(column?.tipo||'')&&type!=='like'){
        if(!value.trim())throw Error('Informe um número válido.');
        value=Number(value);if(!Number.isFinite(value))throw Error('Informe um número válido.');
      }
      if(/bool/i.test(column?.tipo||'')&&type!=='like'){
        if(!['true','false'].includes(String(value).toLowerCase()))throw Error('Escolha true ou false.');
        value=String(value).toLowerCase()==='true';
      }
      rows=grid.searchRows(field,type,value);
    }
    if($('[data-at-scope]').value==='selection'){
      const ids=new Set(grid.getSelectedData().map(r=>r.__gp_row));
      rows=rows.filter(r=>ids.has(r.getIndex()));
    }
    selectRows(rows);status(`${rows.length} registros encontrados.`);
  }
  async function save(){const d=current;if(window.gpFeedback&&!await window.gpFeedback.ProcessFeedback.confirmar({title:'Salvar alterações',message:'Gravar as edições e exclusões na camada original?',warning:'O arquivo original será alterado. Não será criada uma cópia.',confirmLabel:'Salvar alterações'}))return;d.busy=true;controls();try{
    const file=window.gpArquivos?.sessions.get(d.id),layer=app().state.layers.find(l=>l.id===d.id);
    const geojson={type:'FeatureCollection',features:d.rows.map(row=>({...row.__gp_feature,properties:clean(row)}))};
    let id=d.id;
    if(file){const result=await request('/api/geoespacial/bancada-arquivos/salvar',{arquivo:file.arquivo,camada_id:d.id,revisao:file.revisao,geojson});window.gpArquivos.adicionar(result);id=result.id;}
    else if(layer?.destino==='memoria_local'){app().state.map.getSource(id).setData(geojson);}
    else {const present=new Set(d.rows.map(r=>r._indice)),originals=new Map(d.original.map(r=>[r._indice,r]));const edicoes=d.rows.filter(r=>JSON.stringify(clean(r))!==JSON.stringify(clean(originals.get(r._indice)||{}))).map(r=>({indice:r._indice,campos:clean(r)}));await request(`/api/geoespacial/camadas/${encodeURIComponent(id)}/atributos/salvar`,{edicoes,excluidos:d.original.filter(r=>!present.has(r._indice)).map(r=>r._indice),revisao:d.body.revisao});const source=app().state.map.getSource(id);if(source?.setData)source.setData(geojson);else if(source?.setTiles)source.setTiles(source.serialize().tiles.map(tile=>tile.split('?')[0]+'?v='+Date.now()));else await app().refreshLayers(true,[id],id);}
    drafts.delete(d.id);window.gpCommands.setLayerSelection(d.id,[]);await app().showAttributes(id);status(file?'Alterações salvas no arquivo original do storage.':'Alterações salvas.');
  }catch(error){status(error.message,true);}finally{d.busy=false;controls();}}
  async function remove(){const selected=grid.getSelectedData();if(!selected.length)return;const ok=window.gpFeedback?await window.gpFeedback.ProcessFeedback.confirmar({title:'Excluir registros',message:`Remover ${selected.length} registro(s) e suas geometrias? A exclusão só será gravada ao salvar.`,danger:true,confirmLabel:'Remover da edição'}):window.confirm(`Remover ${selected.length} registro(s) e suas geometrias?`);if(!ok)return;const ids=new Set(selected.map(r=>r.__gp_row));current.rows=current.rows.filter(r=>!ids.has(r.__gp_row));await grid.deleteRow([...ids]);current.dirty=true;selection();controls();status('Exclusão pendente. Salve para confirmar ou descarte para restaurar.');}
  function maximize(){const expanded=root.classList.toggle('attribute-maximized'),button=$('[data-at-maximize]');const label=expanded?'Restaurar painel':'Maximizar tabela';button.title=label;button.setAttribute('aria-label',label);button.setAttribute('aria-expanded',String(expanded));button.innerHTML=`<i data-lucide="${expanded?'minimize':'maximize'}" aria-hidden="true"></i>`;window.lucide?.createIcons();grid.redraw(true);}

  function render(id,body){
    ready=false;if(grid)grid.destroy();
    let d=drafts.get(id);if(!d||!changed(d)){const rows=body.registros.map((r,i)=>({...structuredClone(r),__gp_row:i}));d={id,body,rows,original:structuredClone(rows),editing:false,readonly:Boolean(body.homologada||body.somente_leitura||app().state.layers.find(l=>l.id===id)?.previaAproximada)};drafts.set(id,d);}current=d;d.editing=d.editing||app().state.editingLayers.has(id);
    const host=document.querySelector('#gp-editor-view');host.replaceChildren(document.querySelector('#gp-attribute-template').content.cloneNode(true));root=host.firstElementChild;
    $('[data-at-title]').textContent=app().state.layers.find(l=>l.id===id)?.nome||id;
    const tabs=$('[data-at-layers]');(app().state.attributeTableLayers||[]).filter(id=>app().state.layers.some(l=>l.id===id)).forEach(layerId=>{const button=document.createElement('button');button.type='button';button.dataset.attributeLayer=layerId;button.textContent=app().state.layers.find(l=>l.id===layerId)?.nome||layerId;button.classList.toggle('active',layerId===id);button.onclick=()=>app().showAttributes(layerId);tabs.append(button);});
    const columns=d.body.colunas.filter(c=>c.nome!=='_indice'&&!c.nome.startsWith('__gp_'));
    columns.forEach(c=>{const option=document.createElement('option');option.value=option.textContent=c.nome;$('[data-at-field]').append(option);});
    grid=new Tabulator($('[data-at-grid]'),{data:d.rows,index:'__gp_row',height:'100%',layout:'fitDataStretch',nestedFieldSeparator:false,history:true,movableColumns:true,selectableRows:true,selectableRowsRangeMode:'click',editTriggerEvent:'dblclick',pagination:true,paginationSize:100,paginationSizeSelector:[25,50,100,500],locale:'pt-br',langs:{'pt-br':{pagination:{page_size:'Por página',first:pageSymbol(['m11 17-5-5 5-5','m18 17-5-5 5-5']),first_title:'Primeira página',last:pageSymbol(['m6 17 5-5-5-5','m13 17 5-5-5-5']),last_title:'Última página',prev:pageSymbol(['m15 18-6-6 6-6']),prev_title:'Página anterior',next:pageSymbol(['m9 18 6-6-6-6']),next_title:'Próxima página',page_title:'Ir para a página',all:'Todos'}}},placeholder:'Nenhum registro encontrado',rowHeader:{formatter:'rowSelection',titleFormatter:'rowSelection',titleFormatterParams:{rowRange:'active'},headerSort:false,hozAlign:'center',width:38,frozen:true},columns:columns.map(c=>({title:esc(c.nome),field:c.nome,minWidth:135,formatter:'plaintext',editor:/bool/i.test(c.tipo)?'tickCross':/int|float|real|double/i.test(c.tipo)?'number':'input',editorParams:/int|float|real|double/i.test(c.tipo)?{step:/int/i.test(c.tipo)?1:'any'}:{},editable:cell=>d.editing&&!d.readonly&&!d.busy&&(cell.getValue()===null||typeof cell.getValue()!=='object'),validator:/int/i.test(c.tipo)?'integer':undefined}))});
    grid.on('tableBuilt',()=>{ready=true;sync();controls();});grid.on('rowSelectionChanged',selection);grid.on('cellEdited',()=>{markDirty(d);});grid.on('historyUndo',()=>{markDirty(d);});grid.on('historyRedo',()=>{markDirty(d);});
    root.addEventListener('click',event=>{const action=event.target.closest('[data-at-action]')?.dataset.atAction;if(!action||!ready||current.busy)return;Promise.resolve().then(async()=>{if(action==='maximize')maximize();if(action==='query')query();if(action==='invert')invertSelection();if(action==='clear'){grid.clearFilter(true);grid.deselectRow();$('[data-at-only]').setAttribute('aria-pressed','false');$('[data-at-only]').classList.remove('active');}if(action==='only'){const button=$('[data-at-only]'),active=button.getAttribute('aria-pressed')!=='true';button.setAttribute('aria-pressed',String(active));button.classList.toggle('active',active);applyView();}if(action==='all')grid.selectRow('active');if(action==='zoom')window.gpCommands.fitSelection();if(action==='edit'){d.editing=!d.editing;controls();status(d.editing?'Duplo clique na célula para editar. Salve ao terminar.':'Edição desativada.');}if(action==='delete')await remove();if(action==='save')await save();if(action==='discard'){drafts.delete(id);render(id,body);}if(action==='undo')grid.undo();if(action==='redo')grid.redo();if(action==='csv')grid.download('csv',`${id}.csv`,{bom:true});}).catch(e=>status(e.message,true));});
    window.lucide?.createIcons();
    $('[data-at-field]').onchange=()=>{$('[data-at-value]').value='';suggestValues();};
    $('[data-at-operator]').onchange=queryControls;
    queryControls();
    $('[data-at-value]').onfocus=suggestValues;
    suggestValues();
    $('[data-at-query]').onsubmit=event=>{event.preventDefault();try{query();}catch(e){status(e.message,true);}};
    controls();status(d.readonly?(body.somente_leitura||'Camada somente leitura.'):'Clique para selecionar · duplo clique para editar quando a edição estiver ativa.');
  }
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&root?.classList.contains('attribute-maximized'))maximize();});
  window.addEventListener('beforeunload',event=>{if([...drafts.values()].some(d=>changed(d))){event.preventDefault();event.returnValue='';}});
  window.gpAttributeTable={render,sync,get grid(){return grid;}};
})();
