(function () {
  function informar() {
    window.StatusFeedback.erro({title:'Acesso não autorizado', status:403,
      message:document.getElementById('access-denied-message').textContent.trim(),
      solution:'Consulte os módulos disponíveis no seu menu. Se precisar de outra atribuição, solicite a verificação do perfil de acesso.'});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',informar);
  else informar();
})();
