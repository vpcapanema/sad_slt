/* Standalone workbench: no global feedback modals or notifications. */
(() => {
  'use strict';
  function registrar(message, level = 'info') {
    if (!message) return;
    const host = document.querySelector('#gp-log');
    if (!host) return;
    const row = document.createElement('div');
    row.className = level === 'error' ? 'log-error' : '';
    row.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    host.append(row);
    host.scrollTop = host.scrollHeight;
    host.classList.add('open');
  }
  let atual = null;
  function iniciarCadastro(options = {}) {
    let ultimaEtapa = '';
    let cancelButton = null;
    const etapa = message => {
      if (message && message !== ultimaEtapa) registrar(message);
      ultimaEtapa = message;
    };
    const finalizar = (message, level) => {
      cancelButton?.remove();
      proc._finalizado = true;
      registrar(message, level);
      if (atual === proc) atual = null;
    };
    const proc = {
      _finalizado: false,
      tasks: (options.tasks || []).map(name => ({name})),
      tarefaAtual: etapa, etapa, detalhe: etapa, log: registrar,
      progresso() {}, concluirTarefa: etapa,
      sync: job => etapa(job?.etapa_atual),
      sucesso: data => finalizar(data?.message || 'Operação concluída.', 'success'),
      erro: data => finalizar(data?.message || 'Falha na operação.', 'error'),
      confirmarCancelamento: message => finalizar(message || 'Operação cancelada.', 'info'),
      fechar: () => { if (atual === proc) atual = null; },
    };
    if (typeof options.onCancel === 'function') {
      cancelButton = document.createElement('button');
      cancelButton.type = 'button';
      cancelButton.className = 'btn';
      cancelButton.textContent = 'Cancelar execução';
      cancelButton.onclick = async () => {
        cancelButton.disabled = true;
        try { await options.onCancel(); registrar('Cancelamento solicitado.'); }
        catch (error) { registrar(error.message, 'error'); cancelButton.disabled = false; }
      };
      const host = document.querySelector('#gp-log');
      host?.append(cancelButton);
      host?.classList.add('open');
    }
    atual = proc;
    return proc;
  }
  const ProcessFeedback = {
    iniciarCadastro,
    confirmar: async options => window.confirm([options.title, options.message, options.warning].filter(Boolean).join('\n\n')),
    acompanhar: job => atual?.sync(job),
    permitirCancelamento() {},
    get atual() { return atual; },
  };
  const Notify = Object.fromEntries(['info', 'success', 'warning', 'error'].map(level =>
    [level, (title, message) => registrar([title, message].filter(Boolean).join(': '), level)]));
  window.gpFeedback = {ProcessFeedback, Notify};
  window.ProcessFeedback = ProcessFeedback;
  window.Notify = Notify;
})();
