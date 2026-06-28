(function (global) {
  const LAYER_ORDER = { plano: 0, programa: 1, projeto: 2, objeto: 3 };
  const MAP_BOUNDS_GEO_PAD = 0.015;

  function groupIdFromKind(kind) {
    return kind === "objeto" ? "projeto" : kind;
  }

  function sortByLayerOrder(items, getKind) {
    return [...items].sort((a, b) => {
      const ka = groupIdFromKind(getKind(a));
      const kb = groupIdFromKind(getKind(b));
      return (LAYER_ORDER[ka] ?? 99) - (LAYER_ORDER[kb] ?? 99);
    });
  }

  function createLayerVisibility(groupIds) {
    const groups = Object.fromEntries(groupIds.map((id) => [id, true]));
    const records = new Map();

    return {
      isGroupVisible(groupId) {
        return groups[groupId] !== false;
      },
      isRecordVisible(groupId, recordKey) {
        if (!this.isGroupVisible(groupId)) return false;
        return records.get(recordKey) !== false;
      },
      setGroupVisible(groupId, visible) {
        groups[groupId] = visible;
      },
      setRecordVisible(recordKey, visible) {
        records.set(recordKey, visible);
      },
      groupState(groupId) {
        return groups[groupId] !== false;
      },
    };
  }

  function applyEntryVisibility(entry, mapGroup, visible) {
    if (!entry?.layers?.length || !mapGroup) return;
    entry.layers.forEach((layer) => {
      if (visible) {
        if (!mapGroup.hasLayer(layer)) mapGroup.addLayer(layer);
      } else if (mapGroup.hasLayer(layer)) {
        mapGroup.removeLayer(layer);
      }
    });
  }

  function createRecordOrderState(groups, getRecords, getRecordKey) {
    const order = {};
    groups.forEach((g) => {
      order[g.id] = (getRecords(g) || []).map((r) => getRecordKey(r));
    });
    return order;
  }

  function sortRecordsByOrder(records, groupId, orderState, getRecordKey) {
    const order = orderState[groupId] || [];
    return [...records].sort((a, b) => {
      const ka = getRecordKey(a);
      const kb = getRecordKey(b);
      const ia = order.indexOf(ka);
      const ib = order.indexOf(kb);
      if (ia === -1 && ib === -1) return 0;
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
  }

  function syncRecordOrderState(orderState, groupId, recordKeys) {
    orderState[groupId] = [...recordKeys];
  }

  function buildStackKeys(groups, orderState) {
    const keys = [];
    groups.forEach((g) => {
      (orderState[g.id] || []).forEach((key) => keys.push(key));
    });
    return keys;
  }

  function applyStackZOrder(mapLayerGroup, layersByKey, stackKeys) {
    if (!mapLayerGroup || !layersByKey) return;
    [...stackKeys].reverse().forEach((key) => {
      const entry = layersByKey.get(key);
      if (!entry?.layers?.length) return;
      entry.layers.forEach((layer) => {
        if (mapLayerGroup.hasLayer(layer) && typeof layer.bringToFront === "function") {
          layer.bringToFront();
        }
      });
    });
  }

  function zoomStepForLevel(zoom, direction) {
    const z = Number(zoom);
    if (direction === "out") {
      if (z <= 8) return 0.25;
      if (z <= 11) return 0.5;
      return 1;
    }
    if (z < 8) return 0.25;
    if (z < 11) return 0.5;
    return 1;
  }

  function formatZoomLabel(zoom) {
    const z = Number(zoom);
    return Number.isInteger(z) ? String(z) : z.toFixed(2).replace(/\.?0+$/, "");
  }

  function attachZoomScale(map) {
    if (!map || map._sltZoomScaleEl) return map._sltZoomScaleEl;

    const el = L.DomUtil.create("div", "slt-map-zoom-scale");
    el.setAttribute("aria-live", "polite");
    el.setAttribute("aria-label", "Nível de zoom do mapa");
    map.getContainer().appendChild(el);

    const update = () => {
      el.textContent = `Zoom ${formatZoomLabel(map.getZoom())}`;
    };

    map.on("zoom zoomend", update);
    update();
    map._sltZoomScaleEl = el;
    return el;
  }

  const FineZoom = L.Control.Zoom.extend({
    _zoomIn: function (e) {
      L.DomEvent.stopPropagation(e);
      if (!this._map || this._disabled) return;
      const step = zoomStepForLevel(this._map.getZoom(), "in");
      this._map.setZoom(this._map.getZoom() + step);
    },
    _zoomOut: function (e) {
      L.DomEvent.stopPropagation(e);
      if (!this._map || this._disabled) return;
      const step = zoomStepForLevel(this._map.getZoom(), "out");
      this._map.setZoom(this._map.getZoom() - step);
    },
  });

  function initPainelMap(containerId, viewOptions) {
    const view = viewOptions || { center: [-22.5, -48.5], zoom: 7 };
    const map = L.map(containerId, {
      zoomControl: false,
      zoomSnap: 0.25,
      zoomDelta: 0.25,
    }).setView(view.center, view.zoom);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
      maxZoom: 19,
    }).addTo(map);

    new FineZoom({ position: "topleft" }).addTo(map);
    attachZoomScale(map);

    return map;
  }

  function fitMapToDefaultBounds(map, bounds, extraOptions) {
    if (!map || !bounds?.isValid?.()) return;
    const legendOpts =
      global.SLTStatusColors?.mapFitBoundsOptions?.() || {
        paddingTopLeft: [8, 8],
        paddingBottomRight: [8, 8],
      };
    map.fitBounds(bounds.pad(MAP_BOUNDS_GEO_PAD), {
      ...legendOpts,
      ...(extraOptions || {}),
    });
  }

  global.SLTPainelMapControls = {
    LAYER_ORDER,
    MAP_BOUNDS_GEO_PAD,
    groupIdFromKind,
    sortByLayerOrder,
    createLayerVisibility,
    applyEntryVisibility,
    createRecordOrderState,
    sortRecordsByOrder,
    syncRecordOrderState,
    buildStackKeys,
    applyStackZOrder,
    zoomStepForLevel,
    formatZoomLabel,
    attachZoomScale,
    initPainelMap,
    fitMapToDefaultBounds,
  };
})(window);
