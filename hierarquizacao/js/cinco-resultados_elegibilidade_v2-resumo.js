import {el} from '../../geoespacial/extracao-atributos/ui.js';
import {resumoElegibilidade, formatarHa, formatarPercentual, formatarIndice} from './cinco-resultados_elegibilidade_v2-dados.js?v=resumo';

const COLUNAS = ['Objeto de demanda', 'Camadas de risco', 'Área de sobreposição', 'Porcentagem sobreposta', 'Índice de risco ambiental e territorial'];

/** Resumo da Elegibilidade: uma linha por demanda sem restrição; a demanda selecionada nos demais painéis fica destacada. */
export function criarResumo({tabela, contagem, aoSelecionar}) {
  function renderizar({demandas, selecao}) {
    const linhas = resumoElegibilidade(demandas);
    const cabecalho = el('tr');
    for (const titulo of COLUNAS) { const th = el('th', titulo); th.scope = 'col'; cabecalho.append(th); }
    const corpo = el('tbody');
    for (const r of linhas) {
      const ativa = selecao.chave === r.chave;
      const linha = el('tr', undefined, ativa ? 'ativo' : '');
      linha.dataset.chave = r.chave; linha.tabIndex = 0; linha.setAttribute('aria-selected', String(ativa));
      const camadas = el('td');
      if (r.camadas.length) r.camadas.forEach(nome => camadas.append(el('div', nome))); else camadas.textContent = 'Nenhuma camada de risco atingida';
      const indice = el('td', undefined, 'ev2-num');
      indice.append(el('strong', formatarIndice(r.indice)));
      linha.append(el('td', r.demanda), camadas, el('td', `${formatarHa(r.area_m2)} ha`, 'ev2-num'),
        el('td', formatarPercentual(r.percentual), 'ev2-num'), indice);
      const escolher = () => aoSelecionar({chave: r.chave, base: '', feicao: ''});
      linha.onclick = escolher;
      linha.onkeydown = event => { if (event.target === linha && ['Enter', ' '].includes(event.key)) { event.preventDefault(); escolher(); } };
      corpo.append(linha);
    }
    if (!linhas.length) {
      const linha = el('tr'), td = el('td', 'Nenhuma demanda sem restrição neste conjunto.');
      td.colSpan = COLUNAS.length; linha.append(td); corpo.append(linha);
    }
    const thead = el('thead'); thead.append(cabecalho);
    tabela.replaceChildren(thead, corpo);
    const total = demandas.length;
    contagem.textContent = `${linhas.length} de ${total} demanda(s) listada(s); as ${total - linhas.length} demanda(s) com restrição ficam fora desta tabela.`;
  }
  return {renderizar};
}
