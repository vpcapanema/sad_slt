/**
 * Diagnóstico de consistência AHP (RC, IC, λmax) — compartilhado Etapas 5 e 6.
 */
(function (global) {
  "use strict";

  function fmtSaaty(v) {
    if (!isFinite(v)) return "—";
    if (v >= 1) return String(Math.round(v * 100) / 100);
    return "1/" + String(Math.round((1 / v) * 100) / 100);
  }

  function matrixAllOnes(m) {
    for (var i = 0; i < m.length; i++) {
      for (var j = 0; j < m.length; j++) {
        if (Math.abs(m[i][j] - 1) > 1e-9) return false;
      }
    }
    return true;
  }

  function findTopInconsistencies(criteria, matrix, weights, limit) {
    var list = [];
    var n = criteria.length;
    for (var i = 0; i < n; i++) {
      for (var j = i + 1; j < n; j++) {
        var aij = matrix[i][j];
        var ideal = weights[i] / weights[j];
        if (!isFinite(aij) || !isFinite(ideal) || ideal <= 0) continue;
        var dev = Math.abs(Math.log(aij / ideal));
        list.push({ i: i, j: j, aij: aij, ideal: ideal, dev: dev });
      }
    }
    list.sort(function (a, b) {
      return b.dev - a.dev;
    });
    return list.slice(0, limit || 3);
  }

  function buildMetricCards(results, isConsistent) {
    var tone = isConsistent ? "is-success" : "is-failure";
    var html = '<div class="ahp-live-metrics ' + tone + '" role="group" aria-label="Métricas de consistência AHP">';
    html +=
      '<div class="ahp-metric-card"><div class="ahp-metric-card__label">Lambda Máximo (λ<sub>max</sub>)</div><div class="ahp-metric-card__value">' +
      (results.lambdaMax != null ? results.lambdaMax.toFixed(4) : "—") +
      '</div><div class="ahp-metric-card__sub">' +
      (isConsistent ? "dentro do esperado" : "acima do ideal") +
      "</div></div>";
    html +=
      '<div class="ahp-metric-card"><div class="ahp-metric-card__label">Índice de Consistência (IC)</div><div class="ahp-metric-card__value">' +
      (results.CI != null ? results.CI.toFixed(4) : "—") +
      '</div><div class="ahp-metric-card__sub">' +
      (isConsistent ? "coerente" : "inconsistente") +
      "</div></div>";
    html +=
      '<div class="ahp-metric-card"><div class="ahp-metric-card__label">Razão de Consistência (RC)</div><div class="ahp-metric-card__value">' +
      (results.CR != null ? results.CR.toFixed(4) : "—") +
      '</div><div class="ahp-metric-card__sub">' +
      (isConsistent ? "RC &lt; 0,10" : "RC ≥ 0,10") +
      "</div></div>";
    html += "</div>";
    return html;
  }

  function buildStatusBanner(results, isConsistent, opts) {
    var accent = isConsistent ? "#1e7e34" : "#c82333";
    var accentBg = isConsistent ? "#e7f6ec" : "#fdecea";
    var accentSoft = isConsistent ? "#256b35" : "#a71d2a";
    var html = "";
    html +=
      '<div class="ahp-diagnostico-status" style="padding:1.1rem 1.25rem;border-radius:10px;margin-bottom:1.25rem;border:2px solid ' +
      accent +
      ";background:" +
      accentBg +
      ';">';
    html += '<div style="display:flex;align-items:center;gap:0.85rem;">';
    html +=
      '<i class="fas ' +
      (isConsistent ? "fa-circle-check" : "fa-circle-xmark") +
      '" style="font-size:1.9rem;color:' +
      accent +
      ';"></i>';
    html +=
      '<p style="margin:0;font-size:1.05rem;font-weight:700;color:' +
      accent +
      ';text-align:left;">' +
      (isConsistent
        ? "Matriz consistente — os julgamentos são confiáveis."
        : "Matriz inconsistente — revise as comparações na Etapa 5.") +
      "</p>";
    html += "</div>";
    html +=
      '<p style="margin:0.5rem 0 0;font-size:0.9rem;color:' +
      accentSoft +
      ';text-align:left;">' +
      (opts.consistentHint ||
        (isConsistent
          ? "A razão de consistência (RC = " + results.CR.toFixed(4) + ") ficou abaixo de 0,10 (10%)."
          : "A razão de consistência (RC = " +
            results.CR.toFixed(4) +
            ") ficou em ou acima de 0,10 (10%). " +
            (opts.inconsistentHint ||
              "Revise os julgamentos antes de homologar a configuração."))) +
      "</p>";
    html += "</div>";
    return html;
  }

  function buildFailureDiagnosis(criteria, matrix, results, isConsistent) {
    if (isConsistent) return "";
    var n = criteria.length;
    if (n < 3 || !matrix.length || matrixAllOnes(matrix) || !results.weights) return "";

    var top = findTopInconsistencies(criteria, matrix, results.weights, 5).filter(function (it) {
      return it.dev > 1e-6;
    });
    if (!top.length) return "";

    var html = '<div class="ahp-diagnostico-falha">';
    html +=
      '<h4 style="margin:0 0 0.75rem;color:#a71d2a;text-align:left;"><i class="fas fa-magnifying-glass-chart"></i> Diagnóstico detalhado — principais inconsistências</h4>';
    html += '<p style="margin:0 0 1rem;text-align:left;">Os pares abaixo apresentam o maior desvio entre o valor informado na matriz e o valor coerente com os pesos calculados. Priorize a revisão destes julgamentos na Etapa 5.</p>';
    html += '<div style="overflow-x:auto;"><table class="ahp-matrix-table"><thead><tr>';
    html +=
      '<th style="background:#a71d2a;color:#fff;">Par de critérios</th><th style="background:#a71d2a;color:#fff;">Informado</th><th style="background:#a71d2a;color:#fff;">Coerente</th><th style="background:#a71d2a;color:#fff;">Desvio</th><th style="background:#a71d2a;color:#fff;">Observação</th>';
    html += "</tr></thead><tbody>";
    top.forEach(function (it) {
      html += "<tr>";
      html += '<td style="text-align:left;"><strong>«' + criteria[it.i] + "» vs «" + criteria[it.j] + "»</strong></td>";
      html += "<td>" + fmtSaaty(it.aij) + "</td>";
      html += "<td>" + fmtSaaty(it.ideal) + "</td>";
      html += "<td>" + (Math.round(Math.exp(it.dev) * 10) / 10) + "×</td>";
      html +=
        '<td style="text-align:left;">' +
        (it.aij > it.ideal ? "Importância superestimada" : "Importância subestimada") +
        "</td>";
      html += "</tr>";
    });
    html += "</tbody></table></div></div>";
    return html;
  }

  function buildDiagnosticoInner(criteria, matrix, results, opts) {
    opts = opts || {};
    matrix = matrix || [];
    results = results || {};
    var isConsistent = results.CR != null && results.CR < 0.1;
    var html = buildStatusBanner(results, isConsistent, opts);
    html += buildMetricCards(results, isConsistent);
    html += buildFailureDiagnosis(criteria, matrix, results, isConsistent);

    if (isConsistent && criteria.length >= 3 && matrix.length && !matrixAllOnes(matrix) && results.weights) {
      var topOk = findTopInconsistencies(criteria, matrix, results.weights, 3).filter(function (it) {
        return it.dev > 1e-6;
      });
      if (topOk.length) {
        html += '<p style="margin:1.25rem 0 0;text-align:left;font-size:0.875rem;"><strong>Comparações com maior desvio relativo</strong> (ainda dentro do limite aceitável):</p><ol style="margin:0.35rem 0 0;padding-left:1.25rem;line-height:1.9;text-align:left;">';
        topOk.forEach(function (it) {
          html +=
            "<li><strong>«" +
            criteria[it.i] +
            "» vs «" +
            criteria[it.j] +
            "»:</strong> " +
            fmtSaaty(it.aij) +
            " vs coerente " +
            fmtSaaty(it.ideal) +
            "</li>";
        });
        html += "</ol>";
      }
    }

    return html;
  }

  function renderDiagnostico(container, criteria, matrix, results, opts) {
    opts = opts || {};
    var title = opts.title || "Diagnóstico de Consistência";
    var stepLabel = opts.stepLabel || "5.1";
    var inner = buildDiagnosticoInner(criteria, matrix, results, opts);

    if (opts.bare) {
      if (container) container.innerHTML = inner;
      return inner;
    }

    var html = "";
    html += '<div class="info-card info-card--spaced ahp-diagnostico-consistencia">';
    html += '<div class="ahp-info-card-header"><i class="fas fa-check-circle"></i><h3>' + stepLabel + " " + title + "</h3></div>";
    html += '<div class="info-card-content">' + inner + "</div></div>";

    if (container) container.innerHTML = html;
    return html;
  }

  function renderParecerAlertas(container, alertas) {
    if (!container) return;
    alertas = alertas || [];
    var html = '<div class="info-card info-card--spaced ahp-parecer-alertas ahp-etapa6-block">';
    html += '<div class="ahp-info-card-header"><i class="fas fa-clipboard-check"></i><h3>Parecer — Coerência conceitual</h3></div>';
    html += '<div class="info-card-content">';
    if (!alertas.length) {
      html += "<p>Nenhuma divergência conceitual registrada nesta configuração.</p>";
    } else {
      html +=
        '<p class="ahp-coerencia-aviso"><i class="fas fa-triangle-exclamation"></i> O gestor prosseguiu apesar dos avisos abaixo; isso consta no registro oficial desta configuração (gravado ao salvar na Etapa 5).</p>';
      html += '<ul class="ahp-coerencia-modal__list">';
      alertas.forEach(function (a) {
        html +=
          "<li><strong>" +
          (a.codigo || "AVISO") +
          "</strong> (" +
          (a.etapa || "—") +
          "): " +
          (a.mensagem || "") +
          "</li>";
      });
      html += "</ul>";
    }
    html += "</div></div>";
    container.innerHTML = html;
  }

  global.SLTAhpDiagnostico = {
    fmtSaaty: fmtSaaty,
    matrixAllOnes: matrixAllOnes,
    findTopInconsistencies: findTopInconsistencies,
    buildMetricCards: buildMetricCards,
    renderDiagnostico: renderDiagnostico,
    renderParecerAlertas: renderParecerAlertas,
  };
})(window);
