/* Progresso medido por operações concluídas e fontes renderizadas no mapa. */
(function (global) {
  function create(root, getMapState) {
    let active = null;
    const states = new Map();
    let frame = null, rows = null;
    const controls = new WeakMap();
    const descendants = new WeakMap();
    // Only structural changes invalidate the index; tile/render events reuse it.
    const observer = new MutationObserver(records => {
      if(!records.some(record=>!record.target.closest?.('.layer-item__loading,.layer-item__actions')))return;
      rows = null; if (active) schedule(active);
    });
    if (root) observer.observe(root, {childList:true, subtree:true});
    function schedule(op) {
      if (active !== op || frame !== null) return;
      frame = requestAnimationFrame(() => { frame = null; render(op); });
    }
    function indexTree() {
      if (rows) return;
      decorate();
      rows = [...root.querySelectorAll('.geo-layer-record[data-id], .geo-layer-folder, .layer-group--tipo:not(#geo-basemap-group)')];
      rows.forEach(row => {
        descendants.set(row, []);
        const header = row.querySelector(':scope > .layer-group-header-row');
        const loading = row.querySelector(':scope > .layer-item__loading');
        controls.set(row, {input:header?.querySelector('input'), health:header?.querySelector('.layer-health'), icon:header?.querySelector('.layer-health i'), button:header?.querySelector('.layer-reload-btn'), loading,
          text:loading?.querySelector('.layer-item__loading-text'), track:loading?.querySelector('.layer-item__loading-bar'), fill:loading?.querySelector('.layer-item__loading-fill')});
      });
      rows.forEach(row => {
        for (let parent=row.parentElement?.closest('.geo-layer-folder,.layer-group--tipo'); parent && root.contains(parent); parent=parent.parentElement?.closest('.geo-layer-folder,.layer-group--tipo')) descendants.get(parent)?.push(row);
      });
      // Ignore the decorations just inserted; subsequent source events use this index.
      observer.takeRecords();
    }
    function keyOf(row) { return row.dataset.id || row.dataset.folderId || row.id; }
    function resolveRoot() {
      if (!root?.isConnected) { root = document.getElementById('geo-layers-root'); rows = null; if(root)observer.observe(root,{childList:true,subtree:true}); }
      return root;
    }
    function decorate() {
      if (!resolveRoot()) return;
      root.querySelectorAll('.geo-layer-record[data-id], .geo-layer-folder, .layer-group--tipo:not(#geo-basemap-group)').forEach(row=>{
        const header=row.querySelector(':scope > .layer-group-header-row');
        if(!header || header.querySelector('.layer-item__actions'))return;
        const actions=document.createElement('div');actions.className='layer-item__actions';
        actions.innerHTML='<span class="layer-health layer-health--hidden"><i aria-hidden="true"></i></span><button type="button" class="layer-reload-btn" title="Recarregar somente este item" aria-label="Recarregar este item"><i class="fa-solid fa-sync-alt" aria-hidden="true"></i></button>';
        actions.querySelector('button').addEventListener('click',event=>{event.stopPropagation();getMapState().reload?.(row);});
        header.append(actions);
        const loading=document.createElement('div');loading.className='layer-item__loading';
        loading.innerHTML='<div class="layer-item__loading-bar" role="progressbar" aria-label="Progresso deste item"><span class="layer-item__loading-fill"></span></div><span class="layer-item__loading-text"></span>';
        header.after(loading);
      });
    }
    function status(item) {
      const {task,op}=item;
      if(task.state==='failed')return {state:'error',text:task.error,ready:false};
      if(task.state==='cancelled')return {state:'error',text:'Interrompido',ready:false};
      if(task.state==='pending')return {state:'loading',text:task.started?'Carregando…':'Na fila…',ready:false};
      if(task.kind!=='camada')return {state:'ok',text:'Pronto',ready:true};
      const {layers,map}=getMapState(),layer=layers.get(task.key);
      if(layer && (op.drawnSources.has(layer.sourceId)||active?.drawnSources.has(layer.sourceId)) && (!map || map.getSource(layer.sourceId) && map.isSourceLoaded(layer.sourceId)))return {state:'ok',text:'Pronto',ready:true};
      if(op.finished)return {state:'error',text:'Desenho pendente',ready:false};
      let tiles=op.tiles.get(layer?.sourceId);
      if(tiles?.requested.size && tiles.loaded.size>=tiles.requested.size)tiles=null;
      return {state:'loading',text:tiles?.requested.size ? `Tiles ${tiles.loaded.size}/${tiles.requested.size}`:'Desenhando…',ready:false,tiles};
    }
    function render(op) {
      if(active!==op)return;
      op.tasks.filter(task=>task.key).forEach(task=>states.set(task.key,{task,op}));
      if (!resolveRoot()) return;
      indexTree();
      const resultCache = new Map();
      const measured = item => { if(!resultCache.has(item))resultCache.set(item,status(item)); return resultCache.get(item); };
      rows.forEach(row=>{
        const own=states.get(keyOf(row));
        const isLayer=row.matches('.geo-layer-record');
        const ui = controls.get(row), selected=ui.input?.checked;
        let items=isLayer ? (own?[own]:[]) : [own,...descendants.get(row).filter(child=>!child.matches('.geo-layer-record') || controls.get(child)?.input?.checked || states.get(keyOf(child))?.task.state==='failed').map(child=>states.get(keyOf(child)))].filter(Boolean);
        if(!isLayer){
          const layers=items.filter(item=>item.task.kind==='camada');
          if(own?.task.state==='pending' && own.task.kind!=='camada')items=[own];
          else if(layers.length)items=layers;
        }
        const {health,loading}=ui;
        if(!health||!loading)return;
        if(!items.length || (isLayer&&!selected&&own?.task.state==='done')){
          health.className='layer-health layer-health--hidden';loading.classList.remove('layer-item__loading--visible');return;
        }
        const results=items.map(measured),failed=results.filter(value=>value.state==='error');
        const ready=results.filter(value=>value.ready).length;
        const pending=results.some(value=>value.state==='loading');
        const state=pending?'loading':failed.length?'error':'ok';
        const text=isLayer?results[0].text:pending?`${ready}/${items.length}`:failed.length?`${failed.length} falha(s)`:`${ready}/${items.length} · Pronto`;
        health.className=`layer-health layer-health--${state}`;
        health.title=failed.length?failed.map(value=>value.text).join('; '):text;
        health.setAttribute('aria-label',state==='ok'?'OK':state==='error'?'Erro':'Carregando');
        ui.icon.className=state==='ok'?'fa-solid fa-check':state==='error'?'fa-solid fa-times':'fa-solid fa-spinner fa-spin';
        ui.button.disabled=pending;
        loading.classList.toggle('layer-item__loading--visible',pending);loading.title=health.title;
        ui.text.textContent=isLayer&&state==='error'?'Falhou':text;
        const {track,fill}=ui;
        const unknown=pending&&(isLayer&&!results[0].tiles?.requested.size || !isLayer&&items.length===1);
        track.classList.toggle('is-indeterminate',unknown);
        if(unknown){track.removeAttribute('aria-valuenow');fill.style.width='35%';}
        else {
          const percent=isLayer?results[0].ready?100:results[0].tiles?Math.floor(results[0].tiles.loaded.size/results[0].tiles.requested.size*100):0:Math.floor(ready/items.length*100);
          fill.style.width=`${percent}%`;track.setAttribute('aria-valuenow',String(percent));
        }
        track.setAttribute('aria-valuemin','0');track.setAttribute('aria-valuemax','100');
      });
    }
    function abortError() { return new DOMException('Carregamento interrompido.', 'AbortError'); }
    function begin(label) {

      if (active && !active.finished && !active.waitingMap) { active.scopes++; return active; }
      if (active && !active.finished) active.controller.abort();
      const op = {label, scopes:1, tasks:[], planned:new Map(), controller:new AbortController(), finished:false, mapErrors:new Map(), drawnSources:new Set(), tiles:new Map()};
      active = op;
      getMapState().feedback?.(label);
      const map = getMapState().map;
      op.onError = event => { if (event.sourceId) op.mapErrors.set(event.sourceId, event.error?.message || 'Falha na fonte do mapa.'); };
      op.onData=event=>{
        if(event.type==='sourcedataloading' && event.sourceId)op.drawnSources.delete(event.sourceId);
        if(event.sourceId && event.coord){
          if(!op.tiles.has(event.sourceId))op.tiles.set(event.sourceId,{requested:new Set(),loaded:new Set()});
          const tiles=op.tiles.get(event.sourceId),key=JSON.stringify(event.coord);
          if(event.type==='sourcedataloading'){tiles.requested.add(key);op.drawnSources.delete(event.sourceId);}
          else if(event.sourceDataType==='content'){tiles.requested.add(key);tiles.loaded.add(key);}
        }
        if(event.type==='render' && !map.isMoving())getMapState().layers.forEach(layer=>{
          if(layer.visible&&map.getSource(layer.sourceId)&&map.isSourceLoaded(layer.sourceId))op.drawnSources.add(layer.sourceId);
        });
        schedule(op);
      };
      map?.on('error', op.onError);
      ['sourcedataloading','sourcedata','render'].forEach(event=>map?.on(event,op.onData));
      schedule(op); return op;
    }
    function plan(op, kind, label, key) {
      if (!op || op.planned.has(key)) return;
      const item = {kind,label,key,state:'pending'}; op.tasks.push(item); op.planned.set(key,item); schedule(op);
    }
    async function task(op, kind, label, job, key) {
      if (!op) return job();
      if (op.controller.signal.aborted) throw abortError();
      let item = op.planned.get(key);
      if (!item || item.started) { item = {kind,label,key,state:'pending'}; op.tasks.push(item); }
      item.started = true; schedule(op);
      try {
        const result = await job();
        if (op.controller.signal.aborted) throw abortError();
        item.state = 'done'; return result;
      } catch (error) {
        item.state = error.name === 'AbortError' ? 'cancelled' : 'failed'; item.error = error.message; throw error;
      } finally { schedule(op); }
    }
    async function waitMap(op) {
      const {map, layers} = getMapState();
      if (!map || ![...layers.values()].some(layer => layer.visible)) return;
      op.waitingMap = true; op.stage = 'Aguardando o desenho e os tiles da área visível…'; schedule(op);
      await new Promise((resolve,reject) => {
        
        const signal = op.controller.signal;
        const events = ['sourcedata','idle','render','moveend'];
        const cleanup = () => { clearTimeout(timer); events.forEach(event => map.off(event,check)); signal.removeEventListener('abort',aborted); };
        const aborted = () => { cleanup(); reject(abortError()); };
        function check(event) {

          const visible = [...layers.values()].filter(layer => layer.visible);
          const failed = visible.find(layer => op.mapErrors.has(layer.sourceId));
          if (failed) {
            const message = op.mapErrors.get(failed.sourceId); cleanup();
            for (const [id,layer] of layers) {
              if (!op.mapErrors.has(layer.sourceId)) continue;
              const item = op.tasks.find(task=>task.kind==='camada' && task.key===id);
              if (item) {item.state='failed';item.error=op.mapErrors.get(layer.sourceId);}
              getMapState().failSource?.(id,op.mapErrors.get(layer.sourceId));
            }
            reject(new Error(message)); return;
          }
          const loaded = visible.filter(layer => map.getSource(layer.sourceId) && map.isSourceLoaded(layer.sourceId)).length;
          op.mapCount = ` · No mapa: ${loaded}/${visible.length}`; schedule(op);
          if (event?.type === 'render' && !map.isMoving() && loaded === visible.length) { cleanup(); resolve(); }
        }
        const timer = setTimeout(() => { cleanup(); reject(new Error('O mapa ainda tem fontes pendentes após 60 segundos. Atualize para tentar novamente.')); },60000);
        events.forEach(event => map.on(event,check)); signal.addEventListener('abort',aborted,{once:true});
        if (signal.aborted) { aborted(); return; }
        check(); map.triggerRepaint();
      });
    }
    async function end(op) {
      if (!op || --op.scopes > 0) return;
      try { if (!op.controller.signal.aborted) await waitMap(op); }
      catch (error) { if (error.name !== 'AbortError' && !op.tasks.some(task=>task.state==='failed' && task.error===error.message)) op.tasks.push({kind:'mapa',label:'Mapa',state:'failed',error:error.message}); }
      if (op.controller.signal.aborted) op.tasks.filter(task=>task.state==='pending').forEach(task=>{task.state='cancelled';});
      op.waitingMap = false; op.finished = true;
      op.stage = op.controller.signal.aborted ? 'Carregamento interrompido. Camadas já carregadas permanecem no mapa.' : op.tasks.some(task => task.state === 'failed') ? 'Carregamento concluído com falhas.' : 'Carregamento concluído.';
      const map=getMapState().map;map?.off('error',op.onError);
      ['sourcedataloading','sourcedata','render'].forEach(event=>map?.off(event,op.onData));
      if(frame!==null){cancelAnimationFrame(frame);frame=null;}
      render(op);
      getMapState().feedback?.(op.stage, op.tasks.some(task=>task.state==='failed')?'error':'info');
    }
    return {begin, plan, task, end, decorate, repaint:()=>{rows=null;if(active)schedule(active);else decorate();}, get signal() {return active && !active.finished ? active.controller.signal : undefined;}, get active() {return active && !active.finished ? active : null;}};
  }
  global.ViewerLoadProgress = {create};
})(window);
