export function camadaVisivel(map,id){
  if(!map?.getSource(id))return false;
  for(const suffix of ['','-line','-point'])if(map.getLayer(id+suffix))return map.getLayoutProperty(id+suffix,'visibility')!=='none';
  return false;
}
import { $, feedback } from './ui.js';

// Reutiliza o documento da bancada com seus módulos e estilos.
export function criarMapa(aoMudarPainel) {
  const frame=$('#ea-workbench-frame'),mounted=new Map();
  let latest=[],ready=false,timer,syncing=false;
  const context=()=>frame.contentWindow;
  const editing=()=>Boolean(context()?.document.querySelector('.gp-file-inline'));
  function atualizarDetalhe(){
    const app=context()?.gpApp;if(!ready||!app)return;
    for(const item of latest){
      if(!item.geojson_resumido)continue;
      const id=item.id||item.key, registro=mounted.get(item.key),source=app.state.map.getSource(id);
      const dados=app.state.map.getZoom()<12?item.geojson_resumido:item.geojson;
      if(registro&&source?.setData&&registro.dadosMapa!==dados){source.setData(dados);registro.dadosMapa=dados;}
    }
  }
  function sync(items=latest){
    latest=items;
    if(!ready)return;
    if(editing()){clearTimeout(timer);timer=setTimeout(()=>sync(),300);return;}
    syncing=true;
    try{
      const win=context(),app=win.gpApp,files=win.gpArquivos;
      const keys=new Set(items.map(item=>item.key));
      for(const [key,previous] of mounted)if(!keys.has(key)){
        app.removeLayerFromMap(previous.id,false);files.sessions.delete(previous.id);mounted.delete(key);
      }
      // Uma renderização do painel e um enquadramento só, no último item pendente.
      const pendentes=items.filter(item=>{const previous=mounted.get(item.key);
        return !previous||previous.geojson!==item.geojson||previous.revisao!==item.revisao||!app.state.layers.some(layer=>layer.id===(item.id||item.key));});
      const ultimo=pendentes[pendentes.length-1];
      let gruposAlterados=false;
      for(const item of items){
        const id=item.id||item.key,previous=mounted.get(item.key);
        if(!previous||previous.geojson!==item.geojson||previous.revisao!==item.revisao||!app.state.layers.some(layer=>layer.id===id)){
          const lote=item!==ultimo;
          const metodo=item.metadados_local?.previa?.metodo||item.representacao_previa?.metodo;const aproximada=metodo&&metodo!=='original';
          const nomeMapa=aproximada?`${item.nome} · prévia aproximada`:item.nome;
          if(item.representacao==='tiles'){
            files.sessions.set(id,{...item,id});
            app.adicionarCamadaStorageTiles(id,item.nome,{...item,caminho:item.arquivo||item.id},{categoria:item.grupo,lote,estiloPreparado:true});
          }else if(item.arquivo&&item.revisao&&item.campos)files.adicionar({...item,id,categoria:item.grupo},{lote,estiloPreparado:true});
          else app.adicionarCamadaGeoJsonEmMemoria(id,nomeMapa,item.geojson,{categoria:item.grupo,lote,geometria_tipo:item.geojson.features[0]?.geometry?.type,estiloPreparado:true});
          if(!app.state.layers.some(layer=>layer.id===id))throw new Error(`${item.nome} ainda não foi adicionada ao painel. Tente novamente após o mapa carregar.`);
          app.state.layers.find(layer=>layer.id===id).previaAproximada=Boolean(aproximada);
          mounted.set(item.key,{id,geojson:item.geojson,revisao:item.revisao,color:item.color});
          if(item.color)app.applyLayerColor(id,item.color,false);
        }else if(previous.color!==item.color){app.applyLayerColor(id,item.color,false);previous.color=item.color;}
        const registro=app.state.layers.find(l=>l.id===id);
        if(registro&&(registro.papelExtracao!==item.papelExtracao||registro.arquivoGrupo!==item.arquivoGrupo||registro.categoria!==item.grupo)){
          Object.assign(registro,{papelExtracao:item.papelExtracao,arquivoGrupo:item.arquivoGrupo,categoria:item.grupo});gruposAlterados=true;
        }
      }
      if(gruposAlterados)app.renderLayers();
    }catch(error){feedback(`Não foi possível sincronizar a bancada: ${error.message}`,'error');}
    finally{syncing=false;atualizarDetalhe();}
  }
  function connect(){
    clearTimeout(timer);ready=false;mounted.clear();let attempts=0;
    const check=()=>{
      const win=context();
      if(win?.gpArquivos&&win.gpApp?.state.map?.isStyleLoaded()){
        if(!win.document.body.classList.contains('ea-embedded-workbench')){
          win.document.body.classList.add('ea-embedded-workbench');
          // A bancada mantém seu próprio feedback, inclusive quando incorporada.
          const narrow=win.matchMedia('(max-width:650px)');
          const resize=()=>{
            if(narrow.matches){win.gpDocks.collapse('left');win.gpDocks.collapse('right');}
            win.gpApp.state.map.resize();
          };
          narrow.addEventListener('change',resize);resize();
        }
        ready=true;win.gpApp.state.map.on('zoomend',atualizarDetalhe);observar();sync();queueMicrotask(()=>aoMudarPainel?.());return;
      }
      if(++attempts<300)timer=setTimeout(check,100);
      else feedback('A bancada não terminou de carregar. Recarregue a página para tentar novamente.');
    };check();
  }
  // O painel da bancada e a fonte da verdade: remover uma camada la tem que
  // tirá-la do processamento. renderLayers roda a cada mudança do painel.
  function observar(){
    const app=context()?.gpApp;
    if(!app||app.__eaObservado)return;
    app.__eaObservado=true;
    const remover=app.removeLayerFromMap;
    app.removeLayerFromMap=function(id,report=true){
      const retorno=remover.call(this,id,false);
      if(!syncing){
        // A remoção do ribbon usa renderLayers interno, não o método exportado.
        aoMudarPainel?.();
        latest=latest.filter(item=>(item.id||item.key)!==id);
        if(report)app.log('Camada removida da bancada e da composição da extração.','ok');
      }
      return retorno;
    };
    const original=app.renderLayers;
    app.renderLayers=function(...args){
      const retorno=original.apply(this,args);
      if(!syncing)aoMudarPainel?.();
      return retorno;
    };
  }
  /** Camadas hoje no painel, com a categoria que a extração atribuiu. */
  function camadas(){
    const app=context()?.gpApp;
    if(!ready||!app)return null;
    return app.state.layers.map(item=>({id:item.id,nome:item.nome,categoria:String(item.categoria||''),
      color:app.state.map.getLayer(item.id)?app.state.map.getPaintProperty?.(item.id,'fill-color'):null,visivel:camadaVisivel(app.state.map,item.id)}));
  }
  frame.addEventListener('load',connect);connect();
  function assertReady(ids=[]){
    if(!ready)throw new Error('Aguarde o carregamento da bancada.');
    const atuais=camadas();
    if(!atuais)throw new Error('Aguarde o carregamento da bancada.');
    const presentes=new Set(atuais.map(item=>item.id));
    if(ids.some(id=>!presentes.has(id)))throw new Error('Aguarde: nem todas as camadas selecionadas foram adicionadas à bancada.');
    if(editing())throw new Error('Salve ou cancele a edição na bancada. Para analisar uma nova versão salva, selecione esse arquivo na configuração.');
  }
  function restaurarVisibilidade(painel){
    const app=context()?.gpApp;if(!ready||!app)return;
    syncing=true;
    try{for(const item of painel)for(const suffix of ['','-line','-point'])if(app.state.map.getLayer(item.id+suffix))
      app.state.map.setLayoutProperty(item.id+suffix,'visibility',item.visivel?'visible':'none');
      app.renderLayers();
    }finally{syncing=false;}
  }
  const exibida=id=>[...mounted.values()].some(item=>item.id===id);
  async function enquadrar(ids,bounds){
    for(let i=0;i<300;i++){
      try{assertReady(ids);break;}catch(error){if(i===299)throw error;}
      await new Promise(resolve=>setTimeout(resolve,100));
    }
    if(bounds){const map=context().gpApp.state.map;map.resize();map.fitBounds([[bounds[0],bounds[1]],[bounds[2],bounds[3]]],{padding:50,maxZoom:16});}
  }
  function descritores(){return [...(context()?.gpArquivos?.sessions?.values()||[])];}
  function visual(){const m=context()?.gpApp?.state.map;return m?{center:m.getCenter().toArray(),zoom:m.getZoom(),bearing:m.getBearing(),pitch:m.getPitch()}:null;}
  function restaurarVisual(v,painel=[]){
    const app=context()?.gpApp;if(!app)return;
    for(const item of painel)if(typeof item.color==='string')app.applyLayerColor(item.id,item.color,false);
    restaurarVisibilidade(painel);
    if(v)app.state.map.jumpTo(v);
  }
  return {sync,assertReady,camadas,exibida,restaurarVisibilidade,enquadrar,descritores,visual,restaurarVisual};
}
