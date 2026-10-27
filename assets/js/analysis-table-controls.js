/* Shared filters, row selection, export and pagination for analytical tables. */
(function () {
  'use strict';
  let sequence = 0;
  window.SLTAnalysisTable = function (table) {
    if (!table) return;
    const body = table.tBodies[0];
    if (!body) return;
    let state = table.analysisControls;
    if (!state) {
      const headers = SLTTable.headers(table);
      const existingSelection = body.id === 'ami-analysis-responses' || Boolean(body.querySelector('td:first-child input[type="checkbox"]'));
      const selectHeader = existingSelection ? headers[0] : document.createElement('th');
      if (!existingSelection) { selectHeader.dataset.reportSelector = 'true'; table.tHead.rows[0].prepend(selectHeader); }
      selectHeader.classList.add('col-select');
      selectHeader.rowSpan = table.tHead.rows.length;
      const selectAll = document.createElement('input'); selectAll.type = 'checkbox';
      selectAll.setAttribute('aria-label','Selecionar todos os registros filtrados'); selectHeader.replaceChildren(selectAll);
      const prefix = 'analysis-table-' + (++sequence), host = document.createElement('div');
      host.className = 'standard-table-section ami-report-table';
      const shell = table.parentElement;
      const previousHost = shell.closest('.ami-report-table');
      if (previousHost) { previousHost.before(shell); previousHost.remove(); }
      shell.before(host); host.append(shell);
      const filter = document.createElement('div');
      filter.className = 'admin-filter-bar'; filter.setAttribute('role', 'search');
      filter.innerHTML = '<span class="admin-filter-label">Filtro:</span><select aria-label="Coluna do filtro" id="' + prefix + '-coluna"><option value="">— Coluna —</option></select><select aria-label="Valor do filtro" id="' + prefix + '-valor"></select><button type="button" class="admin-icon-btn admin-filter-inv" id="' + prefix + '-inverter" aria-label="Inverter seleção" aria-pressed="false"><i class="fa-solid fa-right-left"></i></button><button type="button" class="admin-icon-btn" id="' + prefix + '-limpar" aria-label="Limpar filtros"><i class="fa-solid fa-filter-circle-xmark"></i></button>';
      const surface = document.createElement('div'); surface.className = 'ami-filtered-table';
      host.prepend(surface); surface.append(filter, shell);
      const controls = document.createElement('div'); controls.className = 'admin-actions standard-table-actions';
      controls.setAttribute('role','group'); controls.setAttribute('aria-label','Controles da tabela');
      controls.innerHTML = '<button type="button" class="admin-icon-btn save" title="Exportar selecionados" aria-label="Exportar selecionados"><i class="fas fa-file-csv" aria-hidden="true"></i></button><button type="button" class="admin-icon-btn cancel" title="Limpar seleção" aria-label="Limpar seleção"><i class="fas fa-xmark" aria-hidden="true"></i></button>';
      host.append(controls);
      const nav = document.createElement('nav'), summary = document.createElement('p');
      nav.id = prefix + '-pagination'; nav.className = 'admin-pagination'; nav.setAttribute('aria-label', 'Paginar registros');
      summary.id = prefix + '-summary'; summary.className = 'admin-table-summary'; summary.setAttribute('aria-live','polite');
      const footer = document.createElement('div');
      footer.className = 'admin-table-footer';
      footer.append(nav, summary);
      host.append(footer);
      const column = filter.querySelector('select'), value = filter.querySelectorAll('select')[1];
      headers.forEach((h, i) => { if (!h.querySelector('input')) column.add(new Option(h.textContent.trim(), String(i))); });
      state = table.analysisControls = {prefix, column, value, page:1, rows:[], headers, existingSelection};
      state.text = (row, i) => row.cells[i + (existingSelection ? 0 : 1)]?.textContent.trim() || '';
      state.options = () => { SLTTable.values(value,state.rows,row=>state.text(row,Number(column.value))); value.disabled = column.value === ''; };
      state.sort = SLTTable.sorting(table, () => (existingSelection ? [] : [null]).concat(headers.map((h,i) => h.querySelector('input') ? null : row => state.text(row,i))), () => {state.page=1; state.draw();});
      const selected = () => state.rows.filter(row=>row.querySelector('td:first-child input[type="checkbox"]:checked'));
      const changeSelection = (rows, checked) => {
        rows.forEach(row => { const box=row.querySelector('td:first-child input[type="checkbox"]'); if(box && !box.disabled && box.checked!==checked) {box.checked=checked; if(box.dataset.analysisResponse) body.dispatchEvent(new CustomEvent('analysis-selection',{detail:{id:box.dataset.analysisResponse,checked}}));} });
        state.draw();
      };
      selectAll.onchange=()=>changeSelection(state.filtered,selectAll.checked);
      controls.children[1].onclick=()=>changeSelection(state.rows,false);
      controls.children[0].onclick=()=>{
        const quote=value=>'"'+String(value).replace(/^[=+@-]/,"'$&").replace(/"/g,'""')+'"';
        const indices=headers.map((h,i)=>i).filter(i=>!headers[i].querySelector('input'));
        const csv=[indices.map(i=>headers[i].textContent.trim()),...selected().map(row=>indices.map(i=>state.text(row,i)))].map(row=>row.map(quote).join(';')).join('\r\n');
        const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob(['\uFEFF',csv],{type:'text/csv;charset=utf-8'}));a.download='registros.csv';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
      };
      state.draw = () => {
        const rows = state.sort(state.rows.filter(row => SLTTable.matches(prefix,state.text(row,Number(column.value)) === (value.value === '__empty__' ? '' : value.value),column.value !== '' && Boolean(value.value))));
        state.filtered=rows;
        const result = SLTTable.paginate(nav.id,rows,state.page,page=>{state.page=page;state.draw();});
        state.page=result.page; body.replaceChildren(...result.rows);
        if (!result.rows.length) { const tr=body.insertRow(),td=tr.insertCell();td.colSpan=SLTTable.headers(table).length;td.textContent='Nenhum registro encontrado.'; }
        const selectable=rows.map(row=>row.querySelector('td:first-child input[type="checkbox"]')).filter(box=>box&&!box.disabled), checked=selectable.filter(box=>box.checked).length;
        selectAll.disabled=!selectable.length;selectAll.checked=checked>0&&checked===selectable.length;selectAll.indeterminate=checked>0&&checked<selectable.length;
        controls.querySelectorAll('button').forEach(button=>button.disabled=!selected().length);
        controls.children[1].disabled=!selected().some(row=>!row.querySelector('td:first-child input[type="checkbox"]').disabled);
        state.rows.forEach(row=>row.classList.toggle('is-selected',Boolean(row.querySelector('td:first-child input:checked'))));
        SLTTable.summary(summary.id,selected().length,result.rows.length,state.rows.length);
      };
      column.onchange=()=>{value.value='';state.options();state.page=1;state.draw();};
      value.onchange=()=>{state.page=1;state.draw();};
      SLTTable.bindFilter(prefix,()=>{state.page=1;state.draw();},()=>{column.value='';value.value='';state.options();});
      body.addEventListener('change',()=>state.draw());
    }
    state.rows=[...body.rows].filter(row=>!row.querySelector('td[colspan]'));
    if(!state.existingSelection) state.rows.forEach(row=>{
      if(row.querySelector('[data-report-select]'))return;
      const td=document.createElement('td');td.className='col-select';const box=document.createElement('input');box.type='checkbox';box.dataset.reportSelect='true';box.setAttribute('aria-label','Selecionar registro');td.append(box);row.prepend(td);
    });
    state.options(); state.draw();
  };
})();
