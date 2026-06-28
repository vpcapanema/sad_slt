(function (global) {
  const FILTER_FIELDS = [
    { key: "status", label: "Status" },
    { key: "nome", label: "Nome" },
    { key: "plano", label: "Plano" },
    { key: "programa", label: "Programa" },
    { key: "abrangencia", label: "Abrangência" },
    { key: "instituicao", label: "Instituição" },
  ];

  const PLACEHOLDER_VALUE = "";

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function norm(value) {
    return String(value ?? "")
      .trim()
      .toLowerCase();
  }

  function fieldValue(item, fieldKey) {
    if (!item) return "";
    switch (fieldKey) {
      case "status":
        return item.status || "";
      case "nome":
        return item.nome || "";
      case "plano":
        if (item.tipo === "plano") return item.nome || item.plano_nome || item.plano_codigo || "";
        return item.plano_nome || item.plano_codigo || "";
      case "programa":
        if (item.tipo === "programa") return item.nome || item.programa_nome || "";
        return item.programa_nome || "";
      case "abrangencia":
        return Array.isArray(item.abrangencia) ? item.abrangencia.join(", ") : "";
      case "instituicao":
        return item.instituicao_label || "";
      default:
        return "";
    }
  }

  function formatValue(fieldKey, value, helpers) {
    const raw = String(value ?? "").trim();
    if (!raw) return "";
    if (fieldKey === "status" && helpers?.statusLabel) {
      return helpers.statusLabel(raw) || raw;
    }
    return raw;
  }

  function addCollectedValue(map, fieldKey, raw, helpers) {
    const trimmed = String(raw ?? "").trim();
    if (!trimmed) return;
    const key = norm(trimmed);
    if (map.has(key)) return;
    map.set(key, { key, raw: trimmed, label: formatValue(fieldKey, trimmed, helpers) });
  }

  function collectFieldValues(items, fieldKey, helpers) {
    const map = new Map();

    (items || []).forEach((item) => {
      if (fieldKey === "abrangencia" && Array.isArray(item.abrangencia)) {
        item.abrangencia.forEach((unit) => addCollectedValue(map, fieldKey, unit, helpers));
        addCollectedValue(map, fieldKey, item.abrangencia.join(", "), helpers);
        return;
      }
      addCollectedValue(map, fieldKey, fieldValue(item, fieldKey), helpers);
    });

    return [...map.values()].sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
  }

  function matchesFieldValue(item, fieldKey, filterValue) {
    const fv = norm(filterValue);
    if (!fv) return true;

    if (fieldKey === "abrangencia" && Array.isArray(item.abrangencia)) {
      return (
        item.abrangencia.some((unit) => norm(unit) === fv) ||
        norm(item.abrangencia.join(", ")) === fv
      );
    }

    return norm(fieldValue(item, fieldKey)) === fv;
  }

  function matches(item, activeFilter) {
    if (!activeFilter?.field || activeFilter.value == null || activeFilter.value === "") return true;
    return matchesFieldValue(item, activeFilter.field, activeFilter.value);
  }

  function filterItems(items, activeFilter) {
    if (!activeFilter?.field || activeFilter.value == null || activeFilter.value === "") return items || [];
    return (items || []).filter((item) => matches(item, activeFilter));
  }

  const openDropdowns = new Set();

  function closeAllDropdowns(except) {
    openDropdowns.forEach((dd) => {
      if (dd !== except) dd.close();
    });
  }

  if (typeof document !== "undefined") {
    document.addEventListener("click", (e) => {
      openDropdowns.forEach((dd) => {
        if (!dd.el.contains(e.target)) dd.close();
      });
    });
  }

  /**
   * Dropdown customizado (substitui o <select> nativo, que o Windows/Chrome
   * renderiza de forma inconsistente). Mantém as classes do <select> original
   * para herdar exatamente o mesmo CSS — garantindo campo e valor idênticos.
   */
  function createDropdown(originalEl, config) {
    const cfg = config || {};
    const root = document.createElement("div");
    root.className = `slt-dd ${originalEl.className}`.trim();
    root.tabIndex = 0;
    root.setAttribute("role", "combobox");
    root.setAttribute("aria-haspopup", "listbox");
    root.setAttribute("aria-expanded", "false");
    if (cfg.ariaLabel) root.setAttribute("aria-label", cfg.ariaLabel);
    root.innerHTML =
      `<span class="slt-dd-label"></span>` +
      `<span class="slt-dd-arrow" aria-hidden="true"></span>` +
      `<ul class="slt-dd-list" role="listbox" hidden></ul>`;
    originalEl.replaceWith(root);

    const labelEl = root.querySelector(".slt-dd-label");
    const listEl = root.querySelector(".slt-dd-list");

    let items = [];
    let value = "";
    let disabled = false;
    let placeholder = cfg.placeholder || "";
    let onChange = cfg.onChange || (() => {});

    function selected() {
      return items.find((it) => it.value === value) || null;
    }

    function syncLabel() {
      const sel = selected();
      const isPlaceholder = !sel;
      labelEl.textContent = sel ? sel.label : placeholder;
      root.classList.toggle("is-placeholder", isPlaceholder);
      root.classList.toggle("has-selection", !isPlaceholder);
    }

    function renderList() {
      if (!items.length) {
        listEl.innerHTML = `<li class="slt-dd-empty" aria-disabled="true">—</li>`;
        return;
      }
      listEl.innerHTML = items
        .map(
          (it) =>
            `<li class="slt-dd-option${it.value === value ? " is-active" : ""}" role="option" data-value="${escapeHtml(
              it.value
            )}" title="${escapeHtml(it.label)}">${escapeHtml(it.label)}</li>`
        )
        .join("");
    }

    function open() {
      if (disabled || !items.length) return;
      closeAllDropdowns(api);
      renderList();
      listEl.hidden = false;
      root.classList.add("is-open");
      root.setAttribute("aria-expanded", "true");
      openDropdowns.add(api);
    }

    function close() {
      listEl.hidden = true;
      root.classList.remove("is-open");
      root.setAttribute("aria-expanded", "false");
      openDropdowns.delete(api);
    }

    function toggle() {
      if (listEl.hidden) open();
      else close();
    }

    root.addEventListener("click", (e) => {
      const opt = e.target.closest(".slt-dd-option");
      if (opt) {
        const next = opt.getAttribute("data-value") || "";
        close();
        if (next !== value) {
          value = next;
          syncLabel();
          onChange(value);
        }
        return;
      }
      toggle();
    });

    root.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggle();
      } else if (e.key === "Escape") {
        close();
      }
    });

    const api = {
      el: root,
      close,
      setOptions(list) {
        items = list || [];
        if (!items.some((it) => it.value === value)) value = "";
        renderList();
        syncLabel();
      },
      setValue(v) {
        value = v || "";
        renderList();
        syncLabel();
      },
      getValue() {
        return value;
      },
      setDisabled(d) {
        disabled = !!d;
        root.classList.toggle("is-disabled", disabled);
        if (disabled) close();
      },
      setPlaceholder(p) {
        placeholder = p || "";
        syncLabel();
      },
    };

    syncLabel();
    return api;
  }

  function init(options) {
    const root =
      typeof options.container === "string"
        ? document.querySelector(options.container)
        : options.container;
    if (!root) return null;

    const fieldOriginal = root.querySelector(".painel-layer-filter-field");
    const valueOriginal = root.querySelector(".painel-layer-filter-value");
    const applyBtn = root.querySelector(".painel-layer-filter-btn--apply");
    const clearBtn = root.querySelector(".painel-layer-filter-btn--clear");
    if (!fieldOriginal || !valueOriginal || !applyBtn || !clearBtn) return null;

    let activeFilter = null;
    let selectedRawValue = "";

    const helpers = {
      statusLabel: options.statusLabel || ((code) => code),
    };

    const fieldDD = createDropdown(fieldOriginal, {
      placeholder: "Selecione um campo",
      ariaLabel: "Campo do filtro",
      onChange: () => {
        selectedRawValue = "";
        refreshValueOptions();
      },
    });
    fieldDD.setOptions(FILTER_FIELDS.map((f) => ({ value: f.key, label: f.label })));

    const valueDD = createDropdown(valueOriginal, {
      placeholder: "Selecione um valor",
      ariaLabel: "Valor do filtro",
      onChange: (v) => {
        selectedRawValue = v || "";
      },
    });
    valueDD.setDisabled(true);

    function getAllItems() {
      const source = options.getAllItems || options.getItems;
      return (source?.() || []).map((item) => options.normalizeItem?.(item) || item);
    }

    function refreshValueOptions() {
      const field = fieldDD.getValue();
      if (!field) {
        valueDD.setOptions([]);
        valueDD.setValue("");
        valueDD.setDisabled(true);
        selectedRawValue = "";
        return;
      }

      const values = collectFieldValues(getAllItems(), field, helpers);
      const prev = activeFilter?.field === field ? activeFilter.value : selectedRawValue;

      valueDD.setOptions(values.map((v) => ({ value: v.raw, label: v.label })));
      valueDD.setDisabled(!values.length);

      const hit = values.find((v) => v.raw === prev);
      if (hit) {
        valueDD.setValue(hit.raw);
        selectedRawValue = hit.raw;
      } else {
        valueDD.setValue("");
        selectedRawValue = "";
      }
    }

    function syncActiveUi() {
      const on = !!(activeFilter?.field && activeFilter.value !== "");
      root.classList.toggle("is-active", on);
    }

    function emitChange() {
      options.onFilterChange?.(activeFilter);
      syncActiveUi();
    }

    applyBtn.addEventListener("click", () => {
      const field = fieldDD.getValue();
      const value = valueDD.getValue();
      if (!field || !value) return;
      activeFilter = { field, value };
      selectedRawValue = value;
      emitChange();
    });

    clearBtn.addEventListener("click", () => {
      activeFilter = null;
      selectedRawValue = "";
      fieldDD.setValue("");
      refreshValueOptions();
      emitChange();
    });

    refreshValueOptions();
    syncActiveUi();

    return {
      refresh() {
        refreshValueOptions();
      },
      getFilter() {
        return activeFilter;
      },
      setItemsRefresh() {
        refreshValueOptions();
        if (activeFilter) emitChange();
      },
    };
  }

  global.SLTPainelLayerFilter = {
    FILTER_FIELDS,
    fieldValue,
    formatValue,
    matches,
    filterItems,
    init,
  };
})(window);
