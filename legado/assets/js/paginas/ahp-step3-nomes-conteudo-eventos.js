document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll("[data-evento-inline=\"ahp-step3-nomes-conteudo-1\"]").forEach(function (elemento) {
    elemento.addEventListener("click", function (event) {
      saveCriteriaNames()
    });
  });
  document.querySelectorAll("[data-evento-inline=\"ahp-step3-nomes-conteudo-2\"]").forEach(function (elemento) {
    elemento.addEventListener("click", function (event) {
      continueStep3()
    });
  });
});
