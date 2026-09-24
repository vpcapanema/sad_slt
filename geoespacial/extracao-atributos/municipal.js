// Guarda apenas referências e opções para navegar à ferramenta independente.
const KEY='sicard-extracao-retorno-municipal';
export function salvarRascunhoMunicipal(state){
  const campos=['input','inputConfig','entradasExtras','finalidades','operation','opcoes','nomeSaida'];
  const draft=Object.fromEntries(campos.map(key=>[key,state[key]]));
  const refs=items=>items.map(({id,category,regra})=>({id,category,regra}));
  sessionStorage.setItem(KEY,JSON.stringify({...draft,categoria:document.querySelector('#ea-category-select').value,bases:refs(state.bases),staging:refs(state.staging)}));
}
export function restaurarRetornoMunicipal(state){
  const params=new URLSearchParams(location.search);
  if(params.get('retomar')!=='municipal')return null;
  const raw=sessionStorage.getItem(KEY);
  if(raw){
    const draft=JSON.parse(raw);
    const exists=id=>state.catalog.some(layer=>layer.id===id);
    const validBase=item=>exists(item.id)&&state.categories.some(c=>c.id===item.category);
    state.input=exists(draft.input)?draft.input:'';
    state.inputConfig=draft.inputConfig||null;
    state.entradasExtras=(draft.entradasExtras||[]).filter(item=>exists(item.id));
    state.bases=(draft.bases||[]).filter(validBase);
    state.staging=(draft.staging||[]).filter(validBase);
    state.finalidades=draft.finalidades||[];
    state.operation=['intersection','identity','enriquecimento','estatisticas'].includes(draft.operation)?draft.operation:'';
    state.opcoes={...state.opcoes,...draft.opcoes};state.nomeSaida=draft.nomeSaida||'';
  }
  const selecionada=params.get('categoria')||(raw?JSON.parse(raw).categoria:'');
  document.querySelector('#ea-category-select').value=selecionada||'';
  let message=raw?'Configuração da extração restaurada.':'';
  const id=params.get('camada_municipal'),category=params.get('categoria');
  if(id){
    if(!state.catalog.some(layer=>layer.id===id)||!state.categories.some(c=>c.id===category))
      throw new Error('A camada gerada ou sua categoria não está disponível no catálogo. Atualize a página para tentar novamente.');
    if(!state.bases.some(item=>item.id===id)&&!state.staging.some(item=>item.id===id))
      state.staging.push({id,category});
    message+=' Camada gerada adicionada à lista. Use Confirmar bases para incluí-la na análise.';
  }
  sessionStorage.removeItem(KEY);
  const url=new URL(location.href);
  for(const key of ['retomar','camada_municipal','categoria'])url.searchParams.delete(key);
  history.replaceState(null,'',url);
  return message||'Escolha a entrada e as bases para iniciar uma extração.';
}
