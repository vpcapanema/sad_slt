/* Formulário-modelo: o mesmo formulário do colaborador, com os critérios do PLI, sem gravação. */
(function (global) {
  'use strict';
  global.SLTColaborativaModelo = true;
  global.SLTColaborativaSimulacao = true;
  const api = global.SLTColaborativaApi;
  let modelo, draft;
  api.obterPublico = async function () {
    modelo = await api.obterModeloPli();
    return Object.assign({}, modelo, { criterios: [] });
  };
  api.validarAcesso = async function () {
    return structuredClone(modelo || await api.obterModeloPli());
  };
  api.iniciarResposta = async function () {
    const n = modelo.criterios.length;
    draft = {status: 'em_preenchimento', matriz_comparacao: Array.from({length: n}, () => Array(n).fill(1)), estatisticas: {}};
    return structuredClone(draft);
  };
  api.salvarProgresso = async function (_, payload) {
    Object.assign(draft, structuredClone(payload));
    return structuredClone(draft);
  };
  api.enviarResposta = async function (_, payload) {
    Object.assign(draft, structuredClone(payload), {status: 'enviada'});
    return structuredClone(draft);
  };
  document.addEventListener('DOMContentLoaded', () => {
    const notice = document.createElement('p');
    notice.className = 'ahp-info-note';
    notice.setAttribute('role', 'status');
    notice.textContent = 'Formulário-modelo com os critérios do PLI-SP 2050. Informe nome, instituição e e-mail para liberar o preenchimento; o código de acesso não é necessário. Nenhuma resposta será gravada, e o preenchimento será descartado ao fechar ou recarregar a página.';
    document.querySelector('main').prepend(notice);
  });
})(window);
