(function (global) {
  /**
   * Paleta única de status do SLT — fonte de verdade para badges, linhas de tabela,
   * pins do mapa e legendas. Não duplique cores em CSS estático; use injectTheme().
   */
  const STATUS_DEMANDA = {
    rascunho: {
      nome: "Demanda em rascunho",
      bg: "#e8eef3",
      text: "#2c5282",
      row: "#dce4eb",
      halo: "rgba(44, 82, 130, 0.4)",
    },
    em_analise: {
      nome: "Demanda em análise",
      bg: "#fff8e1",
      text: "#6d4c41",
      row: "#ffecb3",
      halo: "rgba(109, 76, 65, 0.4)",
    },
    aprovada: {
      nome: "Demanda aprovada",
      bg: "#e8f5e9",
      text: "#2e7d32",
      row: "#c8e6c9",
      halo: "rgba(46, 125, 50, 0.4)",
    },
    reprovada: {
      nome: "Demanda reprovada",
      bg: "#ffebee",
      text: "#c62828",
      row: "#ffcdd2",
      halo: "rgba(198, 40, 40, 0.4)",
    },
    arquivada: {
      nome: "Arquivada",
      bg: "#eceff1",
      text: "#455a64",
      row: "#e0e0e0",
      halo: "rgba(69, 90, 100, 0.35)",
    },
    suspenso: {
      nome: "Suspenso",
      bg: "#eceff1",
      text: "#546e7a",
      row: "#dfe6e9",
      halo: "rgba(84, 110, 122, 0.35)",
    },
    retirado: {
      nome: "Retirado",
      bg: "#fbe9e7",
      text: "#d84315",
      row: "#ffccbc",
      halo: "rgba(216, 67, 21, 0.4)",
    },
    elegivel_ahp: {
      nome: "Aguardando hierarquização",
      bg: "#e3f2fd",
      text: "#1565c0",
      row: "#bbdefb",
      halo: "rgba(21, 101, 192, 0.4)",
    },
    fila_hierarquizacao: {
      nome: "Na fila de hierarquização",
      bg: "#e0f7fa",
      text: "#00838f",
      row: "#b2ebf2",
      halo: "rgba(0, 131, 143, 0.4)",
    },
    em_hierarquizacao: {
      nome: "Em hierarquização",
      bg: "#fff3e0",
      text: "#e65100",
      row: "#ffe0b2",
      halo: "rgba(230, 81, 0, 0.4)",
    },
    hierarquizado: {
      nome: "Hierarquizado",
      bg: "#e0f2f1",
      text: "#00695c",
      row: "#b2dfdb",
      halo: "rgba(0, 105, 92, 0.4)",
    },
    em_execucao: {
      nome: "Em execução",
      bg: "#e8eaf6",
      text: "#283593",
      row: "#c5cae9",
      halo: "rgba(40, 53, 147, 0.4)",
    },
    finalizado: {
      nome: "Finalizado",
      bg: "#e8f5e9",
      text: "#1b5e20",
      row: "#a5d6a7",
      halo: "rgba(27, 94, 32, 0.4)",
    },
    cancelado: {
      nome: "Cancelado",
      bg: "#ffebee",
      text: "#b71c1c",
      row: "#ef9a9a",
      halo: "rgba(183, 28, 28, 0.4)",
    },
  };

  /** Fases do ciclo de vida — uma linha por fase na legenda. */
  const LEGEND_FASES = [
    {
      id: "analise",
      title: "Fase 1 — Análise",
      codes: ["rascunho", "em_analise", "aprovada", "reprovada", "arquivada"],
    },
    {
      id: "hierarquizacao",
      title: "Fase 2 — Hierarquização",
      codes: ["elegivel_ahp", "fila_hierarquizacao", "em_hierarquizacao", "hierarquizado"],
    },
    {
      id: "execucao",
      title: "Fase 3 — Ranqueamento e execução",
      codes: ["em_execucao", "finalizado", "cancelado", "suspenso", "retirado"],
    },
  ];

  const LEGEND_ORDER = LEGEND_FASES.flatMap((fase) => fase.codes);

  /** @deprecated use LEGEND_FASES */
  const LEGEND_LAYERS = LEGEND_FASES;

  const STATUS_OBJETO = Object.fromEntries(
    ["elegivel_ahp", "fila_hierarquizacao", "em_hierarquizacao", "hierarquizado", "suspenso", "retirado"].map(
      (c) => [c, STATUS_DEMANDA[c]]
    )
  );

  /** Status que exigem ação imediata do gestor (linha + badge piscam). */
  const STATUS_ACAO_GESTOR = new Set(["em_analise"]);

  const TIPO_DEMANDA = {
    plano: { label: "Plano", hint: "Listras diagonais" },
    programa: { label: "Programa", hint: "Malha cruzada" },
    projeto: { label: "Projeto", hint: "Liso (alfinete)" },
  };

  const FALLBACK = {
    nome: "—",
    bg: "#eceff1",
    text: "#455a64",
    row: "#dfe6e9",
    halo: "rgba(69, 90, 100, 0.35)",
  };

  const SVG_NS = "http://www.w3.org/2000/svg";

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

  function normalizeTipoDemanda(tipo) {
    if (tipo === "objeto") return "projeto";
    if (tipo && TIPO_DEMANDA[tipo]) return tipo;
    return "projeto";
  }

  function hasTipoTexture(tipo) {
    const t = normalizeTipoDemanda(tipo);
    return t === "plano" || t === "programa";
  }

  function patternId(tipo, codigo) {
    return `slt-fill-${normalizeTipoDemanda(tipo)}-${String(codigo).replace(/\s+/g, "")}`;
  }

  function ensurePatternRoot() {
    let root = document.getElementById("slt-map-pattern-root");
    if (!root) {
      root = document.createElementNS(SVG_NS, "svg");
      root.setAttribute("id", "slt-map-pattern-root");
      root.setAttribute("aria-hidden", "true");
      root.style.cssText = "position:absolute;width:0;height:0;overflow:hidden;pointer-events:none";
      const defs = document.createElementNS(SVG_NS, "defs");
      defs.id = "slt-map-patterns";
      root.appendChild(defs);
      document.body.appendChild(root);
    }
    return document.getElementById("slt-map-patterns");
  }

  function clearPatterns() {
    const defs = document.getElementById("slt-map-patterns");
    if (defs) defs.innerHTML = "";
  }

  function appendLine(parent, attrs) {
    const line = document.createElementNS(SVG_NS, "line");
    Object.entries(attrs).forEach(([k, v]) => line.setAttribute(k, String(v)));
    parent.appendChild(line);
  }

  function createPatternElement(id, tipo, st) {
    const pattern = document.createElementNS(SVG_NS, "pattern");
    pattern.id = id;
    pattern.setAttribute("patternUnits", "userSpaceOnUse");

    const rect = document.createElementNS(SVG_NS, "rect");
    rect.setAttribute("fill", st.row);

    if (tipo === "plano") {
      pattern.setAttribute("width", "10");
      pattern.setAttribute("height", "10");
      pattern.setAttribute("patternTransform", "rotate(45)");
      rect.setAttribute("width", "10");
      rect.setAttribute("height", "10");
      pattern.appendChild(rect);
      appendLine(pattern, {
        x1: 0,
        y1: 0,
        x2: 0,
        y2: 10,
        stroke: st.text,
        "stroke-width": 2,
        opacity: 0.32,
      });
    } else if (tipo === "programa") {
      pattern.setAttribute("width", "8");
      pattern.setAttribute("height", "8");
      rect.setAttribute("width", "8");
      rect.setAttribute("height", "8");
      pattern.appendChild(rect);
      appendLine(pattern, {
        x1: 0,
        y1: 4,
        x2: 8,
        y2: 4,
        stroke: st.text,
        "stroke-width": 1.2,
        opacity: 0.28,
      });
      appendLine(pattern, {
        x1: 4,
        y1: 0,
        x2: 4,
        y2: 8,
        stroke: st.text,
        "stroke-width": 1.2,
        opacity: 0.28,
      });
    }

    return pattern;
  }

  const LEGEND_PATTERN_OPACITY = { plano: 0.52, programa: 0.46 };

  function createLegendPatternElement(id, tipo, st) {
    const pattern = createPatternElement(id, tipo, st);
    if (tipo === "plano") {
      const line = pattern.querySelector("line");
      if (line) line.setAttribute("opacity", String(LEGEND_PATTERN_OPACITY.plano));
    } else if (tipo === "programa") {
      pattern.querySelectorAll("line").forEach((line) => {
        line.setAttribute("opacity", String(LEGEND_PATTERN_OPACITY.programa));
      });
    }
    return pattern;
  }

  function registerLegendPattern(tipo, codigo, palette) {
    const t = normalizeTipoDemanda(tipo);
    if (!hasTipoTexture(t)) return null;
    const st = palette || getStatusDemanda(codigo);
    const id = patternId(t, codigo);
    const defs = ensurePatternRoot();
    if (defs.querySelector(`#${CSS.escape(id)}`)) return id;
    defs.appendChild(createLegendPatternElement(id, t, st));
    return id;
  }

  function registerPattern(tipo, codigo, palette) {
    const t = normalizeTipoDemanda(tipo);
    if (!hasTipoTexture(t)) return null;
    const st = palette || getStatusDemanda(codigo);
    const id = patternId(t, codigo);
    const defs = ensurePatternRoot();
    if (defs.querySelector(`#${CSS.escape(id)}`)) return id;
    defs.appendChild(createPatternElement(id, t, st));
    return id;
  }

  function patternFillUrl(tipo, codigo) {
    const id = registerPattern(tipo, codigo);
    return id ? `url(#${id})` : getStatusDemanda(codigo).row;
  }

  function badgeClass(codigo) {
    return `badge-status ${String(codigo || "").replace(/\s+/g, "")}`;
  }

  function requiresGestorAction(codigo) {
    return STATUS_ACAO_GESTOR.has(codigo);
  }

  function actionClass(codigo) {
    return requiresGestorAction(codigo) ? " status-acao-gestor" : "";
  }

  function resolveStatus(codigo, kind) {
    return kind === "objeto" ? getStatusObjeto(codigo) : getStatusDemanda(codigo);
  }

  function leafletPathStyle(codigo, kind, tipoDemanda) {
    const st = resolveStatus(codigo, kind);
    const tipo = normalizeTipoDemanda(tipoDemanda);
    const style = {
      color: st.text,
      weight: 4,
      opacity: 1,
      lineCap: "round",
      lineJoin: "round",
    };

    if (hasTipoTexture(tipo)) {
      registerPattern(tipo, codigo, st);
      style.fillColor = `url(#${patternId(tipo, codigo)})`;
      style.fillOpacity = 0.32;
    } else {
      style.fillColor = st.row;
      style.fillOpacity = 0.24;
    }

    return style;
  }

  function pinColors(codigo, kind) {
    const pal = pinPalette(codigo, kind);
    return { fill: pal.fill, halo: pal.dark };
  }

  const PIN_STROKE = "#111111";
  const PIN_INNER = "#ffffff";
  const PIN_CONTAINER = 56;
  const PIN_H = 42;

  const PIN_FASE_LAYOUT = {
    analise: {
      headY: PIN_CONTAINER - PIN_H + (10 / 36) * PIN_H,
      headSize: (18 / 36) * PIN_H,
      pinClass: "painel-pin--fase-analise",
    },
    hierarquizacao: {
      headY: PIN_CONTAINER - PIN_H + (9 / 36) * PIN_H,
      headSize: (10 / 36) * PIN_H,
      pinClass: "painel-pin--fase-hierarquizacao",
    },
    execucao: {
      headY: PIN_CONTAINER - PIN_H + (7 / 36) * PIN_H,
      headSize: (16 / 36) * PIN_H,
      pinClass: "painel-pin--fase-execucao",
    },
  };

  function getStatusFase(codigo) {
    const code = String(codigo || "");
    for (const fase of LEGEND_FASES) {
      if (fase.codes.includes(code)) return fase.id;
    }
    return "analise";
  }

  function pinPalette(codigo, kind) {
    const st = resolveStatus(codigo, kind);
    return {
      fill: st.row,
      dark: st.text,
      mid: st.row,
      light: st.bg,
    };
  }

  function pinSvgByFase(faseId, fill) {
    const s = PIN_STROKE;
    const inner = PIN_INNER;
    if (faseId === "hierarquizacao") {
      return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" aria-hidden="true" focusable="false">' +
        `<path fill="${fill}" stroke="${s}" stroke-width="1.25" d="M6 2h12a2 2 0 0 1 2 2v10c0 5.5-2.5 9.8-8 18-5.5-8.2-8-12.5-8-18V4a2 2 0 0 1 2-2z"/>` +
        `<rect x="8" y="5" width="8" height="8" rx="1.5" fill="${inner}" stroke="${s}" stroke-width="1"/>` +
        "</svg>"
      );
    }
    if (faseId === "execucao") {
      return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" aria-hidden="true" focusable="false">' +
        `<line x1="12" y1="15" x2="12" y2="35" stroke="${s}" stroke-width="2.2" stroke-linecap="round"/>` +
        `<polygon points="12,2 19,11 12,15 5,11" fill="${fill}" stroke="${s}" stroke-width="1.2" stroke-linejoin="round"/>` +
        `<polygon points="12,5.5 16.2,10.5 12,13.5 7.8,10.5" fill="${inner}" stroke="${s}" stroke-width="0.85" stroke-linejoin="round"/>` +
        "</svg>"
      );
    }
    return (
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" aria-hidden="true" focusable="false">' +
      `<path fill="${fill}" stroke="${s}" stroke-width="1.25" d="M12 1C7.03 1 3 5.03 3 10c0 7.08 9 17.5 9 17.5S21 17.08 21 10c0-4.97-4.03-9-9-9z"/>` +
      `<circle cx="12" cy="10" r="3.5" fill="${inner}" stroke="${s}" stroke-width="1"/>` +
      "</svg>"
    );
  }

  function pinInnerHtml(codigo, kind) {
    const fase = getStatusFase(codigo);
    const pal = pinPalette(codigo, kind);
    const layout = PIN_FASE_LAYOUT[fase] || PIN_FASE_LAYOUT.analise;
    return (
      `<div class="painel-pin ${layout.pinClass}"` +
      ` style="--pin-halo-dark:${pal.dark};--pin-halo-mid:${pal.mid};--pin-halo-light:${pal.light};` +
      `--pin-fill:${pal.fill};--head-y:${layout.headY}px;--head-size:${layout.headSize}px">` +
      `<span class="painel-pin-halo"></span><span class="painel-pin-halo painel-pin-halo--delay"></span>` +
      pinSvgByFase(fase, pal.fill) +
      `</div>`
    );
  }

  function pinWrapClass(codigo) {
    return `painel-pin-wrap painel-pin-wrap--fase-${getStatusFase(codigo)}${actionClass(codigo)}`;
  }

  function leafletPinIcon(codigo, kind, L, iconOpts) {
    if (!L) return null;
    const extra = iconOpts || {};
    return L.divIcon({
      className: pinWrapClass(codigo),
      html: pinInnerHtml(codigo, kind || "demanda"),
      iconSize: [PIN_CONTAINER, PIN_CONTAINER],
      iconAnchor: [PIN_CONTAINER / 2, PIN_CONTAINER - 4],
      ...extra,
    });
  }

  function pinSwatchHtml(codigo, kind) {
    const fase = getStatusFase(codigo);
    const st = resolveStatus(codigo, kind || "demanda");
    const fill = legendStrongFill(st);
    return (
      `<span class="status-legend-pin status-legend-pin--fase-${fase}" aria-hidden="true">` +
      pinSvgByFase(fase, fill) +
      `</span>`
    );
  }

  function decorateLeafletLayer(layer, codigo) {
    if (!layer || !requiresGestorAction(codigo)) return;
    const apply = () => {
      const el = layer.getElement?.();
      if (el) el.classList.add("slt-geom-acao-gestor");
    };
    if (layer.getElement?.()) apply();
    else layer.on?.("add", apply);
  }

  function swatchStyle(codigo, tipoDemanda) {
    const st = getStatusDemanda(codigo);
    const tipo = normalizeTipoDemanda(tipoDemanda);
    if (hasTipoTexture(tipo)) {
      registerPattern(tipo, codigo, st);
      return `background:url(#${patternId(tipo, codigo)});border-color:${st.text}`;
    }
    return `background:${st.row};border-color:${st.text}`;
  }

  function legendStrongFill(st) {
    return `color-mix(in srgb, ${st.text} 42%, ${st.row})`;
  }

  function texturedSwatchHtml(codigo, tipoDemanda, extraClass) {
    const st = getStatusDemanda(codigo);
    const tipo = normalizeTipoDemanda(tipoDemanda);
    const cls = ["status-color-legend-swatch-svg", extraClass].filter(Boolean).join(" ");
    if (hasTipoTexture(tipo)) {
      registerLegendPattern(tipo, codigo, st);
      const pid = patternId(tipo, codigo);
      return (
        `<svg class="${cls}" viewBox="0 0 32 32" aria-hidden="true" focusable="false">` +
        `<rect x="0" y="0" width="32" height="32" rx="4" fill="url(#${pid})"/>` +
        `</svg>`
      );
    }
    return `<span class="status-color-legend-swatch status-color-legend-swatch--strong ${extraClass || ""}" style="background:${legendStrongFill(st)};border-color:${st.text}" aria-hidden="true"></span>`;
  }

  function legendStatusChipHtml(codigo) {
    const st = getStatusDemanda(codigo);
    return `<span class="status-color-legend-chip status-color-legend-chip--strong" style="background:${legendStrongFill(st)};border-color:${st.text}" aria-hidden="true"></span>`;
  }

  function legendStatusItemHtml(codigo, labelFn) {
    return `<li class="status-color-legend-item" data-status="${escapeHtml(codigo)}">
      ${legendStatusChipHtml(codigo)}
      <span class="status-color-legend-label">${escapeHtml(labelFn(codigo))}</span>
    </li>`;
  }

  const SYM_SAMPLE = { row: "#b0bec5", text: "#37474f", bg: "#cfd8dc" };

  function textureSampleHtml(tipo) {
    registerLegendPattern(tipo, "_sym", SYM_SAMPLE);
    const pid = patternId(tipo, "_sym");
    return (
      `<svg class="status-color-legend-swatch-svg status-color-legend-swatch--lg" viewBox="0 0 32 32" aria-hidden="true" focusable="false">` +
      `<rect x="1.5" y="1.5" width="29" height="29" rx="4" fill="url(#${pid})" stroke="${SYM_SAMPLE.text}" stroke-width="3"/>` +
      `</svg>`
    );
  }

  function renderSymbologyBlock() {
    registerLegendPattern("plano", "_sym", SYM_SAMPLE);
    registerLegendPattern("programa", "_sym", SYM_SAMPLE);
    const pinFase1 = pinSwatchHtml("em_analise");
    const pinFase2 = pinSwatchHtml("elegivel_ahp");
    const pinFase3 = pinSwatchHtml("em_execucao");
    return `<div class="status-legend-symbology" data-legend="symbology">
      <p class="status-color-legend-layer-title">Simbologia no mapa</p>
      <p class="status-legend-symbology-hint">Cor = status (acima). Forma e textura = tipo de demanda.</p>
      <ul class="status-legend-symbology-list" role="list">
        <li class="status-legend-symbology-item">
          ${textureSampleHtml("plano")}
          <span class="status-legend-symbology-text"><strong>Plano</strong> — polígono com listras diagonais</span>
        </li>
        <li class="status-legend-symbology-item">
          ${textureSampleHtml("programa")}
          <span class="status-legend-symbology-text"><strong>Programa</strong> — polígono com malha cruzada</span>
        </li>
        <li class="status-legend-symbology-item status-legend-symbology-item--projeto">
          <span class="status-legend-pin-row" aria-hidden="true">${pinFase1}${pinFase2}${pinFase3}</span>
          <span class="status-legend-symbology-text"><strong>Projeto</strong> — alfinete (formato varia por fase do status)</span>
        </li>
      </ul>
    </div>`;
  }

  function legendItemSimpleHtml(codigo, labelFn, tipoDemanda, swatchClass) {
    const tipo = normalizeTipoDemanda(tipoDemanda);
    const symbolHtml =
      tipo === "projeto"
        ? pinSwatchHtml(codigo)
        : texturedSwatchHtml(codigo, tipoDemanda, swatchClass);
    return `<li class="status-color-legend-item" data-status="${escapeHtml(codigo)}">
      ${symbolHtml}
      <span class="status-color-legend-label">${escapeHtml(labelFn(codigo))}</span>
    </li>`;
  }

  function renderFaseBlock(fase, labelFn, options) {
    const layout = options.layout || "default";
    const tipoDemanda = options.tipoDemanda || "projeto";
    const swatchClass =
      layout === "demandas" ? "status-color-legend-swatch status-color-legend-swatch--lg" : "status-color-legend-swatch";

    const itemsHtml =
      layout === "painel"
        ? fase.codes
            .filter((c) => STATUS_DEMANDA[c])
            .map((c) => legendStatusItemHtml(c, labelFn))
            .join("")
        : fase.codes
            .filter((c) => STATUS_DEMANDA[c])
            .map((c) => legendItemSimpleHtml(c, labelFn, tipoDemanda, swatchClass))
            .join("");

    return `<div class="status-color-legend-fase" data-fase="${escapeHtml(fase.id)}">
      <p class="status-color-legend-layer-title">${escapeHtml(fase.title)}</p>
      <ul class="status-color-legend" role="list">${itemsHtml}</ul>
    </div>`;
  }

  function injectTheme() {
    let style = document.getElementById("slt-status-theme");
    if (!style) {
      style = document.createElement("style");
      style.id = "slt-status-theme";
      document.head.appendChild(style);
    }

    clearPatterns();

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
        `.admin-table tbody tr[data-status="${codigo}"] td{background-color:var(--status-${codigo}-row);}`
      );
      rules.push(
        `.admin-table tbody tr[data-status="${codigo}"]:hover td{background-color:color-mix(in srgb,var(--status-${codigo}-row) 82%,#fff);}`
      );
      rules.push(
        `.admin-table tbody tr[data-status="${codigo}"] td:first-child{box-shadow:inset 3px 0 0 var(--status-${codigo}-text);}`
      );
    });

    [...STATUS_ACAO_GESTOR].forEach((codigo) => {
      rules.push(
        `.admin-table tbody tr.status-acao-gestor[data-status="${codigo}"] td{--slt-pulse-accent:var(--status-${codigo}-text);--slt-pulse-row:var(--status-${codigo}-row);}`
      );
    });

    const pulseCss = `
@keyframes slt-status-pulse {
  0%, 100% { opacity: 1; filter: brightness(1) saturate(1); }
  50% { opacity: 0.45; filter: brightness(1.18) saturate(1.25); }
}
@keyframes slt-status-badge-glow {
  0%, 100% { box-shadow: 0 0 0 0 rgba(192, 86, 33, 0.55); transform: scale(1); }
  50% { box-shadow: 0 0 0 5px rgba(192, 86, 33, 0.2); transform: scale(1.03); }
}
@keyframes slt-status-row-glow {
  0%, 100% {
    box-shadow: inset 4px 0 0 var(--slt-pulse-accent, #c05621);
    background-color: color-mix(in srgb, var(--slt-pulse-row, #fdebd0) 100%, transparent);
  }
  50% {
    box-shadow: inset 7px 0 0 var(--slt-pulse-accent, #c05621), inset 0 0 28px rgba(192, 86, 33, 0.28);
    background-color: color-mix(in srgb, var(--slt-pulse-row, #fdebd0) 72%, #fff);
  }
}
.status-acao-gestor.badge-status {
  animation: slt-status-pulse 0.8s ease-in-out infinite, slt-status-badge-glow 0.8s ease-in-out infinite;
}
.admin-table tbody tr.status-acao-gestor td {
  animation: slt-status-pulse 0.8s ease-in-out infinite;
}
.admin-table tbody tr.status-acao-gestor td:first-child {
  animation: slt-status-row-glow 0.8s ease-in-out infinite;
}
.slt-geom-acao-gestor { animation: slt-status-pulse 0.8s ease-in-out infinite; }
.painel-pin-wrap.status-acao-gestor .painel-pin-halo {
  animation: painel-halo-gradient-pulse 0.9s ease-out infinite, slt-status-pulse 0.8s ease-in-out infinite;
}`;

    style.textContent = `:root{\n${rootVars.join("\n")}\n}\n${rules.join("\n")}\n${pulseCss}`;
  }

  function setMapLegendCollapsed(hostOrId, collapsed, options) {
    const host =
      typeof hostOrId === "string" ? document.querySelector(hostOrId) : hostOrId;
    if (!host) return;
    const btn = host.querySelector(".status-legend-map-toggle");
    const panel = host.querySelector(".status-legend-map-panel");
    if (!btn || !panel) return;
    host.classList.toggle("is-collapsed", collapsed);
    btn.setAttribute("aria-expanded", String(!collapsed));
    panel.hidden = collapsed;
    if (!options?.silent) {
      host.dispatchEvent(new CustomEvent("slt-legend-layout", { bubbles: true }));
    }
  }

  function bindMapLegendToggle(host) {
    const btn = host.querySelector(".status-legend-map-toggle");
    const panel = host.querySelector(".status-legend-map-panel");
    if (!btn || !panel) return;

    setMapLegendCollapsed(host, false, { silent: true });

    btn.addEventListener("click", () => {
      setMapLegendCollapsed(host, !host.classList.contains("is-collapsed"));
    });
  }

  function readMapViewportPadding(mapRect, legendRect, sidebarLeft) {
    const fallback = { top: 8, right: 8, bottom: 8, left: sidebarLeft ?? 8 };
    if (!mapRect?.width || !mapRect?.height) return fallback;

    let left = sidebarLeft ?? 8;
    let top = 8;
    let right = 8;

    if (legendRect?.width && legendRect?.height) {
      const overlapLeft = Math.max(mapRect.left, legendRect.left);
      const overlapTop = Math.max(mapRect.top, legendRect.top);
      const overlapRight = Math.min(mapRect.right, legendRect.right);
      const overlapBottom = Math.min(mapRect.bottom, legendRect.bottom);
      const overlapW = Math.max(0, overlapRight - overlapLeft);
      const overlapH = Math.max(0, overlapBottom - overlapTop);
      if (overlapH > 0) top = Math.ceil(overlapH + 4);
      if (overlapW > 0) right = Math.ceil(overlapW + 4);
    }

    return { top, right, bottom: 8, left };
  }

  function getMapViewportPadding(options) {
    const opts = options || {};
    const el = document.getElementById("status-legend");
    const mapEl = document.getElementById("map-painel");
    const fallback = { top: 8, right: 8, bottom: 8, left: 8 };
    if (!mapEl) return fallback;

    const mapRect = mapEl.getBoundingClientRect();
    if (!mapRect.width || !mapRect.height) return fallback;

    let sidebarLeft = 8;
    const sidebar = document.querySelector(".layout-with-sidebar .layout-sidebar");
    if (sidebar) {
      const sbRect = sidebar.getBoundingClientRect();
      const sidebarOverlap = sbRect.right - mapRect.left;
      if (sidebarOverlap > 0) sidebarLeft = Math.ceil(sidebarOverlap + 4);
    }

    if (!el?.classList.contains("status-color-legend-host--map")) {
      return { top: 8, right: 8, bottom: 8, left: sidebarLeft };
    }

    if (opts.legendExpanded) {
      const panel = el.querySelector(".status-legend-map-panel");
      const toggle = el.querySelector(".status-legend-map-toggle");
      const wasCollapsed = el.classList.contains("is-collapsed");
      const panelWasHidden = panel?.hidden ?? true;
      el.classList.remove("is-collapsed");
      if (panel) panel.hidden = false;
      if (toggle) toggle.setAttribute("aria-expanded", "true");
      const legendRect = el.getBoundingClientRect();
      const pad = readMapViewportPadding(mapRect, legendRect, sidebarLeft);
      if (wasCollapsed) {
        el.classList.add("is-collapsed");
        if (panel) panel.hidden = panelWasHidden;
        if (toggle) toggle.setAttribute("aria-expanded", "false");
      }
      return pad;
    }

    return readMapViewportPadding(mapRect, el.getBoundingClientRect(), sidebarLeft);
  }

  function getMapLegendPadding(options) {
    return getMapViewportPadding(options);
  }

  function mapFitBoundsOptions(extra) {
    const src = extra || {};
    const pad = getMapLegendPadding(src.legendExpanded ? { legendExpanded: true } : undefined);
    const { legendExpanded, ...leafletExtra } = src;
    return {
      paddingTopLeft: [pad.left, pad.top],
      paddingBottomRight: [pad.right, pad.bottom],
      ...leafletExtra,
    };
  }

  function renderLegend(container, options) {
    const el = typeof container === "string" ? document.querySelector(container) : container;
    if (!el) return;

    const opts = options || {};
    const labelFn = opts.labelFn || ((codigo) => getStatusDemanda(codigo).nome);
    const fases = opts.fases || opts.layers || LEGEND_FASES;
    const title = opts.title !== false ? opts.title || "Legenda de status" : null;
    const layout = opts.layout || "default";
    const isMapHost = layout === "painel" && el.classList.contains("status-color-legend-host--map");

    el.classList.remove(
      "status-color-legend-host--demandas",
      "status-color-legend-host--painel",
      "is-collapsed"
    );
    if (layout === "demandas") el.classList.add("status-color-legend-host--demandas");
    if (layout === "painel") el.classList.add("status-color-legend-host--painel");

    const renderOpts = {
      layout,
      tipoDemanda: opts.tipoDemanda || "projeto",
    };

    const body = fases.map((fase) => renderFaseBlock(fase, labelFn, renderOpts)).join("");
    const painelIntro =
      layout === "painel"
        ? `<p class="status-legend-intro">Cor indica a situação da demanda em cada fase.</p>`
        : "";
    const symbology = layout === "painel" ? renderSymbologyBlock() : "";
    const innerContent = `${painelIntro}<div class="status-color-legend-stack">${body}${symbology}</div>`;

    if (isMapHost) {
      el.innerHTML = `<button type="button" class="status-legend-map-toggle" aria-expanded="false" aria-controls="status-legend-panel">
        <span class="status-legend-map-toggle-start">
          <span class="status-legend-map-icon" aria-hidden="true">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" focusable="false">
              <path d="M12 2 3 7.5 12 12l9-4.5L12 2zm-8 7.8 8 4.4 8-4.4v2.4l-8 4.4-8-4.4v-2.4zm0 4.8 8 4.4 8-4.4V19l-8 4.5-8-4.5v-4.4z"/>
            </svg>
          </span>
          <span class="status-color-legend-title">${escapeHtml(title || "Legenda de status")}</span>
        </span>
        <span class="status-legend-map-chevron" aria-hidden="true">▸</span>
      </button>
      <div id="status-legend-panel" class="status-legend-map-panel" hidden>${innerContent}</div>`;
      bindMapLegendToggle(el);
      return;
    }

    el.innerHTML = `${
      title ? `<p class="status-color-legend-title">${escapeHtml(title)}</p>` : ""
    }${innerContent}`;
  }

  injectTheme();

  global.SLTStatusColors = {
    STATUS_DEMANDA,
    STATUS_OBJETO,
    STATUS_ACAO_GESTOR,
    TIPO_DEMANDA,
    LEGEND_FASES,
    LEGEND_LAYERS,
    LEGEND_ORDER,
    getStatusDemanda,
    getStatusObjeto,
    getStatusFase,
    normalizeTipoDemanda,
    hasTipoTexture,
    patternFillUrl,
    registerPattern,
    badgeClass,
    requiresGestorAction,
    actionClass,
    leafletPathStyle,
    pinColors,
    pinSwatchHtml,
    leafletPinIcon,
    pinSvgByFase,
    decorateLeafletLayer,
    injectTheme,
    renderLegend,
    setMapLegendCollapsed,
    getMapLegendPadding,
    getMapViewportPadding,
    mapFitBoundsOptions,
  };
})(window);
