/**
 * Página pública de preenchimento colaborativo da matriz pareada.
 */
(function (global) {
  "use strict";

  var PAIR_VALIDATION_MS = 1500;
  var LIMITE_RC = 0.10;
  var token = "";
  var acessoDoLink = "";
  var meta = null;
  var stats = { inicio_ms: null, duracao_anterior_ms: 0, pares: {} };
  var draftActive = false;
  var saveTimer = null;
  var metricsFrame = null;
  var acesso = null;
  var verificando = false;
  var pairTimers = new Map();
  var saveQueue = Promise.resolve();
  var editVersion = 0;
  var consistencyHelpReturnFocus = null;
  var consistencyWindowDrag = null;
  var consistencyReviews = new Map();
  var highlightedReviewPair = null;
  var comparisonGroups = [], activeGroup = 0;
  var linkedStage = null, rascunho = null;
  var inscricao = null;
  var timerPresenca = null;

  function manterVagaPublica() {
    var houveInteracao = false;
    ["pointerdown", "keydown", "input"].forEach(function (evento) {
      document.addEventListener(evento, function () { houveInteracao = true; });
    });
    timerPresenca = global.setInterval(function () {
      if (!houveInteracao || document.hidden) return;
      houveInteracao = false;
      global.SLTColaborativaApi.consultarFila(token).then(function (fila) {
        if (fila.situacao !== "admitida") global.location.reload();
      }).catch(function () {
        houveInteracao = true;
      });
    }, 25000);
  }

  function bloquearIdentificacao(bloqueado) {
    if (inscricao) {
      el("collab-retry-start").disabled = bloqueado;
      return;
    }
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
    if (inscricao) return;
    var detalhes = el("collab-scope-details");
    var texto = meta.contextualizacao || {};
    [["collab-scope-intro", texto.introducao], ["collab-scope-method-text", texto.metodo],
      ["collab-scope-assignment", texto.orientacao]].forEach(function ([id, conteudo]) {
      var campo = el(id);
      campo.textContent = conteudo || "";
      campo.parentElement.hidden = !campo.textContent.trim();
    });
    var exemplos = el("collab-scope-examples");
    exemplos.replaceChildren(...(texto.exemplos || []).filter(Boolean).map(function (exemplo) {
      var item = document.createElement("li");
      item.textContent = exemplo;
      return item;
    }));
    exemplos.parentElement.hidden = !exemplos.childElementCount;
    detalhes.hidden = !detalhes.querySelector(".collab-detail-card:not([hidden])");
  }

  function trackPair(pid) {
    stats.pares[pid] = (stats.pares[pid] || 0) + 1;
  }

  function duracaoTotal() {
    return stats.duracao_anterior_ms + (stats.inicio_ms ? Date.now() - stats.inicio_ms : 0);
  }

  function carregarGrupos(resposta) {
    var grupos = Object.entries(meta.grupos_comparacao || {}).sort(function (a, b) { return a[1][0] - b[1][0]; });
    var anteriores = resposta.estatisticas?.revisoes_por_par || {};
    comparisonGroups = grupos.filter(function (grupo) { return grupo[1].length > 1; }).map(function ([nome, indices]) {
      var pares = {};
      var matriz = indices.map(function (linha, i) {
        return indices.map(function (coluna, j) {
          var valor = resposta.matriz_comparacao?.[linha]?.[coluna] ?? (i === j ? 1 : null);
          if (i < j && valor !== null) pares[i + "_" + j] = anteriores[linha + "_" + coluna] || 1;
          return valor;
        });
      });
      return { nome: nome, indices: indices, matriz: matriz, pares: pares };
    });
    var quantidade = comparisonGroups.length;
    var pares = comparisonGroups.reduce(function (total, grupo) {
      var n = grupo.indices.length;
      return total + n * (n - 1) / 2;
    }, 0);
    var escopo = quantidade === 1 ? "1 dimensão" : quantidade + " dimensões";
    el("collab-dimension-count").textContent = "Você vai julgar os critérios de " + escopo +
      " em " + (pares === 1 ? "1 comparação." : pares + " comparações.");
    var semPares = grupos.filter(function (grupo) { return grupo[1].length === 1; }).map(function (grupo) { return grupo[0]; });
    var nota = el("collab-group-note");
    nota.classList.toggle("is-hidden", !semPares.length);
    if (semPares.length) {
      var nomes = new Intl.ListFormat("pt-BR").format(semPares);
      nota.textContent = semPares.length === 1
        ? "A dimensão " + nomes + " tem um único critério. Ele recebe 100% do peso dentro da dimensão e dispensa comparação."
        : "As dimensões " + nomes + " têm um único critério cada. Cada critério recebe 100% do peso dentro da sua dimensão e dispensa comparação.";
    }
    activeGroup = comparisonGroups.findIndex(function (grupo) { return !grupoPronto(grupo); });
    if (activeGroup < 0) activeGroup = comparisonGroups.length - 1;
  }

  function grupoCompleto(grupo) {
    return grupo.matriz.every(function (linha, i) {
      return linha.every(function (valor, j) { return i >= j || valor !== null; });
    });
  }

  function grupoPronto(grupo) {
    return grupoCompleto(grupo) && SLTAhp.analyzeMatrix(grupo.matriz).CR < LIMITE_RC;
  }

  function paresRespondidos(matriz) {
    return matriz.every(function (linha, i) {
      return linha.every(function (valor, j) {
        return j <= i || valor !== 1 || stats.pares[i + "_" + j] > 0;
      });
    });
  }

  function comparacoesProntas(matriz) {
    return matriz && paresRespondidos(matriz) && SLTAhp.analyzeMatrix(matriz).CR < LIMITE_RC;
  }

  function matrizComParesInformados(matriz) {
    return matriz.map(function (linha, i) {
      return linha.map(function (valor, j) {
        return i === j || stats.pares[Math.min(i, j) + "_" + Math.max(i, j)] > 0 ? valor : null;
      });
    });
  }

  function matrizParaGravar(matriz) {
    if (!comparisonGroups.length) return linkedStage ? matrizComParesInformados(matriz) : matriz;
    var atual = comparisonGroups[activeGroup];
    atual.matriz = matrizComParesInformados(matriz);
    var total = meta.criterios.length;
    var completa = Array.from({length: total}, function (_, i) {
      return Array.from({length: total}, function (_, j) { return i === j ? 1 : null; });
    });
    comparisonGroups.forEach(function (grupo) {
      grupo.indices.forEach(function (linha, i) {
        grupo.indices.forEach(function (coluna, j) { completa[linha][coluna] = grupo.matriz[i][j]; });
      });
    });
    return completa;
  }

  function estatisticasResposta() {
    var pares = {...stats.pares};
    if (comparisonGroups.length) {
      pares = {};
      comparisonGroups.forEach(function (grupo) {
        Object.entries(grupo.pares).forEach(function ([par, revisoes]) {
          var indices = par.split("_").map(function (i) { return grupo.indices[Number(i)]; });
          pares[indices.join("_")] = revisoes;
        });
      });
    }
    return { revisoes_por_par: pares, duracao_ms: duracaoTotal() };
  }

  function renderComparisonGroup() {
    var grupo = comparisonGroups[activeGroup];
    draftActive = false;
    pairTimers.forEach(clearTimeout);
    pairTimers.clear();
    if (!el("collab-consistency-modal").hidden) closeConsistencyHelp();
    stats.pares = grupo.pares;
    global.setAhpCriteria(grupo.indices.map(function (index) { return meta.criterios[index]; }));
    global.ahpCollaborativeDraftMatrix = grupo.matriz;
    el("collab-group-context").hidden = false;
    el("collab-group-navigation").classList.remove("is-hidden");
    el("collab-group-title").textContent = "Dimensão " + (activeGroup + 1) + " de " + comparisonGroups.length + " · " + grupo.nome;
    el("collab-previous-group").disabled = activeGroup === 0;
    var ultimo = activeGroup === comparisonGroups.length - 1;
    el("collab-next-group").classList.toggle("is-hidden", ultimo);
    el("btn-enviar-resposta").classList.toggle("is-hidden", !ultimo);
    generatePairwiseFormStep4();
    patchSaatyTracking();
    draftActive = true;
    updateProgressHint();
    updateCollabMetrics();
  }

  function navegarGrupo(delta) {
    var proximo = activeGroup + delta;
    if (!draftActive || !comparisonGroups[proximo]) return;
    var matriz = buildLiveMatrix();
    if (delta > 0 && !comparacoesProntas(matriz)) return;
    clearTimeout(saveTimer);
    queueProgress(matrizParaGravar(matriz), ++editVersion);
    activeGroup = proximo;
    renderComparisonGroup();
    el("collab-group-title").focus();
  }

  function patchSaatyTracking() {
    document.querySelectorAll("#comparisonContent .saaty-pair").forEach(function (pair) {
      var pid = pair.querySelector(".saaty-scale").dataset.pid;
      if (stats.pares[pid] > 0) pair.classList.add("is-auto-validated");
      pair.addEventListener("saaty:change", function () {
        if (!draftActive) return;
        trackPair(pid);
        clearTimeout(pairTimers.get(pair));
        var wasValidated = pair.classList.contains("is-auto-validated");
        pair.classList.remove("is-auto-validated");
        pair.classList.add("is-auto-editing");
        if (wasValidated) {
          updateProgressHint();
          refreshConsistencyHelp();
        }
        updateConsistencyReview(pair, true);
        pairTimers.set(pair, setTimeout(function () {
          pairTimers.delete(pair);
          pair.classList.remove("is-auto-editing");
          pair.classList.add("is-auto-validated");
          updateConsistencyReview(pair);
          updateProgressHint();
          refreshConsistencyHelp();
        }, PAIR_VALIDATION_MS));
      });
    });
    refreshConsistencyHelp();
  }

  function queueProgress(matrix, version) {
    var payload = payloadProgresso(matrix);
    saveQueue = saveQueue.then(function () {
      return gravarProgresso(payload);
    }).then(function () {
      if (draftActive && version === editVersion) el("collab-save-feedback").textContent = global.SLTColaborativaSimulacao ? "Progresso mantido apenas nesta simulação." : "Progresso salvo automaticamente.";
    }).catch(function (err) {
      el("collab-save-feedback").textContent = "Não foi possível salvar o progresso: " + (err.message || err);
    });
  }

  function payloadProgresso(matrix) {
    return {
      email: acesso.identificacao.email, token_acesso: acesso.token_acesso, matriz_comparacao: matrix,
      estatisticas: estatisticasResposta(),
      ...(linkedStage ? { etapa: linkedStage } : {}),
    };
  }

  function gravarProgresso(payload) {
    if (rascunho?.atualizadoEm) payload.versao = rascunho.atualizadoEm;
    return global.SLTColaborativaApi.salvarProgresso(token, payload).then(function (resposta) {
      rascunho = resposta;
      return resposta;
    });
  }

  function scheduleCollabMetrics() {
    if (!draftActive) return;
    clearTimeout(saveTimer);
    if (metricsFrame === null) metricsFrame = global.requestAnimationFrame(updateCollabMetrics);
  }

  function updateCollabMetrics() {
    if (metricsFrame !== null) {
      global.cancelAnimationFrame(metricsFrame);
      metricsFrame = null;
    }
    if (!draftActive || typeof buildLiveMatrix !== "function" || typeof SLTAhp === "undefined") return;
    var matrix = buildLiveMatrix();
    if (!matrix) return;
    var res = SLTAhp.analyzeMatrix(matrix);
    var matrizGravada = matrizParaGravar(matrix);
    var complete = paresRespondidos(matrix);
    var consistent = res.CR < LIMITE_RC;
    [["metricLambdaValue", res.lambdaMax], ["metricICValue", res.CI], ["metricRCValue", res.CR]].forEach(function ([id, value]) {
      var metric = el(id), formatted = SLTAhp.formatMetric(value);
      if (metric.textContent !== formatted) metric.textContent = formatted;
    });
    var rcCard = el("metricRCValue").closest(".ahp-metric-card");
    rcCard.classList.toggle("is-success", consistent);
    rcCard.classList.toggle("is-failure", !consistent);
    var rcStatus = el("collab-rc-status");
    var porGrupo = comparisonGroups.length > 0;
    var status = complete ? (porGrupo ? "RC da dimensão" : "RC da matriz completa") : "RC provisória";
    if (rcStatus.textContent !== status) rcStatus.textContent = status;
    var exigePares = porGrupo || linkedStage === "dimensoes";
    var pronto = consistent && (!exigePares || complete);
    var ultimaDimensao = !porGrupo || activeGroup === comparisonGroups.length - 1;
    if (porGrupo) el("collab-next-group").disabled = !pronto;
    if (linkedStage === "dimensoes") el("collab-linked-next").disabled = !pronto;
    el("btn-enviar-resposta").disabled = !pronto || !ultimaDimensao || !comparisonGroups.every(function (grupo, i) {
      return i === activeGroup || grupoPronto(grupo);
    });
    var prontoTexto = linkedStage === "dimensoes" ? "Comparações consistentes. Você pode avançar para os critérios."
      : !ultimaDimensao ? "Comparações consistentes. Avance para a próxima dimensão."
      : "Matriz consistente (RC < 0,10). Você pode enviar.";
    if (exigePares && !complete) {
      submitFeedback(linkedStage === "dimensoes" ? "Responda a todos os pares de dimensões."
        : "Conclua todas as comparações desta dimensão para continuar.", "info");
    } else {
      submitFeedback(consistent ? prontoTexto : "RC = " + SLTAhp.formatMetric(res.CR)
        + " — ajuste as comparações (necessário RC < 0,10).", consistent ? "success" : "error");
    }
    clearTimeout(saveTimer);
    var version = ++editVersion;
    el("collab-save-feedback").textContent = "Alterações aguardando salvamento…";
    saveTimer = setTimeout(function () { queueProgress(matrizGravada, version); }, inscricao ? 6000 : 1600);
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

  function refreshConsistencyHelp() {
    var matrix = buildLiveMatrix();
    var state = matrix && validatedConsistencyState(matrix);
    el("collab-consistency-help-button").hidden = !state || state.cr < LIMITE_RC;
  }

  function validatedConsistencyState(matrix) {
    var answered = new Set(Array.from(document.querySelectorAll(
      "#comparisonContent .saaty-pair.is-auto-validated .saaty-scale"
    ), function (scale) { return scale.dataset.pid; }));
    var total = matrix.length * (matrix.length - 1) / 2;
    var pairs = [];
    for (var i = 0; i < matrix.length; i++) {
      for (var j = i + 1; j < matrix.length; j++) if (answered.has(i + "_" + j)) pairs.push([i, j]);
    }
    var count = pairs.length;
    if (!total || count / total < 0.6) return null;
    var sampleScore = null;
    if (count < total) {
      sampleScore = function (values) {
        return SLTAhp.validatedConsistency(values, pairs);
      };
    }
    var metrics = sampleScore ? SLTAhp.validatedMetrics(matrix, pairs) : SLTAhp.analyzeMatrix(matrix);
    if (!metrics) return null;
    return { matrix: matrix, cr: metrics.CR, answered: answered, count: count, total: total, sampleScore: sampleScore };
  }

  function closeConsistencyHelp() {
    var modal = el("collab-consistency-modal");
    if (modal.hidden) return;
    modal.hidden = true;
    highlightReviewPair(null);
    consistencyReviews.clear();
    if (consistencyHelpReturnFocus) consistencyHelpReturnFocus.focus();
  }

  function highlightReviewPair(pair) {
    if (highlightedReviewPair) highlightedReviewPair.classList.remove("is-consistency-review");
    highlightedReviewPair = pair;
    if (pair) pair.classList.add("is-consistency-review");
  }

  function updateConsistencyReview(pair, edited) {
    var review = consistencyReviews.get(pair);
    if (!review) return;
    var value = Number(review.input.value);
    var matches = Math.abs(value - review.suggestedValue) < 1e-8;
    var validated = pair.classList.contains("is-auto-validated");
    var confirmed = matches && validated;
    if (edited) review.edited = true;
    review.current.value = formatSaatyValue(value);
    review.applyButton.disabled = matches;
    review.item.classList.toggle("is-review-confirmed", confirmed);
    review.status.classList.toggle("is-acceptable", confirmed);
    var message = "";
    if (confirmed) message = "Valor sugerido confirmado.";
    else if (matches) message = "Valor sugerido selecionado. Aguardando confirmação.";
    else if (review.edited && validated) message = "O valor confirmado difere da sugestão.";
    if (review.status.textContent !== message) review.status.textContent = message;
    if (confirmed && highlightedReviewPair === pair) {
      highlightReviewPair(null);
      if (review.minimizedForReview) {
        review.minimizedForReview = false;
        minimizeConsistencyWindow(false);
      }
    }
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
    var diagnosis = validatedConsistencyState(matrix);
    if (!diagnosis || diagnosis.cr < LIMITE_RC) {
      el("collab-consistency-help-button").hidden = true;
      return;
    }
    var plan = SLTAhp.consistencyPlan(matrix, diagnosis.answered, diagnosis.sampleScore);
    diagnosis.reviews = plan ? plan.changes : [];
    var names = normalizeCriteriaNames(meta.criterios);
    var list = el("collab-consistency-pairs");
    highlightReviewPair(null);
    consistencyReviews.clear();
    list.replaceChildren();
    el("collab-consistency-modal-summary").textContent =
      "Foram confirmados " + diagnosis.count + " de " + diagnosis.total + " pares (" +
      Math.round(100 * diagnosis.count / diagnosis.total) + "%). " +
      (diagnosis.sampleScore ? "A RC estimada do conjunto validado é " : "A RC global é ") +
      SLTAhp.formatMetric(diagnosis.cr) + ". " + (plan ?
        "RC projetada com todos os ajustes abaixo: " + SLTAhp.formatMetric(plan.projectedCR) +
        ". Os valores formam uma única proposta." : "Nenhum plano satisfatório pôde ser calculado.");
    if (!diagnosis.reviews.length) {
      var empty = document.createElement("li");
      empty.textContent = "Revise os julgamentos confirmados e recalcule.";
      list.appendChild(empty);
    }
    diagnosis.reviews.forEach(function (review) {
      var item = document.createElement("li"), link = document.createElement("a");
      var values = document.createElement("div");
      var input = el("pair_" + review.i + "_" + review.j);
      var pair = input && input.closest(".saaty-pair");
      var current = consistencyReviewField("Valor atual:", formatSaatyValue(review.currentValue));
      var suggested = consistencyReviewField("Valor sugerido:", formatSaatyValue(review.suggestedValue));
      var applyButton = document.createElement("button");
      var status = document.createElement("p");
      item.className = "collab-consistency-review-item";
      values.className = "collab-consistency-review-values";
      suggested.classList.add("collab-consistency-review-suggested");
      applyButton.type = "button";
      applyButton.className = "btn btn-secondary collab-consistency-review-apply";
      applyButton.textContent = "Aplicar o valor sugerido";
      applyButton.disabled = !pair;
      status.className = "collab-consistency-review-status";
      status.setAttribute("role", "status");
      if (pair) {
        pair.id = "collab-review-" + review.i + "-" + review.j;
        consistencyReviews.set(pair, { input: input, item: item, current: current.querySelector("input"),
          suggestedValue: review.suggestedValue, status: status, applyButton: applyButton, edited: false });
        applyButton.addEventListener("click", function () {
          if (draftActive) setSaatyPairValue(pair, review.suggestedValue);
        });
        updateConsistencyReview(pair);
      }
      link.href = pair ? "#" + pair.id : "#";
      link.textContent = names[review.i] + " × " + names[review.j];
      link.addEventListener("click", function (event) {
        event.preventDefault();
        if (!pair) return;
        var confirmed = item.classList.contains("is-review-confirmed");
        highlightReviewPair(confirmed ? null : pair);
        pair.scrollIntoView({ behavior: "auto", block: "center" });
        var scale = pair.querySelector(".saaty-scale");
        var rail = scale.getBoundingClientRect();
        var panel = consistencyWindow();
        var bounds = panel.getBoundingClientRect();
        if (!confirmed && bounds.left < rail.right && bounds.right > rail.left &&
            bounds.top < rail.bottom && bounds.bottom > rail.top) {
          consistencyReviews.get(pair).minimizedForReview = true;
          minimizeConsistencyWindow(true);
          if (panel.getBoundingClientRect().bottom > rail.top) panel.style.top = "12px";
        }
        scale.focus({ preventScroll: true });
      });
      values.append(current, suggested);
      item.append(link, values, applyButton, status);
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
      "Revise se a proposta representa sua avaliação. Para reproduzir a RC projetada, aplique todos os valores sugeridos e aguarde a validação visual dos pares.";
    consistencyHelpReturnFocus = document.activeElement;
    el("collab-consistency-modal").hidden = false;
    positionConsistencyWindow();
    el("collab-consistency-modal-close").focus();
  }

  function updateProgressHint() {
    var hint = el("collab-reciprocal-hint");
    if (!hint) return;
    var total = document.querySelectorAll(".saaty-pair").length;
    var touched = document.querySelectorAll("#comparisonContent .saaty-pair.is-auto-validated").length;
    hint.textContent = "Pares confirmados: " + touched + "/" + total;
  }

  global.updateLiveMetrics = scheduleCollabMetrics;
  document.addEventListener("visibilitychange", function () {
    if (document.hidden && metricsFrame !== null) updateCollabMetrics();
  });

  function renderEtapaVinculada(etapa, focar = true) {
    clearTimeout(saveTimer);
    pairTimers.forEach(clearTimeout);
    pairTimers.clear();
    if (!el("collab-consistency-modal").hidden) closeConsistencyHelp();
    draftActive = false;
    linkedStage = etapa;
    var primeira = linkedStage === "dimensoes";
    el("collab-linked-stage").classList.remove("is-hidden");
    el("collab-linked-navigation").classList.remove("is-hidden");
    el("collab-linked-title").textContent = primeira ? "Etapa 1 de 2 · Dimensões" : "Etapa 2 de 2 · Critérios por dimensão";
    el("collab-linked-description").textContent = primeira
      ? "Compare a importância das dimensões para o objetivo desta análise. Responda a todos os pares e valide a etapa para avançar."
      : "A etapa das dimensões está validada. Compare os critérios de cada dimensão para concluir sua resposta.";
    el("collab-linked-back").classList.toggle("is-hidden", primeira);
    el("collab-linked-next").classList.toggle("is-hidden", !primeira);
    el("collab-group-context").hidden = primeira;
    el("collab-group-navigation").classList.toggle("is-hidden", primeira);
    el("btn-enviar-resposta").classList.toggle("is-hidden", primeira);
    var semPares = !primeira && !Object.values(meta.grupos_comparacao).some(indices => indices.length > 1);
    document.querySelectorAll(".secao-collab-pairwise, .secao-collab-guia").forEach(function (secao) {
      secao.classList.toggle("is-hidden", semPares);
    });
    if (semPares) {
      comparisonGroups = [];
      stats.pares = {};
      el("collab-linked-description").textContent = "Cada dimensão contém um único critério, que recebe 100% do peso local. Sua resposta está pronta para envio.";
      el("collab-group-navigation").classList.add("is-hidden");
      el("btn-enviar-resposta").disabled = false;
      draftActive = true;
      if (focar) el("collab-linked-title").focus();
      return;
    }
    if (primeira) {
      comparisonGroups = [];
      var anterior = rascunho.estatisticas?.julgamento_dimensoes;
      stats.pares = {...(anterior?.revisoes_por_par || {})};
      global.setAhpCriteria(meta.dimensoes_comparacao);
      global.ahpCollaborativeDraftMatrix = anterior?.matriz || null;
      generatePairwiseFormStep4();
      patchSaatyTracking();
      draftActive = true;
      updateProgressHint();
      updateCollabMetrics();
    } else {
      carregarGrupos(rascunho);
      renderComparisonGroup();
    }
    if (focar) el("collab-linked-title").focus();
  }

  async function trocarEtapaVinculada(destino) {
    if (!draftActive || !linkedStage) return;
    if (destino === "criterios" && (linkedStage !== "dimensoes" || !comparacoesProntas(buildLiveMatrix()))) return;
    if (destino === "dimensoes" && linkedStage !== "criterios") return;
    clearTimeout(saveTimer);
    var payload = payloadProgresso(matrizDaEtapaVinculada());
    payload.concluir_etapa = destino === "criterios";
    draftActive = false;
    el("comparisonContent").inert = true;
    el("collab-linked-next").disabled = true;
    el("collab-linked-back").disabled = true;
    el("collab-restart").disabled = true;
    submitFeedback(destino === "criterios" ? "Validando as comparações entre dimensões…" : "Salvando as comparações entre critérios…", "info");
    try {
      await saveQueue;
      await gravarProgresso(payload);
      renderEtapaVinculada(destino);
    } catch (error) {
      draftActive = true;
      updateCollabMetrics();
      submitFeedback(error.message, "error");
    } finally {
      el("comparisonContent").inert = false;
      el("collab-linked-back").disabled = false;
      el("collab-restart").disabled = !draftActive;
    }
  }

  function matrizDaEtapaVinculada() {
    return linkedStage === "criterios" && !comparisonGroups.length
      ? rascunho.matriz_comparacao : matrizParaGravar(buildLiveMatrix());
  }

  function mostrarRascunho(resposta, focar = true) {
    draftActive = false;
    rascunho = resposta;
    pairTimers.forEach(clearTimeout);
    pairTimers.clear();
    if (!el("collab-consistency-modal").hidden) closeConsistencyHelp();
    global.setAhpCriteria(meta.criterios || []);
    global.ahpCollaborativeDraftMatrix = resposta.matriz_comparacao || null;
    var anteriores = resposta.estatisticas || {};
    stats.pares = {};
    Object.entries(anteriores.revisoes_por_par || {}).forEach(function ([par, revisoes]) {
      if (/^\d+_\d+$/.test(par) && Number.isInteger(revisoes) && revisoes >= 0) stats.pares[par] = revisoes;
    });
    stats.duracao_anterior_ms = Number.isFinite(anteriores.duracao_ms) && anteriores.duracao_ms >= 0 ? anteriores.duracao_ms : 0;
    stats.inicio_ms = Date.now();
    el("collab-form-section").classList.remove("is-hidden");
    el("collab-restart").disabled = false;
    if (meta.modo_comparacao === "duas_etapas") {
      var rc = anteriores.julgamento_dimensoes?.resultado?.CR;
      renderEtapaVinculada(Number.isFinite(rc) && rc < LIMITE_RC ? "criterios" : "dimensoes", focar);
    } else if (meta.modo_comparacao === "por_grupo") {
      carregarGrupos(resposta);
      renderComparisonGroup();
    } else {
      generatePairwiseFormStep4();
      patchSaatyTracking();
      draftActive = true;
      updateProgressHint();
      updateCollabMetrics();
    }
  }

  async function reiniciarFormulario() {
    if (!draftActive || !acesso) return;
    var botao = el("collab-restart");
    botao.disabled = true;
    var confirmou = await global.ProcessFeedback.confirmar({
      title: "Recomeçar julgamento?",
      message: "Todas as comparações deste rascunho serão apagadas. Você voltará à primeira etapa disponível.",
      confirmLabel: "Recomeçar do zero",
      danger: true,
    });
    if (!confirmou || !draftActive) {
      botao.disabled = !draftActive;
      if (draftActive) botao.focus();
      return;
    }
    clearTimeout(saveTimer);
    draftActive = false;
    el("comparisonContent").inert = true;
    submitFeedback("Reiniciando o julgamento…", "info");
    try {
      await saveQueue;
      var resposta = await global.SLTColaborativaApi.reiniciarResposta(token, {
        email: acesso.identificacao.email, token_acesso: acesso.token_acesso, versao: rascunho?.atualizadoEm,
      });
      mostrarRascunho(resposta);
      el("collab-tab-form").click();
      el("collab-save-feedback").textContent = "Rascunho reiniciado.";
    } catch (error) {
      draftActive = true;
      updateCollabMetrics();
      submitFeedback(error.message || String(error), "error");
    } finally {
      el("comparisonContent").inert = false;
      botao.disabled = !draftActive;
    }
  }

  function liberarFormulario() {
    if (verificando || draftActive) return;
    var nome = (inscricao ? el("colab-nome").textContent : el("colab-nome").value).trim();
    var inst = (inscricao ? el("colab-inst").textContent : el("colab-inst").value).trim();
    var email = (inscricao ? inscricao.dataset.email : el("colab-email").value).trim().toLowerCase();
    var codigo = inscricao ? undefined : (global.SLTColaborativaModelo ? "000000" : acessoDoLink || el("colab-token").value.trim());
    if (!nome || !inst || !email) {
      feedback("Informe nome, instituição e e-mail para iniciar o preenchimento.", "error");
      return;
    }
    if (!inscricao && !global.SLTColaborativaModelo && !/^[A-Za-z0-9_-]{43}$/.test(codigo)) {
      feedback("Informe a chave individual recebida por e-mail. Códigos antigos não são mais aceitos.", "error");
      return;
    }
    verificando = true;
    bloquearIdentificacao(true);
    if (inscricao) {
      el("collab-retry-start").hidden = true;
      el("collab-context").hidden = false;
    }
    feedback(inscricao ? "Carregando as comparações…" : "Verificando convite…", "info");
    var candidato = { token_acesso: codigo, identificacao: { nome_completo: nome, email: email, instituicao: inst } };
    global.SLTColaborativaApi.validarAcesso(token, email, codigo)
      .then(function (m) {
        if (m.status !== "ativa") {
          feedback("Este formulário não está mais disponível.", "error");
          return;
        }
        if (!m.email_autorizado) {
          feedback(inscricao ? "Confira sua inscrição e tente novamente." : "E-mail ou código de acesso inválido. Confira o convite recebido.", "error");
          return;
        }
        meta = m;
        global.setAhpCriteria(meta.criterios || []);
        if (normalizeCriteriaNames(meta.criterios).length < 2) {
          feedback("Este julgamento não possui critérios suficientes. Solicite a revisão ao responsável.", "error");
          return;
        }
        renderContext();
        return global.SLTColaborativaApi.iniciarResposta(token, candidato);
      }).then(function (resposta) {
        if (!resposta) return;
        if (resposta.status === "enviada") {
          feedback(inscricao ? "Sua resposta já foi enviada. Obrigado!" : "Este e-mail já enviou a resposta deste julgamento.", inscricao ? "success" : "error");
          return;
        }
        acesso = candidato;
        feedback(inscricao ? "" : (global.SLTColaborativaSimulacao
          ? "Simulação liberada. O progresso não será gravado."
          : "Formulário liberado. O progresso será salvo automaticamente."), "success");
        mostrarRascunho(resposta, !inscricao);
      })
      .catch(function (err) {
        feedback(err.message || String(err), "error");
        if (inscricao) el("collab-retry-start").hidden = false;
      }).finally(function () {
        if (inscricao && !meta) el("collab-context").hidden = true;
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
    if (linkedStage === "dimensoes") return;
    if (!linkedStage && !comparisonGroups.length && SLTAhp.analyzeMatrix(matrix).CR >= LIMITE_RC) {
      submitFeedback("RC ≥ 0,10 — envio bloqueado.", "error");
      return;
    }
    var matrizGravada = linkedStage ? matrizDaEtapaVinculada() : matrizParaGravar(matrix);
    if (!comparisonGroups.every(grupoPronto)) {
      submitFeedback("Conclua todas as comparações e confira a consistência de cada dimensão antes de enviar.", "error");
      return;
    }
    var estatisticas = estatisticasResposta();
    var processo = global.ProcessFeedback.iniciarCadastro({
      title: global.SLTColaborativaSimulacao ? "Simular envio da resposta" : "Enviar resposta do especialista",
      tasks: ["Concluir salvamentos pendentes", "Enviar resposta"],
    });
    processo.tarefaAtual("Concluir salvamentos pendentes", "Aguardando os salvamentos já iniciados antes do envio definitivo.");
    submitFeedback("Enviando…", "info");
    clearTimeout(saveTimer);
    draftActive = false;
    el("btn-enviar-resposta").disabled = true;
    el("collab-restart").disabled = true;
    el("comparisonContent").inert = true;
    saveQueue.then(function () {
      processo.concluirTarefa("Concluir salvamentos pendentes");
      processo.tarefaAtual("Enviar resposta", "Aguardando a confirmação do servidor. Não feche a página nem repita o envio.");
      return global.SLTColaborativaApi.enviarResposta(token, {
      identificacao: acesso.identificacao,
      token_acesso: acesso.token_acesso,
      matriz_comparacao: matrizGravada,
      estatisticas: estatisticas,
      ...(rascunho?.atualizadoEm ? { versao: rascunho.atualizadoEm } : {}),
    }); })
      .then(function () {
        draftActive = false;
        global.clearInterval(timerPresenca);
        var mensagem = global.SLTColaborativaSimulacao ? "Envio simulado com sucesso. Nenhuma resposta foi gravada." : "Resposta enviada com sucesso. Obrigado!";
        submitFeedback(mensagem, "success");
        processo.concluirTarefa("Enviar resposta");
        processo.sucesso({title: global.SLTColaborativaSimulacao ? "Envio simulado" : "Resposta enviada", message: mensagem});
      })
      .catch(function (err) {
        draftActive = true;
        el("comparisonContent").inert = false;
        el("btn-enviar-resposta").disabled = false;
        el("collab-restart").disabled = false;
        submitFeedback(err.message || String(err), "error");
        processo.erro({title: "Resposta não enviada", message: err.message || String(err),
          detail: "O preenchimento foi mantido. Confira o problema e tente enviar novamente."});
      });
  }

  document.addEventListener("DOMContentLoaded", function () {
    inscricao = el("collab-public-enrollment");
    var tokenPath = global.location.pathname.match(/\/public\/analise-multicriterio\/formulario-comparacao-pareada\/([^/]+)\/?$/);
    token = inscricao ? inscricao.dataset.token : (global.SLTColaborativaModelo ? "modelo-pli" : (qp("token") || (tokenPath ? decodeURIComponent(tokenPath[1]) : "")));
    if (!token) {
      el("collab-context").innerHTML =
        '<p class="ahp-recommendation">Link inválido — token ausente.</p>';
      return;
    }
    if (!inscricao) {
      var acessoRecebido = new URLSearchParams(global.location.hash.slice(1)).get("acesso");
      if (!global.SLTColaborativaModelo && /^[A-Za-z0-9_-]{43}$/.test(acessoRecebido || "")) {
        acessoDoLink = acessoRecebido;
        global.history.replaceState(global.history.state, "", global.location.pathname + global.location.search);
        el("colab-token").closest(".c-form-group").classList.add("is-hidden");
        el("colab-access-intro").textContent = "Informe seu nome, instituição e o endereço de e-mail que recebeu o convite. Em seguida, clique em Liberar formulário.";
        el("colab-access-legacy").hidden = true;
        el("colab-access-guide").textContent = "Preencha a identificação com o e-mail que recebeu o convite.";
      }
      var preEmail = qp("email");
      if (preEmail) el("colab-email").value = preEmail;
      global.SLTColaborativaApi.obterPublico(token)
        .then(function (m) {
          meta = m;
          renderContext();
        })
        .catch(function (err) {
          el("collab-context").textContent = err.message || String(err);
        });
      el("btn-liberar-form").addEventListener("click", liberarFormulario);
    }
    el("btn-enviar-resposta").addEventListener("click", enviarResposta);
    el("collab-restart").addEventListener("click", reiniciarFormulario);
    el("collab-previous-group").addEventListener("click", function () { navegarGrupo(-1); });
    el("collab-next-group").addEventListener("click", function () { navegarGrupo(1); });
    el("collab-linked-next").addEventListener("click", function () { trocarEtapaVinculada("criterios"); });
    el("collab-linked-back").addEventListener("click", function () { trocarEtapaVinculada("dimensoes"); });
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
    if (inscricao) {
      el("collab-retry-start").addEventListener("click", liberarFormulario);
      manterVagaPublica();
      liberarFormulario();
    }
  });
})(window);
