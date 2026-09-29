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
  function changed(d=current){return d.remote?Boolean(d.edits.size||d.excluidos.size):Boolean(d.dirty);}
  function markDirty(d){
    d.rows=grid.getData();
    if(d.remote){
      for(const row of d.rows){
        const fid=row.__gp_fid,original=d.originalByFid.get(fid)||{},values=clean(row);
        const fields=Object.fromEntries(Object.keys({...original,...values}).filter(name=>JSON.stringify(original[name])!==JSON.stringify(values[name])).map(name=>[name,values[name]]));
        if(Object.keys(fields).length)d.edits.set(fid,fields);else d.edits.delete(fid);
      }
    }else d.dirty=JSON.stringify(d.rows)!==JSON.stringify(d.original);
    controls();
  }
  function controls(){if(!current||!root?.isConnected)return;const dirty=changed(),count=ready?grid.getSelectedData().length:0;$('[data-at-action="undo"]').disabled=!ready||!grid.getHistoryUndoSize()||current.busy;$('[data-at-action="redo"]').disabled=!ready||!grid.getHistoryRedoSize()||current.busy;$('[data-at-save]').disabled=!dirty||current.busy;$('[data-at-discard]').disabled=!dirty||current.busy;$('[data-at-edit]').disabled=current.readonly||current.busy;$('[data-at-delete]').disabled=current.readonly||!count||current.busy;$('[data-at-edit]').classList.toggle('active',current.editing);$('[data-at-edit]').setAttribute('aria-pressed',String(current.editing));const total=current.remote&&current.total!=null?` · ${current.total} no total`:'';$('[data-at-count]').textContent=current.remote?`Página atual: ${current.rows.length} registros${total} · ${count} selecionados nesta página${dirty?' · alterações pendentes':''}`:`${current.rows.length} registros · ${count} selecionados${dirty?' · alterações pendentes':''}`;}
  function selection(){if(syncing||!ready)return;const rows=grid.getSelectedData();app().state.activeLayerId=current.id;if(current.remote){if(!current.loadingPage)remoteSelection(current,rows);}else window.gpCommands.setLayerSelection(current.id,rows.map(row=>({...row.__gp_feature,properties:clean(row)})));controls();}
  // Seleções feitas em outras páginas permanecem no mapa; só os FIDs da página carregada são substituídos.
  async function remoteSelection(d,rows){
    const token=d.selectionToken=(d.selectionToken||0)+1,file=window.gpArquivos?.sessions.get(d.id);if(!file)return;
    const revisao=d.body.revisao||file.revisao;if(d.geometriesRevision!==revisao){d.geometries=new Map();d.geometriesRevision=revisao;}
    const page=new Set(grid.getData().map(row=>String(row.__gp_fid))),selected=rows.map(row=>String(row.__gp_fid)),missing=selected.filter(fid=>!d.geometries.has(fid));
    try{
      for(let i=0;i<missing.length;i+=100){
        const ids=missing.slice(i,i+100),result=await request('/api/geoespacial/bancada-arquivos/geometrias',{id:d.id,arquivo:file.arquivo,revisao,ids});
        if(token!==d.selectionToken||current!==d)return;
        const found=new Map((result.features||[]).map(feature=>[String(feature.id),feature.geometry??null])),absent=ids.filter(fid=>!found.has(fid));
        if(absent.length)throw Error(`o servidor não retornou a geometria de ${absent.length} registro(s).`);
        found.forEach((geometry,fid)=>d.geometries.set(fid,geometry));
      }
    }catch(error){if(token===d.selectionToken&&current===d&&root?.isConnected)status(`Seleção não aplicada ao mapa: ${error.message}`,true);return;}
    if(token!==d.selectionToken||current!==d)return;
    const byFid=new Map(rows.map(row=>[String(row.__gp_fid),row]));
    const kept=(app().state.selectedGeoJSON?.features||[]).filter(feature=>{if(feature.properties?.__gp_layer_id!==d.id)return false;const fid=String(feature.properties.__gp_selection_key??feature.id);return !page.has(fid)&&!d.excluidos.has(fid);}).map(({properties:{__gp_layer_id,__gp_selection_key,...properties},...feature})=>({...feature,properties}));
    syncing=true;try{window.gpCommands.setLayerSelection(d.id,[...kept,...selected.map(fid=>({type:'Feature',id:fid,geometry:d.geometries.get(fid)??null,properties:clean(byFid.get(fid))}))]);}finally{syncing=false;}
    controls();
  }
  function sync(){
    if(syncing||!ready||!root?.isConnected)return;
    syncing=true;
    const features=(app().state.selectedGeoJSON?.features||[]).filter(f=>f.properties?.__gp_layer_id===current.id);
    if(current.remote){
      const selected=new Set(features.flatMap(f=>[f.properties.__gp_selection_key,f.id,f.properties.FID,f.properties.fid].filter(value=>value!=null).map(String)));
      const rows=current.rows.filter(row=>selected.has(row.__gp_fid));
      grid.deselectRow();grid.selectRow(rows.map(row=>row.__gp_row));syncing=false;controls();return;
    }
    const selected=new Set(features.filter(f=>f.properties.__gp_indice==null).map(f=>String(f.properties.__gp_selection_key??key(f))));
    const positions=new Set(features.filter(f=>f.properties.__gp_indice!=null).map(f=>Number(f.properties.__gp_indice)));
    const rows=current.rows.filter(r=>positions.has(r._indice)||selected.has(key(r.__gp_feature))||selected.has(key({...r.__gp_feature,properties:clean(r)})));
    grid.deselectRow();grid.selectRow(rows.map(r=>r.__gp_row));
    // O tile contém um recorte: usa a geometria integral já carregada pela tabela.
    if(positions.size)window.gpCommands.setLayerSelection(current.id,rows.map(r=>({...r.__gp_feature,properties:clean(r)})));
    syncing=false;controls();
  }
  const filterKeys=new WeakMap();
  function withinLayer(row){const data=app().state.layerFilterFeatures?.[current.id];if(!data)return true;if(!filterKeys.has(data))filterKeys.set(data,new Set(data.features.map(key)));if(current.remote){const feature={type:'Feature',id:row.__gp_fid,properties:clean(row)};return filterKeys.get(data).has(String(row.__gp_fid))||filterKeys.get(data).has(key(feature));}return filterKeys.get(data).has(key(row.__gp_feature));}
  function applyView(){const only=$('[data-at-only]').getAttribute('aria-pressed')==='true',ids=new Set(grid.getSelectedData().map(r=>r.__gp_row));grid.setFilter(row=>withinLayer(row)&&(!only||ids.has(row.__gp_row)));}

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
    const rows=grid.getRows().filter(r=>withinLayer(r.getData())&&!selected.has(r.getIndex()));
    selectRows(rows);status(`${rows.length} registros selecionados após inverter a seleção${current.remote?' nesta página':''}.`);
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
    rows=rows.filter(row=>withinLayer(row.getData()));
    if($('[data-at-scope]').value==='selection'){
      const ids=new Set(grid.getSelectedData().map(r=>r.__gp_row));
      rows=rows.filter(r=>ids.has(r.getIndex()));
    }
    selectRows(rows);status(`${rows.length} registros encontrados${current.remote?' nesta página':''}.`);
  }
  async function save(){const d=current;if(window.gpFeedback&&!await window.gpFeedback.ProcessFeedback.confirmar({title:'Salvar alterações',message:'Gravar as edições e exclusões na camada original?',warning:'O arquivo original será alterado. Não será criada uma cópia.',confirmLabel:'Salvar alterações'}))return;d.busy=true;controls();try{
    const file=window.gpArquivos?.sessions.get(d.id),layer=app().state.layers.find(l=>l.id===d.id);
    let id=d.id;
    if(file){
      if(!d.remote)throw Error('A edição desta sessão não foi carregada pela tabela paginada. Reabra a tabela antes de salvar.');
      const result=await request('/api/geoespacial/bancada-arquivos/salvar-edicoes',{
        arquivo:file.arquivo,camada_id:d.id,revisao:d.body.revisao||file.revisao,
        edicoes:[...d.edits].map(([fid,campos])=>({fid,campos})),excluidos:[...d.excluidos],
      });
      const saved=result.camada&&typeof result.camada==='object'?result.camada:result;
      if(saved.id&&saved.id!==d.id)throw Error('O servidor retornou uma camada diferente da sessão editada.');
      if(!saved.revisao)throw Error('A gravação não retornou a revisão atualizada. As alterações permanecem pendentes nesta tabela.');
      const refreshed={...saved,id:d.id,arquivo:file.arquivo};
      drafts.delete(d.id);
      if(window.gpArquivos?.sincronizarSalvamento)await window.gpArquivos.sincronizarSalvamento(refreshed);
      else {file.revisao=refreshed.revisao;await app().refreshLayers(true,[d.id],d.id);}
    }else{
      const geojson={type:'FeatureCollection',features:d.rows.map(row=>({...row.__gp_feature,properties:clean(row)}))};
      if(layer?.destino==='memoria_local'){app().state.map.getSource(id).setData(geojson);}
      else {const present=new Set(d.rows.map(r=>r._indice)),originals=new Map(d.original.map(r=>[r._indice,r]));const edicoes=d.rows.filter(r=>JSON.stringify(clean(r))!==JSON.stringify(clean(originals.get(r._indice)||{}))).map(r=>({indice:r._indice,campos:clean(r)}));await request(`/api/geoespacial/camadas/${encodeURIComponent(id)}/atributos/salvar`,{edicoes,excluidos:d.original.filter(r=>!present.has(r._indice)).map(r=>r._indice),revisao:d.body.revisao});const source=app().state.map.getSource(id);if(source?.setData)source.setData(geojson);else if(source?.setTiles)source.setTiles(source.serialize().tiles.map(tile=>tile.split('?')[0]+'?v='+Date.now()));else await app().refreshLayers(true,[id],id);}
      drafts.delete(d.id);
    }
    if(!file)window.gpCommands.setLayerSelection(d.id,[]);
    await app().showAttributes(id);status(file?'Alterações salvas no arquivo original.':'Alterações salvas.');
  }catch(error){status(error.message,true);}finally{d.busy=false;controls();}}
  async function remove(){const selected=grid.getSelectedData();if(!selected.length)return;const ok=window.gpFeedback?await window.gpFeedback.ProcessFeedback.confirmar({title:'Excluir registros',message:`Remover ${selected.length} registro(s)${current.remote?' desta página':''} e suas geometrias? A exclusão só será gravada ao salvar.`,danger:true,confirmLabel:'Remover da edição'}):window.confirm(`Remover ${selected.length} registro(s)?`);if(!ok)return;const ids=new Set(selected.map(r=>r.__gp_row));if(current.remote)selected.forEach(row=>{current.excluidos.add(row.__gp_fid);current.edits.delete(row.__gp_fid);});current.rows=current.rows.filter(r=>!ids.has(r.__gp_row));await grid.deleteRow([...ids]);if(!current.remote)current.dirty=true;selection();controls();status(`Exclusão pendente${current.remote?' nesta página':''}. Salve para confirmar ou descarte para restaurar.`);}
  function maximize(){const expanded=root.classList.toggle('attribute-maximized'),button=$('[data-at-maximize]');const label=expanded?'Restaurar painel':'Maximizar tabela';button.title=label;button.setAttribute('aria-label',label);button.setAttribute('aria-expanded',String(expanded));button.innerHTML=`<i data-lucide="${expanded?'minimize':'maximize'}" aria-hidden="true"></i>`;window.lucide?.createIcons();grid.redraw(true);}

  function render(id,body){
    ready=false;if(grid)grid.destroy();
    const remote=Boolean(window.gpArquivos?.sessions.get(id));
    let d=drafts.get(id);if(!d||!changed(d)){const rows=remote?[]:body.registros.map((r,i)=>({...structuredClone(r),__gp_row:i}));const layerReadOnly=Boolean(body.homologada||body.somente_leitura||app().state.layers.find(l=>l.id===id)?.previaAproximada),unsupportedFile=remote&&!id.startsWith('storage:');d={id,body,rows,original:structuredClone(rows),remote,total:body.total,edits:new Map(),excluidos:new Set(),originalByFid:new Map(),editing:false,readonly:layerReadOnly||unsupportedFile,readonlyReason:body.somente_leitura|| (unsupportedFile?'Edição incremental disponível apenas para arquivos nativos do storage.':layerReadOnly?'Camada somente leitura.':'')};drafts.set(id,d);}else{d.body=body;d.total=body.total;d.remote=remote;}current=d;d.editing=d.editing||app().state.editingLayers.has(id);
    const host=document.querySelector('#gp-editor-view');host.replaceChildren(document.querySelector('#gp-attribute-template').content.cloneNode(true));root=host.firstElementChild;
    $('[data-at-title]').textContent=app().state.layers.find(l=>l.id===id)?.nome||id;
    const tabs=$('[data-at-layers]');(app().state.attributeTableLayers||[]).filter(id=>app().state.layers.some(l=>l.id===id)).forEach(layerId=>{const button=document.createElement('button');button.type='button';button.dataset.attributeLayer=layerId;button.textContent=app().state.layers.find(l=>l.id===layerId)?.nome||layerId;button.classList.toggle('active',layerId===id);button.onclick=()=>app().showAttributes(layerId);tabs.append(button);});
    const columns=d.body.colunas.filter(c=>c.nome!=='_indice'&&!c.nome.startsWith('__gp_'));
    columns.forEach(c=>{const option=document.createElement('option');option.value=option.textContent=c.nome;$('[data-at-field]').append(option);});
    const config=remote?{ajaxURL:'/api/geoespacial/bancada-arquivos/tabela',ajaxConfig:'POST',ajaxRequestFunc:async(_url,_config,params)=>{
      const page=Math.max(1,Number(params.page)||1),size=Math.min(500,Math.max(1,Number(params.size)||100)),file=window.gpArquivos.sessions.get(id);
      d.loadingPage=true;
      try{
        const result=await request('/api/geoespacial/bancada-arquivos/tabela',{id,arquivo:file.arquivo,revisao:d.body.revisao||file.revisao,offset:(page-1)*size,limite:size});
        if(result.revisao!==(d.body.revisao||file.revisao))throw Error('A revisão do arquivo mudou. Reabra a tabela antes de continuar.');
        if(!Array.isArray(result.linhas))throw Error('O servidor não retornou as linhas da página solicitada.');
        const rows=result.linhas.filter(row=>!d.excluidos.has(String(row.id))).map(row=>{
          const fid=String(row.id),original=row.atributos||{};
          if(!d.originalByFid.has(fid))d.originalByFid.set(fid,structuredClone(original));
          return {...original,...(d.edits.get(fid)||{}),__gp_fid:fid,__gp_row:fid};
        });
        d.rows=rows;d.total=result.total;
        const lastPage=result.total==null?(result.has_more?page+1:page):Math.max(1,Math.ceil(result.total/size));
        setTimeout(()=>{if(current===d&&root?.isConnected){d.rows=grid.getData();controls();}},0);
        return {last_page:lastPage,data:rows};
      }catch(error){d.loadingPage=false;if(current===d&&root?.isConnected)status(error.message,true);throw error;}
    }}:{data:d.rows};
    grid=new Tabulator($('[data-at-grid]'),{...config,index:'__gp_row',height:'100%',layout:'fitDataStretch',nestedFieldSeparator:false,history:true,movableColumns:true,selectableRows:true,selectableRowsPersistence:!remote,selectableRowsRangeMode:'click',editTriggerEvent:'dblclick',pagination:true,paginationMode:remote?'remote':'local',paginationSize:100,paginationSizeSelector:[25,50,100,500],locale:'pt-br',langs:{'pt-br':{pagination:{page_size:'Por página',first:pageSymbol(['m11 17-5-5 5-5','m18 17-5-5 5-5']),first_title:'Primeira página',last:pageSymbol(['m6 17 5-5-5-5','m13 17 5-5-5-5']),last_title:'Última página',prev:pageSymbol(['m15 18-6-6 6-6']),prev_title:'Página anterior',next:pageSymbol(['m9 18 6-6-6-6']),next_title:'Próxima página',page_title:'Ir para a página',all:'Todos'}}},placeholder:'Nenhum registro encontrado',rowHeader:{formatter:'rowSelection',titleFormatter:'rowSelection',titleFormatterParams:{rowRange:'active'},headerSort:false,hozAlign:'center',width:38,frozen:true},columns:columns.map(c=>({title:esc(c.nome),field:c.nome,minWidth:135,headerSort:!remote,formatter:'plaintext',editor:/bool/i.test(c.tipo)?'tickCross':/int|float|real|double/i.test(c.tipo)?'number':'input',editorParams:/int|float|real|double/i.test(c.tipo)?{step:/int/i.test(c.tipo)?1:'any'}:{},editable:cell=>d.editing&&!d.readonly&&!d.busy&&(cell.getValue()===null||typeof cell.getValue()!=='object'),validator:/int/i.test(c.tipo)?'integer':undefined}))});
    // Após trocar de página, a seleção do mapa é reaplicada às linhas carregadas.
    // dataLoaded/pageLoaded disparam antes da troca das linhas; a limpeza de seleção do Tabulator vem depois.
    function pageReady(){if(current!==d)return;d.rows=grid.getData();if(d.remote&&d.loadingPage){d.loadingPage=false;if(ready)sync();}controls();}
    grid.on('tableBuilt',()=>{ready=true;sync();applyView();controls();});grid.on('rowSelectionChanged',selection);grid.on('dataProcessed',pageReady);grid.on('cellEdited',()=>{markDirty(d);});grid.on('historyUndo',()=>{markDirty(d);});grid.on('historyRedo',()=>{markDirty(d);});
    root.addEventListener('click',event=>{const action=event.target.closest('[data-at-action]')?.dataset.atAction;if(!action||!ready||current.busy)return;Promise.resolve().then(async()=>{if(action==='maximize')maximize();if(action==='query')query();if(action==='invert')invertSelection();if(action==='clear'){grid.clearFilter(true);grid.deselectRow();$('[data-at-only]').setAttribute('aria-pressed','false');$('[data-at-only]').classList.remove('active');applyView();}if(action==='only'){const button=$('[data-at-only]'),active=button.getAttribute('aria-pressed')!=='true';button.setAttribute('aria-pressed',String(active));button.classList.toggle('active',active);applyView();}if(action==='all'){grid.selectRow('active');if(d.remote)status('Seleção aplicada somente aos registros carregados nesta página; seleções de outras páginas são mantidas no mapa.');}if(action==='zoom')window.gpCommands.fitSelection();if(action==='edit'){d.editing=!d.editing;controls();status(d.editing?'Duplo clique na célula para editar. Salve ao terminar.':'Edição desativada.');}if(action==='delete')await remove();if(action==='save')await save();if(action==='discard'){drafts.delete(id);render(id,body);}if(action==='undo')grid.undo();if(action==='redo')grid.redo();if(action==='csv'){grid.download('csv',`${id}.csv`,{bom:true});if(d.remote)status('CSV exportado somente com os registros desta página.');}}).catch(e=>status(e.message,true));});
    window.lucide?.createIcons();
    $('[data-at-field]').onchange=()=>{$('[data-at-value]').value='';suggestValues();};
    $('[data-at-operator]').onchange=queryControls;
    queryControls();
    $('[data-at-value]').onfocus=suggestValues;
    suggestValues();
    $('[data-at-query]').onsubmit=event=>{event.preventDefault();try{query();}catch(e){status(e.message,true);}};
    controls();status(d.readonly?(d.readonlyReason||'Camada somente leitura.'):d.remote?'Tabela paginada no servidor. Consulta, “selecionar todos”, inversão e CSV abrangem somente a página carregada; a seleção é enviada ao mapa por FID e a de outras páginas é mantida.':'Clique para selecionar · duplo clique para editar quando a edição estiver ativa.');
  }
  let nativeTableRequest=0;
  async function showNativeFileAttributes(layerId){
    const file=window.gpArquivos.sessions.get(layerId),state=app().state,requestId=++nativeTableRequest;
    state.activeLayerId=layerId;state.activeAttributeLayerId=layerId;state.attributeTableLayers??=[];
    if(!state.attributeTableLayers.includes(layerId))state.attributeTableLayers.push(layerId);
    const tabs=document.querySelector('.gp-right-tabs');
    let tab=tabs?.querySelector('[data-right-tab="attributes"]');
    if(tabs&&!tab){
      tab=document.createElement('button');tab.type='button';tab.role='tab';tab.dataset.rightTab='attributes';tab.dataset.dynamicTab='attributes';tab.setAttribute('aria-selected','false');tab.title='Tabela de Atributos';
      tab.innerHTML='<i data-tab-icon data-lucide="table-2"></i><span>Tabela de Atributos</span><i data-tab-close="attributes" data-lucide="x"></i>';tabs.append(tab);
    }
    if(tab){tab.hidden=false;tab.dataset.layerId=layerId;document.querySelectorAll('[data-right-tab]').forEach(button=>{const active=button===tab;button.classList.toggle('active',active);button.setAttribute('aria-selected',String(active));});}
    document.querySelector('.gp-app')?.classList.remove('right-collapsed');
    document.querySelector('#gp-tools-view')?.classList.remove('active');
    document.querySelector('#gp-editor-view')?.classList.add('active');
    document.querySelector('#gp-right-title').textContent='Tabela de Atributos';
    const editor=document.querySelector('#gp-editor-view');
    editor.innerHTML='<div class="empty">Carregando atributos…</div>';
    const fields=Array.isArray(file.campos)?file.campos:[];
    const fallback=Object.keys(file.geojson?.features?.[0]?.properties||{}).map(nome=>({nome,tipo:typeof file.geojson.features[0].properties[nome]==='number'?'float64':typeof file.geojson.features[0].properties[nome]==='boolean'?'bool':'string'}));
    const colunas=(fields.length?fields:fallback).filter(field=>field.nome).map(field=>({nome:field.nome,tipo:/bool/i.test(field.subtipo||'')?'bool':field.tipo||field.subtipo||'string'}));
    if(!colunas.length){editor.firstElementChild.textContent=`${file.nome||layerId}: o servidor não retornou os metadados dos campos.`;return;}
    const body={revisao:file.revisao,total:file.feicoes??null,colunas,registros:[],remoteFile:true};
    try{await window.gpCommands?.refreshLayerFilter?.(layerId);}catch(error){if(requestId===nativeTableRequest)editor.firstElementChild.textContent=error.message;return;}
    if(requestId!==nativeTableRequest||window.gpArquivos.sessions.get(layerId)!==file)return;
    state.attributeTableCache??={};state.attributeTableCache[layerId]=body;render(layerId,body);
  }
  function hookApp(value){
    if(!value||typeof value.showAttributes!=='function'||value.showAttributes.__gpFileTableHook)return;
    const showAttributes=value.showAttributes;
    value.showAttributes=function(layerId,...args){
      const id=layerId||this.state.activeLayerId||this.state.activeAttributeLayerId;
      if(window.gpArquivos?.sessions.has(id))return showNativeFileAttributes(id);
      return showAttributes.call(this,layerId,...args);
    };
    value.showAttributes.__gpFileTableHook=true;
  }
  const appDescriptor=Object.getOwnPropertyDescriptor(window,'gpApp');
  if(!appDescriptor||appDescriptor.configurable){
    let application=window.gpApp;
    Object.defineProperty(window,'gpApp',{configurable:true,enumerable:appDescriptor?.enumerable??true,get:()=>application,set:value=>{application=value;hookApp(value);}});
  }
  hookApp(window.gpApp);
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&root?.classList.contains('attribute-maximized'))maximize();});
  window.addEventListener('beforeunload',event=>{if([...drafts.values()].some(d=>changed(d))){event.preventDefault();event.returnValue='';}});
  window.gpAttributeTable={render,sync,applyLayerFilter(id){if(ready&&current?.id===id&&root?.isConnected)applyView();},hasPendingChanges(id){const draft=drafts.get(id);return Boolean(draft&&changed(draft));},atualizarArquivo(id){const draft=drafts.get(id);if(!draft?.dirty)drafts.delete(id);if(app().state.attributeTableCache)delete app().state.attributeTableCache[id];},get grid(){return grid;}};
})();
