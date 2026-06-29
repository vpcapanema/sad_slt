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
      global.SLTAhpNav.irPara("step4-metodo.html");
    } else {
      global.location.href = "step4-metodo.html";
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
    var panel = global.document.getElementById("matriz-premissas-panel");
    if (!panel || !global.SltMatrizPremissas) return [];
    return global.SltMatrizPremissas.collectEditorRows(panel);
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

  function bootCriteriaInputs() {
    var count = global.localStorage.getItem("ahp_criteriaCount");
    if (!count || count < 1) {
      var note = global.document.getElementById("reviewNote");
      if (note) {
        note.className = "ahp-recommendation";
        note.innerHTML =
          '<div class="ahp-recommendation__head"><i class="fas fa-circle-info"></i>' +
          "<strong>Nenhum critério definido ainda.</strong></div>" +
          '<p>Defina a quantidade de critérios na <a href="step2-criterios.html">Etapa 2: Critérios</a> para preencher os nomes aqui.</p>';
      }
      return;
    }

    var container = global.document.getElementById("criteriaInputs");
    if (!container) return;

    var savedCriteria = JSON.parse(global.localStorage.getItem("ahp_criteria") || "[]");
    var isUpload = (global.localStorage.getItem("ahp_inputMethod") || "manual") === "upload_matriz";

    if (isUpload) {
      var set = function (id, txt) {
        var el = global.document.getElementById(id);
        if (el) el.textContent = txt;
      };
      set("pageTitleText", "Etapa 3: Conferir Critérios");
      set(
        "pageDesc",
        "Os critérios foram importados da matriz enviada. Revise os nomes e complete a Tabela de Premissas e Critérios abaixo."
      );
      set("cadastroLabel", "Conferência dos Nomes");
      set("stepTitleText", "Confira os nomes dos critérios");
      var noteUpload = global.document.getElementById("reviewNote");
      if (noteUpload) {
        noteUpload.className = "ahp-recommendation";
        noteUpload.innerHTML =
          '<div class="ahp-recommendation__head"><i class="fas fa-clipboard-check"></i>' +
          "<strong>Critérios importados.</strong></div>" +
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

  global.document.addEventListener("DOMContentLoaded", bootCriteriaInputs);
})(window);
