import {numero} from './ui.js';
import {json} from './api.js';
import {clone,valor,opcoes,definicoes,cabecalhos,linhas,texto} from './resultados-dom.js';
import {desenharMapa} from './resultados-mapa.js';

export function criarDashboard(result){
  const initial=()=>({camada:result.modo==='enriquecimento'?Object.keys(result.camadas||{})[0]||'':'resultado',categoria:'',base:'',origem:'',campo:'',valor:'',busca:'',ordem:'origem',descendente:false,pagina:0});
  let state=initial(),host,map,controller,version=0;
  const q=selector=>host.querySelector(selector),role=name=>q(`[data-role="${name}"]`);
  const change=values=>{Object.assign(state,{pagina:0},values);load();};
  function dispose(){version++;controller?.abort();map?.destroy();map=null;host=null;}
  function draw(data){
    const all=(label,items)=>[{id:'',nome:label},...items];
    const options={camada:(result.modo==='enriquecimento'?Object.keys(result.camadas||{}):['resultado']).map(id=>({id,nome:id})),
      categoria:all('Todas as categorias',data.categorias.map(c=>({id:c.nome,nome:c.nome}))),
      base:all('Todas as bases',data.bases.map(id=>({id,nome:id}))),origem:all('Todas as feições',data.origens),
      campo:data.campos.map(d=>({id:d.campo,nome:`${d.apelido||d.campo}${d.base?' · '+d.base:''}`}))};
    for(const [key,items] of Object.entries(options))opcoes(q(`[data-filter="${key}"]`),items,state[key]);
    q('[data-filter="busca"]').value=state.busca;q('[data-filter="ordem"]').value=state.ordem;
    q('[data-action="clear-value"]').hidden=!state.valor;q('[data-action="sort"]').textContent=state.descendente?'Ordem decrescente ↓':'Ordem crescente ↑';
    for(const node of host.querySelectorAll('[data-kpi]'))node.textContent=numero(data.resumo[node.dataset.kpi],0);
    role('field-source').textContent=data.fonte_campo?`${data.fonte_campo.apelido||data.campo} · Fonte: ${data.fonte_campo.base||'Entrada'} · Regra: ${data.fonte_campo.regra||'Valor registrado na saída'}`:'Campo não informado';
    role('coverage-title').textContent=state.categoria?'Correspondências por base':'Correspondências por categoria';
    role('coverage').replaceChildren();role('coverage-empty').hidden=!!data.cobertura.length;
    for(const c of (state.categoria?data.cobertura:data.cobertura_categorias)){
      const bar=clone('ea-tpl-coverage');valor(bar,'label',c.base?`${c.categoria} · ${c.base}`:c.categoria);
      for(const key of ['com','sem','nao_informado'])bar.querySelector(`.ea-coverage-${key}`).style.width=`${c.total?100*c[key]/c.total:0}%`;
      bar.querySelector('small').textContent=`${c.com} com · ${c.sem} sem · ${c.nao_informado} não informado / ${c.total} ${c.identidade_disponivel?'feições':'registros'}`;
      bar.onclick=()=>change({categoria:c.categoria,base:c.base||'',campo:'',valor:''});role('coverage').append(bar);
    }
    const numeric=!!data.estatisticas;
    role('distribution-title').textContent=numeric?'Distribuição dos valores numéricos':'Frequência dos valores';
    role('frequency').replaceChildren();role('histogram').replaceChildren();role('histogram').hidden=!numeric;role('statistics').hidden=!numeric;
    role('distribution-empty').hidden=!!data.resumo.preenchidos;
    if(numeric){
      const max=Math.max(1,...data.histograma.map(b=>b.n));
      for(const bin of data.histograma){const col=clone('ea-tpl-histogram');col.querySelector('strong').textContent=numero(bin.n,0);
        col.querySelector('.ea-histogram-mark').style.height=`${100*bin.n/max}%`;col.querySelector('small').textContent=`${numero(bin.de,3)} – ${numero(bin.ate,3)}`;
        col.title=`${numero(bin.de,4)} a ${numero(bin.ate,4)} (${bin.ultimo?'inclusive':'limite superior exclusivo'}): ${bin.n} registros`;role('histogram').append(col);}
      for(const node of host.querySelectorAll('[data-stat]'))node.textContent=numero(data.estatisticas[node.dataset.stat],4);
      role('distribution-note').textContent=`${data.estatisticas.n} valores numéricos · ${data.resumo.ausentes} ausentes.`;
    }else{
      const max=Math.max(1,...data.distribuicao.map(d=>d.n));
      for(const item of data.distribuicao){const bar=clone('ea-tpl-chart-bar');bar.querySelector('.ea-chart-label').textContent=texto(item.valor);
        bar.querySelector('.ea-chart-fill').style.width=`${100*item.n/max}%`;bar.querySelector('strong').textContent=numero(item.n,0);
        bar.setAttribute('aria-label',`${texto(item.valor)}: ${item.n} registros. Filtrar por este valor.`);bar.onclick=()=>change({valor:item.chave});role('frequency').append(bar);}
      role('distribution-note').textContent=`${data.resumo.distintos} valores distintos · ${data.resumo.ausentes} ausentes.${data.outros?` ${data.outros} registros nos valores além dos 20 mais frequentes; use a busca.`:' Selecione uma barra para filtrar.'}`;
    }
    const rows=new Map(data.linhas.map(r=>[String(r.posicao),r]));
    function select(key){const row=rows.get(key);if(!row)return;role('selection-title').textContent=row.origem;definicoes(role('selection-attributes'),row.atributos);map?.focus(key);
      role('rows').querySelectorAll('tr').forEach((tr,i)=>tr.classList.toggle('is-selected',String(data.linhas[i].posicao)===key));}
    map?.destroy();map=desenharMapa(role('map'),data.mapa.features.map(f=>({...f,properties:{...f.properties,chave:String(f.properties.posicao),rotulo:rows.get(String(f.properties.posicao))?.origem}})),select);
    role('selection-title').textContent='Selecione um registro';definicoes(role('selection-attributes'),{});
    role('map-scope').textContent=`Mapa: ${data.mapa.features.length} geometrias desta página. Gráficos: ${data.resumo.registros} registros do recorte.${data.representacao_mapa.metodo!=='original'?' Representação visual aproximada.':''}`;
    cabecalhos(role('columns'),['Feição de entrada','Registro',data.fonte_campo?.apelido||data.campo||'Valor',...data.cobertura.map(c=>`${c.categoria} · ${c.base}`),'Detalhar']);
    linhas(role('rows'),data.linhas.map(r=>[r.origem,r.registro,r.valor,...r.bases.map(b=>b.corresponde==null?'Não informado':b.corresponde?'Com correspondência':'Sem correspondência')]),i=>select(String(data.linhas[i].posicao)));
    role('empty').hidden=!!data.linhas.length;role('pagination').textContent=`${data.paginas?data.pagina+1:0} / ${data.paginas} · ${data.resumo.registros} registros`;
    q('[data-action="previous"]').disabled=data.pagina===0;q('[data-action="next"]').disabled=data.pagina+1>=data.paginas;
    definicoes(role('concepts'),Object.fromEntries(data.categorias.filter(c=>!state.categoria||c.nome===state.categoria).map(c=>[c.nome,c.conceito||'Conceito não registrado'])));
    role('source').textContent=`${data.conceito_origem} · Execução: ${data.execucao} · Camada: ${data.camada}`;
  }
  async function load(){
    if(!host)return;const current=++version,target=host;controller?.abort();controller=new AbortController();
    target.setAttribute('aria-busy','true');role('loading').hidden=false;role('error').hidden=true;role('body').hidden=true;
    try{const data=await json(`/extracao-atributos/execucoes/${encodeURIComponent(result.id)}/dashboard`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(state),signal:AbortSignal.any([controller.signal,AbortSignal.timeout(180000)])});
      if(current!==version||target!==host)return;state.campo=data.campo;state.pagina=data.pagina;role('body').hidden=false;draw(data);
    }catch(error){if(current!==version||target!==host)return;role('error').hidden=false;role('error').querySelector('p').textContent=error.message;}
    finally{if(current===version&&target===host){role('loading').hidden=true;target.removeAttribute('aria-busy');}}
  }
  return {dispose,mount(target){dispose();host=target;
    for(const control of host.querySelectorAll('[data-filter]'))control.onchange=()=>{const key=control.dataset.filter;
      if(key==='camada'){state={...initial(),camada:control.value};load();return;}
      change({...(key==='categoria'?{base:'',campo:'',valor:''}:key==='base'?{campo:'',valor:''}:key==='campo'?{valor:''}:{}),[key]:control.value});};
    q('[data-filter="busca"]').onkeydown=e=>{if(e.key==='Enter')e.target.blur();};
    q('[data-action="reset"]').onclick=()=>{state=initial();load();};q('[data-action="clear-value"]').onclick=()=>change({valor:''});q('[data-action="retry"]').onclick=load;
    q('[data-action="sort"]').onclick=()=>change({descendente:!state.descendente});q('[data-action="previous"]').onclick=()=>change({pagina:state.pagina-1});q('[data-action="next"]').onclick=()=>change({pagina:state.pagina+1});load();
  }};
}
