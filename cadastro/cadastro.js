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

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  function showToast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    setTimeout(() => t.classList.remove("show"), 3200);
  }

  /** Destaque visual compartilhado: seletores com valor e campos derivados preenchidos. */
  function syncFieldFilledState(el) {
    if (!el) return;
    const value = String(el.value ?? "").trim();
    const filled =
      el.tagName === "SELECT" ? !el.disabled && value !== "" : value !== "";
    el.classList.toggle("field-filled", filled);
  }

  function syncFieldFilledStates(root) {
    const scope = root || document;
    scope.querySelectorAll("select, input[readonly]").forEach(syncFieldFilledState);
  }

  function initFieldFilledSync() {
    document.querySelectorAll("#form-cadastro, .tipo-form").forEach((form) => {
      form.addEventListener("change", (e) => {
        const t = e.target;
        if (t instanceof HTMLSelectElement || (t instanceof HTMLInputElement && t.readOnly)) {
          syncFieldFilledState(t);
        }
      });
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
      const numEl =
        sec.querySelector(":scope > h2 .cadastro-sec-num") ||
        sec.querySelector(".collapsible-hdr .cadastro-sec-num");
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
      const numEl = panel.querySelector(":scope > h2 .cadastro-sec-num, .collapsible-hdr .cadastro-sec-num");
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

  function syncProgramaPanelsVisibility() {
    const form = $("#form-programa");
    if (!form) return;
    const vinculo = isPgVinculoAtivo();
    form.querySelectorAll(".pg-step-panel").forEach((p) => {
      const s = Number(p.dataset.step);
      if (s === 1) {
        p.classList.remove("hidden");
        return;
      }
      if (s === 2) {
        p.classList.toggle("hidden", !vinculo || programaMaxRevealed < 2);
        return;
      }
      if (s === PROGRAMA_STEP_EXECUCAO_SUSPENDED) {
        p.classList.add("hidden");
        return;
      }
      p.classList.toggle("hidden", programaMaxRevealed < s);
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
        p.classList.remove("hidden");
        return;
      }
      if (s === 2) {
        p.classList.toggle("hidden", !vinculo || projetoMaxRevealed < 2);
        return;
      }
      p.classList.toggle("hidden", projetoMaxRevealed < s);
    });
    renumberProjetoSections();
  }

  function revealProgramaStep(n) {
    programaMaxRevealed = Math.max(programaMaxRevealed, n);
    currentProgramaStep = n;
    syncProgramaPanelsVisibility();
    if (n === 4 && pgAbr) {
      setTimeout(() => pgAbr.invalidateSize(), 120);
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
    $$("#form-programa .pg-step-panel").forEach((p) => {
      p.classList.toggle("hidden", Number(p.dataset.step) > 1);
    });
    renumberProgramaSections();
  }

  function resetProjetoWizard() {
    projetoMaxRevealed = 1;
    currentProjetoStep = 1;
    $$('input[name="pj-vinculo"]').forEach((el) => {
      el.checked = false;
    });
    $$("#form-cadastro .step-panel").forEach((p) => {
      p.classList.toggle("hidden", Number(p.dataset.step) > 1);
    });
    renumberProjetoSections();
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
      SLTSpatialConstraint.setParent(fc, meta);
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

  async function validateSelectedUnitsWithinParent(ids) {
    if (!SLTSpatialConstraint.hasParent() || !ids?.length) return true;
    try {
      const fc = await SLTDemandasApi.geoUnidadesGeojson(ids);
      return SLTSpatialConstraint.featuresWithinParent(fc);
    } catch (err) {
      return false;
    }
  }

  function reviewRow(label, valueHtml) {
    return `<dt>${escapeHtml(label)}</dt><dd>${valueHtml}</dd>`;
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
    const rows = [];

    rows.push(reviewRow("Nome do projeto", escapeHtml($("#nome").value.trim() || "—")));
    rows.push(reviewRow("Descrição", escapeHtml($("#descricao").value.trim() || "—")));
    rows.push(reviewRow("Vínculo institucional", isPjVinculoAtivo() ? "Sim" : "Não"));

    if (isPjVinculoAtivo()) {
      if (getPjVinculoTipo() === "programa") {
        rows.push(reviewRow("Programa vinculado", escapeHtml(prog?.nome || "—")));
      } else {
        const planoApi = planosCache.find((p) => p.id === $("#pj-plano-vinculo")?.value);
        rows.push(reviewRow("Plano vinculado", escapeHtml(planoApi?.nome || "—")));
      }
    }

    if (isPjVinculoAtivo() && getPjVinculoTipo() === "programa") {
      rows.push(
        reviewRow(
          "Plano (herdado)",
          plano ? escapeHtml(`${plano.sigla} — ${plano.nome_oficial}`) : escapeHtml(prog?.plano_nome || "—")
        )
      );
    } else if (!isPjVinculoAtivo()) {
      rows.push(
        reviewRow(
          "Diretoria",
          escapeHtml(labelById(cat.diretorias, getProjetoDiretoriaId(), "nome_oficial"))
        )
      );
      rows.push(
        reviewRow(
          "Plano",
          plano ? escapeHtml(`${plano.sigla} — ${plano.nome_oficial}`) : "—"
        )
      );
    }

    rows.push(reviewRow("Instituição interessada", escapeHtml(inst ? SLTSigmaRead.labelInstituicao(inst) : "—")));
    rows.push(reviewRow("CNPJ", escapeHtml($("#cnpj").value || "—")));
    rows.push(
      reviewRow("Representante legal", escapeHtml(pessoa ? SLTSigmaRead.labelPessoa(pessoa) : "—"))
    );
    rows.push(reviewRow("E-mail", escapeHtml($("#rep_email").value || "—")));
    rows.push(reviewRow("Telefone", escapeHtml($("#rep_telefone").value || "—")));

    if (plano?.id === PLANO_PLI) {
      rows.push(reviewRow("Frente PLI", escapeHtml(labelById(cat.frentes_pli, $("#frente").value))));
    } else if (plano?.id === PLANO_PEF) {
      rows.push(reviewRow("Eixo PEF", escapeHtml(labelById(cat.eixos_pef, $("#eixo").value))));
      if ($("#corredor_tic").value) {
        rows.push(
          reviewRow("Corredor TIC", escapeHtml(labelById(cat.corredores_tic, $("#corredor_tic").value)))
        );
      }
    }

    rows.push(reviewRow("Modal", escapeHtml(modal?.nome || "—")));
    rows.push(reviewRow("Tipologia", escapeHtml(tipologia?.nome || "—")));
    rows.push(reviewRow("Carteira", escapeHtml(carteira?.nome || "—")));
    rows.push(
      reviewRow(
        "Coordenadas",
        coords ? escapeHtml(`${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`) : "—"
      )
    );
    rows.push(reviewRow("Localização no mapa", escapeHtml(geom ? labelGeometria(geom.tipo) : "—")));

    $("#review").innerHTML = `<dl>${rows.join("")}</dl>`;
  }

  function buildDemanda() {
    const prog = getSelectedPrograma();
    const planoId = getProjetoPlanoId();
    const plano = SLTCatalog.getPlano(planoId);
    const inst = SLTSigmaRead.findInstituicao(instituicoes, $("#instituicao").value);
    const pessoaId = $("#representante").value;
    const pessoa = SLTSigmaRead.findPessoa(pessoas, pessoaId);
    const geom = getGeometria();
    const coords = getCoordenadas();
    return {
      id: SLTStorage.uid(),
      status: "fila_hierarquizacao",
      criadoEm: new Date().toISOString(),
      instituicao_id: $("#instituicao").value,
      instituicao_label: inst ? SLTSigmaRead.labelInstituicao(inst) : null,
      instituicao_cnpj: $("#cnpj").value || null,
      pessoa_id: pessoaId || null,
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
      representante: {
        pessoa_id: pessoaId,
        nome: pessoa ? SLTSigmaRead.labelPessoa(pessoa) : "",
        email: $("#rep_email").value.trim(),
        telefone: $("#rep_telefone").value.trim(),
      },
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
      if (!$("#pl-representante").value) {
        showToast("Selecione o representante legal.");
        return;
      }
      if (!unidades.length) {
        showToast("Selecione ao menos uma unidade de abrangência.");
        return;
      }
      const plInst = SLTSigmaRead.findInstituicao(instituicoes, $("#pl-instituicao").value);
      const rep = buildRepresentantePayload("#pl-representante", "#pl-rep_email", "#pl-rep_telefone");
      const payload = {
        diretoria_id: $("#pl-diretoria").value,
        nome: $("#pl-nome").value.trim(),
        descricao: $("#pl-descricao").value.trim(),
        objetivo_estrategico: $("#pl-objetivo").value.trim() || null,
        responsavel: plInst ? SLTSigmaRead.labelInstituicao(plInst) : null,
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
    });

    $$('input[name="pg-vinculo"]').forEach((el) => {
      el.addEventListener("change", onPgVinculoChoice);
    });
    $("#pg-plano")?.addEventListener("change", updateProgramaStrategicContext);
    $("#pg-instituicao").addEventListener("change", onProgramaInstituicaoChange);
    $("#pg-representante").addEventListener("change", () =>
      onRepresentanteFieldChange("#pg-representante", "#pg-rep_email", "#pg-rep_telefone")
    );

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
      const unidades = pgAbr.getSelectedIds();
      const payload = {
        plano_codigo: isPgVinculoAtivo() ? $("#pg-plano").value : null,
        nome: $("#pg-nome").value.trim(),
        descricao: $("#pg-descricao").value.trim(),
        objetivo: $("#pg-objetivo").value.trim() || null,
        publico_alvo: $("#pg-publico").value.trim() || null,
        justificativa: $("#pg-justificativa").value.trim() || null,
        orgao_responsavel: $("#pg-orgao").value.trim() || null,
        valor_global: $("#pg-valor").value ? Number($("#pg-valor").value) : null,
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
    initTipoSelector();
    initFieldFilledSync();
    await loadPlanosCache();
    renumberProgramaSections();
    initPlanoForm();
    initProgramaForm();
    loadProgramasCache();

    const tipoParam = new URLSearchParams(window.location.search).get("tipo");
    if (tipoParam) selectTipo(tipoParam);
    else selectTipo("plano");
  }

  init().catch((err) => {
    console.error(err);
    showToast("Erro ao iniciar cadastro.");
  });
})();
