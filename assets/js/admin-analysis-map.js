(function (global) {
  let mapSeq = 0;

  function coordsFromRecord(record) {
    const lat = parseFloat(record?.lat);
    const lng = parseFloat(record?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  }

  function tipoDemandaFromRecord(record, options) {
    return options?.tipoDemanda || record?.tipo || record?.__tipo || "projeto";
  }

  function createStatusPinIcon(status) {
    return global.SLTStatusColors?.leafletPinIcon?.(status, "demanda", global.L);
  }

  function pathStyleForStatus(status, tipoDemanda) {
    return (
      global.SLTStatusColors?.leafletPathStyle?.(status, "demanda", tipoDemanda) || {
        color: "#116593",
        weight: 3,
        fillColor: "#116593",
        fillOpacity: 0.25,
      }
    );
  }

  function geometryLayers(map, geometria, status, tipoDemanda) {
    if (!geometria?.tipo || !geometria.coordinates || !global.L) return [];
    const style = pathStyleForStatus(status, tipoDemanda);
    const layers = [];

    const gj = L.geoJSON(
      { type: geometria.tipo, coordinates: geometria.coordinates },
      { style: () => style }
    );

    gj.eachLayer((layer) => {
      global.SLTStatusColors?.decorateLeafletLayer?.(layer, status);
      layer.addTo(map);
      layers.push(layer);
    });

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
    const hasGeom = Boolean(record?.geometria?.tipo && record.geometria.coordinates);
    if (!coords && !hasGeom) {
      syncInfoMapHeight(container);
      container.innerHTML = '<p class="admin-info-map-empty">Coordenadas não informadas.</p>';
      return null;
    }

    syncInfoMapHeight(container);

    const mapId = `admin-preview-map-${++mapSeq}`;
    container.innerHTML = `<div id="${mapId}" class="admin-info-map-canvas" role="img" aria-label="Mapa da localização"></div>`;

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

    const status = record?.status || "";
    const tipoDemanda = tipoDemandaFromRecord(record, options);
    const overlays = geometryLayers(map, record.geometria, status, tipoDemanda);
    const mapLayers = [...overlays];

    if (coords && tipoDemanda === "projeto") {
      const icon = createStatusPinIcon(status);
      if (icon) {
        const marker = L.marker([coords.lat, coords.lng], { icon }).addTo(map);
        mapLayers.push(marker);
      }
    }

    if (mapLayers.length) {
      const boundsGroup = L.featureGroup(mapLayers);
      map.fitBounds(boundsGroup.getBounds().pad(0.2));
    } else if (coords) {
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
