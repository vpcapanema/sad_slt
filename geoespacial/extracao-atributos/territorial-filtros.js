import {formatarValor} from './resultados-formatacao.js';
const novo=()=>({campo:'',operador:'valores',valores:[],minimo:null,maximo:null});
function el(tag,text){const e=document.createElement(tag);if(text)e.textContent=text;return e;}
function select(label,options,value,action){const wrap=el('label',label),input=el('select');input.setAttribute('aria-label',label);for(const [id,nome] of options){const o=el('option',nome);o.value=id;input.append(o);}input.value=value;input.onchange=()=>action(input.value);wrap.append(input);return wrap;}
export function desenharFiltros(host,data,state,change){
 host.replaceChildren();
 const filtros=state.filtros??=[];
 const fields=[['','Escolha um campo'],['demanda','Nome da demanda'],['restricao','Restrição'],['risco','Risco']];
 for(const [id,nome] of data.categorias||[]){if(['risco','restricao'].includes(id))continue;for(const campo of data.campos_categorias?.[id]||[])fields.push([JSON.stringify([id,campo]),`${nome} · ${data.aliases_categorias?.[id]?.[campo]||campo}`]);}
 const redraw=()=>desenharFiltros(host,data,state,change);
 for(let index=0;index<2;index++){
  const filtro=filtros[index]??=novo(),group=el('fieldset'),legend=el('legend',`Condição ${index+1}`);group.append(legend);
  group.append(select(`Campo ${index+1}`,fields,filtro.campo,v=>{filtros[index]={...novo(),campo:v};change({filtros});}));
  if(filtro.campo){
   const options=data.opcoes_filtro?.[filtro.campo]||{valores:[]};
   let meta={};try{const [cat,field]=JSON.parse(filtro.campo);meta=data.metadados_categorias?.[cat]?.[field]||{};}catch{}
   const modes=[['valores','Um ou vários valores'],['vazio','Sem valor']];
   if(options.numerico||filtro.operador==='intervalo')modes.splice(1,0,['intervalo','Intervalo numérico (inclusivo)']);
   group.append(select(`Comparação ${index+1}`,modes,filtro.operador,v=>{filtro.operador=v;redraw();}));
   if(filtro.operador==='intervalo'){
    for(const [key,label] of [['minimo','Mínimo'],['maximo','Máximo']]){const wrap=el('label',label),input=el('input');input.type='number';input.step='any';input.setAttribute('aria-label',`${label} ${index+1}`);input.value=filtro[key]??'';input.placeholder=options[key]??'';input.oninput=()=>{filtro[key]=input.value===''?null:Number(input.value);};wrap.append(input);group.append(wrap);}
   }else if(filtro.operador==='valores'){
    const search=el('input');search.type='search';search.placeholder='Buscar valor';search.setAttribute('aria-label',`Buscar valor ${index+1}`);group.append(search);
    const list=el('div');list.className='ea-filter-values';list.setAttribute('role','group');list.setAttribute('aria-label',`Valores ${index+1}`);
    const vals=[...options.valores];for(const v of filtro.valores)if(!vals.includes(v))vals.push(v);
    vals.sort((a,b)=>typeof a==='number'&&typeof b==='number'?a-b:String(a??'').localeCompare(String(b??''),'pt-BR',{numeric:true}));
    for(const v of vals){const label=el('label'),check=el('input');check.type='checkbox';check.checked=filtro.valores.includes(v);check.onchange=()=>{filtro.valores=check.checked?[...filtro.valores,v]:filtro.valores.filter(x=>x!==v);};label.append(check,document.createTextNode(formatarValor(v,meta)));list.append(label);}
    if(!vals.length)list.append(el('span','Nenhum valor disponível com a outra condição.'));
    search.oninput=()=>{for(const label of list.querySelectorAll('label'))label.hidden=!label.textContent.toLocaleLowerCase('pt-BR').includes(search.value.toLocaleLowerCase('pt-BR'));};
    group.append(list);
   }
  }
  host.append(group);
 }
 const actions=el('div');actions.className='ea-filter-actions';
 actions.append(select('Combinar condições',[['e','E — atender às duas'],['ou','OU — atender a pelo menos uma']],state.combinacao||'e',v=>change({combinacao:v,filtros})));
 const apply=el('button','Aplicar filtros');apply.type='button';apply.className='ea-btn';apply.onclick=()=>{for(const f of filtros){if(f.operador==='intervalo'&&f.minimo!=null&&f.maximo!=null&&f.minimo>f.maximo){feedback.textContent='O mínimo deve ser menor ou igual ao máximo.';return;}}change({filtros});};
 const clear=el('button','Limpar filtros');clear.type='button';clear.className='ea-btn';clear.onclick=()=>change({filtros:[],combinacao:'e'});
 const feedback=el('span');feedback.setAttribute('role','alert');actions.append(apply,clear,feedback);host.append(actions);
}
