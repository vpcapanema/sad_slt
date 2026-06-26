/**
 * Etapa 3 — exibe a Tabela de Premissas e Critérios importada na Etapa 1.
 */
(function (global) {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    var criteria = localStorage.getItem("ahp_criteria");
    if (!criteria) {
      alert("Critérios não encontrados. Redirecionando para a Etapa 2.");
      window.location.href = "step2-nomes.html";
      return;
    }

    var panel = document.getElementById("matriz-premissas-panel");
    if (panel && window.SltMatrizPremissas) {
      SltMatrizPremissas.renderMatrizPremissasPanel(panel);
    }
  });

  function selectMethod(method) {
    localStorage.setItem("ahp_chosenMethod", method);
    window.location.href = "step4-comparacao.html";
  }

  global.selectMethod = selectMethod;
})(window);
