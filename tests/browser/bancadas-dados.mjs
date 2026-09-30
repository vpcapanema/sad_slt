import assert from 'node:assert/strict';
globalThis.location={pathname:'/sicard/',origin:'https://example.test'};
const {snapshotBancada,renovarBancada}=await import('../../geoespacial/extracao-atributos/bancadas.js');
const layer={id:'p',chave:'pontos',nome:'Pontos',tipo:'vetor'};
const original={nome:'original.gpkg',conteudo_base64:'AAECAw=='};
const state={bancadaEntradas:[{id:'local:a',layer:{id:'local:a',arquivo_local:original,camadas_bancada:[layer]},config:{camadas:{pontos:{campo_id:'__feicao__'}}}}],
 bancadaBases:[{id:'base',layer:{id:'base',nome:'Base'},regra:{estatistica:'valores'}}],bancadaResultados:[],categories:[],operation:'estatisticas'};
const painel=[{id:'p',visivel:false},{id:'base',visivel:true}];
const saved=snapshotBancada(state,painel);
assert.deepEqual(saved.bancadaEntradas[0].layer.arquivo_local,original);
let compat=0,local=0;
const fresh=id=>({id,feicoes:1,status_validacao:'valida',representacao:'tiles',tiles_url:'/fresh',revisao:'fresh',metadados_local:{identificacao:{total:1,campos:[]}}});
const restored=await renovarBancada(saved,{validarCamada:async ref=>fresh(ref.id),validarEntradaLocal:async file=>{assert.deepEqual(file,original);local++;return [{...fresh('novo'),chave:'pontos'}];}},async(route,payload)=>{compat++;assert.equal(payload.camadas[0].arquivo_local.conteudo_base64,'AAECAw==');return {compativel:true};});
assert.equal(restored.bancadaEntradas[0].layer.camadas_bancada[0].id,'p');
assert.equal(restored.bancadaEntradas[0].config.camadas.pontos.validacao_previa,'fresh');
assert.equal(restored.painel[0].visivel,false);
assert.equal(saved.bancadaEntradas[0].layer.camadas_bancada[0].revisao,undefined);
assert.equal(local,1);assert.equal(compat,1);
await assert.rejects(()=>renovarBancada(saved,{validarEntradaLocal:async()=>{throw Error('Original inválido');}}),/Original inválido/);
assert.throws(()=>snapshotBancada(state,[...painel,{id:'nao-persistido',nome:'Memória'}]),/storage/);
console.log('OK: originais, visibilidade, validação, compatibilização e restauração sem alterar snapshot.');

for(const e of restored.bancadaEntradas)for(const l of e.layer.camadas_bancada)l.previa_reutilizavel=true;
for(const b of restored.bancadaBases)b.layer.previa_reutilizavel=true;
await renovarBancada(restored,{validarCamada:()=>{throw Error('Não deve revalidar');},validarEntradaLocal:()=>{throw Error('Não deve reenviar');}},()=>{throw Error('Não deve recompatibilizar');});
console.log('OK: abertura de configuração inalterada não revalida nem compatibiliza.');
