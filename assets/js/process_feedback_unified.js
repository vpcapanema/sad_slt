/**
 * Process Feedback System — Controlador Unificado v3.0 (SIGMA-PLI) no SICARD
 *
 * Mesmo controlador do SIGMA-PLI (process_feedback_unified.js): overlay de
 * progresso com tarefas, segmentos e log; modais de resultado (sucesso,
 * parcial, erro com relatório); modal de confirmação e de credencial.
 * No SIGMA o componente vem de componente_process_feedback_system.html; aqui
 * o próprio script o injeta, então funciona em qualquer página e iframe.
 *
 * Captura (igual ao SIGMA):
 *   ProcessFeedback.processar(fetchFn, onSuccess, onError)
 *     → stream (SSE/NDJSON) passa pelo roteador de eventos;
 *     → JSON com resposta ok abre o modal de sucesso; resposta de erro, o de erro;
 *     → falha de rede abre o modal de erro.
 *   Eventos: task, log|step, progress, task_complete, done|success, partial, error.
 *   Monitor de atividade: 30 s sem notícias registra "Aguardando resposta do servidor...".
 *   Erros do FastAPI (detail em lista com loc/msg) viram linhas legíveis.
 *
 * Integração SICARD (seção no fim): ProcessFeedback.acompanhar(job) traduz os
 * retratos de job do servidor (etapa_atual, logs, percentual, eventos_url) para
 * os mesmos eventos; ProcessFeedback.permitirCancelamento(fn) liga o botão.
 *
 * Globals: ProcessFeedback, ProcessFeedbackV2 (alias), StatusFeedback,
 * ProcessFeedbackSystem, StatusFeedbackSystem, ConfirmFeedbackSystem,
 * CredentialFeedbackSystem.
 */
(function () {
    'use strict';
    /* Página que inclui o script duas vezes mantém um único controlador. */
    if (window.ProcessFeedbackSystem && window.ProcessFeedback) return;

    /* ── Helpers ── */
    const q = (sel, ctx) => (ctx || document).querySelector(sel);
    const now = () => new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const esc = (s) => { if (s == null || s === '') return ''; const d = document.createElement('div'); d.textContent = String(s); return d.innerHTML; };
    const pfsText = (attr, text, ctx) => { const el = q(`[data-pfs="${attr}"]`, ctx); if (el) el.textContent = text == null ? '' : String(text); };

    /* ============================================================
       Componente (equivalente a componente_process_feedback_system.html)
       ============================================================ */
    const COMPONENTE = `
<div class="pfs-overlay" id="pfsProgressOverlay">
  <div class="pfs-box" id="pfsProgressBox" role="dialog" aria-modal="true" aria-labelledby="pfsProgressTitle" tabindex="-1">
    <div class="pfs-header pfs-header--progress">
      <div class="pfs-header-icon"><i class="fas fa-cog fa-spin" aria-hidden="true"></i></div>
      <div class="pfs-header-text">
        <h3 id="pfsProgressTitle" data-pfs="progress-title">Processando</h3>
        <p data-pfs="progress-current-task" role="status" aria-live="polite">Iniciando processo...</p>
      </div>
      <button type="button" class="pfs-close" id="pfsProgressClose" aria-label="Ocultar acompanhamento" title="Ocultar acompanhamento"><i class="fas fa-minus" aria-hidden="true"></i></button>
    </div>
    <div class="pfs-body">
      <div class="pfs-task-card pfs-hidden" id="pfsTaskCard">
        <div class="pfs-task-step"><span class="pfs-task-step-num" data-pfs="task-step-num">1</span><span class="pfs-task-step-total" data-pfs="task-step-total">de 1</span></div>
        <div class="pfs-task-info"><div class="pfs-task-name" data-pfs="task-name">Iniciando...</div><div class="pfs-task-desc" data-pfs="task-desc"></div></div>
        <div class="pfs-task-spinner"><i class="fas fa-circle-notch fa-spin" aria-hidden="true"></i></div>
      </div>
      <div class="pfs-completed-list" id="pfsCompletedList"></div>
      <div class="pfs-log" id="pfsLog" role="log" aria-label="Log do processo"></div>
    </div>
    <div class="pfs-progress-footer">
      <button type="button" class="pfs-btn pfs-btn--cancel" id="pfsCancelBtn" hidden><i class="fas fa-ban" aria-hidden="true"></i><span class="pfs-cancel-label">CANCELAR</span></button>
    </div>
    <div class="pfs-progress-wrapper">
      <div class="pfs-progress-info"><span data-pfs="progress-meta">Tarefa 0 de 0</span><span class="pfs-progress-percent" data-pfs="progress-percent">0%</span></div>
      <div class="pfs-progress-bar" role="progressbar" aria-label="Progresso do processo" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div class="pfs-progress-fill" id="pfsProgressFill"></div></div>
      <div class="pfs-segments" id="pfsSegments"></div>
    </div>
  </div>
</div>
<div class="pfs-overlay" id="pfsStatusOverlay">
  <div class="pfs-box" id="pfsSuccessBox" role="dialog" aria-modal="true" aria-labelledby="pfsSuccessHeaderTitle" tabindex="-1">
    <div class="pfs-header pfs-header--success">
      <div class="pfs-header-icon"><i class="fas fa-check-circle" aria-hidden="true"></i></div>
      <div class="pfs-header-text"><h3 id="pfsSuccessHeaderTitle" data-pfs="success-header-title">Ação Executada</h3><p data-pfs="success-header-sub"></p></div>
      <button type="button" class="pfs-close" id="pfsSuccessClose" aria-label="Fechar"><i class="fas fa-times" aria-hidden="true"></i></button>
    </div>
    <div class="pfs-body">
      <div class="pfs-result-content">
        <div class="pfs-result-icon"><i class="fas fa-check" aria-hidden="true"></i></div>
        <h2 class="pfs-result-title" data-pfs="success-title">Operação Concluída!</h2>
        <p class="pfs-result-message" data-pfs="success-message">Seus dados foram processados com sucesso.</p>
        <div class="pfs-file-summary" id="pfsSuccessSummary"></div>
        <div class="pfs-subprocess-list" id="pfsSuccessSubprocesses"></div>
      </div>
    </div>
    <div class="pfs-footer"><button type="button" class="pfs-btn pfs-btn--success" id="pfsSuccessOk"><i class="fas fa-check" aria-hidden="true"></i>OK</button></div>
  </div>
  <div class="pfs-box" id="pfsPartialBox" role="dialog" aria-modal="true" aria-labelledby="pfsPartialHeaderTitle" tabindex="-1">
    <div class="pfs-header pfs-header--partial">
      <div class="pfs-header-icon"><i class="fas fa-exclamation-circle" aria-hidden="true"></i></div>
      <div class="pfs-header-text"><h3 id="pfsPartialHeaderTitle" data-pfs="partial-header-title">Ação Executada</h3><p data-pfs="partial-header-sub"></p></div>
      <button type="button" class="pfs-close" id="pfsPartialClose" aria-label="Fechar"><i class="fas fa-times" aria-hidden="true"></i></button>
    </div>
    <div class="pfs-body">
      <div class="pfs-result-content">
        <div class="pfs-result-icon pfs-result-icon--partial"><i class="fas fa-exclamation" aria-hidden="true"></i></div>
        <h2 class="pfs-result-title" data-pfs="partial-title">Operação concluída parcialmente</h2>
        <p class="pfs-result-message" data-pfs="partial-message">Existem ressalvas.</p>
        <div class="pfs-file-summary" id="pfsPartialSummary"></div>
        <div class="pfs-subprocess-list" id="pfsPartialSubprocesses"></div>
      </div>
    </div>
    <div class="pfs-footer"><button type="button" class="pfs-btn pfs-btn--partial" id="pfsPartialOk"><i class="fas fa-check" aria-hidden="true"></i>OK</button></div>
  </div>
  <div class="pfs-box" id="pfsErrorBox" role="alertdialog" aria-modal="true" aria-labelledby="pfsErrorHeaderTitle" tabindex="-1">
    <div class="pfs-header pfs-header--error">
      <div class="pfs-header-icon"><i class="fas fa-exclamation-triangle" aria-hidden="true"></i></div>
      <div class="pfs-header-text"><h3 id="pfsErrorHeaderTitle" data-pfs="error-header-title">Ação Executada</h3><p data-pfs="error-header-sub"></p></div>
      <button type="button" class="pfs-close" id="pfsErrorClose" aria-label="Fechar e baixar relatório"><i class="fas fa-times" aria-hidden="true"></i></button>
    </div>
    <div class="pfs-body">
      <div class="pfs-result-content">
        <div class="pfs-error-icon"><i class="fas fa-times" aria-hidden="true"></i></div>
        <h2 class="pfs-error-title" data-pfs="error-title">Falha no Processo</h2>
        <p class="pfs-error-message" data-pfs="error-message">Ocorreu um erro durante o processamento.</p>
        <div class="pfs-error-details">
          <div class="pfs-error-details-header"><i class="fas fa-bug" aria-hidden="true"></i>Detalhes do Erro</div>
          <div class="pfs-error-log" id="pfsErrorLog"></div>
        </div>
        <div class="pfs-solution" id="pfsSolution">
          <div class="pfs-solution-title"><i class="fas fa-lightbulb" aria-hidden="true"></i>Como Resolver</div>
          <p class="pfs-solution-text" data-pfs="error-solution">Verifique os dados informados e tente novamente.</p>
        </div>
      </div>
    </div>
    <div class="pfs-footer"><button type="button" class="pfs-btn pfs-btn--error" id="pfsErrorOk"><i class="fas fa-file-alt" aria-hidden="true"></i>OK - Baixar Relatório de Erro</button></div>
  </div>
</div>
<div class="pfs-overlay" id="pfsConfirmOverlay">
  <div class="pfs-box pfs-confirm-box" id="pfsConfirmBox" role="alertdialog" aria-modal="true" aria-labelledby="pfsConfirmTitle" aria-describedby="pfsConfirmMessage" tabindex="-1">
    <div class="pfs-header pfs-header--progress">
      <div class="pfs-header-icon" id="pfsConfirmIcon"><i class="fas fa-question-circle" aria-hidden="true"></i></div>
      <div class="pfs-header-text"><h3 id="pfsConfirmTitle" data-pfs="confirm-title">Confirmar Ação</h3></div>
      <button type="button" class="pfs-close" id="pfsConfirmClose" aria-label="Fechar"><i class="fas fa-times" aria-hidden="true"></i></button>
    </div>
    <div class="pfs-body pfs-confirm-body">
      <p class="pfs-confirm-message" id="pfsConfirmMessage" data-pfs="confirm-message"></p>
      <p class="pfs-confirm-warning" data-pfs="confirm-warning"></p>
      <p class="pfs-confirm-prompt" data-pfs="confirm-prompt">Deseja continuar?</p>
      <div class="pfs-confirm-input-wrap" id="pfsConfirmInputWrap">
        <label class="pfs-credential-field"><span data-pfs="confirm-input-label"></span><input type="text" class="pfs-confirm-input" id="pfsConfirmInput" maxlength="200"></label>
      </div>
    </div>
    <div class="pfs-footer">
      <button type="button" class="pfs-btn pfs-btn--secondary" id="pfsConfirmCancel"><span data-pfs="confirm-cancel-label">Cancelar</span></button>
      <button type="button" class="pfs-btn pfs-btn--primary" id="pfsConfirmOk"><span data-pfs="confirm-confirm-label">Continuar</span></button>
    </div>
  </div>
</div>
<div class="pfs-overlay" id="pfsCredentialOverlay">
  <div class="pfs-box pfs-confirm-box" id="pfsCredentialBox" role="dialog" aria-modal="true" aria-labelledby="pfsCredentialTitle" tabindex="-1">
    <div class="pfs-header" id="pfsCredentialHeader">
      <div class="pfs-header-icon" id="pfsCredentialHeaderIcon"><i class="fas fa-user-tie" aria-hidden="true"></i></div>
      <div class="pfs-header-text"><h3 id="pfsCredentialTitle" data-pfs="credential-title">Confirmação de Credencial</h3></div>
      <button type="button" class="pfs-close" id="pfsCredentialClose" aria-label="Fechar"><i class="fas fa-times" aria-hidden="true"></i></button>
    </div>
    <div class="pfs-body pfs-credential-body" id="pfsCredentialAuthorized">
      <div class="pfs-credential-icon-area" id="pfsCredentialIconArea"><i class="fas fa-lock" aria-hidden="true"></i></div>
      <p class="pfs-credential-restricted-label" id="pfsCredentialRestrictedLabel">Ação Restrita!</p>
      <p class="pfs-credential-message" data-pfs="credential-message"></p>
      <div class="pfs-credential-field">
        <label for="pfsCredentialPassword" data-pfs="credential-label">Senha</label>
        <input type="password" class="pfs-credential-input" id="pfsCredentialPassword" autocomplete="current-password">
        <p class="pfs-credential-error" id="pfsCredentialErrorInline" role="alert"></p>
      </div>
    </div>
    <div class="pfs-footer" id="pfsCredentialFooter">
      <button type="button" class="pfs-btn pfs-btn--secondary" id="pfsCredentialCancel"><span data-pfs="credential-cancel-label">Cancelar</span></button>
      <button type="button" class="pfs-btn" id="pfsCredentialOk"><span data-pfs="credential-confirm-label">Confirmar</span></button>
    </div>
  </div>
</div>`;

    /*
     * Um <dialog> aberto com showModal() fica na top layer: um overlay no body
     * ficaria atrás dele. O componente acompanha o diálogo aberto mais recente e
     * volta ao body quando ele fecha — inclusive se o diálogo for removido junto.
     */
    let hostComponente = null;
    function acompanharTopLayer(node) {
        const posicionar = () => {
            const destino = [...document.querySelectorAll('dialog[open]')].filter(d => !node.contains(d)).at(-1) || document.body;
            if (destino && node.parentNode !== destino) destino.appendChild(node);
        };
        new MutationObserver(posicionar).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['open'] });
        posicionar();
        return posicionar;
    }
    let posicionarComponente = () => {};
    function garantirComponente() {
        if (hostComponente) { posicionarComponente(); return true; }
        if (!document.body) return false;
        hostComponente = document.createElement('div');
        hostComponente.id = 'pfsComponente';
        hostComponente.innerHTML = COMPONENTE;
        document.body.appendChild(hostComponente);
        posicionarComponente = acompanharTopLayer(hostComponente);
        return true;
    }
    if (!garantirComponente()) document.addEventListener('DOMContentLoaded', garantirComponente, { once: true });

    /* Foco: o modal aberto recebe o foco e o devolve ao fechar. */
    const focoAnterior = new WeakMap();
    function abrirComFoco(box, alvo) {
        if (!focoAnterior.has(box)) focoAnterior.set(box, document.activeElement);
        setTimeout(() => { (alvo || box).focus?.({ preventScroll: true }); }, 30);
    }
    function devolverFoco(box) {
        const anterior = focoAnterior.get(box);
        focoAnterior.delete(box);
        if (anterior && anterior.isConnected && typeof anterior.focus === 'function') anterior.focus({ preventScroll: true });
    }

    /* ============================================================
       ProcessFeedbackSystem — Overlay de Progresso em Tempo Real
       ============================================================ */
    class ProcessFeedbackSystem {
        constructor(config = {}) {
            this.config = config;
            this.tasks = [];
            this.currentTaskIndex = -1;
            this._percent = 0;
            this._startTime = null;
            this._activityTimer = null;
            this._lastActivity = Date.now();
            this._bound = false;
            this._eventSource = null;
        }

        /* ── Bind ao DOM do componente ── */
        _bind() {
            if (this._bound) return;
            garantirComponente();
            this.overlay = q('#pfsProgressOverlay');
            if (!this.overlay) { console.error('[PFS] componente de feedback não disponível na página'); return; }
            this.box = q('#pfsProgressBox');
            this.taskCard = q('#pfsTaskCard');
            this.completedList = q('#pfsCompletedList');
            this.logEl = q('#pfsLog');
            this.cancelBtn = q('#pfsCancelBtn');
            this.progressFill = q('#pfsProgressFill');
            this.segmentsEl = q('#pfsSegments');
            /* O componente é compartilhado: os botões falam com o processo corrente. */
            if (!this.cancelBtn.dataset.pfsBound) {
                this.cancelBtn.dataset.pfsBound = '1';
                this.cancelBtn.addEventListener('click', () => _progressSystem?.cancelar());
                q('#pfsProgressClose')?.addEventListener('click', () => _progressSystem?.fechar());
            }
            this._bound = true;
        }

        /* ── Abrir overlay com tarefas ── */
        iniciar(title, subtitle, tasks) {
            this._bind();
            this._startTime = Date.now();
            this._actionTitle = title || 'Processando';
            this.tasks = (tasks || []).map(t => ({
                name: typeof t === 'string' ? t : t.name,
                desc: typeof t === 'string' ? '' : (t.description || ''),
                weight: typeof t === 'string' ? 1 : (t.weight || 1),
                completed: false
            }));
            this.currentTaskIndex = -1;
            this._percent = 0;

            /* Reset UI */
            pfsText('progress-title', title || 'Processando');
            const autoSub = subtitle || (this.tasks.length > 0 ? this.tasks[0].name : 'Iniciando processo...');
            pfsText('progress-current-task', autoSub);
            this.completedList.innerHTML = '';
            this.logEl.innerHTML = '';
            this.progressFill.style.width = '0%';
            this._barra(0);
            pfsText('progress-meta', `Tarefa 0 de ${this.tasks.length}`);

            /* Task card */
            if (this.tasks.length > 0) {
                this.taskCard.classList.remove('pfs-hidden');
                pfsText('task-step-num', '1');
                pfsText('task-step-total', `de ${this.tasks.length}`);
                pfsText('task-name', this.tasks[0].name);
                pfsText('task-desc', this.tasks[0].desc);
            } else {
                this.taskCard.classList.add('pfs-hidden');
            }

            /* Segments */
            this.segmentsEl.innerHTML = '';
            this.tasks.forEach(() => {
                const s = document.createElement('div');
                s.className = 'pfs-segment';
                this.segmentsEl.appendChild(s);
            });

            /* Cancel */
            this.cancelBtn.hidden = !this.config.onCancel;
            const lbl = this.cancelBtn.querySelector('.pfs-cancel-label');
            if (lbl) lbl.textContent = this.config.cancelButtonLabel || 'CANCELAR';
            this.cancelBtn.disabled = false;

            /* Show */
            this.box.classList.add('pfs-active');
            this.overlay.classList.add('pfs-active');
            abrirComFoco(this.box);
            this._startActivityMonitor();
            this.log(`${title || 'Processo'} iniciado`, 'info');
        }

        /* ── Tarefa atual ── */
        tarefaAtual(taskName, description) {
            this._bind(); this._touch();
            let idx = this.tasks.findIndex(t => t.name === taskName);
            if (idx === -1) {
                this.tasks.push({ name: taskName, desc: description || '', weight: 1, completed: false });
                idx = this.tasks.length - 1;
                const s = document.createElement('div'); s.className = 'pfs-segment';
                this.segmentsEl.appendChild(s);
                pfsText('task-step-total', `de ${this.tasks.length}`);
            }
            this.currentTaskIndex = idx;
            pfsText('progress-current-task', taskName);
            pfsText('task-step-num', String(idx + 1));
            pfsText('task-step-total', `de ${this.tasks.length}`);
            pfsText('task-name', taskName);
            pfsText('task-desc', description || this.tasks[idx].desc);
            pfsText('progress-meta', `Tarefa ${idx + 1} de ${this.tasks.length}`);
            this.taskCard.classList.remove('pfs-hidden');
            this.taskCard.classList.remove('pfs-task-card-enter');
            void this.taskCard.offsetWidth;
            this.taskCard.classList.add('pfs-task-card-enter');

            const segs = this.segmentsEl.children;
            for (let i = 0; i < segs.length; i++) segs[i].classList.remove('pfs-segment--active');
            if (segs[idx] && !this.tasks[idx].completed) segs[idx].classList.add('pfs-segment--active');

            this.log(`▸ ${taskName}`, 'task-start');
        }

        /* ── Descrição da tarefa atual (detalhe que muda sem trocar de tarefa) ── */
        detalhe(description) {
            this._touch();
            pfsText('task-desc', description || '');
        }

        /* ── Etapa ── */
        etapa(message) { this._touch(); this.log(message, 'step'); }

        /* ── Concluir tarefa ── */
        concluirTarefa(taskName, message) {
            this._touch();
            const idx = this.tasks.findIndex(t => t.name === taskName);
            if (idx >= 0) {
                if (this.tasks[idx].completed) return;
                this.tasks[idx].completed = true;
                const seg = this.segmentsEl.children[idx];
                if (seg) { seg.classList.remove('pfs-segment--active'); seg.classList.add('pfs-segment--completed'); }
            }

            const item = document.createElement('div');
            item.className = 'pfs-completed-item';
            item.innerHTML = `
                <span class="pfs-completed-check"><i class="fas fa-check-circle" aria-hidden="true"></i></span>
                <span class="pfs-completed-name">${esc(taskName)}</span>
                <span class="pfs-completed-msg">${esc(message || 'Concluído')}</span>`;
            this.completedList.appendChild(item);

            /* Auto-progress */
            const totalW = this.tasks.reduce((s, t) => s + t.weight, 0);
            const doneW = this.tasks.filter(t => t.completed).reduce((s, t) => s + t.weight, 0);
            if (totalW > 0 && !this._progressoExterno) this.progresso(Math.round((doneW / totalW) * 100));

            this.log(`✓ ${taskName}: ${message || 'Concluído'}`, 'success');
        }

        /* ── Progresso ── */
        progresso(percent) {
            this._touch();
            this._percent = Math.min(100, Math.max(0, Math.round(Number(percent) || 0)));
            if (this.progressFill) this.progressFill.style.width = this._percent + '%';
            this._barra(this._percent);
        }
        _barra(pct) {
            pfsText('progress-percent', pct + '%');
            q('#pfsProgressBox .pfs-progress-bar')?.setAttribute('aria-valuenow', String(pct));
        }

        /* ── Log ── */
        log(message, type) {
            this._touch();
            if (!this.logEl || message == null || message === '') return;
            const icons = {
                'task-start': '<div class="pfs-log-spinner"></div>',
                step: '<i class="fas fa-chevron-right"></i>',
                success: '<i class="fas fa-check"></i>',
                error: '<i class="fas fa-times"></i>',
                warning: '<i class="fas fa-exclamation-triangle"></i>',
                info: '<i class="fas fa-info-circle"></i>'
            };
            /* Só a tarefa corrente gira. */
            if (type === 'task-start') this.logEl.querySelectorAll('.pfs-log-spinner').forEach(s => { s.outerHTML = '<i class="fas fa-chevron-right"></i>'; });
            const entry = document.createElement('div');
            entry.className = `pfs-log-entry pfs-log-entry--${icons[type] ? type : 'step'}`;
            entry.innerHTML = `<span class="pfs-log-time">${now()}</span><span class="pfs-log-icon" aria-hidden="true">${icons[type] || icons.step}</span><span class="pfs-log-msg">${esc(message)}</span>`;
            this.logEl.appendChild(entry);
            this.logEl.scrollTop = this.logEl.scrollHeight;
        }

        /* ── SSE (EventSource) — do V2 ── */
        startSSE(url, opts) {
            this._bind();
            opts = opts || {};
            this.iniciar(opts.title || 'Processando', opts.subtitle || 'Conectando...', opts.tasks || []);
            const es = new EventSource(url, { withCredentials: true });
            this._eventSource = es;
            es.onmessage = (ev) => { try { this._handleEvent(JSON.parse(ev.data)); } catch { this.log(ev.data, 'step'); } };
            es.onerror = () => { es.close(); this._eventSource = null; };
            return es;
        }

        /* ── NDJSON stream — do V2 ── */
        async connectStream(fetchFn, opts) {
            this._bind();
            opts = opts || {};
            this.iniciar(opts.title || 'Processando', opts.subtitle || 'Conectando...', opts.tasks || []);
            try {
                const resp = await fetchFn();
                if (!resp.ok) {
                    let ed; try { ed = await resp.json(); } catch { ed = { detail: await resp.text() }; }
                    this.erro(ed); return;
                }
                const reader = resp.body.getReader(), dec = new TextDecoder();
                let buf = '';
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    buf += dec.decode(value, { stream: true });
                    const lines = buf.split('\n'); buf = lines.pop();
                    for (const ln of lines) { const t = ln.trim().replace(/^data:\s*/, ''); if (!t) continue; try { this._handleEvent(JSON.parse(t)); } catch { this.log(t, 'step'); } }
                }
                if (buf.trim()) { try { this._handleEvent(JSON.parse(buf.trim().replace(/^data:\s*/, ''))); } catch { /* noop */ } }
            } catch (err) { this.erro({ detail: err.message || 'Erro de conexão' }); }
        }

        /* ── Event router ── */
        _handleEvent(ev) {
            const type = ev.type || ev.event || '';
            switch (type) {
                case 'task': this.tarefaAtual(ev.name || ev.task || '', ev.description || ''); break;
                case 'log': case 'step': this.log(ev.message || ev.msg || '', ev.level || 'step'); break;
                case 'progress': this.progresso(ev.percent ?? ev.pct ?? ev.progress ?? 0); break;
                case 'task_complete': case 'task-complete': this.concluirTarefa(ev.name || ev.task || '', ev.message || ''); break;
                case 'done': case 'success': this.sucesso(ev.data || ev); break;
                case 'partial': this.sucesso({ ...(ev.data || ev), _status: 'partial' }); break;
                case 'error': this.erro(ev.data || ev); break;
                default: if (ev.message || ev.msg) this.log(ev.message || ev.msg, ev.level || 'info');
            }
        }

        /* ── Sucesso → delega ao StatusFeedbackSystem ── */
        sucesso(data) {
            if (this._finalizado) return;
            this._finalizado = true;
            this._stop();
            const elapsed = this._elapsed();
            this.progresso(100);
            this.log(data && data._status === 'partial' ? 'Processo concluído com ressalvas.' : 'Processo concluído com sucesso!', data && data._status === 'partial' ? 'warning' : 'success');
            setTimeout(() => {
                this._fecharSeCorrente();
                if (data && data._status === 'partial') _statusSystem.mostrarParcial({ actionTitle: this._actionTitle, ...data, _elapsed: elapsed });
                else _statusSystem.mostrarSucesso({ actionTitle: this._actionTitle, ...data, _elapsed: elapsed });
                if (this.config.onSuccess) this.config.onSuccess(data);
            }, 500);
        }

        /* ── Erro → delega ao StatusFeedbackSystem ── */
        erro(data) {
            if (this._finalizado) return;
            this._finalizado = true;
            this._stop();
            const elapsed = this._elapsed();
            this.log('Erro no processo!', 'error');
            if (this.currentTaskIndex >= 0) {
                const seg = this.segmentsEl.children[this.currentTaskIndex];
                if (seg) { seg.classList.remove('pfs-segment--active'); seg.classList.add('pfs-segment--error'); }
            }
            setTimeout(() => {
                this._fecharSeCorrente();
                _statusSystem.mostrarErro({ actionTitle: this._actionTitle, ...(typeof data === 'string' ? { message: data } : data), _elapsed: elapsed });
                if (this.config.onError) this.config.onError(data);
            }, 800);
        }

        /* ── Cancelar ── */
        cancelar() {
            if (this._finalizado) return;
            this._finalizado = true;
            this._stop(); this.log('Cancelado pelo usuário', 'warning'); this.fechar();
            if (this.config.onCancel) this.config.onCancel();
        }

        /* ── Fechar ── */
        fechar() {
            this._stop();
            if (this.overlay && this.box.classList.contains('pfs-active')) {
                this.overlay.classList.remove('pfs-active'); this.box.classList.remove('pfs-active');
                devolverFoco(this.box);
            }
        }
        /* Um processo que terminou não fecha o overlay de outro que já começou. */
        _fecharSeCorrente() { if (!_progressSystem || _progressSystem === this) this.fechar(); else this._stop(); }

        /* ── Internals ── */
        _touch() { this._lastActivity = Date.now(); }
        _stop() { this._stopActivityMonitor(); this._closeSSE(); this._sicardStop?.(); }

        _startActivityMonitor() {
            this._stopActivityMonitor();
            this._lastActivity = Date.now();
            this._activityTimer = setInterval(() => {
                if (Date.now() - this._lastActivity > 30000) { this.log('Aguardando resposta do servidor...', 'warning'); this._lastActivity = Date.now(); }
            }, 15000);
        }
        _stopActivityMonitor() { if (this._activityTimer) { clearInterval(this._activityTimer); this._activityTimer = null; } }
        _closeSSE() { if (this._eventSource) { this._eventSource.close(); this._eventSource = null; } }
        _elapsed() { return this._startTime ? ((Date.now() - this._startTime) / 1000).toFixed(1) + 's' : '0.0s'; }
    }

    /* ============================================================
       StatusFeedbackSystem — Overlays de Resultado
       ============================================================ */
    class StatusFeedbackSystem {
        constructor(config = {}) {
            this.config = config;
            this._bound = false;
            this._lastErrorData = null;
            this._onClose = null;
        }

        _bind() {
            if (this._bound) return;
            garantirComponente();
            this.overlay = q('#pfsStatusOverlay');
            if (!this.overlay) { console.error('[PFS] componente de feedback não disponível na página'); return; }
            this.successBox = q('#pfsSuccessBox');
            this.partialBox = q('#pfsPartialBox');
            this.errorBox = q('#pfsErrorBox');
            q('#pfsSuccessOk').addEventListener('click', () => this.fechar());
            q('#pfsPartialOk').addEventListener('click', () => this.fechar());
            q('#pfsErrorOk').addEventListener('click', () => { this._downloadReport(); this.fechar(); });
            q('#pfsSuccessClose')?.addEventListener('click', () => this.fechar());
            q('#pfsPartialClose')?.addEventListener('click', () => this.fechar());
            q('#pfsErrorClose')?.addEventListener('click', () => { this._downloadReport(); this.fechar(); });
            document.addEventListener('keydown', (e) => {
                if (e.key !== 'Escape' || !this.overlay.classList.contains('pfs-active')) return;
                if (q('#pfsConfirmOverlay.pfs-active') || q('#pfsCredentialOverlay.pfs-active')) return;
                this.fechar();
            });
            this._bound = true;
        }

        _hideAll() { [this.successBox, this.partialBox, this.errorBox].forEach(b => b.classList.remove('pfs-active')); }

        _show(box, data) {
            this._bind(); this._hideAll();
            this._onClose = typeof data?.onClose === 'function' ? data.onClose : null;
            box.classList.add('pfs-active'); this.overlay.classList.add('pfs-active');
            this._aberto = box;
            abrirComFoco(box, box.querySelector('.pfs-footer .pfs-btn'));
        }

        _setHeader(prefix, box, data, fallbackTitle) {
            const actionTitle = data.actionTitle || data.headerTitle || data.acao || data.action || fallbackTitle || 'Ação Executada';
            const actionSubtitle = data.actionSubtitle || data.headerSubtitle || data.headerSub || '';
            pfsText(`${prefix}-header-title`, actionTitle, box);
            pfsText(`${prefix}-header-sub`, actionSubtitle, box);
        }

        /* ── Sucesso ── */
        mostrarSucesso(data) {
            data = data || {};
            this._bind();
            this._setHeader('success', this.successBox, data, 'Ação Executada');
            pfsText('success-title', data.title || 'Operação Concluída!', this.successBox);
            pfsText('success-message', data.message || data.msg || 'Seus dados foram processados com sucesso.', this.successBox);
            this._fillSummary('pfsSuccessSummary', this._buildSummary(data));
            this._renderSubs('pfsSuccessSubprocesses', data.subprocesses || data.sub_processes || []);
            this._show(this.successBox, data);
        }

        /* ── Parcial ── */
        mostrarParcial(data) {
            data = data || {};
            this._bind();
            this._setHeader('partial', this.partialBox, data, 'Ação Executada');
            pfsText('partial-title', data.title || 'Operação concluída parcialmente', this.partialBox);
            pfsText('partial-message', data.message || data.msg || 'Existem ressalvas.', this.partialBox);
            this._fillSummary('pfsPartialSummary', this._buildSummary(data));
            this._renderSubs('pfsPartialSubprocesses', data.subprocesses || data.sub_processes || []);
            this._show(this.partialBox, data);
        }

        /* ── Erro ── */
        mostrarErro(data) {
            data = data || {};
            this._bind();
            this._setHeader('error', this.errorBox, typeof data === 'object' ? data : {}, 'Ação Executada');
            const n = this._normalize(data);
            this._lastErrorData = n;

            pfsText('error-title', n.title, this.errorBox);
            pfsText('error-message', n.message, this.errorBox);

            const logEl = q('#pfsErrorLog');
            logEl.innerHTML = '';
            if (n.details.length) {
                n.details.forEach(d => { const div = document.createElement('div'); div.style.marginBottom = '4px'; div.textContent = typeof d === 'string' ? d : JSON.stringify(d); logEl.appendChild(div); });
            } else if (n.raw && typeof n.raw !== 'object') {
                logEl.textContent = String(n.raw);
            }

            const solEl = q('#pfsSolution');
            if (n.solution) { solEl.style.display = ''; pfsText('error-solution', n.solution); } else { solEl.style.display = 'none'; }

            this._show(this.errorBox, data);
        }

        /* ── Fechar ── */
        fechar() {
            if (this.overlay) { this.overlay.classList.remove('pfs-active'); this._hideAll(); }
            if (this._aberto) { devolverFoco(this._aberto); this._aberto = null; }
            const aoFechar = this._onClose; this._onClose = null;
            if (aoFechar) aoFechar();
            if (this.config.onClose) this.config.onClose();
        }

        /* ── Helpers ── */
        _buildSummary(d) {
            if (Array.isArray(d.summary) && d.summary.length) return d.summary;
            const items = [];
            const id = d.id || d.arquivo_id || d.file_id || d.fileId || null;
            const name = d.nome || d.name || d.arquivo_nome || d.file_name || d.fileName || null;
            const size = d.tamanho || d.size || d.file_size || d.fileSize || null;
            const protocol = d.protocol || null;
            const time = d._elapsed || d.tempo || d.time || null;
            if (id) items.push({ label: 'ID', value: id, icon: 'fa-hashtag' });
            if (name) items.push({ label: 'Arquivo', value: name, icon: 'fa-file' });
            if (size) items.push({ label: 'Tamanho', value: size, icon: 'fa-weight-hanging' });
            if (protocol) items.push({ label: 'Protocolo', value: protocol, icon: 'fa-barcode' });
            if (time) items.push({ label: 'Tempo', value: time, icon: 'fa-clock' });
            return items;
        }

        _fillSummary(containerId, items) {
            const ct = q('#' + containerId);
            if (!ct) return;
            ct.innerHTML = '';
            if (!items.length) { ct.style.display = 'none'; return; }
            ct.style.display = '';
            items.forEach(it => {
                const row = document.createElement('div');
                row.className = 'pfs-file-row';
                row.innerHTML = `<span class="pfs-file-label"><i class="fas ${esc(it.icon || 'fa-info-circle')}" aria-hidden="true"></i> ${esc(it.label)}:</span><span class="pfs-file-value">${esc(String(it.value ?? ''))}</span>`;
                ct.appendChild(row);
            });
        }

        _renderSubs(containerId, subs) {
            const ct = q('#' + containerId); if (!ct) return; ct.innerHTML = '';
            if (!subs || !subs.length) return;
            subs.forEach((sp, i) => {
                const st = (sp.status || sp.state || 'success').toLowerCase();
                const sc = st.includes('warn') ? 'warning' : st.includes('skip') ? 'skip' : (st.includes('err') || st.includes('fail')) ? 'error' : 'success';
                const icons = { success: 'fa-check', warning: 'fa-exclamation', skip: 'fa-forward', error: 'fa-times' };
                const marks = { success: '✓', warning: '⚠', skip: '→', error: '✗' };
                const item = document.createElement('div');
                item.className = `pfs-sp-item pfs-sp--${sc}`;
                item.style.animationDelay = `${i * 0.08}s`;
                let h = `<div class="pfs-sp-icon" aria-hidden="true"><i class="fas ${icons[sc]}"></i></div><span class="pfs-sp-name">${esc(sp.name || sp.subprocess || `Sub ${i + 1}`)}</span><span class="pfs-sp-status" aria-hidden="true">${marks[sc]}</span>`;
                if (sp.detail || sp.message) h += `<span class="pfs-sp-detail">${esc(sp.detail || sp.message)}</span>`;
                if (sp.action_url && sp.action_label) h += `<a href="${esc(sp.action_url)}" class="pfs-sp-action-btn">${esc(sp.action_label)}</a>`;
                item.innerHTML = h;
                /* Ação em código (SICARD): mesmo botão, executado ao clicar e fechando o modal. */
                if (typeof sp.action === 'function' && sp.action_label && !sp.action_url) {
                    const b = document.createElement('button');
                    b.type = 'button'; b.className = 'pfs-sp-action-btn'; b.textContent = sp.action_label;
                    b.addEventListener('click', () => { this.fechar(); sp.action(); });
                    item.appendChild(b);
                }
                ct.appendChild(item);
            });
        }

        _normalize(data) {
            const r = { title: 'Falha no Processo', message: '', details: [], solution: '', raw: data };
            if (typeof data === 'string') { r.message = data; r.details = [data]; return r; }
            if (data instanceof Error) { r.message = data.message; r.details = data.detail ? [].concat(data.detail).map(String) : []; return r; }
            r.title = data.title || r.title;
            r.message = data.message || data.msg || (typeof data.detail === 'string' ? data.detail : '') || '';
            if (typeof r.message === 'object') r.message = JSON.stringify(r.message);

            const parseList = (arr) => arr.map(e => {
                if (typeof e === 'string') return e;
                if (e && e.msg && e.loc) { const f = Array.isArray(e.loc) ? e.loc.filter(l => l !== 'body').join(' → ') : String(e.loc); return `${f}: ${e.msg}`; }
                return (e && (e.msg || e.message)) || JSON.stringify(e);
            });

            if (Array.isArray(data.errors)) r.details = parseList(data.errors);
            else if (Array.isArray(data.detail)) r.details = parseList(data.detail);
            else if (Array.isArray(data.details)) r.details = parseList(data.details);
            else if (data.details && typeof data.details === 'string') r.details = [data.details];
            else if (data.detail && typeof data.detail === 'string' && data.detail !== r.message) r.details = [data.detail];
            else if (data.detail && typeof data.detail === 'object' && !Array.isArray(data.detail)) {
                r.message = r.message || data.detail.message || data.detail.detail || '';
                if (data.detail.details) r.details = [].concat(data.detail.details).map(String);
            }
            if (!r.message && r.details.length) r.message = r.details[0];

            r.solution = data.solution || data.sugestao || data.suggestion || '';
            if (!r.solution && r.details.length) r.solution = 'Verifique os dados informados e tente novamente. Se o problema persistir, entre em contato com o suporte.';
            return r;
        }

        _downloadReport() {
            if (!this._lastErrorData) return;
            const d = this._lastErrorData;
            let bruto;
            try { bruto = JSON.stringify(d.raw instanceof Error ? { message: d.raw.message, stack: d.raw.stack } : d.raw, null, 2); } catch { bruto = String(d.raw); }
            const lines = [
                '═══════════════════════════════════════════',
                '  RELATÓRIO DE ERRO — SICARD', '═══════════════════════════════════════════', '',
                `Data/Hora: ${new Date().toLocaleString('pt-BR')}`, `URL: ${window.location.href}`, '',
                `Título: ${d.title}`, `Mensagem: ${d.message}`, '', 'Detalhes:',
                ...d.details.map(det => `  • ${det}`), '',
                `Solução sugerida: ${d.solution || 'N/A'}`, '',
                '═══════════════════════════════════════════', 'Dados brutos (JSON):', bruto
            ];
            const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = `sicard_erro_${Date.now()}.txt`; a.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            this._lastErrorData = null;
        }
    }

    /* ============================================================
       ConfirmFeedbackSystem — Modal de Confirmação (Promise<boolean>)
       ============================================================ */
    class ConfirmFeedbackSystem {
        constructor() {
            this._bound = false;
            this._resolve = null;
            this._escHandler = null;
        }

        _bind() {
            if (this._bound) return;
            garantirComponente();
            this.overlay = q('#pfsConfirmOverlay');
            if (!this.overlay) { console.error('[PFS] componente de feedback não disponível na página'); return; }
            this.box = q('#pfsConfirmBox');
            this.closeBtn = q('#pfsConfirmClose');
            this.cancelBtn = q('#pfsConfirmCancel');
            this.okBtn = q('#pfsConfirmOk');

            this.closeBtn.addEventListener('click', () => this._dismiss(false));
            this.cancelBtn.addEventListener('click', () => this._dismiss(false));
            this.okBtn.addEventListener('click', () => this._dismiss(true));
            this.overlay.addEventListener('click', (e) => { if (e.target === this.overlay) this._dismiss(false); });
            this._bound = true;
        }

        /** Abre o modal de confirmação. Retorna Promise<boolean>.
         *  Se opts.input for passado, retorna Promise<string|null> (null = cancelou). */
        confirmar(opts) {
            opts = typeof opts === 'string' ? { message: opts } : (opts || {});
            this._bind();
            if (this._resolve) this._dismiss(false);
            this._inputMode = !!opts.input;
            this._required = !!(opts.input && opts.input.required !== false);

            pfsText('confirm-title', opts.title || 'Confirmar Ação');
            pfsText('confirm-message', opts.message || '');
            pfsText('confirm-warning', opts.warning || '');
            pfsText('confirm-prompt', opts.prompt ?? (this._inputMode ? '' : 'Deseja continuar?'));
            pfsText('confirm-cancel-label', opts.cancelLabel || 'Cancelar');
            pfsText('confirm-confirm-label', opts.confirmLabel || 'Continuar');
            pfsText('confirm-input-label', opts.input?.label || '');
            this.okBtn.className = 'pfs-btn ' + (opts.danger ? 'pfs-btn--error' : 'pfs-btn--primary');
            q('#pfsConfirmBox .pfs-header').className = 'pfs-header ' + (opts.danger ? 'pfs-header--error' : 'pfs-header--progress');

            const iconEl = q('#pfsConfirmIcon i');
            if (iconEl) iconEl.className = opts.icon || (opts.danger ? 'fas fa-exclamation-triangle' : 'fas fa-question-circle');

            const inputWrap = q('#pfsConfirmInputWrap');
            this._inputEl = q('#pfsConfirmInput');
            if (inputWrap && this._inputEl) {
                this._inputEl.removeAttribute('aria-invalid');
                if (this._inputMode) {
                    inputWrap.classList.add('pfs-active');
                    this._inputEl.value = opts.input.defaultValue ?? opts.input.value ?? '';
                    this._inputEl.placeholder = opts.input.placeholder || '';
                    this._inputEl.maxLength = opts.input.maxLength || 200;
                } else {
                    inputWrap.classList.remove('pfs-active');
                    this._inputEl.value = '';
                }
            }

            this.box.classList.add('pfs-active');
            this.overlay.classList.add('pfs-active');
            /* Ação perigosa começa com o foco em Cancelar; entrada, no campo. */
            abrirComFoco(this.box, this._inputMode ? this._inputEl : (opts.danger ? this.cancelBtn : this.okBtn));
            if (this._inputMode) setTimeout(() => this._inputEl.select(), 60);

            this._escHandler = (e) => {
                if (e.key === 'Escape') { e.preventDefault(); this._dismiss(false); }
                else if (e.key === 'Enter' && this._inputMode && document.activeElement === this._inputEl) { e.preventDefault(); this._dismiss(true); }
                else if (e.key === 'Tab') {
                    const focaveis = [...this.box.querySelectorAll('button, input')].filter(n => !n.disabled && n.getClientRects().length);
                    const first = focaveis[0], last = focaveis.at(-1);
                    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
                    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
                }
            };
            document.addEventListener('keydown', this._escHandler, true);

            return new Promise(resolve => { this._resolve = resolve; });
        }

        _dismiss(confirmed) {
            if (confirmed && this._inputMode && this._required && !this._inputEl.value.trim()) {
                this._inputEl.setAttribute('aria-invalid', 'true');
                this._inputEl.focus();
                return;
            }
            if (this.overlay) { this.overlay.classList.remove('pfs-active'); this.box.classList.remove('pfs-active'); devolverFoco(this.box); }
            if (this._escHandler) { document.removeEventListener('keydown', this._escHandler, true); this._escHandler = null; }
            if (this._resolve) {
                const r = this._resolve; this._resolve = null;
                if (this._inputMode) { r(confirmed ? (this._inputEl ? this._inputEl.value.trim() : '') : null); }
                else { r(confirmed); }
            }
        }
    }

    /* ============================================================
       CredentialFeedbackSystem — Modal de Credencial (gestor/admin)
       Retorna Promise<{ confirmed: boolean, password: string|null }>
       ============================================================ */
    class CredentialFeedbackSystem {
        constructor() {
            this._bound = false;
            this._resolve = null;
            this._escHandler = null;
            this._currentRole = null;
        }

        _bind() {
            if (this._bound) return;
            garantirComponente();
            this.overlay = q('#pfsCredentialOverlay');
            if (!this.overlay) { console.error('[PFS] componente de feedback não disponível na página'); return; }
            this.box = q('#pfsCredentialBox');
            this.header = q('#pfsCredentialHeader');
            this.headerIcon = q('#pfsCredentialHeaderIcon i');
            this.iconArea = q('#pfsCredentialIconArea');
            this.bodyEl = q('#pfsCredentialAuthorized');
            this.passwordInput = q('#pfsCredentialPassword');
            this.errorInline = q('#pfsCredentialErrorInline');
            this.footer = q('#pfsCredentialFooter');
            this.closeBtn = q('#pfsCredentialClose');
            this.cancelBtn = q('#pfsCredentialCancel');
            this.okBtn = q('#pfsCredentialOk');

            this.closeBtn.addEventListener('click', () => this._dismiss(false));
            this.cancelBtn.addEventListener('click', () => this._dismiss(false));
            this.okBtn.addEventListener('click', () => this._onConfirm());
            this.overlay.addEventListener('click', (e) => { if (e.target === this.overlay) this._dismiss(false); });
            this.passwordInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') this._onConfirm(); });
            this._bound = true;
        }

        /** Abre o modal de credencial para GESTOR. */
        confirmarGestor(opts) { return this._abrir('GESTOR', opts); }

        /** Abre o modal de credencial para ADMIN. */
        confirmarAdmin(opts) { return this._abrir('ADMIN', opts); }

        /** Configuração e abertura genérica. */
        _abrir(role, opts) {
            opts = opts || {};
            this._bind();
            this._currentRole = role;
            const isGestor = role === 'GESTOR';

            this.header.className = 'pfs-header ' + (isGestor ? 'pfs-credential-header--gestor' : 'pfs-credential-header--admin');
            this.headerIcon.className = isGestor ? 'fas fa-user-tie' : 'fas fa-user-shield';

            const roleLabel = isGestor ? 'Gestor' : 'Administrador';
            pfsText('credential-title', opts.title || 'Confirmação de Credencial');

            this.iconArea.className = 'pfs-credential-icon-area ' + (isGestor ? 'pfs-credential-icon-area--gestor' : 'pfs-credential-icon-area--admin');
            const restrictedLabel = q('#pfsCredentialRestrictedLabel');
            if (restrictedLabel) restrictedLabel.className = 'pfs-credential-restricted-label ' + (isGestor ? 'pfs-credential-restricted-label--gestor' : 'pfs-credential-restricted-label--admin');

            const roleLower = roleLabel.toLowerCase();
            const rolePlural = isGestor ? 'gestores' : 'administradores';
            const defaultMsg = 'Esta ação requer credenciais de ' + roleLabel + '!\nDigite sua senha de ' + roleLower + ' ou entre em contato com um dos ' + rolePlural + ' do sistema.';
            pfsText('credential-message', opts.message || defaultMsg);
            pfsText('credential-label', opts.passwordLabel || 'Senha');
            pfsText('credential-cancel-label', opts.cancelLabel || 'Cancelar');
            pfsText('credential-confirm-label', opts.confirmLabel || 'Confirmar');

            this.passwordInput.value = '';
            this.passwordInput.className = 'pfs-credential-input ' + (isGestor ? 'pfs-credential-input--gestor' : 'pfs-credential-input--admin');
            this.errorInline.textContent = '';
            this.okBtn.className = 'pfs-btn ' + (isGestor ? 'pfs-btn--credential-ok--gestor' : 'pfs-btn--credential-ok--admin');

            this.box.classList.add('pfs-active');
            this.overlay.classList.add('pfs-active');
            abrirComFoco(this.box, this.passwordInput);

            this._escHandler = (e) => { if (e.key === 'Escape') this._dismiss(false); };
            document.addEventListener('keydown', this._escHandler);

            return new Promise(resolve => { this._resolve = resolve; });
        }

        _onConfirm() {
            const pwd = this.passwordInput.value.trim();
            if (!pwd) {
                this.errorInline.textContent = 'Digite sua senha para continuar.';
                this.passwordInput.focus();
                return;
            }
            this.errorInline.textContent = '';
            this._dismiss(true, pwd);
        }

        /** Permite exibir erro externo (ex.: senha incorreta retornada pelo backend). */
        mostrarErro(msg) {
            this._bind();
            if (this.errorInline) this.errorInline.textContent = msg || 'Senha incorreta.';
        }

        _dismiss(confirmed, password) {
            if (this.overlay) { this.overlay.classList.remove('pfs-active'); this.box.classList.remove('pfs-active'); devolverFoco(this.box); }
            if (this._escHandler) { document.removeEventListener('keydown', this._escHandler); this._escHandler = null; }
            if (this._resolve) {
                const r = this._resolve;
                this._resolve = null;
                r({ confirmed: confirmed, password: confirmed ? (password || null) : null });
            }
        }
    }

    /* ============================================================
       Singletons
       ============================================================ */
    let _progressSystem = null;
    const _statusSystem = new StatusFeedbackSystem();
    const _confirmSystem = new ConfirmFeedbackSystem();
    const _credentialSystem = new CredentialFeedbackSystem();

    /* ============================================================
       ProcessFeedback — Wrapper unificado (old + V2 API)
       ============================================================ */
    class ProcessFeedback {
        /* ── Confirm API (Promise<boolean>) ── */
        confirmar(opts) { return _confirmSystem.confirmar(opts); }
        confirm(opts) { return _confirmSystem.confirmar(opts); }

        /* ── Credential API (Promise<{ confirmed, password }>) ── */
        confirmarGestor(opts) { return _credentialSystem.confirmarGestor(opts); }
        confirmarAdmin(opts) { return _credentialSystem.confirmarAdmin(opts); }

        /* ── Old API ── */
        iniciarCadastro(titleOrConfig, tasks, onSuccess, onError) {
            let title = titleOrConfig, cfg = {};
            if (titleOrConfig && typeof titleOrConfig === 'object') {
                cfg = titleOrConfig;
                title = cfg.title || 'Processando';
                tasks = cfg.tasks || [];
                onSuccess = cfg.onSuccess || null;
                onError = cfg.onError || null;
            }
            _progressSystem?._stop();
            _progressSystem = new ProcessFeedbackSystem({ onSuccess, onError, onCancel: cfg.onCancel, cancelButtonLabel: cfg.cancelButtonLabel });
            _progressSystem.iniciar(title, cfg.subtitle || null, tasks || []);
            return _progressSystem;
        }
        tarefa(name, desc) { if (_progressSystem) _progressSystem.tarefaAtual(name, desc); }
        etapa(msg) { if (_progressSystem) _progressSystem.etapa(msg); }
        concluirTarefa(name, msg) { if (_progressSystem) _progressSystem.concluirTarefa(name, msg); }
        sucesso(data) { if (_progressSystem) _progressSystem.sucesso(data); else _statusSystem.mostrarSucesso(data); }
        parcial(data) { this.sucesso({ ...(data || {}), _status: 'partial' }); }
        erro(data) { if (_progressSystem) _progressSystem.erro(data); else _statusSystem.mostrarErro(data); }
        progresso(pct) { if (_progressSystem) _progressSystem.progresso(pct); }
        fechar() { if (_progressSystem) _progressSystem.fechar(); }

        /* ── V2 API ── */
        start(title, msg) { const p = this.iniciarCadastro(title || 'Processando', []); if (msg) p.log(msg, 'info'); return p; }
        open(title, msg, o) { const p = this.iniciarCadastro(title || 'Processando', [], o?.onSuccess, o?.onError); if (msg) p.log(msg, 'info'); return p; }
        task(name) { this.tarefa(name); }
        log(msg, type) { if (_progressSystem) _progressSystem.log(msg, type || 'step'); }
        progress(pct) { if (_progressSystem) _progressSystem.progresso(pct); }
        success(title, msg, data) { this.sucesso({ title, message: msg, ...data }); }
        error(data) { this.erro(data); }
        close() { this.fechar(); }

        startSSE(url, opts) {
            _progressSystem?._stop();
            _progressSystem = new ProcessFeedbackSystem(opts || {});
            return _progressSystem.startSSE(url, opts);
        }

        async connectStream(fetchFn, opts) {
            _progressSystem?._stop();
            _progressSystem = new ProcessFeedbackSystem(opts || {});
            return _progressSystem.connectStream(fetchFn, opts);
        }

        /* ── Processar fetch (old API) ── */
        async processar(fetchFn, onSuccess, onError) {
            try {
                const resp = await fetchFn();
                if (!resp) return;
                const ct = resp.headers?.get('content-type') || '';

                if (ct.includes('text/event-stream') || ct.includes('application/x-ndjson')) {
                    if (_progressSystem) { _progressSystem.config.onSuccess = onSuccess; _progressSystem.config.onError = onError; }
                    const reader = resp.body.getReader(), dec = new TextDecoder();
                    let buf = '';
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        buf += dec.decode(value, { stream: true });
                        const lines = buf.split('\n'); buf = lines.pop();
                        for (const ln of lines) { const t = ln.trim().replace(/^data:\s*/, ''); if (!t) continue; try { if (_progressSystem) _progressSystem._handleEvent(JSON.parse(t)); } catch { if (_progressSystem) _progressSystem.log(t, 'step'); } }
                    }
                    /* A última linha pode chegar sem quebra no fim: também é evento (o SIGMA a descartava). */
                    const resto = buf.trim().replace(/^data:\s*/, '');
                    if (resto) { try { if (_progressSystem) _progressSystem._handleEvent(JSON.parse(resto)); } catch { if (_progressSystem) _progressSystem.log(resto, 'step'); } }
                    return { ok: resp.ok, status: resp.status, stream: true };
                }

                let result;
                const texto = await resp.text();
                try { result = texto ? JSON.parse(texto) : {}; } catch { result = { detail: texto }; }
                if (resp.ok) { if (_progressSystem) _progressSystem.sucesso(result); if (onSuccess) onSuccess(result); }
                else { if (_progressSystem) _progressSystem.erro(result); if (onError) onError(result); }
                return { ok: resp.ok, status: resp.status, data: result };
            } catch (err) {
                const ed = { detail: err.message || 'Erro de conexão' };
                if (_progressSystem) _progressSystem.erro(ed); if (onError) onError(ed);
                return { ok: false, status: 0, data: ed };
            }
        }

        /* ============================================================
           Integração SICARD — jobs do servidor
           ============================================================ */

        /** Processo corrente (ProcessFeedbackSystem) ou null. */
        get atual() { return _progressSystem; }

        /** Liga (fn) ou desliga (null) o botão CANCELAR do processo corrente. */
        permitirCancelamento(fn, rotulo) {
            const p = _progressSystem; if (!p) return;
            p._bind();
            p.config.onCancel = typeof fn === 'function' ? fn : null;
            p.cancelBtn.hidden = !p.config.onCancel;
            if (rotulo) { const l = p.cancelBtn.querySelector('.pfs-cancel-label'); if (l) l.textContent = rotulo; }
        }

        /**
         * Traduz o retrato de um job do SICARD para os eventos do SIGMA:
         * etapa_atual → task; log "sucesso" da tarefa em curso → task_complete;
         * demais logs → log; percentual → progress. `eventos_url` abre o canal
         * SSE do job (evento `progresso`) e as atualizações chegam sozinhas.
         * O desfecho (sucesso/erro) continua com quem chamou, que conhece o resultado.
         */
        acompanhar(job) {
            const p = _progressSystem;
            if (!p || !job || p._finalizado) return;
            const st = p._sicard || (p._sicard = { job: null, seq: 0, chave: null, canal: null, url: null, versao: -1, vivo: false });
            if (String(job.id ?? '') !== st.job) {
                st.job = String(job.id ?? ''); st.seq = 0; st.chave = null; st.versao = -1;
                this._fecharCanal(p, st); st.url = null;
                if (job.eventos_url && window.EventSource) {
                    const url = new URL(job.eventos_url, location.href);
                    if (url.origin === location.origin) { st.url = url.href; this._abrirCanal(p, st); }
                }
            }
            /* Com o canal entregando, o retrato do polling (que pode estar atrasado) não sobrescreve. */
            if (st.vivo && st.canal) return;
            this._aplicarJob(p, st, job);
        }

        /* Canal SSE do job (evento `progresso`). Sem rede ele é fechado e o polling de
           quem chamou volta a valer; com a rede de volta, reabre sozinho. */
        _abrirCanal(p, st) {
            if (!st.url || st.canal || p._finalizado || !navigator.onLine) return;
            const es = new EventSource(st.url, { withCredentials: true });
            st.canal = es; st.vivo = false;
            es.onerror = () => { if (st.canal === es) st.vivo = false; };
            es.addEventListener('progresso', (ev) => {
                if (st.canal !== es || p._finalizado) return;
                try {
                    const atual = JSON.parse(ev.data), versao = Number(ev.lastEventId);
                    if (String(atual.id ?? '') !== st.job) return;
                    st.vivo = true;
                    if (Number.isFinite(versao)) { if (versao <= st.versao) return; st.versao = versao; }
                    this._aplicarJob(p, st, atual);
                    if (['concluido', 'erro', 'cancelado'].includes(atual.status)) { st.url = null; this._fecharCanal(p, st); }
                } catch { /* retrato inválido: o polling de quem chamou continua valendo */ }
            });
            if (!st.rede) {
                st.rede = () => { if (navigator.onLine) this._abrirCanal(p, st); else this._fecharCanal(p, st); };
                window.addEventListener('offline', st.rede);
                window.addEventListener('online', st.rede);
                p._sicardStop = () => {
                    st.url = null; this._fecharCanal(p, st);
                    window.removeEventListener('offline', st.rede); window.removeEventListener('online', st.rede); st.rede = null;
                };
            }
        }

        _fecharCanal(p, st) { st.canal?.close(); st.canal = null; st.vivo = false; }

        _aplicarJob(p, st, job) {
            const logs = job.logs || job.etapas || [];
            const niveis = { sucesso: 'success', erro: 'error', aviso: 'warning', atencao: 'warning', info: 'info' };
            logs.forEach((e, i) => {
                const seq = Number.isFinite(e?.sequencia) ? e.sequencia : i + 1;
                const msg = e?.mensagem ?? e?.message;
                if (seq <= st.seq || !msg) return;
                st.seq = seq;
                const nivel = niveis[e.nivel] || 'info';
                const corrente = p.tasks[p.currentTaskIndex];
                if (nivel === 'success' && corrente && !corrente.completed && corrente.name === msg) p.concluirTarefa(msg, 'Concluído');
                else p.log(msg, nivel);
            });
            const etapa = Object.hasOwn(job, 'etapa_atual') ? job.etapa_atual : job.etapa;
            const nome = job.atividade || etapa;
            const chave = job.tarefa_id != null ? `${job.id ?? ''}:${job.tarefa_id}` : nome;
            if (nome && chave !== st.chave) { st.chave = chave; p.tarefaAtual(nome, job.detalhe || (job.atividade ? etapa : '') || ''); }
            else if (nome && (job.detalhe || job.atividade)) p.detalhe(job.detalhe || etapa || '');
            /* Linha de informação: etapa ou fase do job e, quando medido, o percentual da tarefa em curso. */
            const total = Number(job.total ?? job.total_fases), feitas = Number(job.concluidas ?? job.fases_concluidas);
            const rotulo = job.total != null ? 'Etapa' : 'Fase';
            let meta = Number.isFinite(total) && total > 0 && Number.isFinite(feitas) ? `${rotulo} ${Math.min(feitas + (nome ? 1 : 0), total)} de ${total}` : '';
            if (typeof job.progresso_tarefa === 'number' && Number.isFinite(job.progresso_tarefa)) meta = `${meta ? meta + ' · ' : ''}Tarefa atual: ${Math.round(job.progresso_tarefa)}%`;
            if (meta) pfsText('progress-meta', meta);
            const pct = job.percentual ?? job.progresso_geral;
            if (typeof pct === 'number' && Number.isFinite(pct)) { p._progressoExterno = true; p.progresso(pct); }
        }
    }

    /* ============================================================
       StatusFeedback — Wrapper direto
       ============================================================ */
    class StatusFeedback {
        sucesso(data) { _statusSystem.mostrarSucesso(data); }
        parcial(data) { _statusSystem.mostrarParcial(data); }
        erro(data) { _statusSystem.mostrarErro(data); }
        fechar() { _statusSystem.fechar(); }
    }

    /* ============================================================
       Globals — compatibilidade total
       ============================================================ */
    const _pfWrapper = new ProcessFeedback();
    const _sfWrapper = new StatusFeedback();

    window.ProcessFeedback = _pfWrapper;
    window.ProcessFeedbackV2 = _pfWrapper;
    window.StatusFeedback = _sfWrapper;
    window.ProcessFeedbackSystem = ProcessFeedbackSystem;
    window.StatusFeedbackSystem = StatusFeedbackSystem;
    window.ConfirmFeedbackSystem = ConfirmFeedbackSystem;
    window.CredentialFeedbackSystem = CredentialFeedbackSystem;
})();
