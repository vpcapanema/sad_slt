/**
 * Cliente HTTP — preenchimento colaborativo da matriz pareada.
 */
(function (global) {
  "use strict";

  var prefixMatch = global.location.pathname.match(/^(.*?)\/(?:restrict|public)\//);
  var APP_PREFIX = prefixMatch ? prefixMatch[1] : "";
  var BASE = APP_PREFIX + "/" + "api/ahp/comparacao-colaborativa";

  function request(path, options) {
    return fetch(BASE + path, { credentials: "same-origin", ...(options || {}) }).then(function (res) {
      return res.json().then(function (body) {
        if (!res.ok) {
          var err = new Error(
            (body && (body.detail || body.message)) || "Erro na requisição."
          );
          err.status = res.status;
          throw err;
        }
        return body;
      });
    });
  }

  global.SLTColaborativaApi = {
    listarAmbientes: function () {
      return request("/ambientes");
    },
    criarAmbiente: function (payload) {
      return request("/ambientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    },
    obterAmbienteConfig: function (tipo, codigo) {
      return request("/ambientes/" + encodeURIComponent(tipo) + "/" + encodeURIComponent(codigo));
    },
    listarAmbientesConfig: function (tipo, codigo) {
      return request("/ambientes/configuracao/" + encodeURIComponent(tipo) + "/" + encodeURIComponent(codigo));
    },
    obterPublico: function (token, email) {
      var qs = email ? "?email=" + encodeURIComponent(email) : "";
      return request("/publico/" + encodeURIComponent(token) + qs);
    },
    enviarResposta: function (token, payload) {
      return request("/publico/" + encodeURIComponent(token) + "/respostas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    },
    iniciarResposta: function (token, payload) {
      return request("/publico/" + encodeURIComponent(token) + "/respostas/iniciar", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
    },
    salvarProgresso: function (token, payload) {
      return request("/publico/" + encodeURIComponent(token) + "/respostas/progresso", {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
    },
    listarRespostas: function (ambienteId) {
      return request("/ambientes/" + encodeURIComponent(ambienteId) + "/respostas");
    },
    obterAmbiente: function (ambienteId) {
      return request("/ambientes/" + encodeURIComponent(ambienteId));
    },
    consolidarAmbiente: function (ambienteId) {
      return request("/ambientes/" + encodeURIComponent(ambienteId) + "/consolidar", {
        method: "POST",
      });
    },
  };
})(window);
