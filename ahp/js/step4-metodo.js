/**
 * Etapa 4 — método de preenchimento (individual / colaborativo) e estratégia.
 */
(function (global) {
  "use strict";

  var FILL_KEY = "ahp_fillMode";
  var AMBIENTE_KEY = "slt_ahp_collab_ambiente";
  var CONFIG_KEY = "slt_ahp_config_atual";

  function el(id) {
    return document.getElementById(id);
  }

  function getConfigAtual() {
    try {
      var raw = localStorage.getItem(CONFIG_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      return parsed && parsed.tipo && parsed.codigo ? parsed : null;
    } catch (_e) {
      return null;
    }
  }

  function escapeHtml(t) {
    return String(t == null ? "" : t)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function getFillMode() {
    return localStorage.getItem(FILL_KEY) || "individual";
  }

  function setFillMode(mode) {
    localStorage.setItem(FILL_KEY, mode);
    refreshSections();
  }

  function refreshSections() {
    var mode = getFillMode();
    var strategy = el("estrategia-section");
    var collabCfg = el("collab-config-section");
    var collabStatus = el("collab-status-section");
    var isCollab = mode === "collaborative";

    if (strategy) strategy.classList.toggle("is-hidden", !mode);
    if (collabCfg) collabCfg.classList.toggle("is-hidden", !isCollab);
    if (collabStatus) collabStatus.classList.toggle("is-hidden", !isCollab);

    document.querySelectorAll('input[name="fill-mode"]').forEach(function (radio) {
      var card = radio.closest(".ahp-method-card");
      if (card) card.classList.toggle("is-selected", radio.checked);
    });

    if (isCollab) {
      localStorage.setItem("ahp_chosenMethod", "form");
      highlightStrategy("form");
      loadAmbienteStatus();
    }
  }

  function highlightStrategy(method) {
    document.querySelectorAll("[data-strategy]").forEach(function (card) {
      var m = card.getAttribute("data-strategy");
      card.classList.toggle("is-selected", m === method);
      card.classList.toggle("is-locked", getFillMode() === "collaborative" && m !== "form");
    });
  }

  function selectFillMode(mode) {
    setFillMode(mode);
    var radio = document.querySelector('input[name="fill-mode"][value="' + mode + '"]');
    if (radio) radio.checked = true;
  }

  function selectMethod(method) {
    if (getFillMode() === "collaborative" && method !== "form") return;
    localStorage.setItem("ahp_chosenMethod", method === "matrix" ? "matrix" : "form");
    highlightStrategy(method === "matrix" ? "matrix" : "form");
    if (getFillMode() === "individual") {
      if (global.SLTAhpNav && global.SLTAhpNav.irPara) {
        global.SLTAhpNav.irPara("step5-comparacao.html");
      } else {
        global.location.href = "step5-comparacao.html";
      }
    }
  }

  function parseEmails(text) {
    return String(text || "")
      .split(/[\n,;]+/)
      .map(function (e) {
        return e.trim().toLowerCase();
      })
      .filter(Boolean);
  }

  function setCollabFeedback(msg, kind) {
    var box = el("collab-config-feedback");
    if (!box) return;
    box.textContent = msg || "";
    box.className = "ahp-matriz-edit-feedback" + (kind ? " is-" + kind : "");
  }

  function renderAmbienteStatus(amb) {
    var box = el("collab-status-content");
    if (!box || !amb) return;
    var links = (amb.convites || [])
      .map(function (c) {
        var url = amb.url_publica + "&email=" + encodeURIComponent(c.email);
        return (
          "<li><strong>" +
          escapeHtml(c.email) +
          '</strong> — <a href="' +
          escapeHtml(url) +
          '" target="_blank" rel="noopener">Abrir formulário</a></li>'
        );
      })
      .join("");
    box.innerHTML =
      '<div class="ahp-recommendation">' +
      '<div class="ahp-recommendation__head"><i class="fas fa-circle-check"></i><strong>Ambiente configurado</strong></div>' +
      "<p><strong>Status:</strong> " +
      escapeHtml(amb.status) +
      " · <strong>Respostas:</strong> " +
      (amb.total_respostas || 0) +
      " · <strong>Válido até:</strong> " +
      escapeHtml(amb.valido_ate) +
      "</p>" +
      "<p><strong>Link base:</strong> <code>" +
      escapeHtml(amb.url_publica) +
      "</code></p>" +
      "<ul class=\"info-list\">" +
      links +
      "</ul>" +
      '<p class="form-help">Após receber respostas consistentes, avance para a Etapa 5 para consolidar os valores finais.</p>' +
      '<div class="ahp-form-actions"><a href="step5-comparacao.html" class="btn btn-primary">Ir para consolidação (Etapa 5)<i class="fas fa-arrow-right c-btn__icon c-btn__icon--right"></i></a></div>' +
      "</div>";
    try {
      localStorage.setItem(AMBIENTE_KEY, JSON.stringify({ id: amb.id, token: amb.token }));
    } catch (_e) {
      /* ignore */
    }
  }

  function loadAmbienteStatus() {
    var cfg = getConfigAtual();
    var box = el("collab-status-content");
    if (!cfg || !global.SLTColaborativaApi) {
      if (box) box.innerHTML = "<p>Selecione uma configuração na Etapa 2 para configurar o ambiente colaborativo.</p>";
      return;
    }
    global.SLTColaborativaApi.obterAmbienteConfig(cfg.tipo, cfg.codigo)
      .then(renderAmbienteStatus)
      .catch(function () {
        if (box) box.innerHTML = "<p>Nenhum ambiente colaborativo configurado ainda.</p>";
      });
  }

  function confirmarAmbienteColaborativo() {
    var cfg = getConfigAtual();
    if (!cfg) {
      setCollabFeedback("Carregue a configuração da Fase 1 na Etapa 2.", "error");
      return;
    }
    var emails = parseEmails(el("collab-emails") && el("collab-emails").value);
    var ate = el("collab-deadline") && el("collab-deadline").value;
    if (!emails.length) {
      setCollabFeedback("Informe ao menos um e-mail de participante.", "error");
      return;
    }
    if (!ate) {
      setCollabFeedback("Informe a data limite de preenchimento.", "error");
      return;
    }
    setCollabFeedback("Configurando ambiente…", "info");
    global.SLTColaborativaApi.criarAmbiente({
      tipo: cfg.tipo,
      codigo: cfg.codigo,
      convites: emails.map(function (e) {
        return { email: e };
      }),
      valido_ate: new Date(ate).toISOString(),
    })
      .then(function (amb) {
        setCollabFeedback("Ambiente configurado com sucesso.", "success");
        renderAmbienteStatus(amb);
        selectFillMode("collaborative");
      })
      .catch(function (err) {
        setCollabFeedback(err.message || String(err), "error");
      });
  }

  global.selectFillMode = selectFillMode;
  global.selectMethod = selectMethod;
  global.confirmarAmbienteColaborativo = confirmarAmbienteColaborativo;

  document.addEventListener("DOMContentLoaded", function () {
    var saved = getFillMode();
    var radio = document.querySelector('input[name="fill-mode"][value="' + saved + '"]');
    if (radio) radio.checked = true;
    refreshSections();
    var savedMethod = localStorage.getItem("ahp_chosenMethod") || "form";
    highlightStrategy(savedMethod === "matrix" ? "matrix" : "form");
  });
})(window);
