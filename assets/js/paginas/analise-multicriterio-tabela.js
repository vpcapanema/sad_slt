(function (global) {
  "use strict";
  function esc(value) { var node = document.createElement("span"); node.textContent = value == null ? "" : String(value); return node.innerHTML.replace(/"/g, "&quot;"); }
  function date(value) { var parsed = new Date(value); return !value || isNaN(parsed.getTime()) ? "—" : parsed.toLocaleString("pt-BR"); }
  function num(value) { return value == null ? "—" : Number(value).toLocaleString("pt-BR", { maximumFractionDigits: 4 }); }
  function json(value, label) { return value == null ? "—" : '<details><summary>' + esc(label) + '</summary><pre>' + esc(JSON.stringify(value, null, 2)) + '</pre></details>'; }
  function criterionNames(j, resultado) { return (resultado.criterios || j.criterios || []).map(function (c, index) { return typeof c === "string" ? c : c.criterio || c.nome || c.Critério || c.name || "Critério " + (index + 1); }); }
  function localDate(value) { var parsed = new Date(value); if (!value || isNaN(parsed.getTime())) return ""; var shifted = new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60000); return shifted.toISOString().slice(0, 10); }
  function deadlineDate(value) { var parsed = new Date(value); return !value || isNaN(parsed.getTime()) ? "—" : parsed.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }); }
  function tableLabel(text) { return document.querySelector('.ami-main[data-modo="espaco"]') ? '<p class="ami-table-label">' + esc(text) + '</p>' : ""; }
  function setButtonState(id, enabled) { var button = document.getElementById(id); if (!button) return; button.disabled = !enabled; button.classList.toggle("is-disabled", !enabled); }
  function syncCrudActions(tbodyId, selectedId, editingId) { var selected = Boolean(selectedId), editing = Boolean(editingId && editingId === selectedId); setButtonState(tbodyId + "-edit-action", selected && !editing); setButtonState(tbodyId + "-save-action", editing); setButtonState(tbodyId + "-cancel-action", editing); setButtonState(tbodyId + "-delete-action", selected && !editing); }
  function motivoPendente(j) {
    return j.total_respostas
      ? "Para preencher as métricas, a matriz e os pesos, abra este julgamento em modo de edição na Central de Respostas. Na seção 6, clique em Calcular e salvar análise."
      : "Aguardando respostas enviadas para calcular a matriz, os pesos e as métricas.";
  }
  function descricaoResultado(resultado) {
    if (!resultado.nome) return '<p class="ami-modal-description">Resultado consolidado deste julgamento.</p>';
    var metodos = {
      aij_media_geometrica: "Média geométrica",
      aij_media_aritmetica: "Média aritmética",
      aij_mediana: "Mediana",
      aij_moda: "Moda",
      pesos_por_dimensao: "Composição dos pesos por dimensão",
      media_pesos_individuais: "Média dos pesos individuais"
    };
    var estado = resultado.status === "homologada" ? "Homologada" : resultado.recorte_parcial ? "Calculada" : "Calculada · aguardando homologação";
    var detalhes = [resultado.codigo, estado, resultado.recorte_parcial ? "Recorte de critérios" : "Matriz completa", metodos[resultado.metodo_agregacao]];
    return '<p class="ami-modal-description"><strong>' + esc(resultado.nome) + '</strong> · ' +
      esc(detalhes.filter(Boolean).join(" · ")) + '</p>';
  }
  function matrix(j, descricao = "", rotulo = "Matriz de comparação pareada consolidada") {
    var resultado = j.analise_exibida || j.consolidacao, value = resultado?.matriz_consolidada;
    if (!value?.length) return '<p class="ami-empty">' + esc(motivoPendente(j)) + '</p>';
    var names = criterionNames(j, resultado);
    var texto = descricao ? '<p class="ami-modal-description">' + esc(descricao) + '</p>' : descricaoResultado(resultado);
    return texto + tableLabel(rotulo) +
      '<div class="matriz-table-wrap"><table class="admin-table matriz-view-table ami-matrix"><thead><tr><th>Critério</th>' +
      names.map(function (name) { return '<th title="' + esc(name) + '">' + esc(name) + '</th>'; }).join("") +
      '</tr></thead><tbody>' + value.map(function (row, index) {
        var name = names[index] || "Critério " + (index + 1);
        return '<tr><th title="' + esc(name) + '">' + esc(name) + '</th>' +
          row.map(function (cell) { return '<td>' + num(cell) + '</td>'; }).join("") + '</tr>';
      }).join("") + '</tbody></table></div>';
  }
  function weightsModal(j) {
    var resultado = j.analise_exibida || j.consolidacao, weights = resultado?.pesos_consolidados;
    if (!weights?.length) return '<p class="ami-empty">' + esc(motivoPendente(j)) + '</p>';
    var names = criterionNames(j, resultado);
    return descricaoResultado(resultado) +
      '<p class="ami-modal-description">' + (resultado.metodo_agregacao === "media_pesos_individuais"
        ? "Cada peso global é a média dos pesos individuais das respostas completas."
        : resultado.matriz_consolidada?.length
        ? "Autovetor principal normalizado calculado a partir da matriz de comparação pareada consolidada."
        : "Cada peso global é o produto do peso da dimensão pelo peso local do critério.") + '</p>' +
      tableLabel("Tabela dos pesos consolidados do julgamento") +
      '<div class="matriz-table-wrap"><table class="admin-table matriz-view-table ami-weights"><thead><tr><th>Critério</th><th>Peso consolidado</th></tr></thead><tbody>' +
      weights.map(function (weight, index) {
        return '<tr><td>' + esc(names[index] || "Critério " + (index + 1)) + '</td><td>' + num(weight) + '</td></tr>';
      }).join("") + '</tbody></table></div>';
  }
  function criteriaModal(j) { return '<p><strong>' + esc(j.n_criterios) + ' critérios vinculados ao julgamento.</strong></p><div class="ami-modal-criteria">' + (j.criterios || []).map(function (c, index) { var name = typeof c === "string" ? c : c.criterio || c.nome || c.Critério || c.name || "Critério " + (index + 1); var dimension = typeof c === "object" && (c.dimensao || c.Dimensão); var phase = typeof c === "object" && (c.fase || c.Fase); return '<article><span>' + (index + 1) + '</span><div><strong>' + esc(name) + '</strong><small>' + esc([dimension, phase].filter(Boolean).join(" · ")) + '</small></div></article>'; }).join("") + '</div>'; }
  function collaboratorsModal(j) { var invitations = j.convites || [], received = Number(j.total_respostas || 0); if (!invitations.length) return '<p class="ami-empty">Nenhum colaborador convidado.</p>'; return '<p class="ami-modal-description"><strong>' + received + '</strong> de <strong>' + invitations.length + '</strong> respostas recebidas.</p>' + tableLabel("Tabela dos colaboradores do julgamento") + '<div class="matriz-table-wrap"><table class="admin-table matriz-view-table ami-collaborators"><thead><tr><th>Colaborador</th><th>E-mail</th></tr></thead><tbody>' + invitations.map(function (invitation, index) { var email = typeof invitation === "string" ? invitation : invitation.email; return '<tr><td>' + (index + 1) + '</td><td>' + esc(email || "—") + '</td></tr>'; }).join("") + '</tbody></table></div>'; }
  function participationLink(j, received, invited) {
    var label = received + ' de ' + invited + ' (' + (invited ? num(received / invited * 100) : "0") + '%)';
    return j.modo_participacao === "publico" ? esc(label)
      : '<button class="ami-cell-link" data-modal-kind="collaborators" data-record-id="' + esc(j.id) + '">' + label + '</button>';
  }
  global.renderTabelaColaborativa = function (tbodyId, julgamentos, options) {
    var body = document.getElementById(tbodyId); if (!body) return;
    if (typeof options === "function") options = { actionsFor: options }; options = options || {};
    var centralJulgamentos = typeof options.publicUrlFor === "function";
    var pagination = document.getElementById(tbodyId + "-pagination"); if (pagination) pagination.classList.toggle("is-hidden", !options.paginated);
    function setTopAction(kind, href) { var link = document.getElementById(tbodyId + "-" + kind + "-action"); if (!link) return; link.href = href || "#"; link.classList.toggle("is-disabled", !href); link.setAttribute("aria-disabled", href ? "false" : "true"); }
    function syncTopActions(selectedId) { var selected = (julgamentos || []).find(function (item) { return item.id === selectedId; }); var links = selected && options.linksFor ? options.linksFor(selected) : {}; setTopAction("public", links && links.public); syncCrudActions(tbodyId, selectedId, options.editingId); }
    body.innerHTML = (julgamentos || []).map(function (j) {
      var publico = j.modo_participacao === "publico";
      var c = j.analise_exibida || j.consolidacao, invited = publico ? j.total_inscritos || 0 : (j.total_convites ?? (j.convites || []).length), received = Number(j.total_respostas || 0), selected = options.selectedIds ? options.selectedIds.has(j.id) : options.selectedId === j.id, editing = options.editingId === j.id;
      var temMatriz = Boolean(c?.matriz_consolidada?.length), temPesos = Boolean(c?.pesos_consolidados?.length);
      var matrixName = j.matriz_nome || [j.hierarquizacao_nome, j.hierarquizacao_codigo].filter(Boolean).join(" · ") || "—";
      var total = publico ? invited : (j.lista_colaboradores ?? j.convites ?? []).length;
      var lista = options.onOpenCollaborators ? '<td><button type="button" class="ami-cell-link" data-lista-colaboradores="' + esc(j.id) + '"' + (publico ? '' : ' aria-haspopup="dialog"') + ' aria-label="Abrir lista de colaboradores de ' + esc(j.nome || j.id) + '">' + total + (publico ? (total === 1 ? ' inscrito' : ' inscritos') : (total === 1 ? ' colaborador' : ' colaboradores')) + '</button></td>' : "";
      var ids = "", link = "";
      if (centralJulgamentos) {
        var publicUrl = options.publicUrlFor(j);
        link = '<td>' + (publicUrl ? '<a class="ami-cell-link" href="' + esc(publicUrl) + '" title="' + esc(publicUrl) + '" target="_blank" rel="noopener">' + esc(publicUrl) + '</a>' : '—') + '</td>';
      } else {
        var matrixId = j.matriz_id || j.hierarquizacao_id || "—";
        ids = '<td class="ami-cell-id" title="' + esc(j.id) + '">' + esc(j.id) + '</td><td class="ami-cell-id" title="' + esc(matrixId) + '">' + esc(matrixId) + '</td>';
      }
      var criteria = '<td><button class="ami-cell-link" data-modal-kind="criteria" data-record-id="' + esc(j.id) + '">' + esc(j.n_criterios) + ' critérios</button></td>';
      return '<tr class="collab-round-row ' + (selected ? "is-selected" : "") + '" aria-selected="' + selected + '"><td class="col-select"><input type="checkbox" class="ami-row-select" data-select-id="' + esc(j.id) + '" ' + (selected ? "checked" : "") + (options.editingId ? " disabled" : "") + ' aria-label="Selecionar julgamento ' + esc(j.hierarquizacao_codigo) + '"></td>' +
        '<td>' + (editing ? '<input class="ami-inline-input" data-edit-field="nome" type="text" maxlength="200" required aria-label="Nome do julgamento">' : esc(j.nome || 'Julgamento ' + j.id)) + '</td><td>' + esc({ ativa: "Aberto", consolidada: "Consolidado", encerrada: "Encerrado" }[j.status] || j.status) + '</td>' + ids +
        '<td title="' + esc(matrixName) + '">' + esc(matrixName) + '</td>' + (centralJulgamentos ? criteria + link : "") +
        '<td>' + participationLink(j, received, invited) + '</td>' + lista + '<td>' + deadlineDate(j.valido_ate) + '</td><td>' + date(j.criadoEm) + '</td><td>' + date(j.atualizadoEm) + '</td>' +
        (centralJulgamentos ? "" : criteria) +
        '<td class="ami-cell-token">' + (publico ? "Link público" : "Individual por e-mail") + '</td><td>' + num(c && c.lambda_max) + '</td><td>' + num(c && c.indice_consistencia) + '</td><td>' + num(c && c.indice_aleatorio) + '</td><td>' + num(c && c.razao_consistencia) + '</td>' +
        '<td><button class="ami-cell-link" data-availability="' + (temMatriz ? 'available' : 'pending') + '" data-modal-kind="matrix" data-record-id="' + esc(j.id) + '">' + (temMatriz ? "Disponível" : "Pendente") + '</button></td><td><button class="ami-cell-link" data-availability="' + (temPesos ? 'available' : 'pending') + '" data-modal-kind="weights" data-record-id="' + esc(j.id) + '">' + (temPesos ? "Disponíveis" : "Pendentes") + '</button></td></tr>';
    }).join("") || '<tr><td colspan="18" class="ami-empty">Nenhum registro colaborativo encontrado no banco.</td></tr>';
    var nameInput = body.querySelector('[data-edit-field="nome"]');
    if (nameInput) {
      var editingRecord = (julgamentos || []).find(function (j) { return j.id === options.editingId; });
      nameInput.value = editingRecord.nome || 'Julgamento ' + editingRecord.id;
    }
    syncTopActions(options.selectedId);
    body.querySelectorAll("[data-lista-colaboradores]").forEach(function (button) {
      button.addEventListener("click", function () {
        var julgamento = julgamentos.find(function (item) { return item.id === button.dataset.listaColaboradores; });
        if (julgamento) options.onOpenCollaborators(julgamento, button);
      });
    });
    body.querySelectorAll("[data-select-id]").forEach(function (checkbox) { checkbox.addEventListener("change", function () { if (options.onSelectionChange) options.onSelectionChange(checkbox.dataset.selectId, checkbox.checked); }); });
    var modal = document.getElementById(tbodyId + "-modal"), modalTitle = document.getElementById(tbodyId + "-modal-title"), modalContent = document.getElementById(tbodyId + "-modal-content");
    function closeModal() { modal.classList.add("is-hidden"); }
    body.querySelectorAll('[data-modal-kind="collaborators"]').forEach(function (button) { button.addEventListener("click", function (event) { event.stopImmediatePropagation(); var j = (julgamentos || []).find(function (item) { return item.id === button.dataset.recordId; }); if (!j) return; modalTitle.textContent = "Colaboradores do julgamento"; modalContent.innerHTML = collaboratorsModal(j); modal.classList.remove("is-hidden"); modal.querySelector("[data-modal-close]").focus(); }); });
    body.querySelectorAll("[data-modal-kind]").forEach(function (button) { button.addEventListener("click", function () { var j = (julgamentos || []).find(function (item) { return item.id === button.dataset.recordId; }); if (!j) return; var kind = button.dataset.modalKind, titles = { criteria: "Critérios do julgamento", matrix: "Matriz de comparação pareada consolidada", weights: "Pesos consolidados" }; modalTitle.textContent = titles[kind] || "Detalhes do julgamento"; modalContent.innerHTML = kind === "criteria" ? criteriaModal(j) : kind === "matrix" ? matrix(j) : weightsModal(j); modal.classList.remove("is-hidden"); modal.querySelector("[data-modal-close]").focus(); }); });
    modal.querySelector("[data-modal-close]").onclick = closeModal; modal.onclick = function (event) { if (event.target === modal) closeModal(); };
  };
  global.renderCentralRespostas = function (tbodyId, respostas, options) {
    var body = document.getElementById(tbodyId); options = options || {}; if (!body) return;
    function setAction(kind, href) { var link = document.getElementById(tbodyId + "-" + kind + "-action"); if (!link) return; link.href = href || "#"; link.classList.toggle("is-disabled", !href); link.setAttribute("aria-disabled", href ? "false" : "true"); }
    function syncActions(selectedId) { var selected = (respostas || []).find(function (item) { return item.id === selectedId; }); var links = selected && options.linksFor ? options.linksFor(selected) : {}; setAction("public", links && links.public); syncCrudActions(tbodyId, selectedId, options.editingId); }
    body.innerHTML = (respostas || []).map(function (r) { var selected = options.selectedId === r.id, editing = options.editingId === r.id; function editable(field, value, label) { return editing ? '<input class="ami-inline-input" data-edit-field="' + field + '" type="text" value="' + esc(value) + '" aria-label="' + label + '">' : esc(value); } return '<tr class="collab-round-row ' + (selected ? "is-selected" : "") + '" aria-selected="' + selected + '"><td class="col-select"><input type="checkbox" class="ami-row-select" data-select-id="' + esc(r.id) + '" ' + (selected ? "checked" : "") + ' aria-label="Selecionar resposta de ' + esc(r.nome_completo) + '"></td><td>' + (r.status === "em_preenchimento" ? "Em preenchimento" : r.consistente ? "Consistente" : "Inconsistente") + '</td><td class="ami-cell-id" title="' + esc(r.id) + '">' + esc(r.id) + '</td><td class="ami-cell-id" title="' + esc(r.ambiente_id) + '">' + esc(r.ambiente_id) + '</td><td class="ami-cell-id" title="' + esc(r.hierarquizacao_id) + '">' + esc(r.hierarquizacao_id) + '</td><td title="' + esc(r.hierarquizacao_nome || r.hierarquizacao_codigo) + '">' + esc(r.hierarquizacao_nome || r.hierarquizacao_codigo) + '</td><td>' + editable("nome_completo", r.nome_completo, "Nome do especialista") + '</td><td>' + editable("email", r.email, "E-mail do especialista") + '</td><td>' + editable("instituicao", r.instituicao, "Instituição do especialista") + '</td><td>' + num(r.lambda_max) + '</td><td>' + num(r.indice_consistencia) + '</td><td>' + num(r.indice_aleatorio) + '</td><td>' + num(r.razao_consistencia) + '</td><td><button class="ami-cell-link" data-response-modal="matrix" data-record-id="' + esc(r.id) + '">Disponível</button></td><td><button class="ami-cell-link" data-response-modal="stats" data-record-id="' + esc(r.id) + '">' + (r.estatisticas && Object.keys(r.estatisticas).length ? "Disponíveis" : "Vazias") + '</button></td><td>' + date(r.enviadoEm) + '</td></tr>'; }).join("") || '<tr><td colspan="16" class="ami-empty">Nenhuma resposta colaborativa encontrada no banco.</td></tr>';
    if (options.selectedIds) body.querySelectorAll("[data-select-id]").forEach(function (checkbox) { var selected = options.selectedIds.has(checkbox.dataset.selectId), row = checkbox.closest("tr"); checkbox.checked = selected; if (row) { row.classList.toggle("is-selected", selected); row.setAttribute("aria-selected", String(selected)); } });
    if (options.editingId) body.querySelectorAll("[data-select-id]").forEach(function (checkbox) { checkbox.disabled = true; });
    syncActions(options.selectedId);
    body.querySelectorAll("[data-select-id]").forEach(function (checkbox) { checkbox.addEventListener("change", function () { if (options.onSelectionChange) options.onSelectionChange(checkbox.dataset.selectId, checkbox.checked); }); });
    var modal = document.getElementById(tbodyId + "-modal"), title = document.getElementById(tbodyId + "-modal-title"), content = document.getElementById(tbodyId + "-modal-content");
    body.querySelectorAll("[data-response-modal]").forEach(function (button) {
      button.addEventListener("click", function () {
        var r = (respostas || []).find(function (item) { return item.id === button.dataset.recordId; });
        if (!r) return;
        if (button.dataset.responseModal === "matrix") {
          title.textContent = "Matriz de comparação pareada da resposta";
          content.innerHTML = matrix({
            criterios: r.criterios,
            consolidacao: { matriz_consolidada: r.matriz_comparacao }
          }, r.estatisticas?.modo_comparacao === "por_grupo"
            ? "Comparações por grupo. Os traços indicam pares sem resposta ou de grupos diferentes."
            : "Matriz de comparação pareada enviada pelo especialista.", "Matriz de comparação pareada da resposta");
        } else {
          title.textContent = "Estatísticas da resposta";
          content.innerHTML = json(r.estatisticas || {}, "Dados estatísticos");
        }
        modal.classList.remove("is-hidden");
        modal.querySelector("[data-modal-close]").focus();
      });
    });
    function closeModal() { modal.classList.add("is-hidden"); } modal.querySelector("[data-modal-close]").onclick = closeModal; modal.onclick = function (event) { if (event.target === modal) closeModal(); };
  };
})(window);
