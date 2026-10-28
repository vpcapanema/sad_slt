/**
 * Página pública de preenchimento colaborativo da matriz pareada.
 */
(function (global) {
  "use strict";

  var token = "";
  var meta = null;
  var stats = { inicio_ms: null, duracao_anterior_ms: 0, pares: {} };
  var draftActive = false;
  var saveTimer = null;
  var metricsTimer = null;
  var latestCR = null;
  var acesso = null;
  var verificando = false;
  var pairTimers = new Map();
  var saveQueue = Promise.resolve();
  var editVersion = 0;

  function bloquearIdentificacao(bloqueado) {
    ["colab-nome", "colab-inst", "colab-email", "colab-token", "btn-liberar-form"].forEach(function (id) {
      if (el(id)) el(id).disabled = bloqueado;
    });
  }

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
    var prazo = "Não informado";
    if (meta.valido_ate) {
      var data = new Date(meta.valido_ate);
      prazo = isNaN(data.getTime()) ? "Data inválida — solicite a revisão ao responsável." :
        new Intl.DateTimeFormat("pt-BR", {
          timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric",
          hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
        }).format(data);
    }
    box.replaceChildren();
    [["Hierarquização", meta.escopo], ["Objetivo", meta.objetivo],
      ["Prazo", prazo], ["Status da rodada de julgamento", meta.status]].forEach(function (item) {
      var line = document.createElement("p"), label = document.createElement("strong");
      label.textContent = item[0] + ": ";
      line.append(label, document.createTextNode(item[1] || "—"));
      if (item[0] === "Prazo") line.title = "Horário de Brasília";
      box.appendChild(line);
    });
  }

  function trackPair(pid) {
    stats.pares[pid] = (stats.pares[pid] || 0) + 1;
  }

  function duracaoTotal() {
    return stats.duracao_anterior_ms + (stats.inicio_ms ? Date.now() - stats.inicio_ms : 0);
  }

  function patchSaatyTracking() {
    document.querySelectorAll("#comparisonContent .saaty-pair").forEach(function (pair) {
      pair.addEventListener("saaty:change", function () {
        if (!draftActive) return;
        trackPair(pair.querySelector(".saaty-scale").dataset.pid);
        clearTimeout(pairTimers.get(pair));
        pair.classList.remove("is-auto-validated");
        pair.classList.add("is-auto-editing");
        pairTimers.set(pair, setTimeout(function () {
          pairTimers.delete(pair);
          pair.classList.remove("is-auto-editing");
          pair.classList.add("is-auto-validated");
          updateProgressHint(latestCR);
        }, 3000));
      });
    });
  }

  function queueProgress(matrix, version) {
    var payload = {
      email: acesso.identificacao.email, token_acesso: acesso.token_acesso, matriz_comparacao: matrix,
      estatisticas: { revisoes_por_par: Object.assign({}, stats.pares),
        duracao_ms: duracaoTotal() },
    };
    saveQueue = saveQueue.then(function () {
      return global.SLTColaborativaApi.salvarProgresso(token, payload);
    }).then(function () {
      if (draftActive && version === editVersion) el("collab-save-feedback").textContent = global.SLTColaborativaSimulacao ? "Progresso mantido apenas nesta simulação." : "Progresso salvo automaticamente.";
    }).catch(function (err) {
      el("collab-save-feedback").textContent = "Não foi possível salvar o progresso: " + (err.message || err);
    });
  }

  function updateCollabMetrics() {
    clearTimeout(metricsTimer);
    metricsTimer = null;
    if (typeof buildLiveMatrix !== "function" || typeof SLTAhp === "undefined") return;
    var matrix = buildLiveMatrix();
    if (!matrix) return;
    var res = SLTAhp.analyzeMatrix(matrix);
    latestCR = res.CR;
    el("metricRCValue").textContent = res.CR.toFixed(4);
    el("metricICValue").textContent = res.CI.toFixed(4);
    el("metricLambdaValue").textContent = res.lambdaMax.toFixed(4);
    el("liveMetrics").setAttribute("aria-busy", "false");
    var rcCard = el("metricRCValue").closest(".ahp-metric-card");
    rcCard.classList.toggle("is-success", res.CR > 0 && res.CR < 0.1);
    rcCard.classList.toggle("is-failure", res.CR >= 0.1);
    el("collab-rc-status").textContent = res.CR === 0 ? "RC zero" : res.CR < 0.1 ? "Dentro do aceitável" : "Fora do aceitável";
    var btn = el("btn-enviar-resposta");
    if (btn) btn.disabled = !draftActive || res.CR >= 0.1;
    submitFeedback(
      res.CR < 0.1
        ? "Matriz consistente (RC < 0,10). Você pode enviar."
        : "RC = " + res.CR.toFixed(4) + " — ajuste as comparações (necessário RC < 0,10).",
      res.CR < 0.1 ? "success" : "error"
    );
    updateProgressHint(res.CR);
    if (draftActive) {
      var version = editVersion;
      el("collab-save-feedback").textContent = "Alterações aguardando salvamento…";
      clearTimeout(saveTimer);
      saveTimer = setTimeout(function () { queueProgress(matrix, version); }, 600);
    }
  }

  function scheduleCollabMetrics() {
    if (!draftActive) return;
    clearTimeout(metricsTimer);
    clearTimeout(saveTimer);
    editVersion++;
    latestCR = null;
    el("liveMetrics").setAttribute("aria-busy", "true");
    el("collab-rc-status").textContent = "Atualizando…";
    el("btn-enviar-resposta").disabled = true;
    el("collab-save-feedback").textContent = "Alterações aguardando salvamento…";
    submitFeedback("Atualizando os indicadores de consistência…", "info");
    metricsTimer = setTimeout(updateCollabMetrics, 1000);
  }

  function updateProgressHint(cr) {
    var hint = el("collab-reciprocal-hint");
    if (!hint) return;
    var total = document.querySelectorAll(".saaty-pair").length;
    var touched = document.querySelectorAll("#comparisonContent .saaty-pair.is-auto-validated").length;
    hint.innerHTML =
      '<i class="fas fa-circle-check" aria-hidden="true"></i> ' +
      "Pares confirmados: <strong>" + touched + "/" + total + "</strong>. " +
      "Cada ajuste preenche automaticamente o valor inverso da comparação. " +
      (cr == null ? "Atualizando os indicadores de consistência…" :
        cr < 0.1 ? "A consistência está adequada para envio." : "Acompanhe o RC acima antes de enviar.");
    hint.className = "ahp-collab-reciprocal-hint " + (cr == null ? "" : cr < 0.1 ? "is-ok" : "is-warn");
  }

  global.updateLiveMetrics = scheduleCollabMetrics;

  function liberarFormulario() {
    if (verificando || draftActive) return;
    var nome = (el("colab-nome").value || "").trim();
    var inst = (el("colab-inst").value || "").trim();
    var email = (el("colab-email").value || "").trim().toLowerCase();
    var codigo = global.SLTColaborativaModelo ? "000000" : (el("colab-token").value || "").trim();
    if (!nome || !inst || !email) {
      feedback("Informe nome, instituição e e-mail para iniciar o preenchimento.", "error");
      return;
    }
    if (!/^[0-9]{6}$/.test(codigo)) {
      feedback("Informe o código de acesso de seis números recebido por e-mail.", "error");
      return;
    }
    verificando = true;
    bloquearIdentificacao(true);
    feedback("Verificando convite…", "info");
    var candidato = { token_acesso: codigo, identificacao: { nome_completo: nome, email: email, instituicao: inst } };
    global.SLTColaborativaApi.validarAcesso(token, email, codigo)
      .then(function (m) {
        if (m.status !== "ativa") {
          feedback("Este formulário não está mais disponível.", "error");
          return;
        }
        if (!m.email_autorizado) {
          feedback("E-mail ou código de acesso inválido. Confira o convite recebido.", "error");
          return;
        }
        meta = m;
        global.setAhpCriteria(meta.criterios || []);
        if (normalizeCriteriaNames(meta.criterios).length < 2) {
          feedback("Este julgamento não possui critérios suficientes. Solicite a revisão ao responsável.", "error");
          return;
        }
        return global.SLTColaborativaApi.iniciarResposta(token, candidato);
      }).then(function (resposta) {
        if (!resposta) return;
        if (resposta.status === "enviada") { feedback("Este e-mail já enviou a resposta deste julgamento.", "error"); return; }
        acesso = candidato;
        if (typeof global.setAhpCriteria === "function") global.setAhpCriteria(meta.criterios || []); else global.criteria = meta.criterios || [];
        global.ahpCollaborativeDraftMatrix = resposta.matriz_comparacao || null;
        var anteriores = resposta.estatisticas || {};
        stats.pares = {};
        Object.entries(anteriores.revisoes_por_par || {}).forEach(function (entry) {
          if (/^\d+_\d+$/.test(entry[0]) && Number.isInteger(entry[1]) && entry[1] >= 0) stats.pares[entry[0]] = entry[1];
        });
        stats.duracao_anterior_ms = Number.isFinite(anteriores.duracao_ms) && anteriores.duracao_ms >= 0 ? anteriores.duracao_ms : 0;
        feedback(global.SLTColaborativaSimulacao ? "Simulação liberada. O progresso não será gravado." : "Formulário liberado. O progresso será salvo automaticamente.", "success");
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
      }).finally(function () {
        verificando = false;
        bloquearIdentificacao(draftActive);
      });
  }

  function enviarResposta() {
    if (!draftActive || !acesso) {
      submitFeedback("Valide seu e-mail e token antes de enviar.", "error");
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
    var duracao_ms = duracaoTotal();
    submitFeedback("Enviando…", "info");
    clearTimeout(saveTimer);
    clearTimeout(metricsTimer);
    draftActive = false;
    el("btn-enviar-resposta").disabled = true;
    el("comparisonContent").inert = true;
    saveQueue.then(function () { return global.SLTColaborativaApi.enviarResposta(token, {
      identificacao: acesso.identificacao,
      token_acesso: acesso.token_acesso,
      matriz_comparacao: matrix,
      estatisticas: { duracao_ms: duracao_ms, revisoes_por_par: stats.pares },
    }); })
      .then(function () {
        draftActive = false;
        submitFeedback(global.SLTColaborativaSimulacao ? "Envio simulado com sucesso. Nenhuma resposta foi gravada." : "Resposta enviada com sucesso. Obrigado!", "success");
      })
      .catch(function (err) {
        draftActive = true;
        el("comparisonContent").inert = false;
        el("btn-enviar-resposta").disabled = false;
        submitFeedback(err.message || String(err), "error");
      });
  }

  document.addEventListener("DOMContentLoaded", function () {
    var tokenPath = global.location.pathname.match(/\/public\/analise-multicriterio\/formulario-comparacao-pareada\/([^/]+)\/?$/);
    token = global.SLTColaborativaModelo ? "modelo-pli" : (qp("token") || (tokenPath ? decodeURIComponent(tokenPath[1]) : ""));
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
        el("collab-context").textContent = err.message || String(err);
      });
    el("btn-liberar-form").addEventListener("click", liberarFormulario);
    el("btn-enviar-resposta").addEventListener("click", enviarResposta);
  });
})(window);
