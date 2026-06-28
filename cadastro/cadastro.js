(function () {
  const EIXO_TIC = "EIXO-PEF-02";
  const PLANO_PLI = "PLANO-PLI";
  const PLANO_PEF = "PLANO-PEF";

  const PROGRAMA_STEP_EXECUCAO_SUSPENDED = 5; // Oculta até revisão do cliente; reativar e renumerar seções depois.

  let classificacaoRef = null;
  let instituicoes = [];
  let pessoas = [];
  let programasCache = [];
  let planosCache = [];
  let plAbr = null;
  let pgAbr = null;
  let currentProjetoStep = 1;
  let currentProgramaStep = 1;
  let projetoMaxRevealed = 1;
  let programaMaxRevealed = 1;
  let parentConstraintLoadId = 0;
  let programaRegionalidades = null;

  const TERRITORIO_TIPO_NOME = {
    municipio: "Município",
    regiao_governo: "Região de Governo",
    regiao_administrativa: "Região Administrativa",
    regiao_metropolitana: "Região Metropolitana",
    ugrhi: "Unidade de Gerenciamento de Recursos Hídricos",
    zona_zee: "Zona de Gestão do Zoneamento Ecológico-Econômico (ZEE-SP)",
  };

  const ENQUADRAMENTO_PRINCIPAL_LABEL = {
    municipio: "Município",
    regiao_governo: "Região de Governo",
    regiao_administrativa: "Região Administrativa",
    regiao_metropolitana: "Região Metropolitana",
    ugrhi: "Unidade de Gerenciamento de Recursos Hídricos",
    zona_zee: "Zona de Gestão do Zoneamento Ecológico-Econômico (ZEE-SP)",
  };

  const ENQUADRAMENTO_REGIONAL_LABEL = {
    municipio: "Enquadramento municipal",
    regiao_governo: "Enquadramento regional de governo (Região de Governo)",
    regiao_administrativa: "Enquadramento regional administrativo (Região Administrativa)",
    regiao_metropolitana: "Enquadramento regional metropolitano (Região Metropolitana)",
    ugrhi:
      "Enquadramento regional hídrico (Unidade de Gerenciamento de Recursos Hídricos)",
    zona_zee:
      "Enquadramento regional ecológico-econômico (Zona de Gestão ZEE-SP)",
  };

  const PROJETO_TIPOS_ORDEM = [
    "municipio",
    "regiao_governo",
    "regiao_administrativa",
    "regiao_metropolitana",
    "ugrhi",
    "zona_zee",
  ];

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  function cadastroSectionIcon(titleText) {
    const t = (titleText || "").toLowerCase();
    if (t.includes("nova demanda")) return "fa-layer-group";
    if (t.includes("informações") || t.includes("informacoes")) return "fa-file-lines";
    if (t.includes("contexto institucional")) return "fa-sitemap";
    if (t.includes("proponente")) return "fa-id-card";
    if (t.includes("complemento")) return "fa-sliders";
    if (t.includes("localização") || t.includes("localizacao")) return "fa-location-dot";
    if (
      t.includes("vigência") ||
      t.includes("vigencia") ||
      t.includes("execução") ||
      t.includes("execucao")
    ) {
      return "fa-calendar-days";
    }
    if (t.includes("abrangência") || t.includes("abrangencia")) return "fa-map";
    if (t.includes("classificação") || t.includes("classificacao")) return "fa-tags";
    if (t.includes("enquadramento territorial principal")) return "fa-map";
    if (t.includes("outros enquadramentos")) return "fa-map-location-dot";
    return "fa-folder-open";
  }

  function reviewSectionHeader(title, iconClass) {
    const icon = iconClass || cadastroSectionIcon(title);
    return `<div class="review-section-label"><i class="fas ${icon}" aria-hidden="true"></i><span class="review-section-title">${escapeHtml(title)}</span></div>`;
  }

  function cadastroSectionTitleText(h2) {
    return (
      h2.querySelector("[data-section-title]")?.textContent?.trim() ||
      h2.textContent.replace(/\s+/g, " ").trim()
    );
  }

  function findCadastroSectionNumEl(sec) {
    return (
      sec.querySelector(":scope > .cadastro-section-label .cadastro-sec-num") ||
      sec.querySelector(".cadastro-section-label.collapsible-hdr .cadastro-sec-num") ||
      sec.querySelector(":scope > h2 .cadastro-sec-num") ||
      sec.querySelector(".collapsible-hdr .cadastro-sec-num")
    );
  }

  function initCadastroSectionCards() {
    document.querySelectorAll(".cadastro-page .card").forEach((card) => {
      if (card.dataset.sectionCardReady) return;

      const collapsibleHdr = card.querySelector(":scope > .collapsible-hdr");
      const h2 = collapsibleHdr?.querySelector("h2") || card.querySelector(":scope > h2");
      if (!h2) return;

      card.dataset.sectionCardReady = "1";
      card.classList.add("cadastro-card");

      const label = document.createElement("div");
      label.className = "cadastro-section-label";
      if (collapsibleHdr) {
        label.classList.add("collapsible-hdr");
        if (collapsibleHdr.id) label.id = collapsibleHdr.id;
      }

      const icon = document.createElement("i");
      icon.className = `fas ${cadastroSectionIcon(cadastroSectionTitleText(h2))}`;
      icon.setAttribute("aria-hidden", "true");

      const titleSpan = document.createElement("span");
      titleSpan.className = "cadastro-section-title";
      titleSpan.innerHTML = h2.innerHTML;

      label.appendChild(icon);
      label.appendChild(titleSpan);

      if (collapsibleHdr) {
        const toggle = collapsibleHdr.querySelector("span[aria-hidden]");
        if (toggle) {
          toggle.classList.add("collapsible-toggle");
          label.appendChild(toggle);
        }
        collapsibleHdr.replaceWith(label);
      } else {
        h2.replaceWith(label);
      }

      const body = document.createElement("div");
      body.className = "cadastro-section-body";
      [...card.childNodes].forEach((node) => {
        if (node !== label) body.appendChild(node);
      });
      card.appendChild(body);
    });
  }

  function showToast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    setTimeout(() => t.classList.remove("show"), 3200);
  }

  const FIELD_FILLED_SELECTOR =
    "select, textarea, input:not([type=radio]):not([type=checkbox]):not([type=file]):not([type=hidden]):not([type=button]):not([type=submit]):not([type=reset])";

  function isFieldFilledSyncTarget(el) {
    return Boolean(el?.matches?.(FIELD_FILLED_SELECTOR));
  }

  /** Destaque visual compartilhado: seletores e campos de texto com valor preenchido. */
  function syncFieldFilledState(el) {
    if (!el) return;
    const value = String(el.value ?? "").trim();
    const filled =
      el.tagName === "SELECT"
        ? !el.disabled && value !== ""
        : value !== "";
    el.classList.toggle("field-filled", filled);
  }

  function syncFieldFilledStates(root) {
    const scope = root || document;
    scope.querySelectorAll(FIELD_FILLED_SELECTOR).forEach(syncFieldFilledState);
  }

  function initFieldFilledSync() {
    document.querySelectorAll("#form-cadastro, .tipo-form").forEach((form) => {
      const syncFromEvent = (e) => {
        if (isFieldFilledSyncTarget(e.target)) syncFieldFilledState(e.target);
      };
      form.addEventListener("change", syncFromEvent);
      form.addEventListener("input", syncFromEvent);
    });
    syncFieldFilledStates(document);
  }

  function fillSelect(el, items, valueKey, labelFn, placeholder) {
    el.innerHTML = "";
    if (placeholder) {
      const o = document.createElement("option");
      o.value = "";
      o.textContent = placeholder;
      el.appendChild(o);
    }
    items.forEach((item) => {
      const o = document.createElement("option");
      o.value = item[valueKey];
      o.textContent = labelFn(item);
      el.appendChild(o);
    });
    syncFieldFilledState(el);
  }

  function renumberCadastroSections(formEl, vinculoActive) {
    if (!formEl) return;
    let n = 1;
    formEl.querySelectorAll(".cadastro-section").forEach((sec) => {
      if (sec.classList.contains("cadastro-section--vinculo") && !vinculoActive) return;
      if (sec.classList.contains("cadastro-section--suspended")) return;
      const numEl = findCadastroSectionNumEl(sec);
      if (numEl) numEl.textContent = String(n);
      sec.querySelectorAll(".form-subsection").forEach((sub, idx) => {
        const sn = sub.querySelector(".cadastro-subsec-num");
        if (sn) sn.textContent = `${n}.${idx + 1}`;
      });
      n += 1;
    });
  }

  function renumberProgramaSections() {
    renumberCadastroSections($("#form-programa"), isPgVinculoAtivo());
    const step4 = $("#form-programa")?.querySelector('.pg-step-panel[data-step="4"]');
    const secNum = step4?.querySelector(".cadastro-sec-num")?.textContent;
    if (secNum && pgAbr?.setSubsectionNumbers) pgAbr.setSubsectionNumbers(Number(secNum));
  }

  function renumberProjetoSections() {
    const form = $("#form-cadastro");
    if (!form) return;
    let n = 1;
    [1, 2, 3, 4, 5].forEach((stepNum) => {
      const panel = form.querySelector(`.step-panel[data-step="${stepNum}"]`);
      if (!panel?.classList.contains("cadastro-section")) return;
      if (stepNum === 2 && !isPjVinculoAtivo()) return;
      const numEl = findCadastroSectionNumEl(panel);
      if (numEl) numEl.textContent = String(n);
      let subIdx = 0;
      panel.querySelectorAll(":scope > .form-subsection").forEach((sub) => {
        subIdx += 1;
        const sn = sub.querySelector(".cadastro-subsec-num");
        if (sn) sn.textContent = `${n}.${subIdx}`;
      });
      n += 1;
    });
    const enq = $("#pj-enquadramento-catalogo");
    if (enq) enq.classList.toggle("hidden", isPjVinculoAtivo());
  }

  function getNextProjetoStep(from) {
    if (from === 1) return isPjVinculoAtivo() ? 2 : 3;
    return from + 1;
  }

  function getPrevProjetoStep(from) {
    if (from === 3) return isPjVinculoAtivo() ? 2 : 1;
    return from - 1;
  }

  function scrollToProgramaStep(n) {
    $("#form-programa")
      ?.querySelector(`.pg-step-panel[data-step="${n}"]`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function scrollToProjetoStep(n) {
    $("#form-cadastro")
      ?.querySelector(`.step-panel[data-step="${n}"]`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function syncWizardPanelA11y(panel, visible) {
    panel.classList.toggle("hidden", !visible);
    panel.inert = !visible;
    panel.removeAttribute("aria-hidden");
    if (visible) panel.hidden = false;
  }

  function syncProgramaPanelsVisibility() {
    const form = $("#form-programa");
    if (!form) return;
    const vinculo = isPgVinculoAtivo();
    form.querySelectorAll(".pg-step-panel").forEach((p) => {
      const s = Number(p.dataset.step);
      if (s === 1) {
        syncWizardPanelA11y(p, true);
        return;
      }
      if (s === 2) {
        syncWizardPanelA11y(p, vinculo && programaMaxRevealed >= 2);
        return;
      }
      if (s === PROGRAMA_STEP_EXECUCAO_SUSPENDED) {
        syncWizardPanelA11y(p, false);
        p.hidden = true;
        return;
      }
      syncWizardPanelA11y(p, programaMaxRevealed >= s);
    });
    renumberProgramaSections();
  }

  function syncProjetoPanelsVisibility() {
    const form = $("#form-cadastro");
    if (!form) return;
    const vinculo = isPjVinculoAtivo();
    form.querySelectorAll(".step-panel").forEach((p) => {
      const s = Number(p.dataset.step);
      if (s === 1) {
        syncWizardPanelA11y(p, true);
        return;
      }
      if (s === 2) {
        syncWizardPanelA11y(p, vinculo && projetoMaxRevealed >= 2);
        return;
      }
      syncWizardPanelA11y(p, projetoMaxRevealed >= s);
    });
    renumberProjetoSections();
  }

  function revealProgramaStep(n) {
    programaMaxRevealed = Math.max(programaMaxRevealed, n);
    currentProgramaStep = n;
    syncProgramaPanelsVisibility();
    if (n === 4 && pgAbr) {
      setTimeout(() => {
        pgAbr.invalidateSize();
        renderProgramaReview();
      }, 120);
    }
    scrollToProgramaStep(n);
  }

  function revealProjetoStep(n) {
    projetoMaxRevealed = Math.max(projetoMaxRevealed, n);
    currentProjetoStep = n;
    syncProjetoPanelsVisibility();
    if (n === 5) {
      setTimeout(() => {
        SLTGeometria.invalidateSize();
        renderReview();
      }, 120);
    } else if (n >= 4) {
      renderReview();
    }
    scrollToProjetoStep(n);
  }

  function resetProgramaWizard() {
    programaMaxRevealed = 1;
    currentProgramaStep = 1;
    $$('input[name="pg-vinculo"]').forEach((el) => {
      el.checked = false;
    });
    syncProgramaPanelsVisibility();
  }

  function resetProjetoWizard() {
    projetoMaxRevealed = 1;
    currentProjetoStep = 1;
    $$('input[name="pj-vinculo"]').forEach((el) => {
      el.checked = false;
    });
    syncProjetoPanelsVisibility();
  }

  function getNextProgramaStep(from) {
    if (from === 1) return isPgVinculoAtivo() ? 2 : 3;
    if (from === 3) return 4;
    return from + 1;
  }

  function getPrevProgramaStep(from) {
    if (from === 4) return 3;
    if (from === 3) return isPgVinculoAtivo() ? 2 : 1;
    return from - 1;
  }

  function validateProgramaStep(step) {
    if (step === 1) {
      if (!$("#pg-nome").value.trim() || !$("#pg-descricao").value.trim()) {
        showToast("Preencha nome e descrição do programa.");
        return false;
      }
      if (!document.querySelector('input[name="pg-vinculo"]:checked')) {
        showToast("Informe se o programa possui vínculo institucional.");
        return false;
      }
      return true;
    }
    if (step === 2) {
      if (isPgVinculoAtivo() && !$("#pg-plano").value) {
        showToast("Selecione o plano de referência estratégica.");
        return false;
      }
      return true;
    }
    if (step === 3) {
      if (!$("#pg-instituicao").value) {
        showToast("Selecione a instituição interessada.");
        return false;
      }
      if (!$("#pg-representante").value) {
        showToast("Selecione o representante legal.");
        return false;
      }
      return true;
    }
    if (step === 4) {
      const unidades = pgAbr?.getSelectedIds() || [];
      if (!unidades.length) {
        showToast("Selecione ao menos uma unidade de abrangência.");
        return false;
      }
    }
    return true;
  }

  function getGeometria() {
    return SLTGeometria.getGeometria();
  }

  function getCoordenadas() {
    return SLTGeometria.getCoordenadas();
  }

  function escapeHtml(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function labelById(list, id, labelKey) {
    if (!id) return "—";
    const item = (list || []).find((x) => x.id === id);
    return item ? item[labelKey || "nome_oficial"] || item.nome : id;
  }

  function renderInheritedBlock(container, rows, linksHtml) {
    if (!container) return;
    if (!rows.length) {
      container.classList.add("hidden");
      container.innerHTML = "";
      return;
    }
    const dl = rows
      .map(
        (r) =>
          `<dt>${escapeHtml(r.label)}</dt><dd>${r.html != null ? r.html : escapeHtml(r.value || "—")}</dd>`
      )
      .join("");
    container.innerHTML = `<dl>${dl}</dl>${linksHtml || ""}`;
    container.classList.remove("hidden");
  }

  function getSelectedPrograma() {
    const id = $("#programa").value;
    return programasCache.find((p) => p.id === id) || null;
  }

  function isPgVinculoAtivo() {
    return document.querySelector('input[name="pg-vinculo"]:checked')?.value === "sim";
  }

  function isPjVinculoAtivo() {
    return document.querySelector('input[name="pj-vinculo"]:checked')?.value === "sim";
  }

  function setPgVinculo(ativo) {
    const el = document.querySelector(`input[name="pg-vinculo"][value="${ativo ? "sim" : "nao"}"]`);
    if (el) el.checked = true;
  }

  function setPjVinculo(ativo) {
    const el = document.querySelector(`input[name="pj-vinculo"][value="${ativo ? "sim" : "nao"}"]`);
    if (el) el.checked = true;
  }

  function onPgVinculoChoice() {
    const val = document.querySelector('input[name="pg-vinculo"]:checked')?.value;
    if (!val) return;
    updatePgVinculoPanel();
    renumberProgramaSections();
    renderProgramaReview();
  }

  function onPjVinculoChoice() {
    const val = document.querySelector('input[name="pj-vinculo"]:checked')?.value;
    if (!val) return;
    updatePjVinculoPanel();
    renumberProjetoSections();
  }

  function getPjVinculoTipo() {
    return document.querySelector('input[name="pj-vinculo-tipo"]:checked')?.value || "programa";
  }

  function getProjetoPlanoId() {
    if (isPjVinculoAtivo()) {
      if (getPjVinculoTipo() === "plano") {
        return $("#pj-plano-vinculo")?.value || null;
      }
      const prog = getSelectedPrograma();
      return prog?.plano_codigo || null;
    }
    return $("#cls-plano")?.value || null;
  }

  function getProjetoDiretoriaId() {
    if (isPjVinculoAtivo()) {
      if (getPjVinculoTipo() === "plano") {
        const planoApi = planosCache.find((p) => p.id === $("#pj-plano-vinculo")?.value);
        return planoApi?.diretoria_id || null;
      }
      const prog = getSelectedPrograma();
      return prog?.diretoria_id || null;
    }
    return $("#cls-diretoria")?.value || null;
  }

  function updatePgVinculoPanel() {
    const active = isPgVinculoAtivo();
    const sel = $("#pg-plano");
    if (!sel) return;
    if (!active) {
      sel.value = "";
      sel.required = false;
      sel.disabled = true;
      syncFieldFilledState(sel);
      updateProgramaStrategicContext();
      syncProgramaPanelsVisibility();
      loadParentSpatialConstraint(null);
      return;
    }
    sel.disabled = planosCache.length === 0;
    sel.required = true;
    syncFieldFilledState(sel);
    syncProgramaPanelsVisibility();
  }

  function updatePjVinculoPanel() {
    const active = isPjVinculoAtivo();
    const tipo = getPjVinculoTipo();
    $("#pj-bloco-programa")?.classList.toggle("hidden", tipo !== "programa");
    $("#pj-bloco-plano")?.classList.toggle("hidden", tipo !== "plano");

    const progSel = $("#programa");
    const planoSel = $("#pj-plano-vinculo");

    if (!active) {
      if (progSel) {
        progSel.value = "";
        progSel.required = false;
        progSel.disabled = true;
      }
      if (planoSel) {
        planoSel.value = "";
        planoSel.required = false;
        planoSel.disabled = true;
      }
      syncFieldFilledState(progSel);
      syncFieldFilledState(planoSel);
      updateProjetoStrategicContext();
      syncProjetoPanelsVisibility();
      loadParentSpatialConstraint(null);
      return;
    }

    if (tipo === "programa") {
      if (progSel) {
        progSel.disabled = programasCache.length === 0;
        progSel.required = true;
      }
      if (planoSel) {
        planoSel.value = "";
        planoSel.required = false;
        planoSel.disabled = true;
      }
    } else {
      if (planoSel) {
        planoSel.disabled = planosCache.length === 0;
        planoSel.required = true;
      }
      if (progSel) {
        progSel.value = "";
        progSel.required = false;
        progSel.disabled = true;
      }
    }
    syncFieldFilledState(progSel);
    syncFieldFilledState(planoSel);
    updateProjetoStrategicContext();
    syncProjetoPanelsVisibility();
  }

  function fillClsPlanosSelect(diretoriaId) {
    const cat = SLTCatalog.catalog;
    const planos = diretoriaId
      ? SLTCatalog.ativos(cat.planos).filter((p) => p.diretoria_id === diretoriaId)
      : [];
    fillSelect(
      $("#cls-plano"),
      planos,
      "id",
      (p) => `${p.sigla} — ${p.nome_oficial}`,
      "Selecione…"
    );
  }

  function initClsEnquadramento() {
    const cat = SLTCatalog.catalog;
    fillSelect(
      $("#cls-diretoria"),
      SLTCatalog.ativos(cat.diretorias),
      "id",
      (d) => d.nome_oficial,
      "Selecione…"
    );
    fillClsPlanosSelect("");
    $("#cls-diretoria")?.addEventListener("change", () => {
      fillClsPlanosSelect($("#cls-diretoria").value);
      const link = $("#cls-link-planos");
      if (link && $("#cls-diretoria").value) {
        link.href =
          "catalogo-planos.html?diretoria=" + encodeURIComponent($("#cls-diretoria").value);
      }
      updateClassificacaoUI();
    });
    $("#cls-plano")?.addEventListener("change", () => {
      updateClassificacaoUI();
      updateCarteiras();
    });
  }

  function validateStep(step) {
    if (step === 1) {
      if (!$("#nome").value.trim()) {
        showToast("Informe o nome do projeto.");
        return false;
      }
      if (!document.querySelector('input[name="pj-vinculo"]:checked')) {
        showToast("Informe se o projeto possui vínculo institucional.");
        return false;
      }
      return true;
    }

    if (step === 2) {
      if (!isPjVinculoAtivo()) return true;
      if (getPjVinculoTipo() === "programa" && !$("#programa").value) {
        showToast("Selecione o programa de referência estratégica.");
        return false;
      }
      if (getPjVinculoTipo() === "plano" && !$("#pj-plano-vinculo").value) {
        showToast("Selecione o plano de referência estratégica.");
        return false;
      }
      return true;
    }

    if (step === 3) {
      if (!$("#instituicao").value) {
        showToast("Selecione a instituição interessada.");
        return false;
      }
      if (!$("#representante").value) {
        showToast("Selecione o representante legal.");
        return false;
      }
      if (!isPjVinculoAtivo()) {
        if (!$("#cls-diretoria").value) {
          showToast("Selecione a diretoria de enquadramento.");
          return false;
        }
        if (!$("#cls-plano").value) {
          showToast("Selecione o plano de enquadramento.");
          return false;
        }
      }
      const planoId = getProjetoPlanoId();
      const plano = SLTCatalog.getPlano(planoId);
      if (plano?.id === PLANO_PLI && !$("#frente").value) {
        showToast("Selecione a frente de atuação.");
        return false;
      }
      if (plano?.id === PLANO_PEF && !$("#eixo").value) {
        showToast("Selecione o eixo ferroviário.");
        return false;
      }
      return true;
    }
    if (step === 4) return true;
    if (step === 5) {
      if (!getGeometria()) {
        $("#map-error").textContent = "Indique a localização por ponto ou perímetro no mapa.";
        $("#map-error").classList.remove("hidden");
        return false;
      }
      if (!SLTGeometria.hasLocalizacaoValida()) {
        $("#map-error").textContent = "Informe latitude e longitude válidas.";
        $("#map-error").classList.remove("hidden");
        return false;
      }
      const geom = getGeometria();
      $("#map-error").classList.add("hidden");
      renderReview();
      return true;
    }
    return true;
  }

  function ensureSpatialAcknowledgedForSubmit(context) {
    if (context === "programa") {
      if (pgAbr?.isOutsideParent?.() && !pgAbr.isSpatialAcknowledged()) {
        showToast("Marque a confirmação do aviso de abrangência fora do plano vinculado.");
        scrollToProgramaStep(4);
        return false;
      }
      return true;
    }
    if (SLTGeometria.isOutsideParent?.() && !SLTGeometria.isSpatialAcknowledged()) {
      showToast("Marque a confirmação do aviso de localização fora da abrangência vinculada.");
      scrollToProjetoStep(5);
      return false;
    }
    return true;
  }

  function onPlanoInstituicaoChange() {
    const inst = SLTSigmaRead.findInstituicao(instituicoes, $("#pl-instituicao").value);
    $("#pl-cnpj").value = inst ? SLTSigmaRead.cnpjDisplay(inst) : "";
    syncFieldFilledState($("#pl-cnpj"));
  }

  function onProgramaInstituicaoChange() {
    const inst = SLTSigmaRead.findInstituicao(instituicoes, $("#pg-instituicao").value);
    $("#pg-cnpj").value = inst ? SLTSigmaRead.cnpjDisplay(inst) : "";
    syncFieldFilledState($("#pg-cnpj"));
    renderProgramaReview();
  }

  function onInstituicaoChange() {
    const inst = SLTSigmaRead.findInstituicao(instituicoes, $("#instituicao").value);
    $("#cnpj").value = inst ? SLTSigmaRead.cnpjDisplay(inst) : "";
    syncFieldFilledState($("#cnpj"));
  }

  function onRepresentanteFieldChange(selectId, emailId, phoneId) {
    const p = SLTSigmaRead.findPessoa(pessoas, $(selectId).value);
    $(emailId).value = p?.email || "";
    $(phoneId).value = SLTSigmaRead.formatTelefone(p?.telefone);
    syncFieldFilledState($(emailId));
    syncFieldFilledState($(phoneId));
  }

  function onRepresentanteChange() {
    onRepresentanteFieldChange("#representante", "#rep_email", "#rep_telefone");
  }

  function buildRepresentantePayload(selectId, emailId, phoneId) {
    const pessoaId = $(selectId).value;
    const p = SLTSigmaRead.findPessoa(pessoas, pessoaId);
    return {
      pessoa_id: pessoaId || null,
      representante: {
        pessoa_id: pessoaId || null,
        nome: p ? SLTSigmaRead.labelPessoa(p) : "",
        email: $(emailId).value.trim() || null,
        telefone: $(phoneId).value.trim() || null,
      },
    };
  }

  function buildInstituicaoPayload(selectId, cnpjId) {
    const instId = $(selectId)?.value;
    const inst = SLTSigmaRead.findInstituicao(instituicoes, instId);
    return {
      instituicao_id: instId || null,
      instituicao_label: inst ? SLTSigmaRead.labelInstituicao(inst) : null,
      instituicao_cnpj: $(cnpjId)?.value?.trim() || (inst ? SLTSigmaRead.cnpjDisplay(inst) : null),
      instituicao_razao_social: inst?.razao_social || null,
      instituicao_nome_fantasia: inst?.nome_fantasia || inst?.nome || null,
    };
  }

  function fillInstituicaoSelects() {
    const placeholder = "Selecione a instituição interessada…";
    const targets = ["#instituicao", "#pl-instituicao", "#pg-instituicao"];
    targets.forEach((sel) => {
      const el = $(sel);
      if (!el) return;
      el.disabled = false;
      fillSelect(el, instituicoes, "id", (i) => SLTSigmaRead.labelInstituicao(i), placeholder);
    });
  }

  function fillRepresentanteSelects() {
    const placeholder = "Selecione o representante legal…";
    ["#representante", "#pl-representante", "#pg-representante"].forEach((sel) => {
      const el = $(sel);
      if (!el) return;
      el.disabled = false;
      fillSelect(el, pessoas, "id", (p) => SLTSigmaRead.labelPessoa(p), placeholder);
    });
  }

  async function loadSigmaCadastros() {
    const hint = $("#cadastro-load-hint");

    try {
      await SLTSigmaRead.checkApi();
    } catch (err) {
      hint.textContent = err.message;
    }

    try {
      instituicoes = await SLTSigmaRead.listInstituicoes();
      fillInstituicaoSelects();
      hint.textContent = "";
    } catch (err) {
      ["#instituicao", "#pl-instituicao", "#pg-instituicao"].forEach((sel) => {
        const el = $(sel);
        if (el) el.innerHTML = '<option value="">Não foi possível carregar instituições</option>';
      });
      hint.textContent = "Não foi possível carregar as instituições. Tente novamente em instantes.";
    }

    try {
      pessoas = await SLTSigmaRead.listPessoas();
      fillRepresentanteSelects();
    } catch (err) {
      ["#representante", "#pl-representante", "#pg-representante"].forEach((sel) => {
        const el = $(sel);
        if (el) el.innerHTML = '<option value="">Não foi possível carregar representantes</option>';
      });
      hint.textContent = hint.textContent || "Não foi possível carregar os representantes. Tente novamente em instantes.";
    }
  }

  function updateClassificacaoUI() {
    const planoId = getProjetoPlanoId();
    const plano = SLTCatalog.getPlano(planoId);
    const pli = $("#classificacao-pli");
    const pef = $("#classificacao-pef");
    const hint = $("#classificacao-hint");
    const enquadramento = $("#pj-enquadramento-catalogo");

    if (enquadramento) enquadramento.classList.toggle("hidden", isPjVinculoAtivo());
    renumberProjetoSections();

    pli.classList.add("hidden");
    pef.classList.add("hidden");
    hint.classList.add("hidden");

    if (!plano) {
      hint.classList.remove("hidden");
      return;
    }

    if (plano.id === PLANO_PLI) {
      pli.classList.remove("hidden");
      fillSelect($("#frente"), SLTCatalog.frentesPorPlano(planoId), "id", (f) => f.nome_oficial);
    } else if (plano.id === PLANO_PEF) {
      pef.classList.remove("hidden");
      fillSelect($("#eixo"), SLTCatalog.eixosPorPlano(planoId), "id", (e) => e.nome_oficial);
      onEixoChange();
    }
    updateClassificacaoHints();
  }

  function updateClassificacaoHints() {
    const hintFrente = $("#hint-frente");
    const hintEixo = $("#hint-eixo");
    const hintTic = $("#hint-tic");
    if (!classificacaoRef) return;

    const frenteId = $("#frente").value;
    if (frenteId) {
      const f = classificacaoRef.frentes_pli.find((x) => x.id === frenteId);
      hintFrente.innerHTML = f
        ? `<strong>${escapeHtml(f.nome)}</strong>${escapeHtml(f.descricao_oficial)}`
        : "";
      hintFrente.classList.toggle("hidden", !f);
    } else hintFrente.classList.add("hidden");

    const eixoId = $("#eixo").value;
    if (eixoId) {
      const e = classificacaoRef.eixos_pef.find((x) => x.id === eixoId);
      hintEixo.innerHTML = e ? `<strong>${escapeHtml(e.nome)}</strong>${escapeHtml(e.descricao)}` : "";
      hintEixo.classList.toggle("hidden", !e);
    } else hintEixo.classList.add("hidden");

    const ticId = $("#corredor_tic").value;
    if (ticId && classificacaoRef.corredores_tic) {
      const t = classificacaoRef.corredores_tic.find((x) => x.id === ticId);
      hintTic.innerHTML = t ? `<strong>${escapeHtml(t.nome)}</strong> ${escapeHtml(t.ligacao)}` : "";
      hintTic.classList.toggle("hidden", !t);
    } else if (hintTic) hintTic.classList.add("hidden");
  }

  function onEixoChange() {
    const eixoId = $("#eixo").value;
    const bloco = $("#bloco-tic");
    const sel = $("#corredor_tic");
    if (eixoId === EIXO_TIC) {
      bloco.classList.remove("hidden");
      fillSelect(sel, SLTCatalog.ticsPorEixo(eixoId), "id", (t) => t.nome_oficial, "— Não especificado —");
    } else {
      bloco.classList.add("hidden");
      sel.innerHTML = '<option value="">— Não especificado —</option>';
    }
    updateClassificacaoHints();
  }

  function updateCarteiras() {
    const planoId = getProjetoPlanoId();
    const items = planoId ? SLTCatalog.carteirasPorPlano(planoId) : [];
    fillSelect($("#carteira"), items, "id", (c) => c.nome, "— Opcional —");
  }

  function buildPlanoCatalogLinks(planoId, diretoriaId) {
    const dirLink = diretoriaId
      ? `<a class="link-catalogo" href="catalogo-diretorias.html#${encodeURIComponent(diretoriaId)}" target="_blank" rel="noopener">Critérios da diretoria ↗</a>`
      : "";
    const planoLink = planoId
      ? `<a class="link-catalogo" href="catalogo-planos.html?diretoria=${encodeURIComponent(diretoriaId || "")}#${encodeURIComponent(planoId)}" target="_blank" rel="noopener">Detalhes do plano ↗</a>`
      : "";
    const parts = [dirLink, planoLink].filter(Boolean);
    return parts.length
      ? `<div class="field-help-row inherited-links">${parts.join("")}</div>`
      : "";
  }

  function updateProgramaStrategicContext() {
    const planoCodigo = $("#pg-plano").value;
    const planoApi = planosCache.find((p) => p.id === planoCodigo);
    const planoCat = SLTCatalog.getPlano(planoCodigo);
    const cat = SLTCatalog.catalog;
    const dir = planoApi
      ? cat.diretorias.find((x) => x.id === planoApi.diretoria_id)
      : null;
    const block = $("#pg-contexto-estrategico");
    const empty = $("#pg-contexto-vazio");
    const linkPlanos = $("#pg-link-planos");

    if (linkPlanos && planoApi?.diretoria_id) {
      linkPlanos.href = "catalogo-planos.html?diretoria=" + encodeURIComponent(planoApi.diretoria_id);
    }

    if (!planoCodigo || !planoApi) {
      renderInheritedBlock(block, []);
      if (empty) empty.classList.remove("hidden");
      syncProgramaParentSpatialConstraint();
      renderProgramaReview();
      return;
    }

    if (empty) empty.classList.add("hidden");
    renderInheritedBlock(
      block,
      [
        { label: "Diretoria", value: dir?.nome_oficial || planoApi.diretoria_id },
        {
          label: "Plano",
          value: planoCat
            ? `${planoCat.sigla} — ${planoCat.nome_oficial}`
            : planoApi.nome,
        },
        { label: "Instituição interessada", value: planoApi.responsavel || "—" },
        {
          label: "Horizonte",
          value: planoCat?.horizonte ? `Até ${planoCat.horizonte}` : "—",
        },
      ],
      buildPlanoCatalogLinks(planoCodigo, planoApi.diretoria_id)
    );
    syncProgramaParentSpatialConstraint();
    renderProgramaReview();
  }

  function updateProjetoStrategicContext() {
    const block = $("#pj-contexto-estrategico");
    const empty = $("#pj-contexto-vazio");
    const cat = SLTCatalog.catalog;

    if (!isPjVinculoAtivo()) {
      renderInheritedBlock(block, []);
      if (empty) empty.classList.remove("hidden");
      updateClassificacaoUI();
      updateCarteiras();
      syncProjetoParentSpatialConstraint();
      return;
    }

    const tipo = getPjVinculoTipo();

    if (tipo === "programa") {
      const prog = getSelectedPrograma();
      if (!prog) {
        renderInheritedBlock(block, []);
        if (empty) empty.classList.remove("hidden");
        updateClassificacaoUI();
        updateCarteiras();
        syncProjetoParentSpatialConstraint();
        return;
      }

      if (empty) empty.classList.add("hidden");
      const dir = cat.diretorias.find((x) => x.id === prog.diretoria_id);
      const planoCat = SLTCatalog.getPlano(prog.plano_codigo);

      renderInheritedBlock(
        block,
        [
          { label: "Programa", value: prog.nome },
          { label: "Plano", value: prog.plano_nome || planoCat?.nome_oficial || prog.plano_codigo },
          { label: "Diretoria", value: dir?.nome_oficial || prog.diretoria_id || "—" },
          {
            label: "Classificação do plano",
            value: planoCat
              ? `${planoCat.sigla} (${planoCat.classificacao_pos_projeto || "—"})`
              : "—",
          },
        ],
        buildPlanoCatalogLinks(prog.plano_codigo, prog.diretoria_id)
      );
    } else {
      const planoCodigo = $("#pj-plano-vinculo")?.value;
      const planoApi = planosCache.find((p) => p.id === planoCodigo);
      const planoCat = SLTCatalog.getPlano(planoCodigo);

      if (!planoCodigo || !planoApi) {
        renderInheritedBlock(block, []);
        if (empty) empty.classList.remove("hidden");
        updateClassificacaoUI();
        updateCarteiras();
        syncProjetoParentSpatialConstraint();
        return;
      }

      if (empty) empty.classList.add("hidden");
      const dir = cat.diretorias.find((x) => x.id === planoApi.diretoria_id);

      renderInheritedBlock(
        block,
        [
          { label: "Plano", value: planoCat ? `${planoCat.sigla} — ${planoCat.nome_oficial}` : planoApi.nome },
          { label: "Diretoria", value: dir?.nome_oficial || planoApi.diretoria_id || "—" },
          {
            label: "Classificação do plano",
            value: planoCat
              ? `${planoCat.sigla} (${planoCat.classificacao_pos_projeto || "—"})`
              : "—",
          },
        ],
        buildPlanoCatalogLinks(planoCodigo, planoApi.diretoria_id)
      );
    }

    updateClassificacaoUI();
    updateCarteiras();
    syncProjetoParentSpatialConstraint();
  }

  function applyUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const programa = params.get("programa");
    if (programa && $("#programa")) {
      setPjVinculo(true);
      updatePjVinculoPanel();
      $("#programa").value = programa;
      $("#programa").dispatchEvent(new Event("change"));
    }
    const step = params.get("step");
    if (step) revealProjetoStep(Number(step));
  }

  function labelGeometria(tipo) {
    if (tipo === "Point") return "Ponto";
    if (tipo === "Polygon") return "Perímetro";
    if (tipo === "LineString") return "Linha";
    return tipo || "—";
  }

  async function loadParentSpatialConstraint(unidadeIds, label, meta) {
    const loadId = ++parentConstraintLoadId;
    if (!unidadeIds?.length) {
      SLTSpatialConstraint.clear();
      pgAbr?.clearParentReference?.();
      SLTGeometria.clearParentReference?.();
      return;
    }
    try {
      const fc = await SLTDemandasApi.geoUnidadesGeojson(unidadeIds);
      if (loadId !== parentConstraintLoadId) return;
      SLTSpatialConstraint.setParent(fc, meta, unidadeIds);
      pgAbr?.setParentReference?.(fc, label);
      SLTGeometria.setParentReference?.(fc, label);
    } catch (err) {
      if (loadId !== parentConstraintLoadId) return;
      SLTSpatialConstraint.clear();
      pgAbr?.clearParentReference?.();
      SLTGeometria.clearParentReference?.();
    }
  }

  async function syncProgramaParentSpatialConstraint() {
    if (!isPgVinculoAtivo()) {
      await loadParentSpatialConstraint(null);
      return;
    }
    const plano = planosCache.find((p) => p.id === $("#pg-plano")?.value);
    if (!plano?.unidades_espaciais?.length) {
      await loadParentSpatialConstraint(null);
      return;
    }
    await loadParentSpatialConstraint(plano.unidades_espaciais, `plano «${plano.nome}»`, {
      childKind: "programa",
      refKind: "plano",
      refLabel: plano.nome,
    });
  }

  async function syncProjetoParentSpatialConstraint() {
    if (!isPjVinculoAtivo()) {
      await loadParentSpatialConstraint(null);
      return;
    }
    if (getPjVinculoTipo() === "programa") {
      const prog = getSelectedPrograma();
      if (!prog?.unidades_espaciais?.length) {
        await loadParentSpatialConstraint(null);
        return;
      }
      await loadParentSpatialConstraint(prog.unidades_espaciais, `programa «${prog.nome}»`, {
        childKind: "projeto",
        refKind: "programa",
        refLabel: prog.nome,
      });
      return;
    }
    const plano = planosCache.find((p) => p.id === $("#pj-plano-vinculo")?.value);
    if (!plano?.unidades_espaciais?.length) {
      await loadParentSpatialConstraint(null);
      return;
    }
    await loadParentSpatialConstraint(plano.unidades_espaciais, `plano «${plano.nome}»`, {
      childKind: "projeto",
      refKind: "plano",
      refLabel: plano.nome,
    });
  }

  function territorioTipoNome(tipo, tipoNome) {
    return TERRITORIO_TIPO_NOME[tipo] || tipoNome || tipo;
  }

  function formatTerritorioValores(nomes) {
    return escapeHtml((nomes || []).join(", "));
  }

  function enquadramentoPrincipalLabel(tipo, tipoNome) {
    return ENQUADRAMENTO_PRINCIPAL_LABEL[tipo] || territorioTipoNome(tipo, tipoNome);
  }

  function enquadramentoRegionalLabel(tipo, tipoNome) {
    return (
      ENQUADRAMENTO_REGIONAL_LABEL[tipo] ||
      `Enquadramento regional (${territorioTipoNome(tipo, tipoNome)})`
    );
  }

  function collectRegionalidadesMap(regionalidades, itens) {
    const byTipo = new Map();
    if (itens?.length) {
      itens.forEach((item) => {
        if (item.tipo !== "estado" && item.nomes?.length) {
          byTipo.set(item.tipo, item.nomes.slice());
        }
      });
      return byTipo;
    }
    if (regionalidades) {
      Object.entries(regionalidades).forEach(([tipo, nomes]) => {
        if (tipo !== "estado" && nomes?.length) byTipo.set(tipo, nomes.slice());
      });
    }
    return byTipo;
  }

  function buildEnquadramentoBlocksHtml(entity, principalHtml, outrosHtml, extraHtml = "") {
    const nome = entity === "programa" ? "programa" : "projeto";
    return `
      <div class="review-abrangencia-block">
        ${reviewSectionHeader(`Enquadramento territorial principal do ${nome}`, "fa-map")}
        <div class="review-rows">${principalHtml || reviewRow("—", "—")}</div>
      </div>
      <div class="review-abrangencia-block">
        ${reviewSectionHeader("Outros enquadramentos territoriais", "fa-map-location-dot")}
        <div class="review-rows">${outrosHtml || reviewRow("—", "—")}</div>
      </div>
      ${extraHtml ? `<div class="review-rows">${extraHtml}</div>` : ""}`;
  }

  function macroItensOrdenados(itens) {
    return (itens || [])
      .filter((item) => item.tipo !== "estado" && item.nomes?.length)
      .sort((a, b) => (a.ordem ?? 999) - (b.ordem ?? 999));
  }

  function formatAbrangenciaPrincipalRows(items) {
    if (!items?.length) {
      return [reviewRow("—", "—")];
    }
    const groups = new Map();
    items.forEach((item) => {
      const tipo = item.tipo || "outro";
      if (!groups.has(tipo)) groups.set(tipo, []);
      groups.get(tipo).push(item.nome);
    });
    const rows = [];
    const ordered = [...PROJETO_TIPOS_ORDEM];
    groups.forEach((_nomes, tipo) => {
      if (!ordered.includes(tipo)) ordered.push(tipo);
    });
    ordered.forEach((tipo) => {
      const nomes = groups.get(tipo);
      if (!nomes?.length) return;
      rows.push(
        reviewRow(enquadramentoPrincipalLabel(tipo), formatTerritorioValores(nomes))
      );
    });
    return rows;
  }

  function formatEnquadramentoRegionalRows(itens) {
    return macroItensOrdenados(itens).map((item) =>
      reviewRow(
        enquadramentoRegionalLabel(item.tipo, item.tipo_nome),
        formatTerritorioValores(item.nomes)
      )
    );
  }

  function formatProjetoEnquadramentoRows(regionalidades, itens) {
    const byTipo = collectRegionalidadesMap(regionalidades, itens);
    if (!byTipo.size) {
      return { principalHtml: reviewRow("—", "—"), outrosHtml: reviewRow("—", "—") };
    }

    let principalTipo = null;
    for (const tipo of PROJETO_TIPOS_ORDEM) {
      if (byTipo.has(tipo)) {
        principalTipo = tipo;
        break;
      }
    }

    const principalHtml = principalTipo
      ? reviewRow(
          enquadramentoPrincipalLabel(principalTipo),
          formatTerritorioValores(byTipo.get(principalTipo))
        )
      : reviewRow("—", "—");

    const outrosRows = PROJETO_TIPOS_ORDEM.filter(
      (tipo) => tipo !== principalTipo && byTipo.has(tipo)
    ).map((tipo) =>
      reviewRow(enquadramentoRegionalLabel(tipo), formatTerritorioValores(byTipo.get(tipo)))
    );

    return {
      principalHtml,
      outrosHtml: outrosRows.length ? outrosRows.join("") : reviewRow("—", "—"),
    };
  }

  function renderProgramaAbrangenciaReview() {
    const wrap = $("#pg-review-enquadramento");
    if (!wrap) return;

    const items = pgAbr?.getSelectedItems?.() || [];
    const principalHtml = formatAbrangenciaPrincipalRows(items).join("");
    let outrosHtml = reviewRow("—", "—");

    if (items.length) {
      const macroRows = formatEnquadramentoRegionalRows(programaRegionalidades?.itens);
      if (macroRows.length) {
        outrosHtml = macroRows.join("");
      } else if (programaRegionalidades === null) {
        outrosHtml = reviewRow("—", "Calculando…");
      } else {
        outrosHtml = reviewRow("—", "Nenhum enquadramento adicional identificado.");
      }
    }

    wrap.innerHTML = buildEnquadramentoBlocksHtml("programa", principalHtml, outrosHtml);
  }

  async function refreshProgramaRegionalidades(ids) {
    if (!ids?.length) {
      programaRegionalidades = null;
      renderProgramaReview();
      return;
    }
    try {
      programaRegionalidades = await SLTDemandasApi.analyzeProgramaRegionalidades(ids);
    } catch (err) {
      programaRegionalidades = null;
    }
    renderProgramaReview();
  }

  function onProgramaSpatialAnalysis() {
    renderProgramaReview();
    refreshProgramaRegionalidades(pgAbr?.getSelectedIds() || []);
  }

  function setPgReviewText(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    const text = typeof value === "string" ? value.trim() : value;
    el.textContent = text || "—";
  }

  function togglePgReviewRow(rowId, visible) {
    document.getElementById(rowId)?.classList.toggle("hidden", !visible);
  }

  function renderProgramaReviewRegionalidades() {
    renderProgramaAbrangenciaReview();
  }

  function renderProgramaReview() {
    if (!$("#pg-review")) return;

    setPgReviewText("pg-review-nome", $("#pg-nome")?.value.trim() || "—");
    setPgReviewText("pg-review-descricao", $("#pg-descricao")?.value.trim() || "—");
    setPgReviewText("pg-review-objetivo", $("#pg-objetivo")?.value.trim() || "—");

    const vinculoChecked = document.querySelector('input[name="pg-vinculo"]:checked');
    const vinculoAtivo = isPgVinculoAtivo();
    setPgReviewText(
      "pg-review-vinculo",
      vinculoChecked ? (vinculoAtivo ? "Sim" : "Não") : "—"
    );

    const planoApi = planosCache.find((p) => p.id === $("#pg-plano")?.value);
    const planoCat = SLTCatalog.getPlano($("#pg-plano")?.value);
    $("#pg-review-sec-contexto")?.classList.toggle("hidden", !vinculoAtivo);
    if (vinculoAtivo) {
      setPgReviewText(
        "pg-review-plano",
        planoCat
          ? `${planoCat.sigla} — ${planoCat.nome_oficial}`
          : planoApi?.nome || "—"
      );
      const cat = SLTCatalog.catalog;
      const dir = planoApi ? cat.diretorias.find((x) => x.id === planoApi.diretoria_id) : null;
      setPgReviewText("pg-review-diretoria", dir?.nome_oficial || planoApi?.diretoria_id || "—");
    }

    const inst = SLTSigmaRead.findInstituicao(instituicoes, $("#pg-instituicao")?.value);
    setPgReviewText(
      "pg-review-instituicao",
      inst ? SLTSigmaRead.labelInstituicao(inst) : "—"
    );
    setPgReviewText("pg-review-cnpj", $("#pg-cnpj")?.value || "—");

    const pessoa = SLTSigmaRead.findPessoa(pessoas, $("#pg-representante")?.value);
    setPgReviewText(
      "pg-review-representante",
      pessoa ? SLTSigmaRead.labelPessoa(pessoa) : "—"
    );
    setPgReviewText("pg-review-email", $("#pg-rep_email")?.value || "—");
    setPgReviewText("pg-review-telefone", $("#pg-rep_telefone")?.value || "—");

    renderProgramaAbrangenciaReview();

    const containment = pgAbr?.getContainment?.();
    const showContainment = vinculoAtivo && containment && containment.status !== "inside";
    togglePgReviewRow("pg-review-containment-row", showContainment);
    if (showContainment) {
      setPgReviewText("pg-review-containment", containment.message || "—");
    }
  }

  function initProgramaReviewSync() {
    const form = $("#form-programa");
    if (!form) return;

    ["pg-nome", "pg-descricao", "pg-objetivo"].forEach((id) => {
      form.querySelector(`#${id}`)?.addEventListener("input", renderProgramaReview);
    });

    $$('input[name="pg-vinculo"]').forEach((el) => {
      el.addEventListener("change", () => {
        setTimeout(renderProgramaReview, 0);
      });
    });

    $("#pg-plano")?.addEventListener("change", renderProgramaReview);
    $("#pg-instituicao")?.addEventListener("change", renderProgramaReview);
    $("#pg-representante")?.addEventListener("change", renderProgramaReview);

    renderProgramaReview();
  }

  function reviewRow(label, valueHtml, extraClass = "") {
    const cls = extraClass ? `review-row ${extraClass}` : "review-row";
    return `<div class="${cls}"><span class="review-label">${escapeHtml(label)}</span><span class="review-value">${valueHtml}</span></div>`;
  }

  function reviewSection(title, rowsHtml, lead = "") {
    if (!rowsHtml && !lead) return "";
    const leadHtml = lead ? `<p class="review-section-lead">${escapeHtml(lead)}</p>` : "";
    return `<section class="review-section">${reviewSectionHeader(title)}${leadHtml}<div class="review-rows">${rowsHtml || ""}</div></section>`;
  }

  function renderReview() {
    const cat = SLTCatalog.catalog;
    const prog = getSelectedPrograma();
    const plano = SLTCatalog.getPlano(getProjetoPlanoId());
    const inst = SLTSigmaRead.findInstituicao(instituicoes, $("#instituicao").value);
    const geom = getGeometria();
    const coords = getCoordenadas();
    const pessoa = SLTSigmaRead.findPessoa(pessoas, $("#representante").value);
    const modal = cat.modais.find((m) => m.id === $("#modal").value);
    const tipologia = cat.tipologias.find((t) => t.id === $("#tipologia").value);
    const carteira = cat.carteiras.find((c) => c.id === $("#carteira").value);

    const cadastroRows = [
      reviewRow("Nome do projeto", escapeHtml($("#nome").value.trim() || "—")),
      reviewRow("Descrição", escapeHtml($("#descricao").value.trim() || "—")),
      reviewRow("Vínculo institucional", isPjVinculoAtivo() ? "Sim" : "Não"),
    ];

    const contextoRows = [];
    if (isPjVinculoAtivo()) {
      if (getPjVinculoTipo() === "programa") {
        contextoRows.push(reviewRow("Programa vinculado", escapeHtml(prog?.nome || "—")));
        contextoRows.push(
          reviewRow(
            "Plano (herdado)",
            plano
              ? escapeHtml(`${plano.sigla} — ${plano.nome_oficial}`)
              : escapeHtml(prog?.plano_nome || "—")
          )
        );
      } else {
        const planoApi = planosCache.find((p) => p.id === $("#pj-plano-vinculo")?.value);
        contextoRows.push(reviewRow("Plano vinculado", escapeHtml(planoApi?.nome || "—")));
      }
    } else {
      contextoRows.push(
        reviewRow(
          "Diretoria",
          escapeHtml(labelById(cat.diretorias, getProjetoDiretoriaId(), "nome_oficial"))
        )
      );
      contextoRows.push(
        reviewRow(
          "Plano",
          plano ? escapeHtml(`${plano.sigla} — ${plano.nome_oficial}`) : "—"
        )
      );
    }

    const proponenteRows = [
      reviewRow("Instituição interessada", escapeHtml(inst ? SLTSigmaRead.labelInstituicao(inst) : "—")),
      reviewRow("CNPJ", escapeHtml($("#cnpj").value || "—")),
      reviewRow("Representante legal", escapeHtml(pessoa ? SLTSigmaRead.labelPessoa(pessoa) : "—")),
      reviewRow("E-mail", escapeHtml($("#rep_email").value || "—")),
      reviewRow("Telefone", escapeHtml($("#rep_telefone").value || "—")),
    ];

    const classificacaoRows = [];
    if (plano?.id === PLANO_PLI) {
      classificacaoRows.push(reviewRow("Frente PLI", escapeHtml(labelById(cat.frentes_pli, $("#frente").value))));
    } else if (plano?.id === PLANO_PEF) {
      classificacaoRows.push(reviewRow("Eixo PEF", escapeHtml(labelById(cat.eixos_pef, $("#eixo").value))));
      if ($("#corredor_tic").value) {
        classificacaoRows.push(
          reviewRow("Corredor TIC", escapeHtml(labelById(cat.corredores_tic, $("#corredor_tic").value)))
        );
      }
    }

    const complementosRows = [
      reviewRow("Modal", escapeHtml(modal?.nome || "—")),
      reviewRow("Tipologia", escapeHtml(tipologia?.nome || "—")),
      reviewRow("Carteira", escapeHtml(carteira?.nome || "—")),
    ];

    const containment = SLTGeometria.getContainment?.();
    let extraLocalizacaoHtml = "";
    if (isPjVinculoAtivo() && containment && containment.status !== "inside") {
      extraLocalizacaoHtml = reviewRow(
        "Confronto com a abrangência do vínculo institucional",
        escapeHtml(containment.message || "—"),
        "review-row--warn"
      );
    }

    const regionalidades = SLTGeometria.getRegionalidades?.();
    const { principalHtml, outrosHtml } = formatProjetoEnquadramentoRows(regionalidades, null);

    const localizacaoMeta = [
      reviewRow(
        "Coordenadas (latitude, longitude)",
        coords ? escapeHtml(`${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`) : "—"
      ),
      reviewRow("Marcação no mapa", escapeHtml(geom ? labelGeometria(geom.tipo) : "—")),
    ].join("");

    const localizacaoBody = `${localizacaoMeta}${buildEnquadramentoBlocksHtml(
      "projeto",
      principalHtml,
      outrosHtml,
      extraLocalizacaoHtml
    )}`;

    $("#review").innerHTML = [
      reviewSection("Informações cadastrais", cadastroRows.join("")),
      reviewSection("Contexto institucional estratégico", contextoRows.join("")),
      reviewSection("Proponente do cadastro", proponenteRows.join("")),
      classificacaoRows.length
        ? reviewSection("Classificação no plano", classificacaoRows.join(""))
        : "",
      reviewSection("Complementos", complementosRows.join("")),
      reviewSection("Localização geográfica", localizacaoBody),
    ]
      .filter(Boolean)
      .join("");
  }

  function buildDemanda() {
    const plano = SLTCatalog.getPlano(getProjetoPlanoId());
    const pessoaId = $("#representante").value;
    const pessoa = SLTSigmaRead.findPessoa(pessoas, pessoaId);
    const geom = getGeometria();
    const coords = getCoordenadas();
    return {
      id: SLTStorage.uid(),
      status: "fila_hierarquizacao",
      criadoEm: new Date().toISOString(),
      ...buildInstituicaoPayload("#instituicao", "#cnpj"),
      pessoa_id: pessoaId || null,
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
      representante: {
        pessoa_id: pessoaId,
        nome: pessoa ? SLTSigmaRead.labelPessoa(pessoa) : "",
        email: $("#rep_email").value.trim(),
        telefone: $("#rep_telefone").value.trim(),
      },
      vinculo_institucional: isPjVinculoAtivo(),
      vinculo_tipo: isPjVinculoAtivo() ? getPjVinculoTipo() : null,
      diretoria_id: getProjetoDiretoriaId(),
      plano_id: getProjetoPlanoId(),
      programa_codigo:
        isPjVinculoAtivo() && getPjVinculoTipo() === "programa" ? $("#programa").value : null,
      nome: $("#nome").value.trim(),
      descricao: $("#descricao").value.trim(),
      geometria: geom ? { tipo: geom.tipo, coordinates: geom.coordinates } : null,
      classificacao:
        plano?.id === PLANO_PLI
          ? { tipo: "frente_pli", frente_id: $("#frente").value }
          : plano?.id === PLANO_PEF
            ? { tipo: "eixo_pef", eixo_id: $("#eixo").value, corredor_tic_id: $("#corredor_tic").value || null }
            : null,
      complementos: {
        modal_id: $("#modal").value || null,
        tipologia_id: $("#tipologia").value || null,
        carteira_id: $("#carteira").value || null,
        regionalidades: SLTGeometria.getRegionalidades?.() || null,
      },
    };
  }

  function selectTipo(tipo) {
    $$(".tipo-card").forEach((c) => {
      const on = c.dataset.tipo === tipo;
      c.classList.toggle("is-active", on);
      c.setAttribute("aria-selected", String(on));
    });
    $$(".tipo-form").forEach((f) => {
      f.classList.toggle("hidden", f.dataset.tipo !== tipo);
    });
    if (tipo === "plano" && plAbr) plAbr.invalidateSize();
    if (tipo === "programa") {
      resetProgramaWizard();
      SLTGeometria.clearParentReference?.();
      SLTSpatialConstraint.clear();
      if (pgAbr) setTimeout(() => pgAbr.invalidateSize(), 120);
    }
    if (tipo === "projeto") {
      resetProjetoWizard();
      pgAbr?.clearParentReference?.();
      SLTSpatialConstraint.clear();
    }
  }

  function updateProgramasSelect() {
    const sel = $("#programa");
    const items = programasCache;
    const placeholder = items.length
      ? "Selecione o programa…"
      : "Nenhum programa cadastrado";
    fillSelect(sel, items, "id", (p) => {
      const plano = p.plano_nome ? ` (${p.plano_nome})` : "";
      return `${p.nome}${plano}`;
    }, placeholder);
    if (!isPjVinculoAtivo() || getPjVinculoTipo() !== "programa") {
      sel.disabled = true;
      sel.required = false;
    } else {
      sel.disabled = items.length === 0;
      sel.required = true;
    }
  }

  async function loadPlanosCache() {
    try {
      planosCache = await SLTDemandasApi.listPlanos();
    } catch (err) {
      planosCache = [];
    }
    const pgSel = $("#pg-plano");
    if (pgSel) {
      fillSelect(
        pgSel,
        planosCache,
        "id",
        (p) => p.nome,
        planosCache.length ? "Selecione…" : "Nenhum plano cadastrado"
      );
    }
    const pjSel = $("#pj-plano-vinculo");
    if (pjSel) {
      fillSelect(
        pjSel,
        planosCache,
        "id",
        (p) => p.nome,
        planosCache.length ? "Selecione…" : "Nenhum plano cadastrado"
      );
    }
    updatePgVinculoPanel();
    updatePjVinculoPanel();
  }

  async function loadProgramasCache() {
    try {
      programasCache = await SLTDemandasApi.listProgramas();
    } catch (err) {
      programasCache = [];
    }
    updateProgramasSelect();
    applyUrlParams();
  }

  function initTipoSelector() {
    $$(".tipo-card").forEach((card) => {
      card.addEventListener("click", () => selectTipo(card.dataset.tipo));
    });
  }

  function initPlanoForm() {
    const cat = SLTCatalog.catalog;
    fillSelect($("#pl-diretoria"), SLTCatalog.ativos(cat.diretorias), "id", (d) => d.nome_oficial, "Selecione…");
    plAbr = SLTAbrangencia.create({ container: $("#pl-abrangencia"), sectionNumber: 5 });
    setTimeout(() => plAbr.invalidateSize(), 200);

    $("#pl-instituicao").addEventListener("change", onPlanoInstituicaoChange);
    $("#pl-representante").addEventListener("change", () =>
      onRepresentanteFieldChange("#pl-representante", "#pl-rep_email", "#pl-rep_telefone")
    );

    $("#form-plano").addEventListener("submit", async (e) => {
      e.preventDefault();
      const unidades = plAbr.getSelectedIds();
      if (!$("#pl-nome").value.trim() || !$("#pl-descricao").value.trim() || !$("#pl-diretoria").value) {
        showToast("Preencha nome, descrição e diretoria do plano.");
        return;
      }
      if (!$("#pl-instituicao").value) {
        showToast("Selecione a instituição interessada.");
        return;
      }
      if (!$("#pl-representante").value) {
        showToast("Selecione o representante legal.");
        return;
      }
      if (!unidades.length) {
        showToast("Selecione ao menos uma unidade de abrangência.");
        return;
      }
      const rep = buildRepresentantePayload("#pl-representante", "#pl-rep_email", "#pl-rep_telefone");
      const inst = buildInstituicaoPayload("#pl-instituicao", "#pl-cnpj");
      const payload = {
        diretoria_id: $("#pl-diretoria").value,
        nome: $("#pl-nome").value.trim(),
        descricao: $("#pl-descricao").value.trim(),
        objetivo_estrategico: $("#pl-objetivo").value.trim() || null,
        ...inst,
        pessoa_id: rep.pessoa_id,
        representante: rep.representante,
        vigencia_inicio: $("#pl-vig-ini").value || null,
        vigencia_fim: $("#pl-vig-fim").value || null,
        valor_global: $("#pl-valor").value ? Number($("#pl-valor").value) : null,
        unidades_espaciais: unidades,
      };
      const btn = e.submitter;
      if (btn) btn.disabled = true;
      try {
        await SLTDemandasApi.createPlano(payload);
        showToast("Plano cadastrado com sucesso.");
        setTimeout(() => (window.location.href = "../painel/"), 1500);
      } catch (err) {
        showToast(err.message || "Erro ao cadastrar plano.");
      } finally {
        if (btn) btn.disabled = false;
      }
    });
  }

  async function initProgramaForm() {
    pgAbr = SLTAbrangencia.create({
      container: $("#pg-abrangencia"),
      onSpatialAnalysis: onProgramaSpatialAnalysis,
    });

    initProgramaReviewSync();

    $$('input[name="pg-vinculo"]').forEach((el) => {
      el.addEventListener("change", onPgVinculoChoice);
    });
    $("#pg-plano")?.addEventListener("change", updateProgramaStrategicContext);
    $("#pg-instituicao").addEventListener("change", onProgramaInstituicaoChange);
    $("#pg-representante").addEventListener("change", () => {
      onRepresentanteFieldChange("#pg-representante", "#pg-rep_email", "#pg-rep_telefone");
      renderProgramaReview();
    });

    $$("#form-programa .btn-next").forEach((btn) => {
      btn.addEventListener("click", () => {
        const cur = Number(btn.closest(".pg-step-panel").dataset.step);
        if (!validateProgramaStep(cur)) return;
        revealProgramaStep(getNextProgramaStep(cur));
      });
    });

    $$("#form-programa .btn-prev").forEach((btn) => {
      btn.addEventListener("click", () => {
        const cur = Number(btn.closest(".pg-step-panel").dataset.step);
        scrollToProgramaStep(getPrevProgramaStep(cur));
      });
    });

    $("#form-programa").addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!validateProgramaStep(1) || !validateProgramaStep(3) || !validateProgramaStep(4)) return;
      if (isPgVinculoAtivo() && !validateProgramaStep(2)) return;
      if (!ensureSpatialAcknowledgedForSubmit("programa")) return;
      const rep = buildRepresentantePayload("#pg-representante", "#pg-rep_email", "#pg-rep_telefone");
      const inst = buildInstituicaoPayload("#pg-instituicao", "#pg-cnpj");
      const unidades = pgAbr.getSelectedIds();
      const payload = {
        plano_codigo: isPgVinculoAtivo() ? $("#pg-plano").value : null,
        vinculo_institucional: isPgVinculoAtivo(),
        nome: $("#pg-nome").value.trim(),
        descricao: $("#pg-descricao").value.trim(),
        objetivo: $("#pg-objetivo").value.trim() || null,
        publico_alvo: $("#pg-publico").value.trim() || null,
        justificativa: $("#pg-justificativa").value.trim() || null,
        orgao_responsavel: $("#pg-orgao").value.trim() || null,
        valor_global: $("#pg-valor").value ? Number($("#pg-valor").value) : null,
        ...inst,
        pessoa_id: rep.pessoa_id,
        representante: rep.representante,
        unidades_espaciais: unidades,
      };
      const btn = e.submitter;
      if (btn) btn.disabled = true;
      try {
        await SLTDemandasApi.createPrograma(payload);
        showToast("Programa cadastrado com sucesso.");
        setTimeout(() => (window.location.href = "../painel/"), 1500);
      } catch (err) {
        showToast(err.message || "Erro ao cadastrar programa.");
      } finally {
        if (btn) btn.disabled = false;
      }
    });
  }

  async function init() {
    initCadastroSectionCards();
    await loadSigmaCadastros();

    await SLTCatalog.loadCatalog("../");
    const refRes = await fetch("../data/referencia-classificacao.json");
    if (refRes.ok) classificacaoRef = await refRes.json();
    const cat = SLTCatalog.catalog;

    fillSelect($("#modal"), SLTCatalog.ativos(cat.modais), "id", (m) => m.nome, "— Opcional —");
    fillSelect($("#tipologia"), SLTCatalog.ativos(cat.tipologias), "id", (t) => t.nome, "— Opcional —");

    $("#instituicao").addEventListener("change", onInstituicaoChange);
    $("#representante").addEventListener("change", onRepresentanteChange);
    $$('input[name="pj-vinculo"]').forEach((el) => {
      el.addEventListener("change", onPjVinculoChoice);
    });
    $$('input[name="pj-vinculo-tipo"]').forEach((el) => {
      el.addEventListener("change", updatePjVinculoPanel);
    });
    $("#programa").addEventListener("change", updateProjetoStrategicContext);
    $("#pj-plano-vinculo")?.addEventListener("change", updateProjetoStrategicContext);

    initClsEnquadramento();
    updateClassificacaoUI();

    $("#eixo").addEventListener("change", onEixoChange);
    $("#frente").addEventListener("change", updateClassificacaoHints);
    $("#corredor_tic").addEventListener("change", updateClassificacaoHints);

    $$("#form-cadastro .btn-next").forEach((btn) => {
      btn.addEventListener("click", () => {
        const cur = Number(btn.closest(".step-panel").dataset.step);
        if (!validateStep(cur)) return;
        revealProjetoStep(getNextProjetoStep(cur));
      });
    });

    $$("#form-cadastro .btn-prev").forEach((btn) => {
      btn.addEventListener("click", () => {
        const cur = Number(btn.closest(".step-panel").dataset.step);
        scrollToProjetoStep(getPrevProjetoStep(cur));
      });
    });

    $("#toggle-complementos").addEventListener("click", () => {
      $("#complementos-body").classList.toggle("hidden");
    });

    $("#form-cadastro").addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!validateStep(1) || !validateStep(3) || !validateStep(5)) return;
      if (isPjVinculoAtivo() && !validateStep(2)) return;
      if (!ensureSpatialAcknowledgedForSubmit("projeto")) return;
      const demanda = buildDemanda();
      const submitBtn = e.submitter || $("#form-cadastro").querySelector('[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;
      try {
        await SLTDemandasApi.createDemanda(demanda);
        showToast("Demanda registrada com sucesso.");
        setTimeout(() => {
          window.location.href = "../painel/";
        }, 1500);
      } catch (err) {
        console.error(err);
        showToast(err.message || "Erro ao registrar demanda.");
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });

    SLTGeometria.init();
    SLTGeometria.setOnAnalysisChange(() => {
      if (currentProjetoStep >= 4) renderReview();
    });
    initTipoSelector();
    initFieldFilledSync();
    await loadPlanosCache();
    renumberProgramaSections();
    initPlanoForm();
    initProgramaForm();
    loadProgramasCache();
    syncProgramaPanelsVisibility();
    syncProjetoPanelsVisibility();

    const tipoParam = new URLSearchParams(window.location.search).get("tipo");
    if (tipoParam) selectTipo(tipoParam);
    else selectTipo("plano");
  }

  init().catch((err) => {
    console.error(err);
    showToast("Erro ao iniciar cadastro.");
  });
})();
