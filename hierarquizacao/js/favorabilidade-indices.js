import {el} from '../../geoespacial/extracao-atributos/ui.js';

export const formatarIndice = valor => valor.toLocaleString('pt-BR', {
  minimumFractionDigits:2, maximumFractionDigits:2,
});
export const indiceTexto = valor => valor.estado_indice === 'valido'
  ? formatarIndice(valor.indice)
  : {ausente:'Campo ausente', nulo:'Sem valor', invalido:'Índice inválido (0–1)'}[valor.estado_indice];
export const classeTexto = valor => valor.estado_classe === 'valido'
  ? String(valor.classe).toLocaleLowerCase('pt-BR').replace(/\p{L}[\p{L}\p{M}]*/gu,
    palavra => palavra[0].toLocaleUpperCase('pt-BR')+palavra.slice(1))
  : valor.estado_classe === 'ausente' ? 'Campo de classe ausente' : 'Sem classe informada';

export function compararIndices(a, b) {
  const validoA = a?.estado_indice === 'valido', validoB = b?.estado_indice === 'valido';
  return validoA && validoB ? b.indice - a.indice : Number(validoB) - Number(validoA);
}

export function corIndice(valor) {
  if (valor === null) return '#808080';
  const cores = ['440154','3b528b','21918c','5ec962','fde725'];
  const posicao = valor * (cores.length-1), inicio = Math.min(Math.floor(posicao), cores.length-2);
  const fracao = posicao-inicio;
  return '#' + [0,2,4].map(i => Math.round(
    parseInt(cores[inicio].slice(i,i+2),16)*(1-fracao) + parseInt(cores[inicio+1].slice(i,i+2),16)*fracao,
  ).toString(16).padStart(2,'0')).join('');
}

export function renderizarIndices({container, itens, selecionada, aoSelecionar}) {
  container.replaceChildren();
  container.dataset.combinacoes = String(itens.length);
  container.dataset.escalaMin = '0'; container.dataset.escalaMax = '1';
  const eixo = el('div',undefined,'fv-dot-eixo');
  eixo.append(el('span','Demanda'),el('span','Classe de Favorabilidade'),
    el('span','Índice de Favorabilidade Dimensionada (0–1) ↓'));
  container.append(eixo);
  if (!itens.length) container.append(el('p','Sem interseção; nenhum índice ou classe atribuído.','ea-hint'));
  for (const item of [...itens].sort((a,b) => compararIndices(a.favorabilidade,b.favorabilidade))) {
    const valor = item.favorabilidade, ativa = selecionada(item);
    const botao = el('button',undefined,`fv-dot-linha${ativa ? ' ativa' : ''}`);
    botao.type = 'button'; botao.dataset.sobreposicao = item.chave;
    botao.dataset.indice = valor.indice === null ? '' : String(valor.indice);
    botao.setAttribute('aria-pressed',String(ativa));
    const rotulo = `${item.entradaNome} · ${item.demandaNome} [${item.demandaId}] · ${item.baseNome} · ${item.nome} [${item.identificador}]`;
    botao.title = rotulo + (item.area_m2 === 0 ? ' · Contato sem área' : '');
    botao.setAttribute('aria-label',`${rotulo} · ${valor.campo_indice}: ${indiceTexto(valor)} · ${valor.campo_classe}: ${classeTexto(valor)}${item.area_m2 === 0 ? ' · Contato sem área' : ''}`);
    const nome = el('span',item.demandaNome,'fv-dot-nome');
    const classe = el('span',classeTexto(valor),'fv-dot-classe');
    const texto = el('span',indiceTexto(valor),'fv-dot-valor');
    botao.append(nome,classe,texto); botao.onclick = () => aoSelecionar(item); container.append(botao);
  }
}
