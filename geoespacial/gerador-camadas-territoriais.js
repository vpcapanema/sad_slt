import {base,json} from './extracao-atributos/api.js';
import {$,feedback,options} from './extracao-atributos/ui.js';
import {montarMunicipal} from './extracao-atributos/municipal-plugin/municipal-plugin.js';

const prefix=location.pathname.includes('/sicard/')?'/sicard':'';
const select=$('#territorial-category'),host=$('#territorial-builder');
let categories=[],unmount,busy=false,downloadUrl;
function mount(){
  if(busy)return;
  const category=categories.find(c=>c.id===select.value);
  unmount?.();unmount=null;host.replaceChildren();
  if(!category){host.textContent='Escolha a categoria para selecionar os indicadores da camada.';return;}
  const url=new URL(location.href);url.searchParams.set('categoria',category.id);history.replaceState(null,'',url);
  unmount=montarMunicipal(host,{category,apiBase:base,onBusyChange:value=>{
    busy=value;select.disabled=value;$('#territorial-scale').disabled=value;
  },onGenerated:(result,output)=>{
    if(!result?.id||!result?.arquivo)throw new Error('O servidor não informou o arquivo salvo. Consulte o acervo antes de gerar novamente.');
    if(downloadUrl)URL.revokeObjectURL(downloadUrl);
    downloadUrl=URL.createObjectURL(output.blob);
    const download=$('#territorial-download');download.href=downloadUrl;download.download=output.filename;
    const params=new URLSearchParams({retomar:'municipal',camada_municipal:result.id,categoria:category.id});
    $('#territorial-use').href=`${prefix}/restrict/geoespacial/extracao-atributos/?${params}`;
    $('#territorial-result').hidden=false;$('#territorial-result').scrollIntoView({behavior:'smooth',block:'center'});
  }});
}
async function load(){
  select.disabled=true;$('#territorial-retry').hidden=true;
  try{
    const catalog=await json('/extracao-atributos/catalogo');categories=catalog.categorias;
    options(select,categories,'Selecione uma categoria',new URLSearchParams(location.search).get('categoria')||'');
    select.disabled=false;mount();
  }catch(error){feedback(error.message);$('#territorial-retry').hidden=false;}
}
select.addEventListener('change',mount);
$('#territorial-retry').addEventListener('click',load);
window.addEventListener('beforeunload',event=>{if(busy){event.preventDefault();event.returnValue='';}});
load();
