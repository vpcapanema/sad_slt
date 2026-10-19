(function(){
  'use strict';
  const API='/api/geoespacial/explorador';
  const content=document.getElementById('explorer-content'),toolbar=document.getElementById('explorer-toolbar'),dialog=document.getElementById('explorer-details');
  const roots={demandas:'Demandas',storage:'SICARD Storage',saidas:'Outputs'};
  const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  let detailRevision=0;
  let source='',path='',items=[],leaf=false,controller,view='details',sort='nome',direction=1,labels={};
  const columns=[['nome','Nome do arquivo'],['extensao','Extensão'],['tamanho_bytes','Tamanho'],['modificado_em','Última modificação'],['geometria_tipo','Geometria'],['camada','Camada interna']];
  const filters=document.getElementById('explorer-filters'),controls=document.getElementById('explorer-controls'),filterColumn=document.getElementById('explorer-filter-column'),filterValue=document.getElementById('explorer-filter-value');
  const selected=new Set();
  let page=1,pageSize=15,pageRows=[];
  try{view=localStorage.getItem('geo-explorer-view')||'details';labels=JSON.parse(sessionStorage.getItem('geo-explorer-labels')||'{}');}catch{}
  const key=(s,p)=>s+':'+p;
  function notify(message,error=false){
    const show=()=>window.Notify[error?'error':'info']('Explorador de camadas',message);
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',show,{once:true});
    else show();
  }
  function byteSize(size){if(size==null)return '—';if(size===0)return '0 B';const power=Math.min(3,Math.floor(Math.log(size)/Math.log(1024)));return new Intl.NumberFormat('pt-BR',{maximumFractionDigits:1}).format(size/(1024**power))+' '+['B','KB','MB','GB'][power];}
  function date(value){if(!value)return '—';const d=new Date(typeof value==='number'?value*1000:value);return Number.isNaN(d.getTime())?'—':d.toLocaleString('pt-BR');}
  function folderLabel(value){
    const acronyms=new Set('sicard sp aprm uc ibama cetesb iphan condephaat sigam uf ig mma pli pef zee ugrhi ra rg rm sma idesp sicg cecav incra'.split(' '));
    const small=new Set('de da do das dos e'.split(' '));
    return String(value).replace(/[\p{L}]+/gu,(word,offset)=>{const lower=word.toLocaleLowerCase('pt-BR');return acronyms.has(lower)?lower.toUpperCase():lower==='ucs'?'UCs':small.has(lower)&&offset>0?lower:lower[0].toLocaleUpperCase('pt-BR')+lower.slice(1);});
  }
  function icon(item){
    if(item.pasta){
      if(source || item.caminho)return '<i class="fa-solid fa-folder" aria-hidden="true"></i>';
      const service=item.fonte==='storage'?'sftpgo':'postgis';
      return `<img class="geo-explorer-folder-icon" src="/assets/img/brand/${service}.${service==='sftpgo'?'png':'webp'}" alt="" aria-hidden="true">`;
    }
    const extension=String(item.extensao||item.nome_arquivo?.split('.').pop()||'').toUpperCase();
    return window.SLTFileIcons.render(extension);
  }
  function actions(item,index){if(item.pasta)return '';const query=new URLSearchParams({fonte:item.fonte,id:item.id});return `<div class="geo-explorer-actions"><button data-action="details" data-index="${index}" title="Detalhes" aria-label="Detalhes de ${escape(item.nome)}"><i class="fa-solid fa-circle-info" aria-hidden="true"></i></button>${item.mapeavel===false?'<button disabled title="Este arquivo não é uma camada visualizável" aria-label="Visualização no mapa indisponível"><i class="fa-solid fa-map-location-dot" aria-hidden="true"></i></button>':`<a href="/restrict/geoespacial/visualizador-camadas/?${new URLSearchParams({camada:item.id})}" title="Visualizar no mapa" aria-label="Visualizar ${escape(item.nome)} no mapa"><i class="fa-solid fa-map-location-dot" aria-hidden="true"></i></a>`}<a href="${API}/download?${query}" data-action="download" download title="Download ZIP" aria-label="Baixar ${escape(item.nome)} em ZIP"><i class="fa-solid fa-download" aria-hidden="true"></i></a></div>`;}
  function name(item,index){
    const extension=String(item.extensao||'').toLowerCase();
    const label=item.pasta||!extension||String(item.nome).toLowerCase().endsWith('.'+extension)?item.nome:item.nome+'.'+extension;
    return `<button class="geo-explorer-name" data-action="${item.pasta?'folder':'details'}" data-index="${index}" title="${escape(item.arquivo||item.nome)}"><span class="geo-explorer-primary">${icon(item)}<span>${escape(label)}</span></span>${item.nome_arquivo&&item.nome_arquivo!==label?`<small>${escape(item.nome_arquivo)}</small>`:''}</button>`;
  }
  function crumbs(){
    const parts=path.split('/').filter(Boolean);let html='<button data-source="" data-path="">Camadas geoespaciais</button>';
    if(source)html+=`<span aria-hidden="true">›</span><button data-source="${source}" data-path="">${escape(roots[source]||source)}</button>`;
    parts.forEach((part,index)=>{const p=parts.slice(0,index+1).join('/');const title=labels[key(source,p)]||({plano:'Plano',programa:'Programa',projeto:'Projeto','base-geodatabase':'Base-Geodatabase','base-geoespacial':'Base-Geoespacial','superficies-indices':'Superfícies-Índice'}[part])||part;html+=`<span aria-hidden="true">›</span><button data-source="${escape(source)}" data-path="${escape(p)}" ${index===parts.length-1?'aria-current="page"':''}>${escape(folderLabel(title))}</button>`;});
    document.getElementById('explorer-breadcrumb').innerHTML=html;
    toolbar.hidden=!source||!path;
    toolbar.querySelectorAll('[data-view]').forEach(button=>{button.disabled=leaf;button.setAttribute('aria-pressed',String(button.dataset.view===(leaf?'details':view)));});
  }
  function cellValue(item,field){
    if(field==='extensao')return item.pasta?'Pasta':String(item.extensao||'');
    if(field==='tamanho_bytes')return item.pasta?'—':item.fonte==='demandas'?'Virtual':byteSize(item.tamanho_bytes);
    if(field==='modificado_em')return date(item.modificado_em);
    return String(item[field]??'');
  }
  function columnApplies(item,field){
    if(item.pasta)return false;
    const flag=field==='geometria_tipo'?'geometria_aplicavel':'camada_aplicavel';
    return item[flag]??!!item[field];
  }
  function tableColumns(){
    return columns.filter(([field])=>!['geometria_tipo','camada'].includes(field)||items.some(item=>columnApplies(item,field)));
  }
  function syncFilterColumns(){
    const previous=filterColumn.value;
    filterColumn.replaceChildren(new Option('— Coluna —',''));
    tableColumns().forEach(([field,title])=>filterColumn.add(new Option(title,field)));
    filterColumn.value=previous;
    if(filterColumn.selectedIndex<0)filterColumn.value='';
    if(!tableColumns().some(([field])=>field===sort)){sort='nome';direction=1;}
    filterValues(true);
  }
  function tableCell(item,index,field){
    if(field==='nome')return name(item,index);
    if(['geometria_tipo','camada'].includes(field)){
      if(!columnApplies(item,field))return '—';
      if(item.metadados_erro)return `<span class="geo-explorer-metadata-error" title="${escape(item.metadados_erro)}">Erro na leitura</span>`;
      const value=cellValue(item,field);
      const description=item.camadas?.map(layer=>`${layer.camada||'Raster'}: ${layer.geometria_tipo||'Sem geometria'}`).join('; ')||value;
      return `<span title="${escape(description)}">${escape(value)}</span>`;
    }
    return escape(cellValue(item,field));
  }
  function filterValues(preserve=false){
    const previous=preserve?filterValue.selectedOptions[0]:null;
    filterValue.replaceChildren(new Option(filterColumn.value?'— Valor —':'— selecione a coluna —',''));
    filterValue.disabled=!filterColumn.value;
    if(!filterColumn.value)return;
    filterValue.add(new Option('(vazias)','__vazias__'));
    [...new Set(items.map(item=>cellValue(item,filterColumn.value)))].filter(Boolean).sort((a,b)=>a.localeCompare(b,'pt-BR',{numeric:true})).forEach(value=>filterValue.add(new Option(value,JSON.stringify(value))));
    if(previous?.value){
      if(![...filterValue.options].some(option=>option.value===previous.value))filterValue.add(new Option(previous.text,previous.value));
      filterValue.value=previous.value;
    }
  }
  function resetRows(){page=1;selected.clear();render();}
  function updateSelection(){
    const checkboxes=content.querySelectorAll('[data-select-index]');
    checkboxes.forEach(input=>{input.checked=selected.has(Number(input.dataset.selectIndex));input.closest('tr').classList.toggle('is-selected',input.checked);});
    const all=content.querySelector('[data-select-all]');
    if(all){all.checked=pageRows.length>0&&pageRows.every(({index})=>selected.has(index));all.indeterminate=selected.size>0&&!all.checked;all.disabled=!pageRows.length;}
    const item=selected.size===1?items[[...selected][0]]:null;
    controls.querySelector('[data-control=details]').disabled=!item||item.pasta;
    controls.querySelector('[data-control=map]').disabled=!item||item.pasta||item.mapeavel===false;
    controls.querySelector('[data-control=download]').disabled=!item||item.pasta;
    window.SLTTable.summary('explorer-summary',selected.size,pageRows.length,items.length);
  }
  function render(){
    const search=document.getElementById('explorer-search').value.trim().toLocaleLowerCase('pt-BR');
    const tableMode=!!source&&!!path&&(leaf||view==='details');
    filters.hidden=controls.hidden=!tableMode;
    let visible=items.map((item,index)=>({item,index})).filter(({item})=>{
      if(!String(item.nome).toLocaleLowerCase('pt-BR').includes(search))return false;
      const active=tableMode&&!!filterColumn.value&&filterValue.value!=='';
      const value=active?cellValue(item,filterColumn.value):'';
      const match=filterValue.value==='__vazias__'?value==='':JSON.stringify(value)===filterValue.value;
      return window.SLTTable.matches('explorer',match,active);
    });
    if(source&&path)visible.sort((a,b)=>Number(b.item.pasta)-Number(a.item.pasta)||direction*(sort==='tamanho_bytes'?(a.item[sort]??-1)-(b.item[sort]??-1):String(a.item[sort]??'').localeCompare(String(b.item[sort]??''),'pt-BR',{numeric:true})));
    crumbs();
    if(!visible.length&&!tableMode){content.innerHTML='<p class="hint">'+(search?'Nenhum item corresponde à pesquisa.':'Esta pasta está vazia.')+'</p>';return;}
    if(!source||!path){content.innerHTML='<div class="geo-explorer-cards">'+visible.map(({item,index})=>`<button class="geo-explorer-card" data-action="folder" data-index="${index}">${icon(item)}<span>${escape(item.nome)}</span></button>`).join('')+'</div>';return;}
    if(tableMode){
      const displayedColumns=tableColumns();
      const result=window.SLTTable.paginate('explorer-pagination',visible,page,target=>{page=target;selected.clear();render();},pageSize);
      page=result.page;pageRows=result.rows;
      content.innerHTML='<div class="geo-explorer-table-wrap"><table class="geo-explorer-table admin-data-table"><thead><tr><th scope="col" class="col-select"><input type="checkbox" data-select-all aria-label="Selecionar todas"></th><th scope="col" class="col-actions">Ações</th>'+displayedColumns.map(([field,title])=>`<th scope="col" data-field="${field}" aria-sort="${field===sort?(direction===1?'ascending':'descending'):'none'}"><button data-sort="${field}">${title}${field===sort?(direction===1?' ↑':' ↓'):''}</button></th>`).join('')+'</tr></thead><tbody>'+pageRows.map(({item,index})=>`<tr><td class="col-select"><input type="checkbox" data-select-index="${index}" aria-label="Selecionar ${escape(item.nome)}"></td><td class="col-actions">${actions(item,index)}</td>${displayedColumns.map(([field])=>`<td data-field="${field}">${tableCell(item,index,field)}</td>`).join('')}</tr>`).join('')+(!pageRows.length?`<tr><td colspan="${displayedColumns.length+2}" class="cell-null">Nenhum item corresponde à pesquisa ou aos filtros. Nenhum registro nesta página.</td></tr>`:'')+'</tbody></table></div>';
      content.querySelector('table').dataset.tableSort='off';
      updateSelection();
    }else content.innerHTML=`<div class="geo-explorer-${view==='icons'?'icons':'list'}">`+visible.map(({item,index})=>`<div class="geo-explorer-item">${name(item,index)}${actions(item,index)}</div>`).join('')+'</div>';
  }
  async function navigate(s='',p='',push=true,reloadOnly=false){
    controller?.abort();controller=new AbortController();source=s;path=p;
    const reloadButton=controls.querySelector('[data-control=reload]');
    reloadButton.disabled=reloadOnly;
    if(!reloadOnly){
      document.getElementById('explorer-search').value='';
      page=1;selected.clear();filterColumn.value='';filterValues();window.SLTTable.inversion(document.getElementById('explorer-inverter'),false);filters.hidden=controls.hidden=true;
    }
    if(push){const url=new URL(location.href);url.search='';if(s)url.searchParams.set('fonte',s);if(p)url.searchParams.set('caminho',p);history.pushState({},'',url);}
    content.setAttribute('aria-busy','true');
    if(!reloadOnly){crumbs();content.innerHTML='<p class="hint">Carregando esta pasta…</p>';}
    const current=controller;
    try{
      const response=await fetch(`${API}/navegar?${new URLSearchParams({fonte:s,caminho:p})}`,{signal:current.signal,cache:'no-store'});const data=await response.json();if(!response.ok)throw Error(data.detail||'Não foi possível abrir esta pasta.');
      if(current!==controller)return;
      items=data.itens.map(item=>item.pasta?{...item,nome:!item.caminho&&roots[item.fonte]?roots[item.fonte]:folderLabel(item.nome)}:item);leaf=!!data.folha;
      items.filter(x=>x.pasta).forEach(item=>labels[key(item.fonte,item.caminho)]=item.nome);
      try{sessionStorage.setItem('geo-explorer-labels',JSON.stringify(labels));}catch{}
      const wrap=content.querySelector('.geo-explorer-table-wrap'),scrollLeft=wrap?.scrollLeft||0,scrollTop=wrap?.scrollTop||0;
      if(reloadOnly)selected.clear();
      syncFilterColumns();
      const failures=items.filter(item=>item.metadados_erro).length;
      render();
      if(failures)notify(`${failures} arquivo(s) com erro na leitura dos metadados. Consulte os avisos nas células da tabela.`,true);
      if(reloadOnly){const updated=content.querySelector('.geo-explorer-table-wrap');if(updated){updated.scrollLeft=scrollLeft;updated.scrollTop=scrollTop;}}
    }catch(error){
      if(error.name==='AbortError'||current!==controller)return;
      notify(reloadOnly?'Não foi possível atualizar as camadas: '+error.message:error.message,true);
      if(!reloadOnly)content.innerHTML='<p>Não foi possível carregar a pasta. Use Atualizar ou retorne pelo caminho acima.</p>';
    }
    finally{if(current===controller){content.setAttribute('aria-busy','false');reloadButton.disabled=false;}}
  }
  async function details(item){
    const revision=++detailRevision;
    document.getElementById('explorer-details-title').textContent=item.nome;
    const body=document.getElementById('explorer-details-body');body.textContent='Consultando metadados…';dialog.showModal();
    try{
      const response=await fetch(`${API}/detalhes?${new URLSearchParams({fonte:item.fonte,id:item.id})}`,{cache:'no-store'});const data=await response.json();if(!response.ok)throw Error(data.detail||'Metadados indisponíveis.');
      if(revision!==detailRevision||!dialog.open)return;
      const titles={arquivo:'Arquivo',nome:'Nome',tipo:'Tipo',status:'Status',srid:'EPSG',crs:'CRS',tamanho_bytes:'Tamanho (bytes)',modificado_em:'Última modificação',camadas:'Camadas internas',arquivo_virtual:'Arquivo virtual',observacao:'Observação',sha256:'SHA-256',metadados:'Metadados',geometria_tipo:'Geometria'};
      body.innerHTML='<dl>'+Object.entries(data).map(([key,value])=>`<dt>${escape(titles[key]||key.replaceAll('_',' '))}</dt><dd>${value!==null&&typeof value==='object'?'<pre>'+escape(JSON.stringify(value,null,2))+'</pre>':escape(value??'—')}</dd>`).join('')+'</dl>';
    }catch(error){if(revision===detailRevision)body.textContent=error.message;}
  }
  document.getElementById('explorer-breadcrumb').addEventListener('click',event=>{const button=event.target.closest('[data-source]');if(button)navigate(button.dataset.source,button.dataset.path);});
  content.addEventListener('click',event=>{const button=event.target.closest('[data-action]');if(!button)return;if(button.dataset.action==='download'){notify('Download solicitado. O ZIP será disponibilizado após o empacotamento.');return;}const item=items[Number(button.dataset.index)];if(!item)return;if(button.dataset.action==='folder')navigate(item.fonte,item.caminho);else if(button.dataset.action==='details')details(item);});
  toolbar.addEventListener('click',event=>{const button=event.target.closest('button');if(!button)return;if(button.dataset.view&&!leaf){view=button.dataset.view;try{localStorage.setItem('geo-explorer-view',view);}catch{}resetRows();}else if(button.dataset.action==='refresh')navigate(source,path,false);else if(button.dataset.action==='back')history.back();else if(button.dataset.action==='up')navigate(source,path.includes('/')?path.split('/').slice(0,-1).join('/'):'');});
  content.addEventListener('click',event=>{const button=event.target.closest('[data-sort]');if(button){direction=sort===button.dataset.sort?-direction:1;sort=button.dataset.sort;resetRows();}});
  content.addEventListener('change',event=>{
    const input=event.target;
    if(input.matches('[data-select-all]')){selected.clear();if(input.checked)pageRows.forEach(({index})=>selected.add(index));}
    else if(input.matches('[data-select-index]')){const index=Number(input.dataset.selectIndex);if(input.checked)selected.add(index);else selected.delete(index);}
    else return;
    updateSelection();
  });
  controls.addEventListener('click',event=>{
    const button=event.target.closest('[data-control]');
    if(!button||button.disabled)return;
    if(button.dataset.control==='reload'){navigate(source,path,false,true);return;}
    const index=[...selected][0],item=items[index];
    if(button.dataset.control==='details')details(item);
    else content.querySelector(`.col-actions [data-index="${index}"]`).closest('.geo-explorer-actions').querySelector(button.dataset.control==='map'?'a:not([download])':'a[download]').click();
  });
  filterColumn.addEventListener('change',()=>{filterValues();resetRows();});
  filterValue.addEventListener('change',resetRows);
  window.SLTTable.bindFilter('explorer',resetRows,()=>{filterColumn.value='';filterValues();});
  document.getElementById('explorer-page-size').addEventListener('change',event=>{pageSize=Number(event.target.value);resetRows();});
  document.getElementById('explorer-search').addEventListener('input',resetRows);
  const open=()=>{const query=new URLSearchParams(location.search);navigate(query.get('fonte')||'',query.get('caminho')||'',false);};window.addEventListener('popstate',open);open();
})();
