import { $, el, feedback } from './ui.js';
import { json, adaptador, base } from './api.js';

// Índice da extração de atributos, no padrão das tabelas da plataforma: filtro
// Coluna/Valor, seleção por linha, coluna Ação com botões-ícone e ações em lote
// (editar, cancelar, salvar, excluir) abaixo da tabela. A ordenação por coluna
// vem do table-sort.js carregado pela página base.
const COLUNAS=[['data','Data da extração'],['nome','Nome da saída'],['entrada','Camada de entrada'],['operacao','Operação'],
  ['bases','Bases'],['ocorrencias','Ocorrências'],['parcela','Parcela da entrada'],['executor','Executada por'],['pacote','Pacote de saída']];
const OPERACOES={intersection:'Interseção',identity:'Identidade'};
let registros=[];
let editando=false;
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
  const tem=selecionadas.size>0;
  $('#ea-indice-bulk-edit').disabled=!tem||editando;
  $('#ea-indice-bulk-cancel').disabled=!editando;
  $('#ea-indice-bulk-save').disabled=!editando||!tem;
  $('#ea-indice-bulk-delete').disabled=!tem||editando;
  const visiveis=filtrados(),marcadas=visiveis.filter(r=>selecionadas.has(r.id)).length,todas=$('#ea-indice-todas');
  todas.checked=Boolean(visiveis.length)&&marcadas===visiveis.length;
  todas.indeterminate=marcadas>0&&marcadas<visiveis.length;
}
function botaoAcao(icone,titulo,acao,classe=''){
  const botao=el('button',undefined,`admin-icon-btn ${classe}`.trim());
  botao.type='button';botao.title=titulo;botao.setAttribute('aria-label',titulo);
  const simbolo=el('i',undefined,`fas ${icone}`);simbolo.setAttribute('aria-hidden','true');
  botao.append(simbolo);botao.addEventListener('click',acao);
  return botao;
}
// O relatório abre renderizado numa nova aba; só o pacote .zip é baixado.
function abrirRelatorio(id,tipo){
  window.open(`${base}/extracao-atributos/execucoes/${encodeURIComponent(id)}/relatorios/${tipo}`,'_blank','noopener');
}
async function baixarPacote(r,botao){
  botao.disabled=true;
  try{await adaptador.exportar({resultado_id:r.id});feedback(`Download do pacote iniciado: ${r.nome}.`);}
  catch(error){feedback(`Não foi possível baixar o pacote: ${error.message}`);}
  finally{botao.disabled=false;}
}
function render(){
  const linhas=filtrados(),tbody=$('#ea-indice-tbody');
  $('#ea-indice-contagem').textContent=`${linhas.length} de ${registros.length} registro(s)`;
  tbody.replaceChildren();
  if(!linhas.length){
    const tr=el('tr',undefined,'empty-row'),td=el('td',registros.length?'Nenhuma extração corresponde ao filtro.':'Nenhuma extração executada. Use Nova extração para começar.');
    td.colSpan=COLUNAS.length+2;tr.append(td);tbody.append(tr);controles();return;
  }
  for(const r of linhas){
    const tr=el('tr');tr.dataset.id=r.id;
    const selecao=el('td',undefined,'col-select'),caixa=el('input');
    caixa.type='checkbox';caixa.checked=selecionadas.has(r.id);caixa.setAttribute('aria-label',`Selecionar ${r.nome}`);
    caixa.addEventListener('change',()=>{if(caixa.checked)selecionadas.add(r.id);else selecionadas.delete(r.id);controles();});
    selecao.append(caixa);tr.append(selecao);

    const acao=el('td',undefined,'col-acao'),botoes=el('div',undefined,'ea-acoes-linha');
    const pacote=botaoAcao('fa-file-zipper',`Baixar o pacote de saída (.zip) de ${r.nome}`,()=>baixarPacote(r,pacote),'admin-icon-btn-primary');
    botoes.append(
      botaoAcao('fa-map-location-dot',`Visualizar no mapa a geometria de saída de ${r.nome}`,
        ()=>{location.href=`/restrict/geoespacial/visualizador-camadas/?extracao=${encodeURIComponent(r.id)}`;}),
      botaoAcao('fa-gears',`Visualizar o relatório de processamento de ${r.nome}`,()=>abrirRelatorio(r.id,'processamento')),
      botaoAcao('fa-magnifying-glass-chart',`Visualizar o relatório analítico de ${r.nome}`,()=>abrirRelatorio(r.id,'analitico')),
      pacote);
    acao.append(botoes);tr.append(acao);

    const valores={data:r.dataIso,bases:r.basesValor,ocorrencias:r.ocorrenciasValor,parcela:r.parcelaValor,pacote:r.pacoteValor};
    for(const [chave] of COLUNAS){
      const td=el('td',r[chave]);
      if(valores[chave]!=null)td.dataset.sortValue=String(valores[chave]);
      if(chave==='nome'&&editando&&selecionadas.has(r.id)){
        const campo=el('input');campo.type='text';campo.maxLength=200;campo.value=r.nome;campo.dataset.k='nome_saida';
        campo.setAttribute('aria-label',`Nome da saída de ${r.nome}`);td.textContent='';td.append(campo);
      }
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
$('#ea-indice-bulk-edit').addEventListener('click',()=>{if(!selecionadas.size)return;editando=true;render();});
$('#ea-indice-bulk-cancel').addEventListener('click',()=>{editando=false;render();});
$('#ea-indice-bulk-save').addEventListener('click',async()=>{
  try{
    for(const id of selecionadas){
      const campo=[...$('#ea-indice-tbody').querySelectorAll('tr[data-id]')].find(tr=>tr.dataset.id===id)?.querySelector('[data-k="nome_saida"]');
      if(!campo)continue;
      await json(`/extracao-atributos/execucoes/${encodeURIComponent(id)}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({nome_saida:campo.value})});
    }
    editando=false;feedback('Alterações salvas.');
  }catch(error){feedback(`Não foi possível salvar: ${error.message}`);return;}
  await carregar();
});
$('#ea-indice-bulk-delete').addEventListener('click',async()=>{
  const ids=[...selecionadas];if(!ids.length)return;
  if(!window.confirm(`Excluir definitivamente ${ids.length} extração(ões)? A geometria de saída, os relatórios e o pacote serão apagados. Esta ação não pode ser desfeita.`))return;
  try{
    for(const id of ids){
      const resposta=await fetch(`${base}/extracao-atributos/execucoes/${encodeURIComponent(id)}`,{method:'DELETE'});
      if(!resposta.ok){const dados=await resposta.json().catch(()=>({}));throw new Error(dados.detail||'Falha ao excluir.');}
      selecionadas.delete(id);
    }
    feedback(`${ids.length} extração(ões) excluída(s).`);
  }catch(error){feedback(`Não foi possível excluir: ${error.message}`);}
  await carregar();
});
carregar();
