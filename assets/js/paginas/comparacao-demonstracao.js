(function (global) {
  "use strict";
  function atualizar() {
    const matrix = global.buildLiveMatrix();
    if (!matrix) return;
    const result = global.SLTAhp.analyzeMatrix(matrix);
    document.getElementById("metricLambdaValue").textContent = result.lambdaMax.toFixed(4);
    document.getElementById("metricICValue").textContent = result.CI.toFixed(4);
    document.getElementById("metricRCValue").textContent = result.CR.toFixed(4);
    document.getElementById("demo-feedback").textContent = result.CR < 0.1
      ? "Consistência aceitável (RC < 0,10). Exercício local, sem envio ou gravação."
      : "Revise as comparações: a RC deve ser inferior a 0,10. Exercício local, sem envio ou gravação.";
  }
  global.updateLiveMetrics = atualizar;
  document.addEventListener("DOMContentLoaded", function () {
    const select = document.getElementById("demo-dimensao");
    const dimensoes = [...document.querySelectorAll(".demo-dimensao")];
    function iniciar() {
      const criterios = [...dimensoes[Number(select.value)].querySelectorAll("li")].map(item => item.textContent);
      global.setAhpCriteria(criterios);
      global.ahpCollaborativeDraftMatrix = null;
      document.getElementById("comparisonContent").replaceChildren();
      document.getElementById("liveMetrics").hidden = criterios.length < 2;
      if (criterios.length < 2) {
        document.getElementById("demo-feedback").textContent = "Sinistros graves é o único critério desta dimensão. Não há pares a comparar.";
        return;
      }
      global.generatePairwiseFormStep4();
      atualizar();
    }
    select.addEventListener("change", iniciar);
    iniciar();
  });
})(window);
