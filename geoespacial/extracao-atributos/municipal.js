// O rascunho inclui arquivos locais e a bancada: IndexedDB evita o limite pequeno do sessionStorage.
const KEY='sicard-extracao-retorno-municipal';
async function banco(){
 return new Promise((resolve,reject)=>{
  const request=indexedDB.open('sicard-extracao-rascunhos',1);
  request.onupgradeneeded=()=>request.result.createObjectStore('rascunhos');
  request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
 });
}
async function armazenar(chave,valor,apagar=false){
 const db=await banco();
 try{return await new Promise((resolve,reject)=>{
  const tx=db.transaction('rascunhos',valor===undefined&&!apagar?'readonly':'readwrite'),store=tx.objectStore('rascunhos');
  const req=apagar?store.delete(chave):valor===undefined?store.get(chave):store.put(valor,chave);
  tx.oncomplete=()=>resolve(req.result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('Rascunho não gravado.'));
 });}finally{db.close();}
}
export async function salvarRascunhoMunicipal(state){
 const campos=['input','inputConfig','entradasExtras','finalidades','operation','opcoes','nomeSaida','camadaRecorte',
  'bancadaEntradas','bancadaBases','bases','staging','catalog','categories','previaLocal','listaBases','result'];
 const draft=Object.fromEntries(campos.map(key=>[key,state[key]]));
 const anterior=sessionStorage.getItem(KEY),chave=crypto.randomUUID();
 const snapshot=JSON.parse(JSON.stringify({...draft,categoria:document.querySelector('#ea-category-select').value,
  painel:window.SICARDExtracao?.camadasNaBancada?.()||[],previaVisiveis:state.previaVisiveis?[...state.previaVisiveis]:null},
  (key,value)=>key==='carregamento'?undefined:value));
 await armazenar(chave,snapshot);
 try{sessionStorage.setItem(KEY,JSON.stringify({versao:2,chave}));}
 catch(error){await armazenar(chave,undefined,true);throw error;}
 if(anterior){try{const old=JSON.parse(anterior);if(old.chave)await armazenar(old.chave,undefined,true);}catch{ /* Novo rascunho já está íntegro. */ }}
}
export async function restaurarRetornoMunicipal(state){
 const params=new URLSearchParams(location.search);
 if(params.get('retomar')!=='municipal')return null;
 const id=params.get('camada_municipal'),category=params.get('categoria');
 if(id&&(!state.catalog.some(layer=>layer.id===id)||!state.categories.some(c=>c.id===category)))
  throw new Error('A camada gerada ou sua categoria não está disponível no catálogo. Atualize a página para tentar novamente.');
 const raw=sessionStorage.getItem(KEY),ref=raw?JSON.parse(raw):null;
 const draft=ref?.versao===2?await armazenar(ref.chave):ref;
 if(ref&&!draft)throw new Error('O rascunho municipal não está disponível neste navegador.');
 if(draft){
  if(ref.versao===2){
   const atuais=state.catalog,categorias=state.categories;
   for(const key of ['input','inputConfig','entradasExtras','finalidades','operation','opcoes','nomeSaida','camadaRecorte',
    'bancadaEntradas','bancadaBases','bases','staging','previaLocal','listaBases','result'])if(key in draft)state[key]=draft[key];
   state.catalog=[...new Map([...atuais,...draft.catalog].map(l=>[l.id,l])).values()];
   state.categories=[...new Map([...draft.categories,...categorias].map(c=>[c.id,c])).values()];
   state.previaVisiveis=draft.previaVisiveis?new Set(draft.previaVisiveis):undefined;
   state.painelRestaurado=draft.painel||[];
  }else{
   const exists=id=>state.catalog.some(layer=>layer.id===id);
   state.input=exists(draft.input)?draft.input:'';state.inputConfig=draft.inputConfig||null;
   state.entradasExtras=(draft.entradasExtras||[]).filter(e=>exists(e.id));
   for(const key of ['bases','staging'])state[key]=(draft[key]||[]).filter(b=>exists(b.id)&&state.categories.some(c=>c.id===b.category));
   state.finalidades=draft.finalidades||[];state.operation=draft.operation||'';
   state.opcoes={...state.opcoes,...draft.opcoes};state.nomeSaida=draft.nomeSaida||'';state.camadaRecorte='';
  }
 }
 document.querySelector('#ea-category-select').value=category||draft?.categoria||'';
 let message=draft?'Configuração e bancada da extração restauradas.':'';
 if(id){
  state.listaBases??={itens:[],nome:'',chave:null,ausentes:[]};
  const layer=state.catalog.find(l=>l.id===id);
  const item={id,category,nome:layer.nome,arquivo:layer.arquivo||''};
  const anterior=state.listaBases.itens.find(i=>i.id===id);
  if(anterior)Object.assign(anterior,item);else state.listaBases.itens.push(item);
  message+=' Camada gerada adicionada à lista de categorias. Confirme a lista para validar e enviar à prévia.';
 }
 // Só consome o rascunho após a montagem bem-sucedida, via concluirRetornoMunicipal.
 return message||'Escolha a entrada e as bases para iniciar uma extração.';
}
export async function concluirRetornoMunicipal(){
 const raw=sessionStorage.getItem(KEY),ref=raw?JSON.parse(raw):null;
 if(ref?.chave)await armazenar(ref.chave,undefined,true);
 sessionStorage.removeItem(KEY);
 const url=new URL(location.href);
 for(const key of ['retomar','camada_municipal','categoria'])url.searchParams.delete(key);
 history.replaceState(null,'',url);
}
