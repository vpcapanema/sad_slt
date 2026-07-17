document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll("[data-evento-inline=\"ahp-step6-resultados-conteudo-1\"]").forEach(function (elemento) {
    elemento.addEventListener("change", function (event) {
      toggleConfigSource()
    });
  });
  document.querySelectorAll("[data-evento-inline=\"ahp-step6-resultados-conteudo-2\"]").forEach(function (elemento) {
    elemento.addEventListener("change", function (event) {
      toggleConfigSource()
    });
  });
  document.querySelectorAll("[data-evento-inline=\"ahp-step6-resultados-conteudo-3\"]").forEach(function (elemento) {
    elemento.addEventListener("change", function (event) {
      handleConfigFile(event)
    });
  });
  document.querySelectorAll("[data-evento-inline=\"ahp-step6-resultados-conteudo-4\"]").forEach(function (elemento) {
    elemento.addEventListener("click", function (event) {
      document.getElementById('cfg-file-input').click()
    });
  });
  document.querySelectorAll("[data-evento-inline=\"ahp-step6-resultados-conteudo-5\"]").forEach(function (elemento) {
    elemento.addEventListener("click", function (event) {
      if(window.SLTAhpNav){event.preventDefault();window.SLTAhpNav.irPara('step7-alternativas.html');}
    });
  });
});
