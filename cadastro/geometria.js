(function (global) {
  let map, drawnItems, markerLayer, drawControl;
  let modo = "ponto";
  let geometria = null;

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
      latEl.readOnly = modo !== "ponto";
    }
    if (lngEl) {
      lngEl.value = "";
      lngEl.readOnly = modo !== "ponto";
    }
  }

  function clearLayers() {
    if (drawnItems) drawnItems.clearLayers();
    if (markerLayer) markerLayer.clearLayers();
    if (drawControl) {
      drawControl.disable();
      drawControl = null;
    }
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
    if (tipo === "Point") {
      const [lng, lat] = coordinates;
      return { lat, lng };
    }
    if (tipo === "Polygon") return polygonCentroid(coordinates);
    if (tipo === "LineString") return lineMidpoint(coordinates);
    return null;
  }

  function applyGeometria(geom) {
    geometria = geom;
    clearLayers();
    if (!geom || !map) {
      setStatus("Localização ainda não definida.");
      return;
    }

    const ref = referenciaFromGeom(geom.tipo, geom.coordinates);
    if (ref) setCoordInputs(ref.lat, ref.lng, { readonly: geom.tipo !== "Point" });

    if (geom.tipo === "Point") {
      const [lng, lat] = geom.coordinates;
      const m = L.marker([lat, lng]);
      markerLayer.addLayer(m);
      map.setView([lat, lng], Math.max(map.getZoom(), 12));
      setStatus(`Ponto: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    } else if (geom.tipo === "Polygon") {
      const latlngs = geom.coordinates[0].map(([lng, lat]) => [lat, lng]);
      const poly = L.polygon(latlngs, { color: "#116593", weight: 3, fillOpacity: 0.2 });
      drawnItems.addLayer(poly);
      map.fitBounds(poly.getBounds().pad(0.1));
      const n = geom.coordinates[0].length - 1;
      if (ref) {
        const cm = L.circleMarker([ref.lat, ref.lng], {
          radius: 6,
          color: "#c0392b",
          fillColor: "#e74c3c",
          fillOpacity: 0.9,
          weight: 2,
        });
        markerLayer.addLayer(cm);
        setStatus(
          `Perímetro com ${n} vértices. Coordenadas: ${ref.lat.toFixed(5)}, ${ref.lng.toFixed(5)}`
        );
      } else {
        setStatus(`Perímetro importado — ${n} vértices.`);
      }
    } else if (geom.tipo === "LineString") {
      const latlngs = geom.coordinates.map(([lng, lat]) => [lat, lng]);
      const line = L.polyline(latlngs, { color: "#116593", weight: 3 });
      drawnItems.addLayer(line);
      map.fitBounds(line.getBounds().pad(0.1));
      if (ref) {
        const cm = L.circleMarker([ref.lat, ref.lng], {
          radius: 6,
          color: "#c0392b",
          fillColor: "#e74c3c",
          fillOpacity: 0.9,
          weight: 2,
        });
        markerLayer.addLayer(cm);
        setStatus(
          `Linha com ${geom.coordinates.length} vértices. Coordenadas: ${ref.lat.toFixed(5)}, ${ref.lng.toFixed(5)}`
        );
      }
    }
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
    if (modo !== "ponto") return;
    const lat = parseFloat(document.getElementById("lat")?.value);
    const lng = parseFloat(document.getElementById("lng")?.value);
    if (!Number.isNaN(lat) && !Number.isNaN(lng)) setPointFromLatLng(lat, lng);
  }

  function enableMapClick() {
    if (drawControl) {
      drawControl.disable();
      drawControl = null;
    }
    map.off("click", onMapClick);
    map.on("click", onMapClick);
  }

  function onMapClick(e) {
    if (modo !== "ponto") return;
    setPointFromLatLng(e.latlng.lat, e.latlng.lng);
  }

  function enableDrawMarker() {
    map.off("click", onMapClick);
    if (drawControl) drawControl.disable();
    drawControl = new L.Draw.Marker(map, {
      shapeOptions: { color: "#116593" },
    });
    drawControl.enable();
  }

  function setModo(novo) {
    modo = novo;
    geometria = null;
    clearLayers();
    clearCoordInputs();
    setError("");
    setStatus("Nenhuma geometria definida.");

    const blocoPonto = document.getElementById("bloco-ponto");
    const blocoPerimetro = document.getElementById("bloco-perimetro");
    blocoPonto?.classList.toggle("hidden", modo !== "ponto");
    blocoPerimetro?.classList.toggle("hidden", modo !== "perimetro");

    document.getElementById("btn-modo-ponto")?.classList.toggle("active", modo === "ponto");
    document.getElementById("btn-modo-perimetro")?.classList.toggle("active", modo === "perimetro");

    if (modo === "ponto") enableMapClick();
  }

  async function parseUpload(file) {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/geometria/parse", { method: "POST", body: fd });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.detail || "Falha ao processar arquivo.");
    const geom = body.geojson?.geometry || { type: body.tipo, coordinates: body.coordinates };
    applyGeometria(buildGeometriaPayload(geom.type, geom.coordinates));
    setError("");
  }

  function init() {
    map = L.map("map").setView([-22.5, -48.5], 7);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
      maxZoom: 19,
    }).addTo(map);

    drawnItems = new L.FeatureGroup().addTo(map);
    markerLayer = new L.FeatureGroup().addTo(map);

    map.on(L.Draw.Event.CREATED, (e) => {
      if (e.layer instanceof L.Marker) {
        const ll = e.layer.getLatLng();
        setPointFromLatLng(ll.lat, ll.lng);
      }
    });

    document.getElementById("lat")?.addEventListener("change", syncPointFromInputs);
    document.getElementById("lng")?.addEventListener("change", syncPointFromInputs);

    document.getElementById("btn-apontar-mapa")?.addEventListener("click", enableDrawMarker);

    document.getElementById("btn-limpar-mapa")?.addEventListener("click", () => {
      geometria = null;
      clearLayers();
      clearCoordInputs();
      document.getElementById("upload-perimetro").value = "";
      setStatus("Localização ainda não definida.");
      setError("");
      if (modo === "ponto") enableMapClick();
    });

    document.getElementById("upload-perimetro")?.addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setError("");
      setStatus("Processando arquivo…");
      try {
        await parseUpload(file);
      } catch (err) {
        geometria = null;
        clearLayers();
        clearCoordInputs();
        setStatus("Localização ainda não definida.");
        setError(err.message);
      }
    });

    document.getElementById("btn-modo-ponto")?.addEventListener("click", () => setModo("ponto"));
    document.getElementById("btn-modo-perimetro")?.addEventListener("click", () => setModo("perimetro"));

    setModo("ponto");
  }

  function invalidateSize() {
    if (map) map.invalidateSize();
  }

  function getGeometria() {
    return geometria;
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
    getCoordenadas,
    hasLocalizacaoValida,
    setModo,
  };
})(window);
