/**
 * Etapa 4 — método de preenchimento (individual / colaborativo) e estratégia.
 */
(function (global) {
  "use strict";

  var FILL_KEY = "ahp_fillMode";
  var AMBIENTE_KEY = "slt_ahp_collab_ambiente";
  var CONFIG_KEY = "slt_ahp_config_atual";
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

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
    return localStorage.getItem(FILL_KEY) || "";
  }

  function setFillMode(mode) {
    localStorage.setItem(FILL_KEY, mode);
    refreshSections();
  }

  function getChosenMethod() {
    return localStorage.getItem("ahp_chosenMethod") || "form";
  }

  function refreshSections() {
    var mode = getFillMode();
    var strategy = el("estrategia-section");
    var collabSection = el("collab-section");
    var isCollab = mode === "collaborative";
    var isIndividual = mode === "individual";

    // Estratégia sempre visível; apenas cards individuais são bloqueados/desbloqueados
    // if (strategy) strategy.classList.toggle("is-hidden", !mode);

    // Marca visualmente o card de método selecionado
    document.querySelectorAll('input[name="fill-mode"]').forEach(function (radio) {
      var card = radio.closest(".ahp-method-card");
      if (card) card.classList.toggle("is-selected", radio.checked);
    });

    // Individual: ambas as estratégias disponíveis; Colaborativo: apenas formulário
    document.querySelectorAll("[data-strategy]").forEach(function (card) {
      var m = card.getAttribute("data-strategy");
      var locked = isCollab && m !== "form";
      card.classList.toggle("is-locked", locked);
      if (locked) card.classList.remove("is-selected");
    });

    if (isCollab) {
      localStorage.setItem("ahp_chosenMethod", "form");
      highlightStrategy("form");
    }

    // Ambiente colaborativo visível apenas se modo colaborativo
    if (collabSection) collabSection.classList.toggle("is-hidden", !isCollab);
    if (isCollab) loadAmbienteStatus();
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
    refreshSections();
  }

  function getAmbienteConfigurado() {
    try {
      var raw = localStorage.getItem(AMBIENTE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      return parsed && parsed.id ? parsed : null;
    } catch (_e) {
      return null;
    }
  }

  function continueStep4() {
    var mode = getFillMode();
    var method = getChosenMethod();

    if (!mode) {
      global.alert("Selecione o método de preenchimento antes de continuar.");
      return;
    }

    if (!method) {
      global.alert("Selecione a estratégia de preenchimento antes de continuar.");
      return;
    }

    if (mode === "collaborative") {
      if (method !== "form") {
        setCollabFeedback("No modo colaborativo, a estratégia deve ser Formulário Assistido.", "error");
        return;
      }
      if (!getAmbienteConfigurado()) {
        setCollabFeedback("Confirme o ambiente colaborativo antes de continuar.", "error");
        return;
      }
    }

    localStorage.setItem("ahp_chosenMethod", method === "matrix" ? "matrix" : "form");

    if (global.SLTAhpNav && global.SLTAhpNav.irPara) {
      global.SLTAhpNav.irPara("step5-comparacao.html");
    } else {
      global.location.href = "step5-comparacao.html";
    }
  }

  function normalizeEmail(email) {
    return String(email || "").trim().toLowerCase();
  }

  function parseEmails(text) {
    return String(text || "")
      .split(/[\n,;]+/)
      .map(normalizeEmail)
      .filter(Boolean);
  }

  function isValidEmail(email) {
    return EMAIL_RE.test(normalizeEmail(email));
  }

  function formatDeadlineLabel(localDateTimeValue) {
    if (!localDateTimeValue) return "—";
    var d = new Date(localDateTimeValue);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleString("pt-BR");
  }

  function toIsoDateTime(localDateTimeValue) {
    if (!localDateTimeValue) return "";
    var d = new Date(localDateTimeValue);
    if (isNaN(d.getTime())) return "";
    return d.toISOString();
  }

  function getCollaboratorRows() {
    return Array.from(document.querySelectorAll("#collab-email-list tr[data-email]"))
      .map(function (row) {
        return {
          email: normalizeEmail(row.getAttribute("data-email")),
          deadlineIso: String(row.getAttribute("data-deadline") || ""),
          deadlineLabel: String(row.getAttribute("data-deadline-label") || "—"),
        };
      })
      .filter(function (item) {
        return !!item.email;
      });
  }

  function getCollaboratorEmails() {
    return getCollaboratorRows().map(function (item) {
      return item.email;
    });
  }

  function updateDeleteBtn() {
    var btn = el("collab-delete-btn");
    if (!btn) return;
    var checked = document.querySelectorAll(".collab-row-chk:checked").length;
    var total = document.querySelectorAll(".collab-row-chk").length;
    btn.disabled = checked === 0;

    var selectAll = el("collab-select-all");
    if (selectAll) {
      selectAll.checked = total > 0 && checked === total;
      selectAll.indeterminate = checked > 0 && checked < total;
    }
  }

  function deleteSelectedCollaborators() {
    var checked = Array.from(document.querySelectorAll(".collab-row-chk:checked"));
    if (!checked.length) return;
    var emailsToRemove = checked.map(function (chk) {
      return normalizeEmail(chk.closest("tr").getAttribute("data-email"));
    });
    var remaining = getCollaboratorRows().filter(function (item) {
      return emailsToRemove.indexOf(normalizeEmail(item.email)) === -1;
    });
    renderCollaboratorList(remaining);
    var selectAll = el("collab-select-all");
    if (selectAll) { selectAll.checked = false; selectAll.indeterminate = false; }
    updateDeleteBtn();
  }
  global.deleteSelectedCollaborators = deleteSelectedCollaborators;

  function renderCollaboratorList(rows, opts) {
    opts = opts || {};
    var newEmails = opts.newEmails || [];
    var body = el("collab-email-list");
    if (!body) return;
    body.innerHTML = "";

    if (!rows.length) {
      var emptyRow = document.createElement("tr");
      emptyRow.className = "ahp-collab-row-empty";
      var emptyCell = document.createElement("td");
      emptyCell.colSpan = 4;
      emptyCell.textContent = "Nenhum colaborador adicionado.";
      emptyRow.appendChild(emptyCell);
      body.appendChild(emptyRow);
      updateDeleteBtn();
      return;
    }

    rows.forEach(function (item, idx) {
      var email = normalizeEmail(item.email);
      var deadlineIso = String(item.deadlineIso || "");
      var deadlineLabel = String(item.deadlineLabel || "—");

      var row = document.createElement("tr");
      row.setAttribute("data-email", email);
      row.setAttribute("data-deadline", deadlineIso);
      row.setAttribute("data-deadline-label", deadlineLabel);
      row.classList.add("ahp-collab-row-valid");
      if (newEmails.indexOf(email) !== -1) {
        row.classList.add("ahp-collab-row-new");
      }

      var chkCell = document.createElement("td");
      chkCell.className = "ahp-collab-chk-col";
      var chk = document.createElement("input");
      chk.type = "checkbox";
      chk.className = "collab-row-chk";
      chk.setAttribute("aria-label", "Selecionar " + email);
      chk.addEventListener("change", updateDeleteBtn);
      chkCell.appendChild(chk);

      var colabCell = document.createElement("td");
      colabCell.textContent = "Colaborador " + (idx + 1);

      var emailCell = document.createElement("td");
      emailCell.innerHTML =
        '<span class="ahp-collab-valid-dot" aria-hidden="true">●</span> ' +
        escapeHtml(email);

      var deadlineCell = document.createElement("td");
      deadlineCell.textContent = deadlineLabel;

      row.appendChild(chkCell);
      row.appendChild(colabCell);
      row.appendChild(emailCell);
      row.appendChild(deadlineCell);
      body.appendChild(row);
    });

    // select-all
    var selectAll = el("collab-select-all");
    if (selectAll) {
      selectAll.checked = false;
      selectAll.indeterminate = false;
      selectAll.onchange = function () {
        document.querySelectorAll(".collab-row-chk").forEach(function (c) {
          c.checked = selectAll.checked;
        });
        updateDeleteBtn();
      };
    }
    updateDeleteBtn();
  }

  function adicionarColaboradorEmail() {
    var input = el("collab-email-input");
    var deadlineInput = el("collab-deadline");
    if (!input) return;

    var deadlineValue = deadlineInput ? String(deadlineInput.value || "") : "";
    if (!deadlineValue) {
      setCollabFeedback("Informe a data limite antes de adicionar colaboradores.", "error");
      if (deadlineInput) deadlineInput.focus();
      return;
    }

    var deadlineIso = toIsoDateTime(deadlineValue);
    var deadlineLabel = formatDeadlineLabel(deadlineValue);
    if (!deadlineIso || deadlineLabel === "—") {
      setCollabFeedback("A data limite informada é inválida.", "error");
      if (deadlineInput) deadlineInput.focus();
      return;
    }

    var raw = input.value;
    var batch = parseEmails(raw);
    if (!batch.length) {
      setCollabFeedback("Informe ao menos um e-mail para adicionar à lista.", "error");
      input.focus();
      return;
    }

    var invalids = batch.filter(function (email) {
      return !isValidEmail(email);
    });
    if (invalids.length) {
      setCollabFeedback("E-mail(s) inválido(s): " + invalids.join(", "), "error");
      input.focus();
      return;
    }

    var rows = getCollaboratorRows();
    var existingEmails = rows.map(function (item) {
      return item.email;
    });
    var added = 0;
    var addedEmails = [];
    batch.forEach(function (email) {
      if (existingEmails.indexOf(email) === -1) {
        rows.push({
          email: email,
          deadlineIso: deadlineIso,
          deadlineLabel: deadlineLabel,
        });
        existingEmails.push(email);
        added += 1;
        addedEmails.push(email);
      }
    });

    if (!added) {
      setCollabFeedback("Os e-mails informados já constam na lista.", "info");
      input.value = "";
      input.focus();
      return;
    }

    renderCollaboratorList(rows, { newEmails: addedEmails });
    input.value = "";
    setCollabFeedback(added + " colaborador(es) adicionado(s) à lista.", "success");
    input.focus();
  }

  function mensagemPadraoConvite(urlPublica, validadeTexto) {
    var textoValidade = validadeTexto ? " até " + validadeTexto : "";
    return [
      "Olá, colaborador(a)!",
      "",
      "Você foi convidado(a) a preencher a matriz de comparação pareada da análise AHP no SAD.",
      "Acesse o formulário colaborativo pelo link abaixo" + textoValidade + ":",
      urlPublica || "(link indisponível)",
      "",
      "Atenção: para enviar a resposta, a consistência (RC) deve ser menor que 0,10.",
      "",
      "Atenciosamente,",
      "Equipe SAD/SLT",
    ].join("\n");
  }

  function renderEmailDraft(amb) {
    var card = el("collab-email-draft-card");
    var textarea = el("collab-email-template");
    if (!card || !textarea || !amb) return;
    textarea.value = mensagemPadraoConvite(amb.url_publica, amb.valido_ate);
    card.classList.remove("is-hidden");
  }

  function abrirAplicativoEmailColaborativo() {
    var rows = getCollaboratorRows();
    if (!rows.length) {
      setCollabFeedback("Adicione ao menos um colaborador para abrir o e-mail.", "error");
      return;
    }
    var recipients = rows.map(function (item) {
      return item.email;
    });
    var template = el("collab-email-template");
    var body = template ? template.value : "";
    var subject = "Convite para preenchimento colaborativo AHP (SAD/SLT)";
    global.location.href =
      "mailto:" +
      recipients.join(",") +
      "?subject=" +
      encodeURIComponent(subject) +
      "&body=" +
      encodeURIComponent(body);
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
    if (amb.convites && amb.convites.length) {
      renderCollaboratorList(
        amb.convites.map(function (c) {
          return {
            email: normalizeEmail(c.email),
            deadlineIso: String(amb.valido_ate || ""),
            deadlineLabel: formatDeadlineLabel(amb.valido_ate),
          };
        })
      );
    }
    renderEmailDraft(amb);
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
    var rows = getCollaboratorRows();
    var emails = rows.map(function (item) {
      return item.email;
    });
    var ate = rows[0] && rows[0].deadlineIso ? rows[0].deadlineIso : "";
    if (!emails.length) {
      setCollabFeedback("Adicione ao menos um e-mail na lista de colaboradores.", "error");
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
      valido_ate: ate,
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
  global.continueStep4 = continueStep4;

  document.addEventListener("DOMContentLoaded", function () {
    // Sempre inicia limpo — sem seleção prévia salva
    localStorage.removeItem(FILL_KEY);
    localStorage.removeItem("ahp_chosenMethod");

    document.querySelectorAll('input[name="fill-mode"]').forEach(function (r) {
      r.checked = false;
    });
    document.querySelectorAll("[data-strategy]").forEach(function (c) {
      c.classList.remove("is-selected", "is-locked");
    });

    refreshSections();
    renderCollaboratorList([]);

    var emailInput = el("collab-email-input");
    var addEmailBtn = el("collab-add-email-btn");
    var confirmBtn = el("collab-confirm-btn");
    var openMailBtn = el("collab-open-mail-btn");
    var continueBtn = el("step4-continue-btn");

    if (addEmailBtn) {
      addEmailBtn.addEventListener("click", adicionarColaboradorEmail);
    }
    if (confirmBtn) {
      confirmBtn.addEventListener("click", confirmarAmbienteColaborativo);
    }
    if (openMailBtn) {
      openMailBtn.addEventListener("click", abrirAplicativoEmailColaborativo);
    }
    if (continueBtn) {
      continueBtn.addEventListener("click", continueStep4);
    }

    if (emailInput) {
      emailInput.addEventListener("keydown", function (ev) {
        if (ev.key === "Enter") {
          ev.preventDefault();
          adicionarColaboradorEmail();
        }
      });
    }

    var savedMethod = getChosenMethod();
    highlightStrategy(savedMethod === "matrix" ? "matrix" : "form");
  });
})(window);
