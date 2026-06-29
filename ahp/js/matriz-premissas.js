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

  // Vocabulários controlados (espelham o modelo XLSX / export_matriz_excel.py).
  var DIMENSOES = [
    "Técnica",
    "Financeiro",
    "Econômica",
    "Social",
    "Segurança",
    "Ambiental",
    "Territorial",
    "Institucional",
    "Risco",
  ];
  var RELACOES = ["↑ Positiva", "↓ Negativa", "↕ Condicional"];
  var MANDATORIOS = ["Sim", "Não"];

  var PLACEHOLDERS = {
    criterio: "Ex.: VDM — Volume Diário Médio",
    premissa: "Por que o critério importa (lógica da decisão)",
    metricas: "Como medir (unidade, escala, fonte do dado)",
    fonte: "https://… ou referência/norma",
  };

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

  function normalizarRow(row) {
    if (global.SLTAhpTextoPt && global.SLTAhpTextoPt.normalizarLinhaMatriz) {
      return global.SLTAhpTextoPt.normalizarLinhaMatriz(row);
    }
    return row;
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
      if (row) rows.push(normalizarRow(row));
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
    if (global.SLTAhpTextoPt && global.SLTAhpTextoPt.normalizarLinhasMatriz) {
      rows = global.SLTAhpTextoPt.normalizarLinhasMatriz(rows);
    }
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
        '<a href="step2-criterios.html" class="btn btn-secondary"><i class="fas fa-arrow-left"></i> Etapa 2</a>' +
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
      '<div class="ahp-matriz-meta__item"><div class="ahp-matriz-meta__head"><i class="fas fa-database"></i><span class="ahp-matriz-meta__title">Origem</span></div><div class="ahp-matriz-meta__value">' +
      escapeHtml(inputMethod === "upload_matriz" ? "Upload de arquivo" : "Entrada manual") +
      (inputMethod === "upload_matriz" && fileName ? " <small>(" + escapeHtml(fileName) + ")</small>" : "") +
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

  // -------------------------------------------------------------------------
  // Editor — edição do conteúdo da matriz (valores das células + add/remover
  // linhas), mantendo as 7 colunas fixas.
  // -------------------------------------------------------------------------
  var EDITABLE_COLUMNS = ["dimensao", "criterio", "premissa", "relacao", "metricas", "fonte"];

  // Dropdown de vocabulário controlado. Se o valor atual (ex.: vindo de upload)
  // não constar na lista, é preservado como uma opção extra selecionada.
  function buildSelect(key, value, list) {
    var v = String(value == null ? "" : value).trim();
    var opts = '<option value="">—</option>';
    var found = false;
    list.forEach(function (item) {
      var sel = normHeader(item) === normHeader(v) ? " selected" : "";
      if (sel) found = true;
      opts += '<option value="' + escapeHtml(item) + '"' + sel + ">" + escapeHtml(item) + "</option>";
    });
    if (v && !found) {
      opts += '<option value="' + escapeHtml(value) + '" selected>' + escapeHtml(value) + "</option>";
    }
    return (
      '<select class="c-form-control ahp-matriz-edit-input" data-key="' + key + '">' + opts + "</select>"
    );
  }

  function cellEditor(key, value) {
    if (key === "dimensao") return buildSelect("dimensao", value, DIMENSOES);
    if (key === "relacao") return buildSelect("relacao", value, RELACOES);
    if (key === "mandatorio") return buildSelect("mandatorio", value, MANDATORIOS);

    var type = "text";
    var maxlen = key === "premissa" ? 600 : key === "criterio" ? 160 : 240;
    var ph = PLACEHOLDERS[key] || "";
    return (
      '<input type="' + type + '" class="c-form-control ahp-matriz-edit-input" data-key="' + key +
      '" maxlength="' + maxlen + '" placeholder="' + escapeHtml(ph) + '" value="' + escapeHtml(value) + '">'
    );
  }

  // Máscara de formato de dado (normalização) — aplicada no blur para não
  // atrapalhar a digitação; a formatação visual (field-filled) é independente.
  function normalizeText(value, capitalize) {
    var v = String(value || "").replace(/\s+/g, " ").trim();
    if (capitalize && v) v = v.charAt(0).toUpperCase() + v.slice(1);
    return v;
  }

  function attachMasks(scope) {
    scope.querySelectorAll("input.ahp-matriz-edit-input[data-key]").forEach(function (inp) {
      if (inp.__maskBound) return;
      inp.__maskBound = true;
      var key = inp.getAttribute("data-key");
      inp.addEventListener("blur", function () {
        inp.value = normalizeText(inp.value, key === "criterio" || key === "premissa");
        if (global.SLTFieldFilled) global.SLTFieldFilled.sync(inp);
      });
    });
  }

  function editorRowHtml(row) {
    var html = '<tr class="ahp-matriz-edit-row">';
    COLUMNS.forEach(function (col) {
      html += '<td data-col="' + col.key + '">' + cellEditor(col.key, row[col.key]) + "</td>";
    });
    html +=
      '<td class="ahp-matriz-edit-actions">' +
      '<button type="button" class="ahp-matriz-row-remove" title="Remover critério" aria-label="Remover critério">' +
      '<i class="fas fa-trash" aria-hidden="true"></i></button></td>';
    html += "</tr>";
    return html;
  }

  function collectEditorRows(container) {
    var rows = [];
    container.querySelectorAll(".ahp-matriz-edit-row").forEach(function (tr) {
      var row = {};
      tr.querySelectorAll(".ahp-matriz-edit-input").forEach(function (input) {
        row[input.getAttribute("data-key")] = String(input.value || "").trim();
      });
      COLUMNS.forEach(function (col) {
        if (row[col.key] === undefined) row[col.key] = "";
      });
      rows.push(row);
    });
    return rows;
  }

  // requireFull = entrada manual: além de critério/premissa, exige dimensão,
  // relação e mandatório (cerne conceitual). Em upload, mantém o mínimo.
  function validateRows(rows, requireFull) {
    if (!rows.length) {
      return "Inclua ao menos um critério.";
    }
    var nomes = [];
    for (var i = 0; i < rows.length; i++) {
      var n = i + 1;
      var r = rows[i];
      if (!r.criterio) {
        return "Linha " + n + ": o critério é obrigatório.";
      }
      if (!r.premissa) {
        return "Linha " + n + ": a premissa é obrigatória para «" + r.criterio + "».";
      }
      if (requireFull) {
        if (!r.dimensao) return "Linha " + n + ": selecione a dimensão de «" + r.criterio + "».";
        if (!r.relacao) return "Linha " + n + ": selecione a relação de «" + r.criterio + "».";
        if (!r.mandatorio) return "Linha " + n + ": informe se «" + r.criterio + "» é mandatório.";
      }
      if (nomes.indexOf(r.criterio) !== -1) {
        return "Critério duplicado: «" + r.criterio + "». Use nomes únicos.";
      }
      nomes.push(r.criterio);
    }
    return null;
  }

  function emptyRow() {
    return { dimensao: "", criterio: "", premissa: "", relacao: "", metricas: "", fonte: "", mandatorio: "" };
  }

  function renderMatrizPremissasEditor(container, options) {
    if (!container) return;
    options = options || {};
    var rows = (options && options.rows && options.rows.slice()) || loadMatrizPremissas();
    var fileName = options.fileName || loadMatrizArquivoNome();
    if (!rows.length) rows = [emptyRow()];

    var inputMethod = global.localStorage.getItem("ahp_inputMethod") || "manual";
    var isUpload = inputMethod === "upload_matriz";
    var requireFull = !isUpload;
    var origem = isUpload ? "Upload de arquivo" : "Entrada manual";

    var headHtml = "";
    COLUMNS.forEach(function (col) {
      headHtml += '<th scope="col">' + col.label + "</th>";
    });
    headHtml += '<th scope="col" class="ahp-matriz-edit-actions-head" aria-label="Ações"></th>';

    var bodyHtml = rows.map(editorRowHtml).join("");

    container.innerHTML =
      '<div class="ahp-matriz-panel ahp-matriz-panel--edit">' +
      '<div class="ahp-matriz-meta">' +
      '<div class="ahp-matriz-meta__item"><div class="ahp-matriz-meta__head"><i class="fas fa-database"></i>' +
      '<span class="ahp-matriz-meta__title">Origem</span></div>' +
      '<div class="ahp-matriz-meta__value">' + escapeHtml(origem) +
      (isUpload && fileName ? ' <small>(' + escapeHtml(fileName) + ")</small>" : "") + "</div></div>" +
      '<div class="ahp-matriz-meta__item"><div class="ahp-matriz-meta__head"><i class="fas fa-list-ol"></i>' +
      '<span class="ahp-matriz-meta__title">Critérios</span></div>' +
      '<div class="ahp-matriz-meta__value" data-role="count">' + rows.length + "</div></div>" +
      "</div>" +
      '<div class="ahp-matriz-table-wrap">' +
      '<table class="ahp-matriz-table ahp-matriz-table--edit" aria-label="Editar tabela de premissas e critérios">' +
      "<thead><tr>" + headHtml + "</tr></thead>" +
      '<tbody data-role="rows">' + bodyHtml + "</tbody>" +
      "</table></div>" +
      '<div class="ahp-matriz-edit-toolbar">' +
      '<button type="button" class="btn btn-secondary btn-sm" data-role="add">' +
      '<i class="fas fa-plus" aria-hidden="true"></i> Adicionar critério</button>' +
      '<button type="button" class="btn btn-primary" data-role="save">' +
      '<i class="fas fa-floppy-disk" aria-hidden="true"></i> Salvar alterações</button>' +
      "</div>" +
      '<p class="ahp-matriz-edit-feedback" data-role="feedback" role="status" aria-live="polite"></p>' +
      "</div>";

    var tbody = container.querySelector('[data-role="rows"]');
    var countEl = container.querySelector('[data-role="count"]');
    var feedback = container.querySelector('[data-role="feedback"]');

    function refreshCount() {
      if (countEl) countEl.textContent = String(tbody.querySelectorAll(".ahp-matriz-edit-row").length);
    }

    function setFeedback(message, kind) {
      if (!feedback) return;
      feedback.textContent = message || "";
      feedback.className = "ahp-matriz-edit-feedback" + (kind ? " is-" + kind : "");
    }

    container.querySelector('[data-role="add"]').addEventListener("click", function () {
      tbody.insertAdjacentHTML("beforeend", editorRowHtml(emptyRow()));
      attachMasks(tbody);
      refreshCount();
      var added = tbody.querySelector(".ahp-matriz-edit-row:last-child .ahp-matriz-edit-input");
      if (added) added.focus();
    });

    tbody.addEventListener("click", function (event) {
      var btn = event.target.closest(".ahp-matriz-row-remove");
      if (!btn) return;
      var tr = btn.closest(".ahp-matriz-edit-row");
      if (tr) tr.remove();
      if (!tbody.querySelectorAll(".ahp-matriz-edit-row").length) {
        tbody.insertAdjacentHTML("beforeend", editorRowHtml(emptyRow()));
        attachMasks(tbody);
      }
      refreshCount();
    });

    container.querySelector('[data-role="save"]').addEventListener("click", function () {
      var collected = collectEditorRows(container);
      var error = validateRows(collected, requireFull);
      if (error) {
        setFeedback(error, "error");
        return;
      }
      setFeedback("Salvando…", "info");
      var maybePromise = options.onSave ? options.onSave(collected, fileName) : null;
      Promise.resolve(maybePromise)
        .then(function () {
          setFeedback("Alterações salvas.", "success");
        })
        .catch(function (err) {
          setFeedback("Não foi possível salvar: " + (err && err.message ? err.message : err), "error");
        });
    });

    attachMasks(container);
    if (global.SLTFieldFilled) global.SLTFieldFilled.syncAll(container);
    refreshCount();
  }

  /** Atualiza a coluna Critério a partir dos nomes digitados na Etapa 3. */
  function syncCriterioFromNames(container, names) {
    if (!container || !Array.isArray(names)) return;
    var tbody = container.querySelector('[data-role="rows"]');
    if (!tbody) return;

    while (tbody.querySelectorAll(".ahp-matriz-edit-row").length < names.length) {
      tbody.insertAdjacentHTML("beforeend", editorRowHtml(emptyRow()));
    }

    var rows = tbody.querySelectorAll(".ahp-matriz-edit-row");
    while (rows.length > names.length && names.length > 0) {
      rows[rows.length - 1].remove();
      rows = tbody.querySelectorAll(".ahp-matriz-edit-row");
    }

    names.forEach(function (nome, idx) {
      var tr = rows[idx];
      if (!tr) return;
      var cell = tr.querySelector('[data-col="criterio"] input, [data-col="criterio"] textarea');
      if (cell) cell.value = String(nome || "").trim();
    });

    attachMasks(tbody);
    if (global.SLTFieldFilled) global.SLTFieldFilled.syncAll(tbody);

    var countEl = container.querySelector('[data-role="count"]');
    if (countEl) {
      countEl.textContent = String(tbody.querySelectorAll(".ahp-matriz-edit-row").length);
    }
  }

  global.SltMatrizPremissas = {
    COLUMNS: COLUMNS,
    EDITABLE_COLUMNS: EDITABLE_COLUMNS,
    STORAGE_ROWS: STORAGE_ROWS,
    STORAGE_FILE: STORAGE_FILE,
    parseCsvContent: parseCsvContent,
    parseXlsxArrayBuffer: parseXlsxArrayBuffer,
    loadMatrizPremissas: loadMatrizPremissas,
    loadMatrizArquivoNome: loadMatrizArquivoNome,
    saveMatrizPremissas: saveMatrizPremissas,
    clearMatrizPremissas: clearMatrizPremissas,
    summarize: summarize,
    validateRows: validateRows,
    collectEditorRows: collectEditorRows,
    renderMatrizPremissasPanel: renderMatrizPremissasPanel,
    renderMatrizPremissasEditor: renderMatrizPremissasEditor,
    syncCriterioFromNames: syncCriterioFromNames,
  };
})(window);
