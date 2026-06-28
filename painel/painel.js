(function () {
  const SIDEBAR_GRUPOS = [
    { id: "plano", label: "Plano", tipo: "plano" },
    { id: "programa", label: "Programa", tipo: "programa" },
    { id: "projeto", label: "Projetos", tipo: "projeto" },
  ];

  let map;
  let mapLayerGroup;
  let items = [];
  let layersByKey = new Map();
  let layerVisibility = SLTPainelMapControls.createLayerVisibility(["plano", "programa", "projeto"]);
  let recordOrder = {};
  let layerFilterApi = null;
  let groupLabelsOn = { plano: false, programa: false, projeto: false };
  let selectedKey = null;
  let popoverEl = null;
  let anchorMode = null;
  let anchorRef = null;
  let mapAnchorLatLng = null;
  let openItem = null;

  function createPinIcon(status) {
    return SLTStatusColors.leafletPinIcon(status, "demanda", L);
  }

  function $(id) {
    return document.getElementById(id);
  }

  function escapeHtml(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function itemKey(tipo, id) {
    return `${tipo}:${id}`;
  }

  function statusStyle(codigo) {
    return SLTStatusColors.getStatusDemanda(codigo);
  }

  function coordsItem(d) {
    if (d.lat != null && d.lng != null) return { lat: d.lat, lng: d.lng };
    if (d.geometria?.tipo === "Point") {
      const [lng, lat] = d.geometria.coordinates;
      return { lat, lng };
    }
    return null;
  }

  function geomStyle(status, tipo) {
    return SLTStatusColors.leafletPathStyle(status, "demanda", tipo);
  }

  function tipoLabel(tipo) {
    if (tipo === "plano") return "Plano";
    if (tipo === "programa") return "Programa";
    return "Projeto";
  }

  function abrangenciaText(d) {
    if (d.abrangencia?.length) return d.abrangencia.join(", ");
    return "—";
  }

  function detailBodyHtml(d) {
    if (d.tipo === "plano") {
      return `
      <dl>
        <dt>Tipo</dt><dd>${escapeHtml(tipoLabel(d.tipo))}</dd>
        <dt>Plano</dt><dd>${escapeHtml(d.nome)}</dd>
        <dt>Descrição</dt><dd class="painel-detail-desc">${escapeHtml(d.descricao || "—")}</dd>
        <dt>Abrangência</dt><dd>${escapeHtml(abrangenciaText(d))}</dd>
      </dl>`;
    }
    if (d.tipo === "programa") {
      return `
      <dl>
        <dt>Tipo</dt><dd>${escapeHtml(tipoLabel(d.tipo))}</dd>
        <dt>Programa</dt><dd>${escapeHtml(d.nome)}</dd>
        <dt>Plano</dt><dd>${escapeHtml(d.plano_nome || d.plano_codigo || "—")}</dd>
        <dt>Descrição</dt><dd class="painel-detail-desc">${escapeHtml(d.descricao || "—")}</dd>
        <dt>Abrangência</dt><dd>${escapeHtml(abrangenciaText(d))}</dd>
      </dl>`;
    }
    const entLabel = d.instituicao_label || d.instituicao_id || "—";
    return `
      <dl>
        <dt>Instituição</dt><dd>${escapeHtml(entLabel)}</dd>
        <dt>CNPJ</dt><dd>${escapeHtml(d.instituicao_cnpj || "—")}</dd>
        <dt>Projeto</dt><dd>${escapeHtml(d.nome)}</dd>
        <dt>Descrição</dt><dd class="painel-detail-desc">${escapeHtml(d.descricao || "—")}</dd>
      </dl>`;
  }

  function findItem(tipo, id) {
    return items.find((x) => x.tipo === tipo && x.id === id);
  }

  function ensurePopover() {
    if (popoverEl) return popoverEl;

    popoverEl = document.createElement("div");
    popoverEl.id = "painel-detail-popover";
    popoverEl.className = "painel-detail-popover hidden";
    popoverEl.setAttribute("role", "dialog");
    popoverEl.setAttribute("aria-modal", "false");
    popoverEl.innerHTML = `
      <div class="painel-detail-header">
        <div class="painel-detail-header-text">
          <p class="painel-detail-kicker"></p>
          <h3 class="painel-detail-title"></h3>
        </div>
        <button type="button" class="painel-detail-close" aria-label="Fechar">×</button>
      </div>
      <div class="painel-detail-body"></div>
      <div class="painel-detail-arrow" aria-hidden="true"></div>`;

    document.body.appendChild(popoverEl);
    popoverEl.querySelector(".painel-detail-close").addEventListener("click", closePopover);

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closePopover();
    });

    return popoverEl;
  }

  function anchorRect() {
    if (anchorMode === "element" && anchorRef?.getBoundingClientRect) {
      return anchorRef.getBoundingClientRect();
    }
    if (anchorMode === "map" && anchorRef && map) {
      const mapRect = $("map-painel").getBoundingClientRect();
      const pt = map.latLngToContainerPoint(anchorRef);
      return {
        top: mapRect.top + pt.y - 21,
        left: mapRect.left + pt.x - 17,
        right: mapRect.left + pt.x + 17,
        bottom: mapRect.top + pt.y,
        width: 34,
        height: 21,
      };
    }
    return null;
  }

  function repositionPopover() {
    if (!popoverEl || popoverEl.classList.contains("hidden")) return;

    const rect = anchorRect();
    if (!rect) return;

    const pad = 8;
    const gap = 10;
    const popW = popoverEl.offsetWidth;
    const popH = popoverEl.offsetHeight;

    let left = rect.right + gap;
    let top = rect.top + rect.height / 2 - popH / 2;
    let arrow = "left";

    if (left + popW > window.innerWidth - pad) {
      left = rect.left - popW - gap;
      arrow = "right";
    }
    if (left < pad) {
      left = Math.min(rect.right + gap, window.innerWidth - popW - pad);
      left = Math.max(pad, left);
      arrow = "left";
    }

    top = Math.max(pad, Math.min(top, window.innerHeight - popH - pad));

    popoverEl.style.left = `${Math.round(left)}px`;
    popoverEl.style.top = `${Math.round(top)}px`;
    popoverEl.dataset.arrow = arrow;
  }

  function showPopover(d) {
    const st = statusStyle(d.status);
    const pop = ensurePopover();
    const header = pop.querySelector(".painel-detail-header");

    header.style.setProperty("--status-bg", st.bg);
    header.style.setProperty("--status-text", st.text);
    header.style.background = st.bg;
    header.style.color = st.text;

    pop.querySelector(".painel-detail-kicker").textContent = `${tipoLabel(d.tipo)} · ${st.nome}`;
    pop.querySelector(".painel-detail-title").textContent = d.nome;
    pop.querySelector(".painel-detail-body").innerHTML = detailBodyHtml(d);

    pop.classList.remove("hidden");
    openItem = d;
    requestAnimationFrame(repositionPopover);
  }

  function closePopover() {
    popoverEl?.classList.add("hidden");
    openItem = null;
    anchorMode = null;
    anchorRef = null;
    mapAnchorLatLng = null;
  }

  function selectedIdFromKey() {
    return selectedKey ? selectedKey.split(":")[1] : null;
  }

  function recordKey(tipo, id) {
    return itemKey(tipo, id);
  }

  function initRecordOrder() {
    recordOrder = SLTPainelMapControls.createRecordOrderState(
      SIDEBAR_GRUPOS,
      (g) => items.filter((d) => d.tipo === g.tipo),
      (d) => recordKey(d.tipo, d.id)
    );
  }

  function applyMapLayerZOrder() {
    SLTPainelMapControls.applyStackZOrder(
      mapLayerGroup,
      layersByKey,
      SLTPainelMapControls.buildStackKeys(SIDEBAR_GRUPOS, recordOrder)
    );
  }

  function onRecordReorder(groupId, recordKeys) {
    SLTPainelMapControls.syncRecordOrderState(recordOrder, groupId, recordKeys);
    applyMapLayerZOrder();
  }

  function matchesLayerFilter(item) {
    const filter = layerFilterApi?.getFilter?.();
    return SLTPainelLayerFilter.matches(item, filter);
  }

  function filteredItems() {
    return items.filter(matchesLayerFilter);
  }

  function isRecordMapVisible(tipo, id) {
    const groupId = SLTPainelMapControls.groupIdFromKind(tipo);
    const item = findItem(tipo, id);
    if (item && !matchesLayerFilter(item)) return false;
    return layerVisibility.isRecordVisible(groupId, recordVisibilityKey(tipo, id));
  }

  function syncAllMapVisibility() {
    items.forEach((d) => syncEntryVisibility(d.tipo, d.id));
    SIDEBAR_GRUPOS.forEach((g) => {
      if (groupLabelsOn[g.id]) refreshGroupLabels(g.id);
    });
    resolveAllLabelCollisions();
  }

  function resolveAllLabelCollisions() {
    SLTPainelLayerLabels.scheduleResolveCollisions(map, mapLayerGroup, layersByKey);
  }

  function refreshGroupLabels(groupId) {
    if (!mapLayerGroup) return;
    filteredItems()
      .filter((d) => d.tipo === groupId)
      .forEach((d) => {
        const entry = layersByKey.get(itemKey(d.tipo, d.id));
        if (!entry?.labelLayers?.length) return;
        const show =
          groupLabelsOn[groupId] &&
          isRecordMapVisible(d.tipo, d.id);
        entry.labelLayers.forEach((layer) => {
          if (show) {
            if (!mapLayerGroup.hasLayer(layer)) mapLayerGroup.addLayer(layer);
          } else if (mapLayerGroup.hasLayer(layer)) {
            mapLayerGroup.removeLayer(layer);
          }
        });
      });
    resolveAllLabelCollisions();
  }

  function onGroupLabelToggle(groupId, active) {
    groupLabelsOn[groupId] = active;
    refreshGroupLabels(groupId);
  }

  function recordVisibilityKey(tipo, id) {
    return itemKey(tipo, id);
  }

  function initLayerFilter() {
    layerFilterApi = SLTPainelLayerFilter.init({
      container: "#painel-layer-filter",
      getAllItems: () => items,
      statusLabel: (code) => SLTStatusColors.getStatusDemanda(code).nome,
      onFilterChange: () => {
        renderSidebar();
        syncAllMapVisibility();
      },
    });
  }

  function visibilityApi() {
    return {
      isGroupVisible(groupId) {
        return layerVisibility.isGroupVisible(groupId);
      },
      isRecordVisible(groupId, recordId) {
        return layerVisibility.isRecordVisible(groupId, recordVisibilityKey(groupId, recordId));
      },
    };
  }

  function syncEntryVisibility(tipo, id) {
    const groupId = SLTPainelMapControls.groupIdFromKind(tipo);
    const entry = layersByKey.get(itemKey(tipo, id));
    const visible = isRecordMapVisible(tipo, id);
    SLTPainelMapControls.applyEntryVisibility(entry, mapLayerGroup, visible);
    if (entry?.labelLayers?.length) {
      const showLabels = groupLabelsOn[groupId] && visible;
      entry.labelLayers.forEach((layer) => {
        if (showLabels) {
          if (!mapLayerGroup.hasLayer(layer)) mapLayerGroup.addLayer(layer);
        } else if (mapLayerGroup.hasLayer(layer)) {
          mapLayerGroup.removeLayer(layer);
        }
      });
    }
  }

  function onGroupVisibilityChange(groupId, visible) {
    layerVisibility.setGroupVisible(groupId, visible);
    items
      .filter((d) => SLTPainelMapControls.groupIdFromKind(d.tipo) === groupId)
      .forEach((d) => syncEntryVisibility(d.tipo, d.id));
    renderSidebar();
  }

  function onRecordVisibilityChange(groupId, recordId, visible) {
    layerVisibility.setRecordVisible(recordVisibilityKey(groupId, recordId), visible);
    syncEntryVisibility(groupId, recordId);
    const row = document.querySelector(
      `.layer-group--record[data-record-id="${CSS.escape(recordId)}"][data-group-id="${CSS.escape(groupId)}"]`
    );
    row?.classList.toggle("is-map-hidden", !visible || !layerVisibility.isGroupVisible(groupId));
  }

  function renderSidebar() {
    SLTGroupedSidebar.renderGroupedDemandasSidebar({
      containerSelector: "#layers-container",
      countSelector: "#demandas-count",
      emptySelector: "#lista-vazia",
      defaultGroupsExpanded: true,
      groups: SIDEBAR_GRUPOS.map((g) => ({
        id: g.id,
        label: g.label,
        records: filteredItems().filter((d) => d.tipo === g.tipo),
      })),
      selectedId: selectedIdFromKey(),
      getRecordId: (r) => r.id,
      getRecordGroupId: (r) => r.tipo,
      getRecordLabel: (r) => r.nome,
      getRecordBadgeHtml: (r) => {
        const st = statusStyle(r.status);
        const acao = SLTStatusColors.actionClass(r.status);
        return `<span class="${SLTStatusColors.badgeClass(r.status)}${acao}">${escapeHtml(st.nome)}</span>`;
      },
      sectionsFor: () => [],
      emptyMessage: "Nenhuma demanda registrada.",
      visibility: visibilityApi(),
      recordOrder,
      getRecordKey: (r) => recordKey(r.tipo, r.id),
      onRecordReorder,
      groupLabelsOn,
      onGroupLabelToggle,
      onGroupVisibilityChange,
      onRecordVisibilityChange,
      onSelect: (id, record) => {
        if (!record) return;
        const anchorEl = document.querySelector(
          `.layer-group--record[data-record-id="${CSS.escape(id)}"]`
        );
        openDetail(record.tipo, id, { anchorEl });
      },
    });
  }

  function highlightSidebar(tipo, id) {
    selectedKey = itemKey(tipo, id);
    document.querySelectorAll(".layer-group--record").forEach((el) => {
      const on = el.dataset.recordId === id;
      el.classList.toggle("is-selected", on);
      el.classList.toggle("collapsed", !on);
      el.querySelector(".layer-group-header-row .layer-group-header--record")?.setAttribute("aria-expanded", String(on));
    });
    document.querySelectorAll(".layer-group--tipo").forEach((grp) => {
      const hit = grp.querySelector(`.layer-group--record[data-record-id="${CSS.escape(id)}"]`);
      if (hit) {
        grp.classList.remove("collapsed");
        grp.querySelector(".layer-group-header")?.setAttribute("aria-expanded", "true");
      }
    });
  }

  function initLayersSectionCollapse() {
    const root = $("painel-layers-root");
    const btn = $("toggle-demandas-section");
    btn.addEventListener("click", () => {
      const collapsed = root.classList.toggle("collapsed");
      const open = !collapsed;
      btn.setAttribute("aria-expanded", String(open));
    });
  }

  function addItemLayers(group, d) {
    const style = geomStyle(d.status, d.tipo);
    const key = itemKey(d.tipo, d.id);
    const entry = { layers: [], bounds: null, latlng: null };

    const onMapClick = (e) => {
      L.DomEvent.stopPropagation(e);
      openDetail(d.tipo, d.id, { mapEvent: e });
    };

    if (d.geometria) {
      const gj = L.geoJSON(
        { type: d.geometria.tipo, coordinates: d.geometria.coordinates },
        { style: () => style }
      );
      gj.eachLayer((layer) => {
        layer.on("click", onMapClick);
        SLTStatusColors.decorateLeafletLayer(layer, d.status);
        entry.layers.push(layer);
        group.addLayer(layer);
      });
      if (gj.getLayers().length) entry.bounds = gj.getBounds();
    }

    const ref = coordsItem(d);
    if (ref && d.tipo === "projeto") {
      const marker = L.marker([ref.lat, ref.lng], { icon: createPinIcon(d.status) });
      marker.on("click", onMapClick);
      entry.layers.push(marker);
      entry.latlng = L.latLng(ref.lat, ref.lng);
      group.addLayer(marker);
      if (!entry.bounds) entry.bounds = L.latLngBounds([ref, ref]);
    }

    if (entry.layers.length) {
      const style = geomStyle(d.status, d.tipo);
      entry.labelLayers = SLTPainelLayerLabels.buildEntryLabels(entry, d, d.tipo, style.color, L);
      layersByKey.set(key, entry);
    }
  }

  function mapFocusBounds() {
    return (
      SLTPainelMapControls.largestVisibleLayerBounds(layersByKey, (key) => {
        const sep = key.indexOf(":");
        if (sep === -1) return false;
        const tipo = key.slice(0, sep);
        const id = key.slice(sep + 1);
        return isRecordMapVisible(tipo, id);
      }) || mapLayerGroup?.getBounds?.()
    );
  }

  function buildMapLayers() {
    layersByKey.clear();
    if (mapLayerGroup) map.removeLayer(mapLayerGroup);
    mapLayerGroup = L.featureGroup();
    const sorted = SLTPainelMapControls.sortByLayerOrder(items, (d) => d.tipo);
    sorted.forEach((d) => addItemLayers(mapLayerGroup, d));
    mapLayerGroup.addTo(map);
    sorted.forEach((d) => syncEntryVisibility(d.tipo, d.id));
    applyMapLayerZOrder();
    if (mapLayerGroup.getLayers().length) {
      const bounds = mapFocusBounds();
      setTimeout(() => {
        SLTPainelMapControls.establishInitialPainelMapView(map, bounds);
      }, 0);
    } else {
      SLTPainelMapControls.markInitialMapViewReady(map);
    }
  }

  function selectItem(tipo, id, scrollSidebar) {
    highlightSidebar(tipo, id);
    if (scrollSidebar) {
      document
        .querySelector(`.layer-group--record[data-record-id="${CSS.escape(id)}"]`)
        ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  function focusMapOnItem(tipo, id) {
    const entry = layersByKey.get(itemKey(tipo, id));
    if (entry?.bounds?.isValid()) {
      SLTPainelMapControls.focusMapOnBounds(map, entry.bounds);
      return;
    }
    const d = findItem(tipo, id);
    const ref = d ? coordsItem(d) : null;
    if (ref) map.setView([ref.lat, ref.lng], 14, { animate: true });
  }

  function openDetail(tipo, id, opts) {
    const d = findItem(tipo, id);
    if (!d) return;

    selectItem(tipo, id, !!opts?.anchorEl);

    if (opts?.anchorEl) {
      anchorMode = "element";
      anchorRef = opts.anchorEl;
      mapAnchorLatLng = null;
    } else if (opts?.mapEvent) {
      anchorMode = "map";
      const entry = layersByKey.get(itemKey(tipo, id));
      mapAnchorLatLng = opts.mapEvent.latlng || entry?.latlng || entry?.bounds?.getCenter() || null;
      anchorRef = mapAnchorLatLng;
    } else {
      anchorMode = null;
      anchorRef = null;
      mapAnchorLatLng = null;
    }

    if (opts?.anchorEl) {
      focusMapOnItem(tipo, id);
    }
    showPopover(d);

    if (anchorMode === "map") {
      map.once("moveend", repositionPopover);
    }
  }

  function initMap() {
    map = SLTPainelMapControls.initPainelMap("map-painel");
    map._sltInitialViewReady = false;

    map.on("move zoom", () => {
      if (openItem && anchorMode === "map" && mapAnchorLatLng) {
        anchorRef = mapAnchorLatLng;
        repositionPopover();
      }
    });
    map.on("zoomend moveend", () => {
      if (Object.values(groupLabelsOn).some(Boolean)) resolveAllLabelCollisions();
    });

    setTimeout(() => map.invalidateSize(), 0);
    window.addEventListener("resize", () => {
      map.invalidateSize();
      repositionPopover();
    });
  }

  function getMapFocusLatLng() {
    return SLTPainelMapControls.largestVisibleFocusLatLng(layersByKey, (key) => {
      const sep = key.indexOf(":");
      if (sep === -1) return false;
      const tipo = key.slice(0, sep);
      const id = key.slice(sep + 1);
      return isRecordMapVisible(tipo, id);
    });
  }

  function bindLegendLayoutRefresh() {
    $("status-legend")?.addEventListener("slt-legend-layout", () => {
      if (!map || map._sltInitialViewReady !== true) return;
      SLTPainelMapControls.adjustMapForLegendLayout(map, { getFocusLatLng: getMapFocusLatLng });
    });
  }

  async function init() {
    try {
      items = await SLTDemandasApi.listPainelDemandas();
    } catch (err) {
      console.error(err);
      items = (SLTStorage.loadDemandas() || []).map((d) => ({ ...d, tipo: "projeto" }));
    }

    initRecordOrder();
    initLayerFilter();
    initLayersSectionCollapse();
    initMap();
    SLTStatusColors.renderLegend("#status-legend", {
      layout: "painel",
      labelFn: (codigo) => SLTStatusColors.getStatusDemanda(codigo).nome,
    });
    bindLegendLayoutRefresh();
    renderSidebar();
    buildMapLayers();
  }

  init().catch(console.error);
})();
