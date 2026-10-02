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
  let geometryState = "finalizada";

  const PARENT_STYLE = {
    color: "#b45309",
    weight: 2,
    dashArray: "6 4",
    fillColor: "#f59e0b",
    fillOpacity: 0.14,
  };

  const SKETCH_COLORS = { line: "#008000", selected: "#00ffff", error: "#ff0000" };
  const GEOMETRY_WEIGHT = 2;
  const POLYGON_FILL_OPACITY = 0.15;

  function userGeometryStyle() {
    const statusStyle = global.SLTStatusColors.leafletPathStyle("analise_em_avaliacao", "demanda", "projeto");
    const color = geometryState === "selecionada" ? SKETCH_COLORS.selected
      : geometryState === "invalida" ? SKETCH_COLORS.error : statusStyle.color;
    return { ...statusStyle, color, fillColor: color, weight: GEOMETRY_WEIGHT, fillOpacity: POLYGON_FILL_OPACITY };
  }

  function setGeometryState(state) {
    geometryState = state;
    previewLayer?.setStyle(userGeometryStyle());
  }
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
    geometryState = "finalizada";
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
      bubblingMouseEvents: false,
      style: userGeometryStyle,
      pointToLayer: (_item, latlng) => L.circleMarker(latlng, { ...userGeometryStyle(), radius: 6, pane: "userGeometryPane", bubblingMouseEvents: false }),
    }).addTo(map);
    previewLayer.on("click", (event) => {
      L.DomEvent.stopPropagation(event.originalEvent);
      setGeometryState("selecionada");
    });
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

  function appendGeometria(tipo, coordinates) {
    if (!geometria) {
      applyGeometria(buildGeometriaPayload(tipo, coordinates));
      return;
    }
    const existingType = geometria.tipo.replace(/^Multi/, "");
    const addedType = tipo.replace(/^Multi/, "");
    if (existingType !== addedType) {
      setError("Adicione geometrias do mesmo tipo. Para mudar de tipo, limpe a geometria existente.");
      return;
    }
    const existing = geometria.tipo.startsWith("Multi") ? geometria.coordinates : [geometria.coordinates];
    const added = tipo.startsWith("Multi") ? coordinates : [coordinates];
    applyGeometria(buildGeometriaPayload(`Multi${existingType}`, [...existing, ...added]));
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
    if (geometria) {
      const ref = referenciaFromGeom(geometria.tipo, geometria.coordinates);
      if (ref) setCoordInputs(ref.lat, ref.lng, { readonly: geometria.tipo !== "Point" });
    } else {
      clearCoordInputs();
    }
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
      disableDrawControl();
      document.getElementById("btn-concluir-desenho").disabled = !geometria;
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
    if (geometria && geometria.tipo.replace(/^Multi/, "") !== tipoDesenho) {
      setError("Adicione geometrias do mesmo tipo. Para mudar de tipo, limpe a geometria existente.");
      return;
    }
    disableDrawControl();
    setError("");
    if (tipoDesenho === "Point") {
      drawControl = new L.Draw.Marker(map);
    } else {
      const options = {
        icon: L.divIcon({ className: "leaflet-div-icon leaflet-editing-icon geometry-sketch-vertex", iconSize: [8, 8], iconAnchor: [4, 4] }),
        touchIcon: L.divIcon({ className: "leaflet-div-icon leaflet-editing-icon geometry-sketch-vertex", iconSize: [10, 10], iconAnchor: [5, 5] }),
        guidelineDistance: 6,
        allowIntersection: false,
        drawError: { color: SKETCH_COLORS.error, timeout: 2500 },
        shapeOptions: { color: SKETCH_COLORS.line, weight: GEOMETRY_WEIGHT, opacity: 1, fillColor: SKETCH_COLORS.line, fillOpacity: POLYGON_FILL_OPACITY },
      };
      drawControl = tipoDesenho === "LineString" ? new L.Draw.Polyline(map, options) : new L.Draw.Polygon(map, options);
      for (const method of ["_showErrorTooltip", "_hideErrorTooltip"]) {
        const original = drawControl[method];
        drawControl[method] = function (...args) {
          const result = original.apply(this, args);
          this._poly?.setStyle({ fillColor: this._errorShown ? SKETCH_COLORS.error : SKETCH_COLORS.line });
          return result;
        };
      }
    }
    drawControl.enable();
    document.getElementById("btn-concluir-desenho").disabled = tipoDesenho === "Point";
  }

  function confirmGeometry() {
    if (metodoGeometria !== "desenhar") return;
    if (drawControl && tipoDesenho !== "Point") {
      const vertices = drawControl._markers?.length || 0;
      if (vertices < (tipoDesenho === "Polygon" ? 3 : 2)) {
        drawControl._poly?.setStyle({ color: SKETCH_COLORS.error, fillColor: SKETCH_COLORS.error });
        setError(tipoDesenho === "Polygon" ? "Marque ao menos três vértices para o polígono." : "Marque ao menos dois vértices para a linha.");
        return;
      }
      drawControl.completeShape();
    }
    if (!geometria) return;
    disableDrawControl();
    setGeometryState("finalizada");
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

  function configureMapResize(mapElement) {
    const handle = document.getElementById("geometry-map-resize");
    const frame = mapElement?.parentElement;
    if (!handle || !frame) return;
    const initialHeight = parseFloat(getComputedStyle(frame).getPropertyValue("--geometry-map-min-height")) || 480;
    let preferredHeight = initialHeight;
    let drag = null;

    function updateHeight(height = preferredHeight) {
      const maximum = Math.floor(frame.getBoundingClientRect().width);
      if (maximum <= 0) return;
      const minimum = Math.min(initialHeight, maximum);
      const current = Math.round(Math.max(minimum, Math.min(height, maximum)));
      mapElement.style.height = `${current}px`;
      handle.setAttribute("aria-valuemin", String(minimum));
      handle.setAttribute("aria-valuemax", String(maximum));
      handle.setAttribute("aria-valuenow", String(current));
      handle.setAttribute("aria-valuetext", `${current} pixels`);
      requestAnimationFrame(() => map.invalidateSize({ pan: false }));
      return current;
    }

    handle.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 || drag) return;
      event.preventDefault();
      drag = { pointerId: event.pointerId, y: event.clientY, height: mapElement.getBoundingClientRect().height };
      handle.setPointerCapture(event.pointerId);
      handle.classList.add("is-resizing");
    });
    handle.addEventListener("pointermove", (event) => {
      if (drag?.pointerId !== event.pointerId) return;
      preferredHeight = updateHeight(drag.height + event.clientY - drag.y) ?? preferredHeight;
    });
    function stopResize(event) {
      if (drag?.pointerId !== event.pointerId) return;
      drag = null;
      handle.classList.remove("is-resizing");
      if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId);
    }
    handle.addEventListener("pointerup", stopResize);
    handle.addEventListener("pointercancel", stopResize);
    handle.addEventListener("lostpointercapture", stopResize);
    handle.addEventListener("keydown", (event) => {
      const current = mapElement.getBoundingClientRect().height;
      const heights = { ArrowDown: current + 24, ArrowUp: current - 24, Home: initialHeight, End: frame.getBoundingClientRect().width };
      if (!(event.key in heights)) return;
      event.preventDefault();
      preferredHeight = updateHeight(heights[event.key]) ?? preferredHeight;
    });
    if (global.ResizeObserver) new ResizeObserver(() => updateHeight()).observe(frame);
    else global.addEventListener("resize", () => updateHeight());
    updateHeight();
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
    configureMapResize(mapElement);
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
      appendGeometria(drawn.type, drawn.coordinates);
    });
    map.on(L.Draw.Event.DRAWVERTEX, () => {
      drawControl?._poly?.setStyle({ color: SKETCH_COLORS.line, fillColor: SKETCH_COLORS.line });
      setError("");
    });
    map.on("click", () => {
      if (!drawControl && geometryState === "selecionada") setGeometryState("finalizada");
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
