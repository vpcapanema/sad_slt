document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll("[data-evento-inline=\"ahp-step5-comparacao-conteudo-1\"]").forEach(function (elemento) {
    elemento.addEventListener("click", function (event) {
      toggleSaatyScale()
    });
  });
  document.querySelectorAll("[data-evento-inline=\"ahp-step5-comparacao-conteudo-2\"]").forEach(function (elemento) {
    elemento.addEventListener("click", function (event) {
      validarMatrizComparacao()
    });
  });
  document.querySelectorAll("[data-evento-inline=\"ahp-step5-comparacao-conteudo-3\"]").forEach(function (elemento) {
    elemento.addEventListener("click", function (event) {
      salvarConfigFase2()
    });
  });
  document.querySelectorAll("[data-evento-inline=\"ahp-step5-comparacao-conteudo-4\"]").forEach(function (elemento) {
    elemento.addEventListener("click", function (event) {
      window.location.href='/restrict/ahp/resultados/'
    });
  });
});
