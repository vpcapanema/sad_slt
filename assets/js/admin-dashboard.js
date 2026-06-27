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

  function bindRootCollapse(root, btn) {
    if (!root || !btn || btn.dataset.collapseBound === "1") return;
    btn.dataset.collapseBound = "1";
    btn.addEventListener("click", () => {
      const collapsed = root.classList.toggle("collapsed");
      btn.setAttribute("aria-expanded", String(!collapsed));
    });
  }

  function initSectionsCollapse(options) {
    bindRootCollapse(
      document.querySelector(options.rootSelector || "#admin-sections-root"),
      document.querySelector(options.toggleSelector || "#toggle-sections-nav")
    );
  }

  function initRecordsRootCollapse(options) {
    bindRootCollapse(
      document.querySelector(options.rootSelector || "#records-root"),
      document.querySelector(options.toggleSelector || "#toggle-records-root")
    );
  }

  function scrollToSection(target, scrollRoot) {
    if (!target) return;
    if (scrollRoot) {
      const top =
        scrollRoot.scrollTop +
        target.getBoundingClientRect().top -
        scrollRoot.getBoundingClientRect().top -
        8;
      scrollRoot.scrollTo({ top, behavior: "smooth" });
    } else {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function initSectionNav(options) {
    const nav = document.querySelector(
      options.navSelector || ".layer-group--record.is-selected .admin-record-sections, .admin-dashboard-nav"
    );
    if (!nav) return;

    const links = Array.from(nav.querySelectorAll('a[href^="#"]'));
    const sections = links
      .map((link) => document.querySelector(link.getAttribute("href")))
      .filter(Boolean);

    const scrollRoot = document.querySelector(options.scrollRootSelector || ".layout-main-scroll");

    links.forEach((link) => {
      if (link.dataset.navClickBound === "1") return;
      link.dataset.navClickBound = "1";
      link.addEventListener("click", (e) => {
        e.preventDefault();
        scrollToSection(document.querySelector(link.getAttribute("href")), scrollRoot);
      });
    });

    if (nav._sltSectionObserver) {
      nav._sltSectionObserver.disconnect();
      nav._sltSectionObserver = null;
    }

    links.forEach((link) => link.classList.remove("is-active"));

    if (!sections.length || !("IntersectionObserver" in window)) {
      if (links[0]) links[0].classList.add("is-active");
      return;
    }

    const observerOptions = scrollRoot
      ? { root: scrollRoot, rootMargin: "-8% 0px -60% 0px", threshold: [0.1, 0.35, 0.6] }
      : { rootMargin: "-20% 0px -55% 0px", threshold: [0.1, 0.35, 0.6] };

    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      const id = `#${visible.target.id}`;
      links.forEach((link) => {
        link.classList.toggle("is-active", link.getAttribute("href") === id);
      });
    }, observerOptions);

    sections.forEach((section) => observer.observe(section));
    nav._sltSectionObserver = observer;
  }

  function renderRecordsSidebar(options) {
    const container = document.querySelector(options.containerSelector || "#records-list");
    if (!container) return;

    const records = options.records || [];
    const selectedId = options.selectedId ?? null;
    const getRecordId = options.getRecordId || ((r) => r.id);
    const getRecordLabel = options.getRecordLabel || ((r) => r.nome || r.id);
    const getRecordBadgeHtml =
      options.getRecordBadgeHtml || (() => '<span class="layer-group-active-count">•</span>');
    const sections = options.sections || [];

    const countEl = document.querySelector(options.countSelector || "#records-count");
    if (countEl) countEl.textContent = records.length ? String(records.length) : "";

    if (!records.length) {
      container.innerHTML = `<p class="layers-empty">${escapeHtml(options.emptyMessage || "Nenhum registro.")}</p>`;
      return;
    }

    container.innerHTML = records
      .map((record) => {
        const id = getRecordId(record);
        const selected = id === selectedId;
        const sectionDomId = String(id).replace(/[^a-zA-Z0-9_-]/g, "_");
        return `
          <div class="layer-group layer-group--record${selected ? " is-selected" : ""}${selected ? "" : " collapsed"}"
            data-record-id="${escapeAttr(id)}">
            <button type="button" class="layer-group-header layer-group-header--record"
              aria-expanded="${selected ? "true" : "false"}"
              aria-controls="record-sections-${escapeAttr(sectionDomId)}">
              <span class="layer-group-toggle" aria-hidden="true">▼</span>
              <span class="layer-group-name">${escapeHtml(getRecordLabel(record))}</span>
              ${getRecordBadgeHtml(record)}
            </button>
            <nav id="record-sections-${escapeAttr(sectionDomId)}"
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
            </nav>
          </div>`;
      })
      .join("");

    container.querySelectorAll(".layer-group--record").forEach((group) => {
      const btn = group.querySelector(".layer-group-header--record");
      btn.addEventListener("click", () => {
        const id = group.dataset.recordId;
        if (id === selectedId) {
          const collapsed = group.classList.toggle("collapsed");
          btn.setAttribute("aria-expanded", String(!collapsed));
          return;
        }
        options.onSelect?.(id);
      });
    });
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
    const sections = sectionsFor(record);
    return `
      <div class="layer-group layer-group--record${selected ? " is-selected" : ""}${selected ? "" : " collapsed"}"
        data-record-id="${escapeAttr(id)}">
        <button type="button" class="layer-group-header layer-group-header--record"
          aria-expanded="${selected ? "true" : "false"}"
          aria-controls="record-sections-${escapeAttr(sectionDomId)}">
          <span class="layer-group-toggle" aria-hidden="true">▼</span>
          <span class="layer-group-name">${escapeHtml(getRecordLabel(record))}</span>
          ${getRecordBadgeHtml(record)}
        </button>
        <nav id="record-sections-${escapeAttr(sectionDomId)}"
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
        </nav>
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
        options.onSelect?.(id);
      });
    });
  }

  function renderGroupedRecordsSidebar(options) {
    if (global.SLTGroupedSidebar) {
      global.SLTGroupedSidebar.renderGroupedDemandasSidebar(options);
      return;
    }
    const container = document.querySelector(options.containerSelector || "#records-list");
    if (!container) return;

    const groups = options.groups || [];
    const total = groups.reduce((acc, g) => acc + (g.records || []).length, 0);

    const countEl = document.querySelector(options.countSelector || "#records-count");
    if (countEl) countEl.textContent = total ? String(total) : "";

    if (!total) {
      container.innerHTML = `<p class="layers-empty">${escapeHtml(options.emptyMessage || "Nenhum registro.")}</p>`;
      return;
    }

    const selectedId = options.selectedId ?? null;

    container.innerHTML = groups
      .map((group) => {
        const records = group.records || [];
        const hasSelected = records.some((r) => (options.getRecordId || ((x) => x.id))(r) === selectedId);
        const open = hasSelected || group.open;
        const body = records.length
          ? records.map((r) => recordMarkup(r, options)).join("")
          : `<p class="layers-empty">${escapeHtml(group.emptyMessage || "Nenhum registro.")}</p>`;
        return `
          <div class="layer-group layer-group--tipo${open ? "" : " collapsed"}" data-group-id="${escapeAttr(group.id)}">
            <button type="button" class="layer-group-header layer-group-header--section" aria-expanded="${open ? "true" : "false"}">
              <span class="layer-group-toggle" aria-hidden="true">▼</span>
              <span class="layer-group-name">${escapeHtml(group.label)}</span>
              <span class="layer-group-active-count">${records.length || ""}</span>
            </button>
            <div class="layer-group-body layers-container admin-records-list">${body}</div>
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

    bindRecordClicks(container, options);
  }

  function initSidebarNav(options) {
    initSectionsCollapse(options);
    initSectionNav(options);
  }

  global.SLTAdminDashboard = {
    initSectionNav,
    initSectionsCollapse,
    initRecordsRootCollapse,
    renderRecordsSidebar,
    renderGroupedRecordsSidebar,
    initSidebarNav,
  };
})(window);
