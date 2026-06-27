(function (global) {
  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/'/g, "&#39;");
  }

  function recordMarkup(record, options) {
    const getRecordId = options.getRecordId || ((r) => r.id);
    const getRecordLabel = options.getRecordLabel || ((r) => r.nome || r.id);
    const getRecordBadgeHtml = options.getRecordBadgeHtml || (() => "");
    const sectionsFor = options.sectionsFor || (() => options.sections || []);
    const selectedId = options.selectedId ?? null;

    const id = getRecordId(record);
    const selected = id === selectedId;
    const sectionDomId = String(id).replace(/[^a-zA-Z0-9_-]/g, "_");
    const sections = sectionsFor(record) || [];

    const sectionsHtml = sections.length
      ? `<nav id="record-sections-${escapeAttr(sectionDomId)}"
            class="layer-group-body admin-record-sections admin-dashboard-nav"
            aria-label="Seções do registro">
            ${sections
              .map(
                (section) => `
              <a href="#${escapeAttr(section.id)}" class="layer-row">
                <span class="layer-row-line"><span class="layer-name">${escapeHtml(section.label)}</span></span>
              </a>`
              )
              .join("")}
          </nav>`
      : "";

    return `
      <div class="layer-group layer-group--record${selected ? " is-selected" : ""}${selected ? "" : " collapsed"}"
        data-record-id="${escapeAttr(id)}">
        <button type="button" class="layer-group-header layer-group-header--record"
          aria-expanded="${selected ? "true" : "false"}"
          ${sections.length ? `aria-controls="record-sections-${escapeAttr(sectionDomId)}"` : ""}>
          <span class="layer-group-toggle" aria-hidden="true">▼</span>
          <span class="layer-group-name">${escapeHtml(getRecordLabel(record))}</span>
          ${getRecordBadgeHtml(record)}
        </button>
        ${sectionsHtml}
      </div>`;
  }

  function bindRecordClicks(container, options) {
    const selectedId = options.selectedId ?? null;
    container.querySelectorAll(".layer-group--record").forEach((group) => {
      const btn = group.querySelector(".layer-group-header--record");
      btn.addEventListener("click", () => {
        const id = group.dataset.recordId;
        if (id === selectedId) {
          const collapsed = group.classList.toggle("collapsed");
          btn.setAttribute("aria-expanded", String(!collapsed));
          return;
        }
        const record = (options.findRecord || (() => null))(id);
        options.onSelect?.(id, record);
      });
    });
  }

  /**
   * Sidebar hierárquica:
   * DEMANDAS (root, fora desta função)
   *   └ Plano | Programa | Projetos  (grupos irmãos)
   *        └ cada demanda (expansível; seções do formulário quando informadas)
   */
  function renderGroupedDemandasSidebar(options) {
    const container = document.querySelector(options.containerSelector || "#records-list");
    if (!container) return;

    container.classList.add("demandas-tree");

    const groups = options.groups || [];
    const getRecordId = options.getRecordId || ((r) => r.id);
    const total = groups.reduce((acc, g) => acc + (g.records || []).length, 0);
    const selectedId = options.selectedId ?? null;

    const countEl = options.countSelector
      ? document.querySelector(options.countSelector)
      : document.querySelector("#records-count");
    if (countEl) countEl.textContent = total ? String(total) : "";

    const emptyEl = options.emptySelector
      ? document.querySelector(options.emptySelector)
      : null;
    if (emptyEl) emptyEl.classList.toggle("hidden", total > 0);

    if (!total) {
      container.innerHTML = `<p class="layers-empty">${escapeHtml(options.emptyMessage || "Nenhuma demanda registrada.")}</p>`;
      return;
    }

    const allRecords = groups.flatMap((g) => g.records || []);
    const findRecord = (id) => allRecords.find((r) => getRecordId(r) === id);

    container.innerHTML = groups
      .map((group) => {
        const records = group.records || [];
        const hasSelected = records.some((r) => getRecordId(r) === selectedId);
        const open = hasSelected || group.open;
        const body = records.length
          ? records.map((r) => recordMarkup(r, options)).join("")
          : `<p class="layers-empty layers-empty--nested">${escapeHtml(group.emptyMessage || "Nenhum registro.")}</p>`;
        return `
          <div class="layer-group layer-group--tipo${open ? "" : " collapsed"}" data-group-id="${escapeAttr(group.id)}">
            <button type="button" class="layer-group-header layer-group-header--section layer-group-header--tipo"
              aria-expanded="${open ? "true" : "false"}">
              <span class="layer-group-toggle" aria-hidden="true">▼</span>
              <span class="layer-group-name layer-group-name--tipo">${escapeHtml((group.label || "").toUpperCase())}</span>
              <span class="layer-group-active-count">${records.length || ""}</span>
            </button>
            <div class="layer-group-body admin-records-list">${body}</div>
          </div>`;
      })
      .join("");

    container.querySelectorAll(".layer-group--tipo > .layer-group-header").forEach((btn) => {
      btn.addEventListener("click", () => {
        const grp = btn.closest(".layer-group--tipo");
        const collapsed = grp.classList.toggle("collapsed");
        btn.setAttribute("aria-expanded", String(!collapsed));
      });
    });

    bindRecordClicks(container, { ...options, findRecord });
  }

  global.SLTGroupedSidebar = { renderGroupedDemandasSidebar };
})(window);
