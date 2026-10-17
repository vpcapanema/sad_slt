/* Feedback local da ferramenta; mensagens completas abertas sob demanda. */
(() => {
  'use strict';
  function registrar(message, level = 'info') {
    if (!message) return;
    const host = document.querySelector('#gp-log-messages') || document.querySelector('#gp-log');
    if (!host) return;
    const row = document.createElement('div');
    row.className = ({error: 'log-error', erro: 'log-error', success: 'log-ok', sucesso: 'log-ok', warning: 'log-warning', aviso: 'log-warning'})[level] || '';
    row.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    host.append(row);
    atual?._mensagem(message, level);
    host.scrollTop = host.scrollHeight;
    const panel = document.querySelector('#gp-log');
    const feedbackHost = document.querySelector('#gp-feedback-host');
    if (!feedbackHost) panel?.classList.add('open');
    else if (!atual) {
      feedbackHost.querySelectorAll('.execution-progress.complete,.execution-progress.failed,.execution-progress.cancelled').forEach(node => node.remove());
      let notice = feedbackHost.querySelector('.gp-feedback-notice');
      if (!notice) {
        notice = document.createElement('button');
        notice.type = 'button';
        notice.className = 'gp-feedback-notice';
        notice.onclick = () => {
          panel?.classList.add('open');
          panel?.querySelector('[data-feedback-close]')?.focus();
        };
        feedbackHost.append(notice);
      }
      feedbackHost.hidden = false;
      notice.dataset.level = level;
      notice.textContent = message;
      notice.title = `${message}\nExibir detalhes`;
      notice.setAttribute('aria-label', `${message}. Exibir detalhes`);
    }
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
    let progressStatus = null;
    let progressIcon = null;
    let progressTime = null;
    let hasWarnings = false;
    const startedAt = Date.now();
    let lastLogSequence = 0;
    const montarProgresso = () => {
      const host = document.querySelector('#gp-feedback-host') || document.querySelector('#gp-log');
      if (!progressView && host) {
        host.querySelectorAll?.('.execution-progress.complete,.execution-progress.failed,.execution-progress.cancelled').forEach(node => node.remove());
        host.querySelector('.gp-feedback-notice')?.remove();
        host.hidden = false;
        progressView = document.createElement('section');
        progressView.className = 'execution-progress';
        progressView.setAttribute('aria-label', options.title || 'Geoprocessamento');
        const head = document.createElement('div');
        head.className = 'execution-progress-head';
        progressIcon = document.createElement('span');
        progressIcon.className = 'execution-progress-icon';
        progressIcon.textContent = '↻';
        progressIcon.setAttribute('aria-hidden', 'true');
        const title = document.createElement('span');
        title.className = 'execution-progress-title';
        title.textContent = options.title || 'Geoprocessamento';
        title.title = title.textContent;
        progressValue = document.createElement('strong');
        progressValue.textContent = '';
        head.append(progressIcon, title, progressValue);
        const progressRow = document.createElement('div');
        progressRow.className = 'execution-progress-row';
        const track = document.createElement('div');
        track.className = 'execution-progress-track';
        track.setAttribute('role', 'progressbar');
        track.setAttribute('aria-label', 'Progresso da execução');
        track.setAttribute('aria-valuemin', '0');
        track.setAttribute('aria-valuemax', '100');
        track.setAttribute('aria-valuetext', 'Progresso não informado');
        track.classList.add('indeterminate');
        progressFill = document.createElement('span');
        track.append(progressFill);
        progressTrack = track;
        progressRow.append(track);
        progressStage = document.createElement('div');
        progressStage.className = 'execution-progress-stage';
        progressStage.setAttribute('aria-live', 'polite');
        progressStage.textContent = options.subtitle || 'Preparando execução';
        const footer = document.createElement('div');
        footer.className = 'execution-progress-footer';
        progressStatus = document.createElement('span');
        progressStatus.textContent = 'Em execução';
        progressTime = document.createElement('span');
        progressTime.className = 'execution-progress-time';
        const details = document.createElement('button');
        details.type = 'button';
        details.className = 'execution-progress-link';
        details.textContent = 'Exibir detalhes';
        details.onclick = () => {
          const panel = document.querySelector('#gp-log');
          panel?.classList.add('open');
          panel?.querySelector('[data-feedback-close]')?.focus();
        };
        const history = document.createElement('button');
        history.type = 'button';
        history.className = 'execution-progress-link';
        history.textContent = 'Histórico';
        history.onclick = () => window.gpApp?.showHistory();
        footer.append(progressStatus, progressTime, details, history);
        progressView.append(head, progressRow, progressStage, footer);
        host.prepend(progressView);
        if (host.id === 'gp-log') host.classList.add('open');
      }
    };
    const atualizarTempo = () => {
      if (progressTime) progressTime.textContent = `${((Date.now() - startedAt) / 1000).toFixed(1)} s`;
    };
    const atualizarProgresso = value => {
      montarProgresso();
      if (!progressView) return;
      atualizarTempo();
      const pct = Number(value);
      if (Number.isFinite(pct)) {
        const bounded = Math.max(0, Math.min(100, pct));
        const rounded = Math.round(bounded);
        progressValue.textContent = `${rounded}%`;
        progressTrack.setAttribute('aria-valuenow', String(rounded));
        progressTrack.removeAttribute('aria-valuetext');
        progressTrack.classList.remove('indeterminate');
        progressFill.style.width = `${bounded}%`;
      } else {
        progressValue.textContent = '';
        progressTrack.removeAttribute('aria-valuenow');
        progressTrack.setAttribute('aria-valuetext', 'Progresso não informado');
        progressTrack.classList.add('indeterminate');
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
      atualizarTempo();
      if (progressStage) progressStage.textContent = message;
    };
    const finalizar = (message, level, state) => {
      cancelButton?.remove();
      proc._finalizado = true;
      if (progressView) {
        progressView.classList.remove('complete', 'failed', 'cancelled', 'has-warnings');
        progressTrack.classList.remove('indeterminate');
        atualizarTempo();
        if (state === 'complete') {
          progressView.classList.add('complete');
          if (hasWarnings) progressView.classList.add('has-warnings');
          progressIcon.textContent = hasWarnings ? '⚠' : '✓';
          progressStatus.textContent = hasWarnings ? 'Concluído com avisos' : 'Concluído';
          atualizarProgresso(100);
        } else if (state === 'failed') {
          progressView.classList.add('failed');
          progressIcon.textContent = '×';
          progressStatus.textContent = 'Falha';
        } else if (state === 'cancelled') {
          progressView.classList.add('cancelled');
          progressIcon.textContent = '■';
          progressStatus.textContent = 'Cancelado';
        }
        if (message) progressStage.textContent = message;
      }
      registrar(message, level);
      if (atual === proc) atual = null;
    };
    const proc = {
      _finalizado: false,
      _mensagem: (message, level) => {
        if (proc._finalizado) return;
        if (level === 'warning') hasWarnings = true;
        if (level === 'warning' || level === 'error') atualizarEtapa(message);
      },
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
          const level = levels[event?.nivel] || 'info';
          if (level === 'warning') hasWarnings = true;
          registrar(message, level);
        });
        const pct = job.percentual ?? job.progresso_geral ?? job.progresso_tarefa;
        if (pct !== undefined && pct !== null) atualizarProgresso(pct);
      },
      sucesso: data => {
        if (data?._status === 'partial') hasWarnings = true;
        finalizar(data?.message || 'Operação concluída.', 'success', 'complete');
      },
      erro: data => finalizar(data?.message || 'Falha na operação.', 'error', 'failed'),
      confirmarCancelamento: message => finalizar(message || 'Operação cancelada.', 'info', 'cancelled'),
      fechar: () => {
        progressView?.remove();
        if (atual === proc) atual = null;
      },
    };
    montarProgresso();
    if (typeof options.onCancel === 'function') {
      cancelButton = document.createElement('button');
      cancelButton.type = 'button';
      cancelButton.className = 'execution-progress-cancel';
      const stop = document.createElement('span');
      stop.setAttribute('aria-hidden', 'true');
      cancelButton.append(stop);
      cancelButton.title = 'Cancelar execução';
      cancelButton.setAttribute('aria-label', 'Cancelar execução');
      cancelButton.onclick = async () => {
        cancelButton.disabled = true;
        try {
          await options.onCancel();
          if (!proc._finalizado) {
            progressStatus.textContent = 'Cancelamento solicitado';
            registrar('Cancelamento solicitado.');
          }
        }
        catch (error) { registrar(error.message, 'error'); cancelButton.disabled = false; }
      };
      progressView?.querySelector('.execution-progress-row').prepend(cancelButton);
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
  document.querySelector('[data-feedback-close]')?.addEventListener('click', () => {
    document.querySelector('#gp-log')?.classList.remove('open');
    document.querySelector('#gp-log-toggle')?.focus();
  });
})();
