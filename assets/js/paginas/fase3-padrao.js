(function () {
  'use strict';
  window.Fase3TableReset = function (table) {
    if (!document.body.classList.contains('fase3-standard-page') || !table?.analysisControls) return;
    const host = table.closest('.ami-report-table'), shell = table.parentElement;
    if (table.fase3Caption) {
      const title = host?.querySelector('.fase3-titulo-tabela-simples');
      if (title) { title.className = 'ahp-subsection-title'; table.fase3Caption.append(title); }
      table.prepend(table.fase3Caption);
      table.fase3Caption = null;
    }
    if (host) { host.before(shell); host.remove(); }
    table.querySelectorAll('[data-report-selector], [data-report-select]').forEach(el => el.remove());
    table.analysisControls = null;
  };
  window.Fase3TableStandard = function (table) {
    if (!document.body.classList.contains('fase3-standard-page') || !table) return;
    table.classList.add('admin-table');
    if (table.classList.contains('admin-table--atributos')) table.dataset.compactAttributes = 'true';
    table.querySelectorAll('.col-atributo-alias[title]').forEach(label => {
      label.textContent = label.title + ' ';
    });
    SLTAnalysisTable(table);
    if (table.dataset.rankingOrder === 'true') {
      const position = row => Number(row.dataset.rankingPosicao) > 0 ? Number(row.dataset.rankingPosicao) : Infinity;
      table.analysisControls.sort = rows => [...rows].sort((a, b) => position(a) - position(b));
      table.analysisControls.draw();
    }
    const numericColumns = [...table.tHead.rows[0].cells].map((header, index) =>
      /índice|score|posição|completude/i.test(header.textContent) ? index : -1).filter(index => index >= 0);
    table.analysisControls.rows.forEach(row => numericColumns.forEach(index => row.cells[index]?.classList.add('fase3-indice-valor')));
    const caption = table.caption;
    if (caption) {
      const title = caption.querySelector('.ahp-subsection-title');
      if (title) {
        title.querySelectorAll('.ahp-subsection-num, .cadastro-subsec-num, i').forEach(el => el.remove());
        table.setAttribute('aria-label', title.textContent.trim());
        title.className = 'fase3-titulo-tabela-simples';
        title.setAttribute('role', 'heading');
        title.setAttribute('aria-level', '3');
        table.closest('.ami-report-table').prepend(title);
        if (table.classList.contains('admin-table--atributos')) {
          const filter = table.closest('.ami-report-table').querySelector('.admin-filter-bar');
          const divider = document.createElement('span');
          divider.className = 'fase3-filter-divider';
          divider.setAttribute('aria-hidden', 'true');
          const toggle = document.createElement('button');
          toggle.type = 'button'; toggle.className = 'admin-icon-btn fase3-label-toggle';
          toggle.innerHTML = '<i class="fas fa-tags" aria-hidden="true"></i>';
          toggle.setAttribute('aria-label', 'Labels');
          toggle.title = 'Mostrar ou ocultar os valores originais e códigos das demandas';
          toggle.setAttribute('aria-pressed', String(table.classList.contains('labels-visible')));
          toggle.onclick = () => toggle.setAttribute('aria-pressed', String(table.classList.toggle('labels-visible')));
          filter.append(divider, toggle);
          const groups = [
            {code: 'ca', label: 'Cadastro', selector: 'th.col-estatica', color: '#2f789f'},
            {code: 'di', label: 'Dinâmicos', selector: 'th.col-dinamica:not(.col-risco)', color: '#166552'},
            {code: 'ri', label: 'Risco ambiental e territorial', selector: 'th.col-risco', color: '#92400e'},
          ];
          groups.forEach(group => {
            const headers = [...table.querySelectorAll(group.selector)];
            if (!headers.length) return;
            const columns = headers.map(header => header.cellIndex);
            const button = document.createElement('button');
            button.type = 'button'; button.className = 'admin-icon-btn fase3-group-toggle';
            button.textContent = group.code.charAt(0).toUpperCase() + group.code.slice(1);
            button.style.setProperty('--grupo-cor', group.color);
            button.setAttribute('aria-label', group.label);
            button.setAttribute('aria-pressed', 'false');
            button.title = 'Ocultar grupo: ' + group.label;
            button.onclick = () => {
              const hide = button.getAttribute('aria-pressed') !== 'true';
              button.setAttribute('aria-pressed', String(hide));
              button.title = (hide ? 'Mostrar grupo: ' : 'Ocultar grupo: ') + group.label;
              headers.forEach(header => { header.hidden = hide; });
              table.analysisControls.rows.forEach(row => columns.forEach(index => { row.cells[index].hidden = hide; }));
              window.SLTTableFit?.();
              if (!hide) requestAnimationFrame(() => requestAnimationFrame(() => {
                if (button.getAttribute('aria-pressed') === 'true' || !headers[0].isConnected) return;
                const shell = table.parentElement;
                const left = shell.scrollLeft + headers[0].getBoundingClientRect().left - shell.getBoundingClientRect().left - shell.clientLeft;
                shell.scrollTo({left: Math.max(0, left), behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});
              }));
            };
            filter.append(button);
          });
        }
        table.fase3Caption = caption;
        caption.remove();
      }
    }
  };
  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.fase3-standard-page main table').forEach(Fase3TableStandard);
  });
})();
