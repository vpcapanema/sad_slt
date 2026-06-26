/**
 * Tabela de Premissas e Critérios — parse, persistência e renderização.
 */
(function (global) {
  "use strict";

  var STORAGE_ROWS = "slt_ahp_matriz_premissas";
  var STORAGE_FILE = "slt_ahp_matriz_arquivo_nome";
  var SHEET_NAMES = [
    "Tabela de Premissas e Criterios",
    "Tabela de Premissas e Critérios",
    "Matriz de Criterios e Premissas",
    "Matriz de Critérios e Premissas",
  ];

  var COLUMNS = [
    { key: "dimensao", label: "Dimensão" },
    { key: "criterio", label: "Critério" },
    { key: "premissa", label: "Premissa" },
    { key: "relacao", label: "Relação" },
    { key: "metricas", label: "Métricas" },
    { key: "fonte", label: "Fonte" },
    { key: "mandatorio", label: "Mandatório" },
  ];

  var HEADER_MAP = {
    dimensao: "dimensao",
    dimensão: "dimensao",
    criterio: "criterio",
    critério: "criterio",
    premissa: "premissa",
    relacao: "relacao",
    relação: "relacao",
    metricas: "metricas",
    métricas: "metricas",
    fonte: "fonte",
    mandatorio: "mandatorio",
    mandatório: "mandatorio",
  };

  function normHeader(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function escapeHtml(text) {
    return String(text || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function parseCsvLine(line) {
    var result = [];
    var cur = "";
    var inQuotes = false;
    for (var i = 0; i < line.length; i++) {
      var ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === "," && !inQuotes) {
        result.push(cur.trim());
        cur = "";
      } else {
        cur += ch;
      }
    }
    result.push(cur.trim());
    return result;
  }

  function mapHeaderIndexes(headers) {
    var indexes = {};
    headers.forEach(function (header, idx) {
      var key = HEADER_MAP[normHeader(header)];
      if (key && indexes[key] === undefined) {
        indexes[key] = idx;
      }
    });
    if (indexes.criterio === undefined) {
      throw new Error("Coluna «Critério» não encontrada no cabeçalho.");
    }
    if (indexes.premissa === undefined) {
      throw new Error("Coluna «Premissa» não encontrada no cabeçalho.");
    }
    return indexes;
  }

  function rowFromValues(values, indexes, lineNo) {
    function cell(key) {
      var idx = indexes[key];
      if (idx === undefined) return "";
      return String(values[idx] || "").trim();
    }

    var criterio = cell("criterio");
    var premissa = cell("premissa");
    if (!criterio && !premissa && !cell("dimensao")) {
      return null;
    }
    if (!criterio) {
      throw new Error("Linha " + lineNo + ": critério obrigatório.");
    }
    if (!premissa) {
      throw new Error("Linha " + lineNo + ": premissa obrigatória para «" + criterio + "».");
    }

    return {
      dimensao: cell("dimensao"),
      criterio: criterio,
      premissa: premissa,
      relacao: cell("relacao"),
      metricas: cell("metricas"),
      fonte: cell("fonte"),
      mandatorio: cell("mandatorio"),
    };
  }

  function parseRowsFromMatrix(matrix) {
    if (!matrix || !matrix.length) {
      throw new Error("Planilha vazia.");
    }
    var headers = matrix[0].map(function (v) {
      return String(v || "").trim();
    });
    var indexes = mapHeaderIndexes(headers);
    var rows = [];

    for (var i = 1; i < matrix.length; i++) {
      var values = matrix[i].map(function (v) {
        return v == null ? "" : String(v).trim();
      });
      var row = rowFromValues(values, indexes, i + 1);
      if (row) rows.push(row);
    }

    if (!rows.length) {
      throw new Error("Nenhuma linha válida encontrada na matriz.");
    }
    return rows;
  }

  function parseCsvContent(content) {
    var lines = content
      .replace(/^\uFEFF/, "")
      .split(/\r?\n/)
      .filter(function (line) {
        return line.trim() && !line.trim().startsWith("#");
      });
    if (lines.length < 2) {
      throw new Error("CSV inválido: inclua cabeçalho e ao menos uma linha de dados.");
    }
    var matrix = lines.map(parseCsvLine);
    return parseRowsFromMatrix(matrix);
  }

  function findSheet(workbook) {
    for (var i = 0; i < SHEET_NAMES.length; i++) {
      if (workbook.Sheets[SHEET_NAMES[i]]) {
        return workbook.Sheets[SHEET_NAMES[i]];
      }
    }
    var names = workbook.SheetNames || [];
    for (var j = 0; j < names.length; j++) {
      var name = names[j];
      if (/matriz/i.test(name) && /criter/i.test(name)) {
        return workbook.Sheets[name];
      }
    }
    if (names[0]) {
      return workbook.Sheets[names[0]];
    }
    throw new Error("Nenhuma aba encontrada no arquivo XLSX.");
  }

  function parseXlsxArrayBuffer(buffer) {
    if (typeof global.XLSX === "undefined") {
      throw new Error("Biblioteca XLSX não carregada.");
    }
    var workbook = global.XLSX.read(buffer, { type: "array" });
    var sheet = findSheet(workbook);
    var matrix = global.XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: "",
      raw: false,
    });
    return parseRowsFromMatrix(matrix);
  }

  function loadMatrizPremissas() {
    try {
      var raw = global.localStorage.getItem(STORAGE_ROWS);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_err) {
      return [];
    }
  }

  function loadMatrizArquivoNome() {
    return global.localStorage.getItem(STORAGE_FILE) || "";
  }

  function saveMatrizPremissas(rows, fileName) {
    global.localStorage.setItem(STORAGE_ROWS, JSON.stringify(rows));
    if (fileName) {
      global.localStorage.setItem(STORAGE_FILE, fileName);
    }
  }

  function clearMatrizPremissas() {
    global.localStorage.removeItem(STORAGE_ROWS);
    global.localStorage.removeItem(STORAGE_FILE);
  }

  function summarize(rows) {
    var dims = {};
    var mand = 0;
    rows.forEach(function (row) {
      if (row.dimensao) dims[row.dimensao] = true;
      if (/^sim$/i.test(row.mandatorio)) mand++;
    });
    return {
      total: rows.length,
      dimensoes: Object.keys(dims).length,
      mandatorios: mand,
    };
  }

  function renderMandatorio(value) {
    if (/^sim$/i.test(value)) {
      return '<span class="ahp-matriz-badge ahp-matriz-badge--sim">Sim</span>';
    }
    if (/^n(ao|ão)?$/i.test(value)) {
      return '<span class="ahp-matriz-badge ahp-matriz-badge--nao">Não</span>';
    }
    return escapeHtml(value || "—");
  }

  function renderRelacao(value) {
    if (!value) return "—";
    return '<span class="ahp-matriz-relacao">' + escapeHtml(value) + "</span>";
  }

  function renderMatrizPremissasPanel(container, options) {
    if (!container) return;

    var rows = (options && options.rows) || loadMatrizPremissas();
    var fileName = (options && options.fileName) || loadMatrizArquivoNome();
    var inputMethod = global.localStorage.getItem("ahp_inputMethod") || "manual";

    if (!rows.length) {
      container.innerHTML =
        '<div class="ahp-matriz-empty">' +
        '<div class="ahp-matriz-empty__icon"><i class="fas fa-file-circle-xmark" aria-hidden="true"></i></div>' +
        "<h3>Nenhuma tabela importada</h3>" +
        (inputMethod === "upload_matriz"
          ? "<p>Os dados do upload não foram encontrados. Volte à Etapa 1 e envie novamente o arquivo XLSX ou CSV.</p>"
          : "<p>Na Etapa 1 você escolheu o método manual. Para visualizar a Tabela de Premissas e Critérios, use <strong>Upload de Tabela</strong> na Etapa 1.</p>") +
        '<div class="ahp-matriz-empty__actions">' +
        '<a href="step1-criterios.html" class="btn btn-secondary"><i class="fas fa-arrow-left"></i> Etapa 1</a>' +
        "</div></div>";
      return;
    }

    var summary = summarize(rows);
    var dims = [];
    rows.forEach(function (row) {
      if (row.dimensao && dims.indexOf(row.dimensao) === -1) {
        dims.push(row.dimensao);
      }
    });
    dims.sort();

    var filterId = "matriz-dim-filter-" + Math.random().toString(36).slice(2, 8);

    var html =
      '<div class="ahp-matriz-panel">' +
      '<div class="ahp-matriz-meta">' +
      '<div class="ahp-matriz-meta__item"><div class="ahp-matriz-meta__head"><i class="fas fa-file-lines"></i><span class="ahp-matriz-meta__title">Arquivo</span></div><div class="ahp-matriz-meta__value">' +
      escapeHtml(fileName || "Tabela importada") +
      "</div></div>" +
      '<div class="ahp-matriz-meta__item"><div class="ahp-matriz-meta__head"><i class="fas fa-list-ol"></i><span class="ahp-matriz-meta__title">Critérios</span></div><div class="ahp-matriz-meta__value">' +
      summary.total +
      "</div></div>" +
      '<div class="ahp-matriz-meta__item"><div class="ahp-matriz-meta__head"><i class="fas fa-layer-group"></i><span class="ahp-matriz-meta__title">Dimensões</span></div><div class="ahp-matriz-meta__value">' +
      summary.dimensoes +
      "</div></div>" +
      '<div class="ahp-matriz-meta__item"><div class="ahp-matriz-meta__head"><i class="fas fa-star"></i><span class="ahp-matriz-meta__title">Mandatórios</span></div><div class="ahp-matriz-meta__value">' +
      summary.mandatorios +
      "</div></div>" +
      "</div>" +
      '<div class="ahp-matriz-toolbar">' +
      '<label for="' +
      filterId +
      '">Filtrar por dimensão</label>' +
      '<select id="' +
      filterId +
      '" class="c-form-control ahp-matriz-filter">' +
      '<option value="">Todas as dimensões</option>';

    dims.forEach(function (dim) {
      html +=
        '<option value="' + escapeHtml(dim) + '">' + escapeHtml(dim) + "</option>";
    });

    html +=
      "</select></div>" +
      '<div class="ahp-matriz-table-wrap">' +
      '<table class="ahp-matriz-table" aria-label="Tabela de premissas e critérios">' +
      "<thead><tr>";

    COLUMNS.forEach(function (col) {
      html += "<th scope=\"col\">" + col.label + "</th>";
    });

    html += "</tr></thead><tbody>";

    rows.forEach(function (row, idx) {
      html +=
        '<tr data-dim="' +
        escapeHtml(row.dimensao) +
        '" data-row-idx="' +
        idx +
        '">';
      html += '<td class="ahp-matriz-dim">' + escapeHtml(row.dimensao || "—") + "</td>";
      html += "<td><strong>" + escapeHtml(row.criterio) + "</strong></td>";
      html += '<td class="ahp-matriz-premissa">' + escapeHtml(row.premissa) + "</td>";
      html += "<td>" + renderRelacao(row.relacao) + "</td>";
      html += '<td class="ahp-matriz-metricas">' + escapeHtml(row.metricas || "—") + "</td>";
      html += '<td class="ahp-matriz-fonte">' + escapeHtml(row.fonte || "—") + "</td>";
      html += "<td>" + renderMandatorio(row.mandatorio) + "</td>";
      html += "</tr>";
    });

    html += "</tbody></table></div></div>";
    container.innerHTML = html;

    var filter = container.querySelector("#" + filterId);
    if (filter) {
      filter.addEventListener("change", function () {
        var value = filter.value;
        container.querySelectorAll(".ahp-matriz-table tbody tr").forEach(function (tr) {
          var dim = tr.getAttribute("data-dim") || "";
          tr.hidden = value !== "" && dim !== value;
        });
      });
    }
  }

  global.SltMatrizPremissas = {
    COLUMNS: COLUMNS,
    STORAGE_ROWS: STORAGE_ROWS,
    STORAGE_FILE: STORAGE_FILE,
    parseCsvContent: parseCsvContent,
    parseXlsxArrayBuffer: parseXlsxArrayBuffer,
    loadMatrizPremissas: loadMatrizPremissas,
    loadMatrizArquivoNome: loadMatrizArquivoNome,
    saveMatrizPremissas: saveMatrizPremissas,
    clearMatrizPremissas: clearMatrizPremissas,
    summarize: summarize,
    renderMatrizPremissasPanel: renderMatrizPremissasPanel,
  };
})(window);
