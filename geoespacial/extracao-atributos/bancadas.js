import { $, el, feedback } from './ui.js';
import { json, post } from './api.js';
import { validarCamada, validarEntradaLocal } from './camada-validada.js';
import { componentes } from './preparacao.js';
import { validarEntradas } from './lote.js';

export function snapshotBancada(state,painel,descritores=[],visual=null){
 const ids=new Set(painel.map(l=>l.id));
 const entradas=state.bancadaEntradas.map(e=>({...e,layer:e.layer.camadas_bancada?{...e.layer,camadas_bancada:componentes(e.layer).filter(l=>ids.has(l.id))}:e.layer}))
   .filter(e=>componentes(e.layer).some(l=>ids.has(l.id)));
 const bases=state.bancadaBases.filter(b=>ids.has(b.id));
 const resultados=state.bancadaResultados.filter(r=>ids.has(r.id));
 const conhecidos=new Set([...entradas.flatMap(e=>componentes(e.layer).map(l=>l.id)),...bases.map(b=>b.id),...resultados.map(r=>r.id)]);
 const adicionais=painel.filter(l=>!conhecidos.has(l.id)).map(l=>{
   const ref=descritores.find(d=>d.id===l.id)||state.bancadaAdicionais?.find(d=>d.id===l.id);
   if(!ref)throw new Error(`Salve a camada "${l.nome}" no storage antes de salvar a bancada; seu arquivo original não está disponível.`);
   return {...ref,key:`adicional:${l.id}`,grupo:l.categoria,nome:l.nome,color:l.color};
 });
 return JSON.parse(JSON.stringify({versao:1,bancadaEntradas:entradas,bancadaBases:bases,bancadaResultados:resultados,bancadaAdicionais:adicionais,
   categories:state.categories,operation:state.operation,opcoes:state.opcoes,nomeSaida:state.nomeSaida,camadaRecorte:state.camadaRecorte,
   finalidades:state.finalidades,painel,visual},(key,value)=>['geojson','geojson_resumido','carregamento'].includes(key)?undefined:value));
}

export async function renovarBancada(snapshot,validadores={validarCamada,validarEntradaLocal},compatibilizar=post,progresso=()=>{}){
 const draft=structuredClone(snapshot);
 const entradas=draft.bancadaEntradas.flatMap(e=>componentes(e.layer).map(layer=>({layer,origem:e.layer,
   config:e.layer.camadas_bancada?((e.config.camadas||={})[layer.chave]||={}):(e.config||={})})));
 await validarEntradas(entradas,validadores,progresso);
 for(const item of [...draft.bancadaBases,...draft.bancadaResultados,...(draft.bancadaAdicionais||[])]){
   const layer=item.layer||item;progresso(layer.nome||layer.id);
   const atual=await validadores.validarCamada(layer);
   Object.assign(layer,atual,{id:layer.id,nome:layer.nome});
 }
 const camadas=[...draft.bancadaEntradas.map(e=>({id:e.id,nome:e.layer.nome,papel:'entrada',arquivo_local:e.layer.arquivo_local})),
   ...draft.bancadaBases.map(b=>({id:b.id,nome:b.layer.nome,papel:'base',arquivo_local:b.layer.arquivo_local,regra:b.regra}))];
 if(camadas.length){const r=await compatibilizar('/extracao-atributos/compatibilizar',{camadas,operacao:draft.operation||null});
   if(r.compativel!==true)throw new Error((r.erros||[]).map(e=>`${e.nome}: ${e.motivo}`).join('; ')||'A bancada não passou pela compatibilização.');}
 return draft;
}

function escolher(items){return new Promise(resolve=>{
 const dialog=el('dialog',undefined,'ea-tool-dialog ea-config-dialog'),titulo=el('h2','Abrir bancada salva');
 titulo.id='ea-bancada-dialog-title';dialog.setAttribute('aria-labelledby',titulo.id);
 const lista=el('div',undefined,'ea-config-list');
 const fechar=valor=>{dialog.close();dialog.remove();resolve(valor);};
 for(const item of items){const b=el('button',`${item.nome} · ${item.camadas} camada(s) · ${new Date(item.salvo_em).toLocaleString('pt-BR')}`,'ea-btn ea-config-entry');b.type='button';b.onclick=()=>fechar(item);lista.append(b);}
 if(!items.length)lista.append(el('p','Nenhuma bancada salva na sua conta.'));
 const cancelar=el('button','Cancelar','ea-btn');cancelar.type='button';cancelar.onclick=()=>fechar(null);
 dialog.addEventListener('cancel',e=>{e.preventDefault();fechar(null);});dialog.append(titulo,lista,cancelar);document.body.append(dialog);dialog.showModal();
});}

export function criarBancadas(state,map,{ocupar,restaurar,reconciliar}){
 let ativo=false;
 const salvar=$('#ea-bancada-salvar'),abrir=$('#ea-bancada-abrir');
 function marcar(){const bloqueado=ativo||state.busy||state.uploading||state.validatingBases||state.loadingCatalog||state.loadingMap;
   salvar.disabled=bloqueado||!(map.camadas()?.length);abrir.disabled=bloqueado;}
 salvar.onclick=async()=>{
   if(ativo||state.busy)return;
   ativo=true;marcar();
   try{
     reconciliar();map.assertReady();
     const snapshot=snapshotBancada(state,map.camadas()||[],map.descritores(),map.visual());
     const nome=await window.ProcessFeedback.confirmar({title:'Salvar bancada na VM',message:'Salva todas as camadas, inclusive as desmarcadas, as categorias, regras e arquivos locais originais na sua conta.',input:{label:'Nome da bancada'},confirmLabel:'Salvar'});
     if(!nome)return;
     ocupar(true);
     await post('/extracao-atributos/bancadas',{nome,snapshot});
     feedback(`Bancada "${nome}" salva na VM. Use Abrir bancada salva para recuperá-la em qualquer computador.`,'success');
   }catch(error){feedback(`Não foi possível salvar a bancada: ${error.message}`,'error');}
   finally{ativo=false;ocupar(false);marcar();}
 };
 abrir.onclick=async()=>{
   if(ativo||state.busy)return;
   ativo=true;marcar();let proc;
   try{
     const item=await escolher((await json('/extracao-atributos/bancadas')).bancadas);if(!item)return;
     if(map.camadas()?.length&&!await window.ProcessFeedback.confirmar({title:'Abrir bancada salva',message:'Acrescentar as camadas salvas à bancada atual e recuperar as opções da análise?',confirmLabel:'Abrir'}))return;
     ocupar(true);
     proc=window.ProcessFeedback.iniciarCadastro({title:'Abrindo bancada',tasks:['Restaurar camadas']});
     proc.tarefaAtual('Restaurar camadas','Lendo a bancada salva na VM.');
     const saved=await json(`/extracao-atributos/bancadas/${encodeURIComponent(item.id)}`);
     const draft=await renovarBancada(saved.snapshot,undefined,undefined,nome=>proc.log(`Validando ${nome}`,'step'));
     await restaurar(draft);
     proc.concluirTarefa('Restaurar camadas');proc.sucesso({title:'Bancada restaurada',message:'Camadas validadas e compatibilizadas. Os arquivos originais foram preservados.'});
   }catch(error){if(proc)proc.erro({message:error.message});else feedback(`Não foi possível abrir a bancada: ${error.message}`,'error');}
   finally{ativo=false;ocupar(false);marcar();}
 };
 return {marcar};
}
