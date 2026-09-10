import { $, feedback } from './ui.js';

// Reutiliza o documento da bancada com seus módulos e estilos.
export function criarMapa() {
  const frame=$('#ea-workbench-frame'),mounted=new Map();
  let latest=[],ready=false,timer;
  const context=()=>frame.contentWindow;
  const editing=()=>Boolean(context()?.document.querySelector('.gp-file-inline'));
  function sync(items=latest){
    latest=items;
    if(!ready)return;
    if(editing()){clearTimeout(timer);timer=setTimeout(()=>sync(),300);return;}
    try{
      const win=context(),app=win.gpApp,files=win.gpArquivos;
      const keys=new Set(items.map(item=>item.key));
      for(const [key,previous] of mounted)if(!keys.has(key)){
        app.removeLayerFromMap(previous.id,false);files.sessions.delete(previous.id);mounted.delete(key);
      }
      // Uma renderização do painel e um enquadramento só, no último item pendente.
      const pendentes=items.filter(item=>{const previous=mounted.get(item.key);
        return !previous||previous.geojson!==item.geojson||!app.state.layers.some(layer=>layer.id===(item.id||item.key));});
      const ultimo=pendentes[pendentes.length-1];
      for(const item of items){
        const id=item.id||item.key,previous=mounted.get(item.key);
        if(!previous||previous.geojson!==item.geojson||!app.state.layers.some(layer=>layer.id===id)){
          const lote=item!==ultimo;
          if(item.arquivo&&item.revisao&&item.campos)files.adicionar({...item,id,origem:item.grupo},{lote});
          else app.adicionarCamadaGeoJsonEmMemoria(id,item.nome,item.geojson,{origem:item.grupo,lote,geometria_tipo:item.geojson.features[0]?.geometry?.type});
          mounted.set(item.key,{id,geojson:item.geojson,color:item.color});
          if(item.color)app.applyLayerColor(id,item.color);
        }else if(previous.color!==item.color){app.applyLayerColor(id,item.color);previous.color=item.color;}
      }
    }catch(error){feedback(`Não foi possível sincronizar a bancada: ${error.message}`);}
  }
  function connect(){
    clearTimeout(timer);ready=false;mounted.clear();let attempts=0;
    const check=()=>{
      const win=context();
      if(win?.gpArquivos&&win.gpApp?.state.map?.isStyleLoaded()){ready=true;sync();return;}
      if(++attempts<300)timer=setTimeout(check,100);
      else feedback('A bancada não terminou de carregar. Recarregue a página para tentar novamente.');
    };check();
  }
  frame.addEventListener('load',connect);connect();
  function assertReady(){
    if(!ready)throw new Error('Aguarde o carregamento da bancada.');
    if(editing())throw new Error('Salve ou cancele a edição na bancada. Para analisar uma nova versão salva, selecione esse arquivo na configuração.');
  }
  return {sync,assertReady};
}
