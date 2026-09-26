import {base,json} from './extracao-atributos/api.js';
import {$,feedback,options} from './extracao-atributos/ui.js';
import {montarMunicipal} from './extracao-atributos/municipal-plugin/municipal-plugin.js?v=20260926-catalogo';

const prefix=location.pathname.includes('/sicard/')?'/sicard':'';
const select=$('#territorial-category'),host=$('#territorial-builder');
let categories=[],unmount,busy=false,downloadUrl,configuration={attributes:[],format:"fgb"};
function changeCategory(){
  if(busy)return;
  const category=categories.find(c=>c.id===select.value);
  const url=new URL(location.href);
  if(category)url.searchParams.set('categoria',category.id);else url.searchParams.delete('categoria');
  history.replaceState(null,'',url);
  unmount?.setCategory(category);
}
function mount(){
  unmount=montarMunicipal(host,{category:null,apiBase:base,configuration,onChange:value=>{configuration=value;},onBusyChange:value=>{
    busy=value;select.disabled=value;$('#territorial-scale').disabled=value;
    $('#territorial-back').setAttribute('aria-disabled',String(value));
  },onGenerated:(result,output)=>{
    const category=categories.find(c=>c.id===select.value);
    if(!result?.id||!result?.arquivo)throw new Error('O servidor não informou o arquivo salvo. Consulte o acervo antes de gerar novamente.');
    if(downloadUrl)URL.revokeObjectURL(downloadUrl);
    downloadUrl=URL.createObjectURL(output.blob);
    const params=new URLSearchParams({retomar:'municipal',camada_municipal:result.id,categoria:category.id});
    // O adaptador desenha o cartão e o mapa no painel Resultados.
    return {nome:output.configuration.nome||'Camada municipal',categoria:category.nome,
      download:{href:downloadUrl,filename:output.filename},
      usar:`${prefix}/restrict/geoespacial/extracao-atributos/?${params}`,
      geojson:`${base}/camadas/${encodeURIComponent(result.id)}/geojson`};
  }});
}
async function load(){
  select.disabled=true;$('#territorial-retry').hidden=true;
  try{
    const catalog=await json('/extracao-atributos/municipal/categorias');categories=catalog.categorias;
    options(select,categories,'Selecione uma categoria','');
    select.disabled=false;feedback('');

    if(!categories.length)feedback('Nenhuma categoria ativa. Cadastre uma categoria na administração para gerar camadas.');
    changeCategory();
  }catch(error){feedback(error.message,'error');$('#territorial-retry').hidden=false;}
}
$('#territorial-back').addEventListener('click',event=>{if(busy)event.preventDefault();});
select.addEventListener('change',changeCategory);
$('#territorial-retry').addEventListener('click',load);
window.addEventListener('beforeunload',event=>{if(busy){event.preventDefault();event.returnValue='';}});
mount();
load();
