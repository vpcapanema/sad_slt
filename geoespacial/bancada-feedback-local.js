/* Standalone workbench: no global feedback modals or notifications. */
(() => {
  'use strict';
  function registrar(message, level = 'info') {
    if (!message) return;
    const host = document.querySelector('#gp-log');
    if (!host) return;
    const row = document.createElement('div');
    row.className = ({error: 'log-error', erro: 'log-error', success: 'log-ok', sucesso: 'log-ok', warning: 'log-warning', aviso: 'log-warning'})[level] || '';
    row.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    host.append(row);
    host.scrollTop = host.scrollHeight;
    host.classList.add('open');
  }
  let atual = null;
  function iniciarCadastro(options = {}) {
    let ultimaEtapa = '';
    let cancelButton = null;
    let progressView = null;
    let progressStage = null;
    let progressValue = null;
    let progressTrack = null;
    let progressFill = null;
    let lastLogSequence = 0;
    const montarProgresso = () => {
      const host = document.querySelector('#gp-log');
      if (!progressView && host) {
        progressView = document.createElement('section');
        progressView.className = 'execution-progress';
        const head = document.createElement('div');
        head.className = 'execution-progress-head';
        const title = document.createElement('span');
        title.textContent = 'Progresso da execução';
        progressValue = document.createElement('strong');
        progressValue.textContent = 'Aguardando progresso';
        head.append(title, progressValue);
        const track = document.createElement('div');
        track.className = 'execution-progress-track';
        track.setAttribute('role', 'progressbar');
        track.setAttribute('aria-label', 'Progresso da execução');
        track.setAttribute('aria-valuemin', '0');
        track.setAttribute('aria-valuemax', '100');
        progressFill = document.createElement('span');
        track.append(progressFill);
        progressTrack = track;
        progressStage = document.createElement('div');
        progressStage.className = 'execution-progress-stage';
        progressStage.setAttribute('aria-live', 'polite');
        progressStage.textContent = 'Preparando execução';
        progressView.append(head, track, progressStage);
        host.prepend(progressView);
        host.classList.add('open');
      }
    };
    const atualizarProgresso = value => {
      montarProgresso();
      if (!progressView) return;
      const pct = Number(value);
      if (Number.isFinite(pct)) {
        const bounded = Math.max(0, Math.min(100, pct));
        const rounded = Math.round(bounded);
        progressValue.textContent = `${rounded}%`;
        progressTrack.setAttribute('aria-valuenow', String(rounded));
        progressTrack.removeAttribute('aria-valuetext');
        progressFill.style.width = `${bounded}%`;
      } else {
        progressValue.textContent = 'Progresso não informado';
        progressTrack.removeAttribute('aria-valuenow');
        progressTrack.setAttribute('aria-valuetext', 'Progresso não informado');
        progressFill.style.width = '0%';
      }
    };
    const etapa = message => {
      if (message && message !== ultimaEtapa) registrar(message);
      if (message) {
        ultimaEtapa = message;
        atualizarEtapa(message);
      }
    };
    const atualizarEtapa = message => {
      montarProgresso();
      if (progressStage) progressStage.textContent = message;
    };
    const finalizar = (message, level, state) => {
      cancelButton?.remove();
      proc._finalizado = true;
      if (progressView) {
        progressView.classList.remove('complete', 'failed');
        if (state === 'complete') {
          progressView.classList.add('complete');
          atualizarProgresso(100);
        } else if (state === 'failed') {
          progressView.classList.add('failed');
        }
        if (message) progressStage.textContent = message;
      }
      registrar(message, level);
      if (atual === proc) atual = null;
    };
    const proc = {
      _finalizado: false,
      tasks: (options.tasks || []).map(name => ({name})),
      tarefaAtual: etapa, etapa, detalhe: etapa, log: registrar,
      progresso: atualizarProgresso, concluirTarefa: etapa,
      sync: job => {
        if (!job) return;
        const name = job.atividade || job.etapa_atual || job.etapa;
        const detail = job.detalhe;
        if (name) atualizarEtapa(detail && detail !== name ? `${name} — ${detail}` : name);
        const logs = Array.isArray(job.logs) ? job.logs : Array.isArray(job.etapas) ? job.etapas : [];
        const levels = {sucesso: 'success', success: 'success', erro: 'error', error: 'error', aviso: 'warning', atencao: 'warning', warning: 'warning', info: 'info'};
        logs.forEach((event, index) => {
          const sequence = event?.sequencia != null && Number.isFinite(Number(event.sequencia)) ? Number(event.sequencia) : index + 1;
          const message = event?.mensagem ?? event?.message;
          if (sequence <= lastLogSequence || !message) return;
          lastLogSequence = sequence;
          registrar(message, levels[event?.nivel] || 'info');
        });
        const pct = job.percentual ?? job.progresso_geral ?? job.progresso_tarefa;
        if (pct !== undefined && pct !== null) atualizarProgresso(pct);
      },
      sucesso: data => finalizar(data?.message || 'Operação concluída.', 'success', 'complete'),
      erro: data => finalizar(data?.message || 'Falha na operação.', 'error', 'failed'),
      confirmarCancelamento: message => finalizar(message || 'Operação cancelada.', 'info', 'cancelled'),
      fechar: () => { if (atual === proc) atual = null; },
    };
    montarProgresso();
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
