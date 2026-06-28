(function () {
  const SIDEBAR_GRUPOS = [
    { id: "plano", label: "Plano", tipo: "plano" },
    { id: "programa", label: "Programa", tipo: "programa" },
    { id: "projeto", label: "Projetos", tipo: "projeto" },
  ];

  let map;
  let items = [];
  let layersByKey = new Map();
  let selectedKey = null;
  let popoverEl = null;
  let anchorMode = null;
  let anchorRef = null;
  let mapAnchorLatLng = null;
  let openItem = null;

  function pinSvg(statusColor) {
    return (
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" aria-hidden="true">' +
      '<path fill="#111111" stroke="#ffffff" stroke-width="1.2" d="M12 1C7.03 1 3 5.03 3 10c0 7.08 9 17.5 9 17.5S21 17.08 21 10c0-4.97-4.03-9-9-9zm0 13a4 4 0 110-8 4 4 0 010 8z"/>' +
      `<circle cx="12" cy="10" r="4" fill="${statusColor}"/>` +
      "</svg>"
    );
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

  const PIN_W = 34;
  const PIN_H = 42;
  const PIN_CONTAINER = 56;
  const PIN_HEAD_Y = PIN_CONTAINER - PIN_H + (10 / 36) * PIN_H;
  const PIN_HEAD_SIZE = (18 / 36) * PIN_H;

  function createPinIcon(status) {
    const { text } = statusStyle(status);
    return L.divIcon({
      className: "painel-pin-wrap",
      html:
        `<div class="painel-pin" style="--pin-halo-color:${text};--head-y:${PIN_HEAD_Y}px;--head-size:${PIN_HEAD_SIZE}px">` +
        `<span class="painel-pin-halo"></span>` +
        `<span class="painel-pin-halo painel-pin-halo--delay"></span>` +
        pinSvg(text) +
        `</div>`,
      iconSize: [PIN_CONTAINER, PIN_CONTAINER],
      iconAnchor: [PIN_CONTAINER / 2, PIN_CONTAINER - 4],
    });
  }

  function coordsItem(d) {
    if (d.lat != null && d.lng != null) return { lat: d.lat, lng: d.lng };
    if (d.geometria?.tipo === "Point") {
      const [lng, lat] = d.geometria.coordinates;
      return { lat, lng };
    }
    return null;
  }

  function geomStyle(status) {
    const { text } = statusStyle(status);
    return {
      color: text,
      weight: 2.5,
      fillColor: text,
      fillOpacity: 0.18,
      opacity: 0.9,
    };
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

  function renderSidebar() {
    SLTGroupedSidebar.renderGroupedDemandasSidebar({
      containerSelector: "#layers-container",
      countSelector: "#demandas-count",
      emptySelector: "#lista-vazia",
      groups: SIDEBAR_GRUPOS.map((g) => ({
        id: g.id,
        label: g.label,
        records: items.filter((d) => d.tipo === g.tipo),
      })),
      selectedId: selectedIdFromKey(),
      getRecordId: (r) => r.id,
      getRecordLabel: (r) => r.nome,
      getRecordBadgeHtml: (r) => {
        const st = statusStyle(r.status);
        return `<span class="${SLTStatusColors.badgeClass(r.status)}">${escapeHtml(st.nome)}</span>`;
      },
      sectionsFor: () => [],
      emptyMessage: "Nenhuma demanda registrada.",
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
      el.querySelector(".layer-group-header--record")?.setAttribute("aria-expanded", String(on));
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
    const style = geomStyle(d.status);
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

    if (entry.layers.length) layersByKey.set(key, entry);
  }

  function buildMapLayers() {
    layersByKey.clear();
    const group = L.featureGroup();
    items.forEach((d) => addItemLayers(group, d));
    group.addTo(map);
    if (group.getLayers().length) map.fitBounds(group.getBounds().pad(0.12));
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
      map.fitBounds(entry.bounds.pad(0.12), { animate: true });
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
    try {
      items = await SLTDemandasApi.listPainelDemandas();
    } catch (err) {
      console.error(err);
      items = (SLTStorage.loadDemandas() || []).map((d) => ({ ...d, tipo: "projeto" }));
    }

    initLayersSectionCollapse();
    initMap();
    SLTStatusColors.renderLegend("#status-legend");
    renderSidebar();
    buildMapLayers();
  }

  init().catch(console.error);
})();
