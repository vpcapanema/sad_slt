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
  var consistencyHelpReturnFocus = null;
  var consistencyWindowDrag = null;

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
    el("collab-consistency-help-button").hidden = !consistencyHelpState(matrix, res.CR);
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

  function formatSaatyValue(value) {
    if (Math.abs(value - 1) < 1e-8) return "1 (igual importância)";
    if (value < 1) return "1/" + Math.round(1 / value);
    return String(Math.round(value));
  }

  function importanceIntensity(value) {
    var dominant = value < 1 ? 1 / value : value;
    if (dominant < 2) return "igual";
    if (dominant < 4) return "pouco";
    if (dominant < 6) return "médio";
    if (dominant < 8) return "bastante";
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

  function describeFromLeft(matrix, left, right, names) {
    var value = matrix[left][right];
    if (Math.abs(value - 1) < 1e-8) {
      return "“" + names[left] + "” tem igual importância que “" + names[right] + "”";
    }
    return "“" + names[left] + "” é " + importanceIntensity(value) +
      (value > 1 ? " mais" : " menos") + " importante que “" + names[right] + "”";
  }

  function describeExpectedRelation(value, first, second, names) {
    if (Math.abs(value - 1) < 1e-8) {
      return "“" + names[first] + "” e “" + names[second] + "” tivessem importância semelhante";
    }
    var preferred = value > 1 ? first : second;
    var other = value > 1 ? second : first;
    return "“" + names[preferred] + "” fosse, em nível " + importanceIntensity(value) +
      ", mais importante que “" + names[other] + "”";
  }

  function appendCriterion(parent, name) {
    var strong = document.createElement("strong");
    strong.textContent = name;
    parent.append(document.createTextNode("“"), strong, document.createTextNode("”"));
  }

  function appendJudgmentFromLeft(parent, matrix, left, right, names) {
    var value = matrix[left][right];
    appendCriterion(parent, names[left]);
    if (Math.abs(value - 1) < 1e-8) {
      parent.append(document.createTextNode(" tem igual importância que "));
    } else {
      parent.append(document.createTextNode(" é " + importanceIntensity(value) +
        (value > 1 ? " mais" : " menos") + " importante que "));
    }
    appendCriterion(parent, names[right]);
  }

  function appendExpectedRelation(parent, value, first, second, names) {
    if (Math.abs(value - 1) < 1e-8) {
      appendCriterion(parent, names[first]);
      parent.append(document.createTextNode(" e "));
      appendCriterion(parent, names[second]);
      parent.append(document.createTextNode(" tivessem importância semelhante"));
      return;
    }
    var preferred = value > 1 ? first : second;
    var other = value > 1 ? second : first;
    appendCriterion(parent, names[preferred]);
    parent.append(document.createTextNode(" fosse, em nível " + importanceIntensity(value) +
      ", mais importante que "));
    appendCriterion(parent, names[other]);
  }

  function renderConsistencyNarrative(container, matrix, names, reviews, answered) {
    var triads = [], triadKeys = new Set(), pairKeys = new Set();
    reviews.forEach(function (review) {
      var evidence = strongestTriad(matrix, review, answered);
      if (!evidence) return;
      var indexes = [review.i, review.j, evidence.k].sort(function (a, b) { return a - b; });
      var triadKey = indexes.join("_");
      if (!triadKeys.has(triadKey)) {
        triadKeys.add(triadKey);
        triads.push(indexes);
      }
      [[indexes[0], indexes[1]], [indexes[0], indexes[2]], [indexes[1], indexes[2]]]
        .forEach(function (pair) { pairKeys.add(pair[0] + "_" + pair[1]); });
    });
    if (!triads.length) return false;
    var intro = document.createElement("p");
    intro.className = "collab-consistency-narrative__intro";
    intro.textContent = "Suas respostas indicam a seguinte linha de raciocínio:";
    var steps = document.createElement("ol");
    steps.className = "collab-consistency-narrative__steps";
    Array.from(pairKeys).map(function (key) { return key.split("_").map(Number); })
      .sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; })
      .forEach(function (pair) {
        var item = document.createElement("li");
        appendJudgmentFromLeft(item, matrix, pair[0], pair[1], names);
        item.append(document.createTextNode("."));
        steps.appendChild(item);
      });
    var explanations = document.createElement("div");
    explanations.className = "collab-consistency-narrative__explanations";
    triads.forEach(function (indexes) {
      var left = indexes[0], second = indexes[1], third = indexes[2];
      var expected = matrix[second][left] * matrix[left][third];
      var explanation = document.createElement("div");
      explanation.className = "collab-consistency-narrative__contrast";
      var expectationLine = document.createElement("p");
      expectationLine.className = "collab-consistency-narrative__line";
      expectationLine.append(document.createTextNode("Pelos julgamentos envolvendo "));
      appendCriterion(expectationLine, names[left]);
      expectationLine.append(document.createTextNode(", seria lógico esperar que "));
      appendExpectedRelation(expectationLine, expected, second, third, names);
      expectationLine.append(document.createTextNode("."));
      var contrastLine = document.createElement("p");
      contrastLine.className = "collab-consistency-narrative__line";
      contrastLine.append(document.createTextNode("Contudo, na comparação entre "));
      appendCriterion(contrastLine, names[second]);
      contrastLine.append(document.createTextNode(" e "));
      appendCriterion(contrastLine, names[third]);
      contrastLine.append(document.createTextNode(", você definiu que "));
      appendJudgmentFromLeft(contrastLine, matrix, second, third, names);
      contrastLine.append(document.createTextNode("."));
      explanation.append(expectationLine, contrastLine);
      explanations.appendChild(explanation);
    });
    var conclusion = document.createElement("p");
    conclusion.className = "collab-consistency-narrative__conclusion";
    conclusion.textContent = "Isso significa que os julgamentos destacados não podem ser verdadeiros simultaneamente, considerando a mesma lógica de priorização.";
    container.replaceChildren(intro, steps, explanations, conclusion);
    return true;
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

  function consistencyHelpState(matrix, cr) {
    if (cr < 0.1) return null;
    var answered = new Set(Object.keys(stats.pares).filter(function (key) { return stats.pares[key] > 0; }));
    var total = matrix.length * (matrix.length - 1) / 2;
    var count = 0;
    for (var i = 0; i < matrix.length; i++) {
      for (var j = i + 1; j < matrix.length; j++) if (answered.has(i + "_" + j)) count++;
    }
    if (!total || count / total < 0.6) return null;
    return { matrix: matrix, cr: cr, answered: answered, count: count, total: total };
  }

  function closeConsistencyHelp() {
    var modal = el("collab-consistency-modal");
    if (modal.hidden) return;
    modal.hidden = true;
    document.querySelectorAll("#collab-form-section .saaty-pair.is-consistency-review").forEach(function (pair) {
      pair.classList.remove("is-consistency-review");
    });
    if (consistencyHelpReturnFocus) consistencyHelpReturnFocus.focus();
  }

  function consistencyWindow() {
    return el("collab-consistency-modal").querySelector(".ahp-coerencia-modal");
  }

  function setWindowControl(id, active, activeLabel, inactiveLabel, activeIcon, inactiveIcon) {
    var button = el(id);
    var icon = button.querySelector("i");
    button.setAttribute("aria-pressed", active ? "true" : "false");
    button.setAttribute("aria-label", active ? activeLabel : inactiveLabel);
    button.title = (active ? activeLabel : inactiveLabel).replace(" ajuda", "");
    icon.className = "fas " + (active ? activeIcon : inactiveIcon);
  }

  function keepConsistencyWindowInView() {
    var panel = consistencyWindow();
    if (!panel.classList.contains("is-positioned") || panel.classList.contains("is-maximized")) return;
    var rect = panel.getBoundingClientRect();
    var gutter = 12;
    var left = Math.min(Math.max(gutter, rect.left), Math.max(gutter, global.innerWidth - rect.width - gutter));
    var top = Math.min(Math.max(gutter, rect.top), Math.max(gutter, global.innerHeight - rect.height - gutter));
    panel.style.left = left + "px";
    panel.style.top = top + "px";
  }

  function positionConsistencyWindow() {
    var panel = consistencyWindow();
    if (panel.classList.contains("is-positioned")) {
      keepConsistencyWindowInView();
      return;
    }
    var rect = panel.getBoundingClientRect();
    panel.style.left = Math.max(12, rect.left) + "px";
    panel.style.top = Math.max(12, rect.top) + "px";
    panel.classList.add("is-positioned");
  }

  function minimizeConsistencyWindow(active) {
    var panel = consistencyWindow();
    if (active) maximizeConsistencyWindow(false);
    panel.classList.toggle("is-minimized", active);
    setWindowControl("collab-consistency-modal-minimize", active,
      "Restaurar ajuda", "Minimizar ajuda", "fa-window-restore", "fa-window-minimize");
    global.requestAnimationFrame(keepConsistencyWindowInView);
  }

  function maximizeConsistencyWindow(active) {
    var panel = consistencyWindow();
    if (active) {
      panel.classList.remove("is-minimized");
      setWindowControl("collab-consistency-modal-minimize", false,
        "Restaurar ajuda", "Minimizar ajuda", "fa-window-restore", "fa-window-minimize");
    }
    panel.classList.toggle("is-maximized", active);
    setWindowControl("collab-consistency-modal-maximize", active,
      "Restaurar ajuda", "Maximizar ajuda", "fa-window-restore", "fa-window-maximize");
  }

  function consistencyReviewField(label, value) {
    var field = document.createElement("label");
    field.className = "collab-consistency-review-field";
    var name = document.createElement("strong");
    var input = document.createElement("input");
    name.textContent = label;
    input.type = "text";
    input.readOnly = true;
    input.value = value;
    input.setAttribute("aria-label", label);
    field.append(name, input);
    return field;
  }

  function openConsistencyHelp() {
    var matrix = buildLiveMatrix();
    if (!matrix) return;
    var diagnosis = consistencyHelpState(matrix, SLTAhp.analyzeMatrix(matrix).CR);
    if (!diagnosis) {
      el("collab-consistency-help-button").hidden = true;
      return;
    }
    diagnosis.reviews = SLTAhp.consistencyReviews(matrix, diagnosis.answered);
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
      var values = document.createElement("div"), status = document.createElement("p");
      var input = el("pair_" + review.i + "_" + review.j);
      var pair = input && input.closest(".saaty-pair");
      var projectedAcceptable = review.projectedCR < 0.1;
      item.className = "collab-consistency-review-item";
      values.className = "collab-consistency-review-values";
      status.className = "collab-consistency-review-status" + (projectedAcceptable ? " is-acceptable" : "");
      if (pair) pair.id = "collab-review-" + review.i + "-" + review.j;
      link.href = pair ? "#" + pair.id : "#";
      link.textContent = names[review.i] + " × " + names[review.j];
      link.addEventListener("click", function (event) {
        event.preventDefault();
        if (!pair) return;
        document.querySelectorAll("#collab-form-section .saaty-pair.is-consistency-review").forEach(function (candidate) {
          candidate.classList.remove("is-consistency-review");
        });
        pair.classList.add("is-consistency-review");
        pair.scrollIntoView({ behavior: "auto", block: "center" });
        pair.querySelector(".saaty-scale").focus({ preventScroll: true });
      });
      values.append(
        consistencyReviewField("Valor atual:", formatSaatyValue(review.currentValue)),
        consistencyReviewField("Valor sugerido:", formatSaatyValue(review.suggestedValue)),
        consistencyReviewField("RC projetada após alterar somente este par:", SLTAhp.formatMetric(review.projectedCR))
      );
      status.textContent = projectedAcceptable ?
        "O valor sugerido é o ajuste isolado que mais reduz a RC e, nesta simulação, deixa o resultado dentro do limite aceitável de 0,10." :
        "O valor sugerido é o ajuste isolado que mais reduz a RC. Nesta simulação, porém, ela ainda fica acima do limite aceitável de 0,10; outros pares também precisarão ser revistos.";
      item.append(link, values, status);
      list.appendChild(item);
    });
    var primary = null, triad = null;
    diagnosis.reviews.some(function (review) {
      var candidate = strongestTriad(diagnosis.matrix, review, diagnosis.answered);
      if (!candidate) return false;
      primary = review;
      triad = candidate;
      return true;
    });
    if (!primary) primary = diagnosis.reviews[0];
    if (renderConsistencyNarrative(el("collab-consistency-why"), diagnosis.matrix, names,
      diagnosis.reviews, diagnosis.answered)) {
      // Lista todos os pares que participam das inconsistências diagnosticadas.
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
      "Pense novamente na ordem dos critérios destacados para o objetivo desta análise e altere apenas as comparações que não representam sua avaliação real. Ajuste um par por vez e aguarde o recálculo da RC.";
    consistencyHelpReturnFocus = document.activeElement;
    el("collab-consistency-modal").hidden = false;
    positionConsistencyWindow();
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
    el("collab-consistency-modal-minimize").addEventListener("click", function () {
      var panel = consistencyWindow();
      minimizeConsistencyWindow(!panel.classList.contains("is-minimized"));
    });
    el("collab-consistency-modal-maximize").addEventListener("click", function () {
      var panel = consistencyWindow();
      maximizeConsistencyWindow(!panel.classList.contains("is-maximized"));
    });
    var dragHandle = el("collab-consistency-modal-drag-handle");
    dragHandle.addEventListener("pointerdown", function (event) {
      var panel = consistencyWindow();
      if (event.button !== 0 || event.target.closest("button") || panel.classList.contains("is-maximized")) return;
      positionConsistencyWindow();
      var rect = panel.getBoundingClientRect();
      consistencyWindowDrag = { pointerId: event.pointerId, x: event.clientX, y: event.clientY,
        left: rect.left, top: rect.top };
      panel.classList.add("is-dragging");
      dragHandle.setPointerCapture(event.pointerId);
      event.preventDefault();
    });
    dragHandle.addEventListener("pointermove", function (event) {
      if (!consistencyWindowDrag || event.pointerId !== consistencyWindowDrag.pointerId) return;
      var panel = consistencyWindow();
      var gutter = 12;
      var left = consistencyWindowDrag.left + event.clientX - consistencyWindowDrag.x;
      var top = consistencyWindowDrag.top + event.clientY - consistencyWindowDrag.y;
      left = Math.min(Math.max(gutter, left), Math.max(gutter, global.innerWidth - panel.offsetWidth - gutter));
      top = Math.min(Math.max(gutter, top), Math.max(gutter, global.innerHeight - panel.offsetHeight - gutter));
      panel.style.left = left + "px";
      panel.style.top = top + "px";
    });
    function stopConsistencyWindowDrag(event) {
      if (!consistencyWindowDrag || event.pointerId !== consistencyWindowDrag.pointerId) return;
      consistencyWindowDrag = null;
      consistencyWindow().classList.remove("is-dragging");
      if (dragHandle.hasPointerCapture(event.pointerId)) dragHandle.releasePointerCapture(event.pointerId);
    }
    dragHandle.addEventListener("pointerup", stopConsistencyWindowDrag);
    dragHandle.addEventListener("pointercancel", stopConsistencyWindowDrag);
    global.addEventListener("resize", keepConsistencyWindowInView);
    minimizeConsistencyWindow(false);
    maximizeConsistencyWindow(false);
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && !el("collab-consistency-modal").hidden) closeConsistencyHelp();
    });
  });
})(window);
