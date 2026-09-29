// Observabilidade local: somente campos explicitamente permitidos chegam ao console.
const PREFIX='[SICARD][Extração]';
let ativo=false,verboso=false,sequencia=0,sequenciaJob=0,acaoAtual='inicio';
const sessao=(globalThis.crypto?.randomUUID?.()||Date.now().toString(36)).slice(0,8),jobs=new Map(),vistos=new Map(),httpVistos=new Map(),correlacoesJobs=new Map();
const numericos=new Set(['duracao_ms','status_http','tentativa','entradas','bases','categorias','camadas','feicoes','campos','finalidades','arquivos','bytes','revisao','tarefa_id','percentual','progresso_tarefa','tarefa_concluidas','tarefa_total','fases_concluidas','total_fases','eventos','camadas_visiveis']);
const booleanos=new Set(['busy','uploading','loadingMap','loadingCatalog','cancelavel','cancelamento_solicitado','valido','resultado','recorte','local']);
const enums={status:['pendente','executando','concluido','erro','cancelado'],tarefa_estado:['running','executando','concluido','erro','cancelado','pendente'],
 operacao:['','enriquecimento','estatisticas','intersection','identity'],origem:['polling','sse','interface','http'],
 metodo:['GET','POST','PUT','PATCH','DELETE'],erro:['Error','TypeError','AbortError','TimeoutError','SyntaxError','QuotaExceededError','outro'],
 unidade_tarefa:['itens','feições','feicoes','geometrias','registros','campos','pares','vértices','vertices','arquivos','bytes']};
function limitar(map,key,value){if(map.size>=500&&!map.has(key))map.delete(map.keys().next().value);map.set(key,value);}
function jobRef(id){if(id==null)return undefined;const key=String(id);if(!jobs.has(key))limitar(jobs,key,`job-${++sequenciaJob}`);return jobs.get(key);}
// Não mostra caminhos de acervo, chaves de configuração, tokens de sessão ou querystrings.
export function rotaSegura(path){
 const parts=String(path).split(/[?#]/,1)[0].split('/').filter(Boolean);
 const fixos=new Set(['api','sicard','geoespacial','extracao-atributos','catalogo','arquivo-mapa','compatibilizar','execucoes','cancelar','pacote','eventos','tabela','dashboard','intersecoes','relatorios','processamento','analitico','configuracoes','entrada-local','jobs','pastas','storage-upload','sessoes','resultado','municipal','categorias','preview']);
 return '/'+parts.map(p=>fixos.has(p)?p:':ref').join('/');
}
function seguro(dados={}){
 const out={};
 for(const [k,v] of Object.entries(dados)){
  if(numericos.has(k)&&typeof v==='number'&&Number.isFinite(v))out[k]=Math.round(v*100)/100;
  else if(booleanos.has(k)&&typeof v==='boolean')out[k]=v;
  else if(enums[k]?.includes(v))out[k]=v;
  else if(k==='rota')out[k]=rotaSegura(v);
  else if(['acao','requisicao'].includes(k)&&/^(inicio|[ar]-[0-9]+)$/.test(v))out[k]=v;
  else if(k==='job')out[k]=jobRef(v);
  // Descrições vêm exclusivamente da lista fixa do componente, nunca de texto do servidor.
  else if(k==='suboperacao'&&typeof v==='string'&&window.ProcessFeedback?.operacoesObservaveis?.includes(v))out[k]=v;
 }
 return out;
}
export function log(evento,dados={},nivel='info'){
 if(!ativo)return;
 const nome=/^[a-z][a-z0-9_.-]{0,70}$/.test(evento)?evento:'evento';
 const snapshot=Object.freeze({sessao,acao:acaoAtual,...seguro(dados)});
 const metodo=['info','warn','error'].includes(nivel)?nivel:'info';
 try{console[metodo](`${PREFIX} ${nome}`,snapshot);}catch{ /* Diagnóstico nunca interrompe uma ação. */ }
}
export function acao(nome,dados={}){acaoAtual=`a-${++sequencia}`;log(`acao.${nome}`,dados);return acaoAtual;}
export function falha(onde,error,dados={}){log(`erro.${onde}`,{...dados,status_http:error?.status||0,erro:enums.erro.includes(error?.name)?error.name:'outro'},'error');}
export function estado(state,comp){
 const data={busy:!!state.busy,uploading:!!state.uploading,loadingMap:!!state.loadingMap,loadingCatalog:!!state.loadingCatalog,
  operacao:state.operation,entradas:comp?.entradas?.length||0,bases:comp?.bases?.length||0,camadas_visiveis:comp?.camadas?.length||0,
  categorias:state.categories?.length||0,finalidades:state.finalidades?.length||0,resultado:!!state.result,recorte:!!state.camadaRecorte};
 const key=JSON.stringify({...data,ids:comp?.ids||[]});if(vistos.get('estado')===key)return;vistos.set('estado',key);log('estado.alterado',data);
}
export const correlacaoAtual=()=>acaoAtual;
export function progresso(job,origem='polling',correlacao=acaoAtual){
 const ref=jobRef(job?.id);
 if(ref){if(!correlacoesJobs.has(ref))limitar(correlacoesJobs,ref,correlacao);correlacao=correlacoesJobs.get(ref);}
 const resumo=window.ProcessFeedback?.operacoesObservaveis?.includes(job?.suboperacao)?job:window.ProcessFeedback?.resumoProgresso?.(job)||job||{};
 const data=seguro({...resumo,job:job?.id,origem,acao:correlacao});
 const key=jobRef(job?.id)||'sem-job';
 // Mudanças de revisão/heartbeat e de transporte, sozinhas, não repetem o retrato.
 const assinatura=JSON.stringify({...data,revisao:undefined,origem:undefined});
 const anterior=vistos.get(key);if(anterior?.assinatura===assinatura)return;
 if(typeof resumo.revisao==='number'&&typeof anterior?.revisao==='number'&&resumo.revisao<anterior.revisao)return;
 limitar(vistos,key,{assinatura,revisao:resumo.revisao});
 log('job.progresso',{...resumo,job:job?.id,origem,acao:correlacao},resumo.status==='erro'?'error':resumo.status==='cancelado'?'warn':'info');
}
export function iniciarHttp(path,options={}){
 const metodo=String(options.method||'GET').toUpperCase(),rota=rotaSegura(path),requisicao=`r-${++sequencia}`,inicio=performance.now(),correlacao=acaoAtual;
 const polling=metodo==='GET'&&(/\/(execucoes|jobs)\/[^/?]+(?:\?.*)?$/.test(path));
 const key=metodo+' '+String(path).split(/[?#]/,1)[0];
 const emitir=verboso||!polling||!httpVistos.has(key);
 if(emitir)log('http.inicio',{metodo,rota,requisicao,acao:correlacao});
 return {
  concluir(status_http,data){
   const mudou=httpVistos.get(key)!==status_http;limitar(httpVistos,key,status_http);
   if(emitir||mudou||status_http>=400)log('http.fim',{metodo,rota,requisicao,acao:correlacao,status_http,duracao_ms:performance.now()-inicio},status_http>=400?'error':'info');
   if(data&&typeof data==='object'&&data.id&&enums.status.includes(data.status))progresso(data,'polling',correlacao);
  },
  falhar(error){falha('http',error,{metodo,rota,requisicao,acao:correlacao,duracao_ms:performance.now()-inicio});},
 };
}
export function resultado(value){log('resultado.disponivel',{job:value?.id,camadas:Object.keys(value?.camadas||{}).length,campos:value?.dicionario?.length||0,feicoes:value?.geojson?.features?.length||0});}
export function instalarLogs(){
 if(window.SICARDExtracaoLogs)return;
 ativo=true;
 window.SICARDExtracaoLogs=Object.freeze({
  ativar(){ativo=true;log('console.ativado');},desativar(){log('console.desativado');ativo=false;},
  detalharHttp(valor=true){verboso=Boolean(valor);log('console.http_configurado');},
  status:()=>Object.freeze({ativo,httpDetalhado:verboso,sessao}),
 });
 log('console.iniciado');
 try{console.info(`${PREFIX} Logs ativos. SICARDExtracaoLogs.desativar(), .ativar(), .detalharHttp(true), .status(). Sem arquivos, atributos, cabeçalhos ou parâmetros privados.`);}catch{}
 const controles=new Map([
  ['ea-run','executar'],['ea-export','exportar'],['ea-recover','recuperar'],['ea-refresh','atualizar_catalogo'],['ea-input-browse','selecionar_entrada'],['ea-base-browse','selecionar_bases'],
  ['ea-input-upload','enviar_entrada_local'],['ea-base-local-upload','enviar_base_storage'],['ea-staging-confirmar','enviar_bancada'],['ea-base-list-confirmar','validar_bases'],
  ['ea-config-salvar','salvar_configuracao'],['ea-config-carregar','carregar_configuracao'],['ea-staging-salvar','salvar_lista'],['ea-staging-carregar','carregar_lista'],
  ['ea-municipal-open','abrir_territorial'],['ea-identificacao-confirmar','confirmar_identificacao'],['ea-input-clear','limpar_entrada'],['ea-staging-limpar','limpar_previa'],['ea-input-upload-cancel','cancelar_upload']]);
 document.addEventListener('click',event=>{const id=event.target.closest?.('[id]')?.id;const nome=controles.get(id);if(nome)acao(nome);else if(event.target.closest?.('#ea-config [data-rule], #ea-config [data-edit], #ea-config [data-remove]'))acao('editar_regra_ou_finalidade');},true);
 document.addEventListener('change',event=>{if(['ea-operation','ea-run-cut','ea-category-select'].includes(event.target.id))acao('alterar_configuracao');else if(event.target.matches?.('#ea-config input, #ea-config select, #ea-config textarea'))acao('alterar_parametros');},true);
}
