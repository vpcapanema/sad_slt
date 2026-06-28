(function () {
  const {
    escapeHtml,
    formatDate,
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

  let tipo = "projeto";
  let rows = [];
  let editMode = false;
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

  const COLUMNS = {
    projeto: [
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
      { label: "Status", value: statusCell, editable: "status" },
      { label: "Cadastro", value: (d) => escapeHtml(formatDate(d.criadoEm)) },
    ],
    programa: [
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
      { label: "Status", value: statusCell, editable: "status" },
      { label: "Cadastro", value: (d) => escapeHtml(formatDate(d.criadoEm)) },
    ],
    plano: [
      { label: "Código", value: (d) => `<code>${escapeHtml(d.id)}</code>` },
      { label: "Plano", value: (d) => escapeHtml(d.nome) },
      { label: "Diretoria", value: (d) => escapeHtml(diretoriaLabel(d.diretoria_id)), editable: "diretoria" },
      { label: "Instituição", value: (d) => escapeHtml(instituicaoRowLabel(d)), editable: "instituicao" },
      { label: "Representante", value: (d) => escapeHtml(representanteLabel(d)), editable: "representante" },
      { label: "Objetivo estratégico", value: (d) => escapeHtml(truncate(d.objetivo_estrategico, 80)) },
      { label: "Vigência", value: (d) => escapeHtml(formatVigencia(d.vigencia_inicio, d.vigencia_fim)) },
      { label: "Valor global", value: (d) => escapeHtml(formatMoney(d.valor_global)) },
      { label: "Abrangência", value: (d) => escapeHtml(abrangenciaLabel(d.unidades_espaciais)) },
      { label: "Status", value: statusCell, editable: "status" },
      { label: "Cadastro", value: (d) => escapeHtml(formatDate(d.criadoEm)) },
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

  function filteredRows() {
    const status = $("#filtro-status").value;
    const q = ($("#filtro-busca").value || "").trim().toLowerCase();
    return rows.filter((d) => {
      if (status && d.status !== status) return false;
      if (!q) return true;
      return searchHaystack(d).includes(q);
    });
  }

  function visibleCodigos() {
    return filteredRows().map((d) => d.id);
  }

  function updateBulkButtons() {
    const hasSel = selected.size > 0;
    $("#btn-bulk-edit").disabled = !hasSel || editMode;
    $("#btn-bulk-cancel").disabled = !editMode;
    $("#btn-bulk-save").disabled = !editMode || !hasSel;
    $("#btn-bulk-delete").disabled = !hasSel || editMode;
  }

  function resetSelection() {
    selected.clear();
    editMode = false;
    updateBulkButtons();
  }

  async function ensureRefs() {
    await SLTCatalog.loadCatalog("../");
    if (!refPlanos.length) {
      refPlanos = (await SLTAdminApi.listPlanos()).filter((p) => p.id !== CODIGO_PLANO_OUTROS);
    }
    if (!refProgramas.length) {
      refProgramas = (await SLTAdminApi.listProgramas()).filter((p) => p.id !== CODIGO_PROGRAMA_OUTROS);
    }
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
      .filter((s) => permitidos.has(s.codigo))
      .map(
        (s) =>
          `<option value="${escapeHtml(s.codigo)}"${s.codigo === currentStatus ? " selected" : ""}>${escapeHtml(SLTAdminLabels.statusDemandaLabel(s.codigo, tipo))}</option>`
      )
      .join("");
  }

  function wrapSelect(field, innerHtml, narrow) {
    const narrowCls = narrow ? " cell-select--narrow" : "";
    return `<div class="cell-edit-wrap"><select class="cell-select${narrowCls}" data-edit-field="${field}">${innerHtml}</select></div>`;
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
        return wrapSelect("status", statusOptions(d.status), true);
      case "classificacao":
        return renderClassificacaoEdit(d);
      case "complementos":
        return renderComplementosEdit(d);
      default:
        return "—";
    }
  }

  function renderCell(col, d) {
    if (editMode && selected.has(d.id) && col.editable) {
      return renderEditableCell(col.editable, d);
    }
    return col.value(d);
  }

  function renderHead() {
    const head = $("#tabela-head");
    if (!head) return;
    const allChecked =
      filteredRows().length > 0 && filteredRows().every((d) => selected.has(d.id) || isSentinel(d));
    head.innerHTML =
      `<th class="col-select" scope="col"><input type="checkbox" id="select-all" aria-label="Selecionar todos"${allChecked ? " checked" : ""}></th>` +
      COLUMNS[tipo].map((c) => `<th scope="col">${escapeHtml(c.label)}</th>`).join("");
    $("#select-all")?.addEventListener("change", (ev) => {
      const on = ev.target.checked;
      filteredRows().forEach((d) => {
        if (isSentinel(d)) return;
        if (on) selected.add(d.id);
        else selected.delete(d.id);
      });
      if (!selected.size) editMode = false;
      renderTable();
    });
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
    const data = filteredRows();
    const tbody = $("#tabela-demandas");
    const vazia = $("#lista-vazia");
    renderHead();
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
        const sentinel = isSentinel(d);
        const cb = sentinel
          ? ""
          : `<input type="checkbox" class="row-select" data-codigo="${escapeHtml(d.id)}" aria-label="Selecionar ${escapeHtml(d.id)}"${checked}>`;
        return `
        <tr data-codigo="${escapeHtml(d.id)}" data-status="${escapeHtml(d.status || "")}" class="${editing.trim()}">
          <td class="col-select">${cb}</td>
          ${cols
            .map((c) => {
              const isEditableCell = editMode && selected.has(d.id) && c.editable;
              return `<td${isEditableCell ? ' class="cell-editable"' : ""}>${renderCell(c, d)}</td>`;
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

    if (editMode) {
      tbody.querySelectorAll("tr.is-editing").forEach((tr) => {
        const d = data.find((r) => r.id === tr.dataset.codigo);
        if (d) bindRowEditors(tr, d);
      });
    }

    tbody.querySelectorAll("tr").forEach((tr) => {
      tr.addEventListener("click", (ev) => {
        if (editMode) return;
        if (ev.target.closest("input, select, button, a, label")) return;
        location.href = `demanda.html?tipo=${encodeURIComponent(tipo)}&id=${encodeURIComponent(tr.dataset.codigo)}`;
      });
    });

    updateBulkButtons();
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
    const codigos = [...selected];
    if (!codigos.length) return;
    $("#btn-bulk-save").disabled = true;
    try {
      for (const codigo of codigos) {
        const tr = $(`tr[data-codigo="${CSS.escape(codigo)}"]`);
        const d = rows.find((r) => r.id === codigo);
        if (!tr || !d) continue;
        const payload = collectPayload(tr, d);
        await SLTAdminApi.updateDemandaByTipo(tipo, codigo, payload);
      }
      SLTAdminUi.showToast("Alterações salvas.");
      cache[tipo] = null;
      refPlanos = [];
      refProgramas = [];
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
    const codigos = [...selected].filter((id) => id !== CODIGO_PLANO_OUTROS && id !== CODIGO_PROGRAMA_OUTROS);
    if (!codigos.length) {
      SLTAdminUi.showToast("Nenhum registro válido para excluir.", true);
      return;
    }
    if (!window.confirm(deleteConfirmMessage())) return;
    $("#btn-bulk-delete").disabled = true;
    try {
      for (const codigo of codigos) {
        await SLTAdminApi.deleteDemandaByTipo(tipo, codigo);
      }
      SLTAdminUi.showToast("Registro(s) excluído(s).");
      cache[tipo] = null;
      refPlanos = [];
      refProgramas = [];
      resetSelection();
      await loadTipo(tipo, true);
    } catch (err) {
      SLTAdminUi.showToast(err.message, true);
    } finally {
      updateBulkButtons();
    }
  }

  function enterEditMode() {
    if (!selected.size) return;
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
    if (!forceReload) resetSelection();
    document.querySelectorAll("#tipo-tabs .admin-tab").forEach((btn) => {
      const active = btn.dataset.tipo === tipo;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-selected", String(active));
    });
    if (forceReload || !cache[tipo]) {
      cache[tipo] = await SLTAdminApi.listDemandasByTipo(tipo);
    }
    rows = cache[tipo];
    await ensureRefs();
    fillStatusFilter();
    renderStatusLegend();
    renderTable();
  }

  function fillStatusFilter() {
    const sel = $("#filtro-status");
    sel.innerHTML = '<option value="">Todos</option>';
    SLTAdminLabels.statusDemanda.forEach((s) => {
      const opt = document.createElement("option");
      opt.value = s.codigo;
      opt.textContent = SLTAdminLabels.statusDemandaLabel(s.codigo, tipo);
      sel.appendChild(opt);
    });
  }

  function renderStatusLegend() {
    SLTStatusColors.renderLegend("#status-legend", {
      labelFn: (codigo) => SLTAdminLabels.statusDemandaLabel(codigo, tipo),
    });
  }

  async function init() {
    const user = await SLTAdminAuth.requireAuth();
    if (!user) return;
    await SLTAdminLabels.init("../");
    fillStatusFilter();
    renderStatusLegend();
    document.querySelectorAll("#tipo-tabs .admin-tab").forEach((btn) => {
      btn.addEventListener("click", () => {
        loadTipo(btn.dataset.tipo).catch((err) => SLTAdminUi.showToast(err.message, true));
      });
    });
    $("#filtro-status").addEventListener("change", renderTable);
    $("#filtro-busca").addEventListener("input", renderTable);
    $("#btn-bulk-edit").addEventListener("click", enterEditMode);
    $("#btn-bulk-cancel").addEventListener("click", cancelEditMode);
    $("#btn-bulk-save").addEventListener("click", () => {
      saveSelected().catch((err) => SLTAdminUi.showToast(err.message, true));
    });
    $("#btn-bulk-delete").addEventListener("click", () => {
      deleteSelected().catch((err) => SLTAdminUi.showToast(err.message, true));
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
