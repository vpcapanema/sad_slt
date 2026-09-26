const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
(async()=>{
 const {validarLote}=await import(pathToFileURL(path.resolve('geoespacial/extracao-atributos/lote.js')));
 const a={id:'arquivo:a',chave:'a',tipo:'vetor'},b={id:'arquivo:b',chave:'b',tipo:'vetor'};
 const confirmed={camadas:{a:{campo_id:'codigo',identificacao_confirmada:true}}};
 const s={input:'arquivo',inputConfig:{camadas:{a:{identificacao_confirmada:false}}},entradasExtras:[],
  operation:'estatisticas',catalog:[{id:'arquivo',camadas_bancada:[a,b]}],
  bancadaEntradas:[{id:'arquivo',layer:{id:'arquivo',camadas_bancada:[a]},config:confirmed}]};
 assert.doesNotThrow(()=>validarLote(s),'Somente o subconjunto confirmado participa do processamento');
 assert.equal(s.inputConfig.camadas.a.identificacao_confirmada,false,'Validar não altera a prévia');
 assert.equal(s.bancadaEntradas[0].config,confirmed,'Não substitui o snapshot pela configuração da prévia');
 s.inputConfig.camadas.a.identificacao_confirmada=true;
 confirmed.camadas.a.identificacao_confirmada=false;
 assert.throws(()=>validarLote(s),/Confirme/,'Confirmar na prévia não autoriza uma composição anterior');
 confirmed.camadas.a.identificacao_confirmada=true;
 confirmed.camadas.a.operacao='enriquecimento';
 assert.throws(()=>validarLote(s),/base de recorte/);
 confirmed.camadas.a.camada_recorte='base';
 assert.doesNotThrow(()=>validarLote(s));
 confirmed.camadas.a.processar=false;
 assert.throws(()=>validarLote(s),/ao menos uma/);
 console.log('Lote: snapshot confirmado, subconjunto de camadas, identificação e recorte: OK');
})().catch(error=>{console.error(error);process.exitCode=1;});
