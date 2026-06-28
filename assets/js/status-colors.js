(function (global) {
  /**
   * Paleta única de status do SLT — fonte de verdade para badges, linhas de tabela,
   * pins do mapa e legendas. Não duplique cores em CSS estático; use injectTheme().
   */
  const STATUS_DEMANDA = {
    rascunho: {
      nome: "Demanda em rascunho",
      bg: "#eef1f4",
      text: "#5a6570",
      row: "#f4f6f8",
      halo: "rgba(90, 101, 112, 0.42)",
    },
    em_analise: {
      nome: "Demanda em análise",
      bg: "#fff4a8",
      text: "#c49a00",
      row: "#fffce8",
      halo: "rgba(196, 154, 0, 0.38)",
    },
    aprovada: {
      nome: "Demanda aprovada",
      bg: "#e6f6ed",
      text: "#1a6b3c",
      row: "#f0faf4",
      halo: "rgba(26, 107, 60, 0.42)",
    },
    reprovada: {
      nome: "Demanda reprovada",
      bg: "#fdecea",
      text: "#922b21",
      row: "#fef5f4",
      halo: "rgba(146, 43, 33, 0.42)",
    },
    arquivada: {
      nome: "Arquivada",
      bg: "#eceff1",
      text: "#546e7a",
      row: "#f5f7f8",
      halo: "rgba(84, 110, 122, 0.42)",
    },
    suspenso: {
      nome: "Suspenso",
      bg: "#eceff1",
      text: "#546e7a",
      row: "#f5f7f8",
      halo: "rgba(84, 110, 122, 0.42)",
    },
    retirado: {
      nome: "Retirado",
      bg: "#fdecea",
      text: "#922b21",
      row: "#fef5f4",
      halo: "rgba(146, 43, 33, 0.42)",
    },
    elegivel_ahp: {
      nome: "Aguardando hierarquização",
      bg: "#e3edf7",
      text: "#2c5282",
      row: "#eef6fc",
      halo: "rgba(44, 82, 130, 0.42)",
    },
    fila_hierarquizacao: {
      nome: "Na fila de hierarquização",
      bg: "#dceefb",
      text: "#1a4a6e",
      row: "#e8f4fc",
      halo: "rgba(26, 74, 110, 0.42)",
    },
    em_hierarquizacao: {
      nome: "Em hierarquização",
      bg: "#fff4a8",
      text: "#c49a00",
      row: "#fffce8",
      halo: "rgba(196, 154, 0, 0.38)",
    },
    hierarquizado: {
      nome: "Hierarquizado",
      bg: "#e6f6ed",
      text: "#1a6b3c",
      row: "#f0faf4",
      halo: "rgba(26, 107, 60, 0.42)",
    },
    em_execucao: {
      nome: "Em execução",
      bg: "#e8f4fd",
      text: "#1565c0",
      row: "#f0f8ff",
      halo: "rgba(21, 101, 192, 0.42)",
    },
    finalizado: {
      nome: "Finalizado",
      bg: "#e6f6ed",
      text: "#1a6b3c",
      row: "#f0faf4",
      halo: "rgba(26, 107, 60, 0.42)",
    },
    cancelado: {
      nome: "Cancelado",
      bg: "#fdecea",
      text: "#922b21",
      row: "#fef5f4",
      halo: "rgba(146, 43, 33, 0.42)",
    },
  };

  /** Ordem de exibição na legenda (camadas do ciclo de vida). */
  const LEGEND_ORDER = [
    "rascunho",
    "em_analise",
    "aprovada",
    "reprovada",
    "arquivada",
    "suspenso",
    "retirado",
    "elegivel_ahp",
    "fila_hierarquizacao",
    "em_hierarquizacao",
    "hierarquizado",
    "em_execucao",
    "finalizado",
    "cancelado",
  ];

  const STATUS_OBJETO = Object.fromEntries(
    LEGEND_ORDER.filter((c) => STATUS_DEMANDA[c]).map((c) => [c, STATUS_DEMANDA[c]])
  );

  const FALLBACK = {
    nome: "—",
    bg: "#e8eef3",
    text: "#2d3748",
    row: "#f4f6f8",
    halo: "rgba(45, 55, 72, 0.4)",
  };

  function escapeHtml(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function getStatusDemanda(codigo) {
    return STATUS_DEMANDA[codigo] || { ...FALLBACK, nome: codigo || FALLBACK.nome };
  }

  function getStatusObjeto(codigo) {
    return STATUS_OBJETO[codigo] || getStatusDemanda(codigo);
  }

  function badgeClass(codigo) {
    return `badge-status ${String(codigo || "").replace(/\s+/g, "")}`;
  }

  function injectTheme() {
    if (document.getElementById("slt-status-theme")) return;

    const rootVars = [];
    const rules = [];

    LEGEND_ORDER.forEach((codigo) => {
      const c = STATUS_DEMANDA[codigo];
      if (!c) return;
      rootVars.push(`  --status-${codigo}-bg: ${c.bg};`);
      rootVars.push(`  --status-${codigo}-text: ${c.text};`);
      rootVars.push(`  --status-${codigo}-row: ${c.row};`);
      rules.push(
        `.badge-status.${codigo}{background:var(--status-${codigo}-bg);color:var(--status-${codigo}-text);}`
      );
      rules.push(
        `.admin-table tbody tr[data-status="${codigo}"] td{background-color:color-mix(in srgb,var(--status-${codigo}-row) 72%,#fff);}`
      );
      rules.push(
        `.admin-table tbody tr[data-status="${codigo}"]:hover td{background-color:color-mix(in srgb,var(--status-${codigo}-row) 88%,#fff);}`
      );
    });

    const style = document.createElement("style");
    style.id = "slt-status-theme";
    style.textContent = `:root{\n${rootVars.join("\n")}\n}\n${rules.join("\n")}`;
    document.head.appendChild(style);
  }

  function renderLegend(container, options) {
    const el = typeof container === "string" ? document.querySelector(container) : container;
    if (!el) return;

    const opts = options || {};
    const labelFn = opts.labelFn || ((codigo) => getStatusDemanda(codigo).nome);
    const codes = opts.codes || LEGEND_ORDER.filter((c) => STATUS_DEMANDA[c]);
    const title = opts.title !== false ? opts.title || "Legenda de status" : null;

    const items = codes
      .map((codigo) => {
        const st = getStatusDemanda(codigo);
        return `<li class="status-color-legend-item" data-status="${escapeHtml(codigo)}">
          <span class="status-color-legend-swatch" style="background:${st.bg};color:${st.text}" aria-hidden="true"></span>
          <span class="status-color-legend-label">${escapeHtml(labelFn(codigo))}</span>
        </li>`;
      })
      .join("");

    el.innerHTML = `${
      title ? `<p class="status-color-legend-title">${escapeHtml(title)}</p>` : ""
    }<ul class="status-color-legend" role="list">${items}</ul>`;
  }

  injectTheme();

  global.SLTStatusColors = {
    STATUS_DEMANDA,
    STATUS_OBJETO,
    LEGEND_ORDER,
    getStatusDemanda,
    getStatusObjeto,
    badgeClass,
    injectTheme,
    renderLegend,
  };
})(window);
