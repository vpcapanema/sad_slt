/**
 * Guarda de sessão do módulo AHP — exige login de gestor e exibe a barra de sessão ativa.
 */
(function (global) {
  "use strict";

  document.documentElement.classList.add("ahp-auth-pending");

  var readyPromise = null;

  function requireModuleAuth() {
    if (!readyPromise) {
      if (!global.SLTAdminAuth) {
        readyPromise = Promise.resolve(null);
        document.documentElement.classList.remove("ahp-auth-pending");
        return readyPromise;
      }
      readyPromise = global.SLTAdminAuth.requireAuth().then(function (user) {
        if (user) {
          document.documentElement.classList.remove("ahp-auth-pending");
        }
        return user;
      });
    }
    return readyPromise;
  }

  global.SLTAhpAuth = {
    whenReady: requireModuleAuth,
    requireAuth: requireModuleAuth,
  };

  requireModuleAuth();
})(window);
