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
  var selectedJudgeId = null; // null = todos os julgadores juntos
  var selectedMeasure = "geometrica"; // medida de tendencia central da agregacao
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
    $("ami-judgments").innerHTML = rows.map(function (j) { var selected = selectedIds.has(j.id), convidados = (j.convites || []).length, finalizadas = j.total_respostas || 0, preenchendo = j.respostas_em_preenchimento || 0, consistentes = j.respostas_consistentes || 0, recebidas = finalizadas + preenchendo; return '<tr class="collab-round-row ' + (selected ? "is-selected" : "") + '"><td class="col-select"><input type="checkbox" class="ami-row-select" data-analysis-round="' + escapeHtml(j.id) + '" ' + (selected ? "checked" : "") + '></td><td>' + escapeHtml(statusLabel(j.status)) + '</td><td class="ami-cell-id">' + escapeHtml(j.id) + '</td><td>' + ratioLabel(convidados, convidados) + '</td><td>' + ratioLabel(recebidas, convidados) + '</td><td>' + ratioLabel(preenchendo, convidados) + '</td><td>' + ratioLabel(finalizadas, convidados) + '</td><td>' + ratioLabel(consistentes, convidados) + '</td><td>' + escapeHtml(deadlineLabel(j.valido_ate)) + '</td><td>' + escapeHtml(deadlineLabel(j.atualizadoEm)) + '</td></tr>'; }).join("") || '<tr><td colspan="10" class="ami-empty">Nenhum julgamento encontrado.</td></tr>';
    $("ami-judgments").querySelectorAll("[data-analysis-round]").forEach(function (input) { input.addEventListener("change", function () { changeRowSelection(input.dataset.analysisRound, input.checked); }); });
  }
  function ratioLabel(realizado, total) { var percentage = total > 0 ? Math.round((realizado / total) * 100) : 0; return '<span class="ami-ratio"><strong>' + realizado + '/' + total + '</strong><small>' + percentage + '%</small></span>'; }
  function fmtNumber(value) { return value == null ? "—" : Number(value).toFixed(3); }
  // Os indices atribuidos sao valores da escala de Saaty, entao aparecem na
  // notacao da propria escala (1/3, 3, 5) em vez de decimal.
  var SAATY_ESCALA = [[1 / 9, "1/9"], [1 / 7, "1/7"], [1 / 5, "1/5"], [1 / 3, "1/3"], [1, "1"], [3, "3"], [5, "5"], [7, "7"], [9, "9"]];
  function saatyLabel(valor) {
    if (valor == null) return "—";
    for (var i = 0; i < SAATY_ESCALA.length; i++) { if (Math.abs(Number(valor) - SAATY_ESCALA[i][0]) < 0.0005) return SAATY_ESCALA[i][1]; }
    return fmtNumber(valor);
  }
  // Uma cor por julgador, estavel entre tabela, grafico e legenda.
  function judgeColors(pairs) {
    var nomes = [], mapa = {};
    pairs.forEach(function (pair) { (pair.pontos || []).forEach(function (ponto) { if (!(ponto.resposta_id in mapa)) { mapa[ponto.resposta_id] = "var(--ami-chart-" + ((nomes.length % 8) + 1) + ")"; nomes.push({ id: ponto.resposta_id, nome: ponto.respondente, cor: mapa[ponto.resposta_id] }); } }); });
    return { mapa: mapa, lista: nomes };
  }
  // Barras dos indices atribuidos, ligadas linha a linha com a tabela ao lado:
  // cada grupo carrega o data-pair da linha correspondente, e o realce e
  // acionado pelos dois sentidos em renderPairsSection.
  function analysisPairBars(pairs, destaque) {
    if (!pairs.length) return '<p class="ami-empty">Sem respostas enviadas para o gr\u00e1fico.</p>';
    var cores = judgeColors(pairs);
    var visiveis = destaque ? cores.lista.filter(function (j) { return j.id === destaque; }) : cores.lista;
    var maximo = 1;
    pairs.forEach(function (pair) { (pair.pontos || []).forEach(function (ponto) { if (visiveis.some(function (j) { return j.id === ponto.resposta_id; }) && ponto.valor > maximo) maximo = ponto.valor; }); });
    var referencia = 1 / maximo * 100;
    var linhas = pairs.map(function (pair) {
      var barras = visiveis.map(function (julgador) {
        var ponto = (pair.pontos || []).filter(function (item) { return item.resposta_id === julgador.id; })[0];
        if (!ponto) return '';
        var largura = Math.max(1.2, Number(ponto.valor) / maximo * 100);
        var rotulo = saatyLabel(ponto.valor), descricao = julgador.nome + ": " + rotulo;
        // barra curta nao comporta o numero dentro: ele vai para fora, a direita
        return '<span class="ami-pair-bars__bar' + (largura < 9 ? " is-curta" : "") + '" data-judge="' + escapeHtml(julgador.id) + '" style="width:' + largura.toFixed(2) + '%;background:' + julgador.cor + '" title="' + escapeHtml(descricao) + '" role="img" aria-label="' + escapeHtml(descricao) + '"><b>' + rotulo + '</b></span>';
      }).join("");
      var rotulo = pair.criterio_a + " \u00d7 " + pair.criterio_b;
      return '<div class="ami-pair-bars__row" data-pair="' + pair.i + '-' + pair.j + '"><span class="ami-pair-bars__label" title="' + escapeHtml(rotulo) + '">' + escapeHtml(rotulo) + '</span><div class="ami-pair-bars__plot"><span class="ami-pair-bars__ref" style="left:' + referencia.toFixed(2) + '%"></span>' + barras + '</div></div>';
    }).join("");
    var legenda = destaque ? '' : '<ul class="ami-pair-bars__legend">' + cores.lista.map(function (julgador, indice) { return '<li><span class="ami-judge-chip" style="background:' + julgador.cor + '"></span><strong>J' + (indice + 1) + '</strong> ' + escapeHtml(julgador.nome) + '</li>'; }).join("") + '</ul>';
    return '<figure class="ami-pair-bars">' + linhas + '<figcaption>' + legenda + '<p>Linha vertical: o valor 1 (indiferen\u00e7a entre os dois crit\u00e9rios).</p></figcaption></figure>';
  }
  function analysisRangeBars(items) {
    if (!items.length) return '<p class="ami-empty">Sem respostas enviadas para o gr\u00e1fico.</p>';
    var maximo = Math.max.apply(null, items.map(function (item) { return Number(item.maximo) || 0; })) || 1;
    return '<figure class="ami-range-chart" role="img" aria-label="Peso m\u00e9dio por crit\u00e9rio com faixa entre m\u00ednimo e m\u00e1ximo">' + items.map(function (item) {
      var esquerda = (Number(item.minimo) || 0) / maximo * 100, direita = (Number(item.maximo) || 0) / maximo * 100, media = (Number(item.media) || 0) / maximo * 100;
      return '<div class="ami-range-chart__row"><span class="ami-range-chart__label" title="' + escapeHtml(item.criterio) + '">' + escapeHtml(item.criterio) + '</span><div class="ami-range-chart__track"><span class="ami-range-chart__span" style="left:' + esquerda.toFixed(2) + '%;width:' + Math.max(0.6, direita - esquerda).toFixed(2) + '%" title="Faixa: ' + escapeHtml(fmtNumber(item.minimo) + " a " + fmtNumber(item.maximo)) + '"></span><span class="ami-range-chart__mean" style="left:' + media.toFixed(2) + '%" title="M\u00e9dia: ' + escapeHtml(fmtNumber(item.media)) + '"></span></div><strong>' + fmtNumber(item.media) + '</strong></div>';
    }).join("") + '<figcaption>Barra clara: faixa entre o menor e o maior peso atribu\u00eddo. Tra\u00e7o: peso m\u00e9dio.</figcaption></figure>';
  }
  // Linhas sempre os mesmos pares; o que muda com a selecao sao as colunas:
  // todos os julgadores lado a lado, ou o valor de um deles. As descritivas
  // acompanham as duas leituras.
  // Afastamento do indice em relacao a media geometrica do par, em escala log
  // (a escala em que 3 e 1/3 distam o mesmo de 1), saturando em ln(3): uma casa
  // inteira da escala de Saaty ja pinta a celula no tom mais forte.
  function desvioIntensidade(valor, mediaGeometrica) {
    var distancia = Math.abs(Math.log(Number(valor) || 1) - Math.log(Number(mediaGeometrica) || 1));
    return Math.min(1, distancia / Math.log(3));
  }
  function modaLabel(pair) { var modas = pair.modas || []; return modas.length ? modas.map(saatyLabel).join(" / ") : "\u2014"; }
  function pairsTable(pairs, destaque) {
    if (!pairs.length) return '<p class="ami-empty">Sem respostas enviadas.</p>';
    var cores = judgeColors(pairs);
    var descritivas = ["M\u00e9dia", "Mediana", "Moda"];
    var cabecalho, corpo;
    if (destaque) {
      // Um unico valor por par: nao ha o que descrever, entao a tabela fica so
      // com o indice atribuido e o grafico vai para o lado.
      cabecalho = ["Par de crit\u00e9rios", "\u00cdndice atribu\u00eddo"];
      corpo = pairs.map(function (pair) {
        var ponto = (pair.pontos || []).filter(function (item) { return item.resposta_id === destaque; })[0];
        return '<tr data-pair="' + pair.i + '-' + pair.j + '"><td class="ami-stats-table__name">' + escapeHtml(pair.criterio_a + " \u00d7 " + pair.criterio_b) + '</td><td><strong>' + (ponto ? saatyLabel(ponto.valor) : "\u2014") + '</strong></td></tr>';
      });
    } else {
      cabecalho = ["Par de crit\u00e9rios"].concat(cores.lista.map(function (julgador) {
        return escapeHtml(julgador.nome);
      })).concat(descritivas);
      corpo = pairs.map(function (pair) {
        var celulas = cores.lista.map(function (julgador) {
          var ponto = (pair.pontos || []).filter(function (item) { return item.resposta_id === julgador.id; })[0];
          if (!ponto) return '<td>\u2014</td>';
          var intensidade = desvioIntensidade(ponto.valor, pair.media_geometrica);
          return '<td class="ami-stats-table__valor' + (intensidade > 0.55 ? " is-forte" : "") + '" style="background:rgba(17,101,147,' + (intensidade * 0.8).toFixed(3) + ')" title="' + escapeHtml(julgador.nome + ": " + saatyLabel(ponto.valor) + " \u00b7 m\u00e9dia geom\u00e9trica do par " + fmtNumber(pair.media_geometrica)) + '">' + saatyLabel(ponto.valor) + '</td>';
        }).join("");
        return '<tr data-pair="' + pair.i + '-' + pair.j + '"><td class="ami-stats-table__name">' + escapeHtml(pair.criterio_a + " \u00d7 " + pair.criterio_b) + '</td>' + celulas + '<td>' + fmtNumber(pair.media) + '</td><td>' + saatyLabel(pair.mediana) + '</td><td>' + modaLabel(pair) + '</td></tr>';
      });
    }
    var rodape = destaque ? "" : '<p class="ami-table-note"><span class="ami-table-note__escala">Fundo da c\u00e9lula: afastamento da m\u00e9dia geom\u00e9trica do par <i></i><i></i><i></i><i></i></span></p>';
    return '<table class="admin-table ami-stats-table ami-table--indices"><thead><tr>' + cabecalho.map(function (titulo) { return '<th>' + titulo + '</th>'; }).join("") + '</tr></thead><tbody>' + corpo.join("") + '</tbody></table>' + rodape;
  }
  // A lista de julgadores vem das respostas enviadas daquele julgamento, e nao
  // de uma lista fixa: quem responde entra na lista sozinho.
  function judgeOptions() {
    return (analysisWorkspace.respostas || []).filter(function (r) { return r.status === "enviada"; })
      .map(function (r) { return { id: String(r.id), nome: r.nome_completo, instituicao: r.instituicao }; });
  }
  function renderPairsSection() {
    var pairs = analysisWorkspace.estatisticas.por_par, julgadores = judgeOptions();
    if (selectedJudgeId && !julgadores.some(function (j) { return j.id === selectedJudgeId; })) selectedJudgeId = null;
    var select = $("ami-pairs-judge");
    select.innerHTML = '<option value="">Todos os julgadores</option>' + julgadores.map(function (j, indice) {
      return '<option value="' + escapeHtml(j.id) + '"' + (j.id === selectedJudgeId ? " selected" : "") + '>J' + (indice + 1) + " \u00b7 " + escapeHtml(j.nome) + (j.instituicao ? " (" + escapeHtml(j.instituicao) + ")" : "") + '</option>';
    }).join("");
    if (!select.dataset.bound) { select.dataset.bound = "1"; select.addEventListener("change", function () { selectedJudgeId = select.value || null; renderPairsSection(); }); }
    $("ami-pairs-judge-hint").textContent = julgadores.length + (julgadores.length === 1 ? " julgador com resposta enviada" : " julgadores com resposta enviada");
    $("ami-analysis-pairs").innerHTML = pairsTable(pairs, selectedJudgeId);
    $("ami-analysis-pairs-chart").innerHTML = analysisPairBars(pairs, selectedJudgeId);
    renderFioDerivado(analysisWorkspace);
    ligarRealcePares();
  }
  function ligarRealcePares() {
    var alvos = [$("ami-analysis-pairs"), $("ami-analysis-pairs-chart")];
    function realcar(par, ligado) {
      alvos.forEach(function (area) { area.querySelectorAll('[data-pair="' + par + '"]').forEach(function (elemento) { elemento.classList.toggle("is-hl", ligado); }); });
    }
    alvos.forEach(function (area) {
      area.querySelectorAll("[data-pair]").forEach(function (elemento) {
        elemento.addEventListener("mouseenter", function () { realcar(elemento.dataset.pair, true); });
        elemento.addEventListener("mouseleave", function () { realcar(elemento.dataset.pair, false); });
      });
    });
    $("ami-analysis-pairs-chart").querySelectorAll("[data-judge]").forEach(function (barra) {
      barra.addEventListener("click", function () { selectedJudgeId = barra.dataset.judge; renderPairsSection(); });
    });
  }
  function analysisMatrixTable(item) {
    var criteria = analysisWorkspace.ambiente.criterios || [], matrix = item.matriz_consolidada || [];
    if (!matrix.length) return '<p class="ami-empty">Matriz consolidada indisponível.</p>';
    return '<div class="matriz-table-wrap"><table class="admin-table matriz-view-table ami-matrix"><thead><tr><th>Critério</th>' + criteria.map(function (criterion, index) { return '<th>' + escapeHtml(criterionName(criterion, index)) + '</th>'; }).join("") + '</tr></thead><tbody>' + matrix.map(function (row, rowIndex) { return '<tr><th>' + escapeHtml(criterionName(criteria[rowIndex], rowIndex)) + '</th>' + row.map(function (value) { return '<td>' + fmtNumber(value) + '</td>'; }).join("") + '</tr>'; }).join("") + '</tbody></table></div>';
  }
  // Motor AHP do cliente, espelhando api/services/ahp_engine.py: vetor de
  // prioridades pela media geometrica das linhas e metricas de consistencia.
  var RI_POR_N = { 1: 0, 2: 0, 3: 0.58, 4: 0.9, 5: 1.12, 6: 1.24, 7: 1.32, 8: 1.41, 9: 1.45, 10: 1.49 };
  function analisarMatriz(matriz) {
    var n = matriz.length;
    if (!n) return null;
    var geo = matriz.map(function (linha) { return Math.pow(linha.reduce(function (produto, valor) { return produto * Number(valor); }, 1), 1 / n); });
    var soma = geo.reduce(function (total, valor) { return total + valor; }, 0) || 1;
    var pesos = geo.map(function (valor) { return valor / soma; });
    if (n < 2) return { pesos: pesos, lambdaMax: n, ic: 0, ri: 0, rc: 0 };
    var lambdaMax = 0;
    for (var i = 0; i < n; i++) {
      var linha = 0;
      for (var j = 0; j < n; j++) linha += Number(matriz[i][j]) * pesos[j];
      lambdaMax += linha / pesos[i];
    }
    lambdaMax /= n;
    var ic = (lambdaMax - n) / (n - 1), ri = n <= 2 ? 0 : (RI_POR_N[n] || 1.49);
    return { pesos: pesos, lambdaMax: lambdaMax, ic: ic, ri: ri, rc: (n > 2 && ri > 0) ? ic / ri : 0 };
  }
  var MEDIDAS = {
    geometrica: { rotulo: "m\u00e9dia geom\u00e9trica", calcula: function (valores) { return Math.exp(valores.reduce(function (soma, v) { return soma + Math.log(v); }, 0) / valores.length); } },
    aritmetica: { rotulo: "m\u00e9dia aritm\u00e9tica", calcula: function (valores) { return valores.reduce(function (soma, v) { return soma + v; }, 0) / valores.length; } },
    mediana: { rotulo: "mediana", calcula: function (valores) { var ordem = valores.slice().sort(function (a, b) { return a - b; }), meio = Math.floor(ordem.length / 2); return ordem.length % 2 ? ordem[meio] : (ordem[meio - 1] + ordem[meio]) / 2; } }
  };
  function respostasEnviadas(data) { return (data.respostas || []).filter(function (r) { return r.status === "enviada" && (r.matriz_comparacao || []).length; }); }
  // Agrega o triangulo superior pela medida escolhida e espelha o reciproco: com
  // media aritmetica ou mediana, agregar as duas metades separadamente quebraria
  // a reciprocidade (a_ij x a_ji deixaria de ser 1).
  function matrizAgregada(data, medida) {
    var enviadas = respostasEnviadas(data);
    if (!enviadas.length) return null;
    var n = enviadas[0].matriz_comparacao.length, calcula = (MEDIDAS[medida] || MEDIDAS.geometrica).calcula;
    var matriz = [];
    for (var i = 0; i < n; i++) { matriz.push([]); for (var j = 0; j < n; j++) matriz[i].push(1); }
    for (var a = 0; a < n; a++) {
      for (var b = a + 1; b < n; b++) {
        var valores = enviadas.map(function (r) { return Number(r.matriz_comparacao[a][b]); });
        var valor = calcula(valores);
        matriz[a][b] = valor; matriz[b][a] = 1 / valor;
      }
    }
    return matriz;
  }
  // A matriz que alimenta as secoes 2.3 a 2.5: a do julgador selecionado, ou a
  // agregacao de todos pela medida escolhida.
  function matrizEmFoco(data) {
    if (selectedJudgeId) {
      var resposta = (data.respostas || []).filter(function (r) { return String(r.id) === selectedJudgeId; })[0];
      var matriz = resposta && resposta.matriz_comparacao;
      return matriz && matriz.length ? { matriz: matriz, origem: "julgador", rotulo: resposta.nome_completo } : null;
    }
    var agregada = matrizAgregada(data, selectedMeasure);
    return agregada ? { matriz: agregada, origem: "todos", rotulo: (MEDIDAS[selectedMeasure] || MEDIDAS.geometrica).rotulo } : null;
  }
  function analiseHomologada(data) {
    return (data.analises || []).filter(function (item) { return item.id === data.analise_homologada_id || item.status === "homologada"; })[0] || null;
  }
  // Todos os julgadores convidados para a hierarquizacao, tenham respondido ou
  // nao. O nome vem da resposta quando ela existe e, antes disso, do convite.
  function julgadoresDoJulgamento(data) {
    var respostas = data.respostas || [], enviadas = respostasEnviadas(data);
    var lista = (data.ambiente.convites || []).map(function (convite) {
      var email = typeof convite === "string" ? convite : convite.email;
      var nomeConvite = typeof convite === "string" ? null : convite.nome;
      var resposta = respostas.filter(function (r) { return r.email === email; })[0] || null;
      return { email: email, nome: (resposta && resposta.nome_completo) || nomeConvite || "", resposta: resposta };
    });
    respostas.forEach(function (r) {
      if (!lista.some(function (item) { return item.email === r.email; })) lista.push({ email: r.email, nome: r.nome_completo, resposta: r });
    });
    return lista.map(function (item) {
      item.indice = item.resposta ? enviadas.map(function (r) { return String(r.id); }).indexOf(String(item.resposta.id)) : -1;
      item.situacao = !item.resposta ? "N\u00e3o iniciada"
        : item.resposta.status === "enviada" ? (item.resposta.consistente ? "Consistente" : "Inconsistente") : "Em preenchimento";
      return item;
    });
  }
  function renderJudges(data) {
    var vazio = '<td class="ami-cell-vazio"></td>';
    $("ami-analysis-judges").innerHTML = julgadoresDoJulgamento(data).map(function (julgador) {
      var r = julgador.resposta;
      return '<tr' + (r ? '' : ' class="is-sem-resposta"') + '><td class="ami-stats-table__name">' + (julgador.indice >= 0 ? '<strong>J' + (julgador.indice + 1) + '</strong> ' : '') + escapeHtml(julgador.nome || "\u2014") + '</td><td class="ami-stats-table__name">' + escapeHtml(julgador.email) + '</td>' +
        (r ? '<td class="ami-stats-table__name">' + escapeHtml(r.instituicao || "") + '</td>' : vazio) +
        '<td>' + julgador.situacao + '</td>' +
        (r && r.status === "enviada" ? '<td>' + fmtNumber(r.razao_consistencia) + '</td>' : vazio) +
        (r ? '<td>' + escapeHtml(deadlineLabel(r.iniciadoEm)) + '</td>' : vazio) +
        (r && r.enviadoEm ? '<td>' + escapeHtml(deadlineLabel(r.enviadoEm)) + '</td>' : vazio) + '</tr>';
    }).join("") || '<tr><td colspan="7" class="ami-empty">Nenhum julgador convidado.</td></tr>';
  }
  function renderResponsesForConsolidation(data) {
    var vazio = '<td class="ami-cell-vazio"></td>';
    $("ami-analysis-responses").innerHTML = julgadoresDoJulgamento(data).map(function (julgador) {
      var r = julgador.resposta, enviada = r && r.status === "enviada";
      return '<tr' + (enviada ? '' : ' class="is-sem-resposta"') + '><td><input type="checkbox" ' + (enviada ? 'data-analysis-response="' + escapeHtml(r.id) + '" checked' : 'disabled title="Sem resposta enviada"') + '></td>' +
        '<td class="ami-stats-table__name">' + (julgador.indice >= 0 ? '<strong>J' + (julgador.indice + 1) + '</strong> ' : '') + escapeHtml(julgador.nome || "\u2014") + '</td>' +
        '<td class="ami-stats-table__name">' + escapeHtml(julgador.email) + '</td><td>' + julgador.situacao + '</td>' +
        (enviada ? '<td>' + fmtNumber(r.razao_consistencia) + '</td>' : vazio) +
        (r ? '<td>' + escapeHtml(deadlineLabel(r.iniciadoEm)) + '</td>' : vazio) +
        (enviada ? '<td>' + escapeHtml(deadlineLabel(r.enviadoEm)) + '</td>' : vazio) + '</tr>';
    }).join("") || '<tr><td colspan="7" class="ami-empty">Nenhum julgador convidado.</td></tr>';
  }
  function renderConsolidatedMatrix(data) {
    var foco = matrizEmFoco(data), criterios = (data.ambiente.criterios || []).map(criterionName);
    var caixa = $("ami-analysis-measure-box");
    caixa.classList.toggle("is-hidden", !!selectedJudgeId);
    var seletor = $("ami-analysis-measure");
    seletor.value = selectedMeasure;
    if (!seletor.dataset.bound) {
      seletor.dataset.bound = "1";
      seletor.addEventListener("change", function () { selectedMeasure = seletor.value; renderFioDerivado(analysisWorkspace); });
    }
    var homologada = analiseHomologada(data);
    $("ami-analysis-matrix-hint").innerHTML = !foco
      ? 'Sem respostas enviadas: ainda n\u00e3o h\u00e1 matriz.'
      : foco.origem === "julgador"
        ? 'Matriz do julgador <strong>' + escapeHtml(foco.rotulo) + '</strong>, exatamente como ele a preencheu. Cada c\u00e9lula responde: quantas vezes o crit\u00e9rio da linha importa mais que o da coluna.'
        : 'Agrega\u00e7\u00e3o dos julgamentos de todos os julgadores, par a par, pela <strong>' + escapeHtml(foco.rotulo) + '</strong> dos \u00edndices.' +
          (homologada && selectedMeasure === "geometrica" ? ' Corresponde \u00e0 an\u00e1lise homologada <strong>' + escapeHtml(homologada.nome) + '</strong> (' + escapeHtml(homologada.codigo) + ').' : '');
    if (!foco) { $("ami-analysis-matrix").innerHTML = '<p class="ami-empty">Sem respostas enviadas.</p>'; return; }
    $("ami-analysis-matrix").innerHTML = '<div class="matriz-table-wrap"><table class="admin-table ami-stats-table ami-matrix"><thead><tr><th>Crit\u00e9rio</th>' +
      criterios.map(function (nome) { return '<th>' + escapeHtml(nome) + '</th>'; }).join("") + '</tr></thead><tbody>' +
      foco.matriz.map(function (linha, i) {
        return '<tr><td class="ami-stats-table__name">' + escapeHtml(criterios[i]) + '</td>' +
          linha.map(function (valor, j) { return '<td' + (i === j ? ' class="is-diagonal"' : '') + ' title="' + escapeHtml(criterios[i] + " \u00d7 " + criterios[j]) + '">' + fmtNumber(valor) + '</td>'; }).join("") + '</tr>';
      }).join("") + '</tbody></table></div>';
  }
  // Explicacao curta de cada metrica, em linguagem de quem vai decidir.
  var EXPLICACAO_METRICAS = {
    lambda: "Autovalor principal da matriz. Numa matriz perfeitamente coerente ele seria igual ao n\u00famero de crit\u00e9rios; quanto mais passar disso, mais os julgamentos se contradizem.",
    ic: "\u00cdndice de consist\u00eancia: o quanto \u03bbmax passou do n\u00famero de crit\u00e9rios, dividido pelo espa\u00e7o que ele tinha para passar. Zero significa nenhuma contradi\u00e7\u00e3o.",
    ri: "\u00cdndice aleat\u00f3rio: o IC m\u00e9dio de matrizes preenchidas ao acaso, do mesmo tamanho. Serve de r\u00e9gua para saber se o IC obtido \u00e9 pequeno de verdade.",
    rc: "Raz\u00e3o de consist\u00eancia: o IC comparado \u00e0 r\u00e9gua do acaso (IC \u00f7 IA). \u00c9 a m\u00e9trica de aceita\u00e7\u00e3o: abaixo do limite, os julgamentos s\u00e3o coerentes o bastante para virar peso."
  };
  function renderConsistencyMetrics(data) {
    var foco = matrizEmFoco(data);
    if (!foco) { $("ami-analysis-metrics-hint").textContent = ""; $("ami-analysis-metrics").innerHTML = '<p class="ami-empty">Sem m\u00e9tricas: nenhuma resposta enviada.</p>'; return; }
    var resultado = analisarMatriz(foco.matriz), limite = Number($("ami-analysis-rc").value) || 0.1;
    var aprovado = resultado.rc < limite, n = foco.matriz.length;
    $("ami-analysis-metrics-hint").innerHTML = (foco.origem === "julgador"
      ? 'Coer\u00eancia interna do julgamento de <strong>' + escapeHtml(foco.rotulo) + '</strong>'
      : 'Coer\u00eancia da matriz agregada pela <strong>' + escapeHtml(foco.rotulo) + '</strong>') +
      ': se ela diz que A vale 3 vezes B e que B vale 3 vezes C, esperaria-se algo perto de 9 entre A e C. As m\u00e9tricas medem esse tipo de desencontro \u2014 cada carta abaixo mostra a sua pr\u00f3pria situa\u00e7\u00e3o.';
    // Cada metrica traz o seu proprio veredito: situacao (cor), selo e, quando
    // faz sentido, a barra do quanto do limite foi consumido.
    var excedente = resultado.lambdaMax - n;
    var cartas = [
      {
        rotulo: "\u03bbmax", valor: fmtNumber(resultado.lambdaMax), situacao: excedente <= 0.2 ? "ok" : excedente <= 0.5 ? "atencao" : "nok",
        selo: excedente <= 0.2 ? "pr\u00f3ximo do ideal" : excedente <= 0.5 ? "acima do ideal" : "bem acima do ideal",
        nota: "ideal para " + n + " crit\u00e9rios: " + fmtNumber(n) + " \u00b7 excedente " + fmtNumber(excedente),
        texto: EXPLICACAO_METRICAS.lambda
      },
      {
        rotulo: "\u00cdndice de consist\u00eancia (IC)", valor: fmtNumber(resultado.ic), situacao: resultado.ic <= 0.05 ? "ok" : resultado.ic <= 0.1 ? "atencao" : "nok",
        selo: resultado.ic <= 0.05 ? "pr\u00f3ximo de zero" : resultado.ic <= 0.1 ? "moderado" : "alto",
        nota: "ideal: 0", texto: EXPLICACAO_METRICAS.ic
      },
      {
        rotulo: "\u00cdndice aleat\u00f3rio (IA)", valor: fmtNumber(resultado.ri), situacao: "neutro", selo: "refer\u00eancia",
        nota: "r\u00e9gua fixa para " + n + " crit\u00e9rios", texto: EXPLICACAO_METRICAS.ri
      },
      {
        rotulo: "Raz\u00e3o de consist\u00eancia (RC)", valor: fmtNumber(resultado.rc), situacao: aprovado ? "ok" : "nok",
        selo: aprovado ? "dentro do limite" : "acima do limite",
        nota: "limite adotado: " + fmtNumber(limite), texto: EXPLICACAO_METRICAS.rc,
        medidor: Math.max(2, Math.min(100, resultado.rc / Math.max(limite, 0.0001) * 100)),
        conclusao: aprovado
          ? "Os julgamentos se sustentam entre si; os pesos derivados desta matriz podem ser usados."
          : "H\u00e1 contradi\u00e7\u00f5es demais entre os julgamentos: reveja os pares mais destoantes em 2.2 antes de consolidar."
      }
    ];
    var icones = { ok: "fa-circle-check", atencao: "fa-triangle-exclamation", nok: "fa-circle-xmark", neutro: "fa-circle-info" };
    // Os cards carregam a validacao visual; a explicacao de cada metrica fica
    // fora deles, num bloco proprio logo abaixo.
    var grade = '<div class="ami-metric-grid">' + cartas.map(function (carta) {
      return '<div class="ami-metric-card is-' + carta.situacao + '">' +
        '<div class="ami-metric-card__top"><span class="ami-metric-card__label">' + carta.rotulo + '</span>' +
        '<span class="ami-metric-card__selo"><i class="fa-solid ' + icones[carta.situacao] + '" aria-hidden="true"></i>' + carta.selo + '</span></div>' +
        '<div class="ami-metric-card__value">' + carta.valor + '</div>' +
        (carta.medidor ? '<div class="ami-metric-card__gauge"><span style="width:' + carta.medidor.toFixed(1) + '%"></span></div>' : '') +
        '<div class="ami-metric-card__note">' + carta.nota + '</div></div>';
    }).join("") + '</div>';
    var conclusao = cartas.filter(function (carta) { return carta.conclusao; })[0];
    var explicacoes = '<div class="ami-metric-help"><h4>O que cada métrica diz</h4><dl>' + cartas.map(function (carta) {
      return '<dt>' + carta.rotulo + '</dt><dd>' + carta.texto + '</dd>';
    }).join("") + '</dl>' + (conclusao ? '<p class="ami-metric-help__fecho is-' + (aprovado ? "ok" : "nok") + '">' + conclusao.conclusao + '</p>' : '') + '</div>';
    $("ami-analysis-metrics").innerHTML = grade + explicacoes;
  }
  function renderWeights(data) {
    var foco = matrizEmFoco(data), resultado = foco ? analisarMatriz(foco.matriz) : null;
    var pesos = resultado ? resultado.pesos : [], criterios = (data.ambiente.criterios || []).map(criterionName);
    $("ami-analysis-weight-col").textContent = "Peso";
    $("ami-analysis-weights-hint").innerHTML = !foco ? 'Sem respostas enviadas.' : foco.origem === "julgador"
      ? 'Pesos derivados da matriz de <strong>' + escapeHtml(foco.rotulo) + '</strong>, sem agrega\u00e7\u00e3o \u2014 \u00e9 o julgamento de uma pessoa s\u00f3.'
      : 'Pesos consolidados a partir dos \u00edndices de todos os julgadores, agregados pela <strong>' + escapeHtml(foco.rotulo) + '</strong>.';
    $("ami-analysis-criteria").innerHTML = criterios.map(function (nome, indice) {
      return '<tr><td class="ami-stats-table__name" title="' + escapeHtml(nome) + '">' + escapeHtml(nome) + '</td><td><strong>' + (pesos.length ? fmtNumber(pesos[indice]) : "\u2014") + '</strong></td></tr>';
    }).join("") || '<tr><td colspan="2" class="ami-empty">Sem respostas enviadas.</td></tr>';
    $("ami-analysis-criteria-chart").innerHTML = pesos.length
      ? '<figure class="ami-range-chart">' + criterios.map(function (nome, indice) {
          var percentual = pesos[indice] * 100;
          return '<div class="ami-range-chart__row"><span class="ami-range-chart__label" title="' + escapeHtml(nome) + '">' + escapeHtml(nome) + '</span><div class="ami-range-chart__track"><span class="ami-range-chart__span" style="left:0;width:' + Math.max(1, percentual).toFixed(2) + '%"></span></div><strong>' + percentual.toFixed(1) + '%</strong></div>';
        }).join("") + '<figcaption>Participa\u00e7\u00e3o de cada crit\u00e9rio no total dos pesos.</figcaption></figure>'
      : '<p class="ami-empty">Sem respostas enviadas.</p>';
  }
  // Tudo que deriva da matriz acompanha a selecao do julgador e da medida.
  function renderFioDerivado(data) {
    renderConsolidatedMatrix(data);
    renderConsistencyMetrics(data);
    renderWeights(data);
  }
  // --- Modal de acompanhamento do processo de consolidacao -----------------
  var ETAPAS_CONSOLIDACAO = [
    { id: "selecao", titulo: "Conferir a sele\u00e7\u00e3o de respostas", detalhe: "Verifica quais julgadores entram na consolida\u00e7\u00e3o." },
    { id: "envio", titulo: "Agregar os \u00edndices e calcular", detalhe: "O servidor agrega os julgamentos par a par e resolve a matriz." },
    { id: "gravacao", titulo: "Gravar a an\u00e1lise consolidada", detalhe: "Registra a matriz, os pesos e as m\u00e9tricas no julgamento." },
    { id: "recarga", titulo: "Atualizar o espa\u00e7o anal\u00edtico", detalhe: "Recarrega as se\u00e7\u00f5es com o resultado rec\u00e9m-gravado." }
  ];
  var estadoEtapas = {};
  function abrirModalProcesso(subtitulo) {
    estadoEtapas = {};
    ETAPAS_CONSOLIDACAO.forEach(function (etapa) { estadoEtapas[etapa.id] = "pendente"; });
    $("ami-process-modal-subtitle").textContent = subtitulo;
    $("ami-process-modal").classList.remove("is-hidden");
    desenharEtapas();
  }
  function fecharModalProcesso() { $("ami-process-modal").classList.add("is-hidden"); }
  function marcarEtapa(id, situacao, mensagem) {
    estadoEtapas[id] = situacao;
    if (mensagem) estadoEtapas[id + ":msg"] = mensagem;
    desenharEtapas();
  }
  function desenharEtapas() {
    var concluidas = ETAPAS_CONSOLIDACAO.filter(function (etapa) { return estadoEtapas[etapa.id] === "ok"; }).length;
    $("ami-process-bar-fill").style.width = (concluidas / ETAPAS_CONSOLIDACAO.length * 100).toFixed(0) + "%";
    $("ami-process-steps").innerHTML = ETAPAS_CONSOLIDACAO.map(function (etapa) {
      var situacao = estadoEtapas[etapa.id] || "pendente";
      var icone = situacao === "ok" ? "fa-circle-check" : situacao === "erro" ? "fa-circle-xmark" : situacao === "andamento" ? "fa-spinner fa-spin" : "fa-circle";
      return '<li class="ami-process-step is-' + situacao + '"><i class="fa-solid ' + icone + '" aria-hidden="true"></i><div><strong>' + etapa.titulo + '</strong>' +
        '<span>' + escapeHtml(estadoEtapas[etapa.id + ":msg"] || etapa.detalhe) + '</span></div></li>';
    }).join("");
  }
  // --- Modal de veredito, em semaforo ---------------------------------------
  function mostrarResultado(cor, titulo, texto, campos) {
    var semaforo = $("ami-result-semaforo");
    semaforo.className = "ami-semaforo is-" + cor;
    semaforo.setAttribute("aria-label", titulo);
    $("ami-result-title").textContent = titulo;
    $("ami-result-text").textContent = texto;
    $("ami-result-fields").innerHTML = (campos || []).map(function (campo) {
      return '<dt>' + escapeHtml(campo[0]) + '</dt><dd>' + escapeHtml(campo[1]) + '</dd>';
    }).join("");
    $("ami-result-modal").classList.remove("is-hidden");
  }
  function fecharModalResultado() { $("ami-result-modal").classList.add("is-hidden"); }
  // Consolidacao completa: cada etapa alimenta o modal de processo e o desfecho
  // vai para o semaforo.
  function consolidarRespostas() {
    if (!analysisWorkspace) return;
    var selecionadas = Array.from($("ami-analysis-responses").querySelectorAll("[data-analysis-response]:checked")).map(function (item) { return item.dataset.analysisResponse; });
    var enviadas = respostasEnviadas(analysisWorkspace).length;
    var limite = Number($("ami-analysis-rc").value) || 0.1;
    var nome = $("ami-analysis-name").value.trim();
    $("ami-analysis-feedback").textContent = "";
    abrirModalProcesso(nome || "An\u00e1lise consolidada");
    marcarEtapa("selecao", "andamento");
    if (!selecionadas.length) {
      marcarEtapa("selecao", "erro", "Nenhuma resposta selecionada.");
      fecharModalProcesso();
      mostrarResultado("vermelha", "Consolida\u00e7\u00e3o n\u00e3o realizada", "Selecione ao menos uma resposta enviada para consolidar.", [["Respostas enviadas", String(enviadas)], ["Selecionadas", "0"]]);
      return;
    }
    marcarEtapa("selecao", "ok", selecionadas.length + " de " + enviadas + " respostas enviadas entram na consolida\u00e7\u00e3o.");
    marcarEtapa("envio", "andamento");
    var criada = null;
    api("/api/ahp/comparacao-colaborativa/ambientes/" + encodeURIComponent(selectedId) + "/analises", {
      method: "POST",
      body: JSON.stringify({ nome: nome, resposta_ids: selecionadas, rc_maximo: limite, excluir_inconsistentes: $("ami-analysis-exclude-inconsistent").checked })
    }).then(function (analise) {
      criada = analise;
      marcarEtapa("envio", "ok", "Matriz agregada pela m\u00e9dia geom\u00e9trica dos \u00edndices.");
      marcarEtapa("gravacao", "ok", "An\u00e1lise " + (analise.codigo || "") + " gravada no julgamento.");
      marcarEtapa("recarga", "andamento");
      return api("/api/ahp/comparacao-colaborativa/ambientes/" + encodeURIComponent(selectedId) + "/espaco-analitico");
    }).then(function (data) {
      marcarEtapa("recarga", "ok", "Se\u00e7\u00f5es 2.1 a 2.7 atualizadas.");
      renderAnalysisWorkspace(data);
      fecharModalProcesso();
      var incluidas = criada.respostas_incluidas || selecionadas.length;
      var campos = [
        ["An\u00e1lise", (criada.nome || "") + (criada.codigo ? " (" + criada.codigo + ")" : "")],
        ["Respostas inclu\u00eddas", incluidas + " de " + enviadas + " enviadas"],
        ["Raz\u00e3o de consist\u00eancia (RC)", fmtNumber(criada.razao_consistencia) + " \u00b7 limite " + fmtNumber(limite)],
        ["\u03bbmax / IC / IA", fmtNumber(criada.lambda_max) + " / " + fmtNumber(criada.indice_consistencia) + " / " + fmtNumber(criada.indice_aleatorio)]
      ];
      if (!criada.consistente) {
        mostrarResultado("vermelha", "An\u00e1lise gravada, mas inconsistente",
          "O RC ficou acima do limite adotado: os pesos desta an\u00e1lise n\u00e3o devem ser homologados. Reveja os pares mais destoantes em 2.2 ou exclua a resposta inconsistente.", campos);
      } else if (incluidas < enviadas) {
        mostrarResultado("amarela", "An\u00e1lise gravada com ressalva",
          "O resultado \u00e9 consistente, mas nem todas as respostas enviadas entraram na consolida\u00e7\u00e3o. Confira se a exclus\u00e3o foi proposital antes de homologar.", campos);
      } else {
        mostrarResultado("verde", "An\u00e1lise consolidada com sucesso",
          "Todas as respostas enviadas entraram e o resultado \u00e9 consistente. A an\u00e1lise j\u00e1 pode ser homologada em 2.7.", campos);
      }
    }).catch(function (erro) {
      var pendente = ETAPAS_CONSOLIDACAO.filter(function (etapa) { return estadoEtapas[etapa.id] === "andamento"; })[0];
      if (pendente) marcarEtapa(pendente.id, "erro", erro.message);
      fecharModalProcesso();
      $("ami-analysis-feedback").textContent = erro.message;
      mostrarResultado("vermelha", "Consolida\u00e7\u00e3o n\u00e3o conclu\u00edda", erro.message,
        [["Etapa", pendente ? pendente.titulo : "\u2014"], ["Selecionadas", String(selecionadas.length)]]);
    });
  }
  function renderAnalysisWorkspace(data) {
    analysisWorkspace = data; var a = data.ambiente, p = data.participacao;
    $("ami-analysis-context").textContent = (a.hierarquizacao_nome || a.hierarquizacao_codigo) + " · " + a.n_criterios + " critérios";
    $("ami-analysis-participation").innerHTML = [["Convidados",p.convidados],["Não iniciados",p.nao_iniciados],["Em preenchimento",p.em_preenchimento],["Enviadas",p.enviadas],["Consistentes",p.consistentes],["Inconsistentes",p.inconsistentes]].map(function (x) { return '<div class="ahp-metric-card"><div class="ahp-metric-card__label">' + x[0] + '</div><div class="ahp-metric-card__value">' + x[1] + '</div></div>'; }).join("");
    renderResponsesForConsolidation(data);
    // O fio: julgadores -> indices -> matriz -> metricas -> pesos.
    renderJudges(data);
    renderPairsSection();
    renderConsolidatedAnalyses(data.analises, data.analise_homologada_id);
    $("ami-analysis-workspace").classList.remove("is-hidden"); $("ami-analysis-workspace").scrollIntoView({behavior:"smooth",block:"start"});
  }
  // Com os pesos homologados, o julgamento cumpriu o seu papel: as tres fases
  // do processo global de hierarquizacao ja podem ser executadas.
  var FASES_HIERARQUIZACAO = [
    { href: "/restrict/hierarquizacao/fase-1/", numero: "1", nome: "Elegibilidade territorial", resumo: "cruza cada demanda com as áreas homologadas de restrição e risco" },
    { href: "/restrict/hierarquizacao/fase-2/", numero: "2", nome: "Favorabilidade territorial", resumo: "extrai o índice da superfície homologada no ponto de cada demanda" },
    { href: "/restrict/hierarquizacao/fase-3/", numero: "3", nome: "Ajuste fino de prioridades", resumo: "combina os atributos do projeto com o risco herdado e fecha a síntese" }
  ];
  function analiseHomologadaAviso() {
    return '<div class="ami-homologada"><p class="ami-homologada__titulo"><i class="fa-solid fa-circle-check" aria-hidden="true"></i> <strong>Análise homologada</strong></p>' +
      '<p class="ami-homologada__texto">Os pesos dos critérios estão definidos. Com eles, as três fases do processo global de hierarquização de demandas já podem ser executadas:</p>' +
      '<ol class="ami-homologada__fases">' + FASES_HIERARQUIZACAO.map(function (fase) {
        return '<li><a href="' + fase.href + '"><span class="ami-homologada__num">' + fase.numero + '</span><span><strong>' + fase.nome + '</strong><small>' + fase.resumo + '</small></span><i class="fa-solid fa-arrow-right" aria-hidden="true"></i></a></li>';
      }).join("") + '</ol></div>';
  }
  function renderConsolidatedAnalyses(items, homologadaId) {
    $("ami-analysis-consolidations").innerHTML = items.map(function (item) { var official = item.id === homologadaId || item.status === "homologada"; return '<article class="info-card"><h3>' + escapeHtml(item.nome) + ' <small>' + escapeHtml(item.codigo) + '</small></h3><div class="ami-kpis"><div><strong>' + item.respostas_incluidas + '</strong><span>respostas</span></div><div><strong>' + fmtNumber(item.razao_consistencia) + '</strong><span>RC</span></div><div><strong>' + (item.consistente ? "Sim" : "Não") + '</strong><span>consistente</span></div></div><div class="ahp-collab-grid2"><div><h4>Pesos finais</h4><div class="matriz-table-wrap"><table class="admin-table"><thead><tr><th>Critério</th><th>Peso final</th></tr></thead><tbody>' + item.pesos_consolidados.map(function (w,i) { return '<tr><td>' + escapeHtml(criterionName(analysisWorkspace.ambiente.criterios[i], i)) + '</td><td>' + fmtNumber(w) + '</td></tr>'; }).join("") + '</tbody></table></div></div><div><h4>Matriz consolidada</h4>' + analysisMatrixTable(item) + '</div></div>' + (official ? analiseHomologadaAviso() : '<button type="button" class="btn btn-success" data-homologate-analysis="' + escapeHtml(item.id) + '" ' + (!item.consistente ? "disabled" : "") + '>Homologar análise</button>') + '</article>'; }).join("") || '<p class="ami-empty">Nenhuma análise consolidada.</p>';
    $("ami-analysis-consolidations").querySelectorAll("[data-homologate-analysis]").forEach(function (button) { button.addEventListener("click", function () { api("/api/ahp/comparacao-colaborativa/analises/" + button.dataset.homologateAnalysis + "/homologar", {method:"POST"}).then(function () { openAnalysisWorkspace(); }).catch(function (e) { $("ami-analysis-feedback").textContent=e.message; }); }); });
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
    draftEmails = (judgment.convites || []).map(function (invite) { return typeof invite === "string" ? { email: invite, nome: null } : { email: invite.email, nome: invite.nome || null }; }).filter(function (convite) { return convite.email; });
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
    var updatePayload = { hierarquizacao_id: selectedHierarchy.dataset.hierarquizacaoId, matriz_premissas_criterios: criteriaMatrix, convites: draftEmails.map(function (convite) { return { email: convite.email, nome: convite.nome }; }), valido_ate: deadlineEndOfDay() }; if (criteriaMatrixFileBase64) { updatePayload.arquivo_matriz_base64 = criteriaMatrixFileBase64; updatePayload.arquivo_matriz_nome = criteriaMatrixFileName; }
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
    $("ami-email-list").innerHTML = draftEmails.length ? draftEmails.map(function (convite, index) { return '<tr><td class="ahp-collab-chk-col"><input type="checkbox" data-draft-index="' + index + '" aria-label="Selecionar ' + escapeHtml(convite.email) + '"></td><td>' + escapeHtml(convite.nome || "Colaborador " + (index + 1)) + '</td><td>' + escapeHtml(convite.email) + '</td><td>' + escapeHtml(formatDeadline()) + '</td></tr>'; }).join("") : '<tr><td colspan="4" class="ami-empty">Nenhum colaborador adicionado.</td></tr>';
    $("ami-select-all").checked = false;
    $("ami-delete-emails").disabled = true;
    $("ami-email-list").querySelectorAll("[data-draft-index]").forEach(function (checkbox) { checkbox.addEventListener("change", updateDraftControls); });
  }
  function updateDraftControls() { $("ami-delete-emails").disabled = !$("ami-email-list").querySelector("[data-draft-index]:checked"); }
  function addDraftEmails() {
    var incoming = parseConvites($("ami-emails").value);
    incoming.forEach(function (convite) { if (!draftEmails.some(function (item) { return item.email === convite.email; })) draftEmails.push(convite); });
    $("ami-emails").value = "";
    $("ami-create-feedback").textContent = incoming.length ? "Colaboradores adicionados à lista." : "Informe ao menos um e-mail.";
    renderDraftEmails();
  }
  // Aceita "Nome <email@dominio>" ou o e-mail puro, um por linha, virgula ou
  // ponto-e-virgula. Sem nome informado, fica so o e-mail.
  function parseConvites(texto) {
    return parseEmails(texto).map(function (email) { return { email: email, nome: null }; })
      .map(function (convite) {
        var padrao = new RegExp("([^,;<\n]+)<\\s*" + convite.email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*>", "i");
        var achado = padrao.exec(texto);
        if (achado) convite.nome = achado[1].trim().replace(/^["']|["']$/g, "");
        return convite;
      });
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
      api(ambientesSourceUrl).then(function (values) { respostasCentral = values; render(); }).catch(function (err) { $("ami-judgments").innerHTML = '<tr><td colspan="10" class="ami-empty">' + escapeHtml(err.message) + "</td></tr>"; });
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
      api("/api/ahp/comparacao-colaborativa/ambientes", { method: "POST", body: JSON.stringify({ hierarquizacao_id: selectedHierarchy.dataset.hierarquizacaoId, matriz_premissas_criterios: criteriaMatrix, arquivo_matriz_base64: criteriaMatrixFileBase64, arquivo_matriz_nome: criteriaMatrixFileName, convites: draftEmails.map(function (convite) { return { email: convite.email, nome: convite.nome }; }), valido_ate: deadlineEndOfDay() }) }).then(function (j) {
        julgamentos.unshift(j); currentPage = 1; selectedIds.clear(); selectedIds.add(j.id); updateSelectedId(); render();
        var links = actionLinks(j);
        $("ami-create-status").className = "ami-create-success";
        $("ami-create-status").innerHTML = '<strong>Ambiente colaborativo criado.</strong><span>Situação: ' + escapeHtml(statusLabel(j.status)) + '</span><span>Data limite: ' + escapeHtml(deadlineLabel(j.valido_ate)) + '</span><div class="ami-actions"><a class="btn btn-primary" href="' + escapeHtml(links.workspace) + '">Abrir espaço do julgamento</a><a class="btn btn-secondary" href="' + escapeHtml(links.public) + '">Abrir formulário público</a></div>';
        renderEmailDraft(j);
        feedback.textContent = "Colaboradores confirmados e ambiente criado.";
      }).catch(function (err) { feedback.textContent = err.message; });
    });
    $("ami-copy-email-link").addEventListener("click", function () { var judgment = julgamentos.find(function (item) { return item.id === selectedId; }), url = persistentPublicUrl(judgment); if (url && navigator.clipboard) navigator.clipboard.writeText(url); });
    $("ami-open-mail").addEventListener("click", function () { var body = $("ami-email-template").dataset.message || $("ami-email-template").textContent; location.href = "mailto:" + draftEmails.map(function (convite) { return convite.email; }).join(",") + "?subject=" + encodeURIComponent("Convite para preenchimento colaborativo AHP (SAD/SLT)") + "&body=" + encodeURIComponent(body); });
    $("ami-analysis-calculate").addEventListener("click", consolidarRespostas);
    document.querySelectorAll("[data-result-close]").forEach(function (botao) { botao.addEventListener("click", fecharModalResultado); });
    $("ami-result-modal").addEventListener("click", function (evento) { if (evento.target === $("ami-result-modal")) fecharModalResultado(); });
    document.addEventListener("keydown", function (evento) { if (evento.key === "Escape") fecharModalResultado(); });
    renderDraftEmails();
  });
})();
