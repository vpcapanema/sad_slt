import {el} from '../../geoespacial/extracao-atributos/ui.js';

export const indiceTexto = valor => valor.estado_indice === 'valido'
  ? valor.indice.toLocaleString('pt-BR', {minimumFractionDigits:4, maximumFractionDigits:15})
  : {ausente:'Campo ausente', nulo:'Sem valor', invalido:'Índice inválido (0–1)'}[valor.estado_indice];
export const classeTexto = valor => valor.estado_classe === 'valido' ? String(valor.classe)
  : valor.estado_classe === 'ausente' ? 'Campo de classe ausente' : 'Sem classe informada';

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
  const marcas = el('span',undefined,'fv-dot-marcas');
  marcas.append(el('span','0'),el('span','0,5'),el('span','1'));
  eixo.append(el('span','Escala fixa (0–1)'),marcas,el('span','Índice · Classe'));
  container.append(eixo);
  if (!itens.length) container.append(el('p','Sem interseção; nenhum índice ou classe atribuído.','ea-hint'));
  for (const item of itens) {
    const valor = item.favorabilidade, ativa = selecionada(item);
    const botao = el('button',undefined,`fv-dot-linha${ativa ? ' ativa' : ''}`);
    botao.type = 'button'; botao.dataset.sobreposicao = item.chave;
    botao.dataset.indice = valor.indice === null ? '' : String(valor.indice);
    botao.setAttribute('aria-pressed',String(ativa));
    const rotulo = `${item.entradaNome} · ${item.demandaNome} [${item.demandaId}] · ${item.baseNome} · ${item.nome} [${item.identificador}]`;
    botao.setAttribute('aria-label',`${rotulo} · ${valor.campo_indice}: ${indiceTexto(valor)} · ${valor.campo_classe}: ${classeTexto(valor)}${item.area_m2 === 0 ? ' · Contato sem área' : ''}`);
    const nome = el('span',`${item.demandaNome} [${item.demandaId}] · ${item.nome} [${item.identificador}]`,'fv-dot-nome');
    nome.append(el('small',`${item.entradaNome} · ${item.baseNome}`));
    const faixa = el('span',undefined,'fv-dot-faixa');
    faixa.setAttribute('aria-hidden','true');
    if (valor.estado_indice === 'valido') {
      const ponto = el('span',undefined,'fv-dot-ponto');
      ponto.style.left = `${valor.indice*100}%`; ponto.style.background = corIndice(valor.indice);
      faixa.append(ponto);
    } else faixa.append(el('span','—','fv-dot-sem-valor'));
    const texto = el('span',indiceTexto(valor),'fv-dot-valor');
    texto.append(el('small',classeTexto(valor)),el('small',valor.campo_indice),
      ...(item.area_m2 === 0 ? [el('small','Contato sem área')] : []));
    botao.append(nome,faixa,texto); botao.onclick = () => aoSelecionar(item); container.append(botao);
  }
}
