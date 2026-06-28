(function () {
  const { escapeHtml, formatDate, formatCnpj, statusBadgeHtml, instituicaoLabel, planoLabel,
    classificacaoLabel, representanteLabel, fillSelect,
    diretoriaLabel, labelById, PLANO_PLI, PLANO_PEF } = SLTAdminLabels;

  const STATUS_PRE_APROVACAO = new Set(["em_analise", "aprovada"]);

  const TIPOS = [
    { id: "plano", label: "Plano" },
    { id: "programa", label: "Programa" },
    { id: "projeto", label: "Projetos" },
  ];

  const SECTIONS = {
    projeto: [
      { id: "sec-info", label: "Informações do Projeto" },
      { id: "sec-analise", label: "Análise" },
      { id: "sec-cadastro", label: "Cadastro" },
      { id: "sec-institucional", label: "Institucional e Projeto" },
      { id: "sec-representante", label: "Representante Legal" },
      { id: "sec-acoes", label: "Ações" },
    ],
    plano: [
      { id: "sec-info", label: "Informações do Plano" },
      { id: "sec-acoes", label: "Ações" },
    ],
    programa: [
      { id: "sec-info", label: "Informações do Programa" },
      { id: "sec-acoes", label: "Ações" },
    ],
  };

  let tipo = "projeto";
  let record = null;
  let selectedId = null;
  const lists = { projeto: [], programa: [], plano: [] };

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function paramsFromUrl() {
    const sp = new URLSearchParams(location.search);
    return { tipo: sp.get("tipo"), id: sp.get("id") };
  }

  function canApprove(status) {
    return STATUS_PRE_APROVACAO.has(status);
  }

  function tipoLabelAtual() {
    return TIPOS.find((t) => t.id === tipo)?.label || tipo;
  }

  function demandHeadHtml(d) {
    return `
      <header class="admin-demand-head card">
        <p class="admin-demand-head-kicker">${escapeHtml(tipoLabelAtual())}</p>
        <h1 class="admin-demand-head-title">${escapeHtml(d.nome || d.id)}</h1>
        <p class="admin-demand-head-meta">
          <code>${escapeHtml(d.id)}</code>
          ${statusBadgeHtml(d.status, tipo)}
        </p>
      </header>`;
  }

  function actionsHtml(d, { withApprove }) {
    return `
      <div class="form-field span-2">
        <label for="fld-motivo-aprov">Motivo (Aprovação — Opcional)</label>
        <textarea id="fld-motivo-aprov" class="admin-field-motivo" rows="3" placeholder="Usado ao clicar em Aprovar"></textarea>
      </div>
      <div class="admin-dashboard-actions span-2">
        <a href="demandas.html" class="btn btn-secondary">Voltar à lista</a>
        ${withApprove ? '<button type="button" class="btn btn-primary" id="btn-aprovar">Aprovar → aguardando hierarquização</button>' : ""}
        <button type="button" class="btn btn-primary" id="btn-salvar">Salvar alterações</button>
      </div>`;
  }

  // ===========================================================================
  // PROJETO (detalhe completo — mantém o comportamento atual)
  // ===========================================================================
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
      status: statusBadgeHtml(d.status, tipo),
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

  function projetoPageHtml(d) {
    return `
      <div class="admin-dashboard-layout">
        ${demandHeadHtml(d)}
        <div class="admin-demand-body">
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
                    <label for="fld-instituicao">Instituição interessada</label>
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
                  ${actionsHtml(d, { withApprove: canApprove(d.status) })}
                </div>
              </section>
          </div>
        </section>
        </div>
      </div>`;
  }

  function bindProjeto(d) {
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

    SLTAdminAnalysisMap.initPreviewMap("admin-preview-map-wrap", d);
  }

  function collectProjeto() {
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
      lat: parseFloat($("#fld-lat").value),
      lng: parseFloat($("#fld-lng").value),
      representante: {
        nome: $("#fld-rep-nome").value.trim(),
        email: $("#fld-rep-email").value.trim() || null,
        telefone: $("#fld-rep-tel").value.trim() || null,
      },
    };
  }

  // ===========================================================================
  // PLANO
  // ===========================================================================
  function planoPageHtml(d) {
    return `
      <div class="admin-dashboard-layout">
        ${demandHeadHtml(d)}
        <div class="admin-demand-body">
        <section id="sec-info" class="card admin-dashboard-section">
          <h2>Informações do Plano</h2>
          <div class="admin-form-grid">
            <div class="form-field">
              <label for="fld-codigo">Código</label>
              <input type="text" id="fld-codigo" class="admin-field-readonly" value="${escapeHtml(d.id)}" readonly aria-readonly="true">
            </div>
            <div class="form-field">
              <label for="fld-diretoria">Diretoria</label>
              <select id="fld-diretoria"></select>
            </div>
            <div class="form-field span-2">
              <label for="fld-nome">Nome do Plano</label>
              <input type="text" id="fld-nome" maxlength="200" value="${escapeHtml(d.nome)}">
            </div>
            <div class="form-field span-2">
              <label for="fld-descricao">Descrição</label>
              <textarea id="fld-descricao" rows="3">${escapeHtml(d.descricao || "")}</textarea>
            </div>
            <div class="form-field span-2">
              <label for="fld-objetivo">Objetivo estratégico</label>
              <textarea id="fld-objetivo" rows="2">${escapeHtml(d.objetivo_estrategico || "")}</textarea>
            </div>
            <div class="form-field">
              <label for="fld-responsavel">Instituição interessada</label>
              <input type="text" id="fld-responsavel" value="${escapeHtml(d.responsavel || "")}">
            </div>
            <div class="form-field">
              <label for="fld-valor">Valor global (R$)</label>
              <input type="number" step="any" id="fld-valor" value="${d.valor_global ?? ""}">
            </div>
            <div class="form-field">
              <label for="fld-vig-ini">Vigência início</label>
              <input type="date" id="fld-vig-ini" value="${escapeHtml((d.vigencia_inicio || "").slice(0, 10))}">
            </div>
            <div class="form-field">
              <label for="fld-vig-fim">Vigência fim</label>
              <input type="date" id="fld-vig-fim" value="${escapeHtml((d.vigencia_fim || "").slice(0, 10))}">
            </div>
            <div class="form-field span-2">
              <span class="field-help">Cadastrado em ${escapeHtml(formatDate(d.criadoEm))}.</span>
            </div>
          </div>
        </section>

        <section id="sec-acoes" class="card admin-dashboard-section">
          <h3>Ações</h3>
          <div class="admin-form-grid">
            ${actionsHtml(d, { withApprove: canApprove(d.status) })}
          </div>
        </section>
        </div>
      </div>`;
  }

  function bindPlano(d) {
    fillSelect($("#fld-diretoria"), SLTCatalog.ativos(SLTCatalog.catalog.diretorias), "id", (x) => x.nome_oficial);
    $("#fld-diretoria").value = d.diretoria_id || "";
  }

  function collectPlano() {
    return {
      nome: $("#fld-nome").value.trim(),
      descricao: $("#fld-descricao").value.trim() || null,
      diretoria_id: $("#fld-diretoria").value || null,
      objetivo_estrategico: $("#fld-objetivo").value.trim() || null,
      responsavel: $("#fld-responsavel").value.trim() || null,
      valor_global: $("#fld-valor").value ? parseFloat($("#fld-valor").value) : null,
      vigencia_inicio: $("#fld-vig-ini").value || null,
      vigencia_fim: $("#fld-vig-fim").value || null,
    };
  }

  // ===========================================================================
  // PROGRAMA
  // ===========================================================================
  function programaPageHtml(d) {
    return `
      <div class="admin-dashboard-layout">
        ${demandHeadHtml(d)}
        <div class="admin-demand-body">
        <section id="sec-info" class="card admin-dashboard-section">
          <h2>Informações do Programa</h2>
          <div class="admin-form-grid">
            <div class="form-field">
              <label for="fld-codigo">Código</label>
              <input type="text" id="fld-codigo" class="admin-field-readonly" value="${escapeHtml(d.id)}" readonly aria-readonly="true">
            </div>
            <div class="form-field">
              <label for="fld-plano">Plano</label>
              <input type="text" id="fld-plano" class="admin-field-readonly admin-field-readonly--plain" value="${escapeHtml(d.plano_nome || d.plano_codigo || "—")}" readonly aria-readonly="true">
            </div>
            <div class="form-field span-2">
              <label for="fld-nome">Nome do Programa</label>
              <input type="text" id="fld-nome" maxlength="200" value="${escapeHtml(d.nome)}">
            </div>
            <div class="form-field span-2">
              <label for="fld-descricao">Descrição</label>
              <textarea id="fld-descricao" rows="3">${escapeHtml(d.descricao || "")}</textarea>
            </div>
            <div class="form-field span-2">
              <label for="fld-objetivo">Objetivo</label>
              <textarea id="fld-objetivo" rows="2">${escapeHtml(d.objetivo || "")}</textarea>
            </div>
            <div class="form-field span-2">
              <label for="fld-publico">Público-alvo</label>
              <textarea id="fld-publico" rows="2">${escapeHtml(d.publico_alvo || "")}</textarea>
            </div>
            <div class="form-field span-2">
              <label for="fld-justificativa">Justificativa</label>
              <textarea id="fld-justificativa" rows="2">${escapeHtml(d.justificativa || "")}</textarea>
            </div>
            <div class="form-field">
              <label for="fld-orgao">Órgão responsável</label>
              <input type="text" id="fld-orgao" value="${escapeHtml(d.orgao_responsavel || "")}">
            </div>
            <div class="form-field">
              <label for="fld-valor">Valor global (R$)</label>
              <input type="number" step="any" id="fld-valor" value="${d.valor_global ?? ""}">
            </div>
            <div class="form-field span-2">
              <span class="field-help">Cadastrado em ${escapeHtml(formatDate(d.criadoEm))}.</span>
            </div>
          </div>
        </section>

        <section id="sec-acoes" class="card admin-dashboard-section">
          <h3>Ações</h3>
          <div class="admin-form-grid">
            ${actionsHtml(d, { withApprove: canApprove(d.status) })}
          </div>
        </section>
        </div>
      </div>`;
  }

  function collectPrograma() {
    return {
      nome: $("#fld-nome").value.trim(),
      descricao: $("#fld-descricao").value.trim() || null,
      objetivo: $("#fld-objetivo").value.trim() || null,
      publico_alvo: $("#fld-publico").value.trim() || null,
      justificativa: $("#fld-justificativa").value.trim() || null,
      orgao_responsavel: $("#fld-orgao").value.trim() || null,
      valor_global: $("#fld-valor").value ? parseFloat($("#fld-valor").value) : null,
    };
  }

  // ===========================================================================
  // Dispatch por tipo
  // ===========================================================================
  const API = {
    projeto: { get: (id) => SLTAdminApi.getDemanda(id), update: (id, p) => SLTAdminApi.updateDemanda(id, p), aprovar: (id, p) => SLTAdminApi.aprovarDemanda(id, p) },
    plano: { get: (id) => SLTAdminApi.getPlano(id), update: (id, p) => SLTAdminApi.updatePlano(id, p), aprovar: (id, p) => SLTAdminApi.aprovarPlano(id, p) },
    programa: { get: (id) => SLTAdminApi.getPrograma(id), update: (id, p) => SLTAdminApi.updatePrograma(id, p), aprovar: (id, p) => SLTAdminApi.aprovarPrograma(id, p) },
  };

  function pageHtml(d) {
    if (tipo === "plano") return planoPageHtml(d);
    if (tipo === "programa") return programaPageHtml(d);
    return projetoPageHtml(d);
  }

  function bindEvents(d) {
    if (tipo === "projeto") bindProjeto(d);
    if (tipo === "plano") bindPlano(d);
    $("#btn-salvar")?.addEventListener("click", () => saveRecord());
    $("#btn-aprovar")?.addEventListener("click", () => approveRecord());
  }

  function collectPayload() {
    if (tipo === "plano") return collectPlano();
    if (tipo === "programa") return collectPrograma();
    return collectProjeto();
  }

  // ===========================================================================
  // Sidebar (agrupada por tipo) + seleção
  // ===========================================================================
  function renderSidebar() {
    SLTAdminDashboard.renderGroupedRecordsSidebar({
      groups: TIPOS.map((t) => ({ id: t.id, label: t.label, records: lists[t.id] })),
      selectedId,
      getRecordId: (r) => r.id,
      getRecordLabel: (r) => r.nome || r.id,
      getRecordBadgeHtml: (r) => statusBadgeHtml(r.status, r.__tipo),
      sectionsFor: (r) => SECTIONS[r.__tipo] || SECTIONS.projeto,
      emptyMessage: "Nenhuma demanda registrada.",
      onSelect: (id) => onSelectFromSidebar(id),
    });
  }

  function findTipoOf(id) {
    for (const t of TIPOS) {
      if ((lists[t.id] || []).some((r) => r.id === id)) return t.id;
    }
    return tipo;
  }

  function onSelectFromSidebar(id) {
    const novoTipo = findTipoOf(id);
    selectRecord(novoTipo, id);
  }

  function renderPage(d) {
    record = d;
    selectedId = d.id;
    document.title = `${d.id} — ${tipo} — Admin SLT`;
    $("#dashboard-content").innerHTML = pageHtml(d);
    bindEvents(d);
    renderSidebar();
    SLTAdminDashboard.initSectionNav({
      navSelector: ".layer-group--record.is-selected .admin-record-sections",
    });
  }

  async function selectRecord(novoTipo, id, { updateUrl = true } = {}) {
    tipo = novoTipo;
    selectedId = id;
    renderSidebar();
    $("#dashboard-content").innerHTML = '<p class="hint">Carregando…</p>';
    if (updateUrl) {
      history.replaceState(null, "", `demanda.html?tipo=${encodeURIComponent(tipo)}&id=${encodeURIComponent(id)}`);
    }
    const d = await API[tipo].get(id);
    renderPage(d);
    const active = document.querySelector(`.layer-group--record[data-record-id="${CSS.escape(id)}"]`);
    active?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  async function refreshLists() {
    const [projeto, programa, plano] = await Promise.all([
      SLTAdminApi.listDemandas().catch(() => []),
      SLTAdminApi.listProgramas().catch(() => []),
      SLTAdminApi.listPlanos().catch(() => []),
    ]);
    lists.projeto = projeto.map((r) => ({ ...r, __tipo: "projeto" }));
    lists.programa = programa.map((r) => ({ ...r, __tipo: "programa" }));
    lists.plano = plano.map((r) => ({ ...r, __tipo: "plano" }));
  }

  async function saveRecord() {
    try {
      const updated = await API[tipo].update(record.id, collectPayload());
      SLTAdminUi.showToast("Alterações salvas.");
      await refreshLists();
      renderPage(updated);
    } catch (err) {
      SLTAdminUi.showToast(err.message, true);
    }
  }

  async function approveRecord() {
    if (!confirm("Aprovar esta demanda e promovê-la a aguardando hierarquização?")) return;
    try {
      const motivo = $("#fld-motivo-aprov")?.value.trim() || null;
      const updated = await API[tipo].aprovar(record.id, { motivo });
      SLTAdminUi.showToast("Aprovada — aguardando hierarquização.");
      await refreshLists();
      renderPage(updated);
    } catch (err) {
      SLTAdminUi.showToast(err.message, true);
    }
  }

  function firstAvailable() {
    for (const t of TIPOS) {
      if ((lists[t.id] || []).length) return { tipo: t.id, id: lists[t.id][0].id };
    }
    return null;
  }

  async function boot() {
    const { tipo: urlTipo, id } = paramsFromUrl();
    if (id) {
      const t = urlTipo && lists[urlTipo] ? urlTipo : findTipoOf(id);
      await selectRecord(t, id, { updateUrl: false });
      return;
    }
    const first = firstAvailable();
    if (first) {
      await selectRecord(first.tipo, first.id);
      return;
    }
    $("#dashboard-content").innerHTML =
      '<p class="hint">Nenhuma demanda registrada. <a href="demandas.html">Voltar à lista</a>.</p>';
    renderSidebar();
  }

  async function init() {
    const user = await SLTAdminAuth.requireAuth();
    if (!user) return;
    await SLTAdminLabels.init("../");
    SLTAdminDashboard.initRecordsRootCollapse({});
    await refreshLists();
    await boot();
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
