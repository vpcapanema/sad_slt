import {el} from '../../geoespacial/extracao-atributos/ui.js';

const ns = 'http://www.w3.org/2000/svg';
export const numeroSobreposicao = valor => valor.toLocaleString('pt-BR', {
  minimumFractionDigits:2, maximumFractionDigits:valor !== 0 && Math.abs(valor) < .01 ? 20 : 2,
});
const svgNode = (tag, atributos, texto) => {
  const node = document.createElementNS(ns, tag);
  for (const [chave, valor] of Object.entries(atributos)) node.setAttribute(chave, String(valor));
  if (texto !== undefined) node.textContent = texto;
  return node;
};

export function sobreposicoesDaAnalise(entradas) {
  return entradas.flatMap((entrada, entradaIndice) => {
    const bases = new Map(entrada.campos.map(c => [c.id, c]));
    return entrada.linhas.flatMap(linha => linha.sobreposicoes.map(c => ({
      ...c, entradaIndice, entradaId:entrada.id, entradaNome:entrada.nome,
      demandaChave:linha.chave, demandaId:linha.id, demandaNome:linha.nome || `Demanda ${linha.id}`,
      baseNome:bases.get(c.base_id).nome,
      chave:JSON.stringify([entrada.id, linha.chave, c.base_id, c.id]),
    })));
  });
}

export function renderizarRosca({svg, legenda, itens, cor, selecionada=() => false, aoSelecionar}) {
  svg.replaceChildren(); legenda.replaceChildren();
  const total = itens.reduce((s, item) => s + item.area_m2, 0);
  svg.dataset.totalM2 = String(total);
  svg.dataset.sobreposicoes = String(itens.length);
  svg.append(svgNode('circle', {cx:120, cy:120, r:84, fill:'none', stroke:'#edf1f4', 'stroke-width':38}));
  const ponto = (r, a) => `${120+r*Math.cos(a)},${120+r*Math.sin(a)}`;
  let inicio = -Math.PI/2;
  for (const [indice, item] of itens.entries()) {
    const corItem = cor ? cor(item) : `hsl(${(indice*137.508)%360} 47% 42%)`;
    const destacada = selecionada(item), proporcao = total ? item.area_m2/total : 0;
    const identificacao = `${item.entradaNome} · ${item.demandaNome} [${item.demandaId}] · ${item.baseNome} · ${item.nome} [${item.identificador}]`;
    const valor = item.area_m2 === 0 ? 'Contato sem área' : `${numeroSobreposicao(item.area_m2)} m² · ${numeroSobreposicao(proporcao*100)}% da soma`;
    const rotulo = `${identificacao} · ${valor}`;
    const escolher = () => aoSelecionar(item);
    if (item.area_m2 > 0) {
      const fim = inicio + Math.min(proporcao*2*Math.PI, 2*Math.PI-.000001), grande = fim-inicio > Math.PI ? 1 : 0;
      const d = `M ${ponto(103,inicio)} A 103 103 0 ${grande} 1 ${ponto(103,fim)} L ${ponto(65,fim)} A 65 65 0 ${grande} 0 ${ponto(65,inicio)} Z`;
      const path = svgNode('path', {d, fill:corItem, tabindex:0, role:'button',
        'aria-label':rotulo, 'aria-pressed':String(destacada), 'data-classe':item.id,
        'data-sobreposicao':item.chave, 'data-area-m2':item.area_m2});
      path.append(svgNode('title', {}, rotulo)); path.onclick = escolher;
      path.onkeydown = event => { if (['Enter',' '].includes(event.key)) { event.preventDefault(); escolher(); } };
      svg.append(path); inicio = fim;
    }
    const botao = el('button', undefined, `evr-classe${destacada ? ' ativa' : ''}`);
    botao.type = 'button'; botao.dataset.classe = item.id; botao.dataset.sobreposicao = item.chave;
    botao.setAttribute('aria-pressed', String(destacada)); botao.setAttribute('aria-label', rotulo);
    botao.title = rotulo;
    const pontoCor = el('span', undefined, 'evr-ponto'); pontoCor.style.background = corItem;
    const texto = el('span', `${item.demandaNome} [${item.demandaId}] · ${item.nome}`);
    texto.append(el('small', `${item.entradaNome} · ${item.baseNome} · Feição ${item.identificador}`), el('small', valor));
    botao.append(pontoCor, texto); botao.onclick = escolher; legenda.append(botao);
  }
  svg.append(svgNode('text', {x:120, y:117, 'text-anchor':'middle', fill:'#003b5a', 'font-size':30, 'font-weight':'bold'}, itens.length));
  svg.append(svgNode('text', {x:120, y:139, 'text-anchor':'middle', fill:'#637b8d', 'font-size':12},
    itens.length ? 'Sobreposições' : 'Sem Interseção'));
}
