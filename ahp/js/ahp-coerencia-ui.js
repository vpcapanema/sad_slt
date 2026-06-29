/**
 * Modais AHP — confirmação de avisos de coerência conceitual.
 * Cabeçalho padrão PLI (azul + ícone verde + título branco); corpo conforme variante.
 */
(function (global) {
  "use strict";

  var VARIANTS = {
    success: {
      modalClass: "ahp-modal--success",
      icon: "fa-circle-check",
      confirmClass: "btn btn-primary ahp-modal-btn--confirm",
    },
    warning: {
      modalClass: "ahp-modal--warning",
      icon: "fa-triangle-exclamation",
      confirmClass: "btn btn-primary ahp-modal-btn--confirm",
    },
    error: {
      modalClass: "ahp-modal--error",
      icon: "fa-circle-xmark",
      confirmClass: "btn btn-primary ahp-modal-btn--confirm",
    },
  };

  function escapeHtml(text) {
    return String(text == null ? "" : text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function resolveVariant(name) {
    return VARIANTS[name] || VARIANTS.warning;
  }

  /**
   * @param {{titulo?:string, intro?:string, avisos:Array, variant?:string, onConfirm:Function, onCancel?:Function}} opts
   */
  function confirmarAvisos(opts) {
    opts = opts || {};
    var avisos = opts.avisos || [];
    if (!avisos.length) {
      if (opts.onConfirm) opts.onConfirm();
      return Promise.resolve(true);
    }

    var variant = resolveVariant(opts.variant || "warning");

    return new Promise(function (resolve) {
      var overlay = document.createElement("div");
      overlay.className = "ahp-coerencia-modal-overlay";
      overlay.setAttribute("role", "dialog");
      overlay.setAttribute("aria-modal", "true");
      overlay.setAttribute("aria-labelledby", "ahp-coerencia-modal-title");

      var list = avisos
        .map(function (a) {
          return (
            "<li><strong>" +
            escapeHtml(a.codigo || "AVISO") +
            ":</strong> " +
            escapeHtml(a.mensagem || "") +
            "</li>"
          );
        })
        .join("");

      overlay.innerHTML =
        '<div class="ahp-coerencia-modal card ' +
        variant.modalClass +
        '">' +
        '<div class="ahp-coerencia-modal__head">' +
        '<i class="fas ' +
        variant.icon +
        '" aria-hidden="true"></i>' +
        '<span id="ahp-coerencia-modal-title">' +
        escapeHtml(opts.titulo || "Divergências em relação à configuração") +
        "</span></div>" +
        '<div class="ahp-coerencia-modal__body">' +
        '<p class="ahp-coerencia-modal__intro">' +
        escapeHtml(
          opts.intro ||
            "Os itens abaixo não correspondem plenamente ao catálogo e à configuração carregada. Deseja prosseguir mesmo assim?"
        ) +
        "</p>" +
        '<ul class="ahp-coerencia-modal__list">' +
        list +
        "</ul>" +
        '<div class="ahp-coerencia-modal__actions">' +
        '<button type="button" class="btn btn-secondary ahp-modal-btn--cancel" data-role="cancel">Revisar</button>' +
        '<button type="button" class="' +
        variant.confirmClass +
        '" data-role="confirm">Prosseguir mesmo assim</button>' +
        "</div></div></div>";

      function close(result) {
        overlay.remove();
        resolve(result);
      }

      overlay.querySelector('[data-role="cancel"]').addEventListener("click", function () {
        if (opts.onCancel) opts.onCancel();
        close(false);
      });
      overlay.querySelector('[data-role="confirm"]').addEventListener("click", function () {
        var confirmBtn = overlay.querySelector('[data-role="confirm"]');
        confirmBtn.disabled = true;
        Promise.resolve(opts.onConfirm && opts.onConfirm())
          .then(function () {
            close(true);
          })
          .catch(function () {
            confirmBtn.disabled = false;
            close(false);
          });
      });

      document.body.appendChild(overlay);
      overlay.querySelector('[data-role="cancel"]').focus();
    });
  }

  /**
   * Executa onProceed se não houver avisos; caso contrário exibe modal e acumula alertas.
   * @param {{avisos:Array, context?:object}} res
   * @param {{etapa?:string, variant?:string, titulo?:string, intro?:string}} meta
   * @param {Function} onProceed
   */
  function confirmarSeNecessario(res, meta, onProceed) {
    meta = meta || {};
    res = res || {};
    if (!res.avisos || !res.avisos.length) {
      return onProceed ? Promise.resolve(onProceed()) : Promise.resolve(true);
    }
    return confirmarAvisos({
      variant: meta.variant || "warning",
      titulo: meta.titulo,
      intro: meta.intro,
      avisos: res.avisos,
      onConfirm: function () {
        if (global.SLTAhpAlertas && global.SLTAhpCoerencia) {
          global.SLTAhpAlertas.acumularAlertas(
            global.SLTAhpAlertas.avisosParaAlertas(
              res.avisos,
              meta.etapa || "",
              global.SLTAhpCoerencia.configSnapshot(res.context)
            )
          );
        }
        return onProceed ? onProceed() : undefined;
      },
    }).then(function (ok) {
      if (!ok) {
        var err = new Error("Revisão cancelada pelo usuário.");
        err.code = "COERENCIA_CANCELADA";
        throw err;
      }
      return true;
    });
  }

  global.SLTAhpCoerenciaUI = {
    confirmarAvisos: confirmarAvisos,
    confirmarSeNecessario: confirmarSeNecessario,
  };
})(window);
