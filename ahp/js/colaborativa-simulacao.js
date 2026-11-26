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
    const porDimensao = ['por_grupo', 'duas_etapas'].includes(metadata.modo_comparacao);
    const matriz = Array.from({length: n}, (_, i) => Array.from({length: n}, (_, j) =>
      i === j || !porDimensao ? 1 : null));
    draft = {status: 'em_preenchimento', matriz_comparacao: matriz, estatisticas: {}};
    return structuredClone(draft);
  };
  api.reiniciarResposta = api.iniciarResposta;
  api.salvarProgresso = async function (_, payload) {
    if (!draft) throw new Error('Inicie a simulação antes de preencher.');
    const copia = structuredClone(payload);
    if (copia.etapa === 'dimensoes') {
      const anterior = draft.estatisticas.julgamento_dimensoes;
      const resultado = copia.concluir_etapa ? global.SLTAhp.analyzeMatrix(copia.matriz_comparacao)
        : JSON.stringify(anterior?.matriz) === JSON.stringify(copia.matriz_comparacao) ? anterior.resultado : null;
      draft.estatisticas.julgamento_dimensoes = {matriz: copia.matriz_comparacao,
        revisoes_por_par: copia.estatisticas.revisoes_por_par, resultado};
    } else {
      draft.matriz_comparacao = copia.matriz_comparacao;
      Object.assign(draft.estatisticas, copia.estatisticas);
    }
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
    notice.textContent = 'Simulação do formulário do colaborador. O preenchimento será descartado ao fechar ou recarregar a página.';
    document.getElementById('collab-context').before(notice);
  });
})(window);
