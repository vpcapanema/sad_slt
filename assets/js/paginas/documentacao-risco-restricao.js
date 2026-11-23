(() => {
  'use strict';
  const table = document.getElementById('risco-exemplos');
  if (!table || !window.SLTTable) return;
  const rows = [...table.tBodies[0].rows];
  const get = id => document.getElementById(id);
  const column = get('risco-filtro-coluna'), value = get('risco-filtro-valor');
  const all = get('risco-selecionar-todos'), exportButton = get('risco-exportar');
  const matchesSearch = new Map(rows.map(row => [row, !row.hidden]));
  [...table.tHead.rows[0].cells].slice(1).forEach((cell, index) => column.add(new Option(cell.textContent, String(index + 1))));
  const cellText = row => row.cells[Number(column.value)]?.textContent.trim() || '';
  function render() {
    const filtered = rows.filter(row => matchesSearch.get(row) && SLTTable.matches('risco-filtro',
      cellText(row) === value.value, Boolean(column.value && value.value)));
    const visible = new Set(filtered);
    rows.forEach(row => { row.hidden = !visible.has(row); });
    filtered.forEach((row, index) => { row.dataset.tableStripe = index % 2 ? 'even' : 'odd'; });
    const selected = rows.filter(row => row.querySelector('input').checked);
    const checked = filtered.filter(row => row.querySelector('input').checked).length;
    all.checked = filtered.length > 0 && checked === filtered.length;
    all.indeterminate = checked > 0 && checked < filtered.length;
    all.disabled = filtered.length === 0;
    exportButton.disabled = selected.length === 0;
    SLTTable.paginate('risco-paginacao', filtered, 1, render, 20);
    SLTTable.summary('risco-contagem', selected.length, filtered.length, rows.length);
  }
  column.addEventListener('change', () => {
    value.disabled = !column.value;
    value.value = '';
    SLTTable.values(value, column.value ? rows : [], cellText);
    render();
  });
  value.addEventListener('change', render);
  SLTTable.bindFilter('risco-filtro', render, () => { column.value = ''; value.value = ''; value.disabled = true; });
  all.addEventListener('change', () => { rows.filter(row => !row.hidden).forEach(row => { row.querySelector('input').checked = all.checked; }); render(); });
  table.addEventListener('change', event => { if (event.target.matches('[data-selecionar-exemplo]')) render(); });
  document.addEventListener('glossario:filtrado', () => {
    rows.forEach(row => matchesSearch.set(row, !row.hidden));
    render();
  });
  window.addEventListener('hashchange', () => {
    const target = document.getElementById(location.hash.slice(1));
    if (target?.matches('tr[data-camada]') && target.hidden) {
      column.value = ''; value.value = ''; value.disabled = true;
      render(); target.scrollIntoView({ block: 'start' });
    }
  });
  exportButton.addEventListener('click', () => {
    const escape = text => '"' + text.replace(/"/g, '""') + '"';
    const data = [ [...table.tHead.rows[0].cells].slice(1).map(cell => cell.textContent.trim()),
      ...rows.filter(row => row.querySelector('input').checked).map(row => [...row.cells].slice(1).map(cell => cell.innerText.trim())) ];
    const blob = new Blob(['\ufeff' + data.map(row => row.map(escape).join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob), anchor = document.createElement('a');
    anchor.href = url; anchor.download = SicardNomeArquivo.gerar('Risco e Restricao', 'classificacoes sugeridas', 'csv'); anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  render();
})();
