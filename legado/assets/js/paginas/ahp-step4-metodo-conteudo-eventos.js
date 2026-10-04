document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll("[data-evento-inline=\"ahp-step4-metodo-conteudo-1\"]").forEach(function (elemento) {
    elemento.addEventListener("change", function (event) {
      selectFillMode('individual')
    });
  });
  document.querySelectorAll("[data-evento-inline=\"ahp-step4-metodo-conteudo-2\"]").forEach(function (elemento) {
    elemento.addEventListener("change", function (event) {
      selectFillMode('collaborative')
    });
  });
  document.querySelectorAll("[data-evento-inline=\"ahp-step4-metodo-conteudo-3\"]").forEach(function (elemento) {
    elemento.addEventListener("click", function (event) {
      selectMethod('matrix')
    });
  });
  document.querySelectorAll("[data-evento-inline=\"ahp-step4-metodo-conteudo-4\"]").forEach(function (elemento) {
    elemento.addEventListener("click", function (event) {
      selectMethod('form')
    });
  });
  document.querySelectorAll("[data-evento-inline=\"ahp-step4-metodo-conteudo-5\"]").forEach(function (elemento) {
    elemento.addEventListener("change", function (event) {
      this.blur()
    });
  });
  document.querySelectorAll("[data-evento-inline=\"ahp-step4-metodo-conteudo-6\"]").forEach(function (elemento) {
    elemento.addEventListener("click", function (event) {
      deleteSelectedCollaborators()
    });
  });
});
