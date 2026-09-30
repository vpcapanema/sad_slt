import {desenharFiltros} from './territorial-filtros.js';
import {formatarValor} from './resultados-formatacao.js';
const nomeDemanda=item=>String(item.nome_demanda??item.identificador??item.fid);
import {json,base as apiBase} from './api.js';
import {numero} from './ui.js';
import {clone,valor,opcoes,definicoes,texto} from './resultados-dom.js';
import {desenharMapa} from './resultados-mapa.js';
const n=v=>v==null?'—':Number(v).toLocaleString('pt-BR',{maximumFractionDigits:2});
const labelValue=v=>v==null?'Sem valor':typeof v==='object'?JSON.stringify(v):String(v);
const nomeArea=a=>a.nome||a.atributos?.nome||a.atributos?.name||`Feição ${a.fid}`;
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
 const initial=()=>({entrada:'',feicao:'',categoria:'',atributo:'',busca:'',pagina:0,agrupamento:'feicao',filtros:[],combinacao:'e'});
 let state=initial(),host,controller,version=0,map,data,selectedKey=null,selectedArea=null,chartMetric='espacial';
 const atributosPorCategoria=new Map(),atributosAbertos=new Set();let ordenarPor='',crescente=true;
 const q=s=>host.querySelector(s),role=k=>q(`[data-role="${k}"]`);
 function dispose(){version++;controller?.abort();map?.destroy();map=null;host=null;}
 function change(values){Object.assign(state,{pagina:0},values);selectedArea=null;load();}
 function selectDemand(key,tipo){
  if(tipo!==undefined){state.categoria=tipo;state.atributo='';}
  selectedKey=key;selectedArea=null;
  if(!data.linhas.some(i=>i.chave===key)){change({feicao:key});return;}
  draw();role('detail').scrollIntoView({behavior:'smooth',block:'start'});
 }
 function filters(){
  opcoes(q('[data-filter="entrada"]'),[{id:'',nome:'Unificado · todas as demandas'},...data.entradas.map(e=>({id:e.nome,nome:e.nome}))],state.entrada);
  opcoes(q('[data-filter="categoria"]'),[{id:'',nome:'Todas as categorias'},...(data.categorias||[]).map(([id,nome])=>({id,nome}))],state.categoria);
  const fields=data.campos_categorias?.[state.categoria]||[...new Set(Object.values(data.areas).filter(a=>!state.categoria||a.categoria===state.categoria).flatMap(a=>Object.keys(a.atributos)))];
  opcoes(q('[data-filter="atributo"]'),[{id:'',nome:'Nome do elemento'},...fields.map(id=>({id,nome:data.aliases_categorias?.[state.categoria]?.[id]||id.replaceAll('_',' ')}))],state.atributo);
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
  role('detail').hidden=!item;role('attribute-controls').hidden=!item;
  if(!item){map?.destroy();map=null;return;}
  role('occurrences').replaceChildren();role('chart').replaceChildren();role('point-categories').replaceChildren();
  role('selection-title').textContent=item?`${nomeDemanda(item)} · ${(data.categorias||[]).find(c=>c[0]===state.categoria)?.[1]||'Todas as categorias'}`:'Selecione uma demanda nas tabelas';
  const areas=item?item.areas.map(id=>data.areas[id]).filter(a=>a&&(!state.categoria||a.categoria===state.categoria)):[];
  role('empty').hidden=!!areas.length;role('empty').textContent=['nao_avaliado','nao_informado'].includes(item?.estados?.[state.categoria])?'Esta demanda não tem avaliação disponível nesta categoria.':'Nenhuma correspondência registrada nesta categoria.';
  const numeric=!!state.atributo&&!/(^id$|codigo|código|(^|_)cod($|_)|(^|_)id($|_)|fid|objectid)/i.test(state.atributo)&&areas.length>0&&areas.every(a=>typeof a.atributos[state.atributo]==='number'&&Number.isFinite(a.atributos[state.atributo]));
  role('chart-metric').querySelector('[value="atributo"]').disabled=!numeric;
  if(!numeric)chartMetric='espacial';role('chart-metric').value=chartMetric;
  role('attribute-note').hidden=chartMetric!=='atributo';
  const values=areas.map(a=>{const m=item.relacoes?.[a.id]||{};return {a,m,v:chartMetric==='atributo'?a.atributos[state.atributo]:m.pontos??m.comprimento_m??m.area_m2??0,unit:chartMetric==='atributo'?'':m.pontos!=null?'pontos':m.comprimento_m!=null?'m':'m²'};});
  const max=Math.max(1,...values.map(v=>Math.abs(v.v)));
  for(const {a,m,v,unit} of values){
   const row=clone('ea-tpl-occurrence-row');valor(row,'nome',nomeArea(a));valor(row,'base',a.base);
   valor(row,'atributo',state.atributo?formatarValor(a.atributos[state.atributo],data.metadados_categorias?.[a.categoria]?.[state.atributo]):nomeArea(a));valor(row,'metrica',metric(m));
   const select=()=>{selectedArea=a.id;detail();};row.querySelector('button').onclick=select;row.classList.toggle('is-selected',a.id===selectedArea);role('occurrences').append(row);
   bar(role('chart'),`${nomeArea(a)}${state.atributo?' · '+formatarValor(a.atributos[state.atributo],data.metadados_categorias?.[a.categoria]?.[state.atributo]):''}`,v,max,unit,select);
  }
  const area=areas.find(a=>a.id===selectedArea)||areas[0];selectedArea=area?.id;
  role('element-title').textContent=area?`${nomeArea(area)} · ${area.base}`:'Selecione um elemento relacionado.';
  const attrs=Object.entries(area?.atributos||{}).filter(([,v])=>v!=null&&v!=='');
  attrs.sort(([a],[b])=>Number(/nome|name|codigo|class|descr|tipo|nm_/i.test(b))-Number(/nome|name|codigo|class|descr|tipo|nm_/i.test(a)));
  definicoes(role('selection-attributes'),Object.fromEntries(attrs.map(([k,v])=>[data.aliases_categorias?.[area?.categoria]?.[k]||k.replaceAll('_',' '),formatarValor(v,data.metadados_categorias?.[area?.categoria]?.[k])])));
  const m=item?.relacoes?.[area?.id];
  if(m?.por_categoria&&Object.keys(m.por_categoria).some(k=>k!=='Sem categoria')){
   const unidade=({ponto:'pontos',linha:'m',poligono:'m²'})[m.representacao_entrada]||'';
   const title=document.createElement('h4');title.textContent=`Demandas por categoria · ${nomeArea(area)}`;role('point-categories').append(title);
   for(const [label,count] of Object.entries(m.por_categoria))bar(role('point-categories'),label,count,Math.max(...Object.values(m.por_categoria)),unidade,()=>{});
  }
  const features=[];
  if(area?.geometria)features.push({type:'Feature',geometry:area.geometria,properties:{chave:`area:${area.id}`,papel:'area',categoria:area.categoria,rotulo:nomeArea(area)}});
  for(const f of data.mapa_saida?.features||[])if(!item||f.properties.chave===item.chave)features.push({...f,properties:{...f.properties,papel:'entrada',rotulo:item?nomeDemanda(item):f.properties.chave}});
  if(item?.geometria)features.push({type:'Feature',geometry:item.geometria,properties:{chave:item.chave,papel:'entrada',rotulo:nomeDemanda(item)}});
  map?.destroy();map=desenharMapa(role('map'),features,key=>{if(key.startsWith('area:')){selectedArea=key.slice(5);detail();}});
  if(item)map.focus(item.chave);
  role('map-scope').textContent=data.mapa_saida_limitado?'Prévia limitada a 200 geometrias. Os cálculos e arquivos usam todos os registros.':(area?.representacao_mapa&&area.representacao_mapa!=='original'||data.representacao_saida?.metodo&&data.representacao_saida.metodo!=='original')?'Prévia simplificada para navegação. Métricas e arquivos usam geometrias integrais.':'Geometrias e atributos preservados na saída.';
 }
 function draw(){
  filters();
  desenharFiltros(role('matrix-filters'),data,state,values=>{selectedKey=null;change(values);});
  const matrix=role('matrix'),head=matrix.querySelector('thead tr'),body=matrix.querySelector('tbody');
  head.replaceChildren();body.replaceChildren();
  const categorias=[...(data.categorias||[])].sort((a,b)=>(['restricao','risco'].indexOf(a[0])+1||3)-(['restricao','risco'].indexOf(b[0])+1||3));
  const alias=(id,campo)=>data.aliases_categorias?.[id]?.[campo]||campo.replaceAll('_',' ').replace(/^./,c=>c.toUpperCase());
  const columns=[];
  function sortButton(label,id){const b=document.createElement('button');b.type='button';b.className='ea-matrix-sort';b.textContent=label+(ordenarPor===id?(crescente?' ↑':' ↓'):'');b.onclick=()=>{crescente=ordenarPor===id?!crescente:true;ordenarPor=id;draw();};return b;}
  const th=document.createElement('th');th.scope='col';th.append(sortButton('Nome da demanda',''));head.append(th);
  const selectors=role('matrix-fields');selectors.replaceChildren();
  for(const [id,nome] of categorias){
   if(['risco','restricao'].includes(id)){columns.push({id,nome,key:id,label:nome});continue;}
   const fields=data.campos_categorias?.[id]||[];
   if(!atributosPorCategoria.has(id))atributosPorCategoria.set(id,[fields.find(f=>/nome|name|classe|tipo|grau/i.test(f))||fields[0]].filter(Boolean));
   const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent=nome;details.open=atributosAbertos.has(id);details.ontoggle=()=>{if(!details.isConnected)return;if(details.open)atributosAbertos.add(id);else atributosAbertos.delete(id);};details.append(summary);
   const options=document.createElement('div');options.className='ea-matrix-options';
   for(const campo of fields){const label=document.createElement('label'),check=document.createElement('input');check.type='checkbox';check.checked=atributosPorCategoria.get(id).includes(campo);check.setAttribute('aria-label',`${nome}: ${alias(id,campo)}`);check.onchange=()=>{const selected=atributosPorCategoria.get(id);atributosPorCategoria.set(id,check.checked?[...selected,campo]:selected.filter(c=>c!==campo));draw();};label.append(check,document.createTextNode(alias(id,campo)));options.append(label);}
   if(!fields.length)options.textContent='Sem atributos disponíveis';
   details.append(options);selectors.append(details);
   const selected=atributosPorCategoria.get(id)||[];
   for(const campo of selected.length?selected:[null])columns.push({id,nome,campo,key:JSON.stringify([id,campo]),label:campo?alias(id,campo):nome});
  }
  selectors.hidden=!selectors.children.length;
  for(const col of columns){const th=document.createElement('th');th.scope='col';th.title=col.campo?(data.metadados_categorias?.[col.id]?.[col.campo]?.descricao||col.label):col.nome;th.append(sortButton(col.label,col.key));if(col.campo){const category=document.createElement('small');category.textContent=col.nome;th.append(category);}head.append(th);}
  function cell(item,col){
   const id=col.id;
   if(['risco','restricao'].includes(id))return {com:'Sim',sem:'Não',nao_avaliado:'Não avaliado',nao_informado:'Não informado'}[item.estados?.[id]]||'Não avaliado';
   const areas=item.areas.map(a=>data.areas[a]).filter(a=>a?.categoria===id);
   if(!areas.length)return 'Sem correspondência';
   return col.campo?[...new Set(areas.map(a=>formatarValor(a.atributos[col.campo],data.metadados_categorias?.[id]?.[col.campo])))].join(' · '):'—';
  }
  const sortCol=columns.find(c=>c.key===ordenarPor);
  const ordered=[...data.linhas].sort((a,b)=>(crescente?1:-1)*(sortCol?cell(a,sortCol).localeCompare(cell(b,sortCol),'pt-BR',{numeric:true}):nomeDemanda(a).localeCompare(nomeDemanda(b),'pt-BR',{numeric:true})));
  for(const item of ordered){
   const row=document.createElement('tr'),name=document.createElement('th');name.scope='row';name.textContent=nomeDemanda(item);name.title=`${item.entrada} · FID ${item.fid}${item.campo_nome_demanda?' · '+item.campo_nome_demanda:''}`;row.append(name);
   for(const col of columns){const td=document.createElement('td'),b=document.createElement('button');b.className='ea-matrix-cell';b.type='button';b.textContent=cell(item,col);b.title=b.textContent;b.setAttribute('aria-label',`${nomeDemanda(item)} · ${col.nome}${col.campo?' · '+col.label:''}: ${b.textContent}`);b.setAttribute('aria-pressed',String(selectedKey===item.chave&&state.categoria===col.id));b.onclick=()=>selectDemand(item.chave,col.id);td.append(b);row.append(td);}
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
