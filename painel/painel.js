(function () {
  let map;
  let demandas = [];
  let layersById = new Map();
  let selectedId = null;
  let popoverEl = null;
  let anchorMode = null;
  let anchorRef = null;
  let mapAnchorLatLng = null;
  let openDemanda = null;

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

  function coordsDemanda(d) {
    if (d.lat != null && d.lng != null) return { lat: d.lat, lng: d.lng };
    if (d.geometria?.tipo === "Point") {
      const [lng, lat] = d.geometria.coordinates;
      return { lat, lng };
    }
    return null;
  }

  function boundsDemanda(d) {
    const ref = coordsDemanda(d);
    if (ref) return L.latLngBounds([ref, ref]);
    if (d.geometria?.tipo === "Polygon") {
      const latlngs = d.geometria.coordinates[0].map(([lng, lat]) => [lat, lng]);
      return L.latLngBounds(latlngs);
    }
    if (d.geometria?.tipo === "LineString") {
      const latlngs = d.geometria.coordinates.map(([lng, lat]) => [lat, lng]);
      return L.latLngBounds(latlngs);
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

  function detailBodyHtml(d) {
    const entLabel = d.instituicao_label || d.entidade_label || d.instituicao_id || "—";
    return `
      <dl>
        <dt>Instituição</dt><dd>${escapeHtml(entLabel)}</dd>
        <dt>CNPJ</dt><dd>${escapeHtml(d.instituicao_cnpj || "—")}</dd>
        <dt>Projeto</dt><dd>${escapeHtml(d.nome)}</dd>
        <dt>Descrição</dt><dd class="painel-detail-desc">${escapeHtml(d.descricao || "—")}</dd>
      </dl>`;
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

    pop.querySelector(".painel-detail-kicker").textContent = st.nome;
    pop.querySelector(".painel-detail-title").textContent = d.nome;
    pop.querySelector(".painel-detail-body").innerHTML = detailBodyHtml(d);

    pop.classList.remove("hidden");
    openDemanda = d;
    requestAnimationFrame(repositionPopover);
  }

  function closePopover() {
    popoverEl?.classList.add("hidden");
    openDemanda = null;
    anchorMode = null;
    anchorRef = null;
    mapAnchorLatLng = null;
  }

  function updateDemandasCount(n) {
    const el = $("demandas-count");
    el.textContent = n ? String(n) : "";
  }

  function renderSidebar() {
    const container = $("layers-container");
    const vazia = $("lista-vazia");

    updateDemandasCount(demandas.length);

    if (!demandas.length) {
      container.innerHTML = "";
      vazia.classList.remove("hidden");
      return;
    }

    vazia.classList.add("hidden");
    container.innerHTML = demandas
      .slice()
      .reverse()
      .map((d) => {
        const st = statusStyle(d.status);
        return `
          <div class="layer-row${selectedId === d.id ? " is-selected" : ""}" data-id="${escapeHtml(d.id)}" role="listitem">
            <div class="layer-row-line">
              <span class="layer-name">${escapeHtml(d.nome)}</span>
              <span class="${SLTStatusColors.badgeClass(d.status)}">${escapeHtml(st.nome)}</span>
            </div>
          </div>`;
      })
      .join("");

    container.querySelectorAll(".layer-row").forEach((row) => {
      row.addEventListener("click", (e) => {
        e.stopPropagation();
        openDemandaDetail(row.dataset.id, { anchorEl: row });
      });
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

  function buildMapLayers() {
    layersById.clear();
    const group = L.featureGroup();

    demandas.forEach((d) => {
      const style = geomStyle(d.status);
      const entry = { layers: [], bounds: boundsDemanda(d) };

      const onMapClick = (e) => {
        L.DomEvent.stopPropagation(e);
        openDemandaDetail(d.id, { mapEvent: e });
      };

      if (d.geometria?.tipo === "Polygon") {
        const latlngs = d.geometria.coordinates[0].map(([lng, lat]) => [lat, lng]);
        const layer = L.polygon(latlngs, style);
        layer.on("click", onMapClick);
        entry.layers.push(layer);
        group.addLayer(layer);
      } else if (d.geometria?.tipo === "LineString") {
        const latlngs = d.geometria.coordinates.map(([lng, lat]) => [lat, lng]);
        const layer = L.polyline(latlngs, style);
        layer.on("click", onMapClick);
        entry.layers.push(layer);
        group.addLayer(layer);
      }

      const ref = coordsDemanda(d);
      if (ref) {
        const marker = L.marker([ref.lat, ref.lng], { icon: createPinIcon(d.status) });
        marker.on("click", onMapClick);
        entry.layers.push(marker);
        entry.latlng = L.latLng(ref.lat, ref.lng);
        group.addLayer(marker);
      }

      if (entry.layers.length) layersById.set(d.id, entry);
    });

    group.addTo(map);
    if (group.getLayers().length) map.fitBounds(group.getBounds().pad(0.12));
  }

  function selectDemanda(id, scrollSidebar) {
    selectedId = id;
    document.querySelectorAll(".layer-row").forEach((el) => {
      el.classList.toggle("is-selected", el.dataset.id === id);
    });
    if (scrollSidebar) {
      document.querySelector(`.layer-row[data-id="${CSS.escape(id)}"]`)?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }

  function focusMapOnDemanda(d) {
    const ref = coordsDemanda(d);
    if (ref) {
      map.setView([ref.lat, ref.lng], 14, { animate: true });
      return;
    }
    const entry = layersById.get(d.id);
    if (entry?.bounds) {
      map.setView(entry.bounds.getCenter(), 13, { animate: true });
    }
  }

  function openDemandaDetail(id, opts) {
    const d = demandas.find((x) => x.id === id);
    if (!d) return;

    selectDemanda(id, !!opts?.anchorEl);

    if (opts?.anchorEl) {
      anchorMode = "element";
      anchorRef = opts.anchorEl;
      mapAnchorLatLng = null;
    } else if (opts?.mapEvent) {
      anchorMode = "map";
      const entry = layersById.get(id);
      mapAnchorLatLng = opts.mapEvent.latlng || entry?.latlng || null;
      anchorRef = mapAnchorLatLng;
    } else {
      anchorMode = null;
      anchorRef = null;
      mapAnchorLatLng = null;
    }

    showPopover(d);
    focusMapOnDemanda(d);

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
      if (openDemanda && anchorMode === "map" && mapAnchorLatLng) {
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
      demandas = await SLTDemandasApi.listDemandas();
    } catch (err) {
      console.error(err);
      demandas = SLTStorage.loadDemandas();
    }

    initLayersSectionCollapse();
    initMap();
    renderSidebar();
    buildMapLayers();
  }

  init().catch(console.error);
})();
