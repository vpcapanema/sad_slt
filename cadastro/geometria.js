(function (global) {
  let map, drawControl, previewLayer;
  let parentLayer = null;
  let parentFc = null;
  let parentBounds = null;
  let parentLabel = "";
  let metodoGeometria = "";
  let tipoDesenho = "Point";
  let geometria = null;
  let arquivoOriginal = null;
  let ferramentasAtivas = false;

  const PARENT_STYLE = {
    color: "#b45309",
    weight: 2,
    dashArray: "6 4",
    fillColor: "#f59e0b",
    fillOpacity: 0.14,
  };

  const USER_POLY_STYLE = { color: "#116593", weight: 3, fillOpacity: 0.32, fillColor: "#116593" };
  const USER_LINE_STYLE = { color: "#116593", weight: 3 };
  let spatialOutside = false;
  let lastContainment = null;
  let regionalidades = null;
  let onAnalysisChange = null;

  const TIPO_REGIAO_LABEL = {
    municipio: "Município",
    regiao_governo: "Região de Governo",
    regiao_administrativa: "Região Administrativa",
    regiao_metropolitana: "Região Metropolitana",
    zona_zee: "Zona de Gestão ZEE-SP",
  };

  function setOnAnalysisChange(fn) {
    onAnalysisChange = typeof fn === "function" ? fn : null;
  }

  function getRegionalidades() {
    return regionalidades;
  }

  function getContainment() {
    return lastContainment;
  }

  function notifyAnalysisChange() {
    onAnalysisChange?.();
  }

  function resetSpatialAck() {
    spatialOutside = false;
    lastContainment = null;
    const ack = document.getElementById("map-spatial-ack");
    if (ack) ack.checked = false;
    const row = document.getElementById("map-spatial-ack-row");
    const warn = document.getElementById("map-spatial-warn");
    if (row) row.classList.add("hidden");
    if (warn) warn.textContent = "";
  }

  async function updateSpatialWarning(geom) {
    const row = document.getElementById("map-spatial-ack-row");
    const warn = document.getElementById("map-spatial-warn");
    if (!geom || !global.SLTSpatialConstraint?.hasParent()) {
      resetSpatialAck();
      return;
    }
    const meta = SLTSpatialConstraint.getMeta() || {};
    try {
      const result = await SLTDemandasApi.analyzeContainment({
        geometry: { type: geom.tipo, coordinates: geom.coordinates },
        parent_unidade_ids: SLTSpatialConstraint.getParentIds(),
        child_kind: meta.childKind || "projeto",
        ref_kind: meta.refKind || "plano",
      });
      if (geometria !== geom) return;
      lastContainment = result;
      spatialOutside = result.status !== "inside";
      if (result.status === "inside") {
        if (row) row.classList.add("hidden");
        if (warn) warn.textContent = "";
        const ack = document.getElementById("map-spatial-ack");
        if (ack) ack.checked = false;
        return;
      }
      if (warn) warn.textContent = result.message || "";
      if (row) row.classList.remove("hidden");
      const ack = document.getElementById("map-spatial-ack");
      if (ack) ack.checked = false;
    } catch (err) {
      if (geometria !== geom) return;
      lastContainment = null;
      spatialOutside = false;
      if (row) row.classList.add("hidden");
      if (warn) warn.textContent = "";
    }
  }

  async function refreshRegionalidades(geom) {
    if (!geom) {
      regionalidades = null;
      return;
    }
    try {
      const result = await SLTDemandasApi.locateGeometry({
        type: geom.tipo,
        coordinates: geom.coordinates,
      });
      if (geometria !== geom) return;
      regionalidades = result.regionalidades || null;
    } catch (err) {
      if (geometria !== geom) return;
      regionalidades = null;
    }
  }

  /** Descarta análises da geometria anterior (limpeza, troca de modo, falha de upload). */
  function resetAnalise() {
    resetSpatialAck();
    regionalidades = null;
    notifyAnalysisChange();
  }

  /** Reavalia a geometria atual contra a referência do vínculo (que pode ter mudado). */
  function refreshSpatialAnalysis() {
    const geom = geometria;
    if (!geom) {
      resetSpatialAck();
      notifyAnalysisChange();
      return;
    }
    updateSpatialWarning(geom).then(() => {
      if (geometria === geom) notifyAnalysisChange();
    });
  }

  function isOutsideParent() {
    return Boolean(lastContainment && lastContainment.status !== "inside");
  }

  function isSpatialAcknowledged() {
    if (!isOutsideParent()) return true;
    return Boolean(document.getElementById("map-spatial-ack")?.checked);
  }

  function updateParentHint() {
    const el = document.getElementById("map-parent-hint");
    if (!el) return;
    if (parentFc?.features?.length) {
      el.textContent = parentLabel
        ? `Contorno tracejado: abrangência do ${parentLabel} (referência do vínculo institucional).`
        : "Contorno tracejado: abrangência do vínculo institucional (referência para validação espacial).";
      el.classList.remove("hidden");
    } else {
      el.textContent = "";
      el.classList.add("hidden");
    }
  }

  function collectUserBounds() {
    if (!previewLayer) return [];
    const bounds = previewLayer.getBounds();
    return bounds.isValid() ? [bounds] : [];
  }

  function fitMapView() {
    if (!map) return;
    const boxes = collectUserBounds();
    if (!boxes.length && parentBounds?.isValid()) boxes.push(parentBounds);
    if (!boxes.length) {
      map.setView([-22.5, -48.5], 7);
      return;
    }
    // extend() altera o objeto; copiar evita que parentBounds acumule extensões antigas.
    const combined = L.latLngBounds(boxes[0].getSouthWest(), boxes[0].getNorthEast());
    for (let i = 1; i < boxes.length; i++) combined.extend(boxes[i]);
    map.fitBounds(combined.pad(0.1), { maxZoom: 18 });
  }

  function renderParentReference() {
    if (!map) return;
    if (parentLayer) {
      map.removeLayer(parentLayer);
      parentLayer = null;
      parentBounds = null;
    }
    if (!parentFc?.features?.length) {
      updateParentHint();
      fitMapView();
      return;
    }
    parentLayer = L.geoJSON(parentFc, {
      interactive: false,
      pane: "parentReferencePane",
      style: PARENT_STYLE,
    }).addTo(map);
    parentLayer.bringToBack();
    const b = parentLayer.getBounds();
    parentBounds = b.isValid() ? b : null;
    updateParentHint();
    fitMapView();
  }

  function setParentReference(fc, label) {
    parentFc = fc?.features?.length ? fc : null;
    parentLabel = label || "";
    renderParentReference();
  }

  function clearParentReference() {
    setParentReference(null);
  }

  function setStatus(text) {
    const el = document.getElementById("map-status");
    if (el) el.textContent = text;
  }

  function setError(text) {
    const el = document.getElementById("map-error");
    if (!el) return;
    if (text) {
      el.textContent = text;
      el.classList.remove("hidden");
    } else {
      el.textContent = "";
      el.classList.add("hidden");
    }
  }

  function setCoordInputs(lat, lng, { readonly = false } = {}) {
    const latEl = document.getElementById("lat");
    const lngEl = document.getElementById("lng");
    if (latEl) {
      latEl.value = Number(lat).toFixed(6);
      latEl.readOnly = readonly;
    }
    if (lngEl) {
      lngEl.value = Number(lng).toFixed(6);
      lngEl.readOnly = readonly;
    }
  }

  function clearCoordInputs() {
    const latEl = document.getElementById("lat");
    const lngEl = document.getElementById("lng");
    if (latEl) {
      latEl.value = "";
      latEl.readOnly = metodoGeometria !== "desenhar" || tipoDesenho !== "Point";
    }
    if (lngEl) {
      lngEl.value = "";
      lngEl.readOnly = metodoGeometria !== "desenhar" || tipoDesenho !== "Point";
    }
  }

  function clearLayers() {
    if (previewLayer && map?.hasLayer(previewLayer)) map.removeLayer(previewLayer);
    previewLayer = null;
  }

  function disableDrawControl() {
    if (drawControl) {
      drawControl.disable();
      drawControl = null;
    }
  }

  /** Ordem visual: panes (user 450 > parent 350) + referência do vínculo ao fundo. */
  function stackUserGeometryAboveParent() {
    if (parentLayer && typeof parentLayer.bringToBack === "function") {
      parentLayer.bringToBack();
    }
    previewLayer?.bringToFront();
  }

  function ringCentroid(ring) {
    if (!ring || ring.length < 3) return null;
    let area = 0;
    let cx = 0;
    let cy = 0;
    const n = ring.length - 1;
    for (let i = 0; i < n; i++) {
      const [x1, y1] = ring[i];
      const [x2, y2] = ring[i + 1];
      const f = x1 * y2 - x2 * y1;
      area += f;
      cx += (x1 + x2) * f;
      cy += (y1 + y2) * f;
    }
    area *= 0.5;
    if (Math.abs(area) < 1e-12) return null;
    return { lng: cx / (6 * area), lat: cy / (6 * area) };
  }

  function polygonCentroid(coords) {
    const ring = coords?.[0];
    const c = ringCentroid(ring);
    if (c) return c;
    const flat = (ring || []).slice(0, -1);
    if (!flat.length) return null;
    const sum = flat.reduce(
      (acc, [lng, lat]) => ({ lng: acc.lng + lng, lat: acc.lat + lat }),
      { lng: 0, lat: 0 }
    );
    return { lng: sum.lng / flat.length, lat: sum.lat / flat.length };
  }

  function lineMidpoint(coords) {
    const pts = coords || [];
    if (pts.length < 2) return null;
    let total = 0;
    const segs = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const [lng1, lat1] = pts[i];
      const [lng2, lat2] = pts[i + 1];
      const len = Math.hypot(lng2 - lng1, lat2 - lat1);
      segs.push({ a: pts[i], b: pts[i + 1], len });
      total += len;
    }
    if (total === 0) return { lng: pts[0][0], lat: pts[0][1] };
    let half = total / 2;
    for (const s of segs) {
      if (half <= s.len) {
        const t = half / s.len;
        return {
          lng: s.a[0] + (s.b[0] - s.a[0]) * t,
          lat: s.a[1] + (s.b[1] - s.a[1]) * t,
        };
      }
      half -= s.len;
    }
    const last = pts[pts.length - 1];
    return { lng: last[0], lat: last[1] };
  }

  function referenciaFromGeom(tipo, coordinates) {
    if (tipo === "Point" || tipo === "MultiPoint") {
      const point = tipo === "Point" ? coordinates : coordinates?.[0];
      if (!point) return null;
      const [lng, lat] = point;
      return { lat, lng };
    }
    if (tipo === "Polygon") return polygonCentroid(coordinates);
    if (tipo === "MultiPolygon") return polygonCentroid(coordinates?.[0]);
    if (tipo === "LineString") return lineMidpoint(coordinates);
    if (tipo === "MultiLineString") {
      const longest = (coordinates || []).reduce(
        (best, line) => line.length > (best?.length || 0) ? line : best,
        null
      );
      return lineMidpoint(longest);
    }
    return null;
  }

  function applyGeometria(geom) {
    geometria = geom;
    clearLayers();
    if (!geom || !map) {
      resetSpatialAck();
      regionalidades = null;
      notifyAnalysisChange();
      setStatus(
        parentFc?.features?.length
          ? "Indique a localização no mapa. A área tracejada laranja é a abrangência do vínculo."
          : "Localização ainda não definida."
      );
      fitMapView();
      return;
    }

    const ref = referenciaFromGeom(geom.tipo, geom.coordinates);
    if (ref) setCoordInputs(ref.lat, ref.lng, { readonly: geom.tipo !== "Point" });
    const feature = {
      type: "Feature",
      properties: {},
      geometry: { type: geom.tipo, coordinates: geom.coordinates },
    };
    previewLayer = L.geoJSON(feature, {
      pane: "userGeometryPane",
      style: (item) => item.geometry.type.includes("Line") ? USER_LINE_STYLE : USER_POLY_STYLE,
      pointToLayer: (_item, latlng) => L.marker(latlng, { pane: "userGeometryPane" }),
    }).addTo(map);
    stackUserGeometryAboveParent();
    fitMapView();
    const labels = {
      Point: "Ponto",
      MultiPoint: "Pontos",
      LineString: "Linha",
      MultiLineString: "Linhas",
      Polygon: "Polígono",
      MultiPolygon: "Polígonos",
    };
    setStatus(`Prévia carregada: ${labels[geom.tipo] || "geometria"}.`);
    const confirmButton = document.getElementById("btn-concluir-desenho");
    if (confirmButton) confirmButton.disabled = metodoGeometria !== "desenhar";
    setError("");
    regionalidades = null;
    notifyAnalysisChange();
    updateSpatialWarning(geom)
      .then(() => refreshRegionalidades(geom))
      .then(() => {
        if (geometria === geom) notifyAnalysisChange();
      });
  }

  function buildGeometriaPayload(tipo, coordinates) {
    const ref = referenciaFromGeom(tipo, coordinates);
    return {
      tipo,
      coordinates,
      lat: ref?.lat ?? null,
      lng: ref?.lng ?? null,
    };
  }

  function setPointFromLatLng(lat, lng) {
    if (Number.isNaN(lat) || Number.isNaN(lng)) return;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setError("Latitude/longitude fora do intervalo válido.");
      return;
    }
    setError("");
    applyGeometria(buildGeometriaPayload("Point", [lng, lat]));
  }

  function syncPointFromInputs() {
    if (metodoGeometria !== "desenhar" || tipoDesenho !== "Point") return;
    const lat = parseFloat(document.getElementById("lat")?.value);
    const lng = parseFloat(document.getElementById("lng")?.value);
    if (!Number.isNaN(lat) && !Number.isNaN(lng)) setPointFromLatLng(lat, lng);
  }

  function clearGeometry() {
    geometria = null;
    arquivoOriginal = null;
    disableDrawControl();
    clearLayers();
    clearCoordInputs();
    const upload = document.getElementById("upload-geometria");
    if (upload) upload.value = "";
    const fileName = document.getElementById("geometry-file-name");
    if (fileName) {
      fileName.textContent = "";
      fileName.classList.add("hidden");
    }
    const confirmButton = document.getElementById("btn-concluir-desenho");
    if (confirmButton) confirmButton.disabled = true;
    setError("");
    resetAnalise();
    setStatus(
      parentFc?.features?.length
        ? "Indique a localização. A área tracejada laranja é a abrangência do vínculo."
        : "Localização ainda não definida."
    );
    fitMapView();
  }

  function updateDrawControls() {
    const isPoint = tipoDesenho === "Point";
    const pointControls = document.getElementById("geometry-point-coordinates");
    pointControls?.classList.toggle("hidden", metodoGeometria !== "desenhar" || !isPoint);
    const showTools = metodoGeometria === "upload" || ferramentasAtivas;
    document.getElementById("geometry-map-tools")?.classList.toggle("hidden", !showTools);
    document.getElementById("btn-nova-geometria")?.classList.toggle("hidden", metodoGeometria !== "desenhar");
    document.getElementById("btn-concluir-desenho")?.classList.toggle("hidden", metodoGeometria !== "desenhar");
    document.getElementById("btn-iniciar-desenho")?.setAttribute("aria-expanded", String(ferramentasAtivas));
    clearCoordInputs();
  }

  function setGeometryType(type) {
    if (!["Point", "LineString", "Polygon"].includes(type)) return;
    tipoDesenho = type;
    document.querySelectorAll("[data-geometria-tipo]").forEach((button) => {
      const active = button.dataset.geometriaTipo === type;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    updateDrawControls();
    if (metodoGeometria === "desenhar") {
      clearGeometry();
    }
  }

  function setGeometrySource(method) {
    metodoGeometria = method === "upload" || method === "desenhar" ? method : "";
    ferramentasAtivas = false;
    document.getElementById("geometry-upload-panel")?.classList.toggle("hidden", metodoGeometria !== "upload");
    document.getElementById("geometry-draw-panel")?.classList.toggle("hidden", metodoGeometria !== "desenhar");
    document.getElementById("geometry-map-section")?.classList.toggle("hidden", !metodoGeometria);
    clearGeometry();
    updateDrawControls();
    if (metodoGeometria) {
      requestAnimationFrame(() => {
        map.invalidateSize({ pan: false });
        renderParentReference();
        fitMapView();
      });
    }
  }

  function startGeometryDrawing() {
    if (metodoGeometria !== "desenhar" || !ferramentasAtivas) return;
    clearGeometry();
    if (tipoDesenho === "Point") {
      drawControl = new L.Draw.Marker(map);
    } else if (tipoDesenho === "LineString") {
      drawControl = new L.Draw.Polyline(map, { shapeOptions: USER_LINE_STYLE });
    } else {
      drawControl = new L.Draw.Polygon(map, { shapeOptions: USER_POLY_STYLE });
    }
    drawControl.enable();
    document.getElementById("btn-concluir-desenho").disabled = tipoDesenho === "Point";
  }

  function confirmGeometry() {
    if (metodoGeometria !== "desenhar") return;
    if (drawControl && tipoDesenho !== "Point") {
      const vertices = drawControl._markers?.length || 0;
      if (vertices < (tipoDesenho === "Polygon" ? 3 : 2)) {
        setError(tipoDesenho === "Polygon" ? "Marque ao menos três vértices para o polígono." : "Marque ao menos dois vértices para a linha.");
        return;
      }
      drawControl.completeShape();
    }
    if (!geometria) return;
    disableDrawControl();
    document.getElementById("btn-concluir-desenho").disabled = true;
    setError("");
    setStatus("Geometria confirmada.");
  }

  async function parseUpload(file) {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/geometria/parse", { method: "POST", body: fd });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.detail || "Falha ao processar arquivo.");
    const geom = body.geojson?.geometry || { type: body.tipo, coordinates: body.coordinates };
    arquivoOriginal = file;
    applyGeometria(buildGeometriaPayload(geom.type, geom.coordinates));
    map.stop();
    map.invalidateSize({ pan: false });
    map.fitBounds(previewLayer.getBounds(), { padding: [24, 24], maxZoom: 18, animate: false });
    setError("");
  }

  function init() {
    map = L.map("map").setView([-22.5, -48.5], 7);
    map.createPane("parentReferencePane");
    map.getPane("parentReferencePane").style.zIndex = 350;
    map.createPane("userGeometryPane");
    map.getPane("userGeometryPane").style.zIndex = 450;
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
      maxZoom: 19,
    }).addTo(map);

    const mapElement = document.getElementById("map");
    if (global.ResizeObserver && mapElement) {
      const resizeObserver = new ResizeObserver(() => {
        if (!map || mapElement.offsetWidth === 0 || mapElement.offsetHeight === 0) return;
        requestAnimationFrame(() => map.invalidateSize({ pan: false }));
      });
      resizeObserver.observe(mapElement);
    }
    setTimeout(() => map.invalidateSize({ pan: false }), 0);

    map.on(L.Draw.Event.CREATED, (e) => {
      if (e.layer._map) e.layer._map.removeLayer(e.layer);
      disableDrawControl();
      const drawn = e.layer.toGeoJSON().geometry;
      applyGeometria(buildGeometriaPayload(drawn.type, drawn.coordinates));
    });

    document.getElementById("lat")?.addEventListener("change", syncPointFromInputs);
    document.getElementById("lng")?.addEventListener("change", syncPointFromInputs);
    document.querySelectorAll('input[name="geometry-method"]').forEach((input) => {
      input.addEventListener("change", (event) => setGeometrySource(event.target.value));
    });
    document.querySelectorAll("[data-geometria-tipo]").forEach((button) => {
      button.addEventListener("click", () => setGeometryType(button.dataset.geometriaTipo));
    });
    document.getElementById("btn-iniciar-desenho")?.addEventListener("click", () => {
      ferramentasAtivas = true;
      document.getElementById("geometry-map-tools")?.classList.remove("hidden");
      document.getElementById("btn-iniciar-desenho")?.setAttribute("aria-expanded", "true");
    });
    document.getElementById("btn-nova-geometria")?.addEventListener("click", startGeometryDrawing);
    document.getElementById("btn-concluir-desenho")?.addEventListener("click", confirmGeometry);
    document.getElementById("btn-limpar-mapa")?.addEventListener("click", clearGeometry);

    document.getElementById("upload-geometria")?.addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setError("");
      setStatus("Processando arquivo…");
      try {
        await parseUpload(file);
        const fileName = document.getElementById("geometry-file-name");
        if (fileName) {
          fileName.textContent = `Arquivo: ${file.name}`;
          fileName.classList.remove("hidden");
        }
      } catch (err) {
        clearGeometry();
        setStatus("Localização ainda não definida.");
        setError(err.message);
      }
    });

    setGeometryType("Point");
    setGeometrySource("");
    renderParentReference();
  }

  function invalidateSize() {
    if (!map) return;
    map.invalidateSize();
    setTimeout(() => {
      renderParentReference();
      fitMapView();
    }, 120);
  }

  function getGeometria() {
    return geometria;
  }

  function getArquivoOriginal() {
    return arquivoOriginal;
  }

  function getCoordenadas() {
    const lat = parseFloat(document.getElementById("lat")?.value);
    const lng = parseFloat(document.getElementById("lng")?.value);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
    return { lat, lng };
  }

  function hasLocalizacaoValida() {
    const c = getCoordenadas();
    if (!c) return false;
    return c.lat >= -90 && c.lat <= 90 && c.lng >= -180 && c.lng <= 180;
  }

  global.SLTGeometria = {
    init,
    invalidateSize,
    getGeometria,
    getArquivoOriginal,
    getCoordenadas,
    hasLocalizacaoValida,
    setModo: setGeometrySource,
    setParentReference,
    clearParentReference,
    isOutsideParent,
    isSpatialAcknowledged,
    getRegionalidades,
    getContainment,
    setOnAnalysisChange,
    refreshSpatialAnalysis,
  };
})(window);
