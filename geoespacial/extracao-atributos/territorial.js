import {json} from './api.js';
import {numero} from './ui.js';
import {clone,valor,opcoes,definicoes,texto} from './resultados-dom.js';
import {desenharMapa} from './resultados-mapa.js';
const ESTADOS={com:'Com interseção',sem:'Sem interseção registrada',nao_avaliado:'Categoria não avaliada',nao_informado:'Informação insuficiente'};
const ROTULOS={risco:'Risco',restricao:'Restrição'};
export function criarTerritorial(result){
  const initial=()=>({entrada:'',feicao:'',categoria:'',base:'',situacao:'',busca:'',pagina:0});
  let state=initial(),host,controller,version=0,map;
  const q=selector=>host.querySelector(selector), role=name=>q(`[data-role="${name}"]`);
  const change=values=>{Object.assign(state,{pagina:0},values);load();};
  function dispose(){version++;controller?.abort();map?.destroy();map=null;host=null;}
  function draw(data){
    const all=(name,items)=>[{id:'',nome:name},...items];
    opcoes(q('[data-filter="entrada"]'),all('Todas as entradas',data.entradas.map(e=>({id:e.nome,nome:e.nome}))),state.entrada);
    opcoes(q('[data-filter="feicao"]'),all('Todas as feições',data.feicoes_opcoes),state.feicao);
    opcoes(q('[data-filter="base"]'),all('Todas as bases',data.bases.filter(b=>!state.categoria||b.categoria===state.categoria).map(b=>({id:b.id,nome:`${ROTULOS[b.categoria]} · ${b.nome}`}))),state.base);
    for(const control of host.querySelectorAll('[data-filter]'))control.value=state[control.dataset.filter];
    for(const node of host.querySelectorAll('[data-kpi]'))node.textContent=numero(data.resumo[node.dataset.kpi],0);
    role('legacy').hidden=!data.legado;role('incomplete').hidden=!data.grafico.some(g=>!g.completa);
    role('method').textContent=data.legado?'Interseções registradas na saída histórica; ligações por atributo não são tratadas como interseção espacial.':'Interseção geométrica da entrada com os polígonos originais das bases; inclui contato na borda, sem buffers ou recorte. Não representa gravidade ou impedimento.';
    role('summary').replaceChildren();
    for(const entry of data.resumo_entradas){
      const row=clone('ea-tpl-input-summary');valor(row,'nome',entry.nome);valor(row,'total',entry.total);
      for(const tipo of ['risco','restricao']){
        const counts=entry[tipo];valor(row,tipo,`${counts.com} com · ${counts.sem} sem${counts.nao_avaliado?` · ${counts.nao_avaliado} não avaliadas`:""}${counts.nao_informado?` · ${counts.nao_informado} não informadas`:""}`);
      }
      row.querySelector('button').onclick=()=>change({entrada:entry.nome,feicao:''});role('summary').append(row);
    }
    role('chart').replaceChildren();role('chart-empty').hidden=!!data.grafico.length;
    const maximum=Math.max(1,...data.grafico.map(g=>g.feicoes));
    for(const entry of data.grafico){
      const bar=clone('ea-tpl-chart-bar');bar.querySelector('.ea-chart-label').textContent=`${ROTULOS[entry.categoria]} · ${entry.nome}`;
      bar.querySelector('.ea-chart-fill').style.width=`${100*entry.feicoes/maximum}%`;bar.querySelector('strong').textContent=numero(entry.feicoes,0);
      bar.disabled=entry.feicoes===null;bar.title=entry.completa?'Contagem das feições no recorte':'Contagem parcial: há feições sem informação suficiente';bar.onclick=()=>change({categoria:entry.categoria,base:entry.id,situacao:'com'});role('chart').append(bar);
    }
    role('layers').replaceChildren();
    const byLayer=new Map();for(const item of data.linhas){if(!byLayer.has(item.entrada))byLayer.set(item.entrada,[]);byLayer.get(item.entrada).push(item);}
    const values=new Map(),features=[];
    function select(key){
      const item=values.get(key);if(!item)return;
      role('selection-title').textContent=item.rotulo;definicoes(role('selection-attributes'),item.atributos);map?.focus(key);
      host.querySelectorAll('[data-feature-key]').forEach(row=>row.classList.toggle('is-selected',row.dataset.featureKey===key));
    }
    for(const area of Object.values(data.areas)){
      const key=`area:${area.id}`,label=`${area.base} · feição de origem ${area.fid}`;
      values.set(key,{rotulo:label,atributos:area.atributos});
      if(area.geometria&&(!state.categoria||area.categoria===state.categoria))features.push({type:'Feature',geometry:area.geometria,properties:{chave:key,rotulo:label,papel:'area',categoria:area.categoria}});
    }
    for(const [name,items] of byLayer){
      const section=clone('ea-tpl-input-layer');valor(section,'nome',name);valor(section,'scope',`${items.length} feições nesta página. Identificadores e áreas conforme a fonte.`);
      for(const tipo of ['risco','restricao']){
        const block=section.querySelector(`[data-territorial-category="${tipo}"]`);block.hidden=!!state.categoria&&state.categoria!==tipo;
        for(const item of items){
          const row=clone('ea-tpl-territorial-row');row.dataset.featureKey=item.chave;
          valor(row,'feicao',item.identificador??`Feição ${item.fid}`);valor(row,'fid',`${data.legado?"Posição na análise":"Posição original"}: ${item.fid}`);valor(row,'estado',ESTADOS[item.estados[tipo]]);
          row.querySelector('button').onclick=()=>select(item.chave);definicoes(row.querySelector('[data-feature-attributes]'),Object.fromEntries(Object.entries(item.atributos).slice(0,2)));
          const list=row.querySelector('ul'),known=new Set();
          for(const aid of item.areas){
            const area=data.areas[aid];if(area.categoria!==tipo)continue;known.add(area.base_id);
            const li=clone('ea-tpl-area');valor(li,'titulo',`${area.base} · feição ${area.fid}`);
            li.querySelector('button').onclick=()=>select(`area:${aid}`);definicoes(li.querySelector('[data-area-summary]'),Object.fromEntries(Object.entries(area.atributos).slice(0,3)));definicoes(li.querySelector('[data-area-details]'),area.atributos);li.querySelector('details').hidden=Object.keys(area.atributos).length<=3;list.append(li);
          }
          for(const bid of item.bases_intersectadas){
            const base=data.bases.find(b=>b.id===bid);if(!base||base.categoria!==tipo)continue;
            if(!known.has(bid)||data.legado){const li=clone('ea-tpl-base-only');valor(li,'base',base.nome);
              if(known.has(bid))li.querySelector('span').textContent=' · identificação histórica pode estar incompleta';list.append(li);}
          }
          if(!list.children.length){const li=clone('ea-tpl-list-item');li.textContent=ESTADOS[item.estados[tipo]];list.append(li);}
          block.querySelector('tbody').append(row);
        }
      }
      role('layers').append(section);
    }
    for(const item of data.linhas){
      const label=`${item.entrada} · ${item.identificador??item.fid}`;
      values.set(item.chave,{rotulo:label,atributos:item.atributos});
      if(item.geometria)features.push({type:'Feature',geometry:item.geometria,properties:{chave:item.chave,rotulo:label,papel:'entrada'}});
    }
    for(const feature of data.mapa_saida?.features||[])features.push({...feature,properties:{...feature.properties,papel:'entrada',rotulo:values.get(feature.properties.chave)?.rotulo}});
    map?.destroy();map=desenharMapa(role('map'),features,select);
    role('selection-title').textContent='Selecione uma feição ou área';definicoes(role('selection-attributes'),{});
    role('empty').hidden=!!data.linhas.length;
    role('pagination').textContent=`Página ${data.paginas?data.pagina+1:0} de ${data.paginas} · ${data.total} feições no recorte`;
    q('[data-action="previous"]').disabled=data.pagina===0;q('[data-action="next"]').disabled=data.pagina+1>=data.paginas;
    const approximate=data.linhas.some(i=>i.representacao_mapa!=='original')||Object.values(data.areas).some(a=>a.representacao_mapa&&a.representacao_mapa!=='original')||data.representacao_saida?.metodo&&data.representacao_saida.metodo!=='original';
    role('map-scope').textContent=`Mapa: feições e áreas da página atual. ${data.legado?'As geometrias exibidas são da saída histórica, que pode estar recortada. ':''}${approximate?'Prévia aproximada; a análise usa geometrias integrais. ':''}${data.mapa_saida_limitado?'Exibidas até 200 geometrias de saída nesta página.':''}`;
  }
  async function load(){
    if(!host)return;const current=++version,target=host;controller?.abort();controller=new AbortController();
    target.setAttribute('aria-busy','true');role('loading').hidden=false;role('error').hidden=true;role('body').hidden=true;
    try{
      const data=await json(`/extracao-atributos/execucoes/${encodeURIComponent(result.id)}/intersecoes`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(state),signal:AbortSignal.any([controller.signal,AbortSignal.timeout(180000)])});
      if(current!==version||host!==target)return;
      state.pagina=data.pagina;role('body').hidden=false;draw(data);
    }catch(error){if(current!==version||host!==target)return;role('error').hidden=false;role('error').querySelector('p').textContent=error.message;}
    finally{if(current===version&&host===target){role('loading').hidden=true;target.removeAttribute('aria-busy');}}
  }
  return {dispose,mount(target){dispose();host=target;
    for(const control of host.querySelectorAll('[data-filter]'))control.onchange=()=>{
      const key=control.dataset.filter,extra=key==='entrada'?{feicao:''}:key==='categoria'?{base:''}:{};change({...extra,[key]:control.value});
    };
    q('[data-filter="busca"]').onkeydown=e=>{if(e.key==='Enter')e.target.blur();};
    q('[data-action="reset"]').onclick=()=>{state=initial();load();};q('[data-action="retry"]').onclick=load;
    q('[data-action="previous"]').onclick=()=>change({pagina:state.pagina-1});q('[data-action="next"]').onclick=()=>change({pagina:state.pagina+1});load();
  }};
}
