import {el} from '../../geoespacial/extracao-atributos/ui.js';
import {nomeSobreposicao, ROTULOS, formatarHa, formatarPercentual} from './cinco-resultados_elegibilidade_v2-dados.js?v=trechos-origem';

const ns = 'http://www.w3.org/2000/svg';
const ANEL = {livre: '#d6f0df', padrao: '#dbe6ee'};
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
  let ampliado = false, demandaAtual = '', ultimo;
  const api = {
    renderizar({ficha, selecao, categorias}) {
      ultimo = {ficha, selecao, categorias};
      if (ficha?.chave !== demandaAtual) { ampliado = false; demandaAtual = ficha?.chave; }
      if (!ficha) { container.hidden = true; container.replaceChildren(); return; }
      container.hidden = false;
      const prefixo = `ev2-rosca-${++sequencia}`;
      const itens = ['restricao', 'risco'].filter(c => categorias.has(c)).flatMap(c => ficha.cats[c].feicoes);
      const desenhaveis = itens.filter(i => i.area_m2 > 0).sort((a, b) => b.area_m2 - a.area_m2);
      const svg = svgNode('svg', {viewBox: '0 0 240 240', class: 'ev2-rosca', role: 'group',
        'aria-label': `Área da demanda ${ficha.nome} e das áreas atingidas por restrição e risco`});
      const defs = svgNode('defs'), padroes = new Map();
      svg.append(defs);
      const padrao = (item, ativo) => {
        const papel = item.papel;
        const chave = `${item.id}-${ativo}`;
        if (!padroes.has(chave)) {
          const id = `${prefixo}-${padroes.size}`, cor = item.cor;
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
        const angulo = Math.min(2 * Math.PI, item.area_m2 / ficha.total * 2 * Math.PI);
        const caminho = svgNode('path', {
          d: setor(0, angulo), fill: `url(#${padrao(item, ativo)})`, stroke: ativo ? '#003b5a' : item.cor,
          'stroke-width': ativo ? 2 : .8, class: `ev2-arco${selecao.feicao && !ativo ? ' esmaecido' : ''}`,
          role: 'button', tabindex: 0, 'aria-pressed': ativo,
          'aria-label': `${nomeSobreposicao(item)}. A demanda ${ficha.nome} sobrepõe-se a ${item.nome} em ${formatarPercentual(item.percentual)} de sua área total.`,
        });
        caminho.dataset.feicao = item.id;
        caminho.append(svgNode('title', {}, `${nomeSobreposicao(item)}. A demanda ${ficha.nome} sobrepõe-se a ${item.nome} em ${formatarPercentual(item.percentual)} de sua área total.`));
        const escolher = () => aoSelecionar({chave: ficha.chave, base: item.base_id, feicao: item.id});
        caminho.onclick = escolher;
        caminho.onkeydown = event => { if (['Enter', ' '].includes(event.key)) { event.preventDefault(); escolher(); } };
        svg.append(caminho);
      }

      const centro = el('div', undefined, 'ev2-rosca-centro');
      centro.append(el('strong', ficha.situacao === 'livre' ? 'Livre de restrições e riscos' : `${formatarHa(ficha.total)} ha`),
        el('span', ficha.situacao === 'livre' ? `${formatarHa(ficha.total)} ha` : 'Área total da demanda'));
      const figura = el('div', undefined, 'ev2-rosca-figura');
      figura.append(svg, centro);

      const legenda = el('div', undefined, 'ev2-rosca-legenda');
      legenda.append(el('strong', ficha.nome),
        el('span', 'Anel inteiro: área total da demanda.', 'ev2-leg-demanda'),
        el('small', 'Cada cor identifica um trecho de sobreposição, com a mesma cor no mapa e na lista. Os arcos partem do mesmo ponto e podem coincidir.', 'ev2-secundario'));
      for (const item of desenhaveis) {
        const rotulo = el('span', `${nomeSobreposicao(item)} · ${ROTULOS[item.papel]} · ${formatarHa(item.area_m2)} ha`);
        rotulo.style.borderLeft = `4px solid ${item.cor}`; rotulo.style.paddingLeft = '8px';
        legenda.append(rotulo);
      }
      if (itens.some(i => i.area_m2 === 0)) {
        legenda.append(el('small', 'Polígonos que apenas tocam o limite da demanda não têm área e aparecem só na lista.', 'ev2-secundario'));
      }
      container.replaceChildren(figura, legenda);
      if (desenhaveis.length) {
        const botao = el('button', ampliado ? 'Fechar ampliação' : 'Ampliar sobreposições', 'ea-btn ev2-ampliar');
        botao.type = 'button'; botao.setAttribute('aria-expanded', String(ampliado));
        botao.onclick = () => { ampliado = !ampliado; api.renderizar(ultimo); };
        legenda.append(botao);
        if (desenhaveis.some(i => i.percentual < 2)) legenda.append(el('small', 'Há fatias pequenas. Amplie para comparar e selecionar cada trecho de sobreposição.', 'ev2-secundario'));
        if (ampliado) {
          const detalhe = el('div', undefined, 'ev2-ampliacao');
          const maximo = desenhaveis[0].area_m2;
          detalhe.append(el('strong', 'Sobreposições ampliadas — maior para menor'),
            el('small', `Escala das barras: 0 a ${formatarHa(maximo)} ha (${formatarPercentual(desenhaveis[0].percentual)} da demanda). Os percentuais continuam relativos à área total da demanda.`, 'ev2-secundario'));
          for (const item of desenhaveis) {
            const linha = el('button', undefined, `ev2-ampliacao-item ${item.papel}`);
            linha.type = 'button'; linha.dataset.feicao = item.id;
            linha.setAttribute('aria-pressed', String(selecao.feicao === item.id));
            const nome = nomeSobreposicao(item);
            linha.append(el('strong', nome), el('strong', `${formatarHa(item.area_m2)} ha · ${formatarPercentual(item.percentual)}`));
            const trilho = el('span', undefined, 'ev2-ampliacao-trilho'), barra = el('i');
            barra.style.width = `${item.area_m2 / maximo * 100}%`; barra.style.backgroundColor = item.cor;
            trilho.append(barra); linha.append(trilho);
            linha.onclick = () => aoSelecionar({chave: ficha.chave, base: item.base_id, feicao: item.id});
            detalhe.append(linha);
          }
          container.append(detalhe);
        }
      }
    },
  };
  return api;
}
