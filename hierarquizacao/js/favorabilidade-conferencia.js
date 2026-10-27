import {el} from '../../geoespacial/extracao-atributos/ui.js';

// Composição da bancada: conferência informativa, sem controles de tabela.
export function criarConferencia(papel) {
  const body = document.getElementById(`fv-run-${papel}`);
  return {
    atualizar(linhas) {
      body.replaceChildren(...linhas.map(linha => {
        const item = el('div', undefined, 'fv-conferencia-item');
        item.append(el('span', linha.nome), el('span', linha.arquivo || linha.id));
        return item;
      }));
      if (!linhas.length) body.append(el('p', 'Nenhuma camada deste grupo marcada na bancada.', 'ea-hint'));
    },
    controles() {},
  };
}
