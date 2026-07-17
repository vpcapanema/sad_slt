document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll("[data-evento-inline=\"ahp-step1-configuracao-conteudo-1\"]").forEach(function (elemento) {
    elemento.addEventListener("input", function (event) {
      aplicarMascaraDenominacao(this)
    });
  });
});
