import { el, feedback } from './ui.js';
import { json } from './api.js';

// O explorador abre as bases geoespaciais do storage do SICARD (SFTPGo). e as camadas cadastradas no banco.
// Só escolhe camadas: pastas e arquivos são geridos no próprio storage ou no QGIS,
// por isso não há criar nem renomear pasta aqui.
//
// Navegação: um clique abre a pasta; um clique marca ou desmarca a camada; na
// escolha de uma única camada, o duplo clique já confirma. Backspace sobe uma pasta.
const ROOT='base-geoespacial';
const BANK='@banco';
const ROOT_NAMES={'base-geoespacial':'Bases geoespaciais',[BANK]:'Camadas cadastradas no banco'};
// Ícone por formato, pela convenção mais comum: GeoPackage é um banco SQLite;
// Shapefile, geometria vetorial; GeoJSON, texto estruturado; KML, o globo do
// Google Earth; FlatGeobuf, arquivo binário; rasters, imagem.
const FORMATOS={
  gpkg:['fa-database','GeoPackage'], shp:['fa-draw-polygon','Shapefile'],
  geojson:['fa-file-code','GeoJSON'], json:['fa-file-code','GeoJSON'],
  kml:['fa-earth-americas','KML'], fgb:['fa-file','FlatGeobuf'],
  tif:['fa-file-image','GeoTIFF'], tiff:['fa-file-image','GeoTIFF'], img:['fa-file-image','Raster'],
};
const VISOES=[['list','Lista','fa-list'],['details','Detalhes','fa-table-list'],['icons','Ícones grandes','fa-grip']];

function fa(nome){const i=document.createElement('i');i.className=`fa-solid ${nome}`;i.setAttribute('aria-hidden','true');return i;}
// "uf_sp.gpkg"; num GeoPackage com várias camadas, "bases.gpkg › rios".
function partesDoNome(item){
  const base=String(item.arquivo||item.nome||'').split('/').pop(),ponto=base.lastIndexOf('.');
  const radical=ponto>0?base.slice(0,ponto):base,extensao=ponto>0?base.slice(ponto):'';
  return {radical,extensao,camada:item.nome!==radical?item.nome:'',formato:extensao.slice(1).toLowerCase()};
}
function rotulo(item){const p=partesDoNome(item);return `${p.radical}${p.extensao}${p.camada?` › ${p.camada}`:''}`;}

export function escolherArquivo({catalog,excluded=[],title,acao=title,multiple=false,validar=true}) {
  return new Promise(resolve=>{
    const dialog=el('dialog',undefined,'ea-tool-dialog ea-storage-dialog');
    const header=el('header'),heading=el('h2',title),close=icon('Fechar','fa-xmark',()=>finish());
    const minimize=icon('Minimizar','fa-window-minimize',()=>{const small=dialog.classList.toggle('is-minimized');setIcon(minimize,small?'Restaurar':'Minimizar',small?'fa-window-restore':'fa-window-minimize');});
    const maximize=icon('Maximizar','fa-window-maximize',()=>{dialog.classList.remove('is-minimized');setIcon(minimize,'Minimizar','fa-window-minimize');const full=dialog.classList.toggle('is-maximized');setIcon(maximize,full?'Restaurar tamanho':'Maximizar',full?'fa-window-restore':'fa-window-maximize');});
    const windows=el('div',undefined,'ea-storage-window-controls');windows.append(minimize,maximize,close);
    heading.id='ea-storage-title';dialog.setAttribute('aria-labelledby',heading.id);header.append(heading,windows);
    const toolbar=el('div',undefined,'ea-storage-toolbar'),up=icon('Subir um nível (Backspace)','fa-arrow-turn-up',()=>goUp());
    const trail=el('nav',undefined,'ea-storage-path');trail.setAttribute('aria-label','Caminho da pasta');
    const search=el('input');search.type='search';search.placeholder='Filtrar nesta pasta';search.setAttribute('aria-label','Filtrar pastas e camadas por nome');
    toolbar.append(up,trail,search);
    const body=el('div',undefined,'ea-storage-body'),sidebar=el('aside'),tree=el('div',undefined,'ea-storage-tree');
    sidebar.setAttribute('aria-label','Árvore de pastas');sidebar.append(el('h3','Storage geoespacial'),tree);
    const pane=el('section',undefined,'ea-storage-pane'),list=el('div',undefined,'ea-storage-list');
    const actions=el('div',undefined,'ea-storage-pane-toolbar');actions.setAttribute('role','toolbar');actions.setAttribute('aria-label','Ações do painel de camadas');
    const views=el('div',undefined,'ea-storage-view-menu');views.hidden=true;views.setAttribute('role','menu');
    // O botão mostra o ícone da visualização atual, como nos exploradores de arquivos.
    const view=icon('Modo de visualização','fa-list',()=>{views.hidden=!views.hidden;view.setAttribute('aria-expanded',String(!views.hidden));});
    view.append(fa('fa-caret-down'));view.setAttribute('aria-haspopup','menu');view.setAttribute('aria-expanded','false');
    for(const [value,label,simbolo] of VISOES){
      const option=button('',()=>{mode=value;views.hidden=true;view.setAttribute('aria-expanded','false');paintList();});
      option.append(fa(simbolo),document.createTextNode(label));option.setAttribute('role','menuitemradio');option.dataset.view=value;views.append(option);
    }
    const all=icon('Marcar todas as camadas visíveis','fa-square-check',()=>{if(loading)return;for(const file of visibleFiles)picks.set(file.id,file);paintList();});
    const clear=icon('Desmarcar todas','fa-square-minus',()=>{if(loading)return;picks.clear();paintList();});
    actions.append(view);
    if(multiple)actions.append(all);
    actions.append(clear,views);
    pane.setAttribute('aria-label','Conteúdo da pasta');pane.append(actions,list);body.append(sidebar,pane);
    const confirmBar=el('div',undefined,'ea-storage-confirm'),selectionLabel=el('span','Nenhuma camada selecionada.');
    const confirm=button('Confirmar',()=>selectBatch(),'ea-btn ea-btn-primary ea-storage-confirm-button');confirm.disabled=true;
    confirmBar.append(selectionLabel,confirm);
    const status=el('p',undefined,'ea-storage-status');status.setAttribute('role','status');
    dialog.append(header,toolbar,body,confirmBar,status);document.body.append(dialog);dialog.showModal();
    const cache=new Map(),pending=new Map(),expanded=new Set([ROOT]);let current=ROOT,loading=false,browsing=false,navigation=0,closed=false,mode='list';
    const picks=new Map(),loaded=new Map();let visibleFiles=[];
    function button(label,action,className='ea-btn'){const b=el('button',label,className);b.type='button';b.onclick=action;return b;}
    function setIcon(b,label,simbolo){b.title=label;b.setAttribute('aria-label',label);b.querySelector('i').className=`fa-solid ${simbolo}`;}
    function icon(label,simbolo,action){const b=button('',action,'ea-btn ea-storage-symbol');b.append(fa(simbolo));b.title=label;b.setAttribute('aria-label',label);return b;}
    function controls(){
      clear.disabled=loading||!picks.size;
      confirm.disabled=loading||!picks.size;all.disabled=loading||!visibleFiles.length;
      confirm.textContent=multiple&&picks.size?`Confirmar (${picks.size})`:'Confirmar';
      close.disabled=loading&&!browsing;up.disabled=loading&&!browsing||current===ROOT||current===BANK;
      selectionLabel.textContent=picks.size?`${picks.size} camada(s): ${[...picks.values()].map(rotulo).join(', ')}`:'Nenhuma camada selecionada.';
    }
    function finish(value=null){if(loading&&!browsing)return;closed=true;navigation++;dialog.close();dialog.remove();resolve(value);}
    dialog.addEventListener('cancel',event=>{event.preventDefault();finish();});
    // Sem isto, o segundo clique rápido seleciona o texto da linha.
    dialog.addEventListener('mousedown',event=>{if(event.detail>1&&!event.target.closest('input'))event.preventDefault();});
    dialog.addEventListener('keydown',event=>{
      if(event.key!=='Backspace'||event.target.closest('input'))return;
      event.preventDefault();goUp();
    });
    function goUp(){if(current!==ROOT)navigate(cache.get(current)?.pai||ROOT);}
    function valid(path){return path===BANK||path===ROOT||path.startsWith(ROOT+'/');}
    async function directory(path){
      if(!valid(path))throw new Error('Escolha uma pasta dentro das bases geoespaciais do storage.');
      if(path===BANK)return {caminho:BANK,pai:null,pastas:[],arquivos:catalog.filter(item=>!item.id.startsWith('storage:')&&!item.id.startsWith('local:'))};
      if(!cache.has(path)){
        if(!pending.has(path))pending.set(path,json(`/storage/navegar?detalhar=false&caminho=${encodeURIComponent(path)}`).then(data=>{cache.set(path,data);return data;}).finally(()=>pending.delete(path)));
        await pending.get(path);
      }
      return cache.get(path);
    }
    function paintTree(){
      tree.replaceChildren();
      function branch(path,name,depth){
        const row=el('div',undefined,'ea-storage-tree-row');row.style.paddingLeft=`${depth*16}px`;
        const aberta=expanded.has(path);
        const toggle=button('',async()=>{
          if(loading&&!browsing)return;
          if(expanded.has(path)){expanded.delete(path);paintTree();return;}
          toggle.disabled=true;
          try{await directory(path);if(!closed){expanded.add(path);paintTree();}}catch(error){if(!closed)feedback(error.message,'error');}finally{toggle.disabled=false;}
        },'ea-storage-tree-toggle');
        toggle.append(fa(aberta?'fa-caret-down':'fa-caret-right'));toggle.setAttribute('aria-label',`${aberta?'Recolher':'Expandir'} ${name}`);toggle.setAttribute('aria-expanded',String(aberta));
        const open=button('',()=>navigate(path),'ea-storage-tree-open');open.title=path;
        open.append(fa(current===path||aberta?'fa-folder-open':'fa-folder'),document.createTextNode(name));
        if(current===path)open.setAttribute('aria-current','location');
        row.append(toggle,open);tree.append(row);
        if(aberta)for(const folder of cache.get(path)?.pastas||[])branch(folder.caminho,folder.nome,depth+1);
      }
      branch(ROOT,ROOT_NAMES[ROOT],0);
      branch(BANK,ROOT_NAMES[BANK],0);
    }
    function toggleFile(item){
      if(multiple){if(picks.has(item.id))picks.delete(item.id);else picks.set(item.id,item);}
      else{const already=picks.has(item.id);picks.clear();if(!already)picks.set(item.id,item);}
      list.querySelectorAll('.ea-storage-entry[data-file]').forEach(entry=>entry.setAttribute('aria-pressed',String(picks.has(entry.dataset.file))));
      controls();
    }
    function paintList(){
      const data=cache.get(current);if(!data)return;
      const term=search.value.trim().toLocaleLowerCase('pt-BR');
      const folders=data.pastas,files=data.arquivos;
      list.replaceChildren();
      list.dataset.mode=mode;
      for(const option of views.children)option.setAttribute('aria-checked',String(option.dataset.view===mode));
      setIcon(view,`Modo de visualização: ${VISOES.find(v=>v[0]===mode)[1]}`,VISOES.find(v=>v[0]===mode)[2]);
      if(mode==='details'){
        const head=el('div',undefined,'ea-storage-details-head');head.append(el('span','Nome'),el('span','Tipo'),el('span','Caminho'));list.append(head);
      }
      let count=0;visibleFiles=[];
      for(const item of [...folders.map(f=>({...f,folder:true})),...files]){
        if(!(item.folder?item.nome:rotulo(item)).toLocaleLowerCase('pt-BR').includes(term))continue;
        count++;
        let row;
        const name=el('span',undefined,'ea-storage-entry-title');
        if(item.folder){
          row=button('',()=>{if(!loading||browsing)navigate(item.caminho);},'ea-btn ea-storage-entry ea-storage-entry--folder');
          row.title=`Abrir a pasta ${item.nome}`;
          const simbolo=el('span',undefined,'ea-storage-entry-icon');simbolo.append(fa('fa-folder'));
          name.append(simbolo,el('span',item.nome,'ea-storage-entry-name'));
        }else{
          if(!excluded.includes(item.id))visibleFiles.push(item);
          row=button('',event=>{
            if(loading)return;
            // O segundo clique de um duplo clique não desfaz a marcação do primeiro.
            if(event.detail>1){if(!multiple&&picks.has(item.id))selectBatch();return;}
            toggleFile(item);
          },'ea-btn ea-storage-entry ea-storage-entry--layer');
          row.dataset.file=item.id;row.setAttribute('aria-pressed',String(picks.has(item.id)));
          row.disabled=excluded.includes(item.id);
          row.title=multiple?'Clique para marcar ou desmarcar':'Clique para selecionar; duplo clique confirma';
          const partes=partesDoNome(item),[simboloFormato,nomeFormato]=FORMATOS[partes.formato]||['fa-file','Arquivo'];
          const check=el('span',undefined,'ea-storage-check');check.append(fa('fa-check'));
          const simbolo=el('span',undefined,'ea-storage-entry-icon');simbolo.title=nomeFormato;simbolo.append(fa(simboloFormato));
          const nome=el('span',partes.radical,'ea-storage-entry-name');nome.append(el('span',partes.extensao,'ea-storage-entry-ext'));
          if(partes.camada)nome.append(el('span',` › ${partes.camada}`,'ea-storage-entry-camada'));
          name.append(check,simbolo,nome);
        }
        row.append(name,el('small',item.folder?'Pasta':`${current===BANK?'Banco':(FORMATOS[partesDoNome(item).formato]||[,'Arquivo'])[1]} · ${item.geometria_tipo||(item.inventariar?'arquivo — camadas lidas ao confirmar':'vetor')}${excluded.includes(item.id)?' · já selecionada':''}`));
        if(mode==='details')row.append(el('span',item.caminho||item.arquivo,'ea-storage-entry-path'));
        if(item.folder){const seta=el('span',undefined,'ea-storage-entry-open');seta.append(fa('fa-chevron-right'));row.append(seta);}
        list.append(row);
      }
      if(!count)list.append(el('p',term?'Nenhum nome corresponde ao filtro.':'Esta pasta não contém subpastas ou camadas vetoriais.','ea-empty-small'));
      status.textContent=`${folders.length} pasta(s) · ${files.length} ${files.some(f=>f.inventariar)?'arquivo(s) — as camadas serão lidas ao confirmar':'camada(s)'}. Clique numa pasta para abrir. ${multiple?'Clique nas camadas para marcar ou desmarcar; a seleção é mantida entre pastas.':'Clique numa camada para selecionar; duplo clique confirma.'}`;
      controls();
    }
    async function navigate(path){
      if((loading&&!browsing)||closed||!valid(path))return;
      const request=++navigation;
      loading=true;browsing=true;controls();status.textContent='';
      // Navegação curta: a própria lista informa a espera; falha vai para o Notify.
      list.setAttribute('aria-busy','true');status.textContent='Abrindo pasta do storage… Consultando camadas e subpastas.';
      const liberar=()=>list.removeAttribute('aria-busy');
      try{
        const data=await directory(path);if(closed||request!==navigation){liberar();return;}cache.set(path,data);current=path;expanded.add(path);search.value='';
        trail.replaceChildren();let target='';
        for(const [index,name] of ['storage',...path.split('/').filter(Boolean)].entries()){
          if(index>0)target+=(target?'/':'')+name;
          const destination=target,crumb=button(ROOT_NAMES[destination]||name,()=>navigate(destination));
          crumb.disabled=index===0||destination===current;
          if(destination===current)crumb.setAttribute('aria-current','location');
          trail.append(crumb);
        }
        liberar();paintTree();paintList();list.scrollTop=0;
      }catch(error){liberar();if(!closed&&request===navigation){status.textContent=error.message;window.Notify.error('Storage',`Não foi possível abrir a pasta: ${error.message}`);}}finally{if(!closed&&request===navigation){loading=false;browsing=false;controls();}}
    }
    async function selectBatch(){
      if(loading||!picks.size)return;loading=true;controls();
      let files=[...picks.values()];const errors=[];let next=0,done=0;
      const INVENTARIO='Identificar camadas dos arquivos',CARREGAR='Carregar camadas selecionadas';
      const processo=window.ProcessFeedback.iniciarCadastro({title:acao,tasks:[...(files.some(f=>f.inventariar)?[INVENTARIO]:[]),...(validar?[CARREGAR]:[])]});
      try{
        const expandidos=[];
        for(const file of files){
          if(!file.inventariar){expandidos.push(file);continue;}
          processo.tarefaAtual(INVENTARIO,`${rotulo(file)}\nConsultando as camadas disponíveis no arquivo.`);
          const resultado=await json(`/storage/camadas-arquivo?arquivo=${encodeURIComponent(file.arquivo)}`);
          expandidos.push(...resultado.camadas.filter(c=>!excluded.includes(c.id)));
        }
        files=[...new Map(expandidos.map(c=>[c.id,c])).values()];
        if(!files.length)throw new Error('Todas as camadas desses arquivos já estão selecionadas.');
        if(files.length&&processo.tasks.some(t=>t.name===INVENTARIO))processo.concluirTarefa(INVENTARIO,`${files.length} camada(s)`);
      }catch(error){loading=false;controls();processo.erro({message:error.message});return;}
      // Só referências: a validação acontece ao confirmar a lista; não há desfecho a mostrar.
      if(!validar){loading=false;controls();processo.fechar();finish(multiple?files:files[0]);return;}
      const ativas=new Map();
      const acompanhar=()=>{processo.detalhe([...ativas.values()].join('\n\n')||'Leitura encerrada.');processo.progresso(done/files.length*100);};
      processo.tarefaAtual(CARREGAR,`${files.length} camada(s)`);acompanhar();
      async function worker(){
        while(next<files.length){const file=files[next++];
          ativas.set(file.id,`${rotulo(file)}\n${loaded.has(file.id)?'Recuperando camada já carregada.':'Lendo a camada e preparando os dados de visualização.'}`);acompanhar();
          try{
            if(!loaded.has(file.id)){
              const result=await json('/extracao-atributos/arquivo-mapa',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({arquivo:file.arquivo||undefined,id:file.id})});
              let layer=catalog.find(item=>item.id===result.id);
              if(!layer){layer={...file,...result};catalog.push(layer);}
              if(excluded.includes(layer.id))throw new Error('Camada já selecionada como base ou entrada.');
              loaded.set(file.id,{...layer,...result});
            }
          }catch(error){errors.push(`${rotulo(file)}: ${error.message}`);processo.log(`${rotulo(file)}: ${error.message}`,'error');}
          finally{done++;ativas.delete(file.id);acompanhar();}
        }
      }
      await Promise.all(Array.from({length:Math.min(2,files.length)},worker));
      loading=false;controls();
      if(errors.length){processo.sucesso({_status:'partial',title:'Algumas camadas não carregaram',message:'Desmarque as camadas com erro ou confirme para tentar novamente. As demais já estão carregadas.',subprocesses:errors.map(e=>({name:e,status:'error'}))});return;}
      const unique=[...new Map(files.map(file=>{const layer=loaded.get(file.id);return [layer.id,layer];})).values()];
      // Seleção concluída: o próprio diálogo mostra o resultado, sem modal de sucesso.
      processo.concluirTarefa(CARREGAR,'Camadas carregadas');processo.fechar();finish(multiple?unique:unique[0]);
    }
    search.addEventListener('input',()=>{if(!loading)paintList();});
    paintTree();navigate(ROOT);
  });
}
