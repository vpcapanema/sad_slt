(function (global) {
  "use strict";

  const initialized = new WeakSet();
  const originalPositions = new WeakMap();
  const collator = new Intl.Collator("pt-BR", {
    numeric: true,
    sensitivity: "base",
  });
  const excludedClasses = new Set([
    "ahp-matrix-table",
    "ahp-matriz-table",
    "matrix-table",
    "mini-matrix",
    "json-tree",
  ]);
  const interactiveSelector = "button, a, input, select, textarea";

  function directRows(section) {
    return section ? Array.from(section.rows) : [];
  }

  function bodyRows(table) {
    return Array.from(table.tBodies).flatMap(directRows);
  }

  function headerCells(table) {
    const rows = directRows(table.tHead);
    if (!rows.length) return [];
    const cells = Array.from(rows[rows.length - 1].cells);
    if (cells.some((cell) => cell.colSpan !== 1 || cell.rowSpan !== 1)) return [];
    return cells;
  }

  function hasExcludedClass(table) {
    return Array.from(table.classList).some((name) => excludedClasses.has(name));
  }

  function canEnhance(table) {
    if (!(table instanceof HTMLTableElement)) return false;
    if (table.dataset.tableSort === "off" || table.dataset.sortable === "false") return false;
    if (hasExcludedClass(table) || table.querySelector("thead th.sortable")) return false;
    const headers = headerCells(table);
    if (!headers.length) return false;
    const rows = bodyRows(table).filter((row) => {
      return row.cells.length === headers.length &&
        Array.from(row.cells).every((cell) => cell.colSpan === 1 && cell.rowSpan === 1);
    });
    if (!rows.length) return false;
    if (rows.some((row) => row.querySelector(":scope > th"))) return false;
    return true;
  }

  function cellAt(row, index) {
    const cell = row.cells[index];
    if (!cell || cell.colSpan !== 1 || cell.rowSpan !== 1) return null;
    return cell;
  }

  function cellText(cell) {
    if (!cell) return "";
    if (cell.dataset.sortValue != null) return cell.dataset.sortValue.trim();
    const control = cell.querySelector("input, select, textarea");
    if (control instanceof HTMLInputElement && control.type === "checkbox") {
      return control.checked ? "1" : "0";
    }
    if (control && "value" in control) return String(control.value || "").trim();
    const time = cell.querySelector("time[datetime]");
    if (time) return time.getAttribute("datetime") || "";
    return (cell.textContent || "").replace(/\s+/g, " ").trim();
  }

  function isEmpty(value) {
    return !value || value === "-" || value === "—" || value.toLowerCase() === "null";
  }

  function parseNumber(value) {
    let normalized = value
      .replace(/\u00a0/g, " ")
      .replace(/[^\d.,+\-()%]/g, "")
      .replace(/%$/, "");
    if (!normalized || !/\d/.test(normalized)) return null;
    const negative = /^\(.*\)$/.test(normalized);
    normalized = normalized.replace(/[()]/g, "");
    const comma = normalized.lastIndexOf(",");
    const dot = normalized.lastIndexOf(".");
    if (comma > dot) normalized = normalized.replace(/\./g, "").replace(",", ".");
    else if (dot > comma && comma >= 0) normalized = normalized.replace(/,/g, "");
    else if (comma >= 0) normalized = normalized.replace(",", ".");
    const number = Number(normalized);
    return Number.isFinite(number) ? (negative ? -number : number) : null;
  }

  function parseDate(value) {
    const brazilian = value.match(
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ ,T]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/
    );
    if (brazilian) {
      return Date.UTC(
        Number(brazilian[3]),
        Number(brazilian[2]) - 1,
        Number(brazilian[1]),
        Number(brazilian[4] || 0),
        Number(brazilian[5] || 0),
        Number(brazilian[6] || 0)
      );
    }
    if (!/^\d{4}-\d{2}-\d{2}(?:[T ]|$)/.test(value)) return null;
    const timestamp = Date.parse(value);
    return Number.isNaN(timestamp) ? null : timestamp;
  }

  function detectType(values) {
    const populated = values.filter((value) => !isEmpty(value));
    if (!populated.length) return "text";
    if (populated.every((value) => parseDate(value) != null)) return "date";
    if (populated.every((value) => parseNumber(value) != null)) return "number";
    return "text";
  }

  function compareValues(left, right, type, direction) {
    const leftEmpty = isEmpty(left);
    const rightEmpty = isEmpty(right);
    if (leftEmpty || rightEmpty) {
      if (leftEmpty && rightEmpty) return 0;
      return leftEmpty ? 1 : -1;
    }
    let result;
    if (type === "number") result = parseNumber(left) - parseNumber(right);
    else if (type === "date") result = parseDate(left) - parseDate(right);
    else result = collator.compare(left, right);
    return direction === "descending" ? -result : result;
  }

  function rememberOriginalRows(table) {
    bodyRows(table).forEach((row, index) => {
      if (!originalPositions.has(row)) originalPositions.set(row, index);
    });
  }

  function sortableRows(tbody, columnIndex, columnCount) {
    return directRows(tbody).filter((row) => {
      return row.cells.length === columnCount && cellAt(row, columnIndex);
    });
  }

  function restoreOriginal(table) {
    Array.from(table.tBodies).forEach((tbody) => {
      const rows = directRows(tbody);
      rows.sort((left, right) => {
        return (originalPositions.get(left) ?? 0) - (originalPositions.get(right) ?? 0);
      });
      rows.forEach((row) => tbody.appendChild(row));
    });
  }

  function sortTable(table, columnIndex, direction) {
    const headers = headerCells(table);
    rememberOriginalRows(table);
    if (direction === "none") {
      restoreOriginal(table);
      return;
    }
    Array.from(table.tBodies).forEach((tbody) => {
      const rows = sortableRows(tbody, columnIndex, headers.length);
      const values = rows.map((row) => cellText(cellAt(row, columnIndex)));
      const type = detectType(values);
      rows
        .map((row, index) => ({ row, index, value: cellText(cellAt(row, columnIndex)) }))
        .sort((left, right) => {
          return compareValues(left.value, right.value, type, direction) || left.index - right.index;
        })
        .forEach(({ row }) => tbody.appendChild(row));
    });
  }

  function nextDirection(current) {
    if (current === "ascending") return "descending";
    if (current === "descending") return "none";
    return "ascending";
  }

  function columnHasSortableValues(table, index) {
    const cells = bodyRows(table).map((row) => cellAt(row, index)).filter(Boolean);
    if (!cells.length) return false;
    return cells.some((cell) => {
      if (cell.dataset.sortValue != null) return true;
      const clone = cell.cloneNode(true);
      clone.querySelectorAll("button, input, select, textarea").forEach((control) => control.remove());
      return !isEmpty((clone.textContent || "").replace(/\s+/g, " ").trim());
    });
  }

  function activateHeader(table, header, index, headers) {
    if (header.dataset.sort === "off" || header.querySelector(interactiveSelector)) return;
    if (!columnHasSortableValues(table, index)) return;
    header.classList.add("slt-sortable-column");
    header.tabIndex = 0;
    header.setAttribute("role", "button");
    header.setAttribute("aria-sort", "none");
    header.title = `Ordenar por ${(header.textContent || `coluna ${index + 1}`).trim()}`;

    const order = () => {
      const direction = nextDirection(header.getAttribute("aria-sort"));
      headers.forEach((item) => {
        if (item !== header) item.setAttribute("aria-sort", "none");
      });
      header.setAttribute("aria-sort", direction);
      sortTable(table, index, direction);
    };
    header.addEventListener("click", (event) => {
      if (event.target !== header && event.target.closest(interactiveSelector)) return;
      order();
    });
    header.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      order();
    });
  }

  function enhanceTable(table) {
    if (initialized.has(table) || !canEnhance(table)) return false;
    const headers = headerCells(table);
    initialized.add(table);
    table.dataset.tableSortReady = "true";
    rememberOriginalRows(table);
    headers.forEach((header, index) => activateHeader(table, header, index, headers));
    return true;
  }

  function enhanceWithin(root) {
    if (root instanceof Element) enhanceTable(root.closest("table"));
    if (root.querySelectorAll) root.querySelectorAll("table").forEach(enhanceTable);
  }

  function start() {
    enhanceWithin(document);
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof Element) enhanceWithin(node);
        });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  global.SLTTableSort = { enhanceTable, enhanceWithin, sortTable };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})(window);