import { $, el, feedback } from './ui.js';
import { json, adaptador } from './api.js';

// Índice da extração de atributos, no padrão das tabelas da plataforma: filtro
// Coluna/Valor, seleção por linha e ações em lote abaixo da tabela. A ordenação
// por coluna vem do table-sort.js carregado pela página base.
const COLUNAS=[['data','Data da extração'],['nome','Nome da saída'],['entrada','Camada de entrada'],['operacao','Operação'],
  ['bases','Bases'],['ocorrencias','Ocorrências'],['parcela','Parcela da entrada'],['executor','Executada por'],['pacote','Pacote de saída']];
const OPERACOES={intersection:'Interseção',identity:'Identidade'};
let registros=[];
const selecionadas=new Set();

const dataHora=valor=>{const d=new Date(valor);return Number.isNaN(d.getTime())?'—':d.toLocaleString('pt-BR');};
const numero=(valor,casas=0)=>typeof valor==='number'&&Number.isFinite(valor)?valor.toLocaleString('pt-BR',{maximumFractionDigits:casas}):'—';

function registroDe(item){
  return {id:item.id,data:dataHora(item.criado_em),dataIso:item.criado_em,nome:item.nome_saida,entrada:item.entrada||'—',
    operacao:OPERACOES[item.operacao]||item.operacao,bases:numero(item.bases),basesValor:item.bases,
    ocorrencias:numero(item.resumo?.ocorrencias),ocorrenciasValor:item.resumo?.ocorrencias,
    parcela:typeof item.resumo?.percentual==='number'?`${numero(item.resumo.percentual,4)}%`:'—',parcelaValor:item.resumo?.percentual,
    executor:item.minha?'Você':'Outro usuário',pacote:`${item.pacote_nome} · ${numero((item.pacote_tamanho_bytes||0)/1000)} kB`,
    pacoteValor:item.pacote_tamanho_bytes};
}
function filtrados(){
  const coluna=$('#ea-indice-coluna').value,termo=$('#ea-indice-valor').value.trim().toLocaleLowerCase('pt-BR');
  if(!termo)return registros;
  return registros.filter(r=>(coluna?String(r[coluna]):COLUNAS.map(([chave])=>r[chave]).join(' ')).toLocaleLowerCase('pt-BR').includes(termo));
}
function atualizarOpcoes(){
  const coluna=$('#ea-indice-coluna').value;
  const valores=coluna?[...new Set(registros.map(r=>String(r[coluna])))].sort((a,b)=>a.localeCompare(b,'pt-BR',{numeric:true})):[];
  $('#ea-indice-opcoes').replaceChildren(...valores.map(v=>new Option('',v)));
}
function controles(){
  $('#ea-indice-abrir').disabled=selecionadas.size!==1;
  $('#ea-indice-baixar').disabled=!selecionadas.size;
  const visiveis=filtrados(),marcadas=visiveis.filter(r=>selecionadas.has(r.id)).length,todas=$('#ea-indice-todas');
  todas.checked=Boolean(visiveis.length)&&marcadas===visiveis.length;
  todas.indeterminate=marcadas>0&&marcadas<visiveis.length;
}
function render(){
  const linhas=filtrados(),tbody=$('#ea-indice-tbody');
  $('#ea-indice-contagem').textContent=`${linhas.length} de ${registros.length} registro(s)`;
  tbody.replaceChildren();
  if(!linhas.length){
    const tr=el('tr',undefined,'empty-row'),td=el('td',registros.length?'Nenhuma extração corresponde ao filtro.':'Nenhuma extração executada. Use Nova extração para começar.');
    td.colSpan=COLUNAS.length+1;tr.append(td);tbody.append(tr);controles();return;
  }
  for(const r of linhas){
    const tr=el('tr');tr.dataset.id=r.id;
    const selecao=el('td',undefined,'col-select'),caixa=el('input');
    caixa.type='checkbox';caixa.checked=selecionadas.has(r.id);caixa.setAttribute('aria-label',`Selecionar ${r.nome}`);
    caixa.addEventListener('change',()=>{if(caixa.checked)selecionadas.add(r.id);else selecionadas.delete(r.id);controles();});
    selecao.append(caixa);tr.append(selecao);
    const valores={data:r.dataIso,bases:r.basesValor,ocorrencias:r.ocorrenciasValor,parcela:r.parcelaValor,pacote:r.pacoteValor};
    for(const [chave] of COLUNAS){
      const td=el('td',r[chave]);
      if(valores[chave]!=null)td.dataset.sortValue=String(valores[chave]);
      tr.append(td);
    }
    tbody.append(tr);
  }
  controles();
}
async function carregar(){
  try{registros=(await json('/extracao-atributos/execucoes')).map(registroDe);}
  catch(error){registros=[];feedback(`Não foi possível carregar as extrações: ${error.message}`);}
  for(const id of [...selecionadas])if(!registros.some(r=>r.id===id))selecionadas.delete(id);
  atualizarOpcoes();render();
}

$('#ea-indice-coluna').append(...COLUNAS.map(([valor,rotulo])=>new Option(rotulo,valor)));
$('#ea-indice-coluna').addEventListener('change',()=>{$('#ea-indice-valor').value='';atualizarOpcoes();render();});
$('#ea-indice-valor').addEventListener('input',render);
$('#ea-indice-todas').addEventListener('change',event=>{
  for(const r of filtrados()){if(event.target.checked)selecionadas.add(r.id);else selecionadas.delete(r.id);}
  render();
});
$('#ea-indice-abrir').addEventListener('click',()=>{
  const [id]=selecionadas;if(!id)return;
  location.href=`/restrict/geoespacial/extracao-atributos/?execucao=${encodeURIComponent(id)}`;
});
$('#ea-indice-baixar').addEventListener('click',async()=>{
  const botao=$('#ea-indice-baixar'),formato=$('#ea-indice-arquivo').value,ids=[...selecionadas];
  botao.disabled=true;
  try{
    for(const id of ids)await adaptador.exportar({resultado_id:id,formato});
    feedback(`Download iniciado para ${ids.length} extração(ões).`);
  }catch(error){feedback(`Não foi possível baixar: ${error.message}`);}
  finally{controles();}
});
carregar();
