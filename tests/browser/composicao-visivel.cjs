const assert=require('node:assert/strict');
(async()=>{
 const {composicaoVisivel,validarComposicao,pedidoDaComposicao}=await import('../../geoespacial/extracao-atributos/composicao.js');
 const {camadaVisivel}=await import('../../geoespacial/extracao-atributos/mapa.js');
 const geo={type:'FeatureCollection',features:[]};
 const parts=['pontos','linhas','poligonos'].map(id=>({id,chave:id,nome:id,tipo:'vetor',geojson:geo}));
 const config={camadas:Object.fromEntries(parts.map(p=>[p.chave,{campo_id:'codigo',identificacao_confirmada:true,processar:false,operacao:'enriquecimento'}]))};
 const layer={id:'local:arquivo',nome:'demandas.gpkg',camadas_bancada:parts,geojson:geo,arquivo_local:{nome:'demandas.gpkg',conteudo_base64:'arquivo',camadas:parts.map(p=>p.chave)}};
 const s={bancadaEntradas:[{id:layer.id,layer,config},{id:'outra',layer:{id:'outra',nome:'Outra',geojson:geo},config:{campo_id:'ID',identificacao_confirmada:true}}],
 bancadaBases:['risco','restricao'].map(id=>({id,category:id,layer:{id,nome:id},regra:{}})),
 operation:'estatisticas',executarEmLote:false,camadaRecorte:'',nomeSaida:'Saída',opcoes:{},categories:[{id:'risco',nome:'Risco'},{id:'restricao',nome:'Restrição'}],finalidades:[],
 input:'preview',inputConfig:{identificacao_confirmada:false},entradasExtras:[]};
 let painel=[...parts.map(p=>({id:p.id,visivel:p.id==='linhas'})),{id:'risco',visivel:true},{id:'restricao',visivel:false}];
 let comp=composicaoVisivel(s,painel);
 assert.deepEqual(comp.ids,['linhas','risco']);assert.doesNotThrow(()=>validarComposicao(s,comp));
 const payload=pedidoDaComposicao(s,comp);
 assert.deepEqual(payload.input.arquivo_local.camadas,['linhas']);
 assert.deepEqual(Object.keys(payload.entradas[0].config.camadas),['linhas']);
 assert.equal(payload.entradas[0].config.camadas.linhas.processar,true,'A visibilidade supera seleção antiga de processar');
 assert.equal(payload.entradas[0].config.camadas.linhas.operacao,'estatisticas','Modo atual supera parâmetro legado escondido');
 assert.deepEqual(payload.categorias.map(c=>c.id),['risco']);
 assert.equal(layer.camadas_bancada.length,3,'Não altera o snapshot nem apaga ocultas');
 painel[0].visivel=true;comp=composicaoVisivel(s,painel);
 assert.throws(()=>validarComposicao(s,comp),/individual/);
 s.executarEmLote=true;assert.doesNotThrow(()=>validarComposicao(s,comp));
 s.operation='enriquecimento';s.camadaRecorte='restricao';assert.throws(()=>validarComposicao(s,comp),/recorte/);
 s.camadaRecorte='risco';assert.doesNotThrow(()=>validarComposicao(s,comp));
 assert.equal(composicaoVisivel(s,null).camadas.length,0,'Não processa antes da bancada carregar');
 const map={getSource:()=>true,getLayer:id=>id==='x-line',getLayoutProperty:()=> 'none'};
 assert.equal(camadaVisivel(map,'x'),false);map.getLayoutProperty=()=>undefined;assert.equal(camadaVisivel(map,'x'),true);
 // Ocultar a entrada principal promove a próxima e seu arquivo local corretamente.
 s.bancadaEntradas.push({id:'local:segunda',layer:{id:'local:segunda',nome:'segunda.gpkg',geojson:geo,arquivo_local:{camadas:['s']}},config:{campo_id:'id',identificacao_confirmada:true}});
 comp=composicaoVisivel(s,[{id:'local:segunda',visivel:true},{id:'risco',visivel:true}]);
 assert.equal(pedidoDaComposicao(s,comp).input.id,'local:segunda');
 assert.deepEqual(pedidoDaComposicao(s,comp).entradas_locais,{});
 console.log('Bancada: visibilidade, individual/lote, subconjunto de arquivo e pedido final: OK');
})().catch(e=>{console.error(e);process.exitCode=1;});
