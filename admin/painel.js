(function () {
  const Lb = () => SLTAdminLabels;

  const SIDEBAR_GRUPOS = [
    { id: "plano", label: "Plano", match: (e) => e.kind === "plano" },
    { id: "programa", label: "Programa", match: (e) => e.kind === "programa" },
    { id: "projeto", label: "Projetos", match: (e) => e.kind === "projeto" || e.kind === "objeto" },
  ];

  let map;
  let mapLayerGroup;
  let painelItems = [];
  let objetos = [];
  let entries = [];
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
  let openEntry = null;

  function createDemandaPinIcon(status) {
    return SLTStatusColors.leafletPinIcon(status, "demanda", L);
  }

  function createObjetoPinIcon(status) {
    return SLTStatusColors.leafletPinIcon(status, "objeto", L);
  }

  function $(id) {
    return document.getElementById(id);
  }

  function itemKey(kind, id) {
    return `${kind}:${id}`;
  }

  function statusStyle(kind, codigo) {
    return kind === "objeto"
      ? SLTStatusColors.getStatusObjeto(codigo)
      : SLTStatusColors.getStatusDemanda(codigo);
  }

  function statusTipo(kind) {
    return kind === "objeto" ? "projeto" : kind;
  }

  function statusLabel(kind, item) {
    return Lb().statusDemandaLabel(item.status, statusTipo(kind));
  }

  function statusBadgeFor(kind, item) {
    return Lb().statusBadgeHtml(item.status, statusTipo(kind));
  }

  function buildEntries() {
    const demandasComObjeto = new Set(objetos.map((o) => o.demanda_codigo));
    entries = [];

    painelItems
      .filter((d) => d.tipo === "plano")
      .forEach((d) => {
        entries.push({ kind: "plano", id: d.id, data: d, sortAt: d.criadoEm || "" });
      });

    painelItems
      .filter((d) => d.tipo === "programa")
      .forEach((d) => {
        entries.push({ kind: "programa", id: d.id, data: d, sortAt: d.criadoEm || "" });
      });

    objetos.forEach((o) => {
      entries.push({
        kind: "objeto",
        id: o.codigo,
        data: o,
        sortAt: o.statusAtualizadoEm || o.aprovadoEm || "",
      });
    });

    painelItems
      .filter((d) => d.tipo === "projeto" && !demandasComObjeto.has(d.id))
      .forEach((d) => {
        entries.push({ kind: "projeto", id: d.id, data: d, sortAt: d.criadoEm || "" });
      });

    entries.sort((a, b) => new Date(b.sortAt) - new Date(a.sortAt));
  }

  function findEntry(kind, id) {
    return entries.find((e) => e.kind === kind && e.id === id);
  }

  function coordsItem(item) {
    if (item.lat != null && item.lng != null) return { lat: item.lat, lng: item.lng };
    if (item.geometria?.tipo === "Point") {
      const [lng, lat] = item.geometria.coordinates;
      return { lat, lng };
    }
    return null;
  }

  function geomStyle(kind, status) {
    const tipo = kind === "objeto" ? "projeto" : kind;
    return SLTStatusColors.leafletPathStyle(status, kind === "objeto" ? "objeto" : "demanda", tipo);
  }

  function abrangenciaText(d) {
    if (d.abrangencia?.length) return d.abrangencia.join(", ");
    return "—";
  }

  function planoDetailHtml(d) {
    const { escapeHtml, formatDate } = Lb();
    return `
      <div class="admin-readonly-block">
        <dl>
          <dt>Código</dt><dd><code>${escapeHtml(d.id)}</code></dd>
          <dt>Status</dt><dd>${statusBadgeFor("plano", d)}</dd>
          <dt>Diretoria</dt><dd>${escapeHtml(Lb().diretoriaLabel(d.diretoria_id))}</dd>
          <dt>Plano</dt><dd>${escapeHtml(d.nome)}</dd>
          <dt>Descrição</dt><dd>${escapeHtml(d.descricao || "—")}</dd>
          <dt>Objetivo estratégico</dt><dd>${escapeHtml(d.objetivo_estrategico || "—")}</dd>
          <dt>Instituição interessada</dt><dd>${escapeHtml(d.responsavel || "—")}</dd>
          <dt>Vigência</dt><dd>${escapeHtml([d.vigencia_inicio, d.vigencia_fim].filter(Boolean).join(" — ") || "—")}</dd>
          <dt>Valor global</dt><dd>${d.valor_global != null ? escapeHtml(String(d.valor_global)) : "—"}</dd>
          <dt>Abrangência</dt><dd>${escapeHtml(abrangenciaText(d))}</dd>
          <dt>Cadastrado em</dt><dd>${escapeHtml(formatDate(d.criadoEm))}</dd>
        </dl>
      </div>`;
  }

  function programaDetailHtml(d) {
    const { escapeHtml, formatDate } = Lb();
    return `
      <div class="admin-readonly-block">
        <dl>
          <dt>Código</dt><dd><code>${escapeHtml(d.id)}</code></dd>
          <dt>Status</dt><dd>${statusBadgeFor("programa", d)}</dd>
          <dt>Diretoria</dt><dd>${escapeHtml(Lb().diretoriaLabel(d.diretoria_id))}</dd>
          <dt>Plano</dt><dd>${escapeHtml(d.plano_nome || d.plano_codigo || "—")}</dd>
          <dt>Programa</dt><dd>${escapeHtml(d.nome)}</dd>
          <dt>Descrição</dt><dd>${escapeHtml(d.descricao || "—")}</dd>
          <dt>Objetivo</dt><dd>${escapeHtml(d.objetivo || "—")}</dd>
          <dt>Público-alvo</dt><dd>${escapeHtml(d.publico_alvo || "—")}</dd>
          <dt>Órgão responsável</dt><dd>${escapeHtml(d.orgao_responsavel || "—")}</dd>
          <dt>Justificativa</dt><dd>${escapeHtml(d.justificativa || "—")}</dd>
          <dt>Valor global</dt><dd>${d.valor_global != null ? escapeHtml(String(d.valor_global)) : "—"}</dd>
          <dt>Abrangência</dt><dd>${escapeHtml(abrangenciaText(d))}</dd>
          <dt>Cadastrado em</dt><dd>${escapeHtml(formatDate(d.criadoEm))}</dd>
        </dl>
      </div>`;
  }

  function demandaDetailHtml(d) {
    const { escapeHtml, formatDate, instituicaoLabel, planoLabel, classificacaoLabel,
      complementosLabel, representanteLabel, geometriaResumo } = Lb();
    const rep = d.representante || {};
    const coords = coordsItem(d);
    return `
      <div class="admin-readonly-block">
        <dl>
          <dt>Código da demanda</dt><dd><code>${escapeHtml(d.id)}</code></dd>
          <dt>Status</dt><dd>${statusBadgeFor("projeto", d)}</dd>
          <dt>Instituição interessada</dt><dd>${escapeHtml(instituicaoLabel(d))}</dd>
          <dt>CNPJ</dt><dd>${escapeHtml(d.instituicao_cnpj || "—")}</dd>
          <dt>Representante legal</dt><dd>${escapeHtml(representanteLabel(d))}</dd>
          <dt>E-mail</dt><dd>${escapeHtml(rep.email || "—")}</dd>
          <dt>Telefone</dt><dd>${escapeHtml(rep.telefone || "—")}</dd>
          <dt>Diretoria</dt><dd>${escapeHtml(Lb().diretoriaLabel(d.diretoria_id))}</dd>
          <dt>Plano</dt><dd>${escapeHtml(planoLabel(d.plano_id))}</dd>
          <dt>Classificação</dt><dd>${escapeHtml(classificacaoLabel(d.classificacao, d.plano_id))}</dd>
          <dt>Complementos</dt><dd>${escapeHtml(complementosLabel(d.complementos))}</dd>
          <dt>Projeto</dt><dd>${escapeHtml(d.nome)}</dd>
          <dt>Descrição</dt><dd>${escapeHtml(d.descricao || "—")}</dd>
          <dt>Geometria</dt><dd>${escapeHtml(geometriaResumo(d.geometria))}</dd>
          <dt>Coordenadas</dt><dd>${coords ? `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}` : "—"}</dd>
          <dt>Cadastrado em</dt><dd>${escapeHtml(formatDate(d.criadoEm))}</dd>
        </dl>
      </div>`;
  }

  function objetoDetailHtml(o) {
    const { escapeHtml, formatDate, planoLabel, classificacaoLabel, complementosLabel,
      grupoComparacaoLabel, geometriaResumo } = Lb();
    const coords = coordsItem(o);
    return `
      <div class="admin-readonly-block">
        <dl>
          <dt>Código do objeto</dt><dd><code>${escapeHtml(o.codigo)}</code></dd>
          <dt>Status</dt><dd>${statusBadgeFor("objeto", o)}</dd>
          <dt>Demanda de origem</dt><dd><a href="demanda.html?tipo=projeto&id=${encodeURIComponent(o.demanda_codigo)}">${escapeHtml(o.demanda_codigo)}</a></dd>
          <dt>Instituição</dt><dd>${escapeHtml(o.instituicao_nome || "—")}</dd>
          <dt>CNPJ</dt><dd>${escapeHtml(o.instituicao_cnpj || "—")}</dd>
          <dt>Grupo comparável</dt><dd>${escapeHtml(grupoComparacaoLabel(o.grupo_comparacao, o.plano_id))}</dd>
          <dt>Diretoria</dt><dd>${escapeHtml(Lb().diretoriaLabel(o.diretoria_id))}</dd>
          <dt>Plano</dt><dd>${escapeHtml(planoLabel(o.plano_id))}</dd>
          <dt>Classificação</dt><dd>${escapeHtml(classificacaoLabel(o.classificacao, o.plano_id))}</dd>
          <dt>Complementos</dt><dd>${escapeHtml(complementosLabel(o.complementos))}</dd>
          <dt>Projeto</dt><dd>${escapeHtml(o.nome)}</dd>
          <dt>Descrição</dt><dd>${escapeHtml(o.descricao || "—")}</dd>
          <dt>Motivo da aprovação</dt><dd>${escapeHtml(o.motivo_aprovacao || "—")}</dd>
          <dt>Geometria</dt><dd>${escapeHtml(geometriaResumo(o.geometria))}</dd>
          <dt>Coordenadas</dt><dd>${coords ? `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}` : "—"}</dd>
          <dt>Aprovado em</dt><dd>${escapeHtml(formatDate(o.aprovadoEm))}</dd>
        </dl>
      </div>`;
  }

  function detailHtml(entry) {
    const { kind, data } = entry;
    if (kind === "plano") return planoDetailHtml(data);
    if (kind === "programa") return programaDetailHtml(data);
    if (kind === "objeto") return objetoDetailHtml(data);
    return demandaDetailHtml(data);
  }

  function kickerText(entry) {
    const { kind, data } = entry;
    if (kind === "plano") return `Plano · ${statusLabel(kind, data)}`;
    if (kind === "programa") return `Programa · ${statusLabel(kind, data)}`;
    if (kind === "objeto") return `AHP · ${statusLabel(kind, data)}`;
    return statusLabel(kind, data);
  }

  function ensurePopover() {
    if (popoverEl) return popoverEl;
    popoverEl = document.createElement("div");
    popoverEl.id = "painel-detail-popover";
    popoverEl.className = "painel-detail-popover painel-detail-popover--full hidden";
    popoverEl.setAttribute("role", "dialog");
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

  function showPopover(entry) {
    const st = statusStyle(entry.kind, entry.data.status);
    const pop = ensurePopover();
    const header = pop.querySelector(".painel-detail-header");
    header.style.background = st.bg;
    header.style.color = st.text;
    pop.querySelector(".painel-detail-kicker").textContent = kickerText(entry);
    pop.querySelector(".painel-detail-title").textContent = entry.data.nome;
    pop.querySelector(".painel-detail-body").innerHTML = detailHtml(entry);
    pop.classList.remove("hidden");
    openEntry = entry;
    requestAnimationFrame(repositionPopover);
  }

  function closePopover() {
    popoverEl?.classList.add("hidden");
    openEntry = null;
    anchorMode = null;
    anchorRef = null;
    mapAnchorLatLng = null;
  }

  function selectedIdFromKey() {
    return selectedKey ? selectedKey.split(":")[1] : null;
  }

  function sidebarRecord(entry) {
    return { ...entry.data, __kind: entry.kind, id: entry.id };
  }

  function initRecordOrder() {
    recordOrder = SLTPainelMapControls.createRecordOrderState(
      SIDEBAR_GRUPOS,
      (g) => entries.filter(g.match).map(sidebarRecord),
      (r) => itemKey(r.__kind, r.id)
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

  function entryFilterItem(entry) {
    const d = entry.data;
    const tipo = entry.kind === "objeto" ? "projeto" : entry.kind;
    return { ...d, tipo };
  }

  function matchesEntryFilter(entry) {
    return SLTPainelLayerFilter.matches(entryFilterItem(entry), layerFilterApi?.getFilter?.());
  }

  function filteredEntries() {
    return entries.filter(matchesEntryFilter);
  }

  function isEntryMapVisible(kind, id) {
    const entry = findEntry(kind, id);
    if (entry && !matchesEntryFilter(entry)) return false;
    const groupId = SLTPainelMapControls.groupIdFromKind(kind);
    return layerVisibility.isRecordVisible(groupId, recordVisibilityKey(kind, id));
  }

  function syncAllMapVisibility() {
    entries.forEach((e) => syncEntryVisibility(e.kind, e.id));
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
    filteredEntries()
      .filter((e) => SLTPainelMapControls.groupIdFromKind(e.kind) === groupId)
      .forEach((e) => {
        const entryLayers = layersByKey.get(itemKey(e.kind, e.id));
        if (!entryLayers?.labelLayers?.length) return;
        const show = groupLabelsOn[groupId] && isEntryMapVisible(e.kind, e.id);
        entryLayers.labelLayers.forEach((layer) => {
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

  function initLayerFilter() {
    layerFilterApi = SLTPainelLayerFilter.init({
      container: "#painel-layer-filter",
      getAllItems: () => entries.map(entryFilterItem),
      statusLabel: (code) =>
        SLTStatusColors.STATUS_OBJETO[code]
          ? SLTStatusColors.getStatusObjeto(code).nome
          : SLTStatusColors.getStatusDemanda(code).nome,
      onFilterChange: () => {
        renderEntriesList();
        syncAllMapVisibility();
      },
    });
  }

  function recordVisibilityKey(kind, id) {
    return itemKey(kind, id);
  }

  function visibilityApi() {
    return {
      isGroupVisible(groupId) {
        return layerVisibility.isGroupVisible(groupId);
      },
      isRecordVisible(groupId, recordId) {
        const kind = findEntryKind(recordId);
        return layerVisibility.isRecordVisible(groupId, recordVisibilityKey(kind, recordId));
      },
    };
  }

  function findEntryKind(id) {
    const hit = entries.find((e) => e.id === id);
    return hit?.kind || "projeto";
  }

  function syncEntryVisibility(kind, id) {
    const groupId = SLTPainelMapControls.groupIdFromKind(kind);
    const entryLayers = layersByKey.get(itemKey(kind, id));
    const visible = isEntryMapVisible(kind, id);
    SLTPainelMapControls.applyEntryVisibility(entryLayers, mapLayerGroup, visible);
    if (entryLayers?.labelLayers?.length) {
      const showLabels = groupLabelsOn[groupId] && visible;
      entryLayers.labelLayers.forEach((layer) => {
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
    entries
      .filter((e) => SLTPainelMapControls.groupIdFromKind(e.kind) === groupId)
      .forEach((e) => syncEntryVisibility(e.kind, e.id));
    renderEntriesList();
  }

  function onRecordVisibilityChange(groupId, recordId, visible) {
    const kind = findEntryKind(recordId);
    layerVisibility.setRecordVisible(recordVisibilityKey(kind, recordId), visible);
    syncEntryVisibility(kind, recordId);
    const row = document.querySelector(
      `.layer-group--record[data-record-id="${CSS.escape(recordId)}"][data-group-id="${CSS.escape(groupId)}"]`
    );
    row?.classList.toggle("is-map-hidden", !visible || !layerVisibility.isGroupVisible(groupId));
  }

  function renderEntriesList() {
    SLTGroupedSidebar.renderGroupedDemandasSidebar({
      containerSelector: "#layers-container",
      countSelector: "#projetos-count",
      emptySelector: "#lista-vazia-projetos",
      groups: SIDEBAR_GRUPOS.map((g) => ({
        id: g.id,
        label: g.label,
        records: filteredEntries().filter(g.match).map(sidebarRecord),
      })),
      selectedId: selectedIdFromKey(),
      getRecordId: (r) => r.id,
      getRecordGroupId: (r) => SLTPainelMapControls.groupIdFromKind(r.__kind),
      getRecordLabel: (r) => r.nome,
      getRecordBadgeHtml: (r) => statusBadgeFor(r.__kind, r),
      sectionsFor: () => [],
      emptyMessage: "Nenhuma demanda registrada.",
      visibility: visibilityApi(),
      recordOrder,
      getRecordKey: (r) => itemKey(r.__kind, r.id),
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
        openDetail(record.__kind, id, { anchorEl });
      },
    });
  }

  function highlightSidebar(kind, id) {
    selectedKey = itemKey(kind, id);
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
      btn.setAttribute("aria-expanded", String(!collapsed));
    });
  }

  function addEntryLayers(group, entry) {
    const { kind, id, data: item } = entry;
    const style = geomStyle(kind, item.status);
    const key = itemKey(kind, id);
    const entryLayers = { layers: [], bounds: null, latlng: null };

    const onMapClick = (e) => {
      L.DomEvent.stopPropagation(e);
      openDetail(kind, id, { mapEvent: e });
    };

    if (item.geometria) {
      const gj = L.geoJSON(
        { type: item.geometria.tipo, coordinates: item.geometria.coordinates },
        { style: () => style }
      );
      gj.eachLayer((layer) => {
        layer.on("click", onMapClick);
        SLTStatusColors.decorateLeafletLayer(layer, item.status);
        entryLayers.layers.push(layer);
        group.addLayer(layer);
      });
      if (gj.getLayers().length) entryLayers.bounds = gj.getBounds();
    }

    const ref = coordsItem(item);
    if (ref && (kind === "projeto" || kind === "objeto")) {
      const icon = kind === "objeto" ? createObjetoPinIcon(item.status) : createDemandaPinIcon(item.status);
      const marker = L.marker([ref.lat, ref.lng], { icon });
      marker.on("click", onMapClick);
      entryLayers.layers.push(marker);
      entryLayers.latlng = L.latLng(ref.lat, ref.lng);
      group.addLayer(marker);
      if (!entryLayers.bounds) entryLayers.bounds = L.latLngBounds([ref, ref]);
    }

    if (entryLayers.layers.length) {
      entryLayers.labelLayers = SLTPainelLayerLabels.buildEntryLabels(
        entryLayers,
        item,
        kind,
        style.color,
        L
      );
      layersByKey.set(key, entryLayers);
    }
  }

  function buildMapLayers() {
    layersByKey.clear();
    if (mapLayerGroup) map.removeLayer(mapLayerGroup);
    mapLayerGroup = L.featureGroup();
    const sorted = SLTPainelMapControls.sortByLayerOrder(entries, (e) => e.kind);
    sorted.forEach((e) => addEntryLayers(mapLayerGroup, e));
    mapLayerGroup.addTo(map);
    sorted.forEach((e) => syncEntryVisibility(e.kind, e.id));
    applyMapLayerZOrder();
    if (mapLayerGroup.getLayers().length) {
      SLTPainelMapControls.establishInitialPainelMapView(map, mapLayerGroup.getBounds());
    } else {
      SLTPainelMapControls.markInitialMapViewReady(map);
    }
  }

  function selectItem(kind, id, scrollSidebar) {
    highlightSidebar(kind, id);
    if (scrollSidebar) {
      document
        .querySelector(`.layer-group--record[data-record-id="${CSS.escape(id)}"]`)
        ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  function focusMapOnItem(kind, id) {
    const entry = layersByKey.get(itemKey(kind, id));
    if (entry?.bounds?.isValid()) {
      SLTPainelMapControls.fitMapToDefaultBounds(map, entry.bounds, { animate: true, rememberDefault: false });
      return;
    }
    const e = findEntry(kind, id);
    const ref = e ? coordsItem(e.data) : null;
    if (ref) map.setView([ref.lat, ref.lng], 14, { animate: true });
  }

  function openDetail(kind, id, opts) {
    const entry = findEntry(kind, id);
    if (!entry) return;

    selectItem(kind, id, !!opts?.anchorEl);

    if (opts?.anchorEl) {
      anchorMode = "element";
      anchorRef = opts.anchorEl;
      mapAnchorLatLng = null;
    } else if (opts?.mapEvent) {
      anchorMode = "map";
      const layerEntry = layersByKey.get(itemKey(kind, id));
      mapAnchorLatLng = opts.mapEvent.latlng || layerEntry?.latlng || layerEntry?.bounds?.getCenter() || null;
      anchorRef = mapAnchorLatLng;
    } else {
      anchorMode = null;
      anchorRef = null;
      mapAnchorLatLng = null;
    }

    if (opts?.anchorEl) {
      focusMapOnItem(kind, id);
    }
    showPopover(entry);
    if (anchorMode === "map") map.once("moveend", repositionPopover);
  }

  function initMap() {
    map = SLTPainelMapControls.initPainelMap("map-painel");
    map._sltInitialViewReady = false;
    map.on("move zoom", () => {
      if (openEntry && anchorMode === "map" && mapAnchorLatLng) {
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
      const kind = key.slice(0, sep);
      const id = key.slice(sep + 1);
      return isEntryMapVisible(kind, id);
    });
  }

  function bindLegendLayoutRefresh() {
    $("status-legend")?.addEventListener("slt-legend-layout", () => {
      if (!map || map._sltInitialViewReady !== true) return;
      SLTPainelMapControls.adjustMapForLegendLayout(map, { getFocusLatLng: getMapFocusLatLng });
    });
  }

  async function init() {
    const user = await SLTAdminAuth.requireAuth();
    if (!user) return;
    await SLTAdminLabels.init("../");

    [painelItems, objetos] = await Promise.all([
      SLTAdminApi.listPainelDemandas(),
      SLTAdminApi.listObjetosAhp(),
    ]);

    buildEntries();
    initRecordOrder();
    initLayerFilter();
    initMap();
    initLayersSectionCollapse();
    SLTStatusColors.renderLegend("#status-legend", {
      layout: "painel",
      labelFn: (codigo) => SLTStatusColors.getStatusDemanda(codigo).nome,
    });
    bindLegendLayoutRefresh();
    renderEntriesList();
    buildMapLayers();
  }

  init().catch((err) => {
    console.error(err);
    if (err.code === "UNAUTHORIZED") {
      location.replace(SLTAdminAuth.loginUrl());
      return;
    }
    SLTAdminUi.showToast(err.message, true);
  });
})();
