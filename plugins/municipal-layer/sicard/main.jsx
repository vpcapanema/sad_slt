import React, {useMemo} from 'react';
import {createRoot} from 'react-dom/client';
import {MunicipalLayerBuilder} from '../src/index.js';
import './style.css';

// O hospedeiro fornece a página; o plugin não cria janelas nem navegação.
export function montarMunicipal(host,{category,apiBase,onGenerated,onBusyChange=()=>{}}) {
  const root=createRoot(host);
  function App(){
    const client=useMemo(()=>{
      let generated;
      async function request(path,config,signal){
        let response;
        try{
          response=await fetch(`${apiBase}/extracao-atributos/municipal/${encodeURIComponent(category.id)}/${path}`,{
            credentials:'same-origin',...(config?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(config)}:{}),signal});
        }catch(error){
          if(error.name==='AbortError')throw error;
          throw new Error('A conexão com o servidor foi interrompida. Confira sua rede e tente novamente.');
        }
        if(!response.ok){
          const error=await response.json().catch(()=>({}));
          if(response.status===401)throw new Error('Sua sessão expirou. Entre novamente para continuar.');
          throw new Error(typeof error.detail==='string'?error.detail:`Não foi possível concluir a operação (HTTP ${response.status}).`);
        }
        if(path==='export'){
          generated={arquivo:response.headers.get('X-Camada-Arquivo'),id:response.headers.get('X-Camada-Id')};
          return response.blob();
        }
        return response.json();
      }
      return {catalog:signal=>request('catalog',null,signal),preview:(config,signal)=>request('preview',config,signal),
        export:async config=>{onBusyChange(true);try{return await request('export',{...config,nome:config.nome||''});}catch(error){onBusyChange(false);throw error;}},
        generated:()=>generated};
    },[]);
    async function saved(output){
      try{await onGenerated(client.generated(),output);}
      finally{onBusyChange(false);}
    }
    return <MunicipalLayerBuilder client={client} download={false} onExport={saved} categoriaNome={category.nome}/>;
  }
  root.render(<App/>);
  return ()=>root.unmount();
}
