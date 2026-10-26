// A página é dona do HTML. Este adaptador preenche nós e clona templates de dados.
export function updatePersistentView(host, s) {
  const get = key => host.querySelector(`[data-mlb="${key}"]`);
  const clone = key => host.querySelector(`[data-mlb-template="${key}"]`).content.firstElementChild.cloneNode(true);
  const text = (key, value) => { get(key).textContent = value; };
  const show = (key, visible) => { get(key).hidden = !visible; };
  const action = (key, fn, disabled = false) => {get(key).onclick = fn; get(key).disabled = disabled;};
  function options(node, items, value) {
    const signature = JSON.stringify(items);
    if (node.dataset.options !== signature) {
      node.replaceChildren(...items.map(([v,label]) => {const n=clone('option');n.value=v;n.textContent=label;return n;}));
      node.dataset.options=signature;
    }
    node.value=value;
  }
  // Não substitui listas intactas: preserva foco e detalhes abertos.
  function list(key, signature, build) {
    const node=get(key), serialized=JSON.stringify(signature);
    if(node.dataset.content!==serialized){node.replaceChildren(...build());node.dataset.content=serialized;}
  }
  const {catalog,error,feedback,busy,config,selected,source,allSources,allYears,activeYear,
    sources,years,themes,theme,search,facets,dimensions,filtered,visible,page,selectedItems,
    sourceLabel,themeLabel,metadata,limits,preview,previewError,resultado,origin,changeOrigin,changeSource,changeYear}=s;
  const unavailable=!catalog||busy;
  const count=catalog?.featureCount||catalog?.municipalities||645;
  const territory=catalog?.territoryLabel||'municípios';
  host.querySelector('.mlb-geometry strong').textContent=`${count.toLocaleString('pt-BR')} ${territory}`;
  host.querySelector('.mlb-eyebrow').textContent=`SÃO PAULO — ${territory.toLocaleUpperCase('pt-BR')}`;
  host.querySelector('.territorial-builder-description').textContent=`Selecione fontes, períodos, temas e atributos para compor uma camada dos ${count.toLocaleString('pt-BR')} ${territory} de São Paulo. Geometria IBGE 2022; valores ausentes permanecem nulos.`;
  const originControl=get('origin');
  if(originControl){
    originControl.value=origin;originControl.disabled=unavailable;originControl.onchange=e=>changeOrigin(e.target.value);
  }
  show('loading',!catalog);text('loading',error?'Não foi possível carregar o catálogo.':'Carregando catálogo…');
  show('retry',!catalog&&!!error);action('retry',()=>s.setAttempt(n=>n+1));
  show('error',!!error&&!feedback);text('error',error);
  options(get('source'),[['__todas__','Todas as fontes'],...sources.map(x=>[x,sourceLabel(x)])],source);
  options(get('year'),[['','Todos'],...years.map(y=>[y,y])],allYears?'':activeYear??'');
  options(get('theme'),[['','Todos os temas'],...themes.map(t=>[t,themeLabel(t)])],theme);
  for(const key of ['source','year','theme','search','format','name'])get(key).disabled=unavailable;
  get('source').onchange=e=>changeSource(e.target.value);
  get('year').onchange=e=>changeYear(e.target.value);
  get('theme').onchange=e=>s.setTheme(e.target.value);
  const filters=host.querySelector('.mlb-filters');
  const canvas=document.createElement('canvas'),context=canvas.getContext('2d');
  if(context){
    context.font=getComputedStyle(get('source')).font;
    for(const key of ['origin','theme']){
      const node=get(key);
      if(node)filters.style.setProperty(`--filter-${key}-width`,
        `${Math.ceil(Math.max(...[...node.options].map(option=>context.measureText(option.text).width)))+48}px`);
    }
  }
  get('search').value=search;get('search').oninput=e=>s.setSearch(e.target.value);
  list('facets',dimensions,()=>dimensions.map(([dimension,values])=>{
    const n=clone('facet');n.querySelector('span').textContent=dimension;
    const select=n.querySelector('select');select.dataset.dimension=dimension;
    options(select,[['',`Todos (${values.length})`],...values.map(v=>[v,v])],facets[dimension]??'');return n;
  }));
  for(const node of get('facets').querySelectorAll('select')){
    node.value=facets[node.dataset.dimension]??'';node.disabled=unavailable;
    node.onchange=e=>s.setFacets({...facets,[node.dataset.dimension]:e.target.value});
  }
  show('reset',Object.values(facets).some(Boolean));action('reset',()=>s.setFacets({}),unavailable);
  text('available',`${filtered.length.toLocaleString('pt-BR')} atributos disponíveis`);
  action('add',()=>s.update({...config,attributes:[...new Set([...config.attributes,...filtered.map(a=>a.id)])]}),unavailable||!filtered.length);
  action('clear',()=>s.update({...config,attributes:[]}),unavailable||!selected.size);
  const description=a=>`${themeLabel(a.theme)} · ${a.unit||'Unidade não informada'} · ${a.coverage}/${count} com valor`;
  list('attributes',[visible,allSources],()=>visible.map(a=>{
    const n=clone('attribute');n.dataset.id=a.id;n.querySelector('strong').textContent=a.label;
    n.querySelector('summary').setAttribute('aria-label',`Fonte e definição de ${a.label}`);
    n.querySelector('.mlb-detail-meta').textContent=description(a);
    n.querySelector('[data-field]').textContent=`${allSources?`${a.source} · `:''}${a.field} · ${a.year}`;
    const link=n.querySelector('a');try{const url=new URL(a.url);if(['https:','http:'].includes(url.protocol))link.href=url.href;}catch{}
    const info=metadata(a);
    n.querySelector('[data-definition]').textContent=[info.definicao||info.divulgacao,info.formula?`Fórmula: ${info.formula}`:''].filter(Boolean).join(' · ');
    n.querySelector('[data-note]').textContent=[a.producer?`Cálculo: ${a.producer}.`:'',info.nota,info.homologado_hierarquizacao===false?'Cálculo disponível; não homologado automaticamente para hierarquização.':''].filter(Boolean).join(' ');return n;
  }));
  for(const n of get('attributes').children){
    const input=n.querySelector('input');input.checked=selected.has(n.dataset.id);input.disabled=unavailable;
    input.onchange=()=>s.toggle(n.dataset.id);n.classList.toggle('mlb-chosen',input.checked);
  }
  show('empty',!visible.length);
  action('previous',()=>s.setPage(page-1),unavailable||!page);
  action('next',()=>s.setPage(page+1),unavailable||(page+1)*40>=filtered.length);
  text('page',`Página ${page+1} de ${Math.max(1,Math.ceil(filtered.length/40))}`);
  text('count',config.attributes.length.toLocaleString('pt-BR'));
  list('basket',selectedItems,()=>selectedItems.map(a=>{
    const n=clone('basket');n.dataset.id=a.id;n.querySelector('.mlb-basket-name').textContent=a.label;
    n.querySelector('summary').setAttribute('aria-label',`Fonte e definição de ${a.label}`);
    n.querySelector('.mlb-detail-meta').textContent=`${a.source} · ${a.year}`;
    n.querySelector('[data-description]').textContent=description(a);n.querySelector('[data-field]').textContent=a.field;
    const b=n.querySelector('button');b.title=`Remover ${a.label}`;b.setAttribute('aria-label',b.title);return n;
  }));
  for(const n of get('basket').children){n.querySelector('button').disabled=unavailable;n.querySelector('button').onclick=()=>s.toggle(n.dataset.id);}
  show('basket-empty',!selectedItems.length);
  get('format').value=config.format;get('format').onchange=e=>s.update({...config,format:e.target.value});
  text('format-note',config.format==='shp'?'Até 250 atributos. Nomes abreviados com correspondência no dicionário.':config.format==='gpkg'?'Até 1.900 atributos. Nomes completos preservados.':'Até 6.500 atributos. Nomes completos preservados.');
  get('name').value=config.nome??'';get('name').placeholder=s.nomePadrao;get('name').oninput=e=>s.update({...config,nome:e.target.value});
  show('limit',!feedback&&selected.size>limits[config.format]);
  show('category-required',!s.canGenerate);
  action('generate',s.generate,!s.canGenerate||unavailable||!selected.size||selected.size>limits[config.format]);
  text('generate',busy?'Gerando camada…':s.download?'Gerar e baixar camada':'Gerar camada');
  show('status',!feedback);text('status',s.status);
  show('results',!!(resultado||previewError||preview));show('preview-error',!!previewError);
  text('preview-error-text',feedback?'':`Prévia indisponível: ${previewError} `);
  action('preview-retry',()=>s.setPreviewAttempt(n=>n+1));
  show('preview',!!preview);show('glossary',!!preview?.glossario?.length);
  const head=get('preview-head');
  if(get('preview-description'))get('preview-description').textContent=`Até 5 ${territory} · todos os campos fixos e até 8 indicadores selecionados. A exportação inclui ${count.toLocaleString('pt-BR')} ${territory} e todos os atributos escolhidos.`;
  const previewFields=preview?[...(preview.fixedFields||[preview.keyField||'CD_MUN','NM_MUN']),...preview.fields]:[];
  const headerSignature=JSON.stringify([previewFields,preview?.aliases]);
  if(head.dataset.fields!==headerSignature){
    head.replaceChildren();
    for(const field of previewFields){const n=clone('head');n.textContent=preview.aliases?.[field]||field;n.title=field;head.append(n);}
    head.dataset.fields=headerSignature;
  }
  list('preview-body',preview,()=> (preview?.rows||[]).map(row=>{
    const tr=clone('row');for(const field of previewFields){
      const td=clone('cell');td.textContent=row[field]==null?'Sem valor':row[field].toLocaleString('pt-BR',{maximumFractionDigits:8});tr.append(td);
    }return tr;
  }));
  list('glossary-body',preview?.glossario,()=> (preview?.glossario||[]).map(item=>{
    const tr=clone('glossary');tr.querySelector('code').textContent=item.campo_exportado;
    ['alias','significado','fonte'].forEach((key,i)=>tr.children[i+1].textContent=item[key]);return tr;
  }));
  text('glossary-note',preview?.totalAttributes>(preview?.glossarioLimite??0)?` Exibindo os primeiros ${preview.glossarioLimite} de ${preview.totalAttributes.toLocaleString('pt-BR')} atributos; o dicionário do pacote traz todos.`:'');
}
