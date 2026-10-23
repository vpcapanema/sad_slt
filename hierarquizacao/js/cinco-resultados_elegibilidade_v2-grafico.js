import {el} from '../../geoespacial/extracao-atributos/ui.js';
import {conclusaoSobreposicao} from './elegibilidade-conclusao.js?v=1';
import {
  SITUACOES, ORDEM_SITUACOES, ROTULOS, formatarKm2, formatarHa, formatarPercentual, ordenarDemandas, descreverSituacao, indicadores,
} from './cinco-resultados_elegibilidade_v2-dados.js?v=poligonos';

/** Cards de situação (filtram ao clicar) e lista de demandas com a resposta em palavras. */
export function criarGrafico({cards, lista, aoSelecionar, aoFiltrar}) {
  function desenharCards({fichas, entrada, situacao}) {
    const contagem = indicadores(fichas, entrada);
    const itens = [['todas', contagem.total, 'Demandas analisadas', `${contagem.camadas} camadas de restrição e de risco consultadas`],
      ...ORDEM_SITUACOES.map(s => [s, contagem[s], SITUACOES[s],
        `${formatarPercentual(contagem.total ? contagem[s] / contagem.total * 100 : 0)} das demandas`])];
    cards.replaceChildren(...itens.map(([chave, valor, rotulo, apoio]) => {
      const botao = el('button', undefined, `ev2-card sit-${chave}`);
      botao.type = 'button'; botao.dataset.situacao = chave;
      botao.setAttribute('aria-pressed', String(situacao === chave));
      botao.setAttribute('aria-label', `${rotulo}: ${valor} ${chave === 'todas' ? 'demandas' : `de ${contagem.total} demandas`}. Selecione para filtrar.`);
      const trilho = el('span', undefined, 'ev2-card-trilho'), preenchimento = el('i');
      preenchimento.style.width = `${contagem.total ? valor / contagem.total * 100 : 0}%`; preenchimento.hidden = !valor;
      trilho.append(preenchimento);
      botao.append(el('strong', valor.toLocaleString('pt-BR')), el('span', rotulo), el('small', apoio), trilho);
      botao.onclick = () => aoFiltrar(chave);
      return botao;
    }));
  }

  function itens(d, categorias, selecao) {
    const bloco = el('div', undefined, 'ev2-feicoes');
    bloco.setAttribute('role', 'group'); bloco.setAttribute('aria-label', `O que foi encontrado em ${d.nome}`);
    if (d.situacao === 'livre') {
      bloco.append(el('p', 'Nenhuma restrição ou risco foi encontrado para esta demanda nas camadas consultadas.', 'ea-hint'));
      return bloco;
    }
    const encontrados = ['restricao', 'risco'].filter(c => categorias.has(c)).flatMap(c => d.cats[c].feicoes)
      .sort((a, b) => b.area_m2 - a.area_m2);
    if (!encontrados.length) bloco.append(el('p', 'Nada a mostrar nas categorias selecionadas.', 'ea-hint'));
    for (const item of encontrados) {
      const botao = el('button', undefined, `ev2-feicao ${item.papel}`);
      botao.type = 'button'; botao.dataset.feicao = item.id;
      botao.setAttribute('aria-pressed', String(selecao.feicao === item.id));
      const nome = el('span', undefined, 'ev2-feicao-nome');
      nome.append(el('strong', `${item.numero_poligono ? `${item.area_m2 > 0 ? 'Polígono' : 'Contato'} ${item.numero_poligono} · ` : ''}${item.nome}`), el('small', `${ROTULOS[item.papel]} · Camada consultada: ${item.camada}`));
      const detalhe = el('span', undefined, 'ev2-feicao-valor');
      detalhe.append(conclusaoSobreposicao(d, item, {nome:item.camada}, item.atributosConsultados));
      botao.append(nome, detalhe);
      botao.onclick = event => { event.stopPropagation(); aoSelecionar({chave: d.chave, base: item.base_id, feicao: item.id}); };
      bloco.append(botao);
    }
    return bloco;
  }

  return {
    renderizar({fichas, entrada, demandas, visiveis, categorias, selecao, ordem, situacao, rolar}) {
      desenharCards({fichas, entrada, situacao});
      const rolagem = lista.scrollTop;
      const exibidas = ordenarDemandas(demandas, ordem).filter(d => visiveis.has(d.chave));
      if (!exibidas.length) {
        lista.replaceChildren(el('p', 'Nenhuma demanda corresponde aos filtros atuais.', 'ea-hint'));
        return;
      }
      lista.replaceChildren(...exibidas.map(d => {
        const ativa = selecao.chave === d.chave;
        const linha = el('div', undefined, `ev2-linha${ativa ? ' ativa' : selecao.chave ? ' esmaecida' : ''}`);
        linha.dataset.chave = d.chave;
        const botao = el('button', undefined, `ev2-linha-botao sit-${d.situacao}`);
        botao.type = 'button';
        botao.setAttribute('aria-pressed', String(ativa && !selecao.feicao));
        botao.setAttribute('aria-expanded', String(ativa));
        const frases = descreverSituacao(d, 2).map(f => f.texto).join(' ');
        botao.setAttribute('aria-label', `${d.nome}. ${SITUACOES[d.situacao]}. ${frases}`);
        const texto = el('span', undefined, 'ev2-linha-texto');
        texto.append(el('span', d.nome, 'ev2-linha-nome'));
        if (d.situacao !== 'livre') {
          for (const f of descreverSituacao(d, 2)) texto.append(el('small', f.texto, `ev2-linha-resumo ${f.categoria}`));
        }
        botao.append(texto, el('span', SITUACOES[d.situacao], `ev2-selo sit-${d.situacao}`));
        botao.onclick = () => aoSelecionar({chave: d.chave});
        linha.append(botao);
        if (ativa) linha.append(itens(d, categorias, selecao));
        return linha;
      }));
      const ativa = lista.querySelector('.ev2-linha.ativa');
      if (rolar && ativa) ativa.scrollIntoView({block: 'nearest'});
      else lista.scrollTop = rolagem;
    },
  };
}
