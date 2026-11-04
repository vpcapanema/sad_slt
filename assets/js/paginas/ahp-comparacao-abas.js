(function () {
  "use strict";
  var tabs = Array.from(document.querySelectorAll(".collab-pair-tabs [role=tab]"));
  var form = document.getElementById("comparisonContent");
  var wrap = document.getElementById("collab-matrix-wrap");
  if (!tabs.length || !form || !wrap) return;
  var cells = [];
  var namesKey = null;

  function activate(tab, focus) {
    sync();
    tabs.forEach(function (item) {
      var selected = item === tab;
      item.setAttribute("aria-selected", String(selected));
      item.tabIndex = selected ? 0 : -1;
      item.classList.toggle("is-active", selected);
      document.getElementById(item.getAttribute("aria-controls")).hidden = !selected;
    });
    if (focus) tab.focus();
    sync();
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
      table.appendChild(node("caption", "Comparação pareada — valores da linha em relação à coluna"));
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
    matrix.forEach(function (row, i) {
      row.forEach(function (value, j) {
        var cell = cells[i][j];
        // O modelo numérico é a mesma fonte usada pelo cálculo e envio, nunca o readout.
        cell.dataset.value = String(value);
        cell.textContent = formatSaatyValue(value);
        cell.className = i === j ? "matrix-cell--diagonal" :
          i < j ? "collab-matrix-first" : "collab-matrix-second";
        var input = document.getElementById("pair_" + Math.min(i, j) + "_" + Math.max(i, j));
        var pair = input ? input.closest(".saaty-pair") : form.querySelector(".saaty-pair");
        var colors = SLTSaatySelectorColor.palette(pair);
        var color = colors[nearestSaatyIdx(value)];
        cell.style.backgroundColor = color.background;
        cell.style.color = color.text;
        cell.title = names[i] + " em relação a " + names[j] + " = " + formatSaatyValue(value);
      });
    });
  }
  form.addEventListener("saaty:change", sync);
  window.addEventListener("resize", sync);
  new MutationObserver(sync).observe(form, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
  document.getElementById("collab-consistency-help").addEventListener("click", function (event) {
    if (event.target.closest("a")) activate(tabs[0], false);
  }, true);
  sync();
})();
