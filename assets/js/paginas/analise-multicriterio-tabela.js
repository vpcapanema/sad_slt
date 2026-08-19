(function (global) {
  "use strict";
  function esc(value) { var node = document.createElement("span"); node.textContent = value == null ? "" : String(value); return node.innerHTML; }
  function date(value) { var parsed = new Date(value); return !value || isNaN(parsed.getTime()) ? "—" : parsed.toLocaleString("pt-BR"); }
  function num(value) { return value == null ? "—" : Number(value).toLocaleString("pt-BR", { maximumFractionDigits: 4 }); }
  function json(value, label) { return value == null ? "—" : '<details><summary>' + esc(label) + '</summary><pre>' + esc(JSON.stringify(value, null, 2)) + '</pre></details>'; }
  function actionsHtml(actions) { return (actions || []).map(function (a) { return '<a class="btn btn-sm ' + esc(a.className || "btn-secondary") + '" href="' + esc(a.href) + '">' + esc(a.label) + '</a>'; }).join(""); }
  global.renderTabelaColaborativa = function (tbodyId, julgamentos, options) {
    var body = document.getElementById(tbodyId); if (!body) return;
    if (typeof options === "function") options = { actionsFor: options }; options = options || {};
    body.innerHTML = (julgamentos || []).map(function (j) {
      var c = j.consolidacao, invited = (j.convites || []).length, received = Number(j.total_respostas || 0), selected = options.selectedId === j.id;
      var actions = options.actionsFor ? options.actionsFor(j) : [];
      if (!Array.isArray(actions)) actions = actions ? [actions] : [];
      var technical = '<details class="ami-technical"><summary>Consultar</summary><dl><dt>Identificador do julgamento</dt><dd>' + esc(j.id) + '</dd><dt>Identificador da hierarquização</dt><dd>' + esc(j.hierarquizacao_id) + '</dd><dt>Token de acesso</dt><dd>' + esc(j.token) + '</dd><dt>Lambda máximo (λmax)</dt><dd>' + num(c && c.lambda_max) + '</dd><dt>Índice de consistência (IC)</dt><dd>' + num(c && c.indice_consistencia) + '</dd><dt>Índice aleatório (IA)</dt><dd>' + num(c && c.indice_aleatorio) + '</dd></dl>' + json(c && c.matriz_consolidada, "Matriz consolidada") + json(c && c.pesos_consolidados, "Pesos consolidados") + '</details>';
      return '<tr class="collab-round-row ' + (selected ? "is-selected" : "") + '" aria-selected="' + selected + '"><td class="ami-select-column"><input type="radio" name="' + esc(tbodyId) + '-selection" data-select-id="' + esc(j.id) + '" ' + (selected ? "checked" : "") + ' aria-label="Selecionar julgamento ' + esc(j.hierarquizacao_codigo) + '"></td>' +
        '<td><span class="collab-status ' + (j.status === "ativa" ? "" : "is-muted") + '">' + esc({ ativa: "Aberto", consolidada: "Consolidado", encerrada: "Encerrado" }[j.status] || j.status) + '</span></td>' +
        '<td><strong>' + esc(j.hierarquizacao_nome || j.hierarquizacao_codigo) + '</strong><small>' + esc(j.hierarquizacao_codigo) + '</small></td>' +
        '<td><strong>' + received + ' de ' + invited + '</strong><small>' + (invited ? num(received / invited * 100) : "0") + '% respondido</small></td><td>' + date(j.valido_ate) + '</td>' +
        '<td><strong>' + esc(j.n_criterios) + '</strong> critérios' + json(j.criterios, "Consultar critérios") + '</td>' +
        '<td><strong>Razão de consistência (RC)</strong><small>' + num(c && c.razao_consistencia) + '</small><span class="collab-status ' + (c && c.consistente ? "" : "is-muted") + '">' + (c ? (c.consistente ? "Consistente" : "Inconsistente") : "Aguardando") + '</span></td>' +
        '<td><strong>' + (c ? c.respostas_consolidadas : 0) + '</strong> respostas<small>' + (c ? "Consolidado em " + date(c.consolidadoEm) : "Ainda não consolidado") + '</small></td>' +
        '<td><small>Criado em</small>' + date(j.criadoEm) + '<small>Atualizado em</small>' + date(j.atualizadoEm) + '</td><td>' + technical + '</td><td><div class="ami-row-actions">' + actionsHtml(actions) + '</div></td></tr>';
    }).join("") || '<tr><td colspan="11" class="ami-empty">Nenhum registro colaborativo encontrado no banco.</td></tr>';
    body.querySelectorAll("[data-select-id]").forEach(function (radio) { radio.addEventListener("change", function () { if (options.onSelect) options.onSelect(radio.dataset.selectId); }); });
  };
})(window);
