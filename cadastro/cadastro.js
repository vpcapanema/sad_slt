(function () {
  const EIXO_TIC = "EIXO-PEF-02";
  const PLANO_PLI = "PLANO-PLI";
  const PLANO_PEF = "PLANO-PEF";

  const PROGRAMA_STEP_EXECUCAO_SUSPENDED = 7; // Oculta até revisão do cliente; reativar e renumerar seções depois.

  let classificacaoRef = null;
  let instituicoes = [];
  let pessoas = [];
  let programasCache = [];
  let planosCache = [];
  const CODIGO_PLANO_OUTROS = "PLANO-OUTROS";
  const CODIGO_PROGRAMA_OUTROS = "PROG-OUTROS";

  function planosParaVinculo(list) {
    return (list || []).filter((p) => p.id !== CODIGO_PLANO_OUTROS);
  }

  function programasParaVinculo(list) {
    return (list || []).filter((p) => p.id !== CODIGO_PROGRAMA_OUTROS);
  }
  let plAbr = null;
  let pgAbr = null;
  let currentProjetoStep = 1;
  let currentProgramaStep = 1;
  let projetoMaxRevealed = 1;
  let programaMaxRevealed = 1;
  let parentConstraintLoadId = 0;
  let programaRegionalidades = null;
  let currentTipoDemandante = "institucional";

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

  function parseMoedaBr(value) {
    const digits = String(value ?? "").replace(/\D/g, "");
    return digits ? Number(digits) / 100 : null;
  }

  function formatMoedaBr(value) {
    const numero = typeof value === "number" ? value : parseMoedaBr(value);
    return numero == null ? "" : numero.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  function initCurrencyInput(selector) {
    const input = $(selector);
    if (!input) return;
    input.addEventListener("input", () => {
      const numero = parseMoedaBr(input.value);
      input.value = numero == null ? "" : formatMoedaBr(numero);
      input.dispatchEvent(new Event("cadastro:currency", { bubbles: true }));
    });
  }

  function optionValuesFor(attribute, objectType) {
    const specific = attribute.configuracao_por_tipo?.[objectType]?.opcoes;
    return Array.isArray(specific) ? specific : attribute.dominio_valores || [];
  }

  async function loadAtributosObjetoDomain() {
    const response = await fetch("/api/dominios/atributos-objeto");
    if (!response.ok) throw new Error("Não foi possível carregar os atributos cadastrais.");
    const attributes = await response.json();
    $$('select[data-atributo][data-tipo-objeto]').forEach((select) => {
      const attribute = attributes.find((item) => item.codigo === select.dataset.atributo);
      if (!attribute || !attribute.tipos_objeto.includes(select.dataset.tipoObjeto)) return;
      const emptyOption = select.multiple ? "" : '<option value="">— Não informado —</option>';
      // O valor nativo gravado em demandas.plano/programa/projeto é o rótulo completo ("Nível N — ..."), não o código curto.
      select.innerHTML = emptyOption + optionValuesFor(attribute, select.dataset.tipoObjeto)
        .map((item) => `<option value="${item.rotulo}">${item.rotulo}</option>`)
        .join("");
    });
  }

  function cadastralAttributes(prefix, supportsCapex) {
    const result = {};
    const maturity = $(`#${prefix}-maturidade`)?.value;
    const deadline = $(`#${prefix}-prazo`)?.value;
    const deadlineBasis = $(`#${prefix}-base-prazo`)?.value;
    if (maturity) result.maturidade_objeto = maturity;
    if (deadline !== "" && deadline != null) result.prazo_referencia_meses = Number(deadline);
    if (deadlineBasis) result.base_estimativa_prazo = deadlineBasis;
    if (supportsCapex) {
      const capexRaw = $(`#${prefix}-capex`)?.value;
      const capex = ["prj", "pg"].includes(prefix) ? parseMoedaBr(capexRaw) : (capexRaw === "" || capexRaw == null ? null : Number(capexRaw));
      const capexBasis = $(`#${prefix}-base-capex`)?.value;
      if (capex != null) result.capex_estimado = capex;
      if (capexBasis) result.base_estimativa_capex = capexBasis;
    }
    return result;
  }

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

      const collapsibleCandidate = card.querySelector(":scope > .collapsible-hdr");
      const collapsibleHdr = collapsibleCandidate?.querySelector(":scope > h2")
        ? collapsibleCandidate
        : null;
      const h2 = collapsibleHdr?.querySelector("h2") || card.querySelector(":scope > h2");
      if (!h2) return;

      card.dataset.sectionCardReady = "1";
      card.classList.add("cadastro-card");

      const label = document.createElement("div");
      label.className = "cadastro-section-label pli-section-label";
      if (collapsibleHdr) {
        label.classList.add("collapsible-hdr");
        if (collapsibleHdr.id) label.id = collapsibleHdr.id;
      }

      const icon = document.createElement("i");
      icon.className = `fas ${cadastroSectionIcon(cadastroSectionTitleText(h2))}`;
      icon.setAttribute("aria-hidden", "true");

      const titleSpan = document.createElement("span");
      titleSpan.className = "cadastro-section-title pli-section-title";
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

  // Última mensagem de validação: o formulário embutido (SEI) a devolve à página hospedeira.
  let ultimoAviso = "";

  function showToast(msg) {
    ultimoAviso = msg;
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

  // Tipologia sem modal_ids é transversal: vale para qualquer modal.
  function tipologiaServeAoModal(tipologia, modalId) {
    const modais = tipologia.modal_ids || [];
    return modais.length === 0 || (Boolean(modalId) && modais.includes(modalId));
  }

  // Refaz #tipologia conforme #modal: específicas do modal primeiro, depois as transversais.
  function atualizarTipologiasPorModal() {
    const sel = $("#tipologia");
    const modalId = $("#modal").value;
    const atual = sel.value;
    const opcoes = SLTCatalog.ativos(SLTCatalog.catalog?.tipologias).filter((t) => tipologiaServeAoModal(t, modalId));
    const especificas = opcoes.filter((t) => (t.modal_ids || []).length > 0);
    const transversais = opcoes.filter((t) => !(t.modal_ids || []).length);
    const placeholder = modalId ? "— Opcional —" : "— Opcional (selecione o modal para ver as específicas) —";
    fillSelect(sel, [...especificas, ...transversais], "id", (t) => t.nome, placeholder);
    // Mantém a escolha se ainda serve ao modal; senão, limpa.
    sel.value = opcoes.some((t) => t.id === atual) ? atual : "";
    syncFieldFilledState(sel);
  }

  function setSubsectionNumber(subsection, sectionNumber, subsectionNumber) {
    const heading = subsection.querySelector(":scope > h3");
    if (!heading) return;
    let number = heading.querySelector(":scope > .cadastro-subsec-num");
    if (!number) {
      heading.firstChild?.nodeType === Node.TEXT_NODE &&
        (heading.firstChild.textContent = heading.firstChild.textContent.replace(/^\s*\d+\.\d+\s*/, ""));
      number = document.createElement("span");
      number.className = "cadastro-subsec-num";
      heading.prepend(document.createTextNode(" "));
      heading.prepend(number);
    }
    number.textContent = `${sectionNumber}.${subsectionNumber}`;
  }

  function renumberCadastroSections(formEl) {
    if (!formEl) return;
    let visibleSectionNumber = 0;
    formEl.querySelectorAll(".cadastro-section").forEach((sec) => {
      if (sec.classList.contains("cadastro-section--suspended")) return;
      if (sec.classList.contains("hidden") || sec.hidden) return;
      visibleSectionNumber += 1;
      const numEl = findCadastroSectionNumEl(sec);
      if (numEl) numEl.textContent = String(visibleSectionNumber);
      let visibleSubsectionNumber = 0;
      sec.querySelectorAll(".form-subsection").forEach((sub) => {
        if (sub.classList.contains("hidden") || sub.hidden) return;
        visibleSubsectionNumber += 1;
        setSubsectionNumber(sub, visibleSectionNumber, visibleSubsectionNumber);
      });
    });
  }

  function renumberProgramaSections() {
    renumberCadastroSections($("#form-programa"));
    const step4 = $("#form-programa")?.querySelector('.pg-step-panel[data-step="4"]');
    const secNum = step4?.querySelector(".cadastro-sec-num")?.textContent;
    if (secNum && pgAbr?.setSubsectionNumbers) pgAbr.setSubsectionNumbers(Number(secNum));
  }

  function renumberProjetoSections() {
    const form = $("#form-cadastro");
    if (!form) return;
    let visibleSectionNumber = 0;
    [1, 2, 3, 4, 5].forEach((stepNum) => {
      const panel = form.querySelector(`.step-panel[data-step="${stepNum}"]`);
      if (!panel?.classList.contains("cadastro-section")) return;
      if (panel.classList.contains("hidden") || panel.hidden) return;
      visibleSectionNumber += 1;
      const numEl = findCadastroSectionNumEl(panel);
      if (numEl) numEl.textContent = String(visibleSectionNumber);
      // initCadastroSectionCards move o conteúdo do card para .cadastro-section-body.
      let subIdx = 0;
      panel
        .querySelectorAll(":scope > .form-subsection, :scope > .cadastro-section-body > .form-subsection")
        .forEach((sub) => {
          if (sub.classList.contains("hidden") || sub.hidden) return;
          subIdx += 1;
          setSubsectionNumber(sub, visibleSectionNumber, subIdx);
        });
      const collapsibleNumber = panel.querySelector(
        ":scope > .collapsible-hdr .cadastro-subsec-num, :scope > .cadastro-section-body > .collapsible-hdr .cadastro-subsec-num",
      );
      if (collapsibleNumber) collapsibleNumber.textContent = `${visibleSectionNumber}.${subIdx + 1}`;
    });
  }

  function renumberPlanoSubsections() {
    $("#form-plano")?.querySelectorAll(":scope > .card").forEach((section, sectionIndex) => {
      section.querySelectorAll(".form-subsection").forEach((subsection, subsectionIndex) => {
        setSubsectionNumber(subsection, sectionIndex + 1, subsectionIndex + 1);
      });
    });
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
        syncWizardPanelA11y(p, vinculo);
        return;
      }
      if (s === PROGRAMA_STEP_EXECUCAO_SUSPENDED) {
        syncWizardPanelA11y(p, false);
        p.hidden = true;
        return;
      }
      syncWizardPanelA11y(p, true);
    });
    renumberProgramaSections();
    renumberPlanoSubsections();
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
        syncWizardPanelA11y(p, vinculo);
        return;
      }
      syncWizardPanelA11y(p, true);
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
      }, 120);
    }
    if (n === 6) renderProgramaReview();
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
    // Sem vínculo marcado: limpa o plano escolhido e a referência espacial do vínculo anterior.
    updatePgVinculoPanel();
    updateProgramaVinculoFlow();
  }

  function resetProjetoWizard() {
    projetoMaxRevealed = 1;
    currentProjetoStep = 1;
    $$('input[name="pj-vinculo"]').forEach((el) => {
      el.checked = false;
    });
    // Sem vínculo marcado: limpa programa/plano escolhidos e a referência espacial do vínculo anterior.
    updatePjVinculoPanel();
    updateProjetoVinculoFlow();
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
    updateProgramaVinculoFlow();
    renumberProgramaSections();
    renderProgramaReview();
  }

  function onPjVinculoChoice() {
    const val = document.querySelector('input[name="pj-vinculo"]:checked')?.value;
    if (!val) return;
    updatePjVinculoPanel();
    updateProjetoVinculoFlow();
    renumberProjetoSections();
  }

  /**
   * Vínculo = sim revela o passo 2 (contexto institucional) automaticamente;
   * o "Continuar" do passo 1 só aparece quando vínculo = não.
   */
  function updateProjetoVinculoFlow() {
    const form = $("#form-cadastro");
    if (!form) return;
    const choice = document.querySelector('input[name="pj-vinculo"]:checked')?.value || null;
    const nextBtn = form.querySelector('.step-panel[data-step="1"] .btn-next');
    if (nextBtn) nextBtn.classList.toggle("hidden", choice !== "nao");
    if (choice === "sim") revealProjetoStep(2);
  }

  function updateProgramaVinculoFlow() {
    const form = $("#form-programa");
    if (!form) return;
    const choice = document.querySelector('input[name="pg-vinculo"]:checked')?.value || null;
    const nextBtn = form.querySelector('.pg-step-panel[data-step="1"] .btn-next');
    if (nextBtn) nextBtn.classList.toggle("hidden", choice !== "nao");
    if (choice === "sim") revealProgramaStep(2);
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
    return CODIGO_PLANO_OUTROS;
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
    return planosCache.find((p) => p.id === CODIGO_PLANO_OUTROS)?.diretoria_id || "DIR-PLAN";
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
      const planoId = getProjetoPlanoId();
      const plano = SLTCatalog.getPlano(planoId);
      if (isPjVinculoAtivo() && plano?.id === PLANO_PLI && !$("#frente").value) {
        showToast("Selecione a frente de atuação.");
        return false;
      }
      if (isPjVinculoAtivo() && plano?.id === PLANO_PEF && !$("#eixo").value) {
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

  const LISTAS_SIGMA = {
    instituicoes: { seletores: ["#instituicao", "#pl-instituicao", "#pg-instituicao"], nome: "instituições" },
    pessoas: { seletores: ["#representante", "#pl-representante", "#pg-representante"], nome: "representantes" },
  };

  /**
   * Recarrega uma lista do SIGMA sem recarregar a página: traz quem foi cadastrado
   * depois que a página abriu e preserva o que já estava escolhido em cada formulário.
   */
  async function recarregarLista(lista) {
    const { seletores } = LISTAS_SIGMA[lista];
    const escolhidos = seletores.map((selector) => $(selector)?.value || "");
    if (lista === "instituicoes") {
      instituicoes = await SLTSigmaRead.listInstituicoes();
      fillInstituicaoSelects();
    } else {
      pessoas = await SLTSigmaRead.listPessoas();
      fillRepresentanteSelects();
    }
    seletores.forEach((selector, indice) => {
      const campo = $(selector);
      if (!campo) return;
      const anterior = escolhidos[indice];
      campo.value =
        anterior && [...campo.options].some((opcao) => opcao.value === anterior) ? anterior : "";
      // O change resincroniza CNPJ, e-mail e telefone — inclusive quando a escolha saiu da lista.
      campo.dispatchEvent(new Event("change", { bubbles: true }));
    });
    // Com a lista nova, a sugestão lida do PDF pode encontrar o proponente que faltava.
    if (ultimaSugestao) preencherProponente(ultimaSugestao.tipo, ultimaSugestao.campos);
    return (lista === "instituicoes" ? instituicoes : pessoas).length;
  }

  async function aoAtualizarLista(botao) {
    const lista = botao.dataset.lista;
    botao.disabled = true;
    botao.classList.add("is-atualizando");
    try {
      const total = await recarregarLista(lista);
      showToast(`Lista atualizada: ${total} ${LISTAS_SIGMA[lista].nome}.`);
    } catch (erro) {
      showToast(`Não foi possível atualizar a lista de ${LISTAS_SIGMA[lista].nome}.`);
    } finally {
      botao.disabled = false;
      botao.classList.remove("is-atualizando");
    }
  }

  function initAtualizarListas() {
    $$(".btn-atualizar-lista").forEach((botao) => {
      botao.addEventListener("click", () => aoAtualizarLista(botao));
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
    const vinculoAtivo = isPjVinculoAtivo();
    const subsection = $("#pj-classificacao-subsection");
    const sectionTitle = $("#pj-proponente-section-title");
    const sectionIntro = $("#pj-proponente-section-intro");

    subsection?.classList.toggle("hidden", !vinculoAtivo);
    if (sectionTitle) sectionTitle.textContent = vinculoAtivo ? "Proponente e classificação" : "Proponente do cadastro";
    if (sectionIntro) {
      sectionIntro.textContent = vinculoAtivo
        ? "Informe a instituição interessada, o representante legal e a classificação herdada do vínculo."
        : "Informe a instituição interessada e o representante legal responsáveis pelo cadastro.";
    }
    renumberProjetoSections();

    pli.classList.add("hidden");
    pef.classList.add("hidden");
    hint.classList.add("hidden");

    if (!vinculoAtivo) return;

    if (!plano) {
      hint.textContent = "Selecione o plano ou o programa do vínculo para classificar a demanda.";
      hint.classList.remove("hidden");
      return;
    }

    if (plano.id === PLANO_PLI) {
      pli.classList.remove("hidden");
      // Sem placeholder o navegador pré-seleciona a 1ª opção e a validação obrigatória nunca dispara.
      fillSelect($("#frente"), SLTCatalog.frentesPorPlano(planoId), "id", (f) => f.nome_oficial, "Selecione…");
    } else if (plano.id === PLANO_PEF) {
      pef.classList.remove("hidden");
      fillSelect($("#eixo"), SLTCatalog.eixosPorPlano(planoId), "id", (e) => e.nome_oficial, "Selecione…");
      onEixoChange();
    } else {
      // Plano sem frentes nem eixos: a subseção ficaria vazia sem explicação.
      hint.textContent = `O plano ${plano.sigla || plano.nome_oficial} não possui frente ou eixo para classificar a demanda.`;
      hint.classList.remove("hidden");
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
    if (!hintTic) return;
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
      ? `<a class="link-catalogo" href="/public/cadastro/catalogo-diretorias/#${encodeURIComponent(diretoriaId)}" target="_blank" rel="noopener">Critérios da diretoria ↗</a>`
      : "";
    const planoLink = planoId
      ? `<a class="link-catalogo" href="/public/cadastro/catalogo-planos/?diretoria=${encodeURIComponent(diretoriaId || "")}#${encodeURIComponent(planoId)}" target="_blank" rel="noopener">Detalhes do plano ↗</a>`
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
      linkPlanos.href = "/public/cadastro/catalogo-planos/?diretoria=" + encodeURIComponent(planoApi.diretoria_id);
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
    const planoParam = params.get("plano");
    if (programa && $("#programa")) {
      setPjVinculo(true);
      updatePjVinculoPanel();
      $("#programa").value = programa;
      $("#programa").dispatchEvent(new Event("change"));
    } else if (planoParam && planosCache.some((p) => p.id === planoParam)) {
      // Links dos catálogos: vínculo direto ao plano + frente/eixo/corredor TIC já escolhidos.
      setPjVinculo(true);
      const tipoPlano = document.querySelector('input[name="pj-vinculo-tipo"][value="plano"]');
      if (tipoPlano) tipoPlano.checked = true;
      updatePjVinculoPanel();
      $("#pj-plano-vinculo").value = planoParam;
      $("#pj-plano-vinculo").dispatchEvent(new Event("change"));
      selectOptionIfExists("#frente", params.get("frente"));
      if (selectOptionIfExists("#eixo", params.get("eixo"))) onEixoChange();
      selectOptionIfExists("#corredor_tic", params.get("corredor_tic"));
      updateClassificacaoHints();
      syncFieldFilledStates($("#form-cadastro"));
      renderReview();
    }
    const step = params.get("step");
    if (step) revealProjetoStep(Number(step));
  }

  function selectOptionIfExists(selector, value) {
    const el = $(selector);
    if (!el || !value || ![...el.options].some((o) => o.value === value)) return false;
    el.value = value;
    return true;
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
      refreshSpatialAnalyses();
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
    refreshSpatialAnalyses();
  }

  /** O formulário é aberto: a localização pode ter sido marcada antes de o vínculo mudar. */
  function refreshSpatialAnalyses() {
    pgAbr?.refreshSpatialAnalysis?.();
    SLTGeometria.refreshSpatialAnalysis?.();
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

    const vigIni = $("#prj-vig-ini").value;
    const vigFim = $("#prj-vig-fim").value;
    const valorGlobal = parseMoedaBr($("#prj-capex").value);
    const fmtDataBr = (v) => { const p = String(v).slice(0, 10).split("-"); return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : v; };
    const fmtMoedaBr = (v) => "R$ " + Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const vigenciaRows = [
      reviewRow("Vigência início", escapeHtml(vigIni ? fmtDataBr(vigIni) : "—")),
      reviewRow("Vigência fim", escapeHtml(vigFim ? fmtDataBr(vigFim) : "—")),
      reviewRow("Capex — custo estimado para implantação", escapeHtml(valorGlobal != null ? fmtMoedaBr(valorGlobal) : "—")),
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
      reviewSection("Vigência e recursos", vigenciaRows.join("")),
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
      tipo_demandante: currentTipoDemandante,
      status: "analise_em_avaliacao",
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
      classificacao: !isPjVinculoAtivo()
        ? null
        : plano?.id === PLANO_PLI
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
      vigencia_inicio: $("#prj-vig-ini").value || null,
      vigencia_fim: $("#prj-vig-fim").value || null,
      valor_global: parseMoedaBr($("#prj-capex").value),
      atributos_cadastrais: cadastralAttributes("prj", true),
    };
  }

  function selectTipo(tipo) {
    if (currentTipoDemandante === "privada" && tipo !== "projeto") return;
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

  function selectTipoDemandante(tipoDemandante) {
    const tipo = tipoDemandante === "privada" ? "privada" : "institucional";
    currentTipoDemandante = tipo;
    $$(".demandante-card").forEach((card) => {
      const selected = card.dataset.demandante === tipo;
      card.classList.toggle("is-active", selected);
      card.setAttribute("aria-selected", String(selected));
    });

    const demandaPrivada = tipo === "privada";
    $$(".tipo-card").forEach((card) => {
      const incompativel = demandaPrivada && card.dataset.tipo !== "projeto";
      card.classList.toggle("is-incompativel", incompativel);
      card.setAttribute("aria-disabled", String(incompativel));
    });
    $("#restricao-demanda-privada")?.classList.toggle("hidden", !demandaPrivada);

    if (demandaPrivada) selectTipo("projeto");
  }

  function updateProgramasSelect() {
    const sel = $("#programa");
    const items = programasParaVinculo(programasCache);
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
      planosCache = await SLTDemandasApi.listPlanosVinculaveis();
    } catch (err) {
      planosCache = [];
    }
    const pgSel = $("#pg-plano");
    const planosVinculo = planosParaVinculo(planosCache);
    if (pgSel) {
      fillSelect(
        pgSel,
        planosVinculo,
        "id",
        (p) => p.nome,
        planosVinculo.length ? "Selecione um plano cadastrado…" : "Nenhum plano cadastrado"
      );
    }
    const pjSel = $("#pj-plano-vinculo");
    if (pjSel) {
      fillSelect(
        pjSel,
        planosVinculo,
        "id",
        (p) => p.nome,
        planosVinculo.length ? "Selecione um plano cadastrado…" : "Nenhum plano cadastrado"
      );
    }
    updatePgVinculoPanel();
    updatePjVinculoPanel();
  }

  async function loadProgramasCache() {
    try {
      programasCache = await SLTDemandasApi.listProgramasVinculaveis();
    } catch (err) {
      programasCache = [];
    }
    updateProgramasSelect();
  }

  function initTipoSelector() {
    $$(".tipo-card").forEach((card) => {
      card.addEventListener("click", () => selectTipo(card.dataset.tipo));
    });
  }

  function initTipoDemandanteSelector() {
    $$(".demandante-card").forEach((card) => {
      card.addEventListener("click", () => selectTipoDemandante(card.dataset.demandante));
    });
  }

  function validarPlano() {
    let erro = null;
    if (!$("#pl-nome").value.trim() || !$("#pl-descricao").value.trim() || !$("#pl-diretoria").value) {
      erro = "Preencha nome, descrição e diretoria do plano.";
    } else if (!$("#pl-instituicao").value) {
      erro = "Selecione a instituição interessada.";
    } else if (!$("#pl-representante").value) {
      erro = "Selecione o representante legal.";
    } else if (!plAbr.getSelectedIds().length) {
      erro = "Selecione ao menos uma unidade de abrangência.";
    }
    if (erro) showToast(erro);
    return !erro;
  }

  function buildPlanoPayload() {
    const rep = buildRepresentantePayload("#pl-representante", "#pl-rep_email", "#pl-rep_telefone");
    const inst = buildInstituicaoPayload("#pl-instituicao", "#pl-cnpj");
    return {
      tipo_demandante: "institucional",
      diretoria_id: $("#pl-diretoria").value,
      nome: $("#pl-nome").value.trim(),
      descricao: $("#pl-descricao").value.trim(),
      objetivo_estrategico: $("#pl-objetivo").value.trim() || null,
      ...inst,
      pessoa_id: rep.pessoa_id,
      representante: rep.representante,
      vigencia_inicio: $("#pl-vig-ini").value || null,
      vigencia_fim: $("#pl-vig-fim").value || null,
      valor_global: parseMoedaBr($("#pl-valor").value),
      atributos_cadastrais: cadastralAttributes("pl", false),
      unidades_espaciais: plAbr.getSelectedIds(),
    };
  }

  function validarPrograma() {
    if (!validateProgramaStep(1) || !validateProgramaStep(3) || !validateProgramaStep(4)) return false;
    if (isPgVinculoAtivo() && !validateProgramaStep(2)) return false;
    return ensureSpatialAcknowledgedForSubmit("programa");
  }

  function buildProgramaPayload() {
    const rep = buildRepresentantePayload("#pg-representante", "#pg-rep_email", "#pg-rep_telefone");
    const inst = buildInstituicaoPayload("#pg-instituicao", "#pg-cnpj");
    return {
      tipo_demandante: "institucional",
      plano_codigo: isPgVinculoAtivo() ? $("#pg-plano").value : null,
      vinculo_institucional: isPgVinculoAtivo(),
      nome: $("#pg-nome").value.trim(),
      descricao: $("#pg-descricao").value.trim(),
      objetivo: $("#pg-objetivo").value.trim() || null,
      publico_alvo: $("#pg-publico").value.trim() || null,
      justificativa: $("#pg-justificativa").value.trim() || null,
      orgao_responsavel: $("#pg-orgao").value.trim() || null,
      valor_global: parseMoedaBr($("#pg-capex").value),
      atributos_cadastrais: cadastralAttributes("pg", true),
      ...inst,
      pessoa_id: rep.pessoa_id,
      representante: rep.representante,
      unidades_espaciais: pgAbr.getSelectedIds(),
    };
  }

  function validarProjeto() {
    if (!validateStep(1) || !validateStep(3) || !validateStep(5)) return false;
    if (isPjVinculoAtivo() && !validateStep(2)) return false;
    return ensureSpatialAcknowledgedForSubmit("projeto");
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
      if (!validarPlano()) return;
      const payload = buildPlanoPayload();
      const btn = e.submitter;
      if (btn) btn.disabled = true;
      try {
        await SLTDemandasApi.createPlano(payload);
        showToast("Plano cadastrado com sucesso.");
        setTimeout(() => (window.location.href = "/public/painel/"), 1500);
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
      if (!validarPrograma()) return;
      const payload = buildProgramaPayload();
      const btn = e.submitter;
      if (btn) btn.disabled = true;
      try {
        await SLTDemandasApi.createPrograma(payload);
        showToast("Programa cadastrado com sucesso.");
        setTimeout(() => (window.location.href = "/public/painel/"), 1500);
      } catch (err) {
        showToast(err.message || "Erro ao cadastrar programa.");
      } finally {
        if (btn) btn.disabled = false;
      }
    });
  }

  async function init() {
    initCadastroSectionCards();
    initCurrencyInput("#prj-capex");
    initCurrencyInput("#pg-capex");
    initCurrencyInput("#pl-valor");
    await loadSigmaCadastros();

    await SLTCatalog.loadCatalog("../");
    const refRes = await fetch("/config/referencia-classificacao.json");
    if (refRes.ok) classificacaoRef = await refRes.json();
    const cat = SLTCatalog.catalog;

    fillSelect($("#modal"), SLTCatalog.ativos(cat.modais), "id", (m) => m.nome, "— Opcional —");
    atualizarTipologiasPorModal();
    $("#modal").addEventListener("change", atualizarTipologiasPorModal);

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
      if (!validarProjeto()) return;
      const demanda = buildDemanda();
      const submitBtn = e.submitter || $("#form-cadastro").querySelector('[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;
      try {
        await SLTDemandasApi.createDemanda(demanda);
        showToast("Demanda registrada com sucesso.");
        setTimeout(() => {
          window.location.href = "/public/painel/";
        }, 1500);
      } catch (err) {
        console.error(err);
        showToast(err.message || "Erro ao registrar demanda.");
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });

    SLTGeometria.init();
    // O fluxo é aberto (sem "Continuar"), então a revisão acompanha o preenchimento.
    SLTGeometria.setOnAnalysisChange(renderReview);
    $("#form-cadastro").addEventListener("input", renderReview);
    $("#form-cadastro").addEventListener("change", renderReview);
    renderReview();
    initTipoDemandanteSelector();
    initTipoSelector();
    initFieldFilledSync();
    initAtualizarListas();
    try {
      await loadAtributosObjetoDomain();
    } catch (err) {
      // Falha nos atributos opcionais não pode impedir o restante do cadastro de iniciar.
      console.error(err);
      showToast(err.message);
    }
    await loadPlanosCache();
    renumberProgramaSections();
    renumberPlanoSubsections();
    initPlanoForm();
    initProgramaForm();
    await loadProgramasCache();
    syncProgramaPanelsVisibility();
    syncProjetoPanelsVisibility();

    const params = new URLSearchParams(window.location.search);
    const demandanteParam = params.get("demandante");
    selectTipoDemandante(demandanteParam === "privada" ? "privada" : "institucional");
    const TIPOS_VALIDOS = ["plano", "programa", "projeto"];
    let tipoParam = params.get("tipo");
    if (!TIPOS_VALIDOS.includes(tipoParam)) {
      tipoParam = params.get("programa") || params.get("plano") ? "projeto" : null;
    }
    if (currentTipoDemandante === "privada") selectTipo("projeto");
    else if (tipoParam) selectTipo(tipoParam);
    else selectTipo("plano");
    // Depois de selectTipo, que reinicia o wizard e apagaria o vínculo vindo da URL.
    if (!$("#form-cadastro").classList.contains("hidden")) applyUrlParams();
    // "Usar esta diretoria no cadastro" (catálogo): o plano é o nível que escolhe diretoria.
    const diretoriaParam = params.get("diretoria");
    const plDiretoria = $("#pl-diretoria");
    if (
      diretoriaParam &&
      !$("#form-plano").classList.contains("hidden") &&
      [...plDiretoria.options].some((o) => o.value === diretoriaParam)
    ) {
      plDiretoria.value = diretoriaParam;
      syncFieldFilledState(plDiretoria);
    }
  }

  // ---------------------------------------------------------------------------
  // Modo embutido (?embed=sei): a página de Contribuições do SEI hospeda este
  // formulário num iframe, preenche com o que foi extraído do PDF e cria a
  // demanda pela própria rota do SEI, usando as mesmas validações e payloads.
  // ---------------------------------------------------------------------------
  const SUGESTAO_CAMPOS = {
    projeto: {
      // O modal vem antes: o change dele refaz a lista de tipologias do 3.3.
      modal_id: "#modal",
      nome: "#nome", descricao: "#descricao", vigencia_inicio: "#prj-vig-ini", vigencia_fim: "#prj-vig-fim",
      prazo_referencia_meses: "#prj-prazo", maturidade_objeto: "#prj-maturidade", lat: "#lat", lng: "#lng",
    },
    plano: {
      nome: "#pl-nome", descricao: "#pl-descricao", objetivo_estrategico: "#pl-objetivo",
      vigencia_inicio: "#pl-vig-ini", vigencia_fim: "#pl-vig-fim",
      prazo_referencia_meses: "#pl-prazo", maturidade_objeto: "#pl-maturidade",
    },
    programa: {
      nome: "#pg-nome", descricao: "#pg-descricao", objetivo: "#pg-objetivo", publico_alvo: "#pg-publico",
      justificativa: "#pg-justificativa", orgao_responsavel: "#pg-orgao",
      prazo_referencia_meses: "#pg-prazo", maturidade_objeto: "#pg-maturidade",
    },
  };
  const SUGESTAO_MOEDA = { projeto: "#prj-capex", plano: "#pl-valor", programa: "#pg-capex" };
  const SUGESTAO_PROPONENTE = {
    projeto: ["#instituicao", "#representante"],
    plano: ["#pl-instituicao", "#pl-representante"],
    programa: ["#pg-instituicao", "#pg-representante"],
  };

  function tipoFormularioAtivo() {
    return document.querySelector(".tipo-form:not(.hidden)")?.dataset.tipo || "projeto";
  }

  function definirCampoSugerido(selector, valor) {
    const el = $(selector);
    if (!el || valor == null || valor === "") return false;
    if (el.tagName === "SELECT" && ![...el.options].some((o) => o.value === String(valor))) return false;
    el.value = String(valor);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    el.classList.add("sei-preenchido");
    return true;
  }

  // Cadastros do SIGMA para o proponente lido do PDF que ainda não está nas listas.
  const SIGMA_CADASTRO = {
    instituicao: { url: SLTSigmaRead.CADASTRO_INSTITUICAO_URL, campo: "#cnpj", rotulo: "cadastro da instituição" },
    pessoa: { url: SLTSigmaRead.CADASTRO_PESSOA_URL, campo: "#nomeCompleto", rotulo: "cadastro do representante legal" },
  };
  // Última sugestão do PDF: o "atualize a lista" refaz só o proponente, sem tocar no resto do formulário.
  let ultimaSugestao = null;

  function removerAvisoSigma(selector) {
    document.getElementById(`aviso-sigma-${selector.slice(1)}`)?.remove();
  }

  async function copiarValor(valor, aviso) {
    aviso.querySelector(".aviso-sigma-nota")?.remove();
    if (!valor) return;
    const nota = document.createElement("p");
    nota.className = "aviso-sigma-nota";
    try {
      await navigator.clipboard.writeText(valor);
      nota.textContent = `Não foi possível preencher o SIGMA a partir daqui: "${valor}" foi copiado — cole no formulário.`;
    } catch (erro) {
      nota.textContent = `Não foi possível preencher o SIGMA a partir daqui: copie "${valor}" e cole no formulário.`;
    }
    aviso.append(nota);
  }

  // SICARD (/sicard/) e SIGMA (/cadastro/) estão na mesma origem na VM: a aba aberta
  // é acessível daqui, e o campo é preenchido assim que o formulário do SIGMA carrega.
  // Em outra origem (ambiente local) o navegador bloqueia o acesso: o valor é copiado.
  function abrirCadastroSigma(cadastro, valor, aviso) {
    const { url, campo } = SIGMA_CADASTRO[cadastro];
    const aba = window.open(url, "_blank");
    if (!aba) {
      copiarValor(valor, aviso);
      return;
    }
    if (!valor) return;
    const limite = Date.now() + 20000;
    const tentar = () => {
      let input = null;
      try {
        if (aba.location.href !== "about:blank" && aba.document.readyState === "complete") {
          input = aba.document.querySelector(campo);
        }
      } catch (erro) {
        copiarValor(valor, aviso); // outra origem
        return;
      }
      if (input) {
        input.value = valor;
        // Os eventos acionam as máscaras e as validações do próprio SIGMA.
        ["input", "change", "blur"].forEach((tipo) => input.dispatchEvent(new Event(tipo, { bubbles: true })));
        return;
      }
      if (aba.closed) return;
      if (Date.now() < limite) setTimeout(tentar, 300);
      else copiarValor(valor, aviso);
    };
    setTimeout(tentar, 300);
  }

  async function atualizarListasSigma(botao) {
    botao.disabled = true;
    botao.textContent = "atualizando…";
    try {
      await recarregarLista("instituicoes");
      await recarregarLista("pessoas");
    } catch (erro) {
      botao.disabled = false;
      botao.textContent = "não foi possível atualizar — tente de novo";
    }
  }

  /** Aviso abaixo do campo: o proponente lido do PDF não está na lista do SIGMA. */
  function avisarNaoEncontrado(selector, cadastro, nome, cnpj) {
    const campo = $(selector);
    if (!campo) return;
    const { url, rotulo } = SIGMA_CADASTRO[cadastro];
    const aviso = document.createElement("div");
    aviso.id = `aviso-sigma-${selector.slice(1)}`;
    aviso.className = "aviso-sigma";
    aviso.setAttribute("role", "status");
    const link = `<a href="${escapeHtml(url)}" target="_blank" data-cadastro-sigma>${rotulo}</a>`;
    const atualizar = '<button type="button" class="aviso-sigma-atualizar">atualize a lista</button>';
    if (cadastro === "instituicao") {
      const quem = nome ? `A instituição <strong>“${escapeHtml(nome)}”</strong>` : "A instituição";
      const documento = cnpj ? `, CNPJ <strong>${escapeHtml(cnpj)}</strong>,` : " (CNPJ não identificado no PDF)";
      aviso.innerHTML = `${quem}${documento} lida do PDF, não foi encontrada na lista disponível. `
        + `Ela é a instituição desta demanda? Se for, faça o ${link} no SIGMA`
        + `${cnpj ? " — o CNPJ já vai preenchido —" : ""} e depois ${atualizar}.`;
    } else {
      aviso.innerHTML = `O representante legal <strong>“${escapeHtml(nome)}”</strong>, lido do PDF, não foi encontrado na lista disponível. `
        + `Ele é o representante desta demanda? Se for, faça o ${link} no SIGMA — o nome completo já vai preenchido — e depois ${atualizar}.`;
    }
    // O select fica dentro do flex com o botão de atualizar: o aviso vai depois do conjunto.
    (campo.closest(".campo-com-acao") || campo).insertAdjacentElement("afterend", aviso);
    const valor = cadastro === "instituicao" ? cnpj || "" : nome || "";
    aviso.querySelector("[data-cadastro-sigma]").addEventListener("click", (evento) => {
      evento.preventDefault();
      abrirCadastroSigma(cadastro, valor, aviso);
    });
    aviso.querySelector(".aviso-sigma-atualizar").addEventListener("click", (evento) => atualizarListasSigma(evento.currentTarget));
    // Escolhido um valor da lista, o aviso deixa de valer (ouvinte único por campo).
    if (!campo.dataset.avisoSigma) {
      campo.dataset.avisoSigma = "1";
      campo.addEventListener("change", () => {
        if (campo.value) removerAvisoSigma(selector);
      });
    }
  }

  function preencherComSugestoes(detalhe) {
    const tipo = tipoFormularioAtivo();
    const campos = detalhe?.campos_sugeridos || {};
    let preenchidos = 0;
    Object.entries(SUGESTAO_CAMPOS[tipo]).forEach(([campo, selector]) => {
      if (definirCampoSugerido(selector, campos[campo])) preenchidos += 1;
    });
    // O campo de moeda reformata o que é digitado; entra já no formato brasileiro.
    if (campos.valor_global != null && definirCampoSugerido(SUGESTAO_MOEDA[tipo], formatMoedaBr(Number(campos.valor_global)))) {
      preenchidos += 1;
    }
    ultimaSugestao = { tipo, campos };
    return preenchidos + preencherProponente(tipo, campos);
  }

  /**
   * Proponente só por identificação exata no SIGMA: CNPJ ou nome idêntico para a instituição,
   * e-mail ou nome idêntico para o representante (ignorando acentos, caixa e espaços).
   * Sem correspondência, o valor lido não é escolhido: um aviso abaixo do campo leva ao cadastro no SIGMA.
   */
  function preencherProponente(tipo, campos) {
    let preenchidos = 0;
    const [instSel, repSel] = SUGESTAO_PROPONENTE[tipo];
    const comparavel = (texto) =>
      String(texto || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
    const cnpj = String(campos.instituicao_cnpj || "").replace(/\D/g, "");
    const nomeInstituicao = comparavel(campos.instituicao_label);
    const inst =
      (cnpj && instituicoes.find((i) => SLTSigmaRead.cnpjDisplay(i).replace(/\D/g, "") === cnpj)) ||
      (nomeInstituicao &&
        instituicoes.find((i) => [i.razao_social, i.nome, i.nome_fantasia].some((n) => comparavel(n) === nomeInstituicao))) ||
      null;
    removerAvisoSigma(instSel);
    if (inst) {
      if (definirCampoSugerido(instSel, inst.id)) preenchidos += 1;
    } else if (cnpj || nomeInstituicao) {
      avisarNaoEncontrado(instSel, "instituicao", campos.instituicao_label, campos.instituicao_cnpj);
    }
    const email = comparavel(campos.representante_email);
    const nomeRepresentante = comparavel(campos.representante_nome);
    const pessoa =
      (email && pessoas.find((p) => comparavel(p.email) === email)) ||
      (nomeRepresentante && pessoas.find((p) => comparavel(p.nome_completo || p.nome) === nomeRepresentante)) ||
      null;
    removerAvisoSigma(repSel);
    if (pessoa) {
      if (definirCampoSugerido(repSel, pessoa.id)) preenchidos += 1;
    } else if (nomeRepresentante) {
      avisarNaoEncontrado(repSel, "pessoa", campos.representante_nome);
    }
    return preenchidos;
  }

  function coletarParaEnvio() {
    ultimoAviso = "";
    const tipo = tipoFormularioAtivo();
    const valido = tipo === "plano" ? validarPlano() : tipo === "programa" ? validarPrograma() : validarProjeto();
    if (!valido) {
      throw new Error(ultimoAviso || $("#map-error")?.textContent?.trim() || "Revise os campos do formulário.");
    }
    const campos = tipo === "plano" ? buildPlanoPayload() : tipo === "programa" ? buildProgramaPayload() : buildDemanda();
    return { tipo, campos };
  }

  let resolverEmbedPronto;
  let rejeitarEmbedPronto;
  const embedPronto = new Promise((resolve, reject) => {
    resolverEmbedPronto = resolve;
    rejeitarEmbedPronto = reject;
  });
  embedPronto.catch(() => {});
  window.SLTCadastroEmbed = {
    pronto: embedPronto,
    preencher: preencherComSugestoes,
    coletar: coletarParaEnvio,
  };

  init()
    .then(() => resolverEmbedPronto())
    .catch((err) => {
      console.error(err);
      showToast("Erro ao iniciar cadastro.");
      rejeitarEmbedPronto(err);
    });
})();
