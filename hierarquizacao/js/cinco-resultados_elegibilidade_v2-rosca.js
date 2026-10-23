import {el} from '../../geoespacial/extracao-atributos/ui.js';
import {ROTULOS, formatarKm2, formatarHa, formatarPercentual} from './cinco-resultados_elegibilidade_v2-dados.js?v=2';

const ns = 'http://www.w3.org/2000/svg';
const CORES_ARCO = {restricao: '#b42335', risco: '#c18b00'};
const ANEL = {livre: '#d6f0df', padrao: '#dbe6ee'};
const MINIMO = .02;
let sequencia = 0;

const svgNode = (tag, atributos = {}, texto) => {
  const node = document.createElementNS(ns, tag);
  for (const [chave, valor] of Object.entries(atributos)) node.setAttribute(chave, String(valor));
  if (texto !== undefined) node.textContent = texto;
  return node;
};

// Ângulos em radianos a partir do topo, no sentido horário.
function setor(inicio, fim, externo = 103, interno = 65) {
  const ponto = (r, a) => `${120 + r * Math.cos(a - Math.PI / 2)},${120 + r * Math.sin(a - Math.PI / 2)}`;
  if (fim - inicio >= 2 * Math.PI - 1e-9) {
    const meio = (inicio + fim) / 2;
    return `M ${ponto(externo, inicio)} A ${externo} ${externo} 0 1 1 ${ponto(externo, meio)} A ${externo} ${externo} 0 1 1 ${ponto(externo, fim)}`
      + ` L ${ponto(interno, fim)} A ${interno} ${interno} 0 1 0 ${ponto(interno, meio)} A ${interno} ${interno} 0 1 0 ${ponto(interno, inicio)} Z`;
  }
  const grande = fim - inicio > Math.PI ? 1 : 0;
  return `M ${ponto(externo, inicio)} A ${externo} ${externo} 0 ${grande} 1 ${ponto(externo, fim)}`
    + ` L ${ponto(interno, fim)} A ${interno} ${interno} 0 ${grande} 0 ${ponto(interno, inicio)} Z`;
}

/**
 * Rosca da demanda selecionada: o anel inteiro é a área total da demanda; sobre ele, um arco hachurado para cada
 * polígono de restrição ou de risco que a atinge (área atingida ÷ área da demanda). Os arcos partem do mesmo ponto
 * e podem coincidir; os menores ficam por cima para continuarem selecionáveis.
 */
export function criarRosca({container, aoSelecionar}) {
  return {
    renderizar({ficha, selecao, categorias}) {
      if (!ficha) { container.hidden = true; container.replaceChildren(); return; }
      container.hidden = false;
      const prefixo = `ev2-rosca-${++sequencia}`;
      const itens = ['restricao', 'risco'].filter(c => categorias.has(c)).flatMap(c => ficha.cats[c].feicoes);
      const desenhaveis = itens.filter(i => i.area_m2 > 0).sort((a, b) => b.area_m2 - a.area_m2);
      const svg = svgNode('svg', {viewBox: '0 0 240 240', class: 'ev2-rosca', role: 'group',
        'aria-label': `Área da demanda ${ficha.nome} e das áreas atingidas por restrição e risco`});
      const defs = svgNode('defs'), padroes = new Map();
      svg.append(defs);
      const padrao = (papel, ativo) => {
        const chave = `${papel}-${ativo}`;
        if (!padroes.has(chave)) {
          const id = `${prefixo}-${padroes.size}`, cor = CORES_ARCO[papel];
          const pattern = svgNode('pattern', {id, width: 6, height: 6, patternUnits: 'userSpaceOnUse',
            patternTransform: `rotate(${papel === 'restricao' ? 45 : -45})`});
          pattern.append(svgNode('rect', {width: 6, height: 6, fill: cor, 'fill-opacity': ativo ? .45 : .22}),
            svgNode('line', {x1: 0, y1: 0, x2: 0, y2: 6, stroke: cor, 'stroke-width': 1.6, 'stroke-opacity': .95}));
          defs.append(pattern); padroes.set(chave, id);
        }
        return padroes.get(chave);
      };
      svg.append(svgNode('path', {d: setor(0, 2 * Math.PI), fill: ficha.situacao === 'livre' ? ANEL.livre : ANEL.padrao,
        class: 'ev2-rosca-anel'}, undefined));
      for (const item of desenhaveis) {
        const ativo = selecao.feicao === item.id;
        const angulo = Math.min(2 * Math.PI, Math.max(MINIMO, item.area_m2 / ficha.total * 2 * Math.PI));
        const caminho = svgNode('path', {
          d: setor(0, angulo), fill: `url(#${padrao(item.papel, ativo)})`, stroke: ativo ? '#003b5a' : CORES_ARCO[item.papel],
          'stroke-width': ativo ? 2 : .8, class: `ev2-arco${selecao.feicao && !ativo ? ' esmaecido' : ''}`,
          role: 'button', tabindex: 0, 'aria-pressed': ativo,
          'aria-label': `${ROTULOS[item.papel]}: ${item.nome}. Atinge ${formatarPercentual(item.percentual)} da demanda.`,
        });
        caminho.dataset.feicao = item.id;
        caminho.append(svgNode('title', {}, `${ROTULOS[item.papel]}: ${item.nome} · atinge ${formatarPercentual(item.percentual)} da demanda (${formatarKm2(item.area_m2)} km²)`));
        const escolher = () => aoSelecionar({chave: ficha.chave, base: item.base_id, feicao: item.id});
        caminho.onclick = escolher;
        caminho.onkeydown = event => { if (['Enter', ' '].includes(event.key)) { event.preventDefault(); escolher(); } };
        svg.append(caminho);
      }

      const centro = el('div', undefined, 'ev2-rosca-centro');
      centro.append(el('strong', ficha.situacao === 'livre' ? 'Livre de restrições e riscos' : `${formatarKm2(ficha.total)} km²`),
        el('span', ficha.situacao === 'livre' ? `${formatarKm2(ficha.total)} km² · ${formatarHa(ficha.total)} ha` : 'Área total da demanda'));
      const figura = el('div', undefined, 'ev2-rosca-figura');
      figura.append(svg, centro);

      const legenda = el('div', undefined, 'ev2-rosca-legenda');
      const contagem = papel => ficha.cats[papel].n;
      legenda.append(el('strong', ficha.nome),
        el('span', 'Anel inteiro: área total da demanda.', 'ev2-leg-demanda'),
        el('span', `Arco vermelho hachurado: polígono de restrição (${contagem('restricao')}).`, 'ev2-leg-restricao'),
        el('span', `Arco amarelo hachurado: polígono de risco (${contagem('risco')}).`, 'ev2-leg-risco'),
        el('small', 'Cada arco é a área atingida por um polígono, em relação à área da demanda. Os arcos partem do mesmo ponto e podem coincidir. Selecione um arco para vê-lo no mapa com seus atributos.', 'ev2-secundario'));
      if (itens.some(i => i.area_m2 === 0)) {
        legenda.append(el('small', 'Polígonos que apenas tocam o limite da demanda não têm área e aparecem só na lista.', 'ev2-secundario'));
      }
      container.replaceChildren(figura, legenda);
    },
  };
}
