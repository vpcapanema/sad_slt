(function () {
  const { escapeHtml, formatDate, formatCnpj, statusObjetoLabel, classificacaoLabel,
    grupoComparacaoLabel, geometriaResumo, fillSelect, statusBadgeClass, diretoriaLabel,
    planoLabel, labelById, PLANO_PLI, PLANO_PEF } = SLTAdminLabels;

  let objeto = null;
  let allObjetos = [];
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

  function populateClassificacaoSelects(o) {
    const planoId = $("#fld-plano")?.value || o.plano_id;
    if (planoId === PLANO_PLI) {
      const sel = $("#fld-frente");
      if (!sel) return;
      fillSelect(sel, SLTCatalog.frentesPorPlano(planoId), "id", (f) => f.nome_oficial);
      sel.value = o.classificacao?.frente_id || "";
    } else if (planoId === PLANO_PEF) {
      const selEixo = $("#fld-eixo");
      if (!selEixo) return;
      fillSelect(selEixo, SLTCatalog.eixosPorPlano(planoId), "id", (e) => e.nome_oficial);
      selEixo.value = o.classificacao?.eixo_id || "";
      const eixoId = selEixo.value;
      const tics = SLTCatalog.ticsPorEixo(eixoId);
      const wrap = $("#wrap-tic");
      const selTic = $("#fld-tic");
      if (wrap && selTic) {
        wrap.style.display = tics.length ? "" : "none";
        fillSelect(selTic, tics, "id", (t) => t.nome_oficial, "— Não especificado —");
        selTic.value = o.classificacao?.corredor_tic_id || "";
      }
    }
  }

  function refreshClassificacaoFields(o) {
    const container = $("#classificacao-fields");
    if (!container) return;
    const planoId = $("#fld-plano")?.value || o.plano_id;
    container.innerHTML = buildClassificacaoFields(planoId);
    populateClassificacaoSelects(o);
    $("#fld-eixo")?.addEventListener("change", () => {
      populateClassificacaoSelects({ ...o, classificacao: { eixo_id: $("#fld-eixo").value } });
    });
  }

  function catalogLabel(list, id) {
    return labelById(list, id, "nome");
  }

  function projectInfoHtml(o) {
    const { infoItem, buildProjectInfoFields } = SLTAdminAnalysisInfo;
    const cat = SLTCatalog.catalog;
    const coords = SLTAdminAnalysisMap.coordsFromRecord(o);
    const coordText = coords ? `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}` : "—";

    const fieldsHtml = buildProjectInfoFields({
      nome: escapeHtml(o.nome),
      codigo: `<code>${escapeHtml(o.codigo)}</code>`,
      descricao: escapeHtml(o.descricao || "—"),
      dataCadastro: escapeHtml(formatDate(o.aprovadoEm)),
      status: `<span class="${statusBadgeClass(o.status)}">${escapeHtml(statusObjetoLabel(o.status))}</span>`,
      instituicao: escapeHtml(o.instituicao_nome || "—"),
      cnpj: escapeHtml(o.instituicao_cnpj || "—"),
      diretoria: escapeHtml(diretoriaLabel(o.diretoria_id)),
      plano: escapeHtml(planoLabel(o.plano_id)),
      classificacao: escapeHtml(classificacaoLabel(o.classificacao, o.plano_id)),
      modal: escapeHtml(catalogLabel(cat?.modais, o.complementos?.modal_id)),
      tipologia: escapeHtml(catalogLabel(cat?.tipologias, o.complementos?.tipologia_id)),
      carteira: escapeHtml(catalogLabel(cat?.carteiras, o.complementos?.carteira_id)),
      latitude: coords ? escapeHtml(coords.lat.toFixed(6)) : "—",
      longitude: coords ? escapeHtml(coords.lng.toFixed(6)) : "—",
      representanteLegal: {
        nome: "—",
        email: "—",
        telefone: "—",
      },
      extra: [
        infoItem(
          "Demanda de Origem",
          `<a href="demanda.html?id=${encodeURIComponent(o.demanda_codigo)}">${escapeHtml(o.demanda_codigo)}</a>`
        ),
        infoItem("Grupo Comparável", escapeHtml(grupoComparacaoLabel(o.grupo_comparacao, o.plano_id))),
        infoItem("Grupo Comparável (Código)", `<code>${escapeHtml(o.grupo_comparacao || "—")}</code>`),
        infoItem("Motivo da Aprovação", escapeHtml(o.motivo_aprovacao || "—")),
      ],
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

  function pageHtml(o) {
    return `
      <div class="admin-dashboard-layout">
        ${projectInfoHtml(o)}

        <section id="sec-analise" class="card admin-dashboard-section">
          <h2>Análise</h2>
          <div class="admin-analise-stack">
              <section id="sec-cadastro" class="admin-analise-subcard admin-dashboard-section">
                <h3>Cadastro</h3>
                <div class="admin-form-grid">
                  <div class="form-field">
                    <label for="fld-nome">Nome do Projeto</label>
                    <input type="text" id="fld-nome" maxlength="200" value="${escapeHtml(o.nome)}">
                  </div>
                  <div class="form-field">
                    <label for="fld-codigo">Código</label>
                    <input type="text" id="fld-codigo" class="admin-field-readonly" value="${escapeHtml(o.codigo)}" readonly aria-readonly="true">
                  </div>
                  <div class="form-field span-2">
                    <label for="fld-descricao">Descrição</label>
                    <textarea id="fld-descricao" rows="3">${escapeHtml(o.descricao || "")}</textarea>
                  </div>
                  <div class="form-field span-2">
                    <label for="fld-motivo">Motivo / Observação da Aprovação</label>
                    <textarea id="fld-motivo" rows="3">${escapeHtml(o.motivo_aprovacao || "")}</textarea>
                  </div>
                </div>
              </section>

              <section id="sec-institucional" class="admin-analise-subcard admin-dashboard-section">
                <h3>Institucional e Projeto</h3>
                <div class="admin-form-grid">
                  <div class="form-field">
                    <label for="fld-instituicao">Instituição</label>
                    <input type="text" id="fld-instituicao" class="admin-field-readonly admin-field-readonly--plain" value="${escapeHtml(o.instituicao_nome || "—")}" readonly aria-readonly="true">
                  </div>
                  <div class="form-field">
                    <label for="fld-cnpj">CNPJ</label>
                    <input type="text" id="fld-cnpj" class="admin-field-readonly admin-field-readonly--plain" value="${escapeHtml(formatCnpj(o.instituicao_cnpj))}" readonly aria-readonly="true">
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
                    ${buildClassificacaoFields(o.plano_id)}
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
                </div>
              </section>

              <section id="sec-representante" class="admin-analise-subcard admin-dashboard-section">
                <h3>Representante Legal</h3>
                <div class="admin-form-grid">
                  <div class="form-field span-2">
                    <label for="fld-rep-nome">Nome Completo</label>
                    <input type="text" id="fld-rep-nome" value="" disabled aria-disabled="true" placeholder="—">
                  </div>
                  <div class="form-field">
                    <label for="fld-rep-email">E-mail</label>
                    <input type="email" id="fld-rep-email" value="" disabled aria-disabled="true" placeholder="—">
                  </div>
                  <div class="form-field">
                    <label for="fld-rep-tel">Telefone</label>
                    <input type="text" id="fld-rep-tel" value="" disabled aria-disabled="true" placeholder="—">
                  </div>
                </div>
              </section>

              <section id="sec-acoes" class="admin-analise-subcard admin-dashboard-section">
                <h3>Ações</h3>
                <div class="admin-form-grid">
                  <div class="admin-dashboard-actions span-2">
                    <a href="objetos.html" class="btn btn-secondary">Voltar à lista</a>
                    <button type="button" class="btn btn-secondary" id="btn-elegivel">Elegível AHP</button>
                    <button type="button" class="btn btn-secondary" id="btn-suspender">Suspender</button>
                    <button type="button" class="btn btn-primary" id="btn-salvar">Salvar alterações</button>
                  </div>
                </div>
              </section>
          </div>
        </section>
      </div>`;
  }

  function bindEvents(o) {
    fillSelect($("#fld-diretoria"), SLTCatalog.ativos(SLTCatalog.catalog.diretorias), "id", (x) => x.nome_oficial);
    $("#fld-diretoria").value = o.diretoria_id;

    fillSelect($("#fld-plano"), SLTCatalog.planosPorDiretoria($("#fld-diretoria").value), "id", (p) => `${p.sigla} — ${p.nome_oficial}`);
    $("#fld-plano").value = o.plano_id;

    fillSelect($("#fld-modal"), SLTCatalog.ativos(SLTCatalog.catalog.modais), "id", (m) => m.nome);
    fillSelect($("#fld-tipologia"), SLTCatalog.ativos(SLTCatalog.catalog.tipologias), "id", (t) => t.nome);
    fillSelect($("#fld-carteira"), SLTCatalog.carteirasPorPlano($("#fld-plano").value), "id", (c) => c.nome);

    $("#fld-modal").value = o.complementos?.modal_id || "";
    $("#fld-tipologia").value = o.complementos?.tipologia_id || "";
    $("#fld-carteira").value = o.complementos?.carteira_id || "";

    populateClassificacaoSelects(o);

    $("#fld-diretoria").addEventListener("change", () => {
      fillSelect($("#fld-plano"), SLTCatalog.planosPorDiretoria($("#fld-diretoria").value), "id", (p) => `${p.sigla} — ${p.nome_oficial}`);
      fillSelect($("#fld-carteira"), SLTCatalog.carteirasPorPlano($("#fld-plano").value), "id", (c) => c.nome);
    });

    $("#fld-plano").addEventListener("change", () => {
      refreshClassificacaoFields({ ...o, classificacao: {}, plano_id: $("#fld-plano").value });
      fillSelect($("#fld-carteira"), SLTCatalog.carteirasPorPlano($("#fld-plano").value), "id", (c) => c.nome);
    });

    $("#fld-eixo")?.addEventListener("change", () => {
      populateClassificacaoSelects({ ...o, classificacao: { eixo_id: $("#fld-eixo").value } });
    });

    $("#btn-salvar")?.addEventListener("click", () => saveObjeto());
    $("#btn-elegivel")?.addEventListener("click", () => quickStatus("elegivel_ahp"));
    $("#btn-suspender")?.addEventListener("click", () => quickStatus("suspenso"));
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

    return {
      nome: $("#fld-nome").value.trim(),
      descricao: $("#fld-descricao").value.trim() || null,
      diretoria_id: $("#fld-diretoria").value,
      plano_id: planoId,
      classificacao,
      complementos: Object.keys(complementos).length ? complementos : null,
      motivo_aprovacao: $("#fld-motivo").value.trim() || null,
    };
  }

  function renderSidebar() {
    SLTAdminDashboard.renderRecordsSidebar({
      records: allObjetos,
      selectedId,
      getRecordId: (o) => o.codigo,
      getRecordLabel: (o) => o.nome || o.codigo,
      getRecordBadgeHtml: (o) =>
        `<span class="${statusBadgeClass(o.status)}">${escapeHtml(statusObjetoLabel(o.status))}</span>`,
      sections: SECTIONS,
      emptyMessage: "Nenhum projeto registrado.",
      onSelect: (id) => selectObjeto(id),
    });
  }

  function renderPage(o) {
    objeto = o;
    selectedId = o.codigo;
    document.title = `${o.codigo} — Objeto AHP — Admin SLT`;
    $("#dashboard-content").innerHTML = pageHtml(o);
    bindEvents(o);
    SLTAdminAnalysisMap.initPreviewMap("admin-preview-map-wrap", o);
    renderSidebar();
    SLTAdminDashboard.initSectionNav({
      navSelector: ".layer-group--record.is-selected .admin-record-sections",
    });
  }

  async function selectObjeto(codigo, { updateUrl = true } = {}) {
    selectedId = codigo;
    renderSidebar();
    $("#dashboard-content").innerHTML = '<p class="hint">Carregando objeto…</p>';
    if (updateUrl) {
      history.replaceState(null, "", `objeto.html?id=${encodeURIComponent(codigo)}`);
    }
    const item = await SLTAdminApi.getObjetoAhp(codigo);
    renderPage(item);
    const active = document.querySelector(`.layer-group--record[data-record-id="${CSS.escape(codigo)}"]`);
    active?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  async function reloadObjeto() {
    const codigo = codigoFromUrl();
    if (!codigo) {
      if (allObjetos.length) {
        await selectObjeto(allObjetos[0].codigo);
        return;
      }
      $("#dashboard-content").innerHTML =
        '<p class="hint">Nenhum objeto registrado. <a href="objetos.html">Voltar à lista</a>.</p>';
      renderSidebar();
      return;
    }
    await selectObjeto(codigo, { updateUrl: false });
  }

  async function saveObjeto() {
    try {
      const updated = await SLTAdminApi.updateObjetoAhp(objeto.codigo, collectPayload());
      SLTAdminUi.showToast("Objeto AHP atualizado.");
      allObjetos = await SLTAdminApi.listObjetosAhp();
      renderPage(updated);
    } catch (err) {
      SLTAdminUi.showToast(err.message, true);
    }
  }

  async function quickStatus(status) {
    try {
      const updated = await SLTAdminApi.updateObjetoAhp(objeto.codigo, { status });
      SLTAdminUi.showToast(`Status alterado para ${statusObjetoLabel(status)}.`);
      allObjetos = await SLTAdminApi.listObjetosAhp();
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
    allObjetos = await SLTAdminApi.listObjetosAhp();
    await reloadObjeto();
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
