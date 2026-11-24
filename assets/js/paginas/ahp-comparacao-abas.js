(function () {
  "use strict";
  var tabs = Array.from(document.querySelectorAll(".collab-pair-tabs [role=tab]"));
  var form = document.getElementById("comparisonContent");
  var wrap = document.getElementById("collab-matrix-wrap");
  if (!tabs.length || !form || !wrap) return;
  var matrixPanel = wrap.closest("[role=tabpanel]");
  var cells = [];
  var namesKey = null;

  function activate(tab, focus) {
    if (tab.getAttribute("aria-controls") === matrixPanel.id) sync();
    tabs.forEach(function (item) {
      var selected = item === tab;
      item.setAttribute("aria-selected", String(selected));
      item.tabIndex = selected ? 0 : -1;
      item.classList.toggle("is-active", selected);
      document.getElementById(item.getAttribute("aria-controls")).hidden = !selected;
    });
    if (focus) tab.focus();
    window.dispatchEvent(new Event("resize"));
  }
  tabs.forEach(function (tab, index) {
    tab.addEventListener("click", function () { activate(tab, false); });
    tab.addEventListener("keydown", function (event) {
      var next;
      if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
      else if (event.key === "ArrowLeft") next = (index + tabs.length - 1) % tabs.length;
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = tabs.length - 1;
      else return;
      event.preventDefault();
      activate(tabs[next], true);
    });
  });

  function node(tag, text, className) {
    var element = document.createElement(tag);
    if (text !== undefined) element.textContent = text;
    if (className) element.className = className;
    return element;
  }
  function luminance(color) {
    var rgb = String(color).match(/[\d.]+/g).slice(0, 3).map(function (value) {
      value = Number(value) / 255;
      return value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  }
  // Escolhe a fonte de maior contraste WCAG com o fundo da célula.
  function readableText(background) {
    var bg = luminance(background);
    var light = 1.05 / (bg + 0.05), dark = (bg + 0.05) / (luminance("rgb(7,26,44)") + 0.05);
    return light >= dark ? "#fff" : "#071a2c";
  }
  function sync() {
    if (typeof buildLiveMatrix !== "function") return;
    var matrix = buildLiveMatrix();
    if (!matrix || !form.querySelector(".saaty-pair")) return;
    var names = normalizeCriteriaNames(criteria);
    var key = JSON.stringify(names);
    if (key !== namesKey) {
      namesKey = key;
      cells = [];
      var table = node("table", undefined, "matrix-table");
      var head = node("thead"), row = node("tr");
      var corner = node("th", "Linha / Coluna", "matrix-head");
      corner.scope = "col";
      row.appendChild(corner);
      names.forEach(function (name) {
        var th = node("th", name, "matrix-head");
        th.scope = "col";
        row.appendChild(th);
      });
      head.appendChild(row);
      table.appendChild(head);
      var body = node("tbody");
      names.forEach(function (name, i) {
        var tr = node("tr"), th = node("th", name, "matrix-head");
        th.scope = "row";
        tr.appendChild(th);
        cells[i] = [];
        names.forEach(function (_name, j) {
          var td = node("td");
          cells[i][j] = td;
          tr.appendChild(td);
        });
        body.appendChild(tr);
      });
      table.appendChild(body);
      wrap.replaceChildren(table);
    }
    var colorsByPair = new Map();
    matrix.forEach(function (row, i) {
      for (var j = i + 1; j < row.length; j += 1) {
        var input = document.getElementById("pair_" + i + "_" + j);
        var pair = input ? input.closest(".saaty-pair") : form.querySelector(".saaty-pair");
        colorsByPair.set(i + "_" + j, SLTSaatySelectorColor.palette(pair));
      }
    });
    matrix.forEach(function (row, i) {
      row.forEach(function (value, j) {
        var cell = cells[i][j];
        // O modelo numérico é a mesma fonte usada pelo cálculo e envio, nunca o readout.
        cell.dataset.value = String(value);
        cell.textContent = formatSaatyValue(value);
        cell.className = i === j ? "matrix-cell--diagonal" :
          i < j ? "collab-matrix-first" : "collab-matrix-second";
        cell.title = names[i] + " em relação a " + names[j] + " = " + formatSaatyValue(value);
        if (i === j) {
          // A diagonal tem cor própria de destaque, definida no CSS da matriz.
          cell.style.backgroundColor = "";
          cell.style.color = "";
          return;
        }
        var colors = colorsByPair.get(Math.min(i, j) + "_" + Math.max(i, j));
        var color = colors[nearestSaatyIdx(value)];
        cell.style.backgroundColor = color.background;
        cell.style.color = readableText(color.background);
      });
    });
  }
  function syncVisibleMatrix() {
    if (!matrixPanel.hidden) sync();
  }
  form.addEventListener("saaty:change", syncVisibleMatrix);
  window.addEventListener("resize", syncVisibleMatrix);
  new MutationObserver(syncVisibleMatrix).observe(form, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
  var consistencyModal = document.getElementById("collab-consistency-modal");
  if (consistencyModal) consistencyModal.addEventListener("click", function (event) {
    if (event.target.closest("#collab-consistency-pairs a")) activate(tabs[0], false);
  }, true);
  syncVisibleMatrix();
})();
