/* Standard controls for record tables; pairwise matrices keep both axes intact. */
(function () {
  'use strict';
  let sequence = 0;
  window.SLTAnalysisTable = function (table) {
    if (!table || table.classList.contains('ami-matrix')) return;
    const body = table.tBodies[0], headers = [...table.tHead.rows[0].cells];
    if (!body) return;
    let state = table.analysisControls;
    if (!state) {
      const prefix = 'analysis-table-' + (++sequence), host = document.createElement('div');
      host.className = 'standard-table-section ami-report-table';
      const shell = table.parentElement;
      if (shell.parentElement.classList.contains('ami-report-table')) shell.parentElement.replaceWith(shell);
      shell.before(host); host.append(shell);
      const filter = document.createElement('div');
      filter.className = 'admin-filter-bar'; filter.setAttribute('role', 'search');
      filter.innerHTML = '<span class="admin-filter-label">Filtro:</span><select aria-label="Coluna do filtro" id="' + prefix + '-coluna"><option value="">— Coluna —</option></select><select aria-label="Valor do filtro" id="' + prefix + '-valor"></select><button type="button" class="admin-icon-btn admin-filter-inv" id="' + prefix + '-inverter" aria-label="Inverter seleção" aria-pressed="false"><i class="fa-solid fa-right-left"></i></button><button type="button" class="admin-icon-btn" id="' + prefix + '-limpar" aria-label="Limpar filtros"><i class="fa-solid fa-filter-circle-xmark"></i></button>';
      host.prepend(filter);
      const nav = document.createElement('nav'), summary = document.createElement('p');
      nav.id = prefix + '-pagination'; nav.className = 'admin-pagination'; nav.setAttribute('aria-label', 'Paginar registros');
      summary.id = prefix + '-summary'; summary.className = 'admin-table-summary'; summary.setAttribute('aria-live','polite');
      host.append(nav, summary);
      const column = filter.querySelector('select'), value = filter.querySelectorAll('select')[1];
      headers.forEach((h, i) => { if (!h.querySelector('input')) column.add(new Option(h.textContent.trim(), String(i))); });
      state = table.analysisControls = {prefix, column, value, page:1, rows:[]};
      state.text = (row, i) => row.cells[i]?.textContent.trim() || '';
      state.options = () => { SLTTable.values(value,state.rows,row=>state.text(row,Number(column.value))); value.disabled = column.value === ''; };
      state.sort = SLTTable.sorting(table, () => headers.map((h,i) => h.querySelector('input') ? null : row => state.text(row,i)), () => {state.page=1; state.draw();});
      state.draw = () => {
        const rows = state.sort(state.rows.filter(row => SLTTable.matches(prefix,state.text(row,Number(column.value)) === (value.value === '__empty__' ? '' : value.value),column.value !== '' && Boolean(value.value))));
        const result = SLTTable.paginate(nav.id,rows,state.page,page=>{state.page=page;state.draw();});
        state.page=result.page; body.replaceChildren(...result.rows);
        if (!result.rows.length) { const tr=body.insertRow(),td=tr.insertCell();td.colSpan=headers.length;td.textContent='Nenhum registro encontrado.'; }
        SLTTable.summary(summary.id,state.rows.filter(row=>row.querySelector('input[type="checkbox"]:checked')).length,result.rows.length,state.rows.length);
      };
      column.onchange=()=>{value.value='';state.options();state.page=1;state.draw();};
      value.onchange=()=>{state.page=1;state.draw();};
      SLTTable.bindFilter(prefix,()=>{state.page=1;state.draw();},()=>{column.value='';value.value='';state.options();});
      body.addEventListener('change',()=>state.draw());
    }
    state.rows=[...body.rows].filter(row=>row.cells.length===headers.length && !row.querySelector('td[colspan]'));
    state.options(); state.draw();
  };
})();
