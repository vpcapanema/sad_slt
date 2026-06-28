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

  function visibilityToggleHtml(scope, attrs, checked) {
    const scopeClass = scope === "group" ? "layer-visibility-input--group" : "layer-visibility-input--record";
    const attrPairs = Object.entries(attrs || {})
      .map(([k, v]) => ` data-${k}="${escapeAttr(v)}"`)
      .join("");
    return `<label class="layer-visibility-toggle" title="Visibilidade no mapa">
      <input type="checkbox" class="layer-visibility-input ${scopeClass}"${attrPairs}${checked ? " checked" : ""} aria-label="Visível no mapa">
    </label>`;
  }

  function recordMarkup(record, options) {
    const getRecordId = options.getRecordId || ((r) => r.id);
    const getRecordLabel = options.getRecordLabel || ((r) => r.nome || r.id);
    const getRecordBadgeHtml = options.getRecordBadgeHtml || (() => "");
    const getRecordGroupId = options.getRecordGroupId || (() => "");
    const sectionsFor = options.sectionsFor || (() => options.sections || []);
    const selectedId = options.selectedId ?? null;
    const visibility = options.visibility;

    const id = getRecordId(record);
    const groupId = getRecordGroupId(record);
    const getRecordKey = options.getRecordKey || ((r) => String(getRecordId(r)));
    const recordKey = getRecordKey(record);
    const selected = id === selectedId;
    const sectionDomId = String(id).replace(/[^a-zA-Z0-9_-]/g, "_");
    const sections = sectionsFor(record) || [];
    const recordVisible = visibility ? visibility.isRecordVisible(groupId, id) : true;
    const groupVisible = visibility ? visibility.isGroupVisible(groupId) : true;

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

    const visHtml = visibility
      ? visibilityToggleHtml(
          "record",
          { "record-id": id, "group-id": groupId },
          recordVisible && groupVisible
        )
      : "";

    const nameClass = options.onRecordReorder ? "layer-group-name layer-group-name--reorderable" : "layer-group-name";

    return `
      <div class="layer-group layer-group--record${selected ? " is-selected" : ""}${selected ? "" : " collapsed"}${recordVisible && groupVisible ? "" : " is-map-hidden"}"
        data-record-id="${escapeAttr(id)}" data-record-key="${escapeAttr(recordKey)}" data-group-id="${escapeAttr(groupId)}">
        <div class="layer-group-header-row">
          ${visHtml}
          <button type="button" class="layer-group-header layer-group-header--record"
            aria-expanded="${selected ? "true" : "false"}"
            ${sections.length ? `aria-controls="record-sections-${escapeAttr(sectionDomId)}"` : ""}>
            <span class="layer-group-toggle" aria-hidden="true">▼</span>
            <span class="${nameClass}">${escapeHtml(getRecordLabel(record))}</span>
            ${getRecordBadgeHtml(record)}
          </button>
        </div>
        ${sectionsHtml}
      </div>`;
  }

  let suppressRecordClick = false;

  function bindRecordClicks(container, options) {
    const selectedId = options.selectedId ?? null;
    container.querySelectorAll(".layer-group--record").forEach((group) => {
      const btn = group.querySelector(".layer-group-header--record");
      btn.addEventListener("click", (ev) => {
        if (suppressRecordClick) {
          ev.preventDefault();
          ev.stopPropagation();
          return;
        }
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

  function bindVisibilityControls(container, options) {
    if (!options.visibility || !options.onGroupVisibilityChange || !options.onRecordVisibilityChange) return;

    container.querySelectorAll(".layer-visibility-input--group").forEach((input) => {
      input.addEventListener("click", (ev) => ev.stopPropagation());
      input.addEventListener("change", (ev) => {
        ev.stopPropagation();
        options.onGroupVisibilityChange(input.dataset.groupId, input.checked);
      });
    });

    container.querySelectorAll(".layer-visibility-input--record").forEach((input) => {
      input.addEventListener("click", (ev) => ev.stopPropagation());
      input.addEventListener("change", (ev) => {
        ev.stopPropagation();
        options.onRecordVisibilityChange(input.dataset.groupId, input.dataset.recordId, input.checked);
      });
    });
  }

  function bindRecordReorder(container, options) {
    if (!options.onRecordReorder) return;

    const DRAG_THRESHOLD = 6;

    container.querySelectorAll(".layer-group--tipo").forEach((tipoGroup) => {
      const groupId = tipoGroup.dataset.groupId;
      const list = tipoGroup.querySelector(".admin-records-list");
      if (!list) return;

      list.querySelectorAll(".layer-group-name--reorderable").forEach((nameEl) => {
        nameEl.addEventListener("pointerdown", (ev) => {
          if (ev.button !== 0) return;

          const record = nameEl.closest(".layer-group--record");
          if (!record || record.dataset.groupId !== groupId) return;

          const startY = ev.clientY;
          let dragging = record;
          let dragActive = false;

          const clearIndicators = () => {
            list.querySelectorAll(".layer-group--record").forEach((row) => {
              row.classList.remove("is-layer-drag-over-top", "is-layer-drag-over-bottom");
            });
          };

          const onMove = (moveEv) => {
            if (!dragging) return;
            if (!dragActive && Math.abs(moveEv.clientY - startY) < DRAG_THRESHOLD) return;

            if (!dragActive) {
              dragActive = true;
              dragging.classList.add("is-layer-dragging");
              document.body.classList.add("is-layer-reorder-active");
            }

            moveEv.preventDefault();
            list.querySelectorAll(".layer-group--record").forEach((row) => {
              if (row === dragging || row.dataset.groupId !== groupId) {
                row.classList.remove("is-layer-drag-over-top", "is-layer-drag-over-bottom");
                return;
              }
              const rect = row.getBoundingClientRect();
              const before = moveEv.clientY < rect.top + rect.height / 2;
              row.classList.toggle("is-layer-drag-over-top", before);
              row.classList.toggle("is-layer-drag-over-bottom", !before);
            });
          };

          const onUp = () => {
            document.removeEventListener("pointermove", onMove);
            document.removeEventListener("pointerup", onUp);
            document.removeEventListener("pointercancel", onUp);
            document.body.classList.remove("is-layer-reorder-active");

            if (dragActive && dragging) {
              const target = [...list.querySelectorAll(".layer-group--record")].find((row) => {
                if (row === dragging || row.dataset.groupId !== groupId) return false;
                return (
                  row.classList.contains("is-layer-drag-over-top") ||
                  row.classList.contains("is-layer-drag-over-bottom")
                );
              });

              if (target) {
                const before = target.classList.contains("is-layer-drag-over-top");
                if (before) target.before(dragging);
                else target.after(dragging);

                const keys = [...list.querySelectorAll(".layer-group--record")].map(
                  (row) => row.dataset.recordKey || row.dataset.recordId
                );
                options.onRecordReorder(groupId, keys);
              }

              suppressRecordClick = true;
              setTimeout(() => {
                suppressRecordClick = false;
              }, 0);
            }

            dragging?.classList.remove("is-layer-dragging");
            clearIndicators();
            dragging = null;
          };

          document.addEventListener("pointermove", onMove);
          document.addEventListener("pointerup", onUp);
          document.addEventListener("pointercancel", onUp);
        });
      });
    });
  }

  function sortRecordsForGroup(group, options, getRecordKey) {
    const records = group.records || [];
    const order = options.recordOrder?.[group.id];
    if (!order?.length) return records;
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

  function renderGroupedDemandasSidebar(options) {
    const container = document.querySelector(options.containerSelector || "#records-list");
    if (!container) return;

    container.classList.add("demandas-tree");

    const groups = options.groups || [];
    const getRecordId = options.getRecordId || ((r) => r.id);
    const getRecordGroupId = options.getRecordGroupId || ((r, g) => g.id);
    const total = groups.reduce((acc, g) => acc + (g.records || []).length, 0);
    const selectedId = options.selectedId ?? null;
    const visibility = options.visibility;

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

    const getRecordKey = options.getRecordKey || ((r) => String(getRecordId(r)));

    container.innerHTML = groups
      .map((group) => {
        const records = sortRecordsForGroup(group, options, getRecordKey);
        const hasSelected = records.some((r) => getRecordId(r) === selectedId);
        const open = hasSelected || group.open;
        const groupVisible = visibility ? visibility.isGroupVisible(group.id) : true;
        const visHtml = visibility
          ? visibilityToggleHtml("group", { "group-id": group.id }, groupVisible)
          : "";
        const body = records.length
          ? records
              .map((r) =>
                recordMarkup(r, {
                  ...options,
                  getRecordGroupId: (rec) => getRecordGroupId(rec, group),
                })
              )
              .join("")
          : `<p class="layers-empty layers-empty--nested">${escapeHtml(group.emptyMessage || "Nenhum registro.")}</p>`;
        return `
          <div class="layer-group layer-group--tipo${open ? "" : " collapsed"}${groupVisible ? "" : " is-map-hidden"}" data-group-id="${escapeAttr(group.id)}">
            <div class="layer-group-header-row layer-group-header-row--tipo">
              ${visHtml}
              <button type="button" class="layer-group-header layer-group-header--section layer-group-header--tipo"
                aria-expanded="${open ? "true" : "false"}">
                <span class="layer-group-toggle" aria-hidden="true">▼</span>
                <span class="layer-group-name layer-group-name--tipo">${escapeHtml((group.label || "").toUpperCase())}</span>
                <span class="layer-group-active-count">${records.length || ""}</span>
              </button>
            </div>
            <div class="layer-group-body admin-records-list">${body}</div>
          </div>`;
      })
      .join("");

    container.querySelectorAll(".layer-group--tipo > .layer-group-header-row > .layer-group-header").forEach((btn) => {
      btn.addEventListener("click", () => {
        const grp = btn.closest(".layer-group--tipo");
        const collapsed = grp.classList.toggle("collapsed");
        btn.setAttribute("aria-expanded", String(!collapsed));
      });
    });

    bindRecordClicks(container, { ...options, findRecord });
    bindVisibilityControls(container, options);
    bindRecordReorder(container, options);
  }

  global.SLTGroupedSidebar = { renderGroupedDemandasSidebar };
})(window);
