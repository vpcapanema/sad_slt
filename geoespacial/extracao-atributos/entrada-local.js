/* Originais permanecem na memória da página. Validar nunca confirma a bancada. */
import { $, feedback } from './ui.js';
import { base, json, post } from './api.js';
import { guardarPrevia } from './preparacao.js';
const MAX_BYTES=16*1024*1024;
const dormir=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function base64(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result).split(',')[1]);r.onerror=()=>reject(new Error('Não foi possível ler o arquivo local.'));r.readAsDataURL(file);});}
export function criarEntradaLocal(state,changed){
 const node=id=>$(`#ea-input-${id}`),arquivo=node('file');arquivo.multiple=true;
 let ativo=false,cancelando=false,job=null,processo=null,iniciando=null;
 const terminais=new Set(['concluido','erro','cancelado']);
 function ocupado(valor){
  state.uploading=valor;ativo=valor;
  for(const id of ['ea-input-upload','ea-base-local-upload','ea-input-browse','ea-input-clear','ea-base-browse']){const e=$('#'+id);if(e)e.disabled=valor||state.busy;}
  node('upload-cancel').hidden=!valor;
  if(valor)$('#ea-run').disabled=true;
  window.SICARDExtracao?.atualizarControles?.();
 }
 async function cancelar(){
  cancelando=true;
  try{
   if(iniciando)await iniciando;
   if(job&&!terminais.has(job.status)){
    await post(`/extracao-atributos/entrada-local/jobs/${job.id}/cancelar`,{});
    while(!terminais.has(job.status)){await dormir(150);job=await json(`/extracao-atributos/entrada-local/jobs/${job.id}`);}
    if(job.status!=='cancelado'&&job.status!=='concluido')throw new Error(job.erro||'Não foi possível confirmar o cancelamento.');
   }
   // O job terminou antes de o cancelamento valer: o resultado é válido e não deve ser descartado.
   if(job?.status==='concluido')cancelando=false;
  }catch(erro){cancelando=false;throw erro;}
 }
 node('upload').addEventListener('click',()=>{if(!state.busy&&!ativo)arquivo.click();});
 node('upload-cancel').addEventListener('click',()=>{if(ativo)cancelar().catch(e=>feedback(e.message,'error'));});
 async function ler(files){
  ocupado(true);cancelando=false;job=null;
  const tarefa=file=>`Validar ${file.name}`;
  processo=window.ProcessFeedback.iniciarCadastro({title:'Validando camadas de entrada',subtitle:`${files.length} arquivo(s)`,
   tasks:files.map(tarefa),onCancel:()=>{cancelar().catch(e=>feedback(e.message,'error'));}});
  const resultados=[];
  try{
   for(const [indice,file] of files.entries()){
    if(cancelando)break;
    processo.tarefaAtual(tarefa(file),`Enviando para validação (${indice+1}/${files.length}).`);
    iniciando=(async()=>{
     const response=await fetch(`${base}/extracao-atributos/entrada-local/jobs?nome=${encodeURIComponent(file.name)}`,{
      method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/octet-stream'},body:file,signal:AbortSignal.timeout(180000)});
     const result=await response.json().catch(()=>null);
     if(!response.ok)throw new Error(typeof result?.detail==='string'?result.detail:`Falha na validação (HTTP ${response.status}).`);
     job=result;
    })();
    await iniciando;iniciando=null;
    while(!terminais.has(job.status)){
     window.ProcessFeedback.acompanhar({...job,percentual:job.percentual==null?null:(indice+job.percentual/100)/files.length*100});
     await dormir(350);job=await json(`/extracao-atributos/entrada-local/jobs/${job.id}`);
    }
    window.ProcessFeedback.acompanhar({...job,percentual:job.percentual==null?null:(indice+job.percentual/100)/files.length*100});
    if(cancelando||job.status==='cancelado')break;
    if(job.status!=='concluido')throw new Error(job.erro||'A validação não foi concluída.');
    const result=job.resultado;
    if(!Array.isArray(result?.camadas)||!result.resumo)throw new Error('O servidor não retornou a validação de todas as camadas.');
    const validas=result.camadas.filter(c=>c.status_validacao==='valida'&&c.tipo!=='raster');
    const entrada=result.entrada||{id:`previa:${crypto.randomUUID()}`,nome:file.name,origem:'local',tipo:'pacote'};
    Object.assign(entrada,{arquivo:file.name,camadas_importadas:result.camadas,camadas_bancada:validas});
    if(validas.length)entrada.arquivo_local={nome:file.name,conteudo_base64:await base64(file),camadas:validas.map(c=>c.chave)};
    resultados.push({entrada,resumo:result.resumo});
    processo.concluirTarefa(tarefa(file),`${result.resumo.total} camada(s), ${result.resumo.invalidas} não validada(s)`);
   }
   if(cancelando||job?.status==='cancelado'){
    processo.fechar();feedback('Validação cancelada. A prévia anterior foi mantida.');return;
   }
   guardarPrevia(state);
   for(const {entrada} of resultados)state.catalog.push(entrada);
   // Arquivos adicionais se somam à preparação. A bancada conserva sua confirmação anterior.
   for(const {entrada} of resultados){if(!state.input){state.input=entrada.id;state.inputConfig=null;}else state.entradasExtras.push({id:entrada.id,config:null});}
   state.previaLocal=null;
   await changed();
   const total=resultados.reduce((n,r)=>n+r.resumo.total,0),invalidas=resultados.reduce((n,r)=>n+r.resumo.invalidas,0);
   processo.sucesso({_status:invalidas?'partial':undefined,title:invalidas?'Validação com camadas recusadas':'Camadas validadas',
    message:`${total} camada(s) examinada(s) em ${resultados.length} arquivo(s); ${invalidas} não validada(s). Confira a prévia e use Enviar pra bancada para confirmar as camadas válidas.`});
  }catch(e){if(cancelando){processo.fechar();feedback('Validação cancelada. A prévia anterior foi mantida.');}else processo.erro({message:e.message,solution:'A prévia anterior foi mantida. Corrija o arquivo e envie de novo.'});}
  finally{iniciando=null;ocupado(false);}
 }
 arquivo.addEventListener('change',()=>{
  const files=[...arquivo.files];arquivo.value='';if(!files.length||state.busy||ativo)return;
  if(files.some(f=>!f.size||f.size>MAX_BYTES)){feedback('Selecione arquivos não vazios, de até 16 MB cada.','error');return;}
  if(files.length+(state.input?1:0)+state.entradasExtras.length>10){feedback('Prepare até dez arquivos de entrada por análise.','warning');return;}
  const existentes=[state.input,...state.entradasExtras.map(e=>e.id)].map(id=>state.catalog.find(c=>c.id===id)).filter(Boolean);
  if(files.reduce((n,f)=>n+Math.ceil(f.size/3)*4,0)+existentes.reduce((n,l)=>n+(l.arquivo_local?.conteudo_base64.length||0),0)>30*1024*1024){feedback('O conjunto excede 30 MB codificados para execução em memória. Reduza a quantidade de arquivos.','warning');return;}
  ler(files);
 });
 return {render(){},limpar(){if(!ativo)state.previaLocal=null;}};
}
