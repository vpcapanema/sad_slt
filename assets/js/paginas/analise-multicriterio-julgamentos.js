(function () {
  "use strict";

  var PAGE_SIZE = 15;
  var julgamentos = [];
  var hierarquizacoes = [];
  var respostasCentral = [];
  var draftEmails = [];
  var pairwiseMatrices = {};
  var pairwiseConfigured = {};
  var pairwiseMode = null;
  var pairwiseZoom = 1;
  var criteriaMatrix = null;
  var criteriaMatrixFileBase64 = null;
  var criteriaMatrixFileName = null;
  var currentPage = 1;
  var selectedIds = new Set();
  var selectedId = null;
  var editingId = null;
  var environmentMode = "create";
  var analysisWorkspace = null;
  var modo = new URLSearchParams(location.search).get("modo") || "julgamentos";
  var ambientesSourceUrl = "/api/ahp/comparacao-colaborativa/ambientes";
  var hierarquizacoesSourceUrl = "/api/ahp/hierarquizacoes/portfolio";
  var $ = function (id) { return document.getElementById(id); };
  var environmentFilterColumns = [
    ["status", "Situação"], ["id", "ID Julgamento"], ["hierarquizacao_id", "ID Hierarquização"],
    ["hierarquizacao_codigo", "Código da hierarquização"], ["hierarquizacao_nome", "Hierarquização"],
    ["valido_ate", "Prazo para respostas"], ["criadoEm", "Criado em"], ["atualizadoEm", "Atualizado em"]
  ];

  function appUrl(area, path) { return (area === "public" ? "/public" : "/restrict") + path; }
  function escapeHtml(value) { var node = document.createElement("span"); node.textContent = value == null ? "" : String(value); return node.innerHTML; }
  function api(url, options) {
    return fetch(url, Object.assign({ credentials: "same-origin", headers: { "Content-Type": "application/json" } }, options || {})).then(async function (response) {
      var body = await response.json().catch(function () { return {}; });
      if (!response.ok) throw new Error(body.detail && (body.detail.message || body.detail) || "Não foi possível concluir a operação.");
      return body;
    });
  }
  function matrixRows(matrix) { if (Array.isArray(matrix)) return matrix.filter(function (row) { return row && typeof row === "object"; }); if (!matrix || typeof matrix !== "object") return []; var rows = matrix.linhas || matrix.rows || matrix.criterios || matrix.dados || []; return Array.isArray(rows) ? rows.filter(function (row) { return row && typeof row === "object"; }) : []; }
  function matrixSummary(message, isError) { var node = $("ami-criteria-matrix-summary"); node.textContent = message || ""; node.classList.toggle("hidden", !message); node.classList.toggle("ahp-info-note--error", Boolean(isError)); }
  function normalizeSheetName(value) { return String(value || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }
  async function readCriteriaMatrix(file) {
    var ext = (file.name.split(".").pop() || "").toLowerCase();
    if (ext === "json") return JSON.parse(await file.text());
    if (ext === "csv") { var lines = (await file.text()).split(/\r?\n/).filter(function (line) { return line.trim(); }); if (!lines.length) throw new Error("O arquivo CSV está vazio."); var separator = lines[0].includes(";") ? ";" : ",", headers = lines.shift().split(separator).map(function (value) { return value.trim(); }); return { arquivo: file.name, linhas: lines.map(function (line) { return Object.fromEntries(line.split(separator).map(function (value, index) { return [headers[index], value.trim()]; })); }) }; }
    if (ext === "xlsx" && window.XLSX) { var workbook = XLSX.read(await file.arrayBuffer(), { type: "array" }), auxiliary = new Set(["instrucoes", "_listas", "etapas", "dimensoes de criterios", "criterios"]); var hasMatrixColumns = function (name) { var header = (XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, defval: "" })[0] || []).map(normalizeSheetName); return header.some(function (value) { return value.includes("crit"); }) && header.some(function (value) { return value.includes("etapa"); }); }; var sheet = ["Matriz Crit Premissas v3", "Matriz Crit Premissas v2"].find(function (name) { return workbook.SheetNames.includes(name); }) || workbook.SheetNames.find(function (name) { return !auxiliary.has(normalizeSheetName(name)) && hasMatrixColumns(name); }) || workbook.SheetNames.find(function (name) { return !auxiliary.has(normalizeSheetName(name)); }) || workbook.SheetNames[0]; return { arquivo: file.name, aba: sheet, linhas: XLSX.utils.sheet_to_json(workbook.Sheets[sheet], { defval: "" }) }; }
    throw new Error("Formato não suportado. Use JSON, CSV ou XLSX.");
  }
  async function fileToBase64(file) { var bytes = new Uint8Array(await file.arrayBuffer()), binary = "", block = 0x8000; for (var index = 0; index < bytes.length; index += block) binary += String.fromCharCode.apply(null, bytes.subarray(index, index + block)); return btoa(binary); }
  function statusLabel(status) { return { ativa: "Aberto", consolidada: "Consolidado", encerrada: "Encerrado" }[status] || status; }
  function actionLinks(j) { return { workspace: appUrl("restrict", "/analise-multicriterio/julgamentos/" + encodeURIComponent(j.id) + "/"), public: appUrl("public", "/analise-multicriterio/" + encodeURIComponent(j.token) + "/") }; }
  function filteredRows() {
    var query = (($("ami-filter-value") || $("ami-search")).value || "").toLowerCase(), filterColumn = $("ami-filter-column") && $("ami-filter-column").value;
    if (modo === "julgamentos") return respostasCentral.filter(function (r) { return [r.status, r.id, r.hierarquizacao_codigo, r.hierarquizacao_nome].join(" ").toLowerCase().includes(query); });
    return julgamentos.filter(function (j) {
      var h = hierarquizacoes.find(function (item) { return item.id === (j.config_id || j.hierarquizacao_id); });
      var values = Object.assign({}, j, { status: statusLabel(j.status), hierarquizacao_nome: j.hierarquizacao_nome || h && h.nome });
      return (filterColumn ? values[filterColumn] : Object.values(values)).toString().toLowerCase().includes(query);
    });
  }
  function syncEnvironmentFilterOptions() {
    if (!$("ami-filter-column")) return;
    var column = $("ami-filter-column").value, values = new Set();
    julgamentos.forEach(function (j) { var h = hierarquizacoes.find(function (item) { return item.id === j.hierarquizacao_id; }), value = column ? Object.assign({}, j, { status: statusLabel(j.status), hierarquizacao_nome: j.hierarquizacao_nome || h && h.nome })[column] : null; if (value != null && value !== "") values.add(String(value)); });
    $("ami-filter-options").innerHTML = Array.from(values).sort().map(function (value) { return '<option value="' + escapeHtml(value) + '"></option>'; }).join("");
  }
  function setupEnvironmentFilters() {
    if (!$("ami-filter-column")) return;
    $("ami-filter-column").insertAdjacentHTML("beforeend", environmentFilterColumns.map(function (entry) { return '<option value="' + entry[0] + '">' + entry[1] + "</option>"; }).join(""));
    $("ami-filter-column").addEventListener("change", function () { $("ami-filter-value").value = ""; syncEnvironmentFilterOptions(); currentPage = 1; render(); });
    $("ami-filter-value").addEventListener("input", function () { currentPage = 1; render(); });
  }
  function updateSelectedId() { selectedId = selectedIds.size === 1 ? Array.from(selectedIds)[0] : null; }
  function changeRowSelection(id, checked) {
    if (editingId) return;
    if (checked) selectedIds.add(id); else selectedIds.delete(id);
    updateSelectedId();
    render();
  }
  function syncSelectAll(rows) {
    var checkbox = $("ami-select-all-rows");
    if (!checkbox) return;
    var selectedCount = rows.filter(function (item) { return selectedIds.has(item.id); }).length;
    checkbox.checked = rows.length > 0 && selectedCount === rows.length;
    checkbox.indeterminate = selectedCount > 0 && selectedCount < rows.length;
    checkbox.disabled = Boolean(editingId) || rows.length === 0;
  }
  function render() {
    var rows = filteredRows();
    var source = modo === "julgamentos" ? respostasCentral : julgamentos;
    var validIds = new Set(source.map(function (item) { return item.id; }));
    selectedIds.forEach(function (id) { if (!validIds.has(id)) selectedIds.delete(id); });
    updateSelectedId();
    var pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
    currentPage = Math.min(currentPage, pageCount);
    var pageRows = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
    if (modo === "julgamentos") {
      $("ami-count").textContent = rows.length + (rows.length === 1 ? " julgamento" : " julgamentos");
      renderAnalysisRounds(pageRows);
    } else {
      $("ami-count").textContent = rows.length + (rows.length === 1 ? " julgamento" : " julgamentos");
      window.renderTabelaColaborativa("ami-judgments", pageRows, { selectedId: selectedId, selectedIds: selectedIds, editingId: editingId, paginated: true, linksFor: actionLinks, onSelectionChange: changeRowSelection });
    }
    syncPairwiseButtons();
    syncViewButton();
    syncSelectAll(rows);
    var pagination = $("ami-judgments-pagination");
    pagination.querySelector("[data-page-label]").textContent = "Página " + currentPage + " de " + pageCount;
    pagination.querySelector("[data-page-prev]").disabled = currentPage <= 1;
    pagination.querySelector("[data-page-next]").disabled = currentPage >= pageCount;
  }
  function renderAnalysisRounds(rows) {
    $("ami-judgments").innerHTML = rows.map(function (j) { var selected = selectedIds.has(j.id), convidados = (j.convites || []).length, enviadas = j.total_respostas || 0, preenchendo = j.respostas_em_preenchimento || 0, consistentes = j.respostas_consistentes || 0, analises = j.total_analises || 0, homologadas = j.analise_homologada_id ? 1 : 0; return '<tr class="collab-round-row ' + (selected ? "is-selected" : "") + '"><td class="col-select"><input type="checkbox" class="ami-row-select" data-analysis-round="' + escapeHtml(j.id) + '" ' + (selected ? "checked" : "") + '></td><td>' + escapeHtml(statusLabel(j.status)) + '</td><td class="ami-cell-id">' + escapeHtml(j.id) + '</td><td>' + escapeHtml(j.hierarquizacao_nome || j.hierarquizacao_codigo) + '</td><td>' + ratioLabel(enviadas + preenchendo, convidados) + '</td><td>' + ratioLabel(preenchendo, convidados) + '</td><td>' + ratioLabel(enviadas, convidados) + '</td><td>' + ratioLabel(consistentes, enviadas) + '</td><td>' + ratioLabel(homologadas, analises) + '</td><td>' + (j.analise_homologada_id ? "Sim" : "Não") + '</td><td>' + escapeHtml(deadlineLabel(j.valido_ate)) + '</td><td>' + escapeHtml(deadlineLabel(j.atualizadoEm)) + '</td></tr>'; }).join("") || '<tr><td colspan="12" class="ami-empty">Nenhum julgamento encontrado.</td></tr>';
    $("ami-judgments").querySelectorAll("[data-analysis-round]").forEach(function (input) { input.addEventListener("change", function () { changeRowSelection(input.dataset.analysisRound, input.checked); }); });
  }
  function ratioLabel(realizado, total) { var percentage = total > 0 ? Math.round((realizado / total) * 100) : 0; return '<span class="ami-ratio"><strong>' + realizado + '/' + total + '</strong><small>' + percentage + '%</small></span>'; }
  function fmtNumber(value) { return value == null ? "—" : Number(value).toFixed(4); }
  function analysisBars(items, valueKey, labelKey, options) {
    options = options || {}; if (!items.length) return '<p class="ami-empty">Sem dados suficientes para o gráfico.</p>';
    var maximum = options.maximum || Math.max.apply(null, items.map(function (item) { return Number(item[valueKey]) || 0; })) || 1;
    return '<div class="ami-bar-chart" role="img" aria-label="' + escapeHtml(options.label || "Distribuição dos valores") + '">' + items.map(function (item) { var value = Number(item[valueKey]) || 0, width = Math.max(1, Math.min(100, value / maximum * 100)); return '<div class="ami-bar-chart__row"><span class="ami-bar-chart__label">' + escapeHtml(item[labelKey]) + '</span><div class="ami-bar-chart__track"><span class="ami-bar-chart__bar" style="width:' + width.toFixed(2) + '%"></span></div><strong>' + (options.integer ? value : fmtNumber(value)) + '</strong></div>'; }).join("") + '</div>';
  }
  function analysisDonut(items, valueKey, labelKey, label) {
    if (!items.length) return '<p class="ami-empty">Sem dados suficientes para o gráfico.</p>';
    var total = items.reduce(function (sum, item) { return sum + Math.max(0, Number(item[valueKey]) || 0); }, 0);
    if (!total) return '<p class="ami-empty">Ainda não há valores para representar.</p>';
    var cursor = 0, stops = items.map(function (item, index) { var start = cursor, value = Math.max(0, Number(item[valueKey]) || 0); cursor += value / total * 100; return 'var(--ami-chart-' + ((index % 8) + 1) + ') ' + start.toFixed(2) + '% ' + cursor.toFixed(2) + '%'; });
    var legend = items.map(function (item, index) { var value = Math.max(0, Number(item[valueKey]) || 0), percentage = value / total * 100; return '<li><span class="ami-donut-chart__swatch" style="background:var(--ami-chart-' + ((index % 8) + 1) + ')"></span><span>' + escapeHtml(item[labelKey]) + '</span><strong>' + fmtNumber(value) + ' · ' + percentage.toFixed(1) + '%</strong></li>'; }).join("");
    return '<figure class="ami-donut-chart" role="img" aria-label="' + escapeHtml(label) + '"><div class="ami-donut-chart__plot" style="background:conic-gradient(' + stops.join(",") + ')"><span><strong>' + items.length + '</strong>componentes</span></div><figcaption><strong>' + escapeHtml(label) + '</strong><ul>' + legend + '</ul></figcaption></figure>';
  }
  function analysisMatrixTable(item) {
    var criteria = analysisWorkspace.ambiente.criterios || [], matrix = item.matriz_consolidada || [];
    if (!matrix.length) return '<p class="ami-empty">Matriz consolidada indisponível.</p>';
    return '<div class="matriz-table-wrap"><table class="admin-table matriz-view-table ami-matrix"><thead><tr><th>Critério</th>' + criteria.map(function (criterion, index) { return '<th>' + escapeHtml(criterionName(criterion, index)) + '</th>'; }).join("") + '</tr></thead><tbody>' + matrix.map(function (row, rowIndex) { return '<tr><th>' + escapeHtml(criterionName(criteria[rowIndex], rowIndex)) + '</th>' + row.map(function (value) { return '<td>' + fmtNumber(value) + '</td>'; }).join("") + '</tr>'; }).join("") + '</tbody></table></div>';
  }
  function renderAnalysisWorkspace(data) {
    analysisWorkspace = data; var a = data.ambiente, p = data.participacao;
    $("ami-analysis-context").textContent = (a.hierarquizacao_nome || a.hierarquizacao_codigo) + " · " + a.n_criterios + " critérios";
    $("ami-analysis-participation").innerHTML = [["Convidados",p.convidados],["Não iniciados",p.nao_iniciados],["Em preenchimento",p.em_preenchimento],["Enviadas",p.enviadas],["Consistentes",p.consistentes],["Inconsistentes",p.inconsistentes]].map(function (x) { return '<div class="ahp-metric-card"><div class="ahp-metric-card__label">' + x[0] + '</div><div class="ahp-metric-card__value">' + x[1] + '</div></div>'; }).join("");
    $("ami-analysis-participation-chart").innerHTML = analysisDonut([{situacao:"Não iniciados",valor:p.nao_iniciados},{situacao:"Em preenchimento",valor:p.em_preenchimento},{situacao:"Enviadas",valor:p.enviadas}], "valor", "situacao", "Situação dos participantes");
    $("ami-analysis-responses").innerHTML = data.respostas.map(function (r) { var sent = r.status === "enviada"; return '<tr><td><input type="checkbox" data-analysis-response="' + escapeHtml(r.id) + '" ' + (sent ? "checked" : "disabled") + '></td><td>' + (sent ? (r.consistente ? "Consistente" : "Inconsistente") : "Em preenchimento") + '</td><td>' + escapeHtml(r.nome_completo) + '<br><small>' + escapeHtml(r.email) + '</small></td><td>' + escapeHtml(r.instituicao) + '</td><td>' + fmtNumber(r.razao_consistencia) + '</td><td>' + escapeHtml(deadlineLabel(r.iniciadoEm)) + '</td><td>' + escapeHtml(deadlineLabel(r.enviadoEm)) + '</td></tr>'; }).join("");
    $("ami-analysis-criteria").innerHTML = data.estatisticas.por_criterio.map(function (c) { return '<tr><td>' + escapeHtml(c.criterio) + '</td><td>' + fmtNumber(c.media) + '</td><td>' + fmtNumber(c.minimo) + '</td><td>' + fmtNumber(c.maximo) + '</td><td>' + fmtNumber(c.desvio) + '</td></tr>'; }).join("") || '<tr><td colspan="5" class="ami-empty">Sem respostas enviadas.</td></tr>';
    $("ami-analysis-criteria-chart").innerHTML = analysisDonut(data.estatisticas.por_criterio, "media", "criterio", "Distribuição dos pesos médios");
    $("ami-analysis-pairs").innerHTML = data.estatisticas.por_par.map(function (pair) { return '<tr><td>' + escapeHtml(pair.criterio_a + " × " + pair.criterio_b) + '</td><td>' + pair.valores.map(fmtNumber).join("; ") + '</td><td>' + fmtNumber(pair.media_geometrica) + '</td><td>' + fmtNumber(pair.dispersao_log) + '</td></tr>'; }).join("") || '<tr><td colspan="4" class="ami-empty">Sem respostas enviadas.</td></tr>';
    $("ami-analysis-pairs-chart").innerHTML = analysisDonut(data.estatisticas.por_par.map(function (pair) { return {par:pair.criterio_a + " × " + pair.criterio_b, media_geometrica:pair.media_geometrica}; }), "media_geometrica", "par", "Distribuição relativa das comparações pareadas");
    renderAnalysisScenarios(data.analises, data.analise_homologada_id);
    $("ami-analysis-workspace").classList.remove("is-hidden"); $("ami-analysis-workspace").scrollIntoView({behavior:"smooth",block:"start"});
  }
  function renderAnalysisScenarios(items, homologadaId) {
    $("ami-analysis-scenarios").innerHTML = items.map(function (item) { var official = item.id === homologadaId || item.status === "homologada"; return '<article class="info-card"><h3>' + escapeHtml(item.nome) + ' <small>' + escapeHtml(item.codigo) + '</small></h3><div class="ami-kpis"><div><strong>' + item.respostas_incluidas + '</strong><span>respostas</span></div><div><strong>' + fmtNumber(item.razao_consistencia) + '</strong><span>RC</span></div><div><strong>' + (item.consistente ? "Sim" : "Não") + '</strong><span>consistente</span></div></div><div class="ahp-collab-grid2"><div><h4>Pesos finais</h4><div class="matriz-table-wrap"><table class="admin-table"><thead><tr><th>Critério</th><th>Peso final</th></tr></thead><tbody>' + item.pesos_consolidados.map(function (w,i) { return '<tr><td>' + escapeHtml(criterionName(analysisWorkspace.ambiente.criterios[i], i)) + '</td><td>' + fmtNumber(w) + '</td></tr>'; }).join("") + '</tbody></table></div></div><div><h4>Matriz consolidada</h4>' + analysisMatrixTable(item) + '</div></div>' + (official ? '<p class="ami-create-success"><strong>Análise homologada</strong></p>' : '<button type="button" class="btn btn-success" data-homologate-analysis="' + escapeHtml(item.id) + '" ' + (!item.consistente ? "disabled" : "") + '>Homologar cenário</button>') + '</article>'; }).join("") || '<p class="ami-empty">Nenhum cenário calculado.</p>';
    $("ami-analysis-scenarios").querySelectorAll("[data-homologate-analysis]").forEach(function (button) { button.addEventListener("click", function () { api("/api/ahp/comparacao-colaborativa/analises/" + button.dataset.homologateAnalysis + "/homologar", {method:"POST"}).then(function () { openAnalysisWorkspace(); }).catch(function (e) { $("ami-analysis-feedback").textContent=e.message; }); }); });
  }
  function openAnalysisWorkspace() { if (!selectedId) return; $("ami-analysis-feedback").textContent = "Carregando análise…"; api("/api/ahp/comparacao-colaborativa/ambientes/" + encodeURIComponent(selectedId) + "/espaco-analitico").then(function (data) { $("ami-analysis-feedback").textContent=""; renderAnalysisWorkspace(data); }).catch(function (e) { $("ami-analysis-feedback").textContent=e.message; }); }
  function setEnvironmentMode(mode) {
    environmentMode = mode;
    var creating = mode === "create", editing = mode === "edit", readonly = mode === "view";
    ["ami-deadline", "ami-emails", "ami-add-emails", "ami-select-all", "ami-delete-emails", "ami-criteria-matrix"].forEach(function (id) { if ($(id)) $(id).disabled = readonly; });
    $("ami-hierarchy").disabled = readonly;
    $("ami-email-list").querySelectorAll("input").forEach(function (input) { input.disabled = readonly; });
    var submit = $("ami-create-form").querySelector('button[type="submit"]'); if (submit) submit.classList.toggle("is-hidden", !creating);
    $("ami-environment-actions").classList.toggle("is-hidden", creating);
    $("ami-environment-edit").classList.toggle("is-hidden", editing);
    $("ami-environment-save").classList.toggle("is-hidden", !editing);
    $("ami-create-cancel").innerHTML = readonly ? '<i class="fas fa-xmark c-btn__icon"></i>Fechar visualização' : editing ? '<i class="fas fa-rotate-left c-btn__icon"></i>Cancelar edição' : "Cancelar";
    $("ami-create-section").classList.toggle("is-readonly", readonly);
  }
  function showCreateSection() { setEnvironmentMode("create"); $("ami-create-form").reset(); draftEmails = []; criteriaMatrix = null; criteriaMatrixFileBase64 = null; criteriaMatrixFileName = null; renderDraftEmails(); matrixSummary(""); $("ami-hierarchy-summary").textContent = ""; $("ami-create-status").className = "ami-empty"; $("ami-create-status").textContent = "O status será exibido após a confirmação dos colaboradores."; $("ami-email-draft-card").classList.add("is-hidden"); $("ami-create-section").classList.remove("is-hidden"); $("ami-deadline").focus(); $("ami-create-section").scrollIntoView({ behavior: "smooth", block: "start" }); }
  function hideCreateSection() { $("ami-create-section").classList.add("is-hidden"); $("ami-create-feedback").textContent = ""; setEnvironmentMode("create"); }
  function dateInputValue(value) { if (!value) return ""; var date = new Date(value), parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date).reduce(function (result, part) { result[part.type] = part.value; return result; }, {}); return parts.year + "-" + parts.month + "-" + parts.day; }
  function viewSelectedEnvironment() {
    var judgment = selectedRecord(); if (!judgment || modo !== "espaco") return;
    $("ami-deadline").value = dateInputValue(judgment.valido_ate);
    var option = Array.from($("ami-hierarchy").options).find(function (item) { return item.dataset.hierarquizacaoId === String(judgment.hierarquizacao_id || ""); });
    $("ami-hierarchy").value = option ? option.value : "";
    $("ami-hierarchy-summary").textContent = judgment.hierarquizacao_nome || judgment.hierarquizacao_codigo || "Configuração vinculada ao julgamento";
    criteriaMatrix = { linhas: judgment.criterios || [] };
    criteriaMatrixFileBase64 = null; criteriaMatrixFileName = judgment.arquivo_matriz_nome || null;
    matrixSummary((judgment.criterios || []).length + " critério(s) armazenado(s) neste julgamento" + (criteriaMatrixFileName ? " · " + criteriaMatrixFileName : "") + ".");
    draftEmails = (judgment.convites || []).map(function (invite) { return typeof invite === "string" ? invite : invite.email; }).filter(Boolean);
    renderDraftEmails(); setEnvironmentMode("view");
    $("ami-create-status").className = "ami-create-success";
    $("ami-create-status").innerHTML = '<strong>Ambiente colaborativo selecionado.</strong><span>Situação: ' + escapeHtml(statusLabel(judgment.status)) + '</span><span>Data limite: ' + escapeHtml(deadlineLabel(judgment.valido_ate)) + '</span><span>Participação: ' + escapeHtml(String(judgment.total_respostas || 0)) + ' resposta(s) de ' + escapeHtml(String((judgment.convites || []).length)) + ' convite(s)</span>';
    renderEmailDraft(judgment); $("ami-create-feedback").textContent = "Visualização somente leitura do registro selecionado.";
    $("ami-create-section").classList.remove("is-hidden"); $("ami-create-section").scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function editSelectedEnvironment() {
    if (!selectedRecord() || environmentMode !== "view") return;
    setEnvironmentMode("edit");
    $("ami-create-feedback").textContent = "Edição liberada para hierarquização, prazo e colaboradores.";
    $("ami-deadline").focus();
  }
  function saveSelectedEnvironment() {
    var judgment = selectedRecord(), feedbackNode = $("ami-create-feedback");
    if (!judgment || environmentMode !== "edit") return;
    addDraftEmails();
    if (!draftEmails.length) { feedbackNode.textContent = "Adicione ao menos um colaborador à lista."; return; }
    if (!$("ami-deadline").value) { feedbackNode.textContent = "Informe a data limite da coleta."; return; }
    var selectedHierarchy = $("ami-hierarchy").selectedOptions[0];
    if (!selectedHierarchy || !selectedHierarchy.dataset.hierarquizacaoId) { feedbackNode.textContent = "Selecione a hierarquização."; return; }
    feedbackNode.textContent = "Salvando alterações…";
    $("ami-environment-save").disabled = true;
    var updatePayload = { hierarquizacao_id: selectedHierarchy.dataset.hierarquizacaoId, matriz_premissas_criterios: criteriaMatrix, convites: draftEmails.map(function (email) { return { email: email }; }), valido_ate: deadlineEndOfDay() }; if (criteriaMatrixFileBase64) { updatePayload.arquivo_matriz_base64 = criteriaMatrixFileBase64; updatePayload.arquivo_matriz_nome = criteriaMatrixFileName; }
    api("/api/ahp/comparacao-colaborativa/ambientes/" + encodeURIComponent(judgment.id), { method: "PATCH", body: JSON.stringify(updatePayload) }).then(function (updated) {
      var index = julgamentos.findIndex(function (item) { return item.id === updated.id; });
      if (index >= 0) julgamentos[index] = updated;
      selectedIds.clear(); selectedIds.add(updated.id); updateSelectedId(); render(); viewSelectedEnvironment();
      $("ami-create-feedback").textContent = "Alterações salvas no banco com sucesso.";
    }).catch(function (err) { feedbackNode.textContent = err.message; }).finally(function () { $("ami-environment-save").disabled = false; });
  }
  function parseEmails(value) { return Array.from(new Set(value.split(/[\n,;]+/).map(function (v) { return v.trim().toLowerCase(); }).filter(Boolean))); }
  function deadlineLabel(value) { if (!value) return ""; return new Date(value).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }); }
  function endOfDayIso(value) { if (!value) return null; var parts = value.split("-").map(Number); return new Date(parts[0], parts[1] - 1, parts[2], 23, 59, 59, 0).toISOString(); }
  function formatDeadline() { var value = $("ami-deadline").value; return value ? deadlineLabel(endOfDayIso(value)) : "Defina a data limite"; }
  function deadlineEndOfDay() { return endOfDayIso($("ami-deadline").value); }
  function persistentPublicUrl(judgment) {
    if (!judgment || !judgment.url_publica) return "";
    try { var url = new URL(String(judgment.url_publica), location.origin); return /^https?:$/.test(url.protocol) && url.searchParams.get("token") ? url.href : ""; }
    catch (_error) { return ""; }
  }
  function invitationLines(judgment) {
    var criteria = comparisonCriteria(judgment), deadline = deadlineLabel(judgment.valido_ate);
    var lines = ["Olá, colaborador(a)!", "", "Você foi convidado(a) a preencher a matriz de comparação pareada" + (judgment.hierarquizacao_nome ? ' da análise "' + judgment.hierarquizacao_nome + '"' : " de uma análise AHP") + " no SICARD."];
    if (criteria.length) { lines.push("", "Critérios a comparar (" + criteria.length + "):"); criteria.forEach(function (name, index) { lines.push((index + 1) + ". " + name); }); }
    lines.push("", "Acesse o formulário colaborativo pelo link abaixo" + (deadline ? " até " + deadline : "") + ":", persistentPublicUrl(judgment) || "(link indisponível)", "", "Atenção: para enviar a resposta, a consistência (RC) deve ser menor que 0,10.", "", "Atenciosamente,", "Equipe SICARD/SLT");
    return lines;
  }
  function renderEmailDraft(judgment) {
    var card = $("ami-email-draft-card"), messageBox = $("ami-email-template"), link = $("ami-email-form-link"), url = persistentPublicUrl(judgment), lines = invitationLines(judgment), message = lines.join("\n");
    messageBox.dataset.message = message; messageBox.textContent = "";
    lines.forEach(function (line, index) { if (line === url && url) { var anchor = document.createElement("a"); anchor.href = url; anchor.target = "_blank"; anchor.rel = "noopener"; anchor.textContent = url; messageBox.appendChild(anchor); } else { messageBox.appendChild(document.createTextNode(line)); } if (index < lines.length - 1) messageBox.appendChild(document.createTextNode("\n")); });
    link.href = url || "#"; link.textContent = url || "Link indisponível"; card.classList.remove("is-hidden");
  }
  function renderDraftEmails() {
    $("ami-email-list").innerHTML = draftEmails.length ? draftEmails.map(function (email, index) { return '<tr><td class="ahp-collab-chk-col"><input type="checkbox" data-draft-index="' + index + '" aria-label="Selecionar ' + escapeHtml(email) + '"></td><td>Colaborador ' + (index + 1) + '</td><td>' + escapeHtml(email) + '</td><td>' + escapeHtml(formatDeadline()) + '</td></tr>'; }).join("") : '<tr><td colspan="4" class="ami-empty">Nenhum colaborador adicionado.</td></tr>';
    $("ami-select-all").checked = false;
    $("ami-delete-emails").disabled = true;
    $("ami-email-list").querySelectorAll("[data-draft-index]").forEach(function (checkbox) { checkbox.addEventListener("change", updateDraftControls); });
  }
  function updateDraftControls() { $("ami-delete-emails").disabled = !$("ami-email-list").querySelector("[data-draft-index]:checked"); }
  function addDraftEmails() {
    var incoming = parseEmails($("ami-emails").value);
    incoming.forEach(function (email) { if (!draftEmails.includes(email)) draftEmails.push(email); });
    $("ami-emails").value = "";
    $("ami-create-feedback").textContent = incoming.length ? "Colaboradores adicionados à lista." : "Informe ao menos um e-mail.";
    renderDraftEmails();
  }
  function criterionName(criterion, index) { return typeof criterion === "string" ? criterion : criterion && (criterion.criterio || criterion.nome || criterion.Critério || criterion.name) || "Critério " + (index + 1); }
  function comparisonCriteria(judgment) { return (judgment && judgment.criterios || []).map(criterionName); }
  function pairwiseMatrix(judgment) {
    var criteria = comparisonCriteria(judgment), existing = pairwiseMatrices[judgment.id];
    if (existing && existing.length === criteria.length) return existing;
    var consolidated = judgment.consolidacao && judgment.consolidacao.matriz_consolidada;
    var matrix = criteria.map(function (_name, row) { return criteria.map(function (_other, column) { var value = consolidated && consolidated[row] && Number(consolidated[row][column]); return Number.isFinite(value) && value > 0 ? value : (row === column ? 1 : 1); }); });
    pairwiseMatrices[judgment.id] = matrix;
    return matrix;
  }
  function pairKey(row, column) { return Math.min(row, column) + "_" + Math.max(row, column); }
  function configuredPairs(judgment) {
    if (!pairwiseConfigured[judgment.id]) {
      var configured = new Set(), criteria = comparisonCriteria(judgment), consolidated = judgment.consolidacao && judgment.consolidacao.matriz_consolidada;
      if (consolidated && consolidated.length === criteria.length) criteria.forEach(function (_name, row) { criteria.forEach(function (_other, column) { if (row < column) configured.add(pairKey(row, column)); }); });
      pairwiseConfigured[judgment.id] = configured;
    }
    return pairwiseConfigured[judgment.id];
  }
  function markPairConfigured(judgment, row, column) { configuredPairs(judgment).add(pairKey(row, column)); updatePairCounter(judgment); }
  function ensurePairCounter() {
    var component = $(pairwiseMode === "matrix" ? "ami-pairwise-matrix-component" : "ami-pairwise-form-component"), heading = component && component.querySelector(".ami-pairwise-heading"), zoom = pairwiseMode === "matrix" ? $("ami-matrix-zoom") : null, counter = $("ami-pair-counter"); if (!heading) return;
    if (!counter) { counter = document.createElement("div"); counter.id = "ami-pair-counter"; counter.className = "ami-pair-counter"; counter.setAttribute("role", "status"); counter.setAttribute("aria-live", "polite"); counter.innerHTML = '<span>Pares configurados</span><strong id="ami-pair-counter-value">0/0</strong>'; }
    heading.insertBefore(counter, zoom);
  }
  function updatePairCounter(judgment) { ensurePairCounter(); var total = comparisonCriteria(judgment).length, maximum = total * (total - 1) / 2, current = configuredPairs(judgment).size, value = $("ami-pair-counter-value"); if (value) value.textContent = current + "/" + maximum; $("ami-pair-counter").classList.toggle("is-complete", maximum > 0 && current === maximum); }
  function applyConfiguredVisuals(judgment, host) {
    configuredPairs(judgment).forEach(function (key) {
      var parts = key.split("_").map(Number), inputs = host.querySelectorAll('[data-pair-row="' + parts[0] + '"][data-pair-column="' + parts[1] + '"], [data-pair-row="' + parts[1] + '"][data-pair-column="' + parts[0] + '"]');
      inputs.forEach(function (input) { var pair = input.closest(".saaty-pair"), cell = input.closest("td"); if (pair) { pair.classList.add("is-pair-configured", "is-auto-validated"); var reciprocalBox = pair.querySelector(".saaty-reciprocal"); if (reciprocalBox) reciprocalBox.classList.add("is-auto-validated"); var status = pair.querySelector(".saaty-auto-status"); if (status) status.innerHTML = '<i class="fas fa-check-circle" aria-hidden="true"></i><span>Par validado</span>'; } if (cell) cell.classList.add("is-pair-configured"); });
      var reciprocal = host.querySelector('[data-reciprocal="' + parts[0] + '-' + parts[1] + '"]'); if (reciprocal) reciprocal.classList.add("is-auto-validated");
    });
  }
  function saatyLabel(value) { var fractions = { "0.1111111111111111": "1/9", "0.125": "1/8", "0.14285714285714285": "1/7", "0.16666666666666666": "1/6", "0.2": "1/5", "0.25": "1/4", "0.3333333333333333": "1/3", "0.5": "1/2" }; return fractions[String(value)] || String(value); }
  function saatyOptions(selected) { var values = [1 / 9, 1 / 8, 1 / 7, 1 / 6, 1 / 5, 1 / 4, 1 / 3, 1 / 2, 1, 2, 3, 4, 5, 6, 7, 8, 9]; return values.map(function (value) { return '<option value="' + value + '"' + (Math.abs(value - selected) < 0.000001 ? " selected" : "") + '>' + saatyLabel(value) + "</option>"; }).join(""); }
  function ahpMetrics(matrix) {
    var n = matrix.length, ri = [0, 0, 0, 0.58, 0.90, 1.12, 1.24, 1.32, 1.41, 1.45, 1.49, 1.51, 1.48, 1.56, 1.57, 1.59, 1.605, 1.61, 1.615, 1.62, 1.625];
    if (!n) return null;
    var weights = Array(n).fill(1 / n);
    for (var iteration = 0; iteration < 100; iteration += 1) {
      var next = matrix.map(function (row) { return row.reduce(function (sum, value, column) { return sum + value * weights[column]; }, 0); });
      var total = next.reduce(function (sum, value) { return sum + value; }, 0) || 1;
      next = next.map(function (value) { return value / total; });
      var delta = Math.max.apply(null, next.map(function (value, index) { return Math.abs(value - weights[index]); }));
      weights = next;
      if (delta < 1e-10) break;
    }
    var lambda = matrix.reduce(function (sum, row, index) { var weighted = row.reduce(function (rowSum, value, column) { return rowSum + value * weights[column]; }, 0); return sum + weighted / weights[index]; }, 0) / n;
    var ci = n > 1 ? Math.max(0, (lambda - n) / (n - 1)) : 0, ia = ri[n] == null ? 1.625 : ri[n], rc = ia > 0 ? ci / ia : 0;
    return { lambda: lambda, ci: ci, ia: ia, rc: rc };
  }
  function updateLiveMetrics(judgment) {
    var metrics = ahpMetrics(pairwiseMatrix(judgment)), host = $("ami-live-metrics");
    if (!metrics || !host) return;
    $("ami-metric-lambda").textContent = metrics.lambda.toFixed(4); $("ami-metric-ic").textContent = metrics.ci.toFixed(4); $("ami-metric-ia").textContent = metrics.ia.toFixed(4); $("ami-metric-rc").textContent = metrics.rc.toFixed(4);
    host.className = "ahp-live-metrics ami-live-metrics " + (metrics.rc <= 0.1 ? "is-success" : "is-failure");
  }
  function updatePairwise(judgment, row, column, value) { var matrix = pairwiseMatrix(judgment); matrix[row][column] = value; matrix[column][row] = 1 / value; markPairConfigured(judgment, row, column); renderPairwise(judgment); }
  function applyMatrixZoom() { var table = document.querySelector("#ami-pairwise-matrix-content .ami-pairwise-matrix"), label = $("ami-matrix-zoom-value"); if (table) table.style.zoom = String(pairwiseZoom); if (label) label.textContent = Math.round(pairwiseZoom * 100) + "%"; }
  var FORM_SAATY_STEPS = [{ v: 1 / 9, label: "1/9", desc: "Extremamente" }, { v: 1 / 7, label: "1/7", desc: "Bastante" }, { v: 1 / 5, label: "1/5", desc: "Médio" }, { v: 1 / 3, label: "1/3", desc: "Pouco" }, { v: 1, label: "1", desc: "Igual" }, { v: 3, label: "3", desc: "Pouco" }, { v: 5, label: "5", desc: "Médio" }, { v: 7, label: "7", desc: "Bastante" }, { v: 9, label: "9", desc: "Extremamente" }];
  function nearestFormStep(value) { var best = 4, difference = Infinity; FORM_SAATY_STEPS.forEach(function (step, index) { var current = Math.abs(Math.log(step.v) - Math.log(value)); if (current < difference) { best = index; difference = current; } }); return best; }
  function buildSaatyFormPair(row, column, criteria, value) {
    var id = row + "_" + column, ticks = FORM_SAATY_STEPS.map(function (step, index) { return '<div class="saaty-tick" style="left:' + ((index / 8) * 100) + '%"><span class="saaty-tick-val">' + step.label + '</span><span class="saaty-tick-desc">' + step.desc + '</span><span class="saaty-tick-mark"></span></div>'; }).join("");
    return '<div class="saaty-pair" data-i="' + row + '" data-j="' + column + '"><div class="saaty-controller-title" title="' + escapeHtml(criteria[row]) + '"><strong>' + escapeHtml(criteria[row]) + '</strong></div><div class="saaty-auto-status" aria-live="polite"><i class="fas fa-pen" aria-hidden="true"></i><span>Pronto para julgamento</span></div><div class="saaty-widget"><div class="saaty-scale" data-pid="' + id + '" tabindex="0" role="slider" aria-valuemin="0" aria-valuemax="8" aria-valuenow="4" aria-label="Comparação entre ' + escapeHtml(criteria[row]) + " e " + escapeHtml(criteria[column]) + '"><div class="saaty-arrow"></div><div class="saaty-rail">' + ticks + '<div class="saaty-handle"></div></div></div><div class="saaty-dir"><span><i class="fas fa-arrow-left"></i> Menos importante</span><span>Mais importante <i class="fas fa-arrow-right"></i></span></div></div><div class="saaty-criteria"><span class="saaty-crit saaty-crit--left"><span class="saaty-crit__tag">1</span><span class="saaty-crit__name">' + escapeHtml(criteria[row]) + '</span></span><span class="saaty-vs">vs</span><span class="saaty-crit saaty-crit--right"><span class="saaty-crit__tag">2</span><span class="saaty-crit__name">' + escapeHtml(criteria[column]) + '</span></span></div><div class="saaty-readout"></div><div class="saaty-reciprocal" aria-live="polite"><span class="saaty-reciprocal__label"><i class="fas fa-rotate" aria-hidden="true"></i> Valor oposto aplicado automaticamente</span><span class="saaty-reciprocal__value">1</span><span class="saaty-reciprocal__text"></span></div><input type="hidden" data-pair-row="' + row + '" data-pair-column="' + column + '" value="' + value + '"></div>';
  }
  function wireSaatyFormPair(pair, judgment, criteria) {
    var scale = pair.querySelector(".saaty-scale"), rail = pair.querySelector(".saaty-rail"), handle = pair.querySelector(".saaty-handle"), input = pair.querySelector("[data-pair-row]"), status = pair.querySelector(".saaty-auto-status"), row = Number(input.dataset.pairRow), column = Number(input.dataset.pairColumn), index = nearestFormStep(Number(input.value) || 1), dragging = false, validationTimer = null;
    function validateCard(target, automatic) { var targetStatus = target.querySelector(".saaty-auto-status"), targetReciprocal = target.querySelector(".saaty-reciprocal"); target.classList.remove("is-auto-editing"); target.classList.add("is-auto-validated", "is-pair-configured"); if (targetReciprocal) { targetReciprocal.classList.remove("is-auto-validating"); targetReciprocal.classList.add("is-auto-validated"); } if (targetStatus) targetStatus.innerHTML = '<i class="fas fa-check-circle" aria-hidden="true"></i><span>' + (automatic ? "Card oposto configurado e validado automaticamente" : "Par e valor oposto validados automaticamente") + "</span>"; }
    function scheduleVisualValidation() { var reciprocalBox = pair.querySelector(".saaty-reciprocal"), reciprocal = pairwiseMatrix(judgment)[column][row], oppositePair = document.querySelector('.saaty-pair[data-i="' + column + '"][data-j="' + row + '"]'); if (oppositePair && oppositePair._applySaaty) oppositePair._applySaaty(nearestFormStep(reciprocal)); clearTimeout(validationTimer); markPairConfigured(judgment, row, column); updateLiveMetrics(judgment); pair.classList.remove("is-auto-validated"); pair.classList.add("is-auto-editing"); reciprocalBox.classList.remove("is-auto-validated"); reciprocalBox.classList.add("is-auto-validating"); if (oppositePair) { oppositePair.classList.remove("is-auto-validated"); oppositePair.classList.add("is-auto-editing"); } status.innerHTML = '<i class="fas fa-pen" aria-hidden="true"></i><span>Julgamento em edição · card oposto sincronizado</span>'; validationTimer = setTimeout(function () { validateCard(pair, false); if (oppositePair) validateCard(oppositePair, true); }, 700); }
    function apply(next, persist) { index = Math.max(0, Math.min(8, next)); var step = FORM_SAATY_STEPS[index], reciprocal = 1 / step.v, colors = ["#7b1a1a", "#c0392b", "#d96b61", "#f4a7a0", "#7b8794", "#a9cdec", "#5b9bd5", "#2f6fad", "#0d3b66"], readout = pair.querySelector(".saaty-readout"), reciprocalBox = pair.querySelector(".saaty-reciprocal"); handle.style.left = ((index / 8) * 100) + "%"; handle.style.backgroundColor = colors[index]; scale.setAttribute("aria-valuenow", String(index)); if (persist !== false) { input.value = String(step.v); pairwiseMatrix(judgment)[row][column] = step.v; pairwiseMatrix(judgment)[column][row] = reciprocal; scheduleVisualValidation(); } pair.classList.toggle("saaty-pair--equal", index === 4); pair.classList.toggle("saaty-pair--filled", index !== 4); readout.textContent = index === 4 ? "“" + criteria[row] + "” tem igual importância que “" + criteria[column] + "” (1)" : "“" + criteria[row] + "” é " + step.desc.toLowerCase() + (index > 4 ? " mais" : " menos") + " importante que “" + criteria[column] + "” (" + step.label + ")"; readout.className = "saaty-readout saaty-readout--" + (index === 4 ? "eq" : index > 4 ? "pos" : "neg"); pair.querySelector(".saaty-reciprocal__value").textContent = saatyLabel(reciprocal); pair.querySelector(".saaty-reciprocal__text").textContent = criteria[column] + " em relação a " + criteria[row] + " = " + saatyLabel(reciprocal); reciprocalBox.classList.remove("is-positive", "is-negative", "is-equal"); reciprocalBox.classList.add(index > 4 ? "is-negative" : index < 4 ? "is-positive" : "is-equal"); }
    pair._applySaaty = function (next) { input.value = String(FORM_SAATY_STEPS[Math.max(0, Math.min(8, next))].v); apply(next, false); };
    function fromX(clientX) { var bounds = rail.getBoundingClientRect(); return Math.round(Math.max(0, Math.min(1, (clientX - bounds.left) / bounds.width)) * 8); }
    function down(event) { dragging = true; pair.classList.add("saaty-pair--touched"); scale.classList.add("saaty-scale--active"); apply(fromX(event.touches && event.touches.length ? event.touches[0].clientX : event.clientX)); event.preventDefault(); }
    function move(event) { if (!dragging) return; apply(fromX(event.touches && event.touches.length ? event.touches[0].clientX : event.clientX)); event.preventDefault(); }
    function up() { dragging = false; scale.classList.remove("saaty-scale--active"); }
    scale.addEventListener("mousedown", down); document.addEventListener("mousemove", move); document.addEventListener("mouseup", up); scale.addEventListener("touchstart", down, { passive: false }); document.addEventListener("touchmove", move, { passive: false }); document.addEventListener("touchend", up); scale.addEventListener("keydown", function (event) { if (["ArrowLeft", "ArrowDown"].includes(event.key)) { pair.classList.add("saaty-pair--touched"); apply(index - 1); event.preventDefault(); } else if (["ArrowRight", "ArrowUp"].includes(event.key)) { pair.classList.add("saaty-pair--touched"); apply(index + 1); event.preventDefault(); } else if (event.key === "Home") { pair.classList.add("saaty-pair--touched"); apply(0); event.preventDefault(); } else if (event.key === "End") { pair.classList.add("saaty-pair--touched"); apply(8); event.preventDefault(); } }); apply(index, false);
  }
  function renderPairwise(judgment) {
    var criteria = comparisonCriteria(judgment), matrix = pairwiseMatrix(judgment), isMatrix = pairwiseMode === "matrix", host = $(isMatrix ? "ami-pairwise-matrix-content" : "ami-pairwise-form-content"), context = $(isMatrix ? "ami-pairwise-matrix-context" : "ami-pairwise-form-context");
    $("ami-pairwise-matrix-component").classList.toggle("is-hidden", !isMatrix); $("ami-pairwise-form-component").classList.toggle("is-hidden", isMatrix);
    context.textContent = "Critérios do julgamento " + (judgment.hierarquizacao_codigo || judgment.id) + ": " + criteria.join("; ") + ".";
    if (!criteria.length) { host.innerHTML = '<p class="ami-empty">O registro selecionado não possui critérios armazenados.</p>'; return; }
    if (isMatrix) {
      host.innerHTML = '<div class="ami-pairwise-scroll"><table class="admin-table ami-pairwise-matrix"><thead><tr><th>Critério</th>' + criteria.map(function (name) { return '<th title="' + escapeHtml(name) + '">' + escapeHtml(name) + "</th>"; }).join("") + '</tr></thead><tbody>' + criteria.map(function (name, row) { return '<tr><th title="' + escapeHtml(name) + '">' + escapeHtml(name) + "</th>" + criteria.map(function (_other, column) { if (row === column) return '<td><span class="ami-pairwise-diagonal">1</span></td>'; if (row < column) return '<td><select class="c-form-control ami-pairwise-select" data-pair-row="' + row + '" data-pair-column="' + column + '" aria-label="Comparar ' + escapeHtml(criteria[row]) + " com " + escapeHtml(criteria[column]) + '">' + saatyOptions(matrix[row][column]) + "</select></td>"; return '<td data-reciprocal="' + column + "-" + row + '">' + escapeHtml(saatyLabel(matrix[row][column])) + "</td>"; }).join("") + "</tr>"; }).join("") + "</tbody></table></div>";
    } else {
      var pairs = [];
      criteria.forEach(function (_left, row) { criteria.forEach(function (_right, column) { if (row !== column) pairs.push(buildSaatyFormPair(row, column, criteria, matrix[row][column])); }); });
      host.innerHTML = '<div class="saaty-form ami-saaty-form">' + pairs.join("") + "</div>";
      host.querySelectorAll(".saaty-pair").forEach(function (pair) { wireSaatyFormPair(pair, judgment, criteria); });
    }
    if (isMatrix) host.querySelectorAll("[data-pair-row]").forEach(function (select) { select.addEventListener("change", function () { updatePairwise(judgment, Number(select.dataset.pairRow), Number(select.dataset.pairColumn), Number(select.value)); }); });
    applyConfiguredVisuals(judgment, host); applyMatrixZoom(); updateLiveMetrics(judgment); updatePairCounter(judgment);
  }
  function loadSaatyScale() {
    var host = $("ami-saaty-scale-host"); if (host.dataset.loaded === "true") return Promise.resolve();
    return fetch(appUrl("restrict", "/ahp/comparacao/"), { credentials: "same-origin" }).then(function (response) { if (!response.ok) throw new Error("Não foi possível carregar a escala de Saaty."); return response.text(); }).then(function (html) {
      var source = new DOMParser().parseFromString(html, "text/html").querySelector("#saaty-scale-subcard"); if (!source) throw new Error("A subseção Escala de Intensidade de Importância não foi encontrada.");
      host.replaceChildren(source.cloneNode(true)); host.dataset.loaded = "true";
      var scaleIndex = host.querySelector(".ahp-subsection-num"); if (scaleIndex) { scaleIndex.textContent = "2.1"; scaleIndex.classList.remove("ahp-subsection-num--roman"); }
      var toggle = host.querySelector("#saaty-scale-toggle"), extras = host.querySelectorAll(".saaty-scale-extra"), icon = host.querySelector("#saaty-scale-chevron i");
      function toggleScale() { var expanded = toggle.getAttribute("aria-expanded") !== "true"; toggle.setAttribute("aria-expanded", String(expanded)); extras.forEach(function (element) { element.classList.toggle("is-hidden", !expanded); }); if (icon) { icon.classList.toggle("fa-chevron-down", !expanded); icon.classList.toggle("fa-chevron-up", expanded); } }
      toggle.addEventListener("click", toggleScale); toggle.addEventListener("keydown", function (event) { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); toggleScale(); } });
    }).catch(function (error) { host.innerHTML = '<p class="ami-feedback">' + escapeHtml(error.message) + "</p>"; });
  }
  function syncPairwiseButtons() { [$("ami-judgments-matrix-action"), $("ami-judgments-form-action")].forEach(function (button) { if (!button) return; var enabled = modo === "espaco" && Boolean(selectedId) && !editingId; button.disabled = !enabled; button.classList.toggle("is-disabled", !enabled); button.classList.toggle("is-hidden", modo !== "espaco"); }); }
  function syncViewButton() { var button = $("ami-judgments-view-action"); if (!button) return; var enabled = ["espaco","julgamentos"].includes(modo) && Boolean(selectedId) && !editingId; button.disabled = !enabled; button.classList.toggle("is-disabled", !enabled); }
  function createViewButton() {
    if (!["espaco","julgamentos"].includes(modo) || $("ami-judgments-view-action")) return;
    var toolbar = document.querySelector(".ami-table-actions"), edit = $("ami-judgments-edit-action"), button = document.createElement("button");
    button.className = "admin-icon-btn is-disabled"; button.id = "ami-judgments-view-action"; button.type = "button"; button.title = modo === "julgamentos" ? "Analisar respostas do julgamento" : "Visualizar ambiente colaborativo"; button.setAttribute("aria-label", button.title); button.disabled = true; button.innerHTML = '<i class="fa-solid fa-eye" aria-hidden="true"></i>';
    toolbar.insertBefore(button, edit); button.addEventListener("click", modo === "julgamentos" ? openAnalysisWorkspace : viewSelectedEnvironment);
  }
  function feedback(message, isError) { var node = $("ami-judgments-feedback"); node.textContent = message || ""; node.classList.toggle("is-error", Boolean(isError)); }
  function selectedRecord() { var source = modo === "julgamentos" ? respostasCentral : julgamentos; return source.find(function (item) { return item.id === selectedId; }); }
  function startInlineEdit() { if (!selectedRecord()) return; editingId = selectedId; feedback(""); render(); var input = $("ami-judgments").querySelector("[data-edit-field]"); if (input) input.focus(); }
  function cancelInlineEdit() { editingId = null; feedback("Alterações descartadas."); render(); }
  function inlinePayload() {
    var fields = {}; $("ami-judgments").querySelectorAll("[data-edit-field]").forEach(function (input) { fields[input.dataset.editField] = input.value.trim(); });
    if (modo === "julgamentos") return { nome_completo: fields.nome_completo, email: fields.email, instituicao: fields.instituicao };
    var emails = Array.from(new Set((fields.convites || "").split(/[,;]+/).map(function (email) { return email.trim().toLowerCase(); }).filter(Boolean)));
    return { convites: emails.map(function (email) { return { email: email }; }), valido_ate: endOfDayIso(fields.valido_ate) };
  }
  function saveInlineEdit() {
    if (!editingId) return;
    var endpoint = modo === "julgamentos" ? "/api/ahp/comparacao-colaborativa/respostas/" : "/api/ahp/comparacao-colaborativa/ambientes/";
    api(endpoint + encodeURIComponent(editingId), { method: "PATCH", body: JSON.stringify(inlinePayload()) }).then(function (updated) {
      var source = modo === "julgamentos" ? respostasCentral : julgamentos, index = source.findIndex(function (item) { return item.id === editingId; });
      if (index >= 0) source[index] = Object.assign({}, source[index], updated); editingId = null; feedback("Alterações salvas no banco."); render();
    }).catch(function (error) { feedback(error.message, true); });
  }
  function deleteSelected() {
    var record = selectedRecord(); if (!record) return;
    var label = modo === "julgamentos" ? "esta resposta" : "este julgamento e todas as respostas vinculadas";
    if (!window.confirm("Deseja excluir definitivamente " + label + "?")) return;
    var endpoint = modo === "julgamentos" ? "/api/ahp/comparacao-colaborativa/respostas/" : "/api/ahp/comparacao-colaborativa/ambientes/";
    api(endpoint + encodeURIComponent(selectedId), { method: "DELETE" }).then(function () {
      if (modo === "julgamentos") respostasCentral = respostasCentral.filter(function (item) { return item.id !== selectedId; }); else julgamentos = julgamentos.filter(function (item) { return item.id !== selectedId; });
      selectedIds.delete(selectedId); updateSelectedId(); editingId = null; feedback("Registro excluído do banco."); render();
    }).catch(function (error) { feedback(error.message, true); });
  }
  function openPairwise(mode) { var judgment = julgamentos.find(function (item) { return item.id === selectedId; }); if (!judgment) return; pairwiseMode = mode; [["ami-judgments-matrix-action", "matrix"], ["ami-judgments-form-action", "form"]].forEach(function (entry) { var active = mode === entry[1]; $(entry[0]).classList.toggle("is-active", active); $(entry[0]).setAttribute("aria-pressed", String(active)); }); $("ami-pairwise-panel").classList.remove("is-hidden"); loadSaatyScale().then(function () { renderPairwise(judgment); $("ami-pairwise-panel").scrollIntoView({ behavior: "smooth", block: "start" }); }); }
  function setupMode() {
    if (modo === "espaco") {
      $("ami-page-title-text").textContent = "Central de julgamentos";
      $("ami-page-title-icon").className = "fa-solid fa-people-group";
      $("ami-page-intro").textContent = "Configure participantes, prazo de coleta e acesso ao ambiente colaborativo.";
      document.title = "Central de julgamentos — SICARD";
      $("ami-new").classList.remove("is-hidden");
    } else if (modo === "formulario") {
      $("ami-page-title-text").textContent = "Formulário dos especialistas";
      $("ami-page-title-icon").className = "fa-solid fa-clipboard-question";
      $("ami-page-intro").textContent = "Selecione um julgamento e use o botão acima da tabela para abrir o formulário público.";
      document.title = "Formulário dos especialistas — SICARD";
    } else {
      $("ami-page-title-text").textContent = "Central de respostas";
      $("ami-page-title-icon").className = "fa-solid fa-list-check";
      $("ami-page-intro").textContent = "Consulte as respostas enviadas pelos especialistas nos julgamentos colaborativos.";
      document.title = "Central de respostas — SICARD";
      ["edit","save","cancel","delete","public"].forEach(function (action) { var element=$("ami-judgments-"+action+"-action"); if(element) element.classList.add("is-hidden"); });
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    setupMode();
    $("ami-select-all-rows").addEventListener("change", function () {
      var rows = filteredRows();
      if ($("ami-select-all-rows").checked) rows.forEach(function (item) { selectedIds.add(item.id); });
      else rows.forEach(function (item) { selectedIds.delete(item.id); });
      updateSelectedId();
      render();
    });
    createViewButton();
    setupEnvironmentFilters();
    if (modo === "julgamentos") {
      api(ambientesSourceUrl).then(function (values) { respostasCentral = values; render(); }).catch(function (err) { $("ami-judgments").innerHTML = '<tr><td colspan="12" class="ami-empty">' + escapeHtml(err.message) + "</td></tr>"; });
    } else {
      api(ambientesSourceUrl).then(function (values) { julgamentos = values; syncEnvironmentFilterOptions(); render(); }).catch(function (err) { $("ami-judgments").innerHTML = '<tr><td colspan="17" class="ami-empty">' + escapeHtml(err.message) + "</td></tr>"; });
      api(hierarquizacoesSourceUrl).then(function (values) {
      hierarquizacoes = values;
      $("ami-hierarchy").dataset.source = hierarquizacoesSourceUrl;
      $("ami-hierarchy").insertAdjacentHTML("beforeend", hierarquizacoes.map(function (h) { return '<option value="' + escapeHtml(h.id) + '" data-hierarquizacao-id="' + escapeHtml(h.id) + '">' + escapeHtml((h.nome || "Sem nome") + " — " + (h.codigo || "Sem código")) + "</option>"; }).join(""));
      }).catch(function (err) { $("ami-hierarchy-summary").textContent = "Não foi possível carregar as hierarquizações: " + err.message; });
    }

    if ($("ami-search")) $("ami-search").addEventListener("input", function () { currentPage = 1; render(); });
    $("ami-judgments-pagination").querySelector("[data-page-prev]").addEventListener("click", function () { if (currentPage > 1) { currentPage -= 1; render(); } });
    $("ami-judgments-pagination").querySelector("[data-page-next]").addEventListener("click", function () { currentPage += 1; render(); });
    if ($("ami-new")) $("ami-new").addEventListener("click", showCreateSection);
    if ($("ami-judgments-matrix-action")) $("ami-judgments-matrix-action").addEventListener("click", function () { openPairwise("matrix"); });
    if ($("ami-judgments-form-action")) $("ami-judgments-form-action").addEventListener("click", function () { openPairwise("form"); });
    $("ami-matrix-zoom").querySelector("[data-zoom-out]").addEventListener("click", function () { pairwiseZoom = Math.max(0.6, pairwiseZoom - 0.1); applyMatrixZoom(); });
    $("ami-matrix-zoom").querySelector("[data-zoom-reset]").addEventListener("click", function () { pairwiseZoom = 1; applyMatrixZoom(); });
    $("ami-matrix-zoom").querySelector("[data-zoom-in]").addEventListener("click", function () { pairwiseZoom = Math.min(1.6, pairwiseZoom + 0.1); applyMatrixZoom(); });
    $("ami-judgments-edit-action").addEventListener("click", startInlineEdit);
    $("ami-judgments-save-action").addEventListener("click", saveInlineEdit);
    $("ami-judgments-cancel-action").addEventListener("click", cancelInlineEdit);
    $("ami-judgments-delete-action").addEventListener("click", deleteSelected);
    $("ami-environment-edit").addEventListener("click", editSelectedEnvironment);
    $("ami-environment-save").addEventListener("click", saveSelectedEnvironment);
    $("ami-create-cancel").addEventListener("click", function () { if (environmentMode === "edit") viewSelectedEnvironment(); else hideCreateSection(); });
    $("ami-add-emails").addEventListener("click", addDraftEmails);
    $("ami-deadline").addEventListener("change", renderDraftEmails);
    $("ami-select-all").addEventListener("change", function () { var checked = this.checked; $("ami-email-list").querySelectorAll("[data-draft-index]").forEach(function (checkbox) { checkbox.checked = checked; }); updateDraftControls(); });
    $("ami-delete-emails").addEventListener("click", function () { var selected = Array.from($("ami-email-list").querySelectorAll("[data-draft-index]:checked")).map(function (checkbox) { return Number(checkbox.dataset.draftIndex); }); draftEmails = draftEmails.filter(function (_email, index) { return !selected.includes(index); }); renderDraftEmails(); });
    $("ami-hierarchy").addEventListener("change", function () { var option = $("ami-hierarchy").selectedOptions[0], h = option && hierarquizacoes.find(function (item) { return item.id === option.dataset.hierarquizacaoId; }); $("ami-hierarchy-summary").textContent = h ? "Grupo selecionado: " + h.nome + " — " + h.codigo : ""; });
    $("ami-criteria-matrix").addEventListener("change", async function (event) { var file = event.target.files && event.target.files[0]; criteriaMatrix = null; criteriaMatrixFileBase64 = null; criteriaMatrixFileName = null; if (!file) { matrixSummary(""); return; } matrixSummary("Lendo " + file.name + "…"); try { var results = await Promise.all([readCriteriaMatrix(file), fileToBase64(file)]), parsed = results[0], rows = matrixRows(parsed); if (rows.length < 2) throw new Error("A matriz deve conter ao menos dois critérios."); criteriaMatrix = parsed; criteriaMatrixFileBase64 = results[1]; criteriaMatrixFileName = file.name; matrixSummary(file.name + " · " + rows.length + " critério(s) carregado(s)"); } catch (error) { event.target.value = ""; matrixSummary(error.message, true); } });
    $("ami-create-form").addEventListener("submit", function (event) {
      event.preventDefault();
      var feedback = $("ami-create-feedback");
      if (!draftEmails.length) { feedback.textContent = "Adicione ao menos um colaborador à lista."; return; }
      if (!$("ami-deadline").value) { feedback.textContent = "Informe a data limite da coleta."; return; }
      if (matrixRows(criteriaMatrix).length < 2) { feedback.textContent = "Carregue a matriz de premissas e critérios com ao menos dois critérios."; return; }
      feedback.textContent = "Criando ambiente colaborativo…";
      var selectedHierarchy = $("ami-hierarchy").selectedOptions[0];
      api("/api/ahp/comparacao-colaborativa/ambientes", { method: "POST", body: JSON.stringify({ hierarquizacao_id: selectedHierarchy.dataset.hierarquizacaoId, matriz_premissas_criterios: criteriaMatrix, arquivo_matriz_base64: criteriaMatrixFileBase64, arquivo_matriz_nome: criteriaMatrixFileName, convites: draftEmails.map(function (email) { return { email: email }; }), valido_ate: deadlineEndOfDay() }) }).then(function (j) {
        julgamentos.unshift(j); currentPage = 1; selectedIds.clear(); selectedIds.add(j.id); updateSelectedId(); render();
        var links = actionLinks(j);
        $("ami-create-status").className = "ami-create-success";
        $("ami-create-status").innerHTML = '<strong>Ambiente colaborativo criado.</strong><span>Situação: ' + escapeHtml(statusLabel(j.status)) + '</span><span>Data limite: ' + escapeHtml(deadlineLabel(j.valido_ate)) + '</span><div class="ami-actions"><a class="btn btn-primary" href="' + escapeHtml(links.workspace) + '">Abrir espaço do julgamento</a><a class="btn btn-secondary" href="' + escapeHtml(links.public) + '">Abrir formulário público</a></div>';
        renderEmailDraft(j);
        feedback.textContent = "Colaboradores confirmados e ambiente criado.";
      }).catch(function (err) { feedback.textContent = err.message; });
    });
    $("ami-copy-email-link").addEventListener("click", function () { var judgment = julgamentos.find(function (item) { return item.id === selectedId; }), url = persistentPublicUrl(judgment); if (url && navigator.clipboard) navigator.clipboard.writeText(url); });
    $("ami-open-mail").addEventListener("click", function () { var body = $("ami-email-template").dataset.message || $("ami-email-template").textContent; location.href = "mailto:" + draftEmails.join(",") + "?subject=" + encodeURIComponent("Convite para preenchimento colaborativo AHP (SAD/SLT)") + "&body=" + encodeURIComponent(body); });
    $("ami-analysis-calculate").addEventListener("click", function () { if (!analysisWorkspace) return; var ids=Array.from($("ami-analysis-responses").querySelectorAll("[data-analysis-response]:checked")).map(function(x){return x.dataset.analysisResponse;}); $("ami-analysis-feedback").textContent="Calculando cenário…"; api("/api/ahp/comparacao-colaborativa/ambientes/"+encodeURIComponent(selectedId)+"/analises",{method:"POST",body:JSON.stringify({nome:$("ami-analysis-name").value.trim(),resposta_ids:ids,rc_maximo:Number($("ami-analysis-rc").value),excluir_inconsistentes:$("ami-analysis-exclude-inconsistent").checked})}).then(function(){return api("/api/ahp/comparacao-colaborativa/ambientes/"+encodeURIComponent(selectedId)+"/espaco-analitico");}).then(function(data){$("ami-analysis-feedback").textContent="Cenário calculado e salvo.";renderAnalysisWorkspace(data);}).catch(function(e){$("ami-analysis-feedback").textContent=e.message;}); });
    renderDraftEmails();
  });
})();
