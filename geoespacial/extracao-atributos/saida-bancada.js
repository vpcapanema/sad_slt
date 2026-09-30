// Cópias de visualização permanecem na bancada, independentes da análise ativa.
export function copiarSaidas(resultado,anteriores=[],coresUsadas=[]){
 const paleta=['#d000d0','#00a6a6','#853eaf','#ffb000','#1565c0'];
 const usadas=new Set(coresUsadas.filter(c=>typeof c==='string').map(c=>c.toLowerCase()));
 let cor=paleta.find(c=>!usadas.has(c));
 for(let n=0;!cor;n++){const candidata='#'+((0xd000d0+n*7919)%0xffffff).toString(16).padStart(6,'0');if(!usadas.has(candidata))cor=candidata;}
 const novas=Object.entries(resultado.camadas||{}).map(([chave,saida])=>{
  if(!saida.bancada)throw new Error(`A saída ${saida.nome||chave} não possui representação para a bancada.`);
  return {...saida.bancada,key:`resultado:${resultado.id}:${chave}`,grupo:'Resultados',papelExtracao:'resultado',
   nome:saida.nome||saida.bancada.nome,color:cor,execucaoId:resultado.id};
 });
 return [...new Map([...anteriores,...novas].map(item=>[item.key,item])).values()];
}
export function limitesSaidas(items){
 const bounds=items.map(i=>i.bounds).filter(b=>Array.isArray(b)&&b.length===4&&b.every(Number.isFinite));
 return bounds.length?[Math.min(...bounds.map(b=>b[0])),Math.min(...bounds.map(b=>b[1])),Math.max(...bounds.map(b=>b[2])),Math.max(...bounds.map(b=>b[3]))]:null;
}
