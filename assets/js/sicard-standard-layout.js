/* Reuse the reference table shell without changing existing event handlers. */
window.SicardTableExport = function (filename, headers, rows) {
  const quote = value => '"' + String(value ?? '').replace(/^[=+@-]/,"'$&").replace(/"/g,'""') + '"';
  const csv = [headers, ...rows].map(row=>row.map(quote).join(';')).join('\r\n');
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\uFEFF',csv],{type:'text/csv;charset=utf-8'}));a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
};
document.addEventListener('DOMContentLoaded', function () {
  const main = document.querySelector('.sicard-standard-page .ami-main');
  if (!main) return;
  main.querySelectorAll('.admin-filter-bar').forEach(function (filter) {
    if (filter.closest('.ami-filtered-table')) return;
    let shell = filter.nextElementSibling;
    while (shell && !shell.querySelector('table')) shell = shell.nextElementSibling;
    if (!shell || shell.matches('section, article, form')) return;
    const wrapper = document.createElement('div'); wrapper.className = 'ami-filtered-table';
    filter.before(wrapper); wrapper.append(filter, shell);
    wrapper.parentElement.classList.add('standard-table-section');
  });
  main.querySelectorAll('.admin-table-footer > p').forEach(el => el.classList.add('admin-table-summary'));
  main.querySelectorAll('.admin-actions').forEach(el => el.classList.add('standard-table-actions'));
});
