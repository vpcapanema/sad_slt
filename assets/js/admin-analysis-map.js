(function (global) {
  let mapSeq = 0;

  function coordsFromRecord(record) {
    const lat = parseFloat(record?.lat);
    const lng = parseFloat(record?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  }

  function geometryLayers(map, geometria, style) {
    if (!geometria?.tipo || !geometria.coordinates) return [];
    const layers = [];
    const opts = style || { color: "#116593", weight: 3, fillOpacity: 0.15 };

    if (geometria.tipo === "Polygon") {
      const latlngs = geometria.coordinates[0].map(([lng, lat]) => [lat, lng]);
      layers.push(L.polygon(latlngs, opts));
    } else if (geometria.tipo === "LineString") {
      const latlngs = geometria.coordinates.map(([lng, lat]) => [lat, lng]);
      layers.push(L.polyline(latlngs, opts));
    } else if (geometria.tipo === "Point") {
      const [lng, lat] = geometria.coordinates;
      layers.push(L.circleMarker([lat, lng], { radius: 6, ...opts }));
    }

    layers.forEach((layer) => layer.addTo(map));
    return layers;
  }

  function syncInfoMapHeight(container) {
    const sec = container?.closest("#sec-info");
    if (!sec) return;

    const fieldsCol = sec.querySelector(".admin-dashboard-columns > .admin-dashboard-col:first-child");
    const mapBox = container.closest(".admin-info-map");
    const coordsEl = mapBox?.querySelector(".admin-info-coords");
    if (!fieldsCol || !mapBox) return;

    const fieldsH = fieldsCol.getBoundingClientRect().height;
    if (fieldsH <= 0) return;

    const coordsH = coordsEl ? coordsEl.getBoundingClientRect().height : 0;
    const wrapH = Math.max(fieldsH - coordsH, 160);

    mapBox.style.height = `${Math.round(fieldsH)}px`;
    container.style.height = `${Math.round(wrapH)}px`;
  }

  function destroyMap(container) {
    if (!container) return;
    if (container._sltResizeObs) {
      container._sltResizeObs.disconnect();
      container._sltResizeObs = null;
    }
    if (container._sltResizeHandler) {
      global.removeEventListener("resize", container._sltResizeHandler);
      container._sltResizeHandler = null;
    }
    if (container._sltPreviewMap) {
      container._sltPreviewMap.remove();
      container._sltPreviewMap = null;
    }
    container.style.height = "";
    const mapBox = container.closest(".admin-info-map");
    if (mapBox) mapBox.style.height = "";
    container.innerHTML = "";
  }

  function initPreviewMap(containerId, record, options) {
    const container = document.getElementById(containerId);
    if (!container || !global.L) return null;

    destroyMap(container);

    const coords = coordsFromRecord(record);
    if (!coords) {
      syncInfoMapHeight(container);
      container.innerHTML = '<p class="admin-info-map-empty">Coordenadas não informadas.</p>';
      return null;
    }

    syncInfoMapHeight(container);

    const mapId = `admin-preview-map-${++mapSeq}`;
    container.innerHTML = `<div id="${mapId}" class="admin-info-map-canvas" role="img" aria-label="Mapa da localização do projeto"></div>`;

    const mapEl = document.getElementById(mapId);
    const map = L.map(mapEl, {
      zoomControl: true,
      scrollWheelZoom: false,
      attributionControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap",
    }).addTo(map);

    const overlays = geometryLayers(map, record.geometria);
    const marker = L.marker([coords.lat, coords.lng]).addTo(map);

    const boundsGroup = L.featureGroup([marker, ...overlays]);
    if (overlays.length) {
      map.fitBounds(boundsGroup.getBounds().pad(0.2));
    } else {
      map.setView([coords.lat, coords.lng], options?.zoom ?? 14);
    }

    container._sltPreviewMap = map;

    const refresh = () => {
      syncInfoMapHeight(container);
      map.invalidateSize();
    };

    requestAnimationFrame(refresh);
    setTimeout(refresh, 80);
    setTimeout(refresh, 300);

    if (typeof ResizeObserver !== "undefined") {
      const sec = container.closest("#sec-info");
      const fieldsCol = sec?.querySelector(".admin-dashboard-columns > .admin-dashboard-col:first-child");
      container._sltResizeObs = new ResizeObserver(refresh);
      if (fieldsCol) container._sltResizeObs.observe(fieldsCol);
      container._sltResizeObs.observe(container.closest(".admin-info-map") || container);
    }

    global.addEventListener("resize", refresh, { passive: true });
    container._sltResizeHandler = refresh;

    return map;
  }

  global.SLTAdminAnalysisMap = {
    initPreviewMap,
    destroyMap,
    coordsFromRecord,
    syncInfoMapHeight,
  };
})(window);
