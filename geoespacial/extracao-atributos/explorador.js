import { el } from './ui.js';
import { json } from './api.js';

// O explorador abre as bases geoespaciais do storage do SICARD (SFTPGo). Só
// escolhe camadas: pastas e arquivos são geridos no próprio storage ou no QGIS,
// por isso não há criar nem renomear pasta aqui.
const ROOT='base-geoespacial';
const ROOT_NAMES={'base-geoespacial':'Bases geoespaciais'};

export function escolherArquivo({catalog,excluded=[],title,multiple=false}) {
  return new Promise(resolve=>{
    const dialog=el('dialog',undefined,'ea-tool-dialog ea-storage-dialog');
    const header=el('header'),heading=el('h2',title),close=icon('Fechar','×',()=>finish());
    const minimize=icon('Minimizar','−',()=>{const small=dialog.classList.toggle('is-minimized');minimize.setAttribute('aria-label',small?'Restaurar':'Minimizar');minimize.title=small?'Restaurar':'Minimizar';});
    const maximize=icon('Maximizar','□',()=>{dialog.classList.remove('is-minimized');minimize.setAttribute('aria-label','Minimizar');minimize.title='Minimizar';const full=dialog.classList.toggle('is-maximized');maximize.textContent=full?'❐':'□';maximize.title=full?'Restaurar tamanho':'Maximizar';maximize.setAttribute('aria-label',maximize.title);});
    const windows=el('div',undefined,'ea-storage-window-controls');windows.append(minimize,maximize,close);
    heading.id='ea-storage-title';dialog.setAttribute('aria-labelledby',heading.id);header.append(heading,windows);
    const toolbar=el('div',undefined,'ea-storage-toolbar'),up=icon('Pasta acima','↑',()=>navigate(cache.get(current)?.pai||ROOT));
    const cancel=icon('Limpar seleção','↶',()=>{if(loading)return;selected=null;picks.clear();paintList();});
    const trail=el('nav',undefined,'ea-storage-path');trail.setAttribute('aria-label','Caminho da pasta');
    const search=el('input');search.type='search';search.placeholder='Filtrar nesta pasta';search.setAttribute('aria-label','Filtrar pastas e camadas por nome');
    toolbar.append(up,trail,search);
    const body=el('div',undefined,'ea-storage-body'),sidebar=el('aside'),tree=el('div',undefined,'ea-storage-tree');
    sidebar.setAttribute('aria-label','Árvore de pastas');sidebar.append(el('h3','Storage geoespacial'),tree);
    const pane=el('section',undefined,'ea-storage-pane'),list=el('div',undefined,'ea-storage-list');
    const actions=el('div',undefined,'ea-storage-pane-toolbar');actions.setAttribute('role','toolbar');actions.setAttribute('aria-label','Ações do painel de camadas');
    const views=el('div',undefined,'ea-storage-view-menu');views.hidden=true;views.setAttribute('role','menu');
    const view=icon('Visualização','▦',()=>{views.hidden=!views.hidden;view.setAttribute('aria-expanded',String(!views.hidden));});view.setAttribute('aria-haspopup','menu');view.setAttribute('aria-expanded','false');
    for(const [value,label] of [['list','Lista'],['details','Detalhes'],['icons','Ícones grandes']]){
      const option=button(label,()=>{mode=value;views.hidden=true;view.setAttribute('aria-expanded','false');paintList();});option.setAttribute('role','menuitemradio');option.dataset.view=value;views.append(option);
    }
    actions.append(view,cancel,views);
    pane.setAttribute('aria-label','Conteúdo da pasta');pane.append(actions,list);body.append(sidebar,pane);
    const confirmBar=el('div',undefined,'ea-storage-confirm'),selectionLabel=el('span','Nenhuma camada selecionada.');
    const confirm=button('Confirmar',()=>selectBatch(),'ea-btn ea-btn-primary');confirm.disabled=true;
    const all=icon('Selecionar camadas visíveis','☑',()=>{if(loading)return;for(const file of visibleFiles)picks.set(file.id,file);paintList();});
    if(multiple)actions.append(all);
    confirmBar.append(selectionLabel,confirm);
    const status=el('p',undefined,'ea-storage-status');status.setAttribute('role','status');
    dialog.append(header,toolbar,body,confirmBar,status);document.body.append(dialog);dialog.showModal();
    const cache=new Map(),pending=new Map(),expanded=new Set([ROOT]);let current=ROOT,loading=false,browsing=false,navigation=0,closed=false,selected=null,mode='list';
    const picks=new Map(),loaded=new Map();let visibleFiles=[];
    function button(label,action,className='ea-btn'){const b=el('button',label,className);b.type='button';b.onclick=action;return b;}
    function icon(label,symbol,action){const b=button(symbol,action,'ea-btn ea-storage-symbol');b.title=label;b.setAttribute('aria-label',label);return b;}
    function controls(){
      cancel.disabled=loading||(!selected&&!picks.size);
      confirm.disabled=loading||!picks.size;all.disabled=loading||!visibleFiles.length;
      confirm.textContent=multiple&&picks.size?`Confirmar (${picks.size})`:'Confirmar';
      close.disabled=loading&&!browsing;
      selectionLabel.textContent=picks.size?`${picks.size} camada(s): ${[...picks.values()].map(file=>file.nome).join(', ')}`:selected?.folder?'Pasta: '+selected.nome:'Nenhuma camada selecionada.';
    }
    function finish(value=null){if(loading&&!browsing)return;closed=true;navigation++;dialog.close();dialog.remove();resolve(value);}
    dialog.addEventListener('cancel',event=>{event.preventDefault();finish();});
    function valid(path){return path===ROOT||path.startsWith(ROOT+'/');}
    async function directory(path){
      if(!valid(path))throw new Error('Escolha uma pasta dentro das bases geoespaciais do storage.');
      if(!cache.has(path)){
        if(!pending.has(path))pending.set(path,json(`/storage/navegar?caminho=${encodeURIComponent(path)}`).then(data=>{cache.set(path,data);return data;}).finally(()=>pending.delete(path)));
        await pending.get(path);
      }
      return cache.get(path);
    }
    function paintTree(){
      tree.replaceChildren();
      function branch(path,name,depth){
        const row=el('div',undefined,'ea-storage-tree-row');row.style.paddingLeft=`${depth*16}px`;
        const toggle=button(expanded.has(path)?'▾':'▸',async()=>{
          if(loading&&!browsing)return;
          if(expanded.has(path)){expanded.delete(path);paintTree();return;}
          toggle.disabled=true;
          try{await directory(path);if(!closed){expanded.add(path);paintTree();}}catch(error){if(!closed)status.textContent=error.message;}finally{toggle.disabled=false;}
        });toggle.setAttribute('aria-label',`${expanded.has(path)?'Recolher':'Expandir'} ${name}`);toggle.setAttribute('aria-expanded',String(expanded.has(path)));
        const open=button(name,()=>navigate(path));open.title=path;
        if(current===path)open.setAttribute('aria-current','location');
        row.append(toggle,open);tree.append(row);
        if(expanded.has(path))for(const folder of cache.get(path)?.pastas||[])branch(folder.caminho,folder.nome,depth+1);
      }
      branch(ROOT,ROOT_NAMES[ROOT],0);
    }
    function paintList(){
      const data=cache.get(current);if(!data)return;
      const term=search.value.trim().toLocaleLowerCase('pt-BR');
      const folders=data.pastas,files=data.arquivos;
      list.replaceChildren();
      list.dataset.mode=mode;
      for(const option of views.children)option.setAttribute('aria-checked',String(option.dataset.view===mode));
      if(mode==='details'){
        const head=el('div',undefined,'ea-storage-details-head');head.append(el('span','Nome'),el('span','Tipo'),el('span','Caminho'));list.append(head);
      }
      let count=0;visibleFiles=[];
      for(const item of [...folders.map(f=>({...f,folder:true})),...files]){
        if(!item.nome.toLocaleLowerCase('pt-BR').includes(term))continue;
        count++;
        if(!item.folder)visibleFiles.push(item);
        const row=button('',()=>{
          if(loading)return;selected=item;
          if(!multiple)picks.clear();
          if(!item.folder){if(multiple&&picks.has(item.id))picks.delete(item.id);else picks.set(item.id,item);}
          list.querySelectorAll('.ea-storage-entry').forEach(entry=>entry.setAttribute('aria-pressed',String(entry.dataset.file?picks.has(entry.dataset.file):entry===row)));
          controls();
        },'ea-btn ea-storage-entry');
        if(!item.folder)row.dataset.file=item.id;
        row.setAttribute('aria-pressed',String(item.folder?selected?.caminho===item.caminho:picks.has(item.id)));
        row.ondblclick=()=>{if(item.folder)navigate(item.caminho);};
        row.addEventListener('keydown',event=>{if(event.key==='Enter'&&item.folder){event.preventDefault();navigate(item.caminho);}});
        const name=el('span',undefined,'ea-storage-entry-title');name.append(el('span',item.folder?'📁':'▧','ea-storage-entry-icon'),el('span',item.nome,'ea-storage-entry-name'));
        row.append(name,el('small',item.folder?'Pasta':`${item.formato} · ${item.geometria_tipo||'vetor'}`));
        if(mode==='details')row.append(el('span',item.caminho||item.arquivo,'ea-storage-entry-path'));
        row.title=item.caminho||item.arquivo;list.append(row);
      }
      if(!count)list.append(el('p',term?'Nenhum nome corresponde ao filtro.':'Esta pasta não contém subpastas ou camadas vetoriais.','ea-empty-small'));
      status.textContent=`${folders.length} pasta(s) · ${files.length} camada(s). Duplo clique abre uma pasta. ${multiple?'Clique nas camadas para marcar ou desmarcar; a seleção é mantida entre pastas.':'Selecione uma camada e confirme.'}`;
      controls();
    }
    async function navigate(path){
      if((loading&&!browsing)||closed||!valid(path))return;
      const request=++navigation;
      loading=true;browsing=true;controls();status.textContent='Carregando pasta…';
      try{
        await directory(path);if(closed||request!==navigation)return;current=path;expanded.add(path);search.value='';selected=null;if(!multiple)picks.clear();
        trail.replaceChildren();let target='';
        for(const [index,name] of ['storage',...path.split('/').filter(Boolean)].entries()){
          if(index>0)target+=(target?'/':'')+name;
          const destination=target,crumb=button(ROOT_NAMES[destination]||name,()=>navigate(destination));
          crumb.disabled=index===0||!valid(destination);trail.append(crumb);
        }
        up.disabled=current===ROOT;
        paintTree();paintList();list.scrollTop=0;
      }catch(error){if(!closed&&request===navigation)status.textContent=error.message;}finally{if(!closed&&request===navigation){loading=false;browsing=false;controls();}}
    }
    async function selectBatch(){
      if(loading||!picks.size)return;loading=true;controls();
      const files=[...picks.values()],errors=[];let next=0,done=0;
      status.textContent=`Carregando 0 de ${files.length} camada(s)…`;
      async function worker(){
        while(next<files.length){const file=files[next++];
          try{
            if(!loaded.has(file.id)){
              const result=await json('/extracao-atributos/arquivo-mapa',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({arquivo:file.arquivo,id:file.id})});
              const layer=catalog.find(item=>item.id===result.id);
              if(!layer)throw new Error('Camada não disponível no catálogo. Atualize o catálogo.');
              if(excluded.includes(layer.id))throw new Error('Camada já selecionada como base ou entrada.');
              loaded.set(file.id,{...layer,...result});
            }
          }catch(error){errors.push(`${file.nome}: ${error.message}`);}
          finally{status.textContent=`Carregando ${++done} de ${files.length} camada(s)…`;}
        }
      }
      await Promise.all(Array.from({length:Math.min(2,files.length)},worker));
      loading=false;controls();
      if(errors.length){status.textContent=`${errors.join(' · ')} Desmarque as camadas com erro ou confirme para tentar novamente. As demais já estão carregadas.`;return;}
      const unique=[...new Map(files.map(file=>{const layer=loaded.get(file.id);return [layer.id,layer];})).values()];
      finish(multiple?unique:unique[0]);
    }
    search.addEventListener('input',()=>{if(!loading)paintList();});
    paintTree();navigate(ROOT);
  });
}
