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
    // Vazio significa nome automático: categoria, fonte majoritária e data.
    const [name,setName]=useState('');
    const [busy,setBusy]=useState(false);
    const client=useMemo(()=>{
      let generated;
      async function request(path,config,signal){
        const response=await fetch(`${apiBase}/extracao-atributos/municipal/${encodeURIComponent(category.id)}/${path}`,{
          ...(config?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(config)}:{}),signal});
        if(!response.ok){const error=await response.json().catch(()=>({}));throw new Error(typeof error.detail==='string'?error.detail:'Falha no gerador municipal.');}
        if(path==='export'){
          generated={arquivo:response.headers.get('X-Camada-Arquivo'),id:response.headers.get('X-Camada-Id')};
          return response.blob();
        }
        return response.json();
      }
      return {catalog:signal=>request('catalog',null,signal),preview:(config,signal)=>request('preview',config,signal),
        export:async config=>{working=true;setBusy(true);try{return await request('export',{...config,nome:host.querySelector('[name="municipal-name"]').value});}catch(error){working=false;setBusy(false);throw error;}},
        generated:()=>generated};
    },[]);
    async function saved(){
      try{await onGenerated(client.generated());working=false;close();}
      finally{working=false;setBusy(false);}
    }
    return <>
      <header className="ea-municipal-header"><div><h2>Camada municipal · {category.nome}</h2><p>{category.conceito}</p></div><button type="button" aria-label="Fechar gerador municipal" disabled={busy} onClick={close}>×</button></header>
      <label className="ea-municipal-name">Nome da camada<input name="municipal-name" value={name} disabled={busy} maxLength={200} placeholder={`${category.nome} — fonte majoritária da seleção — data da geração`} onChange={event=>setName(event.target.value)}/></label>
      <p className="ea-municipal-help">Escolha os atributos que representam esta categoria. Ao gerar, a camada será salva no acervo e adicionada às bases da análise.</p>
      <MunicipalLayerBuilder client={client} download={false} onExport={saved}/>
    </>;
  }
  dialog.showModal();root.render(<App/>);
}
