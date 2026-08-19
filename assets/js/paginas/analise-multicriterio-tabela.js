(function (global) {
  "use strict";
  function esc(value) { var node = document.createElement("span"); node.textContent = value == null ? "" : String(value); return node.innerHTML; }
  function date(value) { var parsed = new Date(value); return !value || isNaN(parsed.getTime()) ? "—" : parsed.toLocaleString("pt-BR"); }
  function num(value) { return value == null ? "—" : Number(value).toLocaleString("pt-BR", { maximumFractionDigits: 4 }); }
  function json(value, label) { return value == null ? "—" : '<details><summary>' + esc(label) + '</summary><pre>' + esc(JSON.stringify(value, null, 2)) + '</pre></details>'; }
  global.renderTabelaColaborativa = function (tbodyId, julgamentos, actionFor) {
    var body = document.getElementById(tbodyId); if (!body) return;
    body.innerHTML = (julgamentos || []).map(function (j) {
      var c = j.consolidacao; var action = actionFor ? actionFor(j) : null;
      return "<tr><td>" + esc(j.status) + "</td><td>" + esc(j.id) + "</td><td>" + esc(j.hierarquizacao_id) + "</td><td>" + esc(j.hierarquizacao_codigo) + "</td><td>" + esc(j.token) + "</td>" +
        "<td>" + json(j.criterios, j.n_criterios + " critério(s)") + "</td><td>" + j.n_criterios + "</td><td>" + json(j.convites, (j.convites || []).length + " convite(s)") + "</td><td>" + date(j.valido_ate) + "</td><td>" + date(j.criadoEm) + "</td><td>" + date(j.atualizadoEm) + "</td>" +
        "<td>" + json(c && c.matriz_consolidada, "Ver matriz") + "</td><td>" + json(c && c.pesos_consolidados, "Ver pesos") + "</td><td>" + num(c && c.lambda_max) + "</td><td>" + num(c && c.indice_consistencia) + "</td><td>" + num(c && c.indice_aleatorio) + "</td><td>" + num(c && c.razao_consistencia) + "</td>" +
        "<td>" + (c ? (c.consistente ? "Sim" : "Não") : "—") + "</td><td>" + (c ? c.respostas_consolidadas : "—") + "</td><td>" + date(c && c.consolidadoEm) + "</td><td>" + (action ? '<a class="btn btn-sm btn-primary" href="' + esc(action.href) + '">' + esc(action.label) + "</a>" : "—") + "</td></tr>";
    }).join("") || '<tr><td colspan="21" class="ami-empty">Nenhum registro colaborativo encontrado no banco.</td></tr>';
  };
})(window);
