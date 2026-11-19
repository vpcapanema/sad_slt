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
  var consistencyDiagnosis = null;
  var consistencyHelpReturnFocus = null;

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
    [["Matriz / contexto do julgamento", meta.escopo], ["Objetivo", meta.objetivo],
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
    el("metricRCValue").textContent = SLTAhp.formatMetric(res.CR);
    el("metricICValue").textContent = SLTAhp.formatMetric(res.CI);
    el("metricLambdaValue").textContent = SLTAhp.formatMetric(res.lambdaMax);
    el("liveMetrics").setAttribute("aria-busy", "false");
    var rcCard = el("metricRCValue").closest(".ahp-metric-card");
    rcCard.classList.toggle("is-success", res.CR > 0 && res.CR < 0.1);
    rcCard.classList.toggle("is-failure", res.CR >= 0.1);
    el("collab-rc-status").textContent = res.CR < 0.1 ? "Adequada para envio" : "Inadequada para envio";
    var btn = el("btn-enviar-resposta");
    if (btn) btn.disabled = !draftActive || res.CR >= 0.1;
    submitFeedback(
      res.CR < 0.1
        ? "Matriz consistente (RC < 0,10). Você pode enviar."
        : "RC = " + SLTAhp.formatMetric(res.CR) + " — ajuste as comparações (necessário RC < 0,10).",
      res.CR < 0.1 ? "success" : "error"
    );
    updateProgressHint(res.CR);
    updateConsistencyHelp(matrix, res.CR);
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
    el("collab-consistency-help-button").hidden = true;
    consistencyDiagnosis = null;
    el("liveMetrics").setAttribute("aria-busy", "true");
    el("collab-rc-status").textContent = "Atualizando…";
    el("btn-enviar-resposta").disabled = true;
    el("collab-save-feedback").textContent = "Alterações aguardando salvamento…";
    submitFeedback("Atualizando os indicadores de consistência…", "info");
    metricsTimer = setTimeout(updateCollabMetrics, 1000);
  }

  function formatSaatyValue(value) {
    if (Math.abs(value - 1) < 1e-8) return "1 (igual importância)";
    if (value < 1) return "1/" + Math.round(1 / value);
    return String(Math.round(value));
  }

  function importanceIntensity(value) {
    var dominant = value < 1 ? 1 / value : value;
    if (dominant < 2) return "levemente";
    if (dominant < 4) return "moderadamente";
    if (dominant < 6) return "fortemente";
    if (dominant < 8) return "muito fortemente";
    return "extremamente";
  }

  function describeJudgment(matrix, first, second, names) {
    var value = matrix[first][second];
    if (Math.abs(value - 1) < 1e-8) {
      return "“" + names[first] + "” e “" + names[second] + "” têm igual importância";
    }
    var preferred = value > 1 ? first : second;
    var other = value > 1 ? second : first;
    return "“" + names[preferred] + "” foi considerado " + importanceIntensity(value) +
      " mais importante que “" + names[other] + "”";
  }

  function findPriorityCycle(matrix, answered) {
    function answeredPair(a, b) {
      return answered.has(Math.min(a, b) + "_" + Math.max(a, b));
    }
    function hasPriority(a, b) {
      return matrix[a][b] > 1 + 1e-8;
    }
    for (var a = 0; a < matrix.length; a++) {
      for (var b = a + 1; b < matrix.length; b++) {
        for (var c = b + 1; c < matrix.length; c++) {
          if (!answeredPair(a, b) || !answeredPair(b, c) || !answeredPair(a, c)) continue;
          if (hasPriority(a, b) && hasPriority(b, c) && hasPriority(c, a)) return { first: a, second: b, third: c };
          if (hasPriority(b, a) && hasPriority(a, c) && hasPriority(c, b)) return { first: b, second: a, third: c };
        }
      }
    }
    return null;
  }

  function strongestTriad(matrix, review, answered) {
    var best = null;
    for (var k = 0; k < matrix.length; k++) {
      if (k === review.i || k === review.j) continue;
      var first = Math.min(review.i, k) + "_" + Math.max(review.i, k);
      var second = Math.min(k, review.j) + "_" + Math.max(k, review.j);
      if (!answered.has(first) || !answered.has(second)) continue;
      var indirect = matrix[review.i][k] * matrix[k][review.j];
      if (!isFinite(indirect) || indirect <= 0) continue;
      var directLog = Math.log(matrix[review.i][review.j]);
      var indirectLog = Math.log(indirect);
      var directionConflict = directLog * indirectLog < 0 ||
        (Math.abs(directLog) < 1e-8) !== (Math.abs(indirectLog) < 1e-8);
      var contradiction = Math.abs(directLog - indirectLog);
      if (!best || (directionConflict && !best.directionConflict) ||
        (directionConflict === best.directionConflict && contradiction > best.contradiction)) {
        best = { k: k, indirect: indirect, contradiction: contradiction, directionConflict: directionConflict };
      }
    }
    return best;
  }

  function updateConsistencyHelp(matrix, cr) {
    var button = el("collab-consistency-help-button");
    button.hidden = true;
    consistencyDiagnosis = null;
    var answered = new Set(Object.keys(stats.pares).filter(function (key) { return stats.pares[key] > 0; }));
    var total = matrix.length * (matrix.length - 1) / 2;
    var count = 0;
    for (var i = 0; i < matrix.length; i++) {
      for (var j = i + 1; j < matrix.length; j++) if (answered.has(i + "_" + j)) count++;
    }
    if (!total || count / total < 0.6 || cr < 0.1) return;
    var reviews = SLTAhp.consistencyReviews(matrix, answered);
    consistencyDiagnosis = { matrix: matrix.map(function (row) { return row.slice(); }), cr: cr,
      answered: answered, count: count, total: total, reviews: reviews };
    button.hidden = false;
  }

  function closeConsistencyHelp() {
    var modal = el("collab-consistency-modal");
    if (modal.hidden) return;
    modal.hidden = true;
    if (consistencyHelpReturnFocus) consistencyHelpReturnFocus.focus();
  }

  function openConsistencyHelp() {
    if (!consistencyDiagnosis) return;
    var diagnosis = consistencyDiagnosis;
    var names = normalizeCriteriaNames(meta.criterios);
    var list = el("collab-consistency-pairs");
    list.replaceChildren();
    el("collab-consistency-modal-summary").textContent =
      "Foram confirmados " + diagnosis.count + " de " + diagnosis.total + " pares (" +
      Math.round(100 * diagnosis.count / diagnosis.total) + "%) e a RC atual é " +
      SLTAhp.formatMetric(diagnosis.cr) + ". O diagnóstico é orientativo e não altera suas respostas.";
    if (!diagnosis.reviews.length) {
      var empty = document.createElement("li");
      empty.textContent = "Nenhum par isolado explica suficientemente a inconsistência. Complete os pares restantes e reveja o conjunto das comparações.";
      list.appendChild(empty);
    }
    diagnosis.reviews.forEach(function (review) {
      var item = document.createElement("li"), link = document.createElement("a");
      var input = el("pair_" + review.i + "_" + review.j);
      var pair = input && input.closest(".saaty-pair");
      if (pair) pair.id = "collab-review-" + review.i + "-" + review.j;
      link.href = pair ? "#" + pair.id : "#";
      link.textContent = names[review.i] + " × " + names[review.j];
      link.addEventListener("click", function (event) {
        event.preventDefault();
        if (!pair) return;
        closeConsistencyHelp();
        pair.scrollIntoView({ behavior: "smooth", block: "center" });
        pair.querySelector(".saaty-scale").focus({ preventScroll: true });
      });
      item.append(link, document.createTextNode(
        " — valor atual: " + formatSaatyValue(review.currentValue) +
        "; valor a reavaliar na simulação: " + formatSaatyValue(review.suggestedValue) +
        ". RC projetada isoladamente: " + SLTAhp.formatMetric(review.projectedCR) + "."
      ));
      list.appendChild(item);
    });
    var cycle = findPriorityCycle(diagnosis.matrix, diagnosis.answered);
    var primary = null, triad = null;
    diagnosis.reviews.some(function (review) {
      var candidate = strongestTriad(diagnosis.matrix, review, diagnosis.answered);
      if (!candidate) return false;
      primary = review;
      triad = candidate;
      return true;
    });
    if (!primary) primary = diagnosis.reviews[0];
    if (cycle) {
      el("collab-consistency-why").textContent =
        "Suas respostas indicam a seguinte linha de raciocínio: “" + names[cycle.first] +
        "” deve ter prioridade sobre “" + names[cycle.second] + "”, e “" + names[cycle.second] +
        "” deve ter prioridade sobre “" + names[cycle.third] + "”. Portanto, seria lógico esperar que “" +
        names[cycle.first] + "” também tivesse prioridade sobre “" + names[cycle.third] +
        "”. Contudo, na comparação direta entre “" + names[cycle.first] + "” e “" + names[cycle.third] +
        "”, você indicou o contrário. Isso significa que os três julgamentos não podem ser verdadeiros simultaneamente dentro da mesma lógica de priorização.";
    } else if (primary && triad) {
      el("collab-consistency-why").textContent =
        "Suas respostas indicam a seguinte linha de raciocínio: " +
        describeJudgment(diagnosis.matrix, primary.i, triad.k, names) + ", e " +
        describeJudgment(diagnosis.matrix, triad.k, primary.j, names) + ". Contudo, na comparação direta, você informou que " +
        describeJudgment(diagnosis.matrix, primary.i, primary.j, names) +
        ". Embora a ordem geral não esteja invertida, as intensidades desses três julgamentos não são compatíveis entre si dentro da mesma lógica de priorização.";
    } else if (primary) {
      el("collab-consistency-why").textContent =
        "Suas respostas indicam que " + describeJudgment(diagnosis.matrix, primary.i, primary.j, names) +
        ". Contudo, esse julgamento destoa das demais comparações feitas com “" + names[primary.i] +
        "” e “" + names[primary.j] + "”. Isso significa que as respostas não sustentam simultaneamente a mesma lógica de priorização.";
    } else {
      el("collab-consistency-why").textContent =
        "A RC reúne as relações entre todos os critérios. Neste momento, as intensidades informadas formam proporções que não podem ser mantidas simultaneamente de modo coerente.";
    }
    el("collab-consistency-tip").textContent =
      "Pense novamente na ordem desses três critérios para o objetivo desta análise e altere apenas a comparação que não representa sua avaliação real. Ajuste um par por vez e aguarde o recálculo da RC.";
    consistencyHelpReturnFocus = document.activeElement;
    el("collab-consistency-modal").hidden = false;
    el("collab-consistency-modal-close").focus();
  }

  function updateProgressHint(cr) {
    var hint = el("collab-reciprocal-hint");
    if (!hint) return;
    var total = document.querySelectorAll(".saaty-pair").length;
    var touched = document.querySelectorAll("#comparisonContent .saaty-pair.is-auto-validated").length;
    hint.textContent = "Pares confirmados: " + touched + "/" + total;
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
    if (!global.SLTColaborativaModelo && !/^[A-Za-z0-9_-]{43}$/.test(codigo)) {
      feedback("Informe a chave individual recebida por e-mail. Códigos antigos não são mais aceitos.", "error");
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
    var processo = global.ProcessFeedback.iniciarCadastro({
      title: global.SLTColaborativaSimulacao ? "Simular envio da resposta" : "Enviar resposta do especialista",
      tasks: ["Concluir salvamentos pendentes", "Enviar resposta"],
    });
    processo.tarefaAtual("Concluir salvamentos pendentes", "Aguardando os salvamentos já iniciados antes do envio definitivo.");
    submitFeedback("Enviando…", "info");
    clearTimeout(saveTimer);
    clearTimeout(metricsTimer);
    draftActive = false;
    el("btn-enviar-resposta").disabled = true;
    el("comparisonContent").inert = true;
    saveQueue.then(function () {
      processo.concluirTarefa("Concluir salvamentos pendentes");
      processo.tarefaAtual("Enviar resposta", "Aguardando a confirmação do servidor. Não feche a página nem repita o envio.");
      return global.SLTColaborativaApi.enviarResposta(token, {
      identificacao: acesso.identificacao,
      token_acesso: acesso.token_acesso,
      matriz_comparacao: matrix,
      estatisticas: { duracao_ms: duracao_ms, revisoes_por_par: stats.pares },
    }); })
      .then(function () {
        draftActive = false;
        var mensagem = global.SLTColaborativaSimulacao ? "Envio simulado com sucesso. Nenhuma resposta foi gravada." : "Resposta enviada com sucesso. Obrigado!";
        submitFeedback(mensagem, "success");
        processo.concluirTarefa("Enviar resposta");
        processo.sucesso({title: global.SLTColaborativaSimulacao ? "Envio simulado" : "Resposta enviada", message: mensagem});
      })
      .catch(function (err) {
        draftActive = true;
        el("comparisonContent").inert = false;
        el("btn-enviar-resposta").disabled = false;
        submitFeedback(err.message || String(err), "error");
        processo.erro({title: "Resposta não enviada", message: err.message || String(err),
          detail: "O preenchimento foi mantido. Confira o problema e tente enviar novamente."});
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
    el("collab-consistency-help-button").addEventListener("click", openConsistencyHelp);
    el("collab-consistency-modal-close").addEventListener("click", closeConsistencyHelp);
    el("collab-consistency-modal").addEventListener("click", function (event) {
      if (event.target === event.currentTarget) closeConsistencyHelp();
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && !el("collab-consistency-modal").hidden) closeConsistencyHelp();
    });
  });
})(window);
