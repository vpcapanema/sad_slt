(function (global) {
  "use strict";
  function esc(value) { var node = document.createElement("span"); node.textContent = value == null ? "" : String(value); return node.innerHTML; }
  function date(value) { var parsed = new Date(value); return !value || isNaN(parsed.getTime()) ? "—" : parsed.toLocaleString("pt-BR"); }
  function num(value) { return value == null ? "—" : Number(value).toLocaleString("pt-BR", { maximumFractionDigits: 4 }); }
  function json(value, label) { return value == null ? "—" : '<details><summary>' + esc(label) + '</summary><pre>' + esc(JSON.stringify(value, null, 2)) + '</pre></details>'; }
  function actionsHtml(actions) { return (actions || []).map(function (a) { var label = a.label || "Abrir"; return '<a class="ami-icon-action ' + esc(a.className || "") + '" href="' + esc(a.href) + '" title="' + esc(label) + '" aria-label="' + esc(label) + '"><i class="fa-solid ' + esc(a.icon || "fa-arrow-up-right-from-square") + '" aria-hidden="true"></i><span class="sr-only">' + esc(label) + '</span></a>'; }).join(""); }
  function matrix(value) { if (!value) return '<p class="ami-empty">Não disponível.</p>'; return '<div class="collab-table-wrap"><table class="collab-data-table ami-matrix"><tbody>' + value.map(function (row) { return '<tr>' + row.map(function (cell) { return '<td>' + num(cell) + '</td>'; }).join("") + '</tr>'; }).join("") + '</tbody></table></div>'; }
  function criteriaModal(j) { return '<p><strong>' + esc(j.n_criterios) + ' critérios vinculados ao julgamento.</strong></p><div class="ami-modal-criteria">' + (j.criterios || []).map(function (c, index) { var name = typeof c === "string" ? c : c.criterio || c.nome || c.Critério || c.name || "Critério " + (index + 1); var dimension = typeof c === "object" && (c.dimensao || c.Dimensão); var phase = typeof c === "object" && (c.fase || c.Fase); return '<article><span>' + (index + 1) + '</span><div><strong>' + esc(name) + '</strong><small>' + esc([dimension, phase].filter(Boolean).join(" · ")) + '</small></div></article>'; }).join("") + '</div>'; }
  function technicalModal(j) { var c = j.consolidacao; return '<dl class="ami-modal-fields"><dt>Identificador do julgamento</dt><dd>' + esc(j.id) + '</dd><dt>Identificador da hierarquização</dt><dd>' + esc(j.hierarquizacao_id) + '</dd><dt>Token de acesso</dt><dd>' + esc(j.token) + '</dd><dt>Lambda máximo (λmax)</dt><dd>' + num(c && c.lambda_max) + '</dd><dt>Índice de consistência (IC)</dt><dd>' + num(c && c.indice_consistencia) + '</dd><dt>Índice aleatório (IA)</dt><dd>' + num(c && c.indice_aleatorio) + '</dd><dt>Razão de consistência (RC)</dt><dd>' + num(c && c.razao_consistencia) + '</dd></dl><h3>Matriz consolidada</h3>' + matrix(c && c.matriz_consolidada) + '<h3>Pesos consolidados</h3>' + (c && c.pesos_consolidados ? '<pre>' + esc(JSON.stringify(c.pesos_consolidados, null, 2)) + '</pre>' : '<p class="ami-empty">Não disponíveis.</p>'); }
  global.renderTabelaColaborativa = function (tbodyId, julgamentos, options) {
    var body = document.getElementById(tbodyId); if (!body) return;
    if (typeof options === "function") options = { actionsFor: options }; options = options || {};
    body.innerHTML = (julgamentos || []).map(function (j) {
      var c = j.consolidacao, invited = (j.convites || []).length, received = Number(j.total_respostas || 0), selected = options.selectedId === j.id;
      var actions = options.actionsFor ? options.actionsFor(j) : [];
      if (!Array.isArray(actions)) actions = actions ? [actions] : [];
      return '<tr class="collab-round-row ' + (selected ? "is-selected" : "") + '" aria-selected="' + selected + '"><td class="col-select"><input type="radio" name="' + esc(tbodyId) + '-selection" data-select-id="' + esc(j.id) + '" ' + (selected ? "checked" : "") + ' aria-label="Selecionar julgamento ' + esc(j.hierarquizacao_codigo) + '"></td>' +
        '<td>' + esc({ ativa: "Aberto", consolidada: "Consolidado", encerrada: "Encerrado" }[j.status] || j.status) + '</td>' +
        '<td title="' + esc((j.hierarquizacao_nome || j.hierarquizacao_codigo) + " · " + j.hierarquizacao_codigo) + '">' + esc(j.hierarquizacao_nome || j.hierarquizacao_codigo) + ' · ' + esc(j.hierarquizacao_codigo) + '</td>' +
        '<td>' + received + ' de ' + invited + ' (' + (invited ? num(received / invited * 100) : "0") + '%)</td><td>' + date(j.valido_ate) + '</td>' +
        '<td><button class="ami-cell-link" data-modal-kind="criteria" data-record-id="' + esc(j.id) + '">' + esc(j.n_criterios) + ' critérios</button></td>' +
        '<td>' + (c ? 'RC ' + num(c.razao_consistencia) + ' · ' + (c.consistente ? "Consistente" : "Inconsistente") : "Aguardando consolidação") + '</td>' +
        '<td>' + (c ? c.respostas_consolidadas + ' respostas · ' + date(c.consolidadoEm) : "Pendente") + '</td>' +
        '<td title="Criado em ' + date(j.criadoEm) + '; atualizado em ' + date(j.atualizadoEm) + '">Criado ' + date(j.criadoEm) + ' · Atualizado ' + date(j.atualizadoEm) + '</td><td><button class="ami-cell-link" data-modal-kind="technical" data-record-id="' + esc(j.id) + '">Ver detalhes</button></td><td><div class="ami-row-actions">' + actionsHtml(actions) + '</div></td></tr>';
    }).join("") || '<tr><td colspan="11" class="ami-empty">Nenhum registro colaborativo encontrado no banco.</td></tr>';
    body.querySelectorAll("[data-select-id]").forEach(function (radio) { radio.addEventListener("change", function () { if (options.onSelect) options.onSelect(radio.dataset.selectId); }); });
    var modal = document.getElementById(tbodyId + "-modal"), modalTitle = document.getElementById(tbodyId + "-modal-title"), modalContent = document.getElementById(tbodyId + "-modal-content");
    function closeModal() { modal.classList.add("is-hidden"); }
    body.querySelectorAll("[data-modal-kind]").forEach(function (button) { button.addEventListener("click", function () { var j = (julgamentos || []).find(function (item) { return item.id === button.dataset.recordId; }); if (!j) return; var criteria = button.dataset.modalKind === "criteria"; modalTitle.textContent = criteria ? "Critérios do julgamento" : "Detalhes técnicos do julgamento"; modalContent.innerHTML = criteria ? criteriaModal(j) : technicalModal(j); modal.classList.remove("is-hidden"); modal.querySelector("[data-modal-close]").focus(); }); });
    modal.querySelector("[data-modal-close]").onclick = closeModal; modal.onclick = function (event) { if (event.target === modal) closeModal(); };
  };
})(window);
