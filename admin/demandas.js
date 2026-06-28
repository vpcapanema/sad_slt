(function () {
  const {
    escapeHtml,
    formatDate,
    formatMoney,
    formatVigencia,
    truncate,
    statusDemandaLabel,
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
    statusBadgeClass,
  } = SLTAdminLabels;

  let tipo = "projeto";
  let rows = [];
  const cache = { projeto: null, programa: null, plano: null };

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function statusCell(d) {
    return `<span class="${statusBadgeClass(d.status)}">${escapeHtml(statusDemandaLabel(d.status))}</span>`;
  }

  const COLUMNS = {
    projeto: [
      { label: "Código", value: (d) => `<code>${escapeHtml(d.id)}</code>` },
      { label: "Projeto", value: (d) => escapeHtml(d.nome) },
      { label: "Diretoria", value: (d) => escapeHtml(diretoriaLabel(d.diretoria_id)) },
      { label: "Plano estratégico", value: (d) => escapeHtml(planoLabel(d.plano_id)) },
      {
        label: "Vínculo institucional",
        value: (d) => escapeHtml(vinculoInstitucionalLabel(d.vinculo_institucional, d.vinculo_tipo)),
      },
      {
        label: "Programa vinculado",
        value: (d) => escapeHtml(programaCadastradoLabel(d)),
      },
      { label: "Instituição", value: (d) => escapeHtml(instituicaoLabel(d)) },
      { label: "Representante", value: (d) => escapeHtml(representanteLabel(d)) },
      { label: "Classificação", value: (d) => escapeHtml(classificacaoLabel(d.classificacao, d.plano_id)) },
      { label: "Complementos", value: (d) => escapeHtml(complementosLabel(d.complementos)) },
      { label: "Geometria", value: (d) => escapeHtml(geometriaResumo(d.geometria)) },
      { label: "Status", value: statusCell },
      { label: "Cadastro", value: (d) => escapeHtml(formatDate(d.criadoEm)) },
    ],
    programa: [
      { label: "Código", value: (d) => `<code>${escapeHtml(d.id)}</code>` },
      { label: "Programa", value: (d) => escapeHtml(d.nome) },
      {
        label: "Plano vinculado",
        value: (d) => escapeHtml(planoCadastradoLabel(d)),
      },
      {
        label: "Vínculo institucional",
        value: (d) => escapeHtml(vinculoInstitucionalLabel(d.vinculo_institucional)),
      },
      { label: "Diretoria", value: (d) => escapeHtml(diretoriaLabel(d.diretoria_id)) },
      { label: "Instituição", value: (d) => escapeHtml(instituicaoRowLabel(d)) },
      { label: "Representante", value: (d) => escapeHtml(representanteLabel(d)) },
      { label: "Órgão responsável", value: (d) => escapeHtml(d.orgao_responsavel || "—") },
      { label: "Objetivo", value: (d) => escapeHtml(truncate(d.objetivo, 80)) },
      { label: "Valor global", value: (d) => escapeHtml(formatMoney(d.valor_global)) },
      { label: "Abrangência", value: (d) => escapeHtml(abrangenciaLabel(d.unidades_espaciais)) },
      { label: "Status", value: statusCell },
      { label: "Cadastro", value: (d) => escapeHtml(formatDate(d.criadoEm)) },
    ],
    plano: [
      { label: "Código", value: (d) => `<code>${escapeHtml(d.id)}</code>` },
      { label: "Plano", value: (d) => escapeHtml(d.nome) },
      { label: "Diretoria", value: (d) => escapeHtml(diretoriaLabel(d.diretoria_id)) },
      { label: "Instituição", value: (d) => escapeHtml(instituicaoRowLabel(d)) },
      { label: "Representante", value: (d) => escapeHtml(representanteLabel(d)) },
      { label: "Objetivo estratégico", value: (d) => escapeHtml(truncate(d.objetivo_estrategico, 80)) },
      { label: "Vigência", value: (d) => escapeHtml(formatVigencia(d.vigencia_inicio, d.vigencia_fim)) },
      { label: "Valor global", value: (d) => escapeHtml(formatMoney(d.valor_global)) },
      { label: "Abrangência", value: (d) => escapeHtml(abrangenciaLabel(d.unidades_espaciais)) },
      { label: "Status", value: statusCell },
      { label: "Cadastro", value: (d) => escapeHtml(formatDate(d.criadoEm)) },
    ],
  };

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

  function renderHead() {
    const head = $("#tabela-head");
    if (!head) return;
    head.innerHTML = COLUMNS[tipo]
      .map((c) => `<th>${escapeHtml(c.label)}</th>`)
      .join("");
  }

  function renderTable() {
    const cols = COLUMNS[tipo];
    const data = filteredRows();
    const tbody = $("#tabela-demandas");
    const vazia = $("#lista-vazia");
    if (!data.length) {
      tbody.innerHTML = "";
      vazia.classList.remove("hidden");
      return;
    }
    vazia.classList.add("hidden");
    tbody.innerHTML = data
      .map(
        (d) => `
        <tr data-codigo="${escapeHtml(d.id)}">
          ${cols.map((c) => `<td>${c.value(d)}</td>`).join("")}
        </tr>`
      )
      .join("");
    tbody.querySelectorAll("tr").forEach((tr) => {
      tr.addEventListener("click", () => {
        location.href = `demanda.html?tipo=${encodeURIComponent(tipo)}&id=${encodeURIComponent(tr.dataset.codigo)}`;
      });
    });
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

  function fillStatusFilter() {
    const sel = $("#filtro-status");
    sel.innerHTML = '<option value="">Todos</option>';
    SLTAdminLabels.statusDemanda.forEach((s) => {
      const opt = document.createElement("option");
      opt.value = s.codigo;
      opt.textContent = s.nome;
      sel.appendChild(opt);
    });
  }

  async function loadTipo(novoTipo) {
    tipo = novoTipo;
    document.querySelectorAll("#tipo-tabs .admin-tab").forEach((btn) => {
      const active = btn.dataset.tipo === tipo;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-selected", String(active));
    });
    renderHead();
    if (!cache[tipo]) {
      $("#tabela-demandas").innerHTML = "";
      $("#lista-vazia").classList.add("hidden");
      cache[tipo] = await SLTAdminApi.listDemandasByTipo(tipo);
    }
    rows = cache[tipo];
    renderTable();
  }

  async function init() {
    const user = await SLTAdminAuth.requireAuth();
    if (!user) return;
    await SLTAdminLabels.init("../");
    fillStatusFilter();
    document.querySelectorAll("#tipo-tabs .admin-tab").forEach((btn) => {
      btn.addEventListener("click", () => {
        loadTipo(btn.dataset.tipo).catch((err) => SLTAdminUi.showToast(err.message, true));
      });
    });
    $("#filtro-status").addEventListener("change", renderTable);
    $("#filtro-busca").addEventListener("input", renderTable);
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
