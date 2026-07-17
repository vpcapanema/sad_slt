document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll("[data-evento-inline=\"ahp-step2-criterios-conteudo-1\"]").forEach(function (elemento) {
    elemento.addEventListener("change", function (event) {
      toggleConfigSource()
    });
  });
  document.querySelectorAll("[data-evento-inline=\"ahp-step2-criterios-conteudo-2\"]").forEach(function (elemento) {
    elemento.addEventListener("change", function (event) {
      toggleConfigSource()
    });
  });
  document.querySelectorAll("[data-evento-inline=\"ahp-step2-criterios-conteudo-3\"]").forEach(function (elemento) {
    elemento.addEventListener("change", function (event) {
      handleConfigFile(event)
    });
  });
  document.querySelectorAll("[data-evento-inline=\"ahp-step2-criterios-conteudo-4\"]").forEach(function (elemento) {
    elemento.addEventListener("click", function (event) {
      document.getElementById('cfg-file-input').click()
    });
  });
  document.querySelectorAll("[data-evento-inline=\"ahp-step2-criterios-conteudo-5\"]").forEach(function (elemento) {
    elemento.addEventListener("change", function (event) {
      toggleInputMethod()
    });
  });
  document.querySelectorAll("[data-evento-inline=\"ahp-step2-criterios-conteudo-6\"]").forEach(function (elemento) {
    elemento.addEventListener("change", function (event) {
      toggleInputMethod()
    });
  });
  document.querySelectorAll("[data-evento-inline=\"ahp-step2-criterios-conteudo-7\"]").forEach(function (elemento) {
    elemento.addEventListener("change", function (event) {
      handleFileSelect(event)
    });
  });
  document.querySelectorAll("[data-evento-inline=\"ahp-step2-criterios-conteudo-8\"]").forEach(function (elemento) {
    elemento.addEventListener("click", function (event) {
      document.getElementById('matrix-file-input').click()
    });
  });
  document.querySelectorAll("[data-evento-inline=\"ahp-step2-criterios-conteudo-9\"]").forEach(function (elemento) {
    elemento.addEventListener("click", function (event) {
      processCriteriaCount()
    });
  });
});
