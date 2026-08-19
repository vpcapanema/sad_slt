(function () {
  "use strict";

  var PAGE_SIZE = 15;
  var julgamentos = [];
  var hierarquizacoes = [];
  var draftEmails = [];
  var pairwiseMatrices = {};
  var pairwiseMode = null;
  var currentPage = 1;
  var selectedId = null;
  var modo = new URLSearchParams(location.search).get("modo") || "julgamentos";
  var prefixMatch = location.pathname.match(/^(.*?)\/restrict\//);
  var appPrefix = prefixMatch ? prefixMatch[1] : "";
  var hierarquizacoesSourceUrl = appPrefix + "/" + "api/ahp/hierarquizacoes";
  var $ = function (id) { return document.getElementById(id); };

  function appUrl(area, path) { return appPrefix + "/" + area + path; }
  function escapeHtml(value) { var node = document.createElement("span"); node.textContent = value == null ? "" : String(value); return node.innerHTML; }
  function api(url, options) {
    return fetch(url, Object.assign({ credentials: "same-origin", headers: { "Content-Type": "application/json" } }, options || {})).then(async function (response) {
      var body = await response.json().catch(function () { return {}; });
      if (!response.ok) throw new Error(body.detail && (body.detail.message || body.detail) || "Não foi possível concluir a operação.");
      return body;
    });
  }
  function criteriaOf(h) { var dados = h && h.dados_hierarquizacao || {}; return dados.criterios || (dados.pesos && dados.pesos.criteria) || []; }
  function statusLabel(status) { return { ativa: "Aberto", consolidada: "Consolidado", encerrada: "Encerrado" }[status] || status; }
  function actionLinks(j) { return { workspace: appUrl("restrict", "/analise-multicriterio/julgamentos/" + encodeURIComponent(j.id) + "/"), public: appUrl("public", "/analise-multicriterio/" + encodeURIComponent(j.token) + "/") }; }
  function filteredRows() {
    var query = ($("ami-search").value || "").toLowerCase();
    return julgamentos.filter(function (j) {
      var h = hierarquizacoes.find(function (item) { return item.id === j.hierarquizacao_id; });
      return [j.hierarquizacao_codigo, h && h.nome, statusLabel(j.status)].join(" ").toLowerCase().includes(query);
    });
  }
  function render() {
    var rows = filteredRows();
    var pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
    currentPage = Math.min(currentPage, pageCount);
    var pageRows = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
    if (!pageRows.some(function (j) { return j.id === selectedId; })) selectedId = null;
    $("ami-count").textContent = rows.length + (rows.length === 1 ? " julgamento" : " julgamentos");
    window.renderTabelaColaborativa("ami-judgments", pageRows, { selectedId: selectedId, paginated: true, linksFor: actionLinks, onSelectionChange: function (id) { selectedId = id; syncPairwiseButtons(); } });
    syncPairwiseButtons();
    var pagination = $("ami-judgments-pagination");
    pagination.querySelector("[data-page-label]").textContent = "Página " + currentPage + " de " + pageCount;
    pagination.querySelector("[data-page-prev]").disabled = currentPage <= 1;
    pagination.querySelector("[data-page-next]").disabled = currentPage >= pageCount;
  }
  function showCreateSection() { $("ami-create-section").classList.remove("is-hidden"); $("ami-deadline").focus(); $("ami-create-section").scrollIntoView({ behavior: "smooth", block: "start" }); }
  function hideCreateSection() { $("ami-create-section").classList.add("is-hidden"); $("ami-create-feedback").textContent = ""; }
  function parseEmails(value) { return Array.from(new Set(value.split(/[\n,;]+/).map(function (v) { return v.trim().toLowerCase(); }).filter(Boolean))); }
  function formatDeadline() { var value = $("ami-deadline").value; return value ? new Date(value).toLocaleString("pt-BR") : "Defina a data limite"; }
  function persistentPublicUrl(judgment) {
    if (!judgment || !judgment.url_publica) return "";
    try { var url = new URL(String(judgment.url_publica), location.origin); return /^https?:$/.test(url.protocol) && url.searchParams.get("token") ? url.href : ""; }
    catch (_error) { return ""; }
  }
  function invitationLines(judgment) {
    var criteria = comparisonCriteria(judgment), deadline = judgment.valido_ate ? new Date(judgment.valido_ate).toLocaleString("pt-BR") : "";
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
  function saatyLabel(value) { var fractions = { "0.1111111111111111": "1/9", "0.125": "1/8", "0.14285714285714285": "1/7", "0.16666666666666666": "1/6", "0.2": "1/5", "0.25": "1/4", "0.3333333333333333": "1/3", "0.5": "1/2" }; return fractions[String(value)] || String(value); }
  function saatyOptions(selected) { var values = [1 / 9, 1 / 8, 1 / 7, 1 / 6, 1 / 5, 1 / 4, 1 / 3, 1 / 2, 1, 2, 3, 4, 5, 6, 7, 8, 9]; return values.map(function (value) { return '<option value="' + value + '"' + (Math.abs(value - selected) < 0.000001 ? " selected" : "") + '>' + saatyLabel(value) + "</option>"; }).join(""); }
  function updatePairwise(judgment, row, column, value) { var matrix = pairwiseMatrix(judgment); matrix[row][column] = value; matrix[column][row] = 1 / value; renderPairwise(judgment); }
  var FORM_SAATY_STEPS = [{ v: 1 / 9, label: "1/9", desc: "Extremamente" }, { v: 1 / 7, label: "1/7", desc: "Bastante" }, { v: 1 / 5, label: "1/5", desc: "Médio" }, { v: 1 / 3, label: "1/3", desc: "Pouco" }, { v: 1, label: "1", desc: "Igual" }, { v: 3, label: "3", desc: "Pouco" }, { v: 5, label: "5", desc: "Médio" }, { v: 7, label: "7", desc: "Bastante" }, { v: 9, label: "9", desc: "Extremamente" }];
  function nearestFormStep(value) { var best = 4, difference = Infinity; FORM_SAATY_STEPS.forEach(function (step, index) { var current = Math.abs(Math.log(step.v) - Math.log(value)); if (current < difference) { best = index; difference = current; } }); return best; }
  function buildSaatyFormPair(row, column, criteria, value) {
    var id = row + "_" + column, ticks = FORM_SAATY_STEPS.map(function (step, index) { return '<div class="saaty-tick" style="left:' + ((index / 8) * 100) + '%"><span class="saaty-tick-val">' + step.label + '</span><span class="saaty-tick-desc">' + step.desc + '</span><span class="saaty-tick-mark"></span></div>'; }).join("");
    return '<div class="saaty-pair" data-i="' + row + '" data-j="' + column + '"><div class="saaty-controller-title" title="' + escapeHtml(criteria[row]) + '"><strong>' + escapeHtml(criteria[row]) + '</strong></div><div class="saaty-auto-status" aria-live="polite"><i class="fas fa-pen" aria-hidden="true"></i><span>Pronto para julgamento</span></div><div class="saaty-widget"><div class="saaty-scale" data-pid="' + id + '" tabindex="0" role="slider" aria-valuemin="0" aria-valuemax="8" aria-valuenow="4" aria-label="Comparação entre ' + escapeHtml(criteria[row]) + " e " + escapeHtml(criteria[column]) + '"><div class="saaty-arrow"></div><div class="saaty-rail">' + ticks + '<div class="saaty-handle"></div></div></div><div class="saaty-dir"><span><i class="fas fa-arrow-left"></i> Menos importante</span><span>Mais importante <i class="fas fa-arrow-right"></i></span></div></div><div class="saaty-criteria"><span class="saaty-crit saaty-crit--left"><span class="saaty-crit__tag">1</span><span class="saaty-crit__name">' + escapeHtml(criteria[row]) + '</span></span><span class="saaty-vs">vs</span><span class="saaty-crit saaty-crit--right"><span class="saaty-crit__tag">2</span><span class="saaty-crit__name">' + escapeHtml(criteria[column]) + '</span></span></div><div class="saaty-readout"></div><div class="saaty-reciprocal" aria-live="polite"><span class="saaty-reciprocal__label"><i class="fas fa-rotate" aria-hidden="true"></i> Valor oposto aplicado automaticamente</span><span class="saaty-reciprocal__value">1</span><span class="saaty-reciprocal__text"></span></div><input type="hidden" data-pair-row="' + row + '" data-pair-column="' + column + '" value="' + value + '"></div>';
  }
  function wireSaatyFormPair(pair, judgment, criteria) {
    var scale = pair.querySelector(".saaty-scale"), rail = pair.querySelector(".saaty-rail"), handle = pair.querySelector(".saaty-handle"), input = pair.querySelector("[data-pair-row]"), status = pair.querySelector(".saaty-auto-status"), row = Number(input.dataset.pairRow), column = Number(input.dataset.pairColumn), index = nearestFormStep(Number(input.value) || 1), dragging = false, validationTimer = null;
    function scheduleVisualValidation() { clearTimeout(validationTimer); pair.classList.remove("is-auto-validated"); pair.classList.add("is-auto-editing"); status.innerHTML = '<i class="fas fa-pen" aria-hidden="true"></i><span>Julgamento em edição</span>'; validationTimer = setTimeout(function () { pair.classList.remove("is-auto-editing"); pair.classList.add("is-auto-validated"); status.innerHTML = '<i class="fas fa-check-circle" aria-hidden="true"></i><span>Julgamento validado</span>'; }, 1800); }
    function apply(next, persist) { index = Math.max(0, Math.min(8, next)); var step = FORM_SAATY_STEPS[index], reciprocal = 1 / step.v, colors = ["#7b1a1a", "#c0392b", "#d96b61", "#f4a7a0", "#7b8794", "#a9cdec", "#5b9bd5", "#2f6fad", "#0d3b66"], readout = pair.querySelector(".saaty-readout"), reciprocalBox = pair.querySelector(".saaty-reciprocal"); handle.style.left = ((index / 8) * 100) + "%"; handle.style.backgroundColor = colors[index]; scale.setAttribute("aria-valuenow", String(index)); if (persist !== false) { input.value = String(step.v); pairwiseMatrix(judgment)[row][column] = step.v; pairwiseMatrix(judgment)[column][row] = reciprocal; scheduleVisualValidation(); } pair.classList.toggle("saaty-pair--equal", index === 4); pair.classList.toggle("saaty-pair--filled", index !== 4); readout.textContent = index === 4 ? "“" + criteria[row] + "” tem igual importância que “" + criteria[column] + "” (1)" : "“" + criteria[row] + "” é " + step.desc.toLowerCase() + (index > 4 ? " mais" : " menos") + " importante que “" + criteria[column] + "” (" + step.label + ")"; readout.className = "saaty-readout saaty-readout--" + (index === 4 ? "eq" : index > 4 ? "pos" : "neg"); pair.querySelector(".saaty-reciprocal__value").textContent = saatyLabel(reciprocal); pair.querySelector(".saaty-reciprocal__text").textContent = criteria[column] + " em relação a " + criteria[row] + " = " + saatyLabel(reciprocal); reciprocalBox.classList.remove("is-positive", "is-negative", "is-equal"); reciprocalBox.classList.add(index > 4 ? "is-negative" : index < 4 ? "is-positive" : "is-equal"); }
    function fromX(clientX) { var bounds = rail.getBoundingClientRect(); return Math.round(Math.max(0, Math.min(1, (clientX - bounds.left) / bounds.width)) * 8); }
    function down(event) { dragging = true; pair.classList.add("saaty-pair--touched"); scale.classList.add("saaty-scale--active"); apply(fromX(event.touches && event.touches.length ? event.touches[0].clientX : event.clientX)); event.preventDefault(); }
    function move(event) { if (!dragging) return; apply(fromX(event.touches && event.touches.length ? event.touches[0].clientX : event.clientX)); event.preventDefault(); }
    function up() { dragging = false; scale.classList.remove("saaty-scale--active"); }
    scale.addEventListener("mousedown", down); document.addEventListener("mousemove", move); document.addEventListener("mouseup", up); scale.addEventListener("touchstart", down, { passive: false }); document.addEventListener("touchmove", move, { passive: false }); document.addEventListener("touchend", up); scale.addEventListener("keydown", function (event) { if (["ArrowLeft", "ArrowDown"].includes(event.key)) { pair.classList.add("saaty-pair--touched"); apply(index - 1); event.preventDefault(); } else if (["ArrowRight", "ArrowUp"].includes(event.key)) { pair.classList.add("saaty-pair--touched"); apply(index + 1); event.preventDefault(); } else if (event.key === "Home") { pair.classList.add("saaty-pair--touched"); apply(0); event.preventDefault(); } else if (event.key === "End") { pair.classList.add("saaty-pair--touched"); apply(8); event.preventDefault(); } }); apply(index, false);
  }
  function renderPairwise(judgment) {
    var criteria = comparisonCriteria(judgment), matrix = pairwiseMatrix(judgment), host = $("ami-pairwise-content");
    $("ami-pairwise-context").textContent = "Critérios do julgamento " + (judgment.hierarquizacao_codigo || judgment.id) + ": " + criteria.join("; ") + ".";
    if (!criteria.length) { host.innerHTML = '<p class="ami-empty">O registro selecionado não possui critérios armazenados.</p>'; return; }
    if (pairwiseMode === "matrix") {
      $("ami-pairwise-title").textContent = "Matriz de comparação pareada";
      host.innerHTML = '<div class="ami-pairwise-scroll"><table class="admin-table ami-pairwise-matrix"><thead><tr><th>Critério</th>' + criteria.map(function (name) { return '<th title="' + escapeHtml(name) + '">' + escapeHtml(name) + "</th>"; }).join("") + '</tr></thead><tbody>' + criteria.map(function (name, row) { return '<tr><th title="' + escapeHtml(name) + '">' + escapeHtml(name) + "</th>" + criteria.map(function (_other, column) { if (row === column) return '<td><span class="ami-pairwise-diagonal">1</span></td>'; if (row < column) return '<td><select class="c-form-control ami-pairwise-select" data-pair-row="' + row + '" data-pair-column="' + column + '" aria-label="Comparar ' + escapeHtml(criteria[row]) + " com " + escapeHtml(criteria[column]) + '">' + saatyOptions(matrix[row][column]) + "</select></td>"; return '<td data-reciprocal="' + column + "-" + row + '">' + escapeHtml(saatyLabel(matrix[row][column])) + "</td>"; }).join("") + "</tr>"; }).join("") + "</tbody></table></div>";
    } else {
      $("ami-pairwise-title").textContent = "Formulário de comparação pareada";
      var pairs = [];
      criteria.forEach(function (_left, row) { criteria.forEach(function (_right, column) { if (row < column) pairs.push(buildSaatyFormPair(row, column, criteria, matrix[row][column])); }); });
      host.innerHTML = '<div class="saaty-form ami-saaty-form">' + pairs.join("") + "</div>";
      host.querySelectorAll(".saaty-pair").forEach(function (pair) { wireSaatyFormPair(pair, judgment, criteria); });
    }
    if (pairwiseMode === "matrix") host.querySelectorAll("[data-pair-row]").forEach(function (select) { select.addEventListener("change", function () { updatePairwise(judgment, Number(select.dataset.pairRow), Number(select.dataset.pairColumn), Number(select.value)); }); });
  }
  function loadSaatyScale() {
    var host = $("ami-saaty-scale-host"); if (host.dataset.loaded === "true") return Promise.resolve();
    return fetch(appUrl("restrict", "/ahp/comparacao/"), { credentials: "same-origin" }).then(function (response) { if (!response.ok) throw new Error("Não foi possível carregar a escala de Saaty."); return response.text(); }).then(function (html) {
      var source = new DOMParser().parseFromString(html, "text/html").querySelector("#saaty-scale-subcard"); if (!source) throw new Error("A subseção Escala de Intensidade de Importância não foi encontrada.");
      host.replaceChildren(source.cloneNode(true)); host.dataset.loaded = "true";
      var toggle = host.querySelector("#saaty-scale-toggle"), extras = host.querySelectorAll(".saaty-scale-extra"), icon = host.querySelector("#saaty-scale-chevron i");
      function toggleScale() { var expanded = toggle.getAttribute("aria-expanded") !== "true"; toggle.setAttribute("aria-expanded", String(expanded)); extras.forEach(function (element) { element.classList.toggle("is-hidden", !expanded); }); if (icon) { icon.classList.toggle("fa-chevron-down", !expanded); icon.classList.toggle("fa-chevron-up", expanded); } }
      toggle.addEventListener("click", toggleScale); toggle.addEventListener("keydown", function (event) { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); toggleScale(); } });
    }).catch(function (error) { host.innerHTML = '<p class="ami-feedback">' + escapeHtml(error.message) + "</p>"; });
  }
  function syncPairwiseButtons() { [$("ami-judgments-matrix-action"), $("ami-judgments-form-action")].forEach(function (button) { if (!button) return; var enabled = modo === "espaco" && Boolean(selectedId); button.disabled = !enabled; button.classList.toggle("is-disabled", !enabled); button.classList.toggle("is-hidden", modo !== "espaco"); }); }
  function openPairwise(mode) { var judgment = julgamentos.find(function (item) { return item.id === selectedId; }); if (!judgment) return; pairwiseMode = mode; [["ami-judgments-matrix-action", "matrix"], ["ami-judgments-form-action", "form"]].forEach(function (entry) { var active = mode === entry[1]; $(entry[0]).classList.toggle("is-active", active); $(entry[0]).setAttribute("aria-pressed", String(active)); }); $("ami-pairwise-panel").classList.remove("is-hidden"); loadSaatyScale().then(function () { renderPairwise(judgment); $("ami-pairwise-panel").scrollIntoView({ behavior: "smooth", block: "start" }); }); }
  function setupMode() {
    if (modo === "espaco") {
      $("ami-page-title").textContent = "Julgamento - Configurações";
      $("ami-page-intro").textContent = "Configure participantes, prazo de coleta e acesso ao ambiente colaborativo.";
      $("ami-new").classList.remove("is-hidden");
    } else if (modo === "formulario") {
      $("ami-page-title").textContent = "Formulário dos especialistas";
      $("ami-page-intro").textContent = "Selecione um julgamento e use o botão acima da tabela para abrir o formulário público.";
    } else {
      $("ami-page-title").textContent = "Julgamentos";
      $("ami-page-intro").textContent = "Consulte os julgamentos colaborativos cadastrados.";
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    setupMode();
    Promise.all([api(hierarquizacoesSourceUrl), api(appPrefix + "/" + "api/ahp/comparacao-colaborativa/ambientes")]).then(function (values) {
      hierarquizacoes = values[0]; julgamentos = values[1];
      $("ami-hierarchy").dataset.source = hierarquizacoesSourceUrl;
      $("ami-hierarchy").insertAdjacentHTML("beforeend", hierarquizacoes.map(function (h) { return '<option value="' + h.id + '">' + escapeHtml(h.codigo + " — " + h.nome + " (" + (h.status || "sem situação") + ")") + "</option>"; }).join(""));
      render();
    }).catch(function (err) { $("ami-judgments").innerHTML = '<tr><td colspan="10" class="ami-empty">' + escapeHtml(err.message) + "</td></tr>"; });

    $("ami-search").addEventListener("input", function () { currentPage = 1; render(); });
    $("ami-judgments-pagination").querySelector("[data-page-prev]").addEventListener("click", function () { if (currentPage > 1) { currentPage -= 1; render(); } });
    $("ami-judgments-pagination").querySelector("[data-page-next]").addEventListener("click", function () { currentPage += 1; render(); });
    $("ami-new").addEventListener("click", showCreateSection);
    $("ami-judgments-matrix-action").addEventListener("click", function () { openPairwise("matrix"); });
    $("ami-judgments-form-action").addEventListener("click", function () { openPairwise("form"); });
    $("ami-create-cancel").addEventListener("click", hideCreateSection);
    $("ami-add-emails").addEventListener("click", addDraftEmails);
    $("ami-deadline").addEventListener("change", renderDraftEmails);
    $("ami-select-all").addEventListener("change", function () { var checked = this.checked; $("ami-email-list").querySelectorAll("[data-draft-index]").forEach(function (checkbox) { checkbox.checked = checked; }); updateDraftControls(); });
    $("ami-delete-emails").addEventListener("click", function () { var selected = Array.from($("ami-email-list").querySelectorAll("[data-draft-index]:checked")).map(function (checkbox) { return Number(checkbox.dataset.draftIndex); }); draftEmails = draftEmails.filter(function (_email, index) { return !selected.includes(index); }); renderDraftEmails(); });
    $("ami-hierarchy").addEventListener("change", function () { var h = hierarquizacoes.find(function (item) { return item.id === $("ami-hierarchy").value; }); var n = criteriaOf(h).length; $("ami-hierarchy-summary").textContent = h ? (h.descricao || "Sem descrição") + " · " + n + " critérios" : ""; });
    $("ami-create-form").addEventListener("submit", function (event) {
      event.preventDefault();
      var feedback = $("ami-create-feedback");
      if (!draftEmails.length) { feedback.textContent = "Adicione ao menos um colaborador à lista."; return; }
      if (!$("ami-deadline").value) { feedback.textContent = "Informe a data limite da coleta."; return; }
      feedback.textContent = "Criando ambiente colaborativo…";
      api(appPrefix + "/" + "api/ahp/comparacao-colaborativa/ambientes", { method: "POST", body: JSON.stringify({ hierarquizacao_id: $("ami-hierarchy").value, convites: draftEmails.map(function (email) { return { email: email }; }), valido_ate: new Date($("ami-deadline").value).toISOString() }) }).then(function (j) {
        julgamentos.unshift(j); currentPage = 1; selectedId = j.id; render();
        var links = actionLinks(j);
        $("ami-create-status").className = "ami-create-success";
        $("ami-create-status").innerHTML = '<strong>Ambiente colaborativo criado.</strong><span>Situação: ' + escapeHtml(statusLabel(j.status)) + '</span><span>Data limite: ' + escapeHtml(new Date(j.valido_ate).toLocaleString("pt-BR")) + '</span><div class="ami-actions"><a class="btn btn-primary" href="' + escapeHtml(links.workspace) + '">Abrir espaço do julgamento</a><a class="btn btn-secondary" href="' + escapeHtml(links.public) + '">Abrir formulário público</a></div>';
        renderEmailDraft(j);
        feedback.textContent = "Colaboradores confirmados e ambiente criado.";
      }).catch(function (err) { feedback.textContent = err.message; });
    });
    $("ami-copy-email-link").addEventListener("click", function () { var judgment = julgamentos.find(function (item) { return item.id === selectedId; }), url = persistentPublicUrl(judgment); if (url && navigator.clipboard) navigator.clipboard.writeText(url); });
    $("ami-open-mail").addEventListener("click", function () { var body = $("ami-email-template").dataset.message || $("ami-email-template").textContent; location.href = "mailto:" + draftEmails.join(",") + "?subject=" + encodeURIComponent("Convite para preenchimento colaborativo AHP (SAD/SLT)") + "&body=" + encodeURIComponent(body); });
    renderDraftEmails();
  });
})();
