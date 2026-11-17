(() => {
  'use strict';
  document.querySelectorAll('#favorabilidade-conteudo table').forEach(table => {
    const shell = table.parentElement;
    const theme = document.createElement('div');
    theme.className = 'fav-table-theme ami-page ami-espaco-page sicard-standard-page';
    const frame = document.createElement('div');
    frame.className = 'ami-main';
    shell.before(theme); theme.append(frame); frame.append(shell);
    window.SLTAnalysisTable(table);
  });
})();
