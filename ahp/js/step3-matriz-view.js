/**
 * Etapa 3 — exibe e edita a Tabela de Premissas e Critérios.
 *
 * A matriz é recuperada do banco (coluna ``criterios`` da configuração atual),
 * renderizada em modo edição (valores das células + adicionar/remover critérios)
 * e salva de volta via PATCH. O localStorage é mantido em sincronia para o
 * restante do fluxo (Etapas 4–5).
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
    // Critérios mudaram: a matriz pareada e os pesos não valem mais.
    localStorage.removeItem("ahp_pairwiseMatrix");
    localStorage.removeItem("ahp_uploadedMatrix");
    localStorage.removeItem("ahp_chosenMethod");
  }

  function makeSaveHandler(cfg, fileName, baselineSignature) {
    return function (rows) {
      syncLocalStorage(rows, fileName);
      var mudou = criteriaSignature(rows) !== baselineSignature;
      var payload = { criterios: rows, n_criterios: rows.length };
      if (mudou) {
        invalidarComparacao();
        // Critérios mudaram: a matriz pareada salva não vale mais. NÃO mexemos no
        // status (todo o Bloco 2 permanece em hierarquização).
        payload.matriz_comparacao = [];
      }
      var done = cfg && global.SLTConfigApi
        ? global.SLTConfigApi.atualizar(cfg.tipo, cfg.codigo, payload)
        : Promise.resolve();
      return done.then(function () {
        if (mudou) {
          global.alert(
            "Os critérios foram alterados. A comparação pareada foi reiniciada — refaça as Etapas 4 e 5."
          );
        }
        // Nova linha de base após salvar com sucesso.
        baselineSignature = criteriaSignature(rows);
      });
    };
  }

  function renderEditor(panel, rows, fileName, cfg) {
    SltMatrizPremissas.renderMatrizPremissasEditor(panel, {
      rows: rows,
      fileName: fileName,
      onSave: makeSaveHandler(cfg, fileName, criteriaSignature(rows)),
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    var panel = document.getElementById("matriz-premissas-panel");
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
          if (rows.length) {
            syncLocalStorage(rows, fileName);
          }
          renderEditor(panel, rows, fileName, cfg);
        })
        .catch(function () {
          renderEditor(panel, localRows, localFile, cfg);
        });
      return;
    }

    renderEditor(panel, localRows, localFile, cfg);
  });

  function selectMethod(method) {
    localStorage.setItem("ahp_chosenMethod", method);
    window.location.href = "step5-comparacao.html";
  }

  global.selectMethod = selectMethod;
})(window);
