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
    const cartoes = modelo.dimensoes.flatMap(({ nome, criterios }) => criterios.map(criterio => {
      const cartao = document.createElement('article');
      cartao.className = 'collab-detail-card';
      const titulo = document.createElement('h3');
      titulo.textContent = criterio;
      const dimensao = document.createElement('p');
      dimensao.className = 'collab-detail-dimension';
      dimensao.textContent = nome;
      const premissa = document.createElement('p');
      premissa.textContent = modelo.premissas[criterio];
      cartao.append(titulo, dimensao, premissa);
      return cartao;
    }));
    detalhes.querySelector('.collab-detail-grid').replaceChildren(...cartoes);
    detalhes.hidden = !cartoes.length;
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
  api.reiniciarResposta = api.iniciarResposta;
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
    notice.textContent = 'Este é um exercício. O preenchimento será descartado ao fechar ou recarregar a página.';
    document.getElementById('collab-context').before(notice);
  });
})(window);
