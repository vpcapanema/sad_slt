(function () {
  const { escapeHtml, formatDate, formatCnpj, statusDemandaLabel, instituicaoLabel, planoLabel,
    classificacaoLabel, representanteLabel, geometriaResumo, fillSelect, statusBadgeClass,
    diretoriaLabel, labelById, PLANO_PLI, PLANO_PEF } = SLTAdminLabels;

  let demanda = null;
  let allDemandas = [];
  let selectedId = null;

  const SECTIONS = [
    { id: "sec-info", label: "Informações do Projeto" },
    { id: "sec-analise", label: "Análise" },
    { id: "sec-cadastro", label: "Cadastro" },
    { id: "sec-institucional", label: "Institucional e Projeto" },
    { id: "sec-representante", label: "Representante Legal" },
    { id: "sec-acoes", label: "Ações" },
  ];

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function codigoFromUrl() {
    return new URLSearchParams(location.search).get("id");
  }

  function buildClassificacaoFields(planoId) {
    if (planoId === PLANO_PLI) {
      return `
        <div class="form-field">
          <label for="fld-frente">Frente PLI</label>
          <select id="fld-frente"></select>
        </div>`;
    }
    if (planoId === PLANO_PEF) {
      return `
        <div class="form-field">
          <label for="fld-eixo">Eixo Ferroviário</label>
          <select id="fld-eixo"></select>
        </div>
        <div class="form-field span-2" id="wrap-tic">
          <label for="fld-tic">Corredor TIC</label>
          <select id="fld-tic"></select>
        </div>`;
    }
    return `
      <div class="form-field">
        <span class="field-help">Classificação disponível para planos PLI ou PEF.</span>
      </div>`;
  }

  function populateClassificacaoSelects(d) {
    const planoId = $("#fld-plano")?.value || d.plano_id;
    if (planoId === PLANO_PLI) {
      const sel = $("#fld-frente");
      if (!sel) return;
      fillSelect(sel, SLTCatalog.frentesPorPlano(planoId), "id", (f) => f.nome_oficial);
      sel.value = d.classificacao?.frente_id || "";
    } else if (planoId === PLANO_PEF) {
      const selEixo = $("#fld-eixo");
      if (!selEixo) return;
      fillSelect(selEixo, SLTCatalog.eixosPorPlano(planoId), "id", (e) => e.nome_oficial);
      selEixo.value = d.classificacao?.eixo_id || "";
      refreshTicSelect(d);
    }
  }

  function refreshTicSelect(d) {
    const eixoId = $("#fld-eixo")?.value;
    const wrap = $("#wrap-tic");
    const sel = $("#fld-tic");
    if (!wrap || !sel) return;
    const tics = SLTCatalog.ticsPorEixo(eixoId);
    wrap.style.display = tics.length ? "" : "none";
    fillSelect(sel, tics, "id", (t) => t.nome_oficial, "— Não especificado —");
    sel.value = d?.classificacao?.corredor_tic_id || "";
  }

  function refreshClassificacaoFields(d) {
    const container = $("#classificacao-fields");
    if (!container) return;
    const planoId = $("#fld-plano")?.value || d.plano_id;
    container.innerHTML = buildClassificacaoFields(planoId);
    populateClassificacaoSelects(d);
    $("#fld-eixo")?.addEventListener("change", () => refreshTicSelect({ classificacao: {} }));
  }

  function actionsHtml(d) {
    const canApprove = d.status === "fila_hierarquizacao" || d.status === "em_analise";
    return `
      <div class="form-field span-2">
        <label for="fld-motivo-aprov">Motivo (Aprovação — Opcional)</label>
        <textarea id="fld-motivo-aprov" class="admin-field-motivo" rows="3" placeholder="Usado ao clicar em Aprovar"></textarea>
      </div>
      <div class="admin-dashboard-actions span-2">
        <a href="demandas.html" class="btn btn-secondary">Voltar à lista</a>
        ${canApprove ? '<button type="button" class="btn btn-primary" id="btn-aprovar">Aprovar → objeto AHP</button>' : ""}
        <button type="button" class="btn btn-secondary" id="btn-analise">Em análise</button>
        <button type="button" class="btn btn-secondary" id="btn-reprovar">Reprovar</button>
        <button type="button" class="btn btn-secondary" id="btn-arquivar">Arquivar</button>
        <button type="button" class="btn btn-primary" id="btn-salvar">Salvar alterações</button>
      </div>`;
  }

  function catalogLabel(list, id) {
    return labelById(list, id, "nome");
  }

  function projectInfoHtml(d) {
    const { buildProjectInfoFields } = SLTAdminAnalysisInfo;
    const cat = SLTCatalog.catalog;
    const coords = SLTAdminAnalysisMap.coordsFromRecord(d);
    const coordText = coords ? `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}` : "—";
    const rep = d.representante || {};

    const fieldsHtml = buildProjectInfoFields({
      nome: escapeHtml(d.nome),
      codigo: `<code>${escapeHtml(d.id)}</code>`,
      descricao: escapeHtml(d.descricao || "—"),
      dataCadastro: escapeHtml(formatDate(d.criadoEm)),
      status: `<span class="${statusBadgeClass(d.status)}">${escapeHtml(statusDemandaLabel(d.status))}</span>`,
      instituicao: escapeHtml(instituicaoLabel(d)),
      cnpj: escapeHtml(formatCnpj(d.instituicao_cnpj)),
      diretoria: escapeHtml(diretoriaLabel(d.diretoria_id)),
      plano: escapeHtml(planoLabel(d.plano_id)),
      classificacao: escapeHtml(classificacaoLabel(d.classificacao, d.plano_id)),
      modal: escapeHtml(catalogLabel(cat?.modais, d.complementos?.modal_id)),
      tipologia: escapeHtml(catalogLabel(cat?.tipologias, d.complementos?.tipologia_id)),
      carteira: escapeHtml(catalogLabel(cat?.carteiras, d.complementos?.carteira_id)),
      latitude: coords ? escapeHtml(coords.lat.toFixed(6)) : "—",
      longitude: coords ? escapeHtml(coords.lng.toFixed(6)) : "—",
      representanteLegal: {
        nome: escapeHtml(rep.nome || representanteLabel(d)),
        email: escapeHtml(rep.email || "—"),
        telefone: escapeHtml(rep.telefone || "—"),
      },
      extra: [],
    });

    return `
      <section id="sec-info" class="card admin-dashboard-section">
        <h2>Informações do Projeto</h2>
        <div class="admin-dashboard-columns">
          <div class="admin-dashboard-col">
            <div class="admin-info-fields">${fieldsHtml}</div>
          </div>
          <div class="admin-dashboard-col">
            <div class="admin-info-map">
              <div id="admin-preview-map-wrap"></div>
              <p class="admin-info-coords">${escapeHtml(coordText)}</p>
            </div>
          </div>
        </div>
      </section>`;
  }

  function pageHtml(d) {
    return `
      <div class="admin-dashboard-layout">
        ${projectInfoHtml(d)}

        <section id="sec-analise" class="card admin-dashboard-section">
          <h2>Análise</h2>
          <div class="admin-analise-stack">
              <section id="sec-cadastro" class="admin-analise-subcard admin-dashboard-section">
                <h3>Cadastro</h3>
                <div class="admin-form-grid">
                  <div class="form-field">
                    <label for="fld-nome">Nome do Projeto</label>
                    <input type="text" id="fld-nome" maxlength="200" value="${escapeHtml(d.nome)}">
                  </div>
                  <div class="form-field">
                    <label for="fld-codigo">Código</label>
                    <input type="text" id="fld-codigo" class="admin-field-readonly" value="${escapeHtml(d.id)}" readonly aria-readonly="true">
                  </div>
                  <div class="form-field span-2">
                    <label for="fld-descricao">Descrição</label>
                    <textarea id="fld-descricao" rows="3">${escapeHtml(d.descricao || "")}</textarea>
                  </div>
                </div>
              </section>

              <section id="sec-institucional" class="admin-analise-subcard admin-dashboard-section">
                <h3>Institucional e Projeto</h3>
                <div class="admin-form-grid">
                  <div class="form-field">
                    <label for="fld-instituicao">Instituição</label>
                    <input type="text" id="fld-instituicao" class="admin-field-readonly admin-field-readonly--plain" value="${escapeHtml(instituicaoLabel(d))}" readonly aria-readonly="true">
                  </div>
                  <div class="form-field">
                    <label for="fld-cnpj">CNPJ</label>
                    <input type="text" id="fld-cnpj" class="admin-field-readonly admin-field-readonly--plain" value="${escapeHtml(formatCnpj(d.instituicao_cnpj))}" readonly aria-readonly="true">
                  </div>
                  <div class="form-field span-2">
                    <label for="fld-diretoria">Diretoria</label>
                    <select id="fld-diretoria"></select>
                  </div>
                  <div class="form-field">
                    <label for="fld-plano">Plano</label>
                    <select id="fld-plano"></select>
                  </div>
                  <div id="classificacao-fields" class="admin-form-grid" style="display: contents;">
                    ${buildClassificacaoFields(d.plano_id)}
                  </div>
                  <div class="admin-form-grid admin-form-grid--3 span-2">
                    <div class="form-field">
                      <label for="fld-modal">Modal</label>
                      <select id="fld-modal"></select>
                    </div>
                    <div class="form-field">
                      <label for="fld-tipologia">Tipologia</label>
                      <select id="fld-tipologia"></select>
                    </div>
                    <div class="form-field">
                      <label for="fld-carteira">Carteira</label>
                      <select id="fld-carteira"></select>
                    </div>
                  </div>
                  <div class="form-field">
                    <label for="fld-lat">Latitude</label>
                    <input type="number" step="any" id="fld-lat" value="${d.lat ?? ""}">
                  </div>
                  <div class="form-field">
                    <label for="fld-lng">Longitude</label>
                    <input type="number" step="any" id="fld-lng" value="${d.lng ?? ""}">
                  </div>
                </div>
              </section>

              <section id="sec-representante" class="admin-analise-subcard admin-dashboard-section">
                <h3>Representante Legal</h3>
                <div class="admin-form-grid">
                  <div class="form-field span-2">
                    <label for="fld-rep-nome">Nome Completo</label>
                    <input type="text" id="fld-rep-nome" value="${escapeHtml(d.representante?.nome || "")}">
                  </div>
                  <div class="form-field">
                    <label for="fld-rep-email">E-mail</label>
                    <input type="email" id="fld-rep-email" value="${escapeHtml(d.representante?.email || "")}">
                  </div>
                  <div class="form-field">
                    <label for="fld-rep-tel">Telefone</label>
                    <input type="text" id="fld-rep-tel" value="${escapeHtml(d.representante?.telefone || "")}">
                  </div>
                </div>
              </section>

              <section id="sec-acoes" class="admin-analise-subcard admin-dashboard-section">
                <h3>Ações</h3>
                <div class="admin-form-grid">
                  ${actionsHtml(d)}
                </div>
              </section>
          </div>
        </section>
      </div>`;
  }

  function bindEvents(d) {
    fillSelect($("#fld-diretoria"), SLTCatalog.ativos(SLTCatalog.catalog.diretorias), "id", (x) => x.nome_oficial);
    $("#fld-diretoria").value = d.diretoria_id;

    fillSelect($("#fld-plano"), SLTCatalog.planosPorDiretoria($("#fld-diretoria").value), "id", (p) => `${p.sigla} — ${p.nome_oficial}`);
    $("#fld-plano").value = d.plano_id;

    fillSelect($("#fld-modal"), SLTCatalog.ativos(SLTCatalog.catalog.modais), "id", (m) => m.nome);
    fillSelect($("#fld-tipologia"), SLTCatalog.ativos(SLTCatalog.catalog.tipologias), "id", (t) => t.nome);
    fillSelect($("#fld-carteira"), SLTCatalog.carteirasPorPlano($("#fld-plano").value), "id", (c) => c.nome);

    $("#fld-modal").value = d.complementos?.modal_id || "";
    $("#fld-tipologia").value = d.complementos?.tipologia_id || "";
    $("#fld-carteira").value = d.complementos?.carteira_id || "";

    populateClassificacaoSelects(d);

    $("#fld-diretoria").addEventListener("change", () => {
      fillSelect($("#fld-plano"), SLTCatalog.planosPorDiretoria($("#fld-diretoria").value), "id", (p) => `${p.sigla} — ${p.nome_oficial}`);
      fillSelect($("#fld-carteira"), SLTCatalog.carteirasPorPlano($("#fld-plano").value), "id", (c) => c.nome);
    });

    $("#fld-plano").addEventListener("change", () => {
      refreshClassificacaoFields({ ...d, classificacao: {}, plano_id: $("#fld-plano").value });
      fillSelect($("#fld-carteira"), SLTCatalog.carteirasPorPlano($("#fld-plano").value), "id", (c) => c.nome);
    });

    $("#fld-eixo")?.addEventListener("change", () => refreshTicSelect({ classificacao: {} }));

    $("#btn-salvar")?.addEventListener("click", () => saveDemanda());
    $("#btn-aprovar")?.addEventListener("click", () => approveDemanda());
    $("#btn-analise")?.addEventListener("click", () => quickStatus("em_analise"));
    $("#btn-reprovar")?.addEventListener("click", () => quickStatus("reprovada"));
    $("#btn-arquivar")?.addEventListener("click", () => quickStatus("arquivada"));
  }

  function collectPayload() {
    const planoId = $("#fld-plano").value;
    let classificacao = null;
    if (planoId === PLANO_PLI && $("#fld-frente")?.value) {
      classificacao = { tipo: "frente_pli", frente_id: $("#fld-frente").value };
    } else if (planoId === PLANO_PEF && $("#fld-eixo")?.value) {
      classificacao = {
        tipo: "eixo_pef",
        eixo_id: $("#fld-eixo").value,
        corredor_tic_id: $("#fld-tic")?.value || null,
      };
    }
    const complementos = {};
    if ($("#fld-modal").value) complementos.modal_id = $("#fld-modal").value;
    if ($("#fld-tipologia").value) complementos.tipologia_id = $("#fld-tipologia").value;
    if ($("#fld-carteira").value) complementos.carteira_id = $("#fld-carteira").value;

    const payload = {
      nome: $("#fld-nome").value.trim(),
      descricao: $("#fld-descricao").value.trim() || null,
      diretoria_id: $("#fld-diretoria").value,
      plano_id: planoId,
      classificacao,
      complementos: Object.keys(complementos).length ? complementos : null,
      lat: parseFloat($("#fld-lat").value),
      lng: parseFloat($("#fld-lng").value),
      representante: {
        nome: $("#fld-rep-nome").value.trim(),
        email: $("#fld-rep-email").value.trim() || null,
        telefone: $("#fld-rep-tel").value.trim() || null,
      },
    };
    return payload;
  }

  function renderSidebar() {
    SLTAdminDashboard.renderRecordsSidebar({
      records: allDemandas,
      selectedId,
      getRecordId: (d) => d.id,
      getRecordLabel: (d) => d.nome || d.id,
      getRecordBadgeHtml: (d) =>
        `<span class="${statusBadgeClass(d.status)}">${escapeHtml(statusDemandaLabel(d.status))}</span>`,
      sections: SECTIONS,
      emptyMessage: "Nenhuma demanda registrada.",
      onSelect: (id) => selectDemanda(id),
    });
  }

  function renderPage(d) {
    demanda = d;
    selectedId = d.id;
    document.title = `${d.id} — Demanda — Admin SLT`;
    $("#dashboard-content").innerHTML = pageHtml(d);
    bindEvents(d);
    SLTAdminAnalysisMap.initPreviewMap("admin-preview-map-wrap", d);
    renderSidebar();
    SLTAdminDashboard.initSectionNav({
      navSelector: ".layer-group--record.is-selected .admin-record-sections",
    });
  }

  async function selectDemanda(id, { updateUrl = true } = {}) {
    selectedId = id;
    renderSidebar();
    $("#dashboard-content").innerHTML = '<p class="hint">Carregando demanda…</p>';
    if (updateUrl) {
      history.replaceState(null, "", `demanda.html?id=${encodeURIComponent(id)}`);
    }
    const d = await SLTAdminApi.getDemanda(id);
    renderPage(d);
    const active = document.querySelector(`.layer-group--record[data-record-id="${CSS.escape(id)}"]`);
    active?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  async function reloadDemanda() {
    const codigo = codigoFromUrl();
    if (!codigo) {
      if (allDemandas.length) {
        await selectDemanda(allDemandas[0].id);
        return;
      }
      $("#dashboard-content").innerHTML =
        '<p class="hint">Nenhuma demanda registrada. <a href="demandas.html">Voltar à lista</a>.</p>';
      renderSidebar();
      return;
    }
    await selectDemanda(codigo, { updateUrl: false });
  }

  async function saveDemanda() {
    try {
      const updated = await SLTAdminApi.updateDemanda(demanda.id, collectPayload());
      SLTAdminUi.showToast("Demanda atualizada.");
      allDemandas = await SLTAdminApi.listDemandas();
      renderPage(updated);
    } catch (err) {
      SLTAdminUi.showToast(err.message, true);
    }
  }

  async function approveDemanda() {
    if (!confirm("Aprovar esta demanda e criar objeto na fila AHP?")) return;
    try {
      const motivo = $("#fld-motivo-aprov")?.value.trim() || null;
      const objeto = await SLTAdminApi.aprovarDemanda(demanda.id, { motivo });
      SLTAdminUi.showToast("Demanda aprovada — redirecionando ao objeto AHP.");
      location.href = `objeto.html?id=${encodeURIComponent(objeto.codigo)}`;
    } catch (err) {
      SLTAdminUi.showToast(err.message, true);
    }
  }

  async function quickStatus(status) {
    try {
      const updated = await SLTAdminApi.updateDemanda(demanda.id, { status });
      SLTAdminUi.showToast(`Status alterado para ${statusDemandaLabel(status)}.`);
      allDemandas = await SLTAdminApi.listDemandas();
      renderPage(updated);
    } catch (err) {
      SLTAdminUi.showToast(err.message, true);
    }
  }

  async function init() {
    const user = await SLTAdminAuth.requireAuth();
    if (!user) return;
    await SLTAdminLabels.init("../");
    SLTAdminDashboard.initRecordsRootCollapse({});
    allDemandas = await SLTAdminApi.listDemandas();
    await reloadDemanda();
  }

  init().catch((err) => {
    console.error(err);
    if (err.code === "UNAUTHORIZED") {
      location.replace(SLTAdminAuth.loginUrl());
      return;
    }
    $("#dashboard-content").innerHTML = `<p class="hint">Erro: ${escapeHtml(err.message)}</p>`;
    SLTAdminUi.showToast(err.message, true);
  });
})();
