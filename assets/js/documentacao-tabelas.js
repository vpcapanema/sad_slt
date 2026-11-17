/* Controles e tema oficiais das tabelas analíticas, compartilhados pela documentação. */
(() => {
  'use strict';
  document.querySelectorAll('[data-documentacao-tabelas] table').forEach(table => {
    const shell = table.parentElement;
    const theme = document.createElement('div');
    theme.className = 'doc-table-theme ami-page ami-espaco-page sicard-standard-page';
    const frame = document.createElement('div');
    frame.className = 'ami-main';
    shell.before(theme); theme.append(frame); frame.append(shell);
    window.SLTAnalysisTable(table);
  });
})();
