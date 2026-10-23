(function () {
  'use strict';
  const FORMAT = 'sicard-geoprocessamento', VERSION = 1;
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const clone = value => JSON.parse(JSON.stringify(value));
  const keys = ['layers', 'activeLayerId', 'layerGroups', 'layerColors', 'layerStyles',
    'geometryTypes', 'leftTab', 'history', 'layerFilters', 'layerFilterFeatures',
    'nativeFilterQueries', 'nativeFilterStyles', 'filterSources', 'selectedGeoJSON', 'nativeSelectionLayers',
    'attributeTableLayers', 'activeAttributeLayerId'];
  let handle = null, filename = 'Projeto.sicard.json', dirty = false, busy = false, restoring = false, lastCamera = '';
  const app = () => window.gpApp;
  const cameraKey = () => { const map = app().state.map; return JSON.stringify([map.getCenter().toArray(), map.getZoom(), map.getBearing(), map.getPitch(), map.getPadding()]); };
  function label(message) {
    if ($('#gp-project-name')) $('#gp-project-name').textContent = `${filename}${dirty ? ' *' : ''}`;
    if (message) $('#gp-save-state').textContent = message;
  }
  function changed() {
    if (restoring || busy) return;
    dirty = true; label('Projeto com alterações não salvas');
  }
  function editable() {
    if (app().state.activeExecution || app().state.activeImport || window.gpArquivos?.busy)
      throw new Error('Aguarde a operação em andamento terminar.');
    if (app().state.editingLayers?.size || app().state.layers.some(layer => window.gpAttributeTable?.hasPendingChanges?.(layer.id)))
      throw new Error('Salve ou descarte as edições dos dados antes de salvar ou trocar o projeto.');
  }
  async function ready() {
    const map = app()?.state.map;
    if (!map) throw new Error('O mapa ainda está sendo preparado.');
    if (!map.isStyleLoaded()) await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => { map.off('idle', done); reject(new Error('Aguarde o carregamento do mapa e tente novamente.')); }, 20000);
      function done() { clearTimeout(timeout); resolve(); }
      map.once('idle', done);
    });
    return map;
  }
  function captureUI() {
    const docks = {};
    $$('[data-panel-toggle]').forEach(control => { docks[control.dataset.panelToggle] = control.checked; });
    const fields = [...($('#gp-op-form')?.elements || [])].filter(e => e.name && e.type !== 'file').map(e => ({
      name: e.name, value: e.value, checked: e.checked,
      values: e.multiple ? [...e.selectedOptions].map(o => o.value) : null
    }));
    return { docks, left: $('[data-left-pane].active')?.dataset.leftPane,
      right: $('[data-right-tab].active')?.dataset.rightTab,
      collapsed: ['left', 'right'].filter(side => $('.gp-app').classList.contains(`${side}-collapsed`)),
      ribbon: $('[data-ribbon].active')?.dataset.ribbon || 'mapa',
      searches: Object.fromEntries(['gp-layer-search', 'gp-catalog-search', 'gp-tool-search'].map(id => [id, $(`#${id}`)?.value || ''])),
      operation: $('#gp-op-form')?.dataset.op || null, fields,
      table: window.gpAttributeTable?.projectSnapshot?.() || null,
      mapTool: app().state.selectionHandler ? 'select' : 'explore',
      logOpen: $('#gp-log').classList.contains('open') };
  }
  async function embedTemporary(session) {
    async function request(action, extra) {
      const response = await fetch(`/api/geoespacial/bancada-arquivos/local/${action}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: session.id, revisao: session.revisao, tiles_token: session.tiles_token, ...extra })
      });
      const body = await response.json();
      if (!response.ok) throw new Error(`${session.nome}: ${body.detail || 'não foi possível preservar o arquivo local.'}`);
      if (body.id !== session.id || body.revisao !== session.revisao) throw new Error('A camada temporária mudou durante o salvamento.');
      return body;
    }
    const features = []; let offset = 0, more = true;
    while (more) {
      label(`Incluindo ${session.nome}: ${offset} feições…`);
      const page = await request('tabela', { offset, limite: 100 });
      if (!Array.isArray(page.linhas) || (page.has_more && !page.linhas.length)) throw new Error('Página inválida ao preservar camada local.');
      const ids = page.linhas.map(row => String(row.id));
      if (ids.length) {
        const data = await request('geometrias', { ids });
        if (!Array.isArray(data.features) || data.features.length !== ids.length) throw new Error('Geometrias incompletas na camada local.');
        data.features.forEach(feature => {
          if (session.campo_fid_tile) feature.properties[session.campo_fid_tile] = String(feature.id);
          features.push(feature);
        });
      }
      offset += ids.length; more = Boolean(page.has_more);
    }
    return { type: 'FeatureCollection', features };
  }
  async function snapshot({ transient = false } = {}) {
    editable();
    const map = await ready();
    const state = app().state, style = clone(map.getStyle());
    for (const id of Object.keys(style.sources)) {
      const source = map.getSource(id);
      if (source?.serialize) style.sources[id] = clone(source.serialize());
    }
    // Read live layer properties as well: serialized styles may retain the
    // initial definition after setStyle, while the displayed paint has changed.
    style.layers = style.layers.map(layer => {
      const live = map.getLayer(layer.id)?.serialize?.() || layer;
      const result = clone(live);
      for (const section of ['paint', 'layout']) {
        const properties = new Set([...Object.keys(layer[section] || {}), ...Object.keys(live[section] || {})]);
        if (section === 'layout') properties.add('visibility');
        for (const property of properties) {
          const value = section === 'paint' ? map.getPaintProperty(layer.id, property) : map.getLayoutProperty(layer.id, property);
          if (value !== undefined) (result[section] ||= {})[property] = clone(value);
        }
      }
      const filter = map.getFilter(layer.id); if (filter) result.filter = clone(filter); else delete result.filter;
      return result;
    });
    // Blob URLs are browser-session resources. Embed their bytes in the project.
    for (const source of Object.values(style.sources)) {
      for (const key of ['data', 'url']) {
        if (typeof source[key] === 'string' && source[key].startsWith('blob:')) {
          const response = await fetch(source[key]);
          if (!response.ok) throw new Error('Não foi possível preservar um recurso local do mapa.');
          if (key === 'data' && source.type === 'geojson') source[key] = await response.json();
          else source[key] = await new Promise((resolve, reject) => {
            response.blob().then(blob => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(blob); }).catch(reject);
          });
        }
      }
    }
    const sessions = [];
    for (const layer of state.layers) {
      const session = window.gpArquivos?.sessions.get(layer.id);
      if (!session) continue;
      let saved = clone(session);
      if (!transient && window.gpArquivos.temporario(session) && !session.embutida_no_projeto) {
        saved.geojson = await embedTemporary(session);
        saved.representacao = 'projeto_memoria'; saved.embutida_no_projeto = true;
        delete saved.tiles_token; delete saved.tiles_url;
        style.sources[layer.id] = { type: 'geojson', data: saved.geojson };
        style.layers.filter(item => item.source === layer.id).forEach(item => { delete item['source-layer']; });
      } else if (!transient && saved.tiles_token) {
        saved = { ...saved, ...await window.gpArquivos.preparar(session) };
        if (layer.id.startsWith('storage:')) delete saved.tiles_url;
        const source = style.sources[layer.id];
        if (source?.type === 'vector') {
          const raw = layer.id.replace(/^storage:/, ''), split = raw.indexOf('::');
          const query = new URLSearchParams({ caminho: split < 0 ? raw : raw.slice(0, split) });
          if (split >= 0) query.set('camada', raw.slice(split + 2));
          if (saved.revisao) query.set('v', saved.revisao);
          source.tiles = [saved.tiles_url || `${location.origin}/api/geoespacial/storage/camada/tiles/{z}/{x}/{y}.pbf?${query}`];
        }
        delete saved.tiles_token;
      }
      sessions.push(saved);
    }
    // Include custom symbols, as well as sprite images, for an identical map.
    const images = map.listImages().map(id => {
      const image = map.getImage(id);
      return { id, width: image.data.width, height: image.data.height, data: Array.from(image.data.data),
        options: { pixelRatio: image.pixelRatio, sdf: image.sdf, stretchX: image.stretchX, stretchY: image.stretchY, content: image.content } };
    });
    const project = { format: FORMAT, version: VERSION, savedAt: new Date().toISOString(),
      state: Object.fromEntries(keys.map(key => [key, clone(state[key] === undefined ? (['layers', 'history', 'nativeSelectionLayers', 'attributeTableLayers'].includes(key) ? [] : {}) : state[key])])),
      basemaps: [...state.basemaps], sessions, style, images,
      camera: { center: map.getCenter().toArray(), zoom: map.getZoom(), bearing: map.getBearing(), pitch: map.getPitch(), padding: map.getPadding() },
      environments: JSON.parse(localStorage.getItem('gp-environments') || '{}'), ui: captureUI(),
      models: window.gpModeler?.projectSnapshot?.() || null };
    for (const session of sessions) if (session.embutida_no_projeto && project.state.filterSources[session.id]) project.state.filterSources[session.id] = clone(style.sources[session.id]);
    return project;
  }
  function validate(value) {
    if (value?.format !== FORMAT || value.version !== VERSION) throw new Error('Formato ou versão de projeto SICARD não suportado.');
    if (!Array.isArray(value.state?.layers) || !Array.isArray(value.style?.layers) || value.style.version !== 8 || !value.style.sources
        || !Array.isArray(value.sessions) || !Array.isArray(value.basemaps) || !Array.isArray(value.images)
        || !value.ui || !value.camera?.center?.every(Number.isFinite) || value.camera.center.length !== 2
        || !['zoom', 'bearing', 'pitch'].every(key => Number.isFinite(value.camera[key]))) throw new Error('Arquivo de projeto incompleto ou inválido.');
    const safeId = id => typeof id === 'string' && id.length > 0 && !/[<>"'\x00-\x1f]/.test(id);
    const ids = value.state.layers.map(layer => layer?.id);
    if (ids.some(id => !safeId(id)) || new Set(ids).size !== ids.length || value.state.layers.some(layer => typeof layer.nome !== 'string')) throw new Error('Identificadores ou nomes de camada inválidos no projeto.');
    for (const key of keys) {
      if (!(key in value.state)) throw new Error(`Configuração ausente no projeto: ${key}.`);
    }
    for (const key of ['history', 'nativeSelectionLayers', 'attributeTableLayers']) if (!Array.isArray(value.state[key])) throw new Error(`Configuração inválida: ${key}.`);
    for (const key of ['layerGroups', 'layerColors', 'layerStyles', 'geometryTypes', 'layerFilters', 'layerFilterFeatures', 'nativeFilterQueries', 'nativeFilterStyles', 'filterSources']) if (!value.state[key] || typeof value.state[key] !== 'object' || Array.isArray(value.state[key])) throw new Error(`Configuração inválida: ${key}.`);
    if (value.style.layers.some(layer => !safeId(layer?.id) || !['fill', 'line', 'symbol', 'circle', 'heatmap', 'fill-extrusion', 'raster', 'hillshade', 'background'].includes(layer.type))) throw new Error('Camadas do mapa inválidas no projeto.');
    if (value.sessions.some(session => !session || !ids.includes(session.id))) throw new Error('Referências de arquivo inválidas no projeto.');
    const allowedDocks = new Set(['left:contents', 'left:catalog', 'right:properties', 'right:tools', 'right:functions', 'right:flows', 'right:history']);
    if (Object.keys(value.ui.docks || {}).some(key => !allowedDocks.has(key))) throw new Error('Configuração de painéis inválida.');
    if (window.maplibregl.validateStyle) {
      const errors = window.maplibregl.validateStyle(value.style);
      if (errors.length) throw new Error(`Estilo de mapa inválido: ${errors[0].message}`);
    }
    if (value.models && (!Array.isArray(value.models.editors) || value.models.editors.some(editor => !/^[a-zA-Z0-9_-]+$/.test(editor.id) || !['function', 'flow'].includes(editor.type) || !Array.isArray(editor.nodes) || !Array.isArray(editor.edges)
        || [...editor.nodes, ...editor.edges].some(item => !/^[a-zA-Z0-9_-]+$/.test(item.id))))) throw new Error('Modelos inválidos no projeto.');
    for (const image of value.images) {
      if (!Number.isInteger(image.width) || !Number.isInteger(image.height) || image.width <= 0 || image.height <= 0
          || !Array.isArray(image.data) || image.data.length !== image.width * image.height * 4) throw new Error('Símbolo inválido no projeto.');
    }
    return value;
  }
  function restoreUI(ui) {
    for (const [key, visible] of Object.entries(ui.docks || {})) {
      const [side, id] = key.split(':');
      if (side === 'left') window.gpDocks.setLeftVisibility(id, visible);
      if (side === 'right') window.gpDocks.setRightVisibility(id, visible);
    }
    if (['contents', 'catalog'].includes(ui.left)) window.gpDocks.activateLeft(ui.left);
    $$('[data-right-tab]').find(e => e.dataset.rightTab === ui.right)?.click();
    $$('[data-ribbon]').find(e => e.dataset.ribbon === ui.ribbon)?.click();
    if (ui.operation) {
      app().selectOp(ui.operation);
      for (const field of ui.fields || []) {
        const element = [...($('#gp-op-form')?.elements || [])].find(e => e.name === field.name);
        if (!element || element.type === 'file') continue;
        element.value = field.value; element.checked = field.checked;
        if (element.multiple) [...element.options].forEach(o => { o.selected = field.values?.includes(o.value); });
      }
    } else if (ui.right === 'properties') app().showProperties(app().state.layers.find(l => l.id === app().state.activeLayerId) || null);
    for (const id of ['gp-layer-search', 'gp-catalog-search', 'gp-tool-search']) {
      if ($(`#${id}`)) { $(`#${id}`).value = ui.searches?.[id] || ''; $(`#${id}`).dispatchEvent(new Event('input')); }
    }
    for (const side of ['left', 'right']) $('.gp-app').classList.toggle(`${side}-collapsed`, ui.collapsed?.includes(side));
    $('#gp-log').classList.toggle('open', Boolean(ui.logOpen));
  }
  async function apply(project) {
    const map = app().state.map;
    if (app().state.selectionHandler) map.off('click', app().state.selectionHandler);
    if (app().state.exploreHandler) map.off('click', app().state.exploreHandler);
    app().state.selectionHandler = null; app().state.exploreHandler = null;
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => { map.off('style.load', done); reject(new Error('Não foi possível restaurar o estilo do mapa.')); }, 20000);
      function done() {
        clearTimeout(timer);
        try {
          for (const image of project.images) if (!map.hasImage(image.id)) map.addImage(image.id, { width: image.width, height: image.height, data: new Uint8Array(image.data) }, image.options);
          resolve();
        } catch (error) { reject(error); }
      }
      map.once('style.load', done);
      try { map.setStyle(clone(project.style), { diff: false }); } catch (error) { clearTimeout(timer); map.off('style.load', done); reject(error); }
    });
    for (const key of keys) app().state[key] = clone(project.state[key] === undefined ? {} : project.state[key]);
    app().state.attributeTableCache = {}; app().state.attributeEdits = {};
    app().state.basemaps = new Set(project.basemaps);
    window.gpArquivos?.sessions.clear();
    project.sessions.forEach(session => window.gpArquivos?.sessions.set(session.id, clone(session)));
    localStorage.setItem('gp-environments', JSON.stringify(project.environments || {}));
    for (const [key, prop] of [['gp-layer-groups', 'layerGroups'], ['gp-layer-colors', 'layerColors'], ['gp-layer-styles', 'layerStyles']]) localStorage.setItem(key, JSON.stringify(app().state[prop]));
    window.gpModeler?.restoreProject?.(project.models);
    restoreUI(project.ui); app().renderLayers();
    if(project.ui.right === 'attributes' && project.ui.table) await window.gpAttributeTable?.restoreProject?.(project.ui.table);
    $('#gp-selection').textContent = `${app().state.selectedGeoJSON?.features?.length || 0} selecionadas`;
    map.jumpTo(project.camera); map.resize(); lastCamera = cameraKey();
    if (project.ui.mapTool === 'select') window.gpCommands?.selectOnMap(); else window.gpCommands?.explore();
  }
  async function restore(project) {
    validate(project); editable();
    const previous = await snapshot({ transient: true }); restoring = true;
    try { await apply(project); }
    catch (error) { await apply(previous); throw error; }
    finally { restoring = false; }
  }
  async function save(as = false) {
    editable();
    let target = handle;
    // Obtain the destination while the click still has browser user activation.
    if ((as || !target) && window.showSaveFilePicker) target = await window.showSaveFilePicker({
      suggestedName: filename, types: [{ description: 'Projeto SICARD', accept: { 'application/json': ['.sicard.json'] } }]
    });
    const project = await snapshot(), text = JSON.stringify(project);
    if (target) {
      const stream = await target.createWritable();
      try { await stream.write(text); await stream.close(); }
      catch (error) { await stream.abort().catch(() => {}); throw error; }
      handle = target; filename = target.name;
    } else {
      const name = prompt('Nome do arquivo do projeto:', filename);
      if (!name) return false;
      filename = name.endsWith('.sicard.json') ? name : `${name}.sicard.json`;
      const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
      const link = document.createElement('a'); link.href = url; link.download = filename; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    dirty = false; label(target ? 'Projeto salvo' : 'Cópia do projeto baixada'); return true;
  }
  async function replaceConfirmed() {
    editable();
    if (!dirty) return true;
    // Explicit three-way choice: never discard silently when opening/new.
    return new Promise(resolve => {
      const dialog = document.createElement('dialog');
      dialog.innerHTML = '<h2>Salvar alterações do projeto?</h2><p>O projeto atual será substituído.</p><button data-choice="save">Salvar</button> <button data-choice="discard">Não salvar</button> <button data-choice="cancel">Cancelar</button>';
      function finish(value) { dialog.close(); dialog.remove(); resolve(value); }
      let saving = false;
      dialog.addEventListener('cancel', event => { event.preventDefault(); if (!saving) finish(false); });
      dialog.addEventListener('click', async event => {
        const choice = event.target.dataset.choice; if (!choice || saving) return;
        if (choice === 'save') {
          saving = true; dialog.querySelectorAll('button').forEach(button => { button.disabled = true; });
          try { if (await save()) finish(true); } catch (error) { report(error); }
          finally { saving = false; dialog.querySelectorAll('button').forEach(button => { button.disabled = false; }); }
        } else finish(choice === 'discard');
      });
      document.body.append(dialog); dialog.showModal();
    });
  }
  async function openFile(file, target = null) {
    const project = validate(JSON.parse(await file.text()));
    if (!await replaceConfirmed()) return;
    await restore(project); handle = target; filename = file.name;
    dirty = false; label('Projeto aberto');
    app().log('Projeto restaurado. As fontes externas são referências e dependem de continuarem disponíveis.', 'ok');
  }
  async function open() {
    if (window.showOpenFilePicker) {
      const [target] = await window.showOpenFilePicker({ multiple: false, types: [{ description: 'Projeto SICARD', accept: { 'application/json': ['.sicard.json', '.json'] } }] });
      await openFile(await target.getFile(), target);
    } else $('#gp-project-file-input').click();
  }
  async function newProject() {
    if (!await replaceConfirmed()) return;
    const project = await snapshot({ transient: true });
    project.state.layers = []; project.sessions = [];
    for (const key of keys) project.state[key] = ['layers', 'history', 'nativeSelectionLayers', 'attributeTableLayers'].includes(key) ? [] : {};
    project.state.activeLayerId = null; project.state.leftTab = 'drawing';
    project.style.layers = project.style.layers.filter(layer => layer.id.startsWith('basemap-'));
    const sources = new Set(project.style.layers.map(layer => layer.source));
    project.style.sources = Object.fromEntries(Object.entries(project.style.sources).filter(([id]) => sources.has(id)));
    project.models = null; project.camera = { center: [-48.5, -22.4], zoom: 6.2, bearing: 0, pitch: 0, padding: 0 };
    project.ui.operation = null; project.ui.table = null; project.ui.right = 'properties'; project.ui.searches = {}; project.ui.ribbon = 'mapa';
    await restore(project); handle = null; filename = 'Projeto.sicard.json'; dirty = false; label('Novo projeto');
  }
  function report(error) {
    if (error.name === 'AbortError') return;
    app().log(error.message || 'Não foi possível acessar o projeto.', 'error');
    $('#gp-log').classList.add('open'); label('Projeto não salvo/aberto');
  }
  async function run(action) {
    if (busy) return; busy = true;
    $('.gp-app').inert = true;
    try { return await action(); } catch (error) { report(error); } finally { busy = false; $('.gp-app').inert = false; }
  }
  window.gpProject = { new: () => run(newProject), open: () => run(open), save: () => run(() => save()),
    saveAs: () => run(() => save(true)), snapshot, validate, restore, openFile, get dirty() { return dirty; } };
  document.addEventListener('DOMContentLoaded', () => {
    $('#gp-project-file-input').addEventListener('change', event => {
      const file = event.target.files[0]; event.target.value = ''; if (file) run(() => openFile(file));
    });
    document.addEventListener('change', event => { if (!event.target.closest('.gp-file-menu, dialog')) changed(); });
    document.addEventListener('click', event => { if (event.target.closest('.gp-app') && !event.target.closest('.gp-file-menu')) changed(); });
    lastCamera = cameraKey();
    app().state.map.on('moveend', () => { const next = cameraKey(); if (next !== lastCamera) { lastCamera = next; changed(); } });
    window.addEventListener('gp-arquivo-atualizado', changed);
    window.addEventListener('beforeunload', event => { if (dirty) { event.preventDefault(); event.returnValue = ''; } });
    label('Projeto ainda não salvo');
  });
})();
