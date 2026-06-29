/**
 * Etapa 6 — carregar e verificar o pacote completo da Fase 2.
 *
 * Além do escopo/objetos da Fase 1, exige cadastro conceitual, matriz pareada
 * salva na Etapa 5, métricas validáveis e registro de alertas de coerência.
 */
(function (global) {
  "use strict";

  function escapeHtml(text) {
    return String(text == null ? "" : text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function criterioCount(cfg) {
    if (Array.isArray(cfg.criterios) && cfg.criterios.length) return cfg.criterios.length;
    if (cfg.n_criterios) return Number(cfg.n_criterios) || 0;
    return 0;
  }

  function objetoCount(cfg) {
    var objs = cfg.universo_objetos || cfg.objetos || [];
    return Array.isArray(objs) ? objs.length : 0;
  }

  function matrizDim(cfg) {
    var m = cfg.matriz_comparacao;
    if (!Array.isArray(m) || !m.length) return 0;
    return m.length;
  }

  function analisarMetricas(cfg) {
    if (!global.SLTAhp || !global.SLTAhp.analyzeMatrix) return null;
    var m = cfg.matriz_comparacao;
    if (!Array.isArray(m) || !m.length) return null;
    try {
      return global.SLTAhp.analyzeMatrix(m);
    } catch (_e) {
      return null;
    }
  }

  /**
   * Verifica se a configuração contém o pacote esperado ao final da Fase 2.
   * @returns {{ok:boolean, canProcess:boolean, checks:Array, motor:object|null, config:object}}
   */
  function verificarPacoteFase2(cfg) {
    cfg = cfg || {};
    var checks = [];
    var pf = global.SLTPacoteFase;
    var pacoteOk = pf ? pf.ehPacote(cfg, pf.FASE_2) : true;

    checks.push({
      id: "pacote_fase",
      label: "Identificador de pacote da Fase 2",
      ok: pacoteOk,
      required: true,
      detail: pacoteOk
        ? pf
          ? pf.rotulo(pf.FASE_2)
          : "fase_2"
        : "Esta configuração ainda pertence ao pacote da Fase 1 — salve a matriz na Etapa 5",
    });

    var nObj = objetoCount(cfg);
    var nCrit = criterioCount(cfg);
    var nMat = matrizDim(cfg);
    var motor = analisarMetricas(cfg);
    var alertas = Array.isArray(cfg.alertas_conceituais) ? cfg.alertas_conceituais : null;
    var isPortfolio = cfg.tipo === "portfolio";

    checks.push({
      id: "objetos",
      label: "Universo de objetos (saída Fase 1)",
      ok: isPortfolio ? nObj > 0 : true,
      required: isPortfolio,
      detail: isPortfolio
        ? nObj > 0
          ? nObj + " objeto(s) na configuração"
          : "Conjunto de objetos não definido"
        : nObj > 0
          ? nObj + " objeto(s) na configuração (análise avulsa — opcional)"
          : "Análise avulsa — universo de objetos não se aplica",
    });

    checks.push({
      id: "cadastro",
      label: "Cadastro conceitual — critérios e premissas (Fase 2)",
      ok: nCrit > 0,
      required: true,
      detail: nCrit > 0 ? nCrit + " critério(s) cadastrados" : "Matriz de premissas/critérios ausente",
    });

    checks.push({
      id: "matriz_pareada",
      label: "Matriz de comparação pareada salva (Etapa 5)",
      ok: nMat > 0,
      required: true,
      detail: nMat > 0 ? "Matriz " + nMat + "×" + nMat + " disponível" : "Salve a matriz na Etapa 5 antes de calcular pesos",
    });

    var rc = motor ? motor.CR : cfg.razao_consistencia;
    var rcNum = rc != null && isFinite(Number(rc)) ? Number(rc) : null;
    var consistente = rcNum != null ? rcNum < 0.1 : cfg.consistente === true;
    checks.push({
      id: "metricas",
      label: "Métricas de consistência da matriz pareada",
      ok: consistente,
      required: false,
      warnOnly: true,
      detail:
        rcNum != null
          ? "RC = " + rcNum.toFixed(4) + (consistente ? " (consistente)" : " (inconsistente — revise Etapa 5)")
          : motor
            ? "Motor AHP indisponível"
            : "Será calculado ao processar esta etapa",
    });

    checks.push({
      id: "alertas",
      label: "Registro de alertas de coerência conceitual",
      ok: alertas !== null,
      required: false,
      info: true,
      detail:
        alertas === null
          ? "Campo de alertas não encontrado na configuração"
          : alertas.length
            ? alertas.length + " aviso(s) confirmado(s) pelo gestor na Fase 2"
            : "Nenhum aviso registrado (coerência plena ou sem divergências confirmadas)",
    });

    var requiredOk = checks.filter(function (c) {
      return c.required;
    }).every(function (c) {
      return c.ok;
    });

    return {
      ok: requiredOk && consistente,
      canProcess: requiredOk,
      checks: checks,
      motor: motor,
      config: cfg,
    };
  }

  function renderChecklist(container, verificacao) {
    if (!container) return;
    verificacao = verificacao || { checks: [] };
    var checks = verificacao.checks || [];

    var html = '<div class="info-card info-card--spaced ahp-contexto-checklist">';
    html +=
      '<div class="ahp-info-card-header"><i class="fas fa-clipboard-list"></i><h3>Conferência do pacote da Fase 2</h3></div>';
    html += '<div class="info-card-content">';
    html +=
      '<p style="margin:0 0 1rem;text-align:left;">A configuração selecionada deve reunir a saída da <strong>Fase 1</strong> (objetos), o cadastro da <strong>Fase 2</strong> (critérios/premissas), a <strong>matriz pareada</strong> gravada na Etapa 5 e o registro de <strong>alertas de coerência</strong>.</p>';
    html += '<ul class="ahp-contexto-checklist__list">';

    checks.forEach(function (c) {
      var icon = c.ok ? "fa-circle-check" : c.warnOnly || c.info ? "fa-triangle-exclamation" : "fa-circle-xmark";
      var mod = c.ok ? "is-ok" : c.warnOnly || c.info ? "is-warn" : "is-fail";
      html += '<li class="ahp-contexto-checklist__item ' + mod + '">';
      html += '<i class="fas ' + icon + '" aria-hidden="true"></i>';
      html += "<div><strong>" + escapeHtml(c.label) + "</strong>";
      html += '<span class="ahp-contexto-checklist__detail">' + escapeHtml(c.detail) + "</span></div>";
      html += "</li>";
    });

    html += "</ul>";

    if (!verificacao.canProcess) {
      html +=
        '<p class="ahp-contexto-checklist__blocker"><i class="fas fa-ban"></i> Complete a Fase 2 (critérios, comparação na Etapa 5 e salvamento) antes de calcular os pesos aqui.</p>';
    } else if (!verificacao.ok) {
      html +=
        '<p class="ahp-contexto-checklist__warn"><i class="fas fa-triangle-exclamation"></i> O pacote está incompleto ou a matriz pareada não está consistente (RC ≥ 0,10). Você pode visualizar o diagnóstico, mas homologação exige RC &lt; 0,10.</p>';
    } else {
      html +=
        '<p class="ahp-contexto-checklist__ok"><i class="fas fa-circle-check"></i> Pacote da Fase 2 conferido. Pronto para validar, calcular pesos e emitir parecer.</p>';
    }

    html += "</div></div>";
    container.innerHTML = html;
  }

  function renderResumoConfig(container, cfg) {
    if (!container || !cfg) return;
    var linhas = [
      ["Pacote", global.SLTPacoteFase ? global.SLTPacoteFase.rotulo(global.SLTPacoteFase.resolverPacoteFase(cfg)) : cfg.pacote_fase || "—"],
      ["Código", cfg.codigo],
      ["Escopo", cfg.nome || cfg.escopo],
      ["Objetivo", cfg.objetivo],
      ["Status", cfg.status],
      ["Critérios", String(criterioCount(cfg))],
      ["Objetos", String(objetoCount(cfg))],
      ["Matriz pareada", matrizDim(cfg) ? matrizDim(cfg) + "×" + matrizDim(cfg) : "—"],
    ];
    if (global.SLTAhpFormatoData && global.SLTAhpFormatoData.linhasTimestampsConfig) {
      linhas = linhas.concat(global.SLTAhpFormatoData.linhasTimestampsConfig(cfg));
    }
    var itens = linhas
      .map(function (par) {
        return (
          "<li><strong>" +
          escapeHtml(par[0]) +
          ":</strong> " +
          escapeHtml(par[1] || "—") +
          "</li>"
        );
      })
      .join("");
    container.innerHTML =
      '<div class="ahp-recommendation__head"><i class="fas fa-circle-check"></i><strong>Contexto carregado' +
      (cfg.codigo ? " — " + escapeHtml(cfg.codigo) : "") +
      "</strong></div><ul class=\"info-list\">" +
      itens +
      "</ul>";
    container.classList.remove("is-hidden");
  }

  global.SLTStep6Contexto = {
    verificarPacoteFase2: verificarPacoteFase2,
    renderChecklist: renderChecklist,
    renderResumoConfig: renderResumoConfig,
  };
})(window);
