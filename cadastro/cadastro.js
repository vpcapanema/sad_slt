(function () {
  const EIXO_TIC = "EIXO-PEF-02";
  const PLANO_PLI = "PLANO-PLI";
  const PLANO_PEF = "PLANO-PEF";

  let classificacaoRef = null;
  let instituicoes = [];
  let pessoas = [];

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  function showToast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    setTimeout(() => t.classList.remove("show"), 3200);
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
  }

  function showStep(n) {
    $$(".step-panel").forEach((p) => {
      p.classList.toggle("hidden", Number(p.dataset.step) !== n);
    });
    if (n === 2) setTimeout(() => SLTGeometria.invalidateSize(), 120);
    if (n === 4) renderReview();
  }

  function getGeometria() {
    return SLTGeometria.getGeometria();
  }

  function getCoordenadas() {
    return SLTGeometria.getCoordenadas();
  }

  function validateStep(step) {
    if (step === 1) {
      if (!$("#instituicao").value || !$("#diretoria").value || !$("#plano").value) {
        showToast("Selecione instituição, diretoria e plano.");
        return false;
      }
    }
    if (step === 2) {
      if (!$("#nome").value.trim()) {
        showToast("Informe o nome do projeto.");
        return false;
      }
      if (!$("#representante").value) {
        showToast("Selecione o representante legal.");
        return false;
      }
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
    }
    if (step === 3) {
      const plano = SLTCatalog.getPlano($("#plano").value);
      if (plano?.id === PLANO_PLI && !$("#frente").value) {
        showToast("Selecione a frente de atuação.");
        return false;
      }
      if (plano?.id === PLANO_PEF && !$("#eixo").value) {
        showToast("Selecione o eixo ferroviário.");
        return false;
      }
    }
    return true;
  }

  function onInstituicaoChange() {
    const inst = SLTSigmaRead.findInstituicao(instituicoes, $("#instituicao").value);
    $("#cnpj").value = inst ? SLTSigmaRead.cnpjDisplay(inst) : "";
  }

  function onRepresentanteChange() {
    const p = SLTSigmaRead.findPessoa(pessoas, $("#representante").value);
    $("#rep_email").value = p?.email || "";
    $("#rep_telefone").value = SLTSigmaRead.formatTelefone(p?.telefone);
  }

  async function loadSigmaCadastros() {
    const hint = $("#cadastro-load-hint");
    const selInst = $("#instituicao");
    const selRep = $("#representante");

    try {
      await SLTSigmaRead.checkApi();
    } catch (err) {
      hint.textContent = err.message;
    }

    try {
      instituicoes = await SLTSigmaRead.listInstituicoes();
      selInst.disabled = false;
      fillSelect(
        selInst,
        instituicoes,
        "id",
        (i) => SLTSigmaRead.labelInstituicao(i),
        "Selecione a instituição…"
      );
      hint.textContent = "";
    } catch (err) {
      selInst.innerHTML = '<option value="">Não foi possível carregar instituições</option>';
      hint.textContent = "Não foi possível carregar as instituições. Tente novamente em instantes.";
    }

    try {
      pessoas = await SLTSigmaRead.listPessoas();
      selRep.disabled = false;
      fillSelect(selRep, pessoas, "id", (p) => SLTSigmaRead.labelPessoa(p), "Selecione o representante…");
    } catch (err) {
      selRep.innerHTML = '<option value="">Não foi possível carregar representantes</option>';
      hint.textContent = hint.textContent || "Não foi possível carregar os representantes. Tente novamente em instantes.";
    }
  }

  function updateClassificacaoUI() {
    const planoId = $("#plano").value;
    const plano = SLTCatalog.getPlano(planoId);
    const pli = $("#classificacao-pli");
    const pef = $("#classificacao-pef");
    const hint = $("#classificacao-hint");

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
    const planoId = $("#plano").value;
    const items = planoId ? SLTCatalog.carteirasPorPlano(planoId) : [];
    fillSelect($("#carteira"), items, "id", (c) => c.nome, "— Opcional —");
  }

  function labelById(list, id, labelKey) {
    if (!id) return "—";
    const item = (list || []).find((x) => x.id === id);
    return item ? item[labelKey || "nome_oficial"] || item.nome : id;
  }

  function updateContextHints() {
    const cat = SLTCatalog.catalog;
    const dirId = $("#diretoria").value;
    const planoId = $("#plano").value;
    const hintDir = $("#hint-diretoria");
    const hintPlano = $("#hint-plano");
    const linkPlanos = $("#link-catalogo-planos");

    if (dirId) {
      const d = cat.diretorias.find((x) => x.id === dirId);
      hintDir.innerHTML = d
        ? `<span class="field-help"><a href="catalogo-diretorias.html#${encodeURIComponent(dirId)}" target="_blank" rel="noopener">Consulte os critérios de ${escapeHtml(d.nome_oficial)} ↗</a></span>`
        : "";
      hintDir.classList.toggle("hidden", !d);
      linkPlanos.href = "catalogo-planos.html?diretoria=" + encodeURIComponent(dirId);
    } else {
      hintDir.classList.add("hidden");
      linkPlanos.href = "catalogo-planos.html";
    }

    if (planoId) {
      const p = SLTCatalog.getPlano(planoId);
      hintPlano.innerHTML = p
        ? `<span class="field-help"><a href="catalogo-planos.html?diretoria=${encodeURIComponent(p.diretoria_id || dirId)}#${encodeURIComponent(planoId)}" target="_blank" rel="noopener">${escapeHtml(p.sigla)} — ${escapeHtml(p.nome_oficial)}</a></span>`
        : "";
      hintPlano.classList.toggle("hidden", !p);
    } else if (dirId && SLTCatalog.planosPorDiretoria(dirId).length === 0) {
      const d = cat.diretorias.find((x) => x.id === dirId);
      hintPlano.innerHTML = `<span class="field-help" style="color:#a15c00;"><strong>Atenção:</strong> a diretoria ${escapeHtml(
        d?.nome_oficial || dirId
      )} não possui planos vinculados. Os planos estratégicos (PLI-SP 2050 e PEF-SP 2050) pertencem à Diretoria de Planejamento.</span>`;
      hintPlano.classList.remove("hidden");
    } else hintPlano.classList.add("hidden");
  }

  function applyUrlParams() {
    const params = new URLSearchParams(window.location.search);
    let diretoria = params.get("diretoria");
    const plano = params.get("plano");
    if (plano && !diretoria) {
      const p = SLTCatalog.getPlano(plano);
      if (p) diretoria = p.diretoria_id;
    }
    if (diretoria) {
      $("#diretoria").value = diretoria;
      $("#diretoria").dispatchEvent(new Event("change"));
    }
    if (plano) {
      $("#plano").value = plano;
      $("#plano").dispatchEvent(new Event("change"));
    }
    const step = params.get("step");
    if (step) showStep(Number(step));
    updateContextHints();
  }

  function labelGeometria(tipo) {
    if (tipo === "Point") return "Ponto";
    if (tipo === "Polygon") return "Perímetro";
    if (tipo === "LineString") return "Linha";
    return tipo || "—";
  }

  function renderReview() {
    const cat = SLTCatalog.catalog;
    const plano = SLTCatalog.getPlano($("#plano").value);
    const inst = SLTSigmaRead.findInstituicao(instituicoes, $("#instituicao").value);
    const geom = getGeometria();
    const coords = getCoordenadas();
    const pessoa = SLTSigmaRead.findPessoa(pessoas, $("#representante").value);
    const html = `
      <dl>
        <dt>Instituição</dt><dd>${escapeHtml(inst ? SLTSigmaRead.labelInstituicao(inst) : "—")}</dd>
        <dt>CNPJ</dt><dd>${escapeHtml($("#cnpj").value || "—")}</dd>
        <dt>Diretoria</dt><dd>${labelById(cat.diretorias, $("#diretoria").value, "nome_oficial")}</dd>
        <dt>Plano</dt><dd>${plano ? plano.sigla + " — " + plano.nome_oficial : "—"}</dd>
        <dt>Projeto</dt><dd>${escapeHtml($("#nome").value.trim())}</dd>
        <dt>Descrição</dt><dd>${escapeHtml($("#descricao").value.trim() || "—")}</dd>
        <dt>Representante</dt><dd>${escapeHtml(pessoa ? SLTSigmaRead.labelPessoa(pessoa) : "—")}</dd>
        <dt>E-mail</dt><dd>${escapeHtml($("#rep_email").value || "—")}</dd>
        <dt>Telefone</dt><dd>${escapeHtml($("#rep_telefone").value || "—")}</dd>
        <dt>Coordenadas</dt><dd>${coords ? `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}` : "—"}</dd>
        <dt>Localização no mapa</dt><dd>${geom ? labelGeometria(geom.tipo) : "—"}</dd>
        ${plano?.id === PLANO_PLI ? `<dt>Frente</dt><dd>${labelById(cat.frentes_pli, $("#frente").value)}</dd>` : ""}
        ${plano?.id === PLANO_PEF ? `<dt>Eixo</dt><dd>${labelById(cat.eixos_pef, $("#eixo").value)}</dd>` : ""}
        ${$("#corredor_tic").value ? `<dt>Corredor TIC</dt><dd>${labelById(cat.corredores_tic, $("#corredor_tic").value)}</dd>` : ""}
      </dl>`;
    $("#review").innerHTML = html;
  }

  function escapeHtml(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function buildDemanda() {
    const plano = SLTCatalog.getPlano($("#plano").value);
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
      diretoria_id: $("#diretoria").value,
      plano_id: $("#plano").value,
      nome: $("#nome").value.trim(),
      descricao: $("#descricao").value.trim(),
      geometria: geom
        ? { tipo: geom.tipo, coordinates: geom.coordinates }
        : null,
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

  async function init() {
    await loadSigmaCadastros();

    await SLTCatalog.loadCatalog("../");
    const refRes = await fetch("../data/referencia-classificacao.json");
    if (refRes.ok) classificacaoRef = await refRes.json();
    const cat = SLTCatalog.catalog;

    fillSelect($("#diretoria"), SLTCatalog.ativos(cat.diretorias), "id", (d) => d.nome_oficial, "Selecione…");
    fillSelect($("#modal"), SLTCatalog.ativos(cat.modais), "id", (m) => m.nome, "— Opcional —");
    fillSelect($("#tipologia"), SLTCatalog.ativos(cat.tipologias), "id", (t) => t.nome, "— Opcional —");

    $("#instituicao").addEventListener("change", onInstituicaoChange);
    $("#representante").addEventListener("change", onRepresentanteChange);

    $("#diretoria").addEventListener("change", () => {
      const id = $("#diretoria").value;
      const planos = id ? SLTCatalog.planosPorDiretoria(id) : [];
      const sel = $("#plano");
      sel.disabled = !id;
      const planoPlaceholder = !id
        ? "Selecione a diretoria primeiro"
        : planos.length
          ? "Selecione…"
          : "Nenhum plano vinculado a esta diretoria";
      fillSelect(sel, planos, "id", (p) => p.sigla, planoPlaceholder);
      updateClassificacaoUI();
      updateCarteiras();
      updateContextHints();
    });

    $("#plano").addEventListener("change", () => {
      updateClassificacaoUI();
      updateCarteiras();
      updateContextHints();
    });

    $("#eixo").addEventListener("change", onEixoChange);
    $("#frente").addEventListener("change", updateClassificacaoHints);
    $("#corredor_tic").addEventListener("change", updateClassificacaoHints);

    $$(".btn-next").forEach((btn) => {
      btn.addEventListener("click", () => {
        const cur = Number(btn.closest(".step-panel").dataset.step);
        if (!validateStep(cur)) return;
        showStep(Number(btn.dataset.next));
      });
    });

    $$(".btn-prev").forEach((btn) => {
      btn.addEventListener("click", () => showStep(Number(btn.dataset.prev)));
    });

    $("#toggle-complementos").addEventListener("click", () => {
      $("#complementos-body").classList.toggle("hidden");
    });

    $("#form-cadastro").addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!validateStep(2) || !validateStep(3)) return;
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
    applyUrlParams();
  }

  init().catch((err) => {
    console.error(err);
    showToast("Erro ao iniciar cadastro.");
  });
})();
