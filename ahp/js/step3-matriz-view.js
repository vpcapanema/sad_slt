/**
 * Etapa 3 Ã¢â‚¬â€ Tabela de Premissas e CritÃƒÂ©rios (abaixo do cadastro de nomes).
 */
(function (global) {
  "use strict";

  var CONFIG_KEY = "slt_ahp_config_atual";

  function getConfigAtual() {
    try {
      var raw = localStorage.getItem(CONFIG_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      return parsed && parsed.tipo && parsed.codigo ? parsed : null;
    } catch (_err) {
      return null;
    }
  }

  function syncLocalStorage(rows, fileName) {
    SltMatrizPremissas.saveMatrizPremissas(rows, fileName || undefined);
    var criteria = rows.map(function (r) {
      return r.criterio;
    });
    localStorage.setItem("ahp_criteria", JSON.stringify(criteria));
    localStorage.setItem("ahp_criteriaCount", String(criteria.length));
  }

  function criteriaSignature(rows) {
    return rows
      .map(function (r) {
        return String(r.criterio || "").trim();
      })
      .join("||");
  }

  function invalidarComparacao() {
    localStorage.removeItem("ahp_pairwiseMatrix");
    localStorage.removeItem("ahp_uploadedMatrix");
    localStorage.removeItem("ahp_chosenMethod");
  }

  function executeSave(rows, cfg, fileName, baselineSignature) {
    if (global.SLTAhpTextoPt && global.SLTAhpTextoPt.normalizarLinhasMatriz) {
      rows = global.SLTAhpTextoPt.normalizarLinhasMatriz(rows);
    }
    syncLocalStorage(rows, fileName);
    var mudou = criteriaSignature(rows) !== baselineSignature;
    var payload = { criterios: rows, n_criterios: rows.length };
    if (mudou) {
      invalidarComparacao();
      payload.matriz_comparacao = [];
    }
    var done =
      cfg && global.SLTConfigApi
        ? global.SLTConfigApi.atualizar(cfg.tipo, cfg.codigo, payload)
        : Promise.resolve();
    return done.then(function () {
      if (mudou) {
        global.alert(
          "Os critÃƒÂ©rios foram alterados. A comparaÃƒÂ§ÃƒÂ£o pareada foi reiniciada Ã¢â‚¬â€ refaÃƒÂ§a as Etapas 4 e 5."
        );
      }
      return criteriaSignature(rows);
    });
  }

  function makeSaveHandler(cfg, fileName, baselineSignature) {
    return function (rows) {
      var runSave = function () {
        return executeSave(rows, cfg, fileName, baselineSignature).then(function (nextSig) {
          baselineSignature = nextSig;
          global.__step3MatrizBaseline = nextSig;
        });
      };

      if (!global.SLTAhpCoerencia || !global.SLTAhpCoerenciaUI) {
        return runSave();
      }

      return global.SLTAhpCoerencia.validateMatriz(rows)
        .then(function (res) {
          return global.SLTAhpCoerenciaUI.confirmarSeNecessario(
            res,
            {
              etapa: "Etapa 3",
              titulo: "DivergÃƒÂªncias na matriz de premissas",
              intro:
                "Alguns critÃƒÂ©rios ou premissas divergem do catÃƒÂ¡logo PLI-SP ou das dimensÃƒÂµes da configuraÃƒÂ§ÃƒÂ£o. Revise ou prossiga mesmo assim.",
            },
            runSave
          );
        })
        .catch(function (err) {
          if (err && err.code === "COERENCIA_CANCELADA") {
            return Promise.reject(
              new Error("Salvamento cancelado. Revise os avisos e tente novamente.")
            );
          }
          return Promise.reject(err);
        });
    };
  }

  function emptyMatrizRow() {
    return {
      dimensao: "",
      criterio: "",
      premissa: "",
      relacao: "",
      metricas: "",
      fonte: "",
      mandatorio: "",
    };
  }

  function getExpectedCriteriaCount() {
    var count = parseInt(localStorage.getItem("ahp_criteriaCount") || "0", 10);
    if (count > 0) return count;
    try {
      var nomes = JSON.parse(localStorage.getItem("ahp_criteria") || "[]");
      return Array.isArray(nomes) ? nomes.length : 0;
    } catch (_e) {
      return 0;
    }
  }

  function getCriteriaNamesFromPageOrStorage() {
    var count = getExpectedCriteriaCount();
    var names = [];
    var i;
    for (i = 1; i <= count; i++) {
      var inp = document.getElementById("criteria" + i);
      names.push(inp ? inp.value.trim() : "");
    }
    if (names.some(function (n) {
      return n;
    })) {
      return names;
    }
    try {
      var stored = JSON.parse(localStorage.getItem("ahp_criteria") || "[]");
      if (Array.isArray(stored)) {
        while (stored.length < count) stored.push("");
        return stored.slice(0, count);
      }
    } catch (_e2) {
      /* ignore */
    }
    while (names.length < count) names.push("");
    return names;
  }

  function seedFromManualCriteria(rows) {
    var inputMethod = localStorage.getItem("ahp_inputMethod") || "manual";
    if (inputMethod === "upload_matriz") {
      return rows && rows.length ? rows : [];
    }

    var expected = getExpectedCriteriaCount();
    var names = getCriteriaNamesFromPageOrStorage();
    rows = (rows && rows.slice()) || [];

    if (!expected && !rows.length && !names.some(function (n) {
      return n;
    })) {
      return rows;
    }

    var target = expected || Math.max(rows.length, names.length) || 1;

    while (rows.length < target) {
      rows.push(emptyMatrizRow());
    }
    if (expected > 0 && rows.length > expected) {
      rows = rows.slice(0, expected);
    }

    for (var i = 0; i < target; i++) {
      if (names[i]) {
        rows[i].criterio = names[i];
      }
    }

    return rows;
  }

  function renderEditor(panel, rows, fileName, cfg) {
    var literalColumns = rows && rows.__columns;
    rows = seedFromManualCriteria(rows);
    if (literalColumns && !rows.__columns) {
      Object.defineProperty(rows, "__columns", {
        value: literalColumns,
        enumerable: false,
        configurable: true,
        writable: true,
      });
    }
    var baseline = criteriaSignature(rows);
    global.__step3MatrizBaseline = baseline;
    global.__step3MatrizSave = makeSaveHandler(cfg, fileName, baseline);
    /* A seÃƒÂ§ÃƒÂ£o 3.3 ÃƒÂ© uma visualizaÃƒÂ§ÃƒÂ£o integral da matriz ativa: o componente
       gera cabeÃƒÂ§alho, colunas e valores diretamente do registro selecionado. */
    SltMatrizPremissas.renderMatrizPremissasPanel(panel, {
      rows: rows,
      columns: literalColumns,
      fileName: fileName,
    });
  }

  function boot(panel, rows, fileName, cfg) {
    rows = seedFromManualCriteria(rows);
    if (rows.length) syncLocalStorage(rows, fileName);
    renderEditor(panel, rows, fileName, cfg);
    syncNamesFromInputs();
  }

  function obterHostMatriz() {
    var section = document.getElementById("matriz-premissas-section");
    var body = section && section.querySelector(".ahp-section-body");
    if (!body) return null;
    var host = body.querySelector("[data-ahp-matriz-host]");
    if (!host) {
      host = document.createElement("div");
      host.setAttribute("data-ahp-matriz-host", "true");
      host.className = "ahp-matriz-panel-root";
      host.setAttribute("aria-live", "polite");
      body.appendChild(host);
    }
    return host;
  }

  function syncNamesFromInputs() {
    var panel = obterHostMatriz();
    if (!panel || !global.SltMatrizPremissas) return;
    var names = getCriteriaNamesFromPageOrStorage();
    SltMatrizPremissas.syncCriterioFromNames(panel, names);
  }

  function onCriteriaInputsReady() {
    syncNamesFromInputs();
  }

  global.SLTStep3Matriz = {
    syncNamesFromInputs: syncNamesFromInputs,
    onCriteriaInputsReady: onCriteriaInputsReady,
    renderEditor: renderEditor,
    getConfigAtual: getConfigAtual,
    executeSave: executeSave,
    criteriaSignature: criteriaSignature,
  };

  document.addEventListener("DOMContentLoaded", function () {
    var panel = obterHostMatriz();
    if (!panel || !global.SltMatrizPremissas) return;

    var cfg = getConfigAtual();
    var localRows = SltMatrizPremissas.loadMatrizPremissas();
    var localFile = SltMatrizPremissas.loadMatrizArquivoNome();

    if (cfg && global.SLTConfigApi) {
      global.SLTConfigApi.obter(cfg.tipo, cfg.codigo)
        .then(function (config) {
          var rows = (config && config.criterios) || [];
          var fileName = (config && config.arquivo_nome) || localFile;
          if (!rows.length) rows = localRows;
          boot(panel, rows, fileName, cfg);
          if (cfg.tipo === "portfolio") carregarExcelOriginal(panel, cfg, config);
        })
        .catch(function () {
          boot(panel, localRows, localFile, cfg);
        });
      return;
    }

    boot(panel, localRows, localFile, cfg);
  });

  global.addEventListener("slt:ahp-config-loaded", function (event) {
    var panel = obterHostMatriz();
    var cfg = event.detail || {};
    if (!panel || !cfg.codigo || !global.SLTConfigApi) return;
    var contexto = { tipo: cfg.tipo || "portfolio", codigo: cfg.codigo };
    var rows = (cfg.criterios || []).slice();
    boot(panel, rows, cfg.arquivo_nome || "", contexto);
    if (contexto.tipo === "portfolio") carregarExcelOriginal(panel, contexto, cfg);
  });

  function carregarExcelOriginal(panel, cfg, config) {
    if (!global.SltMatrizPremissas || !global.SltMatrizPremissas.parseXlsxArrayBuffer) return;
    fetch("/api/ahp/configuracoes/" + encodeURIComponent(cfg.tipo) + "/" + encodeURIComponent(cfg.codigo) + "/matriz-excel", { credentials: "include", cache: "no-store" })
      .then(function (res) { if (res.status === 204) return null; if (!res.ok) throw new Error("Arquivo Excel original indisponÃƒÂ­vel."); return res.arrayBuffer(); })
      .then(function (buffer) {
        if (!buffer) return;
        var rows = global.SltMatrizPremissas.parseXlsxArrayBuffer(buffer);
        if (!rows || !rows.length) throw new Error("A matriz Excel nÃƒÂ£o possui linhas vÃƒÂ¡lidas.");
        var configRows = (config && config.criterios) || [];
        rows.forEach(function (row) {
          if (row.fase) return;
          var ref = configRows.filter(function (item) {
            return item && item.criterio && item.criterio === row.criterio;
          })[0];
          if (ref && ref.fase) row.fase = ref.fase;
        });
        var nome = (config && config.arquivo_nome) || "matriz-criterios-premissas.xlsx";
        boot(panel, rows, nome, cfg);
      })
      .catch(function (error) {
        // AusÃƒÂªncia do binÃƒÂ¡rio nÃƒÂ£o impede a renderizaÃƒÂ§ÃƒÂ£o da matriz salva.
        if (global.console && global.console.warn) global.console.warn("Matriz Excel original indisponÃƒÂ­vel; usando os dados da configuraÃƒÂ§ÃƒÂ£o.", error);
      });
  }
})(window);
