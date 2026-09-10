import {base,post,json} from './api.js';
import {feedback} from './ui.js';

let bundle;
export async function abrirGeradorMunicipal(category,onGenerated){
  try{
    if(!document.getElementById('municipal-plugin-style')){
      const style=document.createElement('link');style.id='municipal-plugin-style';style.rel='stylesheet';
      style.href=new URL('./municipal-plugin/municipal-plugin.css',import.meta.url).href;document.head.append(style);
    }
    bundle??=import('./municipal-plugin/municipal-plugin.js');
    const {abrirMunicipal}=await bundle;
    abrirMunicipal({category,apiBase:base,onGenerated:async result=>{
      if(!result?.arquivo)throw new Error('O gerador não retornou o arquivo salvo.');
      const [layer,catalog]=await Promise.all([post('/extracao-atributos/arquivo-mapa',{arquivo:result.arquivo}),json('/extracao-atributos/catalogo')]);
      onGenerated(layer,catalog);
      feedback(`Camada municipal salva e adicionada à categoria ${category.nome}.`);
    }});
  }catch(error){bundle=null;feedback(`Não foi possível abrir o gerador: ${error.message}`);}
}
