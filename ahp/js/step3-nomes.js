/**
 * Etapa 3 — cadastro de nomes e avanço após tabela completa.
 */
(function (global) {
  "use strict";

  function collectCriteriaFromInputs() {
    var count = parseInt(global.localStorage.getItem("ahp_criteriaCount"), 10);
    var criteria = [];
    var valid = true;

    for (var i = 1; i <= count; i++) {
      var input = global.document.getElementById("criteria" + i);
      if (!input) continue;
      var value = input.value.trim();
      if (!value) {
        input.style.borderColor = "var(--pli-error)";
        valid = false;
      } else {
        input.style.borderColor = "";
        criteria.push(value);
      }
    }

    if (!valid) {
      return {
        ok: false,
        message: "Por favor, preencha todos os nomes dos critérios.",
      };
    }

    var duplicates = criteria.filter(function (name, index) {
      return criteria.indexOf(name) !== index;
    });
    if (duplicates.length > 0) {
      return {
        ok: false,
        message: "Atenção: há critérios com nomes duplicados. Use nomes únicos para cada critério.",
      };
    }

    return { ok: true, criteria: criteria };
  }

  function syncNamesToMatriz() {
    if (global.SLTStep3Matriz) global.SLTStep3Matriz.syncNamesFromInputs();
  }

  function persistCriteriaNames(criteria) {
    global.localStorage.setItem("ahp_criteria", JSON.stringify(criteria));
  }

  function navigateToStep4() {
    if (global.SLTAhpNav && global.SLTAhpNav.irPara) {
      global.SLTAhpNav.irPara("/restrict/ahp/metodo/");
    } else {
      global.location.href = "/restrict/ahp/metodo/";
    }
  }

  function validateMatrizCompleta(rows) {
    if (!global.SltMatrizPremissas) {
      return "A tabela de premissas ainda não foi carregada.";
    }
    if (!rows.length) {
      return "Complete a tabela de premissas e critérios.";
    }

    var err = global.SltMatrizPremissas.validateRows(rows, true);
    if (err) return err;

    return null;
  }

  function collectMatrizRows() {
    if (!global.SltMatrizPremissas) return [];
    return global.SltMatrizPremissas.loadMatrizPremissas();
  }

  function showSaveNamesFeedback(message, isError) {
    var box = global.document.getElementById("saveNamesFeedback");
    if (!box) return;
    box.textContent = message || "";
    box.className = "ahp-save-names-feedback" + (isError ? " is-error" : " is-success");
  }

  function saveCriteriaNames() {
    var parsed = collectCriteriaFromInputs();
    if (!parsed.ok) {
      global.alert(parsed.message);
      return;
    }

    syncNamesToMatriz();
    persistCriteriaNames(parsed.criteria);

    if (!global.SLTAhpCoerencia || !global.SLTAhpCoerenciaUI) {
      showSaveNamesFeedback("Nomes salvos.", false);
      return;
    }

    global.SLTAhpCoerencia.validateNomes(parsed.criteria)
      .then(function (res) {
        return global.SLTAhpCoerenciaUI.confirmarSeNecessario(
          res,
          {
            etapa: "Etapa 3",
            titulo: "Divergências nos nomes dos critérios",
            intro:
              "Alguns nomes não correspondem plenamente ao catálogo PLI-SP ou às dimensões declaradas na configuração. Revise ou prossiga mesmo assim.",
          },
          function () {
            persistCriteriaNames(parsed.criteria);
          }
        );
      })
      .then(function () {
        showSaveNamesFeedback("Nomes salvos.", false);
      })
      .catch(function (err) {
        if (err && err.code === "COERENCIA_CANCELADA") return;
        global.alert(
          "Erro na validação conceitual: " + (err && err.message ? err.message : String(err))
        );
      });
  }

  function continueStep3() {
    var parsed = collectCriteriaFromInputs();
    if (!parsed.ok) {
      global.alert(parsed.message);
      return;
    }

    syncNamesToMatriz();
    persistCriteriaNames(parsed.criteria);

    var rows = collectMatrizRows();
    var matrizErr = validateMatrizCompleta(rows);
    if (matrizErr) {
      global.alert(matrizErr);
      return;
    }

    function finish() {
      navigateToStep4();
    }

    if (typeof global.__step3MatrizSave === "function") {
      global.Promise.resolve(global.__step3MatrizSave(rows))
        .then(finish)
        .catch(function (err) {
          if (err && err.code === "COERENCIA_CANCELADA") return;
          var msg = err && err.message ? err.message : String(err);
          if (msg.indexOf("Salvamento cancelado") === -1) {
            global.alert("Não foi possível salvar antes de continuar: " + msg);
          }
        });
      return;
    }

    if (global.SLTStep3Matriz && global.SLTStep3Matriz.executeSave) {
      var cfg = global.SLTStep3Matriz.getConfigAtual
        ? global.SLTStep3Matriz.getConfigAtual()
        : null;
      var fileName =
        global.SltMatrizPremissas && global.SltMatrizPremissas.loadMatrizArquivoNome
          ? global.SltMatrizPremissas.loadMatrizArquivoNome()
          : "";
      var baseline =
        global.__step3MatrizBaseline ||
        (global.SLTStep3Matriz.criteriaSignature
          ? global.SLTStep3Matriz.criteriaSignature(rows)
          : "");
      global.SLTStep3Matriz.executeSave(rows, cfg, fileName, baseline).then(finish);
      return;
    }

    finish();
  }

  /** Extrai os nomes da coluna Critério diretamente da matriz carregada (fonte canônica). */
  function criteriosDaMatriz() {
    if (!global.SltMatrizPremissas) return null;
    var rows = global.SltMatrizPremissas.loadMatrizPremissas();
    if (!rows || !rows.length) return null;
    return rows.map(function (r) { return (r && (r.criterio || r["Critério"] || r.nome)) || ""; });
  }

  function renderCriteriaInputs(criteria, sourceLabel) {
    var container = global.document.getElementById("criteriaInputs");
    if (!container || !criteria || !criteria.length) return false;
    container.replaceChildren();
    var origin = global.document.getElementById("nomes-config-origin");
    if (origin) origin.innerHTML = '<i class="fas fa-lock" aria-hidden="true"></i><span>Critérios carregados de <strong>' + sourceLabel + '</strong>. Esta origem fica congelada nesta etapa.</span>';
    global.localStorage.setItem("ahp_criteria", JSON.stringify(criteria));
    global.localStorage.setItem("ahp_criteriaCount", String(criteria.length));
    criteria.forEach(function (name, index) {
      var formGroup = global.document.createElement("div");
      formGroup.className = "c-form-group";
      var label = global.document.createElement("label");
      label.className = "c-form-label";
      label.setAttribute("for", "criteria" + (index + 1));
      label.innerHTML = '<i class="fas fa-tag"></i> Critério ' + (index + 1);
      var input = global.document.createElement("input");
      input.type = "text";
      input.id = "criteria" + (index + 1);
      input.name = input.id;
      input.className = "c-form-control";
      input.placeholder = "Digite o nome do critério " + (index + 1);
      input.value = name || "";
      input.required = true;
      input.addEventListener("input", function () { if (global.SLTStep3Matriz) global.SLTStep3Matriz.syncNamesFromInputs(); });
      input.addEventListener("blur", function () { if (global.SLTStep3Matriz) global.SLTStep3Matriz.syncNamesFromInputs(); });
      var helpText = global.document.createElement("small");
      helpText.className = "form-help";
      helpText.innerHTML = '<i class="fas fa-link"></i> Sincronizado com a coluna Critério da tabela';
      formGroup.append(label, input, helpText);
      container.appendChild(formGroup);
    });
    if (global.SLTStep3Matriz && global.SLTStep3Matriz.onCriteriaInputsReady) global.SLTStep3Matriz.onCriteriaInputsReady();
    return true;
  }

  function bootCriteriaInputs(criteriaFromConfig) {
    var isUpload = (global.localStorage.getItem("ahp_inputMethod") || "manual") === "upload_matriz";
    var matrizCriterios = criteriosDaMatriz();
    var configCriterios = Array.isArray(criteriaFromConfig) ? criteriaFromConfig : null;
    var prioridade = matrizCriterios && matrizCriterios.length ? matrizCriterios : (configCriterios && configCriterios.length ? configCriterios : null);
    matrizCriterios = prioridade;
    var count = matrizCriterios ? matrizCriterios.length : parseInt(global.localStorage.getItem("ahp_criteriaCount"), 10);
    if (!count || count < 1) {
      var note = global.document.getElementById("reviewNote");
      if (note) {
        note.className = "ahp-recommendation";
        note.innerHTML =
          '<div class="ahp-recommendation__head"><i class="fas fa-circle-info"></i>' +
          "<strong>Nenhum critério definido ainda.</strong></div>" +
          '<p>Defina a quantidade de critérios na <a href="/restrict/ahp/criterios/">Etapa 2: Critérios</a> para preencher os nomes aqui.</p>';
      }
      return;
    }

    var container = global.document.getElementById("criteriaInputs");
    if (!container) return;
    container.replaceChildren();

    var savedCriteria = matrizCriterios || JSON.parse(global.localStorage.getItem("ahp_criteria") || "[]");
    if (matrizCriterios) {
      // Mantém ahp_criteria/ahp_criteriaCount sincronizados com a matriz (fonte canônica).
      global.localStorage.setItem("ahp_criteria", JSON.stringify(matrizCriterios));
      global.localStorage.setItem("ahp_criteriaCount", String(matrizCriterios.length));
    }
    var origem = global.localStorage.getItem("ahp_inputMethodOrigem") || (isUpload ? "upload" : "manual");
    var originBox = global.document.getElementById("nomes-config-origin");
    if (originBox) originBox.innerHTML = '<i class="fas fa-lock" aria-hidden="true"></i><span>Critérios carregados de <strong>' + (matrizCriterios && matrizCriterios.length ? "informações desta etapa" : "configuração selecionada") + '</strong>. Esta origem fica congelada nesta etapa.</span>';
    var hierOrigem = null;
    if (origem === "hierarquizacao") {
      try { hierOrigem = JSON.parse(global.localStorage.getItem("ahp_hierarquizacaoOrigem") || "null"); } catch (_e) { hierOrigem = null; }
    }

    if (isUpload) {
      var set = function (id, txt) {
        var el = global.document.getElementById(id);
        if (el) el.textContent = txt;
      };
      set("pageTitleText", "Etapa 3: Conferir Critérios");
      set(
        "pageDesc",
        origem === "hierarquizacao"
          ? "Os critérios foram importados da matriz da hierarquização" + (hierOrigem ? " «" + hierOrigem.codigo + " — " + hierOrigem.nome + "»" : "") + ". Revise os nomes e complete a Tabela de Premissas e Critérios abaixo."
          : "Os critérios foram importados da matriz enviada. Revise os nomes e complete a Tabela de Premissas e Critérios abaixo."
      );
      set("cadastroLabel", "Conferência dos Nomes");
      set("stepTitleText", "Confira os nomes dos critérios");
      var noteUpload = global.document.getElementById("reviewNote");
      if (noteUpload) {
        noteUpload.className = "ahp-recommendation";
        noteUpload.innerHTML =
          '<div class="ahp-recommendation__head"><i class="fas fa-clipboard-check"></i>' +
          "<strong>Critérios importados" + (origem === "hierarquizacao" ? " da hierarquização" : "") + ".</strong></div>" +
          "<p>Ajuste os nomes e complete premissas, dimensões e demais campos na tabela abaixo antes de continuar.</p>";
      }
    }

    var i;
    for (i = 1; i <= count; i++) {
      var formGroup = global.document.createElement("div");
      formGroup.className = "c-form-group";

      var label = global.document.createElement("label");
      label.className = "c-form-label";
      label.setAttribute("for", "criteria" + i);
      label.innerHTML = '<i class="fas fa-tag"></i> Critério ' + i;

      var input = global.document.createElement("input");
      input.type = "text";
      input.id = "criteria" + i;
      input.name = "criteria" + i;
      input.className = "c-form-control";
      input.placeholder = "Digite o nome do critério " + i;
      input.value = savedCriteria[i - 1] || "";
      input.required = true;
      input.addEventListener("input", function () {
        if (global.SLTStep3Matriz) global.SLTStep3Matriz.syncNamesFromInputs();
      });
      input.addEventListener("blur", function () {
        if (global.SLTStep3Matriz) global.SLTStep3Matriz.syncNamesFromInputs();
      });

      var helpText = global.document.createElement("small");
      helpText.className = "form-help";
      helpText.innerHTML = isUpload
        ? '<i class="fas fa-file-import"></i> Sincronizado com a tabela abaixo'
        : '<i class="fas fa-info-circle"></i> Sincroniza com a coluna Critério da tabela';

      formGroup.appendChild(label);
      formGroup.appendChild(input);
      formGroup.appendChild(helpText);
      container.appendChild(formGroup);
    }

    if (global.SLTStep3Matriz && global.SLTStep3Matriz.onCriteriaInputsReady) {
      global.SLTStep3Matriz.onCriteriaInputsReady();
    }
  }

  global.saveCriteriaNames = saveCriteriaNames;
  global.continueStep3 = continueStep3;
  global.SLTStep3Nomes = { boot: bootCriteriaInputs };

  global.document.addEventListener("DOMContentLoaded", function () {
    bootCriteriaInputs();
    global.addEventListener("slt:ahp-config-loaded", function (event) {
      var cfg = event.detail || {};
      var criterios = (cfg.criterios || []).map(function (item) {
        if (typeof item === "string") return item.trim();
        return String(item.criterio || item.nome || item.alias || "").trim();
      }).filter(Boolean);
      if (!criterios.length) return;
      var origem = cfg.codigo ? "configuração " + cfg.codigo : "configuração ativa";
      renderCriteriaInputs(criterios, origem);
      var note = global.document.getElementById("reviewNote");
      if (note) {
        note.className = "ahp-recommendation";
        note.innerHTML = '<div class="ahp-recommendation__head"><i class="fas fa-wand-magic-sparkles"></i><strong>Nomes gerados automaticamente.</strong></div><p>Os ' + criterios.length + ' critérios foram carregados da configuração ativa. Você pode revisar os nomes antes de salvar.</p>';
      }
    });
  });
})(window);
