(function () {
  const {
    escapeHtml,
    formatMoney,
    formatVigencia,
    truncate,
    instituicaoLabel,
    instituicaoRowLabel,
    representanteLabel,
    planoLabel,
    planoCadastradoLabel,
    programaCadastradoLabel,
    classificacaoLabel,
    complementosLabel,
    diretoriaLabel,
    vinculoInstitucionalLabel,
    abrangenciaLabel,
    geometriaResumo,
    CODIGO_PLANO_OUTROS,
    CODIGO_PROGRAMA_OUTROS,
    PLANO_PLI,
    PLANO_PEF,
  } = SLTAdminLabels;

  const PAGE_SIZES = [15, 25, 35, 50, 100];
  const STATUS_GEOMETRIA_EXTRAORDINARIA = new Set(["hierarq_em_andamento", "hierarq_aguardando_complementacao"]);
  let pageSize = PAGE_SIZES[0];
  const complementacao = window.SLTComplementacaoTabela;
  let tipo = "projeto";
  let rows = [];
  let currentPage = 1;
  let editMode = false;
  let columnFilterOptions = [];
  const selected = new Set();
  const cache = { projeto: null, programa: null, plano: null };
  let refPlanos = [];
  let refProgramas = [];

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function statusCell(d) {
    return SLTAdminLabels.statusBadgeHtml(d.status, tipo);
  }

  function formatDateTime(value) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(date);
  }

  const auditColumns = [
    { label: "Criado por", value: (d) => escapeHtml(d.criadoPorNome || "Não registrado") },
    { label: "Cadastro", value: (d) => escapeHtml(formatDateTime(d.criadoEm)) },
    { label: "Atualizado por", value: (d) => escapeHtml(d.atualizadoPorNome || "Não registrado") },
    { label: "Atualização", value: (d) => escapeHtml(formatDateTime(d.atualizadoEm)) },
    { label: "Aprovado por", value: (d) => escapeHtml(d.aprovadoPorNome || "—") },
    { label: "Aprovação", value: (d) => escapeHtml(formatDateTime(d.aprovadoEm)) },
    { label: "Reprovado por", value: (d) => escapeHtml(d.reprovadoPorNome || "—") },
    { label: "Reprovação", value: (d) => escapeHtml(formatDateTime(d.reprovadoEm)) },
  ];

  const COLUMNS = {
    projeto: [
      { label: "Status", value: statusCell, editable: "status" },
      { label: "Processo SEI", value: (d) => escapeHtml(d.origem_sei_processo || "—") },
      { label: "Código", value: (d) => `<code>${escapeHtml(d.id)}</code>` },
      { label: "Projeto", value: (d) => escapeHtml(d.nome) },
      { label: "Diretoria", value: (d) => escapeHtml(diretoriaLabel(d.diretoria_id)), editable: "diretoria" },
      { label: "Plano estratégico", value: (d) => escapeHtml(planoLabel(d.plano_id)), editable: "plano_estrategico" },
      {
        label: "Vínculo institucional",
        value: (d) => escapeHtml(vinculoInstitucionalLabel(d.vinculo_institucional, d.vinculo_tipo)),
      },
      {
        label: "Programa vinculado",
        value: (d) => escapeHtml(programaCadastradoLabel(d)),
        editable: "programa",
      },
      { label: "Instituição", value: (d) => escapeHtml(instituicaoLabel(d)), editable: "instituicao" },
      { label: "Representante", value: (d) => escapeHtml(representanteLabel(d)), editable: "representante" },
      {
        label: "Classificação",
        value: (d) => escapeHtml(classificacaoLabel(d.classificacao, d.plano_id)),
        editable: "classificacao",
      },
      {
        label: "Complementos",
        value: (d) => escapeHtml(complementosLabel(d.complementos)),
        editable: "complementos",
      },
      { label: "Geometria", value: (d) => escapeHtml(geometriaResumo(d.geometria)) },
      ...auditColumns,
    ],
    programa: [
      { label: "Status", value: statusCell, editable: "status" },
      { label: "Processo SEI", value: (d) => escapeHtml(d.origem_sei_processo || "—") },
      { label: "Código", value: (d) => `<code>${escapeHtml(d.id)}</code>` },
      { label: "Programa", value: (d) => escapeHtml(d.nome) },
      {
        label: "Plano vinculado",
        value: (d) => escapeHtml(planoCadastradoLabel(d)),
        editable: "plano_cadastrado",
      },
      {
        label: "Vínculo institucional",
        value: (d) => escapeHtml(vinculoInstitucionalLabel(d.vinculo_institucional)),
      },
      { label: "Diretoria", value: (d) => escapeHtml(diretoriaLabel(d.diretoria_id)) },
      { label: "Instituição", value: (d) => escapeHtml(instituicaoRowLabel(d)), editable: "instituicao" },
      { label: "Representante", value: (d) => escapeHtml(representanteLabel(d)), editable: "representante" },
      { label: "Órgão responsável", value: (d) => escapeHtml(d.orgao_responsavel || "—") },
      { label: "Objetivo", value: (d) => escapeHtml(truncate(d.objetivo, 80)) },
      { label: "Valor global", value: (d) => escapeHtml(formatMoney(d.valor_global)) },
      { label: "Abrangência", value: (d) => escapeHtml(abrangenciaLabel(d.unidades_espaciais)) },
      ...auditColumns,
    ],
    plano: [
      { label: "Status", value: statusCell, editable: "status" },
      { label: "Processo SEI", value: (d) => escapeHtml(d.origem_sei_processo || "—") },
      { label: "Código", value: (d) => `<code>${escapeHtml(d.id)}</code>` },
      { label: "Plano", value: (d) => escapeHtml(d.nome) },
      { label: "Diretoria", value: (d) => escapeHtml(diretoriaLabel(d.diretoria_id)), editable: "diretoria" },
      { label: "Instituição", value: (d) => escapeHtml(instituicaoRowLabel(d)), editable: "instituicao" },
      { label: "Representante", value: (d) => escapeHtml(representanteLabel(d)), editable: "representante" },
      { label: "Objetivo estratégico", value: (d) => escapeHtml(truncate(d.objetivo_estrategico, 80)) },
      { label: "Vigência", value: (d) => escapeHtml(formatVigencia(d.vigencia_inicio, d.vigencia_fim)) },
      { label: "Valor global", value: (d) => escapeHtml(formatMoney(d.valor_global)) },
      { label: "Abrangência", value: (d) => escapeHtml(abrangenciaLabel(d.unidades_espaciais)) },
      ...auditColumns,
    ],
  };

  function isSentinel(d) {
    return d.id === CODIGO_PLANO_OUTROS || d.id === CODIGO_PROGRAMA_OUTROS;
  }

  function searchHaystack(d) {
    if (tipo === "projeto") {
      return [
        d.id,
        d.nome,
        instituicaoLabel(d),
        representanteLabel(d),
        diretoriaLabel(d.diretoria_id),
        planoLabel(d.plano_id),
        classificacaoLabel(d.classificacao, d.plano_id),
        complementosLabel(d.complementos),
        d.programa_codigo,
        d.programa_nome,
        vinculoInstitucionalLabel(d.vinculo_institucional, d.vinculo_tipo),
      ]
        .join(" ")
        .toLowerCase();
    }
    if (tipo === "programa") {
      return [
        d.id,
        d.nome,
        d.plano_nome,
        d.plano_codigo,
        d.orgao_responsavel,
        instituicaoRowLabel(d),
        representanteLabel(d),
        diretoriaLabel(d.diretoria_id),
        d.objetivo,
      ]
        .join(" ")
        .toLowerCase();
    }
    return [
      d.id,
      d.nome,
      diretoriaLabel(d.diretoria_id),
      instituicaoRowLabel(d),
      representanteLabel(d),
      d.objetivo_estrategico,
    ]
      .join(" ")
      .toLowerCase();
  }

  function columnDisplayValue(column, row) {
    const value = document.createElement("span");
    value.innerHTML = column.value(row);
    return (value.textContent || "").replace(/\s+/g, " ").trim();
  }

  const originalColumns = Object.fromEntries(Object.entries(COLUMNS).map(([kind, columns]) => [kind, [...columns]]));
  function configureOriginColumns(kind, data) {
    const originFields = SLTDadosOrigem.columns(data);
    COLUMNS[kind] = [...originalColumns[kind], ...originFields.map(field => ({
      label: 'Origem — ' + field.label,
      value: row => {
        const value = SLTDadosOrigem.escape(SLTDadosOrigem.text(SLTDadosOrigem.value(row.dados_origem, field)));
        return `<span title="${value}">${value}</span>`;
      },
    }))];
    const table = document.querySelector(`[data-demandas-table="${kind}"]`);
    const heading = [...table.tHead.rows].find(row => !row.classList.contains('cg-linha-grupo'));
    heading.querySelectorAll('[data-origin-key]').forEach(cell => cell.remove());
    originFields.forEach(field => {
      const cell = document.createElement('th');
      cell.scope = 'col';
      cell.textContent = field.label;
      cell.dataset.originKey = field.key;
      cell.dataset.columnGroup = 'origem';
      heading.append(cell);
    });
  }

  function fillColumnFilter() {
    SLTTable.inversion($("#filtro-inverter"), false);
    const columnSelect = $("#filtro-coluna");
    const valueSelect = $("#filtro-valor");
    columnSelect.innerHTML = '<option value="">— Coluna —</option>';
    COLUMNS[tipo].forEach((column, index) => {
      const option = document.createElement("option");
      option.value = String(index);
      option.textContent = column.label;
      columnSelect.appendChild(option);
    });
    if (valueSelect.tagName === "INPUT") {
      valueSelect.value = "";
      valueSelect.placeholder = "Selecione a coluna";
      $("#filtro-valores").replaceChildren();
    } else valueSelect.innerHTML = '<option value="">— selecione a coluna —</option>';
    valueSelect.disabled = true;
    columnFilterOptions = [];
  }

  function updateColumnValueFilter() {
    const columnSelect = $("#filtro-coluna");
    const valueSelect = $("#filtro-valor");
    const columnIndex = columnSelect.value === "" ? -1 : Number(columnSelect.value);
    const column = COLUMNS[tipo][columnIndex];

    const digitavel = valueSelect.tagName === "INPUT";
    const options = digitavel ? $("#filtro-valores") : valueSelect;
    options.innerHTML = "";
    valueSelect.value = "";
    columnFilterOptions = [];
    if (!column) {
      if (digitavel) valueSelect.placeholder = "Selecione a coluna";
      else valueSelect.add(new Option("— selecione a coluna —", ""));
      valueSelect.disabled = true;
      return;
    }

    if (digitavel) valueSelect.placeholder = "Digite ou selecione um valor";
    else valueSelect.add(new Option("Todos os valores", ""));
    const uniqueValues = new Map();
    rows.forEach((row) => {
      const value = columnDisplayValue(column, row);
      const key = value.toLocaleLowerCase("pt-BR");
      if (!uniqueValues.has(key)) uniqueValues.set(key, value);
    });
    columnFilterOptions = [...uniqueValues.values()].sort((a, b) => a.localeCompare(b, "pt-BR"));
    columnFilterOptions.forEach((value, index) => {
      options.appendChild(new Option(value || "Sem valor", digitavel ? value : String(index + 1)));
    });
    valueSelect.disabled = false;
  }

  const ordenadores = {};
  function filteredRows() {
    const columnIndex = $("#filtro-coluna").value === "" ? -1 : Number($("#filtro-coluna").value);
    const column = COLUMNS[tipo][columnIndex];
    const input = $("#filtro-valor");
    const digitavel = input.tagName === "INPUT";
    const valueIndex = input.value === "" ? -1 : Number(input.value) - 1;
    const columnValue = digitavel ? input.value.trim() : columnFilterOptions[valueIndex];
    const normalizar = valor => String(valor || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
    const termo = normalizar(columnValue);
    const exato = !digitavel || columnFilterOptions.some(v => normalizar(v) === termo);
    const result = rows
      .filter((d) => {
        return SLTTable.matches('filtro', column && (exato ? normalizar(columnDisplayValue(column, d)) === termo : normalizar(columnDisplayValue(column, d)).includes(termo)), Boolean(column && termo));
      })
      .sort((a, b) => {
        const dataA = Date.parse(a.criadoEm || "") || 0;
        const dataB = Date.parse(b.criadoEm || "") || 0;
        return dataB - dataA;
      });
    return ordenadores[tipo] ? ordenadores[tipo](result) : result;
  }

  function paginatedRows(data) {
    const filtered = data || filteredRows();
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }

  function visibleCodigos() {
    return new Set(paginatedRows().map(d => d.id));
  }

  function selecaoEditavelNaPagina() {
    const visiveis = visibleCodigos();
    return [...selected].every(codigo => visiveis.has(codigo));
  }

  function updateBulkButtons() {
    SLTTable.summary("demandas-summary", selected.size, paginatedRows().length, rows.length);
    const seletor = $("#demandas-page-size");
    if (seletor) seletor.disabled = editMode;
    if (complementacao) {
      complementacao.selecionar(tipo, rows.filter(row => selected.has(row.id)));
      return;
    }
    const hasSel = selected.size > 0;
    const editavel = selecaoEditavelNaPagina();
    $("#btn-bulk-edit").disabled = !hasSel || editMode || !editavel || !SLTAdminAuth.can('editDemandTable');
    $("#btn-bulk-edit").title = editavel ? "Editar selecionados" : "Para editar, selecione apenas demandas da página atual";
    $("#btn-bulk-cancel").disabled = !editMode;
    $("#btn-bulk-save").disabled = !editMode || !hasSel || !SLTAdminAuth.can('editDemandTable');
    $("#btn-bulk-delete").disabled = !hasSel || editMode || !SLTAdminAuth.can('deleteDemand');
  }

  function resetSelection() {
    selected.clear();
    editMode = false;
    updateBulkButtons();
  }

  let refsPromise;
  function ensureRefs() {
    if (complementacao) return Promise.resolve();
    if (!refsPromise) refsPromise = Promise.all([
      SLTCatalog.loadCatalog("../"),
      cache.plano || SLTAdminApi.listPlanos(),
      cache.programa || SLTAdminApi.listProgramas(),
    ]).then(([, planos, programas]) => {
      cache.plano = planos;
      cache.programa = programas;
      refPlanos = planos.filter(p => p.id !== CODIGO_PLANO_OUTROS);
      refProgramas = programas.filter(p => p.id !== CODIGO_PROGRAMA_OUTROS);
    }).catch(error => { refsPromise = null; throw error; });
    return refsPromise;
  }

  function diretoriasOptions(selectedId) {
    const items = SLTCatalog.ativos(SLTCatalog.catalog?.diretorias);
    return items
      .map(
        (dir) =>
          `<option value="${escapeHtml(dir.id)}"${dir.id === selectedId ? " selected" : ""}>${escapeHtml(dir.sigla)} — ${escapeHtml(dir.nome_oficial)}</option>`
      )
      .join("");
  }

  function planosEstrategicosOptions(diretoriaId, selectedId) {
    const items = SLTCatalog.planosPorDiretoria(diretoriaId || "");
    return items
      .map(
        (p) =>
          `<option value="${escapeHtml(p.id)}"${p.id === selectedId ? " selected" : ""}>${escapeHtml(p.sigla)} — ${escapeHtml(p.nome_oficial)}</option>`
      )
      .join("");
  }

  function planosCadastradosOptions(selectedCodigo) {
    return refPlanos
      .map(
        (p) =>
          `<option value="${escapeHtml(p.id)}"${p.id === selectedCodigo ? " selected" : ""}>${escapeHtml(p.nome)} (${escapeHtml(p.id)})</option>`
      )
      .join("");
  }

  function programasOptions(selectedCodigo) {
    return refProgramas
      .map(
        (p) =>
          `<option value="${escapeHtml(p.id)}"${p.id === selectedCodigo ? " selected" : ""}>${escapeHtml(p.nome)} (${escapeHtml(p.id)})</option>`
      )
      .join("");
  }

  function instituicoesOptions(selectedId) {
    return SLTAdminLabels.instituicoes
      .map((inst) => {
        const label = SLTSigmaRead.labelInstituicao(inst);
        return `<option value="${escapeHtml(inst.id)}"${String(inst.id) === String(selectedId) ? " selected" : ""}>${escapeHtml(label)}</option>`;
      })
      .join("");
  }

  function pessoasOptions(instituicaoId, selectedId) {
    const list = (SLTAdminLabels.pessoas || []).filter(
      (p) => !instituicaoId || String(p.instituicao_id) === String(instituicaoId)
    );
    return list
      .map((p) => {
        const label = SLTSigmaRead.labelPessoa(p);
        return `<option value="${escapeHtml(p.id)}"${String(p.id) === String(selectedId) ? " selected" : ""}>${escapeHtml(label)}</option>`;
      })
      .join("");
  }

  function statusOptions(currentStatus) {
    const permitidos = new Set(SLTAdminLabels.statusDestinosPermitidos(currentStatus));
    return SLTAdminLabels.statusDemanda
      .filter((s) => SLTAdminAuth.can("manage") || permitidos.has(s.codigo))
      .map(
        (s) =>
          `<option value="${escapeHtml(s.codigo)}"${s.codigo === currentStatus ? " selected" : ""}>${escapeHtml(SLTAdminLabels.statusDemandaLabel(s.codigo, tipo))}</option>`
      )
      .join("");
  }

  function wrapSelect(field, innerHtml, narrow) {
    const narrowCls = narrow ? " cell-select--narrow" : "";
    return `<div class="cell-edit-wrap"><select class="cell-select${narrowCls}" data-permission="${field === 'status' ? 'revertStatus' : 'editDemand'}" data-edit-field="${field}">${innerHtml}</select></div>`;
  }

  function renderClassificacaoEdit(d) {
    const planoId = d.plano_id || "";
    if (planoId === PLANO_PLI) {
      const frentes = SLTCatalog.frentesPorPlano(planoId);
      const opts = frentes
        .map(
          (f) =>
            `<option value="${escapeHtml(f.id)}"${f.id === d.classificacao?.frente_id ? " selected" : ""}>${escapeHtml(f.nome_oficial)}</option>`
        )
        .join("");
      return wrapSelect("classificacao_frente", `<option value="">—</option>${opts}`);
    }
    if (planoId === PLANO_PEF) {
      const eixos = SLTCatalog.eixosPorPlano(planoId);
      const eixoId = d.classificacao?.eixo_id || "";
      const eixoOpts = eixos
        .map(
          (e) =>
            `<option value="${escapeHtml(e.id)}"${e.id === eixoId ? " selected" : ""}>${escapeHtml(e.nome_oficial)}</option>`
        )
        .join("");
      const tics = SLTCatalog.ticsPorEixo(eixoId);
      const ticOpts = tics
        .map(
          (t) =>
            `<option value="${escapeHtml(t.id)}"${t.id === d.classificacao?.corredor_tic_id ? " selected" : ""}>${escapeHtml(t.nome_oficial)}</option>`
        )
        .join("");
      return `<div class="cell-selects-inline">
        ${wrapSelect("classificacao_eixo", `<option value="">Eixo</option>${eixoOpts}`, true)}
        ${wrapSelect("classificacao_tic", `<option value="">TIC</option>${ticOpts}`, true)}
      </div>`;
    }
    return `<span class="hint">PLI/PEF</span>`;
  }

  function renderComplementosEdit(d) {
    const planoId = d.plano_id || "";
    const modais = SLTCatalog.ativos(SLTCatalog.catalog?.modais);
    const modalOpts = modais
      .map(
        (m) =>
          `<option value="${escapeHtml(m.id)}"${m.id === d.complementos?.modal_id ? " selected" : ""}>${escapeHtml(m.nome)}</option>`
      )
      .join("");
    const tipologias = SLTCatalog.ativos(SLTCatalog.catalog?.tipologias);
    const tipOpts = tipologias
      .map(
        (t) =>
          `<option value="${escapeHtml(t.id)}"${t.id === d.complementos?.tipologia_id ? " selected" : ""}>${escapeHtml(t.nome)}</option>`
      )
      .join("");
    const carteiras = SLTCatalog.carteirasPorPlano(planoId);
    const cartOpts = carteiras
      .map(
        (c) =>
          `<option value="${escapeHtml(c.id)}"${c.id === d.complementos?.carteira_id ? " selected" : ""}>${escapeHtml(c.nome)}</option>`
      )
      .join("");
    return `<div class="cell-selects-inline">
      ${wrapSelect("complemento_modal", `<option value="">Modal</option>${modalOpts}`, true)}
      ${wrapSelect("complemento_tipologia", `<option value="">Tipo</option>${tipOpts}`, true)}
      ${wrapSelect("complemento_carteira", `<option value="">Cart.</option>${cartOpts}`, true)}
    </div>`;
  }

  function renderEditableCell(kind, d) {
    switch (kind) {
      case "diretoria":
        return wrapSelect("diretoria_id", diretoriasOptions(d.diretoria_id));
      case "plano_estrategico":
        return wrapSelect("plano_id", planosEstrategicosOptions(d.diretoria_id, d.plano_id));
      case "plano_cadastrado":
        return wrapSelect("plano_codigo", `<option value="">—</option>${planosCadastradosOptions(d.plano_codigo || "")}`);
      case "programa":
        return wrapSelect("programa_codigo", `<option value="">—</option>${programasOptions(d.programa_codigo || "")}`);
      case "instituicao":
        return wrapSelect("instituicao_id", `<option value="">—</option>${instituicoesOptions(d.instituicao_id)}`);
      case "representante": {
        const pessoaId = d.pessoa_id || d.representante?.pessoa_id;
        return wrapSelect("pessoa_id", `<option value="">—</option>${pessoasOptions(d.instituicao_id, pessoaId)}`);
      }
      case "status":
        return '<div>' + wrapSelect("status", statusOptions(d.status), true) + '</div><div><input type="text" class="ami-inline-input" data-permission="revertStatus" data-edit-field="justificativa_status" aria-label="Justificativa da reversão de status" placeholder="Justificativa da reversão" minlength="5" maxlength="2000"></div>';
      case "classificacao":
        return renderClassificacaoEdit(d);
      case "complementos":
        return renderComplementosEdit(d);
      default:
        return "—";
    }
  }

  function renderCell(col, d) {
    if (editMode && selected.has(d.id) && col.editable && SLTAdminAuth.can(col.editable === 'status' ? 'revertStatus' : 'editDemand')) {
      return renderEditableCell(col.editable, d);
    }
    return col.value(d);
  }

  function actionButton(href, icon, label, extra) {
    return `<a class="demanda-row-action" href="${href}" target="_blank" rel="noopener noreferrer" title="${label}" aria-label="${label}"${extra || ""}><i class="fa-solid ${icon}" aria-hidden="true"></i></a>`;
  }

  function modalActionButton(icon, label, codigo) {
    return `<button type="button" class="demanda-row-action" data-read-control data-demand-action="parecer-modal" data-codigo="${escapeHtml(codigo)}" title="${label}" aria-label="${label}"><i class="fa-solid ${icon}" aria-hidden="true"></i></button>`;
  }

  function renderGeometriaExtraordinaria(d) {
    if (SLTAdminAuth.currentUser?.tipo_usuario !== "GESTOR" || !SLTAdminAuth.can("mad.operar")) return "";
    const label = "Alteração extraordinária de geometria";
    const icon = "fa-pen-ruler";
    if (!STATUS_GEOMETRIA_EXTRAORDINARIA.has(d.status)) {
      const motivo = `${label} — disponível durante a hierarquização`;
      return `<button type="button" class="demanda-row-action" data-permission="mad.operar" disabled title="${motivo}" aria-label="${motivo}"><i class="fa-solid ${icon}" aria-hidden="true"></i></button>`;
    }
    const params = new URLSearchParams({tipo, codigo: d.id, geometria_extraordinaria: "true"});
    return actionButton(`/restrict/solicitacao-complementacao/?${escapeHtml(params.toString())}`, icon, label, ' data-permission="mad.operar"');
  }

  function renderActions(d) {
    const params = `tipo=${encodeURIComponent(tipo)}&id=${encodeURIComponent(d.id)}`;
    return `<div class="demanda-row-actions" role="group" aria-label="Ações para ${escapeHtml(d.id)}">
      ${actionButton(`/restrict/painel/?${params}`, "fa-map-location-dot", "Ver no painel")}
      ${actionButton(`/restrict/geoespacial/visualizador-camadas/?camada=${encodeURIComponent(`cadastro:${tipo}:${d.id}`)}`, "fa-draw-polygon", "Ver geometria")}
      ${modalActionButton("fa-file-signature", "Ver parecer técnico", d.id)}
      ${actionButton(`/api/analise/${encodeURIComponent(d.id)}/parecer.pdf`, "fa-file-pdf", "Ver PDF do parecer técnico", ' data-demand-action="parecer-pdf"')}
      ${renderGeometriaExtraordinaria(d)}
    </div>`;
  }

  function respostaAnalise(value) {
    if (value === true) return '<span class="demanda-analise-resposta is-sim"><i class="fa-solid fa-check" aria-hidden="true"></i> Sim</span>';
    if (value === false) return '<span class="demanda-analise-resposta is-nao"><i class="fa-solid fa-xmark" aria-hidden="true"></i> Não</span>';
    return '<span class="demanda-analise-resposta is-pendente">Não respondido</span>';
  }

  function textoGeometria(value) {
    return { atende: "Atende", ajuste: "Requer ajuste", nao_se_aplica: "Não se aplica" }[value] || "Não avaliado";
  }

  function renderParecerModal(data) {
    const geometria = data.avaliacao_geometria || {};
    const criterios = (data.criterios || []).map((criterio) => `
      <li class="demanda-analise-criterio">
        <div><strong>${escapeHtml(criterio.rotulo)}</strong><span>${escapeHtml(criterio.pergunta)}</span></div>
        ${respostaAnalise(criterio.resposta)}
      </li>`).join("") || '<li class="demanda-analise-vazio">Nenhum critério registrado.</li>';
    const resultado = data.resultado === "aprovado" ? "Aprovado" : data.resultado === "reprovado" ? "Reprovado" : "Pendente";
    const decisao = { aprovada: "Aprovada", ressalvas: "Aprovada com ressalvas", reprovada: "Reprovada" }[data.decisao] || "Não registrada";
    const geometriaItens = [
      ["Delimitação da intervenção", geometria.delimitacao_intervencao],
      ["Correspondência entre local e dimensões", geometria.correspondencia_local_dimensoes],
      ["Área de influência direta", geometria.area_influencia_direta],
      ["Precisão da localização", geometria.precisao_localizacao],
    ].map(([label, value]) => `<div><dt>${label}</dt><dd>${escapeHtml(textoGeometria(value))}</dd></div>`).join("");
    return `
      <article class="demanda-analise-modal" aria-label="Análise da demanda ${escapeHtml(data.demanda_codigo)}">
        <header class="demanda-analise-resumo">
          <div><span>Demanda</span><strong>${escapeHtml(data.demanda_nome || data.demanda_codigo)}</strong><small>${escapeHtml(data.demanda_codigo)}</small></div>
          <div><span>Resultado</span><strong>${resultado}</strong><small>${data.respondidos || 0} de ${data.total_criterios || 0} critérios respondidos</small></div>
          <div><span>Decisão</span><strong>${decisao}</strong><small>${escapeHtml(data.avaliador_nome || "Avaliador não registrado")}</small></div>
        </header>
        <section><h4>Critérios de análise</h4><ol class="demanda-analise-criterios">${criterios}</ol></section>
        <section><h4>Avaliação da geometria</h4><dl class="demanda-analise-geometria">${geometriaItens}</dl>${geometria.observacao ? `<p class="demanda-analise-observacao"><strong>Observação:</strong> ${escapeHtml(geometria.observacao)}</p>` : ""}</section>
        <section><h4>Parecer técnico</h4><div class="demanda-analise-parecer">${escapeHtml(data.parecer_texto || "O parecer técnico ainda não foi gerado.")}</div>${data.parecer_complemento ? `<div class="demanda-analise-complemento"><strong>Complementação do parecer</strong><p>${escapeHtml(data.parecer_complemento)}</p></div>` : ""}</section>
      </article>`;
  }

  async function exportarModalAnalisePdf(codigo) {
    const {blob, nome} = await SLTAdminApi.fetchAnaliseRelatorioPdf(codigo, true);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = nome || SicardNomeArquivo.gerar(codigo, 'analise tecnica', 'pdf');
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function abrirParecerModal(codigo) {
    const modal = SLTAdminUi.openModal("Análise da demanda", '<p class="demanda-analise-carregando"><i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Carregando análise…</p>', '<button type="button" class="btn btn-primary" data-read-control data-exportar-analise-pdf disabled><i class="fa-solid fa-file-pdf" aria-hidden="true"></i> Exportar para PDF</button>');
    modal.querySelector(".admin-modal").classList.add("demanda-analise-modal-shell");
    const exportar = modal.querySelector("[data-exportar-analise-pdf]");
    exportar.addEventListener("click", async () => {
      exportar.disabled = true;
      const rotulo = exportar.innerHTML;
      exportar.innerHTML = '<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Gerando PDF…';
      try {
        await exportarModalAnalisePdf(codigo);
        SLTAdminUi.showToast("PDF da análise disponibilizado para download.");
      } catch (error) {
        SLTAdminUi.showToast(error.message, true);
      } finally {
        exportar.innerHTML = rotulo;
        exportar.disabled = false;
      }
    });
    try {
      const data = await SLTAdminApi.getAnalise(codigo);
      const body = modal.querySelector(".admin-modal-body");
      if (body) body.innerHTML = renderParecerModal(data);
      exportar.disabled = false;
    } catch (error) {
      SLTAdminUi.closeModal();
      SLTAdminUi.showToast(error.message, true);
    }
  }

  function activeTable() {
    return document.querySelector('[data-demandas-table="' + tipo + '"]');
  }

  function renderHead(filtered = filteredRows()) {
    document.querySelectorAll("[data-demandas-table]").forEach((table) => {
      table.hidden = table.dataset.demandasTable !== tipo;
    });
    document.querySelectorAll("[data-demandas-table-wrap]").forEach((wrap) => {
      wrap.hidden = wrap.dataset.demandasTableWrap !== tipo;
    });
    const checkbox = activeTable()?.querySelector(".select-all");
    if (!checkbox) return;
    const selecionaveis = filtered.filter(d => !isSentinel(d));
    const marcados = selecionaveis.filter(d => selected.has(d.id)).length;
    checkbox.disabled = editMode || !selecionaveis.length;
    checkbox.checked = marcados > 0 && marcados === selecionaveis.length;
    checkbox.indeterminate = marcados > 0 && marcados < selecionaveis.length;
    checkbox.onchange = (ev) => {
      const on = ev.target.checked;
      selecionaveis.forEach((d) => {
        if (on) selected.add(d.id);
        else selected.delete(d.id);
      });
      if (!selected.size) editMode = false;
      renderTable();
    };
  }
  function bindRowEditors(tr, d) {
    const dirSel = tr.querySelector('[data-edit-field="diretoria_id"]');
    if (dirSel) {
      dirSel.addEventListener("change", () => {
        const planoSel = tr.querySelector('[data-edit-field="plano_id"]');
        if (planoSel) {
          planoSel.innerHTML = planosEstrategicosOptions(dirSel.value, "");
          const clsTd = tr.querySelector('[data-edit-field="classificacao_frente"], [data-edit-field="classificacao_eixo"]')?.closest("td");
          if (clsTd) {
            d = { ...d, diretoria_id: dirSel.value, plano_id: planoSel.value, classificacao: {}, complementos: {} };
            clsTd.innerHTML = renderEditableCell("classificacao", d);
            bindClassificacao(tr, d);
          }
          const compTd = tr.querySelector('[data-edit-field="complemento_modal"]')?.closest("td");
          if (compTd) {
            d = { ...d, plano_id: planoSel.value, complementos: {} };
            compTd.innerHTML = renderEditableCell("complementos", d);
          }
        }
      });
    }

    const planoSel = tr.querySelector('[data-edit-field="plano_id"]');
    if (planoSel) {
      planoSel.addEventListener("change", () => {
        d = { ...d, plano_id: planoSel.value, classificacao: {}, complementos: {} };
        const clsTd = tr.querySelector('[data-edit-field="classificacao_frente"], [data-edit-field="classificacao_eixo"]')?.closest("td");
        if (clsTd) {
          clsTd.innerHTML = renderEditableCell("classificacao", d);
          bindClassificacao(tr, d);
        }
        const compTd = tr.querySelector('[data-edit-field="complemento_modal"]')?.closest("td");
        if (compTd) {
          compTd.innerHTML = renderEditableCell("complementos", d);
        }
      });
    }

    bindClassificacao(tr, d);

    const instSel = tr.querySelector('[data-edit-field="instituicao_id"]');
    if (instSel) {
      instSel.addEventListener("change", () => {
        const repSel = tr.querySelector('[data-edit-field="pessoa_id"]');
        if (repSel) {
          repSel.innerHTML = `<option value="">—</option>${pessoasOptions(instSel.value, "")}`;
        }
      });
    }
  }

  function bindClassificacao(tr, d) {
    const eixoSel = tr.querySelector('[data-edit-field="classificacao_eixo"]');
    if (!eixoSel) return;
    eixoSel.addEventListener("change", () => {
      const ticSel = tr.querySelector('[data-edit-field="classificacao_tic"]');
      if (!ticSel) return;
      const tics = SLTCatalog.ticsPorEixo(eixoSel.value);
      ticSel.innerHTML =
        `<option value="">TIC</option>` +
        tics
          .map((t) => `<option value="${escapeHtml(t.id)}">${escapeHtml(t.nome_oficial)}</option>`)
          .join("");
    });
  }

  function renderTable() {
    const cols = COLUMNS[tipo];
    const filtered = filteredRows();
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    currentPage = Math.min(currentPage, totalPages);
    const data = paginatedRows(filtered);
    const tbody = activeTable()?.querySelector('[data-demandas-body="' + tipo + '"]');
    const vazia = $("#lista-vazia");
    renderHead(filtered);
    renderPagination(filtered.length, totalPages);
    if (!data.length) {
      tbody.innerHTML = "";
      vazia.classList.remove("hidden");
      updateBulkButtons();
      return;
    }
    vazia.classList.add("hidden");
    tbody.innerHTML = data
      .map((d) => {
        const checked = selected.has(d.id) ? " checked" : "";
        const editing = editMode && selected.has(d.id) ? " is-editing" : "";
        const gestor = SLTStatusColors.requiresGestorAction(d.status) ? " status-acao-gestor" : "";
        const sentinel = isSentinel(d);
        const cb = sentinel
          ? ""
          : `<input type="checkbox" class="row-select" data-codigo="${escapeHtml(d.id)}" aria-label="Selecionar ${escapeHtml(d.id)}"${checked}>`;
        return `
        <tr data-codigo="${escapeHtml(d.id)}" data-status="${escapeHtml(d.status || "")}" class="${(editing + gestor).trim()}">
          <td class="col-select">${cb}</td>
          ${complementacao ? "" : `<td class="col-actions">${renderActions(d)}</td>`}
          ${cols
            .map((c) => {
              const isEditableCell = editMode && selected.has(d.id) && c.editable;
              const classes = [isEditableCell ? "cell-editable" : "", c.label === "Status" ? "col-status" : ""].filter(Boolean).join(" ");
              return `<td${classes ? ` class="${classes}"` : ""}>${renderCell(c, d)}</td>`;
            })
            .join("")}
        </tr>`;
      })
      .join("");

    tbody.querySelectorAll(".row-select").forEach((cb) => {
      cb.addEventListener("click", (ev) => ev.stopPropagation());
      cb.addEventListener("change", (ev) => {
        const codigo = ev.target.dataset.codigo;
        if (ev.target.checked) selected.add(codigo);
        else {
          selected.delete(codigo);
          if (!selected.size) editMode = false;
        }
        updateBulkButtons();
        renderHead();
      });
    });

    tbody.querySelectorAll('[data-demand-action="parecer-pdf"]').forEach((link) => {
      link.addEventListener("click", async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const preview = window.open("", "_blank");
        if (preview) preview.opener = null;
        try {
          const response = await fetch(link.href, { credentials: "same-origin" });
          if (!response.ok) {
            let detail = "O PDF do parecer técnico ainda não está disponível para esta demanda.";
            try {
              const body = await response.json();
              if (typeof body.detail === "string") detail = body.detail;
            } catch (_) { /* resposta sem JSON */ }
            throw new Error(detail);
          }
          const url = URL.createObjectURL(await response.blob());
          if (preview) {
            preview.location = url;
            setTimeout(() => URL.revokeObjectURL(url), 60000);
          } else {
            URL.revokeObjectURL(url);
            throw new Error("O navegador bloqueou a abertura do PDF. Autorize pop-ups para o SICARD e tente novamente.");
          }
        } catch (error) {
          preview?.close();
          SLTAdminUi.showToast(error.message, true);
        }
      });
    });

    tbody.querySelectorAll('[data-demand-action="parecer-modal"]').forEach((button) => {
      button.addEventListener("click", (ev) => {
        ev.stopPropagation();
        abrirParecerModal(button.dataset.codigo);
      });
    });

    if (editMode) {
      tbody.querySelectorAll("tr.is-editing").forEach((tr) => {
        const d = data.find((r) => r.id === tr.dataset.codigo);
        if (d) {
          bindRowEditors(tr, d);
          tr.initialEditPayload = collectPayload(tr, d);
        }
      });
    }

    tbody.querySelectorAll("tr").forEach((tr) => {
      tr.addEventListener("click", (ev) => {
        if (editMode) return;
        if (ev.target.closest("input, select, button, a, label")) return;
        if (complementacao) {
          selected.clear();
          selected.add(tr.dataset.codigo);
          renderTable();
          return;
        }
        location.href = `/restrict/demanda/?tipo=${encodeURIComponent(tipo)}&id=${encodeURIComponent(tr.dataset.codigo)}`;
      });
    });

    updateBulkButtons();
  }

  function renderPagination(total, totalPages) {
    const pagination = $("#demandas-pagination");
    if (!pagination) return;
    pagination.classList.remove("hidden");
    $("#pagination-info").textContent = `Página ${currentPage} de ${totalPages}`;
    $("#pagination-first").disabled = $("#pagination-prev").disabled = editMode || currentPage <= 1;
    $("#pagination-last").disabled = $("#pagination-next").disabled = editMode || currentPage >= totalPages;
  }

  function val(tr, field) {
    return tr.querySelector(`[data-edit-field="${field}"]`)?.value || "";
  }

  function buildClassificacaoPayload(tr, planoId) {
    if (planoId === PLANO_PLI) {
      const frente = val(tr, "classificacao_frente");
      return frente ? { tipo: "frente_pli", frente_id: frente } : null;
    }
    if (planoId === PLANO_PEF) {
      const eixo = val(tr, "classificacao_eixo");
      if (!eixo) return null;
      const tic = val(tr, "classificacao_tic");
      return { tipo: "eixo_pef", eixo_id: eixo, corredor_tic_id: tic || null };
    }
    return null;
  }

  function buildComplementosPayload(tr) {
    const complementos = {};
    const modal = val(tr, "complemento_modal");
    const tip = val(tr, "complemento_tipologia");
    const cart = val(tr, "complemento_carteira");
    if (modal) complementos.modal_id = modal;
    if (tip) complementos.tipologia_id = tip;
    if (cart) complementos.carteira_id = cart;
    return Object.keys(complementos).length ? complementos : null;
  }

  function instituicaoPayload(instId) {
    const inst = SLTSigmaRead.findInstituicao(SLTAdminLabels.instituicoes, instId);
    return {
      instituicao_id: instId,
      instituicao_label: inst ? SLTSigmaRead.labelInstituicao(inst) : "",
      instituicao_cnpj: inst?.cnpj || inst?.cnpj_masked || null,
    };
  }

  function representantePayload(pessoaId) {
    const p = SLTSigmaRead.findPessoa(SLTAdminLabels.pessoas, pessoaId);
    return {
      pessoa_id: pessoaId,
      representante: {
        pessoa_id: pessoaId,
        nome: p ? SLTSigmaRead.labelPessoa(p) : "",
        email: p?.email || null,
        telefone: p?.telefone || null,
      },
    };
  }

  function collectPayload(tr, d) {
    const payload = {};

    if (tipo === "plano") {
      const dir = val(tr, "diretoria_id");
      if (dir) payload.diretoria_id = dir;
    }

    if (tipo === "projeto") {
      const dir = val(tr, "diretoria_id");
      const plano = val(tr, "plano_id");
      if (dir) payload.diretoria_id = dir;
      if (plano) payload.plano_id = plano;
      const prog = val(tr, "programa_codigo");
      if (prog) payload.programa_codigo = prog;
      payload.classificacao = buildClassificacaoPayload(tr, plano || d.plano_id);
      payload.complementos = buildComplementosPayload(tr);
    }

    if (tipo === "programa") {
      const planoCod = val(tr, "plano_codigo");
      if (planoCod) payload.plano_codigo = planoCod;
    }

    const instId = val(tr, "instituicao_id");
    if (instId) Object.assign(payload, instituicaoPayload(instId));

    const pessoaId = val(tr, "pessoa_id");
    if (pessoaId) Object.assign(payload, representantePayload(pessoaId));

    const status = val(tr, "status");
    if (status) payload.status = status;

    return payload;
  }

  function collectChangedPayload(tr, d) {
    const atual = collectPayload(tr, d);
    const inicial = tr.initialEditPayload || {};
    const alterados = Object.fromEntries(Object.entries(atual).filter(([campo, valor]) =>
      JSON.stringify(valor) !== JSON.stringify(inicial[campo])
    ));
    if ('status' in alterados) alterados.justificativa_status = val(tr, 'justificativa_status').trim();
    return alterados;
  }

  function deleteConfirmMessage() {
    const n = selected.size;
    if (tipo === "plano") {
      return `Excluir ${n} plano(s) selecionado(s)? Apenas o registro do plano será removido. Esta ação não pode ser desfeita.`;
    }
    if (tipo === "programa") {
      return `Excluir ${n} programa(s) selecionado(s)? Apenas o registro do programa será removido. Esta ação não pode ser desfeita.`;
    }
    return `Excluir ${n} projeto(s) selecionado(s)? Esta ação não pode ser desfeita.`;
  }

  async function saveSelected() {
    if (!SLTAdminAuth.can('editDemandTable')) { window.SICARDAccess?.denied('editar demandas'); return; }
    const codigos = [...selected];
    if (!codigos.length) return;
    $("#btn-bulk-save").disabled = true;
    try {
      for (const codigo of codigos) {
        const tr = $(`tr[data-codigo="${CSS.escape(codigo)}"]`);
        const d = rows.find((r) => r.id === codigo);
        if (!tr || !d) continue;
        const payload = collectChangedPayload(tr, d);
        if ('status' in payload && payload.justificativa_status.length < 5) {
          StatusFeedback.erro({title:'Justificativa necessária', message:'Informe uma justificativa com pelo menos 5 caracteres para reverter o status.', status:422});
          return;
        }
        if (Object.keys(payload).length) await SLTAdminApi.updateDemandaByTipo(tipo, codigo, payload);
      }
      SLTAdminUi.showToast("Alterações salvas.");
      cache[tipo] = null;
      refPlanos = [];
      refProgramas = [];
      refsPromise = null;
      cache.plano = null;
      cache.programa = null;
      editMode = false;
      selected.clear();
      await loadTipo(tipo, true);
    } catch (err) {
      SLTAdminUi.showToast(err.message, true);
    } finally {
      updateBulkButtons();
    }
  }

  async function deleteSelected() {
    if (!SLTAdminAuth.can('deleteDemand')) { window.SICARDAccess?.denied('excluir demandas'); return; }
    const codigos = [...selected].filter((id) => id !== CODIGO_PLANO_OUTROS && id !== CODIGO_PROGRAMA_OUTROS);
    if (!codigos.length) {
      SLTAdminUi.showToast("Nenhum registro válido para excluir.", true);
      return;
    }
    const ok = await SLTAdminUi.showConfirm({
      title: "Excluir registro(s)",
      message: deleteConfirmMessage(),
      confirmLabel: "Excluir",
      cancelLabel: "Cancelar",
      danger: true,
    });
    if (!ok) return;
    $("#btn-bulk-delete").disabled = true;
    try {
      for (const codigo of codigos) {
        await SLTAdminApi.deleteDemandaByTipo(tipo, codigo);
      }
      SLTAdminUi.showToast("Registro(s) excluído(s).");
      cache[tipo] = null;
      refPlanos = [];
      refProgramas = [];
      refsPromise = null;
      cache.plano = null;
      cache.programa = null;
      resetSelection();
      await loadTipo(tipo, true);
    } catch (err) {
      SLTAdminUi.showToast(err.message, true);
    } finally {
      updateBulkButtons();
    }
  }

  function enterEditMode() {
    if (!SLTAdminAuth.can('editDemandTable')) { window.SICARDAccess?.denied('editar demandas'); return; }
    if (!selected.size || !selecaoEditavelNaPagina()) return;
    editMode = true;
    renderTable();
  }

  function cancelEditMode() {
    if (!editMode) return;
    editMode = false;
    renderTable();
  }

  async function loadTipo(novoTipo, forceReload) {
    tipo = novoTipo;
    if (!forceReload) currentPage = 1;
    if (!forceReload) resetSelection();
    document.querySelectorAll("#tipo-tabs .admin-tab").forEach((btn) => {
      const active = btn.dataset.tipo === tipo;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-selected", String(active));
    });
    const requestedTipo = novoTipo;
    const [loadedRows] = await Promise.all([
      !forceReload && cache[requestedTipo] ? cache[requestedTipo] :
        (complementacao ? complementacao.listar(requestedTipo) : SLTAdminApi.listDemandasByTipo(requestedTipo, {incluirGeometria: false})),
      ensureRefs(),
    ]);
    cache[requestedTipo] = loadedRows;
    if (tipo !== requestedTipo) return;
    rows = loadedRows;
    configureOriginColumns(tipo, rows);
    fillColumnFilter();
    renderStatusLegend();
    renderTable();
  }

  function renderStatusLegend() {
    SLTStatusColors.renderLegend("#status-legend", {
      layout: "demandas",
      labelFn: (codigo) => SLTAdminLabels.statusDemandaLabel(codigo, tipo),
      tipoDemanda: tipo,
    });
  }

  async function init() {
    if (!complementacao) {
      const select = $("#filtro-valor");
      const input = document.createElement("input");
      input.id = select.id;
      input.type = "search";
      input.className = "filter-value-input";
      input.setAttribute("aria-label", "Valor do filtro");
      input.setAttribute("list", "filtro-valores");
      input.autocomplete = "off";
      input.disabled = true;
      const list = document.createElement("datalist");
      list.id = "filtro-valores";
      select.replaceWith(input, list);
      input.addEventListener("input", () => { currentPage = 1; resetSelection(); renderTable(); });
    }
    for (const kind of ['plano','programa','projeto']) {
      ordenadores[kind] = SLTTable.sorting(document.querySelector(`[data-demandas-table="${kind}"]`), () => [null, ...(complementacao ? [] : [null]), ...COLUMNS[kind].map(column => row => columnDisplayValue(column,row))], () => { currentPage=1; renderTable(); }, () => !editMode);
    }
    const user = await SLTAdminAuth.requireAuth();
    if (!user) return;
    await Promise.all([
      SLTAdminLabels.init("../"),
      ensureRefs(),
      complementacao ? Promise.resolve() : SLTAdminApi.listDemandasByTipo("projeto", {incluirGeometria: false})
        .then(items => { cache.projeto = items; }),
    ]);
    renderStatusLegend();
    document.querySelectorAll("#tipo-tabs .admin-tab").forEach((btn) => {
      btn.addEventListener("click", () => {
        loadTipo(btn.dataset.tipo).catch((err) => SLTAdminUi.showToast(err.message, true));
      });
    });

    SLTTable.bindFilter('filtro', () => { currentPage = 1; resetSelection(); renderTable(); }, () => { fillColumnFilter(); });
    $("#filtro-coluna").addEventListener("change", () => {
      updateColumnValueFilter();
      currentPage = 1;
      resetSelection();
      renderTable();
    });
    $("#filtro-valor").addEventListener("change", () => {
      currentPage = 1;
      resetSelection();
      renderTable();
    });

    $("#demandas-page-size")?.addEventListener("change", event => {
      const tamanho = Number(event.target.value);
      if (!PAGE_SIZES.includes(tamanho)) {
        event.target.value = String(pageSize);
        SLTAdminUi.showToast("Selecione uma quantidade de linhas válida.", true);
        return;
      }
      pageSize = tamanho;
      currentPage = 1;
      renderTable();
    });
    $("#pagination-first").addEventListener("click", () => { currentPage = 1; renderTable(); });
    $("#pagination-last").addEventListener("click", () => { currentPage = Math.max(1, Math.ceil(filteredRows().length / pageSize)); renderTable(); });
    $("#pagination-prev").addEventListener("click", () => {
      currentPage = Math.max(1, currentPage - 1);
      renderTable();
    });
    $("#pagination-next").addEventListener("click", () => {
      currentPage += 1;
      renderTable();
    });
    $("#btn-bulk-edit")?.addEventListener("click", enterEditMode);
    $("#btn-bulk-cancel")?.addEventListener("click", cancelEditMode);
    $("#btn-bulk-save")?.addEventListener("click", () => {
      saveSelected().catch((err) => SLTAdminUi.showToast(err.message, true));
    });
    $("#btn-bulk-delete")?.addEventListener("click", () => {
      deleteSelected().catch((err) => SLTAdminUi.showToast(err.message, true));
    });
    document.addEventListener('complementacao-salva', () => {
      loadTipo(tipo, true).catch(err => SLTAdminUi.showToast(err.message, true));
    });
    await loadTipo("projeto");
  }

  init().catch((err) => {
    console.error(err);
    if (err.code === "UNAUTHORIZED") {
      location.replace(SLTAdminAuth.loginUrl());
      return;
    }
    SLTAdminUi.showToast(err.message, true);
  });
})();
