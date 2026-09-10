import { $, el, options, feedback } from "./ui.js";
import { escolherArquivo } from './explorador.js';
import { abrirGeradorMunicipal } from './municipal.js';
import { criarListaCamadas } from './lista-camadas.js';

export function criarConfiguracao(state, changed) {
  const lista = criarListaCamadas(state, changed);
  function sincronizarAlternativas() {
    document.querySelectorAll("[data-alternative-for]").forEach(node=>{
      node.hidden=Boolean(document.getElementById(node.dataset.alternativeFor).value);
    });
    // Some junto com a alternativa de cadastro: as duas dividem a mesma coluna.
    $('#ea-municipal-alternativa').hidden=!$('#ea-category-select').value;
    lista.render();
  }
  // Escolher a categoria precisa revelar a lista de montagem na hora.
  $("#ea-category-select").addEventListener("change",()=>{sincronizarAlternativas();render();});
  function render() {
    if(state.lastBase&&!state.bases.some(b=>b.id===state.lastBase.id))state.lastBase=null;
    $("#ea-base-select").value=state.lastBase?.id||'';
    $("#ea-base-file").textContent=state.lastBase?.arquivo||'';
    $("#ea-base-file").hidden=!state.lastBase?.arquivo;
    options($("#ea-category-select"),state.categories,"Selecione uma categoria",$("#ea-category-select").value);
    if(state.categories.length===1) $("#ea-category-select").value=state.categories[0].id;
    $("#ea-input-select").value=state.input;
    $("#ea-input-clear").hidden=!state.input;
    $("#ea-config-count").textContent=`${state.bases.length} ${state.bases.length===1?"base":"bases"} · ${state.categories.length} ${state.categories.length===1?"categoria":"categorias"}`;
    const input=state.catalog.find(item=>item.id===state.input);
    $("#ea-input-info").textContent=input?`${input.arquivo||input.nome} · ${input.geojson?.features?.length ?? "—"} feições disponíveis para visualização`:"A camada selecionada será exibida na bancada.";
    sincronizarAlternativas();
    // As camadas confirmadas são mostradas pelo painel da bancada, agrupadas por
    // categoria; não há segunda lista aqui.
    state.staging=state.staging.filter(item=>state.catalog.some(l=>l.id===item.id)&&state.categories.some(c=>c.id===item.category)&&!state.bases.some(b=>b.id===item.id));
    lista.render();
  }
  $("#ea-base-form").addEventListener("submit",event=>event.preventDefault());
  $('#ea-municipal-open').addEventListener('click',()=>{
    if(state.busy)return;
    const category=state.categories.find(item=>item.id===$('#ea-category-select').value);
    if(!category)return;
    abrirGeradorMunicipal(category,(layer,catalog)=>{
      const existing=state.catalog.find(item=>item.id===layer.id);
      if(existing)Object.assign(existing,layer);
      else state.catalog.push({...catalog.camadas.find(item=>item.id===layer.id),...layer});
      if(!state.bases.some(item=>item.id===layer.id))state.bases.push({id:layer.id,category:category.id});
      state.lastBase=layer;changed();
    });
  });
  async function browse(target,categoriaAlvo){
    if(state.busy)return;
    // Em edição, o + de cada grupo informa a categoria; fora dela, vale a do seletor.
    const category=categoriaAlvo||$("#ea-category-select").value;
    if(target==='base'&&!category){feedback('Selecione a categoria da base antes de escolher o arquivo.');$('#ea-category-select').focus();return;}
    const selection=await escolherArquivo({catalog:state.catalog,excluded:[...state.bases.map(b=>b.id),...state.staging.map(item=>item.id),...(target==='base'?[state.input]:[])],multiple:target==='base',title:target==='base'?'Selecionar camadas base':'Selecionar camada de entrada'});
    if(!selection)return;
    for(const layer of target==='base'?selection:[selection]){
      Object.assign(state.catalog.find(item=>item.id===layer.id),layer);
      if(target==='base')state.lastBase=layer;
      else state.input=layer.id;
    }
    if(target==='base'){
      // A escolha alimenta a lista da categoria atual; a bancada só recebe ao confirmar.
      const novos=lista.adicionar(selection.map(layer=>layer.id),category);
      feedback(novos?`${novos} camada(s) adicionada(s) à lista da categoria ${state.categories.find(c=>c.id===category).nome}.`
        :'As camadas escolhidas já estavam na lista ou na bancada.');
      render();
      return;
    }
    changed();
  }
  $("#ea-base-browse").addEventListener('click',()=>browse('base'));
  $("#ea-input-browse").addEventListener('click',()=>browse('input'));
  $("#ea-input-clear").addEventListener('click',()=>{state.input='';changed();});
  $("#ea-operation").addEventListener("change",event=>{state.operation=event.target.value;window.SICARDExtracao?.renderParametros?.();changed();});
  return {render,marcarLista:lista.marcar};
}
