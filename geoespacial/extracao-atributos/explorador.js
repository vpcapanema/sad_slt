import { el } from './ui.js';
import { json } from './api.js';

const ROOT='';
const ROOT_NAMES={'uploads/datastorage':'Entradas / acervo','biblioteca_canonica':'Biblioteca canônica','outputs':'Saídas de geoprocessamento'};
const VECTOR=/\.(shp|geojson|json|kml|gml|fgb|gpkg|zip|rar|7z|tar|tgz|gz)$/i;

export function escolherArquivo({catalog,excluded=[],title,multiple=false}) {
  return new Promise(resolve=>{
    const dialog=el('dialog',undefined,'ea-tool-dialog ea-storage-dialog');
    const header=el('header'),heading=el('h2',title),close=icon('Fechar','×',()=>finish());
    const minimize=icon('Minimizar','−',()=>{const small=dialog.classList.toggle('is-minimized');minimize.setAttribute('aria-label',small?'Restaurar':'Minimizar');minimize.title=small?'Restaurar':'Minimizar';});
    const maximize=icon('Maximizar','□',()=>{dialog.classList.remove('is-minimized');minimize.setAttribute('aria-label','Minimizar');minimize.title='Minimizar';const full=dialog.classList.toggle('is-maximized');maximize.textContent=full?'❐':'□';maximize.title=full?'Restaurar tamanho':'Maximizar';maximize.setAttribute('aria-label',maximize.title);});
    const windows=el('div',undefined,'ea-storage-window-controls');windows.append(minimize,maximize,close);
    heading.id='ea-storage-title';dialog.setAttribute('aria-labelledby',heading.id);header.append(heading,windows);
    const toolbar=el('div',undefined,'ea-storage-toolbar'),up=icon('Pasta acima','↑',()=>navigate(cache.get(current)?.pai||ROOT));
    const newFolder=icon('Criar pasta','📁＋',()=>edit('create'));
    const rename=icon('Renomear pasta','✎',()=>edit('rename'));
    const save=icon('Salvar','💾',()=>folderForm.requestSubmit());
    const cancel=icon('Cancelar','↶',()=>{if(loading)return;folderForm.hidden=true;editing=null;selected=null;picks.clear();paintList();});
    const trail=el('nav',undefined,'ea-storage-path');trail.setAttribute('aria-label','Caminho da pasta');
    const search=el('input');search.type='search';search.placeholder='Filtrar nesta pasta';search.setAttribute('aria-label','Filtrar pastas e arquivos por nome');
    toolbar.append(up,trail,search);
    const folderForm=el('form',undefined,'ea-storage-new-folder'),folderName=el('input');
    folderForm.hidden=true;folderName.required=true;folderName.maxLength=120;folderName.placeholder='Nome da nova pasta';folderName.setAttribute('aria-label','Nome da nova pasta');
    folderForm.append(folderName);
    const body=el('div',undefined,'ea-storage-body'),sidebar=el('aside'),tree=el('div',undefined,'ea-storage-tree');
    sidebar.setAttribute('aria-label','Árvore de pastas');sidebar.append(el('h3','Storage geoespacial'),tree);
    const pane=el('section',undefined,'ea-storage-pane'),list=el('div',undefined,'ea-storage-list');
    const actions=el('div',undefined,'ea-storage-pane-toolbar');actions.setAttribute('role','toolbar');actions.setAttribute('aria-label','Ações do painel de arquivos');
    const views=el('div',undefined,'ea-storage-view-menu');views.hidden=true;views.setAttribute('role','menu');
    const view=icon('Visualização','▦',()=>{views.hidden=!views.hidden;view.setAttribute('aria-expanded',String(!views.hidden));});view.setAttribute('aria-haspopup','menu');view.setAttribute('aria-expanded','false');
    for(const [value,label] of [['list','Lista'],['details','Detalhes'],['icons','Ícones grandes']]){
      const option=button(label,()=>{mode=value;views.hidden=true;view.setAttribute('aria-expanded','false');paintList();});option.setAttribute('role','menuitemradio');option.dataset.view=value;views.append(option);
    }
    actions.append(view,newFolder,rename,save,cancel,views);
    pane.setAttribute('aria-label','Conteúdo da pasta');pane.append(actions,folderForm,list);body.append(sidebar,pane);
    const confirmBar=el('div',undefined,'ea-storage-confirm'),selectionLabel=el('span','Nenhum arquivo selecionado.');
    const confirm=button('Confirmar',()=>selectBatch(),'ea-btn ea-btn-primary');confirm.disabled=true;
    const all=icon('Selecionar arquivos visíveis','☑',()=>{if(loading)return;for(const file of visibleFiles)picks.set(file.arquivo,file);paintList();});
    if(multiple)actions.append(all);
    confirmBar.append(selectionLabel,confirm);
    const status=el('p',undefined,'ea-storage-status');status.setAttribute('role','status');
    dialog.append(header,toolbar,body,confirmBar,status);document.body.append(dialog);dialog.showModal();
    const cache=new Map(),pending=new Map(),expanded=new Set([ROOT]);let current=ROOT,loading=false,browsing=false,navigation=0,closed=false,selected=null,editing=null,mode='list';
    const picks=new Map(),loaded=new Map();let visibleFiles=[];
    function button(label,action,className='ea-btn'){const b=el('button',label,className);b.type='button';b.onclick=action;return b;}
    function icon(label,symbol,action){const b=button(symbol,action,'ea-btn ea-storage-symbol');b.title=label;b.setAttribute('aria-label',label);return b;}
    function controls(){
      newFolder.disabled=loading||current===ROOT;
      rename.disabled=loading||!selected?.folder||Boolean(ROOT_NAMES[selected?.caminho]);
      save.disabled=loading||!editing;cancel.disabled=loading||(!editing&&!selected&&!picks.size);
      confirm.disabled=loading||!picks.size||Boolean(editing);all.disabled=loading||!visibleFiles.length;
      confirm.textContent=multiple&&picks.size?`Confirmar (${picks.size})`:'Confirmar';
      close.disabled=loading&&!browsing;
      selectionLabel.textContent=picks.size?`${picks.size} arquivo(s): ${[...picks.values()].map(file=>file.nome).join(', ')}`:selected?.folder?'Pasta: '+selected.nome:'Nenhum arquivo selecionado.';
    }
    function edit(action){
      if(loading)return;editing=action;folderForm.hidden=false;
      folderName.value=action==='rename'?selected.nome:'';
      folderName.setAttribute('aria-label',action==='rename'?'Novo nome da pasta':'Nome da nova pasta');folderName.focus();controls();
    }
    function finish(value=null){if(loading&&!browsing)return;closed=true;navigation++;dialog.close();dialog.remove();resolve(value);}
    dialog.addEventListener('cancel',event=>{event.preventDefault();finish();});
    function valid(path){return path===ROOT||(cache.get(ROOT)?.pastas||[]).some(area=>path===area.caminho||path.startsWith(area.caminho+'/'));}
    async function directory(path){
      if(!valid(path))throw new Error('Escolha uma pasta nas áreas disponíveis do storage.');
      if(!cache.has(path)){
        if(!pending.has(path))pending.set(path,json(`/camadas-arquivo/navegar?caminho=${encodeURIComponent(path)}`).then(data=>{cache.set(path,data);return data;}).finally(()=>pending.delete(path)));
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
        if(expanded.has(path))for(const folder of cache.get(path)?.pastas||[])if(valid(folder.caminho))branch(folder.caminho,ROOT_NAMES[folder.caminho]||folder.nome,depth+1);
      }
      branch(ROOT,'geoespacial',0);
    }
    function paintList(){
      const data=cache.get(current);if(!data)return;
      const term=search.value.trim().toLocaleLowerCase('pt-BR');
      const folders=data.pastas.filter(f=>valid(f.caminho)),files=data.arquivos.filter(f=>VECTOR.test(f.arquivo));
      list.replaceChildren();
      list.dataset.mode=mode;
      for(const option of views.children)option.setAttribute('aria-checked',String(option.dataset.view===mode));
      if(mode==='details'){
        const head=el('div',undefined,'ea-storage-details-head');head.append(el('span','Nome'),el('span','Tipo'),el('span','Caminho'));list.append(head);
      }
      let count=0;visibleFiles=[];
      for(const item of [...folders.map(f=>({...f,folder:true})),...files]){
        if(!(ROOT_NAMES[item.caminho]||item.nome).toLocaleLowerCase('pt-BR').includes(term))continue;
        count++;
        if(!item.folder)visibleFiles.push(item);
        const row=button('',()=>{
          if(loading)return;selected=item;editing=null;folderForm.hidden=true;
          if(!multiple)picks.clear();
          if(!item.folder){if(multiple&&picks.has(item.arquivo))picks.delete(item.arquivo);else picks.set(item.arquivo,item);}
          list.querySelectorAll('.ea-storage-entry').forEach(entry=>entry.setAttribute('aria-pressed',String(entry.dataset.file?picks.has(entry.dataset.file):entry===row)));
          controls();
        },'ea-btn ea-storage-entry');
        if(!item.folder)row.dataset.file=item.arquivo;
        row.setAttribute('aria-pressed',String(item.folder?selected?.caminho===item.caminho:picks.has(item.arquivo)));
        row.ondblclick=()=>{if(item.folder)navigate(item.caminho);};
        row.addEventListener('keydown',event=>{if(event.key==='Enter'&&item.folder){event.preventDefault();navigate(item.caminho);}});
        const name=el('span',undefined,'ea-storage-entry-title');name.append(el('span',item.folder?'📁':'▧','ea-storage-entry-icon'),el('span',ROOT_NAMES[item.caminho]||item.nome,'ea-storage-entry-name'));
        row.append(name,el('small',item.folder?'Pasta':item.formato));
        if(mode==='details')row.append(el('span',item.caminho||item.arquivo,'ea-storage-entry-path'));
        row.title=item.caminho||item.arquivo;list.append(row);
      }
      if(!count)list.append(el('p',term?'Nenhum nome corresponde ao filtro.':'Esta pasta não contém subpastas ou arquivos vetoriais registrados.','ea-empty-small'));
      status.textContent=`${folders.length} pasta(s) · ${files.length} arquivo(s). Duplo clique abre uma pasta. ${multiple?'Clique nos arquivos para marcar ou desmarcar; a seleção é mantida entre pastas.':'Selecione um arquivo e confirme.'}`;
      controls();
    }
    async function navigate(path){
      if((loading&&!browsing)||closed||!valid(path))return;
      const request=++navigation;
      loading=true;browsing=true;controls();status.textContent='Carregando pasta…';
      try{
        await directory(path);if(closed||request!==navigation)return;current=path;expanded.add(path);search.value='';selected=null;editing=null;if(!multiple)picks.clear();
        trail.replaceChildren();let target='';
        for(const [index,name] of ['data','geoespacial',...path.split('/').filter(Boolean)].entries()){
          if(index>1)target+=(target?'/':'')+name;
          const destination=target,crumb=button(name,()=>navigate(destination));
          crumb.disabled=index===0||!valid(destination);trail.append(crumb);
        }
        up.disabled=current===ROOT;newFolder.disabled=current===ROOT;folderForm.hidden=true;
        newFolder.title=current===ROOT?'Abra uma das três áreas para criar uma subpasta.':'Criar subpasta nesta pasta';
        paintTree();paintList();list.scrollTop=0;
      }catch(error){if(!closed&&request===navigation)status.textContent=error.message;}finally{if(!closed&&request===navigation){loading=false;browsing=false;controls();}}
    }
    async function selectBatch(){
      if(loading||!picks.size)return;loading=true;controls();
      const files=[...picks.values()],errors=[];let next=0,done=0;
      status.textContent=`Carregando 0 de ${files.length} arquivo(s)…`;
      async function worker(){
        while(next<files.length){const file=files[next++];
          try{
            if(!loaded.has(file.arquivo)){
              const result=await json('/extracao-atributos/arquivo-mapa',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({arquivo:file.arquivo})});
              const layer=catalog.find(item=>item.id===result.id);
              if(!layer)throw new Error('Arquivo não disponível no catálogo. Atualize o catálogo.');
              if(excluded.includes(layer.id))throw new Error('Camada já selecionada como base ou entrada.');
              loaded.set(file.arquivo,{...layer,...result});
            }
          }catch(error){errors.push(`${file.nome}: ${error.message}`);}
          finally{status.textContent=`Carregando ${++done} de ${files.length} arquivo(s)…`;}
        }
      }
      await Promise.all(Array.from({length:Math.min(2,files.length)},worker));
      loading=false;controls();
      if(errors.length){status.textContent=`${errors.join(' · ')} Desmarque os arquivos com erro ou confirme para tentar novamente. Os demais já estão carregados.`;return;}
      const unique=[...new Map(files.map(file=>{const layer=loaded.get(file.arquivo);return [layer.id,layer];})).values()];
      finish(multiple?unique:unique[0]);
    }
    search.addEventListener('input',()=>{if(!loading)paintList();});
    folderForm.addEventListener('submit',async event=>{
      event.preventDefault();if(loading||current===ROOT||!editing)return;
      loading=true;controls();const parent=current,action=editing;
      try{
        const oldPath=action==='rename'?selected.caminho:null;
        const result=await json('/extracao-atributos/pastas',{method:action==='rename'?'PATCH':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({caminho:oldPath||parent,nome:folderName.value})});
        if(oldPath){cache.delete(oldPath);expanded.delete(oldPath);for(const path of picks.keys())if(path.includes('/'+oldPath+'/')){picks.delete(path);loaded.delete(path);}}
        cache.delete(parent);await directory(parent);folderName.value='';folderForm.hidden=true;
        editing=null;selected=null;expanded.add(parent);paintTree();paintList();status.textContent=`Pasta ${action==='rename'?'renomeada':'criada'}: ${result.nome}`;
      }catch(error){status.textContent=error.message;}finally{loading=false;controls();}
    });
    paintTree();navigate(ROOT);
  });
}
