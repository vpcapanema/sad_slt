/**
 * Página pública de preenchimento colaborativo da matriz pareada.
 */
(function (global) {
  "use strict";

  var token = "";
  var meta = null;
  var stats = { inicio_ms: null, pares: {} };
  var draftActive = false;
  var saveTimer = null;

  function qp(name) {
    return new URLSearchParams(global.location.search).get(name);
  }

  function el(id) {
    return document.getElementById(id);
  }

  function feedback(msg, kind) {
    var box = el("colab-id-feedback");
    if (!box) return;
    box.textContent = msg || "";
    box.className = "ahp-matriz-edit-feedback" + (kind ? " is-" + kind : "");
  }

  function submitFeedback(msg, kind) {
    var box = el("collab-submit-feedback");
    if (!box) return;
    box.textContent = msg || "";
    box.className = "ahp-matriz-edit-feedback" + (kind ? " is-" + kind : "");
  }

  function renderContext() {
    var box = el("collab-context");
    if (!box || !meta) return;
    box.innerHTML =
      "<p><strong>Escopo:</strong> " +
      (meta.escopo || "—") +
      "</p><p><strong>Objetivo:</strong> " +
      (meta.objetivo || "—") +
      "</p><p><strong>Prazo:</strong> " +
      meta.valido_ate +
      " · <strong>Status:</strong> " +
      meta.status +
      "</p>";
  }

  function trackPair(pid) {
    stats.pares[pid] = (stats.pares[pid] || 0) + 1;
  }

  function patchSaatyTracking() {
    document.querySelectorAll(".saaty-scale").forEach(function (scale) {
      scale.addEventListener("mousedown", function () {
        trackPair(scale.dataset.pid);
      });
      scale.addEventListener("touchstart", function () {
        trackPair(scale.dataset.pid);
      });
    });
  }

  function updateCollabMetrics() {
    if (typeof buildLiveMatrix !== "function" || typeof SLTAhp === "undefined") return;
    var matrix = buildLiveMatrix();
    if (!matrix) return;
    var res = SLTAhp.analyzeMatrix(matrix);
    el("metricRCValue").textContent = res.CR.toFixed(4);
    el("metricICValue").textContent = res.CI.toFixed(4);
    el("metricLambdaValue").textContent = res.lambdaMax.toFixed(4);
    var btn = el("btn-enviar-resposta");
    if (btn) btn.disabled = res.CR >= 0.1;
    submitFeedback(
      res.CR < 0.1
        ? "Matriz consistente (RC < 0,10). Você pode enviar."
        : "RC = " + res.CR.toFixed(4) + " — ajuste as comparações (necessário RC < 0,10).",
      res.CR < 0.1 ? "success" : "error"
    );
  }

  function updateProgressHint(cr) {
    var hint = el("collab-reciprocal-hint");
    if (!hint) return;
    var total = document.querySelectorAll(".saaty-pair").length;
    var touched = document.querySelectorAll(".saaty-pair--touched").length;
    hint.innerHTML =
      '<i class="fas fa-circle-check" aria-hidden="true"></i> ' +
      "Pares revisados: <strong>" + touched + "/" + total + "</strong>. " +
      "Cada ajuste preenche automaticamente o valor oposto da comparaÃ§Ã£o. " +
      (cr < 0.1 ? "A consistÃªncia estÃ¡ adequada para envio." : "Acompanhe o RC acima antes de enviar.");
    hint.className = "ahp-collab-reciprocal-hint " + (cr < 0.1 ? "is-ok" : "is-warn");
  }

  var originalUpdateCollabMetrics = updateCollabMetrics;
  updateCollabMetrics = function () {
    originalUpdateCollabMetrics();
    if (typeof buildLiveMatrix !== "function" || typeof SLTAhp === "undefined") return;
    var matrix = buildLiveMatrix();
    if (!matrix) return;
    var res = SLTAhp.analyzeMatrix(matrix);
    updateProgressHint(res.CR);
    if (draftActive) {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(function () {
        var email = (el("colab-email").value || "").trim().toLowerCase();
        global.SLTColaborativaApi.salvarProgresso(token, {
          email: email, matriz_comparacao: matrix,
          estatisticas: { revisoes_por_par: stats.pares, duracao_ms: stats.inicio_ms ? Date.now() - stats.inicio_ms : null },
        }).then(function () { submitFeedback("Progresso salvo automaticamente.", "success"); })
          .catch(function (err) { submitFeedback("Não foi possível salvar o progresso: " + (err.message || err), "error"); });
      }, 600);
    }
  };

  global.updateLiveMetrics = updateCollabMetrics;

  function liberarFormulario() {
    var nome = (el("colab-nome").value || "").trim();
    var inst = (el("colab-inst").value || "").trim();
    var email = (el("colab-email").value || "").trim().toLowerCase();
    if (!nome || !inst || !email) {
      feedback("Informe nome, instituição e e-mail para iniciar o preenchimento.", "error");
      return;
    }
    feedback("Verificando convite…", "info");
    global.SLTColaborativaApi.obterPublico(token, email)
      .then(function (m) {
        if (m.status !== "ativa") {
          feedback("Este formulário não está mais disponível.", "error");
          return;
        }
        if (!m.email_autorizado) {
          feedback("E-mail não autorizado para este ambiente.", "error");
          return;
        }
        meta = m;
        return global.SLTColaborativaApi.iniciarResposta(token, { identificacao: { nome_completo: nome, email: email, instituicao: inst } });
      }).then(function (resposta) {
        if (!resposta) return;
        if (resposta.status === "enviada") { feedback("Este e-mail já enviou a resposta deste julgamento.", "error"); return; }
        if (typeof global.setAhpCriteria === "function") global.setAhpCriteria(meta.criterios || []); else global.criteria = meta.criterios || [];
        global.ahpCollaborativeDraftMatrix = resposta.matriz_comparacao || null;
        feedback("Formulário liberado. O progresso será salvo automaticamente.", "success");
        el("collab-form-section").classList.remove("is-hidden");
        stats.inicio_ms = Date.now(); draftActive = false;
        if (typeof generatePairwiseFormStep4 === "function") generatePairwiseFormStep4();
        var content = el("comparisonContent");
        if (content && !el("collab-reciprocal-hint")) {
          content.insertAdjacentHTML(
            "beforebegin",
            '<div id="collab-reciprocal-hint" class="ahp-collab-reciprocal-hint" role="status" aria-live="polite"></div>'
          );
        }
        patchSaatyTracking();
        draftActive = true;
        updateCollabMetrics();
      })
      .catch(function (err) {
        feedback(err.message || String(err), "error");
      });
  }

  function enviarResposta() {
    var nome = (el("colab-nome").value || "").trim();
    var inst = (el("colab-inst").value || "").trim();
    var email = (el("colab-email").value || "").trim().toLowerCase();
    if (!nome || !inst || !email) {
      submitFeedback("Preencha nome, instituição e e-mail.", "error");
      return;
    }
    var matrix = buildLiveMatrix();
    if (!matrix) {
      submitFeedback("Matriz incompleta.", "error");
      return;
    }
    var res = SLTAhp.analyzeMatrix(matrix);
    if (res.CR >= 0.1) {
      submitFeedback("RC ≥ 0,10 — envio bloqueado.", "error");
      return;
    }
    var duracao_ms = stats.inicio_ms ? Date.now() - stats.inicio_ms : null;
    submitFeedback("Enviando…", "info");
    el("btn-enviar-resposta").disabled = true;
    global.SLTColaborativaApi.enviarResposta(token, {
      identificacao: { nome_completo: nome, email: email, instituicao: inst },
      matriz_comparacao: matrix,
      estatisticas: { duracao_ms: duracao_ms, revisoes_por_par: stats.pares },
    })
      .then(function () {
        draftActive = false;
        submitFeedback("Resposta enviada com sucesso. Obrigado!", "success");
      })
      .catch(function (err) {
        el("btn-enviar-resposta").disabled = false;
        submitFeedback(err.message || String(err), "error");
      });
  }

  document.addEventListener("DOMContentLoaded", function () {
    var tokenPath = global.location.pathname.match(/\/public\/analise-multicriterio\/([^/]+)\/?$/);
    token = qp("token") || (tokenPath ? decodeURIComponent(tokenPath[1]) : "");
    var preEmail = qp("email") || "";
    if (preEmail && el("colab-email")) el("colab-email").value = preEmail;
    if (!token) {
      el("collab-context").innerHTML =
        '<p class="ahp-recommendation">Link inválido — token ausente.</p>';
      return;
    }
    global.SLTColaborativaApi.obterPublico(token)
      .then(function (m) {
        meta = m;
        renderContext();
      })
      .catch(function (err) {
        el("collab-context").innerHTML = "<p>" + (err.message || err) + "</p>";
      });
    el("btn-liberar-form").addEventListener("click", liberarFormulario);
    el("btn-enviar-resposta").addEventListener("click", enviarResposta);
  });
})(window);
