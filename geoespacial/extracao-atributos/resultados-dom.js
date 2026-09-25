// A estrutura pertence aos templates HTML; aqui entram apenas dados.
export const texto = value => value == null ? 'Não informado' : typeof value === 'object' ? JSON.stringify(value) : String(value);
export function clone(id) { return document.getElementById(id).content.firstElementChild.cloneNode(true); }
export function valor(root, key, value) { root.querySelector(`[data-value="${key}"]`).textContent = texto(value); }
export function opcoes(select, items, selected = '') {
  select.replaceChildren(...items.map(item => new Option(item.nome, item.id))); select.value = selected;
}
export function definicoes(root, data) {
  root.replaceChildren();
  for (const [label, value] of Object.entries(data || {})) {
    const pair = clone('ea-tpl-definition'); pair.querySelector('dt').textContent = label;
    pair.querySelector('dd').textContent = texto(value); root.append(pair);
  }
}
export function cabecalhos(root, names) {
  root.replaceChildren(...names.map(name => { const cell=clone('ea-tpl-heading');cell.textContent=name;return cell; }));
}
export function linhas(root, rows, action) {
  root.replaceChildren(...rows.map((values,index) => {
    const row=clone('ea-tpl-row');
    for (const value of values) { const cell=clone('ea-tpl-cell');cell.textContent=texto(value);row.append(cell); }
    if (action) { const cell=clone('ea-tpl-action-cell');cell.querySelector('button').onclick=()=>action(index);row.append(cell); }
    return row;
  }));
}
