const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('geoespacial/bancada-arquivos.js','utf8');
const implementation=source.slice(source.indexOf('async function execute(form)'),source.indexOf('\nfunction init()'));
async function execute(files,params){
 const requests=[],history=[],sessions=new Map(files.map(file=>[file.id,file]));
 const proc={tarefaAtual(){},concluirTarefa(){},sucesso(){},erro(){}};
 const context=vm.createContext({
  busy:false,editor:null,sessions,Date,JSON,Number,String,Object,Array,Error,
  FormData:class{*[Symbol.iterator](){yield* Object.entries(params);}getAll(key){return params[key];}},
  prepararTabela:async id=>sessions.get(id),
  exigirPersistido:file=>{if(file.origem_geometria==='local_temporaria')throw Error('Arquivo local temporário');},
  ehStorage:file=>file.id.startsWith('storage:'),
  app:()=>({state:{layerFilters:{},history},operations:[]}),
  window:{gpFeedback:{ProcessFeedback:{confirmar:async()=>true,iniciarCadastro:()=>proc,acompanhar(){}}}},
  localStorage:{setItem(){}},
  post:async(url,payload)=>{requests.push({url,payload});return {status:'concluido',resultado:{execucao_id:'teste'}};},
 });
 vm.runInContext(implementation,context);
 const form={dataset:{op:'OP-03'},elements:{},querySelectorAll:()=>[],querySelector:()=>null};
 await context.execute(form);
 return JSON.parse(JSON.stringify(requests[0].payload));
}
(async()=>{
 const catalog={id:'camada_catalogo',nome:'Catálogo',origem_geometria:'banco'};
 const storage={id:'storage:base-geoespacial/teste.gpkg::linhas',arquivo:'base-geoespacial/teste.gpkg',revisao:'rev-1'};
 const registered={id:'registrada',arquivo:'data/registrada.gpkg',revisao:'rev-2'};
 let payload=await execute([catalog],{camada_id:catalog.id});
 assert.deepEqual(payload.arquivos,{});assert.equal(payload.parametros.camada_id,catalog.id);
 payload=await execute([catalog,storage,registered],{camada_ids:[catalog.id,storage.id,registered.id]});
 assert.deepEqual(payload.arquivos,{[storage.id]:{arquivo:storage.arquivo,revisao:'rev-1'},registrada:{arquivo:registered.arquivo,revisao:'rev-2'}});
 payload=await execute([{...catalog,origem_geometria:'arquivo'}],{camada_id:catalog.id});
 assert.deepEqual(payload.arquivos,{});
 for(const file of [{id:'storage:incompleto'},{id:'parcial',arquivo:'teste.gpkg'}, {id:'desconhecido'}]){
  await assert.rejects(execute([file],{camada_id:file.id}),/referência do arquivo está incompleta/);
 }
 await assert.rejects(execute([{id:'local',origem_geometria:'local_temporaria'}],{camada_id:'local'}),/temporário/);
 console.log('OK: execução com catálogo, arquivo, entradas mistas e múltiplas; contratos incompletos e temporários bloqueados antes do envio.');
})().catch(error=>{console.error(error);process.exitCode=1;});
