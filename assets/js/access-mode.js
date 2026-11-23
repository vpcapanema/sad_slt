(function (global) {
  'use strict';
  const script = document.currentScript;
  let policy = {};
  try { policy = JSON.parse(script?.dataset.policy || '{}'); } catch (_) {}
  const module = policy.modulo || script?.dataset.accessModule || '';
  const moduleWrites = {mocad:'mocad.analisar', mad:'mad.operar', ferramentas:'ferramentas.operar', operador:'operador.executar_acoes', admin:'administracao.configurar', cadastro:'mocad.cadastrar_demanda'};
  function can(permission, user) {
    const grants = user ? (user.permissoes || {}) : (policy.permissoes || {});
    const aliases = {
      operate:[moduleWrites[module]], analyze:[module === 'mad' ? 'mad.operar' : 'mocad.analisar'],
      analyzeDemand:['mocad.analisar'], manage:[module === 'mad' ? 'mad.operar' : 'mocad.reverter_status_inline'],
      administer:['administracao.configurar','administracao.manter'], viewAdmin:['area_restrita.visualizar','administracao.configurar','administracao.manter'],
      editDemand:['mocad.analisar'], revertStatus:['mocad.reverter_status_inline'],
      editDemandTable:['mocad.analisar','mocad.reverter_status_inline'], deleteDemand:['mocad.excluir'],
      createDemand:['mocad.cadastrar_demanda'], completeRequest:['solicitacao.cumprir'],
      read:['area_restrita.visualizar', 'mocad.visualizar', 'mad.visualizar','operador.visualizar','ferramentas.visualizar']
    };
    return (aliases[permission] || [permission]).some(code => Boolean(code && grants[code]));
  }
  function denied(action, detail) {
    const message = detail || `Ação não autorizada: ${action || 'executar esta ação'}. Seu perfil no SICARD (${policy.perfil_nome || 'atual'}) não possui a permissão necessária. Nenhuma alteração foi realizada por esta solicitação.`;
    const data = {title:'Ação não autorizada', actionTitle:action || 'Verificação de permissão', message, status:403,
      solution:'Solicite a verificação do seu perfil e das permissões no SICARD ao responsável pelos acessos.'};
    const progress = global.ProcessFeedback?.atual;
    if (progress && !progress._finalizado) progress.erro(data);
    else if (global.StatusFeedback) global.StatusFeedback.erro(data);
    else { global.alert(message); }
  }
  const selector = 'button,input,select,textarea,[contenteditable],[data-action],a.btn,a.admin-icon-btn';
  const readAction = /visualiz|consult|detalh|abrir|fechar|close|cancel|voltar|download|baixar|export|imprimir|print|filtro|filter|paginar|pagina|page|previous|next|anterior|seguinte|limpar sele|clear|selecionar|select-all|toggle|camada|layer|zoom|expand|recolher|mapa|ordenar|sort/i;
  const writeAction = /salvar|save|exclu|delet|remov|criar|create|cadastr|aprovar|reprovar|homolog|publicar|executar|calcular|solicitar|enviar|upload|substituir|editar|edit|adicionar|add|alterar|reverter|sincroniz|concluir|consolidar|gerar|importar/i;
  function isRead(el) {
    if (el.closest('.pfs-overlay,[id^="pfs"],.app-header,.app-nav,footer,.admin-session-bar,.leaflet-control,.layer-group-header-row,.layer-visibility-toggle,.painel-layer-filter,[data-read-control],.admin-filter,.admin-filter-bar,.admin-pagination,.admin-table-footer,.table-pagination,.pagination')) return true;
    if (el.matches('input[type="checkbox"]') && el.closest('table')) return true;
    const label = [el.id, el.title, el.getAttribute('aria-label'), el.dataset.action, el.textContent].join(' ');
    return !el.hasAttribute('data-write-control') && !writeAction.test(label) && readAction.test(label);
  }
  function accessModule(el) {
    return el.closest('[data-access-module]')?.dataset.accessModule || module;
  }
  function canOperateIn(mod) {
    if (module === 'operador' && mod === 'mad' && can('solicitacao.cumprir')) return true;
    return can(moduleWrites[mod] || 'operate');
  }
  function allowed(el) {
    if (el.closest('[data-policy-readonly="true"]') && !isRead(el)) return false;
    const permission = el.dataset.permission || el.dataset.writePermission;
    if (permission) return can(permission);
    if (isRead(el)) return true;
    const mod = accessModule(el);
    return !mod || canOperateIn(mod);
  }
  function mark(el) {
    const ok = allowed(el);
    if (ok) {
      if (el.dataset.accessLocked) {
        delete el.dataset.accessLocked;
        el.removeAttribute('aria-disabled');
        if (el.dataset.policyDisabled) { el.disabled = false; delete el.dataset.policyDisabled; }
        if ('policyTitle' in el.dataset) { el.title = el.dataset.policyTitle; delete el.dataset.policyTitle; }
        if ('policyEditable' in el.dataset) { el.setAttribute('contenteditable',el.dataset.policyEditable); delete el.dataset.policyEditable; }
      }
      return;
    }
    el.dataset.accessLocked = 'true';
    el.setAttribute('aria-disabled','true');
    if (!('policyTitle' in el.dataset)) { el.dataset.policyTitle = el.title || ''; el.title = 'Ação não autorizada para seu perfil. Clique para ver o motivo.'; }
    if (el.matches('input,select,textarea') && !el.disabled) { el.disabled = true; el.dataset.policyDisabled = 'true'; }
    if (el.hasAttribute('contenteditable') && !('policyEditable' in el.dataset)) {
      el.dataset.policyEditable = el.getAttribute('contenteditable'); el.setAttribute('contenteditable','false');
    }
  }
  function scan(root) {
    if (root.matches?.(selector)) mark(root);
    root.querySelectorAll?.(selector).forEach(mark);
  }
  function setUser(user) {
    policy = {...policy, permissoes:user?.permissoes || {}, perfil_nome:user?.perfil_nome || user?.tipo_usuario || ''};
    scan(document);
    document.dispatchEvent(new CustomEvent('sicard:permissions-changed'));
  }
  global.SICARDAccess = {can, denied, setUser, scan, module};
  function start() {
    scan(document);
    new MutationObserver(changes => changes.forEach(c => {
      if (c.type === 'childList') c.addedNodes.forEach(scan);
      else if (c.target.matches(selector)) mark(c.target);
    })).observe(document.body, {childList:true, subtree:true, attributes:true, attributeFilter:['disabled']});
    function reject(event) {
      const el = event.target.closest?.(selector);
      if (!el || allowed(el)) return;
      event.preventDefault(); event.stopImmediatePropagation();
      denied((el.getAttribute('aria-label') || el.textContent || el.id || 'executar esta ação').trim().slice(0,150));
    }
    document.addEventListener('click', reject, true);
    document.addEventListener('pointerdown', event => {
      const el = event.target.closest?.(selector);
      if (el?.disabled) reject(event);
    }, true);
    document.addEventListener('submit', event => {
      const form = event.target;
      if (form.closest('[data-read-control],.admin-filter,.admin-filter-bar,[role="search"]')) return;
      if (!form.closest('[data-policy-readonly="true"]') && canOperateIn(accessModule(form))) return;
      event.preventDefault(); event.stopImmediatePropagation(); denied('enviar este formulário');
    }, true);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',start); else start();
})(window);
