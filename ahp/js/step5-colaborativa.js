/**
 * Etapa 5 — consolidação de respostas colaborativas.
 */
(function (global) {
  "use strict";

  function el(id) {
    return document.getElementById(id);
  }

  function escapeHtml(t) {
    return String(t == null ? "" : t)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function getAmbiente() {
    try {
      var raw = localStorage.getItem("slt_ahp_collab_ambiente");
      return raw ? JSON.parse(raw) : null;
    } catch (_e) {
      return null;
    }
  }

  function applyMatrixToStep5(matrix) {
    if (!matrix || !matrix.length) return;
    localStorage.setItem("ahp_pairwiseMatrix", JSON.stringify(matrix));
    localStorage.setItem("ahp_chosenMethod", "form");
    global.location.reload();
  }

  function renderRespostas(list) {
    var host = el("collab-respostas-panel");
    if (!host) return;
    if (!list.length) {
      host.innerHTML =
        '<p class="ahp-recommendation">Nenhuma resposta consistente recebida ainda. Compartilhe os links da Etapa 4.</p>';
      return;
    }
    var rows = list
      .map(function (r) {
        return (
          "<tr><td>" +
          escapeHtml(r.nome_completo) +
          "</td><td>" +
          escapeHtml(r.email) +
          "</td><td>" +
          escapeHtml(r.instituicao) +
          "</td><td>" +
          (r.razao_consistencia != null ? Number(r.razao_consistencia).toFixed(4) : "—") +
          '</td><td><button type="button" class="btn btn-secondary btn-sm" data-resp-id="' +
          escapeHtml(r.id) +
          '">Usar esta matriz</button></td></tr>'
        );
      })
      .join("");
    host.innerHTML =
      '<div class="ahp-matriz-table-wrap"><table class="ahp-matriz-table"><thead><tr>' +
      "<th>Participante</th><th>E-mail</th><th>Instituição</th><th>RC</th><th>Ação</th></tr></thead><tbody>" +
      rows +
      "</tbody></table></div>" +
      '<p class="form-help">Selecione uma resposta como base ou ajuste manualmente na matriz abaixo.</p>';

    host.querySelectorAll("button[data-resp-id]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-resp-id");
        var resp = list.find(function (r) {
          return r.id === id;
        });
        if (resp && confirm("Carregar a matriz de " + resp.nome_completo + " na comparação abaixo?")) {
          applyMatrixToStep5(resp.matriz_comparacao);
        }
      });
    });
  }

  function initCollabConsolidacao() {
    var section = el("collab-consolidacao-section");
    if (!section) return;
    var fillMode = localStorage.getItem("ahp_fillMode") || "individual";
    if (fillMode !== "collaborative") {
      section.classList.add("is-hidden");
      return;
    }
    section.classList.remove("is-hidden");
    var amb = getAmbiente();
    if (!amb || !amb.id || !global.SLTColaborativaApi) return;
    global.SLTColaborativaApi.listarRespostas(amb.id)
      .then(renderRespostas)
      .catch(function () {
        renderRespostas([]);
      });
  }

  document.addEventListener("DOMContentLoaded", initCollabConsolidacao);
  global.SLTStep5Colaborativa = { initCollabConsolidacao: initCollabConsolidacao };
})(window);
