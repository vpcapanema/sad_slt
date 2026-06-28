(function (global) {
  const STACK_STEP_PX = 15;
  const LABEL_PAD_PX = 3;
  const PIN_LABEL_OFFSET = { x: 6, y: -48 };

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function words(text) {
    return String(text || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
  }

  function shortPlanoLabel(item) {
    const sources = [item.plano_codigo, item.plano_nome, item.nome].filter(Boolean);
    for (const src of sources) {
      const pli = src.match(/\bPLI[\s-]*SP[\s-]*(\d{4})\b/i);
      if (pli) return `PLI-SP ${pli[1]}`;
      const codeYear = src.match(/\b([A-Z]{2,}(?:-[A-Z]{2,})+)\s*(\d{4})\b/i);
      if (codeYear) return `${codeYear[1].toUpperCase()} ${codeYear[2]}`;
      if (src.length <= 20) return src.trim();
      const dash = src.split(/\s*[—–-]\s*/)[0]?.trim();
      if (dash && dash.length <= 22) return dash;
    }
    const w = words(item.nome || item.plano_nome);
    if (w.length >= 2) return `${w[0]} ${w[1]}`.slice(0, 22);
    return (w[0] || item.id || "").slice(0, 22);
  }

  function shortProgramaLabel(item) {
    const name = (item.programa_nome || item.nome || "").trim();
    if (!name) return item.id || "";
    if (/^outros$/i.test(name)) return "Outros";
    const head = name.split(/\s*[—–-]\s*/)[0]?.trim();
    if (head && head.length <= 18) return head;
    const w = words(name);
    if (w.length <= 2) return name.slice(0, 20);
    return `${w[0]} ${w[1]}`.slice(0, 20);
  }

  function shortProjetoLabel(item) {
    const name = (item.nome || "").trim();
    if (!name) return item.id || "";
    const w = words(name);
    if (w.length <= 2) return name.slice(0, 22);
    if (w.length >= 5) return `${w[0]} ${w[w.length - 1]}`.slice(0, 22);
    return `${w[0]} ${w[1]}`.slice(0, 22);
  }

  function shortLabel(item, tipoOrKind) {
    const tipo = tipoOrKind === "objeto" ? "projeto" : tipoOrKind || item.tipo;
    if (tipo === "plano") return shortPlanoLabel(item);
    if (tipo === "programa") return shortProgramaLabel(item);
    return shortProjetoLabel(item);
  }

  function labelHtml(text, color, stackX, stackY) {
    const sx = stackX || 0;
    const sy = stackY || 0;
    return (
      `<span class="slt-map-label" style="--label-color:${escapeHtml(color)};` +
      `--label-stack-x:${sx}px;--label-stack-y:${sy}px">${escapeHtml(text)}</span>`
    );
  }

  function tagLabelMarker(marker, anchor, kind) {
    marker._sltLabelAnchor = anchor;
    marker._sltLabelKind = kind;
    return marker;
  }

  function applyStackOffset(marker, stackX, stackY) {
    const el = marker.getElement?.()?.querySelector(".slt-map-label");
    if (!el) return;
    el.style.setProperty("--label-stack-x", `${stackX}px`);
    el.style.setProperty("--label-stack-y", `${stackY}px`);
    marker._sltStack = { x: stackX, y: stackY };
  }

  function createPolygonLabel(layer, text, color, L) {
    if (!layer?.getBounds?.()?.isValid?.()) return null;
    const center = layer.getBounds().getCenter();
    const marker = L.marker(center, {
      icon: L.divIcon({
        className: "slt-map-label-wrap slt-map-label-wrap--polygon",
        html: labelHtml(text, color, 0, 0),
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      }),
      interactive: false,
    });
    return tagLabelMarker(marker, center, "polygon");
  }

  function createPinLabel(latlng, text, color, L) {
    const marker = L.marker(latlng, {
      icon: L.divIcon({
        className: "slt-map-label-wrap slt-map-label-wrap--pin",
        html: labelHtml(text, color, 0, 0),
        iconSize: [0, 0],
        iconAnchor: [0, 46],
      }),
      interactive: false,
    });
    return tagLabelMarker(marker, latlng, "pin");
  }

  function buildEntryLabels(entry, item, kind, color, L) {
    const tipo = kind === "objeto" ? "projeto" : kind || item.tipo;
    const text = shortLabel(item, tipo);
    const labels = [];

    (entry?.layers || []).forEach((layer) => {
      if (layer?._icon) return;
      const label = createPolygonLabel(layer, text, color, L);
      if (label) labels.push(label);
    });

    if (entry?.latlng) {
      const pinLabel = createPinLabel(entry.latlng, text, color, L);
      if (pinLabel) labels.push(pinLabel);
    }

    return labels;
  }

  function rectsOverlap(a, b) {
    return !(
      a.x + a.w + LABEL_PAD_PX < b.x ||
      b.x + b.w + LABEL_PAD_PX < a.x ||
      a.y + a.h + LABEL_PAD_PX < b.y ||
      b.y + b.h + LABEL_PAD_PX < a.y
    );
  }

  function labelScreenBox(map, marker) {
    const anchor = marker._sltLabelAnchor || marker.getLatLng?.();
    if (!anchor || !map) return null;
    const el = marker.getElement?.()?.querySelector(".slt-map-label");
    if (!el) return null;

    const base = map.latLngToContainerPoint(anchor);
    const w = el.offsetWidth || el.scrollWidth || 48;
    const h = el.offsetHeight || el.scrollHeight || 14;
    const stack = marker._sltStack || { x: 0, y: 0 };

    let cx = base.x + stack.x;
    let cy = base.y + stack.y;
    if (marker._sltLabelKind === "pin") {
      cx += PIN_LABEL_OFFSET.x;
      cy += PIN_LABEL_OFFSET.y;
    }

    return { x: cx - w / 2, y: cy - h / 2, w, h };
  }

  function resolveCollisions(map, labelMarkers) {
    if (!map || !labelMarkers?.length) return;

    labelMarkers.forEach((marker) => applyStackOffset(marker, 0, 0));

    const sorted = [...labelMarkers].sort((a, b) => {
      const al = a._sltLabelAnchor || a.getLatLng?.();
      const bl = b._sltLabelAnchor || b.getLatLng?.();
      if (!al || !bl) return 0;
      return al.lat - bl.lat || al.lng - bl.lng;
    });

    const placed = [];

    sorted.forEach((marker) => {
      const anchor = marker._sltLabelAnchor || marker.getLatLng?.();
      if (!anchor) return;

      let placedOne = false;
      for (let ring = 0; ring < 12 && !placedOne; ring += 1) {
        const slots = ring === 0 ? [0] : [];
        if (ring > 0) {
          for (let i = 1; i <= ring; i += 1) slots.push(i, -i);
        }

        for (const slot of slots) {
          const stackY = slot * STACK_STEP_PX;
          applyStackOffset(marker, 0, stackY);
          const box = labelScreenBox(map, marker);
          if (!box) continue;
          if (!placed.some((p) => rectsOverlap(box, p))) {
            placed.push(box);
            placedOne = true;
            break;
          }
        }
      }
    });
  }

  function collectVisibleLabels(mapLayerGroup, layersByKey) {
    const markers = [];
    if (!mapLayerGroup || !layersByKey) return markers;
    layersByKey.forEach((entry) => {
      (entry.labelLayers || []).forEach((layer) => {
        if (mapLayerGroup.hasLayer(layer)) markers.push(layer);
      });
    });
    return markers;
  }

  function scheduleResolveCollisions(map, mapLayerGroup, layersByKey) {
    if (!map) return;
    const run = () => {
      const markers = collectVisibleLabels(mapLayerGroup, layersByKey);
      resolveCollisions(map, markers);
    };
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => requestAnimationFrame(run));
    } else {
      setTimeout(run, 0);
    }
  }

  global.SLTPainelLayerLabels = {
    shortLabel,
    shortPlanoLabel,
    shortProgramaLabel,
    shortProjetoLabel,
    buildEntryLabels,
    resolveCollisions,
    collectVisibleLabels,
    scheduleResolveCollisions,
  };
})(window);
