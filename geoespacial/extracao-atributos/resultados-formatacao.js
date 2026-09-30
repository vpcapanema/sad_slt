export function formatarValor(value,meta={}) {
 if(value==null||value==='')return 'Sem valor';
 if(typeof value==='boolean')return value?'Sim':'Não';
 const numeric=typeof value==='number'||(meta.formato&&meta.formato!=='original'&&typeof value==='string'&&/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(value));
 if(numeric&&Number.isFinite(Number(value))){
  const moeda=meta.formato==='moeda';
  return Number(value).toLocaleString('pt-BR',{minimumFractionDigits:moeda?2:0,maximumFractionDigits:moeda?2:20});
 }
 return typeof value==='object'?JSON.stringify(value):String(value);
}
