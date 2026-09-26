/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  SIGMA-PLI — Sistema de Notificações Toast (adotado pelo SICARD)        ║
 * ║  Feedback visual com suporte a múltiplos tipos e animações.             ║
 * ║  @version 1.1.0  (autocontido — injeta próprio CSS)                     ║
 * ║                                                                          ║
 * ║  ⚠  ARQUIVO DE INFRAESTRUTURA — NÃO EDITAR SEM NECESSIDADE TÉCNICA      ║
 * ║     Alterações aqui afetam TODAS as páginas do sistema.                 ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

(function () {
    'use strict';
    if (window.Notify && window.NotificationType) return;

    function ensureFrontLayerManager() {
        if (window.PLIFrontLayerManager) {
            window.PLIFrontLayerManager.observe?.();
            return window.PLIFrontLayerManager;
        }

        const state = {
            nextZIndex: 200000,
            observer: null,
        };

        const managedSelector = [
            '.pli-feedback-overlay',
            '.pfs-overlay',
            '.notification-container',
            '.modal-ativo-overlay',
            '.dicionario-fallback-overlay',
            '.adm-modal',
            '.adm-modal-overlay',
            '.modal',
            '.modal-backdrop',
            '#exclusion-awareness-modal',
            '#exclusion-admin-modal',
            '#exclusion-progress-modal',
            '[data-pli-front-layer]'
        ].join(', ');

        function isManagedElement(element) {
            return element instanceof HTMLElement && element.matches(managedSelector);
        }

        function applyZIndex(element, zIndex) {
            if (!(element instanceof HTMLElement)) {
                return;
            }

            element.style.setProperty('z-index', String(zIndex), 'important');
            element.dataset.pliFrontLayerOrder = String(zIndex);
        }

        function getLatestBackdrop() {
            const backdrops = Array.from(document.querySelectorAll('.modal-backdrop'));
            return backdrops.length ? backdrops[backdrops.length - 1] : null;
        }

        function bringToFront(element, options = {}) {
            if (!(element instanceof HTMLElement)) {
                return null;
            }

            const { withBackdrop = false, backdrop = null } = options;
            const baseZIndex = state.nextZIndex;
            state.nextZIndex += 2;

            const relatedBackdrop = withBackdrop ? (backdrop || getLatestBackdrop()) : null;
            if (relatedBackdrop) {
                applyZIndex(relatedBackdrop, baseZIndex);
                applyZIndex(element, baseZIndex + 1);
            } else {
                applyZIndex(element, baseZIndex);
            }

            return element;
        }

        function inspectNode(node) {
            if (!(node instanceof HTMLElement)) {
                return;
            }

            if (isManagedElement(node)) {
                bringToFront(node, { withBackdrop: node.classList.contains('modal') });
            }

            node.querySelectorAll?.(managedSelector).forEach((element) => {
                bringToFront(element, { withBackdrop: element.classList.contains('modal') });
            });
        }

        function observe() {
            if (state.observer || !document.body) {
                return;
            }

            state.observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'childList') {
                        mutation.addedNodes.forEach(inspectNode);
                        return;
                    }

                    const target = mutation.target;
                    if (!(target instanceof HTMLElement) || !isManagedElement(target)) {
                        return;
                    }

                    if (target.classList.contains('show') || target.classList.contains('active') || target.classList.contains('pfs-active')) {
                        bringToFront(target, { withBackdrop: target.classList.contains('modal') });
                    }
                });
            });

            state.observer.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['class', 'aria-hidden'],
            });
        }

        document.addEventListener('shown.bs.modal', (event) => {
            bringToFront(event.target, { withBackdrop: true });
        }, true);

        const manager = {
            bringToFront,
            observe,
        };

        window.PLIFrontLayerManager = manager;

        if (document.body) {
            observe();
        } else {
            document.addEventListener('DOMContentLoaded', observe, { once: true });
        }

        return manager;
    }

    /**
     * Tipos de notificação disponíveis
     */
    const NotificationType = {
        SUCCESS: 'success',
        ERROR: 'error',
        WARNING: 'warning',
        INFO: 'info',
        LOADING: 'loading'
    };

    /**
     * Configurações padrão
     */
    const defaultConfig = {
        position: 'center', // top-right, top-left, bottom-right, bottom-left, top-center, bottom-center, center
        duration: 0, // ms (0 = não fecha automaticamente) - SEMPRE requer ação do usuário
        maxVisible: 5, // máximo de notificações visíveis simultaneamente
        animation: 'fade', // slide, fade, bounce
        pauseOnHover: true,
        showProgress: false, // barra de progresso desabilitada (não fecha automaticamente)
        showIcon: true,
        closeButton: true, // SEMPRE mostra botão de fechar
        sound: false, // futuro: som de notificação
    };

    /**
     * Classe principal do sistema de notificações
     */
    class NotificationSystem {
        constructor(config = {}) {
            this.frontLayerManager = ensureFrontLayerManager();
            this.config = { ...defaultConfig, ...config };
            this.notifications = [];
            this.container = null;
            this.init();
        }

        /**
         * Inicializa o container de notificações
         */
        init() {
            if (this.container) return;

            // Aguardar DOM estar pronto antes de criar container
            if (!document.body) {
                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', () => this.init());
                } else {
                    // Fallback: tentar novamente em breve
                    setTimeout(() => this.init(), 10);
                }
                return;
            }

            if (!document.getElementById('notification-system-styles')) {
                this.injectStyles();
            }

            this.container = document.createElement('div');
            this.container.className = `notification-container notification-${this.config.position}`;
            this.container.setAttribute('aria-live', 'polite');
            this.container.setAttribute('aria-atomic', 'true');
            this.applyInitialContainerLayout(this.container);
            document.body.appendChild(this.container);
            this.frontLayerManager.bringToFront(this.container);
            // SICARD: acompanha o <dialog> modal aberto (top layer) e volta ao body quando ele fecha.
            const container = this.container;
            const posicionar = () => {
                const destino = [...document.querySelectorAll('dialog[open]')].at(-1) || document.body;
                if (container.parentNode !== destino) destino.appendChild(container);
            };
            new MutationObserver(posicionar).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['open'] });
        }

        applyInitialContainerLayout(container) {
            if (!(container instanceof HTMLElement)) {
                return;
            }

            container.style.position = 'fixed';
            container.style.zIndex = '99999';
            container.style.display = 'flex';
            container.style.flexDirection = 'column';
            container.style.gap = '12px';
            container.style.maxWidth = '400px';
            container.style.width = 'min(400px, calc(100vw - 32px))';
            container.style.pointerEvents = 'none';

            switch (this.config.position) {
                case 'top-right':
                    container.style.top = '20px';
                    container.style.right = '20px';
                    break;
                case 'top-left':
                    container.style.top = '20px';
                    container.style.left = '20px';
                    break;
                case 'bottom-right':
                    container.style.bottom = '20px';
                    container.style.right = '20px';
                    break;
                case 'bottom-left':
                    container.style.bottom = '20px';
                    container.style.left = '20px';
                    break;
                case 'top-center':
                    container.style.top = '20px';
                    container.style.left = '50%';
                    container.style.transform = 'translateX(-50%)';
                    container.style.alignItems = 'center';
                    break;
                case 'bottom-center':
                    container.style.bottom = '20px';
                    container.style.left = '50%';
                    container.style.transform = 'translateX(-50%)';
                    container.style.alignItems = 'center';
                    break;
                case 'center':
                default:
                    container.style.top = '50%';
                    container.style.left = '50%';
                    container.style.transform = 'translate(-50%, -50%)';
                    container.style.alignItems = 'center';
                    container.style.justifyContent = 'center';
                    break;
            }
        }

        /**
         * Injeta os estilos CSS do sistema
         */
        injectStyles() {
            const style = document.createElement('style');
            style.id = 'notification-system-styles';
            style.textContent = this.getStyles();
            document.head.appendChild(style);
        }

        /**
         * Retorna os estilos CSS
         */
        getStyles() {
            return `
                /* Container de notificações */
                .notification-container {
                    position: fixed;
                    z-index: 99999;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    max-width: 400px;
                    width: min(400px, calc(100vw - 32px));
                    pointer-events: none;
                }

                .notification-container > * {
                    pointer-events: all;
                }

                /* Posicionamento */
                .notification-top-right {
                    top: 20px;
                    right: 20px;
                }

                .notification-top-left {
                    top: 20px;
                    left: 20px;
                }

                .notification-bottom-right {
                    bottom: 20px;
                    right: 20px;
                }

                .notification-bottom-left {
                    bottom: 20px;
                    left: 20px;
                }

                .notification-top-center {
                    top: 20px;
                    left: 50%;
                    align-items: center;
                    transform: translateX(-50%);
                }

                .notification-bottom-center {
                    bottom: 20px;
                    left: 50%;
                    align-items: center;
                    transform: translateX(-50%);
                }

                .notification-center {
                    top: 50%;
                    left: 50%;
                    align-items: center;
                    justify-content: center;
                    transform: translate(-50%, -50%);
                }

                /* Card de notificação */
                .notification-toast {
                    display: flex;
                    align-items: flex-start;
                    gap: 12px;
                    padding: 16px 20px;
                    background: white;
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05);
                    min-width: 320px;
                    max-width: 100%;
                    position: relative;
                    overflow: hidden;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                }

                /* Borda colorida lateral */
                .notification-toast::before {
                    content: '';
                    position: absolute;
                    left: 0;
                    top: 0;
                    bottom: 0;
                    width: 4px;
                }

                .notification-toast.success::before { background: #2aa358; }
                .notification-toast.error::before { background: #c0392b; }
                .notification-toast.warning::before { background: #d69e00; }
                .notification-toast.info::before { background: #116593; }
                .notification-toast.loading::before { background: #1c3d59; }

                /* Ícone */
                .notification-icon {
                    flex-shrink: 0;
                    width: 24px;
                    height: 24px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 14px;
                    font-weight: bold;
                }

                .notification-toast.success .notification-icon {
                    background: #dcf5e6;
                    color: #187b43;
                }

                .notification-toast.error .notification-icon {
                    background: #fbe4e1;
                    color: #8e2a20;
                }

                .notification-toast.warning .notification-icon {
                    background: #fdf3d3;
                    color: #7a5500;
                }

                .notification-toast.info .notification-icon {
                    background: #e3f0f7;
                    color: #003b5a;
                }

                .notification-toast.loading .notification-icon {
                    background: #e6edf2;
                    color: #1c3d59;
                }

                /* Loading spinner */
                .notification-spinner {
                    width: 16px;
                    height: 16px;
                    border: 2px solid currentColor;
                    border-right-color: transparent;
                    border-radius: 50%;
                    animation: notification-spin 0.6s linear infinite;
                }

                @keyframes notification-spin {
                    to { transform: rotate(360deg); }
                }

                /* Conteúdo */
                .notification-content {
                    flex: 1;
                    min-width: 0;
                }

                .notification-title {
                    font-weight: 600;
                    font-size: 14px;
                    line-height: 1.4;
                    color: #111827;
                    margin: 0 0 4px 0;
                }

                .notification-message {
                    font-size: 13px;
                    line-height: 1.5;
                    color: #6b7280;
                    margin: 0;
                    word-wrap: break-word;
                }

                /* Botão de fechar */
                .notification-close {
                    flex-shrink: 0;
                    width: 20px;
                    height: 20px;
                    border: none;
                    background: transparent;
                    color: #9ca3af;
                    cursor: pointer;
                    padding: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 4px;
                    transition: all 0.2s;
                }

                .notification-close:hover {
                    background: #f3f4f6;
                    color: #374151;
                }

                /* Barra de progresso */
                .notification-progress {
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    height: 3px;
                    background: currentColor;
                    opacity: 0.3;
                    transition: width linear;
                }

                .notification-toast.success .notification-progress { color: #2aa358; }
                .notification-toast.error .notification-progress { color: #c0392b; }
                .notification-toast.warning .notification-progress { color: #d69e00; }
                .notification-toast.info .notification-progress { color: #116593; }
                .notification-toast.loading .notification-progress { color: #1c3d59; }

                /* Animações de entrada */
                @keyframes pliNotifySlideIn {
                    from {
                        transform: translateY(8px) scale(0.96);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0) scale(1);
                        opacity: 1;
                    }
                }

    @keyframes pliNotifyFadeIn {
        from {
            opacity: 0;
            transform: scale(0.96);
        }
        to {
            opacity: 1;
            transform: scale(1);
        }
    }

                @keyframes pliNotifyBounceIn {
                    0% {
                        transform: scale(0.88);
                        opacity: 0;
                    }
                    50% {
                        transform: scale(1.02);
                    }
                    100% {
                        transform: scale(1);
                        opacity: 1;
                    }
                }

                /* Animações de saída */
                @keyframes pliNotifySlideOut {
                    to {
                        transform: translateY(8px) scale(0.96);
                        opacity: 0;
                    }
                }

                @keyframes pliNotifyFadeOut {
                    to {
                        opacity: 0;
                        transform: scale(0.96);
                    }
                }

                .notification-toast.animation-slide {
                    animation: pliNotifySlideIn 0.3s ease-out;
                }

                .notification-toast.animation-fade {
                    animation: pliNotifyFadeIn 0.3s ease-out;
                }

                .notification-toast.animation-bounce {
                    animation: pliNotifyBounceIn 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
                }

                .notification-toast.removing {
                    animation: pliNotifySlideOut 0.3s ease-in forwards;
                }

                /* Responsivo */
                @media (max-width: 640px) {
                    .notification-container {
                        left: 10px !important;
                        right: 10px !important;
                        max-width: none;
                        transform: none !important;
                    }

                    .notification-toast {
                        min-width: 0;
                    }
                }
            `;
        }

        /**
         * Cria uma notificação
         */
        show(options) {
            // Garantir que o container existe antes de mostrar
            if (!this.container) {
                this.init();
                // Se ainda não conseguiu criar, agendar para depois
                if (!this.container) {
                    setTimeout(() => this.show(options), 50);
                    return null;
                }
            }

            const {
                type = NotificationType.INFO,
                title = '',
                message = '',
                duration = this.config.duration,
                showIcon = this.config.showIcon,
                showProgress = this.config.showProgress,
                closeButton = this.config.closeButton,
                onClick = null,
                onClose = null,
                html = false,
            } = options;

            // Limitar notificações visíveis
            if (this.notifications.length >= this.config.maxVisible) {
                this.notifications[0].remove();
            }

            const notification = this.createNotification({
                type,
                title,
                message,
                duration,
                showIcon,
                showProgress,
                closeButton,
                onClick,
                onClose,
                html,
            });

            this.notifications.push(notification);
            this.frontLayerManager.bringToFront(this.container);
            this.container.appendChild(notification.element);

            return notification;
        }

        /**
         * Cria o elemento de notificação
         */
        createNotification(config) {
            const { type, title, message, duration, showIcon, showProgress, closeButton, onClick, onClose, html } = config;

            // Criar elemento
            const element = document.createElement('div');
            element.className = `notification-toast ${type} animation-${this.config.animation}`;
            element.setAttribute('role', 'alert');

            // Ícone
            if (showIcon) {
                const icon = this.createIcon(type);
                element.appendChild(icon);
            }

            // Conteúdo
            const content = document.createElement('div');
            content.className = 'notification-content';

            if (title) {
                const titleEl = document.createElement('div');
                titleEl.className = 'notification-title';
                titleEl.textContent = title;
                content.appendChild(titleEl);
            }

            if (message) {
                const messageEl = document.createElement('div');
                messageEl.className = 'notification-message';
                // Texto por padrão (mensagens do servidor); HTML só com { html: true }.
                if (html) messageEl.innerHTML = message;
                else messageEl.textContent = message;
                content.appendChild(messageEl);
            }

            element.appendChild(content);

            // Botão de fechar
            if (closeButton) {
                const closeBtn = document.createElement('button');
                closeBtn.className = 'notification-close';
                closeBtn.innerHTML = '×';
                closeBtn.setAttribute('aria-label', 'Fechar notificação');
                closeBtn.onclick = () => notification.remove();
                element.appendChild(closeBtn);
            }

            // Barra de progresso
            let progressBar = null;
            if (showProgress && duration > 0) {
                progressBar = document.createElement('div');
                progressBar.className = 'notification-progress';
                progressBar.style.width = '100%';
                element.appendChild(progressBar);
            }

            // Click handler
            if (onClick) {
                element.style.cursor = 'pointer';
                element.onclick = (e) => {
                    if (e.target.className !== 'notification-close') {
                        onClick();
                    }
                };
            }

            // Pausar ao hover
            let timeoutId = null;
            let startTime = Date.now();
            let remainingTime = duration;

            const startTimer = () => {
                if (duration > 0) {
                    startTime = Date.now();
                    timeoutId = setTimeout(() => notification.remove(), remainingTime);

                    if (progressBar) {
                        progressBar.style.transition = `width ${remainingTime}ms linear`;
                        progressBar.style.width = '0%';
                    }
                }
            };

            const pauseTimer = () => {
                if (timeoutId) {
                    clearTimeout(timeoutId);
                    remainingTime -= Date.now() - startTime;

                    if (progressBar) {
                        const currentWidth = (remainingTime / duration) * 100;
                        progressBar.style.transition = 'none';
                        progressBar.style.width = `${currentWidth}%`;
                    }
                }
            };

            if (this.config.pauseOnHover) {
                element.onmouseenter = pauseTimer;
                element.onmouseleave = startTimer;
            }

            const notification = {
                element,
                type,
                remove: () => {
                    if (timeoutId) clearTimeout(timeoutId);

                    element.classList.add('removing');
                    setTimeout(() => {
                        if (element.parentNode) {
                            element.parentNode.removeChild(element);
                        }
                        const index = this.notifications.indexOf(notification);
                        if (index > -1) {
                            this.notifications.splice(index, 1);
                        }
                        if (onClose) onClose();
                    }, 300);
                },
                update: (newOptions) => {
                    if (newOptions.title) {
                        const titleEl = element.querySelector('.notification-title');
                        if (titleEl) titleEl.textContent = newOptions.title;
                    }
                    if (newOptions.message) {
                        const messageEl = element.querySelector('.notification-message');
                        if (messageEl) messageEl.textContent = newOptions.message;
                    }
                    if (newOptions.type) {
                        element.className = `notification-toast ${newOptions.type} animation-${this.config.animation}`;
                    }
                }
            };

            startTimer();

            return notification;
        }

        /**
         * Cria o ícone baseado no tipo
         */
        createIcon(type) {
            const icon = document.createElement('div');
            icon.className = 'notification-icon';

            switch (type) {
                case NotificationType.SUCCESS:
                    icon.innerHTML = '✓';
                    break;
                case NotificationType.ERROR:
                    icon.innerHTML = '✕';
                    break;
                case NotificationType.WARNING:
                    icon.innerHTML = '!';
                    break;
                case NotificationType.INFO:
                    icon.innerHTML = 'i';
                    break;
                case NotificationType.LOADING:
                    icon.innerHTML = '<div class="notification-spinner"></div>';
                    break;
            }

            return icon;
        }

        /**
         * Atalhos para tipos específicos
         */
        success(title, message, options = {}) {
            return this.show({ ...options, type: NotificationType.SUCCESS, title, message });
        }

        error(title, message, options = {}) {
            return this.show({ ...options, type: NotificationType.ERROR, title, message });
        }

        warning(title, message, options = {}) {
            return this.show({ ...options, type: NotificationType.WARNING, title, message });
        }

        info(title, message, options = {}) {
            return this.show({ ...options, type: NotificationType.INFO, title, message });
        }

        loading(title, message, options = {}) {
            return this.show({ ...options, type: NotificationType.LOADING, title, message, duration: 0 });
        }

        /**
         * Remove todas as notificações
         */
        clearAll() {
            this.notifications.forEach(n => n.remove());
        }
    }

    // Instância global
    window.Notify = new NotificationSystem();

    // Expor tipos
    window.NotificationType = NotificationType;

    /*
     * Ponte legada do SIGMA (AuthService.ensureLegacyNotificationBridge):
     * showNotification(tipo, mensagem, duração) ou showNotification(mensagem, tipo, duração)
     * cai no Notify oficial. 'danger' vira 'error'.
     */
    if (typeof window.showNotification !== 'function') {
        window.showNotification = (arg1, arg2, arg3) => {
            const knownTypes = { success: true, error: true, warning: true, info: true, danger: true, loading: true };
            let type = 'info';
            let message = '';
            let duration;
            if (typeof arg1 === 'string' && knownTypes[arg1]) {
                type = arg1 === 'danger' ? 'error' : arg1;
                message = arg2 || '';
                duration = arg3;
            } else {
                message = arg1 || '';
                type = typeof arg2 === 'string' && knownTypes[arg2] ? (arg2 === 'danger' ? 'error' : arg2) : 'info';
                duration = arg3;
            }
            return window.Notify[type]('SICARD', message, typeof duration === 'number' ? { duration } : {});
        };
    }

})();
