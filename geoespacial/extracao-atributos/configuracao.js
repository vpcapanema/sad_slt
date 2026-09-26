import { $, el, options, feedback, camposCamada, exigirCampo } from "./ui.js";
import { escolherArquivo } from './explorador.js';
import { salvarRascunhoMunicipal } from './municipal.js';
import { criarEntradaLocal } from './entrada-local.js';
import { criarUploadStorage } from './storage-upload.js';
import { criarPrevia } from './previa.js';
import { criarListaCamadas } from './lista-camadas.js';
import { editarRegra, resumoRegra, editarEstatisticas, resumoEstatisticas } from './regras.js';

export function criarConfiguracao(state, changed) {
  const entradaLocal = criarEntradaLocal(state, changed);
  const previa = criarPrevia(state, changed);
  const lista = criarListaCamadas(state, changed, categoria => browse('base', categoria));
  const baseLocal=criarUploadStorage(state,lista,render);
  function sincronizarAlternativas() {
    document.querySelectorAll("[data-alternative-for]").forEach(node=>{
      node.hidden=Boolean(document.getElementById(node.dataset.alternativeFor).value);
    });
    const link=$('#ea-municipal-open'),prefix=location.pathname.includes('/sicard/')?'/sicard':'';
    const categoria=$('#ea-category-select').value;
    link.href=`${prefix}/restrict/geoespacial/gerador-camadas-territoriais/${categoria?'?categoria='+encodeURIComponent(categoria):''}`;
    lista.render();
  }
  // Escolher a categoria precisa revelar a lista de montagem na hora.
  $("#ea-category-select").addEventListener("change",()=>{sincronizarAlternativas();render();});
  function render() {
    if(state.preparacaoConcluida&&(state.input||state.entradasExtras.length||state.bases.length||state.staging.length||state.listaBases)){state.preparacaoConcluida=false;window.SICARDExtracao?.renderParametros?.();}
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
    $("#ea-input-info").textContent=input?`Entradas selecionadas: ${[state.input,...state.entradasExtras.map(e=>e.id)].map(id=>state.catalog.find(l=>l.id===id)?.nome||id).join(", ")}`:"Carregue as camadas e confira a prévia antes de enviá-las à bancada.";
    sincronizarAlternativas();
    // As camadas confirmadas são mostradas pelo painel da bancada, agrupadas por
    // categoria; não há segunda lista aqui.
    state.staging=state.staging.filter(item=>state.catalog.some(l=>l.id===item.id)&&state.categories.some(c=>c.id===item.category)&&!state.bases.some(b=>b.id===item.id));
    lista.render();
    renderBasesConfirmadas();entradaLocal.render();baseLocal.render();previa.render();
  }
  // Bases já confirmadas: a regra de cada uma fica aqui, onde a camada foi escolhida.
  function renderBasesConfirmadas() {
    const host=$('#ea-bases-confirmadas'), body=$('#ea-regras-bases');
    const bases=[...new Map([...state.bancadaBases,...state.bases,...state.staging].map(b=>[b.id,b])).values()];
    host.hidden=!bases.length||!state.operation;body.replaceChildren();
    for(const base of bases){
      const layer=state.catalog.find(l=>l.id===base.id)||base.layer;
      const category=state.categories.find(c=>c.id===base.category);
      const row=$('#ea-tpl-base-regra').content.firstElementChild.cloneNode(true);
      row.querySelector('[data-category]').textContent=category?.nome||base.category;
      row.querySelector('[data-base]').textContent=layer?.nome||base.id;
      const label=row.querySelector('[data-label]');label.append(new Option('Identificar pelo nome disponível',''));
      for(const campo of camposCamada(layer))label.append(new Option(campo,campo));
      label.value=base.regra?.campo_rotulo||'';
      const save=regra=>{
        for(const b of [...state.bancadaBases,...state.bases,...state.staging,...(state.listaBases?.itens||[])])if(b.id===base.id)b.regra=structuredClone(regra);
        changed();
      };
      label.onchange=()=>save({...base.regra,campo_rotulo:label.value||null});
      row.querySelector('[data-rule]').onclick=async()=>{
        const nova=await editarEstatisticas({nomeBase:layer?.nome||base.id,regra:base.regra,categoria:category,camposDisponiveis:camposCamada(layer)});
        if(nova)save(nova);
      };
      body.append(row);
    }
  }
  $("#ea-base-form").addEventListener("submit",event=>event.preventDefault());
  $('#ea-municipal-open').addEventListener('click',event=>{
    if(state.busy){event.preventDefault();return;}
    try{salvarRascunhoMunicipal(state);}
    catch(error){event.preventDefault();feedback('Não foi possível guardar a configuração para voltar da ferramenta. Salve a configuração antes de continuar.');}
  });
  async function browse(target,categoriaAlvo){
    if(state.busy||state.uploading||state.validatingBases)return;
    // Em edição, o + de cada grupo informa a categoria; fora dela, vale a do seletor.
    const category=categoriaAlvo||$("#ea-category-select").value;
    if(target==='base'&&!category){exigirCampo($('#ea-category-select'),'Selecione a categoria da base antes de escolher o arquivo.');$('#ea-category-select').focus();return;}
    const selection=await escolherArquivo({catalog:state.catalog,excluded:[...(target==='base'?(state.listaBases?.itens||[]).map(b=>b.id):[...state.bases,...state.staging].map(b=>b.id)),...(target==='base'?[state.input,...state.entradasExtras.map(item=>item.id)]:[])],multiple:true,validar:target!=='base',acao:$(target==='base'?'#ea-base-browse':'#ea-input-browse').textContent.trim(),title:target==='base'?'Selecionar camadas base':'Selecionar camadas de entrada'});
    if(!selection)return;
    for(const layer of selection){
      const atual=state.catalog.find(item=>item.id===layer.id);
      if(atual)Object.assign(atual,layer);else state.catalog.push(layer);
      if(target==='base')state.lastBase=layer;
    }
    if(target==='base'){
      // A escolha alimenta a lista da categoria atual; a bancada só recebe ao confirmar.
      const novos=lista.adicionar(selection.map(layer=>layer.id),category);
      render();
      return;
    }
    const anteriores=new Map([{id:state.input,config:state.inputConfig},...state.entradasExtras].map(e=>[e.id,e.config]));
    state.input=selection[0].id;state.inputConfig=anteriores.get(state.input)||null;
    state.entradasExtras=selection.slice(1).map(layer=>({id:layer.id,config:anteriores.get(layer.id)||null}));
    state.catalog=state.catalog.filter(item=>item.origem!=='local'||state.bases.some(b=>b.id===item.id)||state.staging.some(b=>b.id===item.id));
    entradaLocal.limpar();
    changed();
  }
  $("#ea-base-browse").addEventListener('click',()=>browse('base'));
  $("#ea-input-browse").addEventListener('click',()=>browse('input'));
  $("#ea-input-clear").addEventListener('click',()=>{if(state.uploading)return;state.catalog=state.catalog.filter(l=>l.id!==state.input||l.origem!=='local');state.input='';state.inputConfig=null;state.entradasExtras=[];entradaLocal.limpar();changed();});
  $("#ea-operation").addEventListener("change",event=>{state.preparacaoConcluida=false;state.operation=event.target.value;window.SICARDExtracao?.renderParametros?.();changed();});
  // O nome da saida nao muda o mapa nem a previa: so guarda o texto.
  $("#ea-nome-saida").addEventListener("input",event=>{state.nomeSaida=event.target.value;changed();});
  return {render,marcarLista:lista.marcar,renderBasesConfirmadas};
}
