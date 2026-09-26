import React, {useEffect,useMemo,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {MunicipalLayerBuilder} from '../src/index.js';
import './style.css';

// Mapa da camada salva: todas as feições com a geometria do arquivo gerado.
// smoothFactor 0 impede o Leaflet de simplificar os contornos ao desenhar.
function MapaCamada({url,htmlHost}){
  const host=useRef(null);
  const [estado,setEstado]=useState('Carregando a camada no mapa…');
  useEffect(()=>{
    const L=window.L;
    if(!L){setEstado('Biblioteca de mapa indisponível nesta página.');return;}
    const map=L.map(htmlHost?.querySelector('[data-mlb="map"]') || host.current,{scrollWheelZoom:false});
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap contributors',maxZoom:19}).addTo(map);
    map.setView([-22.3,-48.6],6);
    const ctrl=new AbortController();
    setEstado('Carregando a camada no mapa…');
    fetch(url,{credentials:'same-origin',signal:ctrl.signal}).then(async response=>{
      if(!response.ok)throw new Error(`Não foi possível carregar a camada no mapa (HTTP ${response.status}).`);
      return response.json();
    }).then(data=>{
      const camada=L.geoJSON(data,{
        style:{color:'#176b95',weight:1,fillColor:'#4f97bf',fillOpacity:.25},
        smoothFactor:0,
        onEachFeature:(feature,layer)=>{
          const p=feature.properties||{};
          layer.bindTooltip(p.NM_MUN?`${p.NM_MUN} (${p.CD_MUN})`:String(p.CD_MUN??''),{sticky:true});
          layer.on('click',()=>{
            const tabela=document.createElement('table');tabela.className='territorial-mapa-popup';
            for(const [campo,valor] of Object.entries(p)){
              const linha=tabela.insertRow();linha.insertCell().textContent=campo;
              linha.insertCell().textContent=valor==null?'Sem valor':typeof valor==='number'?valor.toLocaleString('pt-BR',{maximumFractionDigits:8}):String(valor);
            }
            layer.bindPopup(tabela,{maxWidth:420,maxHeight:320}).openPopup();
          });
        },
      }).addTo(map);
      if(camada.getBounds().isValid())map.fitBounds(camada.getBounds(),{padding:[16,16]});
      setEstado(`${(data.features||[]).length.toLocaleString('pt-BR')} feições exibidas com a geometria original da camada salva. Clique em um município para ver seus atributos.`);
    }).catch(error=>{if(error.name!=='AbortError')setEstado(error.message);});
    const timer=setTimeout(()=>map.invalidateSize(),0);
    return ()=>{ctrl.abort();clearTimeout(timer);map.remove();};
  },[url]);
  useEffect(()=>{if(htmlHost)htmlHost.querySelector('[data-mlb="map-status"]').textContent=estado;},[htmlHost,estado]);
  if(htmlHost)return null;
  return <><div ref={host} className="territorial-mapa" role="region" aria-label="Mapa da camada gerada"/><p className="territorial-mapa-status" role="status">{estado}</p></>;
}

function CamadaGerada({gerada,htmlHost}){
  const ref=useRef(null);
  useEffect(()=>{ref.current?.scrollIntoView({behavior:'smooth',block:'start'});},[gerada]);
  useEffect(()=>{
    if(!htmlHost)return;
    const result=htmlHost.querySelector('#territorial-result');
    const mapSection=htmlHost.querySelector('[data-mlb="map-section"]');
    result.hidden=false;mapSection.hidden=false;
    htmlHost.querySelector('[data-mlb="results"]').hidden=false;
    htmlHost.querySelector('[data-mlb="result-name"]').textContent=gerada.nome;
    htmlHost.querySelector('[data-mlb="result-category"]').textContent=gerada.categoria;
    const link=htmlHost.querySelector('#territorial-download');link.href=gerada.download.href;link.download=gerada.download.filename;
    htmlHost.querySelector('#territorial-use').href=gerada.usar;
    result.scrollIntoView({behavior:'smooth',block:'start'});
    return ()=>{result.hidden=true;mapSection.hidden=true;};
  },[htmlHost,gerada]);
  if(htmlHost)return <MapaCamada url={gerada.geojson} htmlHost={htmlHost}/>;
  return <>
    <section ref={ref} id="territorial-result" className="mlb-bloco territorial-result" aria-label="Camada gerada">
      <h3>Camada gerada e salva</h3>
      <p><strong>{gerada.nome}</strong> · Categoria: <span>{gerada.categoria}</span></p>
      <p>O arquivo está disponível no acervo. Você pode baixá-lo ou incluí-lo na extração.</p>
      <div className="ea-config-tools"><a id="territorial-download" className="ea-btn" href={gerada.download.href} download={gerada.download.filename}>Baixar camada (.zip)</a><a id="territorial-use" className="ea-btn ea-btn-primary" href={gerada.usar}>Usar na extração</a></div>
    </section>
    <section className="mlb-bloco territorial-mapa-bloco" aria-label="Mapa da camada gerada">
      <h3>Mapa da camada gerada</h3>
      <MapaCamada url={gerada.geojson}/>
    </section>
  </>;
}

// O hospedeiro fornece a página; o plugin não cria janelas nem navegação.
// onGenerated devolve {nome, categoria, download:{href,filename}, usar, geojson} para o painel Resultados.
export function montarMunicipal(host,{category,apiBase,onGenerated,onBusyChange=()=>{},configuration,onChange=()=>{}}) {
  const htmlHost=host.querySelector('[data-mlb="source"]')?host:null;
  // O React conserva o estado; a árvore persistente pertence ao template Jinja.
  const root=createRoot(htmlHost?document.createDocumentFragment():host);
  function App({category}){
    const categoryRef=useRef(category);categoryRef.current=category;
    const [selection,setSelection]=useState(configuration||{attributes:[],format:"fgb"});
    const [gerada,setGerada]=useState(null);
    const client=useMemo(()=>{
      let generated;
      async function request(path,config,signal){
        let response;
        try{
          response=await fetch(`${apiBase}/extracao-atributos/municipal/${['catalog','preview'].includes(path)?'':`${encodeURIComponent(categoryRef.current.id)}/`}${path}`,{
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
          if(!categoryRef.current)throw new Error('Selecione a categoria da camada antes de gerar.');
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
      try{const resultado=await onGenerated(client.generated(),output);if(resultado)setGerada(resultado);}
      finally{onBusyChange(false);}
    }
    return <MunicipalLayerBuilder htmlHost={htmlHost} value={selection} onChange={next=>{setSelection(next);onChange(next);}} client={client} download={false} onExport={saved} categoriaNome={category?.nome||''} canGenerate={!!category} feedback={window.SLTFeedback} resultado={gerada && <CamadaGerada gerada={gerada} htmlHost={htmlHost}/>}/>;
  }
  root.render(<App category={category}/>);
  const dispose=()=>{
    root.unmount();
    if(!htmlHost)return;
    for(const node of htmlHost.querySelectorAll('input,select,button'))node.disabled=true;
    for(const key of ['attributes','basket','facets','preview-body','glossary-body']){
      const node=htmlHost.querySelector(`[data-mlb="${key}"]`);node.replaceChildren();delete node.dataset.content;
    }
    for(const key of ['results','retry','error'])htmlHost.querySelector(`[data-mlb="${key}"]`).hidden=true;
    htmlHost.querySelector('[data-mlb="loading"]').hidden=false;
  };
  dispose.setCategory=category=>root.render(<App category={category}/>);
  return dispose;
}
