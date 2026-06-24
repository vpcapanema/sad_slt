(function () {
  const Lb = () => SLTAdminLabels;

  let map;
  let demandas = [];
  let objetos = [];
  let projetos = [];
  let layersByKey = new Map();
  let selectedKey = null;
  let popoverEl = null;
  let anchorMode = null;
  let anchorRef = null;
  let mapAnchorLatLng = null;
  let openItem = null;

  const PIN_H = 42;
  const PIN_CONTAINER = 56;
  const DEM_HEAD_Y = PIN_CONTAINER - PIN_H + (10 / 36) * PIN_H;
  const DEM_HEAD_SIZE = (18 / 36) * PIN_H;
  const OBJ_HEAD_Y = PIN_CONTAINER - PIN_H + (8 / 36) * PIN_H;
  const OBJ_HEAD_SIZE = (14 / 36) * PIN_H;

  function pinSvgDemanda(statusColor) {
    return (
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" aria-hidden="true">' +
      '<path fill="#111111" stroke="#ffffff" stroke-width="1.2" d="M12 1C7.03 1 3 5.03 3 10c0 7.08 9 17.5 9 17.5S21 17.08 21 10c0-4.97-4.03-9-9-9zm0 13a4 4 0 110-8 4 4 0 010 8z"/>' +
      `<circle cx="12" cy="10" r="4" fill="${statusColor}"/>` +
      "</svg>"
    );
  }

  function pinSvgObjeto(statusColor) {
    return (
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" aria-hidden="true">' +
      '<path fill="#111111" stroke="#ffffff" stroke-width="1.2" d="M5 2h14a2 2 0 0 1 2 2v10c0 5.5-2.5 9.8-8 18-5.5-8.2-8-12.5-8-18V4a2 2 0 0 1 2-2z"/>' +
      `<rect x="8" y="5" width="8" height="8" rx="1.5" fill="${statusColor}"/>` +
      "</svg>"
    );
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

  function statusLabel(kind, item) {
    if (kind === "objeto") return Lb().statusObjetoLabel(item.status);
    return Lb().statusDemandaLabel(item.status);
  }

  /** Demanda só entra se ainda não tiver objeto AHP (fonte mais atual). */
  function buildProjetos() {
    const demandasComObjeto = new Set(objetos.map((o) => o.demanda_codigo));
    projetos = [];

    objetos.forEach((o) => {
      projetos.push({
        kind: "objeto",
        id: o.codigo,
        data: o,
        sortAt: o.statusAtualizadoEm || o.aprovadoEm || "",
      });
    });

    demandas
      .filter((d) => !demandasComObjeto.has(d.id))
      .forEach((d) => {
        projetos.push({
          kind: "demanda",
          id: d.id,
          data: d,
          sortAt: d.criadoEm || "",
        });
      });

    projetos.sort((a, b) => new Date(b.sortAt) - new Date(a.sortAt));
  }

  function findProjeto(kind, id) {
    return projetos.find((p) => p.kind === kind && p.id === id);
  }

  function createDemandaPinIcon(status) {
    const { text } = statusStyle("demanda", status);
    return L.divIcon({
      className: "painel-pin-wrap",
      html:
        `<div class="painel-pin" style="--pin-halo-color:${text};--head-y:${DEM_HEAD_Y}px;--head-size:${DEM_HEAD_SIZE}px">` +
        `<span class="painel-pin-halo"></span><span class="painel-pin-halo painel-pin-halo--delay"></span>` +
        pinSvgDemanda(text) +
        `</div>`,
      iconSize: [PIN_CONTAINER, PIN_CONTAINER],
      iconAnchor: [PIN_CONTAINER / 2, PIN_CONTAINER - 4],
    });
  }

  function createObjetoPinIcon(status) {
    const { text } = statusStyle("objeto", status);
    return L.divIcon({
      className: "painel-pin-wrap",
      html:
        `<div class="painel-pin painel-pin--objeto" style="--pin-halo-color:${text};--head-y:${OBJ_HEAD_Y}px;--head-size:${OBJ_HEAD_SIZE}px">` +
        `<span class="painel-pin-halo"></span><span class="painel-pin-halo painel-pin-halo--delay"></span>` +
        pinSvgObjeto(text) +
        `</div>`,
      iconSize: [PIN_CONTAINER, PIN_CONTAINER],
      iconAnchor: [PIN_CONTAINER / 2, PIN_CONTAINER - 4],
    });
  }

  function coordsItem(item) {
    if (item.lat != null && item.lng != null) return { lat: item.lat, lng: item.lng };
    if (item.geometria?.tipo === "Point") {
      const [lng, lat] = item.geometria.coordinates;
      return { lat, lng };
    }
    return null;
  }

  function boundsItem(item) {
    const ref = coordsItem(item);
    if (ref) return L.latLngBounds([ref, ref]);
    if (item.geometria?.tipo === "Polygon") {
      const latlngs = item.geometria.coordinates[0].map(([lng, lat]) => [lat, lng]);
      return L.latLngBounds(latlngs);
    }
    if (item.geometria?.tipo === "LineString") {
      const latlngs = item.geometria.coordinates.map(([lng, lat]) => [lat, lng]);
      return L.latLngBounds(latlngs);
    }
    return null;
  }

  function geomStyle(kind, status) {
    const { text } = statusStyle(kind, status);
    return { color: text, weight: 2.5, fillColor: text, fillOpacity: 0.18, opacity: 0.9 };
  }

  function demandaDetailHtml(d) {
    const { escapeHtml, formatDate, instituicaoLabel, planoLabel, classificacaoLabel,
      complementosLabel, representanteLabel, geometriaResumo, statusDemandaLabel, statusBadgeClass } = Lb();
    const rep = d.representante || {};
    const coords = coordsItem(d);
    return `
      <div class="admin-readonly-block">
        <dl>
          <dt>Código da demanda</dt><dd><code>${escapeHtml(d.id)}</code></dd>
          <dt>Status</dt><dd><span class="${statusBadgeClass(d.status)}">${escapeHtml(statusDemandaLabel(d.status))}</span></dd>
          <dt>Instituição demandante</dt><dd>${escapeHtml(instituicaoLabel(d))}</dd>
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
      grupoComparacaoLabel, geometriaResumo, statusObjetoLabel, statusBadgeClass } = Lb();
    const coords = coordsItem(o);
    return `
      <div class="admin-readonly-block">
        <dl>
          <dt>Código do objeto</dt><dd><code>${escapeHtml(o.codigo)}</code></dd>
          <dt>Status AHP</dt><dd><span class="${statusBadgeClass(o.status)}">${escapeHtml(statusObjetoLabel(o.status))}</span></dd>
          <dt>Demanda de origem</dt><dd><a href="demanda.html?id=${encodeURIComponent(o.demanda_codigo)}">${escapeHtml(o.demanda_codigo)}</a></dd>
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

  function showPopover(projeto) {
    const { kind, data: item } = projeto;
    const st = statusStyle(kind, item.status);
    const pop = ensurePopover();
    const header = pop.querySelector(".painel-detail-header");
    header.style.background = st.bg;
    header.style.color = st.text;
    pop.querySelector(".painel-detail-kicker").textContent =
      kind === "objeto" ? `AHP · ${statusLabel(kind, item)}` : statusLabel(kind, item);
    pop.querySelector(".painel-detail-title").textContent = item.nome;
    pop.querySelector(".painel-detail-body").innerHTML =
      kind === "objeto" ? objetoDetailHtml(item) : demandaDetailHtml(item);
    pop.classList.remove("hidden");
    openItem = projeto;
    requestAnimationFrame(repositionPopover);
  }

  function closePopover() {
    popoverEl?.classList.add("hidden");
    openItem = null;
    anchorMode = null;
    anchorRef = null;
    mapAnchorLatLng = null;
  }

  function renderProjetosList() {
    const container = $("layers-container");
    const vazia = $("lista-vazia-projetos");
    const countEl = $("projetos-count");
    countEl.textContent = projetos.length ? String(projetos.length) : "";

    if (!projetos.length) {
      container.innerHTML = "";
      vazia.classList.remove("hidden");
      return;
    }

    vazia.classList.add("hidden");
    container.innerHTML = projetos
      .map((p) => {
        const key = itemKey(p.kind, p.id);
        return `<div class="layer-row${selectedKey === key ? " is-selected" : ""}"
          data-kind="${Lb().escapeHtml(p.kind)}" data-id="${Lb().escapeHtml(p.id)}" role="listitem">
          <div class="layer-row-line">
            <span class="layer-name">${Lb().escapeHtml(p.data.nome)}</span>
            <span class="${SLTStatusColors.badgeClass(p.data.status)}">${Lb().escapeHtml(statusLabel(p.kind, p.data))}</span>
          </div>
        </div>`;
      })
      .join("");

    container.querySelectorAll(".layer-row").forEach((row) => {
      row.addEventListener("click", (e) => {
        e.stopPropagation();
        openDetail(row.dataset.kind, row.dataset.id, { anchorEl: row });
      });
    });
  }

  function initLayersSectionCollapse() {
    const root = $("painel-layers-root");
    const btn = $("toggle-projetos-section");
    btn.addEventListener("click", () => {
      const collapsed = root.classList.toggle("collapsed");
      btn.setAttribute("aria-expanded", String(!collapsed));
    });
  }

  function addProjetoLayers(group, projeto) {
    const { kind, id, data: item } = projeto;
    const style = geomStyle(kind, item.status);
    const key = itemKey(kind, id);
    const entry = { layers: [], bounds: boundsItem(item), latlng: null };

    const onMapClick = (e) => {
      L.DomEvent.stopPropagation(e);
      openDetail(kind, id, { mapEvent: e });
    };

    if (item.geometria?.tipo === "Polygon") {
      const latlngs = item.geometria.coordinates[0].map(([lng, lat]) => [lat, lng]);
      const layer = L.polygon(latlngs, style);
      layer.on("click", onMapClick);
      entry.layers.push(layer);
      group.addLayer(layer);
    } else if (item.geometria?.tipo === "LineString") {
      const latlngs = item.geometria.coordinates.map(([lng, lat]) => [lat, lng]);
      const layer = L.polyline(latlngs, style);
      layer.on("click", onMapClick);
      entry.layers.push(layer);
      group.addLayer(layer);
    }

    const ref = coordsItem(item);
    if (ref) {
      const icon = kind === "objeto" ? createObjetoPinIcon(item.status) : createDemandaPinIcon(item.status);
      const marker = L.marker([ref.lat, ref.lng], { icon });
      marker.on("click", onMapClick);
      entry.layers.push(marker);
      entry.latlng = L.latLng(ref.lat, ref.lng);
      group.addLayer(marker);
    }

    if (entry.layers.length) layersByKey.set(key, entry);
  }

  function buildMapLayers() {
    layersByKey.clear();
    const group = L.featureGroup();
    projetos.forEach((p) => addProjetoLayers(group, p));
    group.addTo(map);
    if (group.getLayers().length) map.fitBounds(group.getBounds().pad(0.12));
  }

  function selectItem(kind, id, scrollSidebar) {
    selectedKey = itemKey(kind, id);
    document.querySelectorAll(".layer-row").forEach((el) => {
      el.classList.toggle("is-selected", el.dataset.kind === kind && el.dataset.id === id);
    });
    if (scrollSidebar) {
      document
        .querySelector(`.layer-row[data-kind="${kind}"][data-id="${CSS.escape(id)}"]`)
        ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  function focusMapOnItem(item) {
    const ref = coordsItem(item);
    if (ref) {
      map.setView([ref.lat, ref.lng], 14, { animate: true });
      return;
    }
    const entry = layersByKey.get(selectedKey);
    if (entry?.bounds) map.setView(entry.bounds.getCenter(), 13, { animate: true });
  }

  function openDetail(kind, id, opts) {
    const projeto = findProjeto(kind, id);
    if (!projeto) return;

    selectItem(kind, id, !!opts?.anchorEl);

    if (opts?.anchorEl) {
      anchorMode = "element";
      anchorRef = opts.anchorEl;
      mapAnchorLatLng = null;
    } else if (opts?.mapEvent) {
      anchorMode = "map";
      const entry = layersByKey.get(itemKey(kind, id));
      mapAnchorLatLng = opts.mapEvent.latlng || entry?.latlng || null;
      anchorRef = mapAnchorLatLng;
    } else {
      anchorMode = null;
      anchorRef = null;
      mapAnchorLatLng = null;
    }

    showPopover(projeto);
    focusMapOnItem(projeto.data);
    if (anchorMode === "map") map.once("moveend", repositionPopover);
  }

  function initMap() {
    map = L.map("map-painel", { zoomControl: true }).setView([-22.5, -48.5], 7);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
      maxZoom: 19,
    }).addTo(map);
    map.on("move zoom", () => {
      if (openItem && anchorMode === "map" && mapAnchorLatLng) {
        anchorRef = mapAnchorLatLng;
        repositionPopover();
      }
    });
    setTimeout(() => map.invalidateSize(), 0);
    window.addEventListener("resize", () => {
      map.invalidateSize();
      repositionPopover();
    });
  }

  async function init() {
    const user = await SLTAdminAuth.requireAuth();
    if (!user) return;
    await SLTAdminLabels.init("../");

    [demandas, objetos] = await Promise.all([
      SLTAdminApi.listDemandas(),
      SLTAdminApi.listObjetosAhp(),
    ]);

    buildProjetos();
    initMap();
    initLayersSectionCollapse();
    renderProjetosList();
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
