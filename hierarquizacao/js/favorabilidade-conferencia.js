import {el} from '../../geoespacial/extracao-atributos/ui.js';
import {criarFiltroResultados, paginarResultados} from './elegibilidade-tabelas.js?v=20261023-resumo-medidas';

export function criarConferencia(papel) {
  const prefixo = `fv-conferencia-${papel}`;
  const host = document.getElementById(`${prefixo}-paginacao`).closest('section');
  const body = document.getElementById(`fv-run-${papel}`);
  const visualizar = document.getElementById(`${prefixo}-visualizar`);
  let linhas = [], pagina = 0, selecionada = '', bloqueado = false;
  const colunas = [
    {id:'nome', nome:'Camada', valor:l => l.nome},
    {id:'arquivo', nome:'Arquivo ou referência integral', valor:l => l.arquivo || l.id},
  ];
  const filtro = criarFiltroResultados(`${prefixo}-filtro`, () => { pagina = 0; desenhar(); });
  function controles() {
    host.querySelectorAll('button,select').forEach(b => { b.disabled = bloqueado || b.dataset.limite === 'true'; });
    visualizar.disabled = bloqueado || !filtro.filtrar(linhas).some(l => l.id === selecionada);
    filtro.controles(bloqueado);
  }
  function desenhar() {
    const lista = filtro.filtrar(linhas);
    const resultado = paginarResultados({prefixo, linhas:lista, pagina, total:linhas.length,
      selecionada:l => l.id === selecionada, mudar:p => { pagina = p; desenhar(); }});
    pagina = resultado.page - 1;
    const rows = resultado.rows.map(linha => {
      const tr = el('tr'), botao = el('button', linha.nome);
      tr.classList.toggle('ativo', linha.id === selecionada);
      tr.setAttribute('aria-selected', String(linha.id === selecionada));
      botao.type = 'button'; botao.onclick = () => { selecionada = linha.id; desenhar(); };
      const nome = el('td'); nome.append(botao);
      tr.append(nome, el('td', linha.arquivo || linha.id));
      return tr;
    });
    if (!rows.length) {
      const tr = el('tr'), td = el('td', linhas.length
        ? 'Nenhuma camada encontrada para os filtros selecionados.' : 'Nenhuma camada deste grupo marcada na bancada.');
      td.colSpan = 2; tr.append(td); rows.push(tr);
    }
    body.replaceChildren(...rows); controles();
  }
  visualizar.onclick = () => {
    if (visualizar.disabled) return;
    const linha = linhas.find(l => l.id === selecionada);
    const lista = el('ul', undefined, 'jv-list jv-root');
    lista.append(window.SLTDemandasGrupo.jsonNode('Camada confirmada', linha));
    window.SLTDemandasGrupo.showModal('modal-objetos', linha.nome, lista);
  };
  filtro.atualizar(colunas, []);
  desenhar();
  return {
    atualizar(lista) {
      linhas = lista;
      if (!linhas.some(l => l.id === selecionada)) selecionada = linhas[0]?.id || '';
      filtro.atualizar(colunas, linhas, true); desenhar();
    },
    controles(valor) { bloqueado = valor; controles(); },
  };
}
