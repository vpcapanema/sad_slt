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

  function init(options) {
    const root =
      typeof options.container === "string"
        ? document.querySelector(options.container)
        : options.container;
    if (!root) return null;

    const fieldSel = root.querySelector(".painel-layer-filter-field");
    const valueSel = root.querySelector(".painel-layer-filter-value");
    const applyBtn = root.querySelector(".painel-layer-filter-btn--apply");
    const clearBtn = root.querySelector(".painel-layer-filter-btn--clear");
    if (!fieldSel || !valueSel || !applyBtn || !clearBtn) return null;

    let activeFilter = null;
    let selectedRawValue = "";

    const helpers = {
      statusLabel: options.statusLabel || ((code) => code),
    };

    fieldSel.innerHTML =
      `<option value="${PLACEHOLDER_VALUE}" disabled hidden>Selecione um campo</option>` +
      FILTER_FIELDS.map(
        (f) => `<option value="${escapeHtml(f.key)}">${escapeHtml(f.label)}</option>`
      ).join("");
    fieldSel.value = PLACEHOLDER_VALUE;

    function syncFieldPlaceholderUi() {
      const empty = !fieldSel.value;
      fieldSel.classList.toggle("is-placeholder", empty);
      fieldSel.classList.toggle("has-selection", !empty);
    }

    function getAllItems() {
      const source = options.getAllItems || options.getItems;
      return (source?.() || []).map((item) => options.normalizeItem?.(item) || item);
    }

    function syncValuePlaceholderUi() {
      const empty = !valueSel.value;
      valueSel.classList.toggle("is-placeholder", empty);
      valueSel.classList.toggle("has-selection", !empty);
    }

    function refreshValueOptions() {
      const field = fieldSel.value;
      if (!field) {
        valueSel.innerHTML = `<option value="${PLACEHOLDER_VALUE}" disabled hidden>Selecione um valor</option>`;
        valueSel.disabled = true;
        selectedRawValue = "";
        valueSel.value = PLACEHOLDER_VALUE;
        syncValuePlaceholderUi();
        return;
      }

      const values = collectFieldValues(getAllItems(), field, helpers);
      const prev = activeFilter?.field === field ? activeFilter.value : selectedRawValue;

      const optionsHtml = values
        .map(
          (v) =>
            `<option value="${escapeHtml(v.raw)}" title="${escapeHtml(v.label)}">${escapeHtml(v.label)}</option>`
        )
        .join("");

      valueSel.innerHTML = `<option value="${PLACEHOLDER_VALUE}" disabled hidden>Selecione um valor</option>${optionsHtml}`;
      valueSel.disabled = !values.length;

      if (!values.length) {
        valueSel.innerHTML = `<option value="${PLACEHOLDER_VALUE}" disabled hidden>Selecione um valor</option><option value="">—</option>`;
        selectedRawValue = "";
        valueSel.value = PLACEHOLDER_VALUE;
        syncValuePlaceholderUi();
        return;
      }

      const hit = values.find((v) => v.raw === prev);
      if (hit) {
        valueSel.value = hit.raw;
        selectedRawValue = hit.raw;
      } else {
        valueSel.value = PLACEHOLDER_VALUE;
        selectedRawValue = "";
      }
      syncValuePlaceholderUi();
    }

    function syncActiveUi() {
      const on = !!(activeFilter?.field && activeFilter.value !== "");
      root.classList.toggle("is-active", on);
    }

    function emitChange() {
      options.onFilterChange?.(activeFilter);
      syncActiveUi();
    }

    fieldSel.addEventListener("change", () => {
      selectedRawValue = "";
      syncFieldPlaceholderUi();
      refreshValueOptions();
    });

    valueSel.addEventListener("change", () => {
      selectedRawValue = valueSel.value || "";
      syncValuePlaceholderUi();
    });

    applyBtn.addEventListener("click", () => {
      const field = fieldSel.value;
      const value = valueSel.value;
      if (!field || !value) return;
      activeFilter = { field, value };
      selectedRawValue = value;
      syncFieldPlaceholderUi();
      syncValuePlaceholderUi();
      emitChange();
    });

    clearBtn.addEventListener("click", () => {
      activeFilter = null;
      selectedRawValue = "";
      fieldSel.value = PLACEHOLDER_VALUE;
      syncFieldPlaceholderUi();
      refreshValueOptions();
      emitChange();
    });

    syncFieldPlaceholderUi();
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
