import {el} from '../../geoespacial/extracao-atributos/ui.js';
import {ROTULOS, SITUACOES, formatarHa, formatarPercentual} from './cinco-resultados_elegibilidade_v2-dados.js?v=hectares-camadas';

const TAMANHO = 50;
const COLUNAS = ['Demanda', 'Situação', 'Tipo', 'Restrição ou risco encontrado', 'Camada consultada', 'Área de sobreposição', '% da área da demanda'];

/** Tabela de registros demanda × item encontrado; a seleção filtra os registros e destaca as linhas correspondentes. */
export function criarTabela({tabela, anterior, proxima, rotulo, contagem, aoSelecionar}) {
  let pagina = 0, ultimo = {registros: [], selecao: {chave: '', feicao: ''}};
  anterior.onclick = () => { pagina--; desenhar(); };
  proxima.onclick = () => { pagina++; desenhar(); };

  function desenhar() {
    const {registros, selecao, total} = ultimo;
    const paginas = Math.max(1, Math.ceil(registros.length / TAMANHO));
    pagina = Math.min(Math.max(pagina, 0), paginas - 1);
    const cabecalho = el('tr');
    for (const titulo of COLUNAS) { const th = el('th', titulo); th.scope = 'col'; cabecalho.append(th); }
    const corpo = el('tbody');
    for (const r of registros.slice(pagina * TAMANHO, (pagina + 1) * TAMANHO)) {
      const ativa = Boolean(selecao.chave) && r.chave === selecao.chave && (!selecao.feicao || r.feicao_id === selecao.feicao);
      const linha = el('tr', undefined, `${ativa ? 'ativo' : ''}${r.sem ? ' sem-intersecao' : ''}`.trim());
      linha.dataset.chave = r.chave; linha.dataset.feicao = r.feicao_id || '';
      linha.tabIndex = 0; linha.setAttribute('aria-selected', String(ativa));
      linha.append(el('td', r.demanda), el('td', SITUACOES[r.situacao], `ev2-situacao sit-${r.situacao}`));
      if (r.sem) {
        const td = el('td', 'Nenhuma restrição ou risco encontrado nas camadas consultadas.');
        td.colSpan = COLUNAS.length - 2; linha.append(td);
      } else {
        const area = el('td', undefined, 'ev2-num');
        area.append(r.area_m2 === 0 ? el('span', 'Apenas toca o limite') : el('strong', `${formatarHa(r.area_m2)} ha`));
        linha.append(el('td', ROTULOS[r.categoria], `ev2-cat ${r.categoria}`), el('td', `${r.numero_poligono ? `${r.area_m2 > 0 ? 'Polígono' : 'Contato'} ${r.numero_poligono} · ` : ''}${r.feicao}`), el('td', r.camada), area,
          el('td', r.area_m2 === 0 ? '—' : formatarPercentual(r.percentual), 'ev2-num'));
      }
      const escolher = () => aoSelecionar({chave: r.chave, base: r.base_id || '', feicao: r.feicao_id || ''});
      linha.onclick = escolher;
      linha.onkeydown = event => { if (event.target === linha && ['Enter', ' '].includes(event.key)) { event.preventDefault(); escolher(); } };
      corpo.append(linha);
    }
    if (!registros.length) {
      const linha = el('tr'), td = el('td', 'Nenhum registro corresponde aos filtros e à seleção atuais.');
      td.colSpan = COLUNAS.length; linha.append(td); corpo.append(linha);
    }
    const thead = el('thead'); thead.append(cabecalho);
    tabela.replaceChildren(thead, corpo);
    rotulo.textContent = `Página ${pagina + 1} de ${paginas}`;
    contagem.textContent = registros.length
      ? `${registros.length} de ${total} registro(s) exibido(s).` : `0 de ${total} registro(s) exibido(s).`;
    anterior.dataset.limite = String(pagina === 0); proxima.dataset.limite = String(pagina + 1 >= paginas);
  }

  return {
    renderizar(dados, {reiniciar = false} = {}) {
      if (reiniciar) pagina = 0;
      ultimo = {...dados};
      desenhar();
    },
    // Os botões de paginação respeitam o bloqueio do controlador (operação em andamento).
    limites() {
      return {anterior: anterior.dataset.limite === 'true', proxima: proxima.dataset.limite === 'true'};
    },
  };
}
