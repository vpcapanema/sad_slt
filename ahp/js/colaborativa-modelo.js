/* Formulário-modelo: o mesmo formulário do colaborador, com os critérios do PLI, sem gravação. */
(function (global) {
  'use strict';
  global.SLTColaborativaModelo = true;
  global.SLTColaborativaSimulacao = true;
  const api = global.SLTColaborativaApi;
  let carregamento, draft;

  function carregarModelo() {
    return carregamento ??= api.obterModeloPli().catch(error => {
      carregamento = null;
      throw error;
    });
  }

  function renderizarPremissas(modelo) {
    const detalhes = document.getElementById('collab-model-criteria');
    const grupos = modelo.dimensoes.map(({ nome, criterios }) => {
      const grupo = document.createElement('section');
      const titulo = document.createElement('h4');
      const lista = document.createElement('dl');
      titulo.textContent = nome;
      criterios.forEach(criterio => {
        const termo = document.createElement('dt');
        const premissa = document.createElement('dd');
        termo.textContent = criterio;
        premissa.textContent = modelo.premissas[criterio];
        lista.append(termo, premissa);
      });
      grupo.append(titulo, lista);
      return grupo;
    });
    detalhes.querySelector('div').replaceChildren(...grupos);
    detalhes.hidden = false;
  }

  api.obterPublico = async function () {
    const modelo = await carregarModelo();
    renderizarPremissas(modelo);
    return Object.assign({}, modelo, { criterios: [] });
  };
  api.validarAcesso = async function () {
    return structuredClone(await carregarModelo());
  };
  api.iniciarResposta = async function () {
    const { criterios } = await carregarModelo();
    draft = {
      status: 'em_preenchimento',
      matriz_comparacao: criterios.map((_, i) => criterios.map((_, j) => i === j ? 1 : null)),
      estatisticas: {},
    };
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
