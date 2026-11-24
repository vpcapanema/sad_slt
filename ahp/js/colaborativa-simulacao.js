/* Same public form and access validation; simulated responses stay in memory. */
(function (global) {
  'use strict';
  if (new URLSearchParams(location.search).get('simulacao') !== '1') return;
  global.SLTColaborativaSimulacao = true;
  const api = global.SLTColaborativaApi;
  const validate = api.validarAcesso;
  let metadata, draft;
  api.validarAcesso = async function (...args) {
    metadata = await validate.apply(api, args);
    return metadata;
  };
  api.iniciarResposta = async function () {
    if (!metadata?.email_autorizado) throw new Error('Valide o acesso antes de simular.');
    const n = metadata.criterios.length;
    const matriz = Array.from({length: n}, (_, i) => Array.from({length: n}, (_, j) =>
      i === j || metadata.modo_comparacao !== 'por_grupo' ? 1 : null));
    draft = {status: 'em_preenchimento', matriz_comparacao: matriz, estatisticas: {}};
    return structuredClone(draft);
  };
  api.salvarProgresso = async function (_, payload) {
    if (!draft) throw new Error('Inicie a simulação antes de preencher.');
    Object.assign(draft, structuredClone(payload));
    return structuredClone(draft);
  };
  api.enviarResposta = async function (_, payload) {
    if (!draft) throw new Error('Inicie a simulação antes de enviar.');
    Object.assign(draft, structuredClone(payload), {status: 'enviada'});
    return structuredClone(draft);
  };
  document.addEventListener('DOMContentLoaded', () => {
    const notice = document.createElement('p');
    notice.className = 'ahp-info-note'; notice.setAttribute('role', 'status');
    notice.textContent = 'Simulação do formulário do colaborador. Informe um e-mail convidado e o código de acesso do julgamento. Nenhuma resposta será gravada; o progresso será descartado ao fechar ou recarregar.';
    document.querySelector('main').prepend(notice);
  });
})(window);
