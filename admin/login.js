(function () {
  const params = new URLSearchParams(location.search);

  function safeNext(rawNext) {
    if (!rawNext) return "/restrict/";
    try {
      const target = new URL(rawNext, location.href);
      const isLoginPage = target.pathname
        .replace(/\/+$/, "")
        .endsWith("/public/login");
      if (target.origin !== location.origin || isLoginPage) return "/restrict/";
      const segments = location.pathname.split("/");
      const publicIndex = segments.lastIndexOf("public");
      const prefix = publicIndex > 1 ? segments.slice(0, publicIndex).join("/") : "";
      if (prefix && !target.pathname.startsWith(prefix + "/") && ["public", "restrict"].includes(target.pathname.split("/")[1])) {
        target.pathname = prefix + target.pathname;
      }
      return `${target.pathname}${target.search}${target.hash}`;
    } catch {
      return "/restrict/";
    }
  }

  const hasExplicitNext = params.has("next");
  const next = safeNext(params.get("next"));
  const registrationTarget = new URL(next, location.href).pathname.replace(/\/+$/, "").endsWith("/cadastro/nova-demanda");
  const registrationDenied = "Para cadastrar demandas, entre com o perfil Operador ou superior. Crie ou selecione esse perfil no SIGMA-PLI.";

  function canOpenNext(session) {
    return !registrationTarget || Boolean(globalThis.SLTAdminAuth?.can("operate", session.user));
  }

  function destination(session) {
    const profile = String(session?.user?.tipo_usuario || "").toUpperCase();
    const nextPath = new URL(next, location.href).pathname.replace(/\/+$/, "");
    const isRestrictedHome = nextPath.endsWith("/restrict") || nextPath.endsWith("/restrict/index.html");
    return profile === "OPERADOR" && (!hasExplicitNext || isRestrictedHome)
      ? "/restrict/operador/"
      : next;
  }

  const EYE_OPEN =
    '<path d="M12 5C7 5 2.7 8.1 1 12c1.7 3.9 6 7 11 7s9.3-3.1 11-7c-1.7-3.9-6-7-11-7zm0 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8z"/>';
  const EYE_CLOSED =
    '<path d="M12 6.5c2.5 0 4.6 1.2 6.1 3.1l1.4-1.4C17.2 5.6 14.7 4.5 12 4.5 7 4.5 2.7 7.6 1 11.5l1.5 1.5C4 9.4 7.7 6.5 12 6.5zm0 3a3 3 0 0 0-2.8 4.1l1.4-1.4A1.5 1.5 0 1 1 13.5 12l1.4-1.4A3 3 0 0 0 12 9.5zM3.3 4.2 2 5.5l3.2 3.2C3.6 10.2 2.2 11.6 1 13.5l1.5 1.5c1.2-2.2 3.4-4 6.2-5.1l2.8 2.8c-.5.2-1 .5-1.5.9L16.5 16l1.3 1.3 14-14L20.7 2 6.5 16.2l-1.4-1.4 1.8-1.8C5.8 12.1 4.6 11 3.5 9.7L3.3 4.2z"/>';

  function log(evento, dados = {}, nivel = 'info') {
    // Somente metadados fixos: nunca usuario, senha, token ou corpo da resposta.
    const allowed = ['tentativa', 'duracao_ms', 'status_http', 'permanecer_conectado', 'etapa', 'rota', 'metodo', 'motivo'];
    const safe = Object.fromEntries(Object.entries(dados).filter(([key]) => allowed.includes(key)));
    try { console[nivel](`[SICARD][Login] ${evento}`, Object.freeze(safe)); } catch { /* diagnostico nao bloqueia login */ }
  }

  async function init() {
    const form = document.getElementById('form-login');
    const erro = document.getElementById('login-erro');
    const status = document.getElementById('login-status');
    const btn = document.getElementById('btn-entrar');
    const senhaInput = document.getElementById('senha');
    const usuario = document.getElementById('login');
    const remember = document.getElementById('permanecer-conectado');
    const toggle = document.getElementById('btn-toggle-senha');
    const initialCheck = new AbortController();
    let submitting = false, attempt = 0, navigated = false;
    const show = (message, state = 'pending') => {
      status.hidden = false;
      status.dataset.state = state;
      status.textContent = message;
    };
    const failure = message => {
      erro.textContent = message;
      erro.classList.remove('hidden');
      status.hidden = true;
    };
    toggle.addEventListener('click', () => {
      const visible = senhaInput.type === 'text';
      senhaInput.type = visible ? 'password' : 'text';
      toggle.querySelector('.icon-eye').innerHTML = visible ? EYE_OPEN : EYE_CLOSED;
      toggle.setAttribute('aria-label', visible ? 'Mostrar senha' : 'Ocultar senha');
      toggle.setAttribute('aria-pressed', visible ? 'false' : 'true');
    });
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (submitting || navigated) return;
      initialCheck.abort();
      const tentativa = ++attempt;
      const started = performance.now();
      erro.classList.add('hidden');
      log('envio.iniciado', { tentativa, permanecer_conectado: remember.checked });
      if (!usuario.value.trim() || !senhaInput.value) {
        failure('Informe usuário e senha para entrar.');
        (!usuario.value.trim() ? usuario : senhaInput).focus();
        log('validacao.rejeitada', { tentativa, motivo: 'campos_obrigatorios' }, 'warn');
        return;
      }
      submitting = true;
      btn.disabled = true;
      remember.disabled = true;
      form.setAttribute('aria-busy', 'true');
      btn.textContent = 'Entrando…';
      let etapa = 'autenticacao';
      const progress = message => show(message);
      progress('Enviando credenciais e aguardando validação do servidor…');
      const heartbeat = setInterval(() => {
        const seconds = Math.floor((performance.now() - started) / 1000);
        progress(`${etapa === 'autenticacao' ? 'Aguardando autenticação' : 'Aguardando confirmação da sessão'}: ${seconds}s. A solicitação continua em andamento.`);
        log('aguardando_resposta', { tentativa, etapa, duracao_ms: Math.round(performance.now() - started) });
      }, 5000);
      try {
        if (!window.SLTAdminApi) throw new Error('Não foi possível carregar o serviço de login. Atualize a página.');
        await SLTAdminApi.login(usuario.value.trim(), senhaInput.value, remember.checked, { log, tentativa });
        etapa = 'confirmacao_sessao';
        progress('Credenciais aceitas. Confirmando o cookie e a sessão restrita…');
        const session = await SLTAdminApi.fetchSession({ log, tentativa });
        if (!session?.authenticated) throw new Error('O login foi aceito, mas a sessão não foi confirmada. Verifique se o navegador permite cookies deste site e tente novamente.');
        if (!canOpenNext(session)) throw new Error(registrationDenied);
        progress('Sessão confirmada. Abrindo a área restrita…');
        log('sessao.confirmada', { tentativa, duracao_ms: Math.round(performance.now() - started) });
        senhaInput.value = '';
        navigated = true;
        location.replace(destination(session));
      } catch (error) {
        failure(error.status === 401
          ? 'Acesso negado. Usuário ou senha incorretos.'
          : (error.message || 'Não foi possível entrar. Tente novamente.'));
        log('envio.falhou', { tentativa, etapa, status_http: error.status || 0, duracao_ms: Math.round(performance.now() - started) }, 'error');
      } finally {
        clearInterval(heartbeat);
        submitting = false;
        form.setAttribute('aria-busy', 'false');
        if (!navigated) { btn.disabled = false; remember.disabled = false; btn.textContent = 'Entrar'; }
      }
    });
    log('pagina.pronta');
    show('Verificando se já existe uma sessão neste navegador…');
    try {
      const session = await SLTAdminApi.fetchSession({ log, tentativa: 0, signal: initialCheck.signal });
      if (initialCheck.signal.aborted || submitting || attempt) return;
      if (session?.authenticated) {
        if (!canOpenNext(session)) {
          failure(registrationDenied);
          return;
        }
        show('Sessão existente confirmada. Abrindo a área restrita…');
        log('sessao.restaurada');
        navigated = true;
        location.replace(destination(session));
      } else { show('Informe suas credenciais para entrar.', 'idle'); }
    } catch {
      if (!initialCheck.signal.aborted && !submitting && !attempt)
        show('Não foi possível verificar uma sessão anterior. Você pode tentar entrar abaixo.', 'error');
    }
  }
  const start = () => init().catch(() => {
    log('inicializacao.falhou', {}, 'error');
    const error = document.getElementById('login-erro');
    if (error) { error.textContent = 'Não foi possível preparar o login. Atualize a página.'; error.classList.remove('hidden'); }
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
