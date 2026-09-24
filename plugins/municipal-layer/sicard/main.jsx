import React, {useMemo,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {MunicipalLayerBuilder} from '../src/index.js';
import './style.css';

// O hospedeiro fornece a página; o plugin não cria janelas nem navegação.
export function montarMunicipal(host,{category,apiBase,onGenerated,onBusyChange=()=>{},configuration,onChange=()=>{}}) {
  const root=createRoot(host);
  function App(){
    const [selection,setSelection]=useState(configuration||{attributes:[],format:"fgb"});
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
        if(path==='export'||path.endsWith('/pacote')){
          generated={arquivo:response.headers.get('X-Camada-Arquivo'),id:response.headers.get('X-Camada-Id')};
          return response.blob();
        }
        return response.json();
      }
      return {catalog:signal=>request('catalog',null,signal),preview:(config,signal)=>request('preview',config,signal),
        export:async(config,signal,proc)=>{
          onBusyChange(true);
          try{
            let job=await request('jobs',{...config,nome:config.nome||''});
            const path=`jobs/${job.id}`;
            const cancelar=async()=>{
              await request(`${path}/cancelar`,{});
              let atual=job;
              while(atual.status==='executando'){
                await new Promise(resolve=>setTimeout(resolve,500));atual=await request(path);proc?.acompanhar(atual);
              }
              if(atual.status!=='cancelado')throw new Error(atual.erro||'A gravação já terminou. Consulte o acervo.');
            };
            while(job.status==='executando'){
              proc?.acompanhar(job);proc?.definirCancelamento(job.cancelavel?cancelar:null,'A gravação final já começou. Aguarde sua conclusão.');
              await new Promise(resolve=>setTimeout(resolve,500));job=await request(path);
            }
            proc?.acompanhar(job);
            if(job.status==='cancelado'){const e=new Error('Geração cancelada. Sua seleção foi mantida.');e.name='AbortError';throw e;}
            if(job.status!=='concluido')throw new Error(job.erro||'Não foi possível gerar a camada.');
            return await request(`${path}/pacote`);
          }catch(error){onBusyChange(false);throw error;}
        },
        generated:()=>generated};
    },[]);
    async function saved(output){
      try{await onGenerated(client.generated(),output);}
      finally{onBusyChange(false);}
    }
    return <MunicipalLayerBuilder value={selection} onChange={next=>{setSelection(next);onChange(next);}} client={client} download={false} onExport={saved} categoriaNome={category.nome} feedback={window.SLTFeedback}/>;
  }
  root.render(<App/>);
  return ()=>root.unmount();
}
