(function(){
  'use strict';
  const API='/api/geoespacial/explorador';
  const content=document.getElementById('explorer-content'),status=document.getElementById('explorer-status'),toolbar=document.getElementById('explorer-toolbar'),dialog=document.getElementById('explorer-details');
  const roots={demandas:'DEMANDAS',storage:'SICARD Storage',saidas:'Geometrias de saída'};
  const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  let detailRevision=0;
  let source='',path='',items=[],leaf=false,controller,view='details',sort='nome',direction=1,labels={};
  try{view=localStorage.getItem('geo-explorer-view')||'details';labels=JSON.parse(sessionStorage.getItem('geo-explorer-labels')||'{}');}catch{}
  const key=(s,p)=>s+':'+p;
  function tell(message,error=false){status.textContent=message;status.dataset.error=String(error);}
  function byteSize(size){if(size==null)return '—';if(size===0)return '0 B';const power=Math.min(3,Math.floor(Math.log(size)/Math.log(1024)));return new Intl.NumberFormat('pt-BR',{maximumFractionDigits:1}).format(size/(1024**power))+' '+['B','KB','MB','GB'][power];}
  function date(value){if(!value)return '—';const d=new Date(typeof value==='number'?value*1000:value);return Number.isNaN(d.getTime())?'—':d.toLocaleString('pt-BR');}
  function icon(item){return item.pasta?'folder':item.geometria_tipo==='Raster'||item.tipo==='raster'?'file-image':'file-lines';}
  function actions(item,index){if(item.pasta)return '';const query=new URLSearchParams({fonte:item.fonte,id:item.id});return `<div class="geo-explorer-actions"><button data-action="details" data-index="${index}" title="Detalhes" aria-label="Detalhes de ${escape(item.nome)}"><i class="fa-solid fa-circle-info" aria-hidden="true"></i></button><a href="/restrict/geoespacial/visualizador-camadas/?${new URLSearchParams({camada:item.id})}" title="Visualizar no mapa" aria-label="Visualizar ${escape(item.nome)} no mapa"><i class="fa-solid fa-map-location-dot" aria-hidden="true"></i></a><a href="${API}/download?${query}" data-action="download" download title="Download ZIP" aria-label="Baixar ${escape(item.nome)} em ZIP"><i class="fa-solid fa-download" aria-hidden="true"></i></a></div>`;}
  function name(item,index){return `<button class="geo-explorer-name" data-action="${item.pasta?'folder':'details'}" data-index="${index}" title="${escape(item.arquivo||item.nome)}"><i class="fa-solid fa-${icon(item)}" aria-hidden="true"></i><span>${escape(item.nome)}${item.nome_arquivo&&item.nome_arquivo!==item.nome?`<small>${escape(item.nome_arquivo)}</small>`:""}</span></button>`;}
  function crumbs(){
    const parts=path.split('/').filter(Boolean);let html='<button data-source="" data-path="">Camadas geoespaciais</button>';
    if(source)html+=`<span aria-hidden="true">›</span><button data-source="${source}" data-path="">${escape(roots[source]||source)}</button>`;
    parts.forEach((part,index)=>{const p=parts.slice(0,index+1).join('/');const title=labels[key(source,p)]||({plano:'Plano',programa:'Programa',projeto:'Projeto','base-geodatabase':'Base-Geodatabase','base-geoespacial':'Base-Geoespacial','superficies-indices':'Superfícies-Índice'}[part])||part;html+=`<span aria-hidden="true">›</span><button data-source="${escape(source)}" data-path="${escape(p)}" ${index===parts.length-1?'aria-current="page"':''}>${escape(title)}</button>`;});
    document.getElementById('explorer-breadcrumb').innerHTML=html;
    toolbar.hidden=!source||!path;
    toolbar.querySelectorAll('[data-view]').forEach(button=>{button.disabled=leaf;button.setAttribute('aria-pressed',String(button.dataset.view===(leaf?'details':view)));});
  }
  function render(){
    const search=document.getElementById('explorer-search').value.trim().toLocaleLowerCase('pt-BR');
    let visible=items.map((item,index)=>({item,index})).filter(({item})=>String(item.nome).toLocaleLowerCase('pt-BR').includes(search));
    if(source&&path)visible.sort((a,b)=>Number(b.item.pasta)-Number(a.item.pasta)||direction*(sort==='tamanho_bytes'?(a.item[sort]??-1)-(b.item[sort]??-1):String(a.item[sort]??'').localeCompare(String(b.item[sort]??''),'pt-BR',{numeric:true})));
    crumbs();
    if(!visible.length){content.innerHTML='<p class="hint">'+(search?'Nenhum item corresponde à pesquisa.':'Esta pasta está vazia.')+'</p>';return;}
    if(!source||!path){content.innerHTML='<div class="geo-explorer-cards">'+visible.map(({item,index})=>`<button class="geo-explorer-card" data-action="folder" data-index="${index}"><i class="fa-solid fa-folder-open" aria-hidden="true"></i><span>${escape(item.nome)}</span></button>`).join('')+'</div>';return;}
    if(leaf||view==='details'){
      content.innerHTML='<div class="geo-explorer-table-wrap"><table class="geo-explorer-table"><thead><tr>'+[['nome','Nome do arquivo'],['extensao','Extensão'],['tamanho_bytes','Tamanho'],['modificado_em','Última modificação'],['geometria_tipo','Geometria'],['camada','Camada interna']].map(([field,title])=>`<th scope="col"><button data-sort="${field}">${title}${field===sort?(direction===1?' ↑':' ↓'):''}</button></th>`).join('')+'<th scope="col">Ações</th></tr></thead><tbody>'+visible.map(({item,index})=>`<tr><td>${name(item,index)}</td><td>${item.pasta?'Pasta':escape(item.extensao)}</td><td>${item.pasta?'—':item.fonte==='demandas'?'Virtual':byteSize(item.tamanho_bytes)}</td><td>${date(item.modificado_em)}</td><td>${escape(item.geometria_tipo||'—')}</td><td>${escape(item.camada||'—')}</td><td>${actions(item,index)}</td></tr>`).join('')+'</tbody></table></div>';
    }else content.innerHTML=`<div class="geo-explorer-${view==='icons'?'icons':'list'}">`+visible.map(({item,index})=>`<div class="geo-explorer-item">${name(item,index)}${actions(item,index)}</div>`).join('')+'</div>';
  }
  async function navigate(s='',p='',push=true){
    controller?.abort();controller=new AbortController();source=s;path=p;document.getElementById('explorer-search').value='';
    if(push){const url=new URL(location.href);url.search='';if(s)url.searchParams.set('fonte',s);if(p)url.searchParams.set('caminho',p);history.pushState({},'',url);}
    crumbs();content.setAttribute('aria-busy','true');content.innerHTML='<p class="hint">Carregando esta pasta…</p>';tell('Consultando repositório…');
    const current=controller;
    try{
      const response=await fetch(`${API}/navegar?${new URLSearchParams({fonte:s,caminho:p})}`,{signal:current.signal,cache:'no-store'});const data=await response.json();if(!response.ok)throw Error(data.detail||'Não foi possível abrir esta pasta.');
      if(current!==controller)return;
      items=data.itens;leaf=!!data.folha;
      items.filter(x=>x.pasta).forEach(item=>labels[key(item.fonte,item.caminho)]=item.nome);
      try{sessionStorage.setItem('geo-explorer-labels',JSON.stringify(labels));}catch{}
      render();tell(`${items.length} item(ns)${leaf?' · Arquivos exibidos em detalhes':''}`);
    }catch(error){if(error.name==='AbortError')return;tell(error.message,true);content.innerHTML='<p>Não foi possível carregar a pasta. Use Atualizar ou retorne pelo caminho acima.</p>';}
    finally{if(current===controller)content.setAttribute('aria-busy','false');}
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
  content.addEventListener('click',event=>{const button=event.target.closest('[data-action]');if(!button)return;if(button.dataset.action==='download'){tell('Download solicitado. O ZIP será disponibilizado após o empacotamento.');return;}const item=items[Number(button.dataset.index)];if(!item)return;if(button.dataset.action==='folder')navigate(item.fonte,item.caminho);else if(button.dataset.action==='details')details(item);});
  toolbar.addEventListener('click',event=>{const button=event.target.closest('button');if(!button)return;if(button.dataset.view&&!leaf){view=button.dataset.view;try{localStorage.setItem('geo-explorer-view',view);}catch{}render();}else if(button.dataset.action==='refresh')navigate(source,path,false);else if(button.dataset.action==='back')history.back();else if(button.dataset.action==='up')navigate(source,path.includes('/')?path.split('/').slice(0,-1).join('/'):'');else if(button.dataset.sort){sort=button.dataset.sort;render();}});
  content.addEventListener('click',event=>{const button=event.target.closest('[data-sort]');if(button){direction=sort===button.dataset.sort?-direction:1;sort=button.dataset.sort;render();}});
  document.getElementById('explorer-search').addEventListener('input',render);
  const open=()=>{const query=new URLSearchParams(location.search);navigate(query.get('fonte')||'',query.get('caminho')||'',false);};window.addEventListener('popstate',open);open();
})();
