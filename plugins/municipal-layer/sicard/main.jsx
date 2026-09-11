import React, {useMemo, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {MunicipalLayerBuilder} from '../src/index.js';
import './style.css';

export function abrirMunicipal({category,apiBase,onGenerated}) {
  const dialog=document.createElement('dialog');dialog.className='ea-municipal-dialog';
  const host=document.createElement('div');dialog.append(host);document.body.append(dialog);
  const root=createRoot(host);let working=false;
  const close=()=>{if(working)return;root.unmount();dialog.close();dialog.remove();};
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
  function App(){
    const [busy,setBusy]=useState(false);
    const client=useMemo(()=>{
      let generated;
      async function request(path,config,signal){
        let response;
        try{
          response=await fetch(`${apiBase}/extracao-atributos/municipal/${encodeURIComponent(category.id)}/${path}`,{
            ...(config?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(config)}:{}),signal});
        }catch(falha){
          if(falha.name==='AbortError')throw falha;
          // Conexao caiu no meio: quase sempre o servidor ficou sem memoria.
          throw new Error('A conexão com o servidor caiu durante a geração. Isso costuma ser falta de memória para o tamanho da seleção: tente menos atributos.');
        }
        if(!response.ok){
          const error=await response.json().catch(()=>({}));
          if(response.status===502||response.status===503||response.status===504)
            throw new Error(`O servidor não respondeu à geração (HTTP ${response.status}). Se a seleção for grande, tente menos atributos.`);
          throw new Error(typeof error.detail==='string'?error.detail:'Falha no gerador municipal.');
        }
        if(path==='export'){
          generated={arquivo:response.headers.get('X-Camada-Arquivo'),id:response.headers.get('X-Camada-Id')};
          return response.blob();
        }
        return response.json();
      }
      return {catalog:signal=>request('catalog',null,signal),preview:(config,signal)=>request('preview',config,signal),
        export:async config=>{working=true;setBusy(true);try{return await request('export',{...config,nome:config.nome||''});}catch(error){working=false;setBusy(false);throw error;}},
        generated:()=>generated};
    },[]);
    async function saved(){
      try{await onGenerated(client.generated());working=false;close();}
      finally{working=false;setBusy(false);}
    }
    return <>
      <header className="ea-municipal-header"><div><h2>Camada municipal · {category.nome}</h2><p>{category.conceito}</p></div><button type="button" aria-label="Fechar gerador municipal" disabled={busy} onClick={close}>×</button></header>
      <p className="ea-municipal-help">Escolha os atributos que representam esta categoria. Ao gerar, a camada será salva no acervo e adicionada às bases da análise.</p>
      <MunicipalLayerBuilder client={client} download={false} onExport={saved} categoriaNome={category.nome}/>
    </>;
  }
  dialog.showModal();root.render(<App/>);
}
