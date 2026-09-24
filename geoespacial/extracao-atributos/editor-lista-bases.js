import {$,el,feedback} from './ui.js';
import {post} from './api.js';
// Lista editável -> confirmação/validação -> prévia -> bancada.
export function criarEditorListaBases(state,changed,escolher,salvar){
 const host=$('#ea-base-list-card'),body=$('#ea-base-list-body'),nome=$('#ea-base-list-name');
 const buttons=Object.fromEntries(['editar','adicionar','salvar','cancelar','excluir','confirmar'].map(k=>[k,$(`#ea-base-list-${k}`)]));
 let anterior=null,editando=false,sessaoAberta=false,validando=false,versao=0,selecionadas=new Set();
 const copia=v=>v?structuredClone(v):null;
 const lista=()=>state.listaBases;
 function iniciarEdicao(){if(editando)return;if(!sessaoAberta)anterior=copia(lista());sessaoAberta=true;editando=true;}
 function carregar(itens,dados={}){iniciarEdicao();state.listaBases={itens:structuredClone(itens),nome:dados.nome||'',chave:dados.chave||null,ausentes:dados.ausentes||[]};selecionadas.clear();editando=false;render();}
 function adicionar(ids,categoria){
  iniciarEdicao();state.listaBases??={itens:[],nome:'',chave:null,ausentes:[]};let n=0;
  for(const id of ids){if(lista().itens.some(i=>i.id===id))continue;const layer=state.catalog.find(c=>c.id===id);lista().itens.push({id,category:categoria,nome:layer?.nome||id,arquivo:layer?.arquivo||''});n++;}
  render();return n;
 }
 function marcar(){
  const bloqueado=state.busy||state.uploading||validando;
  buttons.editar.disabled=bloqueado||!lista()||editando;
  buttons.adicionar.disabled=bloqueado||!editando;
  buttons.salvar.disabled=bloqueado||!lista()?.itens.length;
  buttons.cancelar.disabled=state.busy||(!sessaoAberta&&!validando);
  buttons.excluir.disabled=bloqueado||!editando||!selecionadas.size;
  buttons.confirmar.disabled=bloqueado||!lista()?.itens.length||state.loadingMap;
  buttons.confirmar.textContent=validando?'Validando…':'Confirmar';
 }
 function render(){
  host.hidden=!lista();body.replaceChildren();marcar();if(!lista())return;
  nome.textContent=lista().nome||'Nova lista';
  for(const id of [...new Set(lista().itens.map(i=>i.category))]){
   const category=state.categories.find(c=>c.id===id),grupo=el('section',undefined,'ea-base-list-group');
   grupo.append(el('h5',category?.nome||`${id} (categoria indisponível)`));
   for(const item of lista().itens.filter(i=>i.category===id)){
    const row=el('div',undefined,'ea-base-list-row'),check=el('input');check.type='checkbox';check.checked=selecionadas.has(item.id);check.disabled=!editando||validando||state.busy;
    const layer=state.catalog.find(c=>c.id===item.id);const label=layer?.nome||item.nome||item.id;
    check.setAttribute('aria-label',`Selecionar para excluir: ${label}`);check.onchange=()=>{if(check.checked)selecionadas.add(item.id);else selecionadas.delete(item.id);marcar();};
    const text=el('div');text.append(el('strong',label),el('small',item.arquivo||layer?.arquivo||'Caminho não informado'));
    const select=el('select');select.setAttribute('aria-label',`Categoria de ${label}`);select.disabled=!editando||validando||state.busy;
    if(!category)select.append(new Option(id,id));for(const c of state.categories)select.append(new Option(c.nome,c.id));select.value=id;
    select.onchange=()=>{item.category=select.value;render();};row.append(check,text,select);grupo.append(row);
   }body.append(grupo);
  }
  if(!lista().itens.length)body.append(el('p','A lista está vazia. Use Editar e Adicionar camadas.','ea-hint'));
  if(lista().ausentes?.length)body.append(el('p',`Referências indisponíveis: ${lista().ausentes.join('; ')}`,'ea-hint'));
 }
 buttons.editar.onclick=()=>{if(state.busy||validando)return;iniciarEdicao();render();};
 buttons.adicionar.onclick=()=>{if(!validando&&editando)escolher();};
 buttons.salvar.onclick=()=>salvar();
 buttons.excluir.onclick=()=>{if(!editando||validando||state.busy)return;lista().itens=lista().itens.filter(i=>!selecionadas.has(i.id));selecionadas.clear();render();};
 buttons.cancelar.onclick=()=>{
  if(state.busy)return;versao++;validando=false;state.validatingBases=false;state.listaBases=copia(anterior);anterior=null;editando=false;sessaoAberta=false;selecionadas.clear();render();
  window.SICARDExtracao?.atualizarControles?.();feedback('Edição cancelada. A lista anterior foi restaurada; prévia e bancada foram mantidas.');
 };
 buttons.confirmar.onclick=async()=>{
  if(state.busy||validando||state.uploading||state.loadingMap||!lista()?.itens.length)return;
  const token=++versao,itens=copia(lista().itens),entradas=new Set([state.input,...state.entradasExtras.map(e=>e.id)]);
  if(itens.some(i=>entradas.has(i.id))){feedback('Uma camada da lista já está selecionada como entrada. Remova-a da lista de bases.','error');return;}
  if(itens.some(i=>!state.categories.some(c=>c.id===i.category))){feedback('Escolha uma categoria disponível para cada camada.','error');return;}
  if(!sessaoAberta)anterior=copia(lista());sessaoAberta=true;validando=true;state.validatingBases=true;render();window.SICARDExtracao?.atualizarControles?.();
  const proc=window.SLTFeedback.processo('Validando lista de bases');proc.passo('Lendo as camadas da lista confirmada…');
  const carregadas=[],falhas=[];let indice=0,feitas=0;
  async function worker(){while(indice<itens.length&&token===versao){const item=itens[indice++];try{
   const layer=await post('/extracao-atributos/arquivo-mapa',{id:item.id,arquivo:item.arquivo||undefined});
   if(!layer.geojson?.features?.length)throw new Error('A camada não contém feições disponíveis para a prévia.');
   carregadas.push({...item,layer});proc.passo(`${item.nome||layer.nome||item.id}: validada.`);
  }catch(e){falhas.push(`${item.nome||item.id}: ${e.message}`);proc.passo(falhas.at(-1),'error');}
  proc.progresso(++feitas/itens.length*100,`${feitas} de ${itens.length} camadas`);
  }}
  try{
   await Promise.all(Array.from({length:Math.min(2,itens.length)},worker));
   if(token!==versao){proc.concluir({type:'info',message:'Envio da lista cancelado. A prévia anterior foi mantida.'});return;}
   if(falhas.length){proc.concluir({type:'error',message:'A lista não foi enviada à prévia. Corrija ou remova as camadas com erro e confirme novamente.',resultados:falhas});return;}
   for(const {id,layer} of carregadas){const atual=state.catalog.find(c=>c.id===id);if(atual)Object.assign(atual,layer);else state.catalog.push({...layer,id});}
   state.bases=[];state.staging=itens;editando=false;sessaoAberta=false;anterior=copia(lista());selecionadas.clear();
   await changed();proc.concluir({message:`${itens.length} camada(s) validada(s) e disponibilizada(s) na prévia. Use Enviar pra bancada para confirmar a participação no processamento.`});
  }catch(e){proc.concluir({type:'error',message:e.message});}
  finally{if(token===versao){validando=false;state.validatingBases=false;render();window.SICARDExtracao?.atualizarControles?.();}}
 };
 return {adicionar,carregar,render,marcar,itens:()=>lista()?.itens,lista,salva(dados){if(lista()){Object.assign(lista(),{nome:dados.nome,chave:dados.chave});anterior=copia(lista());render();}}};
}
