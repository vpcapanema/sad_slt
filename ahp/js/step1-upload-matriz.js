/**
 * Etapa 1 — upload da Tabela de Premissas e Critérios (XLSX/CSV).
 */
(function (global) {
  "use strict";

  var uploadedPremissasData = null;
  var uploadedFileName = "";
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

  function persistMatrizNoBanco(rows, fileName) {
    var cfg = getConfigAtual();
    if (!cfg || !global.SLTConfigApi) {
      return Promise.resolve(false);
    }
    var ext = (fileName.split(".").pop() || "").toLowerCase();
    return global.SLTConfigApi.atualizar(cfg.tipo, cfg.codigo, {
      criterios: rows,
      n_criterios: rows.length,
      metodo_entrada: "upload_tabela",
      arquivo_nome: fileName,
      arquivo_tipo: ext === "xlsx" || ext === "csv" ? ext : null,
    })
      .then(function () {
        return true;
      })
      .catch(function () {
        return false;
      });
  }

  function showNotification(message, type) {
    var notificationDiv = document.createElement("div");
    notificationDiv.className = "ahp-notification ahp-notification--" + type;
    notificationDiv.innerHTML =
      '<i class="fas fa-' +
      (type === "success" ? "check-circle" : type === "error" ? "exclamation-circle" : "info-circle") +
      '"></i><span>' +
      message +
      "</span>";
    document.body.appendChild(notificationDiv);
    setTimeout(function () {
      notificationDiv.style.opacity = "0";
      setTimeout(function () {
        notificationDiv.remove();
      }, 300);
    }, 4000);
  }

  function toggleInputMethod() {
    var manualRadio = document.getElementById("method-manual");
    var uploadRadio = document.getElementById("method-upload");
    var manualContent = document.getElementById("manual-method-content");
    var uploadContent = document.getElementById("upload-method-content");
    var continueBtn = document.getElementById("continue-btn");

    if (manualRadio.checked) {
      manualContent.classList.remove("method-content--hidden");
      uploadContent.classList.add("method-content--hidden");
      continueBtn.textContent = "Continuar";
      continueBtn.innerHTML =
        'Continuar<i class="fas fa-arrow-right icon-right" aria-hidden="true"></i>';
      continueBtn.onclick = processCriteriaCount;
    } else if (uploadRadio.checked) {
      manualContent.classList.add("method-content--hidden");
      uploadContent.classList.remove("method-content--hidden");
      continueBtn.textContent = "Processar Tabela";
      continueBtn.innerHTML =
        '<i class="fas fa-check" aria-hidden="true"></i> Processar Tabela';
      continueBtn.onclick = processUploadedMatrix;
    }
  }

  function handleFileSelect(event) {
    var file = event.target.files[0];
    var fileInfo = document.getElementById("file-info");
    uploadedPremissasData = null;
    uploadedFileName = "";

    if (!file) {
      fileInfo.innerHTML = "";
      return;
    }

    uploadedFileName = file.name;
    var fileSize = (file.size / 1024).toFixed(2) + " KB";
    var fileExtension = file.name.split(".").pop().toLowerCase();

    fileInfo.innerHTML =
      '<div class="ahp-selected-file"><i class="fas fa-file-alt"></i><div><strong>' +
      file.name +
      "</strong><small>" +
      fileSize +
      "</small></div></div>";

    if (fileExtension === "csv") {
      var textReader = new FileReader();
      textReader.onload = function (e) {
        try {
          uploadedPremissasData = SltMatrizPremissas.parseCsvContent(e.target.result);
          showNotification(
            uploadedPremissasData.length +
              " critério(s) carregado(s). Clique em Processar Tabela para continuar.",
            "success"
          );
        } catch (error) {
          showNotification("Erro ao ler CSV: " + error.message, "error");
          uploadedPremissasData = null;
        }
      };
      textReader.onerror = function () {
        showNotification("Erro ao ler o arquivo CSV.", "error");
      };
      textReader.readAsText(file, "UTF-8");
      return;
    }

    if (fileExtension === "xlsx") {
      var binReader = new FileReader();
      binReader.onload = function (e) {
        try {
          uploadedPremissasData = SltMatrizPremissas.parseXlsxArrayBuffer(e.target.result);
          showNotification(
            uploadedPremissasData.length +
              " critério(s) carregado(s). Clique em Processar Tabela para continuar.",
            "success"
          );
        } catch (error) {
          showNotification("Erro ao ler XLSX: " + error.message, "error");
          uploadedPremissasData = null;
        }
      };
      binReader.onerror = function () {
        showNotification("Erro ao ler o arquivo XLSX.", "error");
      };
      binReader.readAsArrayBuffer(file);
      return;
    }

    showNotification("Formato não suportado. Use XLSX ou CSV.", "error");
  }

  function processUploadedMatrix() {
    if (!uploadedPremissasData || !uploadedPremissasData.length) {
      showNotification("Selecione e carregue um arquivo de tabela primeiro.", "error");
      return;
    }

    try {
      var criteria = uploadedPremissasData.map(function (row) {
        return row.criterio;
      });

      var duplicates = criteria.filter(function (name, index) {
        return criteria.indexOf(name) !== index;
      });
      if (duplicates.length) {
        showNotification(
          "Critérios duplicados na tabela: " + duplicates.join(", "),
          "error"
        );
        return;
      }

      SltMatrizPremissas.saveMatrizPremissas(uploadedPremissasData, uploadedFileName);
      localStorage.setItem("ahp_inputMethod", "upload_matriz");
      localStorage.setItem("ahp_criteriaCount", String(criteria.length));
      localStorage.setItem("ahp_criteria", JSON.stringify(criteria));
      localStorage.removeItem("ahp_uploadedMatrix");
      localStorage.removeItem("ahp_pairwiseMatrix");

      persistMatrizNoBanco(uploadedPremissasData, uploadedFileName).then(function (saved) {
        showNotification(
          saved
            ? "Tabela processada e salva. Avançando para a próxima etapa…"
            : "Tabela processada. Avançando para a próxima etapa…",
          "info"
        );
        setTimeout(function () {
          window.location.href = "step3-nomes.html";
        }, 600);
      });
    } catch (error) {
      showNotification("Erro ao processar tabela: " + error.message, "error");
    }
  }

  function processCriteriaCount() {
    var countSelect = document.getElementById("criteria-count");
    var criteriaCount = parseInt(countSelect.value, 10);
    SltMatrizPremissas.clearMatrizPremissas();
    localStorage.removeItem("ahp_uploadedMatrix");
    localStorage.removeItem("ahp_pairwiseMatrix");
    localStorage.setItem("ahp_inputMethod", "manual");
    localStorage.setItem("ahp_criteriaCount", String(criteriaCount));
    window.location.href = "step3-nomes.html";
  }

  global.toggleInputMethod = toggleInputMethod;
  global.handleFileSelect = handleFileSelect;
  global.processUploadedMatrix = processUploadedMatrix;
  global.processCriteriaCount = processCriteriaCount;

  document.addEventListener("DOMContentLoaded", function () {
    var savedCount = localStorage.getItem("ahp_criteriaCount");
    if (savedCount) {
      document.getElementById("criteria-count").value = savedCount;
    }
    var savedMethod = localStorage.getItem("ahp_inputMethod");
    if (savedMethod === "upload_matriz") {
      document.getElementById("method-upload").checked = true;
      toggleInputMethod();
    }
  });
})(window);
