import {json,base as apiBase} from './api.js';
import {numero} from './ui.js';
import {clone,valor,opcoes,definicoes,texto} from './resultados-dom.js';
import {desenharMapa} from './resultados-mapa.js';
const n=v=>v==null?'—':Number(v).toLocaleString('pt-BR',{maximumFractionDigits:2});
const labelValue=v=>v==null?'Sem valor':typeof v==='object'?JSON.stringify(v):String(v);
function metric(m){
 if(!m)return 'Métrica não registrada';
 const parts=[];
 if(m.pontos!=null)parts.push(`${n(m.pontos)} ponto(s)`);
 if(m.comprimento_m!=null)parts.push(`${n(m.comprimento_m)} m / ${n(m.comprimento_m/1000)} km`);
 if(m.area_m2!=null)parts.push(`${n(m.area_m2)} m² / ${n(m.area_m2/10000)} ha`);
 if(m.perimetro_m!=null)parts.push(`Perímetro: ${n(m.perimetro_m)} m`);
 if(m.percentual_entrada!=null)parts.push(`${n(m.percentual_entrada)}% da demanda`);
 return parts.join(' · ')||m.situacao||'Correspondência registrada';
}
export function criarTerritorial(result){
 const initial=()=>({entrada:'',feicao:'',categoria:'',atributo:'',busca:'',pagina:0});
 let state=initial(),host,controller,version=0,map,data,selectedKey=null,selectedArea=null,chartMetric='espacial';
 const q=s=>host.querySelector(s),role=k=>q(`[data-role="${k}"]`);
 function dispose(){version++;controller?.abort();map?.destroy();map=null;host=null;}
 function change(values){Object.assign(state,{pagina:0},values);selectedArea=null;load();}
 function selectDemand(key,tipo){
  if(tipo!==undefined){state.categoria=tipo;state.atributo='';}
  selectedKey=key;selectedArea=null;
  if(!data.linhas.some(i=>i.chave===key)){change({feicao:key});return;}
  draw();
 }
 function filters(){
  opcoes(q('[data-filter="entrada"]'),[{id:'',nome:'Unificado · todas as demandas'},...data.entradas.map(e=>({id:e.nome,nome:e.nome}))],state.entrada);
  opcoes(q('[data-filter="categoria"]'),[{id:'',nome:'Todas as categorias'},...(data.categorias||[]).map(([id,nome])=>({id,nome}))],state.categoria);
  const fields=data.campos_categorias?.[state.categoria]||[...new Set(Object.values(data.areas).filter(a=>!state.categoria||a.categoria===state.categoria).flatMap(a=>Object.keys(a.atributos)))];
  opcoes(q('[data-filter="atributo"]'),[{id:'',nome:'Nome do elemento'},...fields.map(id=>({id,nome:id}))],state.atributo);
  q('[data-filter="busca"]').value=state.busca;
  const output=result.saidas_individuais?.find(e=>e.nome===state.entrada);
  role('download').href=`${apiBase}/extracao-atributos/execucoes/${encodeURIComponent(result.id)}/pacote${output?'?saida='+encodeURIComponent(output.chave):''}`;
  role('download').textContent=output?'Baixar esta saída':'Baixar todas as saídas';
 }
 function bar(container,label,value,max,unit,action){
  const b=clone('ea-tpl-chart-bar');b.querySelector('.ea-chart-label').textContent=label;
  b.querySelector('.ea-chart-fill').style.width=`${100*Math.abs(value)/Math.max(1,max)}%`;b.querySelector('strong').textContent=`${n(value)} ${unit}`;
  b.onclick=action;container.append(b);
 }
 function detail(){
  const item=data.linhas.find(i=>i.chave===selectedKey);
  role('occurrences').replaceChildren();role('chart').replaceChildren();role('point-categories').replaceChildren();
  role('selection-title').textContent=item?`Demanda ${item.identificador??item.fid} · ${item.entrada}`:'Selecione uma demanda nas tabelas';
  const areas=item?item.areas.map(id=>data.areas[id]).filter(a=>a&&(!state.categoria||a.categoria===state.categoria)):[];
  role('empty').hidden=!!areas.length;role('empty').textContent=item?'Nenhuma correspondência registrada nesta categoria.':'Selecione uma demanda.';
  const numeric=!!state.atributo&&!/(^id$|codigo|código|(^|_)cod($|_)|(^|_)id($|_)|fid|objectid)/i.test(state.atributo)&&areas.length>0&&areas.every(a=>typeof a.atributos[state.atributo]==='number'&&Number.isFinite(a.atributos[state.atributo]));
  role('chart-metric').querySelector('[value="atributo"]').disabled=!numeric;
  if(!numeric)chartMetric='espacial';role('chart-metric').value=chartMetric;
  role('attribute-note').hidden=chartMetric!=='atributo';
  const values=areas.map(a=>{const m=item.relacoes?.[a.id]||{};return {a,m,v:chartMetric==='atributo'?a.atributos[state.atributo]:m.pontos??m.comprimento_m??m.area_m2??0,unit:chartMetric==='atributo'?'':m.pontos!=null?'pontos':m.comprimento_m!=null?'m':'m²'};});
  const max=Math.max(1,...values.map(v=>Math.abs(v.v)));
  for(const {a,m,v,unit} of values){
   const row=clone('ea-tpl-occurrence-row');valor(row,'nome',a.nome||`Feição ${a.fid}`);valor(row,'base',a.base);
   valor(row,'atributo',state.atributo?labelValue(a.atributos[state.atributo]):a.nome||a.fid);valor(row,'metrica',metric(m));
   const select=()=>{selectedArea=a.id;detail();};row.querySelector('button').onclick=select;row.classList.toggle('is-selected',a.id===selectedArea);role('occurrences').append(row);
   bar(role('chart'),`${a.nome||a.fid}${state.atributo?' · '+labelValue(a.atributos[state.atributo]):''}`,v,max,unit,select);
  }
  const area=areas.find(a=>a.id===selectedArea)||areas[0];selectedArea=area?.id;
  role('element-title').textContent=area?`${area.nome||area.fid} · ${area.base}`:'Selecione um elemento relacionado.';
  const attrs=Object.entries(area?.atributos||{}).filter(([,v])=>v!=null&&v!=='');
  attrs.sort(([a],[b])=>Number(/nome|name|codigo|class|descr|tipo|nm_/i.test(b))-Number(/nome|name|codigo|class|descr|tipo|nm_/i.test(a)));
  definicoes(role('selection-attributes'),Object.fromEntries(attrs));
  const m=item?.relacoes?.[area?.id];
  if(m?.por_categoria&&Object.keys(m.por_categoria).some(k=>k!=='Sem categoria')){
   const unidade=({ponto:'pontos',linha:'m',poligono:'m²'})[m.representacao_entrada]||'';
   const title=document.createElement('h4');title.textContent=`Demandas por categoria · ${area.nome||area.fid}`;role('point-categories').append(title);
   for(const [label,count] of Object.entries(m.por_categoria))bar(role('point-categories'),label,count,Math.max(...Object.values(m.por_categoria)),unidade,()=>{});
  }
  const features=[];
  if(area?.geometria)features.push({type:'Feature',geometry:area.geometria,properties:{chave:`area:${area.id}`,papel:'area',categoria:area.categoria,rotulo:area.nome||area.base}});
  for(const f of data.mapa_saida?.features||[])if(!item||f.properties.chave===item.chave)features.push({...f,properties:{...f.properties,papel:'entrada',rotulo:item?String(item.identificador):f.properties.chave}});
  if(item?.geometria)features.push({type:'Feature',geometry:item.geometria,properties:{chave:item.chave,papel:'entrada',rotulo:String(item.identificador)}});
  map?.destroy();map=desenharMapa(role('map'),features,key=>{if(!key.startsWith('area:'))selectDemand(key);});
  if(item)map.focus(item.chave);
  role('map-scope').textContent=data.mapa_saida_limitado?'Prévia limitada a 200 geometrias. Os cálculos e arquivos usam todos os registros.':(area?.representacao_mapa&&area.representacao_mapa!=='original'||data.representacao_saida?.metodo&&data.representacao_saida.metodo!=='original')?'Prévia simplificada para navegação. Métricas e arquivos usam geometrias integrais.':'Geometrias e atributos preservados na saída.';
 }
 function draw(){
  filters();for(const node of host.querySelectorAll('[data-kpi]'))node.textContent=numero(data.resumo[node.dataset.kpi],0);
  role('legacy').hidden=!data.legado;
  for(const tipo of ['restricao','risco']){
   const section=q(`[data-ranking="${tipo}"]`),tbody=section.querySelector('tbody');tbody.replaceChildren();
   section.querySelector('[data-empty]').hidden=data.bases.some(b=>b.categoria===tipo);
   const ranked=data.rankings?.[tipo]||[];
   for(const r of ranked.slice(state.pagina*25,state.pagina*25+25)){
    const row=clone('ea-tpl-ranking-row');for(const key of ['posicao','demanda','entrada'])valor(row,key,r[key]);
    valor(row,'ocorrencias',r.estado==='nao_avaliado'?'Não avaliado':r.ocorrencias);
    row.querySelector('button').onclick=()=>selectDemand(r.chave,tipo);tbody.append(row);
   }
  }
  const matrix=role('matrix'),head=matrix.querySelector('thead tr'),body=matrix.querySelector('tbody');
  while(head.children.length>2)head.lastElementChild.remove();body.replaceChildren();
  for(const [,nome] of data.categorias||[]){const th=document.createElement('th');th.textContent=nome;head.append(th);}
  for(const item of data.linhas){
   const row=document.createElement('tr');
   for(const v of [item.identificador??item.fid,item.entrada]){const td=document.createElement('td');td.textContent=v;row.append(td);}
   for(const [id] of data.categorias||[]){const td=document.createElement('td'),b=document.createElement('button');b.className='ea-btn';b.type='button';const related=item.areas.map(a=>data.areas[a]).filter(a=>a?.categoria===id);b.textContent=state.atributo&&id===state.categoria?[...new Set(related.map(a=>labelValue(a.atributos[state.atributo])))].join(' · ')||'Sem correspondência':item.contagens?.[id]||0;b.onclick=()=>selectDemand(item.chave,id);td.append(b);row.append(td);}
   body.append(row);
  }
  role('pagination').textContent=`Página ${data.paginas?data.pagina+1:0} de ${data.paginas} · ${data.total} demandas`;
  q('[data-action="previous"]').disabled=data.pagina===0;q('[data-action="next"]').disabled=data.pagina+1>=data.paginas;
  detail();
 }
 async function load(){
  if(!host)return;const current=++version,target=host;controller?.abort();controller=new AbortController();
  role('loading').hidden=false;role('error').hidden=true;target.setAttribute('aria-busy','true');
  try{const response=await json(`/extracao-atributos/execucoes/${encodeURIComponent(result.id)}/intersecoes`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(state),signal:controller.signal});
   if(current!==version||host!==target)return;data=response;state.pagina=data.pagina;role('body').hidden=false;draw();
  }catch(e){if(current!==version||host!==target)return;role('error').hidden=false;role('error').querySelector('p').textContent=e.message;}
  finally{if(current===version&&host===target){role('loading').hidden=true;target.removeAttribute('aria-busy');}}
 }
 return {dispose,mount(target){dispose();host=target;
  role('chart-metric').onchange=()=>{chartMetric=role('chart-metric').value;detail();};
  for(const control of host.querySelectorAll('[data-filter]'))control.onchange=()=>{
   const key=control.dataset.filter;
   if(['categoria','atributo'].includes(key)){state[key]=control.value;if(key==='categoria')state.atributo='';draw();return;}
   selectedKey=null;change({[key]:control.value,feicao:''});
  };
  q('[data-action="reset"]').onclick=()=>{state=initial();selectedKey=null;load();};q('[data-action="retry"]').onclick=load;
  q('[data-action="previous"]').onclick=()=>change({pagina:state.pagina-1,feicao:''});q('[data-action="next"]').onclick=()=>change({pagina:state.pagina+1,feicao:''});load();
 }};
}
