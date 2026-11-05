(function () {
  "use strict";

  var LABEL_SELECTOR = ".sicard-table-label, .ami-table-label";
  var WRAPPER_SELECTOR = [
    ".ami-filtered-table", ".ami-table-wrap", ".ami-pairwise-scroll", ".matriz-table-wrap",
    ".hier-table-shell", ".collab-table-wrap", ".admin-table-wrap", ".ea-table-wrap",
    ".fase-table-wrap", ".table-scroll", ".table-wrap", ".geo-explorer-table-wrap",
    ".mlb-table", ".gp-operation-result-table", ".gerador-tabela-scroll"
  ].join(",");
  var HEADING_SELECTOR = "h1, h2, h3, h4, h5, h6, [role=heading], .ahp-section-label, .ahp-subsection-title, summary";

  function cleanText(value) {
    return String(value || "").replace(/\s+/g, " ").replace(/^\d+(?:\.\d+)*\s*/, "").replace(/^[\s.:;—–-]+/u, "").trim();
  }

  function sentenceCase(value) {
    return value.replace(/^([A-ZÀ-Þ])(?=[a-zà-ÿ])/u, function (_match, first) { return first.toLocaleLowerCase("pt-BR"); });
  }

  function headingText(element) {
    if (!element) return "";
    var copy = element.cloneNode(true);
    copy.querySelectorAll("i, svg, .ahp-subsection-num, .ahp-section-index-icon, [aria-hidden=true]").forEach(function (item) { item.remove(); });
    return cleanText(copy.textContent);
  }

  function directHeading(element, table) {
    return Array.prototype.slice.call(element.children).filter(function (child) {
      return child.matches(HEADING_SELECTOR) && (child.compareDocumentPosition(table) & Node.DOCUMENT_POSITION_FOLLOWING);
    }).pop() || null;
  }

  function nearbyHeading(table) {
    var current = table.parentElement;
    while (current && current !== document.body) {
      var heading = directHeading(current, table);
      if (heading) return headingText(heading);

      var sibling = current.previousElementSibling;
      while (sibling) {
        if (sibling.matches(HEADING_SELECTOR)) return headingText(sibling);
        heading = directHeading(sibling, current);
        if (heading) return headingText(heading);
        sibling = sibling.previousElementSibling;
      }
      current = current.parentElement;
    }
    return "";
  }

  function tableContext(table) {
    var caption = table.caption && cleanText(table.caption.textContent);
    var demandType = { plano: "planos", programa: "programas", projeto: "projetos" }[table.dataset.demandasTable];
    if (demandType) return demandType;
    return cleanText(table.dataset.tableTitle) || caption || cleanText(table.getAttribute("aria-label")) || nearbyHeading(table) ||
      Array.prototype.slice.call(table.querySelectorAll("thead th")).map(function (cell) { return cleanText(cell.textContent); }).filter(Boolean).slice(0, 3).join(", ") || "registros exibidos";
  }

  function articleFor(context) {
    var text = cleanText(context), leadingArticle = text.match(/^(os|as|o|a)\s+/i);
    if (leadingArticle) {
      var article = leadingArticle[1].toLowerCase();
      return article === "os" ? "dos" : article === "as" ? "das" : article === "o" ? "do" : "da";
    }
    var first = (text.match(/[\p{L}\p{N}]+/u) || [""])[0].toLocaleLowerCase("pt-BR");
    var femininePlural = /^(áreas|demandas|camadas|respostas|pendências|configurações|operações|informações|ações|opções|hierarquizações|instituições|dimensões|regras|análises|matrizes|prioridades|categorias|atividades)$/i;
    var masculinePlural = /^(julgamentos|julgadores|índices|pesos|resultados|processos|dados|registros|colaboradores|critérios|indicadores|grupos|projetos|objetos|envios|convites|documentos|parâmetros|atributos|elementos|especialistas|municípios)$/i;
    if (femininePlural.test(first) || /(?:ções|dades|agens)$/.test(first)) return "das";
    if (masculinePlural.test(first) || /(?:mentos|adores|ores)$/.test(first)) return "dos";
    if (/(?:ção|dade|agem|ência|ura|ização|oria|ia)$/.test(first) || /a$/.test(first)) return "da";
    if (/(?:mento|ário|ismo)$/.test(first) || /o$/.test(first)) return "do";
    return "de";
  }

  function isMatrix(table, context) {
    return /matriz|matrix|paread[ao]|pairwise/i.test([
      table.className, table.getAttribute("data-role"), table.getAttribute("aria-label"), context
    ].join(" ")) || /\bcomparison\b/i.test(table.className);
  }

  function labelText(table) {
    var context = sentenceCase(tableContext(table).replace(/^(?:Tabela|Matriz)\s+/i, ""));
    if (isMatrix(table, context)) {
      if (/^(?:de|da|das|do|dos)\s+/i.test(context)) return "Matriz " + context;
      return "Matriz " + articleFor(context) + " " + context;
    }
    if (/^(?:de|da|das|do|dos)\s+/i.test(context)) return "Tabela " + context;
    return "Tabela " + articleFor(context) + " " + context;
  }

  function tableContainer(table) {
    var filters = table.closest(".ami-filtered-table");
    if (filters && filters.querySelectorAll("table").length === 1) return filters;
    return table.closest(WRAPPER_SELECTOR) || table;
  }

  function existingLabel(container) {
    var previous = container.previousElementSibling;
    return previous && previous.matches(LABEL_SELECTOR) ? previous : null;
  }

  function containingSection(table, label) {
    return label.closest("dialog, [role=dialog], section, article, .card, .ahp-subcard, details") || table.closest("main") || document.body;
  }

  function maxFont(root, excludeLabels) {
    return [root].concat(Array.prototype.slice.call(root.querySelectorAll("*"))).reduce(function (maximum, element) {
      if (excludeLabels && element.matches(LABEL_SELECTOR)) return maximum;
      return Math.max(maximum, parseFloat(getComputedStyle(element).fontSize) || 0);
    }, 0);
  }

  function fitFont(table, label) {
    var section = containingSection(table, label), sectionMax = maxFont(section, true), tableMax = maxFont(table, false);
    label.dataset.tableFontMax = String(tableMax);
    label.dataset.sectionFontMax = String(sectionMax);
    if (sectionMax >= tableMax) {
      label.style.fontSize = sectionMax + "px";
      label.dataset.fontHierarchy = "matched";
      return;
    }
    label.style.removeProperty("font-size");
    label.dataset.fontHierarchy = "review";
  }

  function syncVisibility(table, label) {
    var hidden = table.hidden || Boolean(table.closest("[hidden], [inert], .is-hidden, template"));
    if (label.hidden !== hidden) label.hidden = hidden;
  }

  function labelTable(table) {
    if (!table || !table.isConnected || table.closest("template")) return;
    var container = tableContainer(table), label = existingLabel(container);
    if (!label) {
      label = document.createElement("p");
      label.className = "sicard-table-label";
      label.textContent = labelText(table);
      container.parentElement.insertBefore(label, container);
    }
    if (container.parentElement.classList.contains("ami-analysis-split") &&
        !container.parentElement.classList.contains("ami-analysis-split--table-labeled")) {
      container.parentElement.classList.add("ami-analysis-split--table-labeled");
    }
    syncVisibility(table, label);
    fitFont(table, label);
  }

  function scan(root) {
    if (!root || root.nodeType !== 1 && root.nodeType !== 9) return;
    if (root.nodeType === 1 && root.matches("table")) labelTable(root);
    root.querySelectorAll("table").forEach(labelTable);
    if (root.nodeType === 1 && root.matches(LABEL_SELECTOR)) {
      var container = root.nextElementSibling;
      var table = container && (container.matches("table") ? container : container.querySelector("table"));
      if (table) { syncVisibility(table, root); fitFont(table, root); }
    }
    root.querySelectorAll(LABEL_SELECTOR).forEach(function (label) {
      var container = label.nextElementSibling;
      var table = container && (container.matches("table") ? container : container.querySelector("table"));
      if (table) { syncVisibility(table, label); fitFont(table, label); }
    });
  }

  function start() {
    scan(document);
    var observer = new MutationObserver(function (records) {
      records.forEach(function (record) {
        if (record.type === "attributes" && record.target.nodeType === 1) {
          var changedTable = record.target.matches("table") ? record.target : record.target.closest("table");
          if (changedTable) labelTable(changedTable);
          else scan(record.target);
        }
        if (record.target.nodeType === 1) {
          var section = record.target.closest("dialog, [role=dialog], section, article, .card, .ahp-subcard, details");
          if (section) scan(section);
        }
        record.addedNodes.forEach(function (node) { if (node.nodeType === 1) scan(node); });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden", "class"] });
    window.addEventListener("resize", function () { scan(document); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { scan(document); });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
