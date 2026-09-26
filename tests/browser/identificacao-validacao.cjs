const assert=require('node:assert/strict');
(async()=>{
 const {avaliarIdentificacao}=await import('../../geoespacial/extracao-atributos/lote.js');
 const geojson={type:'FeatureCollection',features:[{type:'Feature',properties:{codigo:'A'}}]};
 const layer={nome:'Demandas',geojson,metadados_local:{identificacao:{campos:[{nome:'codigo',nulos:0}],completa:true}}};
 const config={campo_id:'codigo'};
 assert.equal(avaliarIdentificacao(layer,config).erro,'','Metadados sem total não bloqueiam dados carregados');
 const sintetico={};assert.equal(avaliarIdentificacao(layer,sintetico).erro,'');assert.equal(sintetico.campo_id,'codigo');
 layer.metadados_local.identificacao.campos[0].nulos=1;
 assert.match(avaliarIdentificacao(layer,config).erro,/1 registro.*sem ID/);
 assert.equal(avaliarIdentificacao(layer,{campo_id:'__feicao__'}).erro,'','FID permanece disponível com atributos nulos');
 assert.match(avaliarIdentificacao(layer,{campo_id:'antigo'}).erro,/não existe/);
 assert.equal(avaliarIdentificacao({nome:'Carregando'},{}).aguardando,true);
 assert.match(avaliarIdentificacao({geojson:{features:[]}},{}).erro,/sem feições/);
 assert.match(avaliarIdentificacao({erro:'Arquivo indisponível'},{}).erro,/Falha na leitura/);
 console.log('Identificação: metadados parciais, FID, nulos, campo ausente, leitura e camada vazia: OK');
})().catch(e=>{console.error(e);process.exitCode=1;});
