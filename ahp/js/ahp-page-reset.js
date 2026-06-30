/**
 * Reset de página do módulo AHP — campos vazios e seletores no placeholder padrão
 * a cada carregamento/recarregamento. Não altera processamento no servidor.
 *
 * Navegação explícita entre etapas (Continuar) usa handoff em sessionStorage
 * para repassar o fluxo da sessão sem persistir entre reloads.
 */
(function (global) {
  "use strict";

  var HANDOFF_KEY = "slt_ahp_handoff";
  var STORAGE_KEYS = [
    "slt_ahp_config_atual",
    "slt_ahp_tipo",
    "slt_ahp_config_draft",
    "slt_ahp_alertas_pendentes",
    "slt_ahp_matriz_premissas",
    "slt_ahp_matriz_arquivo_nome",
    "ahp_criteriaCount",
    "ahp_criteria",
    "ahp_inputMethod",
    "ahp_uploadedMatrix",
    "ahp_pairwiseMatrix",
    "ahp_chosenMethod",
  ];

  function captureSnapshot() {
    var snap = {};
    STORAGE_KEYS.forEach(function (key) {
      try {
        var val = global.localStorage.getItem(key);
        if (val != null) snap[key] = val;
      } catch (_e) {
        /* ignore */
      }
    });
    return snap;
  }

  function clearStorage() {
    STORAGE_KEYS.forEach(function (key) {
      try {
        global.localStorage.removeItem(key);
      } catch (_e) {
        /* ignore */
      }
    });
  }

  function restoreSnapshot(snap) {
    if (!snap) return;
    Object.keys(snap).forEach(function (key) {
      try {
        global.localStorage.setItem(key, snap[key]);
      } catch (_e) {
        /* ignore */
      }
    });
  }

  function consumeHandoff() {
    try {
      var raw = global.sessionStorage.getItem(HANDOFF_KEY);
      global.sessionStorage.removeItem(HANDOFF_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (_e) {
      return null;
    }
  }

  function bootStorage() {
    var handoff = consumeHandoff();
    clearStorage();
    if (handoff && handoff.keys) restoreSnapshot(handoff.keys);
  }

  function resetSelect(select) {
    if (!select || select.tagName !== "SELECT") return;
    var placeholder = select.querySelector('option[value=""]');
    if (placeholder) {
      select.value = "";
    } else {
      select.selectedIndex = 0;
    }
  }

  function resetDom() {
    var doc = global.document;
    if (!doc || !doc.body) return;

    doc.querySelectorAll("form").forEach(function (form) {
      try {
        form.reset();
      } catch (_e) {
        /* ignore */
      }
    });

    doc.querySelectorAll("select").forEach(resetSelect);

    doc.querySelectorAll('input[type="file"]').forEach(function (input) {
      input.value = "";
    });

    doc.querySelectorAll('input[type="text"], input[type="number"], textarea').forEach(function (input) {
      if (input.type === "hidden") return;
      if (input.closest(".app-header")) return;
      input.value = "";
    });

    doc.querySelectorAll('[data-ahp-contexto-ui]').forEach(function (el) {
      el.remove();
    });
    doc.querySelectorAll(".ahp-contexto-intro-generico").forEach(function (el) {
      el.classList.remove("is-hidden");
    });

    var summary = doc.getElementById("cfg-loaded-summary");
    if (summary) {
      summary.innerHTML = "";
      summary.classList.add("is-hidden");
    }

    var checklist = doc.getElementById("ctx-fase2-checklist");
    if (checklist) checklist.innerHTML = "";

    ["criteriaInputs", "reviewNote", "matriz-premissas-panel", "results-conferencia", "results-pesos", "results-parecer", "config-artefatos", "file-info", "cfg-file-info"].forEach(
      function (id) {
        var el = doc.getElementById(id);
        if (el) el.innerHTML = "";
      }
    );

    var criteriaCount = doc.getElementById("criteria-count");
    if (criteriaCount && criteriaCount.querySelector('option[value="3"]')) {
      criteriaCount.value = "3";
    }

    var cfgSaved = doc.getElementById("cfg-saved-select");
    if (cfgSaved) resetSelect(cfgSaved);

    var cfgSavedRadio = doc.getElementById("cfg-method-saved");
    if (cfgSavedRadio) cfgSavedRadio.checked = true;

    var cfgFileContent = doc.getElementById("cfg-file-content");
    var cfgSavedContent = doc.getElementById("cfg-saved-content");
    if (cfgFileContent) cfgFileContent.classList.add("method-content--hidden");
    if (cfgSavedContent) cfgSavedContent.classList.remove("method-content--hidden");

    var methodManual = doc.getElementById("method-manual");
    if (methodManual) methodManual.checked = true;

    var manualContent = doc.getElementById("manual-method-content");
    var uploadContent = doc.getElementById("upload-method-content");
    if (manualContent) manualContent.classList.remove("method-content--hidden");
    if (uploadContent) uploadContent.classList.add("method-content--hidden");

    if (global.SLTFieldFilled && typeof global.SLTFieldFilled.syncAll === "function") {
      global.SLTFieldFilled.syncAll(doc);
    }
  }

  function irPara(url) {
    try {
      global.sessionStorage.setItem(
        HANDOFF_KEY,
        JSON.stringify({ keys: captureSnapshot(), ts: Date.now() })
      );
    } catch (_e) {
      /* ignore */
    }
    global.location.href = url;
  }

  global.SLTAhpNav = {
    irPara: irPara,
    captureSnapshot: captureSnapshot,
    clearStorage: clearStorage,
    resetDom: resetDom,
  };

  bootStorage();

  global.document.addEventListener("DOMContentLoaded", resetDom);
})(window);
