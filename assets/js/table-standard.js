(function () {
  'use strict';
  const get = id => document.getElementById(id);
  function inversion(button, active) {
    button.setAttribute('aria-pressed', String(active));
    button.title = active ? 'Seleção invertida — clique para desativar' : 'Inverter seleção';
  }
  function bindFilter(prefix, change, clear) {
    const button = get(prefix + '-inverter');
    button.onclick = () => { inversion(button, button.getAttribute('aria-pressed') !== 'true'); change(); };
    get(prefix + '-limpar').onclick = () => { inversion(button, false); clear(); change(); };
  }
  function matches(prefix, match, active) {
    return !active || (get(prefix + '-inverter').getAttribute('aria-pressed') === 'true' ? !match : match);
  }
  function summary(id, selected, visible, total) {
    get(id).textContent = `${selected} selecionados / ${visible} na página / ${total} no total`;
  }
  function paginate(id, rows, page, change, pageSize = 15) {
    const count = Math.max(1, Math.ceil(rows.length / pageSize));
    page = Math.max(1, Math.min(page, count));
    const nav = get(id);
    nav.replaceChildren();
    const first = document.createElement('button'), last = document.createElement('button'), prev = document.createElement('button'), next = document.createElement('button'), label = document.createElement('span');
    for (const [button, text, title, disabled, target] of [[first, '<<', 'Primeira página', page <= 1, 1], [prev, '<', 'Página anterior', page <= 1, page - 1], [next, '>', 'Próxima página', page >= count, page + 1], [last, '>>', 'Última página', page >= count, count]]) {
      button.type = 'button'; button.textContent = text; button.title = title; button.setAttribute('aria-label', title); button.disabled = disabled; button.onclick = () => change(target);
    }
    label.textContent = `Página ${page} de ${count}`; label.setAttribute('aria-live', 'polite');
    nav.append(first, prev, label, next, last);
    return { page, rows: rows.slice((page - 1) * pageSize, page * pageSize) };
  }
  function values(select, rows, value) {
    const previous = select.value;
    select.replaceChildren(new Option('Todos os valores', ''));
    [...new Set(rows.map(row => String(value(row) ?? '')))].sort((a,b) => a.localeCompare(b, 'pt-BR')).forEach(v => select.add(new Option(v || 'Sem valor', v || '__empty__')));
    if ([...select.options].some(o => o.value === previous)) select.value = previous;
  }
  function sorting(table, columns, onChange, canSort) {
    table.sltSortSource = { columns, onChange, canSort };
    return rows => window.SLTTableSort?.sortRows(table, rows) || rows;
  }
  function plainText(html) {
    const node = document.createElement('span');
    node.innerHTML = html;
    return node.textContent.trim();
  }
  function headers(table) {
    const grid=[];
    [...(table.tHead?.rows || [])].forEach((row,r)=>{
      grid[r] ||= []; let col=0;
      [...row.cells].forEach(cell=>{
        while(grid[r][col])col++;
        for(let y=r;y<r+cell.rowSpan;y++){grid[y] ||= [];for(let x=col;x<col+cell.colSpan;x++)grid[y][x]=cell;}
        col+=cell.colSpan;
      });
    });
    return grid.at(-1)||[];
  }
  window.SLTTable = { inversion, bindFilter, matches, summary, paginate, values, sorting, plainText, headers };
})();
